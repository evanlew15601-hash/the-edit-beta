import { Contestant, Alliance, VotingRecord, GameState, VotingDebugVoterEntry } from '@/types/game';
import { memoryEngine } from '@/utils/memoryEngine';
import { relationshipGraphEngine } from '@/utils/relationshipGraphEngine';
import { AllianceManager } from '@/utils/allianceManager';

export const processVoting = (
  contestants: Contestant[],
  playerName: string,
  alliances: Alliance[],
  gameState: GameState,
  immunityWinner?: string,
  playerVote?: string
): VotingRecord => {
  const activeContestants = contestants.filter(c => !c.isEliminated);

  if (activeContestants.length <= 2) {
    // Finale - different voting logic
    return {
      day: 0,
      eliminated: '',
      votes: {},
      reason: 'Finale reached'
    };
  }

  // Special-case: Final 3 vote context (used to detect 1-1-1 ties)
  const isFinalThreeVote =
    gameState.gamePhase === 'final_3_vote' && activeContestants.length === 3;

  const debugEnabled = !!gameState.debugMode;
  const debugVoters: VotingDebugVoterEntry[] = [];

  // Calculate threat levels for each contestant
  const threatLevels = new Map<string, number>();

  activeContestants.forEach(contestant => {
    let threat = 0;

    // Base threat from psychological profile:
    // - High suspicion is strongly threatening
    // - High trust is mildly threatening (they're liked, but not automatically the target)
    threat += contestant.psychProfile.trustLevel * 0.2;
    threat += contestant.psychProfile.suspicionLevel * 0.45;

    // Alliance considerations (each additional alliance bumps perceived threat)
    const contestantAlliances = alliances.filter(a => a.members.includes(contestant.name));
    threat += contestantAlliances.length * 8;

    // Social standing from relationship graph (how powerful they are socially)
    const standing = relationshipGraphEngine.calculateSocialStanding(contestant.name);
    threat += standing.socialPower * 0.6;

    // Edit bias (production favorites get protected a bit)
    threat -= contestant.psychProfile.editBias * 1.5;

    // Random factor for unpredictability (kept small so systems dominate)
    threat += (Math.random() - 0.5) * 6;

    threatLevels.set(contestant.name, threat);
  });

  // Add player to threat calculation with mitigation
  const playerEntity = activeContestants.find(c => c.name === playerName);
  let playerThreat = 0;
  if (playerEntity) {
    playerThreat += playerEntity.psychProfile.trustLevel * 0.15;
    playerThreat += playerEntity.psychProfile.suspicionLevel * 0.35;
    const playerAlliances = alliances.filter(a => a.members.includes(playerName));
    playerThreat += playerAlliances.length * 6;
    playerThreat -= playerEntity.psychProfile.editBias * 1.5;

    const playerStanding = relationshipGraphEngine.calculateSocialStanding(playerName);
    playerThreat += playerStanding.socialPower * 0.5;
  }
  playerThreat += (Math.random() - 0.5) * 6;
  // Bias mitigation: unless clearly suspicious, dampen player targeting
  if (playerEntity && playerEntity.psychProfile.suspicionLevel < 55 && playerThreat > 0) {
    playerThreat *= 0.7;
  }
  threatLevels.set(playerName, playerThreat);

  // Generate votes based on relationships, memory, and threat levels
  const votes: { [voterName: string]: string } = {};
  const voteCounts = new Map<string, number>();

  activeContestants.forEach(voter => {
    if (voter.name === playerName) return; // Player votes separately

    // ENHANCED: Check for player-influenced voting plan first (pressure/commitment stored in memory)
    const memPlan = memoryEngine.getVotingPlan(voter.name, gameState.currentDay);
    if (memPlan && memPlan.target && memPlan.target !== voter.name && memPlan.target !== immunityWinner) {
      // Plans from different sources carry different stickiness and decay with age
      const age =
        typeof memPlan.day === 'number'
          ? Math.max(0, gameState.currentDay - memPlan.day)
          : 0;

      let baseChance = 0.85;
      if (memPlan.source === 'vote_pressure') {
        baseChance = 0.95;
      } else if (memPlan.source === 'alliance_meeting') {
        baseChance = 0.9;
      } else if (memPlan.source === 'weekly_plan') {
        baseChance = 0.75;
      } else if (memPlan.source === 'conversation_hint') {
        baseChance = 0.7;
      }

      // Soften commitment as plans age
      const decay = Math.min(0.25, (age / 3) * 0.05);
      const commitChance = Math.max(0.6, Math.min(0.98, baseChance - decay));

      // Honor explicit plans most of the time (represents soft/firm commitments)
      if (Math.random() < commitChance) {
        votes[voter.name] = memPlan.target;
        voteCounts.set(memPlan.target, (voteCounts.get(memPlan.target) || 0) + 1);

        if (debugEnabled) {
          debugVoters.push({
            voter: voter.name,
            decidedTarget: memPlan.target,
            via: 'memory_plan',
            notes: `${memPlan.reasoning}${memPlan.source ? ` [source=${memPlan.source}, age=${age}d]` : ''}`
          });
        }

        return;
      }
    }

    // ENHANCED: Check for alliance vote coordination next
    const voterAlliances = alliances.filter(a => a.members.includes(voter.name));
    let allianceTarget: string | null = null;
    let coordinatingAllianceStrength: number | undefined;

    // Check if any of voter's alliances want to coordinate
    for (const alliance of voterAlliances) {
      const validTargets = activeContestants
        .filter(c => c.name !== voter.name && c.name !== immunityWinner)
        .map(c => c.name);

      const coordTarget = AllianceManager.getCoordinatedTarget(alliance, gameState, validTargets);
      if (coordTarget && coordTarget !== immunityWinner) {
        allianceTarget = coordTarget;
        coordinatingAllianceStrength = alliance.strength;
        console.log(`${voter.name} following alliance coordination: voting for ${coordTarget}`);
        break;
      }
    }

    // If alliance coordination exists, use it (with chance of betrayal based on strength)
    if (allianceTarget && allianceTarget !== voter.name) {
      const strength = coordinatingAllianceStrength ?? 50;
      // Strong alliances are very sticky; weak ones are easy to defect from
      const loyaltyChance =
        strength >= 75 ? 0.93 :
        strength >= 55 ? 0.88 :
        strength >= 35 ? 0.8 : 0.7;

      if (Math.random() < loyaltyChance) {
        votes[voter.name] = allianceTarget;
        const currentCount = voteCounts.get(allianceTarget) || 0;
        voteCounts.set(allianceTarget, currentCount + 1);

        if (debugEnabled) {
          debugVoters.push({
            voter: voter.name,
            decidedTarget: allianceTarget,
            via: 'alliance_coord',
            notes: `Followed alliance plan (strength ${strength})`
          });
        }

        return;
      }
    }

    // Get voter's memory and strategic context for individual decision
    const voterMemory = memoryEngine.queryMemory(voter.name, {
      dayRange: { start: gameState.currentDay - 7, end: gameState.currentDay },
      minImportance: 3
    });

    memoryEngine.getStrategicContext(voter.name, gameState);

    // Find target with highest threat that isn't in voter's alliance
    const allianceMembers = new Set(voterAlliances.flatMap(a => a.members));

    let targetName = '';
    let highestThreat = -Infinity;
    const consideredDebug: VotingDebugVoterEntry['considered'] = [];

    activeContestants.forEach(target => {
      if (target.name === voter.name) return;
      if (target.name === immunityWinner) return; // Can't vote for immunity winner

      // Enhanced alliance loyalty with memory
      let recentBetrayal = false;
      if (allianceMembers.has(target.name)) {
        const relationship = relationshipGraphEngine.getRelationship(voter.name, target.name);
        const isGenuinelyLoyal = voter.psychProfile.trustLevel > 60 && voter.psychProfile.suspicionLevel < 40;

        // Check memory for recent betrayals or broken promises
        recentBetrayal = voterMemory.events.some((e: any) =>
          e.type === 'betrayal' && e.participants.includes(target.name) && e.day >= gameState.currentDay - 3
        );

        if (recentBetrayal) {
          // Betrayed allies can be voted for freely
        } else if (relationship && relationship.trust > 70 && isGenuinelyLoyal) {
          if (Math.random() > 0.15) return; // ~85% loyalty for high trust bonds
        } else if (allianceMembers.has(target.name) && Math.random() > 0.2) {
          return; // ~80% general alliance loyalty
        }
      }

      const threat = threatLevels.get(target.name) || 0;

      // Enhanced relationship factors using memory and relationship graph
      let relationshipModifier = 0;
      let graphModifier = 0;
      let memoryModifier = 0;

      // Traditional memory impact (recent conversations)
      const relationship = voter.memory.filter(m =>
        m.participants.includes(target.name) && m.type === 'conversation'
      ).reduce((sum, m) => sum + m.emotionalImpact, 0);
      relationshipModifier += -relationship * 2.5;

      // Relationship graph impact
      const graphRelationship = relationshipGraphEngine.getRelationship(voter.name, target.name);
      if (graphRelationship) {
        graphModifier += -graphRelationship.trust * 0.4;
        graphModifier += graphRelationship.suspicion * 0.8;
      }

      // Memory-based strategic factors
      const promisesBroken = voterMemory.events.filter((e: any) =>
        e.type === 'promise' && e.participants.includes(target.name) && e.content.includes('broken')
      ).length;
      memoryModifier += promisesBroken * 20;

      // Recent gossip impact
      const recentGossip = voterMemory.relevantGossip.filter((g: any) =>
        g.info.includes(target.name) && g.day >= gameState.currentDay - 2
      );
      memoryModifier += recentGossip.length * 6;

      // Betrayal memories (longer-lived resentment)
      const betrayalEvents = voterMemory.events.filter((e: any) =>
        e.type === 'betrayal' && e.participants.includes(target.name)
      );
      betrayalEvents.forEach((e: any) => {
        const daysAgo = gameState.currentDay - e.day;
        if (daysAgo <= 3) {
          memoryModifier += 35;
        } else if (daysAgo <= 7) {
          memoryModifier += 25;
        } else {
          memoryModifier += 15;
        }
      });

      const personalModifier = relationshipModifier + graphModifier + memoryModifier;
      const finalThreat = threat + personalModifier;

      if (debugEnabled) {
        consideredDebug.push({
          target: target.name,
          baseThreat: threat,
          relationshipModifier,
          graphModifier,
          memoryModifier,
          finalThreat,
          allianceMember: allianceMembers.has(target.name),
          recentBetrayal
        });
      }

      if (finalThreat > highestThreat) {
        highestThreat = finalThreat;
        targetName = target.name;
      }
    });

    // Fallback: if no target computed (e.g. all filtered), pick a valid non-immune opponent
    if (!targetName) {
      const pool = activeContestants
        .map(c => c.name)
        .filter(n => n !== voter.name && n !== immunityWinner);
      if (pool.length > 0) {
        targetName = pool[Math.floor(Math.random() * pool.length)];
      }
    }

    if (targetName) {
      votes[voter.name] = targetName;
      const currentCount = voteCounts.get(targetName) || 0;
      voteCounts.set(targetName, currentCount + 1);

      // Record voting reasoning in memory
      const reasoning = `Voting for ${targetName} based on threat level, relationships, and memory`;
      memoryEngine.updateVotingPlan(voter.name, targetName, reasoning, {
        source: 'system',
        day: gameState.currentDay,
      });

      if (debugEnabled) {
        debugVoters.push({
          voter: voter.name,
          decidedTarget: targetName,
          via: 'individual',
          considered: consideredDebug
        });
      }
    }
  });

  // Add player's vote if valid
  if (playerVote && playerVote !== immunityWinner && playerVote !== playerName) {
    votes[playerName] = playerVote;
    voteCounts.set(playerVote, (voteCounts.get(playerVote) || 0) + 1);
  }

  // Compute max votes and initial eliminated candidate
  let eliminated = '';
  const entries = [...voteCounts.entries()];
  const maxVotes = entries.reduce((m, [, c]) => Math.max(m, c), -Infinity);
  const tiedAtMax = entries.filter(([, c]) => c === maxVotes).map(([n]) => n);
  if (tiedAtMax.length >= 1) {
    // If multiple tied, leave eliminated to be resolved below; if one, set it
    if (tiedAtMax.length === 1) {
      eliminated = tiedAtMax[0];
    }
  }

  let tieBreak: VotingRecord['tieBreak'] | undefined = undefined;

  if (tiedAtMax.length > 1) {
    // Special-case: pure 1-1-1 tie in the Final 3.
    // In this context we surface the tie to the UI and let a dedicated tie-break route resolve it,
    // rather than auto-resolving via revote/sudden-death here.
    const isPureFinalThreeTie =
      isFinalThreeVote &&
      entries.length === 3 &&
      maxVotes === 1 &&
      tiedAtMax.length === 3;

    if (!isPureFinalThreeTie) {
      // 1) Revote among tied only
      const revoteCandidates = new Set(tiedAtMax);
      const revoteVotes: { [voter: string]: string } = {};
      const revoteCounts: { [name: string]: number } = {} as any;

      activeContestants.forEach(voter => {
        if (voter.name === playerName) return; // Player not simulated here
        if (revoteCandidates.has(voter.name)) return; // Tied players abstain

        // Choose among tied based on threat + relationships
        let choice = '';
        let bestScore = -Infinity;
        tiedAtMax.forEach(candidate => {
          if (candidate === immunityWinner) return; // still cannot target immune, though unlikely
          let score = (threatLevels.get(candidate) || 0);
          const relationship = voter.memory.filter(m => 
            m.participants.includes(candidate) && m.type === 'conversation'
          ).reduce((sum, m) => sum + m.emotionalImpact, 0);
          score += -relationship * 5;
          // Small random factor
          score += (Math.random() - 0.5) * 5;
          if (score > bestScore) { bestScore = score; choice = candidate; }
        });

        if (choice) {
          revoteVotes[voter.name] = choice;
          revoteCounts[choice] = (revoteCounts[choice] || 0) + 1;
        }
      });

      // Determine revote winner/loser
      const topRevote = Object.entries(revoteCounts).reduce((prev, cur) => cur[1] > prev[1] ? cur : prev, ['', -Infinity as any]);
      const revoteMax = topRevote[1] as number;
      const revoteTied = Object.entries(revoteCounts).filter(([, c]) => c === revoteMax).map(([n]) => n);

      if (revoteTied.length === 1) {
        eliminated = revoteTied[0];
        tieBreak = {
          tied: tiedAtMax,
          method: 'revote',
          revote: { votes: revoteVotes, counts: revoteCounts },
          log: [
            `Tie detected between ${tiedAtMax.join(', ')}. Conducted a revote among housemates (excluding tied).`,
            `Revote result: ${revoteTied[0]} received the most votes in the tie-break.`
          ]
        };
      } else {
        // 2) Sudden-death mini-competition among revoteTied
        const compScores = new Map<string, number>();
        revoteTied.forEach(name => {
          const person = activeContestants.find(c => c.name === name) || contestants.find(c => c.name === name);
          let score = 50;
          if (person) {
            // Use disposition hints as lightweight ability weights
            const disp = person.psychProfile.disposition;
            if (disp.includes('competitive')) score += 15;
            if (disp.includes('driven')) score += 10;
            if (disp.includes('strategic')) score += 5;
            score += (100 - person.psychProfile.suspicionLevel) * 0.1;
            score += person.psychProfile.trustLevel * 0.05;
          }
          // Reduce randomness so stats and relationships carry more weight in sudden-death outcomes
          score += (Math.random() - 0.5) * 10;
          compScores.set(name, score);
        });
        const suddenWinner = [...compScores.entries()].reduce((p, c) => c[1] > p[1] ? c : p)[0];
        const suddenLoser = revoteTied.find(n => n !== suddenWinner) || revoteTied[0];
        eliminated = suddenLoser;
        tieBreak = {
          tied: tiedAtMax,
          method: 'sudden_death',
          revote: { votes: revoteVotes, counts: revoteCounts },
          suddenDeathWinner: suddenWinner,
          suddenDeathLoser: suddenLoser,
          log: [
            `Tie persisted after revote between ${revoteTied.join(', ')}.`,
            `A sudden-death mini-competition was held. ${suddenWinner} won; ${suddenLoser} was eliminated.`
          ]
        };
      }
    }
  }

  // If still no eliminated (e.g., single winner path or surfaced Final 3 tie), pick the sole max target
  if (!eliminated && !(isFinalThreeVote && tiedAtMax.length > 1 && maxVotes === 1)) {
    const sole = entries.find(([, c]) => c === maxVotes)?.[0];
    if (sole) eliminated = sole;
  }

  // Reason line
  const reason =
    !eliminated && isFinalThreeVote && tiedAtMax.length > 1 && maxVotes === 1
      ? 'Final 3 vote resulted in a 1-1-1 tie; tie-break will be decided.'
      : eliminated === playerName 
        ? 'You have been eliminated by the other contestants'
        : tieBreak
          ? (tieBreak.method === 'revote'
              ? `${eliminated} lost the tie-break revote and was eliminated`
              : `${eliminated} lost the sudden-death tie-break and was eliminated`)
          : `${eliminated} was seen as the biggest threat and received ${maxVotes} votes`;

  // Optional debug payload for developer tooling
  let debug: VotingRecord['debug'] | undefined;
  if (debugEnabled) {
    const threatSnapshot: { [name: string]: number } = {};
    threatLevels.forEach((val, key) => {
      threatSnapshot[key] = val;
    });
    debug = {
      threatSnapshot,
      voters: debugVoters
    };
    // Surface a concise console log for quick inspection without opening the panel
    console.debug('[VotingEngine] Debug snapshot', { eliminated, threatSnapshot, voters: debugVoters });
  }

  return {
    day: 0, // Will be set by caller
    eliminated,
    votes,
    reason,
    tieBreak,
    debug
  };
};
import { Contestant, Alliance, VotingRecord, GameState } from '@/types/game';
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

  // Calculate threat levels for each contestant
  const threatLevels = new Map<string, number>();
  
  activeContestants.forEach(contestant => {
    let threat = 0;
    
    // Base threat from psychological profile
    threat += contestant.psychProfile.trustLevel * 0.3;
    threat += contestant.psychProfile.suspicionLevel * 0.2;
    
    // Alliance considerations
    const contestantAlliances = alliances.filter(a => a.members.includes(contestant.name));
    threat += contestantAlliances.length * 10;
    
    // Edit bias (production favorites get protected)
    threat -= contestant.psychProfile.editBias * 2;
    
    // Random factor for unpredictability
    threat += (Math.random() - 0.5) * 20;
    
    threatLevels.set(contestant.name, threat);
  });

  // Add player to threat calculation with mitigation
  const playerEntity = activeContestants.find(c => c.name === playerName);
  let playerThreat = 0;
  if (playerEntity) {
    playerThreat += playerEntity.psychProfile.trustLevel * 0.15;
    playerThreat += playerEntity.psychProfile.suspicionLevel * 0.25;
    const playerAlliances = alliances.filter(a => a.members.includes(playerName));
    playerThreat += playerAlliances.length * 6;
    playerThreat -= playerEntity.psychProfile.editBias * 2;
  }
  playerThreat += (Math.random() - 0.5) * 15;
  // Bias mitigation: unless clearly suspicious, dampen player targeting
  if (playerEntity && playerEntity.psychProfile.suspicionLevel < 55 && playerThreat > 0) {
    playerThreat *= 0.7;
  }
  threatLevels.set(playerName, playerThreat);

  // Generate votes based on relationships and threat levels
  const votes: { [voterName: string]: string } = {};
  const voteCounts = new Map<string, number>();

  activeContestants.forEach(voter => {
    if (voter.name === playerName) return; // Player votes separately
    
    // ENHANCED: Check for alliance vote coordination first
    const voterAlliances = alliances.filter(a => a.members.includes(voter.name));
    let allianceTarget: string | null = null;
    
    // Check if any of voter's alliances want to coordinate
    for (const alliance of voterAlliances) {
      // Use static import for AllianceManager to avoid runtime require issues
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      // const { AllianceManager } = require('@/utils/allianceManager');
      // Replace dynamic require with direct usage of imported engine
      // NOTE: getCoordinatedTarget is expected to be a static helper on AllianceManager.
      // We import it at module top level.
      const validTargets = activeContestants
        .filter(c => c.name !== voter.name && c.name !== immunityWinner)
        .map(c => c.name);
      validTargets.push(playerName); // Include player as valid target
      
      const coordTarget = AllianceManager.getCoordinatedTarget(alliance, gameState, validTargets);
      if (coordTarget) {
        allianceTarget = coordTarget;
        console.log(`${voter.name} following alliance coordination: voting for ${coordTarget}`);
        break;
      }
    }
    
    // If alliance coordination exists, use it (with small chance of betrayal)
    if (allianceTarget && Math.random() > 0.15) { // 85% alliance loyalty
      votes[voter.name] = allianceTarget;
      const currentCount = voteCounts.get(allianceTarget) || 0;
      voteCounts.set(allianceTarget, currentCount + 1);
      return;
    }
    
    // Get voter's memory and strategic context for individual decision
    const voterMemory = memoryEngine.queryMemory(voter.id, {
      dayRange: { start: gameState.currentDay - 7, end: gameState.currentDay },
      minImportance: 3
    });
    
    const strategicContext = memoryEngine.getStrategicContext(voter.id, gameState);
    
    // Find target with highest threat that isn't in voter's alliance
    const allianceMembers = new Set(voterAlliances.flatMap(a => a.members));
    
    let targetName = '';
    let highestThreat = -Infinity;
    
    [...activeContestants, { name: playerName } as any].forEach(target => {
      if (target.name === voter.name) return;
      if (target.name === immunityWinner) return; // Can't vote for immunity winner
      
      // Enhanced alliance loyalty with memory
      if (allianceMembers.has(target.name)) {
        const relationship = relationshipGraphEngine.getRelationship(voter.name, target.name);
        const isGenuinelyLoyal = voter.psychProfile.trustLevel > 60 && voter.psychProfile.suspicionLevel < 40;
        
        // Check memory for recent betrayals or broken promises
        const recentBetrayal = voterMemory.events.some((e: any) => 
          e.type === 'betrayal' && e.participants.includes(target.name) && e.day >= gameState.currentDay - 3
        );
        
        if (recentBetrayal) {
          // Betrayed allies can be voted for
        } else if (relationship && relationship.trust > 70 && isGenuinelyLoyal) {
          if (Math.random() > 0.2) return; // 80% loyalty for high trust
        } else if (allianceMembers.has(target.name) && Math.random() > 0.1) {
          return; // 90% general alliance loyalty
        }
      }
      
      const threat = threatLevels.get(target.name) || 0;
      
      // Enhanced relationship factors using memory and relationship graph
      let personalModifier = 0;
      
      // Traditional memory impact
      const relationship = voter.memory.filter(m => 
        m.participants.includes(target.name) && m.type === 'conversation'
      ).reduce((sum, m) => sum + m.emotionalImpact, 0);
      personalModifier += -relationship * 3;
      
      // Relationship graph impact
      const graphRelationship = relationshipGraphEngine.getRelationship(voter.name, target.name);
      if (graphRelationship) {
        personalModifier += -graphRelationship.trust * 0.5;
        personalModifier += graphRelationship.suspicion * 0.7;
      }
      
      // Memory-based strategic factors
      const promisesBroken = voterMemory.events.filter((e: any) => 
        e.type === 'promise' && e.participants.includes(target.name) && e.content.includes('broken')
      ).length;
      personalModifier += promisesBroken * 15;
      
      // Recent gossip impact
      const recentGossip = voterMemory.relevantGossip.filter((g: any) => 
        g.info.includes(target.name) && g.day >= gameState.currentDay - 2
      );
      personalModifier += recentGossip.length * 5;
      
      const finalThreat = threat + personalModifier;
      
      if (finalThreat > highestThreat) {
        highestThreat = finalThreat;
        targetName = target.name;
      }
    });
    
    votes[voter.name] = targetName;
    const currentCount = voteCounts.get(targetName) || 0;
    voteCounts.set(targetName, currentCount + 1);
    
    // Record voting reasoning in memory
    const reasoning = `Voting for ${targetName} based on threat level and relationships`;
    memoryEngine.updateVotingPlan(voter.id, targetName, reasoning);
  });

  // Include player's vote if provided
  if (playerVote && playerVote !== immunityWinner && playerVote !== playerName) {
    votes[playerName] = playerVote;
    const current = voteCounts.get(playerVote) || 0;
    voteCounts.set(playerVote, current + 1);
  }

  // Find who received the most votes
  let eliminated = '';
  let maxVotes = 0;
  
  voteCounts.forEach((count, name) => {
    if (count > maxVotes) {
      maxVotes = count;
      eliminated = name;
    }
  });

  // Detect ties at max
  const tiedAtMax = [...voteCounts.entries()]
    .filter(([name, count]) => count === maxVotes && name)
    .map(([name]) => name);

  let tieBreak: VotingRecord['tieBreak'] | undefined = undefined;

  if (tiedAtMax.length > 1) {
    // 1) Revote among tied only
    const revoteCandidates = new Set(tiedAtMax);
    const revoteVotes: { [voter: string]: string } = {};
    const revoteCounts: { [name: string]: number } = {} as any;

    activeContestants.forEach(voter => {
      if (voter.name === playerName) return; // Player not simulated here
      if (revoteCandidates.has(voter.name)) return; // Tied players can't vote for themselves usually; they abstain

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
        score += (Math.random() - 0.5) * 20;
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

  // If player received most votes and no tie-break changed it
  const reason = eliminated === playerName 
    ? 'You have been eliminated by the other contestants'
    : tieBreak
      ? (tieBreak.method === 'revote'
          ? `${eliminated} lost the tie-break revote and was eliminated`
          : `${eliminated} lost the sudden-death tie-break and was eliminated`)
      : `${eliminated} was seen as the biggest threat and received ${maxVotes} votes`;

  return {
    day: 0, // Will be set by caller
    eliminated,
    votes,
    reason,
    tieBreak
  };
};
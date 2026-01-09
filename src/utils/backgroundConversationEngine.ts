import { GameState, Contestant, InteractionLogEntry } from '@/types/game';
import { relationshipGraphEngine } from '@/utils/relationshipGraphEngine';
import { memoryEngine } from '@/utils/memoryEngine';
import { generateLocalAIReply } from '@/utils/localLLM';

type BackgroundConversationTopic =
  | 'vote'
  | 'alliance'
  | 'gossip'
  | 'trust_check'
  | 'revenge'
  | 'information';

interface ConversationCandidate {
  participants: string[]; // NPC names
  topic: BackgroundConversationTopic;
  targets: string[]; // names the convo is about (vote targets, gossip subjects)
  score: number; // selection priority
}

interface BackgroundConversationOutcome {
  id: string;
  day: number;
  participants: string[];
  topic: BackgroundConversationTopic;
  targets: string[];
  summary: string;
  visibility: 'hidden' | 'private' | 'overheard_possible';
}

/**
 * BackgroundConversationEngine
 *
 * Generates lightweight, off-screen NPC↔NPC strategy conversations that:
 * - Use the existing Gemini + Lovable Cloud pipeline for 1–2 sentence summaries.
 * - Write outcomes back into:
 *   - contestant.memory (GameMemory)
 *   - relationshipGraphEngine (trust/suspicion deltas)
 *   - memoryEngine.updateVotingPlan (soft voting plans)
 *
 * All logic about *who* talks to *whom* about *what* is deterministic.
 * The LLM is used only to phrase the summary, not to decide numeric game state.
 */
class BackgroundConversationEngineImpl {
  private lastProcessedDay: number = 0;

  /**
   * Generate LLM-assisted background conversations for the given game state.
   * Returns a list of outcomes but does NOT mutate state.
   */
  async generateDailyBackgroundConversations(gameState: GameState): Promise<BackgroundConversationOutcome[]> {
    const { currentDay, contestants, playerName, gamePhase } = gameState;

    // Guard: only run once per in-game day, and only in core gameplay phases
    if (
      currentDay <= 0 ||
      currentDay <= this.lastProcessedDay ||
      !playerName ||
      !contestants ||
      contestants.length === 0 ||
      (gamePhase !== 'daily' && gamePhase !== 'player_vote' && gamePhase !== 'weekly_recap')
    ) {
      return [];
    }

    const activeNPCs = contestants.filter(
      c => !c.isEliminated && c.name && c.name !== playerName
    );
    if (activeNPCs.length < 2) {
      this.lastProcessedDay = currentDay;
      return [];
    }

    const daysToElim = gameState.nextEliminationDay - currentDay;
    const maxConvos =
      daysToElim <= 2 ? 3 :
      daysToElim <= 4 ? 2 :
      1;

    const candidates = this.buildConversationCandidates(gameState, activeNPCs);
    if (!candidates.length || maxConvos <= 0) {
      this.lastProcessedDay = currentDay;
      return [];
    }

    const chosen = this.selectTopCandidates(candidates, maxConvos);

    const outcomes: BackgroundConversationOutcome[] = [];
    for (const candidate of chosen) {
      let summary = this.buildFallbackSummary(candidate, gameState);

      try {
        const primaryName = candidate.participants[0];
        const npc = contestants.find(c => c.name === primaryName);

        if (npc) {
          const parsedInput = {
            primary: 'npc_background_conversation',
            topic: candidate.topic,
            targets: candidate.targets,
          };

          const socialContext = this.buildSocialContext(candidate, gameState);

          const playerMessage = this.buildLLMPlayerMessage(candidate, gameState, npc.name);

          const text = await generateLocalAIReply(
            {
              playerMessage,
              parsedInput,
              npc: {
                name: npc.name,
                publicPersona: npc.publicPersona,
                psychProfile: npc.psychProfile,
              },
              tone: 'strategic',
              conversationType: candidate.topic === 'gossip' ? 'private' : 'public',
              socialContext,
              playerName: gameState.playerName,
              intent: parsedInput,
            },
            { maxSentences: 2 }
          );

          if (typeof text === 'string' && text.trim().length > 0) {
            summary = text.trim();
          }
        }
      } catch (e) {
        // Non-fatal; fall back to deterministic summary
        // eslint-disable-next-line no-console
        console.warn('BackgroundConversationEngine: LLM summary failed, using fallback.', e);
      }

      outcomes.push({
        id: `bgc_${currentDay}_${Math.random().toString(36).slice(2)}`,
        day: currentDay,
        participants: candidate.participants,
        topic: candidate.topic,
        targets: candidate.targets,
        summary,
        visibility: this.deriveVisibility(candidate),
      });
    }

    this.lastProcessedDay = currentDay;
    return outcomes;
  }

  /**
   * Apply conversation outcomes into GameState:
   * - Append GameMemory entries for participants.
   * - Update relationshipGraphEngine.
   * - Update memoryEngine voting plans.
   * - Append NPC interaction logs for debugging / downstream engines.
   */
  applyOutcomes(prev: GameState, outcomes: BackgroundConversationOutcome[]): GameState {
    if (!outcomes.length) return prev;

    const currentDay = prev.currentDay;
    const contestantMap = new Map<string, Contestant>();
    prev.contestants.forEach(c => {
      contestantMap.set(c.name, { ...c, memory: [...c.memory] });
    });

    const newInteractionEntries: InteractionLogEntry[] = [];

    for (const outcome of outcomes) {
      // Skip outcomes that don't match current day to avoid stale updates
      if (outcome.day !== currentDay) continue;

      // Relationship deltas + emotion are computed deterministically from topic
      const { trustBetween, suspicionBetween, trustTowardTargets, suspicionTowardTargets } =
        this.computeRelationshipDeltas(outcome);

      // Update memories for each participant
      for (const name of outcome.participants) {
        const contestant = contestantMap.get(name);
        if (!contestant) continue;

        const emotionalImpact = this.computeEmotionalImpactForParticipant(outcome, name);

        contestant.memory.push({
          day: outcome.day,
          type: this.mapTopicToMemoryType(outcome.topic),
          participants: outcome.participants,
          content: outcome.summary,
          emotionalImpact,
          timestamp: Date.now(),
          tags: this.buildMemoryTags(outcome),
        });

        contestantMap.set(name, contestant);
      }

      // Apply relationship updates via relationshipGraphEngine
      outcome.participants.forEach(source => {
        // Between participants (bonding or tension)
        outcome.participants.forEach(target => {
          if (source === target) return;
          const pairKey = this.makePairKey(source, target);
          const trustDelta = trustBetween.get(pairKey) || 0;
          const suspicionDelta = suspicionBetween.get(pairKey) || 0;
          if (trustDelta !== 0 || suspicionDelta !== 0) {
            relationshipGraphEngine.updateRelationship(
              source,
              target,
              trustDelta,
              suspicionDelta,
              0,
              'conversation',
              `[Background] ${outcome.summary}`,
              outcome.day
            );
          }
        });

        // Toward explicit targets mentioned in the conversation
        for (const targetName of outcome.targets) {
          if (source === targetName) continue;
          const towardKey = this.makePairKey(source, targetName);
          const trustDelta = trustTowardTargets.get(towardKey) || 0;
          const suspicionDelta = suspicionTowardTargets.get(towardKey) || 0;
          if (trustDelta !== 0 || suspicionDelta !== 0) {
            relationshipGraphEngine.updateRelationship(
              source,
              targetName,
              trustDelta,
              suspicionDelta,
              0,
              'scheme',
              `[Background] Strategic talk about ${targetName}`,
              outcome.day
            );
          }
        }
      });

      // Soft voting plans: if the topic is vote and we have a clear single target
      if (outcome.topic === 'vote' && outcome.targets.length === 1) {
        const target = outcome.targets[0];
        outcome.participants.forEach(owner => {
          if (owner === target) return;
          memoryEngine.updateVotingPlan(
            owner,
            target,
            `Committed in a private strategy chat to lean towards voting out ${target}.`,
            { source: 'background_conversation', day: outcome.day }
          );
        });
      }

      // Interaction log entry for downstream systems
      newInteractionEntries.push({
        day: outcome.day,
        type: 'npc',
        participants: outcome.participants,
        content: `[Background conversation] ${outcome.summary}`,
        tone: 'strategic',
        source: 'npc',
      });
    }

    const updatedContestants = Array.from(contestantMap.values());

    return {
      ...prev,
      contestants: updatedContestants,
      interactionLog: [
        ...(prev.interactionLog || []),
        ...newInteractionEntries,
      ],
    };
  }

  // --- Internal helpers ---

  private buildConversationCandidates(gameState: GameState, activeNPCs: Contestant[]): ConversationCandidate[] {
    const candidates: ConversationCandidate[] = [];
    const { playerName } = gameState;

    for (const npc of activeNPCs) {
      const rels = relationshipGraphEngine.getRelationshipsForContestant(npc.name);
      if (!rels.length) continue;

      const sortedByTrust = [...rels].sort((a, b) => b.trust - a.trust);
      const sortedBySuspicion = [...rels].sort((a, b) => b.suspicion - a.suspicion);

      const bestAlly = sortedByTrust.find(r =>
        r.trust > 60 &&
        r.target !== npc.name &&
        r.target !== playerName
      );

      const topThreat = sortedBySuspicion.find(r =>
        r.suspicion > 60 &&
        r.target !== npc.name
      );

      // Prefer a vote-oriented conversation if both ally and threat exist
      if (bestAlly && topThreat && bestAlly.target !== topThreat.target) {
        candidates.push({
          participants: [npc.name, bestAlly.target],
          topic: 'vote',
          targets: [topThreat.target],
          score: topThreat.suspicion + bestAlly.trust,
        });
        continue;
      }

      // If no clear vote, alliance strengthening
      if (bestAlly) {
        candidates.push({
          participants: [npc.name, bestAlly.target],
          topic: 'alliance',
          targets: [],
          score: bestAlly.trust,
        });
      }

      // If they see someone as a big threat, seed a gossip conversation with a mid-trust partner
      if (topThreat) {
        const midTrustPartner =
          sortedByTrust.find(r => r.target !== topThreat.target && r.target !== playerName) ||
          sortedByTrust[0];

        if (midTrustPartner && midTrustPartner.target !== topThreat.target) {
          candidates.push({
            participants: [npc.name, midTrustPartner.target],
            topic: 'gossip',
            targets: [topThreat.target],
            score: topThreat.suspicion,
          });
        }
      }
    }

    return candidates;
  }

  private selectTopCandidates(candidates: ConversationCandidate[], maxConvos: number): ConversationCandidate[] {
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    const usedParticipants = new Set<string>();
    const chosen: ConversationCandidate[] = [];

    for (const cand of sorted) {
      if (chosen.length >= maxConvos) break;
      if (cand.participants.some(p => usedParticipants.has(p))) continue;
      chosen.push(cand);
      cand.participants.forEach(p => usedParticipants.add(p));
    }

    return chosen;
  }

  private buildFallbackSummary(candidate: ConversationCandidate, gameState: GameState): string {
    const [a, b] = candidate.participants;
    const target = candidate.targets[0];
    switch (candidate.topic) {
      case 'vote':
        return `${a} and ${b} quietly agree that ${target} is becoming too dangerous to keep much longer.`;
      case 'alliance':
        return `${a} and ${b} talk about sticking closer together as the game gets messier.`;
      case 'gossip':
        return `${a} pulls ${b} aside to warn them that ${target} might be throwing their name around.`;
      case 'trust_check':
        return `${a} checks in with ${b} to make sure they are still on the same page about the game.`;
      case 'revenge':
        return `${a} vents to ${b} about wanting payback on ${target} after recent events.`;
      case 'information':
      default:
        return `${a} and ${b} trade notes about where they think the house is leaning this week.`;
    }
  }

  private deriveVisibility(candidate: ConversationCandidate): 'hidden' | 'private' | 'overheard_possible' {
    if (candidate.topic === 'gossip' || candidate.topic === 'revenge') {
      return 'overheard_possible';
    }
    if (candidate.topic === 'vote' || candidate.topic === 'alliance' || candidate.topic === 'trust_check') {
      return 'private';
    }
    return 'hidden';
  }

  private buildSocialContext(candidate: ConversationCandidate, gameState: GameState) {
    const [a, b] = candidate.participants;
    const alliances = gameState.alliances || [];

    const alliancePartnersFor = (name: string): string[] => {
      const set = new Set<string>();
      alliances.forEach(alliance => {
        if (alliance.members.includes(name)) {
          alliance.members.forEach(m => {
            if (m !== name) set.add(m);
          });
        }
      });
      return Array.from(set);
    };

    const threats = candidate.targets;
    const opportunities: string[] = [];

    // Simple heuristic: anyone who is not a target and not the two participants could be an "opportunity"
    gameState.contestants.forEach(c => {
      if (
        !c.isEliminated &&
        !candidate.participants.includes(c.name) &&
        !candidate.targets.includes(c.name)
      ) {
        opportunities.push(c.name);
      }
    });

    // Pull recent events from memory for both participants
    const recentEvents: string[] = [];
    candidate.participants.forEach(name => {
      const contestant = gameState.contestants.find(c => c.name === name);
      if (!contestant) return;
      contestant.memory
        .filter(m => m.day >= gameState.currentDay - 3)
        .slice(-3)
        .forEach(m => {
          recentEvents.push(m.content);
        });
    });

    const dramaEvents = (gameState.interactionLog || []).filter(entry =>
      entry.day >= gameState.currentDay - 2 &&
      (entry.type === 'scheme' || entry.type === 'alliance_meeting' || entry.type === 'activity')
    );
    const currentDramaTension = Math.max(10, Math.min(100, 30 + dramaEvents.length * 10));

    return {
      alliances: Array.from(
        new Set([
          ...alliancePartnersFor(a),
          ...alliancePartnersFor(b),
        ])
      ),
      threats,
      opportunities: opportunities.slice(0, 6),
      currentDramaTension,
      recentEvents: recentEvents.slice(0, 6),
    };
  }

  private buildLLMPlayerMessage(candidate: ConversationCandidate, gameState: GameState, primaryName: string): string {
    const [a, b] = candidate.participants;
    const target = candidate.targets[0];
    const daysToElim = gameState.nextEliminationDay - gameState.currentDay;
    const phaseText =
      daysToElim <= 0
        ? 'after the last vote'
        : daysToElim === 1
        ? 'on the eve of the vote'
        : `with ${daysToElim} days until the next vote`;

    switch (candidate.topic) {
      case 'vote':
        return `Earlier today, ${a} and ${b} had a private strategy conversation ${phaseText} about whether to vote out ${target}. In 1–2 sentences, as ${primaryName}, describe what you said in that talk and what the two of you quietly decided.`;
      case 'alliance':
        return `Earlier today, ${a} and ${b} stepped aside for a low-key chat about working together more closely. In 1–2 sentences, as ${primaryName}, describe how you framed that conversation and what you both agreed about your partnership.`;
      case 'gossip':
        return `Earlier today, ${a} pulled ${b} aside to share gossip about ${target}. In 1–2 sentences, as ${primaryName}, describe what you hinted about ${target} and how you tried to shape ${b}'s perception.`;
      case 'trust_check':
        return `Earlier today, ${a} and ${b} checked in about trust and where you stand with each other. In 1–2 sentences, as ${primaryName}, describe what you said and how the two of you left that conversation.`;
      case 'revenge':
        return `Earlier today, ${a} vented to ${b} about wanting revenge on ${target}. In 1–2 sentences, as ${primaryName}, describe how you talked about that and what, if anything, you actually committed to.`;
      case 'information':
      default:
        return `Earlier today, ${a} and ${b} compared notes about where the game is heading. In 1–2 sentences, as ${primaryName}, describe what you shared and what you both took away from that talk.`;
    }
  }

  private computeRelationshipDeltas(outcome: BackgroundConversationOutcome) {
    const trustBetween = new Map<string, number>();
    const suspicionBetween = new Map<string, number>();
    const trustTowardTargets = new Map<string, number>();
    const suspicionTowardTargets = new Map<string, number>();

    const participants = outcome.participants;
    const targets = outcome.targets;

    // Participant↔participant effects
    for (const src of participants) {
      for (const dst of participants) {
        if (src === dst) continue;
        const key = this.makePairKey(src, dst);
        let trust = 0;
        let suspicion = 0;

        switch (outcome.topic) {
          case 'vote':
          case 'alliance':
          case 'trust_check':
            trust += 4;
            suspicion -= 1;
            break;
          case 'gossip':
          case 'information':
            trust += 2;
            break;
          case 'revenge':
            trust += 1;
            suspicion += 1;
            break;
        }

        trustBetween.set(key, (trustBetween.get(key) || 0) + trust);
        suspicionBetween.set(key, (suspicionBetween.get(key) || 0) + suspicion);
      }
    }

    // Participant → target effects
    for (const src of participants) {
      for (const t of targets) {
        if (src === t) continue;
        const key = this.makePairKey(src, t);
        let trust = 0;
        let suspicion = 0;

        switch (outcome.topic) {
          case 'vote':
            trust -= 3;
            suspicion += 6;
            break;
          case 'gossip':
          case 'information':
            suspicion += 4;
            break;
          case 'revenge':
            trust -= 4;
            suspicion += 5;
            break;
          case 'alliance':
          case 'trust_check':
            // talking about someone else in alliance talks is mild
            suspicion += 2;
            break;
        }

        trustTowardTargets.set(key, (trustTowardTargets.get(key) || 0) + trust);
        suspicionTowardTargets.set(key, (suspicionTowardTargets.get(key) || 0) + suspicion);
      }
    }

    return { trustBetween, suspicionBetween, trustTowardTargets, suspicionTowardTargets };
  }

  private computeEmotionalImpactForParticipant(outcome: BackgroundConversationOutcome, name: string): number {
    switch (outcome.topic) {
      case 'vote':
      case 'alliance':
      case 'trust_check':
        return 3;
      case 'gossip':
      case 'information':
        return 2;
      case 'revenge':
        return 4;
      default:
        return 1;
    }
  }

  private mapTopicToMemoryType(topic: BackgroundConversationTopic): 'conversation' | 'scheme' | 'observation' {
    switch (topic) {
      case 'revenge':
        return 'scheme';
      case 'information':
      case 'gossip':
        return 'observation';
      case 'vote':
      case 'alliance':
      case 'trust_check':
      default:
        return 'conversation';
    }
  }

  private buildMemoryTags(outcome: BackgroundConversationOutcome): string[] {
    const tags = ['background_conversation'];
    switch (outcome.topic) {
      case 'vote':
        tags.push('vote_plan');
        break;
      case 'gossip':
        tags.push('gossip');
        break;
      case 'alliance':
        tags.push('alliance_talk');
        break;
      case 'revenge':
        tags.push('revenge_talk');
        break;
      case 'trust_check':
        tags.push('trust_check');
        break;
      case 'information':
        tags.push('information_sharing');
        break;
    }
    if (outcome.visibility === 'overheard_possible') {
      tags.push('overheard_possible');
    }
    return tags;
  }

  private makePairKey(a: string, b: string): string {
    return [a, b].sort().join('|');
  }
}

export const BackgroundConversationEngine = new BackgroundConversationEngineImpl();
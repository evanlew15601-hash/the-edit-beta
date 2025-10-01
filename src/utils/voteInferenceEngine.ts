import { Contestant, GameState } from '@/types/game';
import { AIVotingStrategy } from '@/utils/aiVotingStrategy';

export type VoteHonesty = 'truth' | 'lie' | 'maybe';

export interface VoteAskResult {
  declaredTarget: string;        // what they say their vote target is (or 'undecided')
  reasoning: string;             // their stated rationale
  honesty: VoteHonesty;          // heuristic label
  explanation: string;           // why we labeled it that way
  likelyTarget?: string;         // our heuristic inference
}

/**
 * Infer who this NPC is likely to vote for using only in-world factors.
 * No omniscient knowledge; simple heuristics on relationships, alliances, and psych profile.
 */
export function inferLikelyVoteTarget(npc: Contestant, gameState: GameState): string | undefined {
  const active = gameState.contestants.filter(c => !c.isEliminated && c.name !== npc.name);
  const eligible = active.filter(c => c.name !== gameState.immunityWinner);

  if (eligible.length === 0) return undefined;

  const npcAlliances = gameState.alliances.filter(a => a.members.includes(npc.name));
  const allianceMembers = new Set(npcAlliances.flatMap(a => a.members));

  let best: { name: string; score: number } | null = null;

  eligible.forEach(target => {
    let score = 0;
    // Base: suspicion of target (higher suspicion -> more likely to vote)
    score += target.psychProfile.suspicionLevel * 0.5;
    // If target is an ally, reduce score unless trust is very low
    if (allianceMembers.has(target.name)) {
      const allianceTrust = npcAlliances.find(a => a.members.includes(target.name))?.strength ?? 50;
      score -= allianceTrust * 0.7;
      if (npc.psychProfile.trustLevel < 30) {
        score += 10; // low-trust NPC may still target allies
      }
    }
    // Relationship via memory: negative emotional interactions with target push score up
    const relImpact = npc.memory
      .filter(m => m.participants.includes(target.name) && m.type === 'conversation')
      .reduce((sum, m) => sum + (m.emotionalImpact || 0), 0);
    score += -relImpact * 4;

    // Strategic: target in many alliances -> threat
    const targetAlliances = gameState.alliances.filter(a => a.members.includes(target.name)).length;
    score += targetAlliances * 12;

    // Endgame: competitive disposition on target increases score slightly
    if (target.psychProfile.disposition.includes('competitive')) {
      score += 8;
    }

    if (!best || score > best.score) {
      best = { name: target.name, score };
    }
  });

  return best?.name;
}

/**
 * Ask an NPC for their elimination vote plan and classify their declaration.
 * - Uses AIVotingStrategy to get what they would share when asked (their words).
 * - Classifies honesty using only heuristics (trust/suspicion, alliance context, inferred likely target).
 * - Accepts optional persisted weekly plans to ensure consistency.
 */
export function askForEliminationVote(
  npc: Contestant,
  gameState: GameState,
  persistedPlans?: { [name: string]: { target: string; reasoning: string; confidence: number; willReveal: boolean; willLie: boolean; alternativeTargets: string[] } }
): VoteAskResult {
  let plansMap: Map<string, any>;
  if (persistedPlans) {
    plansMap = new Map<string, any>(Object.entries(persistedPlans));
  } else {
    plansMap = AIVotingStrategy.generateWeeklyVotingPlans(gameState); // fallback ephemeral
  }
  const shared = AIVotingStrategy.getShareableVotingInfo(npc, gameState, plansMap);

  const declaredTarget = shared.target || 'undecided';
  const reasoning = shared.reasoning || 'No reasoning given';

  const likelyTarget = inferLikelyVoteTarget(npc, gameState);

  // Heuristic honesty classification
  let honesty: VoteHonesty = 'maybe';
  let explanation = 'Limited signals; their statement is plausible but not confirmed.';

  const highTrust = npc.psychProfile.trustLevel >= 60;
  const highSuspicion = npc.psychProfile.suspicionLevel >= 60;
  const deceptivePersona = npc.psychProfile.disposition.includes('deceptive');

  if (declaredTarget === 'undecided') {
    honesty = 'maybe';
    explanation = 'They claim to be undecided; given current context, that’s plausible.';
  } else if (likelyTarget && declaredTarget === likelyTarget && highTrust && !highSuspicion) {
    honesty = 'truth';
    explanation = `Declared target matches our inference and their profile favors honesty.`;
  } else if (likelyTarget && declaredTarget !== likelyTarget && (highSuspicion || deceptivePersona)) {
    honesty = 'lie';
    explanation = `Declared target differs from our inference and their profile suggests misdirection.`;
  } else if (!likelyTarget && highTrust && !highSuspicion) {
    honesty = 'truth';
    explanation = `No strong inference available; trust metrics suggest they’re likely honest.`;
  } else {
    honesty = 'maybe';
    explanation = `Signals mixed; cannot confidently label this as honest or deceptive.`;
  }

  return { declaredTarget, reasoning, honesty, explanation, likelyTarget };
}
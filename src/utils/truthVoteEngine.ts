import { Contestant, GameState } from '@/types/game';

/**
 * Lightweight heuristic: NPC casts a vote on whether a statement is true.
 * "No meta gaming" — the read is based on their trust/suspicion and simple topic cues,
 * not omniscient knowledge.
 */
export type TruthVoteValue = 'truth' | 'lie' | 'maybe';

export interface TruthVoteResult {
  vote: TruthVoteValue;
  rationale: string;
}

const topicWeights = [
  { key: /vote|eliminate|target|numbers/i, bias: -8 },        // game talk is often slippery
  { key: /alliance|ally|secret/i, bias: -5 },                 // secrecy induces doubt
  { key: /romance|flirt|relationship/i, bias: -3 },           // emotions cloud reads
  { key: /confessional|truth is/i, bias: +4 },                // direct honesty signals
  { key: /plan|strategy|scheme/i, bias: -4 },                 // strategic framing = spin
  { key: /personal|history|fear|motivation/i, bias: +2 },     // personal vulnerability = sincerity
];

export function getTruthVote(npc: Contestant, statement: string, gameState: GameState): TruthVoteResult {
  // Base read from NPC's current profile
  const trust = npc.psychProfile.trustLevel;        // -100..100
  const suspicion = npc.psychProfile.suspicionLevel; // 0..100

  // Normalize to a simple score
  let score = Math.round(trust / 2) - Math.round(suspicion / 3);

  // Apply topic cues
  for (const t of topicWeights) {
    if (t.key.test(statement)) {
      score += t.bias;
    }
  }

  // Very light social context: if player and NPC are in an alliance, increase trust weighting slightly
  const playerName = gameState.playerName;
  const sameAlliance = gameState.alliances.some(a => !a.dissolved && a.members.includes(playerName) && a.members.includes(npc.name));
  if (sameAlliance) {
    score += 6;
  }

  // Recent memory: if NPC has a positive memory involving the player, slightly nudge toward truth
  const recentMemories = npc.memory.filter(m => m.day >= gameState.currentDay - 3);
  const positiveRecent = recentMemories.some(m => (m.participants || []).includes(playerName) && (m.emotionalImpact ?? 0) > 0);
  if (positiveRecent) {
    score += 5;
  }

  // Clamp and map to categorical vote
  const clamped = Math.max(-100, Math.min(100, score));
  let vote: TruthVoteValue;
  if (clamped >= 25) vote = 'truth';
  else if (clamped <= -10) vote = 'lie';
  else vote = 'maybe';

  const rationale = `Read based on current trust (${trust}), suspicion (${suspicion}), and context cues.`;

  return { vote, rationale };
}
// Manipulation Resolution
//
// Replaces the old coin-flip scheme resolution. A manipulation attempt now
// resolves against how well the player has set the play up: how much the target
// trusts them, how suspicious the target already is, how gullible/paranoid that
// personality is, whether they are allied, and how often the player has already
// worked this same person. A clean, well-set-up lie can land with NO suspicion
// gain at all — that is what makes manipulation a viable strategy instead of a
// tax.

import type { Contestant, GameState } from '@/types/game';
import { getNPCPersonalityBias } from '@/utils/aiResponseEngine';

export type SchemeTone =
  | 'information_trade'
  | 'vote_manipulation'
  | 'rumor_spread'
  | 'fake_alliance'
  | 'alliance_break'
  | string;

export type ManipulationOutcome =
  | 'clean_success' // believed, target never suspects the player
  | 'success' // works, target logs a faint doubt
  | 'partial' // doesn't move them, but no lasting damage
  | 'backfire'; // read on the spot

export interface ManipulationResolution {
  outcome: ManipulationOutcome;
  success: boolean;
  trustDelta: number;
  suspicionDelta: number;
  score: number; // 0..100 setup quality, for debug/UI
  reasons: string[];
  summary: string;
}

/** How many times the player has schemed on this person before. */
export function priorSchemeAttempts(state: GameState, targetName: string): number {
  const target = state.contestants.find((c) => c.name === targetName);
  if (!target) return 0;
  return (target.memory || []).filter(
    (m) => m.type === 'scheme' && m.participants.includes(state.playerName),
  ).length;
}

const TONE_DIFFICULTY: Record<string, number> = {
  information_trade: 0,
  vote_manipulation: 8,
  rumor_spread: 12,
  alliance_break: 18,
  fake_alliance: 22,
};

export function resolveManipulation(
  state: GameState,
  target: Contestant,
  tone: SchemeTone,
  content: string,
): ManipulationResolution {
  const bias = getNPCPersonalityBias(target);
  const disposition = target.psychProfile.disposition || [];
  const reasons: string[] = [];

  // Setup quality, 0..100.
  let score = 45;

  const trust = target.psychProfile.trustLevel; // -100..100
  score += trust * 0.28;
  if (trust >= 45) reasons.push(`${target.name} genuinely trusts you`);
  if (trust <= -20) reasons.push(`${target.name} already keeps you at arm's length`);

  const susp = target.psychProfile.suspicionLevel; // 0..100
  score -= susp * 0.3;
  if (susp >= 55) reasons.push('they were already watching you');

  // Personality: gullible/trusting are workable, sharp readers are not.
  score -= (bias.manipulationDetection - 50) * 0.35;
  score -= (bias.suspiciousness - 50) * 0.15;
  if (disposition.includes('trusting') || disposition.includes('emotional')) {
    score += 10;
    reasons.push('they take people at their word');
  }
  if (disposition.includes('paranoid') || disposition.includes('calculating')) {
    score -= 10;
    reasons.push('they read every angle');
  }

  // Allies give you cover; they want to believe you.
  const allied = state.alliances.some(
    (a) => !a.dissolved && a.members.includes(target.name) && a.members.includes(state.playerName),
  );
  if (allied) {
    score += 12;
    reasons.push('your alliance gives the story cover');
  }

  // Craft: a specific, detailed play sells better than a one-liner.
  const words = (content || '').trim().split(/\s+/).filter(Boolean).length;
  if (words >= 25) score += 10;
  else if (words >= 12) score += 5;
  else {
    score -= 8;
    reasons.push('the pitch was thin');
  }
  if (/\b(vote|target|numbers|alliance|final|flip)\b/i.test(content || '')) score += 4;

  // Difficulty of the ask.
  score -= TONE_DIFFICULTY[tone] ?? 10;

  // Going back to the same well repeatedly is what gets you caught.
  const attempts = priorSchemeAttempts(state, target.name);
  if (attempts > 0) {
    score -= Math.min(24, attempts * 8);
    reasons.push(`you've worked ${target.name} ${attempts} time${attempts > 1 ? 's' : ''} already`);
  }

  // Exposed lies still sitting in their head poison everything.
  const exposed = (target.psychProfile.plantedBeliefs || []).filter((b) => b.status === 'exposed').length;
  if (exposed > 0) {
    score -= Math.min(25, exposed * 12);
    reasons.push('they have already caught you in one lie');
  }

  score += (Math.random() * 22) - 11; // small volatility
  score = Math.max(0, Math.min(100, score));

  let outcome: ManipulationOutcome;
  if (score >= 72) outcome = 'clean_success';
  else if (score >= 52) outcome = 'success';
  else if (score >= 34) outcome = 'partial';
  else outcome = 'backfire';

  const difficulty = (TONE_DIFFICULTY[tone] ?? 10) / 10; // 0..2.2 scaling
  let trustDelta = 0;
  let suspicionDelta = 0;
  switch (outcome) {
    case 'clean_success':
      // The whole point: a well-built lie costs you nothing.
      trustDelta = 4;
      suspicionDelta = 0;
      break;
    case 'success':
      trustDelta = 2;
      suspicionDelta = Math.round(2 + difficulty);
      break;
    case 'partial':
      trustDelta = -1;
      suspicionDelta = Math.round(4 + difficulty * 2);
      break;
    case 'backfire':
      trustDelta = -Math.round(4 + difficulty * 2);
      suspicionDelta = Math.round(9 + difficulty * 3);
      break;
  }

  const summary =
    outcome === 'clean_success'
      ? `${target.name} bought it completely — nothing came back on you.`
      : outcome === 'success'
      ? `${target.name} went along with it, with a flicker of doubt.`
      : outcome === 'partial'
      ? `${target.name} didn't bite, but nothing broke.`
      : `${target.name} read your hand.`;

  return {
    outcome,
    success: outcome === 'clean_success' || outcome === 'success',
    trustDelta,
    suspicionDelta,
    score: Math.round(score),
    reasons,
    summary,
  };
}

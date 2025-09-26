import { speechActClassifier } from './speechActClassifier';

/**
 * Lightweight analyzer for player's finale speech.
 * Returns an impact score to be added to jury evaluation and a descriptive tier.
 * Scale: 0 (none) .. 20 (high)
 */
export type SpeechQuality = {
  impact: number; // 0..20
  tier: 'none' | 'weak' | 'solid' | 'compelling';
  rationale: string;
};

const strategicKeywords = [
  'strategy',
  'social',
  'game',
  'move',
  'moves',
  'alliances',
  'alliance',
  'vote',
  'jury',
  'respect',
  'loyal',
  'loyalty',
  'betrayal',
  'immunity',
  'challenge',
  'trust',
  'truth',
  'accountable',
  'accountability',
  'ownership',
  'adapt',
  'adapted',
  'growth',
  'learned',
  'mistake',
  'mistakes',
];

function wordCount(s: string): number {
  const m = s.trim().match(/\b[\w']+\b/g);
  return m ? m.length : 0;
}

function sentenceCount(s: string): number {
  const m = s.split(/[.!?]+/).map(x => x.trim()).filter(Boolean);
  return m.length;
}

function uniqueWordRatio(s: string): number {
  const words = (s.toLowerCase().match(/\b[\w']+\b/g) || []).filter(Boolean);
  if (words.length === 0) return 0;
  const uniq = new Set(words);
  return uniq.size / words.length;
}

function keywordHits(s: string): number {
  const lower = s.toLowerCase();
  return strategicKeywords.reduce((acc, k) => acc + (lower.includes(k) ? 1 : 0), 0);
}

export function analyzeFinaleSpeech(text: string): SpeechQuality {
  const raw = (text || '').trim();

  // Trivial or non-existent speech: zero impact
  const wc = wordCount(raw);
  if (!raw || wc < 5 || raw.length < 25) {
    return {
      impact: 0,
      tier: 'none',
      rationale: 'Too short to influence the jury.',
    };
  }

  // Use existing classifier to extract subtext signals
  const act = speechActClassifier.classifyMessage(raw, 'Player');

  // Core features
  const sentences = sentenceCount(raw);
  const uniqRatio = uniqueWordRatio(raw);
  const hits = keywordHits(raw);

  // Base from length and structure
  let score = 0;
  // Length: up to +8
  score += Math.min(8, Math.floor(raw.length / 80) * 2); // ~160 chars -> +4, 320 -> +8
  // Sentences: up to +4 (encourage structure)
  score += Math.min(4, Math.max(0, sentences - 1));
  // Strategic keywords: up to +4
  score += Math.min(4, hits);
  // Diversity: up to +2
  score += Math.min(2, Math.floor(uniqRatio * 4)); // 0..2

  // Subtext shaping: sincerity and confidence help; manipulation hurts
  // Clamp subtext values already 0..100
  score += Math.round((act.emotionalSubtext.sincerity - 50) / 25); // -2..+2
  score += Math.round((act.emotionalSubtext.confidence - 50) / 25); // -2..+2
  score -= Math.round((act.manipulationLevel) / 33); // 0..-3
  // Extreme anger/fear dampens persuasiveness slightly
  score -= Math.round(Math.max(0, act.emotionalSubtext.anger - 60) / 20); // 0..-2
  score -= Math.round(Math.max(0, act.emotionalSubtext.fear - 60) / 20); // 0..-2

  // Normalize and clamp 0..20
  const clamped = Math.max(0, Math.min(20, score));

  let tier: SpeechQuality['tier'] = 'weak';
  if (clamped >= 16) tier = 'compelling';
  else if (clamped >= 9) tier = 'solid';
  else if (clamped >= 1) tier = 'weak';
  else tier = 'none';

  const rationaleParts: string[] = [];
  if (sentences >= 2) rationaleParts.push('structured');
  if (hits >= 2) rationaleParts.push('strategic');
  if (act.emotionalSubtext.sincerity >= 60) rationaleParts.push('sincere');
  if (act.emotionalSubtext.confidence >= 60) rationaleParts.push('confident');
  if (act.manipulationLevel >= 50) rationaleParts.push('overly manipulative');

  return {
    impact: clamped,
    tier,
    rationale: rationaleParts.length ? rationaleParts.join(', ') : 'basic',
  };
}
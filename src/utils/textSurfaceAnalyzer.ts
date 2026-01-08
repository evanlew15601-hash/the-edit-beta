import { SurfaceFeatures } from '@/types/interpretation';
import { speechActClassifier } from './speechActClassifier';

/**
 * Lightweight surface analyzer.
 * Captures the shape of the text without interpreting social intent.
 */
export function analyzeSurface(text: string): SurfaceFeatures {
  const raw = text || '';
  const trimmed = raw.trim();

  // Basic structure
  const charCount = trimmed.length;
  const words = trimmed.match(/\b[\w']+\b/g) || [];
  const wordCount = words.length;
  const sentenceSplits = trimmed.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const sentenceCount = sentenceSplits.length || (wordCount > 0 ? 1 : 0);
  const averageSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;

  // Fragments: short segments that look like sentence fragments
  const fragments = trimmed.split(/[\n.!?]/).map(s => s.trim()).filter(Boolean);
  const fragmentCount = fragments.filter(s => {
    const wc = s.split(/\s+/).filter(Boolean).length;
    return wc > 0 && wc < 4;
  }).length;
  const fragmentRatio = sentenceCount > 0 ? Math.min(1, fragmentCount / sentenceCount) : 0;

  // Punctuation features
  const exclamationCount = (trimmed.match(/!/g) || []).length;
  const questionCount = (trimmed.match(/\?/g) || []).length;
  const ellipsisCount = (trimmed.match(/\.{3,}/g) || []).length;
  const punctuationCount = (trimmed.match(/[!?.,;]/g) || []).length;
  const punctuationDensity = charCount > 0 ? (punctuationCount / charCount) * 100 : 0;

  // Lexical markers
  const lower = trimmed.toLowerCase();

  const hedges = ['maybe', 'i guess', 'kind of', 'sort of', 'i think', 'low-key', 'lowkey', 'honestly', 'tbh'];
  const absolutes = ['always', 'never', 'everyone', 'no one', 'literally', 'for sure', 'definitely'];
  const politeness = ['please', 'thank you', 'thanks', 'sorry', 'excuse me', 'would you mind'];
  const bluntStarts = ['no', 'stop', 'listen', 'look', 'nah', 'nope'];

  const hedgingCount = hedges.reduce(
    (acc, h) => acc + (lower.includes(h) ? 1 : 0),
    0
  );
  const absolutesCount = absolutes.reduce(
    (acc, a) => acc + (lower.includes(a) ? 1 : 0),
    0
  );
  const politenessCount = politeness.reduce(
    (acc, p) => acc + (lower.includes(p) ? 1 : 0),
    0
  );

  const bluntMarkersCount = bluntStarts.reduce((acc, b) => {
    // crude: treat as blunt if starts with the word followed by space or punctuation
    const re = new RegExp(`^\\s*${b}\\b`, 'i');
    return acc + (re.test(trimmed) ? 1 : 0);
  }, 0);

  const directAddressCount = (trimmed.match(/\byou\b/gi) || []).length;
  const indirectRefCount = (trimmed.match(/\bthey\b|\bpeople\b|\bsome folks\b/gi) || []).length;

  const allCapsWordCount = (trimmed.match(/\b[A-Z]{2,}\b/g) || []).length;

  // Emotional intensity derived from existing emotional lexicon
  const act = speechActClassifier.classifyMessage(trimmed, 'Player');
  const emotionalWordIntensity =
    (act.emotionalSubtext.anger +
      act.emotionalSubtext.fear +
      act.emotionalSubtext.attraction +
      act.emotionalSubtext.desperation) /
    4;

  const startsWithHedge = hedges.some(h => {
    const firstToken = h.split(' ')[0];
    return lower.startsWith(firstToken);
  });

  const softeners = [
    "if that's okay",
    'if thats okay',
    'just saying',
    'just sayin',
    'no offense',
  ];
  const endsWithSoftener = softeners.some(s => lower.endsWith(s));
  const endsWithQuestion = trimmed.endsWith('?');

  const metaText = speechActClassifier.isMetaText(trimmed);

  return {
    charCount,
    wordCount,
    sentenceCount,
    averageSentenceLength,
    fragmentRatio,
    exclamationCount,
    questionCount,
    ellipsisCount,
    punctuationDensity,
    hedgingCount,
    absolutesCount,
    politenessCount,
    bluntMarkersCount,
    directAddressCount,
    indirectRefCount,
    allCapsWordCount,
    emotionalWordIntensity,
    startsWithHedge,
    endsWithQuestion,
    endsWithSoftener,
    metaText,
  };
}
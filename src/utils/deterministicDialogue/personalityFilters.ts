import { Archetype, Emotion } from './types';

// Map a contestant's psychProfile disposition (string tags) into a single
// Archetype that filters word choice. This is pure and deterministic.
export function deriveArchetypeFromDisposition(
  disposition: string[] | undefined,
  psychProfile?: { trustLevel?: number; suspicionLevel?: number }
): Archetype {
  const d = (disposition || []).map(s => s.toLowerCase());
  const has = (...keys: string[]) => keys.some(k => d.some(t => t.includes(k)));

  if (has('hothead', 'aggressive', 'volatile', 'angry', 'confrontational')) return 'Hothead';
  if (has('strategist', 'mastermind', 'analyst', 'tactician', 'calculating')) return 'Strategist';
  if (has('passive', 'sarcastic', 'snide', 'shady', 'catty')) return 'PassiveAggressive';
  if (has('charm', 'flirt', 'charismatic', 'social', 'smooth')) return 'Charmer';
  if (has('paranoid', 'anxious', 'suspicious', 'jumpy')) return 'Paranoid';
  if (has('stoic', 'quiet', 'reserved', 'cool', 'unbothered')) return 'Stoic';
  if (has('wild', 'chaos', 'unpredictable', 'wildcard')) return 'Wildcard';

  const s = psychProfile?.suspicionLevel ?? 30;
  const t = psychProfile?.trustLevel ?? 0;
  if (s > 70) return 'Paranoid';
  if (t > 50) return 'Charmer';
  return 'Strategist';
}

// Verbal tics — occasional inserts that color voice without changing meaning.
const TICS: Record<Archetype, string[]> = {
  Hothead: ['Listen,', 'Real talk,'],
  Strategist: ['Look,', 'Long-term,'],
  PassiveAggressive: ['Interesting.', 'Funny.'],
  Charmer: ['Between us,', 'Just so you know,'],
  Paranoid: ['I should not be saying this, but', 'Keep your voice down —'],
  Stoic: [''],
  Wildcard: ['Hear me out —', 'Plot twist —'],
};

// Vocabulary swaps — light substitutions toward archetype voice.
const SWAPS: Record<Archetype, Array<[RegExp, string]>> = {
  Hothead: [
    [/\bissue\b/gi, 'problem'],
  ],
  Strategist: [
    [/\bguess\b/gi, 'read'],
  ],
  PassiveAggressive: [
    [/\bI see\b/gi, 'I noticed'],
  ],
  Charmer: [
    [/\bokay\b/gi, 'alright'],
  ],
  Paranoid: [
    [/\bheard\b/gi, 'overheard'],
  ],
  Stoic: [
    [/\bvery\b/gi, ''],
    [/\bhonestly,?\b/gi, ''],
    [/\bI think\b/gi, ''],
  ],
  Wildcard: [
    [/\bplan\b/gi, 'idea'],
  ],
};

// Sentence-rhythm rules — applied after swaps.
function applyRhythm(line: string, archetype: Archetype): string {
  switch (archetype) {
    case 'Hothead':
      // Sharp, short, ends in a punch.
      line = line.replace(/\b(I think|maybe|kinda|sort of|honestly,?)\b/gi, '').trim();
      if (!/[.!?]$/.test(line)) line += '.';
      line = line.replace(/\.$/, '!');
      // Split long sentences into staccato fragments.
      line = line.replace(/,\s+/g, '. ');
      break;
    case 'Strategist':
      line = line.replace(/^You\b/, 'Look, you');
      // Add a measured beat before declarations.
      if (/^(I|You|We|They)/.test(line) && line.length > 40 && !/^Look,/.test(line)) {
        line = 'Listen — ' + line;
      }
      break;
    case 'PassiveAggressive':
      if (!/^(interesting|funny|cute|oh)/i.test(line)) {
        line = 'Interesting. ' + line;
      }
      line = line.replace(/\.$/, '. 🙂'.replace(' 🙂', '')); // no emoji, just keep period
      break;
    case 'Charmer':
      // Soften openers, add the player's name presence.
      if (!/^hey/i.test(line)) line = 'Hey — ' + line;
      line = line.replace(/^Hey — hey/i, 'Hey');
      break;
    case 'Paranoid':
      // Add a trailing watcher beat sometimes; halt mid-sentence.
      if (!/watching|voice down|noticing/i.test(line)) line += " I'm watching everything.";
      break;
    case 'Stoic':
      // Strip exclamations and modifiers, keep terse.
      line = line.replace(/!+/g, '.');
      line = line.replace(/\b(really|very|honestly|kinda|just)\b/gi, '').trim();
      // Cap at two sentences.
      const sentences = line.split(/(?<=[.!?])\s+/).slice(0, 2);
      line = sentences.join(' ');
      break;
    case 'Wildcard':
      // Off-kilter trail.
      const tails = [' Probably.', ' Somehow.', ' That is where I am.'];
      line = line + tails[line.length % tails.length];
      break;
  }
  return line;
}

// Transform a base line into the archetype's voice with swaps + tics + rhythm.
// Light-touch — never changes meaning, only color.
export function applyArchetypeVoice(line: string, archetype: Archetype, seed?: string): string {
  // 1) vocabulary swaps
  for (const [pattern, repl] of SWAPS[archetype]) {
    line = line.replace(pattern, repl);
  }
  // 2) deterministic tic injection (only sometimes, based on seed length)
  const seedNum = (seed || line).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const shouldTic = archetype !== 'Stoic' && seedNum % 4 === 0;
  if (shouldTic) {
    const tics = TICS[archetype];
    const tic = tics[seedNum % tics.length];
    if (tic) line = `${tic} ${line.charAt(0).toLowerCase()}${line.slice(1)}`;
  }
  // 3) sentence rhythm
  line = applyRhythm(line, archetype);
  return line.replace(/\s+/g, ' ').trim();
}

// Pick a body-language beat for the bundle. Used by the response engine to
// wrap the line with a non-verbal lead-in.
export function pickBodyLanguage(
  emotion: Emotion,
  archetype: Archetype,
  pools: { base: string[]; tilt?: string[] },
  seed: string
): string | undefined {
  const seedNum = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  // Fire ~60% of the time deterministically
  if (seedNum % 5 < 2) return undefined;
  const useTilt = pools.tilt && pools.tilt.length > 0 && seedNum % 3 === 0;
  const arr = useTilt ? pools.tilt! : pools.base;
  if (!arr.length) return undefined;
  return arr[seedNum % arr.length];
}

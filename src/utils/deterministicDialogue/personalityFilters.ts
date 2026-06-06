import { Archetype } from './types';

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

  // Fallback from suspicion/trust bands
  const s = psychProfile?.suspicionLevel ?? 30;
  const t = psychProfile?.trustLevel ?? 0;
  if (s > 70) return 'Paranoid';
  if (t > 50) return 'Charmer';
  return 'Strategist';
}

// Transform a base line into the archetype's voice. Light-touch substitution
// only — never changes meaning.
export function applyArchetypeVoice(line: string, archetype: Archetype): string {
  let out = line;
  switch (archetype) {
    case 'Hothead':
      // sharper, shorter, drop hedges
      out = out.replace(/\b(I think|maybe|kinda|sort of|honestly,?)\b/gi, '').trim();
      if (!/[.!?]$/.test(out)) out += '.';
      out = out.replace(/\.$/, '!');
      break;
    case 'Strategist':
      // cooler, more precise; soften imperatives slightly
      out = out.replace(/^You\b/, "Look, you");
      break;
    case 'PassiveAggressive':
      // add a sly preface sometimes
      if (!/^interesting|^funny|^cute/i.test(out)) {
        out = 'Interesting. ' + out;
      }
      break;
    case 'Charmer':
      out = out.replace(/^([A-Z])/, (m) => m.toLowerCase());
      out = 'Hey — ' + out;
      out = out.replace(/^Hey — hey/i, 'Hey');
      break;
    case 'Paranoid':
      out = out + ' I'm watching.';
      break;
    case 'Stoic':
      // strip exclamations, keep terse
      out = out.replace(/!+/g, '.');
      break;
    case 'Wildcard':
      // occasionally append a wink
      out = out + ' ...probably.';
      break;
  }
  return out.replace(/\s+/g, ' ').trim();
}

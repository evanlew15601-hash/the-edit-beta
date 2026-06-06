import { Contestant } from '@/types/game';
import { ResponseTagBundle } from './types';
import { getPool, MEMORY_CALLBACKS, RESPONSE_LIBRARY } from './responseLibrary';
import { applyArchetypeVoice } from './personalityFilters';
import { decideResponse, DecisionInput, seededPick } from './decisionEngine';

function substituteTokens(line: string, tokens: Record<string, string | undefined>): string {
  return line.replace(/\{(\w+)\}/g, (_m, key) => {
    const v = tokens[key];
    return v != null && v !== '' ? String(v) : key === 'about' ? 'someone' : '';
  }).replace(/\s+([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

// Walk back from (intent, emotion) to the nearest stocked pool.
function findBackoffPool(bundle: ResponseTagBundle): string[] {
  const tries: [typeof bundle.intent, typeof bundle.emotion][] = [
    [bundle.intent, bundle.emotion],
    [bundle.intent, 'GUARDED'],
    [bundle.intent, 'SINCERE'],
    ['GREET', bundle.emotion],
    ['GREET', 'GUARDED'],
  ];
  for (const [i, e] of tries) {
    const p = getPool(i, e);
    if (p.length) return p;
  }
  // Last-resort: any pool whose intent matches
  for (const key of Object.keys(RESPONSE_LIBRARY)) {
    if (key.startsWith(bundle.intent + '_')) {
      const arr = (RESPONSE_LIBRARY as any)[key] as string[];
      if (arr?.length) return arr;
    }
  }
  return ["I hear you, {player}. Let me think on it."];
}

export interface RenderInput {
  bundle: ResponseTagBundle;
  npc: Contestant;
  playerName: string;
  seedExtra?: string;
}

export function renderResponse({ bundle, npc, playerName, seedExtra }: RenderInput): string {
  const seed = `${npc.id || npc.name}|${bundle.intent}|${bundle.emotion}|${seedExtra || ''}`;
  const pool = findBackoffPool(bundle);
  const baseLine = seededPick(pool, seed) || pool[0];

  const tokens: Record<string, string | undefined> = {
    player: playerName,
    target: playerName,
    days: bundle.memoryRef?.daysAgo != null ? String(bundle.memoryRef.daysAgo) : undefined,
    about: bundle.memoryRef?.about,
  };

  let line = substituteTokens(baseLine, tokens);

  // Weave in memory callback when one is selected (40% of the time).
  if (bundle.memoryRef) {
    const callbacks = MEMORY_CALLBACKS[bundle.memoryRef.kind] || [];
    const cb = seededPick(callbacks, seed + '|cb');
    const shouldUse = (Math.abs(seed.length + bundle.memoryRef.daysAgo) % 5) <= 1;
    if (cb && shouldUse) {
      const cbLine = substituteTokens(cb, tokens);
      // Place the callback first for emphasis
      line = `${cbLine} ${line}`;
    }
  }

  return applyArchetypeVoice(line, bundle.archetype);
}

export function decideAndRender(input: DecisionInput): { text: string; bundle: ResponseTagBundle } {
  const bundle = decideResponse(input);
  const text = renderResponse({
    bundle,
    npc: input.npc,
    playerName: input.playerName,
    seedExtra: `${input.socialContext?.currentDay || 0}|${input.socialContext?.turn || 0}`,
  });
  return { text, bundle };
}

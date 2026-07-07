import { Contestant } from '@/types/game';
import { ResponseTagBundle } from './types';
import {
  getPool,
  getArchetypePool,
  MEMORY_CALLBACKS,
  RESPONSE_LIBRARY,
  BODY_LANGUAGE,
  ARCHETYPE_BODY_TILTS,
} from './responseLibrary';
import { applyArchetypeVoice, pickBodyLanguage } from './personalityFilters';
import { decideResponse, DecisionInput, seededPick } from './decisionEngine';

function substituteTokens(line: string, tokens: Record<string, string | undefined>): string {
  return line.replace(/\{(\w+)\}/g, (_m, key) => {
    const v = tokens[key];
    if (v != null && v !== '') return String(v);
    return '';
  }).replace(/\s+([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

function requiredTokensOf(line: string): string[] {
  const out: string[] = [];
  line.replace(/\{(\w+)\}/g, (_m, key) => {
    out.push(key);
    return _m;
  });
  return out;
}

function canRender(line: string, tokens: Record<string, string | undefined>): boolean {
  return requiredTokensOf(line).every(key => !!tokens[key]);
}

function pickRenderable(pool: string[], seed: string, tokens: Record<string, string | undefined>): string {
  const renderable = pool.filter(line => canRender(line, tokens));
  const safePool = renderable.length ? renderable : pool.filter(line => requiredTokensOf(line).length === 0);
  return seededPick(safePool, seed) || safePool[0] || "I hear you. Let me think on it.";
}

// Walk back from (intent, emotion) to the nearest stocked pool. Archetype-specific
// pools take precedence when they exist.
function findBackoffPool(bundle: ResponseTagBundle): string[] {
  const archPool = getArchetypePool(bundle.intent, bundle.emotion, bundle.archetype);
  if (archPool.length) return archPool;

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
  const tokens: Record<string, string | undefined> = {
    player: playerName,
    target: playerName,
    days: bundle.memoryRef?.daysAgo != null ? String(bundle.memoryRef.daysAgo) : undefined,
    about: bundle.memoryRef?.about,
    people: bundle.memoryRef?.about, // people callbacks reuse `about` formatting from formatPeople
    event: bundle.memoryRef?.eventLabel,
  };

  const baseLine = pickRenderable(pool, seed, tokens);

  let line = substituteTokens(baseLine, tokens);

  // Weave in memory callback when one is selected (~40% of the time, deterministic).
  if (bundle.memoryRef) {
    const callbacks = MEMORY_CALLBACKS[bundle.memoryRef.kind] || [];
    const renderableCallbacks = callbacks.filter(cbLine => canRender(cbLine, tokens));
    const cb = seededPick(renderableCallbacks, seed + '|cb');
    const shouldUse = (Math.abs(seed.length + bundle.memoryRef.daysAgo) % 5) <= 1;
    if (cb && shouldUse) {
      const cbLine = substituteTokens(cb, tokens);
      line = `${cbLine} ${line}`;
    }
  }

  // Apply archetype voice (vocab swaps + tics + rhythm).
  line = applyArchetypeVoice(line, bundle.archetype, seed);

  // Body language lead-in (~60% of the time, deterministic).
  const bodyBase = BODY_LANGUAGE[bundle.emotion] || [];
  const bodyTilt = ARCHETYPE_BODY_TILTS[bundle.archetype];
  const body = pickBodyLanguage(bundle.emotion, bundle.archetype, { base: bodyBase, tilt: bodyTilt }, seed + '|bl');
  if (body) {
    line = `${body} ${line}`;
  }

  // Hidden subtext — quiet trailing beat when emotion contradicts state.
  if (bundle.subtext) {
    line = `${line} ${bundle.subtext}`;
  }

  // Persist body language onto the bundle so debuggers/UI can surface it.
  if (body) bundle.bodyLanguage = body;

  return line;
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

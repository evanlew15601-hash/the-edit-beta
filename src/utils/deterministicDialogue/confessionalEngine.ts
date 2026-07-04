import { Contestant, GameState } from '@/types/game';
import { seededPick } from './decisionEngine';
import { deriveArchetypeFromDisposition } from './personalityFilters';
import { Archetype } from './types';

// Deterministic confessional builder.
//
// Confessionals are short, first-person diary-room lines. They must:
//  - reference the real game state (day, remaining count, allies, threats)
//  - reference a real recent memory when one exists
//  - sound like the NPC's archetype (Hothead vs Strategist vs Charmer, etc.)
//  - never leak template tokens or empty punctuation
//
// The output is always 1 or 2 sentences. If a slot has no valid value the
// sentence containing it is dropped rather than rendered with "someone" or
// "the day-0 blowup" style fillers.

// ─────────────────────── SITUATION DETECTION ───────────────────────

type Situation =
  | 'burnt'          // recent betrayal memory
  | 'paranoid'       // very high suspicion
  | 'threatened'     // late game + rising suspicion
  | 'loyal'          // has a real high-trust ally
  | 'scheming'       // low trust + medium suspicion
  | 'romantic'       // reciprocated flirt on record
  | 'isolated'       // no allies above neutral
  | 'winning'        // top of social power, low suspicion
  | 'reflective';    // default

interface ConfessionalContext {
  npc: Contestant;
  archetype: Archetype;
  situation: Situation;
  day: number;
  remaining: number;
  jury: boolean;
  ally?: string;      // real ally name (trust >= 40) or undefined
  threat?: string;    // real threat name (suspicion >= 55, or betrayer) or undefined
  romancePartner?: string; // actual partner name from memory or undefined
  memoryEvent?: string;   // human-readable, e.g. "the day-6 vote"
  memoryPeople?: string;  // formatted people from a real memory
  playerName: string;
}

function formatPeople(list: string[] | undefined, exclude: string[]): string | undefined {
  if (!list?.length) return undefined;
  const others = list.filter(p => p && !exclude.includes(p));
  if (!others.length) return undefined;
  if (others.length === 1) return others[0];
  if (others.length === 2) return `${others[0]} and ${others[1]}`;
  return `${others.slice(0, -1).join(', ')}, and ${others[others.length - 1]}`;
}

function eventLabelFor(mem: { type: string; day: number; content?: string }): string | undefined {
  // Only return a label when the memory type produces a self-contained,
  // human-sounding phrase. Vague memory types return undefined so no template
  // using {event} will fire from them.
  switch (mem.type) {
    case 'scheme': return `that scheme on day ${mem.day}`;
    case 'alliance_meeting': return `the day-${mem.day} alliance meeting`;
    case 'elimination': return `the day-${mem.day} eviction`;
    case 'confessional_leak': return `what leaked out of the diary room`;
    case 'event': return `the day-${mem.day} blowup`;
    default: return undefined;
  }
}

function pickSituation(ctx: {
  suspicion: number;
  trust: number;
  remaining: number;
  hasBurntableBetrayal: boolean;
  hasStrongAlly: boolean;
  hasThreat: boolean;
  socialPower: number;
  hasRomancePartner: boolean;
}): Situation {
  if (ctx.hasBurntableBetrayal) return 'burnt';
  if (ctx.suspicion >= 75) return 'paranoid';
  if (ctx.remaining <= 6 && ctx.suspicion >= 55 && ctx.hasThreat) return 'threatened';
  if (ctx.hasRomancePartner) return 'romantic';
  if (ctx.socialPower >= 65 && ctx.suspicion < 45) return 'winning';
  if (ctx.hasStrongAlly && ctx.trust >= 55) return 'loyal';
  if (!ctx.hasStrongAlly && ctx.trust < 25) return 'isolated';
  if (ctx.trust < 40 && ctx.suspicion >= 40 && ctx.hasThreat) return 'scheming';
  return 'reflective';
}

function extractRomancePartner(
  npc: Contestant,
  others: Contestant[]
): string | undefined {
  const others_names = new Set(others.map(o => o.name));
  const romanticMem = (npc.memory || []).find(m =>
    /flirt|kiss|crush|romance|showmance/i.test(m.content || '')
  );
  if (!romanticMem) return undefined;
  const partner = (romanticMem.participants || []).find(p => p !== npc.name && others_names.has(p));
  return partner;
}

function buildContext(npc: Contestant, gameState: GameState): ConfessionalContext {
  const active = gameState.contestants.filter(c => !c.isEliminated);
  const others = active.filter(c => c.name !== npc.name);

  const trust = npc.psychProfile?.trustLevel ?? 0;
  const susp = npc.psychProfile?.suspicionLevel ?? 30;
  const archetype = deriveArchetypeFromDisposition(npc.psychProfile?.disposition, npc.psychProfile);

  // Only accept a memory from the last 5 days for narrative freshness AND
  // one that produces a self-contained event label.
  const recentMems = (npc.memory || [])
    .filter(m => gameState.currentDay - m.day <= 5 && m.day > 0)
    .sort((a, b) => b.day - a.day);

  const othersByName = new Map(others.map(o => [o.name, o] as const));

  // A betrayal memory only counts when we can link it to a still-active,
  // suspicious houseguest that isn't the NPC themselves. Otherwise the line
  // "{threat} lit my game up at {event}" would target nobody sensible.
  const betrayalMem = recentMems.find(m => {
    if (!/betray|burned|flipped|lied|backstab/i.test(m.content || '')) return false;
    if (!eventLabelFor(m)) return false;
    const linkedThreat = (m.participants || []).find(
      p => p !== npc.name && othersByName.has(p)
    );
    return !!linkedThreat;
  });

  const threatFromBetrayal = betrayalMem
    ? (betrayalMem.participants || []).find(p => p !== npc.name && othersByName.has(p))
    : undefined;

  const ally = others
    .filter(c => (c.psychProfile?.trustLevel ?? 0) >= 40)
    .sort((a, b) => (b.psychProfile?.trustLevel ?? 0) - (a.psychProfile?.trustLevel ?? 0))[0];

  const suspiciousThreat = others
    .filter(c => (c.psychProfile?.suspicionLevel ?? 0) >= 55)
    .sort((a, b) => (b.psychProfile?.suspicionLevel ?? 0) - (a.psychProfile?.suspicionLevel ?? 0))[0];

  const romancePartner = extractRomancePartner(npc, others);

  // Rough social-power proxy from trust minus suspicion.
  const score = (trust - susp) + 50;
  const socialPower = Math.max(0, Math.min(100, score));

  // A threat name must be a real, still-active, suspicious houseguest — never
  // a "least-worst" fallback. Templates using {threat} simply won't fire when
  // this is undefined, which is exactly what we want.
  const threatName = threatFromBetrayal || suspiciousThreat?.name;

  const situation = pickSituation({
    suspicion: susp,
    trust,
    remaining: active.length,
    hasBurntableBetrayal: !!betrayalMem,
    hasStrongAlly: !!ally,
    hasThreat: !!threatName,
    socialPower,
    hasRomancePartner: !!romancePartner,
  });

  // Only surface a memory event when it's self-contained AND relevant to the
  // situation (burnt uses the betrayal; other situations only garnish from
  // strong, non-conversational event types).
  const chosenMem =
    situation === 'burnt'
      ? betrayalMem
      : recentMems.find(m => !!eventLabelFor(m));

  const memoryEvent = chosenMem ? eventLabelFor(chosenMem) : undefined;
  const memoryPeople = chosenMem
    ? formatPeople(chosenMem.participants, [npc.name])
    : undefined;

  return {
    npc,
    archetype,
    situation,
    day: gameState.currentDay,
    remaining: active.length,
    jury: active.length <= 9,
    ally: ally?.name,
    threat: threatName,
    romancePartner,
    memoryEvent,
    memoryPeople,
    playerName: gameState.playerName,
  };
}


// ─────────────────────── TEMPLATE LIBRARY ───────────────────────
// Templates use tokens: {ally} {threat} {day} {count} {event} {people} {player}
// A template is discarded if it references a token whose value is missing.

type Template = string;

const BY_SITUATION: Record<Situation, Template[]> = {
  burnt: [
    "I gave {threat} a real shot and they used it against me at {event}.",
    "{event} told me everything I needed to know about {threat}.",
    "I don't get burned twice. Not after {event}.",
    "That wasn't a conversation. That was {threat} setting me up.",
    "You extend a hand once in this house. I extended mine and lost {people}.",
  ],
  paranoid: [
    "Every room I walk into goes quiet for half a second. That's not nothing.",
    "{threat} is running numbers on me. I can feel it before they even talk.",
    "Day {day} and I'm counting eye contact like it's currency.",
    "Nobody's told me my name is up. That's exactly why I think it is.",
    "The nice ones scare me more than the loud ones this week.",
  ],
  threatened: [
    "Down to {count}. If I don't move on {threat} this week, {threat} moves on me.",
    "{threat} is the biggest number left in the house. That has to change.",
    "There is no fat left on the bone. Every conversation is a vote now.",
    "Final {count}. I stop being polite tonight.",
  ],
  loyal: [
    "{ally} is the only real thing I've got in here. I'm not breaking that.",
    "Me and {ally} — quiet, tight, nobody sees it coming. That's the whole game.",
    "I'd take {ally} to the end over anyone in this house.",
    "If {ally} goes, my game goes with them. I know that.",
  ],
  scheming: [
    "Tonight I plant the seed on {threat}. By tomorrow it's someone else's idea.",
    "If I say {threat}'s name three times this week, it sticks to the wall.",
    "I'm not campaigning. I'm just... rearranging the furniture.",
    "The best moves in here look like small talk.",
  ],
  romantic: [
    "{partner} and I aren't supposed to be a thing. Somehow we are.",
    "The showmance with {partner} is real. The strategy is more real. Both can be true.",
    "I like {partner}. I'd still cut them if the vote asked me to. That's the house talking.",
    "Every time I talk to {partner}, my whole game slows down for a second. I hate that. I like it.",
  ],
  isolated: [
    "I don't have a person in this house. That's the honest answer.",
    "Day {day} and I'm my own alliance. It's lonely, it's clean.",
    "Nobody's checking on me. Fine. Nobody's asking me for anything either.",
  ],
  winning: [
    "Day {day}, {count} left, and my name hasn't been said in a serious room yet. That's the game.",
    "Everyone thinks they're using me. That's exactly where I want them.",
    "I'm three moves ahead and pretending to be one behind. Perfect.",
  ],
  reflective: [
    "Day {day}. Still here. That's the only stat that matters.",
    "Down to {count}. Every word from here costs something.",
    "This house rewrites you a little every day. I'm okay with that.",
    "I came in with a plan. It's on version four and it's still my plan.",
  ],
};

// Archetype-flavored variants layered on top of situation templates.
const BY_ARCHETYPE_SITUATION: Partial<Record<Archetype, Partial<Record<Situation, Template[]>>>> = {
  Hothead: {
    burnt: [
      "{threat} lit my game up. Now it's a war. That's fine. I like wars.",
      "I don't forget. I don't forgive. {threat} finds that out this week.",
    ],
    threatened: [
      "{threat} wants a problem? I am the problem this week.",
      "Down to {count}. Somebody's about to find out what I actually sound like.",
    ],
    paranoid: [
      "If one more person walks past me without saying hey, I'm flipping a table on live TV.",
    ],
  },
  Strategist: {
    scheming: [
      "The math on {threat} is simple. Three votes, two conversations, one week. Done.",
      "I need {threat} out before jury math turns against me. That's the whole calculation.",
    ],
    winning: [
      "Statistically, my position at {count} is the strongest in the house. I don't say that out loud.",
      "I've got two shields, one number, and a fake alliance. That's a resume.",
    ],
    threatened: [
      "At {count}, my equity in this game peaks tomorrow. If I don't cash in on {threat}, I lose it.",
    ],
    loyal: [
      "{ally} is not a friend. {ally} is a functional partnership with matching incentives. That's better.",
    ],
  },
  Charmer: {
    loyal: [
      "{ally} is my person in here. Everyone else is a conversation I'm having on purpose.",
      "I love {ally}. I'd still lie for them. I'd still lie to them if I had to.",
    ],
    romantic: [
      "They looked at me tonight in a way that would end careers on the outside. I'm keeping it.",
    ],
    scheming: [
      "I don't push. I invite. By the end of the week, {threat}'s name walks in on its own.",
    ],
  },
  PassiveAggressive: {
    burnt: [
      "Oh, {threat} is sweet with me now. Cute. {event} still happened though.",
      "I love how {threat} says my name like we're fine. We're not fine.",
    ],
    paranoid: [
      "The fake laughs in this house could power a small city. Mine included.",
    ],
    scheming: [
      "I'm not saying {threat}'s name. I'm just... asking questions in the right rooms.",
    ],
  },
  Paranoid: {
    paranoid: [
      "{threat} looked at me twice today. Twice. That's a pattern.",
      "Nobody's saying my name. That's the loudest thing I've heard all week.",
    ],
    isolated: [
      "It's better this way. Fewer people, fewer leaks, fewer knives.",
    ],
  },
  Stoic: {
    reflective: [
      "Day {day}. {count} left. That's the report.",
      "Nothing to say. Playing the week.",
    ],
    threatened: [
      "{threat}. This week. Done.",
    ],
    winning: [
      "Quiet week. Good week.",
    ],
  },
  Wildcard: {
    scheming: [
      "I'm going to say {threat}'s name in three different accents this week and see what sticks.",
      "The plan is chaos. The chaos is the plan.",
    ],
    reflective: [
      "Day {day}. I forgot what day it was. That's healthy, right?",
    ],
    romantic: [
      "I fell for them at breakfast. I'll fall out of it by dinner. That's a normal Tuesday.",
    ],
  },
};

// Optional garnish tacked on ~30% of the time when a real recent memory exists
// and the situation isn't already about that memory.
const MEMORY_GARNISH: Template[] = [
  "{event} is still living rent-free in my head.",
  "I keep replaying {event}. It changes what tomorrow looks like.",
  "Half of what I'm doing this week is a reaction to {event}.",
];

// ─────────────────────── RENDER ───────────────────────

function requiredTokensOf(template: string): string[] {
  const out: string[] = [];
  template.replace(/\{(\w+)\}/g, (_m, k) => { out.push(k); return _m; });
  return out;
}

function substitute(template: string, tokens: Record<string, string | undefined>): string | null {
  const required = requiredTokensOf(template);
  for (const key of required) {
    if (!tokens[key]) return null; // drop templates whose real tokens are missing
  }
  const rendered = template.replace(/\{(\w+)\}/g, (_m, k) => tokens[k] as string);
  return rendered.replace(/\s+([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

function pickTemplateFor(ctx: ConfessionalContext, seed: string): string {
  const arch = BY_ARCHETYPE_SITUATION[ctx.archetype]?.[ctx.situation] || [];
  const base = BY_SITUATION[ctx.situation] || BY_SITUATION.reflective;
  // 60% archetype flavor when available, else base pool.
  const seedNum = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const useArch = arch.length > 0 && seedNum % 5 < 3;
  const pool = useArch ? arch : base;

  const tokens: Record<string, string | undefined> = {
    ally: ctx.ally,
    threat: ctx.threat,
    day: String(ctx.day),
    count: String(ctx.remaining),
    event: ctx.memoryEvent,
    people: ctx.memoryPeople,
    player: ctx.playerName,
  };

  // Try up to N picks, skipping templates whose tokens are missing.
  for (let i = 0; i < pool.length; i++) {
    const idx = (seedNum + i) % pool.length;
    const rendered = substitute(pool[idx], tokens);
    if (rendered) return rendered;
  }
  // Fallback: pull from reflective base which mostly uses safe tokens.
  for (const t of BY_SITUATION.reflective) {
    const rendered = substitute(t, tokens);
    if (rendered) return rendered;
  }
  return `Day ${ctx.day}. Still here.`;
}

export function buildDeterministicConfessional(npc: Contestant, gameState: GameState): string {
  const ctx = buildContext(npc, gameState);
  const seed = `${npc.id || npc.name}|conf|${ctx.day}|${ctx.situation}|${ctx.archetype}`;
  let line = pickTemplateFor(ctx, seed);

  // Optional memory garnish — only if we have a real event, the situation
  // isn't already burnt/threatened (which already reference the memory), and
  // deterministic seed says so.
  const seedNum = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const canGarnish = ctx.memoryEvent && !['burnt', 'threatened', 'reflective'].includes(ctx.situation);
  if (canGarnish && seedNum % 10 < 3) {
    const garnish = seededPick(MEMORY_GARNISH, seed + '|g');
    if (garnish) {
      const rendered = substitute(garnish, {
        event: ctx.memoryEvent,
        people: ctx.memoryPeople,
      });
      if (rendered) line = `${line} ${rendered}`;
    }
  }

  return line;
}

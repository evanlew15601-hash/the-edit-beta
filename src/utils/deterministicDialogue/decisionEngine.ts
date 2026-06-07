import { Contestant, GameMemory } from '@/types/game';
import {
  Band,
  Emotion,
  MemoryRef,
  Reputation,
  ResponseIntent,
  ResponseTagBundle,
  SocialContextKind,
} from './types';
import { deriveArchetypeFromDisposition } from './personalityFilters';

// Deterministic seeded RNG so identical context yields identical output but
// different turns/days vary naturally.
function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
export function seededPick<T>(items: T[], seed: string): T | undefined {
  if (!items.length) return undefined;
  return items[hash(seed) % items.length];
}

function band(value: number, low: number, high: number): Band {
  if (value <= low) return 'LOW';
  if (value >= high) return 'HIGH';
  return 'MEDIUM';
}

export interface DecisionInput {
  npc: Contestant;
  playerName: string;
  playerMessage: string;
  playerTone?: string;
  conversationType: 'public' | 'private' | 'confessional';
  // Optional hints from upstream
  parsedIntent?: { topic?: string; primary?: string };
  recentMemories?: GameMemory[];
  socialContext?: {
    plantedBeliefs?: string[];
    recentSchemesAgainstNpc?: string[];
    daysSinceLastTalk?: number | null;
    currentDay?: number;
    lastDeltas?: { trust?: number; suspicion?: number };
    pullAside?: boolean;
    turn?: number;
  };
  conversationHistory?: { role: 'player' | 'npc'; text: string }[];
}

function pickTopic(input: DecisionInput): ResponseTagBundle['topic'] {
  const raw = (input.parsedIntent?.topic || '').toLowerCase();
  const msg = (input.playerMessage || '').toLowerCase();
  if (raw === 'vote' || /\b(vote|evict|block|target)\b/.test(msg)) return 'VOTE';
  if (raw === 'alliance' || /\b(alliance|work together|ride or die|final)\b/.test(msg)) return 'ALLIANCE';
  if (raw === 'relationship' || /\b(trust|where we stand|vibe)\b/.test(msg)) return 'TRUST';
  if (/\b(edit|airtime|viewers|episode|segment)\b/.test(msg)) return 'EDIT';
  if (/\b(flirt|cute|date|kiss|crush|attract)\b/.test(msg)) return 'ROMANCE';
  if (msg.length === 0) return 'OTHER';
  if (/\b(food|sleep|tired|hungry|joke|funny)\b/.test(msg)) return 'SMALL_TALK';
  return 'OTHER';
}

function pickReputation(npc: Contestant, playerTrust: number, playerSusp: number): Reputation {
  if (playerSusp >= 70) return 'DISTRUSTED';
  if (playerTrust >= 60 && playerSusp < 40) return 'TRUSTED';
  if (Math.abs(playerTrust) < 25 && playerSusp < 50) return 'NEUTRAL';
  return 'UNPREDICTABLE';
}

function deriveEventLabel(memory: { type: string; content: string; day: number }): string {
  switch (memory.type) {
    case 'scheme': return 'your scheme';
    case 'alliance_meeting': return 'the alliance sit-down';
    case 'elimination': return `the day-${memory.day} eviction`;
    case 'confessional_leak': return 'what you said in the diary room';
    case 'dm': return 'that private conversation';
    case 'observation': return 'what I watched you do';
    case 'event': return `the day-${memory.day} blowup`;
    default: return `our day-${memory.day} talk`;
  }
}

function formatPeople(people: string[], playerName: string, npcName: string): string {
  const others = people.filter(p => p && p !== playerName && p !== npcName);
  if (!others.length) return '';
  if (others.length === 1) return others[0];
  if (others.length === 2) return `${others[0]} and ${others[1]}`;
  return `${others.slice(0, -1).join(', ')}, and ${others[others.length - 1]}`;
}

function pickMemoryRef(input: DecisionInput): MemoryRef | undefined {
  const day = input.socialContext?.currentDay ?? 0;
  const mems = input.recentMemories || [];
  const playerName = input.playerName;
  const npcName = input.npc.name;

  // Recent schemes against NPC = recent_scheme
  const scheme = input.socialContext?.recentSchemesAgainstNpc?.[0];
  if (scheme) {
    // Find the most recent matching scheme memory for richer tokens
    const m = mems.slice().reverse().find(mm => mm.type === 'scheme' && (mm.content || '').toLowerCase().includes(scheme.toLowerCase()));
    return {
      kind: 'recent_scheme',
      daysAgo: m ? Math.max(0, day - m.day) : 1,
      about: scheme,
      people: m ? m.participants : undefined,
      eventLabel: m ? deriveEventLabel(m) : 'your scheme',
    };
  }

  for (const m of mems.slice().reverse()) {
    const c = (m.content || '').toLowerCase();
    const daysAgo = Math.max(0, day - m.day);
    const peopleStr = formatPeople(m.participants || [], playerName, npcName);
    const base = {
      daysAgo,
      people: m.participants,
      eventLabel: deriveEventLabel(m),
      about: peopleStr || undefined,
    };
    if (/\b(betray|backstab|flipped|burned|lied)\b/.test(c)) return { ...base, kind: 'betrayal' };
    if (/\b(saved|protected|covered|had my back|voted with)\b/.test(c)) return { ...base, kind: 'save' };
    if (/\b(promised|promise)\b/.test(c)) {
      const broken = c.includes('broke') || c.includes('broken');
      return { ...base, kind: broken ? 'promise_broken' : 'promise_kept' };
    }
    if (/\b(voted together|same vote)\b/.test(c)) return { ...base, kind: 'shared_vote' };
  }
  return undefined;
}

// Layered subtext — fires only when the spoken emotion contradicts the
// underlying simulation state, producing dramatic irony for the player.
function pickSubtext(
  intent: ResponseTagBundle['intent'],
  emotion: ResponseTagBundle['emotion'],
  trustBand: Band,
  suspBand: Band,
  archetype: ResponseTagBundle['archetype']
): string | undefined {
  // Warm/playful surface over low trust or high suspicion = false friendliness
  const surfaceFriendly = emotion === 'WARM' || emotion === 'PLAYFUL' || emotion === 'SINCERE';
  const underlyingHostile = suspBand === 'HIGH' || trustBand === 'LOW';
  if (surfaceFriendly && underlyingHostile) {
    const opts = [
      "(doesn't mean a word of it)",
      "(already counting your votes against them)",
      "(filing every answer for later)",
      "(smile is for the cameras)",
    ];
    if (archetype === 'PassiveAggressive') opts.push("(loading the knife)");
    if (archetype === 'Strategist') opts.push("(running the numbers in real time)");
    return opts[(intent.length + emotion.length) % opts.length];
  }
  // Cold/guarded surface over high trust = pretending to be unbothered
  const surfaceClosed = emotion === 'COLD' || emotion === 'GUARDED';
  if (surfaceClosed && trustBand === 'HIGH' && suspBand !== 'HIGH') {
    return "(actually still on your side, won't admit it)";
  }
  // Angry surface with low suspicion = performance for someone watching
  if (emotion === 'ANGRY' && suspBand === 'LOW') {
    return "(performing for whoever's listening)";
  }
  return undefined;
}

function pickIntent(input: DecisionInput, trustBand: Band, suspBand: Band, topic: ResponseTagBundle['topic']): ResponseIntent {
  const ctx = input.socialContext;
  const lastSusp = ctx?.lastDeltas?.suspicion ?? 0;
  const lastTrust = ctx?.lastDeltas?.trust ?? 0;
  const msg = (input.playerMessage || '').toLowerCase();
  const isQuestion = /\?$/.test(input.playerMessage || '') || /\b(who|what|why|how|when|where)\b/.test(msg);
  const isAccusation = /\b(you lied|you're lying|you flipped|betrayed)\b/.test(msg);
  const isApology = /\b(sorry|my fault|apologize|my bad)\b/.test(msg);
  const isPitch = /\b(work together|alliance|final|ride or die|with me)\b/.test(msg);

  // Direct reactions take priority
  if (isApology) return 'AGREE';
  if (isAccusation && suspBand !== 'LOW') return 'ACCUSE';
  if (isPitch) {
    if (suspBand === 'HIGH') return 'REFUSE';
    if (trustBand === 'HIGH') return 'AGREE';
    return 'TEST_LOYALTY';
  }
  if (topic === 'VOTE' && isQuestion) {
    if (trustBand === 'HIGH' && suspBand !== 'HIGH') return 'REVEAL_INFO';
    return 'WITHHOLD_INFO';
  }
  if (topic === 'ROMANCE') return 'FLIRT';
  if (topic === 'SMALL_TALK') return 'JOKE';
  if (topic === 'TRUST') {
    if (lastTrust < 0 || suspBand === 'HIGH') return 'PROBE';
    return 'REASSURE';
  }
  if (topic === 'ALLIANCE') {
    if (suspBand === 'HIGH') return 'TEST_LOYALTY';
    return trustBand === 'HIGH' ? 'BUILD_TRUST' : 'PROBE';
  }

  // Pull-aside flow: NPC usually probes or accuses based on last deltas
  if (ctx?.pullAside) {
    if (lastSusp > 0) return 'PROBE';
    if (lastTrust < 0) return 'ACCUSE';
    return 'TEST_LOYALTY';
  }

  if (isQuestion) return 'WITHHOLD_INFO';
  return 'GREET';
}

function pickEmotion(input: DecisionInput, trustBand: Band, suspBand: Band, intent: ResponseIntent): Emotion {
  const archetype = deriveArchetypeFromDisposition(input.npc.psychProfile.disposition, input.npc.psychProfile);
  // Suspicion dominates emotion
  if (suspBand === 'HIGH') {
    if (intent === 'ACCUSE') return archetype === 'Hothead' ? 'ANGRY' : 'COLD';
    return 'SUSPICIOUS';
  }
  if (intent === 'FLIRT') return 'PLAYFUL';
  if (intent === 'JOKE') return 'PLAYFUL';
  if (intent === 'REASSURE') return 'WARM';
  if (intent === 'BUILD_TRUST') return trustBand === 'HIGH' ? 'WARM' : 'SINCERE';
  if (intent === 'REVEAL_INFO') return 'SINCERE';
  if (intent === 'WITHHOLD_INFO') return 'GUARDED';
  if (intent === 'REFUSE') return archetype === 'Hothead' ? 'ANGRY' : 'COLD';
  if (intent === 'THREATEN') return archetype === 'Hothead' ? 'ANGRY' : 'COLD';
  if (intent === 'APOLOGIZE') return 'SINCERE';
  if (intent === 'END_CONVO') return 'GUARDED';
  if (intent === 'GREET') return trustBand === 'HIGH' ? 'WARM' : 'GUARDED';
  if (intent === 'PROBE') return 'SUSPICIOUS';
  if (intent === 'TEST_LOYALTY') return 'GUARDED';
  if (intent === 'AGREE') return trustBand === 'HIGH' ? 'WARM' : 'SINCERE';
  if (intent === 'DEFLECT') return 'PLAYFUL';
  if (intent === 'ACCUSE') return 'COLD';
  return 'GUARDED';
}

function computeEffects(intent: ResponseIntent, emotion: Emotion): ResponseTagBundle['effects'] {
  // Effects describe what the NPC's response COSTS the relationship in the
  // npc → player direction. Player → npc deltas are computed elsewhere from
  // the player's tone (actionEngine). These are layered on top so the
  // simulation moves on both sides of every exchange.
  const e: ResponseTagBundle['effects'] = { trust: 0, suspicion: 0, entertainment: 0, influence: 0 };
  switch (intent) {
    case 'BUILD_TRUST': e.trust += 2; e.influence += 1; break;
    case 'REASSURE': e.trust += 2; break;
    case 'REVEAL_INFO': e.trust += 1; e.influence += 2; e.entertainment += 1; break;
    case 'AGREE': e.trust += 1; e.influence += 1; break;
    case 'APOLOGIZE': e.trust += 1; e.suspicion -= 1; break;
    case 'FLIRT': e.trust += 1; e.entertainment += 2; break;
    case 'JOKE': e.entertainment += 2; break;
    case 'GREET': e.trust += 0; break;
    case 'PROBE': e.suspicion += 1; break;
    case 'TEST_LOYALTY': e.suspicion += 1; e.influence += 1; break;
    case 'WITHHOLD_INFO': e.trust -= 1; e.suspicion += 1; break;
    case 'DEFLECT': e.trust -= 1; e.entertainment += 1; break;
    case 'REFUSE': e.trust -= 1; e.influence -= 1; break;
    case 'ACCUSE': e.trust -= 2; e.suspicion += 2; e.entertainment += 2; break;
    case 'THREATEN': e.trust -= 3; e.suspicion += 3; e.entertainment += 3; break;
    case 'END_CONVO': break;
  }
  if (emotion === 'ANGRY') { e.entertainment += 1; e.trust -= 1; }
  if (emotion === 'WARM') { e.trust += 1; }
  if (emotion === 'COLD') { e.trust -= 1; }
  return e;
}

export function decideResponse(input: DecisionInput): ResponseTagBundle {
  const psych = input.npc.psychProfile;
  const trustBand = band(psych.trustLevel, 20, 60);
  const suspBand = band(psych.suspicionLevel, 30, 65);
  const reputation = pickReputation(input.npc, psych.trustLevel, psych.suspicionLevel);
  const archetype = deriveArchetypeFromDisposition(psych.disposition, psych);
  const topic = pickTopic(input);
  const intent = pickIntent(input, trustBand, suspBand, topic);
  const emotion = pickEmotion(input, trustBand, suspBand, intent);

  const context: SocialContextKind =
    input.conversationType === 'public' ? 'PUBLIC' :
    input.conversationType === 'confessional' ? 'PRIVATE' : 'PRIVATE';

  const memoryRef = pickMemoryRef(input);
  const effects = computeEffects(intent, emotion);

  // Certainty rises with high trust or high suspicion (both are confident states)
  const certainty: Band =
    suspBand === 'HIGH' || trustBand === 'HIGH' ? 'HIGH' :
    suspBand === 'MEDIUM' && trustBand === 'MEDIUM' ? 'LOW' : 'MEDIUM';

  const subtext = pickSubtext(intent, emotion, trustBand, suspBand, archetype);

  return {
    topic,
    intent,
    emotion,
    certainty,
    trustBand,
    suspicionBand: suspBand,
    context,
    reputation,
    archetype,
    memoryRef,
    subtext,
    effects,
  };
}

import { BaseEffectEntry, Choice, ComputedOutcome, ReactionProfile, TopicTag, ToneTag } from '@/types/tagDialogue';
import { Contestant, GameState } from '@/types/game';

// Base effects per intent-topic (sparse table; fallbacks apply)
const BASE_EFFECTS: Partial<Record<Choice['intent'], Partial<Record<TopicTag, BaseEffectEntry>>>> = {
  BuildAlliance: {
    Challenge: { trust: 0.06, suspicion: -0.01, entertainment: 0.02, influence: 0.04 },
    Strategy: { trust: 0.05, suspicion: -0.01, entertainment: 0.01, influence: 0.05 },
  },
  ProbeForInfo: {
    Game: { trust: 0.01, suspicion: 0.02, entertainment: 0, influence: 0.03 },
    Rumor: { trust: -0.01, suspicion: 0.03, entertainment: 0.01, influence: 0.02 },
    Eviction: { trust: 0, suspicion: 0.02, entertainment: 0, influence: 0.03 },
  },
  SowDoubt: {
    Rumor: { trust: -0.03, suspicion: 0.04, entertainment: 0.03, influence: 0.03 },
  },
  BoostMorale: {
    Challenge: { trust: 0.03, suspicion: -0.02, entertainment: 0.03, influence: 0.01 },
  },
  Flirt: {
    Romance: { trust: 0.03, suspicion: 0.01, entertainment: 0.03, influence: 0.02 },
  },
  Insult: {
    Game: { trust: -0.05, suspicion: 0.05, entertainment: 0.02, influence: -0.03 },
    Strategy: { trust: -0.05, suspicion: 0.05, entertainment: 0.02, influence: -0.03 },
  },
  MakeJoke: {
    Food: { trust: 0.01, suspicion: -0.01, entertainment: 0.05, influence: 0.01 },
  },
  RevealSecret: {
    PersonalHistory: { trust: 0.05, suspicion: -0.02, entertainment: 0.02, influence: 0.05 },
    Game: { trust: 0.03, suspicion: -0.01, entertainment: 0.01, influence: 0.04 },
  },
  Deflect: {
    Production: { trust: 0, suspicion: -0.02, entertainment: -0.01, influence: 0 },
    Game: { trust: -0.01, suspicion: -0.01, entertainment: -0.01, influence: 0 },
  },
};

const DEFAULT_BASE: BaseEffectEntry = { trust: 0.01, suspicion: 0, entertainment: 0.01, influence: 0.01 };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const hash = (str: string) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const seededNoise = (seedStr: string, range = 0.05) => {
  const s = hash(seedStr) / 4294967295;
  return (s * 2 - 1) * range; // [-range, +range]
};

export const getReactionProfileForNPC = (npc: Contestant): ReactionProfile => {
  // Derive simple affinities and tone sensitivities from publicPersona + psychProfile
  const baseAffinity: Record<TopicTag, number> = {
    Game: 0.7, Strategy: 0.8, Romance: 0.3, Food: 0.5, Sleep: 0.5,
    Challenge: 0.75, Eviction: 0.6, Rumor: 0.45, PersonalHistory: 0.6, Production: 0.4,
  } as const;

  const toneBase: Record<ToneTag, number> = {
    Sincere: 1.05, Sarcastic: 0.75, Flirty: 0.95, Aggressive: 0.65,
    Playful: 1.0, Dismissive: 0.8, Apologetic: 0.95, Neutral: 1.0,
  } as const;

  const bias = npc.psychProfile.editBias || 0; // -50..50 -> -0.1..0.1
  const biasShift = bias / 500;

  const topicAffinity: Record<TopicTag, number> = { ...baseAffinity };
  if (/strateg/i.test(npc.publicPersona)) {
    topicAffinity.Strategy = clamp(topicAffinity.Strategy + 0.1, 0, 1);
    topicAffinity.Game = clamp(topicAffinity.Game + 0.05, 0, 1);
  }
  if (/romanc|charm|flirt/i.test(npc.publicPersona)) {
    topicAffinity.Romance = clamp(topicAffinity.Romance + 0.2, 0, 1);
  }

  const toneSensitivity: Record<ToneTag, number> = { ...toneBase };
  if ((npc.psychProfile.suspicionLevel || 0) > 60) {
    toneSensitivity.Sarcastic = clamp(toneSensitivity.Sarcastic - 0.1, 0.4, 1.2);
  }
  if ((npc.psychProfile.trustLevel || 0) > 50) {
    toneSensitivity.Sincere = clamp(toneSensitivity.Sincere + 0.05, 0.6, 1.3);
  }

  (Object.keys(toneSensitivity) as ToneTag[]).forEach(k => {
    toneSensitivity[k] = clamp(toneSensitivity[k] + biasShift, 0.5, 1.3);
  });

  return {
    npcId: npc.id,
    personalityTraits: {},
    topicAffinity,
    toneSensitivity,
  };
};

export const evaluateChoice = (
  choice: Choice,
  npc: Contestant,
  playerName: string,
  gameState: GameState
): ComputedOutcome => {
  const topic = choice.topics[0];
  const base = (BASE_EFFECTS[choice.intent]?.[topic] || DEFAULT_BASE);
  const profile = getReactionProfileForNPC(npc);

  const affinity = profile.topicAffinity[topic] ?? 0.6;
  const toneMod = profile.toneSensitivity[choice.tone] ?? 1;
  const trust = npc.psychProfile.trustLevel || 0; // -100..100
  const suspicion = npc.psychProfile.suspicionLevel || 0; // 0..100
  const mood = clamp((trust - suspicion) / 500, -0.2, 0.2);
  const memoryMod = 1 + clamp(trust / 400, -0.25, 0.25);

  // Diminishing returns if same intent+topic used repeatedly with same target in last few interactions
  const repeats = recentTagUsage(gameState, playerName, npc.name, choice.intent, topic);
  const repetitionPenalty = 1 - clamp(repeats * 0.15, 0, 0.5);

  const noise = 1 + seededNoise(`${gameState.currentDay}|${playerName}|${npc.id}|${choice.choiceId}`);

  const trustDelta = clamp(base.trust * affinity * toneMod * (1 + mood) * memoryMod * repetitionPenalty * noise, -0.25, 0.25);
  const suspicionDelta = clamp(base.suspicion * (2 - affinity) * (2 - toneMod) * (1 - mood) * repetitionPenalty * noise, -0.25, 0.25);
  const entertainmentDelta = clamp(base.entertainment * (0.8 + affinity * 0.4) * (choice.tone === 'Playful' ? 1.1 : 1) * noise, -0.25, 0.25);
  const influenceDelta = clamp(base.influence * (0.9 + trust / 400) * noise, -0.25, 0.25);

  const catScore = trustDelta - suspicionDelta + entertainmentDelta * 0.5;
  const category: ComputedOutcome['category'] = catScore > 0.03 ? 'positive' : catScore < -0.02 ? 'negative' : 'neutral';

  return {
    trustDelta,
    suspicionDelta,
    entertainmentDelta,
    influenceDelta,
    category,
    notes: `Affinity ${affinity.toFixed(2)} toneMod ${toneMod.toFixed(2)} repeats ${repeats}`,
  };
};

export const formatTag = (s: string) => s.replace(/([A-Z])/g, ' $1').trim();

export const pickVariant = (choice: Choice, seedKey: string) => {
  if (!choice.textVariants.length) return '';
  const idx = Math.abs(hash(seedKey)) % choice.textVariants.length;
  return choice.textVariants[idx];
};

export const getCooldownKey = (player: string, target: string, choiceId: string) => `${player}::${target}::${choiceId}`;

export const isChoiceAvailable = (choice: Choice, npc: Contestant, player: string, gameState: GameState) => {
  const minTrust = choice.visibilityRules?.minTrust ?? -100;
  if ((npc.psychProfile.trustLevel || 0) < minTrust) return false;
  const cdDays = choice.cooldownDays ?? 0;
  if (cdDays <= 0) return true;
  const key = getCooldownKey(player, npc.name, choice.choiceId);
  const until = (gameState as any).tagChoiceCooldowns?.[key];
  if (until && gameState.currentDay < until) return false;
  return true;
};

const recentTagUsage = (
  gameState: GameState,
  player: string,
  target: string,
  intent: Choice['intent'],
  topic: TopicTag
) => {
  const log = (gameState.interactionLog || []).slice(-10);
  const pattern = `[TAG intent=${intent} topic=${topic}]`;
  return log.filter(l => (l.participants || []).includes(player) && (l.participants || []).includes(target) && (l.content || '').includes(pattern)).length;
};

export const reactionText = (
  npcName: string,
  choice: Choice,
  outcome: ComputedOutcome
) => {
  const intent = choice.intent;
  const topic = choice.topics[0];
  const cat = outcome.category;
  if (intent === 'BuildAlliance') {
    if (cat === 'positive') return `${npcName}: I can work with that. Let's see it through.`;
    if (cat === 'neutral') return `${npcName}: Maybe. Depends how the next challenge plays.`;
    return `${npcName}: Not buying it—timing feels off.`;
  }
  if (intent === 'ProbeForInfo') {
    if (cat === 'positive') return `${npcName}: I'm hearing a few names—come talk later.`;
    if (cat === 'neutral') return `${npcName}: Nothing solid yet.`;
    return `${npcName}: Why are you asking me?`;
  }
  if (intent === 'SowDoubt') {
    if (cat === 'positive') return `${npcName}: Huh. Maybe we should keep an eye on that.`;
    if (cat === 'neutral') return `${npcName}: Could be nothing.`;
    return `${npcName}: That's a reach.`;
  }
  if (intent === 'BoostMorale') {
    if (cat === 'positive') return `${npcName}: Okay, let's reset and hit it.`;
    if (cat === 'neutral') return `${npcName}: We'll see.`;
    return `${npcName}: Pep talks don't win votes.`;
  }
  if (intent === 'Flirt') {
    if (cat === 'positive') return `${npcName}: Careful—you'll make me blush.`;
    if (cat === 'neutral') return `${npcName}: Ha. You're trouble.`;
    return `${npcName}: Not the time.`;
  }
  if (intent === 'Insult') {
    if (cat === 'positive') return `${npcName}: Say that again and see what happens.`;
    if (cat === 'neutral') return `${npcName}: Noted.`;
    return `${npcName}: Cross the line again and it's war.`;
  }
  if (intent === 'MakeJoke') {
    if (cat === 'positive') return `${npcName}: Finally, someone said it.`;
    if (cat === 'neutral') return `${npcName}: Heh.`;
    return `${npcName}: Not in the mood.`;
  }
  if (intent === 'RevealSecret') {
    if (cat === 'positive') return `${npcName}: That means something. I'm listening.`;
    if (cat === 'neutral') return `${npcName}: Not sure what to do with that.`;
    return `${npcName}: Keep your secrets.`;
  }
  if (intent === 'Deflect') {
    if (cat === 'positive') return `${npcName}: Smart. No need to feed the chaos.`;
    if (cat === 'neutral') return `${npcName}: Hm.`;
    return `${npcName}: That's dodge-y.`;
  }
  return `${npcName}: ...`;
};

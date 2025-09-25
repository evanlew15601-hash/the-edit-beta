export type IntentTag =
  | 'BuildAlliance'
  | 'ProbeForInfo'
  | 'Divert'
  | 'SowDoubt'
  | 'BoostMorale'
  | 'Flirt'
  | 'Insult'
  | 'MakeJoke'
  | 'RevealSecret'
  | 'Deflect';

export type ToneTag =
  | 'Sincere'
  | 'Sarcastic'
  | 'Flirty'
  | 'Aggressive'
  | 'Playful'
  | 'Dismissive'
  | 'Apologetic'
  | 'Neutral';

export type TopicTag =
  | 'Game'
  | 'Strategy'
  | 'Romance'
  | 'Food'
  | 'Sleep'
  | 'Challenge'
  | 'Eviction'
  | 'Rumor'
  | 'PersonalHistory'
  | 'Production';

export type TargetType = 'Person' | 'Group' | 'Self' | 'Object' | 'Audience';
export type InteractionType = 'talk' | 'dm' | 'scheme' | 'activity';

export interface Choice {
  choiceId: string;
  textVariants: string[];
  // Optional persona-specific variants for deterministic selection by player persona
  personaVariants?: {
    Hero?: string[];
    Villain?: string[];
  };
  intent: IntentTag;
  tone: ToneTag;
  topics: TopicTag[];
  targetType: TargetType;
  interactionTypes?: InteractionType[]; // which actions this line applies to
  visibilityRules?: { minTrust?: number; requiresEvent?: string | null };
  cooldownDays?: number; // default 0
  weight?: number; // used to pick text variant
}

export interface ReactionProfile {
  npcId: string; // contestant.id or name
  personalityTraits: Record<string, number>;
  topicAffinity: Record<TopicTag, number>; // 0..1
  toneSensitivity: Record<ToneTag, number>; // multiplier around 1
}

export interface ComputedOutcome {
  trustDelta: number; // -1..1 (we will scale to game scale)
  suspicionDelta: number; // -1..1
  entertainmentDelta: number; // -1..1
  influenceDelta: number; // -1..1
  category: 'positive' | 'neutral' | 'negative';
  notes?: string;
}

export interface BaseEffectEntry {
  trust: number;
  suspicion: number;
  entertainment: number;
  influence: number;
}

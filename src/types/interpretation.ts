export type SurfaceFeatures = {
  // Basic structure
  charCount: number;
  wordCount: number;
  sentenceCount: number;
  averageSentenceLength: number;
  fragmentRatio: number;

  // Punctuation
  exclamationCount: number;
  questionCount: number;
  ellipsisCount: number;
  punctuationDensity: number;

  // Lexical style markers
  hedgingCount: number;
  absolutesCount: number;
  politenessCount: number;
  bluntMarkersCount: number;
  directAddressCount: number;
  indirectRefCount: number;

  // Caps & lexical intensity
  allCapsWordCount: number;
  emotionalWordIntensity: number;

  // Structural flags
  startsWithHedge: boolean;
  endsWithQuestion: boolean;
  endsWithSoftener: boolean;
  metaText: boolean;
};

export type SocialStrategy =
  | 'bonding'
  | 'distancing'
  | 'dominance'
  | 'deflection';

export type EmotionalPosture =
  | 'guarded'
  | 'performative'
  | 'sincere'
  | 'passive_aggressive';

export type GameMotive =
  | 'information_fishing'
  | 'alliance_signaling'
  | 'reputation_management'
  | 'venting';

export type RiskTolerance =
  | 'bold'
  | 'cautious'
  | 'reckless'
  | 'risk_averse';

export type AxisDistribution<T extends string> = {
  axis: string;
  options: { label: T; weight: number }[];
  confidence: number; // 0..1
};

export type IntentHypotheses = {
  socialStrategy: AxisDistribution<SocialStrategy>;
  emotionalPosture: AxisDistribution<EmotionalPosture>;
  gameMotive: AxisDistribution<GameMotive>;
  riskTolerance: AxisDistribution<RiskTolerance>;

  // We deliberately keep these loose to avoid tight coupling to classifier types
  speechActs: { type: string; confidence: number }[];
  conversationTopic: string;
};

export type GlobalToneProfile = {
  baselineAssertiveness: number;     // 0..100
  emotionalVolatility: number;      // 0..100
  performativeVsPrivate: number;    // -100 (private) .. +100 (performative)
  conflictAvoidance: number;        // 0..100
  averageRiskTolerance: number;     // 0..100
  messageCount: number;
};

export type NPCSpecificToneProfile = {
  npcName: string;
  perceivedAssertiveness: number;
  perceivedVolatility: number;
  perceivedFakeness: number;
  perceivedConsistency: number;
};

export type PerceivedIntent = {
  npcName: string;
  perceivedSocialStrategy: SocialStrategy;
  perceivedEmotionalPosture: EmotionalPosture;
  perceivedGameMotive: GameMotive;
  perceivedRiskTolerance: RiskTolerance;

  divergenceScore: number;      // higher = bigger mismatch vs global hypotheses
  perceivedHostility: number;   // 0..100
  perceivedWarmth: number;      // 0..100
  certainty: number;            // 0..1
};

export type AntiExploitProfile = {
  repetitivePatternScore: number; // 0..100
  keywordSpamScore: number;       // 0..100
  PRLikeToneScore: number;        // 0..100
  metaGamingScore: number;        // 0..100
};
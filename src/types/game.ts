export type StatInclination = 'social' | 'strategy' | 'physical' | 'deception';

export interface CharacterStats {
  // 0..100 scale. Use inclinations to bias NPC calculations and gameplay outcomes.
  social: number;
  strategy: number;
  physical: number;
  deception: number;
  // primary inclination to surface in UI
  primary?: StatInclination;
}

export type Background =
  | 'College Athlete'
  | 'Startup Founder'
  | 'School Teacher'
  | 'Bartender'
  | 'ER Nurse'
  | 'Law Student'
  | 'Podcaster'
  | 'Ex-Pro Gamer'
  | 'Content Creator'
  | 'Blue-Collar Worker'
  | 'Fitness Trainer'
  | 'Real Estate Agent'
  | 'Data Analyst'
  | 'Musician'
  | 'Chef'
  | 'Other'; // For custom background text

export type SpecialBackground =
  | { kind: 'none' }
  | {
      kind: 'hosts_estranged_child';
      // Hidden until revealed. If revealed, affects audience/edit and NPC trust.
      revealed?: boolean;
      revealDay?: number;
    }
  | {
      kind: 'planted_houseguest';
      // Production tasks to complete weekly. Failure risks secret reveal.
      tasks: { id: string; description: string; dayAssigned: number; completed?: boolean }[];
      secretRevealed?: boolean;
      revealDay?: number;
    };

export interface Contestant {
  id: string;
  name: string;
  age?: number;
  publicPersona: string;
  background?: Background;
  customBackgroundText?: string;
  stats?: CharacterStats;
  special?: SpecialBackground;
  psychProfile: {
    disposition: string[];
    trustLevel: number; // -100 to 100
    suspicionLevel: number; // 0 to 100
    emotionalCloseness: number; // 0 to 100
    editBias: number; // -50 to 50
  };
  memory: GameMemory[];
  isEliminated: boolean;
  eliminationDay?: number;
  isMole?: boolean;
}

export interface GameMemory {
  day: number;
  type:
    | 'conversation'
    | 'scheme'
    | 'observation'
    | 'dm'
    | 'confessional_leak'
    | 'elimination'
    | 'event';
  participants: string[];
  content: string;
  emotionalImpact: number; // -10 to 10
  timestamp: number;
  // Optional memory tagging to influence downstream reasoning (e.g., jury rationale)
  tags?: string[]; // e.g., ['rumor'], ['correction'], ['trap']
}

export interface InteractionLogEntry {
  day: number;
  type: PlayerAction['type'] | 'npc' | 'system';
  participants: string[];
  content?: string;
  tone?: string;
  ai_response?: string;
  source: 'player' | 'npc' | 'system' | 'emergent_event';
}

export interface PlayerAction {
  type:
    | 'talk'
    | 'dm'
    | 'confessional'
    | 'observe'
    | 'scheme'
    | 'activity'
    | 'alliance_meeting'
    | 'house_meeting';
  target?: string;
  content?: string;
  tone?: string;
  used: boolean;
  usageCount?: number;
}

export type ReactionTake =
  | 'positive'
  | 'neutral'
  | 'deflect'
  | 'pushback'
  | 'suspicious'
  | 'curious';

export interface ReactionSummary {
  take: ReactionTake;
  context: 'public' | 'private' | 'scheme' | 'activity';
  notes?: string;
  // Optional: surface actual applied outcome deltas for the last choice
  // These are scaled to game points (e.g., trust -100..100, suspicion 0..100)
  deltas?: {
    trust?: number;
    suspicion?: number;
    entertainment?: number;
    influence?: number;
  };
}

export interface LastTagOutcome {
  choiceId: string;
  intent: string;
  topic: string;
  outcome: {
    trustDelta: number;
    suspicionDelta: number;
    entertainmentDelta: number;
    influenceDelta: number;
    category: 'positive' | 'neutral' | 'negative';
    notes?: string;
  };
}

export interface NarrativeBeat {
  id: string;
  title: string;
  dayPlanned: number;
  status: 'planned' | 'active' | 'completed';
  summary?: string;
}

export interface TwistNarrative {
  arc: 'none' | 'hosts_child' | 'planted_houseguest';
  beats: NarrativeBeat[];
  currentBeatId?: string;
  confessionalThemes?: string[];
}

/**
 * Lightweight cutscene slide for story beats.
 */
export interface CutsceneSlide {
  title?: string;
  speaker?: string;
  text: string;
  aside?: string;
}

/**
 * Current cutscene payload for lite story mode around twists.
 */
export interface CurrentCutscene {
  title: string;
  slides: CutsceneSlide[];
  ctaLabel?: string;
  type: 'twist_intro' | 'mid_game' | 'twist_result_success' | 'twist_result_failure' | 'finale_twist';
}

export interface GameState {
  currentDay: number;
  playerName: string;
  contestants: Contestant[];
  playerActions: PlayerAction[];
  confessionals: Confessional[];
  editPerception: EditPerception;
  alliances: Alliance[];
  votingHistory: VotingRecord[];
  gamePhase:
    | 'intro'
    | 'character_creation'
    | 'premiere'
    | 'houseguests_roster'
    | 'daily'
    | 'player_vote'
    | 'elimination'
    | 'weekly_recap'
    | 'finale'
    | 'immunity_competition'
    | 'jury_vote'
    | 'final_3_vote'
    | 'post_season'
    | 'cutscene';
  twistsActivated: string[];
  nextEliminationDay: number;
  daysUntilJury?: number; // Days until jury phase starts
  dailyActionCount: number; // actions used today
  dailyActionCap: number;   // max actions per day
  // Anti group-spam: track how many group actions applied today
  groupActionsUsedToday?: number;

  lastAIResponse?: string; // Store AI-generated response for UI
  lastAIAdditions?: {
    strategy?: string;
    followUp?: string;
    risk?: string;
    memory?: string;
  };
  lastAIReaction?: ReactionSummary; // Minimal, credit-free reaction summary
  lastParsedInput?: any; // Store parsed input for debugging
  lastEmergentEvent?: any; // Store emergent event for UI display
  // Active House Meeting popup with multi-round flow
  ongoingHouseMeeting?: HouseMeetingState;
  lastHouseMeetingReaction?: ReactionSummary;
  lastActionTarget?: string; // Most recent action target for UI context
  lastActionType?: PlayerAction['type']; // Most recent action type for UI context
  immunityWinner?: string; // Who won immunity this week
  juryMembers?: string[]; // Who is on the jury (odd number to avoid ties)
  finaleSpeechesGiven?: boolean; // Track finale speeches
  finaleSpeech?: string; // Store player's finale speech for jury consideration
  aiSettings: AISettings; // Controls reply depth and additions
  // New: queue of NPC-initiated forced conversations (at least one per day)
  forcedConversationsQueue?: {
    from: string;
    topic: string;
    urgency: 'casual' | 'important';
    day: number
  }[];
  // New: running tally for America's Favorite Player signals (computed each week, surfaced at finale)
  favoriteTally?: { [name: string]: number };
  // New: local interaction log for viral moments and memory tab
  interactionLog?: InteractionLogEntry[];
  tagChoiceCooldowns?: { [key: string]: number };
  lastTagOutcome?: LastTagOutcome; // For debugging/verification of tag engine integration
  // Persistent Reaction Profiles (computed at start and updated incrementally)
  reactionProfiles?: {
    [npcIdOrName: string]: import('./tagDialogue').ReactionProfile
  };
  // Debug flag to surface dev-only UI
  debugMode?: boolean;
  // Post-game data
  gameWinner?: string;
  finalJuryVotes?: { [juryMember: string]: string };
  juryRationales?: { [juryMember: string]: string };
  isPlayerEliminated?: boolean;
  afpVote?: string;
  afpRanking?: { name: string; score: number }[];
  // Final 3 tie-break metadata for recap screens
  final3TieBreak?: {
    day: number;
    method: 'challenge' | 'fire_making' | 'random_draw';
    results?: { name: string; time: number }[];
    eliminated: string;
    winners: string[];
    selectionReason?: 'player_persuasion' | 'npc_choice' | 'manual';
  };

  // Viewer Ratings - light system based on house events and NPC behavior
  viewerRating?: number; // 0.0 - 10.0
  ratingsHistory?: { day: number; rating: number; reason?: string }[];

  // Special reveal metadata
  hostChildName?: string;
  hostChildRevealDay?: number;
  productionTaskLog?: {
    [contestantName: string]: { id: string; description: string; dayAssigned: number; completed?: boolean }[];
  };

  // Narrative arc tracking for player twists
  twistNarrative?: TwistNarrative;

  // Lite story mode current cutscene
  currentCutscene?: CurrentCutscene;
}

export interface Confessional {
  id: string;
  day: number;
  content: string;
  tone: string;
  editImpact: number;
  audienceScore?: number;
  selected: boolean; // Whether it made the final edit
}

export interface EditPerception {
  screenTimeIndex: number; // 0 to 100
  audienceApproval: number; // -100 to 100
  persona:
    | 'Hero'
    | 'Villain'
    | 'Underedited'
    | 'Ghosted'
    | 'Comic Relief'
    | 'Dark Horse'
    | 'Mastermind'
    | 'Puppet Master'
    | 'Strategic Player'
    | 'Antagonist'
    | 'Troublemaker'
    | 'Flirt'
    | 'Gossip'
    | 'Social Butterfly'
    | 'Floater'
    | 'Class Clown'
    | 'Seducer'
    | 'Romantic'
    | 'Fan Favorite'
    | 'Pariah'
    | 'Contender'
    | 'Controversial';
  lastEditShift: number;
  weeklyQuote?: string;
}

export interface Alliance {
  id: string;
  name?: string; // Alliance name
  members: string[];
  strength: number; // 0 to 100
  secret: boolean;
  formed: number; // day
  lastActivity: number;
  dissolved?: boolean; // Whether alliance is dissolved
  exposureRisk?: number; // 0-100, risk of being discovered
}

export interface VotingRecord {
  day: number;
  eliminated: string;
  votes: { [voterName: string]: string };
  playerVote?: string;
  reason: string;
  tieBreak?: {
    tied: string[];
    method: 'revote' | 'sudden_death';
    revote?: { votes: { [voterName: string]: string }, counts: { [name: string]: number } };
    suddenDeathWinner?: string;
    suddenDeathLoser?: string;
    log: string[];
  };
}

export interface DialogueOption {
  text: string;
  tone: 'friendly' | 'strategic' | 'aggressive' | 'flirty' | 'suspicious';
  consequence: string;
}

export interface WeeklyEdit {
  week: number;
  playerPersona: string;
  selectedQuote: string;
  approvalShift: number;
  eventMontage: string[];
  viralMoments: string[];
  realityVsEdit: {
    whatHappened: string;
    whatWasShown: string;
  };
}

export interface AISettings {
  depth: 'brief' | 'standard' | 'deep';
  additions: {
    strategyHint: boolean;
    followUp: boolean;
    riskEstimate: boolean;
    memoryImpact: boolean;
  };
  // Enable/disable free local LLM replies in addition to rule-based reactions
  useLocalLLM?: boolean;
  // New: deterministic persona variant selection in Enhanced Tag Dialogue
  deterministicPersonaVariants?: boolean;
  // New: outcome scaling controls to tune applied deltas
  outcomeScaling?: {
    trustSuspicionScale: number; // default 40
    influenceScale: number;      // default 20
    entertainmentScale: number;  // default 20
  };
}

/**
 * House Meeting types
 */
export type HouseMeetingTopic =
  | 'nominate_target'
  | 'defend_self'
  | 'shift_blame'
  | 'expose_alliance';

export type HouseMeetingToneChoice =
  | 'persuasive'
  | 'defensive'
  | 'aggressive'
  | 'manipulative'
  | 'silent';

export interface HouseMeetingOption {
  id: string;
  text: string;
  tone: HouseMeetingToneChoice;
}

export interface HouseMeetingRound {
  index: number;
  aiStatement?: string;
  options: HouseMeetingOption[];
  participants: string[];
}

export interface HouseMeetingState {
  id: string;
  initiator: string;
  topic: HouseMeetingTopic;
  target?: string;
  isAIInitiated: boolean;
  participants: string[];
  currentRound: number;
  maxRounds: number;
  mood: 'calm' | 'tense' | 'heated';
  conversationLog: { speaker: string; text: string }[];
  currentOptions: HouseMeetingOption[];
  forcedOpen?: boolean;
}
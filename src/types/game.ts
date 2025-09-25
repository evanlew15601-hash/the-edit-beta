export interface Contestant {
  id: string;
  name: string;
  publicPersona: string;
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
  type: 'conversation' | 'scheme' | 'observation' | 'dm' | 'confessional_leak' | 'elimination' | 'event';
  participants: string[];
  content: string;
  emotionalImpact: number; // -10 to 10
  timestamp: number;
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
  type: 'talk' | 'dm' | 'confessional' | 'observe' | 'scheme' | 'activity' | 'alliance_meeting';
  target?: string;
  content?: string;
  tone?: string;
  used: boolean;
  usageCount?: number;
}

export type ReactionTake = 'positive' | 'neutral' | 'deflect' | 'pushback' | 'suspicious' | 'curious';

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

export interface GameState {
  currentDay: number;
  playerName: string;
  contestants: Contestant[];
  playerActions: PlayerAction[];
  confessionals: Confessional[];
  editPerception: EditPerception;
  alliances: Alliance[];
  votingHistory: VotingRecord[];
  gamePhase: 'intro' | 'premiere' | 'daily' | 'player_vote' | 'elimination' | 'weekly_recap' | 'finale' | 'immunity_competition' | 'jury_vote' | 'final_3_vote' | 'post_season';
  twistsActivated: string[];
  nextEliminationDay: number;
  daysUntilJury?: number; // Days until jury phase starts
  dailyActionCount: number; // actions used today
  dailyActionCap: number;   // max actions per day
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
  lastActionTarget?: string; // Most recent action target for UI context
  lastActionType?: PlayerAction['type']; // Most recent action type for UI context
  immunityWinner?: string; // Who won immunity this week
  juryMembers?: string[]; // Who is on the jury (odd number to avoid ties)
  finaleSpeechesGiven?: boolean; // Track finale speeches
  aiSettings: AISettings; // Controls reply depth and additions
  // New: queue of NPC-initiated forced conversations (at least one per day)
  forcedConversationsQueue?: { from: string; topic: string; urgency: 'casual' | 'important'; day: number }[];
  // New: running tally for America's Favorite Player signals (computed each week, surfaced at finale)
  favoriteTally?: { [name: string]: number };
  // New: local interaction log for viral moments and memory tab
  interactionLog?: InteractionLogEntry[];
  tagChoiceCooldowns?: { [key: string]: number };
  // Post-game data
  gameWinner?: string;
  finalJuryVotes?: { [juryMember: string]: string };
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
  persona: 'Hero' | 'Villain' | 'Underedited' | 'Ghosted' | 'Comic Relief' | 'Dark Horse' | 
           'Mastermind' | 'Puppet Master' | 'Strategic Player' | 'Antagonist' | 'Troublemaker' |
           'Flirt' | 'Gossip' | 'Social Butterfly' | 'Floater' | 'Class Clown' | 'Seducer' |
           'Romantic' | 'Fan Favorite' | 'Pariah' | 'Contender' | 'Controversial';
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
}
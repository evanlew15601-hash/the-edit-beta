// Enhanced memory system for persistent AI memory and strategic reasoning

export interface GameMemoryEvent {
  id: string;
  day: number;
  type: 'alliance_form' | 'alliance_break' | 'promise' | 'betrayal' | 'gossip' | 'vote' | 'conversation' | 'scheme' | 'challenge' | 'elimination' | 'confessional';
  participants: string[];
  content: string;
  emotionalImpact: number; // -10 to 10
  trustDelta?: number;
  suspicionDelta?: number;
  witnessed?: string[]; // who else saw/heard this
  reliability: 'confirmed' | 'rumor' | 'speculation'; // how sure we are this happened
  strategicImportance: number; // 0-10, how much this affects voting/alliances
}

export interface PrivateJournal {
  contestantId: string;
  currentStrategy: string;
  shortTermGoals: string[];
  longTermGoals: string[];
  votingPlan: string; // who they plan to vote for next (target name)
  // Lightweight metadata so we can reason about how and when this plan was formed
  votingPlanSource?: string; // e.g. 'weekly_plan' | 'alliance_meeting' | 'vote_pressure' | 'conversation_hint' | 'system'
  votingPlanDay?: number; // game day the plan was last updated
  allianceNotes: Record<string, string>; // notes about each alliance member
  threatAssessment: Record<string, number>; // how much they see each person as a threat (0-10)
  personalBonds: Record<string, number>; // emotional connection to each person (-5 to 5)
  promises: Array<{
    to: string;
    promise: string;
    day: number;
    kept: boolean | null; // null = not yet time to keep/break
  }>;
  secrets: Array<{
    about: string;
    secret: string;
    day: number;
    sharedWith: string[];
  }>;
  memoryEvents: GameMemoryEvent[];
}

export interface GossipNetwork {
  info: string;
  source: string;
  day: number;
  spreadTo: string[];
  reliability: 'confirmed' | 'rumor' | 'lie';
  strategicValue: number; // how useful this info is for voting/alliances
}

export interface MemorySystem {
  privateJournals: Record<string, PrivateJournal>;
  sharedMemory: GameMemoryEvent[]; // events that multiple people know about
  gossipNetwork: GossipNetwork[];
  weeklyEvents: Record<number, GameMemoryEvent[]>; // organized by week for recap
}

export interface MemoryQuery {
  participantFilter?: string[];
  typeFilter?: GameMemoryEvent['type'][];
  dayRange?: { start: number; end: number };
  minImportance?: number;
  reliability?: GameMemoryEvent['reliability'][];
}

export interface MemorySearchResult {
  events: GameMemoryEvent[];
  relevantGossip: GossipNetwork[];
  personalNotes: string[];
}
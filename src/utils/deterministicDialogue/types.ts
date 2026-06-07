// Deterministic Tag-Talk: types
// The simulation determines everything before any text is rendered.

export type ResponseIntent =
  | 'BUILD_TRUST'
  | 'TEST_LOYALTY'
  | 'WITHHOLD_INFO'
  | 'REVEAL_INFO'
  | 'ACCUSE'
  | 'DEFLECT'
  | 'AGREE'
  | 'REFUSE'
  | 'PROBE'
  | 'REASSURE'
  | 'THREATEN'
  | 'APOLOGIZE'
  | 'FLIRT'
  | 'JOKE'
  | 'GREET'
  | 'END_CONVO';

export type Emotion =
  | 'SINCERE'
  | 'GUARDED'
  | 'SUSPICIOUS'
  | 'ANGRY'
  | 'PLAYFUL'
  | 'ANXIOUS'
  | 'COLD'
  | 'WARM';

export type Archetype =
  | 'Hothead'
  | 'Strategist'
  | 'PassiveAggressive'
  | 'Charmer'
  | 'Paranoid'
  | 'Stoic'
  | 'Wildcard';

export type Band = 'LOW' | 'MEDIUM' | 'HIGH';
export type Reputation = 'TRUSTED' | 'NEUTRAL' | 'UNPREDICTABLE' | 'DISTRUSTED';
export type SocialContextKind = 'PRIVATE' | 'PUBLIC' | 'GROUP';

export type MemoryRefKind =
  | 'betrayal'
  | 'save'
  | 'promise_kept'
  | 'promise_broken'
  | 'shared_vote'
  | 'recent_scheme';

export interface MemoryRef {
  kind: MemoryRefKind;
  daysAgo: number;
  about?: string;            // person or thing (legacy)
  people?: string[];         // actual participants pulled from GameMemory
  eventLabel?: string;       // human-readable noun for the event ("the kitchen vote", "your scheme")
}

export interface ResponseTagBundle {
  topic: 'ALLIANCE' | 'VOTE' | 'TRUST' | 'EDIT' | 'ROMANCE' | 'SMALL_TALK' | 'OTHER';
  intent: ResponseIntent;
  emotion: Emotion;
  certainty: Band;
  trustBand: Band;
  suspicionBand: Band;
  context: SocialContextKind;
  reputation: Reputation;
  archetype: Archetype;
  memoryRef?: MemoryRef;
  // Non-verbal beat woven into the rendered line ("[arms crossed]", "[half-smile]").
  bodyLanguage?: string;
  // Hidden subtext shown only when the NPC's stated emotion contradicts their
  // underlying trust/suspicion — used to layer dramatic irony.
  subtext?: string;
  // The simulation-side effects derived from this bundle; cosmetic text never changes these.
  effects: {
    trust: number;
    suspicion: number;
    entertainment: number;
    influence: number;
  };
}

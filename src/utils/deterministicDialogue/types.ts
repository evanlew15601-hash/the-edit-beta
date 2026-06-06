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
  about?: string; // person or thing
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
  // The simulation-side effects derived from this bundle; cosmetic text never changes these.
  effects: {
    trust: number;
    suspicion: number;
    entertainment: number;
    influence: number;
  };
}

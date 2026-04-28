/**
 * Finale State Machine
 *
 * Single source of truth for the finale flow. Every transition is idempotent
 * and guarded by the current phase, so re-renders, double-clicks, or
 * dependency churn in React effects can never re-trigger work that has
 * already happened (e.g. tie-break resolution, jury tally).
 *
 *  Final 3                   Tie-break (1-1-1 only)
 *  ──────────────────────────────────────────────────────────────────
 *  IDLE
 *    │  startVoting()
 *    ▼
 *  VOTING
 *    │  submitVote()
 *    ▼
 *  TALLYING ────────── if 1-1-1 ──────────┐
 *    │                                    ▼
 *    │                              TIEBREAK_SELECT
 *    │                                    │ chooseMethod()
 *    │                                    ▼
 *    │                              TIEBREAK_RUNNING
 *    │                                    │ resolveTieBreak()  (fires once)
 *    │                                    ▼
 *    └───── normal result ──────────► RESOLVED
 *                                          │ continueToFinale()
 *                                          ▼
 *                                       FINALE_SPEECHES
 *                                          │ submitSpeech()  (fires once)
 *                                          ▼
 *                                       FINALE_SPEECHES_DONE
 *                                          │ proceedToJury()
 *                                          ▼
 *                                        JURY_VOTING
 *                                          │ tallyJury()  (fires once)
 *                                          ▼
 *                                        JURY_TALLIED
 *                                          │ revealWinner()
 *                                          ▼
 *                                          DONE
 */

export type FinalePhase =
  | 'IDLE'
  | 'VOTING'
  | 'TALLYING'
  | 'TIEBREAK_SELECT'
  | 'TIEBREAK_RUNNING'
  | 'RESOLVED'
  | 'FINALE_SPEECHES'
  | 'FINALE_SPEECHES_DONE'
  | 'JURY_VOTING'
  | 'JURY_TALLIED'
  | 'DONE';

export type FinaleEvent =
  | { type: 'START_VOTING' }
  | { type: 'SUBMIT_VOTE' }
  | { type: 'TALLY_NORMAL' }
  | { type: 'TALLY_TIE' }
  | { type: 'CHOOSE_METHOD' }
  | { type: 'START_TIEBREAK_RESOLUTION' }
  | { type: 'RESOLVE_TIEBREAK' }
  | { type: 'CONTINUE_TO_FINALE' }
  | { type: 'SUBMIT_SPEECH' }
  | { type: 'PROCEED_TO_JURY' }
  | {
      type: 'START_JURY_TALLY';
      votes?: { [juryMember: string]: string };
      rationales?: { [juryMember: string]: string };
    }
  | {
      type: 'TALLY_JURY';
      votes?: { [juryMember: string]: string };
      rationales?: { [juryMember: string]: string };
      winner?: string;
    }
  | { type: 'REVEAL_WINNER' }
  | { type: 'RESET' };

export interface FinaleState {
  phase: FinalePhase;
  /** Tracks one-shot side effects so an effect can't fire twice. */
  fired: {
    tieBreakStarted: boolean;
    tieBreakResolved: boolean;
    speechSubmitted: boolean;
    juryTallyStarted: boolean;
    juryTallied: boolean;
  };
  juryPartial?: {
    votes: { [juryMember: string]: string };
    rationales: { [juryMember: string]: string };
  };
  juryResult?: {
    votes: { [juryMember: string]: string };
    rationales: { [juryMember: string]: string };
    winner: string;
  };
}

export const initialFinaleState: FinaleState = {
  phase: 'IDLE',
  fired: {
    tieBreakStarted: false,
    tieBreakResolved: false,
    speechSubmitted: false,
    juryTallyStarted: false,
    juryTallied: false,
  },
};

/**
 * Transition table. Any unhandled (phase, event) pair returns the same
 * state — transitions are intentionally strict so out-of-order events
 * (re-renders, double clicks) become no-ops.
 */
export function finaleReducer(state: FinaleState, event: FinaleEvent): FinaleState {
  switch (event.type) {
    case 'RESET':
      return initialFinaleState;

    case 'START_VOTING':
      if (state.phase !== 'IDLE') return state;
      return { ...state, phase: 'VOTING' };

    case 'SUBMIT_VOTE':
      if (state.phase !== 'VOTING') return state;
      return { ...state, phase: 'TALLYING' };

    case 'TALLY_NORMAL':
      if (state.phase !== 'TALLYING') return state;
      return { ...state, phase: 'RESOLVED' };

    case 'TALLY_TIE':
      if (state.phase !== 'TALLYING') return state;
      return { ...state, phase: 'TIEBREAK_SELECT' };

    case 'CHOOSE_METHOD':
      if (state.phase !== 'TIEBREAK_SELECT') return state;
      return { ...state, phase: 'TIEBREAK_RUNNING' };

    case 'START_TIEBREAK_RESOLUTION':
      if (state.phase !== 'TIEBREAK_RUNNING') return state;
      if (state.fired.tieBreakStarted || state.fired.tieBreakResolved) return state;
      return {
        ...state,
        fired: { ...state.fired, tieBreakStarted: true },
      };

    case 'RESOLVE_TIEBREAK':
      // Strict guard: only allowed once, only from TIEBREAK_RUNNING.
      if (state.phase !== 'TIEBREAK_RUNNING') return state;
      if (state.fired.tieBreakResolved) return state;
      return {
        phase: 'RESOLVED',
        fired: { ...state.fired, tieBreakResolved: true },
      };

    case 'CONTINUE_TO_FINALE':
      if (state.phase !== 'RESOLVED') return state;
      return { ...state, phase: 'FINALE_SPEECHES' };

    case 'SUBMIT_SPEECH':
      if (state.phase !== 'FINALE_SPEECHES') return state;
      if (state.fired.speechSubmitted) return state;
      return {
        phase: 'FINALE_SPEECHES_DONE',
        fired: { ...state.fired, speechSubmitted: true },
      };

    case 'PROCEED_TO_JURY':
      if (state.phase !== 'FINALE_SPEECHES_DONE') return state;
      return { ...state, phase: 'JURY_VOTING' };

    case 'START_JURY_TALLY':
      if (state.phase !== 'JURY_VOTING') return state;
      if (state.fired.juryTallyStarted || state.fired.juryTallied) return state;
      return {
        ...state,
        fired: { ...state.fired, juryTallyStarted: true },
        juryPartial: event.votes
          ? {
              votes: event.votes,
              rationales: event.rationales || {},
            }
          : state.juryPartial,
      };

    case 'TALLY_JURY':
      if (state.phase !== 'JURY_VOTING') return state;
      if (state.fired.juryTallied) return state;
      return {
        phase: 'JURY_TALLIED',
        fired: { ...state.fired, juryTallied: true },
        juryPartial: state.juryPartial,
        juryResult: event.votes && event.winner
          ? {
              votes: event.votes,
              rationales: event.rationales || {},
              winner: event.winner,
            }
          : state.juryPartial && event.winner
          ? {
              votes: state.juryPartial.votes,
              rationales: state.juryPartial.rationales,
              winner: event.winner,
            }
          : state.juryResult,
      };

    case 'REVEAL_WINNER':
      if (state.phase !== 'JURY_TALLIED') return state;
      return { ...state, phase: 'DONE' };

    default:
      return state;
  }
}

/** Convenience: phases in which the player can still submit a finale speech. */
export const isSpeechPhase = (p: FinalePhase) => p === 'FINALE_SPEECHES';

/** Convenience: phases that mean the tie-break is finished or never needed. */
export const isResolved = (p: FinalePhase) =>
  p === 'RESOLVED' ||
  p === 'FINALE_SPEECHES' ||
  p === 'FINALE_SPEECHES_DONE' ||
  p === 'JURY_VOTING' ||
  p === 'JURY_TALLIED' ||
  p === 'DONE';

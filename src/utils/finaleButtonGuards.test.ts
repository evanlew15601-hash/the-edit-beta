/**
 * Finale Button Guard Tests
 *
 * Each finale screen renders buttons whose `disabled` state is derived from
 * the finale state machine's phase + one-shot `fired` flags. These tests
 * encode that mapping as pure predicates so we can verify, for every reachable
 * machine state, that a button is enabled iff its preconditions are met.
 *
 * Buttons covered:
 *   - "Cast Vote"            (Final3VoteScreen)        phase === VOTING
 *   - "Choose Tie-break"     (Final3VoteScreen)        phase === TIEBREAK_SELECT
 *   - "Resolve Tie-break"    (Final3VoteScreen)        phase === TIEBREAK_RUNNING && !fired.tieBreakResolved
 *   - "Continue to Finale"   (Final3VoteScreen)        phase === RESOLVED
 *   - "Deliver Speech"       (FinaleScreen)            phase === FINALE_SPEECHES && !fired.speechSubmitted
 *   - "Proceed to Jury"      (FinaleScreen)            phase === FINALE_SPEECHES_DONE
 *   - "Tally Jury"           (JuryVoteScreen)          phase === JURY_VOTING && !fired.juryTallied
 *   - "Reveal Winner"        (JuryVoteScreen)          phase === JURY_TALLIED
 */

import { describe, it, expect } from "vitest";
import {
  finaleReducer,
  initialFinaleState,
  type FinalePhase,
  type FinaleState,
  type FinaleEvent,
} from "./finaleStateMachine";

// ---------- Button predicate definitions (single source of truth) ----------

const canCastVote = (s: FinaleState) => s.phase === "VOTING";
const canChooseTiebreakMethod = (s: FinaleState) => s.phase === "TIEBREAK_SELECT";
const canResolveTiebreak = (s: FinaleState) =>
  s.phase === "TIEBREAK_RUNNING" && !s.fired.tieBreakResolved;
const canContinueToFinale = (s: FinaleState) => s.phase === "RESOLVED";
const canDeliverSpeech = (s: FinaleState) =>
  s.phase === "FINALE_SPEECHES" && !s.fired.speechSubmitted;
const canProceedToJury = (s: FinaleState) => s.phase === "FINALE_SPEECHES_DONE";
const canTallyJury = (s: FinaleState) =>
  s.phase === "JURY_VOTING" && !s.fired.juryTallied;
const canRevealWinner = (s: FinaleState) => s.phase === "JURY_TALLIED";

const buttons = {
  castVote: canCastVote,
  chooseTiebreakMethod: canChooseTiebreakMethod,
  resolveTiebreak: canResolveTiebreak,
  continueToFinale: canContinueToFinale,
  deliverSpeech: canDeliverSpeech,
  proceedToJury: canProceedToJury,
  tallyJury: canTallyJury,
  revealWinner: canRevealWinner,
} as const;

type ButtonName = keyof typeof buttons;

// Phase in which each button SHOULD be enabled (before its one-shot fires).
const enablingPhase: Record<ButtonName, FinalePhase> = {
  castVote: "VOTING",
  chooseTiebreakMethod: "TIEBREAK_SELECT",
  resolveTiebreak: "TIEBREAK_RUNNING",
  continueToFinale: "RESOLVED",
  deliverSpeech: "FINALE_SPEECHES",
  proceedToJury: "FINALE_SPEECHES_DONE",
  tallyJury: "JURY_VOTING",
  revealWinner: "JURY_TALLIED",
};

const drive = (events: FinaleEvent[]): FinaleState =>
  events.reduce((s, e) => finaleReducer(s, e), initialFinaleState);

// Canonical sequences that land us exactly in each phase.
const reach: Record<FinalePhase, FinaleEvent[]> = {
  IDLE: [],
  VOTING: [{ type: "START_VOTING" }],
  TALLYING: [{ type: "START_VOTING" }, { type: "SUBMIT_VOTE" }],
  TIEBREAK_SELECT: [
    { type: "START_VOTING" },
    { type: "SUBMIT_VOTE" },
    { type: "TALLY_TIE" },
  ],
  TIEBREAK_RUNNING: [
    { type: "START_VOTING" },
    { type: "SUBMIT_VOTE" },
    { type: "TALLY_TIE" },
    { type: "CHOOSE_METHOD" },
  ],
  RESOLVED: [
    { type: "START_VOTING" },
    { type: "SUBMIT_VOTE" },
    { type: "TALLY_NORMAL" },
  ],
  FINALE_SPEECHES: [
    { type: "START_VOTING" },
    { type: "SUBMIT_VOTE" },
    { type: "TALLY_NORMAL" },
    { type: "CONTINUE_TO_FINALE" },
  ],
  FINALE_SPEECHES_DONE: [
    { type: "START_VOTING" },
    { type: "SUBMIT_VOTE" },
    { type: "TALLY_NORMAL" },
    { type: "CONTINUE_TO_FINALE" },
    { type: "SUBMIT_SPEECH" },
  ],
  JURY_VOTING: [
    { type: "START_VOTING" },
    { type: "SUBMIT_VOTE" },
    { type: "TALLY_NORMAL" },
    { type: "CONTINUE_TO_FINALE" },
    { type: "SUBMIT_SPEECH" },
    { type: "PROCEED_TO_JURY" },
  ],
  JURY_TALLIED: [
    { type: "START_VOTING" },
    { type: "SUBMIT_VOTE" },
    { type: "TALLY_NORMAL" },
    { type: "CONTINUE_TO_FINALE" },
    { type: "SUBMIT_SPEECH" },
    { type: "PROCEED_TO_JURY" },
    { type: "TALLY_JURY", winner: "Alice" },
  ],
  DONE: [
    { type: "START_VOTING" },
    { type: "SUBMIT_VOTE" },
    { type: "TALLY_NORMAL" },
    { type: "CONTINUE_TO_FINALE" },
    { type: "SUBMIT_SPEECH" },
    { type: "PROCEED_TO_JURY" },
    { type: "TALLY_JURY", winner: "Alice" },
    { type: "REVEAL_WINNER" },
  ],
};

const ALL_PHASES = Object.keys(reach) as FinalePhase[];

describe("finale button guards — enabled exactly in the correct phase", () => {
  for (const [name, predicate] of Object.entries(buttons) as [
    ButtonName,
    (s: FinaleState) => boolean,
  ][]) {
    describe(`"${name}" button`, () => {
      it(`is enabled in phase ${enablingPhase[name]}`, () => {
        const s = drive(reach[enablingPhase[name]]);
        expect(s.phase).toBe(enablingPhase[name]);
        expect(predicate(s)).toBe(true);
      });

      it("is disabled in every other phase", () => {
        for (const phase of ALL_PHASES) {
          if (phase === enablingPhase[name]) continue;
          const s = drive(reach[phase]);
          expect(
            predicate(s),
            `button "${name}" should be disabled in phase ${phase}`,
          ).toBe(false);
        }
      });
    });
  }
});

describe("finale button guards — one-shot guards disable repeat clicks", () => {
  it('"Resolve Tie-break" disables itself once tie-break is resolved', () => {
    let s = drive(reach.TIEBREAK_RUNNING);
    expect(canResolveTiebreak(s)).toBe(true);

    s = finaleReducer(s, { type: "RESOLVE_TIEBREAK" });
    // After resolution we leave TIEBREAK_RUNNING entirely AND fired flag is set.
    expect(s.phase).toBe("RESOLVED");
    expect(s.fired.tieBreakResolved).toBe(true);
    expect(canResolveTiebreak(s)).toBe(false);

    // A second dispatch must be a no-op and stay disabled.
    const again = finaleReducer(s, { type: "RESOLVE_TIEBREAK" });
    expect(again).toBe(s);
    expect(canResolveTiebreak(again)).toBe(false);
  });

  it('"Deliver Speech" disables itself after speech is submitted', () => {
    let s = drive(reach.FINALE_SPEECHES);
    expect(canDeliverSpeech(s)).toBe(true);

    s = finaleReducer(s, { type: "SUBMIT_SPEECH" });
    expect(s.phase).toBe("FINALE_SPEECHES_DONE");
    expect(s.fired.speechSubmitted).toBe(true);
    expect(canDeliverSpeech(s)).toBe(false);

    const again = finaleReducer(s, { type: "SUBMIT_SPEECH" });
    expect(again).toBe(s);
    expect(canDeliverSpeech(again)).toBe(false);
  });

  it('"Tally Jury" disables itself once jury is tallied', () => {
    let s = drive(reach.JURY_VOTING);
    expect(canTallyJury(s)).toBe(true);

    s = finaleReducer(s, { type: "TALLY_JURY", winner: "Bob" });
    expect(s.phase).toBe("JURY_TALLIED");
    expect(s.fired.juryTallied).toBe(true);
    expect(canTallyJury(s)).toBe(false);

    const again = finaleReducer(s, { type: "TALLY_JURY", winner: "Bob" });
    expect(again).toBe(s);
    expect(canTallyJury(again)).toBe(false);
  });

  it('"Reveal Winner" only enables after jury tally and disables after reveal', () => {
    let s = drive(reach.JURY_VOTING);
    expect(canRevealWinner(s)).toBe(false); // not yet tallied

    s = finaleReducer(s, { type: "TALLY_JURY", winner: "Cara" });
    expect(canRevealWinner(s)).toBe(true);

    s = finaleReducer(s, { type: "REVEAL_WINNER" });
    expect(s.phase).toBe("DONE");
    expect(canRevealWinner(s)).toBe(false);
  });
});

describe("finale button guards — mutual exclusivity", () => {
  it("at most one primary action button is enabled in any reachable phase", () => {
    // "Primary action" = the buttons that advance the flow. They must never
    // be simultaneously enabled — otherwise the UI would offer conflicting
    // next steps.
    const primary: ButtonName[] = [
      "castVote",
      "chooseTiebreakMethod",
      "resolveTiebreak",
      "continueToFinale",
      "deliverSpeech",
      "proceedToJury",
      "tallyJury",
      "revealWinner",
    ];

    for (const phase of ALL_PHASES) {
      const s = drive(reach[phase]);
      const enabled = primary.filter((b) => buttons[b](s));
      expect(
        enabled.length,
        `phase ${phase} enabled multiple buttons: ${enabled.join(", ")}`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it("no action button is enabled in IDLE or DONE", () => {
    for (const terminal of ["IDLE", "DONE"] as FinalePhase[]) {
      const s = drive(reach[terminal]);
      for (const [name, predicate] of Object.entries(buttons)) {
        expect(
          predicate(s),
          `button "${name}" should be disabled in ${terminal}`,
        ).toBe(false);
      }
    }
  });
});

describe("finale button guards — tie-break path enables Continue to Finale", () => {
  it('"Continue to Finale" is enabled after tie-break resolves (not just normal tally)', () => {
    const s = drive([
      { type: "START_VOTING" },
      { type: "SUBMIT_VOTE" },
      { type: "TALLY_TIE" },
      { type: "CHOOSE_METHOD" },
      { type: "RESOLVE_TIEBREAK" },
    ]);
    expect(s.phase).toBe("RESOLVED");
    expect(canContinueToFinale(s)).toBe(true);
  });
});

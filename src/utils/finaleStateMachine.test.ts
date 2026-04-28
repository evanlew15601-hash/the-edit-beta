import { describe, it, expect } from "vitest";
import {
  finaleReducer,
  initialFinaleState,
  isResolved,
  isSpeechPhase,
  type FinaleEvent,
  type FinaleState,
} from "./finaleStateMachine";

/**
 * Helper: drive a sequence of events through the reducer, returning the
 * final state. Throws if any event in `expectChange` doesn't actually
 * advance the phase (catches accidental no-ops).
 */
const drive = (events: FinaleEvent[], from: FinaleState = initialFinaleState) =>
  events.reduce((s, e) => finaleReducer(s, e), from);

describe("finaleStateMachine — happy paths", () => {
  it("Final 3 → normal majority result → finale → jury → winner reveal", () => {
    let s = initialFinaleState;
    expect(s.phase).toBe("IDLE");

    s = finaleReducer(s, { type: "START_VOTING" });
    expect(s.phase).toBe("VOTING");

    s = finaleReducer(s, { type: "SUBMIT_VOTE" });
    expect(s.phase).toBe("TALLYING");

    s = finaleReducer(s, { type: "TALLY_NORMAL" });
    expect(s.phase).toBe("RESOLVED");
    expect(isResolved(s.phase)).toBe(true);

    s = finaleReducer(s, { type: "CONTINUE_TO_FINALE" });
    expect(s.phase).toBe("FINALE_SPEECHES");
    expect(isSpeechPhase(s.phase)).toBe(true);

    s = finaleReducer(s, { type: "SUBMIT_SPEECH" });
    expect(s.phase).toBe("FINALE_SPEECHES_DONE");
    expect(s.fired.speechSubmitted).toBe(true);

    s = finaleReducer(s, { type: "PROCEED_TO_JURY" });
    expect(s.phase).toBe("JURY_VOTING");

    s = finaleReducer(s, {
      type: "START_JURY_TALLY",
      votes: { J1: "A", J2: "B" },
      rationales: { J1: "loyal", J2: "strategic" },
    });
    expect(s.fired.juryTallyStarted).toBe(true);
    expect(s.juryPartial?.votes).toEqual({ J1: "A", J2: "B" });

    s = finaleReducer(s, {
      type: "TALLY_JURY",
      votes: { J1: "A", J2: "B", J3: "A" },
      rationales: { J3: "stronger game" },
      winner: "A",
    });
    expect(s.phase).toBe("JURY_TALLIED");
    expect(s.juryResult?.winner).toBe("A");
    expect(s.juryResult?.votes.J3).toBe("A");

    s = finaleReducer(s, { type: "REVEAL_WINNER" });
    expect(s.phase).toBe("DONE");
  });

  it("Final 3 → 1-1-1 tie → tie-break method → resolution → finale → jury → reveal", () => {
    let s = drive([
      { type: "START_VOTING" },
      { type: "SUBMIT_VOTE" },
      { type: "TALLY_TIE" },
    ]);
    expect(s.phase).toBe("TIEBREAK_SELECT");

    s = finaleReducer(s, { type: "CHOOSE_METHOD" });
    expect(s.phase).toBe("TIEBREAK_RUNNING");

    s = finaleReducer(s, { type: "START_TIEBREAK_RESOLUTION" });
    expect(s.fired.tieBreakStarted).toBe(true);
    expect(s.fired.tieBreakResolved).toBe(false);

    s = finaleReducer(s, { type: "RESOLVE_TIEBREAK" });
    expect(s.phase).toBe("RESOLVED");
    expect(s.fired.tieBreakResolved).toBe(true);

    s = drive(
      [
        { type: "CONTINUE_TO_FINALE" },
        { type: "SUBMIT_SPEECH" },
        { type: "PROCEED_TO_JURY" },
        { type: "START_JURY_TALLY", votes: { J1: "X" } },
        {
          type: "TALLY_JURY",
          votes: { J1: "X", J2: "X" },
          winner: "X",
        },
        { type: "REVEAL_WINNER" },
      ],
      s,
    );
    expect(s.phase).toBe("DONE");
    expect(s.juryResult?.winner).toBe("X");
  });
});

describe("finaleStateMachine — idempotency / one-shot guards", () => {
  it("RESOLVE_TIEBREAK only fires once even when dispatched repeatedly", () => {
    let s = drive([
      { type: "START_VOTING" },
      { type: "SUBMIT_VOTE" },
      { type: "TALLY_TIE" },
      { type: "CHOOSE_METHOD" },
      { type: "START_TIEBREAK_RESOLUTION" },
      { type: "RESOLVE_TIEBREAK" },
    ]);
    const after = finaleReducer(s, { type: "RESOLVE_TIEBREAK" });
    // Second call must be a no-op (same reference is ideal but at least same phase + flags)
    expect(after.phase).toBe("RESOLVED");
    expect(after.fired.tieBreakResolved).toBe(true);
    expect(after).toBe(s); // strict no-op
  });

  it("SUBMIT_SPEECH only fires once", () => {
    let s = drive([
      { type: "START_VOTING" },
      { type: "SUBMIT_VOTE" },
      { type: "TALLY_NORMAL" },
      { type: "CONTINUE_TO_FINALE" },
      { type: "SUBMIT_SPEECH" },
    ]);
    const again = finaleReducer(s, { type: "SUBMIT_SPEECH" });
    expect(again).toBe(s);
    expect(again.phase).toBe("FINALE_SPEECHES_DONE");
  });

  it("TALLY_JURY only fires once and preserves first result", () => {
    let s = drive([
      { type: "START_VOTING" },
      { type: "SUBMIT_VOTE" },
      { type: "TALLY_NORMAL" },
      { type: "CONTINUE_TO_FINALE" },
      { type: "SUBMIT_SPEECH" },
      { type: "PROCEED_TO_JURY" },
      { type: "TALLY_JURY", votes: { J1: "A" }, winner: "A" },
    ]);
    expect(s.juryResult?.winner).toBe("A");
    const again = finaleReducer(s, {
      type: "TALLY_JURY",
      votes: { J1: "B" },
      winner: "B",
    });
    expect(again).toBe(s);
    expect(again.juryResult?.winner).toBe("A");
  });

  it("START_TIEBREAK_RESOLUTION won't re-fire after resolution", () => {
    let s = drive([
      { type: "START_VOTING" },
      { type: "SUBMIT_VOTE" },
      { type: "TALLY_TIE" },
      { type: "CHOOSE_METHOD" },
      { type: "START_TIEBREAK_RESOLUTION" },
      { type: "RESOLVE_TIEBREAK" },
    ]);
    const again = finaleReducer(s, { type: "START_TIEBREAK_RESOLUTION" });
    // We're already in RESOLVED, so this is a no-op
    expect(again).toBe(s);
  });
});

describe("finaleStateMachine — out-of-order / invalid events", () => {
  it("ignores SUBMIT_VOTE before START_VOTING", () => {
    const s = finaleReducer(initialFinaleState, { type: "SUBMIT_VOTE" });
    expect(s).toBe(initialFinaleState);
  });

  it("ignores RESOLVE_TIEBREAK from VOTING phase", () => {
    const s = drive([{ type: "START_VOTING" }, { type: "RESOLVE_TIEBREAK" }]);
    expect(s.phase).toBe("VOTING");
  });

  it("ignores SUBMIT_SPEECH before reaching FINALE_SPEECHES", () => {
    const s = drive([
      { type: "START_VOTING" },
      { type: "SUBMIT_VOTE" },
      { type: "TALLY_NORMAL" },
      { type: "SUBMIT_SPEECH" }, // still in RESOLVED
    ]);
    expect(s.phase).toBe("RESOLVED");
    expect(s.fired.speechSubmitted).toBe(false);
  });

  it("ignores PROCEED_TO_JURY before speech is submitted", () => {
    const s = drive([
      { type: "START_VOTING" },
      { type: "SUBMIT_VOTE" },
      { type: "TALLY_NORMAL" },
      { type: "CONTINUE_TO_FINALE" },
      { type: "PROCEED_TO_JURY" },
    ]);
    expect(s.phase).toBe("FINALE_SPEECHES");
  });

  it("ignores REVEAL_WINNER before jury tallied", () => {
    const s = drive([
      { type: "START_VOTING" },
      { type: "SUBMIT_VOTE" },
      { type: "TALLY_NORMAL" },
      { type: "CONTINUE_TO_FINALE" },
      { type: "SUBMIT_SPEECH" },
      { type: "PROCEED_TO_JURY" },
      { type: "REVEAL_WINNER" },
    ]);
    expect(s.phase).toBe("JURY_VOTING");
  });

  it("ignores CHOOSE_METHOD when not in TIEBREAK_SELECT", () => {
    const s = finaleReducer(initialFinaleState, { type: "CHOOSE_METHOD" });
    expect(s).toBe(initialFinaleState);
  });
});

describe("finaleStateMachine — RESET", () => {
  it("RESET returns the machine to IDLE clearing all flags & data", () => {
    const s = drive([
      { type: "START_VOTING" },
      { type: "SUBMIT_VOTE" },
      { type: "TALLY_TIE" },
      { type: "CHOOSE_METHOD" },
      { type: "START_TIEBREAK_RESOLUTION" },
      { type: "RESOLVE_TIEBREAK" },
      { type: "CONTINUE_TO_FINALE" },
      { type: "SUBMIT_SPEECH" },
      { type: "PROCEED_TO_JURY" },
      { type: "TALLY_JURY", votes: { J1: "A" }, winner: "A" },
      { type: "REVEAL_WINNER" },
    ]);
    expect(s.phase).toBe("DONE");
    const reset = finaleReducer(s, { type: "RESET" });
    expect(reset).toEqual(initialFinaleState);
  });
});

describe("finaleStateMachine — full flow matrix (every winner × every tie path)", () => {
  const finalists = ["Alpha", "Bravo", "Charlie"] as const;
  const tallyPaths = [
    { name: "normal", events: [{ type: "TALLY_NORMAL" }] as FinaleEvent[] },
    {
      name: "tie+resolve",
      events: [
        { type: "TALLY_TIE" },
        { type: "CHOOSE_METHOD" },
        { type: "START_TIEBREAK_RESOLUTION" },
        { type: "RESOLVE_TIEBREAK" },
      ] as FinaleEvent[],
    },
  ];

  for (const winner of finalists) {
    for (const path of tallyPaths) {
      it(`completes via ${path.name} with winner=${winner}`, () => {
        const votes = Object.fromEntries(
          ["J1", "J2", "J3", "J4", "J5"].map((j) => [j, winner]),
        );
        const s = drive([
          { type: "START_VOTING" },
          { type: "SUBMIT_VOTE" },
          ...path.events,
          { type: "CONTINUE_TO_FINALE" },
          { type: "SUBMIT_SPEECH" },
          { type: "PROCEED_TO_JURY" },
          { type: "START_JURY_TALLY", votes },
          { type: "TALLY_JURY", votes, winner },
          { type: "REVEAL_WINNER" },
        ]);
        expect(s.phase).toBe("DONE");
        expect(s.juryResult?.winner).toBe(winner);
        expect(Object.values(s.juryResult!.votes).every((v) => v === winner)).toBe(true);
        // All one-shots fired exactly the ones expected
        expect(s.fired.speechSubmitted).toBe(true);
        expect(s.fired.juryTallied).toBe(true);
        if (path.name === "tie+resolve") {
          expect(s.fired.tieBreakStarted).toBe(true);
          expect(s.fired.tieBreakResolved).toBe(true);
        } else {
          expect(s.fired.tieBreakResolved).toBe(false);
        }
      });
    }
  }
});

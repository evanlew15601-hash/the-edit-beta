import { describe, it, expect } from 'vitest';
import {
  evaluateClaim,
  recordClaim,
  tickCorroboration,
  plantedBeliefVoteBoost,
} from './deceptionEngine';
import type { Contestant, GameState, PlantedBelief } from '@/types/game';

// ---------- helpers (mirror the main test file) ----------

const mkContestant = (
  name: string,
  overrides: Partial<Contestant['psychProfile']> = {},
  disposition: string[] = ['neutral'],
): Contestant => ({
  id: name,
  name,
  publicPersona: '',
  psychProfile: {
    disposition,
    trustLevel: 50,
    suspicionLevel: 30,
    emotionalCloseness: 30,
    editBias: 0,
    plantedBeliefs: [],
    ...overrides,
  },
  memory: [],
  isEliminated: false,
});

const baseState = (contestants: Contestant[], day = 5): GameState => ({
  currentDay: day,
  playerName: 'Player',
  contestants,
  playerActions: [],
  confessionals: [],
  editPerception: {
    screenTimeIndex: 50,
    audienceApproval: 0,
    persona: 'Underedited',
    lastEditShift: 0,
  },
  alliances: [],
  votingHistory: [],
  gamePhase: 'daily',
  twistsActivated: [],
  nextEliminationDay: 7,
  dailyActionCount: 0,
  dailyActionCap: 10,
  aiSettings: {} as any,
  deceptionLog: [],
});

const forceStatus = (
  state: GameState,
  listenerName: string,
  status: PlantedBelief['status'],
  overrides: Partial<PlantedBelief> = {},
): GameState => ({
  ...state,
  contestants: state.contestants.map((c) =>
    c.name !== listenerName
      ? c
      : {
          ...c,
          psychProfile: {
            ...c.psychProfile,
            plantedBeliefs: (c.psychProfile.plantedBeliefs || []).map((b) => ({
              ...b,
              status,
              ...overrides,
            })),
          },
        },
  ),
});

// ---------- regression tests ----------

describe('deceptionEngine regressions', () => {
  describe('contradictory claims', () => {
    it('plants two opposing voting_intent claims on the same listener without losing either', () => {
      const listener = mkContestant('Lila', { trustLevel: 80 });
      const targetA = mkContestant('Mark');
      const targetB = mkContestant('Nina');
      let state = baseState([
        mkContestant('Player'),
        listener,
        targetA,
        targetB,
      ]);

      state = recordClaim(state, {
        listener: 'Lila',
        about: 'Mark',
        claimType: 'voting_intent',
        payload: 'Lila',
      }).state;
      state = recordClaim(state, {
        listener: 'Lila',
        about: 'Nina',
        claimType: 'voting_intent',
        payload: 'Lila',
      }).state;

      const lila = state.contestants.find((c) => c.name === 'Lila')!;
      expect(lila.psychProfile.plantedBeliefs?.length).toBe(2);
      expect(state.deceptionLog?.length).toBe(2);
      // Both claims persist independently regardless of their landing status.
      const abouts = lila.psychProfile.plantedBeliefs!.map((b) => b.about).sort();
      expect(abouts).toEqual(['Mark', 'Nina']);
    });

    it('rejects an alliance claim that contradicts a prior planted alliance belief implicitly', () => {
      // The engine docks plausibility hard when the listener is already in an
      // alliance with `about` that excludes `payload`. Verify the contradiction
      // path is deterministic enough that rejection dominates.
      const listener = mkContestant('Inside', undefined, ['calculating']);
      const about = mkContestant('Mark');
      const decoy = mkContestant('Decoy');
      const state: GameState = {
        ...baseState([mkContestant('Player'), listener, about, decoy]),
        alliances: [
          {
            id: 'a1',
            members: ['Inside', 'Mark'],
            strength: 90,
            secret: true,
            formed: 1,
            lastActivity: 4,
          },
        ],
      };

      let rejects = 0;
      for (let i = 0; i < 60; i++) {
        const { belief } = evaluateClaim(
          {
            listener: 'Inside',
            about: 'Mark',
            claimType: 'alliance_exists',
            payload: 'Decoy',
          },
          state,
        );
        if (belief.status === 'rejected') rejects++;
      }
      // With a -35 plausibility hit plus -10 false-claim penalty, rejection
      // should be the modal outcome.
      expect(rejects).toBeGreaterThan(30);
    });

    it('a true claim that immediately contradicts a believed false claim still records cleanly', () => {
      const listener = mkContestant('Lila', { trustLevel: 70 });
      const mark = mkContestant('Mark');
      const nina = mkContestant('Nina');
      let state: GameState = {
        ...baseState([mkContestant('Player'), listener, mark, nina]),
        alliances: [
          {
            id: 'a1',
            members: ['Mark', 'Nina'],
            strength: 80,
            secret: true,
            formed: 1,
            lastActivity: 4,
          },
        ],
      };

      // First claim: false ("Mark voting Lila" — Mark is allied w/ Nina, not Lila → still false against shared-alliance heuristic? No, no shared alliance with Lila → engine treats as TRUE)
      // To force a contradictory pair, use alliance_exists.
      state = recordClaim(state, {
        listener: 'Lila',
        about: 'Mark',
        claimType: 'alliance_exists',
        payload: 'Decoy', // false
      }).state;
      state = recordClaim(state, {
        listener: 'Lila',
        about: 'Mark',
        claimType: 'alliance_exists',
        payload: 'Nina', // true
      }).state;

      const lila = state.contestants.find((c) => c.name === 'Lila')!;
      expect(lila.psychProfile.plantedBeliefs?.length).toBe(2);
      const trueOnes = lila.psychProfile.plantedBeliefs!.filter((b) => b.isTrue);
      const falseOnes = lila.psychProfile.plantedBeliefs!.filter((b) => !b.isTrue);
      expect(trueOnes.length).toBe(1);
      expect(falseOnes.length).toBe(1);
    });
  });

  describe('multi-day persistence', () => {
    it('a believed true claim survives many corroboration ticks without flipping to exposed', () => {
      const listener = mkContestant('Gus', undefined, ['calculating']);
      const mark = mkContestant('Mark');
      let state: GameState = {
        ...baseState([mkContestant('Player'), listener, mark]),
      };
      state = recordClaim(state, {
        // Without a shared alliance, voting_intent is treated as TRUE by isClaimTrue.
        listener: 'Gus',
        about: 'Mark',
        claimType: 'voting_intent',
        payload: 'Gus',
      }).state;
      state = forceStatus(state, 'Gus', 'believed');

      for (let day = 6; day < 20; day++) {
        state = { ...tickCorroboration(state), currentDay: day };
      }

      const gus = state.contestants.find((c) => c.name === 'Gus')!;
      const belief = gus.psychProfile.plantedBeliefs![0];
      // True claims should never get exposed, only confirmed/believed.
      expect(belief.status).not.toBe('exposed');
      expect(belief.status).not.toBe('rejected');
      expect(belief.isTrue).toBe(true);
    });

    it('a suspected false claim eventually exposes after enough days pass', () => {
      const listener = mkContestant('Gus', undefined, ['calculating']);
      const mark = mkContestant('Mark');
      let state: GameState = {
        ...baseState([mkContestant('Player'), listener, mark]),
        alliances: [
          {
            id: 'a1',
            members: ['Gus', 'Mark'],
            strength: 80,
            secret: true,
            formed: 1,
            lastActivity: 4,
          },
        ],
      };
      state = recordClaim(state, {
        // Shared alliance → voting_intent is treated as FALSE.
        listener: 'Gus',
        about: 'Mark',
        claimType: 'voting_intent',
        payload: 'Gus',
      }).state;
      state = forceStatus(state, 'Gus', 'suspected', { isTrue: false });

      let exposedDay: number | undefined;
      for (let day = 6; day < 60 && exposedDay === undefined; day++) {
        state = { ...tickCorroboration(state), currentDay: day };
        const gus = state.contestants.find((c) => c.name === 'Gus')!;
        const belief = gus.psychProfile.plantedBeliefs![0];
        if (belief.status === 'exposed') exposedDay = belief.exposedDay;
      }

      expect(exposedDay).toBeDefined();
      expect(exposedDay!).toBeGreaterThanOrEqual(6);
    });

    it('exposed claims do not re-trigger trust loss on subsequent ticks', () => {
      const listener = mkContestant('Gus', { trustLevel: 60 });
      const mark = mkContestant('Mark');
      let state: GameState = {
        ...baseState([mkContestant('Player'), listener, mark]),
        alliances: [
          {
            id: 'a1',
            members: ['Gus', 'Mark'],
            strength: 80,
            secret: true,
            formed: 1,
            lastActivity: 4,
          },
        ],
      };
      state = recordClaim(state, {
        listener: 'Gus',
        about: 'Mark',
        claimType: 'voting_intent',
        payload: 'Gus',
      }).state;
      state = forceStatus(state, 'Gus', 'exposed', {
        isTrue: false,
        exposedDay: 5,
      });

      const beforeTrust = state.contestants.find((c) => c.name === 'Gus')!
        .psychProfile.trustLevel;
      const beforeLogLen = state.deceptionLog!.length;

      for (let day = 6; day < 20; day++) {
        state = { ...tickCorroboration(state), currentDay: day };
      }

      const after = state.contestants.find((c) => c.name === 'Gus')!.psychProfile;
      expect(after.trustLevel).toBe(beforeTrust);
      expect(state.deceptionLog!.length).toBe(beforeLogLen);
      expect(after.plantedBeliefs![0].status).toBe('exposed');
    });

    it('plantedBeliefVoteBoost ignores beliefs once they are exposed across days', () => {
      const listener = mkContestant('Voter');
      const target = mkContestant('Target');
      let state = baseState([mkContestant('Player'), listener, target]);
      state = recordClaim(state, {
        listener: 'Voter',
        about: 'Target',
        claimType: 'voting_intent',
        payload: 'Voter',
      }).state;
      state = forceStatus(state, 'Voter', 'believed');
      const believedBoost = plantedBeliefVoteBoost('Voter', 'Target', state);
      expect(believedBoost).toBeGreaterThan(0);

      state = forceStatus(state, 'Voter', 'exposed', { exposedDay: 6 });
      const exposedBoost = plantedBeliefVoteBoost('Voter', 'Target', state);
      expect(exposedBoost).toBe(0);
    });
  });

  describe('simultaneous corroboration outcomes', () => {
    it('processes multiple listeners in a single tick independently', () => {
      const a = mkContestant('A', undefined, ['calculating']);
      const b = mkContestant('B', undefined, ['calculating']);
      const mark = mkContestant('Mark');
      let state: GameState = {
        ...baseState([mkContestant('Player'), a, b, mark]),
        alliances: [
          {
            id: 'al-a',
            members: ['A', 'Mark'],
            strength: 80,
            secret: true,
            formed: 1,
            lastActivity: 4,
          },
          {
            id: 'al-b',
            members: ['B', 'Mark'],
            strength: 80,
            secret: true,
            formed: 1,
            lastActivity: 4,
          },
        ],
      };
      state = recordClaim(state, {
        listener: 'A',
        about: 'Mark',
        claimType: 'voting_intent',
        payload: 'A',
      }).state;
      state = recordClaim(state, {
        listener: 'B',
        about: 'Mark',
        claimType: 'voting_intent',
        payload: 'B',
      }).state;
      state = forceStatus(state, 'A', 'believed', { isTrue: false });
      state = forceStatus(state, 'B', 'believed', { isTrue: false });

      let aExposed = false;
      let bExposed = false;
      for (let i = 0; i < 80 && !(aExposed && bExposed); i++) {
        const next = tickCorroboration(state);
        const ai = next.contestants.find((c) => c.name === 'A')!;
        const bi = next.contestants.find((c) => c.name === 'B')!;
        if (ai.psychProfile.plantedBeliefs![0].status === 'exposed') aExposed = true;
        if (bi.psychProfile.plantedBeliefs![0].status === 'exposed') bExposed = true;
        state = next;
      }
      expect(aExposed).toBe(true);
      expect(bExposed).toBe(true);
    });

    it('logs one entry per exposure when multiple lies expose in the same tick', () => {
      const listener = mkContestant('Gus', undefined, ['calculating']);
      const mark = mkContestant('Mark');
      const lee = mkContestant('Lee');
      let state: GameState = {
        ...baseState([mkContestant('Player'), listener, mark, lee]),
        alliances: [
          {
            id: 'a1',
            members: ['Gus', 'Mark'],
            strength: 80,
            secret: true,
            formed: 1,
            lastActivity: 4,
          },
          {
            id: 'a2',
            members: ['Gus', 'Lee'],
            strength: 80,
            secret: true,
            formed: 1,
            lastActivity: 4,
          },
        ],
      };
      state = recordClaim(state, {
        listener: 'Gus',
        about: 'Mark',
        claimType: 'voting_intent',
        payload: 'Gus',
      }).state;
      state = recordClaim(state, {
        listener: 'Gus',
        about: 'Lee',
        claimType: 'voting_intent',
        payload: 'Gus',
      }).state;
      state = forceStatus(state, 'Gus', 'believed', { isTrue: false });

      const startLog = state.deceptionLog!.length;
      // Tick until both are exposed.
      for (let i = 0; i < 100; i++) {
        state = tickCorroboration(state);
        const gus = state.contestants.find((c) => c.name === 'Gus')!;
        if (gus.psychProfile.plantedBeliefs!.every((b) => b.status === 'exposed')) {
          break;
        }
      }
      const gus = state.contestants.find((c) => c.name === 'Gus')!;
      const exposedBeliefs = gus.psychProfile.plantedBeliefs!.filter(
        (b) => b.status === 'exposed',
      );
      expect(exposedBeliefs.length).toBe(2);
      const exposureLogs = state.deceptionLog!.slice(startLog).filter(
        (e) => e.outcome === 'exposed',
      );
      // One log entry per exposure.
      expect(exposureLogs.length).toBe(exposedBeliefs.length);
    });

    it('eliminated `about` target prevents corroboration check from exposing the lie', () => {
      const listener = mkContestant('Gus', undefined, ['calculating']);
      const mark: Contestant = { ...mkContestant('Mark'), isEliminated: true };
      let state: GameState = {
        ...baseState([mkContestant('Player'), listener, mark]),
        alliances: [
          {
            id: 'a1',
            members: ['Gus', 'Mark'],
            strength: 80,
            secret: true,
            formed: 1,
            lastActivity: 4,
          },
        ],
      };
      state = recordClaim(state, {
        listener: 'Gus',
        about: 'Mark',
        claimType: 'voting_intent',
        payload: 'Gus',
      }).state;
      state = forceStatus(state, 'Gus', 'believed', { isTrue: false });

      for (let i = 0; i < 50; i++) {
        state = tickCorroboration(state);
      }
      const gus = state.contestants.find((c) => c.name === 'Gus')!;
      // Without a live target to verify against, the lie should never be exposed.
      expect(gus.psychProfile.plantedBeliefs![0].status).toBe('believed');
    });
  });
});

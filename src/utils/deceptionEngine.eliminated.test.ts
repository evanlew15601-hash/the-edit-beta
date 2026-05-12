import { describe, it, expect } from 'vitest';
import {
  tickCorroboration,
  plantedBeliefVoteBoost,
  recordClaim,
} from './deceptionEngine';
import type { Contestant, GameState, PlantedBelief } from '@/types/game';

// ---------- helpers (mirror the main test files) ----------

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

// ---------- regression tests: eliminated listener ----------

describe('deceptionEngine eliminated listener regressions', () => {
  describe('eliminated listener beliefs are frozen', () => {
    it('does not update beliefs for an eliminated listener during tickCorroboration', () => {
      const listener: Contestant = { ...mkContestant('Gus', undefined, ['calculating']), isEliminated: true };
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
      state = forceStatus(state, 'Gus', 'believed', { isTrue: false });

      const beforeTrust = state.contestants.find((c) => c.name === 'Gus')!.psychProfile.trustLevel;
      const beforeSuspicion = state.contestants.find((c) => c.name === 'Gus')!.psychProfile.suspicionLevel;
      const beforeLogLen = state.deceptionLog!.length;
      const beforeStatus = state.contestants.find((c) => c.name === 'Gus')!.psychProfile.plantedBeliefs![0].status;

      for (let i = 0; i < 50; i++) {
        state = tickCorroboration(state);
      }

      const gus = state.contestants.find((c) => c.name === 'Gus')!;
      expect(gus.psychProfile.plantedBeliefs![0].status).toBe(beforeStatus);
      expect(gus.psychProfile.trustLevel).toBe(beforeTrust);
      expect(gus.psychProfile.suspicionLevel).toBe(beforeSuspicion);
      expect(state.deceptionLog!.length).toBe(beforeLogLen);
    });

    it('does not promote suspected -> believed for an eliminated listener', () => {
      const listener: Contestant = { ...mkContestant('Gus', undefined, ['calculating']), isEliminated: true };
      const mark = mkContestant('Mark');
      let state: GameState = {
        ...baseState([mkContestant('Player'), listener, mark]),
      };
      state = recordClaim(state, {
        listener: 'Gus',
        about: 'Mark',
        claimType: 'is_threat',
      }).state;
      state = forceStatus(state, 'Gus', 'suspected', { isTrue: true });

      for (let i = 0; i < 50; i++) {
        state = tickCorroboration(state);
      }

      const gus = state.contestants.find((c) => c.name === 'Gus')!;
      expect(gus.psychProfile.plantedBeliefs![0].status).toBe('suspected');
    });

    it('plantedBeliefVoteBoost returns 0 for an eliminated listener', () => {
      const listener: Contestant = { ...mkContestant('Voter'), isEliminated: true };
      const target = mkContestant('Target');
      let state = baseState([mkContestant('Player'), listener, target]);
      state = recordClaim(state, {
        listener: 'Voter',
        about: 'Target',
        claimType: 'voting_intent',
        payload: 'Voter',
      }).state;
      state = forceStatus(state, 'Voter', 'believed');

      const boost = plantedBeliefVoteBoost('Voter', 'Target', state);
      expect(boost).toBe(0);
    });
  });

  describe('mixed active and eliminated listeners in same tick', () => {
    it('processes only active listeners when others are eliminated in the same tick', () => {
      const activeListener = mkContestant('Active', undefined, ['calculating']);
      const eliminatedListener: Contestant = { ...mkContestant('Eliminated', undefined, ['calculating']), isEliminated: true };
      const mark = mkContestant('Mark');
      let state: GameState = {
        ...baseState([mkContestant('Player'), activeListener, eliminatedListener, mark]),
        alliances: [
          {
            id: 'a1',
            members: ['Active', 'Mark'],
            strength: 80,
            secret: true,
            formed: 1,
            lastActivity: 4,
          },
          {
            id: 'a2',
            members: ['Eliminated', 'Mark'],
            strength: 80,
            secret: true,
            formed: 1,
            lastActivity: 4,
          },
        ],
      };

      // Plant identical false claims on both
      state = recordClaim(state, {
        listener: 'Active',
        about: 'Mark',
        claimType: 'voting_intent',
        payload: 'Active',
      }).state;
      state = recordClaim(state, {
        listener: 'Eliminated',
        about: 'Mark',
        claimType: 'voting_intent',
        payload: 'Eliminated',
      }).state;
      state = forceStatus(state, 'Active', 'believed', { isTrue: false });
      state = forceStatus(state, 'Eliminated', 'believed', { isTrue: false });

      const beforeElimTrust = state.contestants.find((c) => c.name === 'Eliminated')!.psychProfile.trustLevel;
      const beforeElimSuspicion = state.contestants.find((c) => c.name === 'Eliminated')!.psychProfile.suspicionLevel;
      const beforeElimLog = state.deceptionLog!.length;

      // Tick many times
      let activeExposed = false;
      for (let i = 0; i < 100 && !activeExposed; i++) {
        state = tickCorroboration(state);
        const active = state.contestants.find((c) => c.name === 'Active')!;
        if (active.psychProfile.plantedBeliefs![0].status === 'exposed') {
          activeExposed = true;
        }
      }

      expect(activeExposed).toBe(true);

      const eliminated = state.contestants.find((c) => c.name === 'Eliminated')!;
      // Eliminated listener must remain untouched
      expect(eliminated.psychProfile.plantedBeliefs![0].status).toBe('believed');
      expect(eliminated.psychProfile.trustLevel).toBe(beforeElimTrust);
      expect(eliminated.psychProfile.suspicionLevel).toBe(beforeElimSuspicion);
      // Only one exposure log (from Active)
      const exposureLogs = state.deceptionLog!.slice(beforeElimLog).filter((e) => e.outcome === 'exposed');
      expect(exposureLogs.length).toBeLessThanOrEqual(1);
    });

    it('multiple eliminated listeners are all skipped independently', () => {
      const elimA: Contestant = { ...mkContestant('ElimA', { trustLevel: 60 }), isEliminated: true };
      const elimB: Contestant = { ...mkContestant('ElimB', { trustLevel: 70 }), isEliminated: true };
      const mark = mkContestant('Mark');
      let state = baseState([mkContestant('Player'), elimA, elimB, mark]);

      state = recordClaim(state, { listener: 'ElimA', about: 'Mark', claimType: 'is_threat' }).state;
      state = recordClaim(state, { listener: 'ElimB', about: 'Mark', claimType: 'is_threat' }).state;
      state = forceStatus(state, 'ElimA', 'believed', { isTrue: false });
      state = forceStatus(state, 'ElimB', 'suspected', { isTrue: true });

      const beforeTrustA = state.contestants.find((c) => c.name === 'ElimA')!.psychProfile.trustLevel;
      const beforeTrustB = state.contestants.find((c) => c.name === 'ElimB')!.psychProfile.trustLevel;
      const beforeLog = state.deceptionLog!.length;

      for (let i = 0; i < 30; i++) {
        state = tickCorroboration(state);
      }

      const afterA = state.contestants.find((c) => c.name === 'ElimA')!.psychProfile;
      const afterB = state.contestants.find((c) => c.name === 'ElimB')!.psychProfile;

      expect(afterA.trustLevel).toBe(beforeTrustA);
      expect(afterB.trustLevel).toBe(beforeTrustB);
      expect(afterA.plantedBeliefs![0].status).toBe('believed');
      expect(afterB.plantedBeliefs![0].status).toBe('suspected');
      expect(state.deceptionLog!.length).toBe(beforeLog);
    });
  });

  describe('mid-cycle elimination edge cases', () => {
    it('beliefs recorded before elimination remain in state but are never updated', () => {
      const listener = mkContestant('Gus', undefined, ['calculating']);
      const mark = mkContestant('Mark');
      let state = baseState([mkContestant('Player'), listener, mark]);
      state = recordClaim(state, {
        listener: 'Gus',
        about: 'Mark',
        claimType: 'voting_intent',
        payload: 'Gus',
      }).state;
      state = forceStatus(state, 'Gus', 'believed', { isTrue: false });

      // Now eliminate the listener mid-cycle
      state = {
        ...state,
        contestants: state.contestants.map((c) =>
          c.name === 'Gus' ? { ...c, isEliminated: true } : c,
        ),
      };

      const beforeTrust = state.contestants.find((c) => c.name === 'Gus')!.psychProfile.trustLevel;
      const beforeLog = state.deceptionLog!.length;

      for (let i = 0; i < 50; i++) {
        state = tickCorroboration(state);
      }

      const gus = state.contestants.find((c) => c.name === 'Gus')!;
      expect(gus.psychProfile.plantedBeliefs![0].status).toBe('believed');
      expect(gus.psychProfile.trustLevel).toBe(beforeTrust);
      expect(state.deceptionLog!.length).toBe(beforeLog);
    });

    it('vote boost ignores beliefs of a contestant eliminated after the claim was planted', () => {
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

      // Eliminate the listener
      state = {
        ...state,
        contestants: state.contestants.map((c) =>
          c.name === 'Voter' ? { ...c, isEliminated: true } : c,
        ),
      };

      const boost = plantedBeliefVoteBoost('Voter', 'Target', state);
      expect(boost).toBe(0);
    });
  });
});

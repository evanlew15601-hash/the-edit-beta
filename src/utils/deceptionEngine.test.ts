import { describe, it, expect } from 'vitest';
import {
  evaluateClaim,
  recordClaim,
  tickCorroboration,
  plantedBeliefVoteBoost,
} from './deceptionEngine';
import type { GameState, Contestant } from '@/types/game';

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

const baseState = (contestants: Contestant[]): GameState => ({
  currentDay: 5,
  playerName: 'Player',
  contestants,
  playerActions: [],
  confessionals: [],
  editPerception: { screenTimeIndex: 50, audienceApproval: 0, persona: 'Underedited', lastEditShift: 0 },
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

describe('deceptionEngine', () => {
  it('rejects an implausible claim from a high-detection NPC', () => {
    const listener = mkContestant('Sharp', { trustLevel: -20 }, ['calculating']);
    const about = mkContestant('Mark');
    const state = baseState([
      mkContestant('Player'),
      listener,
      about,
    ]);
    // Bias the random by running many times and checking distribution
    let rejects = 0;
    for (let i = 0; i < 50; i++) {
      const { belief } = evaluateClaim(
        { listener: 'Sharp', about: 'Mark', claimType: 'is_threat' },
        state,
      );
      if (belief.status === 'rejected') rejects++;
    }
    expect(rejects).toBeGreaterThan(20);
  });

  it('a high-trust naive listener tends to believe a claim', () => {
    const listener = mkContestant('Trustful', { trustLevel: 80 }, ['naive']);
    const about = mkContestant('Mark', { trustLevel: 70 });
    const state = baseState([
      mkContestant('Player'),
      listener,
      about,
    ]);
    let believed = 0;
    for (let i = 0; i < 50; i++) {
      const { belief } = evaluateClaim(
        { listener: 'Trustful', about: 'Mark', claimType: 'is_threat' },
        state,
      );
      if (belief.status === 'believed') believed++;
    }
    expect(believed).toBeGreaterThan(20);
  });

  it('rejects an alliance claim that contradicts the listener\'s own membership', () => {
    const listener = mkContestant('Inside');
    const about = mkContestant('Mark');
    const decoy = mkContestant('Decoy');
    const state: GameState = {
      ...baseState([mkContestant('Player'), listener, about, decoy]),
      alliances: [{
        id: 'a1',
        members: ['Inside', 'Mark'],
        strength: 80,
        secret: true,
        formed: 1,
        lastActivity: 4,
      }],
    };
    let rejects = 0;
    for (let i = 0; i < 30; i++) {
      const { belief } = evaluateClaim(
        { listener: 'Inside', about: 'Mark', claimType: 'alliance_exists', payload: 'Decoy' },
        state,
      );
      if (belief.status === 'rejected') rejects++;
    }
    // Strong contradiction should dominate the random jitter.
    expect(rejects).toBeGreaterThan(15);
  });

  it('records the claim into listener.psychProfile.plantedBeliefs and the deception log', () => {
    const listener = mkContestant('Lila', { trustLevel: 70 });
    const about = mkContestant('Mark');
    const state = baseState([mkContestant('Player'), listener, about]);
    const { state: next } = recordClaim(state, {
      listener: 'Lila',
      about: 'Mark',
      claimType: 'voting_intent',
      payload: 'Lila',
    });
    const lila = next.contestants.find(c => c.name === 'Lila')!;
    expect(lila.psychProfile.plantedBeliefs?.length).toBe(1);
    expect(next.deceptionLog?.length).toBe(1);
  });

  it('exposes a false claim during corroboration with allied target', () => {
    const listener = mkContestant('Gus', { trustLevel: 50 }, ['calculating']);
    const about = mkContestant('Mark');
    let state: GameState = {
      ...baseState([mkContestant('Player'), listener, about]),
      alliances: [{
        id: 'a1', members: ['Gus', 'Mark'], strength: 80, secret: true, formed: 1, lastActivity: 4,
      }],
    };
    // Plant a false claim that Mark is voting for Gus (false because they're allies).
    state = recordClaim(state, {
      listener: 'Gus',
      about: 'Mark',
      claimType: 'voting_intent',
      payload: 'Gus',
    }).state;
    // Force the planted belief into 'believed' so we can check exposure
    state = {
      ...state,
      contestants: state.contestants.map(c => c.name !== 'Gus' ? c : ({
        ...c,
        psychProfile: {
          ...c.psychProfile,
          plantedBeliefs: c.psychProfile.plantedBeliefs!.map(b => ({ ...b, status: 'believed' as const, isTrue: false })),
        },
      })),
    };
    let exposed = false;
    for (let i = 0; i < 50; i++) {
      const next = tickCorroboration(state);
      const gus = next.contestants.find(c => c.name === 'Gus')!;
      if (gus.psychProfile.plantedBeliefs!.some(b => b.status === 'exposed')) {
        exposed = true;
        break;
      }
    }
    expect(exposed).toBe(true);
  });

  it('plantedBeliefVoteBoost adds threat for the named target', () => {
    const listener = mkContestant('Voter');
    const about = mkContestant('Target');
    let state = baseState([mkContestant('Player'), listener, about]);
    state = recordClaim(state, {
      listener: 'Voter',
      about: 'Target',
      claimType: 'voting_intent',
      payload: 'Voter',
    }).state;
    // Force believed so we can assert the boost path
    state.contestants = state.contestants.map(c => c.name !== 'Voter' ? c : ({
      ...c,
      psychProfile: {
        ...c.psychProfile,
        plantedBeliefs: c.psychProfile.plantedBeliefs!.map(b => ({ ...b, status: 'believed' as const })),
      },
    }));
    const boost = plantedBeliefVoteBoost('Voter', 'Target', state);
    expect(boost).toBeGreaterThanOrEqual(35);
  });
});

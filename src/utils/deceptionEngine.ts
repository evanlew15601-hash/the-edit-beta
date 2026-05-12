// Deception Engine
//
// Lets the player plant claims (true or false) inside an NPC's head, lets that
// NPC decide whether to believe the claim based on personality + corroboration
// against what they already know, and exposes lies over time when other
// houseguests would naturally contradict them.
//
// The engine is pure TS so it can be unit-tested without React or Supabase.

import type {
  Contestant,
  GameState,
  PlantedBelief,
  ClaimType,
  DeceptionLogEntry,
} from '@/types/game';
import { getNPCPersonalityBias } from '@/utils/aiResponseEngine';

export interface PlantClaimInput {
  listener: string; // NPC name receiving the claim
  about: string; // NPC the claim is about
  claimType: ClaimType;
  payload?: string; // e.g. who they're allegedly allying with, who they're allegedly voting
}

export interface PlantClaimResult {
  belief: PlantedBelief;
  trustDelta: number; // applied to listener->player relationship
  suspicionDelta: number; // applied to listener
  reasoning: string;
}

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Compute whether a claim about another houseguest is actually true given the
 * current game state. Used at plant time so we can score corroboration later.
 */
export function isClaimTrue(input: PlantClaimInput, state: GameState): boolean {
  const { about, claimType, payload, listener } = input;
  switch (claimType) {
    case 'voting_intent': {
      // True if the listener actually appears as a likely target for `about`.
      // Heuristic: `about` has lower trust / higher suspicion of listener than average.
      // Without a hard plan we treat alliance membership as the signal.
      const sharedAlliance = state.alliances.some(
        (a) =>
          !a.dissolved &&
          a.members.includes(about) &&
          a.members.includes(listener),
      );
      // A claim that "X is voting Y" is treated as plausible/true only when X and Y
      // are NOT in the same alliance. Players targeting their own allies is rare.
      return !sharedAlliance;
    }
    case 'alliance_exists': {
      // payload is the alleged ally; true if that pair shares an alliance
      if (!payload) return false;
      return state.alliances.some(
        (a) =>
          !a.dissolved &&
          a.members.includes(about) &&
          a.members.includes(payload),
      );
    }
    case 'said_about_you': {
      // True iff `about` recently logged a hostile memory about listener
      const c = state.contestants.find((x) => x.name === about);
      if (!c) return false;
      return c.memory.some(
        (m) =>
          m.participants.includes(listener) &&
          m.emotionalImpact < -2 &&
          m.day >= state.currentDay - 5,
      );
    }
    case 'is_threat': {
      const c = state.contestants.find((x) => x.name === about);
      if (!c) return false;
      // Threat if they're highly trusted (popular) or in many alliances.
      const allianceCount = state.alliances.filter(
        (a) => !a.dissolved && a.members.includes(about),
      ).length;
      return c.psychProfile.trustLevel > 50 || allianceCount >= 2;
    }
  }
}

/**
 * Decide how the listener reacts to the claim right now: do they believe it?
 * Returns the resulting belief plus relationship deltas to apply.
 */
export function evaluateClaim(
  input: PlantClaimInput,
  state: GameState,
): PlantClaimResult {
  const listener = state.contestants.find((c) => c.name === input.listener);
  if (!listener) {
    throw new Error(`Listener ${input.listener} not found`);
  }
  const bias = getNPCPersonalityBias(listener);
  const trueClaim = isClaimTrue(input, state);

  // Plausibility starts at 50 and is moved by detection vs. trust + corroboration.
  let plausibility = 50;
  const reasons: string[] = [];

  // Listener trust toward the player makes them more credulous.
  const trustToPlayer = listener.psychProfile.trustLevel; // -100..100
  plausibility += trustToPlayer * 0.25;
  if (trustToPlayer > 40) reasons.push('trusts the player');
  if (trustToPlayer < 0) reasons.push('distrusts the player');

  // Detection skill cuts the other way.
  plausibility -= (bias.manipulationDetection - 50) * 0.4;
  plausibility -= (bias.suspiciousness - 50) * 0.2;

  // True claims are easier to accept; false ones get docked.
  if (trueClaim) {
    plausibility += 15;
    reasons.push('matches what they have observed');
  } else {
    plausibility -= 10;
  }

  // Hard contradictions: claim collides with the listener's own memberships.
  if (input.claimType === 'alliance_exists' && input.payload) {
    const listenerInAlliance = state.alliances.some(
      (a) =>
        !a.dissolved &&
        a.members.includes(input.listener) &&
        a.members.includes(input.about) &&
        !a.members.includes(input.payload!),
    );
    if (listenerInAlliance) {
      plausibility -= 35;
      reasons.push('they are already allied with the named houseguest');
    }
  }

  if (input.claimType === 'voting_intent' && input.payload === input.listener) {
    // "X is voting for you" — listener will weigh more heavily but also more suspiciously.
    plausibility -= bias.suspiciousness * 0.1;
  }

  // Add some volatility so identical inputs don't always land the same.
  plausibility += (Math.random() * 20) - 10;

  let status: PlantedBelief['status'];
  if (plausibility >= 65) status = 'believed';
  else if (plausibility >= 40) status = 'suspected';
  else status = 'rejected';

  // Trust + suspicion deltas toward the player.
  let trustDelta = 0;
  let suspicionDelta = 0;
  if (status === 'believed') {
    trustDelta = trueClaim ? 4 : 2; // bonding moment either way
    suspicionDelta = -2;
  } else if (status === 'suspected') {
    trustDelta = -2;
    suspicionDelta = 6;
  } else {
    // Rejected on contact
    trustDelta = trueClaim ? -3 : -8;
    suspicionDelta = trueClaim ? 4 : 12;
    reasons.push('the claim did not land');
  }

  const belief: PlantedBelief = {
    id: uid('belief'),
    day: state.currentDay,
    speaker: state.playerName,
    about: input.about,
    claimType: input.claimType,
    payload: input.payload,
    isTrue: trueClaim,
    status,
    reasoning: reasons.join('; '),
  };

  return {
    belief,
    trustDelta: Math.round(trustDelta),
    suspicionDelta: Math.round(suspicionDelta),
    reasoning: reasons.join('; '),
  };
}

/**
 * Returns a new GameState with the planted belief recorded on the listener and
 * a corresponding entry in the deception log. Trust/suspicion deltas are applied
 * to the listener's psych profile.
 */
export function recordClaim(
  state: GameState,
  input: PlantClaimInput,
): { state: GameState; result: PlantClaimResult } {
  const result = evaluateClaim(input, state);
  const contestants = state.contestants.map((c) => {
    if (c.name !== input.listener) return c;
    const beliefs = [...(c.psychProfile.plantedBeliefs || []), result.belief];
    return {
      ...c,
      psychProfile: {
        ...c.psychProfile,
        plantedBeliefs: beliefs,
        trustLevel: clamp(c.psychProfile.trustLevel + result.trustDelta, -100, 100),
        suspicionLevel: clamp(
          c.psychProfile.suspicionLevel + result.suspicionDelta,
          0,
          100,
        ),
      },
    };
  });

  const logEntry: DeceptionLogEntry = {
    id: uid('decep'),
    day: state.currentDay,
    listener: input.listener,
    about: input.about,
    claimType: input.claimType,
    payload: input.payload,
    isTrue: result.belief.isTrue,
    outcome: result.belief.status === 'rejected' ? 'rejected' : result.belief.status,
    note: result.reasoning,
  };

  return {
    state: {
      ...state,
      contestants,
      deceptionLog: [...(state.deceptionLog || []), logEntry],
    },
    result,
  };
}

/**
 * Daily corroboration tick. For each unresolved planted belief, simulate the
 * listener "checking" the claim against another houseguest. False claims that
 * get checked are exposed; true claims are confirmed and stay believed.
 */
export function tickCorroboration(state: GameState): GameState {
  const log: DeceptionLogEntry[] = [...(state.deceptionLog || [])];

  const contestants = state.contestants.map((c) => {
    if (c.isEliminated) return c;
    const beliefs = c.psychProfile.plantedBeliefs;
    if (!beliefs || beliefs.length === 0) return c;

    let trust = c.psychProfile.trustLevel;
    let suspicion = c.psychProfile.suspicionLevel;
    const updated = beliefs.map((b) => {
      if (b.status === 'exposed' || b.status === 'rejected') return b;
      // Roll a corroboration check. Higher detection => more likely to verify.
      const bias = getNPCPersonalityBias(c);
      const checkChance =
        0.18 +
        bias.manipulationDetection / 400 +
        bias.suspiciousness / 500 +
        (b.status === 'suspected' ? 0.2 : 0);
      if (Math.random() > checkChance) return b;

      // Did they find someone to verify against?
      const target = state.contestants.find((x) => x.name === b.about);
      if (!target || target.isEliminated) return b;

      if (b.isTrue) {
        // Confirmed; promote suspected -> believed
        if (b.status === 'suspected') {
          return { ...b, status: 'believed' as const };
        }
        return b;
      }

      // False claim got verified — exposed.
      const trustHit = b.status === 'believed' ? 35 : 20;
      const suspicionHit = b.status === 'believed' ? 30 : 18;
      trust = clamp(trust - trustHit, -100, 100);
      suspicion = clamp(suspicion + suspicionHit, 0, 100);
      log.push({
        id: uid('decep'),
        day: state.currentDay,
        listener: c.name,
        about: b.about,
        claimType: b.claimType,
        payload: b.payload,
        isTrue: false,
        outcome: 'exposed',
        note: 'Caught contradiction with another houseguest',
      });
      return { ...b, status: 'exposed' as const, exposedDay: state.currentDay };
    });

    return {
      ...c,
      psychProfile: {
        ...c.psychProfile,
        plantedBeliefs: updated,
        trustLevel: trust,
        suspicionLevel: suspicion,
      },
    };
  });

  return { ...state, contestants, deceptionLog: log };
}

/**
 * Score adjustment to fold into vote-target threat scoring. Returns extra points
 * to add to a target's threat for a given listener based on currently-believed
 * planted claims.
 */
export function plantedBeliefVoteBoost(
  listenerName: string,
  candidateName: string,
  state: GameState,
): number {
  const listener = state.contestants.find((c) => c.name === listenerName);
  if (!listener || listener.isEliminated) return 0;
  const beliefs = listener.psychProfile.plantedBeliefs || [];
  let boost = 0;
  for (const b of beliefs) {
    if (b.status === 'exposed' || b.status === 'rejected') continue;
    const weight = b.status === 'believed' ? 1 : 0.4;
    if (b.about === candidateName) {
      if (b.claimType === 'voting_intent' && b.payload === listenerName) {
        boost += 35 * weight;
      } else if (b.claimType === 'said_about_you') {
        boost += 22 * weight;
      } else if (b.claimType === 'is_threat') {
        boost += 18 * weight;
      } else if (b.claimType === 'alliance_exists') {
        boost += 10 * weight;
      }
    }
  }
  return boost;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

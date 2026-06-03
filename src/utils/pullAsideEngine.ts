import { GameState, Contestant } from '@/types/game';

export interface PullAside {
  from: string;
  topic: string; // NPC's opening line (displayed as a quote to the player)
  urgency: 'casual' | 'important';
  day: number;
  reason: string; // dev/debug label
}

/**
 * Was this NPC the player's most recent pull-aside in the last 2 days?
 * Uses NPC memory tagged 'pull_aside' to dedupe so the same paranoid voice doesn't
 * corner the player every morning.
 */
const recentlyPulledAside = (npc: Contestant, currentDay: number, playerName: string): boolean => {
  return (npc.memory || []).some(m =>
    m.day >= currentDay - 2 &&
    Array.isArray(m.tags) && m.tags.includes('pull_aside') &&
    m.participants.includes(playerName)
  );
};

const recentSchemeBy = (npc: Contestant, currentDay: number, playerName: string): boolean => {
  return (npc.memory || []).some(m =>
    m.day >= currentDay - 2 &&
    m.type === 'scheme' &&
    m.participants.includes(playerName) &&
    m.emotionalImpact < 0
  );
};

const hasBelievedPlantAboutPlayer = (npc: Contestant, playerName: string): boolean => {
  const beliefs = npc.psychProfile.plantedBeliefs || [];
  return beliefs.some(b => b.about === playerName && b.status === 'believed');
};

const inAllianceWithPlayer = (state: GameState, npcName: string): boolean => {
  return (state.alliances || []).some(a =>
    !a.dissolved && a.members.includes(state.playerName) && a.members.includes(npcName)
  );
};

interface Candidate {
  npc: Contestant;
  score: number;
  reason: string;
  buildLine: (npc: Contestant, playerName: string) => { topic: string; urgency: 'casual' | 'important' };
}

export function generatePullAside(state: GameState): PullAside | null {
  const { playerName, currentDay } = state;
  if (!playerName) return null;

  // Don't stack pull-asides — at most one queued at a time from this generator.
  const queue = state.forcedConversationsQueue || [];
  if (queue.length >= 1) return null;

  const eligible = state.contestants.filter(c =>
    !c.isEliminated &&
    c.name !== playerName &&
    !recentlyPulledAside(c, currentDay, playerName)
  );
  if (eligible.length === 0) return null;

  const candidates: Candidate[] = [];

  for (const npc of eligible) {
    const susp = npc.psychProfile.suspicionLevel ?? 0;
    const trust = npc.psychProfile.trustLevel ?? 0;
    const closeness = npc.psychProfile.emotionalCloseness ?? 0;
    const allied = inAllianceWithPlayer(state, npc.name);

    // 1) Paranoid suspicion
    if (susp >= 55) {
      candidates.push({
        npc,
        score: susp + (allied ? 10 : 0),
        reason: 'paranoid_suspicion',
        buildLine: (n) => ({
          topic: `Hey — walk with me for a sec. I need to know where your head is at, because what I'm hearing about you and me doesn't line up.`,
          urgency: susp >= 75 ? 'important' : 'casual',
        }),
      });
    }

    // 2) Alliance fracture: ally whose trust just slipped
    if (allied && trust < 25) {
      candidates.push({
        npc,
        score: 70 + (25 - trust),
        reason: 'alliance_fracture',
        buildLine: () => ({
          topic: `Pull up. We're supposed to be tight and right now I can't tell if we still are. Talk to me.`,
          urgency: 'important',
        }),
      });
    }

    // 3) Player schemed against them recently
    if (recentSchemeBy(npc, currentDay, playerName)) {
      candidates.push({
        npc,
        score: 80 + susp / 4,
        reason: 'scheme_blowback',
        buildLine: () => ({
          topic: `So... a name came back to me with your fingerprints on it. Want to tell me your side before I act on it?`,
          urgency: 'important',
        }),
      });
    }

    // 4) A planted belief about the player they currently believe
    if (hasBelievedPlantAboutPlayer(npc, playerName)) {
      candidates.push({
        npc,
        score: 65,
        reason: 'planted_belief_active',
        buildLine: () => ({
          topic: `Quick word, away from the room. I heard something specific about you and I want to hear it from your mouth.`,
          urgency: 'important',
        }),
      });
    }

    // 5) Close ally check-in (low priority, rarer)
    if (closeness >= 65 && Math.random() < 0.25) {
      candidates.push({
        npc,
        score: 30 + closeness / 5,
        reason: 'close_check_in',
        buildLine: () => ({
          topic: `Hey, just you and me for a minute. How are you actually doing in here? I want a real answer, not a camera one.`,
          urgency: 'casual',
        }),
      });
    }
  }

  if (candidates.length === 0) return null;

  // Pick highest score with mild jitter so it doesn't always feel deterministic.
  candidates.sort((a, b) => (b.score + Math.random() * 5) - (a.score + Math.random() * 5));
  const winner = candidates[0];
  const line = winner.buildLine(winner.npc, playerName);

  return {
    from: winner.npc.name,
    topic: line.topic,
    urgency: line.urgency,
    day: currentDay,
    reason: winner.reason,
  };
}

/**
 * Stamp a pull_aside memory tag so the same NPC won't corner the player again in 2 days.
 * Call this when enqueuing.
 */
export function tagPullAsideMemory(npc: Contestant, playerName: string, currentDay: number, reason: string): Contestant {
  return {
    ...npc,
    memory: [
      ...npc.memory,
      {
        day: currentDay,
        type: 'conversation',
        participants: [npc.name, playerName],
        content: `[Pull-aside initiated] ${reason}`,
        emotionalImpact: 0,
        timestamp: Date.now(),
        tags: ['pull_aside', reason],
      },
    ],
  };
}

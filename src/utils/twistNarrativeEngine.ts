import { GameState, Contestant, TwistNarrative, NarrativeBeat } from '@/types/game';
import { createWeeklyTask, verifyAndUpdateTasks } from './taskEngine';
import { getGameplayConfessionalPrompts } from './gameplayDrivenNarrative';

// Minimal prompt shape compatible with EnhancedConfessionalEngine
export type ConfPrompt = {
  id: string;
  category: 'strategy' | 'alliance' | 'voting' | 'social' | 'reflection' | 'general';
  prompt: string;
  followUp?: string;
  suggestedTones: string[];
  editPotential: number;
  context?: any;
};

function getPlayer(gs: GameState): Contestant | undefined {
  return gs.contestants.find(c => c.name === gs.playerName);
}

// Static beat schedules for lite story mode twist arcs.
// Beats fire in a fixed order based on day, independent of gameplay stats.
function buildStaticHostChildBeats(startDay: number): NarrativeBeat[] {
  return [
    {
      id: 'hc_first_week',
      title: 'Casting Playback',
      dayPlanned: startDay + 1,
      status: 'planned',
      summary: 'Producers review early footage and flag you as the host’s family.',
    },
    {
      id: 'hc_build_trust',
      title: 'Leading Questions',
      dayPlanned: startDay + 4,
      status: 'planned',
      summary: 'Confessional prompts circle your family more than your strategy.',
    },
    {
      id: 'hc_voting_block',
      title: 'Segment Meeting',
      dayPlanned: startDay + 7,
      status: 'planned',
      summary: 'A segment meeting quietly steers an early vote away from you.',
    },
    {
      id: 'hc_reveal_timing',
      title: 'Whiteboard',
      dayPlanned: startDay + 10,
      status: 'planned',
      summary: 'Production debates when and how to reveal your connection.',
    },
    {
      id: 'hc_immediate_fallout',
      title: 'Live Segment',
      dayPlanned: startDay + 14,
      status: 'planned',
      summary: 'A live reveal makes your secret public to the house.',
    },
    {
      id: 'hc_rebuild_trust',
      title: 'Damage Report',
      dayPlanned: startDay + 17,
      status: 'planned',
      summary: 'Fallout is monitored from the control room while you repair trust.',
    },
    {
      id: 'hc_flip_narrative',
      title: 'Edit Bay',
      dayPlanned: startDay + 21,
      status: 'planned',
      summary: 'Editors reshape your arc as pressure instead of privilege.',
    },
    {
      id: 'hc_jury_pitch',
      title: 'Final Package',
      dayPlanned: startDay + 24,
      status: 'planned',
      summary: 'Your story is packaged for finale questions and jury debate.',
    },
  ];
}

function buildStaticPlantedHGBeats(startDay: number): NarrativeBeat[] {
  return [
    {
      id: 'phg_current_mission',
      title: "Tonight's Gimmick",
      dayPlanned: startDay + 2,
      status: 'planned',
      summary: 'The first mission card is introduced to the audience at home.',
    },
    {
      id: 'phg_avoid_detection',
      title: 'Suspicion is Content',
      dayPlanned: startDay + 5,
      status: 'planned',
      summary: 'Rising suspicion about you is treated as good television.',
    },
    {
      id: 'phg_balance_act',
      title: 'Two Scoreboards',
      dayPlanned: startDay + 9,
      status: 'planned',
      summary: 'You juggle production missions against real relationships.',
    },
    {
      id: 'phg_contract_decision',
      title: 'End of the Deal',
      dayPlanned: startDay + 14,
      status: 'planned',
      summary: 'Production pushes you to choose a quiet end or a big reveal.',
    },
    {
      id: 'phg_exposed',
      title: 'Live Confession',
      dayPlanned: startDay + 18,
      status: 'planned',
      summary: 'Your role as a plant is exposed to the house on air.',
    },
    {
      id: 'phg_reframe',
      title: 'Post-Game Spin',
      dayPlanned: startDay + 20,
      status: 'planned',
      summary: 'Press and PR spin your twist into a marketable story.',
    },
    {
      id: 'phg_use_intel',
      title: 'Earpiece',
      dayPlanned: startDay + 23,
      status: 'planned',
      summary: 'Production funnels viewer information into your decisions.',
    },
  ];
}

// Merge beats with existing ones, preserving scheduled days and progress.
// In the static story mode, this mainly advances planned beats into active status by day.
function mergeBeats(existing: NarrativeBeat[] = [], generated: NarrativeBeat[], currentDay: number): NarrativeBeat[] {
  const map = new Map<string, NarrativeBeat>();
  existing.forEach(b => map.set(b.id, b));

  const result: NarrativeBeat[] = [];

  generated.forEach(g => {
    const prev = map.get(g.id);
    if (!prev) {
      result.push({ ...g });
    } else {
      result.push({
        ...prev,
        title: g.title || prev.title,
        summary: g.summary ?? prev.summary,
      });
      map.delete(g.id);
    }
  });

  map.forEach(rem => {
    result.push(rem);
  });

  return result.map(b => {
    if (b.status === 'completed') return b;
    if (b.status === 'planned' && currentDay >= b.dayPlanned) {
      return { ...b, status: 'active' as const };
    }
    return b;
  });
}

export function initializeTwistNarrative(gs: GameState): TwistNarrative | undefined {
  const player = getPlayer(gs);
  if (!player || !player.special || player.special.kind === 'none') {
    return { arc: 'none', beats: [] };
  }

  const startDay = gs.currentDay || 1;

  if (player.special.kind === 'hosts_estranged_child') {
    return {
      arc: 'hosts_child',
      beats: buildStaticHostChildBeats(startDay),
      confessionalThemes: ['family', 'reputation', 'trust', 'edit_bias'],
    };
  }

  if (player.special.kind === 'planted_houseguest') {
    return {
      arc: 'planted_houseguest',
      beats: buildStaticPlantedHGBeats(startDay),
      confessionalThemes: ['mission', 'cover_story', 'pressure', 'secret'],
    };
  }

  return { arc: 'none', beats: [] };
}

export function applyDailyNarrative(gs: GameState): GameState {
  const player = getPlayer(gs);
  if (!player) return gs;

  // Build a working arc without wiping prior schedule
  let arc = gs.twistNarrative;
  if (!arc || arc.arc === 'none') {
    arc = initializeTwistNarrative(gs);
  }

  if (!arc) return gs;

  let working: GameState = { ...gs };

  // Planted HG task sync, exposure, and contract end handling (linear contract window)
  if (player.special && player.special.kind === 'planted_houseguest') {
    const spec = player.special;

    // Contract window calculations
    const week = Math.floor((gs.currentDay - 1) / 7) + 1;
    const contractWeeks = spec.contractWeeks ?? 6;
    const contractEndWeek = spec.contractEndWeek ?? contractWeeks;
    const contractEnded = week > contractEndWeek;

    // Update spec with contract meta
    const specUpdated = { ...spec, contractWeeks, contractEndWeek, contractEnded } as typeof spec;

    // Ensure at least one task per week assigned by appending if needed, only within contract window
    const tasks = (spec.tasks || []).slice();
    const weekTaskId = `w${week}_mission`;
    const hasWeekTask = tasks.some(t => t.id === weekTaskId);
    if (!hasWeekTask && !contractEnded) {
      const newTask = createWeeklyTask(gs, week);
      tasks.push(newTask);
    }

    // Reflect tasks and contract meta back into player.special
    let updatedContestants = working.contestants.map(c => {
      if (c.name !== working.playerName) return c;
      return {
        ...c,
        special: { ...specUpdated, tasks },
      } as Contestant;
    });
    working = { ...working, contestants: updatedContestants };

    // If contract ended and twist still secret, raise a UI notification once
    if (contractEnded && !spec.secretRevealed && !spec.contractEndNotified) {
      const notifiedSpec = { ...specUpdated, contractEndNotified: true };
      updatedContestants = working.contestants.map(c => {
        if (c.name !== working.playerName) return c;
        return { ...c, special: notifiedSpec } as Contestant;
      });
      const twists = Array.from(new Set([...(working.twistsActivated || []), 'planted_contract_end']));
      working = { ...working, contestants: updatedContestants, twistsActivated: twists };
    }

    // Verify and update task progress/completion and apply rewards once per day
    working = verifyAndUpdateTasks(working);
  }

  // Advance any planned beats into active status based purely on day
  const beats = mergeBeats(arc.beats, arc.beats, gs.currentDay);

  return {
    ...working,
    twistNarrative: { ...arc, beats, currentBeatId: beats.find(b => b.status === 'active')?.id },
  };
}

export function getSpecialConfessionalPrompts(gs: GameState): ConfPrompt[] {
  const player = getPlayer(gs);
  if (!player || !player.special || player.special.kind === 'none') return [];

  // Use gameplay-driven prompts instead of generic ones
  return getGameplayConfessionalPrompts(gs, player);
}

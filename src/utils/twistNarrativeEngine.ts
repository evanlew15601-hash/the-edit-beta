import { GameState, Contestant, TwistNarrative, NarrativeBeat } from '@/types/game';
import { createWeeklyTask, verifyAndUpdateTasks } from './taskEngine';
import { generateHostChildBeats, generatePlantedHGBeats, getGameplayConfessionalPrompts } from './gameplayDrivenNarrative';

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

// Merge newly generated beats with existing ones, preserving scheduled days and progress
function mergeBeats(existing: NarrativeBeat[] = [], generated: NarrativeBeat[], currentDay: number): NarrativeBeat[] {
  const map = new Map<string, NarrativeBeat>();
  existing.forEach(b => map.set(b.id, b));

  const result: NarrativeBeat[] = [];

  generated.forEach(g => {
    const prev = map.get(g.id);
    if (!prev) {
      // New beat - keep its planned day relative to when it is first seen
      result.push({ ...g });
    } else {
      // Preserve prior scheduling/progress; only refresh title/summary if provided
      result.push({
        ...prev,
        title: g.title || prev.title,
        summary: g.summary ?? prev.summary,
      });
      map.delete(g.id);
    }
  });

  // Carry over any extra beats that no longer generate but were already in progress
  map.forEach(rem => {
    result.push(rem);
  });

  // Activate any planned beats whose day has arrived
  return result.map(b => {
    if (b.status === 'completed') return b;
    if (b.status === 'planned' && currentDay >= b.dayPlanned) {
      return { ...b, status: 'active' as const };
    }
    return b;
  });
}

// Note: Beats are now generated dynamically in gameplayDrivenNarrative.ts based on actual gameplay

export function initializeTwistNarrative(gs: GameState): TwistNarrative | undefined {
  const player = getPlayer(gs);
  if (!player || !player.special || player.special.kind === 'none') return { arc: 'none', beats: [] };

  if (player.special.kind === 'hosts_estranged_child') {
    return {
      arc: 'hosts_child',
      beats: generateHostChildBeats(gs, player),
      confessionalThemes: ['family', 'reputation', 'trust', 'edit_bias'],
    };
  }

  if (player.special.kind === 'planted_houseguest') {
    return {
      arc: 'planted_houseguest',
      beats: generatePlantedHGBeats(gs, player),
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
  } else {
    // Generate context-aware beats but merge with existing so we don't keep pushing them forward
    const generated =
      player.special?.kind === 'hosts_estranged_child'
        ? generateHostChildBeats(gs, player)
        : player.special?.kind === 'planted_houseguest'
        ? generatePlantedHGBeats(gs, player)
        : [];
    arc.beats = mergeBeats(arc.beats, generated, gs.currentDay);
  }

  if (!arc) return gs;

  // Ensure activation check (for arcs freshly initialized this day)
  const beats = mergeBeats(arc.beats, arc.beats, gs.currentDay);

  // Host child reveal sync
  if (player.special && player.special.kind === 'hosts_estranged_child') {
    const revealed = !!player.special.revealed;
    const revealBeatIdx = beats.findIndex(b => b.id.includes('reveal'));
    if (revealBeatIdx >= 0) {
      const revealBeat = beats[revealBeatIdx];
      if (revealed && revealBeat.status !== 'completed') {
        beats[revealBeatIdx] = { ...revealBeat, status: 'completed' as const, summary: `Revealed on Day ${gs.currentDay}` };
      }
    }
  }

  // Planted HG task sync, exposure, and contract end handling
  let working = { ...gs };
  if (player.special && player.special.kind === 'planted_houseguest') {
    const spec = player.special;

    // Contract window calculations
    const week = Math.floor((gs.currentDay - 1) / 7) + 1;
    const contractWeeks = spec.contractWeeks ?? 6;
    const contractEndWeek = spec.contractEndWeek ?? contractWeeks;
    const contractEnded = week > contractEndWeek;

    // Update spec with contract meta
    let specUpdated = { ...spec, contractWeeks, contractEndWeek, contractEnded } as typeof spec;

    // escalate beat when secret revealed
    if (spec.secretRevealed) {
      const exposureIdx = beats.findIndex(b => b.id.includes('exposed'));
      if (exposureIdx >= 0) {
        beats[exposureIdx] = { ...beats[exposureIdx], status: 'active' as const, summary: `Secret flagged Day ${spec.revealDay || gs.currentDay}` };
      }
    }

    // ensure at least one task per week assigned by appending if needed, only within contract window
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

    // Verify and update task progress/completion and apply rewards
    working = verifyAndUpdateTasks(working);
  }

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

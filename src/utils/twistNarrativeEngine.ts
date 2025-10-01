import { GameState, Contestant, TwistNarrative, NarrativeBeat } from '@/types/game';
import { createWeeklyTask, verifyAndUpdateTasks } from './taskEngine';

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

function buildHostChildBeats(startDay: number): NarrativeBeat[] {
  return [
    { id: 'hc_premiere_seeds', title: 'Premiere Seeds', dayPlanned: startDay, status: 'planned' },
    { id: 'hc_rumor_swirl', title: 'Rumor Swirl', dayPlanned: startDay + 3, status: 'planned' },
    { id: 'hc_mars_private_meet', title: 'Private: Mars Vega', dayPlanned: startDay + 8, status: 'planned' },
    { id: 'hc_reveal', title: 'Reveal', dayPlanned: startDay + 10, status: 'planned' },
    { id: 'hc_consequence', title: 'Consequences', dayPlanned: startDay + 11, status: 'planned' },
    { id: 'hc_mars_televised_checkin', title: 'Televised Check-In: Mars Vega', dayPlanned: startDay + 14, status: 'planned' },
    { id: 'hc_redemption_attempt', title: 'Redemption Attempt', dayPlanned: startDay + 21, status: 'planned' },
    { id: 'hc_final_reckoning', title: 'Final Reckoning', dayPlanned: startDay + 28, status: 'planned' },
  ];
}

function buildPlantedHGBeats(startDay: number): NarrativeBeat[] {
  return [
    { id: 'phg_mission_brief', title: 'Mission Brief', dayPlanned: startDay + 2, status: 'planned' },
    { id: 'phg_producer_brief', title: 'Behind the Scenes: Producer Brief', dayPlanned: startDay + 3, status: 'planned' },
    { id: 'phg_cover_story', title: 'Cover Story Built', dayPlanned: startDay + 5, status: 'planned' },
    { id: 'phg_risky_plant', title: 'Risky Plant Executed', dayPlanned: startDay + 9, status: 'planned' },
    { id: 'phg_close_call', title: 'Close Call', dayPlanned: startDay + 13, status: 'planned' },
    { id: 'phg_mars_televised_checkin', title: 'Televised Check-In: Mars Vega', dayPlanned: startDay + 15, status: 'planned' },
    { id: 'phg_double_down', title: 'Double-Down Mission', dayPlanned: startDay + 17, status: 'planned' },
    { id: 'phg_exposure_test', title: 'Exposure Test', dayPlanned: startDay + 21, status: 'planned' },
    { id: 'phg_endgame_leverage', title: 'Endgame Leverage', dayPlanned: startDay + 26, status: 'planned' },
  ];
}

export function initializeTwistNarrative(gs: GameState): TwistNarrative | undefined {
  const player = getPlayer(gs);
  if (!player || !player.special || player.special.kind === 'none') return { arc: 'none', beats: [] };

  if (player.special.kind === 'hosts_estranged_child') {
    return {
      arc: 'hosts_child',
      beats: buildHostChildBeats(gs.currentDay),
      confessionalThemes: ['family', 'reputation', 'trust', 'edit_bias'],
    };
  }

  if (player.special.kind === 'planted_houseguest') {
    return {
      arc: 'planted_houseguest',
      beats: buildPlantedHGBeats(gs.currentDay),
      confessionalThemes: ['mission', 'cover_story', 'pressure', 'secret'],
    };
  }

  return { arc: 'none', beats: [] };
}

export function applyDailyNarrative(gs: GameState): GameState {
  const player = getPlayer(gs);
  const arc = gs.twistNarrative || initializeTwistNarrative(gs);
  if (!player || !arc) return gs;

  const beats = arc.beats.map(b => {
    if (b.status === 'completed') return b;
    if (gs.currentDay >= b.dayPlanned && b.status === 'planned') {
      return { ...b, status: 'active' as const };
    }
    return b;
  });

  // Host child reveal sync
  if (player.special && player.special.kind === 'hosts_estranged_child') {
    const revealed = !!player.special.revealed;
    const revealBeatIdx = beats.findIndex(b => b.id === 'hc_reveal');
    if (revealBeatIdx >= 0) {
      const revealBeat = beats[revealBeatIdx];
      if (revealed && revealBeat.status !== 'completed') {
        beats[revealBeatIdx] = { ...revealBeat, status: 'completed' as const, summary: `Revealed on Day ${gs.currentDay}` };
        const consequenceIdx = beats.findIndex(b => b.id === 'hc_consequence');
        if (consequenceIdx >= 0 && beats[consequenceIdx].status === 'planned') {
          beats[consequenceIdx] = { ...beats[consequenceIdx], status: 'active' as const };
        }
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
      const exposureIdx = beats.findIndex(b => b.id === 'phg_exposure_test');
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
  const arc = gs.twistNarrative;
  if (!player || !player.special || !arc || arc.arc === 'none') return [];

  const prompts: ConfPrompt[] = [];
  const isHostChild = player.special.kind === 'hosts_estranged_child';
  const isPlanted = player.special.kind === 'planted_houseguest';

  if (isHostChild && player.special.kind === 'hosts_estranged_child') {
    const revealed = !!player.special.revealed;
    if (!revealed) {
      prompts.push({
        id: 'hc_keep_secret',
        category: 'reflection',
        prompt: 'There’s a part of your story viewers don’t know yet. How do you keep the focus on the game?',
        followUp: 'What steps are you taking so rumors don’t define your edit?',
        suggestedTones: ['strategic', 'vulnerable'],
        editPotential: 7,
      });
    } else {
      prompts.push(
        {
          id: 'hc_reveal_fallout',
          category: 'social',
          prompt: 'The house knows your connection now. How are you rebuilding trust?',
          followUp: 'Who needs to hear your side first, and why?',
          suggestedTones: ['vulnerable', 'strategic'],
          editPotential: 9,
        },
        {
          id: 'hc_edit_bias',
          category: 'general',
          prompt: 'Do you feel the edit is favoring or punishing you since the reveal?',
          followUp: 'What confessionals will shift perception back to your gameplay?',
          suggestedTones: ['humorous', 'strategic'],
          editPotential: 6,
        }
      );
    }
  }

  if (isPlanted && player.special.kind === 'planted_houseguest') {
    const spec = player.special;
    const pending = (spec.tasks || []).filter(t => !t.completed).slice(0, 2);
    if (pending.length > 0) {
      prompts.push({
        id: 'phg_mission_update',
        category: 'strategy',
        prompt: `You have a mission this week: "${pending[0].description}". What’s your path to pull it off without raising suspicion?`,
        followUp: 'Whose buy-in do you need to make it believable?',
        suggestedTones: ['strategic', 'dramatic'],
        editPotential: 8,
      });
    }
    if (player.special.kind === 'planted_houseguest' && spec.secretRevealed) {
      prompts.push({
        id: 'phg_damage_control',
        category: 'social',
        prompt: 'Your secret slipped. How do you turn that into leverage instead of a target?',
        followUp: 'What new narrative are you pitching to the house?',
        suggestedTones: ['strategic', 'aggressive'],
        editPotential: 9,
      });
    } else {
      prompts.push({
        id: 'phg_cover_story',
        category: 'reflection',
        prompt: 'What cover story keeps your moves aligned without exposing the mission?',
        followUp: 'What’s one line you’ll repeat to stay consistent?',
        suggestedTones: ['strategic', 'humorous'],
        editPotential: 6,
      });
    }
  }

  // Late-game wrap prompt to close the arc cleanly
  prompts.push({
    id: 'arc_closer',
    category: 'reflection',
    prompt: 'Looking back, what defined your season’s story—your choices or how they were shown?',
    followUp: 'What moment should be remembered as the truth behind your edit?',
    suggestedTones: ['vulnerable', 'strategic'],
    editPotential: 7,
  });

  return prompts;
}
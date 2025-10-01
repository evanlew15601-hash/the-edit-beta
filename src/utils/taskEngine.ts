import { GameState, ProductionTaskObjective } from '@/types/game';

export type ProductionTask = {
  id: string;
  description: string;
  dayAssigned: number;
  week: number;
  difficulty: 'easy' | 'medium' | 'hard';
  objective: ProductionTaskObjective;
  target: number;
  progress?: number;
  completed?: boolean;
  reward?: number;
  rewarded?: boolean;
};

export function getCurrentWeek(day: number): number {
  return Math.max(1, Math.floor((day - 1) / 7) + 1);
}

export function getWeekBounds(week: number): { start: number; end: number } {
  return { start: (week - 1) * 7 + 1, end: week * 7 };
}

function distinctOthers(entries: { participants?: string[] }[], playerName: string): number {
  const set = new Set<string>();
  entries.forEach(e => {
    (e.participants || []).forEach(p => {
      if (p && p !== playerName) set.add(p);
    });
  });
  return set.size;
}

export function computeObjectiveProgress(gs: GameState, objective: ProductionTaskObjective, week: number): number {
  const { start, end } = getWeekBounds(week);
  const logs = (gs.interactionLog || []).filter(l => l.day >= start && l.day <= end);
  switch (objective.kind) {
    case 'talk_count': {
      const talks = logs.filter(l => l.type === 'talk' && l.source === 'player');
      if (objective.distinct) return distinctOthers(talks, gs.playerName);
      return talks.length;
    }
    case 'dm_count': {
      const dms = logs.filter(l => l.type === 'dm' && l.source === 'player');
      return dms.length;
    }
    case 'scheme_pitch': {
      const schemes = logs.filter(l => l.type === 'scheme' && l.source === 'player');
      return schemes.length;
    }
    case 'alliance_meeting': {
      const meets = logs.filter(l => l.type === 'alliance_meeting' && l.source === 'player');
      return meets.length;
    }
    case 'confessional_count': {
      const confs = (gs.confessionals || []).filter(c => c.day >= start && c.day <= end && c.selected !== false);
      return confs.length;
    }
    case 'observation_count': {
      const obs = logs.filter(l => l.type === 'observe' && l.source === 'player');
      return obs.length;
    }
    case 'house_meeting': {
      const hm = logs.filter(l => l.type === 'house_meeting' && l.source === 'player');
      return hm.length;
    }
    case 'immunity_win': {
      // Requires tracking of day for immunity wins; fallback: if immunityWinner is player during this week via ratingsHistory reason
      const wins = (gs.ratingsHistory || []).filter(r => r.day >= start && r.day <= end && (gs.immunityWinner === gs.playerName || (r.reason || '').toLowerCase().includes('immunity'))).length;
      return wins > 0 ? 1 : 0;
    }
    default:
      return 0;
  }
}

export function describeObjective(obj: ProductionTaskObjective): string {
  switch (obj.kind) {
    case 'talk_count':
      return `Hold ${obj.distinct ? `${obj.count} distinct` : obj.count} conversations`;
    case 'dm_count':
      return `Send ${obj.count} private DM${obj.count > 1 ? 's' : ''}`;
    case 'scheme_pitch':
      return `Pitch ${obj.count} scheme${obj.count > 1 ? 's' : ''}`;
    case 'alliance_meeting':
      return `Run ${obj.count} alliance meeting${obj.count > 1 ? 's' : ''}`;
    case 'confessional_count':
      return `Record ${obj.count} confessional${obj.count > 1 ? 's' : ''}`;
    case 'observation_count':
      return `Make ${obj.count} observation${obj.count > 1 ? 's' : ''}`;
    case 'house_meeting':
      return `Call ${obj.count} house meeting${obj.count > 1 ? 's' : ''}`;
    case 'immunity_win':
      return `Win ${obj.count} immunity`;
    default:
      return 'Complete task';
  }
}

export function createWeeklyTask(gs: GameState, week: number): ProductionTask {
  // Vary difficulty and objective by week
  let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
  let objective: ProductionTaskObjective = { kind: 'talk_count', count: 3, distinct: true };

  if (week <= 2) {
    difficulty = 'easy';
    objective = week % 2 === 0 ? { kind: 'dm_count', count: 3 } : { kind: 'talk_count', count: 4, distinct: true };
  } else if (week <= 4) {
    difficulty = 'medium';
    objective = week % 2 === 0 ? { kind: 'alliance_meeting', count: 1 } : { kind: 'scheme_pitch', count: 1 };
  } else if (week <= 6) {
    difficulty = 'medium';
    objective = week % 2 === 0 ? { kind: 'confessional_count', count: 2 } : { kind: 'observation_count', count: 2 };
  } else {
    difficulty = 'hard';
    objective = { kind: 'house_meeting', count: 1 };
  }

  const description = `${describeObjective(objective)} this week without raising suspicion.`;
  return {
    id: `w${week}_mission`,
    description,
    dayAssigned: gs.currentDay,
    week,
    difficulty,
    objective,
    target: 'count' in objective ? objective.count : 1,
    reward: 1000,
    completed: false,
    rewarded: false,
  };
}

export function verifyAndUpdateTasks(gs: GameState): GameState {
  const player = gs.contestants.find(c => c.name === gs.playerName);
  if (!player || !player.special || player.special.kind !== 'planted_houseguest') return gs;

  const week = getCurrentWeek(gs.currentDay);
  const tasks = (player.special.tasks || []).map(t => ({ ...t }));

  let funds = gs.playerFunds ?? 0;

  for (const t of tasks) {
    const taskWeek = t.week ?? week;
    const progress = computeObjectiveProgress(gs, t.objective, taskWeek);
    t.progress = progress;
    t.target = t.target ?? ('count' in t.objective ? t.objective.count : 1);
    if (!t.completed && progress >= (t.target || 0)) {
      t.completed = true;
    }
    if (t.completed && !t.rewarded) {
      funds += (t.reward ?? 1000);
      t.rewarded = true;
    }
  }

  // Persist tasks back into player.special
  const updatedContestants = gs.contestants.map(c => {
    if (c.name !== gs.playerName) return c;
    return {
      ...c,
      special: { ...player.special, tasks },
    };
  });

  return {
    ...gs,
    contestants: updatedContestants,
    playerFunds: funds,
  };
}
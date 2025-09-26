import { GameState, Contestant } from '@/types/game';

// Lightweight helpers to handle special backgrounds effects.
// These functions are deterministic per call and should be invoked by the game loop once per day or at key events.

function findContestant(gs: GameState, name: string): Contestant | undefined {
  return gs.contestants.find(c => c.name === name);
}

export function applyDailySpecialBackgroundLogic(gs: GameState): GameState {
  const next = { ...gs, contestants: gs.contestants.map(c => ({ ...c })) };

  next.contestants.forEach(c => {
    if (!c.special || c.special.kind === 'none') return;

    if (c.special.kind === 'hosts_estranged_child') {
      // If revealed, slight persistent edit bias, mixed trust changes
      if (c.special.revealed) {
        c.psychProfile.editBias = Math.min(50, c.psychProfile.editBias + 2);
        // Strategic players may distrust a bit; empathetic may increase closeness.
        c.psychProfile.trustLevel = Math.max(-100, c.psychProfile.trustLevel - 1);
        if (!c.special.revealDay) {
          c.special.revealDay = gs.currentDay;
          next.hostChildName = c.name;
          next.hostChildRevealDay = gs.currentDay;
        }
      }
    }

    if (c.special.kind === 'planted_houseguest') {
      // If any overdue incomplete task from 2+ days ago, chance to auto-reveal
      const overdue = c.special.tasks.filter(t => !t.completed && t.dayAssigned <= (gs.currentDay - 2));
      if (overdue.length >= 2 && !c.special.secretRevealed) {
        c.special.secretRevealed = true;
        c.special.revealDay = gs.currentDay;
        // On reveal, suspicion spikes for some in the house
        c.psychProfile.suspicionLevel = Math.min(100, c.psychProfile.suspicionLevel + 15);
        // Centralize in production log for recaps
        next.productionTaskLog = next.productionTaskLog || {};
        next.productionTaskLog[c.name] = [...(next.productionTaskLog[c.name] || []), ...overdue];
      }
    }
  });

  return next;
}

// Call when the player completes or fails a production task.
export function setProductionTaskStatus(gs: GameState, contestantName: string, taskId: string, completed: boolean): GameState {
  const next = { ...gs, contestants: gs.contestants.map(c => ({ ...c })) };
  const c = next.contestants.find(x => x.name === contestantName);
  if (!c?.special || c.special.kind !== 'planted_houseguest') return next;

  const task = c.special.tasks.find(t => t.id === taskId);
  if (task) task.completed = completed;

  // Reward success with slight editBias and influence (modeled via trust)
  if (completed) {
    c.psychProfile.editBias = Math.min(50, c.psychProfile.editBias + 3);
    c.psychProfile.trustLevel = Math.min(100, c.psychProfile.trustLevel + 2);
  } else {
    c.psychProfile.suspicionLevel = Math.min(100, c.psychProfile.suspicionLevel + 4);
  }

  next.productionTaskLog = next.productionTaskLog || {};
  next.productionTaskLog[contestantName] = next.productionTaskLog[contestantName] || [];
  const existing = next.productionTaskLog[contestantName].find(t => t.id === taskId);
  if (!existing && task) {
    next.productionTaskLog[contestantName].push({ ...task });
  }

  return next;
}

// Helper to reveal host child twist intentionally (e.g., via event)
export function revealHostChild(gs: GameState, contestantName: string): GameState {
  const next = { ...gs, contestants: gs.contestants.map(c => ({ ...c })) };
  const c = next.contestants.find(x => x.name === contestantName);
  if (c?.special && c.special.kind === 'hosts_estranged_child') {
    c.special.revealed = true;
    c.special.revealDay = gs.currentDay;
    next.hostChildName = c.name;
    next.hostChildRevealDay = gs.currentDay;
    // Mixed reaction buff/nerf
    c.psychProfile.trustLevel = Math.max(-100, c.psychProfile.trustLevel - 5);
    c.psychProfile.editBias = Math.min(50, c.psychProfile.editBias + 10);
  }
  return next;
}
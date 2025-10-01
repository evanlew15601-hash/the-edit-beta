import { GameState, Contestant } from '@/types/game';
import { verifyAndUpdateTasks } from './taskEngine';

// Lightweight helpers to handle special backgrounds effects.
// These functions are deterministic per call and should be invoked by the game loop once per day or at key events.

function findContestant(gs: GameState, name: string): Contestant | undefined {
  return gs.contestants.find(c => c.name === name);
}

// Strip any special backgrounds from NPCs (non-player) to enforce rules.
function sanitizeNPCSpecials(gs: GameState): GameState {
  const next = { ...gs, contestants: gs.contestants.map(c => ({ ...c })) };
  next.contestants.forEach(c => {
    if (c.name !== gs.playerName && c.special && c.special.kind !== 'none') {
      c.special = { kind: 'none' };
      if (next.hostChildName === c.name) {
        next.hostChildName = undefined;
        next.hostChildRevealDay = undefined;
      }
      if (next.productionTaskLog && next.productionTaskLog[c.name]) {
        delete next.productionTaskLog[c.name];
      }
    }
  });
  return next;
}

export function applyDailySpecialBackgroundLogic(gs: GameState): GameState {
  let next = sanitizeNPCSpecials(gs);

  next.contestants.forEach(c => {
    if (c.name !== next.playerName) return;
    if (!c.special || c.special.kind === 'none') return;

    if (c.special.kind === 'hosts_estranged_child') {
      if (c.special.revealed) {
        c.psychProfile.editBias = Math.min(50, c.psychProfile.editBias + 2);
        c.psychProfile.trustLevel = Math.max(-100, c.psychProfile.trustLevel - 1);
        if (!c.special.revealDay) {
          c.special.revealDay = next.currentDay;
          next.hostChildName = c.name;
          next.hostChildRevealDay = next.currentDay;
        }
      }
    }

    if (c.special.kind === 'planted_houseguest') {
      const overdue = c.special.tasks.filter(t => !t.completed && t.dayAssigned <= (next.currentDay - 2));
      if (overdue.length >= 2 && !c.special.secretRevealed) {
        c.special.secretRevealed = true;
        c.special.revealDay = next.currentDay;
        c.psychProfile.suspicionLevel = Math.min(100, c.psychProfile.suspicionLevel + 15);
        next.productionTaskLog = next.productionTaskLog || {};
        next.productionTaskLog[c.name] = [...(next.productionTaskLog[c.name] || []), ...overdue];
      }
    }
  });

  // Verify and award production task progress (safe to call daily; rewards gated by 'rewarded' flag)
  next = verifyAndUpdateTasks(next);

  return next;
}

// Call when the player completes or fails a production task.
export function setProductionTaskStatus(gs: GameState, contestantName: string, taskId: string, completed: boolean): GameState {
  let next = sanitizeNPCSpecials(gs);
  if (contestantName !== next.playerName) return next;

  const c = next.contestants.find(x => x.name === contestantName);
  if (!c?.special || c.special.kind !== 'planted_houseguest') return next;

  const task = c.special.tasks.find(t => t.id === taskId);
  if (task) task.completed = completed;

  if (completed) {
    c.psychProfile.editBias = Math.min(50, c.psychProfile.editBias + 3);
    c.psychProfile.trustLevel = Math.min(100, c.psychProfile.trustLevel + 2);
    if (!task?.rewarded) {
      next.playerFunds = (next.playerFunds ?? 0) + (task?.reward ?? 1000);
      if (task) task.rewarded = true;
    }
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
  let next = sanitizeNPCSpecials(gs);
  if (contestantName !== next.playerName) return next;

  const c = next.contestants.find(x => x.name === contestantName);
  if (c?.special && c.special.kind === 'hosts_estranged_child') {
    c.special.revealed = true;
    c.special.revealDay = next.currentDay;
    next.hostChildName = c.name;
    next.hostChildRevealDay = next.currentDay;
    c.psychProfile.trustLevel = Math.max(-100, c.psychProfile.trustLevel - 5);
    c.psychProfile.editBias = Math.min(50, c.psychProfile.editBias + 10);
  }
  return next;
}
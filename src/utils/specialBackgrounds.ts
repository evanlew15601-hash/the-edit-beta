import { GameState, Contestant } from '@/types/game';

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

  return next;
}

// Finalize planted HG contract (after contractWeeks)
// If reveal=true: set secretRevealed and apply consequences/benefits.
// If reveal=false: mark contract ended, keep secret, slight suspicion relief.
export function finalizePlantedContract(gs: GameState, reveal: boolean): GameState {
  let next = sanitizeNPCSpecials(gs);
  const c = next.contestants.find(x => x.name === next.playerName);
  if (!c?.special || c.special.kind !== 'planted_houseguest') return next;

  const spec = c.special;
  const week = Math.floor((next.currentDay - 1) / 7) + 1;
  const contractWeeks = spec.contractWeeks ?? 6;

  const updatedSpec = {
    ...spec,
    contractWeeks,
    contractEndWeek: spec.contractEndWeek ?? contractWeeks,
    contractEnded: true,
    contractEndNotified: true,
    secretRevealed: reveal ? true : spec.secretRevealed,
    revealDay: reveal ? next.currentDay : spec.revealDay,
  } as typeof spec;

  c.special = updatedSpec;

  if (reveal) {
    // Consequences: spike suspicion among strategic players; benefits: edit bias boost and audience approval
    c.psychProfile.suspicionLevel = Math.min(100, c.psychProfile.suspicionLevel + 10);
    c.psychProfile.trustLevel = Math.max(-100, c.psychProfile.trustLevel - 5);
    c.psychProfile.editBias = Math.min(50, c.psychProfile.editBias + 10);

    next.editPerception = {
      ...next.editPerception,
      screenTimeIndex: Math.min(100, (next.editPerception.screenTimeIndex || 0) + 6),
      audienceApproval: Math.max(-100, (next.editPerception.audienceApproval || 0) + 5),
      lastEditShift: 6,
    };

    next.twistsActivated = Array.from(new Set([...(next.twistsActivated || []), 'planted_reveal']));
  } else {
    // Keep secret: small suspicion relief and stability
    c.psychProfile.suspicionLevel = Math.max(0, c.psychProfile.suspicionLevel - 5);
    next.editPerception = {
      ...next.editPerception,
      lastEditShift: Math.max(-50, Math.min(50, (next.editPerception.lastEditShift || 0) - 1)),
    };
    next.twistsActivated = Array.from(new Set([...(next.twistsActivated || []), 'planted_contract_closed']));
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
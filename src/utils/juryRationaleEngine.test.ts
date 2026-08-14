import { describe, it, expect } from 'vitest';
import { buildJuryRationale, buildPlayerJuryRationale, pickJuryReason } from './juryRationaleEngine';
import { GameState, Contestant } from '@/types/game';

const juror = {
  id: 'j1',
  name: 'Mara',
  publicPersona: 'The Skeptic',
  psychProfile: { disposition: ['loyal'], suspicionLevel: 20, trustLevel: 50 },
  memory: [],
} as unknown as Contestant;

const gameState = {
  playerName: 'You',
  currentDay: 30,
  alliances: [],
  contestants: [juror],
  juryMembers: ['Mara'],
} as unknown as GameState;

describe('juryRationaleEngine', () => {
  it('is deterministic for the same state', () => {
    const a = buildJuryRationale(juror, 'Devon', gameState);
    const b = buildJuryRationale(juror, 'Devon', gameState);
    expect(a).toBe(b);
  });

  it('never leaves unfilled tokens and speaks in first person', () => {
    const line = buildJuryRationale(juror, 'Devon', gameState, { strategy: 12 });
    expect(line).not.toMatch(/\{\w+\}/);
    expect(line).toContain('Devon');
    expect(line.length).toBeGreaterThan(20);
  });

  it('reads betrayal as bitter respect when emotion is negative', () => {
    const key = pickJuryReason(juror, 'Devon', gameState, { betrayalPenalty: -22, emotion: -12 });
    expect(key).toBe('bitter_betrayed');
  });

  it('credits a compelling finale speech', () => {
    const key = pickJuryReason(juror, 'You', gameState, { speechTier: 'compelling' });
    expect(key).toBe('speech_won_me');
  });

  it('honors a shared alliance with no betrayal', () => {
    const gs = { ...gameState, alliances: [{ id: 'a', members: ['Mara', 'Devon'] }] } as unknown as GameState;
    expect(pickJuryReason(juror, 'Devon', gs)).toBe('loyal_alliance');
  });

  it('phrases the player vote in the player voice', () => {
    const line = buildPlayerJuryRationale('Devon', gameState);
    expect(line).toMatch(/^I /);
    expect(line).toContain('Devon');
  });
});

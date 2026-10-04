import { describe, expect, it } from 'vitest';
import { readBlocs, readCycle, readThreats, recommendedMove } from './villaStrategy';
import type { GameState } from '@/types/game';

const base = {
  currentDay: 2,
  nextEliminationDay: 5,
  playerName: 'Alex',
  immunityWinner: undefined,
  contestants: [
    { id: '1', name: 'Alex', publicPersona: 'The Strategist', isEliminated: false, memory: [], psychProfile: { disposition: [], trustLevel: 0, suspicionLevel: 10, emotionalCloseness: 0, editBias: 0 }, stats: { social: 60, strategy: 80, physical: 40, deception: 55 } },
    { id: '2', name: 'Blair', publicPersona: 'The Athlete', isEliminated: false, memory: [], psychProfile: { disposition: [], trustLevel: 10, suspicionLevel: 20, emotionalCloseness: 70, editBias: 0 }, stats: { social: 40, strategy: 45, physical: 90, deception: 30 } },
    { id: '3', name: 'Casey', publicPersona: 'The Floater', isEliminated: false, memory: [], psychProfile: { disposition: [], trustLevel: 0, suspicionLevel: 5, emotionalCloseness: 20, editBias: 0 }, stats: { social: 50, strategy: 40, physical: 40, deception: 40 } },
  ],
  alliances: [
    { id: 'a1', name: 'The Quiet Three', members: ['Alex', 'Casey', 'Blair'], strength: 62, secret: true, formed: 1, lastActivity: 2 },
  ],
} as unknown as GameState;

describe('villaStrategy', () => {
  it('reads the pre-challenge villa beat when the vote is still days out', () => {
    const cycle = readCycle(base);
    expect(cycle.beat).toBe('villa');
    expect(cycle.daysToVote).toBe(3);
  });

  it('flags a majority bloc and an immune winner', () => {
    const blocs = readBlocs(base);
    expect(blocs[0].yours).toBe(true);
    expect(blocs[0].note).toMatch(/Majority/);
    const threats = readThreats({ ...base, immunityWinner: 'Blair' });
    expect(threats.find(t => t.name === 'Blair')?.immune).toBe(true);
  });

  it('tells a majority to stop shopping the vote on nomination day', () => {
    const cycle = readCycle({ ...base, currentDay: 4, nextEliminationDay: 5, immunityWinner: 'Casey' });
    const line = recommendedMove(base, cycle, readBlocs(base), readThreats(base));
    expect(line).toMatch(/numbers/);
  });
});

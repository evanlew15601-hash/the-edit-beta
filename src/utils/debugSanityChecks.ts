import { GameState } from '@/types/game';
import { relationshipGraphEngine } from '@/utils/relationshipGraphEngine';
import { memoryEngine } from '@/utils/memoryEngine';
import { processVoting } from '@/utils/votingEngine';

/**
 * Lightweight debug helpers for sanity-checking emergent systems.
 * These are not wired into gameplay; call them manually from the console
 * (e.g. via a dev-only window hook) when you want to inspect behavior.
 */

export function debugRelationshipDecaySanityCheck(): void {
  const contestants = [
    { id: 'A', name: 'Alice' } as any,
    { id: 'B', name: 'Bob' } as any,
  ];

  relationshipGraphEngine.initializeRelationships(contestants as any);

  // Push Alice -> Bob to a very strong positive relationship so decay has something to work on.
  relationshipGraphEngine.updateRelationship(
    'Alice',
    'Bob',
    50,
    0,
    30,
    'conversation',
    '[debug] Seed strong bond for decay test',
    1
  );

  console.log(
    '[DebugRelationshipDecay] Initial',
    relationshipGraphEngine.getRelationship('Alice', 'Bob')
  );

  [5, 10, 15, 20].forEach((day) => {
    relationshipGraphEngine.decayRelationships(day);
    console.log(
      `[DebugRelationshipDecay] Day ${day}`,
      relationshipGraphEngine.getRelationship('Alice', 'Bob')
    );
  });
}

export function debugAllianceMeetingVotingPlanScenario(): void {
  const contestants = [
    { id: 'P', name: 'Player' } as any,
    { id: 'X', name: 'AllyOne' } as any,
    { id: 'Y', name: 'AllyTwo' } as any,
  ];

  memoryEngine.resetMemory();
  memoryEngine.initializeJournals(contestants as any);

  const target = 'TargetHouseguest';

  ['AllyOne', 'AllyTwo'].forEach((name) => {
    memoryEngine.updateVotingPlan(
      name,
      target,
      'Alliance meeting plan coordinated by Player (debug)'
    );
  });

  console.log('[DebugAlliancePlans] Voting plans', {
    AllyOne: memoryEngine.getVotingPlan('AllyOne'),
    AllyTwo: memoryEngine.getVotingPlan('AllyTwo'),
  });
}

export function debugNPCVoteSelectionWithBetrayal(): void {
  const contestants = [
    {
      id: 'P',
      name: 'Player',
      isEliminated: false,
      psychProfile: {
        trustLevel: 50,
        suspicionLevel: 20,
        emotionalCloseness: 40,
        disposition: 'balanced',
        editBias: 0,
      },
      memory: [],
    } as any,
    {
      id: 'V',
      name: 'Voter',
      isEliminated: false,
      psychProfile: {
        trustLevel: 50,
        suspicionLevel: 40,
        emotionalCloseness: 40,
        disposition: 'strategic',
        editBias: 0,
      },
      memory: [],
    } as any,
    {
      id: 'B',
      name: 'Betrayer',
      isEliminated: false,
      psychProfile: {
        trustLevel: 55,
        suspicionLevel: 45,
        emotionalCloseness: 30,
        disposition: 'competitive',
        editBias: 0,
      },
      memory: [],
    } as any,
    {
      id: 'I',
      name: 'Innocent',
      isEliminated: false,
      psychProfile: {
        trustLevel: 55,
        suspicionLevel: 25,
        emotionalCloseness: 35,
        disposition: 'social',
        editBias: 0,
      },
      memory: [],
    } as any,
  ];

  memoryEngine.resetMemory();
  memoryEngine.initializeJournals(contestants as any);
  relationshipGraphEngine.initializeRelationships(contestants as any);

  const gameState = {
    currentDay: 15,
    playerName: 'Player',
    contestants,
    alliances: [],
    votingHistory: [],
    debugMode: true,
  } as any as GameState;

  // Record a betrayal event in the global memory system between Voter and Betrayer.
  memoryEngine.recordEvent({
    day: 14,
    type: 'betrayal',
    participants: ['Voter', 'Betrayer'],
    content: 'Betrayer flipped vote against Voter in a critical round',
    emotionalImpact: -8,
    reliability: 'confirmed',
    strategicImportance: 9,
  });

  // Also give Voter a direct negative memory about Betrayer to influence relationship-based modifiers.
  const voter = contestants.find((c: any) => c.name === 'Voter')!;
  voter.memory.push({
    day: 14,
    type: 'conversation',
    participants: ['Voter', 'Betrayer'],
    content: 'Voter confronted Betrayer about flipping vote',
    emotionalImpact: -7,
    timestamp: Date.now(),
  });

  const record = processVoting(contestants as any, 'Player', [], gameState);

  console.log('[DebugNPCVoteWithBetrayal] Votes', record.votes);
  console.log('[DebugNPCVoteWithBetrayal] Debug payload', record.debug);
}
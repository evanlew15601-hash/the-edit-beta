import { GameState, Contestant } from '@/types/game';

export interface EmergentEvent {
  id: string;
  type: 'drama' | 'alliance_betrayal' | 'npc_check_in' | 'production_intervention';
  title: string;
  description: string;
  involvedContestants: string[];
  requiresPlayerAction: boolean;
  impact: {
    immediate: string;
    longTerm: string;
  };
}


export class EmergentEventInterruptor {
  static checkForEventInterruption(gameState: GameState): EmergentEvent | null {
    // 35% chance of emergent event interrupting a day skip
    if (Math.random() > 0.35) return null;

    const activeContestants = gameState.contestants.filter(c => !c.isEliminated);
    const possibleEvents = this.generatePossibleEvents(gameState, activeContestants);
    
    if (possibleEvents.length === 0) return null;
    
    return possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
  }

  private static generatePossibleEvents(gameState: GameState, contestants: Contestant[]): EmergentEvent[] {
    const events: EmergentEvent[] = [];

    // Drama events
    if (contestants.length >= 3) {
      const targetA = contestants[0];
      const targetB = contestants[1];
      const targetC = contestants[2];

      events.push({
        id: 'heated_argument',
        type: 'drama',
        title: 'Explosive Confrontation',
        description: `${targetA.name} and ${targetB.name} are having a heated argument in the common room. ${targetC.name} is trying to mediate, but tensions are escalating. Your involvement could change everything.`,
        involvedContestants: [targetA.name, targetB.name, targetC.name],
        requiresPlayerAction: true,
        impact: {
          immediate: 'Relationships shift dramatically based on your intervention',
          longTerm: 'Your choice here will be remembered and could affect future alliances'
        }
      });
    }

    // Alliance betrayal events
    if (gameState.alliances.length > 0) {
      const alliance = gameState.alliances[0];
      const betrayer = contestants.find(c => alliance.members.includes(c.name));
      
      if (betrayer && alliance.members.length >= 2) {
        events.push({
          id: 'alliance_betrayal',
          type: 'alliance_betrayal',
          title: 'Alliance in Crisis',
          description: `Your alliance with ${alliance.members.filter(m => m !== gameState.playerName).join(' and ')} is falling apart. ${betrayer.name} is secretly meeting with others, planning to break your trust. You need to act fast.`,
          involvedContestants: alliance.members,
          requiresPlayerAction: true,
          impact: {
            immediate: 'Alliance stability hangs in the balance',
            longTerm: 'This could reshape the entire game dynamic'
          }
        });
      }
    }

    // NPC check-in events (simple pull-aside conversation)
    if (Math.random() < 0.5 && contestants.length > 0) {
      const confidant = contestants[Math.floor(Math.random() * contestants.length)];
      events.push({
        id: `npc_check_in_${confidant.name}`,
        type: 'npc_check_in',
        title: 'Pulled Aside',
        description: `${confidant.name} catches you in the hallway for a quick check-in. They want to feel you out without making a scene.`,
        involvedContestants: [confidant.name],
        requiresPlayerAction: true,
        impact: {
          immediate: 'Your tone will affect trust and closeness with them',
          longTerm: 'Sets the tone for future one-on-one conversations'
        }
      });
    }

    // High-tension elimination events
    if (gameState.currentDay >= gameState.nextEliminationDay - 2) {
      const suspectedTarget = contestants.find(c => c.psychProfile.suspicionLevel > 60);
      
      if (suspectedTarget) {
        events.push({
          id: 'pre_elimination_panic',
          type: 'drama',
          title: 'Pre-Elimination Scramble',
          description: `With elimination approaching, ${suspectedTarget.name} is desperately trying to save themselves. They're making deals, revealing secrets, and causing chaos. Everyone is being forced to pick sides.`,
          involvedContestants: [suspectedTarget.name, ...contestants.slice(0, 2).map(c => c.name)],
          requiresPlayerAction: true,
          impact: {
            immediate: 'Voting intentions shift rapidly',
            longTerm: 'Pre-elimination moves often determine the winner'
          }
        });
      }
    }

    return events;
  }

  static applyEventInterruption(event: EmergentEvent, gameState: GameState, choice: 'pacifist' | 'headfirst'): GameState {
    const favorName = event.involvedContestants[0] || '';

    const updatedContestants = gameState.contestants.map(contestant => {
      const isInvolved = event.involvedContestants.includes(contestant.name);
      const baseMemory = {
        day: gameState.currentDay,
        type: 'event' as const,
        participants: event.involvedContestants,
        content: `Emergent Event: ${event.title} (${choice}) - ${event.description}`,
        emotionalImpact: 0,
        timestamp: gameState.currentDay * 1000 + Math.random() * 1000
      };

      if (!isInvolved) return contestant;

      let trustDelta = 0;
      let suspicionDelta = 0;
      let closenessDelta = 0;

      switch (event.type) {
        case 'drama':
        case 'alliance_betrayal': {
          if (choice === 'pacifist') {
            trustDelta += 3;
            suspicionDelta -= 4;
            baseMemory.emotionalImpact = 2;
          } else {
            const favored = contestant.name === favorName;
            trustDelta += favored ? 5 : -2;
            suspicionDelta += favored ? -2 : 7;
            baseMemory.emotionalImpact = favored ? 3 : -3;
          }
          break;
        }
        case 'npc_check_in': {
          if (choice === 'pacifist') {
            closenessDelta += 3;
            trustDelta += 1;
            baseMemory.emotionalImpact = 1;
          } else {
            closenessDelta += 8;
            trustDelta += 4;
            suspicionDelta -= 2;
            baseMemory.emotionalImpact = 4;
          }
          break;
        }
        case 'production_intervention': {
          // Keep neutral, no twist language; light tension regardless of choice
          suspicionDelta += choice === 'headfirst' ? 3 : 1;
          baseMemory.emotionalImpact = -1;
          break;
        }
      }

      return {
        ...contestant,
        psychProfile: {
          ...contestant.psychProfile,
          trustLevel: Math.max(-100, Math.min(100, contestant.psychProfile.trustLevel + trustDelta)),
          suspicionLevel: Math.max(0, Math.min(100, contestant.psychProfile.suspicionLevel + suspicionDelta)),
          emotionalCloseness: Math.max(0, Math.min(100, contestant.psychProfile.emotionalCloseness + closenessDelta))
        },
        memory: [...contestant.memory, baseMemory]
      };
    });

    return {
      ...gameState,
      contestants: updatedContestants,
      lastEmergentEvent: event
    };
  }
}
import { GameState, Contestant } from '@/types/game';

export interface EmergentEvent {
  id: string;
  type: 'drama' | 'alliance_betrayal' | 'elimination_twist' | 'production_intervention';
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
    // 20% chance of emergent event interrupting a day skip
    if (Math.random() > 0.2) return null;

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

    // Production twist events
    if (gameState.currentDay > 5) {
      events.push({
        id: 'surprise_twist',
        type: 'production_intervention',
        title: 'Unexpected Twist',
        description: 'Production calls everyone to the living room for an emergency announcement. A new twist is being introduced that will change the game forever. You can\'t avoid being part of this moment.',
        involvedContestants: contestants.map(c => c.name),
        requiresPlayerAction: true,
        impact: {
          immediate: 'Game rules change dramatically',
          longTerm: 'New strategic considerations emerge'
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

  static applyEventInterruption(event: EmergentEvent, gameState: GameState): GameState {
    // Apply immediate effects of the emergent event
    const updatedContestants = gameState.contestants.map(contestant => {
      if (event.involvedContestants.includes(contestant.name)) {
        // Add event to contestant memory
        const eventMemory = {
          day: gameState.currentDay,
          type: 'event' as const,
          participants: event.involvedContestants,
          content: `Emergent Event: ${event.title} - ${event.description}`,
          emotionalImpact: event.type === 'drama' ? -3 : event.type === 'alliance_betrayal' ? -5 : 2,
          timestamp: gameState.currentDay * 1000 + Math.random() * 1000
        };

        return {
          ...contestant,
          memory: [...contestant.memory, eventMemory],
          psychProfile: {
            ...contestant.psychProfile,
            // Emergent events increase tension and suspicion
            suspicionLevel: Math.min(100, contestant.psychProfile.suspicionLevel + 
              (event.type === 'alliance_betrayal' ? 15 : event.type === 'drama' ? 10 : 5))
          }
        };
      }
      return contestant;
    });

    return {
      ...gameState,
      contestants: updatedContestants,
      lastEmergentEvent: event // Store for UI display
    };
  }
}
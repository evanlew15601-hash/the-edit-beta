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
        description: `${targetA.name} and ${targetB.name} are in a loud argument in the common room. ${targetC.name} is trying to calm them down while cameras record the exchange. If you step in, the direction of the argument changes.`,
        involvedContestants: [targetA.name, targetB.name, targetC.name],
        requiresPlayerAction: true,
        impact: {
          immediate: 'Relationships between the people involved and you will change based on what you do',
          longTerm: 'This argument and your response will be visible in recaps and in how players remember the week'
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
          description: `The alliance with ${alliance.members.filter(m => m !== gameState.playerName).join(' and ')} is starting to crack. ${betrayer.name} has been spotted in side conversations, testing new numbers and rewriting the next vote without you. If you do nothing, the bloc that kept you safe may break on live night.`,
          involvedContestants: alliance.members,
          requiresPlayerAction: true,
          impact: {
            immediate: 'Alliance stability hangs in the balance',
            longTerm: 'This could reshape the entire game and the way your loyalty is remembered'
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
        description: `${confidant.name} waits until the room is quieter, then pulls you aside to ask directly where your head is. It is a small conversation that will matter later when viewers see it again in a recap.`,
        involvedContestants: [confidant.name],
        requiresPlayerAction: true,
        impact: {
          immediate: 'Your tone will affect trust and closeness with them',
          longTerm: 'Sets the tone for how one-on-one strategy talks with them appear on The Edit'
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
          description: `With an eviction episode looming, ${suspectedTarget.name} is in visible panic mode. Deals are being remade in every corner, secrets are leaking, and the house is quietly splitting into “stay” and “go” camps. How you move now is what the audience will remember.`,
          involvedContestants: [suspectedTarget.name, ...contestants.slice(0, 2).map(c => c.name)],
          requiresPlayerAction: true,
          impact: {
            immediate: 'Voting intentions shift rapidly',
            longTerm: 'Pre-elimination moves often determine who wins and how the season is talked about'
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
      contestants: updatedContestants
      // Don't store lastEmergentEvent to prevent UI lockup
    };
  }
}
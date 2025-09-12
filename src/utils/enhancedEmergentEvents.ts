import { GameState, Contestant } from '@/types/game';

export interface EmergentEvent {
  id: string;
  title: string;
  description: string;
  type: 'alliance_crisis' | 'trust_shift' | 'competition_twist' | 'social_drama' | 'strategy_leak' | 'vote_chaos';
  day: number;
  participants: string[];
  choices: EmergentChoice[];
  autoResolve?: boolean;
  timeLimit?: number; // minutes
}

export interface EmergentChoice {
  id: string;
  text: string;
  description: string;
  consequences: {
    immediate: string;
    longTerm: string;
  };
  relationshipEffects: { [name: string]: number };
  trustEffects: { [name: string]: number };
  allianceEffects?: string[];
  editEffect: number;
}

export class EnhancedEmergentEvents {
  private static eventHistory: string[] = [];
  private static narrativeThemes: string[] = [];

  static generateEmergentEvent(gameState: GameState): EmergentEvent | null {
    const activeContestants = gameState.contestants.filter(c => !c.isEliminated);
    const playerAlliances = gameState.alliances.filter(a => a.members.includes(gameState.playerName) && !a.dissolved);
    const recentInteractions = gameState.interactionLog?.filter(log => 
      log.day >= gameState.currentDay - 2
    ) || [];
    
    // Track narrative consistency
    const currentNarrativeTheme = this.detectNarrativeTheme(gameState);
    if (currentNarrativeTheme) {
      this.narrativeThemes.push(currentNarrativeTheme);
    }

    const events: EmergentEvent[] = [];

    // Alliance Crisis Events
    if (playerAlliances.length > 0) {
      const alliance = playerAlliances[0];
      const allyMembers = alliance.members.filter(m => m !== gameState.playerName);
      
      if (alliance.strength < 60 && !this.eventHistory.includes('alliance_crisis_trust')) {
        events.push({
          id: 'alliance_crisis_trust',
          title: 'Alliance Trust Crisis',
          description: `Your alliance with ${allyMembers.join(' and ')} is fracturing. Trust levels are dropping and members are questioning loyalty.`,
          type: 'alliance_crisis',
          day: gameState.currentDay,
          participants: alliance.members,
          choices: [
            {
              id: 'reinforce_loyalty',
              text: 'Reinforce Loyalty',
              description: 'Have an emergency alliance meeting to reaffirm commitments',
              consequences: {
                immediate: 'Alliance trust increases, but you appear desperate',
                longTerm: 'Stronger alliance bonds or complete breakdown if it fails'
              },
              relationshipEffects: allyMembers.reduce((acc, name) => ({ ...acc, [name]: 10 }), {}),
              trustEffects: allyMembers.reduce((acc, name) => ({ ...acc, [name]: 15 }), {}),
              editEffect: -5
            },
            {
              id: 'strategic_distance',
              text: 'Strategic Distance',
              description: 'Gradually distance yourself while looking for new options',
              consequences: {
                immediate: 'Alliance weakens but you maintain flexibility',
                longTerm: 'Freedom to make new alliances but loss of current protection'
              },
              relationshipEffects: allyMembers.reduce((acc, name) => ({ ...acc, [name]: -5 }), {}),
              trustEffects: allyMembers.reduce((acc, name) => ({ ...acc, [name]: -10 }), {}),
              editEffect: 5
            },
            {
              id: 'expose_weakness',
              text: 'Expose Weakness',
              description: 'Publicly call out alliance members for their disloyalty',
              consequences: {
                immediate: 'Alliance implodes but you control the narrative',
                longTerm: 'Open warfare but potential to eliminate threats'
              },
              relationshipEffects: allyMembers.reduce((acc, name) => ({ ...acc, [name]: -20 }), {}),
              trustEffects: allyMembers.reduce((acc, name) => ({ ...acc, [name]: -25 }), {}),
              allianceEffects: ['dissolve_alliance'],
              editEffect: 10
            }
          ]
        });
      }
    }

    // Strategy Leak Events
    const recentSchemes = recentInteractions.filter(log => log.type === 'scheme');
    if (recentSchemes.length > 0 && !this.eventHistory.includes('strategy_leak')) {
      const targetName = recentSchemes[0].participants.find(p => p !== gameState.playerName) || 'someone';
      
      events.push({
        id: 'strategy_leak',
        title: 'Strategy Leaked',
        description: `Word is spreading that you've been scheming against ${targetName}. People are starting to question your trustworthiness.`,
        type: 'strategy_leak',
        day: gameState.currentDay,
        participants: [gameState.playerName, targetName],
        choices: [
          {
            id: 'damage_control',
            text: 'Damage Control',
            description: 'Quickly reach out to key players to explain your actions',
            consequences: {
              immediate: 'Some trust is restored but you appear reactive',
              longTerm: 'Relationships stabilize but your reputation takes a hit'
            },
            relationshipEffects: activeContestants.reduce((acc, c) => 
              c.name !== gameState.playerName ? { ...acc, [c.name]: -5 } : acc, {}),
            trustEffects: activeContestants.reduce((acc, c) => 
              c.name !== gameState.playerName ? { ...acc, [c.name]: 5 } : acc, {}),
            editEffect: -10
          },
          {
            id: 'own_strategy',
            text: 'Own Your Strategy',
            description: 'Admit to the scheming but frame it as good gameplay',
            consequences: {
              immediate: 'Respect from some, fear from others',
              longTerm: 'Villain edit but strategic credibility'
            },
            relationshipEffects: { [targetName]: -15 },
            trustEffects: activeContestants.reduce((acc, c) => 
              c.name !== gameState.playerName && c.name !== targetName ? { ...acc, [c.name]: -10 } : acc, {}),
            editEffect: 15
          },
          {
            id: 'counter_attack',
            text: 'Counter Attack',
            description: 'Expose information about others to shift focus away from you',
            consequences: {
              immediate: 'Chaos ensues as everyone turns on each other',
              longTerm: 'House dynamics completely reshuffled'
            },
            relationshipEffects: activeContestants.reduce((acc, c) => 
              c.name !== gameState.playerName ? { ...acc, [c.name]: -10 } : acc, {}),
            trustEffects: activeContestants.reduce((acc, c) => 
              c.name !== gameState.playerName ? { ...acc, [c.name]: -15 } : acc, {}),
            editEffect: 20
          }
        ]
      });
    }

    // Competition Twist Events
    if (gameState.currentDay % 7 === 5 && !this.eventHistory.includes('competition_twist')) { // Competition days
      events.push({
        id: 'competition_twist',
        title: 'Competition Twist Revealed',
        description: 'The producers announce a surprise twist that will change the upcoming immunity competition.',
        type: 'competition_twist',
        day: gameState.currentDay,
        participants: [gameState.playerName],
        choices: [
          {
            id: 'form_competition_alliance',
            text: 'Form Competition Alliance',
            description: 'Quickly ally with strong competitors to help each other',
            consequences: {
              immediate: 'Increased chance of immunity but reveals strategic thinking',
              longTerm: 'Stronger bonds with competition allies'
            },
            relationshipEffects: {},
            trustEffects: {},
            editEffect: 5
          },
          {
            id: 'go_solo',
            text: 'Go Solo',
            description: 'Compete independently without making deals',
            consequences: {
              immediate: 'No strategic advantage but no new enemies',
              longTerm: 'Maintains current relationships'
            },
            relationshipEffects: {},
            trustEffects: {},
            editEffect: 0
          },
          {
            id: 'target_threats',
            text: 'Target Competition Threats',
            description: 'Secretly work to ensure strong competitors fail',
            consequences: {
              immediate: 'Weaker players have better chance at immunity',
              longTerm: 'Strong competitors may target you in return'
            },
            relationshipEffects: activeContestants.reduce((acc, c) => 
              c.psychProfile?.disposition?.includes('competitive') ? { ...acc, [c.name]: -10 } : acc, {}),
            trustEffects: {},
            editEffect: 10
          }
        ]
      });
    }

    // Vote Chaos Events
    if (gameState.nextEliminationDay - gameState.currentDay <= 2 && !this.eventHistory.includes('vote_chaos')) {
      events.push({
        id: 'vote_chaos',
        title: 'Vote Plans Disrupted',
        description: 'New information has emerged that could completely change the upcoming elimination vote.',
        type: 'vote_chaos',
        day: gameState.currentDay,
        participants: activeContestants.map(c => c.name),
        choices: [
          {
            id: 'stick_to_plan',
            text: 'Stick to Original Plan',
            description: 'Trust your existing vote plan despite new information',
            consequences: {
              immediate: 'Maintains alliance relationships but may miss opportunity',
              longTerm: 'Consistency builds trust but could be strategic mistake'
            },
            relationshipEffects: {},
            trustEffects: playerAlliances.length > 0 ? 
              playerAlliances[0].members.reduce((acc, name) => 
                name !== gameState.playerName ? { ...acc, [name]: 10 } : acc, {}) : {},
            editEffect: -5
          },
          {
            id: 'flip_vote',
            text: 'Flip Your Vote',
            description: 'Use the new information to change your target',
            consequences: {
              immediate: 'Potentially better strategic outcome but ally confusion',
              longTerm: 'Reputation for adaptability but questions about loyalty'
            },
            relationshipEffects: {},
            trustEffects: playerAlliances.length > 0 ? 
              playerAlliances[0].members.reduce((acc, name) => 
                name !== gameState.playerName ? { ...acc, [name]: -15 } : acc, {}) : {},
            editEffect: 10
          },
          {
            id: 'abstain_vote',
            text: 'Create Chaos',
            description: 'Intentionally cause a tie vote to force a revote',
            consequences: {
              immediate: 'Complete chaos at tribal council',
              longTerm: 'Unpredictable but potentially powerful position'
            },
            relationshipEffects: activeContestants.reduce((acc, c) => 
              c.name !== gameState.playerName ? { ...acc, [c.name]: -5 } : acc, {}),
            trustEffects: activeContestants.reduce((acc, c) => 
              c.name !== gameState.playerName ? { ...acc, [c.name]: -20 } : acc, {}),
            editEffect: 25
          }
        ]
      });
    }

    // Select event based on narrative consistency
    if (events.length === 0) return null;
    
    // Prioritize events that match current narrative theme
    const thematicEvents = events.filter(event => 
      this.matchesNarrativeTheme(event, currentNarrativeTheme)
    );
    
    const selectedEvent = thematicEvents.length > 0 
      ? thematicEvents[Math.floor(Math.random() * thematicEvents.length)]
      : events[Math.floor(Math.random() * events.length)];
      
    this.eventHistory.push(selectedEvent.id);
    
    // Keep only recent events in history
    if (this.eventHistory.length > 10) {
      this.eventHistory = this.eventHistory.slice(-10);
    }
    
    return selectedEvent;
  }

  private static detectNarrativeTheme(gameState: GameState): string | null {
    const recentActions = gameState.interactionLog?.slice(-5) || [];
    
    if (recentActions.filter(a => a.type === 'scheme').length >= 2) {
      return 'strategic_mastermind';
    }
    if (recentActions.filter(a => a.type === 'alliance_meeting').length >= 2) {
      return 'social_coordinator';
    }
    if (gameState.editPerception.persona.includes('Villain')) {
      return 'villain_arc';
    }
    if (gameState.editPerception.persona.includes('Hero')) {
      return 'hero_journey';
    }
    
    return null;
  }

  private static matchesNarrativeTheme(event: EmergentEvent, theme: string | null): boolean {
    if (!theme) return false;
    
    switch (theme) {
      case 'strategic_mastermind':
        return event.type === 'strategy_leak' || event.type === 'vote_chaos';
      case 'social_coordinator':
        return event.type === 'alliance_crisis';
      case 'villain_arc':
        return event.choices.some(c => c.editEffect > 10);
      case 'hero_journey':
        return event.choices.some(c => c.editEffect < 0);
      default:
        return false;
    }
  }

  static executeEventChoice(choice: EmergentChoice, gameState: GameState): {
    outcome: string;
    relationshipChanges: { [name: string]: number };
    trustChanges: { [name: string]: number };
    allianceChanges: string[];
    editChange: number;
  } {
    return {
      outcome: choice.consequences.immediate,
      relationshipChanges: choice.relationshipEffects,
      trustChanges: choice.trustEffects,
      allianceChanges: choice.allianceEffects || [],
      editChange: choice.editEffect
    };
  }
}

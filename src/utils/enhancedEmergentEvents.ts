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

  private static nonPlayerContestants(gameState: GameState): Contestant[] {
    return gameState.contestants.filter(c => !c.isEliminated && c.name !== gameState.playerName);
  }

  private static pickNonPlayerNames(gameState: GameState, count: number): string[] {
    const pool = this.nonPlayerContestants(gameState).map(c => c.name);
    return pool.slice(0, count);
  }

  private static uniqueParticipants(names: (string | undefined)[]): string[] {
    const set = new Set(names.filter(Boolean) as string[]);
    return Array.from(set);
  }

  static generateEmergentEvent(gameState: GameState): EmergentEvent | null {
    const activeContestants = gameState.contestants.filter(c => !c.isEliminated);
    const nonPlayer = this.nonPlayerContestants(gameState);
    const playerAlliances = gameState.alliances.filter(a => a.members.includes(gameState.playerName) && !a.dissolved);
    const recentInteractions = gameState.interactionLog?.filter(log => 
      log.day >= gameState.currentDay - 2
    ) || [];
    
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
      const schemeParticipants = recentSchemes[0].participants.filter(p => p !== gameState.playerName);
      const fallback = this.pickNonPlayerNames(gameState, 1)[0];
      const targetName = schemeParticipants[0] || fallback;

      if (targetName) {
        events.push({
          id: 'strategy_leak',
          title: 'Strategy Leaked',
          description: `Word is spreading that you've been scheming against ${targetName}. People are starting to question your trustworthiness.`,
          type: 'strategy_leak',
          day: gameState.currentDay,
          participants: this.uniqueParticipants([gameState.playerName, targetName]),
          choices: [
            {
              id: 'damage_control',
              text: 'Damage Control',
              description: 'Quickly reach out to key players to explain your actions',
              consequences: {
                immediate: 'Some trust is restored but you appear reactive',
                longTerm: 'Relationships stabilize but your reputation takes a hit'
              },
              relationshipEffects: nonPlayer.reduce((acc, c) => ({ ...acc, [c.name]: -5 }), {}),
              trustEffects: nonPlayer.reduce((acc, c) => ({ ...acc, [c.name]: 5 }), {}),
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
              trustEffects: nonPlayer.reduce((acc, c) => 
                c.name !== targetName ? { ...acc, [c.name]: -10 } : acc, {}),
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
              relationshipEffects: nonPlayer.reduce((acc, c) => ({ ...acc, [c.name]: -10 }), {}),
              trustEffects: nonPlayer.reduce((acc, c) => ({ ...acc, [c.name]: -15 }), {}),
              editEffect: 20
            }
          ]
        });
      }
    }

    // Competition Twist Events
    if (gameState.currentDay % 7 === 5 && !this.eventHistory.includes('competition_twist')) {
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
            relationshipEffects: nonPlayer.reduce((acc, c) => ({ ...acc, [c.name]: -5 }), {}),
            trustEffects: nonPlayer.reduce((acc, c) => ({ ...acc, [c.name]: -20 }), {}),
            editEffect: 25
          }
        ]
      });
    }

    // Whisper network ping
    if (gameState.currentDay % 3 === 0 && !this.eventHistory.includes(`whisper_${gameState.currentDay}`)) {
      const partner = this.pickNonPlayerNames(gameState, 1)[0];
      if (partner) {
        events.push({
          id: `whisper_${gameState.currentDay}`,
          title: 'Whisper Network',
          description: `${partner} heard something about a name being floated. It might be nothing—or not.`,
          type: 'social_drama',
          day: gameState.currentDay,
          participants: this.uniqueParticipants([gameState.playerName, partner]),
          choices: [
            {
              id: 'probe_quietly',
              text: 'Probe quietly',
              description: 'Ask around without tipping your hand',
              consequences: {
                immediate: 'You learn fragments, but your interest is noticed by a few',
                longTerm: 'Mild suspicion; potential intel later'
              },
              relationshipEffects: nonPlayer.slice(0, 2).reduce((acc, c) => ({ ...acc, [c.name]: -2 }), {}),
              trustEffects: {},
              editEffect: 2
            },
            {
              id: 'ignore_for_now',
              text: 'Ignore for now',
              description: 'Don’t feed the rumor mill',
              consequences: {
                immediate: 'Nothing changes visibly',
                longTerm: 'You remain out of this thread'
              },
              relationshipEffects: {},
              trustEffects: {},
              editEffect: -1
            },
            {
              id: 'seed_counter_rumor',
              text: 'Seed a soft counter-rumor',
              description: 'Float a vague alternative narrative',
              consequences: {
                immediate: 'Slightly redirects attention elsewhere',
                longTerm: 'May boomerang later'
              },
              relationshipEffects: nonPlayer.slice(0, 3).reduce((acc, c) => ({ ...acc, [c.name]: -3 }), {}),
              trustEffects: {},
              editEffect: 4
            }
          ]
        });
      }
    }

    // Misquote leak (trust shift)
    if (recentInteractions.some(log => log.type === 'talk') && !this.eventHistory.includes(`misquote_${gameState.currentDay}`)) {
      const [p1, p2] = this.pickNonPlayerNames(gameState, 2);
      if (p1) {
        const participants = this.uniqueParticipants([gameState.playerName, p1, p2]);
        events.push({
          id: `misquote_${gameState.currentDay}`,
          title: 'Misquote Spreads',
          description: `A comment you made about ${p1} is being repeated with extra spice.`,
          type: 'trust_shift',
          day: gameState.currentDay,
          participants,
          choices: [
            {
              id: 'clarify_privately',
              text: 'Clarify privately',
              description: 'Speak to them one-on-one to de-escalate',
              consequences: {
                immediate: 'Tension cools, but gossipers remain active',
                longTerm: 'Trust trend stabilizes'
              },
              relationshipEffects: { [p1]: 3 },
              trustEffects: { [p1]: 6 },
              editEffect: -1
            },
            {
              id: 'public_correction',
              text: 'Public correction',
              description: 'Correct the record in front of others',
              consequences: {
                immediate: 'You look assertive; some think you’re defensive',
                longTerm: 'Gossip reduces, but image shifts'
              },
              relationshipEffects: {},
              trustEffects: nonPlayer.reduce((acc, c) =>
                c.name === p1 ? { ...acc, [c.name]: 4 } : acc, {}),
              editEffect: 5
            },
            {
              id: 'play_it_off',
              text: 'Play it off',
              description: 'Don’t dignify it; keep moving',
              consequences: {
                immediate: 'Some believe the misquote; others move on',
                longTerm: 'Minor lingering suspicion'
              },
              relationshipEffects: {},
              trustEffects: { [p1]: -4 },
              editEffect: 2
            }
          ]
        });
      }
    }

    // Soft betrayal hint (strategy leak style)
    if (playerAlliances.length && !this.eventHistory.includes(`soft_betrayal_${gameState.currentDay}`)) {
      const allied = playerAlliances[0].members.find(m => m !== gameState.playerName);
      if (allied) {
        events.push({
          id: `soft_betrayal_${gameState.currentDay}`,
          title: 'Soft Betrayal Hint',
          description: `${allied} was seen talking alone with someone pushing your name.`,
          type: 'strategy_leak',
          day: gameState.currentDay,
          participants: this.uniqueParticipants([gameState.playerName, allied]),
          choices: [
            {
              id: 'test_loyalty',
              text: 'Test loyalty quietly',
              description: 'Offer them a small piece of info and watch what happens',
              consequences: {
                immediate: 'They feel included; the info may travel',
                longTerm: 'You learn their true reliability'
              },
              relationshipEffects: { [allied]: 2 },
              trustEffects: { [allied]: 3 },
              editEffect: 3
            },
            {
              id: 'set_trap',
              text: 'Set a simple trap',
              description: 'Leak a harmless decoy and trace the path',
              consequences: {
                immediate: 'If it spreads, you’ll know',
                longTerm: 'Potential confrontation later'
              },
              relationshipEffects: {},
              trustEffects: { [allied]: -2 },
              editEffect: 6
            },
            {
              id: 'let_it_slide',
              text: 'Let it slide',
              description: 'Don’t overreact; maintain the relationship',
              consequences: {
                immediate: 'Calm water—for now',
                longTerm: 'Possible blind spot later'
              },
              relationshipEffects: { [allied]: 1 },
              trustEffects: {},
              editEffect: -1
            }
          ]
        });
      }
    }

    if (events.length === 0) return null;
    
    const thematicEvents = events.filter(event => 
      this.matchesNarrativeTheme(event, currentNarrativeTheme)
    );
    
    const selectedEvent = thematicEvents.length > 0 
      ? thematicEvents[Math.floor(Math.random() * thematicEvents.length)]
      : events[Math.floor(Math.random() * events.length)];
      
    this.eventHistory.push(selectedEvent.id);
    
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

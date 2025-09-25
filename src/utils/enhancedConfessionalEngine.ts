
import { GameState, Contestant, Alliance } from '@/types/game';

export interface DynamicConfessionalPrompt {
  id: string;
  category: 'strategy' | 'alliance' | 'voting' | 'social' | 'reflection' | 'general';
  prompt: string;
  followUp?: string;
  suggestedTones: string[];
  editPotential: number;
  context?: any;
}

export class EnhancedConfessionalEngine {
  private static recentPrompts: string[] = [];
  private static narrativeTracking: Map<string, number> = new Map();

  static generateDynamicPrompts(gameState: GameState): DynamicConfessionalPrompt[] {
    const prompts: DynamicConfessionalPrompt[] = [];
    const activeContestants = gameState.contestants.filter(c => !c.isEliminated);
    const playerAlliances = gameState.alliances.filter(a => a.members.includes(gameState.playerName) && !a.dissolved);
    const daysToElimination = gameState.nextEliminationDay - gameState.currentDay;
    
    // Track narrative consistency
    const currentPersona = gameState.editPerception.persona;
    const narrativeContext = this.analyzeNarrativeContext(gameState);
    
    // Generate contextual prompts based on recent events
    const recentEvents = this.analyzeRecentEvents(gameState);
    prompts.push(...this.generateEventBasedPrompts(recentEvents, gameState));

    // Strategy prompts - context-aware based on game stage
    if (activeContestants.length <= 8 && activeContestants.length > 5) {
      prompts.push({
        id: 'mid-game-strategy',
        category: 'strategy',
        prompt: `We're getting to the middle game with ${activeContestants.length} players left. What's your strategy moving forward?`,
        followUp: "Who do you see as your biggest competition right now?",
        suggestedTones: ['strategic', 'dramatic'],
        editPotential: 8
      });
    } else if (activeContestants.length <= 5) {
      prompts.push({
        id: 'endgame-strategy',
        category: 'strategy',
        prompt: `Only ${activeContestants.length} players remain. How are you positioning yourself for the final stretch?`,
        followUp: "What's your path to the finale from here?",
        suggestedTones: ['strategic', 'dramatic'],
        editPotential: 9
      });
    }

    if (daysToElimination <= 2) {
      prompts.push({
        id: 'elimination-pressure',
        category: 'voting',
        prompt: "Elimination is coming up soon. How are you feeling about the vote?",
        followUp: "Do you feel safe this week?",
        suggestedTones: ['vulnerable', 'strategic', 'dramatic'],
        editPotential: 9
      });
    }

    // Alliance prompts
    if (playerAlliances.length > 0) {
      const alliance = playerAlliances[0];
      const otherMembers = alliance.members.filter(m => m !== gameState.playerName);
      prompts.push({
        id: 'alliance-trust',
        category: 'alliance',
        prompt: `Talk about your alliance with ${otherMembers.join(' and ')}. How much do you trust them?`,
        followUp: "Are you worried about any cracks forming?",
        suggestedTones: ['strategic', 'vulnerable'],
        editPotential: 7
      });
    }

    if (playerAlliances.length === 0) {
      prompts.push({
        id: 'solo-game',
        category: 'alliance',
        prompt: "You're playing without a solid alliance right now. What's your game plan?",
        followUp: "Are you looking to make new connections?",
        suggestedTones: ['strategic', 'vulnerable', 'dramatic'],
        editPotential: 8
      });
    }

    // Social dynamics
    const highTrustPlayers = activeContestants.filter(c => 
      c.name !== gameState.playerName && c.psychProfile && c.psychProfile.trustLevel > 60
    );
    
    if (highTrustPlayers.length > 0) {
      const player = highTrustPlayers[0];
      prompts.push({
        id: 'social-connection',
        category: 'social',
        prompt: `You seem to have a good relationship with ${player.name}. How real is that connection?`,
        followUp: "Is it strategy or genuine friendship?",
        suggestedTones: ['vulnerable', 'strategic', 'humorous'],
        editPotential: 6
      });
    }

    // Threat assessment (realistic, no fabricated competition wins)
    const competitionThreats = activeContestants.filter(c => 
      c.name !== gameState.playerName && c.psychProfile && 
      Array.isArray(c.psychProfile.disposition) && c.psychProfile.disposition.includes('competitive')
    );

    if (competitionThreats.length > 0) {
      const threat = competitionThreats[0];

      // Only reference an actual competition win if we have evidence (current immunity)
      const hasProvenWin = gameState.immunityWinner === threat.name;

      const promptText = hasProvenWin
        ? `${threat.name} just won immunity. Are they someone you need to worry about?`
        : `${threat.name} is widely seen as highly competitive. Are they someone you need to worry about?`;

      prompts.push({
        id: 'competition-threat',
        category: 'strategy',
        prompt: promptText,
        followUp: hasProvenWin
          ? "How does their immunity change your plans this week?"
          : "When would be the right time to make a move against them?",
        suggestedTones: ['strategic', 'aggressive', 'dramatic'],
        editPotential: 8
      });
    }

    // General game reflection
    prompts.push({
      id: 'game-reflection',
      category: 'reflection',
      prompt: `It's day ${gameState.currentDay}. How do you think you're playing so far?`,
      followUp: "What would you change about your strategy if you could start over?",
      suggestedTones: ['vulnerable', 'strategic', 'humorous'],
      editPotential: 5
    });

    // Drama and conflicts
    if (gameState.interactionLog && gameState.interactionLog.length > 0) {
      const recentConflicts = gameState.interactionLog
        .filter(log => log.day >= gameState.currentDay - 2 && log.tone === 'aggressive')
        .slice(-1);
      
      if (recentConflicts.length > 0) {
        const conflict = recentConflicts[0];
        const otherParticipant = conflict.participants.find(p => p !== gameState.playerName);
        if (otherParticipant) {
          prompts.push({
            id: 'recent-conflict',
            category: 'social',
            prompt: `Things got heated with ${otherParticipant} recently. What's your side of the story?`,
            followUp: "How do you think this affects your game moving forward?",
            suggestedTones: ['aggressive', 'vulnerable', 'strategic'],
            editPotential: 9
          });
        }
      }
    }

    // Voting strategy
    prompts.push({
      id: 'voting-strategy',
      category: 'voting',
      prompt: "If you had to vote someone out right now, who would it be and why?",
      followUp: "Are you confident you have the numbers for that move?",
      suggestedTones: ['strategic', 'aggressive', 'dramatic'],
      editPotential: 8
    });

    // Personal journey
    prompts.push({
      id: 'personal-growth',
      category: 'reflection',
      prompt: "This game pushes people to their limits. How has it changed you?",
      followUp: "What will you take away from this experience?",
      suggestedTones: ['vulnerable', 'humorous'],
      editPotential: 4
    });

    // Add context-aware prompts based on game stage
    const additionalPrompts: DynamicConfessionalPrompt[] = [];
    
    if (activeContestants.length > 10) {
      // Early game prompts
      additionalPrompts.push({
        id: 'early-game-positioning',
        category: 'strategy' as const,
        prompt: "It's still early in the game. How are you positioning yourself to survive the first few votes?",
        suggestedTones: ['strategic', 'vulnerable'],
        editPotential: 6
      });
    } else if (activeContestants.length > 7) {
      // Mid game prompts
      additionalPrompts.push({
        id: 'power-dynamics',
        category: 'strategy' as const,
        prompt: "The power dynamics are shifting. Who's really running the game right now?",
        suggestedTones: ['strategic', 'dramatic'],
        editPotential: 7
      });
    } else if (activeContestants.length > 5) {
      // Pre-jury prompts
      additionalPrompts.push({
        id: 'jury-approaching',
        category: 'strategy' as const,
        prompt: "We're getting close to jury phase. How are you managing your threat level?",
        suggestedTones: ['strategic', 'vulnerable'],
        editPotential: 8
      });
    } else {
      // Late game prompts
      additionalPrompts.push({
        id: 'finale-positioning',
        category: 'strategy' as const,
        prompt: "The finale is in sight. What moves do you need to make to secure your spot?",
        suggestedTones: ['strategic', 'dramatic'],
        editPotential: 9
      });
    }

    // Persona-aware edit shaping prompts (expanded confessionals, realistic)
    const persona = gameState.editPerception.persona;
    const isUnderedited = persona === 'Underedited' || persona === 'Ghosted';
    const isComicOrSocial = persona === 'Comic Relief' || persona === 'Social Butterfly';

    if (isUnderedited) {
      additionalPrompts.push({
        id: 'edit-shaping',
        category: 'general' as const,
        prompt: "You haven't been shown much yet. How will you get more screen time without blowing up your game?",
        followUp: "What kind of confessional will make producers take notice while staying authentic?",
        suggestedTones: ['dramatic', 'humorous', 'strategic'],
        editPotential: 7
      });
    } else if (isComicOrSocial) {
      additionalPrompts.push({
        id: 'balance-comedy-strategy',
        category: 'reflection' as const,
        prompt: "Viewers see your humorous side. How do you balance that with real strategic gameplay?",
        followUp: "What's one move you made that people might not have noticed?",
        suggestedTones: ['humorous', 'strategic', 'vulnerable'],
        editPotential: 6
      });
    }

    // Always relevant prompts
    additionalPrompts.push(
      {
        id: 'underestimated',
        category: 'strategy' as const,
        prompt: "Do you think people are underestimating you? Why or why not?",
        suggestedTones: ['strategic', 'dramatic', 'aggressive'],
        editPotential: 7
      },
      {
        id: 'biggest-mistake',
        category: 'reflection' as const,
        prompt: "What's been your biggest mistake in the game so far?",
        suggestedTones: ['vulnerable', 'strategic'],
        editPotential: 5
      }
    );

    prompts.push(...additionalPrompts);

    // Filter based on narrative consistency and recent usage
    const filteredPrompts = this.filterPromptsForConsistency(prompts, currentPersona, narrativeContext);
    
    // Update recent prompts tracking
    const selectedPrompts = filteredPrompts.slice(0, 6);
    selectedPrompts.forEach(p => this.recentPrompts.push(p.id));
    
    // Keep recent prompts list manageable
    if (this.recentPrompts.length > 20) {
      this.recentPrompts = this.recentPrompts.slice(-10);
    }

    return selectedPrompts;
  }

  private static analyzeNarrativeContext(gameState: GameState): {
    dominantStrategy: string;
    relationshipFocus: string;
    threatLevel: string;
    editDirection: string;
  } {
    const recentActions = gameState.interactionLog?.slice(-5) || [];
    const strategicActions = recentActions.filter(a => a.type === 'scheme').length;
    const socialActions = recentActions.filter(a => a.type === 'talk' || a.type === 'dm').length;
    
    return {
      dominantStrategy: strategicActions > socialActions ? 'strategic' : 'social',
      relationshipFocus: gameState.alliances.length > 1 ? 'alliance_management' : 'individual_connections',
      threatLevel: gameState.editPerception.audienceApproval > 50 ? 'high' : 'manageable',
      editDirection: gameState.editPerception.lastEditShift > 0 ? 'positive' : 'neutral'
    };
  }

  private static analyzeRecentEvents(gameState: GameState): Array<{
    type: string;
    participants: string[];
    impact: number;
    day: number;
  }> {
    const recentDays = 3;
    const events = [];
    
    // Check recent interactions
    const recentInteractions = gameState.interactionLog?.filter(log => 
      log.day >= gameState.currentDay - recentDays
    ) || [];
    
    events.push(...recentInteractions.map(log => ({
      type: log.type,
      participants: log.participants,
      impact: log.type === 'scheme' ? 8 : log.type === 'dm' ? 6 : 4,
      day: log.day
    })));
    
    // Check alliance changes
    const recentAllianceActivity = gameState.alliances.filter(a => 
      a.lastActivity >= gameState.currentDay - recentDays
    );
    
    events.push(...recentAllianceActivity.map(alliance => ({
      type: 'alliance_activity',
      participants: alliance.members,
      impact: alliance.strength > 70 ? 7 : 5,
      day: alliance.lastActivity
    })));
    
    return events.sort((a, b) => b.impact - a.impact);
  }

  private static generateEventBasedPrompts(events: any[], gameState: GameState): DynamicConfessionalPrompt[] {
    const prompts: DynamicConfessionalPrompt[] = [];
    
    // Generate prompts based on high-impact recent events
    const highImpactEvents = events.filter(e => e.impact >= 6).slice(0, 3);
    
    highImpactEvents.forEach((event, index) => {
      switch (event.type) {
        case 'scheme':
          const schemeTarget = event.participants.find(p => p !== gameState.playerName);
          if (schemeTarget) {
            prompts.push({
              id: `recent-scheme-${index}`,
              category: 'strategy',
              prompt: `You recently had some strategic conversations about ${schemeTarget}. How did that go?`,
              followUp: "Are you confident in the move you're planning?",
              suggestedTones: ['strategic', 'dramatic'],
              editPotential: 8
            });
          }
          break;
          
        case 'dm':
          const dmPartner = event.participants.find(p => p !== gameState.playerName);
          if (dmPartner) {
            prompts.push({
              id: `recent-dm-${index}`,
              category: 'social',
              prompt: `You had a private conversation with ${dmPartner} recently. What was that about?`,
              followUp: "Did you learn anything useful?",
              suggestedTones: ['strategic', 'vulnerable'],
              editPotential: 6
            });
          }
          break;
          
        case 'alliance_activity':
          prompts.push({
            id: `alliance-update-${index}`,
            category: 'alliance',
            prompt: "There's been some activity with your alliance lately. How solid do you feel about your position?",
            followUp: "Is everyone still on the same page?",
            suggestedTones: ['strategic', 'vulnerable'],
            editPotential: 7
          });
          break;
      }
    });
    
    return prompts;
  }

  private static filterPromptsForConsistency(
    prompts: DynamicConfessionalPrompt[], 
    persona: string, 
    context: any
  ): DynamicConfessionalPrompt[] {
    // Remove recently used prompts
    const availablePrompts = prompts.filter(p => !this.recentPrompts.includes(p.id));
    
    // Prioritize prompts that match current persona
    const personaMatches = availablePrompts.filter(prompt => {
      if (persona.includes('Villain') || persona.includes('Mastermind')) {
        return prompt.suggestedTones.includes('strategic') || prompt.suggestedTones.includes('aggressive');
      }
      if (persona.includes('Hero') || persona.includes('Fan Favorite')) {
        return prompt.suggestedTones.includes('vulnerable') || prompt.suggestedTones.includes('humorous');
      }
      if (persona.includes('Social')) {
        return prompt.category === 'social' || prompt.suggestedTones.includes('vulnerable');
      }
      return true;
    });
    
    // Balance high and low edit potential prompts
    const highEditPrompts = personaMatches.filter(p => p.editPotential >= 7);
    const mediumEditPrompts = personaMatches.filter(p => p.editPotential >= 4 && p.editPotential < 7);
    const lowEditPrompts = personaMatches.filter(p => p.editPotential < 4);
    
    // Create balanced selection
    const balancedSelection = [
      ...highEditPrompts.slice(0, 2),
      ...mediumEditPrompts.slice(0, 3),
      ...lowEditPrompts.slice(0, 1)
    ];
    
    // Fill remaining slots if needed
    const remaining = 6 - balancedSelection.length;
    if (remaining > 0) {
      const additional = availablePrompts
        .filter(p => !balancedSelection.includes(p))
        .slice(0, remaining);
      balancedSelection.push(...additional);
    }
    
    return balancedSelection.sort(() => Math.random() - 0.5);
  }
}

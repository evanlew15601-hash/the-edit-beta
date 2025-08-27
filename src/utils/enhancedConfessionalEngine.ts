import { GameState, Contestant } from '@/types/game';

export interface DynamicConfessionalPrompt {
  id: string;
  prompt: string;
  tone: string;
  category: 'strategy' | 'social' | 'reflection' | 'alliance' | 'voting' | 'general';
  contextual: boolean;
  suggestedTones?: string[];
  editPotential: number;
  followUp?: string;
}

export class EnhancedConfessionalEngine {
  private static usedPrompts = new Set<string>();
  private static promptPool: DynamicConfessionalPrompt[] = [];

  static generateDynamicPrompts(gameState: GameState): DynamicConfessionalPrompt[] {
    this.promptPool = [];
    
    const player = gameState.contestants.find(c => c.name === gameState.playerName);
    if (!player) return [];

    // Get recent context (last 3 days)
    const recentInteractions = gameState.interactionLog?.filter(log => 
      log.day >= gameState.currentDay - 3 && 
      log.participants.includes(gameState.playerName)
    ) || [];

    const recentAlliances = gameState.alliances.filter(a => 
      a.members.includes(gameState.playerName) && 
      a.lastActivity >= gameState.currentDay - 3
    );

    const upcomingElimination = gameState.currentDay >= gameState.nextEliminationDay - 1;
    const juryPhase = gameState.gamePhase === 'jury_vote' || gameState.daysUntilJury === 0;
    const remainingCount = gameState.contestants.filter(c => !c.isEliminated).length;

    // Base Strategy Prompts
    this.addStrategyPrompts(gameState, remainingCount, upcomingElimination);
    
    // Social Game Prompts
    this.addSocialPrompts(recentInteractions, gameState);
    
    // Alliance-Specific Prompts
    this.addAlliancePrompts(recentAlliances, gameState);
    
    // Voting Strategy Prompts
    this.addVotingPrompts(gameState, upcomingElimination);
    
    // Reflection Prompts
    this.addReflectionPrompts(gameState, remainingCount, juryPhase);
    
    // General Game State Prompts
    this.addGeneralPrompts(gameState);

    // Filter out recently used prompts and shuffle
    const availablePrompts = this.promptPool.filter(p => 
      !this.usedPrompts.has(p.prompt)
    );

    // If we've used too many, reset some
    if (availablePrompts.length < 6) {
      this.usedPrompts.clear();
      return this.shuffleArray(this.promptPool).slice(0, 8);
    }

    return this.shuffleArray(availablePrompts).slice(0, 8);
  }

  private static addStrategyPrompts(gameState: GameState, remainingCount: number, upcomingElimination: boolean) {
    const prompts = [
      {
        id: `strategy_endgame_${remainingCount}`,
        prompt: `With ${remainingCount} people left, what's your strategy to make it to the end?`,
        tone: 'strategic',
        category: 'strategy' as const,
        contextual: true,
        editPotential: 8,
        suggestedTones: ['strategic', 'confident']
      },
      {
        id: 'strategy_threat_assessment',
        prompt: "Who do you see as your biggest threat right now and how do you plan to handle them?",
        tone: 'strategic',
        category: 'strategy' as const,
        contextual: false,
        editPotential: 9,
        suggestedTones: ['strategic', 'aggressive']
      },
      {
        id: 'strategy_endgame_vision',
        prompt: "What's your end-game strategy? Who would you want to sit next to in the final two?",
        tone: 'strategic',
        category: 'strategy' as const,
        contextual: false,
        editPotential: 7,
        suggestedTones: ['strategic', 'confident']
      },
      {
        id: 'strategy_evolution',
        prompt: "How has your strategy evolved since the beginning of the game?",
        tone: 'reflective',
        category: 'strategy' as const,
        contextual: false,
        editPotential: 6,
        suggestedTones: ['reflective', 'strategic']
      }
    ];

    if (upcomingElimination) {
      prompts.push({
        id: 'strategy_elimination_target',
        prompt: "With elimination coming up, who are you targeting and why?",
        tone: 'strategic',
        category: 'strategy' as const,
        contextual: true,
        editPotential: 9,
        suggestedTones: ['strategic', 'aggressive']
      });
    }

    if (remainingCount <= 6) {
      prompts.push({
        id: 'strategy_endgame_security',
        prompt: "We're getting close to the end. How do you plan to secure your spot in the finals?",
        tone: 'strategic',
        category: 'strategy' as const,
        contextual: true,
        editPotential: 8,
        suggestedTones: ['strategic', 'confident']
      });
    }

    this.promptPool.push(...prompts);
  }

  private static addSocialPrompts(recentInteractions: any[], gameState: GameState) {
    const prompts = [
      {
        id: 'social_trust_analysis',
        prompt: "Who do you trust most in this house and why?",
        tone: 'honest',
        category: 'social' as const,
        contextual: false,
        editPotential: 6,
        suggestedTones: ['honest', 'vulnerable']
      },
      {
        id: 'social_gameplay_surprise',
        prompt: "Who's been surprising you with their gameplay lately?",
        tone: 'analytical',
        category: 'social' as const,
        contextual: false,
        editPotential: 5,
        suggestedTones: ['analytical', 'honest']
      },
      {
        id: 'social_relationship_building',
        prompt: "What relationships are you working on building right now?",
        tone: 'strategic',
        category: 'social' as const,
        contextual: false,
        editPotential: 6,
        suggestedTones: ['strategic', 'honest']
      },
      {
        id: 'social_wrong_read',
        prompt: "Who do you think has the wrong read on you?",
        tone: 'defensive',
        category: 'social' as const,
        contextual: false,
        editPotential: 7,
        suggestedTones: ['defensive', 'analytical']
      }
    ];

    // Add contextual prompts based on recent interactions
    if (recentInteractions.some(i => i.type === 'dm')) {
      prompts.push({
        id: 'social_private_conversations',
        prompt: "You've been having some private conversations lately. How important is the information game right now?",
        tone: 'strategic',
        category: 'social' as const,
        contextual: true,
        editPotential: 8,
        suggestedTones: ['strategic', 'analytical']
      });
    }

    if (recentInteractions.some(i => i.type === 'scheme')) {
      prompts.push({
        id: 'social_strategic_moves',
        prompt: "You've been making some strategic moves. Are you worried about being seen as a threat?",
        tone: 'concerned',
        category: 'social' as const,
        contextual: true,
        editPotential: 9,
        suggestedTones: ['concerned', 'strategic']
      });
    }

    this.promptPool.push(...prompts);
  }

  private static addAlliancePrompts(recentAlliances: any[], gameState: GameState) {
    const prompts = [
      {
        id: 'alliance_relationships',
        prompt: "How are your alliance relationships holding up?",
        tone: 'analytical',
        category: 'alliance' as const,
        contextual: false,
        editPotential: 6,
        suggestedTones: ['analytical', 'honest']
      },
      {
        id: 'alliance_trust_levels',
        prompt: "Who in your alliance do you trust the most and least?",
        tone: 'honest',
        category: 'alliance' as const,
        contextual: false,
        editPotential: 8,
        suggestedTones: ['honest', 'strategic']
      },
      {
        id: 'alliance_strategy_changes',
        prompt: "Do you think you need to make any new alliances or break any existing ones?",
        tone: 'strategic',
        category: 'alliance' as const,
        contextual: false,
        editPotential: 9,
        suggestedTones: ['strategic', 'analytical']
      }
    ];

    if (recentAlliances.length > 0) {
      prompts.push({
        id: 'alliance_recent_activity',
        prompt: "Your alliance has been active lately. How confident are you in their loyalty?",
        tone: 'concerned',
        category: 'alliance' as const,
        contextual: true,
        editPotential: 7,
        suggestedTones: ['concerned', 'analytical']
      });
    }

    if (gameState.alliances.filter(a => a.members.includes(gameState.playerName)).length > 1) {
      prompts.push({
        id: 'alliance_multiple_management',
        prompt: "You're in multiple alliances. How are you managing those relationships?",
        tone: 'strategic',
        category: 'alliance' as const,
        contextual: true,
        editPotential: 9,
        suggestedTones: ['strategic', 'concerned']
      });
    }

    this.promptPool.push(...prompts);
  }

  private static addVotingPrompts(gameState: GameState, upcomingElimination: boolean) {
    const prompts = [
      {
        id: 'voting_target_today',
        prompt: "If you had to vote someone out today, who would it be and why?",
        tone: 'strategic',
        category: 'voting' as const,
        contextual: false,
        editPotential: 9,
        suggestedTones: ['strategic', 'analytical']
      },
      {
        id: 'voting_who_targets_me',
        prompt: "Who do you think is targeting you for elimination?",
        tone: 'paranoid',
        category: 'voting' as const,
        contextual: false,
        editPotential: 8,
        suggestedTones: ['paranoid', 'analytical']
      },
      {
        id: 'voting_defense_strategy',
        prompt: "What would you do if you found out someone was coming for you?",
        tone: 'defensive',
        category: 'voting' as const,
        contextual: false,
        editPotential: 7,
        suggestedTones: ['defensive', 'strategic']
      }
    ];

    if (upcomingElimination) {
      prompts.push({
        id: 'voting_elimination_tomorrow',
        prompt: "Elimination is tomorrow. How confident are you that you're safe?",
        tone: 'nervous',
        category: 'voting' as const,
        contextual: true,
        editPotential: 9,
        suggestedTones: ['nervous', 'strategic']
      });
    }

    if (gameState.immunityWinner === gameState.playerName) {
      prompts.push({
        id: 'voting_immunity_strategy',
        prompt: "You won immunity this week. How does that change your strategy?",
        tone: 'confident',
        category: 'voting' as const,
        contextual: true,
        editPotential: 8,
        suggestedTones: ['confident', 'strategic']
      });
    }

    this.promptPool.push(...prompts);
  }

  private static addReflectionPrompts(gameState: GameState, remainingCount: number, juryPhase: boolean) {
    const prompts = [
      {
        id: 'reflection_biggest_mistake',
        prompt: "What's been your biggest mistake so far in this game?",
        tone: 'regretful',
        category: 'reflection' as const,
        contextual: false,
        editPotential: 7,
        suggestedTones: ['regretful', 'honest']
      },
      {
        id: 'reflection_proudest_move',
        prompt: "What move are you most proud of?",
        tone: 'confident',
        category: 'reflection' as const,
        contextual: false,
        editPotential: 8,
        suggestedTones: ['confident', 'proud']
      },
      {
        id: 'reflection_perception',
        prompt: "How do you think you're being perceived by the other contestants?",
        tone: 'analytical',
        category: 'reflection' as const,
        contextual: false,
        editPotential: 6,
        suggestedTones: ['analytical', 'vulnerable']
      },
      {
        id: 'reflection_day_one_advice',
        prompt: "What would you tell your day-one self if you could?",
        tone: 'wise',
        category: 'reflection' as const,
        contextual: false,
        editPotential: 5,
        suggestedTones: ['wise', 'reflective']
      }
    ];

    if (remainingCount <= 8) {
      prompts.push({
        id: 'reflection_early_game_changes',
        prompt: "Looking back, what would you have done differently in the early game?",
        tone: 'reflective',
        category: 'reflection' as const,
        contextual: true,
        editPotential: 6,
        suggestedTones: ['reflective', 'regretful']
      });
    }

    if (juryPhase) {
      prompts.push({
        id: 'reflection_jury_perception',
        prompt: "We're in jury phase now. How do you think the jury perceives your game?",
        tone: 'concerned',
        category: 'reflection' as const,
        contextual: true,
        editPotential: 9,
        suggestedTones: ['concerned', 'strategic']
      });
    }

    this.promptPool.push(...prompts);
  }

  private static addGeneralPrompts(gameState: GameState) {
    const editPersona = gameState.editPerception.persona;
    
    const prompts = [
      {
        id: 'general_season_legacy',
        prompt: "How do you think you'll be remembered this season?",
        tone: 'thoughtful',
        category: 'general' as const,
        contextual: false,
        editPotential: 6,
        suggestedTones: ['thoughtful', 'confident']
      },
      {
        id: 'general_fan_message',
        prompt: "What's the most important thing fans should know about your game?",
        tone: 'passionate',
        category: 'general' as const,
        contextual: false,
        editPotential: 7,
        suggestedTones: ['passionate', 'honest']
      },
      {
        id: 'general_winning_argument',
        prompt: "If you make it to the end, what would your winning argument be?",
        tone: 'confident',
        category: 'general' as const,
        contextual: false,
        editPotential: 9,
        suggestedTones: ['confident', 'strategic']
      },
      {
        id: 'general_biggest_surprise',
        prompt: "What's surprised you most about this experience?",
        tone: 'surprised',
        category: 'general' as const,
        contextual: false,
        editPotential: 5,
        suggestedTones: ['surprised', 'honest']
      }
    ];

    // Persona-specific prompts
    if (editPersona === 'Villain') {
      prompts.push({
        id: 'general_villain_edit',
        prompt: "You're being painted as a villain in the edit. How do you feel about that?",
        tone: 'defensive',
        category: 'general' as const,
        contextual: true,
        editPotential: 8,
        suggestedTones: ['defensive', 'honest']
      });
    } else if (editPersona === 'Hero') {
      prompts.push({
        id: 'general_hero_pressure',
        prompt: "You're being portrayed as a hero. Is that pressure affecting your game?",
        tone: 'honest',
        category: 'general' as const,
        contextual: true,
        editPotential: 7,
        suggestedTones: ['honest', 'vulnerable']
      });
    } else if (editPersona === 'Underedited') {
      prompts.push({
        id: 'general_screen_time',
        prompt: "You haven't been getting much screen time. What do you think viewers are missing about your game?",
        tone: 'frustrated',
        category: 'general' as const,
        contextual: true,
        editPotential: 6,
        suggestedTones: ['frustrated', 'strategic']
      });
    }

    this.promptPool.push(...prompts);
  }

  static markPromptUsed(prompt: string) {
    this.usedPrompts.add(prompt);
    
    // Keep only the last 20 used prompts to allow cycling
    if (this.usedPrompts.size > 20) {
      const usedArray = Array.from(this.usedPrompts);
      this.usedPrompts = new Set(usedArray.slice(-15));
    }
  }

  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static getPromptsByCategory(category: string, gameState: GameState): DynamicConfessionalPrompt[] {
    const allPrompts = this.generateDynamicPrompts(gameState);
    return allPrompts.filter(p => p.category === category);
  }

  static resetUsedPrompts() {
    this.usedPrompts.clear();
  }
}

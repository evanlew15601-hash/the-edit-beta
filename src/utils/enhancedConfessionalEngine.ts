
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
  static generateDynamicPrompts(gameState: GameState): DynamicConfessionalPrompt[] {
    const prompts: DynamicConfessionalPrompt[] = [];
    const activeContestants = gameState.contestants.filter(c => !c.isEliminated);
    const playerAlliances = gameState.alliances.filter(a => a.members.includes(gameState.playerName));
    const daysToElimination = gameState.nextEliminationDay - gameState.currentDay;

    // Strategy prompts
    if (activeContestants.length <= 8) {
      prompts.push({
        id: 'endgame-strategy',
        category: 'strategy',
        prompt: "We're getting down to the final players. What's your strategy to make it to the end?",
        followUp: "Who do you see as your biggest competition?",
        suggestedTones: ['strategic', 'dramatic'],
        editPotential: 8
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

    // Threat assessment
    const competitionThreats = activeContestants.filter(c => 
      c.name !== gameState.playerName && c.psychProfile && 
      c.psychProfile.disposition && c.psychProfile.disposition.includes('competitive')
    );

    if (competitionThreats.length > 0) {
      const threat = competitionThreats[0];
      prompts.push({
        id: 'competition-threat',
        category: 'strategy',
        prompt: `${threat.name} has been winning a lot of competitions. Are they someone you need to worry about?`,
        followUp: "When would be the right time to make a move against them?",
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

    // Add more variety to prevent repetition
    const additionalPrompts: DynamicConfessionalPrompt[] = [
      {
        id: 'underestimated',
        category: 'strategy' as const,
        prompt: "Do you think people are underestimating you? Why or why not?",
        suggestedTones: ['strategic', 'dramatic', 'aggressive'],
        editPotential: 7
      },
      {
        id: 'jury-management',
        category: 'strategy' as const,
        prompt: "Are you thinking about how your moves will be perceived by the jury?",
        suggestedTones: ['strategic', 'vulnerable'],
        editPotential: 6
      },
      {
        id: 'biggest-mistake',
        category: 'reflection' as const,
        prompt: "What's been your biggest mistake in the game so far?",
        suggestedTones: ['vulnerable', 'strategic'],
        editPotential: 5
      }
    ];

    prompts.push(...additionalPrompts);

    // Return a random selection to ensure variety
    const shuffled = [...prompts].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  }
}

import { GameState, Contestant, Confessional } from '@/types/game';
import { memoryEngine } from '@/utils/memoryEngine';
import { MemoryQuery } from '@/types/memory';

export interface ConfessionalPrompt {
  id: string;
  category: 'strategy' | 'relationships' | 'emotions' | 'current_events' | 'game_reflection';
  prompt: string;
  followUp?: string;
  suggestedTones: string[];
  editPotential: number; // 1-10 scale for how likely this is to make the edit
}

export class ConfessionalEngine {
  
  static generateDynamicPrompts(gameState: GameState): ConfessionalPrompt[] {
    const prompts: ConfessionalPrompt[] = [];
    const { contestants, currentDay, alliances, votingHistory, editPerception, interactionLog } = gameState;
    const activeContestants = contestants.filter(c => !c.isEliminated);
    
    // Get memory-driven context
    const playerMemory = memoryEngine.queryMemory(gameState.playerName, {
      dayRange: { start: currentDay - 3, end: currentDay },
      minImportance: 5
    });

    const recentAlliances = alliances.filter(a => 
      a.members.includes(gameState.playerName) && a.lastActivity >= currentDay - 3
    );

    const upcomingElimination = currentDay >= gameState.nextEliminationDay - 1;
    
    // Strategy prompts based on game state
    if (currentDay > 5 && alliances.length > 0) {
      prompts.push({
        id: 'alliance_dynamics',
        category: 'strategy',
        prompt: `Talk about your alliance strategy. Who do you trust, and who might you need to cut loose?`,
        followUp: 'How are you positioning yourself for the long game?',
        suggestedTones: ['strategic', 'dramatic', 'aggressive'],
        editPotential: 8
      });
    }

    // Relationship dynamics
    const highTrustContestants = activeContestants.filter(c => 
      c.psychProfile.trustLevel > 50 && c.psychProfile.emotionalCloseness > 40
    );
    if (highTrustContestants.length > 0) {
      const targetName = highTrustContestants[Math.floor(Math.random() * highTrustContestants.length)].name;
      prompts.push({
        id: 'close_bond',
        category: 'relationships',
        prompt: `You seem close with ${targetName}. How real is this connection versus strategy?`,
        followUp: 'Are you worried about getting too attached?',
        suggestedTones: ['vulnerable', 'strategic', 'humorous'],
        editPotential: 7
      });
    }

    // Threat assessment
    const highSuspicionContestants = activeContestants.filter(c => 
      c.psychProfile.suspicionLevel > 60
    );
    if (highSuspicionContestants.length > 0) {
      const threatName = highSuspicionContestants[Math.floor(Math.random() * highSuspicionContestants.length)].name;
      prompts.push({
        id: 'threat_assessment',
        category: 'strategy',
        prompt: `${threatName} seems to be playing hard. Are they a threat you need to deal with?`,
        followUp: 'What\'s your move against them?',
        suggestedTones: ['strategic', 'aggressive', 'dramatic'],
        editPotential: 9
      });
    }

    // Current edit perception response
    if (editPerception.persona === 'Villain') {
      prompts.push({
        id: 'villain_defense',
        category: 'emotions',
        prompt: `Some people might see you as the villain. How do you feel about that perception?`,
        followUp: 'Are you playing up to it or trying to change it?',
        suggestedTones: ['aggressive', 'vulnerable', 'strategic'],
        editPotential: 8
      });
    } else if (editPerception.screenTimeIndex < 30) {
      prompts.push({
        id: 'underdog_story',
        category: 'emotions',
        prompt: `You've been flying under the radar. Is that intentional, or do you wish you had more influence?`,
        followUp: 'When do you plan to make your move?',
        suggestedTones: ['strategic', 'vulnerable', 'dramatic'],
        editPotential: 6
      });
    }

    // Dynamic prompts based on recent player activity
    const recentActions = interactionLog?.filter(log => 
      log.day >= currentDay - 2 && 
      log.participants.includes(gameState.playerName)
    ) || [];

    // Scheme-based prompts
    const recentSchemes = recentActions.filter(a => a.type === 'scheme');
    if (recentSchemes.length > 0) {
      prompts.push({
        id: 'scheme_reflection',
        category: 'strategy',
        prompt: `You've been making some strategic moves lately. Walk us through your thought process.`,
        followUp: 'Do you think anyone suspects what you\'re up to?',
        suggestedTones: ['strategic', 'dramatic', 'evasive'],
        editPotential: 9
      });
    }

    // Conversation aftermath
    const recentConversations = recentActions.filter(a => a.type === 'talk');
    if (recentConversations.length > 1) {
      const recentPartner = recentConversations[recentConversations.length - 1].participants.find(p => p !== gameState.playerName);
      prompts.push({
        id: 'conversation_debrief',
        category: 'relationships', 
        prompt: `You've been talking a lot with ${recentPartner} lately. What's your read on them?`,
        followUp: 'Are they someone you can work with long-term?',
        suggestedTones: ['strategic', 'vulnerable', 'humorous'],
        editPotential: 7
      });
    }

    // Information sharing follow-up
    const recentInfoSharing = recentActions.filter(a => a.type === 'dm');
    if (recentInfoSharing.length > 0) {
      prompts.push({
        id: 'information_strategy',
        category: 'strategy',
        prompt: `You've been sharing some intel around the house. What's your information strategy?`,
        followUp: 'Are you trying to build trust or create chaos?',
        suggestedTones: ['strategic', 'dramatic', 'aggressive'],
        editPotential: 8
      });
    }

    // Voting week intensity
    if (currentDay >= gameState.nextEliminationDay - 2) {
      prompts.push({
        id: 'voting_pressure',
        category: 'current_events',
        prompt: `Elimination is coming up soon. How are you feeling about the vote?`,
        followUp: 'Do you know where you stand with people?',
        suggestedTones: ['vulnerable', 'strategic', 'dramatic'],
        editPotential: 8
      });
    }

    // Late game prompts
    if (activeContestants.length <= 8) {
      prompts.push({
        id: 'endgame_strategy',
        category: 'strategy',
        prompt: `We're getting to the business end. Who are you taking to the finale and why?`,
        followUp: 'What\'s your pitch to the jury?',
        suggestedTones: ['strategic', 'dramatic'],
        editPotential: 9
      });
    }

    // Emotional check-ins
    prompts.push({
      id: 'homesick',
      category: 'emotions',
      prompt: `Day ${currentDay} in the house. How are you holding up mentally and emotionally?`,
      followUp: 'What\'s keeping you motivated?',
      suggestedTones: ['vulnerable', 'humorous', 'strategic'],
      editPotential: 5
    });

    // Wild card dramatic prompts
    if (Math.random() < 0.3) { // 30% chance for spicy prompts
      const randomContestant = activeContestants[Math.floor(Math.random() * activeContestants.length)];
      prompts.push({
        id: 'hot_take',
        category: 'current_events',
        prompt: `Give me your honest, unfiltered opinion about ${randomContestant.name}.`,
        followUp: 'What would happen if they heard you say that?',
        suggestedTones: ['aggressive', 'dramatic', 'humorous'],
        editPotential: 8
      });
    }

    // Meta game awareness
    if (currentDay > 10) {
      prompts.push({
        id: 'edit_awareness',
        category: 'game_reflection',
        prompt: `How do you think America is seeing your game right now?`,
        followUp: 'Are you playing for the cameras or staying true to yourself?',
        suggestedTones: ['strategic', 'vulnerable', 'humorous'],
        editPotential: 7
      });
    }

    // Memory-driven prompts
    prompts.push(...this.generateMemoryBasedPrompts(playerMemory, gameState));
    
    // Alliance-driven prompts
    prompts.push(...this.generateAlliancePrompts(recentAlliances, gameState));
    
    // Voting strategy prompts
    prompts.push(...this.generateVotingPrompts(votingHistory.slice(-2), upcomingElimination, gameState));

    return prompts.slice(0, 8); // Increased variety
  }

  private static generateMemoryBasedPrompts(playerMemory: any, gameState: GameState): ConfessionalPrompt[] {
    const prompts: ConfessionalPrompt[] = [];

    // Recent betrayals or promises
    playerMemory.events.filter((e: any) => e.type === 'betrayal' || e.type === 'promise').forEach((event: any) => {
      prompts.push({
        id: `memory-${event.id}`,
        category: 'strategy',
        prompt: `Talk about ${event.content.toLowerCase()}. How does this affect your game moving forward?`,
        suggestedTones: ['strategic', 'vulnerable', 'aggressive'],
        editPotential: 8
      });
    });

    // Recent conversations with high emotional impact
    playerMemory.events.filter((e: any) => Math.abs(e.emotionalImpact) > 5).forEach((event: any) => {
      prompts.push({
        id: `emotional-${event.id}`,
        category: 'relationships',
        prompt: `Reflect on your recent interaction with ${event.participants.join(' and ')}. What's your read on them now?`,
        suggestedTones: ['vulnerable', 'strategic', 'humorous'],
        editPotential: 7
      });
    });

    return prompts;
  }

  private static generateAlliancePrompts(alliances: any[], gameState: GameState): ConfessionalPrompt[] {
    const prompts: ConfessionalPrompt[] = [];

    alliances.forEach(alliance => {
      prompts.push({
        id: `alliance-${alliance.id}`,
        category: 'strategy',
        prompt: `How solid is your alliance with ${alliance.members.filter((m: string) => m !== gameState.playerName).join(', ')}? Can you trust them going forward?`,
        suggestedTones: ['strategic', 'vulnerable'],
        editPotential: 8
      });
    });

    return prompts;
  }

  private static generateVotingPrompts(recentVotes: any[], upcomingElimination: boolean, gameState: GameState): ConfessionalPrompt[] {
    const prompts: ConfessionalPrompt[] = [];

    if (upcomingElimination) {
      prompts.push({
        id: 'voting-plan',
        category: 'strategy',
        prompt: 'Who are you thinking of voting for in the upcoming elimination? Walk us through your reasoning.',
        suggestedTones: ['strategic', 'dramatic'],
        editPotential: 9
      });

      prompts.push({
        id: 'safety-concern',
        category: 'emotions',
        prompt: 'How safe do you feel going into this vote? What are your biggest concerns?',
        suggestedTones: ['vulnerable', 'strategic'],
        editPotential: 8
      });
    }

    if (recentVotes.length > 0) {
      const lastVote = recentVotes[recentVotes.length - 1];
      prompts.push({
        id: 'vote-reflection',
        category: 'game_reflection',
        prompt: `Looking back at the ${lastVote.eliminated} elimination, do you think you made the right choice? Any regrets?`,
        suggestedTones: ['strategic', 'vulnerable', 'defensive'],
        editPotential: 7
      });
    }

    return prompts;
  }

  static selectConfessionalForEdit(confessional: Confessional, gameState: GameState): boolean {
    // Base selection chance based on tone
    let selectionChance = 0.6; // 60% base chance
    
    switch (confessional.tone) {
      case 'dramatic':
        selectionChance = 0.85;
        break;
      case 'aggressive':
        selectionChance = 0.8;
        break;
      case 'strategic':
        selectionChance = 0.7;
        break;
      case 'vulnerable':
        selectionChance = 0.65;
        break;
      case 'humorous':
        selectionChance = 0.6;
        break;
      case 'evasive':
        selectionChance = 0.3;
        break;
    }

    // Adjust based on edit perception
    if (gameState.editPerception.screenTimeIndex < 20) {
      selectionChance *= 0.5; // Ghosted players rarely get confessionals aired
    } else if (gameState.editPerception.screenTimeIndex > 70) {
      selectionChance *= 1.3; // Main characters get more confessionals
    }

    // Content quality matters
    const wordCount = confessional.content.split(' ').length;
    if (wordCount < 20) {
      selectionChance *= 0.7; // Short confessionals less likely
    } else if (wordCount > 50) {
      selectionChance *= 1.2; // Substantial content more likely
    }

    // Drama factor - check if confessional mentions other contestants
    const activeContestants = gameState.contestants.filter(c => !c.isEliminated);
    const mentionsContestants = activeContestants.some(c => 
      confessional.content.toLowerCase().includes(c.name.toLowerCase())
    );
    if (mentionsContestants) {
      selectionChance *= 1.4; // Confessionals about other people are TV gold
    }

    // Random factor to keep it unpredictable
    return Math.random() < Math.min(0.95, selectionChance);
  }

  static calculateEditImpact(confessional: Confessional, gameState: GameState, madeEdit: boolean): number {
    if (!madeEdit) return 0; // No impact if not aired
    
    let impact = 0;
    
    // Base impact from tone
    switch (confessional.tone) {
      case 'dramatic':
        impact = 15;
        break;
      case 'aggressive':
        impact = 12;
        break;
      case 'strategic':
        impact = 8;
        break;
      case 'vulnerable':
        impact = 6;
        break;
      case 'humorous':
        impact = 5;
        break;
      case 'evasive':
        impact = 2;
        break;
    }

    // Content multipliers
    const wordCount = confessional.content.split(' ').length;
    if (wordCount > 60) impact *= 1.3;
    if (wordCount < 15) impact *= 0.6;

    // Timing matters
    const daysToElimination = gameState.nextEliminationDay - gameState.currentDay;
    if (daysToElimination <= 2) {
      impact *= 1.5; // Pre-elimination confessionals hit harder
    }

    // Late game amplification
    const activeContestants = gameState.contestants.filter(c => !c.isEliminated).length;
    if (activeContestants <= 6) {
      impact *= 1.4; // End game confessionals matter more
    }

    return Math.round(impact);
  }

  static generateAudienceScore(confessional: Confessional, editImpact: number): number {
    let score = 50; // Neutral baseline
    
    // Tone affects audience reception
    switch (confessional.tone) {
      case 'vulnerable':
        score += 25;
        break;
      case 'humorous':
        score += 20;
        break;
      case 'strategic':
        score += 10;
        break;
      case 'dramatic':
        score += 5;
        break;
      case 'aggressive':
        score -= 15;
        break;
      case 'evasive':
        score -= 10;
        break;
    }

    // Edit impact affects visibility and therefore audience reaction
    score += editImpact * 2;

    // Content analysis - positive vs negative language (simplified)
    const content = confessional.content.toLowerCase();
    const positiveWords = ['love', 'trust', 'friend', 'happy', 'grateful', 'proud'];
    const negativeWords = ['hate', 'annoying', 'stupid', 'fake', 'backstab', 'eliminate'];
    
    const positiveCount = positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = negativeWords.filter(word => content.includes(word)).length;
    
    score += positiveCount * 3 - negativeCount * 5;

    return Math.max(0, Math.min(100, score));
  }
}

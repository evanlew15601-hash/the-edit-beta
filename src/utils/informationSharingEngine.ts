import { GameState, Contestant, Alliance } from '@/types/game';
import { relationshipGraphEngine } from './relationshipGraphEngine';

export interface IntelligenceItem {
  source: string;
  target?: string;
  type: 'voting_plan' | 'alliance_info' | 'threat_assessment' | 'personal_info' | 'strategy_intel';
  content: string;
  reliability: number; // 0-100
  day: number;
  valuable: boolean;
  gameRelevant: boolean; // Whether it affects actual gameplay
}

export function generateIntelligenceNetwork(gameState: GameState): IntelligenceItem[] {
  const { contestants, playerName, currentDay, alliances, interactionLog = [], votingHistory } = gameState;
  const activeContestants = contestants.filter(c => !c.isEliminated && c.name !== playerName);
  const intelligence: IntelligenceItem[] = [];

  // Get recent player interactions for dynamic info sharing
  const recentPlayerInteractions = interactionLog
    .filter(entry => entry.day >= currentDay - 2 && entry.participants.includes(playerName))
    .slice(-10);

  activeContestants.forEach(contestant => {
    const relationship = relationshipGraphEngine.getRelationship(playerName, contestant.name);
    if (!relationship) return;

    // Dynamic information sharing based on recent interactions
    const hasRecentConversation = recentPlayerInteractions.some(entry => 
      entry.participants.includes(contestant.name) && 
      (entry.type === 'talk' || entry.type === 'alliance_meeting')
    );

    const hasSharedActivity = recentPlayerInteractions.some(entry =>
      entry.participants.includes(contestant.name) && 
      entry.type === 'activity'
    );

    const isInSameAlliance = alliances.some(alliance => 
      alliance.members.includes(playerName) && alliance.members.includes(contestant.name)
    );

    // People share info if:
    // 1. You've talked recently (conversation creates openness)
    // 2. You've done activities together (builds rapport)
    // 3. You're in the same alliance (strategic sharing)
    // 4. They have strategic reasons to share (warning about threats, seeking validation)
    const shouldShare = hasRecentConversation || hasSharedActivity || isInSameAlliance || 
                       Math.random() < 0.4; // Base chance for strategic sharing

    if (shouldShare) {
      const intel = generateContextualIntel(contestant.name, gameState, relationship, recentPlayerInteractions);
      if (intel) {
        intelligence.push(intel);
      }
    }
  });

  // Add overheard intel (doesn't require direct interaction)
  if (Math.random() < 0.7) {
    const overheardIntel = generateOverheardIntel(gameState);
    if (overheardIntel) {
      intelligence.push(overheardIntel);
    }
  }

  return intelligence.slice(0, 8); // Show more intel
}

function generateContextualIntel(source: string, gameState: GameState, relationship: any, recentInteractions: any[]): IntelligenceItem | null {
  const { contestants, currentDay, alliances, nextEliminationDay, votingHistory, interactionLog = [] } = gameState;
  const activeContestants = contestants.filter(c => !c.isEliminated);
  const daysUntilElimination = nextEliminationDay - currentDay;
  
  // Determine what type of intel this person would realistically share
  const intelContext = determineIntelContext(source, gameState, recentInteractions);
  
  // Accuracy based on trust and context - people lie when they have strategic reasons
  const baseAccuracy = 70 + (relationship.trust * 0.3) + (relationship.emotionalCloseness * 0.2);
  const contextualAccuracy = adjustAccuracyForContext(baseAccuracy, intelContext, gameState, source);
  
  const reliability = Math.min(95, contextualAccuracy);
  const valuable = reliability > 60 || intelContext.urgent;

  switch (intelContext.type) {
    case 'voting_plan':
      return generateVotingIntel(source, gameState, reliability, intelContext);
    
    case 'alliance_info':
      return generateAllianceIntel(source, gameState, reliability, intelContext);
    
    case 'threat_assessment':
      return generateThreatIntel(source, gameState, reliability, intelContext);
    
    case 'strategy_intel':
      return generateStrategyIntel(source, gameState, reliability, intelContext);
    
    default:
      return null;
  }
}

function determineIntelContext(source: string, gameState: GameState, recentInteractions: any[]) {
  const { contestants, currentDay, alliances, nextEliminationDay, interactionLog = [] } = gameState;
  const daysUntilElimination = nextEliminationDay - currentDay;
  
  // Recent conflicts involving this person
  const recentConflicts = interactionLog
    .filter(entry => entry.day >= currentDay - 2 && 
      entry.participants.includes(source) && 
      entry.tone === 'aggressive')
    .length;

  // Alliance status
  const sourceAlliances = alliances.filter(a => a.members.includes(source));
  const isInMultipleAlliances = sourceAlliances.length > 1;
  const isAllianceless = sourceAlliances.length === 0;

  // Recent schemes or strategic moves
  const recentSchemes = interactionLog
    .filter(entry => entry.day >= currentDay - 1 && 
      entry.participants.includes(source) && 
      entry.type === 'scheme')
    .length;

  // Determine what they'd naturally want to share
  if (daysUntilElimination <= 2 && recentConflicts > 0) {
    return { type: 'voting_plan', urgent: true, reason: 'elimination_pressure' };
  }
  
  if (isInMultipleAlliances || recentSchemes > 0) {
    return { type: 'strategy_intel', urgent: false, reason: 'strategic_positioning' };
  }
  
  if (isAllianceless && daysUntilElimination <= 3) {
    return { type: 'alliance_info', urgent: true, reason: 'seeking_safety' };
  }
  
  return { type: 'threat_assessment', urgent: false, reason: 'general_strategy' };
}

function adjustAccuracyForContext(baseAccuracy: number, context: any, gameState: GameState, source: string): number {
  let accuracy = baseAccuracy;
  
  // People are more honest when:
  // - They're in danger (seeking help)
  // - Warning about mutual threats
  // - Sharing alliance information with allies
  if (context.urgent || context.reason === 'seeking_safety') {
    accuracy += 20;
  }
  
  // People are less honest when:
  // - They're in multiple alliances (playing multiple sides)
  // - They have strategic reasons to mislead
  if (context.reason === 'strategic_positioning') {
    accuracy -= 15;
  }
  
  // Check if they have reason to lie to the player specifically
  const relationship = relationshipGraphEngine.getRelationship(gameState.playerName, source);
  if (relationship && relationship.trust < 30) {
    accuracy -= 10; // Less likely to be fully honest with people they don't trust
  }
  
  return Math.max(30, Math.min(95, accuracy));
}

function generateVotingIntel(source: string, gameState: GameState, reliability: number, context: any): IntelligenceItem {
  const { contestants, currentDay, interactionLog = [] } = gameState;
  const activeContestants = contestants.filter(c => !c.isEliminated && c.name !== source && c.name !== gameState.playerName);
  
  // Base target on recent conflicts or strategic positioning
  let target = activeContestants[Math.floor(Math.random() * activeContestants.length)];
  
  const recentConflicts = interactionLog
    .filter(entry => entry.day >= currentDay - 2 && 
      entry.participants.includes(source) && 
      entry.tone === 'aggressive')
    .map(entry => entry.participants.find(p => p !== source))
    .filter(p => p && activeContestants.some(c => c.name === p));
  
  if (recentConflicts.length > 0) {
    const conflictTarget = activeContestants.find(c => c.name === recentConflicts[0]);
    if (conflictTarget) target = conflictTarget;
  }

  const votingIntel = [
    `is planning to vote ${target.name} out next`,
    `thinks ${target.name} needs to go before final five`,
    `is trying to get people to vote against ${target.name}`,
    `wants ${target.name} eliminated because they're a threat`,
    `has been campaigning against ${target.name}`,
    `told me ${target.name} is their target`
  ];

  return {
    source,
    target: target.name,
    type: 'voting_plan',
    content: `${source} ${votingIntel[Math.floor(Math.random() * votingIntel.length)]}`,
    reliability,
    day: currentDay,
    valuable: true,
    gameRelevant: true
  };
}

function generateAllianceIntel(source: string, gameState: GameState, reliability: number, context: any): IntelligenceItem {
  const { alliances, contestants } = gameState;
  const sourceAlliances = alliances.filter(a => a.members.includes(source));
  
  let content = '';
  if (sourceAlliances.length === 0) {
    content = `${source} is desperately looking for an alliance - feels completely exposed`;
  } else if (sourceAlliances.length > 1) {
    const allianceNames = sourceAlliances.map(a => a.members.filter(m => m !== source).join(' and '));
    content = `${source} is playing multiple sides - has deals with ${allianceNames[0]} and others`;
  } else {
    const otherMembers = sourceAlliances[0].members.filter(m => m !== source && m !== gameState.playerName);
    if (otherMembers.length > 0) {
      content = `${source} is worried their alliance with ${otherMembers.join(' and ')} is falling apart`;
    } else {
      content = `${source} feels like their alliance is crumbling`;
    }
  }

  return {
    source,
    type: 'alliance_info',
    content,
    reliability,
    day: gameState.currentDay,
    valuable: true,
    gameRelevant: true
  };
}

function generateThreatIntel(source: string, gameState: GameState, reliability: number, context: any): IntelligenceItem {
  const activeContestants = gameState.contestants.filter(c => !c.isEliminated && c.name !== source && c.name !== gameState.playerName);
  const threats = activeContestants.sort((a, b) => (b.psychProfile?.trustLevel || 0) - (a.psychProfile?.trustLevel || 0));
  
  if (threats.length === 0) return null;
  
  const mainThreat = threats[0];
  const threatAssessments = [
    `thinks ${mainThreat.name} is going to win if they make it to the end`,
    `is scared of ${mainThreat.name}'s social game`,
    `believes ${mainThreat.name} has too many allies`,
    `wants ${mainThreat.name} out before it's too late`,
    `sees ${mainThreat.name} as the biggest competition`
  ];

  return {
    source,
    target: mainThreat.name,
    type: 'threat_assessment', 
    content: `${source} ${threatAssessments[Math.floor(Math.random() * threatAssessments.length)]}`,
    reliability,
    day: gameState.currentDay,
    valuable: true,
    gameRelevant: true
  };
}

function generateStrategyIntel(source: string, gameState: GameState, reliability: number, context: any): IntelligenceItem {
  const strategicMoves = [
    `is planning to make a big move soon`,
    `thinks this is the perfect time to flip the game`,
    `wants to break up the power couples`,
    `is looking for the right moment to strike`,
    `thinks someone needs to shake up the game`
  ];

  return {
    source,
    type: 'strategy_intel',
    content: `${source} ${strategicMoves[Math.floor(Math.random() * strategicMoves.length)]}`,
    reliability,
    day: gameState.currentDay,
    valuable: reliability > 70,
    gameRelevant: true
  };
}

function generateOverheardIntel(gameState: GameState): IntelligenceItem | null {
  const { contestants, playerName, currentDay, alliances, interactionLog = [] } = gameState;
  const activeContestants = contestants.filter(c => !c.isEliminated && c.name !== playerName);
  
  if (activeContestants.length < 2) return null;
  
  // Base overheard intel on recent actual interactions
  const recentInteractions = interactionLog
    .filter(entry => entry.day >= currentDay - 1 && entry.participants.length >= 2)
    .slice(-5);
  
  let source1, source2;
  
  if (recentInteractions.length > 0) {
    const interaction = recentInteractions[Math.floor(Math.random() * recentInteractions.length)];
    const participants = interaction.participants.filter(p => p !== playerName);
    if (participants.length >= 2) {
      source1 = participants[0];
      source2 = participants[1];
    }
  }
  
  if (!source1 || !source2) {
    source1 = activeContestants[Math.floor(Math.random() * activeContestants.length)].name;
    const remainingContestants = activeContestants.filter(c => c.name !== source1);
    source2 = remainingContestants[Math.floor(Math.random() * remainingContestants.length)].name;
  }
  
  const overheardIntel = [
    `overheard ${source1} and ${source2} planning their next move`,
    `saw ${source1} warning ${source2} about someone targeting them`,
    `caught ${source1} trying to convince ${source2} to vote together`,
    `heard ${source1} telling ${source2} they can't trust anyone else`,
    `witnessed ${source1} and ${source2} discussing who to eliminate next`,
    `saw ${source1} and ${source2} making a deal`
  ];
  
  return {
    source: 'Overheard',
    type: 'alliance_info',
    content: overheardIntel[Math.floor(Math.random() * overheardIntel.length)],
    reliability: 55 + Math.random() * 30, // 55-85% reliability
    day: currentDay,
    valuable: true,
    gameRelevant: true
  };
}
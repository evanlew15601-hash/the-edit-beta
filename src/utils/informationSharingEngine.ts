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

  // Recent player interactions for context
  const recentPlayerActions = interactionLog
    .filter(entry => entry.day >= currentDay - 3 && entry.participants.includes(playerName))
    .slice(-8);

  activeContestants.forEach(contestant => {
    const relationship = relationshipGraphEngine.getRelationship(playerName, contestant.name);
    if (!relationship) return;

    // Much lower threshold - people share info more freely
    const trustThreshold = 25; // Lowered significantly 
    const sharingProbability = Math.max(0.3, (relationship.trust + relationship.emotionalCloseness) / 120);
    
    if (relationship.trust >= trustThreshold || Math.random() < sharingProbability) {
      // Generate actual game-relevant intel
      const intel = generateGameRelevantIntel(contestant.name, gameState, relationship);
      if (intel && intel.gameRelevant) {
        intelligence.push(intel);
      }
    }
  });

  // Add strategic "overheard" intel with varying reliability
  if (Math.random() < 0.6) {
    const overheardIntel = generateStrategicOverheardIntel(gameState);
    if (overheardIntel) {
      intelligence.push(overheardIntel);
    }
  }

  return intelligence.slice(0, 6); // Show most relevant intel
}

function generateGameRelevantIntel(source: string, gameState: GameState, relationship: any): IntelligenceItem | null {
  const { contestants, currentDay, alliances, nextEliminationDay, votingHistory, interactionLog = [] } = gameState;
  const activeContestants = contestants.filter(c => !c.isEliminated);
  const daysUntilElimination = nextEliminationDay - currentDay;
  
  // Focus heavily on game-relevant information
  const intelTypes = [
    { type: 'voting_plan', weight: daysUntilElimination <= 3 ? 50 : 30 },
    { type: 'alliance_info', weight: 30 },
    { type: 'threat_assessment', weight: 20 }
  ];

  const totalWeight = intelTypes.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  let selectedType = 'voting_plan';

  for (const intel of intelTypes) {
    random -= intel.weight;
    if (random <= 0) {
      selectedType = intel.type;
      break;
    }
  }

  const reliability = Math.min(95, 60 + relationship.trust * 0.4 + relationship.emotionalCloseness * 0.3);
  const valuable = reliability > 65;

  // Generate content based on actual game state and interactions
  switch (selectedType) {
    case 'voting_plan':
      const potentialTargets = activeContestants.filter(c => c.name !== source && c.name !== gameState.playerName);
      if (potentialTargets.length === 0) return null;
      
      // Try to base voting intel on recent interactions or alliances
      let target = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
      
      // If there are recent negative interactions, use those for more realistic intel
      const recentConflicts = interactionLog
        .filter(entry => entry.day >= currentDay - 2 && 
          entry.participants.includes(source) && 
          (entry.type === 'scheme' || entry.tone === 'aggressive'))
        .map(entry => entry.participants.find(p => p !== source))
        .filter(p => p && potentialTargets.some(t => t.name === p));
      
      if (recentConflicts.length > 0) {
        const conflictTarget = potentialTargets.find(t => t.name === recentConflicts[0]);
        if (conflictTarget) target = conflictTarget;
      }
      
      const votingPlans = [
        `has been talking about voting ${target.name} out`,
        `thinks ${target.name} is the biggest threat right now`,
        `is trying to rally votes against ${target.name}`,
        `wants ${target.name} gone before they get to the end`
      ];
      
      return {
        source,
        target: target.name,
        type: 'voting_plan',
        content: `${source} ${votingPlans[Math.floor(Math.random() * votingPlans.length)]}`,
        reliability,
        day: currentDay,
        valuable,
        gameRelevant: true
      };

    case 'alliance_info':
      // Base alliance intel on actual alliance status
      const sourceAlliances = alliances.filter(a => a.members.includes(source));
      let allianceContent = '';
      
      if (sourceAlliances.length === 0) {
        allianceContent = `${source} is looking to form a new alliance - they feel vulnerable`;
      } else if (sourceAlliances.length > 1) {
        allianceContent = `${source} might be playing multiple alliances against each other`;
      } else {
        const otherMembers = sourceAlliances[0].members.filter(m => m !== source && m !== gameState.playerName);
        if (otherMembers.length > 0) {
          allianceContent = `${source} is concerned about loyalty within their alliance with ${otherMembers[0]}`;
        } else {
          allianceContent = `${source} feels their alliance is getting weaker`;
        }
      }
      
      return {
        source,
        type: 'alliance_info',
        content: allianceContent,
        reliability,
        day: currentDay,
        valuable,
        gameRelevant: true
      };

    case 'threat_assessment':
      // Base threat assessment on game positioning
      const threats = activeContestants
        .filter(c => c.name !== source && c.name !== gameState.playerName)
        .sort((a, b) => (b.psychProfile?.trustLevel || 0) - (a.psychProfile?.trustLevel || 0));
      
      if (threats.length === 0) return null;
      
      const mainThreat = threats[0];
      const assessments = [
        `thinks ${mainThreat.name} is getting too close to the end`,
        `sees ${mainThreat.name} as the person to beat`,
        `is worried ${mainThreat.name} has too much influence`,
        `believes ${mainThreat.name} will be impossible to beat at the end`
      ];
      
      return {
        source,
        target: mainThreat.name,
        type: 'threat_assessment',
        content: `${source} ${assessments[Math.floor(Math.random() * assessments.length)]}`,
        reliability,
        day: currentDay,
        valuable,
        gameRelevant: true
      };

    default:
      return null;
  }
}

function generateStrategicOverheardIntel(gameState: GameState): IntelligenceItem | null {
  const { contestants, playerName, currentDay, alliances } = gameState;
  const activeContestants = contestants.filter(c => !c.isEliminated && c.name !== playerName);
  
  if (activeContestants.length < 2) return null;
  
  // Focus on contestants with existing relationships or alliances
  let source1, source2;
  
  // Try to find alliance members talking
  for (const alliance of alliances) {
    const allianceMembers = alliance.members.filter(m => 
      activeContestants.some(c => c.name === m)
    );
    if (allianceMembers.length >= 2) {
      source1 = allianceMembers[0];
      source2 = allianceMembers[1];
      break;
    }
  }
  
  // Fallback to random contestants
  if (!source1 || !source2) {
    source1 = activeContestants[Math.floor(Math.random() * activeContestants.length)].name;
    const remainingContestants = activeContestants.filter(c => c.name !== source1);
    source2 = remainingContestants[Math.floor(Math.random() * remainingContestants.length)].name;
  }
  
  const strategicOverheard = [
    `overheard ${source1} telling ${source2} they need to stick together`,
    `saw ${source1} and ${source2} discussing who to target next`,
    `caught ${source1} and ${source2} making plans for the upcoming vote`,
    `noticed ${source1} warning ${source2} about someone coming after them`
  ];
  
  return {
    source: 'Overheard',
    type: 'alliance_info',
    content: strategicOverheard[Math.floor(Math.random() * strategicOverheard.length)],
    reliability: 45 + Math.random() * 35, // 45-80% reliability
    day: currentDay,
    valuable: true,
    gameRelevant: true
  };
}
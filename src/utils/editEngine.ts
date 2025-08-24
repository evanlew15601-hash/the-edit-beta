import { EditPerception, Confessional, GameState } from '@/types/game';

export type EditType = 'invisible' | 'minimal' | 'moderate' | 'positive' | 'dramatic' | 'strategic' | 'hero' | 'villain' | 'mastermind';

export const calculateEditPerception = (gameState: GameState): EditType => {
  const { interactionLog = [], currentDay, playerName, contestants, alliances } = gameState;
  
  // Get recent actions (last 2 days for more responsive updates)
  const recentActions = interactionLog
    .filter(entry => entry.day >= currentDay - 2 && entry.participants.includes(playerName))
    .slice(-10);

  let editScore = 0;
  let strategicWeight = 0;
  let conflictWeight = 0;
  let socialWeight = 0;

  // Analyze each action with significant scoring
  recentActions.forEach(action => {
    switch (action.type) {
      case 'scheme':
        editScore += 25; // Major strategic content
        strategicWeight += 30;
        break;
      case 'alliance_meeting':
        editScore += 20; // Important strategic moment
        strategicWeight += 25;
        break;
      case 'talk':
        if (action.tone === 'aggressive') {
          editScore += 22; // Conflict drives viewership
          conflictWeight += 25;
        } else {
          editScore += 12; // Regular social content
          socialWeight += 15;
        }
        break;
      case 'activity':
        editScore += 8; // Background content
        socialWeight += 10;
        break;
      case 'confessional':
        editScore += 15; // Direct audience connection
        strategicWeight += 10;
        break;
    }
  });

  // Bonus for strategic positioning
  const playerAlliances = alliances.filter(a => a.members.includes(playerName));
  if (playerAlliances.length > 1) {
    editScore += 20; // Playing multiple sides
    strategicWeight += 20;
  }
  
  // Bonus for conflict creation
  const conflicts = recentActions.filter(a => a.tone === 'aggressive').length;
  if (conflicts >= 2) {
    editScore += 25; // Drama creator
    conflictWeight += 30;
  }

  // High activity bonus
  if (recentActions.length >= 6) {
    editScore += 15; // Very active player
  }

  // Determine edit type based on weights and score
  if (editScore >= 80) {
    if (strategicWeight > conflictWeight) return 'mastermind';
    if (conflictWeight > strategicWeight) return 'villain';
    return 'hero';
  } else if (editScore >= 60) {
    if (strategicWeight >= 40) return 'strategic';
    if (conflictWeight >= 30) return 'dramatic';
    return 'positive';
  } else if (editScore >= 40) {
    return 'moderate';
  } else if (editScore >= 20) {
    return 'minimal';
  } else {
    return 'invisible';
  }
};

export const calculateLegacyEditPerception = (
  confessionals: Confessional[],
  currentPerception: EditPerception,
  currentDay: number,
  gameState?: any // Additional context for strategic moments
): EditPerception => {
  // Get recent confessionals (last 3 days)
  const recentConfessionals = confessionals.filter(c => c.day >= currentDay - 2);
  
  // Base screen time and approval changes
  let screenTimeChange = 0;
  let approvalChange = 0;
  
  // Strategic moment bonuses - high-impact gameplay gets more screen time
  let strategicBonus = 0;
  if (gameState) {
    // Recent alliance activity
    const recentAlliances = gameState.alliances?.filter(a => 
      a.formed >= currentDay - 1 && a.members.includes(gameState.playerName)
    ) || [];
    strategicBonus += recentAlliances.length * 15; // Increased bonus
    
    // Recent voting or elimination involvement
    if (gameState.votingHistory?.length > 0) {
      const lastVote = gameState.votingHistory[gameState.votingHistory.length - 1];
      if (lastVote.day >= currentDay - 1) {
        // Involved in recent voting drama
        strategicBonus += 20; // Increased bonus
        
        // If player's vote was decisive or surprising
        if (lastVote.playerVote && lastVote.playerVote !== lastVote.eliminated) {
          strategicBonus += 15; // Voting against the house
        }
      }
    }
    
    // Immunity winner gets screen time
    if (gameState.immunityWinner === gameState.playerName) {
      strategicBonus += 25; // Increased bonus
      approvalChange += 8;
    }
    
    // High interaction count = more screen time
    const recentInteractions = gameState.interactionLog?.filter(log => 
      log.day >= currentDay - 1 && log.participants.includes(gameState.playerName)
    )?.length || 0;
    strategicBonus += Math.min(30, recentInteractions * 3); // Increased multiplier
  }
  
  if (recentConfessionals.length === 0) {
    // Apply strategic bonus even without confessionals
    screenTimeChange = strategicBonus - 1; // Reduced penalty
  } else {
    // Calculate impact from confessional tones with strategic context
    const toneImpacts = recentConfessionals.reduce((acc, conf) => {
      const recencyBoost = conf.day === currentDay ? 3 : conf.day === currentDay - 1 ? 2.2 : 1.5;
      switch (conf.tone) {
        case 'strategic':
          acc.screenTime += 12 * recencyBoost; // Increased
          acc.approval += 4 * recencyBoost;
          break;
        case 'aggressive':
          acc.screenTime += 18 * recencyBoost; // Increased
          acc.approval -= 5 * recencyBoost;
          break;
        case 'vulnerable':
          acc.screenTime += 10 * recencyBoost; // Increased
          acc.approval += 12 * recencyBoost;
          break;
        case 'humorous':
          acc.screenTime += 8 * recencyBoost; // Increased
          acc.approval += 8 * recencyBoost;
          break;
        case 'dramatic':
          acc.screenTime += 22 * recencyBoost; // Increased
          acc.approval -= 1 * recencyBoost;
          break;
        case 'evasive':
          acc.screenTime += 3 * recencyBoost; // Increased
          acc.approval -= 2 * recencyBoost;
          break;
        default:
          acc.screenTime += 5 * recencyBoost; // Increased
          acc.approval += 2 * recencyBoost;
      }
      
      // Leverage explicit editImpact when present
      if (typeof (conf as any).editImpact === 'number') {
        acc.screenTime += Math.max(0, (conf as any).editImpact * 1.5); // Increased impact
        acc.approval += Math.sign((conf as any).editImpact) * Math.min(10, Math.abs((conf as any).editImpact));
      }
      return acc;
    }, { screenTime: 0, approval: 0 });
    
    screenTimeChange = toneImpacts.screenTime + strategicBonus;
    approvalChange = toneImpacts.approval;
  }

  // Apply changes with bounds
  const newScreenTime = Math.max(0, Math.min(100, 
    currentPerception.screenTimeIndex + screenTimeChange
  ));
  const newApproval = Math.max(-100, Math.min(100, 
    currentPerception.audienceApproval + approvalChange
  ));

  // Enhanced persona determination
  let persona: EditPerception['persona'];
  if (newScreenTime < 10) { // Lowered threshold
    persona = 'Ghosted';
  } else if (newScreenTime < 25) { // Lowered threshold
    persona = 'Underedited';
  } else if (newApproval > 30) { // Lowered threshold
    persona = 'Hero';
  } else if (newApproval < -30) { // Lowered threshold
    persona = 'Villain';
  } else if (recentConfessionals.some(c => c.tone === 'humorous') && newApproval > 5) {
    persona = 'Comic Relief';
  } else if (newScreenTime > 50 && Math.abs(newApproval) < 25) { // Lowered thresholds
    persona = 'Dark Horse';
  } else {
    persona = 'Dark Horse';
  }

  return {
    screenTimeIndex: newScreenTime,
    audienceApproval: newApproval,
    persona,
    lastEditShift: Math.round(screenTimeChange),
    weeklyQuote: (recentConfessionals
      .slice()
      .sort((a, b) => (b.editImpact ?? 0) - (a.editImpact ?? 0) || (b.content?.length ?? 0) - (a.content?.length ?? 0) || b.day - a.day)[0]?.content || '')
      .slice(0, 160)
  };
};

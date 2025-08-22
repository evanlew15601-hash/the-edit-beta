import { EditPerception, Confessional } from '@/types/game';

export const calculateEditPerception = (
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
    strategicBonus += recentAlliances.length * 8;
    
    // Recent voting or elimination involvement
    if (gameState.votingHistory?.length > 0) {
      const lastVote = gameState.votingHistory[gameState.votingHistory.length - 1];
      if (lastVote.day >= currentDay - 1) {
        // Involved in recent voting drama
        strategicBonus += 10;
        
        // If player's vote was decisive or surprising
        if (lastVote.playerVote && lastVote.playerVote !== lastVote.eliminated) {
          strategicBonus += 5; // Voting against the house
        }
      }
    }
    
    // Immunity winner gets screen time
    if (gameState.immunityWinner === gameState.playerName) {
      strategicBonus += 15;
      approvalChange += 5;
    }
    
    // High interaction count = more screen time
    const recentInteractions = gameState.interactionLog?.filter(log => 
      log.day >= currentDay - 1 && log.participants.includes(gameState.playerName)
    )?.length || 0;
    strategicBonus += Math.min(20, recentInteractions * 2);
  }
  
  if (recentConfessionals.length === 0) {
    // Apply strategic bonus even without confessionals
    screenTimeChange = strategicBonus - 3; // Small penalty for no confessionals
  } else {
    // Calculate impact from confessional tones with strategic context
    const toneImpacts = recentConfessionals.reduce((acc, conf) => {
      const recencyBoost = conf.day === currentDay ? 2.5 : conf.day === currentDay - 1 ? 1.8 : 1.2;
      switch (conf.tone) {
        case 'strategic':
          acc.screenTime += 8 * recencyBoost;
          acc.approval += 3 * recencyBoost;
          break;
        case 'aggressive':
          acc.screenTime += 12 * recencyBoost;
          acc.approval -= 7 * recencyBoost;
          break;
        case 'vulnerable':
          acc.screenTime += 6 * recencyBoost;
          acc.approval += 10 * recencyBoost;
          break;
        case 'humorous':
          acc.screenTime += 5 * recencyBoost;
          acc.approval += 6 * recencyBoost;
          break;
        case 'dramatic':
          acc.screenTime += 15 * recencyBoost;
          acc.approval -= 1 * recencyBoost;
          break;
        case 'evasive':
          acc.screenTime += 1 * recencyBoost;
          acc.approval -= 3 * recencyBoost;
          break;
        default:
          acc.screenTime += 3 * recencyBoost;
          acc.approval += 1 * recencyBoost;
      }
      
      // Leverage explicit editImpact when present
      if (typeof (conf as any).editImpact === 'number') {
        acc.screenTime += Math.max(0, (conf as any).editImpact);
        acc.approval += Math.sign((conf as any).editImpact) * Math.min(8, Math.abs((conf as any).editImpact));
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
  if (newScreenTime < 15) {
    persona = 'Ghosted';
  } else if (newScreenTime < 35) {
    persona = 'Underedited';
  } else if (newApproval > 40) {
    persona = 'Hero';
  } else if (newApproval < -40) {
    persona = 'Villain';
  } else if (recentConfessionals.some(c => c.tone === 'humorous') && newApproval > 10) {
    persona = 'Comic Relief';
  } else if (newScreenTime > 60 && Math.abs(newApproval) < 30) {
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

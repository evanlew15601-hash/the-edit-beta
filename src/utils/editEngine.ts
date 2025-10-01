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
  
  // Strategic moment bonuses - responsive to actual gameplay
  let strategicBonus = 0;
  
  // Track gameplay patterns for enhanced edit types
  let aggressiveActions = 0;
  let socialActions = 0;
  let strategicActions = 0;
  let flirtingActions = 0;
  let jokeActions = 0;
  let rumorActions = 0;
  let secretActions = 0;
  
  if (gameState) {
    const { interactionLog = [], alliances = [], currentDay, playerName } = gameState;
    
    // Recent strategic activity (last 2 days for immediate responsiveness)
    const recentStrategic = interactionLog
      .filter(entry => entry.day >= currentDay - 2 && entry.participants.includes(playerName))
      .filter(entry => ['scheme', 'alliance_meeting'].includes(entry.type));
    
    strategicBonus += recentStrategic.length * 8; // +8 screen time per strategic action
    strategicActions += recentStrategic.length;
    
    // Analyze tag talk patterns for enhanced edit tracking
    const recentTagTalks = interactionLog
      .filter(entry => entry.day >= currentDay - 3 && entry.participants.includes(playerName))
      .filter(entry => entry.type === 'tag_talk');
    
    recentTagTalks.forEach(talk => {
      const intent = talk.intent?.toLowerCase() || '';
      const tone = talk.tone?.toLowerCase() || '';
      
      // Categorize actions based on intent and tone
      if (intent === 'insult' || tone === 'aggressive') {
        aggressiveActions++;
        strategicBonus += 12; // Drama = high screen time
        approvalChange -= 8; // But hurts approval
      } else if (intent === 'flirt') {
        flirtingActions++;
        strategicBonus += 8;
        approvalChange += 3;
      } else if (intent === 'makejoke') {
        jokeActions++;
        strategicBonus += 6;
        approvalChange += 5;
      } else if (intent === 'sowdoubt' || intent === 'probeforninfo') {
        rumorActions++;
        strategicActions++;
        strategicBonus += 10;
        approvalChange -= 2;
      } else if (intent === 'revealsecret') {
        secretActions++;
        strategicActions++;
        strategicBonus += 15; // Secrets = major content
      } else if (intent === 'buildalliance') {
        socialActions++;
        strategicActions++;
        strategicBonus += 8;
        approvalChange += 2;
      } else {
        socialActions++;
        strategicBonus += 4; // General social content
      }
    });
    
    // Multi-alliance bonus
    const playerAlliances = alliances.filter(a => a.members.includes(playerName));
    if (playerAlliances.length > 1) {
      strategicBonus += 15; // Playing multiple sides = more screen time
      strategicActions += 2; // Multi-alliance strategy
    }
    
    // Vote week activity bonus
    if (currentDay >= gameState.nextEliminationDay - 2) {
      const voteWeekActivity = interactionLog
        .filter(entry => entry.day >= currentDay - 1 && entry.participants.includes(playerName));
      strategicBonus += voteWeekActivity.length * 3; // Increased activity during voting
    }
    
    // Additional conflict tracking
    const conflicts = interactionLog
      .filter(entry => entry.day >= currentDay - 3 && entry.participants.includes(playerName))
      .filter(entry => entry.tone === 'aggressive');
    aggressiveActions += conflicts.length;
    strategicBonus += conflicts.length * 10; // Drama = screen time
    
    // Information sharing bonus
    const infoSharing = interactionLog
      .filter(entry => entry.day >= currentDay - 2 && entry.participants.includes(playerName))
      .filter(entry => entry.type === 'dm');
    strategicBonus += infoSharing.length * 5; // Intel networks = content
    socialActions += infoSharing.length;
  }

  // Confessional impact on edit
  recentConfessionals.forEach(conf => {
    switch (conf.tone) {
      case 'strategic':
        screenTimeChange += 12;
        approvalChange += conf.audienceScore ? (conf.audienceScore - 50) / 10 : 5;
        strategicActions++;
        break;
      case 'dramatic':
        screenTimeChange += 18; // Drama gets major screen time
        approvalChange += conf.audienceScore ? (conf.audienceScore - 50) / 8 : -2;
        break;
      case 'vulnerable':
        screenTimeChange += 8;
        approvalChange += conf.audienceScore ? (conf.audienceScore - 50) / 5 : 8;
        break;
      case 'aggressive':
        screenTimeChange += 15;
        approvalChange += conf.audienceScore ? (conf.audienceScore - 50) / 12 : -8;
        aggressiveActions++;
        break;
      case 'humorous':
        screenTimeChange += 6;
        approvalChange += conf.audienceScore ? (conf.audienceScore - 50) / 6 : 6;
        jokeActions++;
        break;
      case 'evasive':
        screenTimeChange += 2; // Boring content
        approvalChange += conf.audienceScore ? (conf.audienceScore - 50) / 15 : -3;
        break;
    }
  });
  if (gameState) {
    // Recent alliance activity
    const recentAlliances = gameState.alliances?.filter(a => 
      a.formed >= currentDay - 1 && a.members.includes(gameState.playerName)
    ) || [];
    strategicBonus += recentAlliances.length * 15; // Increased bonus
    strategicActions += recentAlliances.length;
    
    // Recent voting or elimination involvement
    if (gameState.votingHistory?.length > 0) {
      const lastVote = gameState.votingHistory[gameState.votingHistory.length - 1];
      if (lastVote.day >= currentDay - 1) {
        // Involved in recent voting drama
        strategicBonus += 20; // Increased bonus
        
        // If player's vote was decisive or surprising
        if (lastVote.playerVote && lastVote.playerVote !== lastVote.eliminated) {
          strategicBonus += 15; // Voting against the house
          strategicActions += 2;
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
    socialActions += Math.min(10, recentInteractions);
  }
  
  if (recentConfessionals.length === 0) {
    // No confessionals - major penalty for being invisible
    screenTimeChange = strategicBonus - 8; // Increased penalty
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

  // Check for inactivity - if no recent interactions at all
  const totalRecentActivity = gameState?.interactionLog?.filter(log => 
    log.day >= currentDay - 2 && log.participants.includes(gameState?.playerName || '')
  )?.length || 0;

  // Major penalty for complete inactivity
  if (totalRecentActivity === 0 && recentConfessionals.length === 0) {
    screenTimeChange = Math.min(screenTimeChange, -15); // Massive penalty
  } else if (totalRecentActivity <= 1 && recentConfessionals.length === 0) {
    screenTimeChange = Math.min(screenTimeChange, -10); // Major penalty
  }

  // Apply changes with bounds
  const newScreenTime = Math.max(0, Math.min(100, 
    currentPerception.screenTimeIndex + screenTimeChange
  ));
  const newApproval = Math.max(-100, Math.min(100, 
    currentPerception.audienceApproval + approvalChange
  ));

  // Enhanced persona determination with many more edit types
  let persona: EditPerception['persona'];
  
  // Check for inactivity first
  if (totalRecentActivity === 0 && recentConfessionals.length === 0) {
    persona = 'Ghosted'; // Completely inactive
  } else if (newScreenTime < 8) {
    persona = 'Ghosted'; // Very low screen time
  } else if (newScreenTime < 20) {
    persona = 'Underedited'; // Low screen time
  } 
  // Strategic archetypes - high activity patterns
  else if (strategicActions >= 4 && newScreenTime > 50) {
    if (aggressiveActions >= 3) {
      persona = 'Mastermind'; // Strategic + aggressive
    } else if (secretActions >= 2) {
      persona = 'Puppet Master'; // Controlling behind scenes
    } else {
      persona = 'Strategic Player'; // Pure strategy
    }
  }
  // Conflict-driven archetypes
  else if (aggressiveActions >= 3) {
    if (newApproval < -15) {
      persona = 'Villain'; // Aggressive + disliked
    } else if (newScreenTime > 40) {
      persona = 'Antagonist'; // Aggressive but compelling TV
    } else {
      persona = 'Troublemaker'; // Creates conflict
    }
  }
  // Social archetypes
  else if (socialActions >= 4) {
    if (flirtingActions >= 2) {
      persona = 'Flirt'; // Romance-focused
    } else if (rumorActions >= 2) {
      persona = 'Gossip'; // Information gatherer
    } else if (newApproval > 25) {
      persona = 'Social Butterfly'; // Well-liked social player
    } else {
      persona = 'Floater'; // Social but not strategic
    }
  }
  // Comedy archetypes
  else if (jokeActions >= 3) {
    if (newApproval > 15) {
      persona = 'Comic Relief'; // Funny and liked
    } else {
      persona = 'Class Clown'; // Funny but not serious
    }
  }
  // Romance archetypes
  else if (flirtingActions >= 3) {
    if (strategicActions >= 2) {
      persona = 'Seducer'; // Strategic romance
    } else {
      persona = 'Romantic'; // Pure romance play
    }
  }
  // Approval-based archetypes
  else if (newApproval > 35) {
    if (newScreenTime > 30) {
      persona = 'Hero'; // High approval + good screen time
    } else {
      persona = 'Fan Favorite'; // Loved but not featured
    }
  } else if (newApproval < -25) {
    if (newScreenTime > 30) {
      persona = 'Villain'; // Disliked with screen time
    } else {
      persona = 'Pariah'; // Disliked and ignored
    }
  }
  // Screen time based archetypes
  else if (newScreenTime > 40) {
    if (Math.abs(newApproval) < 15) {
      persona = 'Dark Horse'; // High screen time, neutral approval
    } else if (newApproval > 0) {
      persona = 'Contender'; // Featured positively
    } else {
      persona = 'Controversial'; // Featured negatively
    }
  }
  // Default based on patterns
  else {
    if (newScreenTime < 25) {
      persona = 'Underedited';
    } else if (strategicActions >= 2) {
      persona = 'Strategic Player';
    } else if (socialActions >= 3) {
      persona = 'Social Butterfly';
    } else if (newApproval > 0) {
      persona = 'Fan Favorite';
    } else {
      persona = 'Controversial';
    }
  }

  return {
    screenTimeIndex: newScreenTime,
    audienceApproval: newApproval,
    persona,
    lastEditShift: Math.round(screenTimeChange),
    weeklyQuote: (recentConfessionals
      .slice()
      .sort((a, b) => ((b.editImpact ?? 0) + (b.selected ? 1 : 0)) - ((a.editImpact ?? 0) + (a.selected ? 1 : 0)) || (b.content?.length ?? 0) - (a.content?.length ?? 0) || b.day - a.day)[0]?.content || '')
      .slice(0, 160)
  };
};

import { GameState } from '@/types/game';
import { memoryEngine } from './memoryEngine';

// Track what's been shown to avoid repetition across different reaction types
const shownPosts = new Set<string>();
const shownContextualPosts = new Set<string>();

export const generateFanReaction = (gameState: GameState): string => {
  // Generate unique reactions based on current game state
  const recentEvents = gameState.interactionLog
    ?.filter(log => log.day >= gameState.currentDay - 1)
    ?.slice(-10) || [];
  
  const recentConfessionals = gameState.confessionals
    .filter(c => c.day >= gameState.currentDay - 2)
    .slice(-3);
  
  const contestants = gameState.contestants.filter(c => !c.isEliminated);
  const player = contestants.find(c => c.name === gameState.playerName);
  
  let posts: string[] = [];
  
  // Event-based reactions
  if (gameState.immunityWinner) {
    posts.push(`@${gameState.immunityWinner.replace(/\s+/g, '')} winning immunity changes EVERYTHING! #GameChanger`);
    posts.push(`${gameState.immunityWinner} really needed that immunity win! Smart timing! 🛡️`);
  }
  
  if (gameState.alliances.length > 0) {
    const latestAlliance = gameState.alliances[gameState.alliances.length - 1];
    if (latestAlliance.formed >= gameState.currentDay - 1) {
      posts.push(`New alliance forming? 👀 The house dynamics are SHIFTING!`);
      posts.push(`Love seeing new partnerships! This is getting spicy 🔥`);
    }
  }
  
  // Player-specific reactions based on edit perception
  if (player) {
    const edit = gameState.editPerception;
    if (edit.persona === 'Hero' && edit.audienceApproval > 40) {
      posts.push(`${player.name} is playing with such integrity! What a role model ✨`);
      posts.push(`LIVING for ${player.name}'s strategic mind! Playing the perfect game 🎯`);
    } else if (edit.persona === 'Villain' && edit.audienceApproval < -30) {
      posts.push(`${player.name} is ruthless but I can't look away! Iconic villain era 😈`);
      posts.push(`The way ${player.name} just manipulated that conversation... COLD 🥶`);
    } else if (edit.persona === 'Comic Relief') {
      posts.push(`${player.name} has me DYING 😂 Best personality in the house!`);
      posts.push(`We need more ${player.name} content! Pure comedy gold 🤣`);
    }
  }
  
  // Confessional reactions
  if (recentConfessionals.length > 0) {
    const latest = recentConfessionals[recentConfessionals.length - 1];
    if (latest.tone === 'dramatic') {
      posts.push(`That confessional was INTENSE! ${gameState.playerName} is not holding back 🔥`);
    } else if (latest.tone === 'strategic') {
      posts.push(`${gameState.playerName}'s strategy talk has me taking notes 📝 Big brain moves!`);
    } else if (latest.tone === 'vulnerable') {
      posts.push(`My heart 💔 ${gameState.playerName} opening up like that was so raw and real`);
    }
  }
  
  // Voting/elimination drama
  if (gameState.votingHistory.length > 0) {
    const lastVote = gameState.votingHistory[gameState.votingHistory.length - 1];
    if (lastVote.day >= gameState.currentDay - 2) {
      posts.push(`Still not over that elimination! ${lastVote.eliminated} didn't see it coming 😱`);
      posts.push(`The house vote was MESSY! Everyone's scrambling now 🌪️`);
    }
  }
  
  // Generic but dynamic reactions based on day
  const dayBasedReactions = [
    `Day ${gameState.currentDay} and the tension is THICK! Who's making the next move? 👀`,
    `The social game is everything right now! These relationships are make or break 💥`,
    `Someone's about to make a BIG move, I can feel it! The calm before the storm 🌊`,
    `The strategy talks are getting HEATED! Everyone's plotting 🗡️`,
    `House dynamics shifting every episode! Can't predict what happens next 🎲`
  ];
  
  posts.push(...dayBasedReactions);
  
  // Filter out already shown posts
  const availablePosts = posts.filter(post => !shownPosts.has(post));
  
  if (availablePosts.length === 0) {
    // If all posts have been shown, clear the set and use all posts
    shownPosts.clear();
    return posts[Math.floor(Math.random() * posts.length)];
  }
  
  const selectedPost = availablePosts[Math.floor(Math.random() * availablePosts.length)];
  shownPosts.add(selectedPost);
  
  return selectedPost;
};

export function generateFanReactions(gameState: GameState): string[] {
  // Generate multiple targeted fan reactions for display
  const { interactionLog = [], currentDay, contestants, playerName, alliances, editPerception } = gameState;
  const reactions: string[] = [];
  
  // Get recent player actions for specific reactions
  const recentActions = interactionLog
    .filter(entry => entry.day >= currentDay - 1 && entry.participants.includes(playerName))
    .slice(-5);

  // Enhanced strategic gameplay reactions
  recentActions.forEach(action => {
    switch (action.type) {
      case 'scheme':
        const schemeCount = recentActions.filter(a => a.type === 'scheme').length;
        const target = action.participants.find(p => p !== playerName);
        if (schemeCount > 2) {
          reactions.push(`#${playerName}Mastermind trending! Three schemes this week - fans calling this "the most strategic gameplay yet"`);
        } else {
          reactions.push(`Strategic move against ${target} has fans analyzing every angle - some love it, some think it's too risky`);
        }
        break;
      case 'alliance_meeting':
        const playerAlliances = alliances.filter(a => a.members.includes(playerName));
        if (playerAlliances.length > 1) {
          reactions.push(`${playerName} managing multiple alliances has superfans making theory charts - genius or dangerous?`);
        } else {
          reactions.push(`Solid alliance strategy from ${playerName} - building the foundation for a deep run`);
        }
        break;
      case 'talk':
        if (action.tone === 'aggressive') {
          const opponent = action.participants.find(p => p !== playerName);
          reactions.push(`The tension between ${playerName} and ${opponent} has been building for DAYS - this confrontation was inevitable`);
        } else {
          const conversationCount = recentActions.filter(a => a.type === 'talk').length;
          if (conversationCount >= 3) {
            reactions.push(`${playerName}'s social game this week is next level - connecting with everyone, building real bonds`);
          } else {
            const friend = action.participants.find(p => p !== playerName);
            reactions.push(`${playerName} and ${friend} building a genuine connection - love this alliance potential`);
          }
        }
        break;
      case 'dm':
        const dmCount = recentActions.filter(a => a.type === 'dm').length;
        if (dmCount >= 3) {
          reactions.push(`${playerName} in full information mode - fans speculating about who knows what intel`);
        } else {
          reactions.push(`Strategic private conversation has fans wondering what crucial info was shared`);
        }
        break;
      case 'activity':
        const partner = action.participants.find(p => p !== playerName);
        reactions.push(`Smart of ${playerName} to bond with ${partner} outside pure strategy - building real trust`);
        break;
    }
  });

  // Elimination week dynamics
  if (currentDay >= gameState.nextEliminationDay - 2) {
    const voteWeekActivity = recentActions.length;
    if (voteWeekActivity >= 5) {
      reactions.push(`Vote week scramble mode! ${playerName} working overtime - desperation or calculated positioning?`);
    } else if (voteWeekActivity <= 1) {
      reactions.push(`${playerName} staying calm before the storm - confidence or dangerous complacency?`);
    }
  }

  // Edit perception reactions
  if (editPerception.persona === 'Hero' && editPerception.audienceApproval > 20) {
    reactions.push(`The ${playerName} winner edit is REAL - playing with heart and strategy`);
  } else if (editPerception.persona === 'Villain' && editPerception.audienceApproval < -20) {
    reactions.push(`${playerName} villain era in full swing - ruthless but we can't look away`);
  } else if (editPerception.persona === 'Dark Horse') {
    reactions.push(`Don't sleep on ${playerName}! Quiet but making all the right moves - dark horse winner potential`);
  } else if (editPerception.persona === 'Ghosted') {
    reactions.push(`Where is ${playerName}? Invisible edit has fans worried about their favorite`);
  }

  // Strategic position analysis
  const playerAlliances = alliances.filter(a => a.members.includes(playerName));
  if (playerAlliances.length > 1) {
    reactions.push(`${playerName} playing multiple sides masterfully - fans making alliance charts to track it all`);
  } else if (playerAlliances.length === 0 && gameState.nextEliminationDay - currentDay <= 3) {
    reactions.push(`${playerName} needs to make a move FAST - being on the bottom is dangerous territory`);
  }

  // Activity level commentary
  const totalRecentActivity = recentActions.length;
  if (totalRecentActivity >= 6) {
    reactions.push(`${playerName} EVERYWHERE this week - high activity players either dominate or crash spectacularly`);
  } else if (totalRecentActivity === 0) {
    reactions.push(`Radio silence from ${playerName} has fans split - strategic patience or concerning invisibility?`);
  }

  // Jury phase countdown reactions
  if (gameState.daysUntilJury !== undefined && gameState.daysUntilJury <= 7) {
    reactions.push(`Only ${gameState.daysUntilJury} days until jury! Every ${playerName} move is crucial now`);
  }

  // Filter out duplicates and return varied reactions
  const uniqueReactions = [...new Set(reactions)];
  return uniqueReactions.slice(0, 4);
}

export function generateContextualFanReactions(
  gameState: GameState, 
  actionType?: string, 
  tone?: string
): string[] {
  const reactions: string[] = [];
  const { playerName, editPerception, alliances, interactionLog = [], currentDay } = gameState;
  
  // Get recent actions for context
  const recentActions = interactionLog.filter(log => 
    log.day >= currentDay - 2 && 
    log.participants.includes(playerName)
  );

  // Action-specific enhanced reactions
  if (actionType === 'scheme') {
    const schemeCount = recentActions.filter(a => a.type === 'scheme').length;
    const target = gameState.lastActionTarget;
    if (schemeCount > 2) {
      reactions.push(`#${playerName}Mastermind trending! Three schemes this week - fans calling this "the most strategic week yet"`);
    } else if (target) {
      reactions.push(`Strategic move against ${target} has fans analyzing every angle - some love it, some think it's too risky`);
    }
  }

  if (actionType === 'alliance_meeting') {
    const playerAlliances = alliances.filter(a => a.members.includes(playerName));
    if (playerAlliances.length > 1) {
      reactions.push(`${playerName} managing multiple alliances has superfans making theory charts - genius or dangerous?`);
    } else {
      reactions.push(`Solid alliance strategy from ${playerName} - building the foundation for a deep run`);
    }
  }

  if (actionType === 'dm') {
    const dmCount = recentActions.filter(a => a.type === 'dm').length;
    if (dmCount >= 3) {
      reactions.push(`${playerName} in full information mode - fans speculating about who knows what intel`);
    } else {
      reactions.push(`Strategic private conversation has fans wondering what crucial info was shared`);
    }
  }

  // Edit perception driven reactions
  if ((editPerception.screenTimeIndex > 70 && editPerception.audienceApproval > 30)) {
    reactions.push(`The ${playerName} strategic masterclass continues - fans taking notes on every move`);
  } else if (editPerception.persona === 'Dark Horse' && editPerception.screenTimeIndex < 40) {
    reactions.push(`Don't sleep on ${playerName}! Flying under the radar but making smart moves - winner potential brewing`);
  }

  // Activity-based reactions
  const totalActivity = recentActions.length;
  if (totalActivity >= 6) {
    reactions.push(`${playerName} EVERYWHERE this week - high activity strategy paying off or about to backfire?`);
  } else if (totalActivity === 0) {
    reactions.push(`${playerName} keeping quiet has fans divided - strategic patience or dangerous invisibility?`);
  }

  // Filter against contextual posts history
  const availableReactions = reactions.filter(reaction => !shownContextualPosts.has(reaction));
  
  if (availableReactions.length === 0) {
    shownContextualPosts.clear();
    return reactions.slice(0, 3);
  }

  // Add to shown set and return
  availableReactions.forEach(reaction => shownContextualPosts.add(reaction));
  return availableReactions.slice(0, 3);
}
import { GameState } from '@/types/game';
import { memoryEngine } from './memoryEngine';

// Track what's been shown to avoid repetition
const shownPosts = new Set<string>();

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
  const { interactionLog = [], currentDay, contestants, playerName, alliances } = gameState;
  const reactions: string[] = [];
  
  // Get recent player actions for specific reactions
  const recentActions = interactionLog
    .filter(entry => entry.day >= currentDay - 1 && entry.participants.includes(playerName))
    .slice(-5);

  // Analyze specific moves for targeted reactions
  recentActions.forEach(action => {
    switch (action.type) {
      case 'scheme':
        const target = action.participants.find(p => p !== playerName);
        reactions.push(`Absolutely LIVING for this strategic gameplay! ${playerName} is not playing around`);
        reactions.push(`This move against ${target} could be game-changing or game-ending. High risk, high reward!`);
        break;
      case 'alliance_meeting':
        const allies = action.participants.filter(p => p !== playerName);
        reactions.push(`Smart alliance building with ${allies.join(' and ')}. This could be the power structure we needed`);
        reactions.push(`Love seeing ${playerName} secure their position. Alliance game is everything`);
        break;
      case 'talk':
        if (action.tone === 'aggressive') {
          const opponent = action.participants.find(p => p !== playerName);
          reactions.push(`The drama with ${opponent}! This tension has been building for DAYS`);
          reactions.push(`${playerName} is not backing down from ${opponent}. I respect the backbone!`);
        } else {
          const friend = action.participants.find(p => p !== playerName);
          reactions.push(`The bond between ${playerName} and ${friend} is so genuine. Love this friendship`);
          reactions.push(`${playerName}'s social game is underrated. Building real connections`);
        }
        break;
      case 'activity':
        const partner = action.participants.find(p => p !== playerName);
        reactions.push(`Love seeing ${playerName} bonding with ${partner}. These moments matter`);
        reactions.push(`Smart of ${playerName} to strengthen bonds outside of pure strategy talk`);
        break;
    }
  });

  // Add strategic analysis reactions
  const playerAlliances = alliances.filter(a => a.members.includes(playerName));
  
  if (playerAlliances.length > 1) {
    reactions.push(`${playerName} is playing multiple sides. Risky strategy but could pay off big time`);
  }
  
  if (playerAlliances.length === 0 && gameState.nextEliminationDay - currentDay <= 3) {
    reactions.push(`${playerName} needs to make a move FAST. Being on the bottom is dangerous`);
  }
  
  // Recent activity level
  if (recentActions.length >= 4) {
    reactions.push(`${playerName} is EVERYWHERE this week. Playing hard and we're here for it!`);
  } else if (recentActions.length <= 1) {
    reactions.push(`${playerName} has been way too quiet lately. Invisibility edit incoming?`);
  }

  // Return unique reactions or fallback
  return reactions.length > 0 ? reactions.slice(0, 5) : [
    `Day ${currentDay} and the tension is THICK! Who's making the next move? 👀`,
    `The social game is everything right now! These relationships are make or break 💥`,
    `Someone's about to make a BIG move, I can feel it! The calm before the storm 🌊`
  ];
}
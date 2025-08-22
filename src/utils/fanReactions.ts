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
  // Generate multiple fan reactions for display
  const reactions: string[] = [];
  for (let i = 0; i < 5; i++) {
    reactions.push(generateFanReaction(gameState));
  }
  return reactions;
}
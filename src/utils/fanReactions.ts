import { GameState } from '@/types/game';
import { memoryEngine } from './memoryEngine';

export function generateFanReactions(gameState: GameState): string[] {
  const { editPerception, currentDay, confessionals, playerActions } = gameState;
  const week = Math.floor(currentDay / 7) || 1;
  
  // Create unique seed for each call to ensure different reactions
  const seed = `${currentDay}_${confessionals.length}_${playerActions.reduce((sum, a) => sum + (a.usageCount || 0), 0)}_${Date.now() % 1000}`;
  const base = editPerception.audienceApproval;
  const persona = editPerception.persona;
  const screen = gameState.editPerception.screenTimeIndex;

  console.log(`[FanReactions] Generating for Day ${currentDay}, Week ${week}, Seed: ${seed}`);

  // Generate truly dynamic reactions based on current game state
  const reactions: string[] = [];
  
  // Recent action-based reactions
  const recentActions = playerActions.filter(a => (a.usageCount || 0) > 0);
  const totalActions = recentActions.reduce((sum, a) => sum + (a.usageCount || 0), 0);
  const remainingPlayers = gameState.contestants.filter(c => !c.isEliminated).length;
  
  // Time-sensitive dynamic reactions
  const gamePhaseReactions = [
    `Day ${currentDay}: ${totalActions} moves made so far - ${totalActions > 15 ? 'hyperactive' : totalActions > 8 ? 'strategic' : 'subtle'} gameplay style`,
    `${remainingPlayers} players left and the ${remainingPlayers < 8 ? 'endgame intensity' : remainingPlayers < 12 ? 'middle game tension' : 'early game chaos'} is showing`,
    `Week ${week} update: ${base > 10 ? 'fan favorite trajectory' : base < -10 ? 'villain arc solidifying' : 'neutral edit but intriguing'} based on recent moves`,
  ];
  
  reactions.push(...gamePhaseReactions.slice(0, 2));

  // Alliance and relationship specific reactions
  const allianceReactions = [
    `${gameState.alliances.length} alliance${gameState.alliances.length !== 1 ? 's' : ''} active - ${gameState.alliances.length > 2 ? 'overplaying?' : gameState.alliances.length > 0 ? 'smart positioning' : 'lone wolf strategy'}`,
    `Confessional count: ${confessionals.length} - ${confessionals.length > 12 ? 'main character energy' : confessionals.length > 6 ? 'good narrator' : 'mysteriously quiet'}`,
    `Current edit reads as ${persona.toLowerCase()} with ${Math.abs(base) > 20 ? 'strong' : 'mixed'} audience reactions (${base > 0 ? '+' : ''}${base})`,
  ];
  
  reactions.push(allianceReactions[Math.floor(Math.random() * allianceReactions.length)]);

  // Persona and mood-based reactions with variety
  const moodBasedReactions = [
    `Screen time at ${screen}% - ${screen > 70 ? 'commanding the narrative' : screen > 40 ? 'steady presence' : 'flying under the radar'}`,
    `${persona} energy with ${base > 15 ? 'strong approval' : base < -15 ? 'polarizing reactions' : 'neutral-to-mixed reception'} from fans`,
    `Playing ${totalActions > 12 ? 'aggressively' : totalActions > 6 ? 'strategically' : 'conservatively'} this week compared to others`,
  ];
  
  reactions.push(moodBasedReactions[Math.floor(Math.random() * moodBasedReactions.length)]);

  // Randomize final selection to ensure variety
  const shuffledReactions = reactions.sort(() => Math.random() - 0.5);
  return shuffledReactions.slice(0, 6);
}
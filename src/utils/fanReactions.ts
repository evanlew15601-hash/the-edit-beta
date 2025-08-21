import { GameState } from '@/types/game';
import { memoryEngine } from './memoryEngine';

export function generateFanReactions(gameState: GameState): string[] {
  const { editPerception, currentDay, confessionals, playerActions } = gameState;
  const week = Math.floor(currentDay / 7) || 1;
  const uniqueKey = `${week}_${currentDay}_${confessionals.length}_${Date.now()}`;

  const base = editPerception.audienceApproval;
  const persona = editPerception.persona;
  const screen = gameState.editPerception.screenTimeIndex;

  // Generate dynamic reactions based on actual gameplay
  const reactions: string[] = [];
  
  // Recent action-based reactions
  const recentActions = playerActions.filter(a => a.usageCount > 0);
  const totalActions = recentActions.reduce((sum, a) => sum + (a.usageCount || 0), 0);

  // Dynamic action-based reactions
  const actionReactions = [
    `${totalActions} moves this week - ${totalActions > 15 ? 'aggressive' : totalActions > 8 ? 'steady' : 'quiet'} gameplay`,
    `${recentActions.length} different tactics used - ${recentActions.length > 4 ? 'versatile player' : 'focused strategy'}`,
    `Day ${currentDay} energy: ${screen > 70 ? 'main character vibes' : screen > 40 ? 'solid presence' : 'background player'}`,
    `${confessionals.length} confessionals so far - ${confessionals.length > 10 ? 'story narrator' : confessionals.length > 5 ? 'good storyteller' : 'keeping quiet'}`
  ];

  // Add time-sensitive reactions
  const weeklyReactions = [
    `Week ${week}: ${base > 10 ? 'fan favorite arc' : base < -10 ? 'villain trajectory' : 'neutral edit'} developing`,
    `${gameState.alliances.length} alliance${gameState.alliances.length !== 1 ? 's' : ''} - ${gameState.alliances.length > 2 ? 'overconnected?' : gameState.alliances.length > 0 ? 'strategic positioning' : 'playing solo'}`,
    `${gameState.contestants.filter(c => !c.isEliminated).length} left - ${currentDay > 14 ? 'endgame time' : 'still early but heating up'}`,
    `Approval rating ${base > 0 ? '+' : ''}${base} - ${Math.abs(base) > 20 ? 'strong reactions' : 'mixed feelings'} from viewers`
  ];

  reactions.push(...actionReactions.slice(0, 2));
  reactions.push(...weeklyReactions.slice(0, 2));

  // Add persona-specific context
  const personaReactions = [
    `${persona} edit in full swing - ${persona === 'Hero' ? 'America loves the integrity' : persona === 'Villain' ? 'villains make good TV' : 'flying under the radar strategy'}`,
    `Current trajectory: ${base > 15 ? 'redemption arc possible' : base < -15 ? 'heel turn complete' : 'still defining the narrative'}`
  ];

  reactions.push(...personaReactions);

  return reactions.slice(0, 6); // Return 6 unique reactions
}
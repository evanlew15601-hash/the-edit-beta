import { GameState, Contestant } from '@/types/game';

/**
 * Generate grounded confessional prompts based on actual gameplay
 */
export function getGameplayConfessionalPrompts(gs: GameState, player: Contestant): Array<{
  id: string;
  category: 'strategy' | 'alliance' | 'voting' | 'social' | 'reflection';
  prompt: string;
  followUp?: string;
  suggestedTones: string[];
  editPotential: number;
}> {
  const prompts: any[] = [];
  
  if (!player.special || player.special.kind === 'none') return prompts;
  
  // Get real gameplay context
  const activeContestants = gs.contestants.filter(c => !c.isEliminated && c.name !== gs.playerName);
  const playerAlliances = gs.alliances.filter(a => a.members.includes(gs.playerName));
  const strongestAlly = playerAlliances[0]?.members.find(m => m !== gs.playerName);
  const latestVote = gs.votingHistory[gs.votingHistory.length - 1];
  
  // Find who voted for player recently
  const recentThreats = latestVote
    ? Object.entries(latestVote.votes)
        .filter(([_, target]) => target === gs.playerName)
        .map(([voter, _]) => voter)
        .slice(0, 2)
    : [];
  
  // HOST'S CHILD PROMPTS
  if (player.special.kind === 'hosts_estranged_child') {
    const revealed = player.special.revealed;
    
    if (!revealed) {
      prompts.push({
        id: 'hc_hiding_connection',
        category: 'strategy',
        prompt: `How are you hiding your connection to Mars Vega${strongestAlly ? ` from ${strongestAlly}` : ''}?`,
        followUp: 'What happens if someone digs into your background?',
        suggestedTones: ['strategic', 'vulnerable'],
        editPotential: 7
      });
      
      if (recentThreats.length > 0) {
        prompts.push({
          id: 'hc_threat_response',
          category: 'social',
          prompt: `${recentThreats[0]} voted against you. Do they suspect the connection?`,
          followUp: 'How do you throw them off without raising more questions?',
          suggestedTones: ['strategic', 'paranoid'],
          editPotential: 8
        });
      }
    } else {
      prompts.push({
        id: 'hc_post_reveal',
        category: 'reflection',
        prompt: `The house knows you're Mars Vega's child. ${strongestAlly ? `Did ${strongestAlly} handle it well?` : 'How did people react?'}`,
        followUp: 'Are you playing your own game or living down the connection?',
        suggestedTones: ['vulnerable', 'defiant'],
        editPotential: 9
      });
      
      if (latestVote && latestVote.eliminated !== gs.playerName) {
        prompts.push({
          id: 'hc_survived_reveal',
          category: 'strategy',
          prompt: `You survived the vote after the reveal. Did your gameplay speak for itself?`,
          followUp: 'Who still trusts you and who is using this against you?',
          suggestedTones: ['strategic', 'relieved'],
          editPotential: 7
        });
      }
    }
  }
  
  // PLANTED HOUSEGUEST PROMPTS
  if (player.special.kind === 'planted_houseguest') {
    const spec = player.special;
    const activeTasks = spec.tasks?.filter(t => !t.completed) || [];
    const secretRevealed = spec.secretRevealed;
    
    if (!secretRevealed && activeTasks.length > 0) {
      const task = activeTasks[0];
      prompts.push({
        id: 'phg_mission_pressure',
        category: 'strategy',
        prompt: `Your mission: "${task.description}". Progress: ${task.progress}/${task.target}. How do you pull this off?`,
        followUp: strongestAlly ? `Can you use ${strongestAlly} without exposing the mission?` : 'Who can you manipulate without getting caught?',
        suggestedTones: ['strategic', 'manipulative'],
        editPotential: 8
      });
    }
    
    if (!secretRevealed && recentThreats.length > 0) {
      prompts.push({
        id: 'phg_suspicion_risk',
        category: 'social',
        prompt: `${recentThreats[0]} is questioning you. Is your cover blown?`,
        followUp: 'Do you prioritize the mission or your real social game?',
        suggestedTones: ['paranoid', 'strategic'],
        editPotential: 8
      });
    }
    
    if (secretRevealed) {
      prompts.push({
        id: 'phg_exposed_pivot',
        category: 'reflection',
        prompt: 'The house knows you were a production plant. How do you flip this?',
        followUp: 'Are you a villain, a genius, or both?',
        suggestedTones: ['defiant', 'strategic'],
        editPotential: 9
      });
    }
    
    // Contract ending
    const week = Math.floor((gs.currentDay - 1) / 7) + 1;
    const contractEnd = spec.contractEndWeek || 6;
    if (week >= contractEnd && !secretRevealed) {
      prompts.push({
        id: 'phg_contract_end',
        category: 'strategy',
        prompt: `Your contract ends this week. Reveal the twist or keep it hidden?`,
        followUp: 'What gives you better odds at finale?',
        suggestedTones: ['strategic', 'conflicted'],
        editPotential: 8
      });
    }
  }
  
  return prompts;
}

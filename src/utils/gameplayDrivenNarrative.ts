import { GameState, Contestant, NarrativeBeat } from '@/types/game';
import { relationshipGraphEngine } from './relationshipGraphEngine';

/**
 * Generate gameplay-driven narrative beats for Host's Child twist
 * These beats react to actual game events, relationships, and voting patterns
 */
export function generateHostChildBeats(gs: GameState, player: Contestant): NarrativeBeat[] {
  const beats: NarrativeBeat[] = [];
  const day = gs.currentDay;
  
  // Find who suspects the player most
  const relationships = gs.contestants
    .filter(c => !c.isEliminated && c.name !== gs.playerName)
    .map(c => ({
      name: c.name,
      suspicion: relationshipGraphEngine.getRelationship(gs.playerName, c.name)?.suspicion || 0
    }))
    .sort((a, b) => b.suspicion - a.suspicion);
  
  const mostSuspicious = relationships[0]?.name || 'someone';
  const leastSuspicious = relationships[relationships.length - 1]?.name || 'someone';
  
  // Find strongest alliance
  const playerAlliances = gs.alliances.filter(a => a.members.includes(gs.playerName))
    .sort((a, b) => b.strength - a.strength);
  const strongestAlly = playerAlliances[0]?.members.find(m => m !== gs.playerName) || 'an ally';
  
  // Pre-reveal beats
  if (!player.special || player.special.kind !== 'hosts_estranged_child' || !player.special.revealed) {
    beats.push(
      { 
        id: 'hc_first_week', 
        title: `Week 1: Avoid ${mostSuspicious}`, 
        dayPlanned: day + 1, 
        status: 'planned',
        summary: `${mostSuspicious} seems most likely to dig into your past`
      },
      { 
        id: 'hc_build_trust', 
        title: `Build trust with ${strongestAlly}`, 
        dayPlanned: day + 4, 
        status: 'planned',
        summary: 'Lock down a tight ally before reveal'
      },
      { 
        id: 'hc_voting_block', 
        title: 'Secure voting block', 
        dayPlanned: day + 7, 
        status: 'planned',
        summary: 'Need protection before secret gets out'
      },
      { 
        id: 'hc_reveal_timing', 
        title: 'Reveal or wait?', 
        dayPlanned: day + 10, 
        status: 'planned',
        summary: 'Control the narrative before someone else does'
      }
    );
  } else {
    // Post-reveal beats
    const revealDay = player.special.revealDay || day;
    beats.push(
      { 
        id: 'hc_immediate_fallout', 
        title: 'Damage control', 
        dayPlanned: revealDay + 1, 
        status: 'completed',
        summary: `Secret revealed on Day ${revealDay}`
      },
      { 
        id: 'hc_rebuild_trust', 
        title: `Repair bond with ${strongestAlly}`, 
        dayPlanned: revealDay + 3, 
        status: 'active',
        summary: 'Show your game is independent'
      },
      { 
        id: 'hc_flip_narrative', 
        title: 'Turn disadvantage into leverage', 
        dayPlanned: revealDay + 7, 
        status: 'planned',
        summary: 'Use the connection strategically'
      },
      { 
        id: 'hc_jury_pitch', 
        title: 'Pre-jury positioning', 
        dayPlanned: revealDay + 14, 
        status: 'planned',
        summary: 'Frame the twist for jury votes'
      }
    );
  }
  
  return beats;
}

/**
 * Generate gameplay-driven narrative beats for Planted Houseguest twist
 */
export function generatePlantedHGBeats(gs: GameState, player: Contestant): NarrativeBeat[] {
  const beats: NarrativeBeat[] = [];
  const day = gs.currentDay;
  const week = Math.floor((day - 1) / 7) + 1;
  
  if (player.special?.kind !== 'planted_houseguest') return beats;
  
  const spec = player.special;
  const activeTasks = spec.tasks?.filter(t => !t.completed) || [];
  const completedTasks = spec.tasks?.filter(t => t.completed) || [];
  
  // Find biggest threat to discovery
  const highSuspicionPlayers = gs.contestants
    .filter(c => !c.isEliminated && c.name !== gs.playerName)
    .filter(c => {
      const rel = relationshipGraphEngine.getRelationship(gs.playerName, c.name);
      return rel && rel.suspicion > 60;
    })
    .map(c => c.name);
  
  const threatName = highSuspicionPlayers[0] || 'someone';
  
  // Pre-exposure beats
  if (!spec.secretRevealed) {
    beats.push(
      { 
        id: 'phg_current_mission', 
        title: activeTasks[0] ? `Task: ${activeTasks[0].description}` : 'Await next task', 
        dayPlanned: day, 
        status: 'active',
        summary: activeTasks[0] ? `Progress: ${activeTasks[0].progress}/${activeTasks[0].target}` : 'Maintain cover'
      },
      { 
        id: 'phg_avoid_detection', 
        title: `${threatName} is watching`, 
        dayPlanned: day + 2, 
        status: 'planned',
        summary: 'High suspicion - be careful'
      },
      { 
        id: 'phg_balance_act', 
        title: 'Balance task vs. social game', 
        dayPlanned: day + 5, 
        status: 'planned',
        summary: "Can't let mission hurt real relationships"
      }
    );
    
    // Contract ending soon?
    const contractEnd = spec.contractEndWeek || 6;
    if (week >= contractEnd - 1) {
      beats.push({
        id: 'phg_contract_decision',
        title: 'Contract ending - reveal or hide?',
        dayPlanned: day + 3,
        status: 'planned',
        summary: `Week ${contractEnd} is final week`
      });
    }
  } else {
    // Post-exposure beats
    const revealDay = spec.revealDay || day;
    beats.push(
      { 
        id: 'phg_exposed', 
        title: 'Secret exposed', 
        dayPlanned: revealDay, 
        status: 'completed',
        summary: `Twist discovered on Day ${revealDay}`
      },
      { 
        id: 'phg_reframe', 
        title: 'Reframe as strategy move', 
        dayPlanned: revealDay + 2, 
        status: 'active',
        summary: 'Spin it as advanced gameplay'
      },
      { 
        id: 'phg_use_intel', 
        title: 'Leverage production intel', 
        dayPlanned: revealDay + 5, 
        status: 'planned',
        summary: 'Use insider knowledge strategically'
      }
    );
  }
  
  return beats;
}

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

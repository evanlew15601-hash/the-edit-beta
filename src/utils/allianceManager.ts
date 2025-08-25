import { Alliance, GameState } from '@/types/game';

export class AllianceManager {
  /**
   * Updates alliance trust based on recent interactions and betrayals
   */
  static updateAllianceTrust(gameState: GameState): Alliance[] {
    return gameState.alliances.map(alliance => {
      const activeMembers = alliance.members.filter(member => 
        !gameState.contestants.find(c => c.name === member)?.isEliminated
      );

      // Auto-dissolve if only one or no active members
      if (activeMembers.length <= 1) {
        return {
          ...alliance,
          strength: 0,
          lastActivity: gameState.currentDay,
          dissolved: true
        };
      }

      let trustDelta = 0;
      const recentDays = 3;

      // Check for recent interactions between alliance members
      const recentInteractions = gameState.interactionLog?.filter(log => 
        log.day >= gameState.currentDay - recentDays &&
        alliance.members.includes(log.participants[0]) &&
        alliance.members.some(member => log.participants.includes(member))
      ) || [];

      // Positive trust factors
      recentInteractions.forEach(interaction => {
        switch (interaction.type) {
          case 'alliance_meeting':
            trustDelta += 5;
            break;
          case 'talk':
            if (interaction.content.includes('trust') || interaction.content.includes('loyal')) {
              trustDelta += 3;
            }
            break;
          case 'dm':
            trustDelta += 4;
            break;
        }
      });

      // Check for betrayals or broken promises
      activeMembers.forEach(member => {
        const contestant = gameState.contestants.find(c => c.name === member);
        if (contestant) {
          const recentBetrayals = contestant.memory.filter(m => 
            m.day >= gameState.currentDay - recentDays &&
            m.content.includes('betrayal') &&
            alliance.members.some(allyMember => m.participants.includes(allyMember))
          );
          trustDelta -= recentBetrayals.length * 15;

          // Check for voting against alliance members
          const recentVoting = gameState.votingHistory.filter(v => 
            v.day >= gameState.currentDay - recentDays
          );
          recentVoting.forEach(vote => {
            if (vote.votes[member] && alliance.members.includes(vote.votes[member])) {
              trustDelta -= 20; // Major trust penalty for voting against ally
            }
          });
        }
      });

      // Natural trust decay over time if no recent activity
      const daysSinceActivity = gameState.currentDay - alliance.lastActivity;
      if (daysSinceActivity > 7) {
        trustDelta -= Math.min(daysSinceActivity - 7, 10);
      }

      const newStrength = Math.max(0, Math.min(100, alliance.strength + trustDelta));

      return {
        ...alliance,
        members: activeMembers,
        strength: newStrength,
        lastActivity: recentInteractions.length > 0 ? gameState.currentDay : alliance.lastActivity
      };
    }).filter(alliance => !alliance.dissolved && alliance.strength > 0);
  }

  /**
   * Removes eliminated contestants from all alliances
   */
  static cleanupAlliances(gameState: GameState): Alliance[] {
    return this.updateAllianceTrust(gameState);
  }

  /**
   * Gets alliance display name for UI
   */
  static getAllianceName(alliance: Alliance, gameState: GameState): string {
    if (alliance.name) return alliance.name;
    
    const activeMembers = alliance.members.filter(member => 
      !gameState.contestants.find(c => c.name === member)?.isEliminated
    );
    
    if (activeMembers.length <= 3) {
      return activeMembers.join(' & ');
    }
    
    return `${activeMembers[0]} + ${activeMembers.length - 1} others`;
  }
}

// Add alliance name to Alliance interface
declare module '@/types/game' {
  interface Alliance {
    name?: string;
    dissolved?: boolean;
  }
}
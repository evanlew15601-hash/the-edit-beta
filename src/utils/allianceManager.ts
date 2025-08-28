
import { Alliance, GameState } from '@/types/game';

export class AllianceManager {
  /**
   * Updates alliance trust based on recent interactions and betrayals
   */
  static updateAllianceTrust(gameState: GameState): Alliance[] {
    console.log('Updating alliance trust for', gameState.alliances.length, 'alliances');
    
    return gameState.alliances.map(alliance => {
      // Remove eliminated members immediately
      const activeMembers = alliance.members.filter(member => {
        const contestant = gameState.contestants.find(c => c.name === member);
        return contestant && !contestant.isEliminated;
      });

      console.log(`Alliance ${alliance.name || alliance.members.join('&')} has ${activeMembers.length} active members`);

      // Auto-dissolve if only one or no active members
      if (activeMembers.length <= 1) {
        console.log('Alliance dissolved - insufficient members');
        return {
          ...alliance,
          members: activeMembers,
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

      console.log(`Found ${recentInteractions.length} recent interactions for alliance`);

      // Positive trust factors
      recentInteractions.forEach(interaction => {
        switch (interaction.type) {
          case 'alliance_meeting':
            trustDelta += 8;
            break;
          case 'talk':
            if (interaction.content && (interaction.content.includes('trust') || interaction.content.includes('loyal'))) {
              trustDelta += 5;
            } else {
              trustDelta += 3;
            }
            break;
          case 'dm':
            trustDelta += 6;
            break;
          case 'activity':
            trustDelta += 4;
            break;
        }
      });

      // Check for betrayals or broken promises
      activeMembers.forEach(member => {
        const contestant = gameState.contestants.find(c => c.name === member);
        if (contestant && contestant.memory) {
          const recentBetrayals = contestant.memory.filter(m => 
            m.day >= gameState.currentDay - recentDays &&
            m.content && m.content.includes('betrayal') &&
            m.participants && alliance.members.some(allyMember => m.participants.includes(allyMember))
          );
          trustDelta -= recentBetrayals.length * 20;

          // Check for voting against alliance members
          const recentVoting = gameState.votingHistory.filter(v => 
            v.day >= gameState.currentDay - recentDays
          );
          recentVoting.forEach(vote => {
            if (vote.votes && vote.votes[member] && alliance.members.includes(vote.votes[member])) {
              trustDelta -= 25; // Major trust penalty for voting against ally
              console.log(`Trust penalty: ${member} voted against ally ${vote.votes[member]}`);
            }
          });
        }
      });

      // Natural trust decay over time if no recent activity
      const daysSinceActivity = gameState.currentDay - alliance.lastActivity;
      if (daysSinceActivity > 5) {
        trustDelta -= Math.min(daysSinceActivity - 5, 8);
      }

      // Calculate new strength (dynamic trust)
      const currentStrength = alliance.strength || 70; // Default to 70 if not set
      const newStrength = Math.max(10, Math.min(100, currentStrength + trustDelta));

      console.log(`Alliance trust change: ${currentStrength} -> ${newStrength} (delta: ${trustDelta})`);

      return {
        ...alliance,
        members: activeMembers,
        strength: newStrength,
        lastActivity: recentInteractions.length > 0 ? gameState.currentDay : alliance.lastActivity,
        name: alliance.name || this.generateAllianceName(activeMembers)
      };
    }).filter(alliance => alliance.dissolved !== true && alliance.strength > 0);
  }

  /**
   * Removes eliminated contestants from all alliances
   */
  static cleanupAlliances(gameState: GameState): Alliance[] {
    return this.updateAllianceTrust(gameState);
  }

  /**
   * Generate alliance name if not set
   */
  static generateAllianceName(members: string[]): string {
    if (members.length <= 2) {
      return members.join(' & ');
    } else if (members.length === 3) {
      return `The ${members[0]} Alliance`;
    } else {
      return `${members[0]} + ${members.length - 1} others`;
    }
  }

  /**
   * Gets alliance display name for UI
   */
  static getAllianceName(alliance: Alliance, gameState: GameState): string {
    if (alliance.name) return alliance.name;
    
    const activeMembers = alliance.members.filter(member => 
      !gameState.contestants.find(c => c.name === member)?.isEliminated
    );
    
    return this.generateAllianceName(activeMembers);
  }

  /**
   * Check if alliance members should vote together
   */
  static shouldVoteTogether(alliance: Alliance, gameState: GameState): boolean {
    // Vote together if trust is high and no major conflicts
    if (alliance.strength < 40) {
      console.log(`Alliance ${alliance.name} won't vote together - low trust (${alliance.strength})`);
      return false;
    }

    // Check for recent betrayals that would break voting coordination
    const recentBetrayals = gameState.interactionLog?.filter(log =>
      log.day >= gameState.currentDay - 2 &&
      log.type === 'scheme' &&
      alliance.members.some(member => log.participants.includes(member))
    ) || [];

    if (recentBetrayals.length > 0) {
      console.log(`Alliance ${alliance.name} won't vote together - recent betrayals detected`);
      return false;
    }

    return true;
  }

  /**
   * Create a new alliance
   */
  static createAlliance(members: string[], name?: string): Alliance {
    return {
      id: `alliance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      members,
      strength: 75, // Start with good trust
      secret: true,
      formed: 1, // Will be updated by game state
      lastActivity: 1, // Will be updated by game state
      name: name || this.generateAllianceName(members),
      dissolved: false
    };
  }
}


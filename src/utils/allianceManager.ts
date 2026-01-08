
import { Alliance, GameState } from '@/types/game';
import { relationshipGraphEngine } from './relationshipGraphEngine';

export class AllianceManager {
  /**
   * Updates alliance trust based on recent interactions and betrayals
   */
  static updateAllianceTrust(gameState: GameState): Alliance[] {
    console.log('Updating alliance trust for', gameState.alliances.length, 'alliances');
    console.log('Current contestants:', gameState.contestants.map(c => c.name));
    console.log('Player name:', gameState.playerName);
    
    return gameState.alliances.map(alliance => {
      console.log(`Processing alliance with members:`, alliance.members);
      
      // Remove eliminated members immediately
      const activeMembers = alliance.members.filter(member => {
        const contestant = gameState.contestants.find(c => c.name === member);
        const isActive = contestant && !contestant.isEliminated;
        console.log(`Member ${member}: found=${!!contestant}, eliminated=${contestant?.isEliminated}, active=${isActive}`);
        return isActive;
      });

      console.log(`Alliance ${alliance.name || alliance.members.join('&')} has ${activeMembers.length} active members`);

      // Auto-dissolve if only one or no active members
      if (activeMembers.length <= 1) {
        console.log('Alliance dissolved - insufficient members');

        // Keep relationship graph in sync when alliances fall apart
        if (alliance.members.length >= 2) {
          for (let i = 0; i < alliance.members.length; i++) {
            for (let j = i + 1; j < alliance.members.length; j++) {
              relationshipGraphEngine.breakAlliance(alliance.members[i], alliance.members[j], 40);
            }
          }
        }

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
    // FIXED: More dynamic voting coordination based on trust and game state
    if (alliance.strength < 30) {
      console.log(`Alliance ${alliance.name} won't vote together - very low trust (${alliance.strength})`);
      return false;
    }

    // Strong alliances vote together more often
    if (alliance.strength > 70) {
      console.log(`Alliance ${alliance.name} will vote together - high trust (${alliance.strength})`);
      return Math.random() > 0.2; // 80% coordination for strong alliances
    }

    // Medium trust alliances coordinate sometimes
    if (alliance.strength > 50) {
      console.log(`Alliance ${alliance.name} might vote together - medium trust (${alliance.strength})`);
      return Math.random() > 0.5; // 50% coordination for medium alliances
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

    // Low trust alliances rarely coordinate
    return Math.random() > 0.7; // 30% coordination for weak alliances
  }

  /**
   * Get coordinated vote target for alliance
   */
  static getCoordinatedTarget(alliance: Alliance, gameState: GameState, validTargets: string[]): string | null {
    if (!this.shouldVoteTogether(alliance, gameState)) {
      return null;
    }

    // If the player proposed a target during a recent alliance meeting, prefer that
    const recentMeeting = (gameState.interactionLog || [])
      .filter(log =>
        log.type === 'alliance_meeting' &&
        log.day >= gameState.currentDay - 2 &&
        alliance.members.some(m => log.participants.includes(m))
      )
      .sort((a, b) => b.day - a.day)[0];

    if (recentMeeting && recentMeeting.content) {
      const match = recentMeeting.content.match(/(?:vote|target)[:=]\s*([A-Za-z0-9 _-]+)/i);
      const proposed = match ? match[1].trim() : undefined;
      if (proposed && validTargets.includes(proposed)) {
        console.log(`Alliance ${alliance.name} honoring proposed target from meeting: ${proposed}`);
        return proposed;
      }
    }

    // Find target that threatens alliance most
    const threats = validTargets.map(target => {
      let threat = 0;
      
      // Check if target is investigating alliance members
      const investigations = gameState.interactionLog?.filter(log =>
        log.participants.includes(target) &&
        alliance.members.some(member => log.participants.includes(member)) &&
        log.type === 'observe'
      ).length || 0;
      
      threat += investigations * 20;
      
      // Check if target has high suspicion of alliance members
      const targetContestant = gameState.contestants.find(c => c.name === target);
      if (targetContestant) {
        threat += targetContestant.psychProfile.suspicionLevel * 0.3;
      }
      
      return { name: target, threat };
    });

    const topThreat = threats.reduce((prev, current) => 
      current.threat > prev.threat ? current : prev
    );

    console.log(`Alliance ${alliance.name} coordinating vote against ${topThreat.name} (threat: ${topThreat.threat})`);
    return topThreat.name;
  }

  /**
   * Add alliance secrecy and betrayal mechanics
   */
  static processAllianceSecrecy(gameState: GameState): Alliance[] {
    return gameState.alliances.map(alliance => {
      // DYNAMIC: Alliances can be discovered through observation or betrayal
      let exposureRisk = 0;
      
      // Check if alliance members have been observed together frequently
      const recentMeetings = gameState.interactionLog?.filter(log =>
        log.day >= gameState.currentDay - 5 &&
        log.type === 'alliance_meeting' &&
        alliance.members.some(member => log.participants.includes(member))
      ).length || 0;
      
      exposureRisk += recentMeetings * 15;
      
      // Check for potential betrayers (low trust members)
      const lowTrustMembers = alliance.members.filter(member => {
        const contestant = gameState.contestants.find(c => c.name === member);
        return contestant && contestant.psychProfile.trustLevel < 40;
      });
      
      exposureRisk += lowTrustMembers.length * 20;
      
      // Determine if alliance becomes exposed
      const wasSecret = alliance.secret;
      const becomesExposed = wasSecret && exposureRisk > 60 && Math.random() > 0.3;
      
      if (becomesExposed) {
        console.log(`Alliance ${alliance.name} has been exposed! Risk: ${exposureRisk}`);
        // Add exposure memory to non-alliance members
        gameState.contestants.forEach(contestant => {
          if (!alliance.members.includes(contestant.name) && !contestant.isEliminated) {
            contestant.memory.push({
              day: gameState.currentDay,
              type: 'observation',
              participants: alliance.members.slice(0, 2),
              content: `Discovered secret alliance between ${alliance.members.join(', ')}`,
              emotionalImpact: 5,
              timestamp: Date.now()
            });
          }
        });
      }
      
      return {
        ...alliance,
        secret: !becomesExposed && alliance.secret,
        exposureRisk: Math.min(100, exposureRisk)
      };
    });
  }

  /**
   * Create a new alliance
   */
  static createAlliance(members: string[], name?: string, currentDay: number = 1): Alliance {
    const allianceName = name || this.generateAllianceName(members);
    const alliance: Alliance = {
      id: `alliance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      members,
      strength: 75, // Start with good trust
      secret: true,
      formed: currentDay,
      lastActivity: currentDay,
      name: allianceName,
      dissolved: false,
      exposureRisk: 0
    };

    // Mirror alliance creation into the relationship graph so social power metrics see it
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        relationshipGraphEngine.formAlliance(members[i], members[j], alliance.strength);
      }
    }

    return alliance;
  }
}


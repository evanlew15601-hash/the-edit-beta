import { GameState, Contestant, GameMemory } from '@/types/game';

export interface NPCMemoryPattern {
  type: 'betrayal_detection' | 'alliance_loyalty' | 'threat_assessment' | 'opportunity_recognition';
  trigger: (memory: GameMemory[], contestant: Contestant, gameState: GameState) => boolean;
  consequence: (contestant: Contestant, gameState: GameState) => Partial<Contestant>;
  priority: 'low' | 'medium' | 'high';
}

export class EnhancedNPCMemorySystem {
  private static memoryPatterns: NPCMemoryPattern[] = [
    // Betrayal Detection Pattern
    {
      type: 'betrayal_detection',
      trigger: (memory, contestant, gameState) => {
        const recentBetrayals = memory.filter(m => 
          m.day >= gameState.currentDay - 3 &&
          m.type === 'scheme' &&
          m.participants.includes(gameState.playerName) &&
          m.content && m.content.includes('betrayal')
        );
        return recentBetrayals.length > 0;
      },
      consequence: (contestant, gameState) => ({
        psychProfile: {
          ...contestant.psychProfile,
          trustLevel: Math.max(-100, contestant.psychProfile.trustLevel - 30),
          suspicionLevel: Math.min(100, contestant.psychProfile.suspicionLevel + 20)
        }
      }),
      priority: 'high'
    },

    // Alliance Loyalty Pattern
    {
      type: 'alliance_loyalty',
      trigger: (memory, contestant, gameState) => {
        const allianceMeetings = memory.filter(m =>
          m.day >= gameState.currentDay - 2 &&
          m.type === 'conversation' &&
          gameState.alliances.some(alliance => 
            alliance.members.includes(contestant.name) &&
            m.participants.some(p => alliance.members.includes(p))
          )
        );
        return allianceMeetings.length >= 2;
      },
      consequence: (contestant, gameState) => {
        const alliance = gameState.alliances.find(a => a.members.includes(contestant.name));
        if (alliance && alliance.strength > 60) {
          return {
            psychProfile: {
              ...contestant.psychProfile,
              trustLevel: Math.min(100, contestant.psychProfile.trustLevel + 15)
            }
          };
        }
        return {};
      },
      priority: 'medium'
    },

    // Threat Assessment Pattern
    {
      type: 'threat_assessment',
      trigger: (memory, contestant, gameState) => {
        const remainingCount = gameState.contestants.filter(c => !c.isEliminated).length;
        const threatMemories = memory.filter(m =>
          m.day >= gameState.currentDay - 5 &&
          m.participants.includes(gameState.playerName) &&
          (m.type === 'scheme' || (m.type === 'conversation' && m.emotionalImpact < -3))
        );
        return threatMemories.length >= 2 && remainingCount <= 8;
      },
      consequence: (contestant, gameState) => {
        // Add strategic memory about player being a threat
        const newMemory: GameMemory = {
          day: gameState.currentDay,
          type: 'observation',
          participants: [contestant.name, gameState.playerName],
          content: `${gameState.playerName} is becoming a significant strategic threat`,
          emotionalImpact: -10,
          timestamp: Date.now()
        };
        
        return {
          memory: [...contestant.memory, newMemory],
          psychProfile: {
            ...contestant.psychProfile,
            suspicionLevel: Math.min(100, contestant.psychProfile.suspicionLevel + 25)
          }
        };
      },
      priority: 'high'
    },

    // Opportunity Recognition Pattern
    {
      type: 'opportunity_recognition',
      trigger: (memory, contestant, gameState) => {
        const positiveInteractions = memory.filter(m =>
          m.day >= gameState.currentDay - 3 &&
          m.participants.includes(gameState.playerName) &&
          m.emotionalImpact > 5
        );
        return positiveInteractions.length >= 2 && contestant.psychProfile.trustLevel > 40;
      },
      consequence: (contestant, gameState) => {
        // NPCs recognize opportunity to align with player
        const newMemory: GameMemory = {
          day: gameState.currentDay,
          type: 'observation',
          participants: [contestant.name, gameState.playerName],
          content: `${gameState.playerName} could be a valuable strategic partner`,
          emotionalImpact: 8,
          timestamp: Date.now()
        };
        
        return {
          memory: [...contestant.memory, newMemory],
          psychProfile: {
            ...contestant.psychProfile,
            trustLevel: Math.min(100, contestant.psychProfile.trustLevel + 10)
          }
        };
      },
      priority: 'medium'
    }
  ];

  /**
   * Process memory patterns for all NPCs
   */
  static processMemoryPatterns(gameState: GameState): Contestant[] {
    return gameState.contestants.map(contestant => {
      if (contestant.name === gameState.playerName || contestant.isEliminated) {
        return contestant;
      }

      const updatedContestant = { ...contestant };
      
      // Process each memory pattern in priority order
      const sortedPatterns = [...this.memoryPatterns].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      for (const pattern of sortedPatterns) {
        if (pattern.trigger(contestant.memory, contestant, gameState)) {
          const changes = pattern.consequence(contestant, gameState);
          Object.assign(updatedContestant, changes);
          
          console.log(`Applied memory pattern ${pattern.type} to ${contestant.name}`);
        }
      }

      return updatedContestant;
    });
  }

  /**
   * Generate contextual memories based on recent events
   */
  static generateContextualMemories(gameState: GameState): GameMemory[] {
    const newMemories: GameMemory[] = [];
    
    // Generate memories about recent eliminations
    const recentElimination = gameState.votingHistory
      .filter(v => v.day >= gameState.currentDay - 1)
      .slice(-1)[0];
    
    if (recentElimination) {
      const eliminatedPlayer = recentElimination.eliminated;
      
      gameState.contestants
        .filter(c => !c.isEliminated && c.name !== gameState.playerName)
        .forEach(contestant => {
          // Generate memories about the elimination
          if (Math.random() < 0.7) { // 70% chance to remember
            newMemories.push({
              day: gameState.currentDay,
              type: 'elimination',
              participants: [contestant.name, eliminatedPlayer],
              content: `${eliminatedPlayer} was eliminated. This changes the game dynamics significantly.`,
              emotionalImpact: contestant.memory.some(m => 
                m.participants.includes(eliminatedPlayer) && m.emotionalImpact > 0
              ) ? -5 : 2, // Negative if they liked the eliminated player
              timestamp: Date.now()
            });
          }
        });
    }

    // Generate memories about alliance movements
    gameState.alliances.forEach(alliance => {
      if (alliance.lastActivity === gameState.currentDay) {
        gameState.contestants
          .filter(c => !c.isEliminated && !alliance.members.includes(c.name))
          .forEach(contestant => {
            if (Math.random() < 0.4) { // 40% chance to notice alliance activity
              newMemories.push({
                day: gameState.currentDay,
                type: 'observation',
                participants: [contestant.name, ...alliance.members.slice(0, 2)],
                content: `Noticed increased activity between ${alliance.members.slice(0, 2).join(' and ')}. Possible alliance coordination.`,
                emotionalImpact: -3,
                timestamp: Date.now()
              });
            }
          });
      }
    });

    return newMemories;
  }

  /**
   * Update NPC strategic priorities based on memory analysis
   */
  static updateStrategicPriorities(gameState: GameState): Contestant[] {
    return gameState.contestants.map(contestant => {
      if (contestant.name === gameState.playerName || contestant.isEliminated) {
        return contestant;
      }

      const recentMemories = contestant.memory.filter(m => 
        m.day >= gameState.currentDay - 5
      );

      // Analyze memory patterns to update disposition
      const betrayalMemories = recentMemories.filter(m => 
        m.content && m.content.includes('betrayal')
      ).length;

      const allianceMemories = recentMemories.filter(m =>
        m.type === 'conversation' && m.emotionalImpact > 0
      ).length;

      const conflictMemories = recentMemories.filter(m =>
        m.emotionalImpact < -5
      ).length;

      // Update disposition based on memory patterns
      let newDisposition = [...contestant.psychProfile.disposition];

      if (betrayalMemories > 2 && !newDisposition.includes('Paranoid')) {
        newDisposition.push('Paranoid');
        newDisposition = newDisposition.filter(d => d !== 'Trusting');
      }

      if (allianceMemories > 3 && !newDisposition.includes('Social')) {
        newDisposition.push('Social');
      }

      if (conflictMemories > 2 && !newDisposition.includes('Aggressive')) {
        newDisposition.push('Aggressive');
        newDisposition = newDisposition.filter(d => d !== 'Passive');
      }

      return {
        ...contestant,
        psychProfile: {
          ...contestant.psychProfile,
          disposition: newDisposition.slice(0, 3) // Limit to 3 disposition traits
        }
      };
    });
  }

  /**
   * Clean old memories to prevent memory bloat
   */
  static cleanOldMemories(gameState: GameState): Contestant[] {
    const memoryRetentionDays = 14; // Keep memories for 2 weeks
    
    return gameState.contestants.map(contestant => {
      const filteredMemory = contestant.memory.filter(m => 
        m.day >= gameState.currentDay - memoryRetentionDays ||
        m.emotionalImpact > 8 || // Keep highly emotional memories longer
        m.emotionalImpact < -8 ||
        m.type === 'elimination' // Always keep elimination memories
      );
      
      return {
        ...contestant,
        memory: filteredMemory
      };
    });
  }
}
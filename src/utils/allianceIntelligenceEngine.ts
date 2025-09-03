import { GameState, Contestant, Alliance } from '@/types/game';

export interface AllianceIntelligence {
  type: 'truth' | 'deception' | 'strategic' | 'social';
  confidence: 'high' | 'medium' | 'low';
  info: string;
  source: 'behavioral_analysis' | 'alliance_discussion' | 'observation' | 'private_conversation';
  memberId: string;
}

export class AllianceIntelligenceEngine {
  /**
   * Generate intelligence about alliance members based on trust, behavior, and memory
   */
  static generateMemberIntelligence(
    alliance: Alliance, 
    gameState: GameState
  ): Record<string, AllianceIntelligence[]> {
    const intelligence: Record<string, AllianceIntelligence[]> = {};
    
    alliance.members
      .filter(member => member !== gameState.playerName)
      .forEach(member => {
        intelligence[member] = this.analyzeMember(member, alliance, gameState);
      });
    
    return intelligence;
  }

  private static analyzeMember(
    memberId: string, 
    alliance: Alliance, 
    gameState: GameState
  ): AllianceIntelligence[] {
    const contestant = gameState.contestants.find(c => c.name === memberId);
    if (!contestant) return [];

    const intel: AllianceIntelligence[] = [];
    
    // Trust-based intelligence
    this.addTrustBasedIntel(intel, contestant, alliance, gameState);
    
    // Memory-based intelligence
    this.addMemoryBasedIntel(intel, contestant, alliance, gameState);
    
    // Voting behavior intelligence
    this.addVotingIntel(intel, contestant, alliance, gameState);
    
    // Game phase specific intelligence
    this.addPhaseSpecificIntel(intel, contestant, alliance, gameState);
    
    return intel;
  }

  private static addTrustBasedIntel(
    intel: AllianceIntelligence[], 
    contestant: Contestant, 
    alliance: Alliance, 
    gameState: GameState
  ) {
    const trustLevel = contestant.psychProfile.trustLevel;
    
    if (trustLevel > 80) {
      intel.push({
        type: 'truth',
        confidence: 'high',
        info: `${contestant.name} is extremely loyal to this alliance. Their devotion appears genuine.`,
        source: 'behavioral_analysis',
        memberId: contestant.name
      });
      
      // Share voting intentions truthfully
      if (gameState.gamePhase === 'player_vote') {
        const targetMemory = contestant.memory
          .filter(m => m.type === 'scheme' || m.type === 'conversation')
          .slice(-2);
        
        if (targetMemory.length > 0) {
          const potentialTarget = targetMemory[0].participants.find(p => 
            p !== contestant.name && p !== gameState.playerName &&
            !gameState.contestants.find(c => c.name === p)?.isEliminated
          );
          
          if (potentialTarget) {
            intel.push({
              type: 'truth',
              confidence: 'high',
              info: `${contestant.name} is planning to vote for ${potentialTarget} tonight.`,
              source: 'alliance_discussion',
              memberId: contestant.name
            });
          }
        }
      }
    } else if (trustLevel > 50) {
      intel.push({
        type: 'truth',
        confidence: 'medium',
        info: `${contestant.name} seems committed to this alliance, but may have reservations.`,
        source: 'behavioral_analysis',
        memberId: contestant.name
      });
    } else if (trustLevel < 30) {
      intel.push({
        type: 'deception',
        confidence: 'high',
        info: `${contestant.name} is likely planning to betray this alliance. Their loyalty is questionable.`,
        source: 'behavioral_analysis',
        memberId: contestant.name
      });
      
      // Generate false voting information
      if (gameState.gamePhase === 'player_vote') {
        const randomTarget = gameState.contestants
          .filter(c => !c.isEliminated && c.name !== contestant.name && c.name !== gameState.playerName)
          [Math.floor(Math.random() * gameState.contestants.filter(c => !c.isEliminated && c.name !== contestant.name).length)];
        
        if (randomTarget) {
          intel.push({
            type: 'deception',
            confidence: 'low',
            info: `${contestant.name} claims they're voting for ${randomTarget.name}, but this could be misdirection.`,
            source: 'private_conversation',
            memberId: contestant.name
          });
        }
      }
    }
  }

  private static addMemoryBasedIntel(
    intel: AllianceIntelligence[], 
    contestant: Contestant, 
    alliance: Alliance, 
    gameState: GameState
  ) {
    const recentMemories = contestant.memory
      .filter(m => m.day >= gameState.currentDay - 3)
      .slice(0, 3);

    recentMemories.forEach(memory => {
      if (memory.type === 'scheme') {
        const conspirators = memory.participants.filter(p => p !== contestant.name);
        intel.push({
          type: 'strategic',
          confidence: 'medium',
          info: `${contestant.name} has been scheming with ${conspirators.join(', ')} recently about game strategy.`,
          source: 'observation',
          memberId: contestant.name
        });
      } else if (memory.type === 'conversation' && memory.emotionalImpact > 5) {
        const conversationPartners = memory.participants.filter(p => p !== contestant.name);
        intel.push({
          type: 'social',
          confidence: 'high',
          info: `${contestant.name} had a meaningful positive conversation with ${conversationPartners.join(', ')}.`,
          source: 'alliance_discussion',
          memberId: contestant.name
        });
      } else if (memory.type === 'conversation' && memory.emotionalImpact < -5) {
        const conflictPartners = memory.participants.filter(p => p !== contestant.name);
        intel.push({
          type: 'social',
          confidence: 'high',
          info: `${contestant.name} had a negative interaction with ${conflictPartners.join(', ')} recently.`,
          source: 'observation',
          memberId: contestant.name
        });
      }
    });
  }

  private static addVotingIntel(
    intel: AllianceIntelligence[], 
    contestant: Contestant, 
    alliance: Alliance, 
    gameState: GameState
  ) {
    const recentVotes = gameState.votingHistory
      .filter(v => v.day >= gameState.currentDay - 7)
      .slice(-3);

    recentVotes.forEach(vote => {
      if (vote.votes && vote.votes[contestant.name]) {
        const votedFor = vote.votes[contestant.name];
        
        if (alliance.members.includes(votedFor)) {
          intel.push({
            type: 'deception',
            confidence: 'high',
            info: `${contestant.name} voted against alliance member ${votedFor} on Day ${vote.day}. This suggests potential betrayal.`,
            source: 'observation',
            memberId: contestant.name
          });
        } else {
          intel.push({
            type: 'strategic',
            confidence: 'medium',
            info: `${contestant.name} voted for ${votedFor} on Day ${vote.day}, staying loyal to the alliance.`,
            source: 'behavioral_analysis',
            memberId: contestant.name
          });
        }
      }
    });
  }

  private static addPhaseSpecificIntel(
    intel: AllianceIntelligence[], 
    contestant: Contestant, 
    alliance: Alliance, 
    gameState: GameState
  ) {
    const remainingCount = gameState.contestants.filter(c => !c.isEliminated).length;
    
    if (remainingCount <= 5) {
      // End game intelligence
      intel.push({
        type: 'strategic',
        confidence: 'medium',
        info: `${contestant.name} is likely evaluating end-game scenarios. They may prioritize jury management over alliance loyalty.`,
        source: 'behavioral_analysis',
        memberId: contestant.name
      });
    } else if (gameState.gamePhase === 'immunity_competition') {
      // Immunity competition intelligence
      if (contestant.psychProfile.disposition.includes('Competitive')) {
        intel.push({
          type: 'strategic',
          confidence: 'high',
          info: `${contestant.name} will likely give maximum effort in immunity challenges. They view them as crucial.`,
          source: 'behavioral_analysis',
          memberId: contestant.name
        });
      }
    }
    
    // Alliance size considerations
    if (alliance.members.length > 4) {
      intel.push({
        type: 'strategic',
        confidence: 'medium',
        info: `${contestant.name} may be concerned about the alliance's size. Large alliances become targets.`,
        source: 'behavioral_analysis',
        memberId: contestant.name
      });
    }
  }

  /**
   * Filter intelligence based on alliance trust level
   */
  static filterIntelligenceByTrust(
    intelligence: Record<string, AllianceIntelligence[]>, 
    alliance: Alliance
  ): Record<string, AllianceIntelligence[]> {
    if (alliance.strength < 40) {
      // Low trust alliance - less reliable information
      const filtered: Record<string, AllianceIntelligence[]> = {};
      
      Object.entries(intelligence).forEach(([memberId, intel]) => {
        filtered[memberId] = intel.filter(item => 
          item.confidence !== 'high' || item.type === 'deception'
        );
      });
      
      return filtered;
    }
    
    return intelligence;
  }

  /**
   * Get alliance-wide strategic assessment
   */
  static getAllianceStrategicAssessment(alliance: Alliance, gameState: GameState): {
    stability: 'stable' | 'unstable' | 'fracturing';
    recommendation: string;
    risks: string[];
    opportunities: string[];
  } {
    const memberCount = alliance.members.length;
    const trustLevel = alliance.strength;
    const remainingPlayers = gameState.contestants.filter(c => !c.isEliminated).length;
    
    let stability: 'stable' | 'unstable' | 'fracturing';
    const risks: string[] = [];
    const opportunities: string[] = [];
    
    // Determine stability
    if (trustLevel > 70) {
      stability = 'stable';
    } else if (trustLevel > 40) {
      stability = 'unstable';
    } else {
      stability = 'fracturing';
    }
    
    // Assess risks
    if (memberCount > remainingPlayers / 2) {
      risks.push('Alliance too large - may become target');
    }
    
    if (trustLevel < 50) {
      risks.push('Low trust levels - betrayal likely');
    }
    
    if (memberCount < 3) {
      risks.push('Alliance too small - limited power');
    }
    
    // Assess opportunities
    if (memberCount >= 3 && memberCount <= 4) {
      opportunities.push('Optimal size for coordination');
    }
    
    if (trustLevel > 60) {
      opportunities.push('Strong trust enables complex strategies');
    }
    
    if (remainingPlayers <= 7) {
      opportunities.push('End game approaching - alliance valuable');
    }
    
    // Generate recommendation
    let recommendation = '';
    if (stability === 'stable') {
      recommendation = 'Maintain current strategy. Alliance is performing well.';
    } else if (stability === 'unstable') {
      recommendation = 'Monitor for betrayals. Consider strengthening bonds or preparing exit strategy.';
    } else {
      recommendation = 'Alliance is failing. Consider abandoning or complete restructure.';
    }
    
    return {
      stability,
      recommendation,
      risks,
      opportunities
    };
  }
}
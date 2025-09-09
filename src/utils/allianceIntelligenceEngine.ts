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
    const suspicionLevel = contestant.psychProfile.suspicionLevel || 0;
    const disposition = contestant.psychProfile.disposition || [];
    
    // Find specific evidence for trust assessments
    const recentActions = gameState.interactionLog
      .filter(log => log.participants.includes(contestant.name) && log.day >= gameState.currentDay - 5)
      .slice(-10);
    
    const allianceActions = recentActions.filter(log => 
      alliance.members.some(member => log.participants.includes(member))
    );
    
    if (trustLevel > 80) {
      // High trust - provide specific evidence
      const loyaltyEvidence = allianceActions.filter(action => 
        action.content?.includes('BuildAlliance') || action.content?.includes('share-strategy')
      );
      
      if (loyaltyEvidence.length > 0) {
        intel.push({
          type: 'truth',
          confidence: 'high',
          info: `${contestant.name} has consistently supported alliance members in ${loyaltyEvidence.length} recent interactions. High loyalty confirmed.`,
          source: 'behavioral_analysis',
          memberId: contestant.name
        });
      } else {
        intel.push({
          type: 'truth',
          confidence: 'medium',
          info: `${contestant.name} shows strong alliance commitment through body language and private conversations.`,
          source: 'behavioral_analysis',
          memberId: contestant.name
        });
      }
      
      // Voting intel based on memory patterns
      if (gameState.gamePhase === 'player_vote') {
        const voteMemories = contestant.memory
          .filter(m => (m.type === 'scheme' || m.type === 'conversation') && m.day >= gameState.currentDay - 2)
          .slice(-3);
        
        if (voteMemories.length > 0) {
          const discussedTargets = voteMemories.flatMap(m => m.participants)
            .filter(p => p !== contestant.name && p !== gameState.playerName)
            .filter((p, i, arr) => arr.indexOf(p) === i); // unique
          
          if (discussedTargets.length > 0) {
            const primaryTarget = discussedTargets[0];
            intel.push({
              type: 'truth',
              confidence: 'high',
              info: `${contestant.name} mentioned targeting ${primaryTarget} in recent alliance discussions. Likely their vote tonight.`,
              source: 'alliance_discussion',
              memberId: contestant.name
            });
          }
        }
      }
    } else if (trustLevel > 50) {
      // Medium trust - conditional loyalty
      const conflictActions = allianceActions.filter(action => 
        action.content?.includes('SowDoubt') || action.content?.includes('test-loyalty')
      );
      
      if (conflictActions.length > 0) {
        intel.push({
          type: 'truth',
          confidence: 'medium',
          info: `${contestant.name} has been testing alliance loyalty in ${conflictActions.length} recent interactions. Shows cautious approach.`,
          source: 'behavioral_analysis',
          memberId: contestant.name
        });
      } else if (suspicionLevel > 60) {
        intel.push({
          type: 'strategic',
          confidence: 'medium',
          info: `${contestant.name} is highly suspicious (${suspicionLevel}% paranoia) but still cooperative. May flip if pressured.`,
          source: 'behavioral_analysis',
          memberId: contestant.name
        });
      } else {
        intel.push({
          type: 'truth',
          confidence: 'medium',
          info: `${contestant.name} shows moderate alliance commitment but keeps options open for better opportunities.`,
          source: 'behavioral_analysis',
          memberId: contestant.name
        });
      }
    } else if (trustLevel < 30) {
      // Low trust - find evidence of betrayal
      const betrayalActions = recentActions.filter(action => 
        action.content?.includes('misinformation') || 
        action.content?.includes('distance-yourself') ||
        action.content?.includes('exploit-paranoia')
      );
      
      const outsideAlliances = gameState.alliances.filter(a => 
        a.members.includes(contestant.name) && !a.members.includes(gameState.playerName)
      );
      
      if (betrayalActions.length > 0) {
        intel.push({
          type: 'deception',
          confidence: 'high',
          info: `${contestant.name} has been spreading misinformation and creating distance. Evidence of ${betrayalActions.length} suspicious actions.`,
          source: 'observation',
          memberId: contestant.name
        });
      } else if (outsideAlliances.length > 0) {
        intel.push({
          type: 'deception',
          confidence: 'high',
          info: `${contestant.name} is in ${outsideAlliances.length} other alliance(s). Divided loyalty confirmed.`,
          source: 'alliance_discussion',
          memberId: contestant.name
        });
      } else if (disposition.includes('Paranoid')) {
        intel.push({
          type: 'deception',
          confidence: 'medium',
          info: `${contestant.name}'s paranoid nature (${suspicionLevel}% suspicion) makes them unreliable. May betray preemptively.`,
          source: 'behavioral_analysis',
          memberId: contestant.name
        });
      } else {
        intel.push({
          type: 'deception',
          confidence: 'medium',
          info: `${contestant.name} shows low trust metrics (${trustLevel}%) and minimal alliance engagement. Betrayal likely.`,
          source: 'behavioral_analysis',
          memberId: contestant.name
        });
      }
      
      // Generate misleading voting info based on their deceptive nature
      if (gameState.gamePhase === 'player_vote') {
        const eligibleTargets = gameState.contestants
          .filter(c => !c.isEliminated && c.name !== contestant.name && c.name !== gameState.playerName);
        
        if (eligibleTargets.length > 0) {
          const decoyTarget = eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];
          intel.push({
            type: 'deception',
            confidence: 'low',
            info: `${contestant.name} claims they're voting ${decoyTarget.name}, but their low trust suggests this is misdirection.`,
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
      .filter(m => m.day >= gameState.currentDay - 5)
      .slice(0, 5);

    const allianceMembers = alliance.members;
    const outsiders = gameState.contestants
      .filter(c => !c.isEliminated && !allianceMembers.includes(c.name))
      .map(c => c.name);

    recentMemories.forEach(memory => {
      const partners = memory.participants.filter(p => p !== contestant.name);
      const alliancePartners = partners.filter(p => allianceMembers.includes(p));
      const outsidePartners = partners.filter(p => outsiders.includes(p));

      if (memory.type === 'scheme') {
        if (alliancePartners.length > 0 && outsidePartners.length > 0) {
          // Scheming with both alliance and outsiders - suspicious
          intel.push({
            type: 'deception',
            confidence: 'high',
            info: `${contestant.name} schemed with both alliance members (${alliancePartners.join(', ')}) and outsiders (${outsidePartners.join(', ')}) on Day ${memory.day}. Playing multiple sides.`,
            source: 'observation',
            memberId: contestant.name
          });
        } else if (outsidePartners.length > 0) {
          // Scheming with outsiders only
          intel.push({
            type: 'deception',
            confidence: 'medium',
            info: `${contestant.name} had secret strategy discussions with ${outsidePartners.join(', ')} on Day ${memory.day}. Potential external alliance.`,
            source: 'observation',
            memberId: contestant.name
          });
        } else if (alliancePartners.length > 0) {
          // Scheming within alliance - positive
          intel.push({
            type: 'strategic',
            confidence: 'high',
            info: `${contestant.name} coordinated alliance strategy with ${alliancePartners.join(', ')} on Day ${memory.day}. Shows commitment.`,
            source: 'alliance_discussion',
            memberId: contestant.name
          });
        }
      } else if (memory.type === 'conversation') {
        if (memory.emotionalImpact > 8) {
          // Very positive conversation
          if (alliancePartners.length > 0) {
            intel.push({
              type: 'social',
              confidence: 'high',
              info: `${contestant.name} had an excellent bonding conversation with alliance members ${alliancePartners.join(', ')} on Day ${memory.day}. Strong social ties.`,
              source: 'alliance_discussion',
              memberId: contestant.name
            });
          } else if (outsidePartners.length > 0) {
            intel.push({
              type: 'social',
              confidence: 'medium',
              info: `${contestant.name} formed strong bonds with non-alliance members ${outsidePartners.join(', ')} on Day ${memory.day}. May indicate shift in loyalty.`,
              source: 'observation',
              memberId: contestant.name
            });
          }
        } else if (memory.emotionalImpact < -8) {
          // Very negative conversation
          if (alliancePartners.length > 0) {
            intel.push({
              type: 'deception',
              confidence: 'high',
              info: `${contestant.name} had a major conflict with alliance members ${alliancePartners.join(', ')} on Day ${memory.day}. Alliance stability at risk.`,
              source: 'observation',
              memberId: contestant.name
            });
          } else if (outsidePartners.length > 0) {
            intel.push({
              type: 'strategic',
              confidence: 'medium',
              info: `${contestant.name} had conflicts with ${outsidePartners.join(', ')} on Day ${memory.day}. May strengthen alliance unity.`,
              source: 'observation',
              memberId: contestant.name
            });
          }
        } else if (memory.emotionalImpact > 3) {
          // Moderate positive conversation
          if (outsidePartners.length > 0) {
            intel.push({
              type: 'social',
              confidence: 'low',
              info: `${contestant.name} building relationships with ${outsidePartners.join(', ')} on Day ${memory.day}. Monitor for alliance drift.`,
              source: 'observation',
              memberId: contestant.name
            });
          }
        }
      } else if (memory.type === 'elimination' && memory.emotionalImpact !== 0) {
        // Reactions to eliminations can reveal alliance sentiment
        if (memory.emotionalImpact > 5) {
          intel.push({
            type: 'social',
            confidence: 'medium',
            info: `${contestant.name} was visibly upset about recent elimination on Day ${memory.day}. Shows emotional investment in eliminated player.`,
            source: 'observation',
            memberId: contestant.name
          });
        } else if (memory.emotionalImpact < -5) {
          intel.push({
            type: 'strategic',
            confidence: 'medium',
            info: `${contestant.name} seemed satisfied with recent elimination on Day ${memory.day}. May have been part of the plan.`,
            source: 'observation',
            memberId: contestant.name
          });
        }
      }
    });

    // Memory pattern analysis
    const schemeCount = recentMemories.filter(m => m.type === 'scheme').length;
    const outsideSchemes = recentMemories.filter(m => 
      m.type === 'scheme' && 
      m.participants.some(p => outsiders.includes(p))
    ).length;

    if (schemeCount > 2 && outsideSchemes > 1) {
      intel.push({
        type: 'deception',
        confidence: 'medium',
        info: `${contestant.name} shows high scheming activity (${schemeCount} schemes, ${outsideSchemes} with outsiders). Pattern suggests strategic flexibility.`,
        source: 'behavioral_analysis',
        memberId: contestant.name
      });
    }
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
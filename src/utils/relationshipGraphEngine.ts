import { Contestant, GameState } from '@/types/game';

export type Relationship = {
  source: string;
  target: string;
  trust: number; // -100 to 100
  suspicion: number; // 0 to 100
  emotionalCloseness: number; // 0 to 100
  isInAlliance: boolean;
  allianceStrength?: number;
  lastInteraction: number;
  interactionHistory: RelationshipEvent[];
};

export type RelationshipEvent = {
  day: number;
  type: 'conversation' | 'scheme' | 'betrayal' | 'alliance' | 'vote' | 'confrontation';
  impact: number; // -10 to 10
  description: string;
};

class RelationshipGraphEngine {
  private relationships: Map<string, Map<string, Relationship>> = new Map();

  // Initialize relationships for all contestants
  initializeRelationships(contestants: Contestant[]): void {
    contestants.forEach(c1 => {
      const c1Map = new Map<string, Relationship>();
      contestants.forEach(c2 => {
        if (c1.id !== c2.id) {
          c1Map.set(c2.name, {
            source: c1.name,
            target: c2.name,
            trust: 50 + (Math.random() - 0.5) * 20, // Start with slight randomness
            suspicion: Math.random() * 20,
            emotionalCloseness: Math.random() * 30,
            isInAlliance: false,
            lastInteraction: 0,
            interactionHistory: []
          });
        }
      });
      this.relationships.set(c1.name, c1Map);
    });
  }

  // Get all relationships for a specific contestant
  getRelationshipsForContestant(contestantName: string): Relationship[] {
    const contestantRelations = this.relationships.get(contestantName);
    if (!contestantRelations) return [];
    
    return Array.from(contestantRelations.values());
  }

  // Get specific relationship between two contestants
  getRelationship(source: string, target: string): Relationship | null {
    const sourceRelations = this.relationships.get(source);
    if (!sourceRelations) return null;
    
    return sourceRelations.get(target) || null;
  }

  // Update relationship based on an interaction with enhanced dynamics
  updateRelationship(
    source: string, 
    target: string, 
    trustDelta: number, 
    suspicionDelta: number, 
    emotionalDelta: number,
    eventType: RelationshipEvent['type'],
    description: string,
    currentDay: number
  ): void {
    const relationship = this.getRelationship(source, target);
    if (!relationship) return;

    // Enhanced trust changes based on recent interaction patterns
    const recentInteractions = relationship.interactionHistory
      .filter(event => currentDay - event.day <= 2)
      .length;
    
    // Trust builds slowly but can be damaged quickly
    let adjustedTrustDelta = trustDelta;
    if (trustDelta > 0) {
      // Positive trust builds slower with more frequent interactions
      adjustedTrustDelta = trustDelta * Math.max(0.3, 1 - (recentInteractions * 0.1));
    } else {
      // Negative trust hits harder with repeated negative interactions
      adjustedTrustDelta = trustDelta * (1 + (recentInteractions * 0.2));
    }

    // Apply deltas with bounds checking
    relationship.trust = Math.max(-100, Math.min(100, relationship.trust + adjustedTrustDelta));
    relationship.suspicion = Math.max(0, Math.min(100, relationship.suspicion + suspicionDelta));
    relationship.emotionalCloseness = Math.max(0, Math.min(100, relationship.emotionalCloseness + emotionalDelta));
    
    // Update interaction history
    relationship.lastInteraction = Date.now();
    relationship.interactionHistory.push({
      day: currentDay,
      type: eventType,
      impact: adjustedTrustDelta + emotionalDelta - suspicionDelta,
      description
    });

    // Keep only last 10 interactions
    if (relationship.interactionHistory.length > 10) {
      relationship.interactionHistory = relationship.interactionHistory.slice(-10);
    }

    // Update mutual relationship (but with different perspective)
    const mutualRelationship = this.getRelationship(target, source);
    if (mutualRelationship) {
      // Mutual updates are usually smaller and sometimes different
      const mutualTrustDelta = adjustedTrustDelta * 0.7;
      const mutualSuspicionDelta = suspicionDelta * 0.8;
      const mutualEmotionalDelta = emotionalDelta * 0.6;

      mutualRelationship.trust = Math.max(-100, Math.min(100, mutualRelationship.trust + mutualTrustDelta));
      mutualRelationship.suspicion = Math.max(0, Math.min(100, mutualRelationship.suspicion + mutualSuspicionDelta));
      mutualRelationship.emotionalCloseness = Math.max(0, Math.min(100, mutualRelationship.emotionalCloseness + mutualEmotionalDelta));
      
      mutualRelationship.lastInteraction = Date.now();
      mutualRelationship.interactionHistory.push({
        day: currentDay,
        type: eventType,
        impact: mutualTrustDelta + mutualEmotionalDelta - mutualSuspicionDelta,
        description: `From ${source}: ${description}`
      });

      if (mutualRelationship.interactionHistory.length > 10) {
        mutualRelationship.interactionHistory = mutualRelationship.interactionHistory.slice(-10);
      }
    }

    console.log(`[RelationshipEngine] ${source} -> ${target}: trust ${relationship.trust.toFixed(1)} (${adjustedTrustDelta > 0 ? '+' : ''}${adjustedTrustDelta.toFixed(1)}), suspicion ${relationship.suspicion.toFixed(1)}`);
  }

  // Form alliance between contestants
  formAlliance(member1: string, member2: string, strength: number = 50): void {
    const rel1 = this.getRelationship(member1, member2);
    const rel2 = this.getRelationship(member2, member1);
    
    if (rel1) {
      rel1.isInAlliance = true;
      rel1.allianceStrength = strength;
      rel1.trust += 15;
      rel1.emotionalCloseness += 10;
    }
    
    if (rel2) {
      rel2.isInAlliance = true;
      rel2.allianceStrength = strength;
      rel2.trust += 15;
      rel2.emotionalCloseness += 10;
    }
  }

  // Break alliance between contestants
  breakAlliance(member1: string, member2: string, betrayalLevel: number = 50): void {
    const rel1 = this.getRelationship(member1, member2);
    const rel2 = this.getRelationship(member2, member1);
    
    if (rel1) {
      rel1.isInAlliance = false;
      rel1.allianceStrength = 0;
      rel1.trust -= betrayalLevel;
      rel1.suspicion += betrayalLevel * 0.8;
      rel1.emotionalCloseness -= betrayalLevel * 0.6;
    }
    
    if (rel2) {
      rel2.isInAlliance = false;
      rel2.allianceStrength = 0;
      rel2.trust -= betrayalLevel * 1.2; // Betrayed person loses more trust
      rel2.suspicion += betrayalLevel;
      rel2.emotionalCloseness -= betrayalLevel * 0.8;
    }
  }

  // Get all alliances in the game
  getAllAlliances(): Array<{members: string[], strength: number}> {
    const alliances: Array<{members: string[], strength: number}> = [];
    const processedPairs = new Set<string>();

    this.relationships.forEach((sourceRelations, source) => {
      sourceRelations.forEach((relationship, target) => {
        if (relationship.isInAlliance) {
          const pairKey = [source, target].sort().join('-');
          if (!processedPairs.has(pairKey)) {
            processedPairs.add(pairKey);
            alliances.push({
              members: [source, target],
              strength: relationship.allianceStrength || 50
            });
          }
        }
      });
    });

    return alliances;
  }

  // Calculate social standing for a contestant
  calculateSocialStanding(contestantName: string): {
    averageTrust: number;
    averageSuspicion: number;
    allianceCount: number;
    socialPower: number;
  } {
    const relationships = this.getRelationshipsForContestant(contestantName);
    
    if (relationships.length === 0) {
      return { averageTrust: 50, averageSuspicion: 50, allianceCount: 0, socialPower: 0 };
    }

    const averageTrust = relationships.reduce((sum, rel) => sum + rel.trust, 0) / relationships.length;
    const averageSuspicion = relationships.reduce((sum, rel) => sum + rel.suspicion, 0) / relationships.length;
    const allianceCount = relationships.filter(rel => rel.isInAlliance).length;
    
    // Social power calculation
    const trustWeight = averageTrust * 0.4;
    const suspicionPenalty = averageSuspicion * -0.3;
    const allianceBonus = allianceCount * 10;
    const socialPower = Math.max(0, Math.min(100, trustWeight + suspicionPenalty + allianceBonus));

    return {
      averageTrust,
      averageSuspicion,
      allianceCount,
      socialPower
    };
  }

  // Get relationship matrix for debugging
  getRelationshipMatrix(): Map<string, Map<string, Relationship>> {
    return this.relationships;
  }

  // Update relationships based on voting patterns
  updateVotingRelationships(votes: {[voterName: string]: string}, eliminated: string, currentDay: number): void {
    Object.entries(votes).forEach(([voter, target]) => {
      if (target === eliminated) {
        // Voting for the eliminated person - neutral to slight positive with others who voted same way
        Object.entries(votes).forEach(([otherVoter, otherTarget]) => {
          if (voter !== otherVoter && target === otherTarget) {
            this.updateRelationship(
              voter, otherVoter, 3, -2, 1, 
              'vote', `Voted together against ${eliminated}`, currentDay
            );
          }
        });
      } else {
        // Voted for someone who wasn't eliminated - creates suspicion
        this.updateRelationship(
          voter, target, -5, 8, -3,
          'vote', `Voted against ${target} unsuccessfully`, currentDay
        );
      }
    });
  }

  // Decay relationships over time (call periodically)
  decayRelationships(currentDay: number): void {
    this.relationships.forEach((sourceRelations) => {
      sourceRelations.forEach((relationship) => {
        const daysSinceInteraction = currentDay - (relationship.lastInteraction / (24 * 60 * 60 * 1000));
        
        if (daysSinceInteraction > 2) {
          // Slowly decay extreme values toward neutral
          if (relationship.trust > 60) {
            relationship.trust = Math.max(60, relationship.trust - 1);
          } else if (relationship.trust < 40) {
            relationship.trust = Math.min(40, relationship.trust + 1);
          }
          
          if (relationship.suspicion > 60) {
            relationship.suspicion = Math.max(60, relationship.suspicion - 1);
          }
          
          if (relationship.emotionalCloseness > 60) {
            relationship.emotionalCloseness = Math.max(60, relationship.emotionalCloseness - 1);
          }
        }
      });
    });
  }
}

export const relationshipGraphEngine = new RelationshipGraphEngine();

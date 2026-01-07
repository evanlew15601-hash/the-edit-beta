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

    // Enhanced trust changes based on recent interaction patterns and game context
    const recentInteractions = relationship.interactionHistory
      .filter(event => currentDay - event.day <= 3)
      .length;
    
    const recentNegativeInteractions = relationship.interactionHistory
      .filter(event => currentDay - event.day <= 3 && event.impact < 0)
      .length;
    
    // Accelerated trust dynamics - trust moves faster in both directions
    let adjustedTrustDelta = trustDelta;
    if (trustDelta > 0) {
      // Positive trust builds faster but still has some frequency penalty
      const frequencyPenalty = Math.max(0.4, 1 - (recentInteractions * 0.1));
      const earlyGameBonus = currentDay <= 7 ? 1.5 : 1.2; // Stronger early game bonus
      adjustedTrustDelta = trustDelta * frequencyPenalty * earlyGameBonus * 1.5; // 50% faster trust building
    } else {
      // Negative trust compounds more aggressively
      const compoundingFactor = 1 + (recentNegativeInteractions * 0.4);
      adjustedTrustDelta = trustDelta * compoundingFactor * 1.3; // 30% faster trust loss
    }

    // Apply deltas with bounds checking
    relationship.trust = Math.max(-100, Math.min(100, relationship.trust + adjustedTrustDelta));
    relationship.suspicion = Math.max(0, Math.min(100, relationship.suspicion + suspicionDelta));
    relationship.emotionalCloseness = Math.max(0, Math.min(100, relationship.emotionalCloseness + emotionalDelta));
    
    // Update interaction history
    relationship.lastInteraction = currentDay;
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
      
      mutualRelationship.lastInteraction = currentDay;
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
    const averageCloseness = relationships.reduce((sum, rel) => sum + rel.emotionalCloseness, 0) / relationships.length;

    // Social power calculation – tuned so that:
    // - High trust + low suspicion is powerful
    // - Emotional closeness helps, but less than raw trust
    // - Each alliance adds a noticeable, but not overwhelming, bump
    const trustComponent = averageTrust * 0.45;
    const suspicionComponent = averageSuspicion * -0.35;
    const closenessComponent = averageCloseness * 0.2;
    const allianceComponent = allianceCount * 12;

    const socialPowerRaw = trustComponent + suspicionComponent + closenessComponent + allianceComponent;
    const socialPower = Math.max(0, Math.min(100, socialPowerRaw));

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
    const HIGH_TRUST = 70;
    const LOW_TRUST = 30;
    const HIGH_SUSPICION = 70;
    const MID_SUSPICION = 40;
    const HIGH_CLOSENESS = 75;
    const MID_CLOSENESS = 45;
    const GRACE_DAYS = 3;

    this.relationships.forEach((sourceRelations) => {
      sourceRelations.forEach((relationship) => {
        const lastDay = relationship.lastInteraction || 0;
        const daysSinceInteraction = currentDay - lastDay;

        if (daysSinceInteraction <= GRACE_DAYS) {
          return;
        }

        // The longer two people go without interacting, the faster extremes soften.
        const decaySteps = Math.min(3, Math.floor((daysSinceInteraction - GRACE_DAYS) / 2) + 1);

        // Pull extreme trust back toward a neutral band
        if (relationship.trust > HIGH_TRUST) {
          relationship.trust = Math.max(HIGH_TRUST, relationship.trust - decaySteps);
        } else if (relationship.trust < LOW_TRUST) {
          relationship.trust = Math.min(LOW_TRUST, relationship.trust + decaySteps);
        }

        // Let very high suspicion cool slowly over time
        if (relationship.suspicion > HIGH_SUSPICION) {
          relationship.suspicion = Math.max(MID_SUSPICION, relationship.suspicion - decaySteps);
        }

        // Emotional closeness also drifts toward a mid-band if people stop interacting
        if (relationship.emotionalCloseness > HIGH_CLOSENESS) {
          relationship.emotionalCloseness = Math.max(MID_CLOSENESS, relationship.emotionalCloseness - decaySteps);
        } else if (
          relationship.emotionalCloseness < MID_CLOSENESS &&
          relationship.trust > HIGH_TRUST - 10 &&
          relationship.suspicion < MID_SUSPICION - 10
        ) {
          // Warm relationships that cooled a bit can rebound slightly even without direct contact
          relationship.emotionalCloseness = Math.min(
            MID_CLOSENESS,
            relationship.emotionalCloseness + Math.max(1, Math.floor(decaySteps / 2))
          );
        }
      });
    });
  }
}

export const relationshipGraphEngine = new RelationshipGraphEngine();

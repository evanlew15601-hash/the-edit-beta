import { GameState, Contestant } from '@/types/game';
import { memoryEngine } from '@/utils/memoryEngine';
import { relationshipGraphEngine } from '@/utils/relationshipGraphEngine';

export interface VotingPlan {
  target: string;
  reasoning: string;
  confidence: number; // 0-100
  willReveal: boolean; // Will they share this plan?
  willLie: boolean; // Will they lie about their plan?
  alternativeTargets: string[];
}

export class AIVotingStrategy {
  /**
   * Generate realistic voting plans for all AI contestants at the start of each week
   */
  static generateWeeklyVotingPlans(gameState: GameState): Map<string, VotingPlan> {
    const plans = new Map<string, VotingPlan>();
    const activeContestants = gameState.contestants.filter(c => !c.isEliminated);
    
    activeContestants.forEach(contestant => {
      if (contestant.name === gameState.playerName) return;
      
      const plan = this.generateVotingPlan(contestant, gameState);
      plans.set(contestant.name, plan);
      
      // Store in memory for consistency
      memoryEngine.updateVotingPlan(contestant.name, plan.target, plan.reasoning);
    });
    
    return plans;
  }

  private static generateVotingPlan(contestant: Contestant, gameState: GameState): VotingPlan {
    const activeContestants = gameState.contestants.filter(c => !c.isEliminated && c.name !== contestant.name);
    const alliances = gameState.alliances.filter(a => a.members.includes(contestant.name));
    const allianceMembers = new Set(alliances.flatMap(a => a.members));
    
    // Assess threats and targets
    const targetScores = new Map<string, number>();
    
    activeContestants.forEach(target => {
      let score = 0;
      
      // Base threat assessment
      score += target.psychProfile.suspicionLevel * 0.4;
      score += (100 - target.psychProfile.trustLevel) * 0.3;
      
      // Relationship factors
      const relationship = relationshipGraphEngine.getRelationship(contestant.name, target.name);
      if (relationship) {
        score -= relationship.trust * 0.5;
        score += relationship.suspicion * 0.6;
      }
      
      // Alliance considerations
      if (allianceMembers.has(target.name)) {
        const allianceTrust = alliances.find(a => a.members.includes(target.name))?.strength || 50;
        score -= allianceTrust * 0.8; // Strong penalty for targeting allies
      }
      
      // Strategic positioning
      const targetAlliances = gameState.alliances.filter(a => a.members.includes(target.name));
      score += targetAlliances.length * 15; // Multiple alliance members are threats
      
      // Game phase considerations
      const remainingContestants = activeContestants.length + 1; // +1 for player
      if (remainingContestants <= 8) {
        // Late game - prioritize competition threats
        if (target.psychProfile.disposition.includes('competitive')) {
          score += 20;
        }
      }
      
      // Personal vendettas from memory
      const personalConflicts = contestant.memory.filter(m => 
        m.participants.includes(target.name) && 
        (m.content.includes('betrayal') || m.emotionalImpact < -3) &&
        m.day >= gameState.currentDay - 7
      );
      score += personalConflicts.length * 25;
      
      targetScores.set(target.name, score);
    });
    
    // Also consider the player
    let playerScore = 0;
    playerScore += (gameState.editPerception?.screenTimeIndex || 50) * 0.3;
    const playerAlliances = gameState.alliances.filter(a => a.members.includes(gameState.playerName));
    if (allianceMembers.has(gameState.playerName)) {
      const allianceTrust = playerAlliances.find(a => a.members.includes(gameState.playerName))?.strength || 50;
      playerScore -= allianceTrust * 0.8;
    }
    targetScores.set(gameState.playerName, playerScore);
    
    // Find top target
    const sortedTargets = [...targetScores.entries()]
      .sort((a, b) => b[1] - a[1]);
    
    const primaryTarget = sortedTargets[0];
    const alternativeTargets = sortedTargets.slice(1, 4).map(([name]) => name);
    
    // Determine reasoning
    const reasoning = this.generateReasoning(primaryTarget[0], contestant, gameState, primaryTarget[1]);
    
    // Determine if they'll reveal or lie about their plan
    const willReveal = this.shouldRevealPlan(contestant, primaryTarget[0], gameState);
    const willLie = this.shouldLieAboutPlan(contestant, primaryTarget[0], gameState);
    
    return {
      target: primaryTarget[0],
      reasoning,
      confidence: Math.min(90, Math.max(30, primaryTarget[1] + 30)),
      willReveal,
      willLie,
      alternativeTargets
    };
  }

  private static generateReasoning(target: string, contestant: Contestant, gameState: GameState, score: number): string {
    const isPlayer = target === gameState.playerName;
    if (score > 70) {
      return isPlayer 
        ? `You're playing too hard and becoming a major threat`
        : `${target} is the biggest strategic threat left in the game`;
    } else if (score > 40) {
      return isPlayer
        ? `You're in too many alliances and I don't trust you`
        : `${target} is dangerous and needs to go before they make a big move`;
    } else if (score > 20) {
      return isPlayer
        ? `It's a safe vote - you won't come after me`
        : `${target} is the logical choice this week`;
    } else {
      return isPlayer
        ? `Process of elimination - it has to be someone`
        : `${target} is just the best option available right now`;
    }
  }

  private static shouldRevealPlan(contestant: Contestant, target: string, gameState: GameState): boolean {
    // More likely to reveal if:
    // - High trust level (honest personality)
    // - Target is not in their alliance
    // - They're confident in their choice
    
    const baseProbability = contestant.psychProfile.trustLevel / 100;
    
    let modifier = 0;
    
    // Alliance considerations
    const alliances = gameState.alliances.filter(a => a.members.includes(contestant.name));
    const isAllianceMember = alliances.some(a => a.members.includes(target));
    if (isAllianceMember) {
      modifier -= 0.4; // Less likely to reveal voting for ally
    }
    
    // Personality modifiers
    if (contestant.psychProfile.disposition.includes('honest')) {
      modifier += 0.3;
    }
    if (contestant.psychProfile.disposition.includes('strategic')) {
      modifier -= 0.2;
    }
    
    const finalProbability = Math.max(0.1, Math.min(0.9, baseProbability + modifier));
    return Math.random() < finalProbability;
  }

  private static shouldLieAboutPlan(contestant: Contestant, target: string, gameState: GameState): boolean {
    // Will lie if:
    // - Low trust level (deceptive personality)
    // - Targeting someone they claim to be allied with
    // - Under pressure or suspicion
    
    const baseProbability = (100 - contestant.psychProfile.trustLevel) / 100;
    
    let modifier = 0;
    
    // If targeting ally, more likely to lie
    const alliances = gameState.alliances.filter(a => a.members.includes(contestant.name));
    const isTargetingAlly = alliances.some(a => a.members.includes(target));
    if (isTargetingAlly) {
      modifier += 0.5;
    }
    
    // If under suspicion, more likely to lie
    if (contestant.psychProfile.suspicionLevel > 60) {
      modifier += 0.3;
    }
    
    // Personality modifiers
    if (contestant.psychProfile.disposition.includes('deceptive')) {
      modifier += 0.4;
    }
    if (contestant.psychProfile.disposition.includes('honest')) {
      modifier -= 0.3;
    }
    
    const finalProbability = Math.max(0.05, Math.min(0.8, baseProbability + modifier));
    return Math.random() < finalProbability;
  }

  /**
   * Get voting plan information that AI would share when asked
   */
  static getShareableVotingInfo(contestant: Contestant, gameState: GameState, votingPlans: Map<string, VotingPlan>): {
    target: string;
    reasoning: string;
    isLying: boolean;
  } {
    const plan = votingPlans.get(contestant.name);
    if (!plan) {
      return {
        target: 'undecided',
        reasoning: 'Still thinking about it',
        isLying: false
      };
    }

    if (!plan.willReveal) {
      return {
        target: 'undecided',
        reasoning: 'I want to see how the week plays out first',
        isLying: true
      };
    }

    if (plan.willLie && plan.alternativeTargets.length > 0) {
      const lieTarget = plan.alternativeTargets[0];
      return {
        target: lieTarget,
        reasoning: `${lieTarget} has been playing both sides`,
        isLying: true
      };
    }

    return {
      target: plan.target,
      reasoning: plan.reasoning,
      isLying: false
    };
  }

  /**
   * Attempt to pressure an NPC into committing to a specific vote.
   * Returns success flag, commitment strength, and chosen target.
   */
  static attemptVotePressure(
    contestant: Contestant,
    desiredTarget: string,
    gameState: GameState,
    opts?: { context?: 'direct' | 'alliance' }
  ): { success: boolean; commitment: 'soft' | 'firm'; chosenTarget: string; notes: string } {
    const alliances = gameState.alliances.filter(a => a.members.includes(contestant.name));
    const inAllianceWithPlayer = alliances.some(a => a.members.includes(gameState.playerName));
    const rel = relationshipGraphEngine.getRelationship(contestant.name, gameState.playerName);
    const trust = rel?.trust ?? contestant.psychProfile.trustLevel ?? 50;
    const suspicionOfPlayer = rel?.suspicion ?? contestant.psychProfile.suspicionLevel ?? 30;
    const base = trust / 100 - suspicionOfPlayer / 200; // baseline willingness
    const allianceBoost = inAllianceWithPlayer ? Math.min(0.3, (alliances.find(a => a.members.includes(gameState.playerName))?.strength || 50) / 200) : 0;
    const contextBoost = opts?.context === 'alliance' ? 0.15 : 0;
    const phaseBoost = (gameState.contestants.filter(c => !c.isEliminated).length <= 7) ? 0.1 : 0; // late game pragmatism

    let probability = Math.max(0.05, Math.min(0.95, base + allianceBoost + contextBoost + phaseBoost));

    // Do not target close allies easily
    if (alliances.some(a => a.members.includes(desiredTarget))) {
      probability -= 0.35;
    }

    // Strong personalities resist pressure
    if (contestant.psychProfile.disposition.includes('stubborn') || contestant.psychProfile.disposition.includes('independent')) {
      probability -= 0.15;
    }

    const success = Math.random() < probability;
    let commitment: 'soft' | 'firm' = success && probability > 0.6 ? 'firm' : success ? 'soft' : 'soft';

    // If success, set voting plan in memory for downstream systems to consult
    const chosenTarget = success ? desiredTarget : desiredTarget; // still surface what you asked for
    if (success) {
      memoryEngine.updateVotingPlan(contestant.name, desiredTarget, `Committed due to ${opts?.context === 'alliance' ? 'alliance meeting' : 'direct pressure'} by ${gameState.playerName}`);
    }

    const notes = success
      ? (commitment === 'firm' ? 'They agreed firmly to your plan.' : 'They nodded along but might waver.')
      : 'They resisted pressure. You may need more trust or leverage.';

    return { success, commitment, chosenTarget, notes };
  }
}

// Extend memory engine to store voting plans
declare module '@/utils/memoryEngine' {
  interface MemoryEngine {
    updateVotingPlan(contestantId: string, target: string, reasoning: string): void;
    getVotingPlan(contestantId: string): { target: string; reasoning: string } | null;
  }
}
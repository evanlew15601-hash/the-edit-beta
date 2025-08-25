import { GameState, Contestant } from '@/types/game';
import { memoryEngine } from '@/utils/memoryEngine';
import { relationshipGraphEngine } from '@/utils/relationshipGraphEngine';

export interface InformationRequest {
  asker: string;
  target: string;
  topic: 'voting_plans' | 'alliance_info' | 'threat_assessment' | 'game_status';
  context: 'casual' | 'strategic' | 'probing';
}

export interface InformationResponse {
  willShare: boolean;
  information: string;
  accuracy: number; // 0-100
  isLie: boolean;
  reasoning: string;
}

export class EnhancedInformationEngine {
  /**
   * Determines if and how an AI contestant will share information
   */
  static processInformationRequest(
    request: InformationRequest, 
    gameState: GameState,
    votingPlans: Map<string, any> = new Map()
  ): InformationResponse {
    const { asker, target, topic, context } = request;
    
    const targetContestant = gameState.contestants.find(c => c.name === target);
    if (!targetContestant) {
      return {
        willShare: false,
        information: "I don't know anything about that",
        accuracy: 0,
        isLie: false,
        reasoning: "Target not found"
      };
    }

    // Calculate willingness to share based on relationship and strategic factors
    const willingness = this.calculateSharingWillingness(asker, targetContestant, gameState, topic);
    
    if (willingness < 30) {
      return this.generateDeflection(topic, targetContestant);
    }

    // Generate information based on topic
    switch (topic) {
      case 'voting_plans':
        return this.shareVotingInformation(asker, targetContestant, gameState, willingness, votingPlans);
      case 'alliance_info':
        return this.shareAllianceInformation(asker, targetContestant, gameState, willingness);
      case 'threat_assessment':
        return this.shareThreatAssessment(asker, targetContestant, gameState, willingness);
      case 'game_status':
        return this.shareGameStatus(asker, targetContestant, gameState, willingness);
      default:
        return this.generateDeflection(topic, targetContestant);
    }
  }

  private static calculateSharingWillingness(
    asker: string, 
    target: Contestant, 
    gameState: GameState,
    topic: string
  ): number {
    let willingness = 50; // Base willingness

    // Relationship factors
    const relationship = relationshipGraphEngine.getRelationship(target.name, asker);
    if (relationship) {
      willingness += relationship.trust * 0.4;
      willingness -= relationship.suspicion * 0.3;
    }

    // Alliance factors
    const sharedAlliances = gameState.alliances.filter(a => 
      a.members.includes(target.name) && a.members.includes(asker)
    );
    
    if (sharedAlliances.length > 0) {
      const allianceBonus = Math.max(...sharedAlliances.map(a => a.strength)) * 0.3;
      willingness += allianceBonus;
    }

    // Personality factors
    if (target.psychProfile.disposition.includes('honest')) {
      willingness += 20;
    }
    if (target.psychProfile.disposition.includes('secretive')) {
      willingness -= 25;
    }
    if (target.psychProfile.disposition.includes('manipulative')) {
      willingness -= 15; // May lie instead
    }

    // Topic sensitivity
    const topicSensitivity = {
      'voting_plans': 40, // Very sensitive
      'alliance_info': 30,
      'threat_assessment': 20,
      'game_status': 10
    };
    willingness -= topicSensitivity[topic] || 20;

    // Recent interaction history
    const recentMemory = target.memory.filter(m => 
      m.participants.includes(asker) && 
      m.day >= gameState.currentDay - 3
    );
    
    const positiveInteractions = recentMemory.filter(m => m.emotionalImpact > 2).length;
    const negativeInteractions = recentMemory.filter(m => m.emotionalImpact < -2).length;
    
    willingness += positiveInteractions * 8;
    willingness -= negativeInteractions * 12;

    // Strategic position - desperate players more likely to share
    const activeContestants = gameState.contestants.filter(c => !c.isEliminated);
    if (activeContestants.length <= 6 && target.psychProfile.suspicionLevel > 70) {
      willingness += 15; // Desperation bonus
    }

    return Math.max(0, Math.min(100, willingness));
  }

  private static shareVotingInformation(
    asker: string,
    target: Contestant,
    gameState: GameState,
    willingness: number,
    votingPlans?: Map<string, any>
  ): InformationResponse {
    const plan = votingPlans?.get(target.name);
    
    if (!plan) {
      return {
        willShare: true,
        information: "I honestly haven't decided yet. This vote is really tough.",
        accuracy: 90,
        isLie: false,
        reasoning: "No voting plan available"
      };
    }

    // Determine if they'll lie based on personality and strategic needs
    const shouldLie = willingness < 70 && (
      target.psychProfile.disposition.includes('manipulative') ||
      plan.target === asker || // Don't tell someone you're voting for them
      gameState.alliances.some(a => a.members.includes(target.name) && a.members.includes(plan.target))
    );

    if (shouldLie) {
      const alternativeTarget = plan.alternativeTargets[0] || "someone safe";
      return {
        willShare: true,
        information: `I'm leaning towards ${alternativeTarget}. They've been playing too hard lately.`,
        accuracy: 20,
        isLie: true,
        reasoning: "Protecting actual target or alliance member"
      };
    }

    // Honest response with varying levels of detail
    if (willingness > 80) {
      return {
        willShare: true,
        information: `I'm planning to vote ${plan.target}. ${plan.reasoning}`,
        accuracy: 95,
        isLie: false,
        reasoning: "High trust relationship"
      };
    } else if (willingness > 60) {
      return {
        willShare: true,
        information: `I think ${plan.target} might be the move this week. Still considering though.`,
        accuracy: 85,
        isLie: false,
        reasoning: "Moderate trust with some caution"
      };
    } else {
      return {
        willShare: true,
        information: `I have some ideas but want to see how the week plays out first.`,
        accuracy: 60,
        isLie: false,
        reasoning: "Low willingness to share specifics"
      };
    }
  }

  private static shareAllianceInformation(
    asker: string,
    target: Contestant,
    gameState: GameState,
    willingness: number
  ): InformationResponse {
    const targetAlliances = gameState.alliances.filter(a => a.members.includes(target.name));
    const sharedAlliances = targetAlliances.filter(a => a.members.includes(asker));
    
    if (sharedAlliances.length > 0) {
      // Sharing about mutual alliance
      const alliance = sharedAlliances[0];
      const otherMembers = alliance.members.filter(m => m !== target.name && m !== asker);
      
      if (willingness > 70) {
        return {
          willShare: true,
          information: `Our alliance is solid, but I'm a bit worried about ${otherMembers[0] || 'some of the others'}. We need to stay tight.`,
          accuracy: 90,
          isLie: false,
          reasoning: "High trust in shared alliance"
        };
      } else {
        return {
          willShare: true,
          information: `I think we're good. Just need to keep playing smart together.`,
          accuracy: 70,
          isLie: false,
          reasoning: "Moderate trust in alliance"
        };
      }
    }

    // Asked about alliances they're not part of
    if (willingness > 60) {
      const secretAlliances = targetAlliances.filter(a => a.secret);
      if (secretAlliances.length > 0) {
        return {
          willShare: true,
          information: `I have some working relationships, but nothing too serious yet. Still figuring out who I can trust.`,
          accuracy: 40,
          isLie: true,
          reasoning: "Hiding secret alliances"
        };
      } else {
        return {
          willShare: true,
          information: `No major alliances yet. I'm trying to stay flexible and see how things develop.`,
          accuracy: 80,
          isLie: false,
          reasoning: "Honest about lack of alliances"
        };
      }
    } else {
      return this.generateDeflection('alliance_info', target);
    }
  }

  private static shareThreatAssessment(
    asker: string,
    target: Contestant,
    gameState: GameState,
    willingness: number
  ): InformationResponse {
    const activeContestants = gameState.contestants.filter(c => !c.isEliminated);
    
    // Find biggest threats from target's perspective
    const threats = activeContestants
      .filter(c => c.name !== target.name && c.name !== asker)
      .sort((a, b) => {
        const aThreat = a.psychProfile.suspicionLevel + (a.psychProfile.trustLevel < 30 ? 20 : 0);
        const bThreat = b.psychProfile.suspicionLevel + (b.psychProfile.trustLevel < 30 ? 20 : 0);
        return bThreat - aThreat;
      })
      .slice(0, 2);

    if (willingness > 70 && threats.length > 0) {
      return {
        willShare: true,
        information: `I'm really worried about ${threats[0].name}. They're playing way too hard and people aren't seeing it yet.`,
        accuracy: 85,
        isLie: false,
        reasoning: "High trust allows honest threat assessment"
      };
    } else if (willingness > 50 && threats.length > 0) {
      return {
        willShare: true,
        information: `${threats[0].name} has been making some moves lately. Worth keeping an eye on.`,
        accuracy: 70,
        isLie: false,
        reasoning: "Moderate trust with cautious assessment"
      };
    } else {
      return {
        willShare: true,
        information: `Everyone's playing their own game. Hard to say who the real threats are yet.`,
        accuracy: 30,
        isLie: false,
        reasoning: "Low willingness to share strategic information"
      };
    }
  }

  private static shareGameStatus(
    asker: string,
    target: Contestant,
    gameState: GameState,
    willingness: number
  ): InformationResponse {
    const activeCount = gameState.contestants.filter(c => !c.isEliminated).length;
    const allianceCount = gameState.alliances.filter(a => a.strength > 50).length;
    
    if (willingness > 60) {
      return {
        willShare: true,
        information: `With ${activeCount} people left, things are getting intense. There are definitely some power alliances forming.`,
        accuracy: 95,
        isLie: false,
        reasoning: "General game information is safe to share"
      };
    } else {
      return {
        willShare: true,
        information: `Game's getting tougher but that's expected. Just taking it day by day.`,
        accuracy: 70,
        isLie: false,
        reasoning: "Vague but honest response"
      };
    }
  }

  private static generateDeflection(topic: string, target: Contestant): InformationResponse {
    const deflections = {
      'voting_plans': [
        "I don't like talking about votes until I have to. Too much can change.",
        "It's too early in the week to commit to anything specific.",
        "I prefer to keep my options open until tribal council."
      ],
      'alliance_info': [
        "I'm just trying to work with everyone right now.",
        "I don't really think in terms of alliances. Just building relationships.",
        "It's too early to lock into anything serious."
      ],
      'threat_assessment': [
        "Everyone's dangerous in their own way. I'm not underestimating anyone.",
        "I try not to focus on threats. Just playing my own game.",
        "Too early to call anyone a real threat yet."
      ],
      'game_status': [
        "Just taking it one day at a time.",
        "The game changes so fast, hard to assess anything definitively.",
        "Still early days. Anything can happen."
      ]
    };

    const responses = deflections[topic] || ["I'd rather not get into that right now."];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    return {
      willShare: false,
      information: randomResponse,
      accuracy: 80, // Deflections are usually honest about not wanting to share
      isLie: false,
      reasoning: "Chose to deflect rather than share information"
    };
  }
}
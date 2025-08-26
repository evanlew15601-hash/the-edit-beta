import { GameState, Contestant } from '@/types/game';
import { AIVotingStrategy } from './aiVotingStrategy';

export interface TradableInformation {
  type: 'voting_plan' | 'alliance_secret' | 'trust_level' | 'threat_assessment' | 'rumor';
  content: string;
  source: string;
  target?: string;
  reliability: number; // 0-100
  strategic_value: number; // 0-100
  day_revealed: number;
  is_lie: boolean;
}

export interface InformationLog {
  day: number;
  from: string;
  to: string;
  information: TradableInformation;
  context: 'conversation' | 'alliance_meeting' | 'dm' | 'confession_leak';
}

export class InformationTradingEngine {
  private static informationDatabase: TradableInformation[] = [];
  private static informationLog: InformationLog[] = [];

  static generateTradableInformation(gameState: GameState): TradableInformation[] {
    this.informationDatabase = [];
    
    const votingPlans = AIVotingStrategy.generateWeeklyVotingPlans(gameState);
    const activeContestants = gameState.contestants.filter(c => !c.isEliminated);

    // Generate voting information for each contestant
    activeContestants.forEach(contestant => {
      if (contestant.name === gameState.playerName) return;

      const votingPlan = votingPlans.get(contestant.name);
      if (votingPlan) {
        // Voting plan information
        this.informationDatabase.push({
          type: 'voting_plan',
          content: votingPlan.willLie ? 
            `${contestant.name} says they're voting for someone but might be lying` :
            `${contestant.name} plans to vote for ${votingPlan.target}`,
          source: contestant.name,
          target: votingPlan.target,
          reliability: votingPlan.willLie ? 30 : 85,
          strategic_value: 90,
          day_revealed: gameState.currentDay,
          is_lie: votingPlan.willLie
        });

        // Threat assessment information
        const suspicions = this.calculateSuspicions(contestant, gameState);
        if (suspicions.length > 0) {
          this.informationDatabase.push({
            type: 'threat_assessment',
            content: `${contestant.name} sees ${suspicions[0].name} as their biggest threat`,
            source: contestant.name,
            target: suspicions[0].name,
            reliability: 75,
            strategic_value: 70,
            day_revealed: gameState.currentDay,
            is_lie: false
          });
        }
      }

      // Alliance secrets
      const contestantAlliances = gameState.alliances.filter(a => 
        a.members.includes(contestant.name) && a.secret
      );
      
      contestantAlliances.forEach(alliance => {
        const otherMembers = alliance.members.filter(m => m !== contestant.name);
        if (otherMembers.length > 0) {
          this.informationDatabase.push({
            type: 'alliance_secret',
            content: `${contestant.name} is in a secret alliance with ${otherMembers.join(' and ')}`,
            source: contestant.name,
            reliability: 90,
            strategic_value: 80,
            day_revealed: gameState.currentDay,
            is_lie: false
          });
        }
      });

      // Trust levels about other contestants
      activeContestants.forEach(otherContestant => {
        if (otherContestant.name === contestant.name || otherContestant.name === gameState.playerName) return;

        const memories = contestant.memory.filter(m => 
          m.participants.includes(otherContestant.name) && 
          m.day >= gameState.currentDay - 7
        );

        if (memories.length > 0) {
          const trustScore = memories.reduce((sum, m) => sum + m.emotionalImpact, 0);
          const trustLevel = trustScore > 10 ? 'high' : trustScore < -10 ? 'low' : 'moderate';
          
          if (trustLevel !== 'moderate') {
            this.informationDatabase.push({
              type: 'trust_level',
              content: `${contestant.name} has ${trustLevel} trust in ${otherContestant.name}`,
              source: contestant.name,
              target: otherContestant.name,
              reliability: 80,
              strategic_value: 60,
              day_revealed: gameState.currentDay,
              is_lie: false
            });
          }
        }
      });
    });

    return this.informationDatabase;
  }

  static shareInformation(
    from: string, 
    to: string, 
    gameState: GameState, 
    context: 'conversation' | 'alliance_meeting' | 'dm'
  ): TradableInformation[] {
    const fromContestant = gameState.contestants.find(c => c.name === from);
    const toContestant = gameState.contestants.find(c => c.name === to);
    
    if (!fromContestant || !toContestant) return [];

    // Calculate relationship strength
    const relationshipStrength = this.calculateRelationshipStrength(fromContestant, to, gameState);
    const trustThreshold = context === 'alliance_meeting' ? 40 : context === 'dm' ? 60 : 70;

    if (relationshipStrength < trustThreshold) {
      return []; // Not trusted enough to share real information
    }

    // Get relevant information to share
    const availableInfo = this.informationDatabase.filter(info => 
      info.source === from || 
      (info.reliability > 70 && Math.random() < relationshipStrength / 100)
    );

    // Select information based on strategic value and relationship
    const sharedInfo = availableInfo
      .filter(info => {
        // More likely to share high-value info with trusted allies
        const shareChance = Math.min(90, relationshipStrength + info.strategic_value) / 100;
        return Math.random() < shareChance;
      })
      .slice(0, Math.floor(relationshipStrength / 30) + 1); // Share more info with higher trust

    // Log the information sharing
    sharedInfo.forEach(info => {
      this.informationLog.push({
        day: gameState.currentDay,
        from,
        to,
        information: info,
        context
      });
    });

    return sharedInfo;
  }

  static getSharedInformation(playerName: string, gameState: GameState): InformationLog[] {
    return this.informationLog.filter(log => 
      log.to === playerName && 
      log.day >= gameState.currentDay - 3 // Recent information only
    );
  }

  static getInformationAbout(target: string, gameState: GameState): TradableInformation[] {
    return this.informationDatabase.filter(info => 
      info.target === target ||
      info.content.toLowerCase().includes(target.toLowerCase())
    );
  }

  static updateInformationReliability(info: TradableInformation, actualOutcome: boolean) {
    if (actualOutcome) {
      info.reliability = Math.min(100, info.reliability + 10);
    } else {
      info.reliability = Math.max(0, info.reliability - 20);
    }
  }

  static getInformationSummary(gameState: GameState): { 
    totalPieces: number;
    reliable: number;
    strategic: number;
    recent: number;
  } {
    const recentInfo = this.informationDatabase.filter(info => 
      info.day_revealed >= gameState.currentDay - 3
    );

    return {
      totalPieces: this.informationDatabase.length,
      reliable: this.informationDatabase.filter(info => info.reliability > 75).length,
      strategic: this.informationDatabase.filter(info => info.strategic_value > 70).length,
      recent: recentInfo.length
    };
  }

  private static calculateRelationshipStrength(
    contestant: Contestant, 
    target: string, 
    gameState: GameState
  ): number {
    // Base trust level
    let strength = contestant.psychProfile.trustLevel;

    // Check for alliance membership
    const sharedAlliances = gameState.alliances.filter(a => 
      a.members.includes(contestant.name) && a.members.includes(target)
    );
    
    if (sharedAlliances.length > 0) {
      strength += 30;
      // Higher strength for stronger alliances
      const avgAllianceStrength = sharedAlliances.reduce((sum, a) => sum + a.strength, 0) / sharedAlliances.length;
      strength += Math.floor(avgAllianceStrength / 5);
    }

    // Check recent positive interactions
    const recentMemories = contestant.memory.filter(m => 
      m.participants.includes(target) && 
      m.day >= gameState.currentDay - 5
    );
    
    const recentPositiveImpact = recentMemories.reduce((sum, m) => 
      sum + Math.max(0, m.emotionalImpact), 0
    );
    
    strength += Math.min(20, recentPositiveImpact * 2);

    // Check for betrayals or negative interactions
    const recentBetrayals = recentMemories.filter(m => 
      m.type === 'scheme' && m.emotionalImpact < -5
    );
    
    strength -= recentBetrayals.length * 25;

    return Math.max(0, Math.min(100, strength));
  }

  private static calculateSuspicions(contestant: Contestant, gameState: GameState): { name: string; level: number }[] {
    const activeContestants = gameState.contestants.filter(c => 
      !c.isEliminated && c.name !== contestant.name
    );

    return activeContestants.map(target => {
      let suspicion = contestant.psychProfile.suspicionLevel;

      // Check for recent negative interactions
      const negativeMemories = contestant.memory.filter(m => 
        m.participants.includes(target.name) && 
        m.emotionalImpact < -3 &&
        m.day >= gameState.currentDay - 7
      );

      suspicion += negativeMemories.length * 15;

      // Check if they're not in alliances together
      const sharedAlliances = gameState.alliances.filter(a => 
        a.members.includes(contestant.name) && a.members.includes(target.name)
      );

      if (sharedAlliances.length === 0) {
        suspicion += 20;
      }

      // Check threat level based on game position
      if (target.psychProfile.trustLevel > 60) {
        suspicion += 10; // Suspicious of well-liked players
      }

      return { name: target.name, level: Math.min(100, suspicion) };
    }).sort((a, b) => b.level - a.level);
  }

  static clearOldInformation(gameState: GameState) {
    // Remove information older than 7 days
    this.informationDatabase = this.informationDatabase.filter(info => 
      info.day_revealed >= gameState.currentDay - 7
    );
    
    this.informationLog = this.informationLog.filter(log => 
      log.day >= gameState.currentDay - 7
    );
  }

  static getInformationLog(): InformationLog[] {
    return [...this.informationLog];
  }
}
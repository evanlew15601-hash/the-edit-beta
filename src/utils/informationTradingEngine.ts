
import { GameState, Contestant } from '@/types/game';

export interface TradableInformation {
  id: string;
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
  id: string;
  day: number;
  from: string;
  to: string;
  information: TradableInformation;
  context: 'conversation' | 'alliance_meeting' | 'dm' | 'confession_leak';
}

export class InformationTradingEngine {
  private static informationDatabase: TradableInformation[] = [];
  private static informationLog: InformationLog[] = [];
  private static lastUpdateDay = 0;

  static generateTradableInformation(gameState: GameState): TradableInformation[] {
    // Only regenerate if we haven't updated today
    if (this.lastUpdateDay === gameState.currentDay && this.informationDatabase.length > 0) {
      return this.informationDatabase;
    }

    console.log('Generating tradable information for day', gameState.currentDay);
    this.informationDatabase = [];
    this.lastUpdateDay = gameState.currentDay;
    
    const activeContestants = gameState.contestants.filter(c => !c.isEliminated);

    // Generate realistic voting plans for each contestant
    activeContestants.forEach(contestant => {
      if (contestant.name === gameState.playerName) return;

      // Generate voting plan information
      const votingTarget = this.selectVotingTarget(contestant, gameState);
      if (votingTarget) {
        this.informationDatabase.push({
          id: `vote-${contestant.name}-${gameState.currentDay}`,
          type: 'voting_plan',
          content: `${contestant.name} is planning to vote for ${votingTarget}`,
          source: contestant.name,
          target: votingTarget,
          reliability: 70 + Math.random() * 25, // 70-95% reliable
          strategic_value: 85,
          day_revealed: gameState.currentDay,
          is_lie: Math.random() < 0.2 // 20% chance of being a lie
        });
      }

      // Generate alliance information
      const contestantAlliances = gameState.alliances.filter(a => a.members.includes(contestant.name));
      contestantAlliances.forEach(alliance => {
        const otherMembers = alliance.members.filter(m => m !== contestant.name && m !== gameState.playerName);
        if (otherMembers.length > 0) {
          this.informationDatabase.push({
            id: `alliance-${alliance.id}-${contestant.name}`,
            type: 'alliance_secret',
            content: `${contestant.name} has a secret alliance with ${otherMembers.join(' and ')}`,
            source: contestant.name,
            reliability: alliance.strength || 75,
            strategic_value: 80,
            day_revealed: gameState.currentDay,
            is_lie: false
          });
        }
      });

      // Generate threat assessments
      const perceivedThreats = this.identifyThreats(contestant, gameState);
      perceivedThreats.forEach(threat => {
        this.informationDatabase.push({
          id: `threat-${contestant.name}-${threat.name}`,
          type: 'threat_assessment',
          content: `${contestant.name} sees ${threat.name} as a major threat that needs to go soon`,
          source: contestant.name,
          target: threat.name,
          reliability: 80,
          strategic_value: 70,
          day_revealed: gameState.currentDay,
          is_lie: false
        });
      });
    });

    console.log(`Generated ${this.informationDatabase.length} pieces of information`);
    return this.informationDatabase;
  }

  private static selectVotingTarget(contestant: Contestant, gameState: GameState): string | null {
    const activeContestants = gameState.contestants.filter(c => 
      !c.isEliminated && c.name !== contestant.name
    );

    if (activeContestants.length === 0) return null;

    // Prefer targets not in their alliance
    const contestantAlliances = gameState.alliances.filter(a => a.members.includes(contestant.name));
    const allianceMembers = new Set(contestantAlliances.flatMap(a => a.members));
    
    const nonAllyTargets = activeContestants.filter(c => !allianceMembers.has(c.name));
    const availableTargets = nonAllyTargets.length > 0 ? nonAllyTargets : activeContestants;
    
    // Select based on threat level or randomly
    return availableTargets[Math.floor(Math.random() * availableTargets.length)].name;
  }

  private static identifyThreats(contestant: Contestant, gameState: GameState): Contestant[] {
    return gameState.contestants
      .filter(c => !c.isEliminated && c.name !== contestant.name && c.name !== gameState.playerName)
      .filter(c => c.psychProfile?.trustLevel > 60 || Math.random() < 0.3)
      .slice(0, 2); // Top 2 threats max
  }

  static shareInformation(
    from: string, 
    to: string, 
    gameState: GameState, 
    context: 'conversation' | 'alliance_meeting' | 'dm'
  ): TradableInformation[] {
    const fromContestant = gameState.contestants.find(c => c.name === from);
    
    if (!fromContestant || to !== gameState.playerName) return [];

    // Calculate trust level between contestants
    const trustLevel = this.calculateTrust(from, to, gameState);
    console.log(`Trust level between ${from} and ${to}: ${trustLevel}`);

    if (trustLevel < 30) {
      console.log('Trust too low for information sharing');
      return [];
    }

    // Get information this person would share
    const availableInfo = this.informationDatabase.filter(info => 
      info.source === from || (info.reliability > 60 && Math.random() < trustLevel / 100)
    );

    // Select information to share based on trust and context
    const maxShares = Math.floor(trustLevel / 25) + 1;
    const sharedInfo = availableInfo
      .sort(() => Math.random() - 0.5) // Randomize
      .slice(0, maxShares);

    // Log the information sharing
    sharedInfo.forEach(info => {
      const logEntry: InformationLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        day: gameState.currentDay,
        from,
        to,
        information: info,
        context
      };
      this.informationLog.push(logEntry);
      console.log('Information shared:', logEntry);
    });

    return sharedInfo;
  }

  private static calculateTrust(from: string, to: string, gameState: GameState): number {
    // Base trust
    let trust = 40;

    // Check if they're in the same alliance
    const sharedAlliances = gameState.alliances.filter(a => 
      a.members.includes(from) && a.members.includes(to)
    );

    if (sharedAlliances.length > 0) {
      const allianceStrength = sharedAlliances.reduce((sum, a) => sum + (a.strength || 50), 0) / sharedAlliances.length;
      trust += allianceStrength * 0.4;
    }

    // Check recent interactions
    const recentInteractions = gameState.interactionLog?.filter(log =>
      log.day >= gameState.currentDay - 3 &&
      log.participants.includes(from) &&
      log.participants.includes(to)
    ) || [];

    trust += recentInteractions.length * 5; // Each interaction builds trust

    return Math.min(100, Math.max(0, trust));
  }

  static getSharedInformation(playerName: string, gameState: GameState): InformationLog[] {
    // Ensure information is generated first
    this.generateTradableInformation(gameState);
    
    return this.informationLog
      .filter(log => log.to === playerName && log.day >= gameState.currentDay - 5)
      .sort((a, b) => b.day - a.day);
  }

  static clearOldInformation(gameState: GameState) {
    // Remove information older than 7 days
    const cutoffDay = gameState.currentDay - 7;
    this.informationDatabase = this.informationDatabase.filter(info => 
      info.day_revealed >= cutoffDay
    );
    
    this.informationLog = this.informationLog.filter(log => 
      log.day >= cutoffDay
    );
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
}

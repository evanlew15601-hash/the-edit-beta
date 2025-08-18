import { GameState, Contestant, Alliance } from '@/types/game';
import { relationshipGraphEngine } from './relationshipGraphEngine';
import { memoryEngine } from './memoryEngine';

export interface SharedInformation {
  type: 'voting_plan' | 'alliance_doubt' | 'strategic_concern' | 'secret';
  source: string;
  target: string;
  content: string;
  reliability: 'truth' | 'lie' | 'half_truth';
  trustRequired: number; // 0-10
}

export class InformationSharingEngine {
  
  // Determines if an NPC will share information based on trust and relationship
  canShareInformation(source: string, target: string, info: SharedInformation): boolean {
    const relationship = relationshipGraphEngine.getRelationship(source, target);
    if (!relationship) return false;

    // Trust threshold check
    const trustLevel = relationship.trust;
    if (trustLevel < info.trustRequired) return false;

    // Alliance members more likely to share
    const isAllied = relationship.allianceStrength > 0;
    const trustBonus = isAllied ? 2 : 0;

    return (trustLevel + trustBonus) >= info.trustRequired;
  }

  // Generate voting plan information
  generateVotingPlanInfo(contestant: Contestant, gameState: GameState): SharedInformation | null {
    const memory = memoryEngine.getMemorySystem();
    const journal = memory.privateJournals[contestant.name];
    
    if (!journal) return null;

    // Determine if they'll lie about their vote
    const playerRelationship = relationshipGraphEngine.getRelationship(contestant.name, gameState.playerName);
    const willLie = playerRelationship && (
      playerRelationship.trust < 5 ||
      playerRelationship.suspicion > 6 ||
      contestant.psychProfile.disposition.includes('Deceptive')
    );

    const actualVotingPlan = journal.votingPlan || "Haven't decided yet";
    const lieVotingPlan = this.generateFakeVotingPlan(gameState, contestant);

    return {
      type: 'voting_plan',
      source: contestant.name,
      target: gameState.playerName,
      content: willLie ? lieVotingPlan : actualVotingPlan,
      reliability: willLie ? 'lie' : 'truth',
      trustRequired: 6
    };
  }

  // Generate alliance doubt information
  generateAllianceDoubtInfo(contestant: Contestant, gameState: GameState): SharedInformation | null {
    const memory = memoryEngine.getMemorySystem();
    const journal = memory.privateJournals[contestant.name];
    
    if (!journal) return null;

    // Find alliance members they distrust
    const doubts = Object.entries(journal.threatAssessment)
      .filter(([person, threat]) => {
        // Check if this person is in an alliance with the contestant
        const sharedAlliance = gameState.alliances.find(alliance =>
          alliance.members.includes(contestant.name) && alliance.members.includes(person)
        );
        return sharedAlliance && threat > 6;
      })
      .map(([person, threat]) => ({ person, threat }));

    if (doubts.length === 0) return null;

    const doubt = doubts[Math.floor(Math.random() * doubts.length)];
    
    return {
      type: 'alliance_doubt',
      source: contestant.name,
      target: gameState.playerName,
      content: `I'm starting to worry about ${doubt.person}. They seem too focused on their own game lately.`,
      reliability: 'truth',
      trustRequired: 7
    };
  }

  // Generate strategic concerns
  generateStrategicConcernInfo(contestant: Contestant, gameState: GameState): SharedInformation | null {
    const memory = memoryEngine.getMemorySystem();
    const journal = memory.privateJournals[contestant.name];
    
    if (!journal) return null;

    const concerns = [
      "The merge is coming up and I think people are going to start targeting strong players",
      "I feel like there's an alliance I'm not part of that's making moves behind the scenes",
      "We need to start thinking about who we can trust in the final stages",
      "I'm worried about immunity challenges - some people here are really strong competitors"
    ];

    return {
      type: 'strategic_concern',
      source: contestant.name,
      target: gameState.playerName,
      content: concerns[Math.floor(Math.random() * concerns.length)],
      reliability: 'truth',
      trustRequired: 5
    };
  }

  // Share information if trust threshold is met
  shareInformationWithPlayer(gameState: GameState): SharedInformation[] {
    const sharedInfo: SharedInformation[] = [];
    
    gameState.contestants
      .filter(c => !c.isEliminated && c.name !== gameState.playerName)
      .forEach(contestant => {
        // Try to share voting plan
        const votingInfo = this.generateVotingPlanInfo(contestant, gameState);
        if (votingInfo && this.canShareInformation(contestant.name, gameState.playerName, votingInfo)) {
          sharedInfo.push(votingInfo);
        }

        // Try to share alliance doubts
        const doubtInfo = this.generateAllianceDoubtInfo(contestant, gameState);
        if (doubtInfo && this.canShareInformation(contestant.name, gameState.playerName, doubtInfo)) {
          sharedInfo.push(doubtInfo);
        }

        // Try to share strategic concerns
        const concernInfo = this.generateStrategicConcernInfo(contestant, gameState);
        if (concernInfo && this.canShareInformation(contestant.name, gameState.playerName, concernInfo)) {
          sharedInfo.push(concernInfo);
        }
      });

    // Record information sharing in memory
    sharedInfo.forEach(info => {
      memoryEngine.recordEvent({
        day: gameState.currentDay,
        type: 'conversation',
        participants: [info.source, info.target],
        content: `${info.source} shared: "${info.content}" (${info.reliability})`,
        emotionalImpact: info.type === 'alliance_doubt' ? -2 : 1,
        reliability: 'confirmed',
        strategicImportance: info.type === 'voting_plan' ? 9 : info.type === 'alliance_doubt' ? 7 : 5
      });
    });

    return sharedInfo;
  }

  private generateFakeVotingPlan(gameState: GameState, contestant: Contestant): string {
    // Generate a plausible but false voting target
    const otherContestants = gameState.contestants
      .filter(c => !c.isEliminated && c.name !== contestant.name && c.name !== gameState.playerName)
      .map(c => c.name);
    
    if (otherContestants.length === 0) return "Haven't decided yet";
    
    const fakeTarget = otherContestants[Math.floor(Math.random() * otherContestants.length)];
    return `I'm thinking ${fakeTarget} - they're getting too comfortable`;
  }
}

export const informationSharingEngine = new InformationSharingEngine();
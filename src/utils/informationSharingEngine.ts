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
      trustRequired: 50 // Trust level 50+
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
      trustRequired: 65 // Higher trust needed
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
      trustRequired: 45 // Modest trust needed
    };
  }

  // Generate dynamic information based on game state
  shareInformationWithPlayer(gameState: GameState): SharedInformation[] {
    const sharedInfo: SharedInformation[] = [];
    
    gameState.contestants
      .filter(c => !c.isEliminated && c.name !== gameState.playerName)
      .forEach(contestant => {
        // Use psychological trust levels directly from contestants
        const trustLevel = contestant.psychProfile?.trustLevel || 0;
        const suspicionLevel = contestant.psychProfile?.suspicionLevel || 50;
        
        // Base willingness to share on actual psychological state
        const baseTrust = Math.max(0, trustLevel + 100) / 2; // Convert -100-100 to 0-100
        const adjustedTrust = Math.max(0, baseTrust - suspicionLevel * 0.3);
        
        if (adjustedTrust < 30) return; // Need minimum trust

        // Generate voting intel
        if (adjustedTrust >= 40 && Math.random() < 0.7) {
          const willLie = adjustedTrust < 60 || suspicionLevel > 70;
          const targets = gameState.contestants.filter(c => 
            !c.isEliminated && c.name !== contestant.name && c.name !== gameState.playerName
          );
          
          if (targets.length > 0) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            const truthfulPlan = `I'm considering voting for ${target.name} - they're playing too hard`;
            const deceptivePlan = `I'm thinking about ${gameState.playerName} but don't tell anyone`;
            
            sharedInfo.push({
              type: 'voting_plan',
              source: contestant.name,
              target: gameState.playerName,
              content: willLie ? deceptivePlan : truthfulPlan,
              reliability: willLie ? 'lie' : 'truth',
              trustRequired: 40
            });
          }
        }

        // Share alliance concerns
        if (adjustedTrust >= 50 && gameState.alliances.length > 0 && Math.random() < 0.5) {
          const playerAlliances = gameState.alliances.filter(a => 
            a.members.includes(contestant.name) && a.members.includes(gameState.playerName)
          );
          
          if (playerAlliances.length > 0) {
            const alliance = playerAlliances[0];
            const otherMembers = alliance.members.filter(m => m !== contestant.name && m !== gameState.playerName);
            
            if (otherMembers.length > 0) {
              const concernedAbout = otherMembers[Math.floor(Math.random() * otherMembers.length)];
              sharedInfo.push({
                type: 'alliance_doubt',
                source: contestant.name,
                target: gameState.playerName,
                content: `I'm worried about ${concernedAbout}. They've been acting differently lately`,
                reliability: 'truth',
                trustRequired: 50
              });
            }
          }
        }

        // Share strategic observations
        if (adjustedTrust >= 35 && Math.random() < 0.8) {
          const strategicObservations = [
            "There's definitely a power alliance I'm not part of",
            "Someone has been spreading rumors about me",
            "I think there might be a secret final two deal somewhere",
            "The vote tonight feels like it could go either way"
          ];
          
          sharedInfo.push({
            type: 'strategic_concern',
            source: contestant.name,
            target: gameState.playerName,
            content: strategicObservations[Math.floor(Math.random() * strategicObservations.length)],
            reliability: 'truth',
            trustRequired: 35
          });
        }
      });

    // Record information sharing in memory
    sharedInfo.forEach(info => {
      memoryEngine.recordEvent({
        day: gameState.currentDay,
        type: 'conversation',
        participants: [info.source, info.target],
        content: `${info.source} shared intel: "${info.content}" (${info.reliability})`,
        emotionalImpact: info.type === 'alliance_doubt' ? -2 : 1,
        reliability: info.reliability === 'truth' ? 'confirmed' : info.reliability === 'lie' ? 'rumor' : 'speculation',
        strategicImportance: info.type === 'voting_plan' ? 9 : info.type === 'alliance_doubt' ? 7 : 5,
        witnessed: [] // Information sharing is typically private
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
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

  // Generate dynamic information based on game state with proper integration
  shareInformationWithPlayer(gameState: GameState): SharedInformation[] {
    const sharedInfo: SharedInformation[] = [];
    
    gameState.contestants
      .filter(c => !c.isEliminated && c.name !== gameState.playerName)
      .forEach(contestant => {
        // Check both relationship graph AND psychological profiles
        const relationship = relationshipGraphEngine.getRelationship(contestant.name, gameState.playerName);
        const psychTrust = contestant.psychProfile?.trustLevel || 0;
        const psychSuspicion = contestant.psychProfile?.suspicionLevel || 50;
        
        // Use relationship graph trust if available, otherwise fall back to psych profile
        let finalTrust = 50;
        if (relationship && !isNaN(relationship.trust)) {
          finalTrust = relationship.trust;
        } else if (!isNaN(psychTrust)) {
          // Convert psychological trust (-100 to 100) to normal scale (0 to 100)
          finalTrust = Math.max(0, Math.min(100, (psychTrust + 100) / 2));
        }
        
        // Minimum trust threshold
        if (finalTrust < 35) return;
        
        console.log(`[InfoSharing] ${contestant.name} -> ${gameState.playerName}: trust=${finalTrust}, psychTrust=${psychTrust}, relTrust=${relationship?.trust || 'N/A'}`);

        // Generate voting plans (highest trust requirement)
        if (finalTrust >= 45 && Math.random() < 0.6) {
          const targets = gameState.contestants.filter(c => 
            !c.isEliminated && c.name !== contestant.name && c.name !== gameState.playerName
          );
          
          if (targets.length > 0) {
            const willLie = finalTrust < 65 || psychSuspicion > 65;
            const target = targets[Math.floor(Math.random() * targets.length)];
            
            const truthfulPlans = [
              `I'm planning to vote for ${target.name} - they're getting too powerful`,
              `${target.name} is my target tonight. They've been playing too hard`,
              `I think we should get ${target.name} out before they make a big move`,
              `${target.name} has been throwing my name around, so they have to go`
            ];
            
            const deceptivePlans = [
              `I'm totally loyal to our alliance, not targeting anyone specific`,
              `I haven't decided yet, probably going with the group`,
              `Maybe ${gameState.playerName}? Just kidding! I'm voting with you`,
              `I trust you completely, we're in this together`
            ];
            
            sharedInfo.push({
              type: 'voting_plan',
              source: contestant.name,
              target: gameState.playerName,
              content: willLie ? 
                deceptivePlans[Math.floor(Math.random() * deceptivePlans.length)] :
                truthfulPlans[Math.floor(Math.random() * truthfulPlans.length)],
              reliability: willLie ? 'lie' : 'truth',
              trustRequired: 45
            });
          }
        }

        // Generate alliance intelligence (medium trust)
        if (finalTrust >= 40 && gameState.alliances.length > 0 && Math.random() < 0.5) {
          const concernOptions = [
            `I think there's a secret alliance I'm not part of`,
            `Someone in our group has been acting shady lately`,
            `I'm worried about people making side deals`,
            `There might be a power couple running things`,
            `I've noticed some people whispering when I'm not around`
          ];
          
          sharedInfo.push({
            type: 'alliance_doubt',
            source: contestant.name,
            target: gameState.playerName,
            content: concernOptions[Math.floor(Math.random() * concernOptions.length)],
            reliability: 'truth',
            trustRequired: 40
          });
        }

        // Generate strategic observations (lower trust)
        if (finalTrust >= 35 && Math.random() < 0.7) {
          const strategicOptions = [
            `The vote tonight could go either way`,
            `I feel like the house is divided right now`,
            `People are getting paranoid about big moves`,
            `I think someone's going to make a bold play soon`,
            `The dynamics are shifting and I'm trying to stay flexible`,
            `I'm keeping my options open for now`,
            `Things feel tense lately, like something big is coming`
          ];
          
          sharedInfo.push({
            type: 'strategic_concern',
            source: contestant.name,
            target: gameState.playerName,
            content: strategicOptions[Math.floor(Math.random() * strategicOptions.length)],
            reliability: 'truth',
            trustRequired: 35
          });
        }
      });

    // Record information sharing in memory with proper event tracking
    sharedInfo.forEach(info => {
      memoryEngine.recordEvent({
        day: gameState.currentDay,
        type: 'conversation',
        participants: [info.source, info.target],
        content: `Intel shared: "${info.content}" (${info.reliability})`,
        emotionalImpact: info.type === 'voting_plan' ? 5 : info.type === 'alliance_doubt' ? 3 : 1,
        reliability: info.reliability === 'truth' ? 'confirmed' : info.reliability === 'lie' ? 'rumor' : 'speculation',
        strategicImportance: info.type === 'voting_plan' ? 9 : info.type === 'alliance_doubt' ? 7 : 5,
        witnessed: [] // Information sharing is private
      });
    });

    console.log(`[InfoSharing] Generated ${sharedInfo.length} intelligence items for day ${gameState.currentDay}`);
    return sharedInfo.slice(0, 4); // Limit to prevent overwhelming
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
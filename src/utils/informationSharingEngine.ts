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

  // Generate relevant, game-tied information based on current events
  shareInformationWithPlayer(gameState: GameState): SharedInformation[] {
    const sharedInfo: SharedInformation[] = [];
    
    // Get recent game events for context
    const recentMemories = gameState.contestants
      .filter(c => !c.isEliminated)
      .flatMap(c => c.memory || [])
      .filter(m => m.day >= gameState.currentDay - 2)
      .sort((a, b) => b.day - a.day);

    const recentInteractions = gameState.interactionLog
      ?.filter(log => log.day >= gameState.currentDay - 1) || [];
    
    gameState.contestants
      .filter(c => !c.isEliminated && c.name !== gameState.playerName)
      .forEach(contestant => {
        // Use relationship graph for accurate trust
        const relationship = relationshipGraphEngine.getRelationship(contestant.name, gameState.playerName);
        if (!relationship) return;
        
        const finalTrust = relationship.trust;
        const suspicion = relationship.suspicion;
        
        // Minimum trust threshold - must have some relationship
        if (finalTrust < 40) return;
        
        console.log(`[InfoSharing] ${contestant.name} -> ${gameState.playerName}: trust=${finalTrust}, suspicion=${suspicion}`);

        // Generate contextual voting intelligence based on recent events
        if (finalTrust >= 50 && Math.random() < 0.7) {
          const otherContestants = gameState.contestants.filter(c => 
            !c.isEliminated && c.name !== contestant.name && c.name !== gameState.playerName
          );
          
          if (otherContestants.length > 0) {
            // Base lie likelihood on trust and recent interactions
            const recentConflict = recentInteractions.some(log => 
              log.participants.includes(contestant.name) && log.tone === 'aggressive'
            );
            const willLie = finalTrust < 70 || suspicion > 50 || recentConflict;
            
            // Pick targets based on recent game events
            const targetOptions = otherContestants.filter(c => {
              // Prefer targets mentioned in recent memories or high-trust contestants
              const mentionedRecently = recentMemories.some(m => 
                m.content.toLowerCase().includes(c.name.toLowerCase())
              );
              const hasHighTrust = gameState.contestants.find(cont => cont.name === c.name)
                ?.psychProfile?.trustLevel > 20;
              return mentionedRecently || hasHighTrust;
            });
            
            const target = targetOptions.length > 0 ? 
              targetOptions[Math.floor(Math.random() * targetOptions.length)] :
              otherContestants[Math.floor(Math.random() * otherContestants.length)];
            
            const truthfulPlans = [
              `I'm targeting ${target.name} - they're playing everyone`,
              `${target.name} is dangerous, we need to get them out`,
              `I heard ${target.name} mention your name, they might come for you next`,
              `${target.name} has too many connections, time to cut them loose`
            ];
            
            const deceptivePlans = [
              `I'm sticking with our group, haven't picked a target yet`,
              `Probably just going with the house this time`,
              `I trust you completely, we're voting together right?`,
              `Still deciding, but definitely not you!`
            ];
            
            sharedInfo.push({
              type: 'voting_plan',
              source: contestant.name,
              target: gameState.playerName,
              content: willLie ? 
                deceptivePlans[Math.floor(Math.random() * deceptivePlans.length)] :
                truthfulPlans[Math.floor(Math.random() * truthfulPlans.length)],
              reliability: willLie ? 'lie' : 'truth',
              trustRequired: 50
            });
          }
        }

        // Generate alliance-specific intel based on actual alliance membership
        if (finalTrust >= 45 && gameState.alliances.length > 0 && Math.random() < 0.6) {
          const playerAlliances = gameState.alliances.filter(a => a.members.includes(gameState.playerName));
          const contestantAlliances = gameState.alliances.filter(a => a.members.includes(contestant.name));
          
          // Different intel based on alliance relationship
          let allianceIntel = '';
          if (playerAlliances.some(pa => contestantAlliances.some(ca => ca.id === pa.id))) {
            // Same alliance - insider information
            const otherAlliances = gameState.alliances.filter(a => 
              !a.members.includes(gameState.playerName) && !a.members.includes(contestant.name)
            );
            if (otherAlliances.length > 0) {
              const targetAlliance = otherAlliances[Math.floor(Math.random() * otherAlliances.length)];
              allianceIntel = `I think ${targetAlliance.members.join(' and ')} are working together behind our backs`;
            } else {
              allianceIntel = `Some people are getting suspicious of our alliance, we need to lay low`;
            }
          } else {
            // Different alliances - more general suspicion
            const suspiciousMembers = gameState.alliances
              .flatMap(a => a.members)
              .filter(m => m !== contestant.name && m !== gameState.playerName);
            if (suspiciousMembers.length > 0) {
              const suspect = suspiciousMembers[Math.floor(Math.random() * suspiciousMembers.length)];
              allianceIntel = `I'm worried ${suspect} is playing multiple sides`;
            } else {
              allianceIntel = `I think there are secret deals happening that we don't know about`;
            }
          }
          
          if (allianceIntel) {
            sharedInfo.push({
              type: 'alliance_doubt',
              source: contestant.name,
              target: gameState.playerName,
              content: allianceIntel,
              reliability: 'truth',
              trustRequired: 45
            });
          }
        }

        // Generate event-based strategic concerns
        if (finalTrust >= 40 && Math.random() < 0.8) {
          let strategicConcern = '';
          
          // Base concerns on recent game events
          if (gameState.currentDay > 10 && gameState.contestants.filter(c => !c.isEliminated).length < 8) {
            strategicConcern = `We're getting close to finale - people are going to start making big moves`;
          } else if (recentMemories.some(m => m.type === 'scheme')) {
            strategicConcern = `Someone's been scheming lately, I can feel the tension in the house`;
          } else if (gameState.immunityWinner) {
            strategicConcern = `${gameState.immunityWinner} winning immunity changes everything for tonight`;
          } else if (gameState.alliances.length > 2) {
            strategicConcern = `There are too many alliances in this house, someone's playing multiple sides`;
          } else {
            const defaultConcerns = [
              `The house dynamics are shifting, I need to stay flexible`,
              `People are getting paranoid - everyone's watching everyone`,
              `I feel like a big move is coming soon`,
              `The power balance could flip at any moment`
            ];
            strategicConcern = defaultConcerns[Math.floor(Math.random() * defaultConcerns.length)];
          }
          
          sharedInfo.push({
            type: 'strategic_concern',
            source: contestant.name,
            target: gameState.playerName,
            content: strategicConcern,
            reliability: 'truth',
            trustRequired: 40
          });
        }
      });

    // Record information sharing events
    sharedInfo.forEach(info => {
      if (gameState.interactionLog) {
        gameState.interactionLog.push({
          day: gameState.currentDay,
          type: 'npc',
          participants: [info.source, info.target],
          content: `${info.source} shared intel: "${info.content}"`,
          source: 'npc'
        });
      }
    });

    console.log(`[InfoSharing] Generated ${sharedInfo.length} relevant intelligence items for day ${gameState.currentDay}`);
    return sharedInfo.slice(0, 3); // Limit to most important
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
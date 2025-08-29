import { GameState, Contestant } from '@/types/game';

export interface SchemeOption {
  id: string;
  title: string;
  description: string;
  target: string;
  risk: 'low' | 'medium' | 'high';
  impact: 'minor' | 'moderate' | 'major';
  requirements?: string[];
  consequences: {
    success: string;
    failure: string;
  };
}

export class EnhancedSchemeEngine {
  static generateSchemeOptions(gameState: GameState, target: string): SchemeOption[] {
    const schemes: SchemeOption[] = [];
    const targetContestant = gameState.contestants.find(c => c.name === target);
    const playerAlliances = gameState.alliances.filter(a => a.members.includes(gameState.playerName));
    const targetAlliances = gameState.alliances.filter(a => a.members.includes(target));
    const activeContestants = gameState.contestants.filter(c => !c.isEliminated);

    if (!targetContestant) return schemes;

    // Trust-based schemes
    if (targetContestant.psychProfile.trustLevel > 60) {
      schemes.push({
        id: 'false-alliance',
        title: 'Propose False Alliance',
        description: `Convince ${target} to form a fake alliance to gain their trust and learn their plans.`,
        target,
        risk: 'medium',
        impact: 'moderate',
        consequences: {
          success: `${target} trusts you more and shares strategic information.`,
          failure: `${target} becomes suspicious and warns others about your duplicity.`
        }
      });
    }

    // Alliance-based schemes
    if (targetAlliances.length > 0) {
      schemes.push({
        id: 'alliance-infiltration',
        title: 'Infiltrate Their Alliance',
        description: `Try to get inside information about ${target}'s alliance plans and voting strategy.`,
        target,
        risk: 'high',
        impact: 'major',
        consequences: {
          success: `You learn critical alliance secrets and voting plans.`,
          failure: `The entire alliance becomes aware of your scheming and targets you.`
        }
      });

      schemes.push({
        id: 'alliance-sabotage',
        title: 'Sabotage Alliance',
        description: `Spread rumors to create distrust between ${target} and their alliance members.`,
        target,
        risk: 'high',
        impact: 'major',
        consequences: {
          success: `${target}'s alliance fractures and they lose key allies.`,
          failure: `Your manipulation is exposed and you become a major target.`
        }
      });
    }

    // Competition schemes
    if (gameState.immunityWinner !== target) {
      schemes.push({
        id: 'throw-competition',
        title: 'Convince to Throw Competition',
        description: `Persuade ${target} that throwing the next immunity challenge would be strategic.`,
        target,
        risk: 'medium',
        impact: 'moderate',
        consequences: {
          success: `${target} loses immunity and becomes vulnerable for elimination.`,
          failure: `${target} realizes your manipulation and becomes more competitive.`
        }
      });
    }

    // Information schemes
    schemes.push({
      id: 'false-information',
      title: 'Plant False Information',
      description: `Feed ${target} incorrect information about who others are targeting.`,
      target,
      risk: 'medium',
      impact: 'moderate',
      consequences: {
        success: `${target} makes poor strategic decisions based on false intel.`,
        failure: `${target} discovers the lie and exposes your deception to others.`
      }
    });

    // Isolation schemes
    if (activeContestants.length > 5) {
      schemes.push({
        id: 'social-isolation',
        title: 'Isolate Socially',
        description: `Turn others against ${target} by highlighting their threat level and past betrayals.`,
        target,
        risk: 'low',
        impact: 'moderate',
        consequences: {
          success: `${target} becomes isolated and loses social connections.`,
          failure: `Others see through your campaign and question your motives.`
        }
      });
    }

    // Voting schemes
    schemes.push({
      id: 'vote-split',
      title: 'Split the Vote',
      description: `Orchestrate a vote split to ensure ${target} goes home even with an alliance.`,
      target,
      risk: 'high',
      impact: 'major',
      requirements: ['Need majority alliance', 'Multiple targets needed'],
      consequences: {
        success: `${target} is eliminated despite thinking they're safe.`,
        failure: `The vote backfires and one of your allies goes home instead.`
      }
    });

    // Late-game schemes
    if (activeContestants.length <= 7) {
      schemes.push({
        id: 'jury-poison',
        title: 'Poison Jury Against Them',
        description: `Influence eliminated contestants to view ${target} negatively for final jury votes.`,
        target,
        risk: 'low',
        impact: 'major',
        consequences: {
          success: `${target} loses crucial jury votes if they reach the finals.`,
          failure: `Jury members tell ${target} about your campaign against them.`
        }
      });
    }

    return schemes.slice(0, 4); // Return top 4 schemes
  }

  static executeScheme(scheme: SchemeOption, gameState: GameState): {
    success: boolean;
    outcome: string;
    relationshipChanges: { [name: string]: number };
    trustChanges: { [name: string]: number };
  } {
    const target = scheme.target;
    const targetContestant = gameState.contestants.find(c => c.name === target);
    let success = false;
    let outcome = '';
    const relationshipChanges: { [name: string]: number } = {};
    const trustChanges: { [name: string]: number } = {};

    if (!targetContestant) {
      return { success: false, outcome: 'Target not found', relationshipChanges, trustChanges };
    }

    // Calculate success chance based on scheme type and target's trust level
    let successChance = 0.5; // Base 50%
    
    switch (scheme.risk) {
      case 'low':
        successChance = 0.75;
        break;
      case 'medium':
        successChance = 0.6;
        break;
      case 'high':
        successChance = 0.4;
        break;
    }

    // Adjust based on target's trust level
    if (targetContestant.psychProfile.trustLevel > 70) {
      successChance += 0.2; // Easier to manipulate trusting people
    } else if (targetContestant.psychProfile.trustLevel < 30) {
      successChance -= 0.2; // Harder to manipulate suspicious people
    }

    // Execute the scheme
    success = Math.random() < successChance;

    if (success) {
      outcome = scheme.consequences.success;
      
      // Apply positive effects for successful schemes
      switch (scheme.id) {
        case 'false-alliance':
          trustChanges[target] = 15;
          relationshipChanges[target] = 10;
          break;
        case 'alliance-infiltration':
          // Player gains strategic advantage
          break;
        case 'alliance-sabotage':
          trustChanges[target] = -25;
          // Damage relationships within target's alliance
          gameState.alliances.filter(a => a.members.includes(target)).forEach(alliance => {
            alliance.members.forEach(member => {
              if (member !== target && member !== gameState.playerName) {
                relationshipChanges[member] = -10;
              }
            });
          });
          break;
        case 'social-isolation':
          relationshipChanges[target] = -15;
          break;
        case 'false-information':
          // Target makes poor decisions (handled in AI logic)
          break;
      }
    } else {
      outcome = scheme.consequences.failure;
      
      // Apply negative effects for failed schemes
      trustChanges[target] = -20;
      relationshipChanges[target] = -15;
      
      // Some failed schemes affect relationships with others
      if (scheme.id === 'alliance-sabotage' || scheme.id === 'vote-split') {
        // Others become suspicious of player
        gameState.contestants.filter(c => !c.isEliminated && c.name !== gameState.playerName).forEach(contestant => {
          if (Math.random() < 0.3) { // 30% chance others learn about failed scheme
            trustChanges[contestant.name] = (trustChanges[contestant.name] || 0) - 10;
            relationshipChanges[contestant.name] = (relationshipChanges[contestant.name] || 0) - 5;
          }
        });
      }
    }

    return { success, outcome, relationshipChanges, trustChanges };
  }
}

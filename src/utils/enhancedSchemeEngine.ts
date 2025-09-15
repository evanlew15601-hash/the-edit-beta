import { GameState, Contestant } from '@/types/game';

export interface SchemeOption {
  id: string;
  title: string;
  description: string;
  target: string;
  schemeType: 'cooperative' | 'aggressive' | 'manipulative' | 'informational';
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

    // COOPERATIVE SCHEMES - Working WITH the target
    if (targetContestant.psychProfile.trustLevel > 50) {
      schemes.push({
        id: 'form-alliance',
        title: 'Form Alliance',
        description: `Propose a strategic alliance with ${target} to coordinate votes and share information.`,
        target,
        schemeType: 'cooperative',
        risk: 'medium',
        impact: 'moderate',
        consequences: {
          success: `${target} trusts you more and becomes a valuable ally.`,
          failure: `${target} becomes suspicious of your intentions.`
        }
      });
    }

    schemes.push({
      id: 'protect-ally',
      title: 'Protect from Elimination',
      description: `Rally votes to keep ${target} safe by redirecting attention to a bigger threat.`,
      target,
      schemeType: 'cooperative',
      risk: 'medium',
      impact: 'moderate',
      consequences: {
        success: `${target} survives elimination and becomes more loyal to you.`,
        failure: `Your manipulation is exposed and you become a target yourself.`
      }
    });

    // INFORMATION SCHEMES - Gathering intel
    schemes.push({
      id: 'extract-information',
      title: 'Extract Information',
      description: `Use your relationship with ${target} to learn about voting plans and alliances.`,
      target,
      schemeType: 'informational',
      risk: 'low',
      impact: 'moderate',
      consequences: {
        success: `${target} reveals valuable strategic information about other players.`,
        failure: `${target} realizes your manipulation and becomes guarded.`
      }
    });

    schemes.push({
      id: 'plant-false-info',
      title: 'Plant False Information',
      description: `Feed ${target} incorrect information to influence their voting decisions.`,
      target,
      schemeType: 'manipulative',
      risk: 'medium',
      impact: 'moderate',
      consequences: {
        success: `${target} makes poor strategic decisions based on false intel.`,
        failure: `${target} discovers the lie and exposes your deception.`
      }
    });

    // AGGRESSIVE SCHEMES - Working AGAINST the target
    if (targetContestant.psychProfile.trustLevel < 70) {
      schemes.push({
        id: 'target-elimination',
        title: 'Target for Elimination',
        description: `Convince others that ${target} is too dangerous to keep in the game.`,
        target,
        schemeType: 'aggressive',
        risk: 'high',
        impact: 'major',
        consequences: {
          success: `${target} is eliminated through coordinated voting.`,
          failure: `Your manipulation is exposed and you become the primary target.`
        }
      });
    }

    // Alliance-based schemes
    if (targetAlliances.length > 0) {
      schemes.push({
        id: 'infiltrate-alliance',
        title: 'Infiltrate Their Alliance',
        description: `Get inside information about ${target}'s alliance plans and voting strategy.`,
        target,
        schemeType: 'informational',
        risk: 'high',
        impact: 'major',
        consequences: {
          success: `You learn critical alliance secrets and voting plans.`,
          failure: `The entire alliance becomes aware of your scheming.`
        }
      });

      schemes.push({
        id: 'sabotage-alliance',
        title: 'Sabotage Alliance',
        description: `Create distrust between ${target} and their alliance members.`,
        target,
        schemeType: 'aggressive',
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
        schemeType: 'manipulative',
        risk: 'medium',
        impact: 'moderate',
        consequences: {
          success: `${target} loses immunity and becomes vulnerable.`,
          failure: `${target} realizes your manipulation and becomes more competitive.`
        }
      });
    }

    // Vote manipulation schemes
    schemes.push({
      id: 'vote-split',
      title: 'Orchestrate Vote Split',
      description: `Create a vote split scenario involving ${target} to control elimination.`,
      target,
      schemeType: 'manipulative',
      risk: 'high',
      impact: 'major',
      requirements: ['Need multiple allies', 'Requires careful timing'],
      consequences: {
        success: `You control the elimination outcome through strategic vote splitting.`,
        failure: `The vote backfires and one of your allies goes home instead.`
      }
    });

    // Social isolation schemes
    if (activeContestants.length > 5) {
      schemes.push({
        id: 'social-isolation',
        title: 'Isolate Socially',
        description: `Turn others against ${target} by highlighting their threat level.`,
        target,
        schemeType: 'aggressive',
        risk: 'low',
        impact: 'moderate',
        consequences: {
          success: `${target} becomes isolated and loses social connections.`,
          failure: `Others see through your campaign and question your motives.`
        }
      });
    }

    // Late-game schemes
    if (activeContestants.length <= 7) {
      schemes.push({
        id: 'jury-management',
        title: 'Manage Jury Perception',
        description: `Influence how eliminated contestants view ${target} for final jury votes.`,
        target,
        schemeType: 'manipulative',
        risk: 'low',
        impact: 'major',
        consequences: {
          success: `You influence jury perception of ${target} for the finale.`,
          failure: `Jury members expose your manipulation attempts.`
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

    // Adjust based on target's trust level and scheme type
    if (scheme.schemeType === 'cooperative') {
      if (targetContestant.psychProfile.trustLevel > 70) {
        successChance += 0.2; // Easier to work with trusting people
      }
    } else if (scheme.schemeType === 'aggressive') {
      if (targetContestant.psychProfile.trustLevel < 30) {
        successChance -= 0.2; // Harder to manipulate suspicious people
      }
    }

    // Execute the scheme
    success = Math.random() < successChance;

    if (success) {
      outcome = scheme.consequences.success;
      
      // Apply effects based on scheme type and success
      switch (scheme.schemeType) {
        case 'cooperative':
          trustChanges[target] = 15;
          relationshipChanges[target] = 10;
          break;
        case 'informational':
          // Gain strategic advantage (handled in game logic)
          break;
        case 'manipulative':
          // Variable effects based on specific scheme
          if (scheme.id === 'plant-false-info') {
            trustChanges[target] = 5; // Slight trust gain from perceived cooperation
          }
          break;
        case 'aggressive':
          if (scheme.id === 'sabotage-alliance') {
            trustChanges[target] = -25;
            // Damage relationships within target's alliance
            gameState.alliances.filter(a => a.members.includes(target)).forEach(alliance => {
              alliance.members.forEach(member => {
                if (member !== target && member !== gameState.playerName) {
                  relationshipChanges[member] = -10;
                }
              });
            });
          } else if (scheme.id === 'social-isolation') {
            relationshipChanges[target] = -15;
          }
          break;
      }
    } else {
      outcome = scheme.consequences.failure;
      
      // Apply negative effects for failed schemes
      trustChanges[target] = -20;
      relationshipChanges[target] = -15;
      
      // Some failed schemes affect relationships with others
      if (scheme.schemeType === 'aggressive' || scheme.risk === 'high') {
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

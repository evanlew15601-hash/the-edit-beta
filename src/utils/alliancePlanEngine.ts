import { GameState, Contestant, Alliance } from '@/types/game';

export interface AlliancePlan {
  id: string;
  title: string;
  description: string;
  type: 'voting' | 'strategic' | 'social' | 'information';
  targetDay: number;
  requiredSupport: number; // percentage of alliance needed
  difficulty: 'easy' | 'medium' | 'hard';
  risks: string[];
  benefits: string[];
  memberRoles: Record<string, string>;
  evidence: string; // Why this plan makes sense
  backup?: string; // Fallback plan
}

export interface MemberResponse {
  memberId: string;
  response: 'accept' | 'conditional' | 'reject';
  reasoning: string;
  conditions?: string[]; // If response is conditional
  trustImpact: number; // How this affects trust with player
  memoryEntry: string; // What they'll remember about this plan
}

export class AlliancePlanEngine {
  /**
   * Generate contextual alliance plans based on game state
   */
  static generateAlliancePlans(alliance: Alliance, gameState: GameState): AlliancePlan[] {
    const plans: AlliancePlan[] = [];
    const remainingPlayers = gameState.contestants.filter(c => !c.isEliminated).length;
    const nonAllianceMembers = gameState.contestants.filter(c => 
      !c.isEliminated && !alliance.members.includes(c.name)
    );

    // Voting Plans
    if (gameState.gamePhase === 'player_vote' || gameState.currentDay === gameState.nextEliminationDay) {
      const threats = nonAllianceMembers.filter(c => 
        c.psychProfile.suspicionLevel > 70 || 
        c.psychProfile.disposition.includes('Strategic')
      );

      if (threats.length > 0) {
        const target = threats[0];
        plans.push({
          id: `eliminate-${target.name}-${gameState.currentDay}`,
          title: `Eliminate ${target.name}`,
          description: `Coordinate votes to eliminate ${target.name} who poses a strategic threat`,
          type: 'voting',
          targetDay: gameState.nextEliminationDay,
          requiredSupport: 75,
          difficulty: target.psychProfile.trustLevel > 60 ? 'hard' : 'medium',
          risks: [
            'May expose alliance if votes are obvious',
            'Could create backlash from their allies',
            'Might solidify opposition against us'
          ],
          benefits: [
            'Remove major strategic threat',
            'Increase alliance safety',
            'Test alliance unity and coordination'
          ],
          memberRoles: this.assignVotingRoles(alliance, target, gameState),
          evidence: `${target.name} has ${target.psychProfile.suspicionLevel}% suspicion and shows ${target.psychProfile.disposition.join(', ')} tendencies. Recent actions suggest they're targeting alliance members.`,
          backup: 'If plan fails, distance ourselves and blame external pressure'
        });
      }

      // Split vote plan if alliance is large
      if (alliance.members.length >= 4 && nonAllianceMembers.length >= 3) {
        plans.push({
          id: `split-vote-${gameState.currentDay}`,
          title: 'Split Vote Strategy',
          description: 'Split votes between two targets to control elimination outcome',
          type: 'voting',
          targetDay: gameState.nextEliminationDay,
          requiredSupport: 85,
          difficulty: 'hard',
          risks: [
            'Complex coordination required',
            'May backfire if others catch on',
            'Could eliminate wrong person'
          ],
          benefits: [
            'Control elimination regardless of other votes',
            'Hide alliance size',
            'Force tie-breaker advantage'
          ],
          memberRoles: this.assignSplitVoteRoles(alliance, nonAllianceMembers.slice(0, 2), gameState),
          evidence: `Alliance has ${alliance.members.length} members vs ${nonAllianceMembers.length} outsiders. Large enough to control outcome while hiding numbers.`,
          backup: 'Consolidate votes on primary target if plan is discovered'
        });
      }
    }

    // Information Gathering Plans
    const informationTargets = nonAllianceMembers.filter(c => 
      c.psychProfile.trustLevel < 40 || 
      gameState.alliances.some(a => a.members.includes(c.name) && !a.members.includes(gameState.playerName))
    );

    if (informationTargets.length > 0) {
      const target = informationTargets[0];
      plans.push({
        id: `intel-${target.name}-${gameState.currentDay}`,
        title: `Gather Intel on ${target.name}`,
        description: `Coordinate information gathering about ${target.name}'s plans and alliances`,
        type: 'information',
        targetDay: gameState.currentDay + 1,
        requiredSupport: 60,
        difficulty: 'medium',
        risks: [
          'May tip them off to our interest',
          'Could expose alliance coordination'
        ],
        benefits: [
          'Learn their voting plans',
          'Discover hidden alliances',
          'Identify threats early'
        ],
        memberRoles: this.assignIntelRoles(alliance, target, gameState),
        evidence: `${target.name} has low trust (${target.psychProfile.trustLevel}%) and may be in external alliances. Recent behavior suggests hidden agenda.`,
        backup: 'If compromised, claim individual curiosity rather than alliance operation'
      });
    }

    // Strategic Positioning Plans
    if (remainingPlayers <= 8) {
      plans.push({
        id: `endgame-position-${gameState.currentDay}`,
        title: 'End Game Positioning',
        description: 'Prepare alliance for final phases by managing threat levels and jury perception',
        type: 'strategic',
        targetDay: gameState.currentDay + 2,
        requiredSupport: 70,
        difficulty: 'medium',
        risks: [
          'May create internal alliance tension',
          'Could be seen as premature planning'
        ],
        benefits: [
          'Better final positioning',
          'Manage jury perception',
          'Prepare for alliance breakup'
        ],
        memberRoles: this.assignEndGameRoles(alliance, gameState),
        evidence: `Only ${remainingPlayers} players remain. Alliance must prepare for end game dynamics and individual positioning.`,
        backup: 'Maintain alliance unity if plan creates friction'
      });
    }

    // Social Bonding Plans
    if (alliance.strength < 70) {
      plans.push({
        id: `strengthen-bonds-${gameState.currentDay}`,
        title: 'Strengthen Alliance Bonds',
        description: 'Coordinate activities and conversations to improve alliance trust and unity',
        type: 'social',
        targetDay: gameState.currentDay + 1,
        requiredSupport: 50,
        difficulty: 'easy',
        risks: [
          'May seem forced or artificial',
          'Could waste time on non-strategic activities'
        ],
        benefits: [
          'Improve alliance trust levels',
          'Better coordination in future',
          'Stronger loyalty in critical moments'
        ],
        memberRoles: this.assignBondingRoles(alliance, gameState),
        evidence: `Alliance strength is only ${alliance.strength}%. Recent tensions and low trust require active relationship management.`,
        backup: 'Focus on individual relationship building if group bonding fails'
      });
    }

    return plans.slice(0, 4); // Limit to most relevant plans
  }

  /**
   * Generate member responses to proposed plans
   */
  static getMemberResponses(plan: AlliancePlan, alliance: Alliance, gameState: GameState): Record<string, MemberResponse> {
    const responses: Record<string, MemberResponse> = {};
    
    alliance.members
      .filter(member => member !== gameState.playerName)
      .forEach(memberId => {
        const member = gameState.contestants.find(c => c.name === memberId);
        if (!member) return;

        responses[memberId] = this.generateMemberResponse(member, plan, alliance, gameState);
      });

    return responses;
  }

  private static generateMemberResponse(
    member: Contestant, 
    plan: AlliancePlan, 
    alliance: Alliance, 
    gameState: GameState
  ): MemberResponse {
    const trustLevel = member.psychProfile.trustLevel || 0;
    const suspicionLevel = member.psychProfile.suspicionLevel || 0;
    const disposition = member.psychProfile.disposition || [];
    
    // Base acceptance chance based on trust and plan difficulty
    let acceptanceChance = 0.3; // Base 30%
    
    // Trust modifiers
    if (trustLevel > 70) acceptanceChance += 0.4;
    else if (trustLevel > 40) acceptanceChance += 0.2;
    else if (trustLevel < 20) acceptanceChance -= 0.3;
    
    // Plan difficulty modifiers
    if (plan.difficulty === 'easy') acceptanceChance += 0.2;
    else if (plan.difficulty === 'hard') acceptanceChance -= 0.3;
    
    // Disposition modifiers
    if (disposition.includes('Strategic') && plan.type === 'strategic') acceptanceChance += 0.3;
    if (disposition.includes('Social') && plan.type === 'social') acceptanceChance += 0.2;
    if (disposition.includes('Paranoid')) acceptanceChance -= 0.2;
    if (disposition.includes('Aggressive') && plan.type === 'voting') acceptanceChance += 0.2;
    
    // Alliance strength modifier
    acceptanceChance += (alliance.strength - 50) / 200; // -0.25 to +0.25
    
    // Plan-specific logic
    if (plan.type === 'voting') {
      // Check if they have relationships with the target
      const planTarget = plan.id.includes('eliminate-') ? plan.id.split('eliminate-')[1].split('-')[0] : null;
      if (planTarget) {
        const targetRelationship = member.memory.find(m => 
          m.participants.includes(planTarget) && m.emotionalImpact > 5
        );
        if (targetRelationship) acceptanceChance -= 0.4; // Don't want to eliminate friends
      }
    }
    
    // Generate response based on acceptance chance
    const roll = Math.random();
    
    let response: 'accept' | 'conditional' | 'reject';
    let reasoning: string;
    let conditions: string[] = [];
    let trustImpact: number;
    let memoryEntry: string;
    
    if (roll < acceptanceChance) {
      response = 'accept';
      trustImpact = 3;
      reasoning = this.generateAcceptanceReasoning(member, plan, disposition);
      memoryEntry = `Agreed to alliance plan: ${plan.title}. Trusting ${gameState.playerName}'s leadership.`;
    } else if (roll < acceptanceChance + 0.3) {
      response = 'conditional';
      trustImpact = 1;
      conditions = this.generateConditions(member, plan, gameState);
      reasoning = this.generateConditionalReasoning(member, plan, conditions);
      memoryEntry = `Conditionally agreed to ${plan.title} with specific requirements. ${gameState.playerName} proposed this plan.`;
    } else {
      response = 'reject';
      trustImpact = -2;
      reasoning = this.generateRejectionReasoning(member, plan, disposition);
      memoryEntry = `Rejected alliance plan: ${plan.title}. Disagreed with ${gameState.playerName}'s approach.`;
    }
    
    // Modify trust impact based on member personality
    if (disposition.includes('Loyal')) trustImpact += 1;
    if (disposition.includes('Paranoid')) trustImpact -= 1;
    
    return {
      memberId: member.name,
      response,
      reasoning,
      conditions: conditions.length > 0 ? conditions : undefined,
      trustImpact,
      memoryEntry
    };
  }

  private static assignVotingRoles(alliance: Alliance, target: Contestant, gameState: GameState): Record<string, string> {
    const roles: Record<string, string> = {};
    const members = alliance.members.filter(m => m !== gameState.playerName);
    
    members.forEach((member, index) => {
      if (index === 0) {
        roles[member] = `Approach ${target.name} to gauge their suspicions and voting plans`;
      } else if (index === 1) {
        roles[member] = `Coordinate with swing voters to ensure majority`;
      } else {
        roles[member] = `Vote for ${target.name} and provide cover story if questioned`;
      }
    });
    
    return roles;
  }

  private static assignSplitVoteRoles(alliance: Alliance, targets: Contestant[], gameState: GameState): Record<string, string> {
    const roles: Record<string, string> = {};
    const members = alliance.members.filter(m => m !== gameState.playerName);
    
    members.forEach((member, index) => {
      const targetIndex = index % targets.length;
      const target = targets[targetIndex];
      roles[member] = `Vote for ${target.name} as part of split vote strategy`;
    });
    
    return roles;
  }

  private static assignIntelRoles(alliance: Alliance, target: Contestant, gameState: GameState): Record<string, string> {
    const roles: Record<string, string> = {};
    const members = alliance.members.filter(m => m !== gameState.playerName);
    
    members.forEach((member, index) => {
      switch (index % 3) {
        case 0:
          roles[member] = `Have casual conversations with ${target.name} to learn their plans`;
          break;
        case 1:
          roles[member] = `Monitor ${target.name}'s interactions with other players`;
          break;
        default:
          roles[member] = `Gather intel from ${target.name}'s known allies about their strategy`;
      }
    });
    
    return roles;
  }

  private static assignEndGameRoles(alliance: Alliance, gameState: GameState): Record<string, string> {
    const roles: Record<string, string> = {};
    const members = alliance.members.filter(m => m !== gameState.playerName);
    
    members.forEach((member, index) => {
      switch (index % 3) {
        case 0:
          roles[member] = `Focus on jury management and maintaining positive relationships`;
          break;
        case 1:
          roles[member] = `Monitor threat levels and identify when to break alliance`;
          break;
        default:
          roles[member] = `Position yourself as the alliance member most deserving of final spots`;
      }
    });
    
    return roles;
  }

  private static assignBondingRoles(alliance: Alliance, gameState: GameState): Record<string, string> {
    const roles: Record<string, string> = {};
    const members = alliance.members.filter(m => m !== gameState.playerName);
    
    members.forEach((member, index) => {
      switch (index % 2) {
        case 0:
          roles[member] = `Organize group activities and meals to strengthen bonds`;
          break;
        default:
          roles[member] = `Have one-on-one conversations to address any concerns`;
      }
    });
    
    return roles;
  }

  private static generateAcceptanceReasoning(member: Contestant, plan: AlliancePlan, disposition: string[]): string {
    if (disposition.includes('Strategic')) {
      return `This plan aligns with my strategic goals. I see the tactical value and I trust this alliance to execute it properly.`;
    } else if (disposition.includes('Loyal')) {
      return `I'm committed to this alliance and will support the plan. We're stronger when we work together.`;
    } else if (disposition.includes('Social')) {
      return `I trust the group's judgment on this. If everyone thinks it's the right move, I'm in.`;
    } else {
      return `The plan makes sense given our current position. I'm willing to go along with it.`;
    }
  }

  private static generateConditionalReasoning(member: Contestant, plan: AlliancePlan, conditions: string[]): string {
    return `I like the general idea, but I have some concerns. I'll support it if we can address: ${conditions.join(', ')}.`;
  }

  private static generateRejectionReasoning(member: Contestant, plan: AlliancePlan, disposition: string[]): string {
    if (disposition.includes('Paranoid')) {
      return `This plan feels too risky and could expose us. I think we should be more cautious right now.`;
    } else if (disposition.includes('Independent')) {
      return `I prefer to keep my options open rather than commit to this specific approach.`;
    } else if (plan.difficulty === 'hard') {
      return `This plan is too complex and has too many ways it could go wrong. I'd rather pursue simpler strategies.`;
    } else {
      return `I don't think this is the right timing for this plan. Maybe we should revisit it later.`;
    }
  }

  private static generateConditions(member: Contestant, plan: AlliancePlan, gameState: GameState): string[] {
    const conditions: string[] = [];
    const disposition = member.psychProfile.disposition || [];
    
    if (disposition.includes('Paranoid')) {
      conditions.push('Better exit strategy if plan is discovered');
      conditions.push('Confirmation that no one suspects our alliance');
    }
    
    if (plan.type === 'voting') {
      conditions.push('Unanimous alliance agreement on the target');
      if (plan.difficulty === 'hard') {
        conditions.push('Backup plan if votes don\'t align as expected');
      }
    }
    
    if (plan.type === 'information') {
      conditions.push('Ensure our intel gathering looks natural');
      conditions.push('Share all discovered information with the full alliance');
    }
    
    if (member.psychProfile.trustLevel < 50) {
      conditions.push('More clarity on long-term alliance strategy');
    }
    
    return conditions.slice(0, 2); // Max 2 conditions to keep reasonable
  }
}
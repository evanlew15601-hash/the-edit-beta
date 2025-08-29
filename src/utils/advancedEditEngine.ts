import { GameState } from '@/types/game';

export interface AdvancedEdit {
  persona: 'Hero' | 'Villain' | 'Underedited' | 'Ghosted' | 'Comic Relief' | 'Dark Horse' | 'Strategist' | 'Social Player' | 'Underdog' | 'Mastermind';
  subtype?: string;
  narrative?: string;
}

export class AdvancedEditEngine {
  static calculateAdvancedEdit(gameState: GameState): AdvancedEdit {
    const { playerName, contestants, alliances, interactionLog = [], editPerception, currentDay } = gameState;
    
    // Recent actions analysis
    const recentActions = interactionLog.filter(log => 
      log.day >= currentDay - 3 && log.participants.includes(playerName)
    );
    
    const actionCounts = {
      scheme: recentActions.filter(a => a.type === 'scheme').length,
      alliance: recentActions.filter(a => a.type === 'alliance_meeting').length,
      social: recentActions.filter(a => a.type === 'talk' || a.type === 'activity').length,
      dm: recentActions.filter(a => a.type === 'dm').length,
      aggressive: recentActions.filter(a => a.tone === 'aggressive').length
    };
    
    const totalActions = recentActions.length;
    const playerAlliances = alliances.filter(a => a.members.includes(playerName));
    const { audienceApproval, screenTimeIndex } = editPerception;
    
    // Determine primary persona
    let persona: AdvancedEdit['persona'] = 'Underedited';
    let subtype = '';
    let narrative = '';
    
    // High strategic activity
    if (actionCounts.scheme >= 3 && actionCounts.alliance >= 2) {
      persona = 'Mastermind';
      subtype = audienceApproval > 0 ? 'Strategic Genius' : 'Puppet Master';
      narrative = 'Orchestrating complex moves behind the scenes';
    }
    // Strategy focused
    else if (actionCounts.scheme >= 2 || (actionCounts.alliance >= 2 && playerAlliances.length > 1)) {
      persona = 'Strategist';
      subtype = playerAlliances.length > 1 ? 'Alliance Builder' : 'Solo Schemer';
      narrative = 'Playing a calculated game with clear strategic vision';
    }
    // High social activity
    else if (actionCounts.social >= 4 && actionCounts.aggressive === 0) {
      persona = 'Social Player';
      subtype = audienceApproval > 30 ? 'House Favorite' : 'Social Butterfly';
      narrative = 'Building relationships and managing social dynamics';
    }
    // High approval, good strategy
    else if (audienceApproval > 40 && totalActions >= 3) {
      persona = 'Hero';
      subtype = actionCounts.scheme > 0 ? 'Strategic Hero' : 'Pure Hero';
      narrative = 'Playing with integrity while making smart moves';
    }
    // Aggressive or negative approval
    else if (actionCounts.aggressive >= 2 || audienceApproval < -20) {
      persona = 'Villain';
      subtype = actionCounts.scheme >= 2 ? 'Strategic Villain' : 'Confrontational Villain';
      narrative = 'Creating chaos and conflict to advance their game';
    }
    // Low activity but surviving
    else if (totalActions <= 1 && screenTimeIndex < 40) {
      persona = screenTimeIndex < 20 ? 'Ghosted' : 'Underdog';
      subtype = contestants.filter(c => !c.isEliminated).length <= 8 ? 'Late Game Sleeper' : 'Invisible Player';
      narrative = 'Flying under the radar with minimal screen time';
    }
    // Balanced activity, medium screen time
    else if (totalActions >= 2 && totalActions <= 4 && screenTimeIndex >= 40) {
      persona = 'Dark Horse';
      subtype = actionCounts.alliance > 0 ? 'Silent Strategist' : 'Steady Player';
      narrative = 'Making consistent moves without drawing attention';
    }
    // Comedy/entertainment value
    else if (audienceApproval > 20 && actionCounts.social >= 2 && actionCounts.scheme === 0) {
      persona = 'Comic Relief';
      subtype = 'Entertainment Value';
      narrative = 'Bringing levity and personality to the house';
    }
    // Default underedited
    else {
      persona = 'Underedited';
      subtype = totalActions > 0 ? 'Moderate Player' : 'Background Character';
      narrative = 'Limited strategic impact and screen presence';
    }
    
    return { persona, subtype, narrative };
  }
  
  static getEditDescription(edit: AdvancedEdit): string {
    const { persona, subtype } = edit;
    
    switch (persona) {
      case 'Mastermind':
        return `${subtype} - Pulling strings and controlling the game`;
      case 'Strategist':
        return `${subtype} - Making calculated strategic moves`;
      case 'Social Player':
        return `${subtype} - Excelling at relationship management`;
      case 'Hero':
        return `${subtype} - Playing with integrity and skill`;
      case 'Villain':
        return `${subtype} - Creating drama and conflict`;
      case 'Underdog':
        return `${subtype} - Surviving against the odds`;
      case 'Dark Horse':
        return `${subtype} - Quiet but effective gameplay`;
      case 'Comic Relief':
        return `${subtype} - Providing entertainment and personality`;
      case 'Ghosted':
        return `${subtype} - Minimal presence and impact`;
      default:
        return `${subtype} - Limited strategic development`;
    }
  }
}
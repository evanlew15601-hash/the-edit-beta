import { GameState, Contestant } from '@/types/game';

// Twist system with full ripple effects
export class TwistEngine {
  static readonly TWISTS = {
    CONFESSIONAL_LEAK: 'confessional_leak',
    MOLE_REVEAL: 'mole_reveal',
    PUBLIC_VOTE: 'public_vote',
    EDIT_FLIP: 'edit_flip',
    DOUBLE_ELIMINATION: 'double_elimination',
    IMMUNITY_CHALLENGE: 'immunity_challenge'
  };

  // Check if twist should activate
  static shouldActivateTwist(gameState: GameState): string | null {
    const { currentDay, contestants, twistsActivated } = gameState;
    const activeContestants = contestants.filter(c => !c.isEliminated);
    
    // Don't activate multiple twists in one week
    const recentTwists = twistsActivated.filter(t => t.includes(`_${Math.floor(currentDay / 7)}`));
    if (recentTwists.length > 0) return null;
    
    // Confessional leak (20% chance after day 5)
    if (currentDay > 5 && Math.random() < 0.2 && !twistsActivated.some(t => t.includes('confessional_leak'))) {
      return this.TWISTS.CONFESSIONAL_LEAK;
    }
    
    // Mole reveal (triggered at specific contestant count)
    if (activeContestants.length === 8 && !twistsActivated.some(t => t.includes('mole_reveal'))) {
      return this.TWISTS.MOLE_REVEAL;
    }
    
    // Edit flip (30% chance mid-game)
    if (currentDay > 10 && currentDay < 20 && Math.random() < 0.3 && !twistsActivated.some(t => t.includes('edit_flip'))) {
      return this.TWISTS.EDIT_FLIP;
    }
    
    // Public vote override (25% chance late game)
    if (activeContestants.length <= 6 && Math.random() < 0.25 && !twistsActivated.some(t => t.includes('public_vote'))) {
      return this.TWISTS.PUBLIC_VOTE;
    }
    
    return null;
  }

  // Execute twist with full systemic effects
  static executeTwist(twistType: string, gameState: GameState): Partial<GameState> {
    const twistId = `${twistType}_day${gameState.currentDay}`;
    
    switch (twistType) {
      case this.TWISTS.CONFESSIONAL_LEAK:
        return this.executeConfessionalLeak(gameState, twistId);
      
      case this.TWISTS.MOLE_REVEAL:
        return this.executeMoleReveal(gameState, twistId);
      
      case this.TWISTS.EDIT_FLIP:
        return this.executeEditFlip(gameState, twistId);
      
      case this.TWISTS.PUBLIC_VOTE:
        return this.executePublicVote(gameState, twistId);
      
      default:
        return { twistsActivated: [...gameState.twistsActivated, twistId] };
    }
  }

  // Leak recent confessionals - player-only effect
  private static executeConfessionalLeak(gameState: GameState, twistId: string): Partial<GameState> {
    // This twist should not add tags/memories or goal changes to NPCs.
    // Apply consequences only to the player's edit perception.
    const editPenalty = {
      ...gameState.editPerception,
      audienceApproval: Math.max(-100, gameState.editPerception.audienceApproval - 20),
      screenTimeIndex: Math.min(100, gameState.editPerception.screenTimeIndex + 15), // Controversy = screen time
      lastEditShift: -20
    };

    return {
      editPerception: editPenalty,
      twistsActivated: [...gameState.twistsActivated, twistId]
    };
  }

  // Reveal the mole contestant - player-only twist (no NPC state changes)
  private static executeMoleReveal(gameState: GameState, twistId: string): Partial<GameState> {
    // Do not add NPC memories or modify NPC psych profiles.
    // Limit the twist to tracking-only for now.
    return {
      twistsActivated: [...gameState.twistsActivated, twistId]
    };
  }

  // Flip the player's edit dramatically
  private static executeEditFlip(gameState: GameState, twistId: string): Partial<GameState> {
    const currentPersona = gameState.editPerception.persona;
    let newPersona: typeof currentPersona;
    let approvalDelta: number;

    // Dramatic edit changes
    switch (currentPersona) {
      case 'Hero':
        newPersona = 'Villain';
        approvalDelta = -60;
        break;
      case 'Villain':
        newPersona = 'Hero';
        approvalDelta = 50;
        break;
      case 'Underedited':
        newPersona = 'Dark Horse';
        approvalDelta = 25;
        break;
      case 'Ghosted':
        newPersona = 'Comic Relief';
        approvalDelta = 30;
        break;
      default:
        newPersona = 'Dark Horse';
        approvalDelta = 15;
    }

    const flippedEdit = {
      ...gameState.editPerception,
      persona: newPersona,
      audienceApproval: Math.max(-100, Math.min(100, gameState.editPerception.audienceApproval + approvalDelta)),
      screenTimeIndex: Math.min(100, gameState.editPerception.screenTimeIndex + 20),
      lastEditShift: approvalDelta
    };

    return {
      editPerception: flippedEdit,
      twistsActivated: [...gameState.twistsActivated, twistId]
    };
  }

  // Public vote override - player-only tracking, no NPC memories
  private static executePublicVote(gameState: GameState, twistId: string): Partial<GameState> {
    // Keep twist tracking only; avoid adding tags/memories/goals to NPCs.
    return {
      twistsActivated: [...gameState.twistsActivated, twistId]
    };
  }
}

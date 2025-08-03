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

  // Leak recent confessionals to all contestants
  private static executeConfessionalLeak(gameState: GameState, twistId: string): Partial<GameState> {
    const recentConfessionals = gameState.confessionals.slice(-2); // Last 2 confessionals
    
    const updatedContestants = gameState.contestants.map(contestant => {
      if (contestant.isEliminated) return contestant;
      
      // Add leaked confessionals to memory
      const leakMemories = recentConfessionals.map(conf => ({
        day: gameState.currentDay,
        type: 'confessional_leak' as const,
        participants: [gameState.playerName],
        content: `LEAKED: \"${conf.content}\" (${conf.tone})`,
        emotionalImpact: conf.tone === 'aggressive' ? -3 : conf.tone === 'strategic' ? -2 : -1,
        timestamp: gameState.currentDay * 1000 + Math.random() * 1000
      }));

      // Adjust trust and suspicion based on leaked content
      let trustDelta = -10; // Base trust loss
      let suspicionDelta = 15; // Base suspicion increase
      
      recentConfessionals.forEach(conf => {
        if (conf.content.toLowerCase().includes(contestant.name.toLowerCase())) {
          trustDelta -= 15; // Extra penalty if they were mentioned
          suspicionDelta += 10;
        }
        if (conf.tone === 'aggressive') {
          trustDelta -= 5;
          suspicionDelta += 5;
        }
      });

      return {
        ...contestant,
        psychProfile: {
          ...contestant.psychProfile,
          trustLevel: Math.max(-100, contestant.psychProfile.trustLevel + trustDelta),
          suspicionLevel: Math.min(100, contestant.psychProfile.suspicionLevel + suspicionDelta)
        },
        memory: [...contestant.memory, ...leakMemories]
      };
    });

    // Edit perception also takes a hit
    const editPenalty = {
      ...gameState.editPerception,
      audienceApproval: Math.max(-100, gameState.editPerception.audienceApproval - 20),
      screenTimeIndex: Math.min(100, gameState.editPerception.screenTimeIndex + 15), // Controversy = screen time
      lastEditShift: -20
    };

    return {
      contestants: updatedContestants,
      editPerception: editPenalty,
      twistsActivated: [...gameState.twistsActivated, twistId]
    };
  }

  // Reveal the mole contestant
  private static executeMoleReveal(gameState: GameState, twistId: string): Partial<GameState> {
    const mole = gameState.contestants.find(c => c.isMole && !c.isEliminated);
    if (!mole) return { twistsActivated: [...gameState.twistsActivated, twistId] };

    const updatedContestants = gameState.contestants.map(contestant => {
      if (contestant.isEliminated) return contestant;
      
      // Everyone learns about the mole
      const moleMemory = {
        day: gameState.currentDay,
        type: 'observation' as const,
        participants: [mole.name],
        content: `TWIST REVEALED: ${mole.name} was secretly working for production`,
        emotionalImpact: contestant.name === mole.name ? 5 : -2, // Mole gets boost, others get paranoid
        timestamp: gameState.currentDay * 1000 + Math.random() * 1000
      };

      let trustDelta = 0;
      let suspicionDelta = 0;

      if (contestant.name === mole.name) {
        // Mole gets immunity and trust boost
        trustDelta = 30;
        suspicionDelta = -20;
      } else {
        // Others become more paranoid
        suspicionDelta = 10;
        // If they trusted the mole, they lose trust in everyone
        const moleRelationship = contestant.memory.filter(m => 
          m.participants.includes(mole.name) && m.emotionalImpact > 0
        ).length;
        if (moleRelationship > 2) {
          trustDelta = -15; // Betrayal penalty
          suspicionDelta += 5;
        }
      }

      return {
        ...contestant,
        psychProfile: {
          ...contestant.psychProfile,
          trustLevel: Math.max(-100, Math.min(100, contestant.psychProfile.trustLevel + trustDelta)),
          suspicionLevel: Math.max(0, Math.min(100, contestant.psychProfile.suspicionLevel + suspicionDelta))
        },
        memory: [...contestant.memory, moleMemory]
      };
    });

    return {
      contestants: updatedContestants,
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

  // Public vote overrides normal elimination
  private static executePublicVote(gameState: GameState, twistId: string): Partial<GameState> {
    // Simulate audience vote based on edit perception
    const fanFavorites = gameState.contestants
      .filter(c => !c.isEliminated)
      .sort((a, b) => {
        // Simulate fan preference based on player interactions
        const aPlayerInteractions = a.memory.filter(m => m.participants.includes(gameState.playerName)).length;
        const bPlayerInteractions = b.memory.filter(m => m.participants.includes(gameState.playerName)).length;
        
        // Fans tend to save people the player interacted with positively
        const aScore = aPlayerInteractions + (a.psychProfile.trustLevel / 10);
        const bScore = bPlayerInteractions + (b.psychProfile.trustLevel / 10);
        
        return bScore - aScore;
      });

    const publicSave = fanFavorites[0]?.name || '';

    // Add memory to all contestants about public intervention
    const updatedContestants = gameState.contestants.map(contestant => {
      if (contestant.isEliminated) return contestant;
      
      const publicVoteMemory = {
        day: gameState.currentDay,
        type: 'observation' as const,
        participants: [publicSave],
        content: `PUBLIC VOTE: Audience saved ${publicSave} from elimination`,
        emotionalImpact: contestant.name === publicSave ? 3 : -1,
        timestamp: gameState.currentDay * 1000 + Math.random() * 1000
      };

      return {
        ...contestant,
        memory: [...contestant.memory, publicVoteMemory]
      };
    });

    return {
      contestants: updatedContestants,
      twistsActivated: [...gameState.twistsActivated, twistId]
    };
  }
}

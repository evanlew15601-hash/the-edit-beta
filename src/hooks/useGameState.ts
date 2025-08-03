import { useState, useCallback, useEffect } from 'react';
import { GameState, Contestant, PlayerAction, Confessional, EditPerception, Alliance, VotingRecord } from '@/types/game';
import { generateContestants } from '@/utils/contestantGenerator';
import { calculateEditPerception } from '@/utils/editEngine';
import { processVoting } from '@/utils/votingEngine';
import { getTrustDelta, getSuspicionDelta, calculateLeakChance, calculateSchemeSuccess, generateNPCInteractions } from '@/utils/actionEngine';
import { TwistEngine } from '@/utils/twistEngine';

const initialGameState = (): GameState => ({
  currentDay: 1,
  playerName: '',
  contestants: [],
  playerActions: [
    { type: 'talk', used: false },
    { type: 'dm', used: false },
    { type: 'confessional', used: false },
    { type: 'observe', used: false },
    { type: 'scheme', used: false }
  ],
  confessionals: [],
  editPerception: {
    screenTimeIndex: 50,
    audienceApproval: 0,
    persona: 'Underedited',
    lastEditShift: 0
  },
  alliances: [],
  votingHistory: [],
  gamePhase: 'intro',
  twistsActivated: [],
  nextEliminationDay: 7
});

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    // Load saved game state on initialization
    const savedState = loadGameState();
    return savedState || initialGameState();
  });

  const startGame = useCallback((playerName: string) => {
    const contestants = generateContestants(11);
    setGameState(prev => ({
      ...prev,
      playerName,
      contestants,
      gamePhase: 'daily'
    }));
  }, []);

  const useAction = useCallback((actionType: string, target?: string, content?: string, tone?: string) => {
    setGameState(prev => {
      const newActions = prev.playerActions.map(action => 
        action.type === actionType ? { ...action, used: true, target, content, tone } : action
      );

      // Process the action's effect on contestants based on action type
      const updatedContestants = prev.contestants.map(contestant => {
        let updatedContestant = { ...contestant };

        // Apply action-specific logic
        switch (actionType) {
          case 'talk':
            if (contestant.name === target) {
              const trustDelta = getTrustDelta(tone || '', contestant.psychProfile.disposition);
              const suspicionDelta = getSuspicionDelta(tone || '', content || '');
              
              updatedContestant = {
                ...updatedContestant,
                psychProfile: {
                  ...updatedContestant.psychProfile,
                  trustLevel: Math.max(-100, Math.min(100, updatedContestant.psychProfile.trustLevel + trustDelta)),
                  suspicionLevel: Math.max(0, Math.min(100, updatedContestant.psychProfile.suspicionLevel + suspicionDelta)),
                  emotionalCloseness: Math.max(0, Math.min(100, updatedContestant.psychProfile.emotionalCloseness + (trustDelta > 0 ? 2 : -1)))
                },
                memory: [...updatedContestant.memory, {
                  day: prev.currentDay,
                  type: 'conversation' as const,
                  participants: [prev.playerName, contestant.name],
                  content: content || '',
                  emotionalImpact: trustDelta / 5,
                  timestamp: prev.currentDay * 1000 + Math.random() * 1000
                }]
              };
            }
            break;

          case 'dm':
            if (contestant.name === target) {
              const trustImpact = tone === 'alliance' ? 8 : tone === 'secretive' ? 3 : tone === 'manipulation' ? -5 : 0;
              const leakChance = calculateLeakChance(contestant.psychProfile);
              
              updatedContestant = {
                ...updatedContestant,
                psychProfile: {
                  ...updatedContestant.psychProfile,
                  trustLevel: Math.max(-100, Math.min(100, updatedContestant.psychProfile.trustLevel + trustImpact)),
                  suspicionLevel: tone === 'manipulation' ? Math.min(100, updatedContestant.psychProfile.suspicionLevel + 10) : updatedContestant.psychProfile.suspicionLevel
                },
                memory: [...updatedContestant.memory, {
                  day: prev.currentDay,
                  type: 'dm' as const,
                  participants: [prev.playerName, contestant.name],
                  content: `[DM-${tone}] ${content}`,
                  emotionalImpact: trustImpact / 3,
                  timestamp: prev.currentDay * 1000 + Math.random() * 1000
                }]
              };

              // Handle potential leak
              if (Math.random() < leakChance) {
                // Add leaked message to other contestants' memories
                prev.contestants.forEach(otherContestant => {
                  if (otherContestant.name !== contestant.name && otherContestant.name !== prev.playerName && !otherContestant.isEliminated) {
                    // This will be handled in the next iteration
                  }
                });
              }
            }
            break;

          case 'observe':
            // Observation gives player information but may be noticed by contestants
            const observationMemory = {
              day: prev.currentDay,
              type: 'observation' as const,
              participants: [prev.playerName],
              content: 'Player observed house dynamics',
              emotionalImpact: 0,
              timestamp: prev.currentDay * 1000 + Math.random() * 1000
            };
            
            // Small chance contestants notice being observed
            if (Math.random() < 0.15) {
              updatedContestant = {
                ...updatedContestant,
                psychProfile: {
                  ...updatedContestant.psychProfile,
                  suspicionLevel: Math.min(100, updatedContestant.psychProfile.suspicionLevel + 5)
                },
                memory: [...updatedContestant.memory, observationMemory]
              };
            }
            break;

          case 'scheme':
            if (contestant.name === target) {
              const schemeSuccess = calculateSchemeSuccess(prev.playerName, contestant, content || '', tone || '');
              const suspicionIncrease = schemeSuccess ? 15 : 25; // Failed schemes are more suspicious
              
              updatedContestant = {
                ...updatedContestant,
                psychProfile: {
                  ...updatedContestant.psychProfile,
                  trustLevel: schemeSuccess ? 
                    Math.max(-100, updatedContestant.psychProfile.trustLevel - 5) : 
                    Math.max(-100, updatedContestant.psychProfile.trustLevel - 15),
                  suspicionLevel: Math.min(100, updatedContestant.psychProfile.suspicionLevel + suspicionIncrease)
                },
                memory: [...updatedContestant.memory, {
                  day: prev.currentDay,
                  type: 'scheme' as const,
                  participants: [prev.playerName, contestant.name],
                  content: `[SCHEME-${schemeSuccess ? 'SUCCESS' : 'FAILED'}] ${content}`,
                  emotionalImpact: schemeSuccess ? -2 : -5,
                  timestamp: prev.currentDay * 1000 + Math.random() * 1000
                }]
              };
            }
            break;
        }

        return updatedContestant;
      });

      // Handle alliance formation from DMs or schemes
      const newAlliances = [...prev.alliances];
      if (actionType === 'dm' && tone === 'alliance' && target) {
        const existingAlliance = newAlliances.find(a => a.members.includes(prev.playerName) && a.members.includes(target));
        if (!existingAlliance) {
          newAlliances.push({
            id: `alliance_${prev.currentDay}_${Math.random().toString(36).substr(2, 9)}`,
            members: [prev.playerName, target],
            strength: 60,
            secret: true,
            formed: prev.currentDay,
            lastActivity: prev.currentDay
          });
        } else {
          existingAlliance.strength = Math.min(100, existingAlliance.strength + 10);
          existingAlliance.lastActivity = prev.currentDay;
        }
      }

      return {
        ...prev,
        playerActions: newActions,
        contestants: updatedContestants,
        alliances: newAlliances
      };
    });
  }, []);

  const submitConfessional = useCallback((content: string, tone: string) => {
    setGameState(prev => {
      const confessional: Confessional = {
        day: prev.currentDay,
        content,
        tone,
        editImpact: tone === 'strategic' ? 5 : tone === 'aggressive' ? -3 : 2
      };

      const newEditPerception = calculateEditPerception(
        [...prev.confessionals, confessional],
        prev.editPerception,
        prev.currentDay
      );

      return {
        ...prev,
        confessionals: [...prev.confessionals, confessional],
        editPerception: newEditPerception,
        playerActions: prev.playerActions.map(action =>
          action.type === 'confessional' ? { ...action, used: true } : action
        )
      };
    });
  }, []);

  const advanceDay = useCallback(() => {
    setGameState(prev => {
      const newDay = prev.currentDay + 1;
      const isEliminationDay = newDay === prev.nextEliminationDay;

      // Check for twist activation
      const potentialTwist = TwistEngine.shouldActivateTwist(prev);
      let twistUpdates = {};
      
      if (potentialTwist) {
        twistUpdates = TwistEngine.executeTwist(potentialTwist, prev);
      }

      // Generate NPC interactions for the new day
      const npcInteractions = generateNPCInteractions(prev.contestants, newDay);
      
      // Update contestants with NPC interaction effects
      let updatedContestants = prev.contestants.map(contestant => {
        if (contestant.isEliminated) return contestant;
        
        // Apply NPC interaction memories
        const relevantInteractions = npcInteractions.filter(interaction => 
          interaction.participants.includes(contestant.name)
        );
        
        const interactionMemories = relevantInteractions.map(interaction => ({
          day: newDay,
          type: 'observation' as const,
          participants: interaction.participants,
          content: interaction.description,
          emotionalImpact: interaction.type === 'conflict' ? -2 : interaction.type === 'tension' ? -1 : 1,
          timestamp: newDay * 1000 + Math.random() * 1000
        }));

        return {
          ...contestant,
          memory: [...contestant.memory, ...interactionMemories]
        };
      });

      // Apply twist updates if any
      if (twistUpdates && 'contestants' in twistUpdates && twistUpdates.contestants) {
        updatedContestants = twistUpdates.contestants as Contestant[];
      }

      if (isEliminationDay) {
        const votingResult = processVoting(updatedContestants, prev.playerName, prev.alliances);
        
        const finalContestants = updatedContestants.map(c =>
          c.name === votingResult.eliminated 
            ? { ...c, isEliminated: true, eliminationDay: newDay }
            : c
        );

        const newState: GameState = {
          ...prev,
          ...(twistUpdates as Partial<GameState>),
          currentDay: newDay,
          contestants: finalContestants,
          votingHistory: [...prev.votingHistory, { ...votingResult, day: newDay }],
          gamePhase: 'elimination' as const,
          nextEliminationDay: newDay + 6,
          playerActions: [
            { type: 'talk', used: false },
            { type: 'dm', used: false },
            { type: 'confessional', used: false },
            { type: 'observe', used: false },
            { type: 'scheme', used: false }
          ] as PlayerAction[]
        };

        // Save game state
        saveGameState(newState);
        return newState;
      }

      const newState: GameState = {
        ...prev,
        ...(twistUpdates as Partial<GameState>),
        currentDay: newDay,
        contestants: updatedContestants,
        playerActions: [
          { type: 'talk', used: false },
          { type: 'dm', used: false },
          { type: 'confessional', used: false },
          { type: 'observe', used: false },
          { type: 'scheme', used: false }
        ] as PlayerAction[]
      };

      // Save game state
      saveGameState(newState);
      return newState;
    });
  }, []);

  const continueFromElimination = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gamePhase: prev.currentDay % 7 === 0 ? 'weekly_recap' : 'daily'
    }));
  }, []);

  const continueFromWeeklyRecap = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gamePhase: 'daily'
    }));
  }, []);

  const resetGame = useCallback(() => {
    setGameState(initialGameState());
  }, []);

  // Auto-save on any state change
  useEffect(() => {
    if (gameState.playerName) { // Only save if game has been started
      saveGameState(gameState);
    }
  }, [gameState]);

  return {
    gameState,
    startGame,
    useAction,
    submitConfessional,
    advanceDay,
    continueFromElimination,
    continueFromWeeklyRecap,
    resetGame
  };
};

// Save system functions
const SAVE_KEY = 'the_edit_game_state';

const saveGameState = (state: GameState): void => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save game state:', error);
  }
};

const loadGameState = (): GameState | null => {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate the loaded state has required properties
      if (parsed.currentDay && parsed.contestants && parsed.editPerception) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load game state:', error);
  }
  return null;
};
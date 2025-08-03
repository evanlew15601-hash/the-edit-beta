import { useState, useCallback } from 'react';
import { GameState, Contestant, PlayerAction, Confessional, EditPerception, Alliance, VotingRecord } from '@/types/game';
import { generateContestants } from '@/utils/contestantGenerator';
import { calculateEditPerception } from '@/utils/editEngine';
import { processVoting } from '@/utils/votingEngine';

const initialGameState = (): GameState => ({
  currentDay: 1,
  playerName: '',
  contestants: [],
  playerActions: [
    { type: 'talk', used: false },
    { type: 'dm', used: false },
    { type: 'confessional', used: false }
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
  const [gameState, setGameState] = useState<GameState>(initialGameState());

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

      // Process the action's effect on contestants
      const updatedContestants = prev.contestants.map(contestant => {
        if (contestant.id === target && actionType === 'talk') {
          // Update relationship based on tone and content
          const trustDelta = tone === 'friendly' ? 5 : tone === 'aggressive' ? -10 : 0;
          return {
            ...contestant,
            psychProfile: {
              ...contestant.psychProfile,
              trustLevel: Math.max(-100, Math.min(100, contestant.psychProfile.trustLevel + trustDelta))
            },
            memory: [...contestant.memory, {
              day: prev.currentDay,
              type: 'conversation' as const,
              participants: [prev.playerName, contestant.name],
              content: content || '',
              emotionalImpact: trustDelta / 5,
              timestamp: Date.now()
            }]
          };
        }
        return contestant;
      });

      return {
        ...prev,
        playerActions: newActions,
        contestants: updatedContestants
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

      if (isEliminationDay) {
        const votingResult = processVoting(prev.contestants, prev.playerName, prev.alliances);
        const eliminatedContestant = prev.contestants.find(c => c.name === votingResult.eliminated);
        
        const updatedContestants = prev.contestants.map(c =>
          c.name === votingResult.eliminated 
            ? { ...c, isEliminated: true, eliminationDay: newDay }
            : c
        );

        return {
          ...prev,
          currentDay: newDay,
          contestants: updatedContestants,
          votingHistory: [...prev.votingHistory, votingResult],
          gamePhase: 'elimination' as const,
          nextEliminationDay: newDay + 6,
          playerActions: [
            { type: 'talk', used: false },
            { type: 'dm', used: false },
            { type: 'confessional', used: false }
          ]
        };
      }

      return {
        ...prev,
        currentDay: newDay,
        playerActions: [
          { type: 'talk', used: false },
          { type: 'dm', used: false },
          { type: 'confessional', used: false }
        ]
      };
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
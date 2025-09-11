import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { npcResponseEngine } from '@/utils/npcResponseEngine';
import { GameState, Contestant, PlayerAction, Confessional, EditPerception, Alliance, VotingRecord, ReactionSummary, ReactionTake } from '@/types/game';
import { ConfessionalEngine } from '@/utils/confessionalEngine';
import { generateContestants } from '@/utils/contestantGenerator';
import { calculateLegacyEditPerception } from '@/utils/editEngine';
import { AllianceManager } from '@/utils/allianceManager';
import { AIVotingStrategy } from '@/utils/aiVotingStrategy';
import { InformationTradingEngine } from '@/utils/informationTradingEngine';
import { gameSystemIntegrator } from '@/utils/gameSystemIntegrator';
import { processVoting } from '@/utils/votingEngine';
import { getTrustDelta, getSuspicionDelta, calculateLeakChance, calculateSchemeSuccess, generateNPCInteractions } from '@/utils/actionEngine';
import { TwistEngine } from '@/utils/twistEngine';
import { speechActClassifier } from '@/utils/speechActClassifier';
import { generateLocalAIReply } from '@/utils/localLLM';
import { EnhancedNPCMemorySystem } from '@/utils/enhancedNPCMemorySystem';

const USE_REMOTE_AI = false; // Set to true when remote backends are working

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>({
    currentDay: 1,
    playerName: '',
    contestants: [],
    playerActions: [
      { type: 'talk', used: false, usageCount: 0 },
      { type: 'dm', used: false, usageCount: 0 },
      { type: 'confessional', used: false, usageCount: 0 },
      { type: 'observe', used: false, usageCount: 0 },
      { type: 'scheme', used: false, usageCount: 0 },
      { type: 'activity', used: false, usageCount: 0 }
    ] as PlayerAction[],
    confessionals: [],
    editPerception: {
      screenTimeIndex: 45,
      audienceApproval: 0,
      persona: 'Underedited',
      lastEditShift: 0
    },
    alliances: [],
    votingHistory: [],
    gamePhase: 'intro',
    twistsActivated: [],
    nextEliminationDay: 7,
    daysUntilJury: 28,
    dailyActionCount: 0,
    dailyActionCap: 10,
    aiSettings: {
      depth: 'standard',
      additions: { strategyHint: true, followUp: true, riskEstimate: true, memoryImpact: true },
    },
    forcedConversationsQueue: [],
    favoriteTally: {},
    interactionLog: [],
    tagChoiceCooldowns: {},
  });

  const startGame = useCallback((playerName: string) => {
    console.log('Starting game with player:', playerName);
    const contestants = generateContestants(16).map(c => c.name === playerName ? { ...c, name: playerName } : c);
    const newState: GameState = {
      currentDay: 1,
      playerName,
      contestants,
      playerActions: [
        { type: 'talk', used: false, usageCount: 0 },
        { type: 'dm', used: false, usageCount: 0 },
        { type: 'confessional', used: false, usageCount: 0 },
        { type: 'observe', used: false, usageCount: 0 },
        { type: 'scheme', used: false, usageCount: 0 },
        { type: 'activity', used: false, usageCount: 0 }
      ] as PlayerAction[],
      confessionals: [],
      editPerception: {
        screenTimeIndex: 45,
        audienceApproval: 0,
        persona: 'Underedited',
        lastEditShift: 0
      },
      alliances: [],
      votingHistory: [],
      gamePhase: 'premiere',
      twistsActivated: [],
      nextEliminationDay: 7,
      daysUntilJury: 28,
      dailyActionCount: 0,
      dailyActionCap: 10,
      aiSettings: {
        depth: 'standard',
        additions: { strategyHint: true, followUp: true, riskEstimate: true, memoryImpact: true },
      },
      forcedConversationsQueue: [],
      favoriteTally: {},
      interactionLog: [],
      tagChoiceCooldowns: {},
    };
    console.log('Game started, transitioning to premiere');
    setGameState(newState);
  }, []);

  const advanceDay = useCallback(() => {
    setGameState(prev => {
      const newDay = prev.currentDay + 1;
      console.log('Advancing to day:', newDay);
      console.log('Player name before alliance update:', prev.playerName);
      console.log('Current alliances before update:', prev.alliances);
      console.log('All contestants before update:', prev.contestants.map(c => ({ name: c.name, eliminated: c.isEliminated })));
      
      // Update alliances with the new management system - FIXED persistence
      const updatedAlliances = AllianceManager.updateAllianceTrust({
        ...prev,
        currentDay: newDay
      });
      
      console.log('Updated alliances after cleanup:', updatedAlliances);
      
      // Check if player is in any alliances
      const playerAlliances = updatedAlliances.filter(alliance => alliance.members.includes(prev.playerName));
      console.log(`Player ${prev.playerName} is in ${playerAlliances.length} alliances:`, playerAlliances);

      // Auto-generate intelligence when day advances
      const tempState = {
        ...prev,
        currentDay: newDay,
        alliances: updatedAlliances
      };
      
      // Process enhanced NPC memory systems
      const processedContestants = EnhancedNPCMemorySystem.processMemoryPatterns(tempState);
      const contestantsWithMemories = EnhancedNPCMemorySystem.updateStrategicPriorities({
        ...tempState,
        contestants: processedContestants
      });
      const cleanedContestants = EnhancedNPCMemorySystem.cleanOldMemories({
        ...tempState,
        contestants: contestantsWithMemories
      });
      
      // Generate contextual memories for NPCs
      const newContextualMemories = EnhancedNPCMemorySystem.generateContextualMemories(tempState);
      
      // Emergent events are now handled by the EnhancedEmergentEvents component
      // No need for manual triggering here as the component manages its own generation
      
      // Trigger minimal automatic information sharing (reduced frequency)
      if (newDay % 3 === 0) { // Only every 3 days
        InformationTradingEngine.autoGenerateIntelligence(tempState);
      }
      
      // Check if jury phase should begin - FIXED: Include player in count
      const remainingCount = prev.contestants.filter(c => !c.isEliminated).length;
      console.log('Remaining contestants (including player):', remainingCount);
      const shouldStartJury = remainingCount === 7 && !prev.juryMembers;
      
      let juryMembers = prev.juryMembers;
      let daysUntilJury = prev.daysUntilJury;
      let gamePhase = prev.gamePhase;
      
      if (shouldStartJury) {
        // Start jury phase - eliminated contestants become jury
        juryMembers = prev.contestants
          .filter(c => c.isEliminated && c.eliminationDay)
          .sort((a, b) => (b.eliminationDay || 0) - (a.eliminationDay || 0))
          .slice(0, 7) // Take up to 7 most recent eliminations
          .map(c => c.name);
        daysUntilJury = 0;
        console.log('Jury phase started with members:', juryMembers);
      } else if (remainingCount > 7) {
        daysUntilJury = Math.max(0, (remainingCount - 7) * 3); // Estimate days until jury
      }

      // Check for key game events - FIXED phase transitions
      if (remainingCount === 3) {
        // Final 3 - needs voting first
        gamePhase = 'final_3_vote';
        console.log('Final 3 reached - voting phase');
      } else if (remainingCount === 4) {
        // Final 4 - force elimination to get to Final 3
        console.log('Final 4 reached - forcing elimination');
        gamePhase = 'player_vote';
      } else if (newDay === prev.nextEliminationDay - 1) {
        // Day before elimination - immunity competition
        gamePhase = 'immunity_competition';
        console.log('Immunity competition day');
      } else if (newDay === prev.nextEliminationDay) {
        // Elimination day - let player vote first
        console.log('Elimination voting day:', newDay);
        gamePhase = 'player_vote';
      } else if (newDay % 7 === 0 && newDay > 1) {
        // Weekly recap every 7 days - FIXED integration
        gamePhase = 'weekly_recap';
        console.log('Weekly recap time');
      }

      // Clear old information and update systems
      InformationTradingEngine.clearOldInformation({ ...prev, currentDay: newDay });

      // Calculate edit perception changes
      const updatedEditPerception = calculateLegacyEditPerception(
        prev.confessionals,
        prev.editPerception,
        newDay,
        { ...prev, currentDay: newDay }
      );

      return {
        ...prev,
        currentDay: newDay,
        dailyActionCount: 0,
        contestants: cleanedContestants,
        alliances: updatedAlliances,
        juryMembers,
        daysUntilJury,
        gamePhase,
        editPerception: updatedEditPerception,
        // Reset daily variables
        lastAIResponse: undefined,
        lastAIAdditions: undefined,
        lastAIReaction: undefined,
        lastActionTarget: undefined,
        lastActionType: undefined
      };
    });
  }, []);

  const useAction = useCallback((actionType: string, target?: string, content?: string, tone?: string) => {
    console.log('=== ACTION TRIGGERED ===');
    console.log('Action Type:', actionType);
    console.log('Target:', target);
    console.log('Content:', content);
    console.log('Tone:', tone);
    
    // Handle alliance creation separately
    if (actionType === 'create_alliance') {
      const allianceName = target || 'New Alliance';
      const memberNames = content ? content.split(',') : [];
      console.log('Creating alliance:', allianceName, 'with members:', memberNames);
      
      setGameState(prev => {
        console.log('Current player name:', prev.playerName);
        
        // Don't duplicate player name if it's already in the list
        const allMembers = memberNames.includes(prev.playerName) 
          ? memberNames 
          : [prev.playerName, ...memberNames];
        console.log('Will create alliance with members:', allMembers);
        
        const newAlliance = {
          id: Date.now().toString(),
          name: allianceName,
          members: allMembers,
          strength: 75,
          secret: true,
          formed: prev.currentDay,
          lastActivity: prev.currentDay,
          dissolved: false
        };
        
        return {
          ...prev,
          alliances: [...prev.alliances, newAlliance],
          dailyActionCount: prev.dailyActionCount + 1
        };
      });
      return;
    }

    // Handle adding members to existing alliance
    if (actionType === 'add_alliance_members') {
      const allianceId = target;
      const newMembers = content ? content.split(',') : [];
      console.log('Adding members to alliance:', allianceId, 'new members:', newMembers);
      
      setGameState(prev => {
        const updatedAlliances = prev.alliances.map(alliance => 
          alliance.id === allianceId 
            ? {
                ...alliance,
                members: [...alliance.members, ...newMembers],
                lastActivity: prev.currentDay,
                strength: Math.min(100, alliance.strength + 10) // Boost strength when expanding
              }
            : alliance
        );
        
        return {
          ...prev,
          alliances: updatedAlliances,
          dailyActionCount: prev.dailyActionCount + 1
        };
      });
      return;
    }
    
    setGameState(prev => {
      console.log('Previous action count:', prev.dailyActionCount);
      console.log('Previous actions:', prev.playerActions);
      
      // Generate minimal information based on the action (reduced from overwhelming amounts)
      if (Math.random() < 0.3) { // Only 30% chance to generate intel
        InformationTradingEngine.generateTradableInformation(prev);
      }
      
      // Update action usage - CRITICAL FIX
      const updatedActions = prev.playerActions.map(action => 
        action.type === actionType ? { 
          ...action, 
          used: true, 
          usageCount: (action.usageCount || 0) + 1,
          target,
          content,
          tone
        } : action
      );

      // Update contestant relationships based on action
      const updatedContestants = prev.contestants.map(contestant => {
        if (contestant.name === target) {
          console.log(`Updating relationship with ${target}`);
          const trustDelta = getTrustDelta(tone || 'neutral', contestant.psychProfile.disposition);
          const suspicionDelta = getSuspicionDelta(tone || 'neutral', content || '');
          
          const newTrustLevel = Math.max(-100, Math.min(100, 
            contestant.psychProfile.trustLevel + trustDelta
          ));
          const newSuspicionLevel = Math.max(0, Math.min(100, 
            contestant.psychProfile.suspicionLevel + suspicionDelta
          ));
          
          console.log(`Trust: ${contestant.psychProfile.trustLevel} -> ${newTrustLevel}`);
          console.log(`Suspicion: ${contestant.psychProfile.suspicionLevel} -> ${newSuspicionLevel}`);
          
          // Add memory of the interaction
          const memoryType = actionType === 'dm' ? 'dm' : 
                           actionType === 'scheme' ? 'scheme' :
                           actionType === 'observe' ? 'observation' : 'conversation';
          
          const newMemory = {
            day: prev.currentDay,
            type: memoryType as 'conversation' | 'scheme' | 'observation' | 'dm' | 'confessional_leak' | 'elimination' | 'event',
            participants: [prev.playerName, target || ''],
            content: content || `${actionType} interaction with ${prev.playerName}`,
            emotionalImpact: Math.floor(trustDelta / 10),
            timestamp: Date.now()
          };

          return {
            ...contestant,
            psychProfile: {
              ...contestant.psychProfile,
              trustLevel: newTrustLevel,
              suspicionLevel: newSuspicionLevel
            },
            memory: [...contestant.memory, newMemory]
          };
        }
        return contestant;
      });

      // CRITICAL FIX: Properly increment daily action count
      const newActionCount = prev.dailyActionCount + 1;
      console.log('New action count will be:', newActionCount);
      console.log('Updated actions:', updatedActions);

      const newState = {
        ...prev,
        contestants: updatedContestants,
        playerActions: updatedActions,
        dailyActionCount: newActionCount, // This was the main issue!
        lastActionType: actionType as PlayerAction['type'],
        lastActionTarget: target,
        // Add to interaction log
        interactionLog: [
          ...(prev.interactionLog || []),
          {
            day: prev.currentDay,
            type: actionType as PlayerAction['type'],
            participants: target ? [prev.playerName, target] : [prev.playerName],
            content,
            tone,
            source: 'player' as const
          }
        ]
      };
      
      console.log('=== NEW STATE CREATED ===');
      console.log('New dailyActionCount:', newState.dailyActionCount);
      console.log('Updated contestants:', updatedContestants.filter(c => c.name === target));
      
      return newState;
    });
  }, []);

  const submitConfessional = useCallback(() => {
    // Simplified confessional submission
    console.log('Confessional submitted');
  }, []);

  const setImmunityWinner = useCallback((winner: string) => {
    setGameState(prev => ({
      ...prev,
      immunityWinner: winner,
      gamePhase: 'daily' as const // Return to daily gameplay after immunity
    }));
  }, []);

  const submitFinaleSpeech = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      finaleSpeechesGiven: true,
      gamePhase: 'jury_vote' as const
    }));
  }, []);

  const submitPlayerVote = useCallback((choice: string) => {
    setGameState(prev => {
      const votingResult = processVoting(
        prev.contestants,
        prev.playerName,
        prev.alliances,
        prev,
        prev.immunityWinner,
        choice // Player's vote
      );
      
      // Update voting result with current day
      votingResult.day = prev.currentDay;
      votingResult.playerVote = choice;
      
      // Mark eliminated contestant
      const updatedContestants = prev.contestants.map(c => 
        c.name === votingResult.eliminated 
          ? { ...c, isEliminated: true, eliminationDay: prev.currentDay }
          : c
      );
      
      // Set next elimination day
      const nextElimDay = prev.currentDay + 7;
      
      return {
        ...prev,
        contestants: updatedContestants,
        votingHistory: [...prev.votingHistory, votingResult],
        gamePhase: 'elimination' as const,
        nextEliminationDay: nextElimDay,
        immunityWinner: undefined, // Reset immunity
      };
    });
  }, []);

  const submitFinal3Vote = useCallback((choice: string, tieBreakResult?: { winner: string; challengeResults: any }) => {
    setGameState(prev => {
      const active = prev.contestants.filter(c => !c.isEliminated);
      const votingResult = processVoting(
        prev.contestants,
        prev.playerName,
        prev.alliances,
        prev,
        undefined, // No immunity in Final 3
        choice
      );
      
      if (tieBreakResult) {
        votingResult.tieBreak = {
          tied: active.filter(c => c.name !== prev.playerName).map(c => c.name),
          method: 'sudden_death',
          suddenDeathWinner: tieBreakResult.winner,
          log: [`Tie-break challenge determined ${tieBreakResult.winner} advances to Final 2`]
        };
        votingResult.eliminated = active.find(c => c.name !== tieBreakResult.winner && c.name !== prev.playerName)?.name || '';
      }
      
      votingResult.day = prev.currentDay;
      votingResult.playerVote = choice;
      
      const updatedContestants = prev.contestants.map(c => 
        c.name === votingResult.eliminated 
          ? { ...c, isEliminated: true, eliminationDay: prev.currentDay }
          : c
      );
      
      const remainingCount = updatedContestants.filter(c => !c.isEliminated).length;
      
      return {
        ...prev,
        contestants: updatedContestants,
        votingHistory: [...prev.votingHistory, votingResult],
        gamePhase: remainingCount === 2 ? 'finale' : 'elimination',
      };
    });
  }, []);

  const respondToForcedConversation = useCallback(() => {
    // Simplified forced conversation response
    console.log('Responded to forced conversation');
  }, []);

  const submitAFPVote = useCallback(() => {
    // Simplified AFP vote
    console.log('AFP vote submitted');
  }, []);

  const completePremiere = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gamePhase: 'daily' as const
    }));
  }, []);

  const endGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gamePhase: 'finale' as const
    }));
  }, []);

  const continueFromElimination = useCallback(() => {
    setGameState(prev => {
      // Check if we should show weekly recap after elimination
      const shouldShowWeeklyRecap = prev.currentDay % 7 === 0 && prev.currentDay > 1;
      
      return {
        ...prev,
        gamePhase: shouldShowWeeklyRecap ? 'weekly_recap' : 'daily' as const
      };
    });
  }, []);

  const continueFromWeeklyRecap = useCallback(() => {
    setGameState(prev => {
      // Update edit perception with weekly changes
      const updatedEditPerception = calculateLegacyEditPerception(
        prev.confessionals,
        prev.editPerception,
        prev.currentDay,
        prev
      );
      
      return {
        ...prev,
        gamePhase: 'daily' as const,
        editPerception: updatedEditPerception
      };
    });
  }, []);

  const createAlliance = useCallback((name: string, members: string[]) => {
    setGameState(prev => {
      const newAlliance = AllianceManager.createAlliance([prev.playerName, ...members], name, prev.currentDay);
      console.log('Created alliance:', newAlliance);
      return {
        ...prev,
        alliances: [...prev.alliances, newAlliance]
      };
    });
  }, []);

  const resetGame = useCallback(() => {
    setGameState({
      currentDay: 1,
      playerName: '',
      contestants: [],
      playerActions: [
        { type: 'talk', used: false, usageCount: 0 },
        { type: 'dm', used: false, usageCount: 0 },
        { type: 'confessional', used: false, usageCount: 0 },
        { type: 'observe', used: false, usageCount: 0 },
        { type: 'scheme', used: false, usageCount: 0 },
        { type: 'activity', used: false, usageCount: 0 }
      ] as PlayerAction[],
      confessionals: [],
      editPerception: {
        screenTimeIndex: 45,
        audienceApproval: 0,
        persona: 'Underedited',
        lastEditShift: 0
      },
      alliances: [],
      votingHistory: [],
      gamePhase: 'intro',
      twistsActivated: [],
      nextEliminationDay: 7,
      daysUntilJury: 28,
      dailyActionCount: 0,
      dailyActionCap: 10,
      aiSettings: {
        depth: 'standard',
        additions: { strategyHint: true, followUp: true, riskEstimate: true, memoryImpact: true },
      },
      forcedConversationsQueue: [],
      favoriteTally: {},
      interactionLog: [],
      tagChoiceCooldowns: {},
    });
  }, []);

  const handleEmergentEventChoice = useCallback((event: any, choice: 'pacifist' | 'headfirst') => {
    console.log('Emergent event choice handled:', event.type, choice);
    
    setGameState(prev => {
      const updatedContestants = prev.contestants.map(contestant => {
        if (event.participants.includes(contestant.name)) {
          let trustDelta = 0;
          let suspicionDelta = 0;
          
          // Apply relationship effects based on event type and choice
          switch (event.type) {
            case 'conflict':
              if (choice === 'pacifist') {
                trustDelta = 10;
                suspicionDelta = -5;
              } else {
                trustDelta = -15;
                suspicionDelta = 10;
              }
              break;
            case 'alliance_formation':
              if (choice === 'pacifist') {
                trustDelta = 5;
              } else {
                trustDelta = -10;
                suspicionDelta = 15;
              }
              break;
            case 'betrayal':
              if (choice === 'pacifist') {
                trustDelta = 0;
              } else {
                trustDelta = choice === 'headfirst' ? 15 : -5;
                suspicionDelta = choice === 'headfirst' ? -10 : 5;
              }
              break;
          }
          
          const newTrustLevel = Math.max(-100, Math.min(100, 
            contestant.psychProfile.trustLevel + trustDelta
          ));
          const newSuspicionLevel = Math.max(0, Math.min(100, 
            contestant.psychProfile.suspicionLevel + suspicionDelta
          ));
          
          // Add memory of the emergent event
          const newMemory = {
            day: prev.currentDay,
            type: 'event' as const,
            participants: event.participants,
            content: `${event.title}: ${prev.playerName} chose to ${choice === 'pacifist' ? 'defuse' : 'escalate'} the situation`,
            emotionalImpact: Math.floor(trustDelta / 5),
            timestamp: Date.now()
          };
          
          return {
            ...contestant,
            psychProfile: {
              ...contestant.psychProfile,
              trustLevel: newTrustLevel,
              suspicionLevel: newSuspicionLevel
            },
            memory: [...contestant.memory, newMemory]
          };
        }
        return contestant;
      });
      
      // Apply edit impact from the emergent event choice
      const editImpact = choice === 'pacifist' ? -2 : 8; // Pacifist = less dramatic, headfirst = more screen time
      const updatedEditPerception = {
        ...prev.editPerception,
        screenTimeIndex: Math.max(0, Math.min(100, prev.editPerception.screenTimeIndex + editImpact)),
        lastEditShift: editImpact
      };

      // Clear the emergent event to prevent black screen
      return {
        ...prev,
        contestants: updatedContestants,
        lastEmergentEvent: null,
        editPerception: updatedEditPerception,
        // Log the interaction
        interactionLog: [
          ...(prev.interactionLog || []),
          {
            day: prev.currentDay,
            type: 'activity',
            participants: [prev.playerName, ...event.participants],
            content: `Emergent Event: ${event.title} - ${choice} approach`,
            source: 'emergent_event' as const
          }
        ]
      };
    });
  }, []);

  const tagTalk = useCallback((target: string, choiceId: string, interaction: 'talk' | 'dm' | 'scheme' | 'activity') => {
    console.log('=== TAG TALK TRIGGERED ===');
    console.log('Target:', target, 'Choice:', choiceId, 'Interaction:', interaction);
    
    // Use the existing useAction function to process the tag talk
    useAction(interaction, target, `Tag choice: ${choiceId}`, 'tag');
  }, [useAction]);

  const handleTieBreakResult = useCallback((eliminated: string, winner1: string, winner2: string) => {
    setGameState(prev => {
      const newState = { ...prev };
      
      // Mark eliminated contestant
      newState.contestants = prev.contestants.map(c => 
        c.name === eliminated 
          ? { ...c, isEliminated: true, eliminationDay: prev.currentDay }
          : c
      );
      
      // Add to jury
      if (!newState.juryMembers) newState.juryMembers = [];
      if (!newState.juryMembers.includes(eliminated)) {
        newState.juryMembers.push(eliminated);
      }
      
      // Record tie-break result in voting history
      const tieBreakRecord = {
        day: prev.currentDay,
        eliminated,
        votes: { [winner1]: 'n/a', [winner2]: 'n/a', [eliminated]: 'n/a' },
        playerVote: prev.votingHistory[prev.votingHistory.length - 1]?.playerVote,
        reason: `${eliminated} lost Final 3 tie-break challenge`,
        tieBreak: {
          tied: [winner1, winner2, eliminated],
          method: 'sudden_death' as const,
          suddenDeathWinner: winner1,
          suddenDeathLoser: eliminated,
          log: [`Final 3 tie resulted in physical challenge`, `${winner1} and ${winner2} advance to finale`]
        }
      };
      
      newState.votingHistory = [...prev.votingHistory.slice(0, -1), tieBreakRecord];
      newState.gamePhase = 'finale';
      
      return newState;
    });
  }, []);

  return {
    gameState,
    startGame,
    useAction,
    submitConfessional,
    advanceDay,
    setImmunityWinner,
    submitFinaleSpeech,
    submitPlayerVote,
    submitFinal3Vote,
    respondToForcedConversation,
    submitAFPVote,
    completePremiere,
    endGame,
    continueFromElimination,
    continueFromWeeklyRecap,
    createAlliance,
    resetGame,
    handleEmergentEventChoice,
    tagTalk,
    handleTieBreakResult,
  };
};
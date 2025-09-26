import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { npcResponseEngine } from '@/utils/npcResponseEngine';
import { GameState, PlayerAction, ReactionSummary, ReactionTake, Contestant } from '@/types/game';
import { generateContestants } from '@/utils/contestantGenerator';
import { calculateLegacyEditPerception } from '@/utils/editEngine';
import { AllianceManager } from '@/utils/allianceManager';
import { InformationTradingEngine } from '@/utils/informationTradingEngine';
import { calculateAFPRanking } from '@/utils/afpCalculator';
import { gameSystemIntegrator } from '@/utils/gameSystemIntegrator';
import { processVoting } from '@/utils/votingEngine';
import { getTrustDelta, getSuspicionDelta } from '@/utils/actionEngine';
import { TwistEngine } from '@/utils/twistEngine';
import { speechActClassifier } from '@/utils/speechActClassifier';
import { generateLocalAIReply } from '@/utils/localLLM';
import { EnhancedNPCMemorySystem } from '@/utils/enhancedNPCMemorySystem';
import { getReactionProfileForNPC } from '@/utils/tagDialogueEngine';
import { TAG_CHOICES } from '@/data/tagChoices';
import { evaluateChoice, reactionText, getCooldownKey } from '@/utils/tagDialogueEngine';
import { ConfessionalEngine } from '@/utils/confessionalEngine';
import { ratingsEngine } from '@/utils/ratingsEngine';

const USE_REMOTE_AI = false; // Set to true when remote backends are working

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    // Fresh start every load; manual save/load only
    return {
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
      reactionProfiles: {},
      debugMode: false,
    } as GameState;
  });

  const startGame = useCallback((playerName: string) => {
    console.log('Starting game with player:', playerName);

    // Generate cast and guarantee the player is in it
    const baseContestants = generateContestants(16);
    let contestants: Contestant[] = baseContestants;
    if (!baseContestants.some(c => c.name === playerName)) {
      const first = baseContestants[0];
      contestants = [{ ...first, name: playerName }, ...baseContestants.slice(1)];
    }

    // Build initial persistent reaction profiles
    const reactionProfiles: any = {};
    contestants.forEach(c => {
      reactionProfiles[c.id] = getReactionProfileForNPC(c);
      reactionProfiles[c.name] = reactionProfiles[c.id];
    });

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
      reactionProfiles,
      debugMode: false,
    };
    console.log('Game started, transitioning to premiere');
    setGameState(newState);
    // No autosave; player must press Save
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
      
      // Check if jury phase should begin - FIXED: Count ALL active contestants including player
      const remainingContestants = prev.contestants.filter(c => !c.isEliminated);
      const remainingCount = remainingContestants.length;
      const playerStillActive = remainingContestants.some(c => c.name === prev.playerName);
      console.log('Remaining contestants:', remainingCount);
      console.log('Player still active?', playerStillActive);
      console.log('Remaining contestant names:', remainingContestants.map(c => c.name));
      const shouldStartJury = remainingCount === 7 && !prev.juryMembers;
      
      let juryMembers = prev.juryMembers;
      let daysUntilJury = prev.daysUntilJury;
      let gamePhase = prev.gamePhase;
      
      if (shouldStartJury) {
        // Start jury phase - take the 7 most recently eliminated contestants
        juryMembers = prev.contestants
          .filter(c => c.isEliminated && c.eliminationDay)
          .sort((a, b) => (b.eliminationDay || 0) - (a.eliminationDay || 0))
          .slice(0, 7) // Exactly 7 jury members
          .map(c => c.name);
        daysUntilJury = 0;
        console.log('Jury phase started with members:', juryMembers);
      } else if (remainingCount > 7) {
        daysUntilJury = Math.max(0, (remainingCount - 7) * 3); // Estimate days until jury
      }

      // Check for key game events - FIXED phase transitions with correct counting
      console.log('Phase check - Current phase:', prev.gamePhase, 'Remaining:', remainingCount);
      
      if (remainingCount === 3 && prev.gamePhase !== 'final_3_vote') {
        // Final 3 - needs voting first (only trigger if not already in final_3_vote)
        gamePhase = 'final_3_vote';
        console.log('Final 3 reached - voting phase');
      } else if (remainingCount === 4 && prev.gamePhase !== 'player_vote') {
        // Final 4 - force elimination (skip immunity for clean vote)
        console.log('Final 4 reached - forcing elimination without immunity');
        gamePhase = 'player_vote';
      } else if (newDay === prev.nextEliminationDay - 1 && remainingCount > 4) {
        // Day before elimination - immunity competition (skip at Final 4)
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

      // Apply weekly viewer ratings buzz (only on weekly recap day)
      let nextViewerRating = prev.viewerRating ?? ratingsEngine.getInitial();
      let nextRatingsHistory = [...(prev.ratingsHistory || [])];
      if (newDay % 7 === 0) {
        const ratingRes = ratingsEngine.applyWeeklyBuzz({
          ...prev,
          currentDay: newDay,
          contestants: cleanedContestants,
          alliances: updatedAlliances,
          viewerRating: nextViewerRating,
        });
        nextViewerRating = ratingRes.rating;
        nextRatingsHistory.push({
          day: newDay,
          rating: Math.round(ratingRes.rating * 100) / 100,
          reason: ratingRes.reason,
        });
      }

      return {
        ...prev,
        currentDay: newDay,
        dailyActionCount: 0,
        contestants: cleanedContestants,
        alliances: updatedAlliances, // Keep using updatedAlliances for now
        juryMembers,
        daysUntilJury,
        gamePhase,
        editPerception: updatedEditPerception,
        // Reset daily variables
        lastAIResponse: undefined,
        lastAIAdditions: undefined,
        lastAIReaction: undefined,
        lastActionTarget: undefined,
        lastActionType: undefined,
        // Ratings
        viewerRating: nextViewerRating,
        ratingsHistory: nextRatingsHistory,
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

    // Handle confessional explicitly: persist to confessionals and update edit perception
    if (actionType === 'confessional') {
      setGameState(prev => {
        const trimmed = (content || '').trim();
        const confTone = tone || 'neutral';

        // Build confessional object and use ConfessionalEngine for selection + impact
        const baseConf = {
          id: Date.now().toString(),
          day: prev.currentDay,
          content: trimmed,
          tone: confTone,
        } as any;

        // Determine if this confessional makes the edit and calculate impact
        const willAir = ConfessionalEngine.selectConfessionalForEdit(baseConf, prev);
        const editImpact = ConfessionalEngine.calculateEditImpact(baseConf, prev, willAir);
        const audienceScore = ConfessionalEngine.generateAudienceScore(baseConf, editImpact);

        const conf = {
          ...baseConf,
          editImpact,
          audienceScore,
          selected: willAir,
        };

        // Update edit perception using legacy calculator with full context
        const updatedEditPerception = calculateLegacyEditPerception(
          [...prev.confessionals, conf],
          prev.editPerception,
          prev.currentDay,
          prev
        );

        const updatedActions = prev.playerActions.map(action =>
          action.type === 'confessional'
            ? {
                ...action,
                used: true,
                usageCount: (action.usageCount || 0) + 1,
                content,
                tone,
              }
            : action
        );

        // Optional: small chance a confessional vibe leaks to 1-2 houseguests
        let updatedContestants = prev.contestants;
        if (Math.random() < 0.2) {
          const leaks = prev.contestants
            .filter(c => !c.isEliminated && c.name !== prev.playerName)
            .sort(() => 0.5 - Math.random())
            .slice(0, 2);
          updatedContestants = prev.contestants.map(c => {
            if (leaks.some(l => l.name === c.name)) {
              const newMemory = {
                day: prev.currentDay,
                type: 'confessional_leak' as const,
                participants: [prev.playerName, c.name],
                content: `Heard a confessional vibe: "${trimmed.slice(0, 60)}..."`,
                emotionalImpact: -1,
                timestamp: Date.now(),
                tags: ['rumor'],
              };
              return { ...c, memory: [...c.memory, newMemory] };
            }
            return c;
          });
        }

        const interactionEntry = {
          day: prev.currentDay,
          type: 'confessional' as const,
          participants: [prev.playerName],
          content: trimmed,
          tone: confTone,
          source: 'player' as const,
        };

        // Ratings update based on confessional
        const ratingRes = ratingsEngine.applyConfessional(prev, conf);
        const nextHistory = [
          ...(prev.ratingsHistory || []),
          { day: prev.currentDay, rating: Math.round(ratingRes.rating * 100) / 100, reason: ratingRes.reason },
        ];

        return {
          ...prev,
          confessionals: [...prev.confessionals, conf],
          editPerception: updatedEditPerception,
          playerActions: updatedActions,
          dailyActionCount: prev.dailyActionCount + 1,
          lastActionType: 'confessional',
          lastActionTarget: undefined,
          lastAIReaction: {
            take: 'neutral',
            context: 'public',
            notes: trimmed || undefined,
            deltas: { trust: 0, suspicion: 0, influence: 0, entertainment: editImpact },
          },
          interactionLog: [...(prev.interactionLog || []), interactionEntry],
          contestants: updatedContestants,
          viewerRating: ratingRes.rating,
          ratingsHistory: nextHistory,
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

      // Build minimal reaction summary for non-enhanced actions
      let reactionSummary: ReactionSummary | undefined = undefined;
      if (target) {
        const npc = updatedContestants.find(c => c.name === target);
        const trustDelta = npc ? (npc.psychProfile.trustLevel - (prev.contestants.find(c => c.name === target)?.psychProfile.trustLevel || 0)) : 0;
        const suspDelta = npc ? (npc.psychProfile.suspicionLevel - (prev.contestants.find(c => c.name === target)?.psychProfile.suspicionLevel || 0)) : 0;
        const context: ReactionSummary['context'] =
          actionType === 'dm' ? 'private' :
          actionType === 'scheme' ? 'scheme' :
          actionType === 'activity' ? 'activity' : 'public';
        const take: ReactionTake =
          trustDelta > 0 && suspDelta <= 0 ? 'positive' :
          trustDelta < 0 && suspDelta > 0 ? 'pushback' :
          suspDelta > 0 ? 'suspicious' : 'neutral';
        reactionSummary = {
          take,
          context,
          notes: content || undefined,
          deltas: {
            trust: Math.round(trustDelta),
            suspicion: Math.round(suspDelta),
            influence: actionType === 'scheme' ? 2 : actionType === 'dm' ? 1 : 1,
            entertainment: actionType === 'activity' ? 2 : 1,
          }
        };
      }

      // Ratings update based on reaction summary (if available)
      const ratingRes = ratingsEngine.applyReaction(prev, reactionSummary);
      const nextHistory = [
        ...(prev.ratingsHistory || []),
        { day: prev.currentDay, rating: Math.round(ratingRes.rating * 100) / 100, reason: ratingRes.reason },
      ];

      const newState = {
        ...prev,
        contestants: updatedContestants,
        playerActions: updatedActions,
        dailyActionCount: newActionCount, // This was the main issue!
        lastActionType: actionType as PlayerAction['type'],
        lastActionTarget: target,
        lastAIReaction: reactionSummary,
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
        ],
        viewerRating: ratingRes.rating,
        ratingsHistory: nextHistory,
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

  const submitFinaleSpeech = useCallback((speech?: string) => {
    setGameState(prev => ({
      ...prev,
      finaleSpeechesGiven: true,
      finaleSpeech: (speech || '').trim(),
      gamePhase: 'jury_vote' as const
    }));
  }, []);

  // FIXED: Proceed to jury vote by constructing a valid Final 2 that includes the player
  const proceedToJuryVote = useCallback(() => {
    setGameState(prev => {
      // Ensure exactly two finalists with the player included.
      const contestants = [...prev.contestants];

      // Determine if player is currently eliminated
      const playerIdx = contestants.findIndex(c => c.name === prev.playerName);
      const playerIsEliminated = playerIdx >= 0 ? !!contestants[playerIdx].isEliminated : false;

      // Choose the other finalist:
      // Prefer an existing active non-player. If none, revive the most recently eliminated non-player.
      const activeNonPlayer = contestants.filter(c => !c.isEliminated && c.name !== prev.playerName);
      let otherFinalistName: string | undefined = activeNonPlayer[0]?.name;

      if (!otherFinalistName) {
        const mostRecentEliminatedNonPlayer = contestants
          .filter(c => c.isEliminated && c.name !== prev.playerName)
          .sort((a, b) => (b.eliminationDay || 0) - (a.eliminationDay || 0))[0];
        otherFinalistName = mostRecentEliminatedNonPlayer?.name;
      }

      // If we still don't have another finalist, fall back to first non-player contestant.
      if (!otherFinalistName) {
        const anyNonPlayer = contestants.find(c => c.name !== prev.playerName);
        otherFinalistName = anyNonPlayer?.name;
      }

      // If we couldn't find any other finalist (degenerate cast), just keep player solo and pick first available.
      if (!otherFinalistName) {
        console.warn('proceedToJuryVote: No non-player contestant found; unable to create proper Final 2.');
        return {
          ...prev,
          gamePhase: 'jury_vote' as const,
          // Keep existing juryMembers; the JuryVoteScreen will guard and show awaiting finalists
        };
      }

      // Construct Final 2: player + otherFinalistName
      const finalists = new Set<string>([prev.playerName, otherFinalistName]);

      // Apply finalist statuses
      const updatedContestants = contestants.map(c => {
        if (finalists.has(c.name)) {
          // Ensure finalists are active
          return {
            ...c,
            isEliminated: false,
            eliminationDay: undefined
          };
        }
        // Everyone else is eliminated (if not already), mark elimination day for ordering
        if (!c.isEliminated) {
          return {
            ...c,
            isEliminated: true,
            eliminationDay: prev.currentDay
          };
        }
        return c;
      });

      // Build a jury of up to 7 most recently eliminated contestants (excluding finalists)
      const juryMembers = updatedContestants
        .filter(c => c.isEliminated && !finalists.has(c.name))
        .sort((a, b) => (b.eliminationDay || 0) - (a.eliminationDay || 0))
        .slice(0, 7)
        .map(c => c.name);

      // If we don't have enough eliminated contestants to form a jury,
      // leave the list as-is (screen handles empty jury gracefully).
      const nextState: GameState = {
        ...prev,
        contestants: updatedContestants,
        juryMembers,
        isPlayerEliminated: false, // Player is a finalist for this test path
        gamePhase: 'jury_vote' as const
      };

      // Log for debugging
      console.log('proceedToJuryVote constructed finalists:', Array.from(finalists));
      console.log('proceedToJuryVote juryMembers:', juryMembers);

      return nextState;
    });
  }, []);

  // New: debug helpers to construct juror scenario and Final 3 testing
  const proceedToFinaleAsJuror = useCallback(() => {
    setGameState(prev => {
      const contestants = [...prev.contestants];

      // Pick two non-player finalists (prefer currently active)
      const nonPlayerActives = contestants.filter(c => !c.isEliminated && c.name !== prev.playerName);
      let finalistNames: string[] = nonPlayerActives.slice(0, 2).map(c => c.name);

      if (finalistNames.length < 2) {
        const mostRecentNonPlayers = contestants
          .filter(c => c.name !== prev.playerName)
          .sort((a, b) => (b.eliminationDay || 0) - (a.eliminationDay || 0))
          .slice(0, 2 - finalistNames.length)
          .map(c => c.name);
        finalistNames = [...finalistNames, ...mostRecentNonPlayers].slice(0, 2);
      }

      const finalists = new Set<string>(finalistNames);

      const updatedContestants = contestants.map(c => {
        if (c.name === prev.playerName) {
          return { ...c, isEliminated: true, eliminationDay: prev.currentDay };
        }
        if (finalists.has(c.name)) {
          return { ...c, isEliminated: false, eliminationDay: undefined };
        }
        return c.isEliminated ? c : { ...c, isEliminated: true, eliminationDay: prev.currentDay };
      });

      const updatedJuryMembers = updatedContestants
        .filter(c => c.isEliminated)
        .sort((a, b) => (b.eliminationDay || 0) - (a.eliminationDay || 0))
        .slice(0, 7)
        .map(c => c.name);

      return {
        ...prev,
        contestants: updatedContestants,
        juryMembers: updatedJuryMembers,
        isPlayerEliminated: true,
        gamePhase: 'finale' as const,
      };
    });
  }, []);

  const proceedToJuryVoteAsJuror = useCallback(() => {
    setGameState(prev => {
      const contestants = [...prev.contestants];

      // Pick two non-player finalists (prefer currently active)
      const nonPlayerActives = contestants.filter(c => !c.isEliminated && c.name !== prev.playerName);
      let finalistNames: string[] = nonPlayerActives.slice(0, 2).map(c => c.name);

      if (finalistNames.length < 2) {
        const mostRecentNonPlayers = contestants
          .filter(c => c.name !== prev.playerName)
          .sort((a, b) => (b.eliminationDay || 0) - (a.eliminationDay || 0))
          .slice(0, 2 - finalistNames.length)
          .map(c => c.name);
        finalistNames = [...finalistNames, ...mostRecentNonPlayers].slice(0, 2);
      }

      const finalists = new Set<string>(finalistNames);

      const updatedContestants = contestants.map(c => {
        if (c.name === prev.playerName) {
          return { ...c, isEliminated: true, eliminationDay: prev.currentDay };
        }
        if (finalists.has(c.name)) {
          return { ...c, isEliminated: false, eliminationDay: undefined };
        }
        return c.isEliminated ? c : { ...c, isEliminated: true, eliminationDay: prev.currentDay };
      });

      const updatedJuryMembers = updatedContestants
        .filter(c => c.isEliminated)
        .sort((a, b) => (b.eliminationDay || 0) - (a.eliminationDay || 0))
        .slice(0, 7)
        .map(c => c.name);

      return {
        ...prev,
        contestants: updatedContestants,
        juryMembers: updatedJuryMembers,
        isPlayerEliminated: true,
        gamePhase: 'jury_vote' as const,
      };
    });
  }, []);

  const setupFinal3 = useCallback(() => {
    setGameState(prev => {
      const contestants = [...prev.contestants];

      // Ensure player + two others are active
      const others = contestants.filter(c => c.name !== prev.playerName);
      const activeOthers = others.filter(c => !c.isEliminated);
      const needed = 2 - activeOthers.length;
      let selectedOthers = activeOthers.slice(0, 2).map(c => c.name);

      if (needed > 0) {
        const revivals = others
          .filter(c => c.isEliminated)
          .sort((a, b) => (b.eliminationDay || 0) - (a.eliminationDay || 0))
          .slice(0, needed)
          .map(c => c.name);
        selectedOthers = [...selectedOthers, ...revivals].slice(0, 2);
      }

      const activeSet = new Set<string>([prev.playerName, ...selectedOthers]);

      const updatedContestants = contestants.map(c => {
        if (activeSet.has(c.name)) {
          return { ...c, isEliminated: false, eliminationDay: undefined };
        }
        return c.isEliminated ? c : { ...c, isEliminated: true, eliminationDay: prev.currentDay };
      });

      // Build jury (up to 7 most recent eliminated)
      const juryMembers = updatedContestants
        .filter(c => c.isEliminated)
        .sort((a, b) => (b.eliminationDay || 0) - (a.eliminationDay || 0))
        .slice(0, 7)
        .map(c => c.name);

      return {
        ...prev,
        contestants: updatedContestants,
        juryMembers,
        isPlayerEliminated: false,
        gamePhase: 'final_3_vote' as const,
      };
    });
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

      // If we're in jury phase, ensure eliminated is added to jury (up to 7)
      let updatedJuryMembers = [...(prev.juryMembers || [])];
      const inJuryPhase = updatedJuryMembers.length > 0;
      if (inJuryPhase && votingResult.eliminated && !updatedJuryMembers.includes(votingResult.eliminated) && updatedJuryMembers.length < 7) {
        updatedJuryMembers.push(votingResult.eliminated);
      }

      // Flag player elimination for downstream UIs (e.g., jury voting screen)
      const isPlayerEliminated = votingResult.eliminated === prev.playerName || prev.isPlayerEliminated;

      // Set next elimination day
      const nextElimDay = prev.currentDay + 7;
      
      return {
        ...prev,
        contestants: updatedContestants,
        votingHistory: [...prev.votingHistory, votingResult],
        gamePhase: 'elimination' as const,
        nextEliminationDay: nextElimDay,
        immunityWinner: undefined, // Reset immunity
        juryMembers: updatedJuryMembers.length ? updatedJuryMembers : prev.juryMembers,
        isPlayerEliminated,
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
      
      // Only add to jury if not in jury voting phase yet
      let updatedJuryMembers = [...(prev.juryMembers || [])];
      if (prev.gamePhase !== 'jury_vote' && !updatedJuryMembers.includes(votingResult.eliminated) && updatedJuryMembers.length < 7) {
        updatedJuryMembers.push(votingResult.eliminated);
      }
      
      const remainingCount = updatedContestants.filter(c => !c.isEliminated).length;
      
      console.log('Final3Vote submitted - Remaining count:', remainingCount);
      console.log('Final3Vote submitted - Going to:', remainingCount === 2 ? 'finale' : 'elimination');
      
      return {
        ...prev,
        contestants: updatedContestants,
        juryMembers: updatedJuryMembers,
        votingHistory: [...prev.votingHistory, votingResult],
        gamePhase: remainingCount === 2 ? 'finale' : 'elimination',
        isPlayerEliminated: votingResult.eliminated === prev.playerName || prev.isPlayerEliminated,
      };
    });
  }, []);

  const respondToForcedConversation = useCallback(() => {
    // Simplified forced conversation response
    console.log('Responded to forced conversation');
  }, []);

  const submitAFPVote = useCallback((choice: string) => {
    setGameState(prev => {
      // Calculate AFP ranking with player's vote
      const afpRanking = calculateAFPRanking(prev, choice);
      
      return {
        ...prev,
        afpVote: choice,
        afpRanking: afpRanking
      };
    });
  }, []);

  // Listen for AI settings updates from ActionPanel and merge into state
  useEffect(() => {
    const handler = (e: any) => {
      const next = e.detail;
      setGameState(prev => ({
        ...prev,
        aiSettings: { 
          ...prev.aiSettings, 
          ...next,
          additions: next.additions || prev.aiSettings.additions,
          outcomeScaling: next.outcomeScaling || prev.aiSettings.outcomeScaling,
        }
      }));
    };
    window.addEventListener('updateAISettings', handler);
    return () => window.removeEventListener('updateAISettings', handler);
  }, []);

  const completePremiere = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gamePhase: 'daily' as const
    }));
  }, []);

  const endGame = useCallback((winner: string, votes: { [juryMember: string]: string }, rationales?: { [juryMember: string]: string }) => {
    setGameState(prev => {
      const alreadyRanked = prev.afpRanking && prev.afpRanking.length > 0;
      const afpRanking = alreadyRanked ? prev.afpRanking : calculateAFPRanking(prev, prev.afpVote);
      return {
        ...prev,
        gamePhase: 'post_season' as const,
        gameWinner: winner,
        finalJuryVotes: votes,
        juryRationales: rationales || prev.juryRationales,
        afpRanking,
      };
    });
  }, []);

  const continueFromElimination = useCallback((forcePlayerElimination = false) => {
    console.log('=== continueFromElimination called ===');
    console.log('forcePlayerElimination:', forcePlayerElimination);
    
    setGameState(prev => {
      const remainingCount = prev.contestants.filter(c => !c.isEliminated).length;
      const playerEliminated = forcePlayerElimination || prev.contestants.find(c => c.name === prev.playerName)?.isEliminated;
      
      console.log('continueFromElimination - Remaining contestants:', remainingCount);
      console.log('continueFromElimination - Player eliminated?', playerEliminated);
      console.log('continueFromElimination - Current phase:', prev.gamePhase);
      console.log('continueFromElimination - Current jury members:', prev.juryMembers);
      console.log('continueFromElimination - Player name:', prev.playerName);
      
      // If player was eliminated during jury phase, simulate eliminations down to final 2
      const isJuryPhase = prev.juryMembers && prev.juryMembers.length > 0;
      if (playerEliminated && isJuryPhase) {
        console.log('continueFromElimination - Player eliminated during jury, simulating eliminations to final 2');

        // Mark player as eliminated and set isPlayerEliminated flag
        let updatedContestants = prev.contestants.map(c =>
          c.name === prev.playerName
            ? { ...c, isEliminated: true, eliminationDay: prev.currentDay }
            : c
        );

        // Ensure jury has at most 7 members (most recently eliminated), including player if applicable
        let updatedJuryMembers = updatedContestants
          .filter(c => c.isEliminated)
          .sort((a, b) => (b.eliminationDay || prev.currentDay) - (a.eliminationDay || prev.currentDay))
          .slice(0, 7)
          .map(c => c.name);

        console.log('Updated jury members (7 max):', updatedJuryMembers);
        console.log('Player should be included:', updatedJuryMembers.includes(prev.playerName));

        // Work on a dynamic list of currently active non-player contestants
        let activeNonPlayerContestants = updatedContestants.filter(c => !c.isEliminated && c.name !== prev.playerName);

        // Eliminate down to 2 remaining contestants (excluding the player who is eliminated)
        while (activeNonPlayerContestants.length > 2) {
          // Use relationship-based elimination (eliminate least connected)
          let eliminationTarget = activeNonPlayerContestants[0];
          let lowestConnections = Infinity;

          activeNonPlayerContestants.forEach(contestant => {
            const connections = prev.alliances.reduce((count, alliance) => {
              return count + (alliance.members.includes(contestant.name) ? alliance.members.length - 1 : 0);
            }, 0);

            if (connections < lowestConnections) {
              lowestConnections = connections;
              eliminationTarget = contestant;
            }
          });

          // Eliminate the target
          updatedContestants = updatedContestants.map(c =>
            c.name === eliminationTarget.name
              ? { ...c, isEliminated: true, eliminationDay: prev.currentDay }
              : c
          );

          // Update dynamic active list after elimination
          activeNonPlayerContestants = updatedContestants.filter(c => !c.isEliminated && c.name !== prev.playerName);

          console.log(`Simulated elimination: ${eliminationTarget.name}`);
        }

        return {
          ...prev,
          contestants: updatedContestants,
          juryMembers: updatedJuryMembers,
          isPlayerEliminated: true,
          gamePhase: 'finale' as const
        };
      }
      
      // If we're down to final 3, go to final 3 vote (only if player is still active)
      if (remainingCount === 3) {
        const playerStillActive = !playerEliminated;
        if (playerStillActive) {
          console.log('continueFromElimination - Going to final_3_vote');
          return {
            ...prev,
            gamePhase: 'final_3_vote' as const
          };
        }
      }
      
      // If we're down to final 2, go to finale
      if (remainingCount === 2) {
        return {
          ...prev,
          gamePhase: 'finale' as const
        };
      }
      
      // Continue game normally if more than 3 remain
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
    try {
      localStorage.removeItem('rtv_game_state');
    } catch (e) {
      console.warn('Failed to clear saved game state', e);
    }
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
          
          // Tag resolved micro-events for jury reasoning (rumor/correction/trap)
          const microTag = (() => {
            const id = (event.id || '').toString().toLowerCase();
            const title = (event.title || '').toString().toLowerCase();
            if (id.includes('whisper') || title.includes('whisper') || title.includes('rumor')) return 'rumor';
            if (id.includes('misquote') || title.includes('misquote') || title.includes('correction')) return 'correction';
            if (id.includes('soft_betrayal') || title.includes('trap')) return 'trap';
            return undefined;
          })();

          // Add memory of the emergent event
          const newMemory = {
            day: prev.currentDay,
            type: 'event' as const,
            participants: event.participants,
            content: `${event.title}: ${prev.playerName} chose to ${choice === 'pacifist' ? 'defuse' : 'escalate'} the situation`,
            emotionalImpact: Math.floor(trustDelta / 5),
            timestamp: Date.now(),
            tags: microTag ? [microTag] : undefined,
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

      // Ratings update from emergent event impact
      const ratingRes = ratingsEngine.applyEmergent(prev, editImpact, event?.title);
      const nextHistory = [
        ...(prev.ratingsHistory || []),
        { day: prev.currentDay, rating: Math.round(ratingRes.rating * 100) / 100, reason: ratingRes.reason },
      ];

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
        ],
        viewerRating: ratingRes.rating,
        ratingsHistory: nextHistory,
      };
    });
  }, []);

  const tagTalk = useCallback((target: string, choiceId: string, interaction: 'talk' | 'dm' | 'scheme' | 'activity') => {
    console.log('=== TAG TALK TRIGGERED ===');
    console.log('Target:', target, 'Choice:', choiceId, 'Interaction:', interaction);

    // Compute precise outcome using ReactionProfile + choice metadata
    // and surface actual deltas in lastAIReaction. Also apply cooldowns.
    setGameState(prev => {
      const targetNPC = prev.contestants.find(c => c.name === target);
      if (!targetNPC) {
        console.warn('TagTalk: target not found', target);
        // Fallback to generic action
        useAction(interaction, target, `Tag choice: ${choiceId}`, 'tag');
        return prev;
      }

      // Load choice from data
      try {
        const choice = (TAG_CHOICES as any[]).find((c: any) => c.choiceId === choiceId);
        if (!choice) {
          console.warn('TagTalk: choice not found', choiceId);
          useAction(interaction, target, `Tag choice: ${choiceId}`, 'tag');
          return prev;
        }

        const outcome = evaluateChoice(choice, targetNPC, prev.playerName, prev);
        // Scale normalized deltas (-1..1) into game point changes
        const trustSuspScale = prev.aiSettings?.outcomeScaling?.trustSuspicionScale ?? 40;
        const influenceScale = prev.aiSettings?.outcomeScaling?.influenceScale ?? 20;
        const entertainmentScale = prev.aiSettings?.outcomeScaling?.entertainmentScale ?? 20;
        const trustPts = Math.round((outcome.trustDelta || 0) * trustSuspScale);
        const suspPts = Math.round((outcome.suspicionDelta || 0) * trustSuspScale);
        const inflPts = Math.round((outcome.influenceDelta || 0) * influenceScale);
        const entPts = Math.round((outcome.entertainmentDelta || 0) * entertainmentScale);

        // Apply trust/suspicion to target
        const updatedContestants = prev.contestants.map(c => {
          if (c.name !== target) return c;
          const newTrustLevel = Math.max(-100, Math.min(100, c.psychProfile.trustLevel + trustPts));
          const newSuspicionLevel = Math.max(0, Math.min(100, c.psychProfile.suspicionLevel + suspPts));

          // Memory entry
          const memType = interaction === 'dm' ? 'dm' : interaction === 'scheme' ? 'scheme' : 'conversation';
          const newMemory = {
            day: prev.currentDay,
            type: memType as any,
            participants: [prev.playerName, target],
            content: `[TAG intent=${choice.intent} topic=${choice.topics[0]}] ${reactionText(target, choice, outcome)}`,
            emotionalImpact: Math.max(-10, Math.min(10, Math.floor(trustPts / 5))),
            timestamp: Date.now()
          };

          return {
            ...c,
            psychProfile: {
              ...c.psychProfile,
              trustLevel: newTrustLevel,
              suspicionLevel: newSuspicionLevel,
            },
            memory: [...c.memory, newMemory],
          };
        });

        // Refresh persistent reaction profile for the target based on updated psych state
        const updatedProfiles = { ...(prev.reactionProfiles || {}) };
        const refreshedTarget = updatedContestants.find(c => c.name === target);
        if (refreshedTarget) {
          const prof = getReactionProfileForNPC(refreshedTarget);
          updatedProfiles[refreshedTarget.id] = prof;
          updatedProfiles[refreshedTarget.name] = prof;
        }

        // Optionally nudge edit perception based on entertainment/influence
        const updatedEdit = {
          ...prev.editPerception,
          screenTimeIndex: Math.max(0, Math.min(100, prev.editPerception.screenTimeIndex + entPts)),
          lastEditShift: entPts,
          audienceApproval: Math.max(-100, Math.min(100, prev.editPerception.audienceApproval + Math.round(inflPts / 2))),
        };

        // Cooldown handling
        const cooldownDays = choice.cooldownDays || 0;
        const cooldownKey = getCooldownKey(prev.playerName, target, choice.choiceId);
        const updatedCooldowns = { ...(prev.tagChoiceCooldowns || {}) };
        if (cooldownDays > 0) {
          updatedCooldowns[cooldownKey] = prev.currentDay + cooldownDays;
          // Also store by raw choice.id for UI that keyed directly by id
          updatedCooldowns[choice.choiceId] = prev.currentDay + cooldownDays;
        }

        // Determine take from outcome category
        const cat = outcome.category;
        const take: ReactionTake =
          cat === 'positive' ? 'positive' :
          cat === 'neutral' ? 'neutral' : 'pushback';

        const context: ReactionSummary['context'] =
          interaction === 'dm' ? 'private' :
          interaction === 'scheme' ? 'scheme' :
          interaction === 'activity' ? 'activity' : 'public';

        // Build reaction text and deltas for UI
        const reactText = reactionText(target, choice, outcome);
        const reactionSummary: ReactionSummary = {
          take,
          context,
          notes: reactText,
          deltas: {
            trust: trustPts,
            suspicion: suspPts,
            influence: inflPts,
            entertainment: entPts,
          }
        };

        const lastTagOutcome = {
          choiceId: choice.choiceId,
          intent: choice.intent,
          topic: choice.topics[0],
          outcome: {
            trustDelta: outcome.trustDelta,
            suspicionDelta: outcome.suspicionDelta,
            entertainmentDelta: outcome.entertainmentDelta,
            influenceDelta: outcome.influenceDelta,
            category: outcome.category,
            notes: outcome.notes,
          }
        };

        // Append interaction log with tag metadata to support repetition heuristics
        const tagPattern = `[TAG intent=${choice.intent} topic=${choice.topics[0]}]`;
        const interactionEntry = {
          day: prev.currentDay,
          type: interaction,
          participants: [prev.playerName, target],
          content: `${tagPattern} ${choice.choiceId}`,
          tone: choice.tone,
          source: 'player' as const,
        };

        // Update actions usage for the specific interaction
        const updatedActions = prev.playerActions.map(a =>
          a.type === interaction ? { ...a, used: true, usageCount: (a.usageCount || 0) + 1 } : a
        );

        // Ratings update for tag talk outcome
        const ratingRes = ratingsEngine.applyReaction(prev, reactionSummary);
        const nextHistory = [
          ...(prev.ratingsHistory || []),
          { day: prev.currentDay, rating: Math.round(ratingRes.rating * 100) / 100, reason: ratingRes.reason },
        ];

        const newState: GameState = {
          ...prev,
          contestants: updatedContestants,
          playerActions: updatedActions,
          dailyActionCount: (prev.dailyActionCount || 0) + 1,
          lastActionType: interaction,
          lastActionTarget: target,
          lastAIReaction: reactionSummary,
          lastTagOutcome,
          interactionLog: [...(prev.interactionLog || []), interactionEntry],
          tagChoiceCooldowns: updatedCooldowns,
          editPerception: updatedEdit,
          reactionProfiles: updatedProfiles,
          viewerRating: ratingRes.rating,
          ratingsHistory: nextHistory,
        };

        return newState;
      } catch (e) {
        console.warn('TagTalk: evaluate/apply failed, fallback to generic action', e);
        useAction(interaction, target, `Tag choice: ${choiceId}`, 'tag');
        return prev;
      }
    });
  }, [useAction]);

  // Add skip to jury handler
  const skipToJury = useCallback(() => {
    setGameState(prev => {
      const contestants = prev.contestants;
      const activePlayers = contestants.filter(c => !c.isEliminated);

      // Ensure we keep the player plus 6 others (total 7 survivors entering jury phase)
      const nonPlayerActives = activePlayers.filter(c => c.name !== prev.playerName);
      const keepNonPlayers = nonPlayerActives.slice(0, 6);
      const keepNames = new Set<string>([prev.playerName, ...keepNonPlayers.map(c => c.name)]);

      const updatedContestants = contestants.map(c => {
        if (keepNames.has(c.name)) {
          return c; // keep active
        }
        // eliminate everyone not in keep set
        return { ...c, isEliminated: true, eliminationDay: prev.currentDay };
      });

      // Build a jury of the most recently eliminated (up to 7)
      const juryMembers = updatedContestants
        .filter(c => c.isEliminated && typeof c.eliminationDay !== 'undefined')
        .sort((a, b) => (b.eliminationDay || 0) - (a.eliminationDay || 0))
        .slice(0, 7)
        .map(c => c.name);

      return {
        ...prev,
        contestants: updatedContestants,
        juryMembers,
        daysUntilJury: 0,
        gamePhase: 'daily' as const
      };
    });
  }, []);

  // Add event listener for skip button
  useEffect(() => {
    const handleSkip = () => skipToJury();
    window.addEventListener('skipToJury', handleSkip);
    return () => window.removeEventListener('skipToJury', handleSkip);
  }, [skipToJury]);

  const handleTieBreakResult = useCallback((
    eliminated: string,
    winner1: string,
    winner2: string,
    method?: 'challenge' | 'fire_making' | 'random_draw',
    results?: { name: string; time: number }[],
    selectionReason?: 'player_persuasion' | 'npc_choice' | 'manual'
  ) => {
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
        reason: method
          ? `${eliminated} lost Final 3 tie-break (${method.replace('_', ' ')})`
          : `${eliminated} lost Final 3 tie-break challenge`,
        tieBreak: {
          tied: [winner1, winner2, eliminated],
          method: method ? (method as 'revote' | 'sudden_death') : 'sudden_death',
          suddenDeathWinner: winner1,
          suddenDeathLoser: eliminated,
          log: [
            `Final 3 tie resolved via ${method || 'challenge'}`,
            `${winner1} and ${winner2} advance to finale`
          ],
          revote: undefined
        }
      };

      // Persist final 3 tie-break metadata for recap
      newState.final3TieBreak = {
        day: prev.currentDay,
        method: method || 'challenge',
        results,
        eliminated,
        winners: [winner1, winner2],
        selectionReason,
      };
      
      newState.votingHistory = [...prev.votingHistory.slice(0, -1), tieBreakRecord];
      newState.gamePhase = 'finale' as const;
      
      return newState;
    });
  }, []);

  // Manual Save/Load/Delete API
  const saveGame = useCallback(() => {
    try {
      localStorage.setItem('rtv_game_state', JSON.stringify(gameState));
      console.log('Game saved manually.');
    } catch (e) {
      console.warn('Failed to save game state', e);
    }
  }, [gameState]);

  const loadSavedGame = useCallback(() => {
    try {
      const raw = localStorage.getItem('rtv_game_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        setGameState(parsed as GameState);
        console.log('Loaded saved game.');
      }
    } catch (e) {
      console.warn('Failed to load saved game state', e);
    }
  }, []);

  const deleteSavedGame = useCallback(() => {
    try {
      localStorage.removeItem('rtv_game_state');
      console.log('Deleted saved game.');
    } catch (e) {
      console.warn('Failed to delete saved game state', e);
    }
  }, []);

  const hasSavedGame = useCallback(() => {
    try {
      return !!localStorage.getItem('rtv_game_state');
    } catch {
      return false;
    }
  }, []);

  const goToTitle = useCallback(() => {
    // Explicit user intent to return to title screen; clear playerName to avoid watchdog reverting
    setGameState(prev => ({
      ...prev,
      playerName: '', // signal title mode
      gamePhase: 'intro',
    }));
  }, []);

  const toggleDebugMode = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      debugMode: !prev.debugMode,
    }));
  }, []);

  // Phase watchdog: prevent unintended jumps back to intro if a player is active.
  // If some component accidentally sets `intro` while a playerName exists, revert to daily.
  useEffect(() => {
    if (gameState.gamePhase === 'intro' && gameState.playerName) {
      console.warn('Phase watchdog: Blocking unintended transition to intro while player is active');
      setGameState(prev => ({
        ...prev,
        gamePhase: prev.gamePhase && prev.gamePhase !== 'intro' ? prev.gamePhase : 'daily',
      }));
    }
  }, [gameState.gamePhase, gameState.playerName]);

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
    proceedToJuryVote,
    // New debug/test helpers
    proceedToFinaleAsJuror,
    proceedToJuryVoteAsJuror,
    setupFinal3,
    // Save/Load
    loadSavedGame,
    saveGame,
    deleteSavedGame,
    hasSavedGame,
    goToTitle,
    toggleDebugMode,
  };
};
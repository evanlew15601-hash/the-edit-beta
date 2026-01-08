import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameState, PlayerAction, ReactionSummary, ReactionTake, Contestant, HouseMeetingToneChoice, HouseMeetingTopic, InteractionLogEntry } from '@/types/game';
import { houseMeetingEngine } from '@/utils/houseMeetingEngine';
import { generateContestants } from '@/utils/contestantGenerator';
import { generateStaticNPCs } from '@/utils/npcGeneration';
import { calculateLegacyEditPerception } from '@/utils/editEngine';
import { AllianceManager } from '@/utils/allianceManager';
import { InformationTradingEngine } from '@/utils/informationTradingEngine';
import { calculateAFPRanking } from '@/utils/afpCalculator';
import { gameSystemIntegrator } from '@/utils/gameSystemIntegrator';
import { processVoting } from '@/utils/votingEngine';
import { memoryEngine } from '@/utils/memoryEngine';
import { relationshipGraphEngine } from '@/utils/relationshipGraphEngine';
import { getTrustDelta, getSuspicionDelta } from '@/utils/actionEngine';
import { TwistEngine } from '@/utils/TwistEngine';
import { speechActClassifier } from '@/utils/speechActClassifier';
import { EnhancedNPCMemorySystem } from '@/utils/enhancedNPCMemorySystem';
import { getReactionProfileForNPC } from '@/utils/tagDialogueEngine';
import { TAG_CHOICES } from '@/data/tagChoices';
import { evaluateChoice, reactionText, getCooldownKey } from '@/utils/tagDialogueEngine';
import { ConfessionalEngine } from '@/utils/confessionalEngine';
import { ratingsEngine } from '@/utils/ratingsEngine';
import { applyDailySpecialBackgroundLogic, revealHostChild, finalizePlantedContract } from '@/utils/specialBackgrounds';
import { applyDailyNarrative, initializeTwistNarrative } from '@/utils/twistNarrativeEngine';
import { buildTwistIntroCutscene, buildMidGameCutscene, buildTwistResultCutscene, buildFinaleCutscene } from '@/utils/twistCutsceneBuilder';
import { AIVotingStrategy } from '@/utils/aiVotingStrategy';
import { conversationIntentEngine } from '@/utils/conversationIntentEngine';
import { getCurrentWeek } from '@/utils/taskEngine';
import { BackgroundConversationEngine } from '@/utils/backgroundConversationEngine';

type GameActionType =
  PlayerAction['type']
  | 'create_alliance'
  | 'add_alliance_members'
  | 'house_meeting'
  | 'alliance_meeting';

const isDevEnv = import.meta.env.MODE !== 'production';
const debugLog = (...args: any[]) => {
  if (isDevEnv) console.log(...args);
};

const debugWarn = (...args: any[]) => {
  if (isDevEnv) console.warn(...args);
};

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
      groupActionsUsedToday: 0,
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

  // Keep a ref to always access the latest gameState in async callbacks
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const startGame = useCallback((playerName?: string) => {
    console.log('Starting game, proceeding to character creation.', playerName ? `Provided name (ignored here): ${playerName}` : '');

    const newState: GameState = {
      currentDay: 1,
      // Name will be finalized in character creation
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
      gamePhase: 'character_creation',
      twistsActivated: [],
      nextEliminationDay: 7,
      daysUntilJury: 28,
      dailyActionCount: 0,
      dailyActionCap: 10,
      groupActionsUsedToday: 0,
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
    };
    setGameState(newState);
  }, []);

  const advanceDay = useCallback(() => {
    setGameState(prev => {
      const newDay = prev.currentDay + 1;
      debugLog('Advancing to day:', newDay);
      debugLog('Player name before alliance update:', prev.playerName);
      debugLog('Current alliances before update:', prev.alliances);
      debugLog('All contestants before update:', prev.contestants.map(c => ({ name: c.name, eliminated: c.isEliminated })));
      
      // Update alliances with the new management system - FIXED persistence
      const updatedAlliances = AllianceManager.updateAllianceTrust({
        ...prev,
        currentDay: newDay
      });

      // Process alliance secrecy/exposure each day so secret alliances can be discovered over time
      const alliancesWithSecrecy = AllianceManager.processAllianceSecrecy({
        ...prev,
        currentDay: newDay,
        alliances: updatedAlliances
      });
      
      debugLog('Updated alliances after cleanup + secrecy processing:', alliancesWithSecrecy);
      
      // Check if player is in any alliances
      const playerAlliances = alliancesWithSecrecy.filter(alliance => alliance.members.includes(prev.playerName));
      debugLog(`Player ${prev.playerName} is in ${playerAlliances.length} alliances:`, playerAlliances);

      // Auto-generate intelligence when day advances
      const tempState = {
        ...prev,
        currentDay: newDay,
        alliances: alliancesWithSecrecy
      };

      // At the start of each new in-game week, let NPCs quietly form fresh voting plans
      // These plans are stored as 'weekly_plan' in the memory system and treated as soft baselines.
      if ((newDay - 1) % 7 === 0) {
        AIVotingStrategy.generateWeeklyVotingPlans(tempState as GameState);
      }
      
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

      // Apply special background daily logic (host child reveal effects, planted tasks, etc.)
      const specialApplied = applyDailySpecialBackgroundLogic({
        ...tempState,
        contestants: cleanedContestants,
      });

      // Apply narrative arc tracking for player twists
      const narrativeApplied = applyDailyNarrative({
        ...specialApplied,
        twistNarrative: specialApplied.twistNarrative || initializeTwistNarrative(specialApplied),
      });

      // Mission result cutscenes for planted houseguest specials
      let nextCutscene: GameState['currentCutscene'] | undefined = undefined;
      let missionBanner: GameState['missionBroadcastBanner'] | undefined = undefined;
      const prevPlayer = prev.contestants.find(c => c.name === prev.playerName);
      const nextPlayer = narrativeApplied.contestants.find(c => c.name === prev.playerName);

      if (
        prevPlayer &&
        nextPlayer &&
        prevPlayer.special &&
        nextPlayer.special &&
        prevPlayer.special.kind === 'planted_houseguest' &&
        nextPlayer.special.kind === 'planted_houseguest'
      ) {
        const prevTasks = (prevPlayer.special as any).tasks || [];
        const nextTasks = (nextPlayer.special as any).tasks || [];

        // Detect newly completed mission this day
        const newlyCompleted = nextTasks.find((nextTask: any) => {
          const prevTask = prevTasks.find((t: any) => t.id === nextTask.id);
          return nextTask.completed && !prevTask?.completed;
        });

        if (newlyCompleted) {
          nextCutscene = buildTwistResultCutscene(
            narrativeApplied as GameState,
            'success',
            { taskId: newlyCompleted.id },
          );
          missionBanner = {
            day: newDay,
            result: 'success',
            taskId: newlyCompleted.id,
            description: newlyCompleted.description,
          };
        } else {
          // On week rollover, treat last week's unfinished mission as failed
          const prevWeek = getCurrentWeek(prev.currentDay);
          const newWeek = getCurrentWeek(newDay);
          if (newWeek > prevWeek) {
            const failedTask = prevTasks.find((t: any) => (t.week ?? prevWeek) === prevWeek && !t.completed);
            if (failedTask) {
              nextCutscene = buildTwistResultCutscene(
                narrativeApplied as GameState,
                'failure',
                { taskId: failedTask.id },
              );
              missionBanner = {
                day: newDay,
                result: 'failure',
                taskId: failedTask.id,
                description: failedTask.description,
              };
            }
          }
        }
      }

      // Detect newly activated narrative beat to trigger a lite mid-game cutscene,
      // but only if a mission result cutscene isn't already queued.
      const prevBeatId = prev.twistNarrative?.currentBeatId;
      const newBeatId = narrativeApplied.twistNarrative?.currentBeatId;
      if (!nextCutscene && newBeatId && newBeatId !== prevBeatId) {
        const beat = narrativeApplied.twistNarrative!.beats.find(b => b.id === newBeatId);
        if (beat) {
          nextCutscene = buildMidGameCutscene(narrativeApplied as GameState, beat);
        }
      }
      
      // Emergent events are now handled by the EnhancedEmergentEvents component
      // No need for manual triggering here as the component manages its own generation
      
      // Trigger minimal automatic information sharing (reduced frequency)
      if (newDay % 3 === 0) { // Only every 3 days
        InformationTradingEngine.autoGenerateIntelligence(tempState);
      }

      // Let long-term relationships gently decay over time (per-contestant memory model)
      const baseContestants = EnhancedNPCMemorySystem.decayLongTermRelationships({
        ...tempState,
        contestants: cleanedContestants,
      });

      // Also gently decay the global relationship graph so extreme trust/suspicion softens between interactions
      relationshipGraphEngine.decayRelationships(newDay);

      // Apply new contextual memories
      baseContestants.forEach(c => {
        const extra = newContextualMemories[c.name] || [];
        c.memory = [...c.memory, ...extra];
      });

      // Pull updated jury members (if any) from narrative/special logic
      const juryMembers = narrativeApplied.juryMembers || prev.juryMembers;

      // Track days until jury if configured
      const daysUntilJury = typeof prev.daysUntilJury === 'number'
        ? Math.max(0, prev.daysUntilJury - 1)
        : prev.daysUntilJury;

      // Decide whether to show a cutscene, weekly recap, or stay in daily mode
      let gamePhase: GameState['gamePhase'] = prev.gamePhase;
      if (newDay >= prev.nextEliminationDay) {
        gamePhase = 'player_vote';
      } else if (newDay % 7 === 0) {
        gamePhase = 'weekly_recap';
      } else {
        gamePhase = 'daily';
      }

      // Update viewer ratings lightly based on the day change
      const nextViewerRating = prev.viewerRating ?? ratingsEngine.getInitial();
      const nextRatingsHistory = prev.ratingsHistory || [];

      // Clear forced conversations that are too old; keep up to 2 queued
      const nextForcedQueue = (prev.forcedConversationsQueue || []).filter(fc => newDay - fc.day <= 2).slice(0, 2);

      return {
        ...prev,
        currentDay: newDay,
        dailyActionCount: 0,
        groupActionsUsedToday: 0,
        contestants: baseContestants,
        alliances: updatedAlliances,
        juryMembers,
        daysUntilJury,
        gamePhase: nextCutscene ? 'cutscene' as const : gamePhase,
        currentCutscene: nextCutscene || prev.currentCutscene,
        editPerception: updatedEditPerception,
        lastAIResponse: undefined,
        lastAIAdditions: undefined,
        lastAIReaction: undefined,
        lastActionTarget: undefined,
        lastActionType: undefined,
        viewerRating: nextViewerRating,
        ratingsHistory: nextRatingsHistory,
        productionTaskLog: specialApplied.productionTaskLog || prev.productionTaskLog,
        hostChildName: specialApplied.hostChildName || prev.hostChildName,
        hostChildRevealDay: specialApplied.hostChildRevealDay || prev.hostChildRevealDay,
        twistNarrative: narrativeApplied.twistNarrative || prev.twistNarrative,
        ongoingHouseMeeting: maybeHM || prev.ongoingHouseMeeting,
        forcedConversationsQueue: nextForcedQueue,
        missionBroadcastBanner: missionBanner,
      };
    });

    // After the synchronous day-advance state update, trigger background
    // NPC conversations asynchronously using the latest gameStateRef.
    (async () => {
      try {
        const stateAfterAdvance = gameStateRef.current;
        const outcomes = await BackgroundConversationEngine.generateDailyBackgroundConversations(stateAfterAdvance);
        if (!outcomes || outcomes.length === 0) {
          return;
        }

        setGameState(prev => {
          // Avoid applying stale outcomes if the day has already moved on.
          if (prev.currentDay !== stateAfterAdvance.currentDay) {
            return prev;
          }
          return BackgroundConversationEngine.applyOutcomes(prev, outcomes);
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to generate/apply background NPC conversations:', e);
      }
    })();
  }, []);

  const useAction = useCallback((actionType: GameActionType, target?: string, content?: string, tone?: string) => {
    debugLog('=== ACTION TRIGGERED ===');
    debugLog('Action Type:', actionType);
    debugLog('Target:', target);
    debugLog('Content:', content);
    debugLog('Tone:', tone);

    // Primary player → NPC conversation flows (free-text Talk / DM)
    // Route through the cleaned NPCResponseEngine via gameSystemIntegrator so that:
    // - RelationshipGraphEngine is updated
    // - NPC memory entries are created consistently
    // - A minimal ReactionSummary is surfaced for the UI
    // - Optionally, a local free LLM paraphrases the internal plan into an in-character line
    if (actionType === 'talk' || actionType === 'dm') {
      // Use ref to get current state to avoid stale closure issue
      const currentState = gameStateRef.current;
      const playerNameForLog = (currentState.playerName || '').trim() || 'Player';

      if (!target || !content) {
        debugWarn('useAction(talk/dm) missing target/content', {
          actionType,
          target,
          hasContent: !!content,
          playerName: currentState.playerName,
        });
        return;
      }

      const conversationType: 'public' | 'private' =
        actionType === 'dm' ? 'private' : 'public';

      const playerAction: PlayerAction = {
        type: actionType as PlayerAction['type'],
        target,
        content,
        tone,
        used: true,
        usageCount: 0,
      };

      // Set loading state immediately
      setGameState(prev => ({
        ...prev,
        lastAIResponseLoading: true,
      }));

      // Process async AI response
      (async () => {
        try {
          // Get fresh state again at execution time
          const freshState = gameStateRef.current;
          const response = await gameSystemIntegrator.processPlayerAction(playerAction, freshState);

          // Aggregate rule-based consequences into a lightweight reaction summary
          let trustDelta = 0;
          let suspicionDelta = 0;

          (response?.consequences || []).forEach((consequence) => {
            if (consequence.type === 'trust_change') {
              trustDelta += consequence.value;
            } else if (consequence.type === 'suspicion_change') {
              suspicionDelta += consequence.value;
            }
          });

          const take: ReactionTake =
            trustDelta > 0 && suspicionDelta <= 0
              ? 'positive'
              : trustDelta < 0 && suspicionDelta > 0
              ? 'pushback'
              : suspicionDelta > 0
              ? 'suspicious'
              : 'neutral';

          const reactionSummary: ReactionSummary = {
            take,
            context: conversationType,
            notes:
              response?.content ||
              'They respond in character based on your message and the current game state.',
            deltas: {
              trust: Math.round(trustDelta),
              suspicion: Math.round(suspicionDelta),
              influence: 0,
              entertainment: 0,
            },
          };

          const parsedInput = speechActClassifier.classifyMessage(content, 'Player', {
            allContestantNames: currentState.contestants.map((c) => c.name),
          });
          const intent = conversationIntentEngine.parse(
            content,
            parsedInput,
            currentState.contestants.map((c) => c.name)
          );

          // Lightly surface vote-intent conversations into the strategic memory system
          // so downstream voting logic can treat them as soft plans rather than hard commits.
          if (intent.topic === 'vote' && intent.voteTarget && target) {
            memoryEngine.updateVotingPlan(
              target,
              intent.voteTarget,
              `Discussed voting for ${intent.voteTarget} with the player during a ${conversationType} chat.`,
              { source: 'conversation_hint', day: currentState.currentDay }
            );
          }

          // Subtle relationship nudges based on alliance/vote talk content.
          // These sit on top of the rule-based trust/suspicion changes coming from gameSystemIntegrator.
          if (target) {
            const playerName = (currentState.playerName || '').trim() || 'Player';
            const day = currentState.currentDay;

            if (intent.topic === 'vote') {
              // Asking someone to vote with you can slightly shift how tightly they see you as a partner.
              const trustNudge =
                reactionSummary.take === 'positive' ? 2 :
                reactionSummary.take === 'pushback' ? -1 :
                reactionSummary.take === 'suspicious' ? -3 :
                0;
              const suspicionNudge =
                reactionSummary.take === 'suspicious' ? 4 :
                reactionSummary.take === 'pushback' ? 2 :
                0;
              const emotionalNudge =
                reactionSummary.take === 'positive' ? 1 :
                reactionSummary.take === 'pushback' ? -1 :
                0;

              if (trustNudge !== 0 || suspicionNudge !== 0 || emotionalNudge !== 0) {
                relationshipGraphEngine.updateRelationship(
                  target,
                  playerName,
                  trustNudge,
                  suspicionNudge,
                  emotionalNudge,
                  'conversation',
                  `[Vote Talk] Discussed voting for ${intent.voteTarget || 'someone'} with the player via ${conversationType} chat.`,
                  day
                );
              }

              // If the player clearly positions against specific others ("without X"), let that
              // lightly shape the target's perception of those excluded names as less trusted.
              if (intent.wantsToExclude && intent.wantsToExclude.length > 0) {
                intent.wantsToExclude.forEach((excludedName) => {
                  if (!excludedName || excludedName === target || excludedName === playerName) return;
                  relationshipGraphEngine.updateRelationship(
                    target,
                    excludedName,
                    -2,
                    3,
                    -1,
                    'conversation',
                    `[Vote Talk] Player and ${target} talked about not working with ${excludedName}.`,
                    day
                  );
                });
              }
            } else if (intent.topic === 'alliance') {
              // Alliance talk: small trust bumps toward the player and toward named allies.
              const baseTrust =
                reactionSummary.take === 'positive' ? 4 :
                reactionSummary.take === 'neutral' ? 2 :
                reactionSummary.take === 'suspicious' ? -2 :
                1;
              const baseSuspicion = reactionSummary.take === 'suspicious' ? 3 : 0;
              const baseEmotional = reactionSummary.take === 'positive' ? 2 : 0;

              relationshipGraphEngine.updateRelationship(
                target,
                playerName,
                baseTrust,
                baseSuspicion,
                baseEmotional,
                'conversation',
                `[Alliance Talk] Talked about working together${
                  intent.wantsAllianceWith && intent.wantsAllianceWith.length
                    ? ` with ${intent.wantsAllianceWith.join(', ')}`
                    : ''
                }.`,
                day
              );

              if (intent.wantsAllianceWith && intent.wantsAllianceWith.length > 0) {
                intent.wantsAllianceWith.forEach((name) => {
                  if (!name || name === target || name === playerName) return;
                  relationshipGraphEngine.updateRelationship(
                    target,
                    name,
                    2,
                    0,
                    1,
                    'conversation',
                    `[Alliance Talk] ${target} heard player describe ${name} as part of their numbers.`,
                    day
                  );
                });
              }
            }
          }

          const interactionEntry = {
            day: currentState.currentDay,
            type: actionType,
            participants: [playerNameForLog, target],
            content: content || '',
            tone: tone || 'neutral',
            source: 'player' as const,
          };

          setGameState(prev => {
            const updatedActions = prev.playerActions.map((a) =>
              a.type === actionType
                ? { ...a, used: true, usageCount: (a.usageCount || 0) + 1 }
                : a
            );

            return {
              ...prev,
              playerActions: updatedActions,
              dailyActionCount: (prev.dailyActionCount || 0) + 1,
              lastActionType: actionType,
              lastActionTarget: target,
              lastAIReaction: reactionSummary,
              lastParsedInput: parsedInput,
              lastParsedIntent: intent,
              lastAIResponse: response?.content,
              lastAIResponseLoading: false,
              interactionLog: [...(prev.interactionLog || []), interactionEntry],
            };
          });
        } catch (e) {
          console.error('AI response generation failed:', e);
          setGameState(prev => ({
            ...prev,
            lastAIResponseLoading: false,
          }));
        }
      })();

      return;
    }
    
    // Handle alliance creation separately
    if (actionType === 'create_alliance') {
      const allianceName = target || 'New Alliance';
      const memberNames = content ? content.split(',') : [];
      debugLog('Creating alliance:', allianceName, 'with members:', memberNames);
      
      setGameState(prev => {
        debugLog('Current player name:', prev.playerName);
        
        // Don't duplicate player name if it's already in the list
        const allMembers = memberNames.includes(prev.playerName) 
          ? memberNames 
          : [prev.playerName, ...memberNames];
        debugLog('Will create alliance with members:', allMembers);
        
        const newAlliance = AllianceManager.createAlliance(allMembers, allianceName, prev.currentDay);
        
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
      const newMembersRaw = content ? content.split(',') : [];
      debugLog('Adding members to alliance:', allianceId, 'new members:', newMembersRaw);
      
      setGameState(prev => {
        const targetAlliance = prev.alliances.find(a => a.id === allianceId);
        if (!targetAlliance) return prev;

        // Avoid duplicating existing members
        const uniqueNewMembers = newMembersRaw.filter(
          name => !targetAlliance.members.includes(name)
        );

        if (uniqueNewMembers.length === 0) {
          return {
            ...prev,
            dailyActionCount: prev.dailyActionCount + 1
          };
        }

        // Mirror membership changes into the relationship graph
        uniqueNewMembers.forEach(newMember => {
          targetAlliance.members.forEach(existing => {
            relationshipGraphEngine.formAlliance(existing, newMember, targetAlliance.strength);
          });
        });

        const updatedAlliances = prev.alliances.map(alliance => 
          alliance.id === allianceId 
            ? {
                ...alliance,
                members: [...alliance.members, ...uniqueNewMembers],
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

    // Handle House Meeting initialization
    if (actionType === 'house_meeting') {
      setGameState(prev => {
        const topic = (content as HouseMeetingTopic) || 'nominate_target';
        const participants = prev.contestants.filter(c => !c.isEliminated).map(c => c.name);
        const state = {
          id: `hm_${Date.now()}`,
          initiator: prev.playerName || 'Player',
          topic,
          target,
          isAIInitiated: false,
          participants,
          currentRound: 0,
          maxRounds: 5,
          mood: houseMeetingEngine.getMood(prev),
          conversationLog: [{ speaker: prev.playerName || 'Player', text: `Call House Meeting: ${topic.replace('_', ' ')}` }],
          currentOptions: houseMeetingEngine.buildOptions(topic),
          forcedOpen: true,
        };
        const updatedActions = prev.playerActions.map(a =>
          a.type === 'house_meeting' ? { ...a, used: true, usageCount: (a.usageCount || 0) + 1 } : a
        );
        return {
          ...prev,
          ongoingHouseMeeting: state,
          playerActions: updatedActions,
          dailyActionCount: (prev.dailyActionCount || 0) + 1,
          lastActionType: 'house_meeting',
          lastActionTarget: 'Group',
        };
      });
      return;
    }

    // Handle Alliance Meeting (group, private)
    if (actionType === 'alliance_meeting') {
      setGameState(prev => {
        const alliance = prev.alliances.find(a => a.id === (target || ''));
        if (!alliance) return prev;

        // Parse proposed vote target from agenda content if provided
        const proposedMatch = (content || '').match(/(?:vote|target)[:=]\s*([A-Za-z0-9 _-]+)/i);
        const proposedTarget = proposedMatch ? proposedMatch[1].trim() : undefined;

        const members = alliance.members.filter(
          n => !prev.contestants.find(c => c.name === n)?.isEliminated
        );
        const toneUsed = (tone || 'strategic').toLowerCase();

        const meetingDeltas: { member: string; trustDelta: number; suspicionDelta: number }[] = [];

        // Apply relationship deltas per member and log memory
        const updatedContestants = prev.contestants.map(c => {
          if (!members.includes(c.name) || c.name === prev.playerName) return c;

          const trustDelta = getTrustDelta(toneUsed, c.psychProfile.disposition);
          // Keep alliance meetings low suspicion (private)
          const suspicionDelta = Math.max(
            0,
            Math.floor(getSuspicionDelta('friendly', content || '') / 3)
          );

          meetingDeltas.push({ member: c.name, trustDelta, suspicionDelta });

          const newTrust = Math.max(
            -100,
            Math.min(100, c.psychProfile.trustLevel + trustDelta)
          );
          const newSusp = Math.max(
            0,
            Math.min(100, c.psychProfile.suspicionLevel + suspicionDelta)
          );

          const mem = {
            day: prev.currentDay,
            type: 'alliance_meeting' as const,
            participants: [prev.playerName, ...members],
            content: `[Alliance Meeting] ${content || 'discussion'}`,
            emotionalImpact: Math.floor(trustDelta / 5),
            timestamp: Date.now(),
          };

          return {
            ...c,
            psychProfile: {
              ...c.psychProfile,
              trustLevel: newTrust,
              suspicionLevel: newSusp,
            },
            memory: [...c.memory, mem],
          };
        });

        // If a vote target was proposed, store soft voting plans in memory for each member
        if (proposedTarget) {
          const plannedFor: string[] = [];
          members.forEach(name => {
            if (name === prev.playerName) return;
            memoryEngine.updateVotingPlan(
              name,
              proposedTarget,
              `Alliance meeting plan coordinated by ${prev.playerName}`,
              { source: 'alliance_meeting', day: prev.currentDay }
            );
            plannedFor.push(name);
          });

          if (prev.debugMode) {
            debugLog('[AllianceMeeting] voting plans created', {
              alliance: alliance.name || alliance.id,
              proposedTarget,
              plannedFor,
            });
          }
        }

        // Log the meeting in interaction log so alliance/trust systems can see it
        const interactionEntry = {
          day: prev.currentDay,
          type: 'alliance_meeting' as const,
          participants: [prev.playerName, ...members],
          content: `[Alliance Meeting] ${content || 'discussion'}`,
          tone,
          source: 'player' as const,
        };

        // Bump alliance activity timestamp
        const updatedAlliances = prev.alliances.map(a =>
          a.id === alliance.id ? { ...a, lastActivity: prev.currentDay } : a
        );

        if (prev.debugMode) {
          debugLog('[AllianceMeeting] relationship deltas', {
            alliance: alliance.name || alliance.id,
            members,
            tone: toneUsed,
            proposedTarget,
            deltas: meetingDeltas,
          });
        }

        return {
          ...prev,
          contestants: updatedContestants,
          alliances: updatedAlliances,
          dailyActionCount: (prev.dailyActionCount || 0) + 1,
          lastActionType: 'alliance_meeting',
          lastActionTarget: alliance.name || 'Alliance',
          interactionLog: [...(prev.interactionLog || []), interactionEntry],
        };
      });
      return;
    }

  }, []);

  const submitConfessional = useCallback(() => {
    // Simplified confessional submission
    debugLog('Confessional submitted');
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
      debugLog('proceedToJuryVote constructed finalists:', Array.from(finalists));
      debugLog('proceedToJuryVote juryMembers:', juryMembers);

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

      const finaleCutscene = buildFinaleCutscene({ ...prev, contestants: updatedContestants } as GameState);

      return {
        ...prev,
        contestants: updatedContestants,
        juryMembers: updatedJuryMembers,
        currentCutscene: finaleCutscene,
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
        debugForceFinal3TieBreak: false, // default off
      };
    });
  }, []);

  // Debug helper: set up Final 3 and jump directly to tie-break selection UI
  const setupFinal3TieBreak = useCallback(() => {
    setGameState(prev => {
      const contestants = [...prev.contestants];

      // Ensure player + two others are active (reuse setup logic)
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
        // Signal Final3VoteScreen to skip directly to tie-break selection
        debugForceFinal3TieBreak: true,
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

      // Update relationship graph based on how the house voted
      if (votingResult.eliminated) {
        relationshipGraphEngine.updateVotingRelationships(
          votingResult.votes,
          votingResult.eliminated,
          prev.currentDay
        );
      }
      
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

      // Update relationship graph based on this critical Final 3 vote
      if (votingResult.eliminated) {
        relationshipGraphEngine.updateVotingRelationships(
          votingResult.votes,
          votingResult.eliminated,
          prev.currentDay
        );
      }
      
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
      
      const goingFinale = remainingCount === 2;
      const finaleCutscene = goingFinale ? buildFinaleCutscene({ ...prev, contestants: updatedContestants } as GameState) : undefined;

      return {
        ...prev,
        contestants: updatedContestants,
        juryMembers: updatedJuryMembers,
        votingHistory: [...prev.votingHistory, votingResult],
        gamePhase: goingFinale ? 'cutscene' as const : 'elimination',
        currentCutscene: finaleCutscene || prev.currentCutscene,
        isPlayerEliminated: votingResult.eliminated === prev.playerName || prev.isPlayerEliminated,
      };
    });
  }, []);

  const respondToForcedConversation = useCallback((from: string, content: string, tone: string) => {
    setGameState(prev => {
      const targetNPC = prev.contestants.find(c => c.name === from);
      if (!targetNPC || !prev.playerName) {
        console.warn('Forced conversation target not found or playerName missing', from);
        return {
          ...prev,
          forcedConversationsQueue: (prev.forcedConversationsQueue || []).slice(1),
        };
      }

      const toneUsed = (tone || 'neutral').toLowerCase();
      const trustDelta = getTrustDelta(toneUsed, targetNPC.psychProfile.disposition);
      const suspicionDelta = getSuspicionDelta(toneUsed, content || '');

      const updatedContestants = prev.contestants.map(c => {
        if (c.name !== from) return c;

        const newTrustLevel = Math.max(-100, Math.min(100, c.psychProfile.trustLevel + trustDelta));
        const newSuspicionLevel = Math.max(0, Math.min(100, c.psychProfile.suspicionLevel + suspicionDelta));

        const memory = {
          day: prev.currentDay,
          type: 'conversation' as const,
          participants: [prev.playerName, from],
          content: `[Forced pull-aside] ${content || 'You responded in the moment.'}`,
          emotionalImpact: Math.max(-10, Math.min(10, Math.floor(trustDelta / 5))),
          timestamp: Date.now(),
        };

        return {
          ...c,
          psychProfile: {
            ...c.psychProfile,
            trustLevel: newTrustLevel,
            suspicionLevel: newSuspicionLevel,
          },
          memory: [...c.memory, memory],
        };
      });

      // Mirror forced pull-asides into the relationship graph so jury/voting can see them
      relationshipGraphEngine.updateRelationship(
        prev.playerName,
        from,
        trustDelta,
        suspicionDelta,
        0,
        'conversation',
        '[Forced pull-aside] player reply',
        prev.currentDay
      );

      const take: ReactionTake =
        trustDelta > 0 && suspicionDelta <= 0
          ? 'positive'
          : trustDelta < 0 && suspicionDelta > 0
          ? 'pushback'
          : suspicionDelta > 0
          ? 'suspicious'
          : 'neutral';

      const reactionSummary: ReactionSummary = {
        take,
        context: 'private',
        notes: 'They pulled you aside and you responded directly.',
        deltas: {
          trust: trustDelta,
          suspicion: suspicionDelta,
          influence: 1,
          entertainment: 1,
        },
      };

      const ratingRes = ratingsEngine.applyReaction(prev, reactionSummary);
      const nextHistory = [
        ...(prev.ratingsHistory || []),
        {
          day: prev.currentDay,
          rating: Math.round(ratingRes.rating * 100) / 100,
          reason: ratingRes.reason,
        },
      ];

      const nextQueue = (prev.forcedConversationsQueue || []).slice(1);

      const interactionEntry: InteractionLogEntry = {
        day: prev.currentDay,
        type: 'talk',
        participants: [prev.playerName, from],
        content: `[Forced conversation reply] ${content || '(no text provided)'}`,
        tone,
        source: 'player',
      };

      return {
        ...prev,
        contestants: updatedContestants,
        forcedConversationsQueue: nextQueue,
        lastActionType: 'talk',
        lastActionTarget: from,
        lastAIReaction: reactionSummary,
        interactionLog: [...(prev.interactionLog || []), interactionEntry],
        viewerRating: ratingRes.rating,
        ratingsHistory: nextHistory,
      };
    });
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

  // Initialize missing AI settings with sensible defaults (e.g., enable local LLM)
  useEffect(() => {
    setGameState(prev => {
      if (prev.aiSettings && typeof prev.aiSettings.useLocalLLM === 'undefined') {
        return { ...prev, aiSettings: { ...prev.aiSettings, useLocalLLM: true } };
      }
      return prev;
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
    setGameState(prev => {
      const hasArc = prev.twistNarrative && prev.twistNarrative.arc && prev.twistNarrative.arc !== 'none';
      if (hasArc) {
        const cutscene = buildTwistIntroCutscene(prev);
        return {
          ...prev,
          gamePhase: 'cutscene' as const,
          currentCutscene: cutscene,
        };
      }
      return {
        ...prev,
        gamePhase: 'houseguests_roster' as const
      };
    });
  }, []);

  const completeRoster = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gamePhase: 'daily' as const
    }));
  }, []);

  const completeCutscene = useCallback(() => {
    setGameState(prev => {
      const type = prev.currentCutscene?.type;
      let nextPhase: GameState['gamePhase'] = 'daily';
      if (type === 'twist_intro') nextPhase = 'houseguests_roster';
      else if (type === 'finale_twist') nextPhase = 'finale';

      // If we just showed a mid-game narrative beat, mark it completed to allow the next beat to activate later
      let nextTwistNarrative = prev.twistNarrative;
      if (type === 'mid_game' && prev.twistNarrative?.currentBeatId) {
        const currentId = prev.twistNarrative.currentBeatId;
        const updatedBeats = (prev.twistNarrative.beats || []).map(b =>
          b.id === currentId ? { ...b, status: 'completed' as const } : b
        );
        nextTwistNarrative = { ...prev.twistNarrative, beats: updatedBeats, currentBeatId: undefined };
      }

      let nextState: GameState = {
        ...prev,
        currentCutscene: undefined,
        gamePhase: nextPhase,
        twistNarrative: nextTwistNarrative,
      };

      // Sync key twist state to the scripted story moments
      if (type === 'mid_game' && prev.twistNarrative?.currentBeatId && prev.twistNarrative.arc !== 'none') {
        const beatId = prev.twistNarrative.currentBeatId;
        const arc = prev.twistNarrative.arc;

        // When the Host's Child live reveal episode plays, mark the secret as revealed in state.
        if (arc === 'hosts_child' && beatId === 'hc_immediate_fallout') {
          nextState = revealHostChild(nextState, nextState.playerName);
        }

        // When the Planted Houseguest exposure episode airs, mark the secret as revealed if it wasn't already.
        if (arc === 'planted_houseguest' && beatId === 'phg_exposed') {
          const player = nextState.contestants.find(c => c.name === nextState.playerName);
          if (player && player.special && player.special.kind === 'planted_houseguest') {
            const updatedContestants = nextState.contestants.map(c => {
              if (c.name !== nextState.playerName) return c;
              const spec: any = c.special;
              if (spec.secretRevealed) return c;
              return {
                ...c,
                special: {
                  ...spec,
                  secretRevealed: true,
                  revealDay: nextState.currentDay,
                },
              };
            });
            nextState = { ...nextState, contestants: updatedContestants };
          }
        }
      }

      return nextState;
    });
  }, []);

  const openRoster = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gamePhase: 'houseguests_roster' as const
    }));
  }, []);

  // Finalize character creation: build cast and proceed to premiere
  const finalizeCharacterCreation = useCallback((player: Contestant) => {
    setGameState(prev => {
      const playerName = player.name || prev.playerName || 'You';
      const npcs = generateStaticNPCs({ count: 15, excludeNames: [playerName] });
      const sanitizedNPCs = npcs.map(c => ({ ...c, special: { kind: 'none' as const } }));
      const contestants: Contestant[] = [{ ...player }, ...sanitizedNPCs];

      const reactionProfiles: any = {};
      contestants.forEach(c => {
        reactionProfiles[c.id] = getReactionProfileForNPC(c);
        reactionProfiles[c.name] = reactionProfiles[c.id];
      });

      // Initialize global systems that depend on the cast
      memoryEngine.resetMemory();
      memoryEngine.initializeJournals(contestants);
      relationshipGraphEngine.initializeRelationships(contestants);

      const baseState = {
        ...prev,
        playerName,
        contestants,
        reactionProfiles,
        gamePhase: 'premiere' as const,
      } as GameState;

      return {
        ...baseState,
        twistNarrative: initializeTwistNarrative(baseState),
      };
    });
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
    debugLog('=== continueFromElimination called ===');
    console.log('forcePlayerElimination:', forcePlayerElimination);
    
    setGameState(prev => {
      const remainingCount = prev.contestants.filter(c => !c.isEliminated).length;
      const playerEliminated = forcePlayerElimination || prev.contestants.find(c => c.name === prev.playerName)?.isEliminated;
      
      debugLog('continueFromElimination - Remaining contestants:', remainingCount);
      debugLog('continueFromElimination - Player eliminated?', playerEliminated);
      debugLog('continueFromElimination - Current phase:', prev.gamePhase);
      debugLog('continueFromElimination - Current jury members:', prev.juryMembers);
      debugLog('continueFromElimination - Player name:', prev.playerName);
      
      // If player was eliminated during jury phase, simulate eliminations down to final 2
      const isJuryPhase = prev.juryMembers && prev.juryMembers.length > 0;
      if (playerEliminated && isJuryPhase) {
        debugLog('continueFromElimination - Player eliminated during jury, simulating eliminations to final 2');

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

          debugLog(`Simulated elimination: ${eliminationTarget.name}`);
        }

        return {
          ...prev,
          contestants: updatedContestants,
          juryMembers: updatedJuryMembers,
          isPlayerEliminated: true,
          gamePhase: 'finale' as const
        };
      }

      // If the player is eliminated before jury starts, end their season with a recap
      if (playerEliminated && !isJuryPhase) {
        debugLog('continueFromElimination - Player eliminated pre-jury, ending season with recap');
        const afpRanking = prev.afpRanking && prev.afpRanking.length > 0
          ? prev.afpRanking
          : calculateAFPRanking(prev, prev.afpVote);
        return {
          ...prev,
          isPlayerEliminated: true,
          gamePhase: 'post_season' as const,
          gameWinner: prev.gameWinner || 'Unknown',
          finalJuryVotes: prev.finalJuryVotes || {},
          juryRationales: prev.juryRationales,
          afpRanking,
        };
      }
      
      // If we're down to final 3, go to final 3 vote (only if player is still active)
      if (remainingCount === 3) {
        const playerStillActive = !playerEliminated;
        if (playerStillActive) {
          debugLog('continueFromElimination - Going to final_3_vote');
          return {
            ...prev,
            gamePhase: 'final_3_vote' as const
          };
        }
      }
      
      // If we're down to final 2, go to finale via arc cutscene
      if (remainingCount === 2) {
        const finaleCutscene = buildFinaleCutscene(prev as GameState);
        return {
          ...prev,
          currentCutscene: finaleCutscene,
          gamePhase: 'cutscene' as const
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
            case 'romance':
              if (choice === 'pacifist') {
                trustDelta = 4;
                suspicionDelta = -2;
              } else {
                trustDelta = 8;
                suspicionDelta = 4;
              }
              break;
            case 'rumor_spread':
              if (choice === 'pacifist') {
                trustDelta = 3;
                suspicionDelta = -6;
              } else {
                trustDelta = -8;
                suspicionDelta = 10;
              }
              break;
            case 'power_shift':
              if (choice === 'pacifist') {
                trustDelta = 5;
                suspicionDelta = -3;
              } else {
                trustDelta = -3;
                suspicionDelta = 8;
              }
              break;
            case 'alliance_crisis':
              if (choice === 'pacifist') {
                trustDelta = 8;
                suspicionDelta = -4;
              } else {
                trustDelta = -12;
                suspicionDelta = 15;
              }
              break;
            case 'strategy_leak':
              if (choice === 'pacifist') {
                trustDelta = -3;
                suspicionDelta = 5;
              } else {
                trustDelta = -10;
                suspicionDelta = 15;
              }
              break;
            case 'vote_chaos':
              if (choice === 'pacifist') {
                trustDelta = 3;
                suspicionDelta = -2;
              } else {
                trustDelta = -6;
                suspicionDelta = 12;
              }
              break;
            case 'social_drama':
              if (choice === 'pacifist') {
                trustDelta = 6;
                suspicionDelta = -4;
              } else {
                trustDelta = -10;
                suspicionDelta = 8;
              }
              break;
            case 'trust_shift':
              if (choice === 'pacifist') {
                trustDelta = 4;
                suspicionDelta = -5;
              } else {
                trustDelta = -6;
                suspicionDelta = 8;
              }
              break;
            case 'competition_twist':
              // Structural twist – mostly edit/ratings impact, little direct relationship change
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

        // Prevent self-targeting unless the choice explicitly targets Self
        if (target === prev.playerName && choice.targetType !== 'Self') {
          return {
            ...prev,
            lastAIReaction: {
              take: 'neutral',
              context: interaction === 'dm' ? 'private' : interaction === 'scheme' ? 'scheme' : interaction === 'activity' ? 'activity' : 'public',
              notes: 'You cannot target yourself with this choice. Select Target Type "Self" if you want to monologue.',
              deltas: { trust: 0, suspicion: 0, influence: 0, entertainment: 0 }
            }
          };
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

        // Mirror tag outcomes into the global relationship graph so voting/strategy systems see them
        if (prev.playerName && (trustPts !== 0 || suspPts !== 0)) {
          relationshipGraphEngine.updateRelationship(
            target,
            prev.playerName,
            trustPts,
            suspPts,
            0,
            interaction === 'scheme' ? 'scheme' : 'conversation',
            `[TAG] ${choice.choiceId}`,
            prev.currentDay
          );
        }

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

        // If probing for info with an ally or trusted NPC, surface actual intel via the trading engine
        if (choice.intent === 'ProbeForInfo') {
          const inAlliance = prev.alliances.some(a => a.members.includes(target) && a.members.includes(prev.playerName));
          const trusted = (refreshedTarget?.psychProfile.trustLevel || 0) > 40;
          if (inAlliance || trusted) {
            InformationTradingEngine.shareInformation(
              target,
              prev.playerName,
              prev,
              interaction === 'dm' ? 'dm' : 'conversation'
            );
          }
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

  // House Meeting round progress
  const handleHouseMeetingChoice = useCallback((choice: HouseMeetingToneChoice) => {
    setGameState(prev => {
      const hm = prev.ongoingHouseMeeting;
      if (!hm) return prev;

      const { updatedState, deltas, reaction, allianceExposureBoost } = houseMeetingEngine.applyChoice(hm, choice, prev);

      // Apply deltas across participants
      const updatedContestants = prev.contestants.map(c => {
        if (c.isEliminated) return c;
        const d = deltas[c.name];
        if (!d) return c;
        const newTrust = Math.max(-100, Math.min(100, c.psychProfile.trustLevel + (d.trust || 0)));
        const newSusp = Math.max(0, Math.min(100, c.psychProfile.suspicionLevel + (d.suspicion || 0)));
        const newClose = Math.max(0, Math.min(100, c.psychProfile.emotionalCloseness + (d.closeness || 0)));

        const newMemory = {
          day: prev.currentDay,
          type: 'event' as const,
          participants: updatedState.participants,
          content: `House Meeting (${updatedState.topic}): ${prev.playerName} responded with ${choice}`,
          emotionalImpact: Math.max(-10, Math.min(10, Math.floor(((d.trust || 0) - (d.suspicion || 0)) / 5))),
          timestamp: Date.now(),
          tags: ['meeting'],
        };

        return {
          ...c,
          psychProfile: {
            ...c.psychProfile,
            trustLevel: newTrust,
            suspicionLevel: newSusp,
            emotionalCloseness: newClose,
          },
          memory: [...c.memory, newMemory],
        };
      });

      // Alliance exposure shifts
      let updatedAlliances = prev.alliances.map(a => ({ ...a }));
      if (allianceExposureBoost && allianceExposureBoost.length > 0) {
        updatedAlliances = updatedAlliances.map(a => {
          const boost = allianceExposureBoost.find(b => b.allianceId === a.id);
          if (!boost) return a;
          return { ...a, exposureRisk: Math.max(0, Math.min(100, (a.exposureRisk || 20) + boost.delta)) };
        });
      }

      // Nudge edit perception and ratings based on reaction
      const ent = reaction?.deltas?.entertainment || 0;
      const infl = reaction?.deltas?.influence || 0;
      const updatedEditPerception = {
        ...prev.editPerception,
        screenTimeIndex: Math.max(0, Math.min(100, (prev.editPerception.screenTimeIndex || 0) + ent)),
        lastEditShift: ent,
        audienceApproval: Math.max(-100, Math.min(100, (prev.editPerception.audienceApproval || 0) + Math.round(infl / 2))),
      };

      const ratingRes = ratingsEngine.applyReaction(prev, reaction);
      const nextHistory = [
        ...(prev.ratingsHistory || []),
        { day: prev.currentDay, rating: Math.round(ratingRes.rating * 100) / 100, reason: reaction?.notes || 'House Meeting choice' },
      ];

      const newState: GameState = {
        ...prev,
        contestants: updatedContestants,
        alliances: updatedAlliances,
        ongoingHouseMeeting: updatedState,
        lastAIReaction: reaction,
        editPerception: updatedEditPerception,
        interactionLog: [
          ...(prev.interactionLog || []),
          {
            day: prev.currentDay,
            type: 'activity',
            participants: [prev.playerName, 'Group'],
            content: `House Meeting: ${updatedState.topic} - choice=${choice}`,
            source: 'player' as const,
          },
        ],
        viewerRating: ratingRes.rating,
        ratingsHistory: nextHistory,
      };

      return newState;
    });
  }, []);

  const endHouseMeeting = useCallback(() => {
    setGameState(prev => {
      const hm = prev.ongoingHouseMeeting;
      if (!hm) return prev;

      // Summary memory
      const summaryText = `House Meeting concluded (${hm.topic}). Rounds: ${hm.currentRound}/${hm.maxRounds}.`;
      const updatedContestants = prev.contestants.map(c => {
        if (c.isEliminated) return c;
        const mem = {
          day: prev.currentDay,
          type: 'event' as const,
          participants: hm.participants,
          content: summaryText,
          emotionalImpact: 1,
          timestamp: Date.now(),
          tags: ['meeting'],
        };
        return { ...c, memory: [...c.memory, mem] };
      });

      return {
        ...prev,
        contestants: updatedContestants,
        ongoingHouseMeeting: undefined,
        lastHouseMeetingReaction: prev.lastAIReaction,
      };
    });
  }, []);

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
      // Safety: if eliminated is missing, infer it from winners among current active Final 3
      const activeFinalThree = prev.contestants.filter(c => !c.isEliminated);
      const winnersSet = new Set<string>([winner1, winner2]);
      let eliminatedName = eliminated;
      if (!eliminatedName) {
        eliminatedName = activeFinalThree.find(c => !winnersSet.has(c.name))?.name || eliminated;
      }

      // Enforce exactly two finalists: winners advance, the third is eliminated, everyone else stays eliminated
      const updatedContestants = prev.contestants.map(c => {
        if (winnersSet.has(c.name)) {
          // Winners must be active finalists
          return { ...c, isEliminated: false, eliminationDay: undefined };
        }
        if (c.name === eliminatedName) {
          // Tie-break loser is eliminated
          return { ...c, isEliminated: true, eliminationDay: prev.currentDay };
        }
        // Anyone outside the Final 3 remains eliminated; if somehow active, eliminate now to guarantee Final 2
        return c.isEliminated ? c : { ...c, isEliminated: true, eliminationDay: prev.currentDay };
      });

      // Build jury list (up to 7 most recent eliminated, including the tie-break loser)
      let updatedJuryMembers = (prev.juryMembers || []).slice();
      if (eliminatedName && !updatedJuryMembers.includes(eliminatedName)) {
        updatedJuryMembers.push(eliminatedName);
      }
      updatedJuryMembers = updatedContestants
        .filter(c => c.isEliminated)
        .sort((a, b) => (b.eliminationDay || prev.currentDay) - (a.eliminationDay || prev.currentDay))
        .slice(0, 7)
        .map(c => c.name);

      // Record tie-break result in voting history (replace the last record if present)
      const tieBreakRecord = {
        day: prev.currentDay,
        eliminated: eliminatedName,
        votes: { [winner1]: 'n/a', [winner2]: 'n/a', [eliminatedName]: 'n/a' },
        playerVote: prev.votingHistory[prev.votingHistory.length - 1]?.playerVote,
        reason: method
          ? `${eliminatedName} lost Final 3 tie-break (${method.replace('_', ' ')})`
          : `${eliminatedName} lost Final 3 tie-break challenge`,
        tieBreak: {
          tied: [winner1, winner2, eliminatedName],
          method: method ? (method as 'revote' | 'sudden_death') : 'sudden_death',
          suddenDeathWinner: winner1,
          suddenDeathLoser: eliminatedName,
          log: [
            `Final 3 tie resolved via ${method || 'challenge'}`,
            `${winner1} and ${winner2} advance to finale`
          ],
          revote: undefined
        }
      };

      const nextState: GameState = {
        ...prev,
        contestants: updatedContestants,
        juryMembers: updatedJuryMembers,
        isPlayerEliminated: eliminatedName === prev.playerName || prev.isPlayerEliminated,
        final3TieBreak: {
          day: prev.currentDay,
          method: method || 'challenge',
          results,
          eliminated: eliminatedName,
          winners: [winner1, winner2],
          selectionReason,
        },
        votingHistory: [...prev.votingHistory.slice(0, -1), tieBreakRecord],
        currentCutscene: undefined,
        gamePhase: 'cutscene' as const,
      };

      // Build finale cutscene from the enforced Final 2 state
      nextState.currentCutscene = buildFinaleCutscene(nextState as GameState);

      // Debug logs
      const finalTwoNames = nextState.contestants.filter(c => !c.isEliminated).map(c => c.name);
      debugLog('handleTieBreakResult -> Final Two:', finalTwoNames);
      debugLog('handleTieBreakResult -> Eliminated:', eliminatedName);

      return nextState;
    });
  }, []);

  // Manual Save/Load/Delete API
  const saveGame = useCallback(() => {
    try {
      localStorage.setItem('rtv_game_state', JSON.stringify(gameState));
      debugLog('Game saved manually.');
    } catch (e) {
      debugWarn('Failed to save game state', e);
    }
  }, [gameState]);

  const loadSavedGame = useCallback(() => {
    try {
      const raw = localStorage.getItem('rtv_game_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        setGameState(parsed as GameState);
        debugLog('Loaded saved game.');
      }
    } catch (e) {
      debugWarn('Failed to load saved game state', e);
    }
  }, []);

  const deleteSavedGame = useCallback(() => {
    try {
      localStorage.removeItem('rtv_game_state');
      debugLog('Deleted saved game.');
    } catch (e) {
      debugWarn('Failed to delete saved game state', e);
    }
  }, []);

  

  // Listen for planted contract decision (reveal or keep secret)
  useEffect(() => {
    const handler = (e: any) => {
      const { reveal } = e.detail || {};
      setGameState(prev => {
        const next = finalizePlantedContract(prev, !!reveal);
        return {
          ...next,
          gamePhase: 'daily' as const, // remain in daily; banner will disappear
        };
      });
    };
    window.addEventListener('plantedContractDecision', handler);
    return () => window.removeEventListener('plantedContractDecision', handler);
  }, []);

  // New: listen for cutscene choices (generic branching)
  // If televised, apply a light edit impact and append to ratings history.
  useEffect(() => {
    const handler = (e: any) => {
      const { choiceId, text, televised, editDelta } = e.detail || {};
      setGameState(prev => {
        const applyDelta = typeof editDelta === 'number' ? editDelta : (televised ? 3 : 0);
        const nextEdit = televised
          ? {
              ...prev.editPerception,
              screenTimeIndex: Math.max(0, Math.min(100, (prev.editPerception.screenTimeIndex || 0) + Math.max(1, Math.abs(applyDelta)))),
              audienceApproval: Math.max(-100, Math.min(100, (prev.editPerception.audienceApproval || 0) + Math.round(applyDelta / 2))),
              lastEditShift: applyDelta,
            }
          : prev.editPerception;

        const ratingRes = televised ? ratingsEngine.applyEmergent(prev, applyDelta, 'Televised Branch') : { rating: prev.viewerRating ?? ratingsEngine.getInitial(), reason: 'off-camera branch' };
        const nextHistory = televised
          ? [ ...(prev.ratingsHistory || []), { day: prev.currentDay, rating: Math.round(ratingRes.rating * 100) / 100, reason: ratingRes.reason } ]
          : (prev.ratingsHistory || []);

        const interactionEntry = {
          day: prev.currentDay,
          type: 'system' as const,
          participants: [prev.playerName],
          content: `Cutscene choice: ${text || choiceId}`,
          source: 'system' as const,
        };

        return {
          ...prev,
          editPerception: nextEdit,
          viewerRating: ratingRes.rating,
          ratingsHistory: nextHistory,
          interactionLog: [ ...(prev.interactionLog || []), interactionEntry ],
        };
      });
    };
    window.addEventListener('cutsceneChoice', handler);
    return () => window.removeEventListener('cutsceneChoice', handler);
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

  // Watchdog: if the player has been eliminated, never drop them back into daily gameplay.
  useEffect(() => {
    if (gameState.isPlayerEliminated && gameState.gamePhase === 'daily') {
      console.warn('Phase watchdog: Player is eliminated; redirecting to post-season recap');
      setGameState(prev => ({
        ...prev,
        gamePhase: 'post_season' as const,
      }));
    }
  }, [gameState.isPlayerEliminated, gameState.gamePhase]);

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
    completeRoster,
    openRoster,
    endGame,
    continueFromElimination,
    continueFromWeeklyRecap,
    createAlliance,
    resetGame,
    handleEmergentEventChoice,
    tagTalk,
    handleHouseMeetingChoice,
    endHouseMeeting,
    handleTieBreakResult,
    proceedToJuryVote,
    // New debug/test helpers
    proceedToFinaleAsJuror,
    proceedToJuryVoteAsJuror,
    setupFinal3,
    setupFinal3TieBreak,
    // Save/Load
    loadSavedGame,
    saveGame,
    deleteSavedGame,
    hasSavedGame,
    goToTitle,
    toggleDebugMode,
    // Character creation finalize
    finalizeCharacterCreation,
    // Cutscene
    completeCutscene,
  };
};
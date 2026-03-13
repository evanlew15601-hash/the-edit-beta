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
import { generateNPCConfessionalsForDay } from '@/utils/npcConfessionalEngine';
import { getTrustDelta, getSuspicionDelta, calculateSchemeSuccess } from '@/utils/actionEngine';
import { TwistEngine } from '@/utils/twistEngine';
import { speechActClassifier } from '@/utils/speechActClassifier';
import { EnhancedNPCMemorySystem } from '@/utils/enhancedNPCMemorySystem';
import { getReactionProfileForNPC } from '@/utils/tagDialogueEngine';
import { TAG_CHOICES } from '@/data/tagChoices';
import { evaluateChoice, reactionText, getCooldownKey } from '@/utils/tagDialogueEngine';
import { ConfessionalEngine } from '@/utils/confessionalEngine';
import { ratingsEngine } from '@/utils/ratingsEngine';
import { applyDailySpecialBackgroundLogic, revealHostChild, finalizePlantedContract } from '@/utils/specialBackgrounds';
import { applyDailyNarrative, initializeTwistNarrative } from '@/utils/twistNarrativeEngine';
import { buildTwistIntroCutscene, buildMidGameCutscene, buildTwistResultCutscene, buildFinaleCutscene, buildImmunityRetiredCutscene } from '@/utils/twistCutsceneBuilder';
import { AIVotingStrategy } from '@/utils/aiVotingStrategy';
import { conversationIntentEngine } from '@/utils/conversationIntentEngine';
import { getCurrentWeek, getWeekBounds, verifyAndUpdateTasks } from '@/utils/taskEngine';
import { BackgroundConversationEngine } from '@/utils/backgroundConversationEngine';
import { computeWeeklyEpisodeRating } from '@/utils/audienceEpisodeRating';
import { logInteractionToCloud } from '@/utils/interactionLogger';

type GameActionType =
  PlayerAction['type']
  | 'create_alliance'
  | 'add_alliance_members'
  | 'house_meeting'
  | 'alliance_meeting';

const betaDebugEnabled = () => {
  return import.meta.env.VITE_ENABLE_BETA_DEBUG === '1';
};

const isDebugEnv = () => {
  if (import.meta.env.MODE !== 'production') return true;
  if (!betaDebugEnabled()) return false;
  if (typeof window === 'undefined') return false;
  return !!(window as any).__RTV_DEBUG__;
};

const debugLog = (...args: any[]) => {
  if (isDebugEnv()) console.log(...args);
};

const debugWarn = (...args: any[]) => {
  if (isDebugEnv()) console.warn(...args);
};

const defaultDebugMode = import.meta.env.MODE !== 'production' || betaDebugEnabled();

function verifyAndUpdateTasksWithMissionCutscene(prev: GameState, baseNext: GameState): GameState {
  const updated = verifyAndUpdateTasks(baseNext);

  const prevPlayer = prev.contestants.find(c => c.name === prev.playerName);
  const nextPlayer = updated.contestants.find(c => c.name === updated.playerName);

  const prevSpec = prevPlayer?.special && prevPlayer.special.kind === 'planted_houseguest' ? prevPlayer.special : undefined;
  const nextSpec = nextPlayer?.special && nextPlayer.special.kind === 'planted_houseguest' ? nextPlayer.special : undefined;

  if (!prevSpec || !nextSpec) return updated;
  if (updated.gamePhase === 'cutscene' || updated.currentCutscene) return updated;

  const prevTasks = prevSpec.tasks || [];
  const nextTasks = nextSpec.tasks || [];

  const newlyCompleted = nextTasks.find(t => {
    if (!t.completed) return false;
    const prevTask = prevTasks.find(p => p.id === t.id);
    return !prevTask?.completed;
  });

  if (!newlyCompleted) return updated;

  const nextCutscene = buildTwistResultCutscene(updated, 'success', { taskId: newlyCompleted.id });

  return {
    ...updated,
    currentCutscene: nextCutscene,
    gamePhase: 'cutscene' as const,
    missionBroadcastBanner: {
      day: updated.currentDay,
      result: 'success',
      taskId: newlyCompleted.id,
      description: newlyCompleted.description,
    },
  };
}

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
      debugMode: defaultDebugMode,
    } as GameState;
  });

  // Keep a ref to always access the latest gameState in async callbacks
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Allow beta builds to emit debug logs when debugMode is enabled.
  // This is consumed by debugLog/debugWarn via window.__RTV_DEBUG__.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).__RTV_DEBUG__ = !!gameState.debugMode;
  }, [gameState.debugMode]);

  const startGame = useCallback((playerName?: string) => {
    debugLog('Starting game, proceeding to character creation.', playerName ? `Provided name (ignored here): ${playerName}` : '');

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
      debugMode: defaultDebugMode,
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
      let narrativeApplied = applyDailyNarrative({
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
          // If a prior week's mission is still incomplete after a small grace window, treat it as failed.
          const GRACE_DAYS = 2;
          const currentWeek = getCurrentWeek(newDay);
          const activeTwists = narrativeApplied.twistsActivated || prev.twistsActivated || [];

          const candidate = nextTasks
            .filter((t: any) => {
              if (t.completed) return false;
              const taskWeek = t.week ?? getCurrentWeek(t.dayAssigned);
              return taskWeek < currentWeek;
            })
            .sort((a: any, b: any) => (b.week ?? 0) - (a.week ?? 0))[0];

          if (candidate) {
            const taskWeek = candidate.week ?? getCurrentWeek(candidate.dayAssigned);
            const { end } = getWeekBounds(taskWeek);
            const failureDay = end + GRACE_DAYS;
            const failureFlag = `planted_mission_failed_w${taskWeek}`;

            // Allow a full grace window (e.g., week ends on day 7, grace days = 2 => fail starting day 10).
            if (newDay > failureDay && !activeTwists.includes(failureFlag)) {
              nextCutscene = buildTwistResultCutscene(
                narrativeApplied as GameState,
                'failure',
                { taskId: candidate.id },
              );
              missionBanner = {
                day: newDay,
                result: 'failure',
                taskId: candidate.id,
                description: candidate.description,
              };

              // Hard mechanic: failure airs on TV and hits immediately.
              // - Spike player suspicion
              // - Nudge house relationships against the player
              // - Set a twist flag for debug / recap surfacing
              const playerName = narrativeApplied.playerName;
              const updatedContestants = narrativeApplied.contestants.map(c => {
                if (c.name !== playerName) return c;
                return {
                  ...c,
                  psychProfile: {
                    ...c.psychProfile,
                    suspicionLevel: Math.min(100, c.psychProfile.suspicionLevel + 18),
                    trustLevel: Math.max(-100, c.psychProfile.trustLevel - 4),
                  },
                };
              });

              updatedContestants
                .filter(c => !c.isEliminated && c.name !== playerName)
                .forEach(c => {
                  relationshipGraphEngine.updateRelationship(
                    c.name,
                    playerName,
                    -6,
                    10,
                    -2,
                    'event',
                    `[Production] Mission failure aired: ${candidate.id}`,
                    newDay
                  );
                });

              const updatedTwists = Array.from(new Set([...(activeTwists || []), failureFlag]));
              narrativeApplied = { ...narrativeApplied, contestants: updatedContestants, twistsActivated: updatedTwists };
            }
          }
        }
      }

      // Detect newly activated narrative beat to trigger a lite mid-game cutscene,
      // but only if a mission result cutscene isn't already queued.
      const newBeatId = narrativeApplied.twistNarrative?.currentBeatId;
      if (!nextCutscene && newBeatId) {
        const beat = narrativeApplied.twistNarrative!.beats.find(b => b.id === newBeatId);
        if (beat && beat.status === 'active') {
          nextCutscene = buildMidGameCutscene(narrativeApplied as GameState, beat);
        }
      }
      
      // Emergent events are now handled by the EnhancedEmergentEvents component
      // No need for manual triggering here as the component manages its own generation
      
      // Trigger minimal automatic information sharing (reduced frequency)
      if (newDay % 3 === 0) { // Only every 3 days
        InformationTradingEngine.autoGenerateIntelligence(tempState);
      }

      // Use the most up-to-date contestants after special + narrative systems (tasks, reveals, etc.)
      const baseContestants = narrativeApplied.contestants;

      // Also gently decay the global relationship graph so extreme trust/suspicion softens between interactions
      relationshipGraphEngine.decayRelationships(newDay);

      // Apply new contextual memories (newContextualMemories is an array, not an object)
      for (const mem of newContextualMemories) {
        const contestant = baseContestants.find(c => mem.participants.includes(c.name));
        if (contestant) {
          contestant.memory = [...contestant.memory, mem];
        }
      }

      // Pull updated jury members (if any) from narrative/special logic
      const juryMembers = narrativeApplied.juryMembers || prev.juryMembers;

      // Track days until jury if configured
      const daysUntilJury = typeof prev.daysUntilJury === 'number'
        ? Math.max(0, prev.daysUntilJury - 1)
        : prev.daysUntilJury;

      // Remaining active players after narrative/special updates
      const remainingCount = baseContestants.filter(c => !c.isEliminated).length;

      // Carry forward any twist flags produced by special/narrative systems
      let twistsActivated = narrativeApplied.twistsActivated || specialApplied.twistsActivated || prev.twistsActivated || [];

      // From final 4 onward, retire weekly immunity competitions and surface it as a twist.
      const allowImmunityPhase = remainingCount > 4;
      const hadImmunityRetired = twistsActivated.includes('immunity_retired');
      if (!allowImmunityPhase && !hadImmunityRetired) {
        twistsActivated = [...twistsActivated, 'immunity_retired'];

        // Short host VO cutscene when the safety net is pulled, if nothing else is already queued.
        if (!nextCutscene) {
          nextCutscene = buildImmunityRetiredCutscene({
            ...(narrativeApplied as GameState),
            contestants: baseContestants,
            twistsActivated,
          });
        }
      }

      // Decide whether to show a cutscene, immunity competition, weekly recap, or stay in daily mode
      let gamePhase: GameState['gamePhase'] = prev.gamePhase;
      const isWeeklyRecapDay = newDay % 7 === 0;

      // On or after an elimination day, run an immunity competition first (if none set),
      // then proceed to the player vote once a winner exists.
      if (newDay >= prev.nextEliminationDay) {
        if (allowImmunityPhase && !prev.immunityWinner) {
          gamePhase = 'immunity_competition';
        } else {
          gamePhase = 'player_vote';
        }
      } else if (isWeeklyRecapDay) {
        gamePhase = 'weekly_recap';
      } else {
        gamePhase = 'daily';
      }

      // Viewer ratings:
      // - On normal days, carry the existing rating forward
      // - On weekly recap days, compute a structured episode rating and append it to history
      let nextViewerRating = prev.viewerRating ?? ratingsEngine.getInitial();
      let nextRatingsHistory = prev.ratingsHistory || [];

      if (isWeeklyRecapDay) {
        const ratingSource: GameState = {
          ...(narrativeApplied as GameState),
          currentDay: newDay,
          editPerception: prev.editPerception,
          twistsActivated,
        };

        const episode = computeWeeklyEpisodeRating(ratingSource);
        const weeklyRating = episode.rating.total;

        nextViewerRating = weeklyRating;

        const weeklyReason = 'weekly: ' + episode.narrativeReason;
        const entry = {
          day: newDay,
          rating: Math.round(weeklyRating * 100) / 100,
          reason: weeklyReason,
        };
        nextRatingsHistory = [...nextRatingsHistory, entry];
      }

      // Clear forced conversations that are too old; keep up to 2 queued
      const nextForcedQueue = (prev.forcedConversationsQueue || []).filter(fc => newDay - fc.day <= 2).slice(0, 2);

      return {
        ...prev,
        currentDay: newDay,
        dailyActionCount: 0,
        groupActionsUsedToday: 0,
        contestants: baseContestants,
        alliances: alliancesWithSecrecy,
        juryMembers,
        daysUntilJury,
        gamePhase: nextCutscene ? 'cutscene' as const : gamePhase,
        currentCutscene: nextCutscene || prev.currentCutscene,
        editPerception: prev.editPerception,
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
        twistsActivated,
        ongoingHouseMeeting: prev.ongoingHouseMeeting,
        forcedConversationsQueue: nextForcedQueue,
        playerCannotBeEliminatedUntilDay:
          typeof prev.playerCannotBeEliminatedUntilDay === 'number' &&
          newDay > prev.playerCannotBeEliminatedUntilDay
            ? undefined
            : prev.playerCannotBeEliminatedUntilDay,
        hostChildFalloutUntilDay:
          typeof prev.hostChildFalloutUntilDay === 'number' &&
          newDay > prev.hostChildFalloutUntilDay
            ? undefined
            : prev.hostChildFalloutUntilDay,
        missionBroadcastBanner: missionBanner,
      };
    });

    // After the synchronous day-advance state update, trigger background
    // NPC conversations asynchronously using the latest gameStateRef.
    (async () => {
      try {
        const stateAfterAdvance = gameStateRef.current;
        const outcomes = await BackgroundConversationEngine.generateDailyBackgroundConversations(stateAfterAdvance);
        if (outcomes && outcomes.length > 0) {
          setGameState(prev => {
            if (prev.currentDay !== stateAfterAdvance.currentDay) {
              return prev;
            }
            return BackgroundConversationEngine.applyOutcomes(prev, outcomes);
          });
        }

        // On weekly recap days, also generate a small set of NPC confessionals
        // so that recap/edit systems have in-character reasoning from key NPCs.
        if (stateAfterAdvance.currentDay % 7 === 0) {
          await generateNPCConfessionalsForDay(stateAfterAdvance);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        debugWarn('Failed to run background NPC social simulation:', e);
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

          // Hard mechanic: after the Host's Child reveal, the house scrutinizes you harder for a few days.
          if (
            typeof freshState.hostChildFalloutUntilDay === 'number' &&
            freshState.currentDay <= freshState.hostChildFalloutUntilDay
          ) {
            suspicionDelta += 4;
            relationshipGraphEngine.updateRelationship(
              target,
              (freshState.playerName || '').trim() || 'Player',
              0,
              4,
              0,
              'event',
              '[Host’s Child] Fallout scrutiny after reveal',
              freshState.currentDay
            );
          }

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

            const ratingRes = ratingsEngine.applyReaction(prev, reactionSummary);
            const nextHistory = [
              ...(prev.ratingsHistory || []),
              {
                day: prev.currentDay,
                rating: Math.round(ratingRes.rating * 100) / 100,
                reason: ratingRes.reason,
              },
            ];

            const baseNext: GameState = {
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
              viewerRating: ratingRes.rating,
              ratingsHistory: nextHistory,
            };

            return verifyAndUpdateTasksWithMissionCutscene(prev, baseNext);
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

    if (actionType === 'confessional') {
      if (!content || !tone) return;

      setGameState(prev => {
        const id = `conf_${prev.currentDay}_${Math.random().toString(36).slice(2)}`;
        const baseConf = {
          id,
          day: prev.currentDay,
          content,
          tone,
          editImpact: 0,
          selected: true,
        };

        const selected = ConfessionalEngine.selectConfessionalForEdit(baseConf as any, prev);
        const editImpact = ConfessionalEngine.calculateEditImpact(baseConf as any, prev, selected);
        const audienceScore = ConfessionalEngine.generateAudienceScore(baseConf as any, editImpact);

        const conf = {
          ...baseConf,
          selected,
          editImpact,
          audienceScore,
        };

        const editApprovalDelta = Math.max(-20, Math.min(20, Math.round((audienceScore - 50) / 4)));
        const screenDelta = selected ? Math.max(2, Math.min(14, Math.round(editImpact / 2))) : 0;

        const nextEdit = {
          ...prev.editPerception,
          screenTimeIndex: Math.max(0, Math.min(100, (prev.editPerception.screenTimeIndex || 0) + screenDelta)),
          audienceApproval: Math.max(-100, Math.min(100, (prev.editPerception.audienceApproval || 0) + editApprovalDelta)),
          lastEditShift: screenDelta,
        };

        const updatedActions = prev.playerActions.map((a) =>
          a.type === 'confessional'
            ? { ...a, used: true, usageCount: (a.usageCount || 0) + 1 }
            : a
        );

        const entry: InteractionLogEntry = {
          day: prev.currentDay,
          type: 'confessional',
          participants: [prev.playerName],
          content,
          tone,
          source: 'player',
        };

        const ratingRes = ratingsEngine.applyConfessional(prev, conf as any);
        const nextHistory = [
          ...(prev.ratingsHistory || []),
          {
            day: prev.currentDay,
            rating: Math.round(ratingRes.rating * 100) / 100,
            reason: ratingRes.reason,
          },
        ];

        // Fire-and-forget cloud logging (maps local type → supabase enum)
        void logInteractionToCloud({
          day: prev.currentDay,
          type: 'confessional',
          participants: [prev.playerName],
          playerName: prev.playerName,
          playerMessage: content,
          aiResponse: '',
          tone,
        });

        const baseNext: GameState = {
          ...prev,
          confessionals: [...(prev.confessionals || []), conf as any],
          editPerception: nextEdit,
          playerActions: updatedActions,
          dailyActionCount: (prev.dailyActionCount || 0) + 1,
          lastActionType: 'confessional',
          lastActionTarget: 'Diary Room',
          interactionLog: [...(prev.interactionLog || []), entry],
          viewerRating: ratingRes.rating,
          ratingsHistory: nextHistory,
        };

        return verifyAndUpdateTasksWithMissionCutscene(prev, baseNext);
      });

      return;
    }

    if (actionType === 'observe') {
      setGameState(prev => {
        const updatedActions = prev.playerActions.map((a) =>
          a.type === 'observe'
            ? { ...a, used: true, usageCount: (a.usageCount || 0) + 1 }
            : a
        );

        const participants = [prev.playerName, ...(target ? target.split(',').map(s => s.trim()).filter(Boolean) : [])];

        const entry: InteractionLogEntry = {
          day: prev.currentDay,
          type: 'observe',
          participants,
          content: content || '',
          tone: tone || 'neutral',
          source: 'player',
        };

        const reactionSummary: ReactionSummary = {
          take: 'curious',
          context: 'public',
          notes: content || 'You observed quietly and picked up something useful.',
          deltas: { trust: 0, suspicion: 1, influence: 2, entertainment: 1 },
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

        void logInteractionToCloud({
          day: prev.currentDay,
          type: 'observation',
          participants,
          playerName: prev.playerName,
          playerMessage: content || '',
          aiResponse: '',
          tone: tone || 'neutral',
        });

        const baseNext: GameState = {
          ...prev,
          playerActions: updatedActions,
          dailyActionCount: (prev.dailyActionCount || 0) + 1,
          lastActionType: 'observe',
          lastActionTarget: target || 'Observation',
          lastAIReaction: reactionSummary,
          interactionLog: [...(prev.interactionLog || []), entry],
          viewerRating: ratingRes.rating,
          ratingsHistory: nextHistory,
        };

        return verifyAndUpdateTasksWithMissionCutscene(prev, baseNext);
      });
      return;
    }

    if (actionType === 'activity') {
      if (!content) return;

      setGameState(prev => {
        const usedGroups = prev.groupActionsUsedToday || 0;
        if (usedGroups >= 2) return prev;

        const updatedActions = prev.playerActions.map((a) =>
          a.type === 'activity'
            ? { ...a, used: true, usageCount: (a.usageCount || 0) + 1 }
            : a
        );

        const activeNPCs = prev.contestants
          .filter(c => !c.isEliminated && c.name !== prev.playerName)
          .map(c => c.name);

        const shuffled = [...activeNPCs].sort(() => Math.random() - 0.5);
        const participants = [prev.playerName, ...shuffled.slice(0, 3)];

        // Small relationship nudges with the participants.
        participants
          .filter(n => n !== prev.playerName)
          .forEach(n => {
            const trustDelta = content === 'group_task' || content === 'workout_session' ? 2 : 1;
            const suspicionDelta = content === 'truth_or_dare' ? 2 : -1;
            relationshipGraphEngine.updateRelationship(
              n,
              prev.playerName,
              trustDelta,
              Math.max(0, suspicionDelta),
              1,
              'event',
              `[Activity] ${content}`,
              prev.currentDay
            );
          });

        const entry: InteractionLogEntry = {
          day: prev.currentDay,
          type: 'activity',
          participants,
          content,
          tone: 'neutral',
          source: 'player',
        };

        const reactionSummary: ReactionSummary = {
          take: 'positive',
          context: 'activity',
          notes: `House activity: ${content}`,
          deltas: {
            trust: 2,
            suspicion: content === 'truth_or_dare' ? 2 : 0,
            influence: content === 'cook_off' ? 2 : 1,
            entertainment: content === 'truth_or_dare' || content === 'cook_off' ? 3 : 2,
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

        void logInteractionToCloud({
          day: prev.currentDay,
          type: 'event',
          participants,
          playerName: prev.playerName,
          playerMessage: `[Activity] ${content}`,
          aiResponse: '',
          tone: 'neutral',
        });

        const baseNext: GameState = {
          ...prev,
          playerActions: updatedActions,
          dailyActionCount: (prev.dailyActionCount || 0) + 1,
          groupActionsUsedToday: usedGroups + 1,
          lastActionType: 'activity',
          lastActionTarget: 'House',
          lastAIReaction: reactionSummary,
          interactionLog: [...(prev.interactionLog || []), entry],
          viewerRating: ratingRes.rating,
          ratingsHistory: nextHistory,
        };

        return verifyAndUpdateTasksWithMissionCutscene(prev, baseNext);
      });

      return;
    }

    if (actionType === 'scheme') {
      if (!target || !content || !tone) return;

      setGameState(prev => {
        const targetNPC = prev.contestants.find(c => c.name === target);
        if (!targetNPC) return prev;

        const success = calculateSchemeSuccess(prev.playerName, targetNPC, content, tone);

        const trustDelta =
          tone === 'information_trade' ? (success ? 3 : -1) :
          tone === 'vote_manipulation' ? (success ? 1 : -3) :
          tone === 'rumor_spread' ? (success ? -1 : -4) :
          tone === 'fake_alliance' ? (success ? 0 : -6) :
          tone === 'alliance_break' ? (success ? -1 : -5) :
          (success ? 1 : -3);

        const suspicionDelta =
          tone === 'information_trade' ? (success ? 2 : 4) :
          tone === 'vote_manipulation' ? (success ? 4 : 8) :
          tone === 'rumor_spread' ? (success ? 6 : 10) :
          tone === 'fake_alliance' ? (success ? 8 : 14) :
          tone === 'alliance_break' ? (success ? 7 : 12) :
          (success ? 4 : 8);

        relationshipGraphEngine.updateRelationship(
          target,
          prev.playerName,
          trustDelta,
          suspicionDelta,
          0,
          'scheme',
          `[Scheme:${tone}] ${success ? 'Succeeded' : 'Backfired'}: ${content}`,
          prev.currentDay
        );

        const updatedActions = prev.playerActions.map((a) =>
          a.type === 'scheme'
            ? { ...a, used: true, usageCount: (a.usageCount || 0) + 1 }
            : a
        );

        const entry: InteractionLogEntry = {
          day: prev.currentDay,
          type: 'scheme',
          participants: [prev.playerName, target],
          content,
          tone,
          source: 'player',
        };

        const reactionSummary: ReactionSummary = {
          take: success ? 'positive' : 'pushback',
          context: 'scheme',
          notes: success ? 'Your scheme landed.' : 'Your scheme backfired.',
          deltas: {
            trust: trustDelta,
            suspicion: suspicionDelta,
            influence: success ? 3 : 0,
            entertainment: success ? 3 : 2,
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

        void logInteractionToCloud({
          day: prev.currentDay,
          type: 'scheme',
          participants: [prev.playerName, target],
          playerName: prev.playerName,
          playerMessage: content,
          aiResponse: '',
          tone,
        });

        const baseNext: GameState = {
          ...prev,
          playerActions: updatedActions,
          dailyActionCount: (prev.dailyActionCount || 0) + 1,
          lastActionType: 'scheme',
          lastActionTarget: target,
          lastAIReaction: reactionSummary,
          interactionLog: [...(prev.interactionLog || []), entry],
          viewerRating: ratingRes.rating,
          ratingsHistory: nextHistory,
        };

        return verifyAndUpdateTasksWithMissionCutscene(prev, baseNext);
      });

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
        const usedGroups = prev.groupActionsUsedToday || 0;
        if (usedGroups >= 2) return prev;

        const updatedActions = prev.playerActions.map(a =>
          a.type === 'house_meeting' ? { ...a, used: true, usageCount: (a.usageCount || 0) + 1 } : a
        );

        const interactionEntry: InteractionLogEntry = {
          day: prev.currentDay,
          type: 'house_meeting',
          participants,
          content: `[House Meeting] ${topic.replace('_', ' ')}`,
          tone: 'neutral',
          source: 'player',
        };

        const reactionSummary: ReactionSummary = {
          take: 'neutral',
          context: 'public',
          notes: 'You called a house meeting. Everyone clocked it.',
          deltas: { trust: 0, suspicion: 2, influence: 3, entertainment: 2 },
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

        void logInteractionToCloud({
          day: prev.currentDay,
          type: 'event',
          participants,
          playerName: prev.playerName,
          playerMessage: `[House Meeting] ${topic.replace('_', ' ')}`,
          aiResponse: '',
          tone: 'neutral',
        });

        const baseNext: GameState = {
          ...prev,
          ongoingHouseMeeting: state,
          playerActions: updatedActions,
          dailyActionCount: (prev.dailyActionCount || 0) + 1,
          groupActionsUsedToday: usedGroups + 1,
          lastActionType: 'house_meeting',
          lastActionTarget: 'Group',
          lastAIReaction: reactionSummary,
          interactionLog: [...(prev.interactionLog || []), interactionEntry],
          viewerRating: ratingRes.rating,
          ratingsHistory: nextHistory,
        };

        return verifyAndUpdateTasksWithMissionCutscene(prev, baseNext);
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

        const usedGroups = prev.groupActionsUsedToday || 0;
        if (usedGroups >= 2) return prev;

        const updatedActions = prev.playerActions.map(a =>
          a.type === 'alliance_meeting' ? { ...a, used: true, usageCount: (a.usageCount || 0) + 1 } : a
        );

        const trustTotal = meetingDeltas.reduce((sum, d) => sum + d.trustDelta, 0);
        const suspTotal = meetingDeltas.reduce((sum, d) => sum + d.suspicionDelta, 0);

        const reactionSummary: ReactionSummary = {
          take: trustTotal >= 0 ? 'positive' : 'neutral',
          context: 'private',
          notes: 'Alliance meeting held in private; subtle shifts in loyalty and suspicion.',
          deltas: {
            trust: Math.round(trustTotal / Math.max(1, meetingDeltas.length)),
            suspicion: Math.round(suspTotal / Math.max(1, meetingDeltas.length)),
            influence: 2,
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

        void logInteractionToCloud({
          day: prev.currentDay,
          type: 'event',
          participants: [prev.playerName, ...members],
          playerName: prev.playerName,
          playerMessage: `[Alliance Meeting] ${content || 'discussion'}`,
          aiResponse: '',
          tone: tone || 'strategic',
        });

        const baseNext: GameState = {
          ...prev,
          contestants: updatedContestants,
          alliances: updatedAlliances,
          playerActions: updatedActions,
          dailyActionCount: (prev.dailyActionCount || 0) + 1,
          groupActionsUsedToday: usedGroups + 1,
          lastActionType: 'alliance_meeting',
          lastActionTarget: alliance.name || 'Alliance',
          lastAIReaction: reactionSummary,
          interactionLog: [...(prev.interactionLog || []), interactionEntry],
          viewerRating: ratingRes.rating,
          ratingsHistory: nextHistory,
        };

        return verifyAndUpdateTasksWithMissionCutscene(prev, baseNext);
      });
      return;
    }

  }, []);

  const submitConfessional = useCallback((content?: string, tone?: string) => {
    if (!content || !tone) return;
    useAction('confessional', undefined, content, tone);
  }, [useAction]);

  const setImmunityWinner = useCallback((winner: string) => {
    setGameState(prev => {
      // Idempotency: if this winner is already recorded, avoid duplicating history
      if (prev.immunityWinner === winner) {
        return prev;
      }

      // Log a lightweight ratings history entry so weekly tasks can detect immunity wins.
      const baseRating = prev.viewerRating ?? ratingsEngine.getInitial();
      const immunityReason = `immunity win: ${winner}`;
      const nextHistory = [
        ...(prev.ratingsHistory || []),
        { day: prev.currentDay, rating: Math.round(baseRating * 100) / 100, reason: immunityReason },
      ];

      return {
        ...prev,
        immunityWinner: winner,
        // After an immunity competition, move directly into the eviction vote.
        gamePhase: 'player_vote' as const,
        viewerRating: baseRating,
        ratingsHistory: nextHistory,
      };
    });
  }, []);

  const submitFinaleSpeech = useCallback((speech?: string) => {
    setGameState(prev => ({
      ...prev,
      finaleSpeechesGiven: true,
      finaleSpeech: (speech || '').trim(),
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
        debugWarn('proceedToJuryVote: No non-player contestant found; unable to create proper Final 2.');
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
      const active = prev.contestants.filter(c => !c.isEliminated);
      const eligible = active
        .filter(c => c.name !== prev.playerName && c.name !== prev.immunityWinner)
        .map(c => c.name);

      if (!eligible.includes(choice)) {
        debugWarn('submitPlayerVote: invalid vote choice', {
          choice,
          eligible,
          immunityWinner: prev.immunityWinner,
          day: prev.currentDay,
        });
        return prev;
      }

      const votingResult = processVoting(
        prev.contestants,
        prev.playerName,
        prev.alliances,
        prev,
        prev.immunityWinner,
        choice // Player's vote
      );

      if (!votingResult.eliminated) {
        debugWarn('submitPlayerVote: voting engine returned no eliminated target', {
          day: prev.currentDay,
          choice,
          votes: votingResult.votes,
          reason: votingResult.reason,
        });
        return prev;
      }

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
        playerCannotBeEliminatedUntilDay:
          typeof prev.playerCannotBeEliminatedUntilDay === 'number' &&
          prev.currentDay >= prev.playerCannotBeEliminatedUntilDay
            ? undefined
            : prev.playerCannotBeEliminatedUntilDay,
      };
    });
  }, []);

  const submitFinal3Vote = useCallback((choice: string, tieBreakResult?: { winner: string; challengeResults: any }) => {
    setGameState(prev => {
      const active = prev.contestants.filter(c => !c.isEliminated);
      const eligible = active
        .filter(c => c.name !== prev.playerName)
        .map(c => c.name);

      if (active.length !== 3 || !eligible.includes(choice)) {
        debugWarn('submitFinal3Vote: invalid choice', {
          choice,
          eligible,
          day: prev.currentDay,
          active: active.map(c => c.name),
        });
        return prev;
      }

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
        votingResult.eliminated = active.find(
          c => c.name !== tieBreakResult.winner && c.name !== prev.playerName
        )?.name || '';
      }
      
      votingResult.day = prev.currentDay;
      votingResult.playerVote = choice;

      // Detect a pure 1-1-1 Final 3 tie from the recorded votes.
      const tally: { [name: string]: number } = {};
      Object.values(votingResult.votes || {}).forEach(target => {
        if (!target) return;
        tally[target] = (tally[target] || 0) + 1;
      });
      const counts = Object.values(tally);
      const isPureFinalThreeTie =
        prev.gamePhase === 'final_3_vote' &&
        active.length === 3 &&
        counts.length === 3 &&
        counts.every(v => v === 1);

      // Always append the Final 3 vote to history so the UI can show results.
      // In a pure 1-1-1 tie, we keep all three active and let the tie-break route handle eliminations.
      if (isPureFinalThreeTie && !votingResult.eliminated) {
        return {
          ...prev,
          votingHistory: [...prev.votingHistory, votingResult],
        };
      }

      // Non-tie Final 3: record the vote only. Elimination and phase change are handled
      // by continueFromFinal3Results so the results screen can show the breakdown first.
      return {
        ...prev,
        votingHistory: [...prev.votingHistory, votingResult],
      };
    });
  }, []);

  const continueFromFinal3Results = useCallback(() => {
    setGameState(prev => {
      // Only resolve from the dedicated Final 3 phase
      if (prev.gamePhase !== 'final_3_vote') {
        return prev;
      }

      const lastVote = prev.votingHistory[prev.votingHistory.length - 1];
      if (!lastVote || !lastVote.eliminated) {
        return prev;
      }

      const eliminatedName = lastVote.eliminated;
      const active = prev.contestants.filter(c => !c.isEliminated);
      // Guard: only apply when we truly had a Final 3 (non-tie) situation
      if (active.length !== 3) {
        return prev;
      }

      // Apply elimination now that the results have been shown
      const updatedContestants = prev.contestants.map(c =>
        c.name === eliminatedName
          ? { ...c, isEliminated: true, eliminationDay: prev.currentDay }
          : c
      );

      // Ensure eliminated joins the jury (up to 7 members)
      let updatedJuryMembers = [...(prev.juryMembers || [])];
      if (
        eliminatedName &&
        !updatedJuryMembers.includes(eliminatedName) &&
        updatedJuryMembers.length < 7
      ) {
        updatedJuryMembers.push(eliminatedName);
      }

      const remainingCount = updatedContestants.filter(c => !c.isEliminated).length;
      const goingFinale = remainingCount === 2;
      const finaleCutscene = goingFinale
        ? buildFinaleCutscene({ ...prev, contestants: updatedContestants } as GameState)
        : undefined;

      return {
        ...prev,
        contestants: updatedContestants,
        juryMembers: updatedJuryMembers,
        gamePhase: goingFinale ? 'cutscene' as const : 'elimination',
        currentCutscene: finaleCutscene || prev.currentCutscene,
        isPlayerEliminated: eliminatedName === prev.playerName || prev.isPlayerEliminated,
      };
    });
  }, []);

  const respondToForcedConversation = useCallback((from: string, content: string, tone: string) => {
    setGameState(prev => {
      const targetNPC = prev.contestants.find(c => c.name === from);
      if (!targetNPC || !prev.playerName) {
        debugWarn('Forced conversation target not found or playerName missing', from);
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

      // Cutscenes can trigger on weekly recap days; return to weekly recap so the elimination cycle still runs.
      if (
        nextPhase === 'daily' &&
        prev.currentDay % 7 === 0 &&
        (type === 'mid_game' || type === 'twist_result_success' || type === 'twist_result_failure')
      ) {
        nextPhase = 'weekly_recap';
      }

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

        // Host's Child arc hard mechanics
        // - hc_voting_block: protection week (player cannot be eliminated until the next scheduled vote)
        // - hc_immediate_fallout: reveal the secret and apply a short scrutiny window
        if (arc === 'hosts_child' && beatId === 'hc_voting_block') {
          nextState = {
            ...nextState,
            playerCannotBeEliminatedUntilDay: nextState.nextEliminationDay,
            twistsActivated: Array.from(new Set([...(nextState.twistsActivated || []), 'host_child_protection_week'])),
          };
        }

        // When the Host's Child live reveal episode plays, mark the secret as revealed in state.
        if (arc === 'hosts_child' && beatId === 'hc_immediate_fallout') {
          nextState = revealHostChild(nextState, nextState.playerName);
          nextState = {
            ...nextState,
            hostChildFalloutUntilDay: nextState.currentDay + 3,
            twistsActivated: Array.from(new Set([...(nextState.twistsActivated || []), 'host_child_reveal'])),
          };
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
            // House fallout: trust collapses and suspicion spikes when the plant is exposed on air.
            const falloutContestants = updatedContestants.map(c => {
              if (c.name !== nextState.playerName) return c;
              return {
                ...c,
                psychProfile: {
                  ...c.psychProfile,
                  suspicionLevel: Math.min(100, c.psychProfile.suspicionLevel + 25),
                  trustLevel: Math.max(-100, c.psychProfile.trustLevel - 8),
                },
              };
            });

            falloutContestants
              .filter(c => !c.isEliminated && c.name !== nextState.playerName)
              .forEach(c => {
                relationshipGraphEngine.updateRelationship(
                  c.name,
                  nextState.playerName,
                  -10,
                  15,
                  -3,
                  'event',
                  '[Planted Houseguest] Exposed on air',
                  nextState.currentDay
                );
              });

            nextState = {
              ...nextState,
              contestants: falloutContestants,
              twistsActivated: Array.from(new Set([...(nextState.twistsActivated || []), 'planted_exposed'])),
            };
          }
        }

        if (arc === 'planted_houseguest' && beatId === 'phg_use_intel') {
          // Ensure NPC plans exist for this week, then leak a couple of them to the player.
          AIVotingStrategy.generateWeeklyVotingPlans(nextState);

          const candidates = nextState.contestants
            .filter(c => !c.isEliminated && c.name !== nextState.playerName)
            .sort(() => Math.random() - 0.5)
            .slice(0, 2);

          const leaks = candidates
            .map(c => {
              const plan = memoryEngine.getVotingPlan(c.name, nextState.currentDay);
              if (!plan?.target) return null;
              return {
                npc: c.name,
                target: plan.target,
                source: plan.source,
                reasoning: plan.reasoning,
              };
            })
            .filter(Boolean) as NonNullable<GameState['productionIntel']>['leaks'];

          if (leaks.length > 0) {
            nextState = {
              ...nextState,
              productionIntel: {
                day: nextState.currentDay,
                leaks,
              },
              twistsActivated: Array.from(new Set([...(nextState.twistsActivated || []), 'planted_intel_drop'])),
            };
          }
        }
      }

      // If a mission result cutscene pre-empted a narrative beat cutscene, show the beat immediately after.
      if (
        (type === 'twist_result_success' || type === 'twist_result_failure') &&
        nextState.twistNarrative?.currentBeatId
      ) {
        const pendingId = nextState.twistNarrative.currentBeatId;
        const beat = nextState.twistNarrative.beats?.find(b => b.id === pendingId);
        if (beat && beat.status === 'active') {
          nextState = {
            ...nextState,
            gamePhase: 'cutscene' as const,
            currentCutscene: buildMidGameCutscene(nextState, beat),
          };
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

    // If no rationales were provided, asynchronously generate LLM-backed jury
    // rationales based on juror memory and finalist gameplay. This is purely
    // narrative and does not affect the outcome.
    if (!rationales) {
      (async () => {
        try {
          const state = gameStateRef.current;
          if (!state.juryMembers || state.juryMembers.length === 0) return;

          const { generateJuryRationales } = await import('@/utils/juryRationaleEngine');
          const generated = await generateJuryRationales(state, winner, votes);
          if (!generated || Object.keys(generated).length === 0) return;

          setGameState(prev => {
            // Do not overwrite any rationales that might have been set explicitly
            const merged = { ...(prev.juryRationales || {}), ...generated };
            return { ...prev, juryRationales: merged };
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          debugWarn('Failed to generate LLM jury rationales:', e);
        }
      })();
    }
  }, []);

  const continueFromElimination = useCallback((forcePlayerElimination = false) => {
    debugLog('=== continueFromElimination called ===');
    debugLog('forcePlayerElimination:', forcePlayerElimination);
    
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

        debugLog('Updated jury members (7 max):', updatedJuryMembers);
        debugLog('Player should be included:', updatedJuryMembers.includes(prev.playerName));

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

        // After simulating down to a Final 2, rebuild the jury from all eliminated houseguests (up to 7)
        updatedJuryMembers = updatedContestants
          .filter(c => c.isEliminated)
          .sort((a, b) => (b.eliminationDay || prev.currentDay) - (a.eliminationDay || prev.currentDay))
          .slice(0, 7)
          .map(c => c.name);

        debugLog('continueFromElimination - Final simulated jury members:', updatedJuryMembers);

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
      debugLog('Created alliance:', newAlliance);
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
      debugMode: defaultDebugMode,
    });
    try {
      localStorage.removeItem('rtv_game_state');
    } catch (e) {
      debugWarn('Failed to clear saved game state', e);
    }
  }, []);

  const handleEmergentEventChoice = useCallback((event: any, choice: 'pacifist' | 'headfirst') => {
    debugLog('Emergent event choice handled:', event.type, choice);
    
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
    debugLog('=== TAG TALK TRIGGERED ===');
    debugLog('Target:', target, 'Choice:', choiceId, 'Interaction:', interaction);

    // Compute precise outcome using ReactionProfile + choice metadata
    // and surface actual deltas in lastAIReaction. Also apply cooldowns.
    setGameState(prev => {
      const targetNPC = prev.contestants.find(c => c.name === target);
      if (!targetNPC) {
        debugWarn('TagTalk: target not found', target);
        // Fallback to generic action
        useAction(interaction, target, `Tag choice: ${choiceId}`, 'tag');
        return prev;
      }

      // Load choice from data
      try {
        const choice = (TAG_CHOICES as any[]).find((c: any) => c.choiceId === choiceId);
        if (!choice) {
          debugWarn('TagTalk: choice not found', choiceId);
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
        const interactionEntry: InteractionLogEntry = {
          day: prev.currentDay,
          type: interaction,
          participants: [prev.playerName, target],
          content: `${tagPattern} ${choice.choiceId}`,
          tone: choice.tone,
          source: 'player' as const,
          intent: choice.intent,
          topic: choice.topics[0],
          choiceId: choice.choiceId,
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

        // Fire-and-forget cloud logging so beta analysis can see tag-based interactions too.
        void logInteractionToCloud({
          day: prev.currentDay,
          type:
            interaction === 'dm'
              ? 'dm'
              : interaction === 'scheme'
              ? 'scheme'
              : interaction === 'activity'
              ? 'event'
              : 'conversation',
          participants: [prev.playerName, target],
          npcName: target,
          playerName: prev.playerName,
          playerMessage: `${tagPattern} ${choice.choiceId}`,
          aiResponse: reactText,
          tone: choice.tone,
        });

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
        debugWarn('TagTalk: evaluate/apply failed, fallback to generic action', e);
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

  // Add event listener for skip button (debug-only)
  useEffect(() => {
    const handleSkip = () => {
      if (!gameStateRef.current.debugMode) return;
      skipToJury();
    };
    window.addEventListener('rtv:test:skipToJury', handleSkip);
    return () => window.removeEventListener('rtv:test:skipToJury', handleSkip);
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
        // Append a dedicated Final 3 tie-break record without dropping the previous elimination.
        votingHistory: [...prev.votingHistory, tieBreakRecord],
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
        const parsed = JSON.parse(raw) as GameState;
        const next =
          import.meta.env.MODE === 'production' && !betaDebugEnabled()
            ? { ...parsed, debugMode: false }
            : parsed;
        setGameState(next);
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
    // In production builds, only allow the debug HUD when explicitly enabled.
    if (import.meta.env.MODE === 'production' && !betaDebugEnabled()) {
      return;
    }
    setGameState(prev => ({
      ...prev,
      debugMode: !prev.debugMode,
    }));
  }, []);

  // Phase watchdog: prevent unintended jumps back to intro if a player is active.
  // If some component accidentally sets `intro` while a playerName exists, revert to daily.
  useEffect(() => {
    if (gameState.gamePhase === 'intro' && gameState.playerName) {
      debugWarn('Phase watchdog: Blocking unintended transition to intro while player is active');
      setGameState(prev => ({
        ...prev,
        gamePhase: prev.gamePhase && prev.gamePhase !== 'intro' ? prev.gamePhase : 'daily',
      }));
    }
  }, [gameState.gamePhase, gameState.playerName]);

  // Watchdog: if the player has been eliminated, never drop them back into daily gameplay.
  useEffect(() => {
    if (gameState.isPlayerEliminated && gameState.gamePhase === 'daily') {
      debugWarn('Phase watchdog: Player is eliminated; redirecting to post-season recap');
      setGameState(prev => ({
        ...prev,
        gamePhase: 'post_season' as const,
      }));
    }
  }, [gameState.isPlayerEliminated, gameState.gamePhase]);

  // Beta hardening: clamp obviously invalid phases back to a safe state.
  // This prevents soft-corrupted state from bricking the UI.
  useEffect(() => {
    setGameState(prev => {
      if (prev.gamePhase === 'cutscene' || prev.gamePhase === 'intro' || prev.gamePhase === 'character_creation') {
        return prev;
      }

      const active = prev.contestants.filter(c => !c.isEliminated);
      const activeCount = active.length;
      const playerActive = active.some(c => c.name === prev.playerName);

      // Elimination screens require a voting record
      if (prev.gamePhase === 'elimination' && prev.votingHistory.length === 0) {
        return { ...prev, gamePhase: 'daily' as const };
      }

      // Voting with <= 2 active is invalid
      if (prev.gamePhase === 'player_vote' && activeCount <= 2) {
        return { ...prev, gamePhase: activeCount === 2 ? 'cutscene' as const : 'daily' as const };
      }

      // Final 3 vote requires exactly 3 active including player
      if (prev.gamePhase === 'final_3_vote' && (activeCount !== 3 || !playerActive)) {
        return { ...prev, gamePhase: activeCount === 2 ? 'cutscene' as const : 'daily' as const };
      }

      // Jury vote requires exactly 2 active finalists
      if (prev.gamePhase === 'jury_vote' && activeCount !== 2) {
        return { ...prev, gamePhase: activeCount === 2 ? 'jury_vote' as const : 'daily' as const };
      }

      // Player vote requires at least one eligible target
      if (prev.gamePhase === 'player_vote' && playerActive) {
        const eligible = active.filter(c => c.name !== prev.playerName && c.name !== prev.immunityWinner);
        if (eligible.length === 0) {
          return { ...prev, gamePhase: 'daily' as const };
        }
      }

      return prev;
    });
  }, [gameState.gamePhase, gameState.contestants, gameState.playerName, gameState.immunityWinner, gameState.votingHistory.length]);

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
    continueFromFinal3Results,
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
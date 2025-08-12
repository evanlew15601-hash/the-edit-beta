import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { npcResponseEngine } from '@/utils/npcResponseEngine';
import { GameState, Contestant, PlayerAction, Confessional, EditPerception, Alliance, VotingRecord } from '@/types/game';
import { generateContestants } from '@/utils/contestantGenerator';
import { calculateEditPerception } from '@/utils/editEngine';
import { processVoting } from '@/utils/votingEngine';
import { getTrustDelta, getSuspicionDelta, calculateLeakChance, calculateSchemeSuccess, generateNPCInteractions } from '@/utils/actionEngine';
import { TwistEngine } from '@/utils/twistEngine';
import { speechActClassifier } from '@/utils/speechActClassifier';
import { 
  getNPCPersonalityBias, 
  calculateAITrustDelta, 
  calculateAISuspicionDelta, 
  calculateEmotionalDelta,
  calculateAILeakChance,
  generateAIResponse,
} from '@/utils/aiResponseEngine';
import { generateLocalAIReply } from '@/utils/localLLM';

const USE_REMOTE_AI = false; // Use free local + deterministic engines by default

const initialGameState = (): GameState => ({
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
  nextEliminationDay: 7,
  dailyActionCount: 0,
  dailyActionCap: 10
});

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    // Always start with intro screen - don't load saved state on first load
    return initialGameState();
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
      // Enforce daily action cap
      if (prev.dailyActionCount >= prev.dailyActionCap) return prev;

      const newActions = prev.playerActions.map(action => {
        if (action.type === actionType) {
          const currentUsage = action.usageCount || 0;
          return { 
            ...action, 
            used: currentUsage >= 1, // Mark as used after first usage
            usageCount: currentUsage + 1,
            target, 
            content, 
            tone 
          };
        }
        return action;
      });

      // CRITICAL: Parse player input with AI before processing
      let parsedInput = null;
      if (content && target) {
        parsedInput = speechActClassifier.classifyMessage(content, 'Player', { target, actionType });
      }

      // Process the action's effect on contestants based on PARSED intent, not just content
      const updatedContestants = prev.contestants.map(contestant => {
        let updatedContestant = { ...contestant };

        // Apply AI-DRIVEN action processing based on parsed intent
        switch (actionType) {
          case 'talk':
            if (contestant.name === target && parsedInput) {
              const npcPersonalityBias = getNPCPersonalityBias(contestant);
              const trustDelta = calculateAITrustDelta(parsedInput, npcPersonalityBias);
              const suspicionDelta = calculateAISuspicionDelta(parsedInput, npcPersonalityBias);
              const emotionalDelta = calculateEmotionalDelta(parsedInput, npcPersonalityBias);
              
              updatedContestant = {
                ...updatedContestant,
                psychProfile: {
                  ...updatedContestant.psychProfile,
                  trustLevel: Math.max(-100, Math.min(100, updatedContestant.psychProfile.trustLevel + trustDelta)),
                  suspicionLevel: Math.max(0, Math.min(100, updatedContestant.psychProfile.suspicionLevel + suspicionDelta)),
                  emotionalCloseness: Math.max(0, Math.min(100, updatedContestant.psychProfile.emotionalCloseness + emotionalDelta))
                },
                memory: [...updatedContestant.memory, {
                  day: prev.currentDay,
                  type: 'conversation' as const,
                  participants: [prev.playerName, contestant.name],
                  content: `${content} [AI Detected: ${parsedInput.primary}]`,
                  emotionalImpact: trustDelta / 5,
                  timestamp: prev.currentDay * 1000 + Math.random() * 1000
                }]
              };
            }
            break;

          case 'dm':
            if (contestant.name === target && parsedInput) {
              const npcPersonalityBias = getNPCPersonalityBias(contestant);
              const trustImpact = calculateAITrustDelta(parsedInput, npcPersonalityBias);
              const suspicionImpact = calculateAISuspicionDelta(parsedInput, npcPersonalityBias);
              const leakChance = calculateAILeakChance(parsedInput, contestant.psychProfile);
              
              updatedContestant = {
                ...updatedContestant,
                psychProfile: {
                  ...updatedContestant.psychProfile,
                  trustLevel: Math.max(-100, Math.min(100, updatedContestant.psychProfile.trustLevel + trustImpact)),
                  suspicionLevel: Math.max(0, Math.min(100, updatedContestant.psychProfile.suspicionLevel + suspicionImpact))
                },
                memory: [...updatedContestant.memory, {
                  day: prev.currentDay,
                  type: 'dm' as const,
                  participants: [prev.playerName, contestant.name],
                  content: `[DM-AI:${parsedInput.primary}] ${content}`,
                  emotionalImpact: trustImpact / 3,
                  timestamp: prev.currentDay * 1000 + Math.random() * 1000
                }]
              };

              if (Math.random() < leakChance) {
                prev.contestants.forEach(otherContestant => {
                  if (otherContestant.name !== contestant.name && otherContestant.name !== prev.playerName && !otherContestant.isEliminated) {
                    otherContestant.memory.push({
                      day: prev.currentDay,
                      type: 'observation' as const,
                      participants: [prev.playerName, contestant.name],
                      content: `Heard ${contestant.name} got a suspicious DM from ${prev.playerName}`,
                      emotionalImpact: -1,
                      timestamp: prev.currentDay * 1000 + Math.random() * 1000
                    });
                  }
                });
              }
            }
            break;

          case 'observe':
            const observationMemory = {
              day: prev.currentDay,
              type: 'observation' as const,
              participants: [prev.playerName],
              content: 'Player observed house dynamics',
              emotionalImpact: 0,
              timestamp: prev.currentDay * 1000 + Math.random() * 1000
            };
            
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
            if (contestant.name === target && parsedInput) {
              const npcPersonalityBias = getNPCPersonalityBias(contestant);
              const schemeDetected = parsedInput.manipulationLevel > 40 || parsedInput.primary === 'sabotaging';
              const schemeSuccess = !schemeDetected && npcPersonalityBias.manipulationDetection < 60;
              
              const trustDelta = schemeSuccess ? -5 : -20;
              const suspicionDelta = schemeDetected ? 35 : 15;
              
              updatedContestant = {
                ...updatedContestant,
                psychProfile: {
                  ...updatedContestant.psychProfile,
                  trustLevel: Math.max(-100, updatedContestant.psychProfile.trustLevel + trustDelta),
                  suspicionLevel: Math.min(100, updatedContestant.psychProfile.suspicionLevel + suspicionDelta)
                },
                memory: [...updatedContestant.memory, {
                  day: prev.currentDay,
                  type: 'scheme' as const,
                  participants: [prev.playerName, contestant.name],
                  content: `[AI-SCHEME-${schemeSuccess ? 'SUCCESS' : 'DETECTED'}] ${content}`,
                  emotionalImpact: schemeSuccess ? -2 : -8,
                  timestamp: prev.currentDay * 1000 + Math.random() * 1000
                }]
              };
            }
            break;

          case 'activity':
            if (!contestant.isEliminated && Math.random() < 0.35) {
              updatedContestant = {
                ...updatedContestant,
                psychProfile: {
                  ...updatedContestant.psychProfile,
                  trustLevel: Math.min(100, updatedContestant.psychProfile.trustLevel + 2),
                  suspicionLevel: Math.max(0, updatedContestant.psychProfile.suspicionLevel - 2)
                },
                memory: [...updatedContestant.memory, {
                  day: prev.currentDay,
                  type: 'event' as const,
                  participants: [prev.playerName, contestant.name],
                  content: 'Joined a house group task together',
                  emotionalImpact: 2,
                  timestamp: prev.currentDay * 1000 + Math.random() * 1000
                }]
              };
            }
            break;
        }

        return updatedContestant;
      });

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
        alliances: newAlliances,
        dailyActionCount: prev.dailyActionCount + 1,
        lastAIResponse: undefined,
        lastParsedInput: parsedInput,
        lastActionTarget: target,
        lastActionType: actionType as PlayerAction['type']
      };
    });

    // Call generative AI via Supabase Edge Function and store interaction
    if (target && content && ['talk','dm','scheme'].includes(actionType)) {
      (async () => {
        let aiText = '';
        try {
          // Build NPC payload with safe defaults if target not in roster yet
          const parsed = speechActClassifier.classifyMessage(content!, 'Player', { target, actionType });
          const npcEntity = gameState.contestants.find(c => c.name === target);
          const recentMemories = (npcEntity?.memory || [])
            .filter(m => m.participants.includes(gameState.playerName))
            .slice(-3)
            .map(m => ({ day: m.day, type: m.type, content: m.content, impact: m.emotionalImpact }));

          const npcPayload = npcEntity ? {
            name: npcEntity.name,
            publicPersona: npcEntity.publicPersona,
            psychProfile: npcEntity.psychProfile,
          } : {
            name: target!,
            publicPersona: 'strategic contestant',
            psychProfile: { disposition: [], trustLevel: 0, suspicionLevel: 10, emotionalCloseness: 20, editBias: 0 }
          };

          // Build payload once so we can reuse across backends
          const payload = {
            playerMessage: content,
            parsedInput: parsed,
            npc: npcPayload,
            tone: tone || '',
            socialContext: {
              day: gameState.currentDay,
              relationshipHint: npcEntity ? {
                trust: npcEntity.psychProfile.trustLevel,
                suspicion: npcEntity.psychProfile.suspicionLevel,
                closeness: npcEntity.psychProfile.emotionalCloseness,
              } : undefined,
              lastInteractions: recentMemories,
            },
            conversationType: actionType === 'dm' ? 'private' : 'public'
          } as const;

          // Short-circuit for small talk check-ins to avoid nonsense (only for talk/DM)
          const lower = content!.toLowerCase();
          const isCheckIn = (/(?:\bhow('?s| is)?\b.*\b(today|day|going)\b)|\bhow are you\b/.test(lower));
          if (!aiText && (actionType === 'talk' || actionType === 'dm') && parsed.primary === 'neutral_conversation' && isCheckIn) {
            const ps = npcEntity?.psychProfile;
            if (ps && ps.suspicionLevel > 60) {
              aiText = "It is tense—people are looking for missteps. I am staying quiet.";
            } else if (ps && ps.trustLevel > 50) {
              aiText = "Busy. A couple of sparks in the kitchen, but I am keeping us out of it.";
            } else {
              aiText = "Fine. Reading the room and not overplaying anything.";
            }
          }

          // Remote backends (disabled by default)
          if (!aiText && USE_REMOTE_AI) {
            // 1) Try OpenAI
            const primary = await supabase.functions.invoke('generate-ai-reply', { body: payload });
            if (!primary.error) {
              aiText = (primary.data as any)?.generatedText || '';
            }

            // 2) Fallback to Hugging Face if needed
            if (!aiText) {
              const hf = await supabase.functions.invoke('generate-ai-reply-hf', { body: payload });
              if (!hf.error) {
                aiText = (hf.data as any)?.generatedText || '';
              }
            }
          }

          // 2.5) Local on-device LLM (WebGPU/WebCPU) as strong offline fallback
          if (!aiText) {
            try {
              aiText = await generateLocalAIReply(payload);
            } catch {}
          }
        } catch (e) {
          console.error('AI reply error:', e);
        }

        // 3) Final fallback chain: contextual engine then templates
        if (!aiText) {
          try {
            const resp = npcResponseEngine.generateResponse(
              content!,
              target!,
              gameState,
              (actionType === 'dm' ? 'private' : 'public') as any
            );
            aiText = resp?.content || '';
          } catch (e2) {
            console.error('NPC engine fallback error:', e2);
          }
        }
        if (!aiText) {
          try {
            const npcEntity = gameState.contestants.find(c => c.name === target);
            const npcForLocal: Contestant = npcEntity ?? {
              id: `temp_${target}`,
              name: target!,
              publicPersona: 'strategic contestant',
              psychProfile: { disposition: [], trustLevel: 0, suspicionLevel: 10, emotionalCloseness: 20, editBias: 0 },
              memory: [],
              isEliminated: false,
            } as Contestant;
            const parsedLocal = speechActClassifier.classifyMessage(content!, 'Player', { target, actionType });
            const templated = generateAIResponse(parsedLocal as any, npcForLocal, content!);
            if (templated) aiText = templated;
          } catch (e3) {
            console.error('Local template fallback error:', e3);
          }
        }

        // Publish to UI and analytics table (best-effort) with quality filter
        if (aiText) {
          try {
            const looksGeneric = /responds to your comment|^\"?Noted\.?\"?$|^\W*$|\bresponds:\b/i.test(aiText) || aiText.length < 18;
            if (looksGeneric) {
              const npcEntity = gameState.contestants.find(c => c.name === target);
              const npcForLocal: Contestant = npcEntity ?? {
                id: `temp_${target}`,
                name: target!,
                publicPersona: 'strategic contestant',
                psychProfile: { disposition: [], trustLevel: 0, suspicionLevel: 10, emotionalCloseness: 20, editBias: 0 },
                memory: [],
                isEliminated: false,
              } as Contestant;
              const parsed2 = speechActClassifier.classifyMessage(content!, 'Player', { target, actionType });
              const improved = generateAIResponse(parsed2 as any, npcForLocal, content!);
              if (improved) aiText = improved;
            }
          } catch {}

          // Final sanitization: direct speech, formal tone, no quotes/narration
          const sanitizeAI = (text: string) => {
            let t = String(text || '').trim();
            // Prefer first quoted segment if present
            const q = t.match(/"([^\"]{3,})"/);
            if (q) t = q[1];
            // Remove speaker labels like "River:" or dashes
            t = t.replace(/^(?:[A-Z][a-z]+|You|I):\s*/, '');
            // Expand broken and common contractions
            const pairs: [RegExp, string][] = [
              [/\bcan't\b/gi, 'cannot'], [/\bwon't\b/gi, 'will not'], [/\bdon't\b/gi, 'do not'], [/\bdoesn't\b/gi, 'does not'], [/\bdidn't\b/gi, 'did not'],
              [/\bI'm\b/gi, 'I am'], [/\bI've\b/gi, 'I have'], [/\bI'll\b/gi, 'I will'], [/\byou're\b/gi, 'you are'], [/\bthey're\b/gi, 'they are'], [/\bwe're\b/gi, 'we are'],
              [/\bit's\b/gi, 'it is'], [/\bthat's\b/gi, 'that is'], [/\bthere's\b/gi, 'there is'], [/\bweren't\b/gi, 'were not'], [/\bwasn't\b/gi, 'was not'],
              [/\bshouldn't\b/gi, 'should not'], [/\bwouldn't\b/gi, 'would not'], [/\bcouldn't\b/gi, 'could not'], [/\baren't\b/gi, 'are not'], [/\bisn't\b/gi, 'is not'],
            ];
            pairs.forEach(([re, rep]) => { t = t.replace(re, rep); });
            t = t.replace(/\b(didn|couldn|wouldn|shouldn)\b\.?/gi, (m) => ({didn:'did not',couldn:'could not',wouldn:'would not',shouldn:'should not'}[m.toLowerCase().replace(/\./,'')] || m));
            // Strip remaining outer quotes
            t = t.replace(/^["'“”]+|["'“”]+$/g, '');
            // Remove simple third-person narration prefixes if present
            t = t.replace(/^[A-Z][a-z]+\s+(glances|keeps|says|whispers|mutters|shrugs|smiles)[^\.]*\.\s*/, '');
            // Enforce 1–2 sentences
            t = t.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 2).join(' ');
            return t.trim();
          };
          aiText = sanitizeAI(aiText);

          setGameState(prev => ({
            ...prev,
            lastAIResponse: aiText,
          }));
          try {
            await supabase.from('interactions').insert({
              day: gameState.currentDay,
              type: actionType,
              participants: [gameState.playerName, target],
              npc_name: target,
              player_name: gameState.playerName,
              player_message: content,
              ai_response: aiText,
              tone,
            });
          } catch {}
        }
      })();
    }
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
      const activeContestants = prev.contestants.filter(c => !c.isEliminated);
      
      // Check for immunity competition (day before elimination)
      if (newDay === prev.nextEliminationDay - 1 && activeContestants.length > 3) {
        const newState: GameState = {
          ...prev,
          currentDay: newDay,
          gamePhase: 'immunity_competition' as const
        };
        saveGameState(newState);
        return newState;
      }

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
        const votingResult = processVoting(updatedContestants, prev.playerName, prev.alliances, prev.immunityWinner);
        
        const finalContestants = updatedContestants.map(c =>
          c.name === votingResult.eliminated 
            ? { ...c, isEliminated: true, eliminationDay: newDay }
            : c
        );

        // Check if game should end (final 2)
        const remainingContestants = finalContestants.filter(c => !c.isEliminated);
        if (remainingContestants.length <= 2) {
          const newState: GameState = {
            ...prev,
            ...(twistUpdates as Partial<GameState>),
            currentDay: newDay,
            contestants: finalContestants,
            votingHistory: [...prev.votingHistory, { ...votingResult, day: newDay }],
            gamePhase: 'finale' as const,
            juryMembers: prev.contestants.filter(c => 
              c.isEliminated && c.eliminationDay && c.eliminationDay >= newDay - 14
            ).map(c => c.name),
        playerActions: [
          { type: 'talk', used: false, usageCount: 0 },
          { type: 'dm', used: false, usageCount: 0 },
          { type: 'confessional', used: false, usageCount: 0 },
          { type: 'observe', used: false, usageCount: 0 },
          { type: 'scheme', used: false, usageCount: 0 },
          { type: 'activity', used: false, usageCount: 0 }
        ] as PlayerAction[],
        dailyActionCount: 0
      };
          saveGameState(newState);
          return newState;
        }

        const newState: GameState = {
          ...prev,
          ...(twistUpdates as Partial<GameState>),
          currentDay: newDay,
          contestants: finalContestants,
          votingHistory: [...prev.votingHistory, { ...votingResult, day: newDay }],
          gamePhase: 'elimination' as const,
          nextEliminationDay: newDay + 6,
          immunityWinner: undefined, // Reset immunity
          playerActions: [
            { type: 'talk', used: false, usageCount: 0 },
            { type: 'dm', used: false, usageCount: 0 },
            { type: 'confessional', used: false, usageCount: 0 },
            { type: 'observe', used: false, usageCount: 0 },
            { type: 'scheme', used: false, usageCount: 0 },
              { type: 'activity', used: false, usageCount: 0 }
            ] as PlayerAction[],
            dailyActionCount: 0
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
          { type: 'talk', used: false, usageCount: 0 },
          { type: 'dm', used: false, usageCount: 0 },
          { type: 'confessional', used: false, usageCount: 0 },
          { type: 'observe', used: false, usageCount: 0 },
          { type: 'scheme', used: false, usageCount: 0 },
          { type: 'activity', used: false, usageCount: 0 }
            ] as PlayerAction[],
            dailyActionCount: 0
      };

      // Save game state
      saveGameState(newState);
      return newState;
    });
  }, []);

  const setImmunityWinner = useCallback((winner: string) => {
    setGameState(prev => ({
      ...prev,
      immunityWinner: winner,
      gamePhase: 'daily' as const
    }));
  }, []);

  const submitFinaleSpeech = useCallback((speech: string) => {
    setGameState(prev => ({
      ...prev,
      finaleSpeechesGiven: true,
      gamePhase: 'jury_vote' as const
    }));
  }, []);

  const endGame = useCallback((winner: string, votes: { [juryMember: string]: string }) => {
    setGameState(prev => ({
      ...prev,
      gamePhase: 'intro' as const // Reset to intro for new game
    }));
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
    setImmunityWinner,
    submitFinaleSpeech,
    endGame,
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
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
import { detectGameTalk, craftGameTalkReply } from '@/utils/gameTalkHeuristics';
import { summarizeReaction } from '@/utils/reactionSummarizer';
import { EmergentEventInterruptor, EmergentEvent } from '@/utils/emergentEventInterruptor';
import { npcAutonomyEngine } from '@/utils/npcAutonomyEngine';
const MINIMAL_AI = true; // Minimal, credit-free reaction mode
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
  dailyActionCap: 10,
  aiSettings: {
    depth: 'standard',
    additions: { strategyHint: true, followUp: true, riskEstimate: true, memoryImpact: true },
  },
  forcedConversationsQueue: [],
  favoriteTally: {},
  interactionLog: [],
});

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    // Always start with intro screen - don't load saved state on first load
    return initialGameState();
  });

  const updateAISettings = useCallback((partial: Partial<GameState['aiSettings']>) => {
    setGameState(prev => ({
      ...prev,
      aiSettings: {
        ...prev.aiSettings,
        ...partial,
        additions: { ...prev.aiSettings.additions, ...(partial.additions || {}) }
      }
    }));
  }, []);

  const startGame = useCallback((playerName: string) => {
    const contestants = generateContestants(11);
    npcAutonomyEngine.initializeNPCs(contestants);
    setGameState(prev => ({
      ...prev,
      playerName,
      contestants,
      gamePhase: 'premiere'
    }));
  }, []);

  useEffect(() => {
    const handler = (e: any) => updateAISettings(e.detail || {});
    window.addEventListener('ai-settings:update', handler);
    return () => window.removeEventListener('ai-settings:update', handler);
  }, [updateAISettings]);

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
            if (!contestant.isEliminated && Math.random() < 0.7) {
              updatedContestant = {
                ...updatedContestant,
                psychProfile: {
                  ...updatedContestant.psychProfile,
                  trustLevel: Math.min(100, updatedContestant.psychProfile.trustLevel + 3),
                  suspicionLevel: Math.max(0, updatedContestant.psychProfile.suspicionLevel - 1)
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

      const reaction = summarizeReaction(
        actionType,
        content || '',
        parsedInput,
        updatedContestants.find(c => c.name === target) || null,
        actionType === 'dm' ? 'private' : actionType === 'talk' ? 'public' : (actionType === 'scheme' ? 'scheme' : (actionType === 'activity' ? 'activity' : 'public'))
      );

      // Debug: inspect parsing and resulting take
      try {
        console.debug('[ActionProcessed]', {
          day: prev.currentDay,
          actionType,
          target,
          content,
          parsedPrimary: parsedInput?.primary,
          infoSeeking: parsedInput?.informationSeeking,
          trustBuilding: parsedInput?.trustBuilding,
          threat: parsedInput?.threatLevel,
          manipulation: parsedInput?.manipulationLevel,
          emotionKeys: parsedInput?.emotionalSubtext ? Object.keys(parsedInput.emotionalSubtext) : [],
          reaction
        });
      } catch (e) {}

      return {
        ...prev,
        playerActions: newActions,
        contestants: updatedContestants,
        alliances: newAlliances,
        dailyActionCount: prev.dailyActionCount + 1,
        lastAIResponse: undefined,
        lastAIAdditions: undefined,
        lastParsedInput: parsedInput,
        lastActionTarget: target,
        lastActionType: actionType as PlayerAction['type'],
        lastAIReaction: reaction,
        forcedConversationsQueue: (() => {
          const q = prev.forcedConversationsQueue || [];
          const strongTrigger = parsedInput && (parsedInput.manipulationLevel > 55 || parsedInput.threatLevel > 55);
          if (strongTrigger && target) {
            return [
              ...q,
              { from: target, topic: 'We need to talk about that last move.', urgency: 'important' as const, day: prev.currentDay }
            ];
          }
          // 25% chance casual pull-aside after any social action
          if (['talk','dm','activity'].includes(actionType) && Math.random() < 0.25 && target) {
            return [
              ...q,
              { from: target, topic: 'Quick hallway check-in.', urgency: 'casual' as const, day: prev.currentDay }
            ];
          }
          return q;
        })(),
        interactionLog: [
          ...((prev.interactionLog) || []),
          {
            day: prev.currentDay,
            type: (actionType as any),
            participants: target ? [prev.playerName, target] : [prev.playerName],
            content: content,
            tone: tone,
            source: 'player' as const,
          }
        ],
      };
    });

    // Call generative AI via Supabase Edge Function and store interaction
    if (!MINIMAL_AI && target && content && ['talk','dm','scheme'].includes(actionType)) {
      (async () => {
        let aiText = '';
        let parsed: any = null;
        try {
          // Build NPC payload with safe defaults if target not in roster yet
          parsed = speechActClassifier.classifyMessage(content!, 'Player', { target, actionType });
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
              aiText = "Good. A couple sparks in the kitchen, but I am keeping us out of it.";
            } else {
              aiText = "Fine. Reading the room and not overplaying anything.";
            }
          }

          // Sentiment/greeting handler ("excited to be here", "glad to be here", etc.)
          if (!aiText && (actionType === 'talk' || actionType === 'dm') && parsed.primary === 'neutral_conversation') {
            const sentiment = /(excited|glad|happy|thrilled|pumped|nervous)\b.*\b(here|to be here)?\b/.test(lower) && !/[?]/.test(content!);
            const greeting = /^(hey|hi|hello|yo)\b/.test(lower) && content!.length <= 40;
            if (sentiment || greeting) {
              const ps = npcEntity?.psychProfile;
              if (ps && ps.suspicionLevel > 60) {
                aiText = "Good. Keep it quiet and read the room.";
              } else if (ps && ps.trustLevel > 50) {
                aiText = "Good—channel it into quiet moves. We stay measured.";
              } else {
                aiText = "Good. Energy is useful; do not draw fire.";
              }
            }
          }

          // Domain heuristic: talking game / alliances / votes / numbers
          if (!aiText) {
            const tags = detectGameTalk(content!);
            if (tags.isGameTalk) {
              aiText = craftGameTalkReply(content!, tags, {
                conversationType: payload.conversationType,
                npc: npcEntity ? {
                  name: npcEntity.name,
                  trustLevel: npcEntity.psychProfile.trustLevel,
                  suspicionLevel: npcEntity.psychProfile.suspicionLevel,
                  closeness: npcEntity.psychProfile.emotionalCloseness,
                } : null,
                day: gameState.currentDay,
              });
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
              aiText = await generateLocalAIReply(payload, {
                maxSentences: gameState.aiSettings.depth === 'brief' ? 1 : gameState.aiSettings.depth === 'deep' ? 3 : 2,
                maxNewTokens: gameState.aiSettings.depth === 'deep' ? 160 : 120,
              });
            } catch {}
          }
        } catch (e) {
          console.error('AI reply error:', e);
        }

        // 3) Final fallback chain: contextual engine then templates
        if (!aiText) {
          try {
            const npcInRoster = gameState.contestants.some(c => c.name === target);
            if (npcInRoster) {
              const resp = npcResponseEngine.generateResponse(
                content!,
                target!,
                gameState,
                (actionType === 'dm' ? 'private' : 'public') as any
              );
              aiText = resp?.content || '';
            }
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
          // Final sanitization moved above; also use sentence cap for local model
          aiText = sanitizeAI(aiText);

          // Compute optional additions based on settings
          const adds: GameState['lastAIAdditions'] = {};
          try {
            const npcEntity = gameState.contestants.find(c => c.name === target);
            const ps = npcEntity?.psychProfile;
            if (gameState.aiSettings.additions.strategyHint) {
              const intent = (parsed?.primary || '').replace(/_/g, ' ');
              const strat = ps && ps.suspicionLevel > 60 ? 'deflect and test loyalty' : ps && ps.trustLevel > 50 ? 'share selectively and set a small ask' : 'seek information without commitment';
              adds.strategy = `Strategy: ${strat} (detected: ${intent || 'neutral'}).`;
            }
            if (gameState.aiSettings.additions.followUp) {
              const topic = /about\s+([^.!?]{3,40})/i.exec(content || '')?.[1]?.trim();
              adds.followUp = `Follow-up: ${topic ? `What exactly about ${topic}?` : 'What do you need to know—alliances, votes, or trust?'}`;
            }
            if (gameState.aiSettings.additions.riskEstimate) {
              const leak = parsed ? calculateAILeakChance(parsed as any, (ps || { disposition: [], trustLevel: 50 })) : 0.1;
              const pct = Math.round(leak * 100);
              adds.risk = `Leak risk: ${pct}% if pushed for secrets.`;
            }
            if (gameState.aiSettings.additions.memoryImpact) {
              const impact = parsed ? Math.max(-10, Math.min(10, Math.round((parsed.emotionalSubtext.sincerity - parsed.emotionalSubtext.manipulation + parsed.emotionalSubtext.attraction - parsed.emotionalSubtext.anger) / 10))) : 0;
              adds.memory = `Memory impact: ${impact >= 0 ? '+' : ''}${impact}.`;
            }
          } catch {}

          setGameState(prev => ({
            ...prev,
            lastAIResponse: aiText,
            lastAIAdditions: adds,
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
      const baseToneScore: Record<string, number> = {
        strategic: 6,
        vulnerable: 10,
        humorous: 7,
        dramatic: 3,
        aggressive: -6,
        evasive: -2,
      };
      const base = baseToneScore[tone] ?? 1;
      const lenBonus = Math.min(8, Math.floor((content?.length || 0) / 80));
      const approvalBonus = Math.round((prev.editPerception.audienceApproval || 0) / 10);
      const noise = Math.round((Math.random() - 0.5) * 2);
      const audienceScore = Math.max(0, Math.min(100, base + lenBonus + approvalBonus + noise));

      const confessional: Confessional = {
        day: prev.currentDay,
        content,
        tone,
        editImpact: tone === 'strategic' ? 5 : tone === 'aggressive' ? -3 : 2,
        audienceScore,
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

        // Apply light social status effects from interactions
        const trustDelta = relevantInteractions.reduce((sum, inter) => {
          if (inter.type === 'conflict') return sum - 2;
          if (inter.type === 'tension') return sum - 1;
          return sum + 1;
        }, 0);
        const suspicionDelta = relevantInteractions.reduce((sum, inter) => {
          if (inter.type === 'conflict') return sum + 2;
          if (inter.type === 'tension') return sum + 1;
          return sum;
        }, 0);

        return {
          ...contestant,
          psychProfile: {
            ...contestant.psychProfile,
            trustLevel: Math.max(-100, Math.min(100, contestant.psychProfile.trustLevel + trustDelta)),
            suspicionLevel: Math.max(0, Math.min(100, contestant.psychProfile.suspicionLevel + suspicionDelta)),
          },
          memory: [...contestant.memory, ...interactionMemories]
        };
      });

      // Apply twist updates if any
      if (twistUpdates && 'contestants' in twistUpdates && twistUpdates.contestants) {
        updatedContestants = twistUpdates.contestants as Contestant[];
      }

      if (isEliminationDay) {
        const newState: GameState = {
          ...prev,
          ...(twistUpdates as Partial<GameState>),
          currentDay: newDay,
          contestants: updatedContestants,
          gamePhase: 'player_vote' as const,
          forcedConversationsQueue: (() => {
            const q = prev.forcedConversationsQueue || [];
            const pool = updatedContestants.filter(c => !c.isEliminated && c.name !== prev.playerName);
            const scored = pool.map(c => {
              const recent = (c.memory || []).filter(m => m.participants.includes(prev.playerName)).slice(-5);
              const score = recent.reduce((s, m) => s + Math.abs(m.emotionalImpact), 0) + (c.psychProfile.emotionalCloseness / 50);
              return { name: c.name, score, topic: recent[recent.length - 1]?.content || 'Quick check-in' };
            }).sort((a, b) => b.score - a.score);
            const pick = scored[0] || { name: pool[0]?.name, topic: 'Quick check-in', score: 0 } as any;
            if (!pick.name) return q;
            return [
              ...q,
              { from: pick.name, topic: pick.topic, urgency: pick.score > 3 ? 'important' as const : 'casual' as const, day: newDay }
            ];
          })(),
        };
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
            dailyActionCount: 0,
            forcedConversationsQueue: (() => {
              const q = prev.forcedConversationsQueue || [];
              const pool = updatedContestants.filter(c => !c.isEliminated && c.name !== prev.playerName);
              if (!pool.length) return q;
              const scored = pool.map(c => {
                const recent = (c.memory || []).filter(m => m.participants.includes(prev.playerName)).slice(-5);
                const score = recent.reduce((s, m) => s + Math.abs(m.emotionalImpact), 0) + (c.psychProfile.emotionalCloseness / 50);
                return { name: c.name, score, topic: recent[recent.length - 1]?.content || 'Quick check-in' };
              }).sort((a, b) => b.score - a.score);
              const pick = scored[0] || { name: pool[0]?.name, topic: 'Quick check-in', score: 0 } as any;
              if (!pick.name) return q;
              return [
                ...q,
                { from: pick.name, topic: pick.topic, urgency: pick.score > 3 ? 'important' as const : 'casual' as const, day: newDay }
              ];
            })(),
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

  const completePremiere = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gamePhase: 'daily',
      forcedConversationsQueue: (() => {
        const pool = prev.contestants.filter(c => !c.isEliminated && c.name !== prev.playerName);
        if (!pool.length) return [] as NonNullable<GameState['forcedConversationsQueue']>;
        const scored = pool.map(c => {
          const recent = (c.memory || []).filter(m => m.participants.includes(prev.playerName)).slice(-5);
          const score = recent.reduce((s, m) => s + Math.abs(m.emotionalImpact), 0) + (c.psychProfile.emotionalCloseness / 50);
          return { name: c.name, score, topic: recent[recent.length - 1]?.content || 'Quick check-in' };
        }).sort((a, b) => b.score - a.score);
        const pick = scored[0] || { name: pool[0]?.name, topic: 'Quick check-in', score: 0 } as any;
        if (!pick.name) return [] as NonNullable<GameState['forcedConversationsQueue']>;
        return [{ from: pick.name, topic: pick.topic, urgency: pick.score > 3 ? 'important' as const : 'casual' as const, day: prev.currentDay }];
      })(),
    }));
  }, []);

  const submitFinaleSpeech = useCallback((speech: string) => {
    setGameState(prev => ({
      ...prev,
      finaleSpeechesGiven: true,
      gamePhase: 'jury_vote' as const
    }));
  }, []);

  const submitPlayerVote = useCallback((choice: string) => {
    setGameState(prev => {
      const votingResult = processVoting(prev.contestants, prev.playerName, prev.alliances, prev.immunityWinner, choice);
      const newDay = prev.currentDay; // already incremented on advanceDay

      const finalContestants = prev.contestants.map(c =>
        c.name === votingResult.eliminated
          ? { ...c, isEliminated: true, eliminationDay: newDay }
          : c
      );

      const remainingContestants = finalContestants.filter(c => !c.isEliminated);
      if (remainingContestants.length <= 2) {
        const newState: GameState = {
          ...prev,
          currentDay: newDay,
          contestants: finalContestants,
          votingHistory: [...prev.votingHistory, { ...votingResult, day: newDay, playerVote: choice }],
          gamePhase: 'finale' as const,
          juryMembers: prev.contestants.filter(c => c.isEliminated && c.eliminationDay && c.eliminationDay >= newDay - 14).map(c => c.name),
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
        currentDay: newDay,
        contestants: finalContestants,
        votingHistory: [...prev.votingHistory, { ...votingResult, day: newDay, playerVote: choice }],
        gamePhase: 'elimination' as const,
        nextEliminationDay: newDay + 6,
        immunityWinner: undefined,
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
    });
  }, []);

  const respondToForcedConversation = useCallback((from: string, content: string, tone: string) => {
    setGameState(prev => {
      const targetName = from;
      const parsedInput = content ? speechActClassifier.classifyMessage(content, 'Player', { target: targetName, actionType: 'talk' }) : null;
      const updatedContestants = prev.contestants.map(contestant => {
        if (contestant.name !== targetName || !parsedInput) return contestant;
        const npcPersonalityBias = getNPCPersonalityBias(contestant);
        const trustDelta = calculateAITrustDelta(parsedInput, npcPersonalityBias);
        const suspicionDelta = calculateAISuspicionDelta(parsedInput, npcPersonalityBias);
        const emotionalDelta = calculateEmotionalDelta(parsedInput, npcPersonalityBias);
        return {
          ...contestant,
          psychProfile: {
            ...contestant.psychProfile,
            trustLevel: Math.max(-100, Math.min(100, contestant.psychProfile.trustLevel + trustDelta)),
            suspicionLevel: Math.max(0, Math.min(100, contestant.psychProfile.suspicionLevel + suspicionDelta)),
            emotionalCloseness: Math.max(0, Math.min(100, contestant.psychProfile.emotionalCloseness + emotionalDelta))
          },
          memory: [...contestant.memory, {
            day: prev.currentDay,
            type: 'conversation' as const,
            participants: [prev.playerName, contestant.name],
            content: `${content} [FORCED CHECK-IN]`,
            emotionalImpact: trustDelta / 5,
            timestamp: prev.currentDay * 1000 + Math.random() * 1000
          }]
        };
      });

      const reaction = summarizeReaction(
        'talk',
        content || '',
        parsedInput,
        updatedContestants.find(c => c.name === targetName) || null,
        'public'
      );

      const newQueue = [...(prev.forcedConversationsQueue || [])];
      const idx = newQueue.findIndex(it => it.from === from);
      if (idx >= 0) newQueue.splice(idx, 1);

      const newState: GameState = {
        ...prev,
        contestants: updatedContestants,
        lastAIReaction: reaction,
        lastActionTarget: targetName,
        lastActionType: 'talk',
        forcedConversationsQueue: newQueue,
        interactionLog: [
          ...((prev.interactionLog) || []),
          {
            day: prev.currentDay,
            type: 'talk',
            participants: [prev.playerName, targetName],
            content,
            tone,
            source: 'player' as const,
          }
        ],
      };
      return newState;
    });

    // Best-effort DB log
    (async () => {
      try {
        await supabase.from('interactions').insert({
          day: gameState.currentDay,
          type: 'talk',
          participants: [gameState.playerName, from],
          npc_name: from,
          player_name: gameState.playerName,
          player_message: content,
          ai_response: null,
          tone,
        });
      } catch {}
    })();
  }, []);

  const endGame = useCallback((winner: string, votes: { [juryMember: string]: string }) => {
    setGameState(prev => ({
      ...prev,
      gamePhase: 'intro' as const // Reset to intro for new game
    }));
  }, []);

  const continueFromElimination = useCallback(() => {
    setGameState(prev => {
      const latest = prev.votingHistory[prev.votingHistory.length - 1];
      const playerEliminated = latest?.eliminated === prev.playerName;
      // Always show end-of-week recap after elimination, even if the player was eliminated
      return {
        ...prev,
        gamePhase: 'weekly_recap' as const
      };
    });
  }, []);

  const continueFromWeeklyRecap = useCallback(() => {
    setGameState(prev => {
      const latest = prev.votingHistory[prev.votingHistory.length - 1];
      const playerEliminated = latest?.eliminated === prev.playerName;
      if (playerEliminated) {
        // After showing the recap for the elimination week, reset the game
        return initialGameState();
      }
      return {
        ...prev,
        gamePhase: 'daily' as const
      };
    });
  }, []);

  const handleEmergentEventChoice = useCallback((event: EmergentEvent, choice: 'pacifist' | 'headfirst') => {
    setGameState(prev => EmergentEventInterruptor.applyEventInterruption(event, prev, choice));
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
    submitPlayerVote,
    respondToForcedConversation,
    completePremiere,
    endGame,
    continueFromElimination,
    continueFromWeeklyRecap,
    handleEmergentEventChoice,
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
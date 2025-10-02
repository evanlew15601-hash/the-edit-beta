import { supabase } from '@/integrations/supabase/client';
import { GameState, Contestant } from '@/types/game';

/**
 * Build a compact payload for Edge AI functions to avoid 413 Request Entity Too Large.
 * - Only send essential fields
 * - Truncate long strings
 * - Limit interaction history
 */
export function buildCompactAIRequest(args: {
  gameState: GameState;
  playerMessage: string;
  npc: Contestant;
  tone?: string;
  conversationType?: 'public' | 'private' | 'confessional' | string;
  parsedInput?: any;
}, limits?: {
  maxBytes?: number;
  maxInteractions?: number;
  maxContentChars?: number;
  maxPromptChars?: number;
}) {
  const {
    gameState, playerMessage, npc, tone, conversationType, parsedInput,
  } = args;

  const lim = {
    maxBytes: limits?.maxBytes ?? 40_000, // ~40KB safety
    maxInteractions: limits?.maxInteractions ?? 10,
    maxContentChars: limits?.maxContentChars ?? 120,
    maxPromptChars: limits?.maxPromptChars ?? 500,
  };

  // Minimal NPC shape
  const npcCompact = {
    name: npc.name,
    publicPersona: npc.publicPersona,
    psychProfile: {
      trustLevel: Math.round(npc.psychProfile?.trustLevel ?? 0),
      suspicionLevel: Math.round(npc.psychProfile?.suspicionLevel ?? 0),
      emotionalCloseness: Math.round(npc.psychProfile?.emotionalCloseness ?? 0),
    },
  };

  // Minimal parsed input used by edge functions
  const parsedCompact = parsedInput ? {
    primary: parsedInput.primary,
    manipulationLevel: Math.round(parsedInput.manipulationLevel ?? 0),
    sincerity: Math.round(parsedInput.sincerity ?? 0),
    threatLevel: Math.round(parsedInput.threatLevel ?? 0),
    informationSeeking: !!parsedInput.informationSeeking,
  } : undefined;

  // Build a compact social context from interaction log
  const interactions = (gameState.interactionLog || [])
    .slice(-Math.max(5, lim.maxInteractions)) // last N interactions
    .map(e => ({
      day: e.day,
      type: e.type,
      participants: (e.participants || []).slice(0, 3),
      content: String(e.content || '').slice(0, lim.maxContentChars),
    }));

  const socialContext = {
    day: gameState.currentDay,
    lastInteractions: interactions,
  };

  // Trim the player message
  const msg = String(playerMessage || '').slice(0, lim.maxPromptChars);

  let payload: any = {
    playerMessage: msg,
    npc: npcCompact,
    tone,
    conversationType,
    parsedInput: parsedCompact,
    socialContext,
  };

  // Ensure we remain under size; progressively shrink if necessary
  const sizeOf = (obj: any) => JSON.stringify(obj).length;
  const shrink = () => {
    // Reduce interactions then content then prompt if over limits
    while (sizeOf(payload) > lim.maxBytes) {
      if ((payload.socialContext?.lastInteractions?.length || 0) > 3) {
        payload.socialContext.lastInteractions = payload.socialContext.lastInteractions.slice(-3);
        continue;
      }
      const newMaxContent = Math.max(40, lim.maxContentChars - 20);
      if (newMaxContent < lim.maxContentChars) {
        lim.maxContentChars = newMaxContent;
        payload.socialContext.lastInteractions = payload.socialContext.lastInteractions.map((e: any) => ({
          ...e,
          content: String(e.content || '').slice(0, lim.maxContentChars),
        }));
        continue;
      }
      const newMaxPrompt = Math.max(200, lim.maxPromptChars - 50);
      if (newMaxPrompt < lim.maxPromptChars) {
        lim.maxPromptChars = newMaxPrompt;
        payload.playerMessage = String(payload.playerMessage || '').slice(0, lim.maxPromptChars);
        continue;
      }
      break;
    }
  };
  shrink();

  return payload;
}

/**
 * Invoke the Edge AI function with a compact payload.
 * backend: 'hf' for Hugging Face, 'openai' for OpenAI (defaults to 'hf')
 */
export async function invokeEdgeAI(
  compactPayload: any,
  backend: 'hf' | 'openai' = 'hf'
): Promise<{ generatedText?: string; error?: string }> {
  const fn = backend === 'openai' ? 'generate-ai-reply' : 'generate-ai-reply-hf';

  const { data, error } = await supabase.functions.invoke(fn, {
    body: compactPayload,
  });

  if (error) {
    return { error: error.message || String(error) };
  }

  return data as any;
}
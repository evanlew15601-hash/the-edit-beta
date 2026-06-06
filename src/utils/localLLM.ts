import { generateAIResponse } from "./aiResponseEngine";
import { decideAndRender } from "./deterministicDialogue/responseEngine";
import { isAIStyleEnhancementEnabled } from "./deterministicDialogue/settings";

// NPC reply generation.
//
// The deterministic Tag-Talk pipeline is now the SOURCE OF TRUTH. Every call
// computes a tag-bundle-driven line locally first. The cloud AI is only
// invoked as an OPTIONAL stylistic rephrase, gated by the user's
// "AI Style Enhancement" setting (default OFF) and strict sanity guards.
// If the AI is disabled, unreachable, or returns nonsense, the deterministic
// line is returned unchanged. Simulation effects (trust/suspicion/memory) are
// computed elsewhere from tags, NEVER from this text.

const CACHE_LIMIT = 200;
const replyCache = new Map<string, string>();

function cacheGet(key: string): string | undefined {
  const v = replyCache.get(key);
  if (v !== undefined) {
    replyCache.delete(key);
    replyCache.set(key, v);
  }
  return v;
}

function cacheSet(key: string, val: string) {
  replyCache.set(key, val);
  if (replyCache.size > CACHE_LIMIT) {
    const first = replyCache.keys().next().value;
    if (first) replyCache.delete(first);
  }
}

function norm(x: any) {
  return typeof x === "string" ? x.trim().toLowerCase() : JSON.stringify(x || {});
}

function sanitizeOutput(text: string, maxSentences: number) {
  let t = String(text || "").trim();
  let leadingCue = "";
  const cueMatch = t.match(/^\s*\*([^*\n]{1,80})\*\s*/);
  if (cueMatch) {
    leadingCue = `*${cueMatch[1].trim()}*`;
    t = t.slice(cueMatch[0].length).trim();
  }
  t = t.replace(/^[\s\-–—]+/, "");
  t = t.replace(/^["'`""]+|["'`""]+$/g, "");
  t = t.replace(/^(assistant|system|npc|character)\s*:\s*/i, "").trim();
  t = t.replace(/^[A-Z][a-z]+:\s*/, "");
  t = t.replace(/^\(([^)]+)\)\s*/, "");
  t = t.replace(/\b(as an AI|as a language model|cannot discuss (policy|meta)|I cannot reveal)\b.*$/i, "").trim();
  const max = Math.max(1, Math.min(2, maxSentences || 2));
  const parts = t.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean).slice(0, max);
  t = parts.join(" ").trim();
  if (!t) t = "Hm. Let me sit with that.";
  return leadingCue ? `${leadingCue} ${t}` : t;
}

function isMetaOrBroken(text: string): boolean {
  const t = String(text || "").trim();
  if (!t) return true;
  if (t.length > 320) return true;
  const lower = t.toLowerCase();
  const forbidden = [
    /\bas an ai\b/, /\blanguage model\b/, /\bi am an ai\b/, /\bi'm an ai\b/,
    /\bopenai\b/, /\bchatgpt\b/, /\bprompt\b/, /\bsystem prompt\b/,
    /\bdeveloper\b/, /\bsource code\b/, /\bthis (simulation|game) is not real\b/,
  ];
  return forbidden.some(re => re.test(lower));
}

// Style rephrase guard: AI output is discarded unless it stays close to the
// deterministic line in length and is not meta. AI may only REPHRASE.
function acceptRephrase(deterministic: string, candidate: string): boolean {
  if (!candidate) return false;
  if (isMetaOrBroken(candidate)) return false;
  const dLen = deterministic.length || 1;
  const cLen = candidate.length;
  if (cLen < Math.max(8, dLen * 0.4)) return false;
  if (cLen > dLen * 2.2 + 40) return false;
  return true;
}

type GenOpts = {
  maxSentences?: number;
  maxNewTokens?: number;
  temperature?: number;
  top_p?: number;
  repetition_penalty?: number;
  seed?: number;
  signal?: AbortSignal;
};

export async function generateLocalAIReply(
  payload: {
    playerMessage: string;
    parsedInput: any;
    npc: { name: string; publicPersona?: string; psychProfile?: any; id?: string };
    tone?: string;
    socialContext?: any;
    conversationType?: "public" | "private" | "confessional" | string;
    npcPlan?: { summary?: string; followUpAction?: string; tone?: string };
    playerName?: string;
    intent?: any;
    conversationHistory?: Array<{ role: 'player' | 'npc'; text: string }>;
  },
  opts?: GenOpts
) {
  const lastTurn = payload.conversationHistory?.slice(-1)[0]?.text || '';
  const cacheKey = `${norm(payload.npc?.name)}|${norm(payload.conversationType)}|${norm(payload.tone)}|${norm(payload.parsedInput)}|${norm(payload.socialContext)}|${norm(payload.playerMessage)}|${norm(lastTurn)}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const maxSent = Math.max(1, Math.min(2, opts?.maxSentences ?? 2));

  // 1) DETERMINISTIC source of truth.
  //    Build a tag bundle and render a line entirely from authored libraries.
  let deterministic = '';
  try {
    if (payload.npc?.psychProfile && payload.playerName) {
      const npcForDecide: any = {
        id: payload.npc.id || payload.npc.name,
        name: payload.npc.name,
        publicPersona: payload.npc.publicPersona,
        psychProfile: payload.npc.psychProfile,
        memory: [],
      };
      const { text } = decideAndRender({
        npc: npcForDecide,
        playerName: payload.playerName,
        playerMessage: payload.playerMessage,
        playerTone: payload.tone,
        conversationType: (payload.conversationType as any) || 'private',
        parsedIntent: {
          topic: (payload.parsedInput?.topic) || (payload.parsedInput?.primary),
          primary: payload.parsedInput?.primary,
        },
        socialContext: payload.socialContext || {},
        conversationHistory: payload.conversationHistory,
      });
      deterministic = sanitizeOutput(text, maxSent);
    }
  } catch (e) {
    // fall through to rule-based fallback
  }

  if (!deterministic) {
    if (payload.npcPlan?.summary) {
      deterministic = sanitizeOutput(payload.npcPlan.summary, maxSent);
    } else {
      const line = generateAIResponse(payload.parsedInput, payload.npc as any, payload.playerMessage);
      deterministic = sanitizeOutput(line, maxSent);
    }
  }

  // 2) Optional AI rephrase. OFF by default. Never changes meaning.
  const styleOn = isAIStyleEnhancementEnabled();
  const cloudDisabled = import.meta.env.VITE_DISABLE_CLOUD_AI === '1';
  const cloudReachable =
    !!import.meta.env.VITE_SUPABASE_URL &&
    !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!styleOn || cloudDisabled || !cloudReachable) {
    cacheSet(cacheKey, deterministic);
    return deterministic;
  }

  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase.functions.invoke('generate-ai-reply', {
      body: {
        playerMessage: payload.playerMessage,
        npc: payload.npc,
        tone: payload.tone,
        conversationType: payload.conversationType,
        parsedInput: payload.parsedInput,
        socialContext: payload.socialContext,
        playerName: payload.playerName,
        conversationHistory: payload.conversationHistory,
        // Hint to the edge function that it is a stylistic rephraser ONLY.
        rephraseOf: deterministic,
        styleOnly: true,
      },
    });
    if (error) throw new Error(error.message || 'Edge function failed');
    if (data?.error) throw new Error(data.error);
    const candidate = sanitizeOutput(data?.generatedText || '', maxSent);
    const finalText = acceptRephrase(deterministic, candidate) ? candidate : deterministic;
    cacheSet(cacheKey, finalText);
    return finalText;
  } catch {
    cacheSet(cacheKey, deterministic);
    return deterministic;
  }
}

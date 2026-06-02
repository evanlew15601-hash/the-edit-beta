import { generateAIResponse } from "./aiResponseEngine";

// AI reply generation.
// Default: cloud AI via the `generate-ai-reply` Supabase edge function.
// Fallback: rule-based phrasing in aiResponseEngine when cloud is unreachable
// or explicitly disabled with VITE_DISABLE_CLOUD_AI=1 (mostly for tests).

// Simple LRU cache for short prompts
const CACHE_LIMIT = 200;
const replyCache = new Map<string, string>();

function cacheGet(key: string): string | undefined {
  const v = replyCache.get(key);
  if (v !== undefined) {
    // refresh LRU
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

// Normalize strings for cache keys
function norm(x: any) {
  return typeof x === "string" ? x.trim().toLowerCase() : JSON.stringify(x || {});
}

function sanitizeOutput(text: string, maxSentences: number) {
  let t = String(text || "").trim();

  // Preserve a leading *body language cue* if present (e.g. "*glances away* I dunno...").
  let leadingCue = "";
  const cueMatch = t.match(/^\s*\*([^*\n]{1,80})\*\s*/);
  if (cueMatch) {
    leadingCue = `*${cueMatch[1].trim()}*`;
    t = t.slice(cueMatch[0].length).trim();
  }

  // Strip wrapping quotes / backticks but keep natural voice intact
  t = t.replace(/^[\s\-–—]+/, "");
  t = t.replace(/^["'`""]+|["'`""]+$/g, "");

  // Drop speaker labels and parenthetical stage directions only
  t = t.replace(/^(assistant|system|npc|character)\s*:\s*/i, "").trim();
  t = t.replace(/^[A-Z][a-z]+:\s*/, "");
  t = t.replace(/^\(([^)]+)\)\s*/, "");

  // Remove meta / OOC hints
  t = t.replace(/\b(as an AI|as a language model|cannot discuss (policy|meta)|I cannot reveal)\b.*$/i, "").trim();

  const max = Math.max(1, Math.min(2, maxSentences || 2));
  const parts = t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);

  t = parts.join(" ").trim();
  if (!t) t = "Hm. Let me sit with that.";
  return leadingCue ? `${leadingCue} ${t}` : t;
}

// Lightweight validator to catch meta / obviously broken lines.
// If this flags a line, we fall back to the rule-based response.
function isMetaOrBroken(text: string): boolean {
  const t = String(text || "").trim();
  if (!t) return true;
  if (t.length > 320) return true;

  const lower = t.toLowerCase();
  const forbidden = [
    /\bas an ai\b/,
    /\blanguage model\b/,
    /\bi am an ai\b/,
    /\bi'm an ai\b/,
    /\bopenai\b/,
    /\bchatgpt\b/,
    /\bprompt\b/,
    /\bsystem prompt\b/,
    /\bdeveloper\b/,
    /\bsource code\b/,
    /\bthis (simulation|game) is not real\b/,
  ];

  return forbidden.some((re) => re.test(lower));
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

// Main API - calls Supabase edge function (Gemini via Lovable AI gateway)
export async function generateLocalAIReply(
  payload: {
    playerMessage: string;
    parsedInput: any;
    npc: { name: string; publicPersona?: string; psychProfile?: any };
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
  // Cache (exclude conversationHistory from key — it changes every turn and would defeat the cache,
  // but we also want fresh responses, so include a short hash of the last turn).
  const lastTurn = payload.conversationHistory?.slice(-1)[0]?.text || '';
  const cacheKey = `${norm(payload.npc?.name)}|${norm(payload.conversationType)}|${norm(payload.tone)}|${norm(payload.parsedInput)}|${norm(payload.socialContext)}|${norm(payload.playerMessage)}|${norm(lastTurn)}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const maxSent = Math.max(1, Math.min(2, opts?.maxSentences ?? 2));

  const localLine = () => {
    if (payload.npcPlan?.summary) {
      return sanitizeOutput(payload.npcPlan.summary, maxSent);
    }

    const npc = payload.npc as any;
    const line = generateAIResponse(payload.parsedInput, npc, payload.playerMessage);
    return sanitizeOutput(line, maxSent);
  };

  // Cloud AI is the default per the project's response-engine memory; rule-based
  // is only a fallback for offline/error cases. Disable explicitly with
  // VITE_DISABLE_CLOUD_AI=1 (mostly for tests).
  const cloudDisabled = import.meta.env.VITE_DISABLE_CLOUD_AI === '1';
  const cloudReachable =
    !!import.meta.env.VITE_SUPABASE_URL &&
    !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (cloudDisabled || !cloudReachable) {
    const cleaned = localLine();
    cacheSet(cacheKey, cleaned);
    return cleaned;
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
      },
    });

    if (error) {
      throw new Error(error.message || 'Edge function failed');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    const text = data?.generatedText || '';

    let cleaned = sanitizeOutput(text, maxSent);

    // If the cloud output is meta or otherwise broken, fall back to local.
    if (isMetaOrBroken(cleaned)) {
      cleaned = localLine();
    }

    cacheSet(cacheKey, cleaned);
    return cleaned;
  } catch (_e) {
    const cleaned = localLine();
    cacheSet(cacheKey, cleaned);
    return cleaned;
  }
}

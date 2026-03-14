import { generateAIResponse } from "./aiResponseEngine";

// AI reply generation.
// Default: local deterministic phrasing (no backend required).
// Optional: if VITE_ENABLE_CLOUD_AI=1 and Supabase env vars are present, use the edge function.

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

  // Common patterns to strip
  t = t.replace(/^[\s\-–—]+/, "");
  t = t.replace(/^[\"'""`]+|[\"'""`]+$/g, ""); // drop wrapping quotes

  // If quoted line appears inside, prefer it
  const quoted = t.match(/\\"([^\\"]{3,})\\"/);
  if (quoted) t = quoted[1];

  // Drop speaker labels, stage directions, or third-person narration prefixes
  t = t.replace(/^(assistant|system|npc)\s*:/i, "");
  t = t.replace(/^[A-Z][a-z]+:\s*/, "");
  t = t.replace(/^\(([^)]+)\)\s*/, "");
  t = t.replace(/^\*[^*]+\*\s*/, "");
  t = t.replace(/^[A-Z][a-z]+\s+(glances|stares|keeps|says|whispers|mutters|shrugs|smiles|laughs)[^.]*\.\s*/i, "");

  // Remove meta / OOC hints
  t = t.replace(/\b(as an AI|as a language model|cannot discuss (policy|meta)|I cannot reveal)\b.*$/i, "").trim();

  // Enforce first-person voice quickly by removing lingering labels/quotes
  t = t.replace(/^[\"'""]+/, "").replace(/[\"'""]+$/, "");

  // Split into sentences
  let parts = t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const max = Math.max(1, Math.min(2, maxSentences || 2));

  if (parts.length > max) {
    // Prefer sentences that actually talk about strategy or game concepts
    const strategicRegex = /\b(vote|votes|numbers|target|alliance|trust|plan|count|jury)\b/i;
    const prioritized = parts.filter((p) => strategicRegex.test(p));

    const selected: string[] = [];
    for (const p of prioritized) {
      if (selected.length >= max) break;
      selected.push(p);
    }
    for (const p of parts) {
      if (selected.length >= max) break;
      if (!selected.includes(p)) selected.push(p);
    }
    parts = selected.slice(0, max);
  }

  t = parts.join(" ");

  // Avoid empty line
  if (!t) t = "I will keep an eye on that.";

  return t.trim();
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
  },
  opts?: GenOpts
) {
  // Cache
  const cacheKey = `${norm(payload.npc?.name)}|${norm(payload.conversationType)}|${norm(payload.tone)}|${norm(payload.parsedInput)}|${norm(payload.socialContext)}|${norm(payload.playerMessage)}`;
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

  const cloudEnabled =
    import.meta.env.VITE_ENABLE_CLOUD_AI === '1' &&
    !!import.meta.env.VITE_SUPABASE_URL &&
    !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!cloudEnabled) {
    const cleaned = localLine();
    cacheSet(cacheKey, cleaned);
    return cleaned;
  }

  try {
    // Dynamically import Supabase only when cloud AI is explicitly enabled.
    const { supabase } = await import('@/integrations/supabase/client');

    const { data, error } = await supabase.functions.invoke('generate-ai-reply', {
      body: {
        playerMessage: payload.playerMessage,
        npc: payload.npc,
        tone: payload.tone,
        conversationType: payload.conversationType,
        parsedInput: payload.parsedInput,
        socialContext: payload.socialContext,
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

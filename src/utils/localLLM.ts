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
  if (forbidden.some(re => re.test(lower))) return true;

  // Catch the kind of synonym-churn output that reads like machine text rather
  // than a person in the house answering the question.
  const brokenPhrases = [
    /\bi play with accuracy\b/i,
    /\bplay with precision\b/i,
    /\bplay with that\b/i,
    /\bwith that with\b/i,
    /\bthat that\b/i,
    /\bthe the\b/i,
    /\ba functional partnership with matching incentives\b/i,
    /\bmy equity in this game\b/i,
    /\bvibe-vote\b/i,
  ];
  return brokenPhrases.some(re => re.test(t));
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
    const finalDeterministic = isMetaOrBroken(deterministic)
      ? sensibleFallback(payload, maxSent)
      : deterministic;
    cacheSet(cacheKey, finalDeterministic);
    return finalDeterministic;
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

function sensibleFallback(
  payload: {
    playerMessage: string;
    parsedInput: any;
    npc: { name: string; publicPersona?: string; psychProfile?: any; id?: string };
    tone?: string;
    conversationType?: "public" | "private" | "confessional" | string;
    playerName?: string;
  },
  maxSentences: number
) {
  const msg = (payload.playerMessage || '').toLowerCase();
  const trust = payload.npc?.psychProfile?.trustLevel ?? 0;
  const suspicion = payload.npc?.psychProfile?.suspicionLevel ?? 30;
  let line = '';

  if (payload.conversationType === 'confessional') {
    line = "I'm looking at who keeps me safe this week and who makes my game harder. That's the decision.";
  } else if (/vote|evict|target|numbers/.test(msg)) {
    line = suspicion > 60
      ? "I'm not giving you a name until I know where you stand."
      : "I hear you. If the numbers are real, I'm willing to talk about it.";
  } else if (/alliance|work together|trust|duo/.test(msg)) {
    line = trust > 40
      ? "I can work with you, but we keep it quiet and prove it with votes."
      : "I'm open to it, but I need to see consistency before I call it trust.";
  } else if (/sorry|apolog/.test(msg)) {
    line = "I appreciate you saying that. I still need to see what you do next.";
  } else if (/flirt|like you|cute|romance|showmance/.test(msg)) {
    line = "Careful. I like hearing that, but this house turns feelings into strategy fast.";
  } else {
    line = suspicion > 65
      ? "I hear what you're saying, but I'm not ready to trust it yet."
      : "That makes sense. Let me think about where it fits with the vote.";
  }

  return sanitizeOutput(line, maxSentences);
}

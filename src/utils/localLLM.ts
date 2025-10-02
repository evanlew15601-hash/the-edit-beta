import { pipeline } from "@huggingface/transformers";
import { generateAIResponse } from "./aiResponseEngine";

// Local, free LLM for in-browser replies (WebGPU/WASM). No API keys required.
// We keep the current approach and expand it with:
// - Robust model/device fallback (WebGPU -> WASM)
// - Optional caching and abort support
// - Context-aware prompt shaping (public/private/confessional)
// - Stronger post-processing to enforce first-person, concise 1–2 sentences
// - Rule-based fallback if generation fails

let generator: any | null = null;
let initPromise: Promise<any> | null = null;

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

async function ensureGenerator() {
  if (generator) return generator;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const modelIdCandidates = [
          "Qwen/Qwen2.5-0.5B-Instruct",
          "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        ];
        // Try WebGPU first
        let lastErr: any = null;
        for (const device of ["webgpu", "wasm"]) {
          for (const model of modelIdCandidates) {
            try {
              const gen = await pipeline("text-generation", model, {
                device,
                dtype: "auto",
              } as any);
              generator = gen;
              return generator;
            } catch (e) {
              lastErr = e;
              continue;
            }
          }
        }
        // If all attempts failed, propagate the last error
        throw lastErr || new Error("Failed to initialize local generator");
      } catch (e) {
        console.error("Local LLM init failed:", e);
        throw e;
      }
    })();
  }
  return initPromise;
}

// Normalize strings for cache keys
function norm(x: any) {
  return typeof x === "string" ? x.trim().toLowerCase() : JSON.stringify(x || {});
}

function sanitizeOutput(text: string, maxSentences: number) {
  let t = String(text || "").trim();

  // Common patterns to strip
  t = t.replace(/^[\s\-–—]+/, "");
  t = t.replace(/^[\"'“”`]+|[\"'“”`]+$/g, ""); // drop wrapping quotes
  // If quoted line appears inside, prefer it
  const quoted = t.match(/\\"([^\"]{3,})\\"/);
  if (quoted) t = quoted[1];

  // Drop speaker labels, stage directions, or third-person narration prefixes
  t = t.replace(/^[A-Z][a-z]+:\s*/, "");
  t = t.replace(/^\(([^)]+)\)\s*/, "");
  t = t.replace(/^\*[^*]+\*\s*/, "");
  t = t.replace(/^[A-Z][a-z]+\s+(glances|stares|keeps|says|whispers|mutters|shrugs|smiles|laughs)[^.]*\.\s*/i, "");

  // Remove meta / OOC hints
  t = t.replace(/\b(as an AI|as a language model|cannot discuss (policy|meta)|I cannot reveal)\b.*$/i, "").trim();

  // Enforce first-person voice quickly by removing lingering labels/quotes
  t = t.replace(/^[\"'“”]+/, "").replace(/[\"'“”]+$/, "");

  // Strict sentence limit
  const parts = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  t = parts.slice(0, Math.max(1, Math.min(5, maxSentences))).join(" ");

  // Avoid empty line
  if (!t) t = "I will keep an eye on that.";

  return t.trim();
}

function buildPrompt(payload: {
  playerMessage: string;
  parsedInput: any;
  npc: { name: string; publicPersona?: string; psychProfile?: any };
  tone?: string;
  socialContext?: any;
  conversationType?: "public" | "private" | "confessional" | string;
}) {
  const { playerMessage, npc, tone, conversationType, parsedInput, socialContext } = payload;
  const npcName = npc?.name ?? "Houseguest";
  const psych = npc?.psychProfile ?? {};

  const visibilityRule =
    (conversationType === "private" || conversationType === "dm")
      ? "- In private: engage with a concrete next step (a name, a number, or a test)"
      : (conversationType === "confessional")
        ? "- In a confessional: be candid and sharp, but do not reveal production mechanics"
        : "- In public: deflect briefly and avoid naming names";

  const mentions = Array.isArray(parsedInput?.namedMentions) && parsedInput.namedMentions.length
    ? parsedInput.namedMentions.join(", ")
    : "none";

  const alliances = Array.isArray(socialContext?.alliances) ? socialContext.alliances.join(", ") : "none";
  const threats = Array.isArray(socialContext?.threats) ? socialContext.threats.join(", ") : "none";
  const recent = Array.isArray(socialContext?.recentEvents) ? socialContext.recentEvents.slice(-2).join(" | ") : "";

  const system = `You are ${npcName}, a cunning contestant in The Edit Game (a high-stakes social strategy reality show).
Respond ONLY as ${npcName}. Never reveal production notes or hidden information.
Context:
- Player intent: ${parsedInput?.primary ?? "unknown"} (manipulation ${parsedInput?.manipulationLevel ?? 0})
- Dispositions: trust ${psych.trustLevel ?? 0}, suspicion ${psych.suspicionLevel ?? 0}, closeness ${psych.emotionalCloseness ?? 0}
- Mentions in player line: ${mentions}
- Alliances: ${alliances}
- Threats: ${threats}
- Recent: ${recent}
Your reply must:
- Address the player's specific content (no generic advice)
- Make a strategic choice (agree, deflect, test loyalty, set trap, seek info)
- Keep it tight: 1–2 sentences with subtext
- If pressed for secrets, deflect unless it benefits you
- Never expose info the player could not plausibly know
Style constraints:
- First-person voice only
- No third-person narration, no stage directions
- No quotes or speaker labels
- Clear diction; mild contractions allowed (keep it human, not slang-heavy)
Game talk handling:
${visibilityRule}
- Prefer specific follow-ups ("who is the target?", "how many do we have?")`;

  const user = `Player says to ${npcName}: "${playerMessage}"
Tone hint: ${tone || "neutral"} | Context: ${conversationType || "public"}
Respond strictly in-character with a concrete, situation-aware line.`;

  return `SYSTEM:
${system}

USER:
${user}

ASSISTANT:`;
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

// Main API
export async function generateLocalAIReply(
  payload: {
    playerMessage: string;
    parsedInput: any;
    npc: { name: string; publicPersona?: string; psychProfile?: any };
    tone?: string;
    socialContext?: any;
    conversationType?: "public" | "private" | "confessional" | string;
  },
  opts?: GenOpts
) {
  const prompt = buildPrompt(payload);

  // Cache
  const cacheKey = `${norm(payload.npc?.name)}|${norm(payload.conversationType)}|${norm(payload.tone)}|${norm(payload.parsedInput)}|${norm(payload.socialContext)}|${norm(payload.playerMessage)}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    await ensureGenerator();
    const gen = generator as any;

    // transformers.js supports an optional "callback_function" for streaming;
    // here we just expose abort via opts.signal by racing.
    const generation = gen(prompt, {
      max_new_tokens: Math.max(16, Math.min(256, opts?.maxNewTokens ?? 128)),
      temperature: typeof opts?.temperature === "number" ? opts.temperature : 0.7,
      top_p: typeof opts?.top_p === "number" ? opts.top_p : 0.9,
      repetition_penalty: typeof opts?.repetition_penalty === "number" ? opts.repetition_penalty : 1.1,
      do_sample: true,
      return_full_text: false,
      seed: opts?.seed,
    });

    const out = await (opts?.signal
      ? Promise.race([
          generation,
          new Promise((_, reject) => {
            const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
            if (opts.signal!.aborted) onAbort();
            else opts.signal!.addEventListener("abort", onAbort, { once: true });
          })
        ])
      : generation
    );

    let text = "";
    if (Array.isArray(out)) {
      text = (out[0]?.generated_text || out[0]?.summary_text || "").trim();
    } else if (typeof out === "object" && out) {
      text = String((out as any).generated_text || (out as any).summary_text || "").trim();
    } else if (typeof out === "string") {
      text = out.trim();
    }

    const cleaned = sanitizeOutput(text, Math.max(1, Math.min(5, opts?.maxSentences ?? 2)));
    cacheSet(cacheKey, cleaned);
    return cleaned;
  } catch (e) {
    console.warn("Local generation failed, falling back to rule-based engine:", e);
    try {
      // Fallback: use deterministic rule-based line and then sanitize to match tone constraints
      const npc = payload.npc as any;
      const line = generateAIResponse(payload.parsedInput, npc, payload.playerMessage);
      return sanitizeOutput(line, Math.max(1, Math.min(5, opts?.maxSentences ?? 2)));
    } catch (e2) {
      console.error("Fallback failed:", e2);
      return "I will consider that and keep us protected.";
    }
  }
}

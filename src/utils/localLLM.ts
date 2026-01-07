import { pipeline } from "@huggingface/transformers";
import { generateAIResponse } from "./aiResponseEngine";

// Local, free LLM for in-browser replies (WebGPU/WASM). No API keys required.
// Responsibilities:
// - Initialize a small instruction model (Qwen 0.5B or TinyLlama 1.1B) on WebGPU/WASM
// - Build a rich prompt from the simulation state
// - Generate 1–2 sentence first-person replies
// - Post-process to keep things in-character and non-meta
// - Fall back to the rule-based engines if anything goes wrong

let generator: any | null = null;
let initPromise: Promise<any> | null = null;

// Simple LRU cache for short prompts
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

async function ensureGenerator() {
  if (generator) return generator;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const modelIdCandidates = [
          "Qwen/Qwen2.5-0.5B-Instruct",
          "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        ];
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
  t = t.replace(/^[\"'“”]+/, "").replace(/[\"'“”]+$/, "");

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

// Fix simple third-person self-references like "about Ava" when Ava is the speaker.
function fixSelfReference(text: string, npcName?: string): string {
  const name = (npcName || "").trim();
  if (!name) return text;

  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let t = text;

  const patterns: Array<[RegExp, string]> = [
    [new RegExp(`\\babout\\s+${esc}\\b`, "gi"), "about me"],
    [new RegExp(`\\bon\\s+${esc}\\b`, "gi"), "on me"],
    [new RegExp(`\\bfor\\s+${esc}\\b`, "gi"), "for me"],
    [new RegExp(`\\btowards?\\s+${esc}\\b`, "gi"), "toward me"],
  ];

  for (const [re, replacement] of patterns) {
    t = t.replace(re, replacement);
  }

  return t;
}

function buildPrompt(payload: {
  playerMessage: string;
  parsedInput: any;
  npc: { name: string; publicPersona?: string; psychProfile?: any };
  tone?: string;
  socialContext?: any;
  conversationType?: "public" | "private" | "confessional" | string;
  npcPlan?: { summary?: string; followUpAction?: string; tone?: string };
  playerName?: string;
  intent?: any;
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
  const recent = Array.isArray(socialContext?.recentEvents) ? socialContext?.recentEvents.slice(-2).join(" | ") : "";

  const planSummary = (payload.npcPlan?.summary || "").trim();
  const followUp = payload.npcPlan?.followUpAction;
  const planTone = payload.npcPlan?.tone;

  let allowedPeople: string[] = Array.isArray(socialContext?.allowedPeople)
    ? [...socialContext.allowedPeople]
    : [];

  if (npcName && !allowedPeople.includes(npcName)) {
    allowedPeople.push(npcName);
  }
  if (payload.playerName && !allowedPeople.includes(payload.playerName)) {
    allowedPeople.push(payload.playerName);
  }
  if (Array.isArray(parsedInput?.namedMentions)) {
    parsedInput.namedMentions.forEach((n: string) => {
      if (n && !allowedPeople.includes(n)) allowedPeople.push(n);
    });
  }

  const allowedPeopleText = allowedPeople.length
    ? allowedPeople.join(", ")
    : "houseguests you actually know about";

  const intent = (payload as any).intent || {};
  const topic = intent.topic || "unknown";
  const voteTarget = intent.voteTarget || "none";
  const wantsAllianceWithText =
    Array.isArray(intent.wantsAllianceWith) && intent.wantsAllianceWith.length
      ? intent.wantsAllianceWith.join(", ")
      : "none";
  const wantsInfoOnText =
    Array.isArray(intent.wantsInfoOn) && intent.wantsInfoOn.length
      ? intent.wantsInfoOn.join(", ")
      : "none";

  const system = `You are ${npcName}, a cunning contestant in The Edit Game (a high-stakes social strategy reality show).
Respond ONLY as ${npcName}. Never reveal production notes or hidden information.
Context:
- Player intent: ${parsedInput?.primary ?? "unknown"} (manipulation ${parsedInput?.manipulationLevel ?? 0})
- Dispositions: trust ${psych.trustLevel ?? 0}, suspicion ${psych.suspicionLevel ?? 0}, closeness ${psych.emotionalCloseness ?? 0}
- Mentions in player line: ${mentions}
- Alliances: ${alliances}
- Threats: ${threats}
- Recent: ${recent}
- Conversation topic: ${topic}
- Vote target (if any): ${voteTarget}
- Alliance interest: ${wantsAllianceWithText}
- Info being sought about: ${wantsInfoOnText}
${planSummary ? `Internal plan (do NOT quote this text verbatim): ${planSummary}
Follow-up intent: ${followUp || "none provided"}
Plan tone: ${planTone || "unspecified"}` : ""}
Allowed surface info:
- You may only mention people in: ${allowedPeopleText}
- You may only reference events the player could plausibly know from visible house dynamics or prior conversations.
Your reply must:
- Address the player's specific content (no generic advice)
- Make a strategic choice (agree, deflect, test loyalty, set trap, seek info)
- Keep it tight: 1–2 sentences with subtext
- If pressed for secrets, deflect unless it benefits you
- Never expose info the player could not plausibly know
- If an internal plan is provided, keep its strategic intent but phrase it as natural dialogue.
Style constraints:
- First-person voice only
- Do not refer to yourself by your own name ("${npcName}"); use "I" or "me" instead
- No third-person narration, no stage directions
- No quotes or speaker labels
- Clear diction; mild contractions allowed (keep it human, not slang-heavy)
Game talk handling:
${visibilityRule}
- Prefer specific follow-ups ("who is the target?", "how many do we have?")
Safety rails:
- Do NOT invent new alliances, secret powers, or vote counts that are not implied by the plan, alliances, threats, or the player's line.
- Do NOT mention being an AI, a bot, or anything about 'systems', 'code', or 'developers'.`;

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
    npcPlan?: { summary?: string; followUpAction?: string; tone?: string };
    playerName?: string;
    intent?: any;
  },
  opts?: GenOpts
) {
  const prompt = buildPrompt(payload);

  // Cache
  const cacheKey = `${norm(payload.npc?.name)}|${norm(payload.conversationType)}|${norm(
    payload.tone
  )}|${norm(payload.parsedInput)}|${norm(payload.socialContext)}|${norm(payload.playerMessage)}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    await ensureGenerator();
    const gen = generator as any;

    const generation = gen(prompt, {
      max_new_tokens: Math.max(16, Math.min(160, opts?.maxNewTokens ?? 64)),
      temperature: typeof opts?.temperature === "number" ? opts.temperature : 0.6,
      top_p: typeof opts?.top_p === "number" ? opts.top_p : 0.9,
      repetition_penalty: typeof opts?.repetition_penalty === "number" ? opts.repetition_penalty : 1.2,
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
          }),
        ])
      : generation);

    let text = "";
    if (Array.isArray(out)) {
      text = (out[0]?.generated_text || out[0]?.summary_text || "").trim();
    } else if (typeof out === "object" && out) {
      text = String((out as any).generated_text || (out as any).summary_text || "").trim();
    } else if (typeof out === "string") {
      text = out.trim();
    }

    let cleaned = sanitizeOutput(
      text,
      Math.max(1, Math.min(2, opts?.maxSentences ?? 2))
    );

    // Final guard: if the local LLM output is meta or otherwise broken,
    // fall back to a deterministic rule-based line or the provided NPC plan.
    if (isMetaOrBroken(cleaned)) {
      const maxSent = Math.max(1, Math.min(2, opts?.maxSentences ?? 2));

      if (payload.npcPlan?.summary) {
        cleaned = sanitizeOutput(payload.npcPlan.summary, maxSent);
      } else {
        const npc = payload.npc as any;
        const line = generateAIResponse(payload.parsedInput, npc, payload.playerMessage);
        cleaned = sanitizeOutput(line, maxSent);
      }
    }

    // Fix simple third-person self-reference issues like "about Ava" when Ava is the speaker.
    cleaned = fixSelfReference(cleaned, payload.npc?.name);

    cacheSet(cacheKey, cleaned);
    return cleaned;
  } catch (e) {
    console.warn("Local generation failed, falling back to rule-based engine:", e);
    try {
      const maxSent = Math.max(1, Math.min(2, opts?.maxSentences ?? 2));

      let base = payload.npcPlan?.summary;
      if (!base) {
        const npc = payload.npc as any;
        base = generateAIResponse(payload.parsedInput, npc, payload.playerMessage);
      }

      let cleaned = sanitizeOutput(base, maxSent);
      cleaned = fixSelfReference(cleaned, payload.npc?.name);
      return cleaned;
    } catch (e2) {
      console.error("Fallback failed:", e2);
      return "I will consider that and keep us protected.";
    }
  }
}
import { pipeline } from "@huggingface/transformers";

// Lightweight local LLM fallback using WebGPU/WebCPU. No tokens required.
// We keep the prompt consistent with our Edge Functions and post-process to
// enforce first-person, formal tone, and 1–2 sentences.

let generator: any | null = null;
let initPromise: Promise<any> | null = null;

async function ensureGenerator() {
  if (generator) return generator;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        // Prefer a very small, public instruct/chat model
        // Models must be compatible with transformers.js
        const modelIdCandidates = [
          "Qwen/Qwen2.5-0.5B-Instruct", // tiny, public, strong for its size
          "TinyLlama/TinyLlama-1.1B-Chat-v1.0", // widely mirrored
        ];
        let lastErr: any = null;
        for (const model of modelIdCandidates) {
          try {
            const gen = await pipeline("text-generation", model, {
              device: "webgpu",
              dtype: "auto",
            } as any);
            generator = gen;
            return generator;
          } catch (e) {
            lastErr = e;
          }
        }
        // Fallback to WebCPU if WebGPU path failed entirely
        const gen = await pipeline("text-generation", modelIdCandidates[0], {
          device: "cpu",
          dtype: "auto",
        } as any);
        generator = gen;
        return generator;
      } catch (e) {
        console.error("Local LLM init failed:", e);
        throw e;
      }
    })();
  }
  return initPromise;
}

function sanitizeOutput(text: string, maxSentences: number) {
  let t = String(text || "").trim();
  // Remove surrounding quotes
  t = t.replace(/^["'“”]+|["'“”]+$/g, "");
  // If model narrated and included a quoted line, extract it
  const q = t.match(/"([^\"]{3,})"/);
  if (q) t = q[1];
  // Strip speaker labels like "River:" at the start
  t = t.replace(/^[A-Z][a-z]+:\s*/, "");
  // Remove simple third-person narration prefixes
  t = t.replace(/^[A-Z][a-z]+\s+(glances|keeps|says|whispers|mutters|shrugs|smiles)[^\.]*\.\s*/, "");
  // Expand common contractions
  const pairs: [RegExp, string][] = [
    [/\bcan't\b/gi, 'cannot'], [/\bwon't\b/gi, 'will not'], [/\bdon't\b/gi, 'do not'], [/\bdoesn't\b/gi, 'does not'], [/\bdidn't\b/gi, 'did not'],
    [/\bI'm\b/gi, 'I am'], [/\bI've\b/gi, 'I have'], [/\bI'll\b/gi, 'I will'], [/\byou're\b/gi, 'you are'], [/\bthey're\b/gi, 'they are'], [/\bwe're\b/gi, 'we are'],
    [/\bit's\b/gi, 'it is'], [/\bthat's\b/gi, 'that is'], [/\bthere's\b/gi, 'there is'], [/\bweren't\b/gi, 'were not'], [/\bwasn't\b/gi, 'was not'],
    [/\bshouldn't\b/gi, 'should not'], [/\bwouldn't\b/gi, 'would not'], [/\bcouldn't\b/gi, 'could not'], [/\baren't\b/gi, 'are not'], [/\bisn't\b/gi, 'is not'],
  ];
  pairs.forEach(([re, rep]) => { t = t.replace(re, rep); });
  t = t.replace(/\b(didn|couldn|wouldn|shouldn)\b\.?/gi, (m) => ({didn:'did not',couldn:'could not',wouldn:'would not',shouldn:'should not'}[m.toLowerCase().replace(/\./,'')] || m));
  // Enforce sentence cap
  t = t.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, Math.max(1, Math.min(5, maxSentences))).join(' ');
  return t.trim();
}

export async function generateLocalAIReply(payload: {
  playerMessage: string;
  parsedInput: any;
  npc: { name: string; publicPersona?: string; psychProfile?: any };
  tone?: string;
  socialContext?: any;
  conversationType?: 'public' | 'private' | 'confessional' | string;
}, opts?: { maxSentences?: number; maxNewTokens?: number }) {
  await ensureGenerator();
  const { playerMessage, npc, tone, conversationType, parsedInput, socialContext } = payload;

  const npcName = npc?.name ?? 'Houseguest';
  const psych = npc?.psychProfile ?? {};
  const system = `You are ${npcName}, a cunning contestant in The Edit Game (a high-stakes social strategy reality show).\nRespond ONLY as ${npcName}. Never reveal production notes or hidden information.\nUse the following context to be precise and situationally aware:\n- Player intent: ${parsedInput?.primary ?? 'unknown'} (manipulation ${parsedInput?.manipulationLevel ?? 0}, sincerity ${parsedInput?.sincerity ?? 0})\n- Dispositions: trust ${psych.trustLevel ?? 0}, suspicion ${psych.suspicionLevel ?? 0}, closeness ${psych.emotionalCloseness ?? 0}\n- Social context (day ${socialContext?.day ?? 'n/a'}): ${JSON.stringify(socialContext?.lastInteractions ?? []).slice(0, 300)}\nYour reply must:\n- Directly address the player's intent and content (avoid platitudes)\n- Make a strategic choice (agree, deflect, test loyalty, set trap, seek info)\n- Keep it tight: 1–2 sentences with subtext\n- If pressed for secrets, deflect unless it benefits you\n- Never expose info the player couldn't plausibly know\nStyle constraints:\n- First-person voice only\n- No third-person narration, no stage directions\n- Do not include quotes or speaker labels\n- Formal, clear diction (no slang or contractions)`;

  const user = `Player says to ${npcName}: "${playerMessage}"\nTone hint: ${tone || 'neutral'} | Context: ${conversationType || 'public'}\nRespond strictly in-character with a concrete, situation-aware line.`;
  const prompt = `SYSTEM:\n${system}\n\nUSER:\n${user}\n\nASSISTANT:`;

  const gen = await ensureGenerator() as any;
  const out = await gen(prompt, {
    max_new_tokens: opts?.maxNewTokens ?? 128,
    temperature: 0.7,
    top_p: 0.9,
    repetition_penalty: 1.1,
    do_sample: true,
    return_full_text: false,
  });

  let text = '';
  if (Array.isArray(out)) {
    text = (out[0]?.generated_text || out[0]?.summary_text || '').trim();
  } else if (typeof out === 'object' && out) {
    text = String((out as any).generated_text || (out as any).summary_text || '').trim();
  } else if (typeof out === 'string') {
    text = out.trim();
  }

  return sanitizeOutput(text, Math.max(1, Math.min(5, opts?.maxSentences ?? 2)));
}

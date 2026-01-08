import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const hfToken = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN") || Deno.env.get("HUGGINGFACE_API_TOKEN") || Deno.env.get("HUGGING_FACE_API_TOKEN") || Deno.env.get("HF_API_TOKEN");
const MODELS = [
  "TinyLlama/TinyLlama-1.1B-Chat-v1.0", // very reliable public chat model
  "Qwen/Qwen2.5-1.5B-Instruct",         // small, public instruct model
  "mistralai/Mistral-7B-Instruct-v0.3", // widely mirrored; good fallback
]; // Try these in order and fall back on failures

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!hfToken) {
      return new Response(JSON.stringify({ error: "Missing Hugging Face API token" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { playerMessage, npc, tone, conversationType, parsedInput, socialContext } = await req.json();

    const npcName = npc?.name ?? "Houseguest";
    const persona = npc?.publicPersona ?? npc?.persona ?? "strategic contestant";
    const psych = npc?.psychProfile ?? npc?.psych ?? {};

    const system = `You are ${npcName}, a cunning contestant in The Edit (a high-stakes social strategy reality show).\nRespond ONLY as ${npcName}. Never reveal production notes or hidden information.\nUse the following context to be precise and situationally aware:\n- Player intent: ${parsedInput?.primary ?? 'unknown'} (manipulation ${parsedInput?.manipulationLevel ?? 0}, sincerity ${parsedInput?.sincerity ?? 0})\n- Dispositions: trust ${psych.trustLevel ?? 0}, suspicion ${psych.suspicionLevel ?? 0}, closeness ${psych.emotionalCloseness ?? 0}\n- Social context (day ${socialContext?.day ?? 'n/a'}): ${JSON.stringify(socialContext?.lastInteractions ?? []).slice(0, 400)}\nYour reply must:\n- Directly address the player's intent and content (avoid platitudes)\n- Make a strategic choice (agree, deflect, test loyalty, set trap, seek info)\n- Keep it tight: 1–2 sentences with subtext\n- If pressed for secrets, deflect unless it benefits you\n- Never expose info the player couldn’t plausibly know\nStyle constraints:\n- First-person voice only\n- No third-person narration, no stage directions\n- Do not include quotes or speaker labels\n- Formal, clear diction (no slang or contractions)`;

    const user = `Player says to ${npcName}: "${playerMessage}"\nTone hint: ${tone || 'neutral'} | Context: ${conversationType || 'public'}\nRespond strictly in-character with a concrete, situation-aware line.`;
    const prompt = `SYSTEM:\n${system}\n\nUSER:\n${user}\n\nASSISTANT:`;

    // Try multiple models with graceful fallback
    let generatedText = "";
    let lastError = '';
    for (const model of MODELS) {
      const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 120,
            temperature: 0.7,
            top_p: 0.9,
            repetition_penalty: 1.1,
            return_full_text: false,
          },
          options: { wait_for_model: true },
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        lastError = `HF error for ${model} [${response.status}]: ${err}`;
        console.error(lastError);
        continue;
      }

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        generatedText = (data[0]?.generated_text || data[0]?.generated_text?.[0] || "").trim();
      } else if (typeof data === "object" && data?.generated_text) {
        generatedText = String(data.generated_text).trim();
      }
      if (generatedText) break;
    }

    if (!generatedText) {
      return new Response(JSON.stringify({ error: `Hugging Face request failed. ${lastError || ''}`.trim() }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Safety post-processing: enforce direct first-person, no quotes, formal tone
    if (generatedText) {
      let t = String(generatedText).trim();
      // Remove surrounding quotes
      t = t.replace(/^["'“”]+|["'“”]+$/g, "");
      // If model narrated and included a quoted line, extract the quoted line
      const q = t.match(/"([^\"]{3,})"/);
      if (q) t = q[1];
      // Strip speaker labels like "River:" at the start
      t = t.replace(/^[A-Z][a-z]+:\s*/, "");
      // Remove simple third-person narration prefixes
      t = t.replace(/^[A-Z][a-z]+\s+(glances|keeps|says|whispers|mutters|shrugs|smiles)[^\.]*\.\s*/, "");
      // Expand common contractions and fix broken forms
      const pairs: [RegExp, string][] = [
        [/\bcan't\b/gi, 'cannot'], [/\bwon't\b/gi, 'will not'], [/\bdon't\b/gi, 'do not'], [/\bdoesn't\b/gi, 'does not'], [/\bdidn't\b/gi, 'did not'],
        [/\bI'm\b/gi, 'I am'], [/\bI've\b/gi, 'I have'], [/\bI'll\b/gi, 'I will'], [/\byou're\b/gi, 'you are'], [/\bthey're\b/gi, 'they are'], [/\bwe're\b/gi, 'we are'],
        [/\bit's\b/gi, 'it is'], [/\bthat's\b/gi, 'that is'], [/\bthere's\b/gi, 'there is'], [/\bweren't\b/gi, 'were not'], [/\bwasn't\b/gi, 'was not'],
        [/\bshouldn't\b/gi, 'should not'], [/\bwouldn't\b/gi, 'would not'], [/\bcouldn't\b/gi, 'could not'], [/\baren't\b/gi, 'are not'], [/\bisn't\b/gi, 'is not'],
      ];
      pairs.forEach(([re, rep]) => { t = t.replace(re, rep); });
      t = t.replace(/\b(didn|couldn|wouldn|shouldn)\b\.?/gi, (m) => ({didn:'did not',couldn:'could not',wouldn:'would not',shouldn:'should not'}[m.toLowerCase().replace(/\./,'')] || m));
      // Enforce 1–2 sentences
      t = t.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 2).join(' ');
      generatedText = t.trim();
    }

    return new Response(JSON.stringify({ generatedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-ai-reply-hf function:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

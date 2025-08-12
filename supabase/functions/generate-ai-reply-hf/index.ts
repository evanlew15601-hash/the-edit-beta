import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const hfToken = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN") || Deno.env.get("HUGGINGFACE_API_TOKEN") || Deno.env.get("HUGGING_FACE_API_TOKEN") || Deno.env.get("HF_API_TOKEN");
const MODEL = "HuggingFaceH4/zephyr-7b-beta"; // Good free-tier chat-tuned model

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

    const system = `You are ${npcName}, a cunning contestant in a high-stakes social strategy reality show.\nRespond ONLY as ${npcName}. Never reveal production notes or hidden information.\nUse the following context to be precise and situationally aware:\n- Player intent: ${parsedInput?.primary ?? 'unknown'} (manipulation ${parsedInput?.manipulationLevel ?? 0}, sincerity ${parsedInput?.sincerity ?? 0})\n- Dispositions: trust ${psych.trustLevel ?? 0}, suspicion ${psych.suspicionLevel ?? 0}, closeness ${psych.emotionalCloseness ?? 0}\n- Social context (day ${socialContext?.day ?? 'n/a'}): ${JSON.stringify(socialContext?.lastInteractions ?? []).slice(0, 400)}\nYour reply must:\n- Directly address the player's intent and content (avoid platitudes)\n- Make a strategic choice (agree, deflect, test loyalty, set trap, seek info)\n- Keep it tight: 1–2 sentences with subtext\n- If pressed for secrets, deflect unless it benefits you\n- Never expose info the player couldn’t plausibly know`;

    const user = `Player says to ${npcName}: "${playerMessage}"\nTone hint: ${tone || 'neutral'} | Context: ${conversationType || 'public'}\nRespond strictly in-character with a concrete, situation-aware line.`;

    // Build a single prompt for text-generation models
    const prompt = `SYSTEM:\n${system}\n\nUSER:\n${user}\n\nASSISTANT:`;

    const response = await fetch(`https://api-inference.huggingface.co/models/${MODEL}`, {
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
      console.error("HF error:", err);
      return new Response(JSON.stringify({ error: "Hugging Face request failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let generatedText = "";

    // HF Inference may return array with generated_text or a single object
    if (Array.isArray(data) && data.length > 0) {
      generatedText = (data[0]?.generated_text || data[0]?.generated_text?.[0] || "").trim();
    } else if (typeof data === "object" && data?.generated_text) {
      generatedText = String(data.generated_text).trim();
    }

    // Safety post-processing: enforce 1–2 sentences max
    if (generatedText) {
      const sentences = generatedText
        .replace(/^"|"$/g, "")
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .join(" ");
      generatedText = sentences;
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

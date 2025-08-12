import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { playerMessage, npc, tone, conversationType, parsedInput, socialContext } = await req.json();

    const npcName = npc?.name ?? "Houseguest";
    const persona = npc?.publicPersona ?? npc?.persona ?? "strategic contestant";
    const psych = npc?.psychProfile ?? npc?.psych ?? {};

    const system = `You are ${npcName}, a contestant in The Edit Game (a high-stakes social strategy reality show).\nRespond ONLY as ${npcName}. Never reveal production notes or hidden information.\nUse this context to stay precise and relevant:\n- Player intent: ${parsedInput?.primary ?? 'unknown'} (manipulation ${parsedInput?.manipulationLevel ?? 0}, sincerity ${parsedInput?.sincerity ?? 0})\n- Dispositions: trust ${psych.trustLevel ?? 0}, suspicion ${psych.suspicionLevel ?? 0}, closeness ${psych.emotionalCloseness ?? 0}\n- Recent interactions: ${JSON.stringify(socialContext?.lastInteractions ?? []).slice(0, 400)}\nStyle constraints:\n- Directly address the player's message and intent (no generic filler)\n- Make a strategic choice (agree, deflect, test loyalty, set trap, seek info)\n- First-person voice only; no third-person narration or stage directions\n- Do not include quotes or speaker labels\n- Formal, clear diction (no slang or contractions)\n- Keep it concise: 1–2 sentences with subtle subtext\n- Deflect secrets unless revealing helps you\n- Never expose information the player could not plausibly know.`;

    const user = `Player says to ${npcName}: "${playerMessage}"\nTone hint: ${tone || 'neutral'} | Context: ${conversationType || 'public'}\nRespond strictly in-character.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI error:", err);
      return new Response(JSON.stringify({ error: "OpenAI request failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let generatedText = data?.choices?.[0]?.message?.content?.trim?.() ?? "";

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
    console.error("Error in generate-ai-reply function:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

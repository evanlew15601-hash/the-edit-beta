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

    const { playerMessage, npc, tone, conversationType } = await req.json();

    const npcName = npc?.name ?? "Houseguest";
    const persona = npc?.publicPersona ?? npc?.persona ?? "strategic contestant";
    const psych = npc?.psychProfile ?? npc?.psych ?? {};

    const system = `You are ${npcName}, a contestant in a high-stakes social strategy reality show.
Respond ONLY as ${npcName}. Do not reveal production notes or hidden information.
Your reply should:
- Be natural, strategic, and consistent with your persona: ${persona}.
- Consider your dispositions and state (trust ${psych.trustLevel ?? 0}, suspicion ${psych.suspicionLevel ?? 0}, closeness ${psych.emotionalCloseness ?? 0}).
- Match the context: ${conversationType || "public"} chat, tone hint: ${tone || "neutral"}.
- Do NOT repeat the player's message and do NOT echo prompts.
- Keep it concise: 1–2 sentences, optionally with subtle subtext.
- If asked for secrets, deflect unless it benefits you.
- Never expose information the player couldn’t plausibly know.`;

    const user = `Player says to ${npcName}: "${playerMessage}"\nRespond strictly in-character.`;

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
    const generatedText = data?.choices?.[0]?.message?.content?.trim?.() ?? "";

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

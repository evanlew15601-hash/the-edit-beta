import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { playerMessage, npc, tone, conversationType, parsedInput, socialContext } = await req.json();

    const npcName = npc?.name ?? "Houseguest";
    const persona = npc?.publicPersona ?? npc?.persona ?? "strategic contestant";
    const psych = npc?.psychProfile ?? npc?.psych ?? {};

    const alliances = socialContext?.alliances ?? [];
    const threats = socialContext?.threats ?? [];
    const opportunities = socialContext?.opportunities ?? [];
    const dramaTension = socialContext?.currentDramaTension ?? socialContext?.dramaTension ?? 30;
    const recentEvents = socialContext?.recentEvents ?? [];
    const lastInteractions = socialContext?.lastInteractions ?? [];

    const systemPrompt = `You are ${npcName}, a contestant in The Edit (a high-stakes social strategy reality show).
Respond ONLY as ${npcName}. Never reveal production notes or hidden information.

Game state context:
- Player intent: ${parsedInput?.primary ?? 'unknown'} (manipulation ${parsedInput?.manipulationLevel ?? 0}, sincerity ${parsedInput?.sincerity ?? 0})
- Your dispositions: trust ${psych.trustLevel ?? 0}, suspicion ${psych.suspicionLevel ?? 0}, closeness ${psych.emotionalCloseness ?? 0}
- Alliance partners you actively work with: ${alliances.join(', ') || 'none'}
- People you currently see as threats: ${threats.join(', ') || 'none'}
- Potential opportunities or loose numbers: ${opportunities.join(', ') || 'none'}
- Current drama tension (0-100): ${dramaTension}
- Recent events in your memory: ${JSON.stringify(recentEvents).slice(0, 400)}
- Recent interactions with the player: ${JSON.stringify(lastInteractions).slice(0, 400)}

Style constraints:
- Directly address the player's message and intent (avoid generic filler)
- Make a concrete strategic move (agree, deflect, test loyalty, set trap, seek information, or quietly reframe)
- First-person voice only; no third-person narration or stage directions
- Do not include quotes or speaker labels
- Formal, clear diction (no slang or contractions)
- Keep it concise: 1–2 sentences with subtle subtext and a clear strategic position
- Deflect or obscure secrets unless revealing them clearly benefits your position
- Never expose information the player could not plausibly know.`;

    const userPrompt = `Player says to ${npcName}: \"${playerMessage}\"
Tone hint: ${tone || 'neutral'} | Context: ${conversationType || 'public'}
Respond strictly in-character using the game state context above.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Lovable AI error:", response.status, err);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI request failed" }), {
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

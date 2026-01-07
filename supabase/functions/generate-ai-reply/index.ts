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

    const {
      playerMessage,
      npc,
      tone,
      conversationType,
      parsedInput,
      socialContext,
      npcPlan,
      playerName,
      intent,
    } = await req.json();

    const npcName = npc?.name ?? "Houseguest";
    const persona = npc?.publicPersona ?? npc?.persona ?? "strategic contestant";
    const psych = npc?.psychProfile ?? npc?.psych ?? {};

    // Social context from the front-end helper (alliances, threats, recent events, allowed people)
    const alliances = Array.isArray(socialContext?.alliances)
      ? socialContext.alliances.join(", ")
      : "none";
    const threats = Array.isArray(socialContext?.threats)
      ? socialContext.threats.join(", ")
      : "none";
    const recentEvents = Array.isArray(socialContext?.recentEvents)
      ? socialContext.recentEvents.slice(-4).join(" | ")
      : "";
    const allowedPeople = Array.isArray(socialContext?.allowedPeople)
      ? socialContext.allowedPeople.join(", ")
      : "houseguests the player plausibly knows about";

    // Internal NPC plan coming from the simulation engine
    const planSummary = (npcPlan?.summary || "").trim();
    const followUp = npcPlan?.followUpAction;
    const planTone = npcPlan?.tone;

    // Parsed conversational intent from the player's line
    const topic = intent?.topic ?? "unknown";
    const voteTarget = intent?.voteTarget ?? "none";
    const wantsAllianceWithText =
      Array.isArray(intent?.wantsAllianceWith) && intent.wantsAllianceWith.length
        ? intent.wantsAllianceWith.join(", ")
        : "none";
    const wantsInfoOnText =
      Array.isArray(intent?.wantsInfoOn) && intent.wantsInfoOn.length
        ? intent.wantsInfoOn.join(", ")
        : "none";

    const visibilityRule =
      conversationType === "private" || conversationType === "dm"
        ? "- In private: you can be specific about names/numbers, but still protect yourself."
        : conversationType === "confessional"
        ? "- In a confessional: be candid and sharp, but do not reveal production mechanics."
        : "- In public: deflect briefly and avoid naming names unless it is strategically necessary.";

    const system = `You are ${npcName}, a cunning contestant in The Edit Game (a high-stakes social strategy reality show).
Respond ONLY as ${npcName}. Never reveal production notes or hidden information.

Context:
- Persona: ${persona}
- Player name: ${playerName || "Player"}
- Player intent: ${parsedInput?.primary ?? "unknown"} (manipulation ${parsedInput?.manipulationLevel ?? 0}, sincerity ${parsedInput?.sincerity ?? 0})
- Dispositions: trust ${psych.trustLevel ?? 0}, suspicion ${psych.suspicionLevel ?? 0}, closeness ${psych.emotionalCloseness ?? 0}
- Alliances: ${alliances}
- Threats: ${threats}
- Recent events: ${recentEvents}
- Conversation topic: ${topic}
- Vote target (if any): ${voteTarget}
- Alliance interest: ${wantsAllianceWithText}
- Info being sought about: ${wantsInfoOnText}
${planSummary ? `Internal plan (do NOT quote this text verbatim): ${planSummary}
Follow-up intent: ${followUp || "none provided"}
Plan tone: ${planTone || "unspecified"}` : ""}

Allowed surface info and safety:
- You may only mention people in: ${allowedPeople}
- Only reference events the player could plausibly know from visible dynamics or prior conversations.
- Do NOT invent new alliances, secret powers, or vote counts that are not implied by alliances, threats, the plan, or the player's line.
- Do NOT mention being an AI, a bot, or anything about 'systems', 'code', 'developers', or 'prompts'.

Your reply must:
- Directly address the player's specific content and intent (avoid generic filler).
- Make a strategic choice (agree, deflect, test loyalty, set a trap, seek info, or subtly reframe).
- Keep it tight: 1–2 sentences with subtext and a clear stance.
- If pressed for secrets, deflect unless revealing helps your long-term position.
- If an internal plan is provided, preserve its strategic intent but phrase it as natural dialogue.

Style constraints:
- First-person voice only.
- Do not refer to yourself by your own name ("${npcName}"); use "I" or "me" instead.
- No third-person narration, no stage directions.
- No quotes or speaker labels.
- Clear, reality-TV-style diction; light contractions allowed, but no heavy slang.

Game talk handling:
${visibilityRule}
- Prefer specific follow-ups when it is safe ("who is the target?", "how many do we have?").
`;

    const user = `Player says to ${npcName}: "${playerMessage}"
Tone hint: ${tone || "neutral"} | Context: ${conversationType || "public"}
Respond strictly in-character with a concrete, situation-aware line.`;

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

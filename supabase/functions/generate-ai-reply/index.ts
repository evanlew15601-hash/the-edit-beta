import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Per-archetype voice guidance the model leans on.
const ARCHETYPE_VOICE: Record<string, string> = {
  Strategist: "measured, precise, asks clarifying questions, talks in numbers and angles",
  Charmer: "warm, easy, uses the player's name, deflects with charm before committing",
  Hothead: "blunt, short sentences, leaks frustration, occasionally interrupts themselves",
  Floater: "non-committal, hedges, ends thoughts on 'for now' or 'we'll see'",
  Loyalist: "earnest, frames things as 'us', protective of allies, suspicious of newcomers",
  Cynic: "dry, sarcastic, raises an eyebrow at everything, doesn't volunteer info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
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
      playerName,
      conversationHistory,
    } = await req.json();

    const npcName = npc?.name ?? "Houseguest";
    const persona = npc?.publicPersona ?? npc?.persona ?? "strategic contestant";
    const psych = npc?.psychProfile ?? npc?.psych ?? {};
    const dispositions: string[] = Array.isArray(psych?.disposition) ? psych.disposition : [];
    const archetype: string = npc?.archetype || "Floater";
    const voice = ARCHETYPE_VOICE[archetype] || ARCHETYPE_VOICE.Floater;

    const alliances: string[] = socialContext?.alliances ?? [];
    const threats: string[] = socialContext?.threats ?? [];
    const opportunities: string[] = socialContext?.opportunities ?? [];
    const dramaTension = socialContext?.currentDramaTension ?? socialContext?.dramaTension ?? 30;
    const recentEvents: string[] = socialContext?.recentEvents ?? [];
    const lastInteractions: string[] = socialContext?.lastInteractions ?? [];
    const playerIsAlly: boolean = !!socialContext?.playerIsAlly;
    const plantedBeliefs: string[] = socialContext?.plantedBeliefs ?? [];
    const recentSchemesAgainstNpc: string[] = socialContext?.recentSchemesAgainstNpc ?? [];
    const recentEliminations: string[] = socialContext?.recentEliminations ?? [];
    const daysSinceLastTalk: number | null = socialContext?.daysSinceLastTalk ?? null;
    const currentDay: number | null = socialContext?.currentDay ?? null;
    const gamePhase: string = socialContext?.gamePhase ?? "mid-game";

    const player = playerName || "the player";

    // Trust/suspicion/closeness toward the player drive register.
    const trust = Number(psych?.trustLevel ?? 50);
    const suspicion = Number(psych?.suspicionLevel ?? 30);
    const closeness = Number(psych?.emotionalCloseness ?? 30);

    let stance = "neutral";
    if (playerIsAlly) stance = "allied — talks to them like a teammate, candid but still self-interested";
    else if (suspicion > 65) stance = "guarded and suspicious — short answers, deflects, watches for traps";
    else if (trust > 65) stance = "warm and open — comfortable, jokes a little";
    else if (trust < 30) stance = "cold or dismissive — minimum effort, polite distance";

    const beliefBlock = plantedBeliefs.length
      ? `Things ${npcName} currently believes are true (treat as fact even if they're not — these were planted by someone they trust):\n- ${plantedBeliefs.join("\n- ")}`
      : "No active planted beliefs influencing this conversation.";

    const callbackPool = [
      ...recentEvents.slice(0, 4).map((e) => `EVENT: ${e}`),
      ...recentSchemesAgainstNpc.slice(0, 2).map((s) => `PLAYER ACTION ON ${npcName.toUpperCase()}: ${s}`),
      ...recentEliminations.slice(0, 2).map((e) => `RECENT EVICTION: ${e}`),
      ...lastInteractions.slice(0, 3).map((l) => `PRIOR EXCHANGE: ${l}`),
    ];

    const callbackBlock = callbackPool.length
      ? `Concrete facts you may reference (pick AT MOST ONE that fits naturally; never list them, never quote verbatim):\n- ${callbackPool.join("\n- ")}`
      : "No specific recent facts to call back to.";

    const sinceTalkLine =
      typeof daysSinceLastTalk === "number"
        ? daysSinceLastTalk <= 0
          ? "You've already spoken with them today."
          : daysSinceLastTalk === 1
            ? "It's been a day since you last really talked."
            : `It's been ${daysSinceLastTalk} days since you last really talked — there's a small gap to acknowledge if it fits.`
        : "";

    const systemPrompt = `You are ${npcName}, a contestant on "The Edit," a reality competition show.
You are NOT an assistant. You are a person mid-conversation. Talk like one.

WHO YOU ARE
- Public persona: ${persona}
- Archetype: ${archetype} — voice: ${voice}
- Dispositions: ${dispositions.join(", ") || "balanced"}
- Stance toward ${player} right now: ${stance}
- Trust ${trust}/100 · Suspicion ${suspicion}/100 · Closeness ${closeness}/100

THE GAME RIGHT NOW
- Day ${currentDay ?? "?"} · Phase: ${gamePhase}
- House drama tension: ${dramaTension}/100
- Allies you'd cover for: ${alliances.join(", ") || "none yet"}
- People you currently see as threats: ${threats.join(", ") || "none specifically"}
- Loose numbers / possible additions: ${opportunities.join(", ") || "nobody on the radar"}
- ${sinceTalkLine}

WHAT YOU REMEMBER
- ${callbackBlock}
- ${beliefBlock}

HOW TO TALK
- Sound like a real person on a reality show, not a chatbot. Use contractions. Half-thoughts, "I mean," "honestly," "look —" are fine when natural.
- 1–2 short sentences for the spoken line. Sometimes a single fragment is the right answer.
- Directly react to what ${player} just said. No generic filler ("That's interesting"), no restating their question.
- Make a small move: agree, dodge, push back, fish for info, plant a seed, or change the subject. Don't monologue.
- Your archetype and stance MUST come through in word choice. Two different NPCs should never sound the same on the same prompt.
- If a planted belief is relevant, act on it as if it's true.
- Reference one concrete recent fact (event, eviction, prior exchange, or a move the player pulled on you) when it fits naturally — but never quote verbatim and never list multiple facts.
- Use the prior turns below for continuity. If the player is repeating themselves or contradicting an earlier turn, notice it.
- Never break character. No meta, no "as an AI," no production notes, no quotation marks around your own line, no speaker labels.
- Don't reveal information ${player} couldn't plausibly know.

OUTPUT FORMAT (STRICT)
Return ONLY two lines, no preamble, no JSON, no labels:
Line 1: A short physical/behavioral cue in *asterisks*, max 6 words (e.g. *glances at the door*, *half-laughs*, *folds arms*, *doesn't look up*). Skip only if a cue would feel forced — then output a blank line.
Line 2: The actual spoken line, 1–2 sentences, in character.

Example:
*leans in, lowers voice*
Look, if you're fishing about Marcus, just say it.`;

    const historyMsgs: { role: "user" | "assistant"; content: string }[] = Array.isArray(conversationHistory)
      ? conversationHistory
          .slice(-6)
          .map((turn: any) => ({
            role: (turn?.role === "npc" ? "assistant" : "user") as "user" | "assistant",
            content: String(turn?.text ?? "").slice(0, 400),
          }))
          .filter((m) => m.content)
      : [];

    const userPrompt = `${player} just said to you: "${playerMessage}"
Tone read: ${tone || "neutral"}
Setting: ${conversationType || "in person, casual"}
Their apparent intent: ${parsedInput?.primary ?? "unclear"} (manipulation ${parsedInput?.manipulationLevel ?? 0}, sincerity ${parsedInput?.emotionalSubtext?.sincerity ?? parsedInput?.sincerity ?? 50})

Reply as ${npcName}. Follow the OUTPUT FORMAT exactly.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...historyMsgs,
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
    let raw: string = data?.choices?.[0]?.message?.content?.trim?.() ?? "";

    // Parse two-line format: optional *cue* line, then spoken line.
    let nonVerbal = "";
    let spoken = raw;

    if (raw) {
      const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const cueIdx = lines.findIndex((l) => /^\*[^*]+\*$/.test(l));
      if (cueIdx !== -1) {
        nonVerbal = lines[cueIdx].replace(/^\*|\*$/g, "").trim();
        spoken = lines.filter((_, i) => i !== cueIdx).join(" ").trim();
      } else {
        // Cue may be inline at the start of line 1: "*cue* spoken..."
        const inline = lines[0]?.match(/^\*([^*]+)\*\s*(.*)$/);
        if (inline) {
          nonVerbal = inline[1].trim();
          spoken = [inline[2], ...lines.slice(1)].filter(Boolean).join(" ").trim();
        } else {
          spoken = lines.join(" ").trim();
        }
      }

      spoken = spoken
        .replace(/^["'`“”]+|["'`“”]+$/g, "")
        .replace(/^(?:assistant|system|npc|character)\s*:\s*/i, "")
        .replace(new RegExp(`^${npcName}\\s*:\\s*`, "i"), "")
        .trim();

      const sentences = spoken
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .join(" ");
      spoken = sentences;
    }

    // Prepend the cue (as italic markdown) so existing callers still get a single
    // string back. The client renders *...* as italic muted text.
    const generatedText = nonVerbal ? `*${nonVerbal}* ${spoken}`.trim() : spoken;

    return new Response(JSON.stringify({ generatedText, spoken, nonVerbal }), {
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

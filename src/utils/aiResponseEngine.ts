// AI-Driven Response Engine for The Edit
import { Contestant } from '@/types/game';
import { SpeechAct } from './speechActClassifier';

export type NPCPersonalityBias = {
  trustfulness: number; // 0-100
  suspiciousness: number; // 0-100
  emotionalVolatility: number; // 0-100
  manipulationDetection: number; // 0-100
  loyaltyLevel: number; // 0-100
  revengefulness: number; // 0-100
};

// Archetype-driven tone system
export type Archetype = 'Strategist' | 'Charmer' | 'Hothead' | 'Floater' | 'Loyalist' | 'Cynic';

export function deriveArchetype(npc: Contestant): Archetype {
  const persona = (npc.publicPersona || '').toLowerCase();
  const disp = (npc.psychProfile?.disposition || []).map((d: string) => d.toLowerCase());

  if (/strateg|calculat/.test(persona)) return 'Strategist';
  if (/charm|flirt|social/.test(persona)) return 'Charmer';
  if (/hothead|fiery|aggress/.test(persona)) return 'Hothead';
  if (/floater|under the radar|quiet/.test(persona)) return 'Floater';
  if (/loyal|protector|honou?r/.test(persona)) return 'Loyalist';
  if (/cynic|skeptic|sarcastic/.test(persona)) return 'Cynic';

  if (disp.includes('calculating')) return 'Strategist';
  if (disp.includes('charming')) return 'Charmer';
  if (disp.includes('emotional')) return 'Hothead';
  if (disp.includes('loyal')) return 'Loyalist';
  if (disp.includes('paranoid')) return 'Cynic';
  return 'Floater';
}

// Light cleanup that preserves natural voice (contractions, fillers).
// Use this for the rule-based fallback so it doesn't sound robotic.
export function humanize(text: string): string {
  let t = String(text || '').trim();
  // Strip wrapping quotes / stage directions only
  t = t.replace(/^["'`""]+|["'`""]+$/g, '');
  t = t.replace(/^\*[^*]+\*\s*/g, '');
  t = t.replace(/\bAs an AI\b.*$/i, '');
  // Smart-quote normalization
  t = t.replace(/[""]/g, '"').replace(/['']/g, "'");
  // Collapse whitespace
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t;
}

// Legacy: kept for any caller still expecting the old formal sanitizer.
// New code should call `humanize` instead.
export function sanitizeAndFormalize(text: string): string {
  return humanize(text);
}

// Persona-flavored variants for the rule-based fallback so two NPCs with
// different archetypes don't say the exact same line.
const ARCHETYPE_FLAVOR: Record<Archetype, (line: string) => string> = {
  Strategist: (s) => s,
  Charmer: (s) => /[?!.]$/.test(s) ? s : `${s}.`,
  Hothead: (s) => s.replace(/\bI need to think about this\b/gi, "I'll decide. Soon."),
  Floater: (s) => /for now\.?$/i.test(s) ? s : s.replace(/\.$/, '. For now.'),
  Loyalist: (s) => s.replace(/keeping distance/gi, 'keeping us covered'),
  Cynic: (s) => /not convinced/i.test(s) ? s : (/[.!?]$/.test(s) ? `${s} Not convinced.` : `${s}. Not convinced.`),
};

export function applyArchetypeTone(text: string, archetype: Archetype, _parsed: SpeechAct, _original: string): string {
  const flavor = ARCHETYPE_FLAVOR[archetype] || ((s: string) => s);
  return humanize(flavor(text));
}


// Generate NPC personality bias from existing psychProfile
export function getNPCPersonalityBias(contestant: Contestant): NPCPersonalityBias {
  const disposition = contestant.psychProfile.disposition;
  
  return {
    trustfulness: disposition.includes('naive') ? 80 : disposition.includes('paranoid') ? 20 : 50,
    suspiciousness: disposition.includes('paranoid') ? 90 : disposition.includes('trusting') ? 20 : 50,
    emotionalVolatility: disposition.includes('emotional') ? 85 : disposition.includes('calm') ? 25 : 50,
    manipulationDetection: disposition.includes('calculating') ? 80 : disposition.includes('naive') ? 20 : 50,
    loyaltyLevel: disposition.includes('loyal') ? 85 : disposition.includes('treacherous') ? 15 : 50,
    revengefulness: disposition.includes('vindictive') ? 90 : disposition.includes('forgiving') ? 20 : 50
  };
}

// Calculate trust change based on AI analysis and NPC personality
export function calculateAITrustDelta(parsedInput: SpeechAct, npcBias: NPCPersonalityBias): number {
  let delta = 0;
  
  // Base trust modification from speech act
  switch (parsedInput.primary) {
    case 'alliance_proposal':
      delta = npcBias.trustfulness > 60 ? 15 : 5;
      break;
    case 'flirting':
      delta = npcBias.emotionalVolatility > 50 ? 8 : 3;
      break;
    case 'threatening':
      delta = -20;
      break;
    case 'gaslighting':
      delta = npcBias.manipulationDetection > 60 ? -25 : -5;
      break;
    case 'expressing_trust':
      delta = npcBias.trustfulness > 40 ? 10 : 2;
      break;
    case 'lying':
      delta = npcBias.manipulationDetection > 50 ? -15 : -3;
      break;
    case 'complimenting':
      delta = 5;
      break;
    case 'insulting':
      delta = -10;
      break;
    default:
      delta = 0;
  }
  
  // Modify based on emotional subtext
  if (parsedInput.emotionalSubtext.sincerity > 70) {
    delta += 3;
  } else if (parsedInput.emotionalSubtext.sincerity < 30) {
    delta -= 5;
  }
  
  // Manipulation detection
  if (parsedInput.manipulationLevel > 50 && npcBias.manipulationDetection > 60) {
    delta -= parsedInput.manipulationLevel / 10;
  }
  
  // Personality-based amplification
  if (npcBias.emotionalVolatility > 70) {
    delta = delta * 1.5; // More emotional reactions
  }
  
  return Math.round(delta);
}

// Calculate suspicion change based on AI analysis
export function calculateAISuspicionDelta(parsedInput: SpeechAct, npcBias: NPCPersonalityBias): number {
  let delta = 0;
  
  // Base suspicion from speech acts
  switch (parsedInput.primary) {
    case 'gaslighting':
      delta = npcBias.manipulationDetection > 40 ? 30 : 10;
      break;
    case 'threatening':
      delta = 25;
      break;
    case 'sabotaging':
      delta = 20;
      break;
    case 'information_fishing':
      delta = npcBias.suspiciousness > 60 ? 15 : 5;
      break;
    case 'withholding_info':
      delta = 10;
      break;
    case 'lying':
      delta = npcBias.manipulationDetection > 50 ? 20 : 5;
      break;
    case 'deflecting':
      delta = 8;
      break;
    case 'expressing_trust':
      delta = -5; // Expressing trust reduces suspicion
      break;
    default:
      delta = 0;
  }
  
  // Manipulation level directly affects suspicion
  if (parsedInput.manipulationLevel > 40) {
    delta += parsedInput.manipulationLevel / 5;
  }
  
  // Threat level increases suspicion
  if (parsedInput.threatLevel > 30) {
    delta += parsedInput.threatLevel / 3;
  }
  
  // Paranoid NPCs are more suspicious
  if (npcBias.suspiciousness > 70) {
    delta = delta * 1.3;
  }
  
  return Math.round(delta);
}

// Calculate emotional closeness change
export function calculateEmotionalDelta(parsedInput: SpeechAct, npcBias: NPCPersonalityBias): number {
  let delta = 0;
  
  // Base emotional impact from speech acts
  switch (parsedInput.primary) {
    case 'flirting':
      delta = npcBias.emotionalVolatility > 40 ? 12 : 6;
      break;
    case 'complimenting':
      delta = 8;
      break;
    case 'expressing_trust':
      delta = 10;
      break;
    case 'seeking_reassurance':
      delta = 5;
      break;
    case 'confessing':
      delta = 15; // Deep emotional impact
      break;
    case 'threatening':
      delta = -15;
      break;
    case 'insulting':
      delta = -12;
      break;
    case 'gaslighting':
      delta = -10;
      break;
    case 'sabotaging':
      delta = -8;
      break;
    default:
      delta = 0;
  }
  
  // Emotional subtext affects closeness
  delta += parsedInput.emotionalSubtext.attraction / 10;
  delta += parsedInput.emotionalSubtext.sincerity / 15;
  delta -= parsedInput.emotionalSubtext.anger / 8;
  delta -= parsedInput.emotionalSubtext.manipulation / 12;
  
  // Emotional NPCs have bigger swings
  if (npcBias.emotionalVolatility > 60) {
    delta = delta * 1.4;
  }
  
  return Math.round(delta);
}

// Calculate leak chance based on AI analysis
export function calculateAILeakChance(parsedInput: SpeechAct, psychProfile: any): number {
  let baseChance = 0.1; // 10% base leak chance
  
  // High manipulation makes NPCs more likely to leak
  if (parsedInput.manipulationLevel > 60) {
    baseChance += 0.3;
  }
  
  // Threatening messages get leaked more
  if (parsedInput.threatLevel > 50) {
    baseChance += 0.4;
  }
  
  // Alliance proposals might be leaked if NPC is untrustworthy
  if (parsedInput.primary === 'alliance_proposal' && psychProfile.disposition.includes('treacherous')) {
    baseChance += 0.25;
  }
  
  // Secrets and withholding info increases leak chance
  if (parsedInput.primary === 'withholding_info') {
    baseChance += 0.2;
  }
  
  // NPCs with low loyalty leak more
  if (psychProfile.trustLevel < 30) {
    baseChance += 0.2;
  }
  
  return Math.min(0.8, baseChance); // Cap at 80%
}

// Rule-based fallback. Naturalistic, persona-flavored, never the only voice the
// player hears (cloud AI is the default — see localLLM.ts).
const pick = <T,>(seed: string, arr: T[]): T => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return arr[Math.abs(h) % arr.length];
};

export function generateAIResponse(parsedInput: SpeechAct, npc: Contestant, content: string): string {
  const bias = getNPCPersonalityBias(npc);
  const mention = parsedInput.namedMentions?.[0];
  const archetype = deriveArchetype(npc);
  const seed = `${npc.name}|${parsedInput.primary}|${content.slice(0, 24)}`;

  let line = '';

  switch (parsedInput.primary) {
    case 'alliance_proposal':
      if (bias.trustfulness > 60) {
        line = pick(seed, [
          "Honestly? I've been thinking the same thing.",
          "Yeah, okay. Let's see how it plays.",
          "I'm in — quiet though, no big show.",
        ]);
      } else if (bias.suspiciousness > 70) {
        line = pick(seed, [
          "Why now? What aren't you telling me?",
          "That's convenient. Who else have you said this to?",
          "Hmm. Let me think about who benefits from this.",
        ]);
      } else {
        line = pick(seed, [
          "Maybe. Give me a day to read the room.",
          "I hear you. I'm not committing tonight though.",
          "Possibly. Tell me who else is in.",
        ]);
      }
      break;

    case 'flirting':
      line = bias.emotionalVolatility > 60
        ? pick(seed, ["You're trouble, you know that?", "Easy. Cameras everywhere.", "Don't make me laugh, I'm trying to look serious."])
        : pick(seed, ["Cute. Try that on someone else.", "Flattery, huh? Noted.", "Mm. Let's keep our heads on the game."]);
      break;

    case 'threatening':
      line = bias.revengefulness > 70
        ? pick(seed, ["Was that a threat? Bad call.", "You really want to do this with me?", "Cool. I'll remember that."])
        : pick(seed, ["I don't do threats. Try again.", "That's not the move. Walk it back.", "Okay. Noted, and not forgotten."]);
      break;

    case 'gaslighting':
      line = bias.manipulationDetection > 60
        ? pick(seed, ["Don't. I know what happened.", "Nice try. I was there.", "You're rewriting it. Stop."])
        : pick(seed, ["I hear you, but I remember it differently.", "Maybe. I'm not sure that's how it went.", "Hm. That's not what I saw."]);
      break;

    case 'information_fishing':
      if (bias.suspiciousness > 70) {
        line = mention
          ? pick(seed, [`Why are you asking about ${mention}?`, `Interesting question about ${mention}. Why?`, `${mention}? What do you actually want to know?`])
          : pick(seed, ["Why are you asking?", "What's this really about?", "Curious why you want to know."]);
      } else {
        line = mention
          ? pick(seed, [`If it's about ${mention}, ask me straight.`, `${mention}? Be specific.`])
          : pick(seed, ["Be specific — votes, alliances, or trust?", "What are you actually after?"]);
      }
      break;

    default: {
      const checkIn = /\bhow('?s| is)?\b.*\b(today|day|going)\b/i.test(content)
        || /\bhow are you\b/i.test(content)
        || /\bhow do you feel\b/i.test(content);

      if (checkIn) {
        if (npc.psychProfile.suspicionLevel > 60) {
          line = pick(seed, ["Tense. People are sniffing for cracks.", "On edge, honestly.", "Quiet. I'm watching."]);
        } else if (npc.psychProfile.trustLevel > 50) {
          line = pick(seed, ["Busy. Couple of sparks in the kitchen earlier.", "Good. Keeping our heads down.", "Fine — better now you're here."]);
        } else {
          line = pick(seed, ["Fine. Reading the room.", "I'm okay. You?", "Hanging in. You good?"]);
        }
      } else if (parsedInput.informationSeeking) {
        line = mention
          ? pick(seed, [`What exactly about ${mention}?`, `${mention}? What part?`])
          : pick(seed, ["What part though?", "Be specific — I'll bite.", "Like… which angle?"]);
      } else if (npc.psychProfile.suspicionLevel > 60) {
        line = pick(seed, ["I'm keeping distance till the dust settles.", "Not the day for big moves.", "Let me hang back on this one."]);
      } else if (npc.psychProfile.trustLevel > 50) {
        line = pick(seed, ["Steady. Let's keep it small.", "Yeah, I'm with you on that.", "Same page. Quietly though."]);
      } else {
        line = pick(seed, ["Let's not draw attention.", "I'd rather wait this out.", "Hm. Maybe. Maybe not."]);
      }
      break;
    }
  }

  // Subtext add-ons (kept short)
  if (parsedInput.emotionalSubtext.anger > 60 && bias.emotionalVolatility > 50) {
    line = `${line} Watch your tone with me.`;
  }
  if (parsedInput.manipulationLevel > 70 && bias.manipulationDetection > 60) {
    line = `${line} I see what you're doing.`;
  }

  const toned = applyArchetypeTone(line, archetype, parsedInput, content).trim();
  return toned.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 2).join(' ');
}
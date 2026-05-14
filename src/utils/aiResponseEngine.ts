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

// Generate AI-driven NPC response based on parsed input (pre-written, in-character templates)
export function generateAIResponse(parsedInput: SpeechAct, npc: Contestant, content: string): string {
  const bias = getNPCPersonalityBias(npc);
  const mention = parsedInput.namedMentions?.[0];

  let line = '';

  switch (parsedInput.primary) {
    case 'alliance_proposal':
      if (bias.trustfulness > 60) {
        line = 'I have been thinking the same—we could help each other.';
      } else if (bias.suspiciousness > 70) {
        line = 'Why now? What are you not saying?';
      } else {
        line = 'I need to think about this before I commit.';
      }
      break;

    case 'flirting':
      if (bias.emotionalVolatility > 60) {
        line = 'You are charming. Let us keep this quiet and real.';
      } else {
        line = 'Thanks. I prefer to stay strategic right now.';
      }
      break;

    case 'threatening':
      if (bias.revengefulness > 70) {
        line = 'Is that a threat? You just picked the wrong person.';
      } else {
        line = 'I do not accept threats; try another approach.';
      }
      break;

    case 'gaslighting':
      if (bias.manipulationDetection > 60) {
        line = 'Do not try to manipulate me—I know exactly what happened.';
      } else {
        line = 'I hear you, but I remember it differently.';
      }
      break;

    case 'information_fishing':
      if (bias.suspiciousness > 70) {
        line = mention ? `Interesting that you are asking about ${mention}. Why do you want to know?` : 'Interesting that you are asking. Why do you want to know?';
      } else {
        line = mention ? `If this is about ${mention}, give me specifics—names or numbers.` : 'If you want details, give me specifics—names or numbers.';
      }
      break;

    default: {
      const text = content.toLowerCase();
      const personalBackground = /(where\s+are\s+you\s+from|where\s+do\s+you\s+live|what\s+(city|state|country)\s+are\s+you\s+from)/i.test(content);
      const checkIn = /\bhow('?s| is)?\b.*\b(today|day|going)\b/.test(text)
        || /\bhow (are you)\b/.test(text)
        || /\bhow (are you|you'?re)\s+(feeling|doing)\b/.test(text)
        || /\bhow do you feel\b/.test(text)
        || /\bhow is it going\b/.test(text);

      const extractTopicPhrase = (original: string): string | null => {
        const patterns = [
          /think\s+about\s+([^.!?"']+)/i,
          /think\s+of\s+([^.!?"']+)/i,
          /about\s+([^.!?"']+)/i,
        ];
        for (const re of patterns) {
          const m = original.match(re);
          if (m && m[1]) {
            let phrase = m[1].trim();
            phrase = phrase.replace(/^\s*"|"\\s*$/g, '');
            const words = phrase.split(/\s+/).slice(0, 6);
            phrase = words.join(' ').replace(/[\s,;.]+$/, '');
            if (phrase.length >= 3) return phrase;
          }
        }
        const stop = new Set([
          'about','today','that','this','with','your','what','when','where','why','how','going','really','just','like','have','been','they','them','their','there','these','those','think','thinking','wonder','wondering','wondered','know','feel','feeling','doing','say','saying','ask','asking','talk','talking','chat','chatting','discuss','discussing','discussion','question','topic','make','made','take','took','give','gave','keep','kept','need','needed','want','wanted','right','okay','still','very','much','maybe','probably','literally','honestly','kinda','sorta','thing','so','far',
          'from','into','onto','over','under','after','before','around','through','against','between','within','without','upon','inside','outside','across','toward','towards','behind','beside','besides','above','below','near','off','out','in','on','at','for','to','of','as','by','up','down','via','per',
          'you','your','yours','me','my','mine','we','our','ours','he','she','it','its','they','them','their','theirs','am','is','are','was','were','be','been','being',
          'excited','happy','glad','nervous','thrilled','pumped','here'
        ]);
        const candidates = (original.toLowerCase().match(/\b[a-z]{3,}\b/g) || []).filter(w => !stop.has(w));
        return candidates[0] ? candidates[0] : null;
      };

      if (personalBackground) {
        line = 'I keep personal history off the table; the game is what matters.';
      } else if (parsedInput.primary === 'neutral_conversation' && checkIn) {
        if (npc.psychProfile.suspicionLevel > 60) {
          line = 'It is tense—people are sniffing for cracks. I am staying quiet.';
        } else if (npc.psychProfile.trustLevel > 50) {
          line = 'Busy. A couple sparks in the kitchen, but I am keeping us out of it.';
        } else {
          line = 'Fine. Reading the room and not overplaying anything.';
        }
      } else if (parsedInput.informationSeeking) {
        const phrase = extractTopicPhrase(content);
        line = phrase ? `What exactly about ${phrase}?` : (mention ? `What exactly about ${mention}?` : 'Be specific—alliances, votes, or trust?');
      } else {
        if (npc.psychProfile.suspicionLevel > 60) {
          line = 'I am keeping distance until the dust settles.';
        } else if (npc.psychProfile.trustLevel > 50) {
          line = 'Steady—let us keep our footprint small and accurate.';
        } else {
          line = 'Let us be careful and avoid attention.';
        }
      }
      break;
    }
  }

  // Emotional reactions based on subtext (brief add-on)
  if (parsedInput.emotionalSubtext.anger > 60 && bias.emotionalVolatility > 50) {
    line = `${line} Keep your tone steady with me.`;
  }
  if (parsedInput.manipulationLevel > 70 && bias.manipulationDetection > 60) {
    line = `${line} I see through tricks.`;
  }

  const archetype = deriveArchetype(npc);
  const toned = applyArchetypeTone(line, archetype, parsedInput, content).trim();

  // Enforce 1–2 sentences
  return toned.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 2).join(' ');
}
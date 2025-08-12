// AI-Driven Response Engine for The Edit Game
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

// Remove slang/jargon and enforce formal, neutral wording
export function sanitizeAndFormalize(text: string): string {
  let t = text;
  const replacements: Array<[RegExp, string]> = [
    [/\bI'm\b/g, 'I am'], [/\byou're\b/gi, 'you are'], [/\bit's\b/gi, 'it is'], [/\blet's\b/gi, 'let us'],
    [/\bthat's\b/gi, 'that is'], [/\bthere's\b/gi, 'there is'], [/\bwe're\b/gi, 'we are'], [/\bthey're\b/gi, 'they are'],
    [/\bdon't\b/gi, 'do not'], [/\bdoesn't\b/gi, 'does not'], [/\bisn't\b/gi, 'is not'], [/\baren't\b/gi, 'are not'],
    [/\bcan't\b/gi, 'cannot'], [/n't\b/gi, ' not'], [/\bwon't\b/gi, 'will not'], [/\bI'll\b/gi, 'I will'],

    // General slang/colloquialisms
    [/\bwanna\b/gi, 'want to'], [/\bgonna\b/gi, 'going to'], [/\bkinda\b/gi, 'somewhat'], [/\bsorta\b/gi, 'somewhat'],
    [/\bbruh\b|\bbro\b|\bfam\b|\bdude\b|\byo\b/gi, ''], [/\bnah\b/gi, 'no'], [/\byep\b/gi, 'yes'], [/\byeah\b/gi, 'yes'],
    [/\bain'?t\b/gi, 'is not'], [/\bcap\b/gi, ''], [/\bsus\b/gi, 'questionable'], [/\blow-?key\b/gi, ''], [/\bhigh-?key\b/gi, ''],

    // Show-jargon to neutral
    [/\bplay tight\b/gi, 'be careful'], [/\bavoid noise\b/gi, 'avoid attention'], [/\blive wire\b/gi, 'a volatile situation'],
    [/\bclocked\b/gi, ''], [/\bNoted\.?\b/g, '']
  ];
  for (const [re, val] of replacements) t = t.replace(re, val);
  // Collapse extra spaces
  t = t.replace(/\s{2,}/g, ' ').trim();
  // Keep quotes symmetrical
  t = t.replace(/“/g, '"').replace(/”/g, '"').replace(/''/g, '"');
  return t;
}

export function applyArchetypeTone(text: string, archetype: Archetype, parsed: SpeechAct, original: string): string {
  let t = text;
  switch (archetype) {
    case 'Charmer':
      if (/[?]/.test(original) || /\babout\b/i.test(original)) {
        t = t.replace(/^(.+?)$/, (_m, s1) => `${s1} I appreciate you asking.`);
      }
      break;
    case 'Hothead':
      // Keep direct; remove hedging
      t = t.replace(/\bI need to think about this\b/gi, 'I will decide quickly');
      break;
    case 'Floater':
      if (!/for now\.?$/i.test(t)) t = t.replace(/\.$/, '. For now.');
      break;
    case 'Loyalist':
      t = t.replace(/keeping distance/gi, 'keeping us protected');
      break;
    case 'Cynic':
      if (!/not convinced/i.test(t)) {
        t = /\.$/.test(t) ? `${t} I am not convinced yet.` : `${t}. I am not convinced yet.`;
      }
      break;
    case 'Strategist':
    default:
      // Already formal; no change
      break;
  }
  return sanitizeAndFormalize(t);
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

// Generate AI-driven NPC response based on parsed input
export function generateAIResponse(parsedInput: SpeechAct, npc: Contestant, content: string): string {
  const bias = getNPCPersonalityBias(npc);
  const responses: string[] = [];
  
  // Generate response based on detected speech act
  switch (parsedInput.primary) {
    case 'alliance_proposal':
      if (bias.trustfulness > 60) {
        responses.push(`${npc.name} nods thoughtfully. "I've been thinking the same thing. We could really help each other."`);
      } else if (bias.suspiciousness > 70) {
        responses.push(`${npc.name} narrows their eyes. "Why now? What aren't you telling me?"`);
      } else {
        responses.push(`${npc.name} considers your words carefully. "I need to think about this..."`);
      }
      break;
      
    case 'flirting':
      if (bias.emotionalVolatility > 60) {
        responses.push(`${npc.name} blushes and looks away. "You're pretty charming yourself..."`);
      } else {
        responses.push(`${npc.name} smiles politely but seems focused on the game. "Thanks, but we should stay strategic."`);
      }
      break;
      
    case 'threatening':
      if (bias.revengefulness > 70) {
        responses.push(`${npc.name}'s face hardens. "Is that a threat? You just made a big mistake."`);
      } else {
        responses.push(`${npc.name} looks shocked and hurt. "I... I can't believe you'd say that."`);
      }
      break;
      
    case 'gaslighting':
      if (bias.manipulationDetection > 60) {
        responses.push(`${npc.name} looks at you incredulously. "Don't try to manipulate me. I know exactly what happened."`);
      } else {
        responses.push(`${npc.name} looks confused and starts to doubt themselves. "Maybe... maybe you're right?"`);
      }
      break;
      
    case 'information_fishing':
      if (bias.suspiciousness > 70) {
        responses.push(`${npc.name} gives you a knowing look. "Interesting that you're asking about that. Why do you want to know?"`);
      } else {
        responses.push(`${npc.name} leans in conspiratorially. "Well, since you asked..."`);
      }
      break;
      
    default:
      {
        const text = content.toLowerCase();
        const checkIn = /\bhow('?s| is)?\b.*\b(today|day|going)\b/.test(text) || /\bhow are you\b/.test(text);

        // Helper to extract a coherent topic/phrase from the player's message
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
              phrase = phrase.replace(/^\s*"|"\s*$/g, '');
              const words = phrase.split(/\s+/).slice(0, 6);
              phrase = words.join(' ').replace(/[\s,;.]+$/, '');
              if (phrase.length >= 3) return phrase;
            }
          }
          const stop = new Set([
            'about','today','that','this','with','your','what','when','where','why','how','going','really','just','like','have','been','they','them','their','there','these','those','think','know','feel','doing','make','made','take','took','give','gave','keep','kept','need','needed','want','wanted','right','okay','still','very','much','maybe','probably','literally','honestly','kinda','sorta','thing',
            // Common prepositions and function words we should never surface as topics
            'from','into','onto','over','under','after','before','around','through','against','between','within','without','upon','inside','outside','across','toward','towards','behind','beside','besides','above','below','near','off','out','in','on','at','for','to','of','as','by','up','down','over','under','via','per','per',
            // Pronouns and auxiliaries
            'you','your','yours','me','my','mine','we','our','ours','he','she','it','its','they','them','their','theirs','am','is','are','was','were','be','been','being'
          ]);
          const candidates = (original.toLowerCase().match(/\b[a-z]{3,}\b/g) || []).filter(w => !stop.has(w));
          return candidates[0] ? candidates[0] : null;
        };

        if (parsedInput.primary === 'neutral_conversation' && checkIn) {
          if (npc.psychProfile.suspicionLevel > 60) {
            responses.push(`${npc.name} glances around. "It's tense—people are sniffing for cracks. I'm staying quiet."`);
          } else if (npc.psychProfile.trustLevel > 50) {
            responses.push(`${npc.name} softens. "Busy. A couple sparks in the kitchen, but I'm keeping us out of it."`);
          } else {
            responses.push(`${npc.name} keeps it brief. "Fine. Reading the room and not overplaying anything."`);
          }
        } else if (parsedInput.informationSeeking) {
          const phrase = extractTopicPhrase(content);
          responses.push(`${npc.name} weighs you. "${phrase ? `Why are you asking about ${phrase}?` : 'Why are you asking?'}"`);
        } else {
          if (npc.psychProfile.suspicionLevel > 60) {
            responses.push(`${npc.name} stays guarded. "I am keeping distance until the dust settles."`);
          } else if (npc.psychProfile.trustLevel > 50) {
            responses.push(`${npc.name} is candid. "I am steady—let us keep our footprint small and accurate."`);
          } else {
            responses.push(`${npc.name} keeps it brief. "Let us be careful and avoid attention."`);
          }
        }
      }
      break;
    }
    
    // Add emotional reactions based on subtext
  if (parsedInput.emotionalSubtext.anger > 60 && bias.emotionalVolatility > 50) {
    responses.push(`${npc.name} notices your angry tone and becomes defensive.`);
  }
  
  if (parsedInput.manipulationLevel > 70 && bias.manipulationDetection > 60) {
    responses.push(`${npc.name} sees right through your manipulation attempt.`);
  }
  
  const archetype = deriveArchetype(npc);
  const first = responses[0] || `${npc.name} keeps it brief. "I am considering that."`;
  const toned = applyArchetypeTone(first, archetype, parsedInput, content);
  return sanitizeAndFormalize(toned);
}
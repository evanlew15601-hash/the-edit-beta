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
      responses.push(`${npc.name} responds to your comment about "${content.substring(0, 30)}..."`);
  }
  
  // Add emotional reactions based on subtext
  if (parsedInput.emotionalSubtext.anger > 60 && bias.emotionalVolatility > 50) {
    responses.push(`${npc.name} notices your angry tone and becomes defensive.`);
  }
  
  if (parsedInput.manipulationLevel > 70 && bias.manipulationDetection > 60) {
    responses.push(`${npc.name} sees right through your manipulation attempt.`);
  }
  
  return responses[Math.floor(Math.random() * responses.length)];
}
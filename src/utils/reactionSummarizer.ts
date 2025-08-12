import { Contestant } from '@/types/game';
import type { ReactionSummary } from '@/types/game';

export function summarizeReaction(
  actionType: string,
  content: string,
  parsed: any,
  npc: Contestant | null,
  conversationType: 'public' | 'private' | 'scheme' | 'activity'
): ReactionSummary {
  const lower = (content || '').toLowerCase();
  const trust = npc?.psychProfile.trustLevel ?? 0;
  const suspicion = npc?.psychProfile.suspicionLevel ?? 30;

  const normalizedContext: ReactionSummary['context'] =
    actionType === 'dm' ? 'private'
    : actionType === 'scheme' ? 'scheme'
    : actionType === 'activity' ? 'activity'
    : conversationType;

  // Consider both regex and parsed intent
  const primary: string = (parsed?.primary || '').toString();
  const threatLevel: number = Number(parsed?.threatLevel ?? 0);
  const manipulationLevel: number = Number(parsed?.manipulationLevel ?? 0);
  const emotional: Record<string, number> | undefined = parsed?.emotionalSubtext;

  const isParsedGameTalk = /alliance|ally|vote|numbers|target|plan|scheme|jury|flip|backdoor/i.test(primary);
  const isGameTalk = isParsedGameTalk || /(ally|alliance|numbers|votes?|target|backdoor|flip|lock|majority|minority|leak|secret|plan|scheme|jury)/.test(lower);

  function pick<T>(vals: T[]): T { return vals[Math.floor(Math.random() * vals.length)]; }

  let take: ReactionSummary['take'] = 'neutral';

  // Priority 1: Threats/manipulation from parsed input
  if (threatLevel >= 50) {
    take = 'pushback';
  } else if (manipulationLevel >= 55) {
    take = suspicion > 50 ? 'pushback' : 'suspicious';
  } else if (actionType === 'scheme') {
    take = suspicion > 60 ? 'pushback' : suspicion > 40 ? 'suspicious' : 'curious';
  } else if (actionType === 'activity') {
    // Activities mostly vibe based
    const warmth = emotional?.warmth ?? 0;
    take = trust + warmth * 50 > 40 ? 'positive' : 'neutral';
  } else if (actionType === 'dm' || actionType === 'talk') {
    if (isGameTalk) {
      if (normalizedContext === 'public') {
        take = suspicion > 60 ? 'pushback' : suspicion > 35 ? 'deflect' : 'suspicious';
      } else {
        take = trust > 60 ? 'positive' : suspicion > 55 ? 'suspicious' : 'curious';
      }
    } else if (/information|question/i.test(primary)) {
      take = 'curious';
    } else if (/apology|trust|reassurance|vulnerability|gratitude|flattery/i.test(primary)) {
      take = trust > 30 ? 'positive' : 'curious';
    } else if (/threat|gaslight|undermin/i.test(primary)) {
      take = suspicion > 40 ? 'pushback' : 'suspicious';
    } else {
      // Small talk: use emotion to bias out of neutral
      const warmth = emotional?.warmth ?? 0;
      const hostility = emotional?.hostility ?? 0;
      if (warmth > 0.4 && trust > 20) take = 'positive';
      else if (hostility > 0.4 || suspicion > 60) take = 'suspicious';
      else take = 'neutral';
    }
  }

  let notes = '';
  switch (take) {
    case 'positive':
      notes = pick(['onboard in principle', 'receptive, will consider', 'open to next steps']);
      break;
    case 'curious':
      notes = pick(['wants specifics', 'seeking info first', 'asking for details']);
      break;
    case 'deflect':
      notes = pick(['deflects in public', 'keeps it vague', 'changes subject']);
      break;
    case 'pushback':
      notes = pick(['pushes back hard', 'rejects the angle', 'not buying it']);
      break;
    case 'suspicious':
      notes = pick(['takes note, wary', 'reads it as risky', 'guards info']);
      break;
    default:
      notes = pick(['acknowledged', 'noted', 'no commitment']);
  }

  return { take, context: normalizedContext, notes };
}

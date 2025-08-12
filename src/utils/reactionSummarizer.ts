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
  const seemsQuestion = /\?\s*$/.test(content) || /^\s*(what|who|when|where|why|how|can|could|would|will|do|does|did|are|is|was|were|should|have|has|had|may|might)\b/i.test(content || '');

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
  const infoSeeking: boolean = !!parsed?.informationSeeking;
  const trustBuilding: boolean = !!parsed?.trustBuilding;

  // Map classifier emotions -> warmth/hostility scalars (0..1)
  const anger = Number(emotional?.anger ?? 0);
  const fear = Number(emotional?.fear ?? 0);
  const attraction = Number(emotional?.attraction ?? 0);
  const sincerity = Number(emotional?.sincerity ?? 50);
  const manip = Number(emotional?.manipulation ?? 0);

  const warmth = Math.max(0, Math.min(1, (sincerity * 0.5 + attraction * 0.4 + (100 - fear) * 0.1 - anger * 0.2) / 100));
  const hostility = Math.max(0, Math.min(1, (anger * 0.6 + manip * 0.3 - sincerity * 0.4) / 100));

  const isParsedGameTalk = /alliance|ally|vote|numbers|target|plan|scheme|jury|flip|backdoor|testing_loyalty|information_fishing/i.test(primary);
  const isGameTalk = isParsedGameTalk || /(ally|alliance|numbers|votes?|target|backdoor|flip|lock|majority|minority|leak|secret|plan|scheme|jury)/.test(lower);

  function pick<T>(vals: T[]): T { return vals[Math.floor(Math.random() * vals.length)]; }

  let take: ReactionSummary['take'] = 'neutral';

  // Priority 1: Explicitly negative acts
  if (['threatening','gaslighting','sabotaging','insulting','provoking'].includes(primary)) {
    take = suspicion > 40 ? 'pushback' : 'suspicious';
  } else if (threatLevel >= 50) {
    take = 'pushback';
  } else if (manipulationLevel >= 55) {
    take = suspicion > 50 ? 'pushback' : 'suspicious';
  } else if (actionType === 'scheme') {
    take = suspicion > 60 ? 'pushback' : suspicion > 40 ? 'suspicious' : 'curious';
  } else if (actionType === 'activity') {
    // Activities mostly vibe based
    take = trust + warmth * 50 > 40 ? 'positive' : 'neutral';
  } else if (actionType === 'dm' || actionType === 'talk') {
    const isPhaticSmallTalk = (() => {
      const l = (content || '').toLowerCase().trim();
      if (!l) return false;
      const greet = /^(hey|hi|hello|yo|sup)\b/.test(l);
      const checkIn = /(how are you|how's it going|how is it going|what's up|how was your day)/i.test(l);
      const excitedHere = /\bare you (excited|good|okay|alright|tired|hungry|nervous)\b/.test(l) && /\b(here|today|about|to be here|the house|the game)\b/.test(l);
      const shortQ = /\?$/.test(l) && l.length <= 80 && /(excited|here|day|house|game|vibe|today)/.test(l) && !/(plan|vote|numbers|target|alliance|scheme)/.test(l);
      return greet || checkIn || excitedHere || shortQ;
    })();

    if (isGameTalk) {
      if (normalizedContext === 'public') {
        take = suspicion > 60 ? 'pushback' : suspicion > 35 ? 'deflect' : 'suspicious';
      } else {
        take = trust > 60 ? 'positive' : suspicion > 55 ? 'suspicious' : 'curious';
      }
    } else if (isPhaticSmallTalk) {
      take = trust + (Number(emotional?.sincerity ?? 50) / 2 + Number(emotional?.attraction ?? 0) * 0.4) / 2 > 30 ? 'positive' : 'neutral';
    } else if (/gossip/i.test(primary) || /(did you hear|rumor|apparently|they said)/i.test(lower)) {
      if (normalizedContext === 'public') {
        take = suspicion > 40 ? 'deflect' : 'suspicious';
      } else {
        take = trust > 40 ? 'curious' : 'suspicious';
      }
    } else if (infoSeeking || seemsQuestion) {
      take = 'curious';
    } else if (trustBuilding || /expressing_trust|seeking_reassurance/i.test(primary)) {
      take = trust > 25 ? 'positive' : 'curious';
    } else {
      // Small talk and banter
      if (/banter/i.test(primary)) {
        take = trust > 20 ? 'positive' : 'neutral';
      } else if (warmth > 0.45 && trust > 10) take = 'positive';
      else if (hostility > 0.35 || suspicion > 60) take = 'suspicious';
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

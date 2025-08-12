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

  const isGameTalk = /(ally|alliance|numbers|votes?|target|backdoor|flip|lock|majority|minority)/.test(lower);

  function pick<T>(vals: T[]): T { return vals[Math.floor(Math.random() * vals.length)]; }

  let take: ReactionSummary['take'] = 'neutral';

  if (actionType === 'scheme') {
    take = suspicion > 50 ? 'pushback' : 'suspicious';
  } else if (actionType === 'activity') {
    take = trust > 30 ? 'positive' : 'neutral';
  } else if (actionType === 'dm' || actionType === 'talk') {
    if (isGameTalk) {
      if (conversationType === 'public') {
        take = suspicion > 40 ? 'deflect' : 'suspicious';
      } else {
        take = trust > 50 ? 'positive' : 'curious';
      }
    } else {
      take = trust > 50 ? 'positive' : suspicion > 60 ? 'suspicious' : 'neutral';
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

  return { take, context: conversationType, notes };
}

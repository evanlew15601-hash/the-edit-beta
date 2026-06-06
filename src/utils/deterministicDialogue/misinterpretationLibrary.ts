import { Contestant } from '@/types/game';
import { seededPick } from './decisionEngine';

// Given the same player action, NPCs should interpret it differently based on
// their own suspicion/trust toward the player. These deterministic snippets
// expose that interpretation in the NPC's inner read of the moment.

export type PlayerSurfaceIntent = 'BUILD_TRUST' | 'PROBE' | 'DEFLECT' | 'ACCUSE' | 'FLIRT' | 'JOKE' | 'PITCH';

const INTERPRETATIONS: Record<PlayerSurfaceIntent, { trusted: string[]; neutral: string[]; suspicious: string[] }> = {
  BUILD_TRUST: {
    trusted: ["I think they were being honest.", "That landed real. I felt it."],
    neutral: ["Hard to read. Could go either way.", "Sounded right. Could also be rehearsed."],
    suspicious: ["I think they wanted something.", "That was a setup. I just don't know for what yet."],
  },
  PROBE: {
    trusted: ["They're trying to figure out where the danger is. Fair.", "They want a read. I get it."],
    neutral: ["Fishing. Standard.", "Asking questions doesn't make them dangerous yet."],
    suspicious: ["They're scouting me.", "Every question was a trap."],
  },
  DEFLECT: {
    trusted: ["They're tired. I'll come back to it.", "Not the right moment for them."],
    neutral: ["They're not ready to answer. Noted.", "I'll file that and try again."],
    suspicious: ["They're hiding something.", "That dodge told me everything."],
  },
  ACCUSE: {
    trusted: ["They're scared. That came from somewhere real.", "Fair shot. I'd have asked the same."],
    neutral: ["Loaded. I have to be careful how I respond.", "That's a real read, even if it's wrong."],
    suspicious: ["They're trying to flip it on me.", "Classic deflection — accuse first."],
  },
  FLIRT: {
    trusted: ["That was sweet. I needed it.", "Cute. They mean it."],
    neutral: ["Flirting in here is always strategy too.", "Half charm, half move."],
    suspicious: ["They're trying to soften me up.", "Showmance angle. Calculated."],
  },
  JOKE: {
    trusted: ["I needed a laugh.", "They're good for the room."],
    neutral: ["Cute. Filler.", "Lightening the room. Useful."],
    suspicious: ["They joke when they're nervous.", "Comedy as a smokescreen."],
  },
  PITCH: {
    trusted: ["The numbers actually work.", "I'd ride that with them."],
    neutral: ["I need to hear it twice before I commit.", "Possible. Not yet."],
    suspicious: ["They're recruiting me to use me.", "Hard pass — that's a vote against me later."],
  },
};

export function interpretPlayerAction(
  npc: Contestant,
  surface: PlayerSurfaceIntent,
  seedExtra = ''
): string {
  const susp = npc.psychProfile.suspicionLevel;
  const trust = npc.psychProfile.trustLevel;
  const bucket =
    susp >= 65 ? 'suspicious' :
    trust >= 50 && susp < 40 ? 'trusted' :
    'neutral';

  const pool = INTERPRETATIONS[surface][bucket];
  const seed = `${npc.id || npc.name}|interp|${surface}|${bucket}|${seedExtra}`;
  return seededPick(pool, seed) || pool[0];
}

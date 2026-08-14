import { GameState, Contestant } from '@/types/game';
import { generateLocalAIReply } from '@/utils/localLLM';
import { seededPick } from '@/utils/deterministicDialogue/decisionEngine';

/**
 * Deterministic jury rationale generation.
 *
 * Each juror's rationale is spoken in first person, built from authored pools
 * keyed by WHY they landed on that finalist (loyalty, respect, bitterness,
 * social bond, fear, a closing speech that moved them). The AI gateway is only
 * ever an optional stylistic rephrase (default OFF), so the finale reads the
 * same way every time for the same season state.
 */

export type JuryReasonKey =
  | 'loyal_alliance'
  | 'respect_strategic'
  | 'bitter_betrayed'
  | 'social_connection'
  | 'default_threat'
  | 'speech_won_me'
  | 'speech_lost_them'
  | 'lesser_evil';

const TEMPLATES: Record<JuryReasonKey, string[]> = {
  loyal_alliance: [
    "{vote} stayed with me when flipping would have been easier. I'm not going to pretend that didn't matter.",
    "I made a deal with {vote} early and they never made me regret it. That's my vote.",
    "We said we'd ride it out together. {vote} kept their end of that, so I'm keeping mine.",
    "People laughed at us working together. {vote} showed up for me every single week.",
  ],
  respect_strategic: [
    "{vote} was three steps ahead of me the whole time and I only see it now. That's a winner.",
    "Every move {vote} made had a reason behind it. I can be annoyed and still respect that.",
    "I sat in that jury house and kept finding {vote}'s fingerprints on everything. Hard to argue with.",
    "{vote} controlled the votes without ever looking like the one controlling them.",
  ],
  bitter_betrayed: [
    "{vote} burned me. I'm also not stupid — that move is exactly why they're sitting there.",
    "I wanted to vote against {vote} out of spite. Then I actually thought about who played the better game.",
    "{vote} cut me and did it to my face. I hated it. I respect it more than I hate it.",
    "Getting got by {vote} still stings. It was the right move for them, and that's what I'm judging.",
  ],
  social_connection: [
    "{vote} treated me like a person in there, not a number to move around.",
    "When I was on the block and nobody would look at me, {vote} sat with me. I remember that.",
    "I trusted {vote} and I still do. Nobody else in that house gave me that.",
    "{vote} is the only one who checked on me when it wasn't strategically useful.",
  ],
  default_threat: [
    "{vote} scared me more than anyone else in there, and that's usually the answer.",
    "I never got a clean read on {vote} all season. That's how I know they were running it.",
    "I spent weeks trying to figure out what {vote} was doing. That's a vote.",
    "Everyone I liked got taken out around {vote}, and {vote} kept walking away clean.",
  ],
  speech_won_me: [
    "I came in undecided and {vote}'s speech settled it. They owned every move they made.",
    "{vote} stood up there and explained their game without flinching. That earned it.",
    "I needed one of them to actually make a case tonight, and {vote} did.",
  ],
  speech_lost_them: [
    "The other one had a chance to win me tonight and didn't take it. So, {vote}.",
    "I was on the fence until the speeches. {vote} was the only one who said anything real.",
    "One of them talked around their game up there. {vote} didn't, so {vote} gets it.",
  ],
  lesser_evil: [
    "Honestly? Neither of them were kind to me. {vote} was at least honest about playing a game.",
    "I don't love this vote. {vote} did more, and I'm voting on the game.",
    "It's not a warm vote. {vote} just played the better season.",
  ],
};

export interface JurySignals {
  /** Net emotional standing of the juror toward the finalist they voted for. */
  emotion?: number;
  /** How much of the vote came from strategic respect. */
  strategy?: number;
  /** Negative number when the finalist betrayed this juror. */
  betrayalPenalty?: number;
  /** Whether this juror weighs resume, social play, or a mix. */
  jurorStyle?: 'resume' | 'social' | 'mixed';
  /** Tier of the finale speech from the finalist they voted for, if any. */
  speechTier?: 'compelling' | 'solid' | 'neutral' | 'weak' | null;
  /** Tier of the rival finalist's speech, when known. */
  rivalSpeechTier?: 'compelling' | 'solid' | 'neutral' | 'weak' | null;
}

export function pickJuryReason(
  juror: Contestant | undefined,
  voteFor: string,
  gameState: GameState,
  signals: JurySignals = {}
): JuryReasonKey {
  const { emotion = 0, strategy = 0, betrayalPenalty = 0, jurorStyle = 'mixed', speechTier, rivalSpeechTier } = signals;

  const sharedAlliance = gameState.alliances.some(
    a => a.members.includes(voteFor) && (!juror || a.members.includes(juror.name))
  );
  const memories = juror?.memory || [];
  const recentBetrayal =
    betrayalPenalty < 0 ||
    memories.some(m => m.participants.includes(voteFor) && /(betray|burned|flipped|lied|cut)/i.test(m.content || ''));
  const recentSave = memories.some(
    m => m.participants.includes(voteFor) && /(saved|protected|covered|had my back)/i.test(m.content || '')
  );

  if (speechTier === 'compelling') return 'speech_won_me';
  if (rivalSpeechTier === 'weak' && (speechTier === 'solid' || speechTier === 'neutral')) return 'speech_lost_them';
  if (recentBetrayal && emotion < -5) return 'bitter_betrayed';
  if (sharedAlliance && !recentBetrayal) return 'loyal_alliance';
  if (recentSave || (jurorStyle === 'social' && emotion > 5)) return 'social_connection';
  if (emotion < -5 && strategy <= 0) return 'lesser_evil';
  if ((juror?.psychProfile?.suspicionLevel ?? 0) >= 55 && strategy <= 0) return 'default_threat';
  if (jurorStyle === 'resume' || strategy > 0) return 'respect_strategic';
  return emotion > 0 ? 'social_connection' : 'default_threat';
}

/** Synchronous, deterministic, first-person rationale. Safe to call during render. */
export function buildJuryRationale(
  juror: Contestant | undefined,
  voteFor: string,
  gameState: GameState,
  signals: JurySignals = {}
): string {
  const key = pickJuryReason(juror, voteFor, gameState, signals);
  const seed = `${juror?.id || juror?.name || 'juror'}|jury|${voteFor}|${key}|${gameState.currentDay}`;
  const line = seededPick(TEMPLATES[key], seed) || TEMPLATES.respect_strategic[0];
  return line.replace(/\{vote\}/g, voteFor);
}

/** The player's own jury vote, phrased in their voice. */
export function buildPlayerJuryRationale(voteFor: string, gameState: GameState): string {
  const options = [
    `I voted for ${voteFor}. They played the game I respected most from the jury seat.`,
    `${voteFor} gets my vote. I watched them work, even when it cost me.`,
    `I gave it to ${voteFor}. Out of the two, they actually owned their game.`,
  ];
  return seededPick(options, `${gameState.playerName}|jury|${voteFor}`) || options[0];
}

export async function generateJuryRationales(
  gameState: GameState,
  winner: string,
  finalVotes: { [juryMember: string]: string },
  signalsByJuror: Record<string, JurySignals> = {}
): Promise<{ [juryMember: string]: string }> {
  const rationales: { [juryMember: string]: string } = {};
  const juryMembers = gameState.juryMembers || [];
  if (!juryMembers.length) return rationales;

  for (const jurorName of juryMembers) {
    const voteFor = finalVotes[jurorName];
    if (!voteFor) continue;

    const juror = gameState.contestants.find(c => c.name === jurorName);
    const deterministic = buildJuryRationale(juror, voteFor, gameState, signalsByJuror[jurorName]);
    let text = deterministic;

    if (juror) {
      try {
        const rephrased = await generateLocalAIReply(
          {
            playerMessage: `Explain in 1–2 sentences why you voted for ${voteFor} to win.`,
            parsedInput: { primary: 'jury_rationale', voteFor },
            npc: {
              name: juror.name,
              publicPersona: juror.publicPersona,
              psychProfile: juror.psychProfile,
            },
            tone: 'strategic',
            conversationType: 'confessional',
            socialContext: { voteFor, seasonWinner: winner },
            playerName: gameState.playerName,
            npcPlan: { summary: deterministic },
          },
          { maxSentences: 2 }
        );
        if (typeof rephrased === 'string' && rephrased.trim()) text = rephrased.trim();
      } catch {
        /* keep deterministic */
      }
    }

    rationales[jurorName] = text;
  }

  return rationales;
}

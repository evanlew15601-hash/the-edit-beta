import { GameState, Contestant } from '@/types/game';
import { generateLocalAIReply } from '@/utils/localLLM';
import { seededPick } from '@/utils/deterministicDialogue/decisionEngine';

/**
 * Deterministic jury rationale generation.
 *
 * Each juror's rationale is constructed from authored templates keyed by their
 * trust/suspicion toward the finalist they voted for, plus whether they share
 * an alliance with that finalist and any high-impact memories. The AI gateway
 * is only consulted as an OPTIONAL stylistic rephrase, controlled by the
 * "AI Style Enhancement" setting (default OFF). Without AI, the rationales
 * are still in-character, specific, and replayable.
 */

const TEMPLATES = {
  loyal_alliance: [
    "{vote} stayed with me when it would have been easier to flip. I owe them this.",
    "I was in a final with {vote}. I'm not breaking that vow on stage.",
  ],
  respect_strategic: [
    "{vote} played the cleanest game I saw from the inside. That's a winner.",
    "Every move {vote} made had a reason. I respect the architecture.",
  ],
  bitter_betrayed: [
    "{vote} burned me, but they ran the table doing it. I vote the game, not the grudge.",
    "{vote} cut me. I hated it. I also know that's why they're sitting there.",
  ],
  social_connection: [
    "{vote} treated me like a person, not a number. That counts in here.",
    "I trusted {vote}. Nobody else made me feel that.",
  ],
  default_threat: [
    "{vote} was the player I was most afraid of. That's my vote.",
    "I never had a clean read on {vote}. That's how I know they earned it.",
  ],
};

function pickKey(juror: Contestant, voteFor: string, gameState: GameState): keyof typeof TEMPLATES {
  const sharedAlliance = gameState.alliances.some(
    a => a.members.includes(juror.name) && a.members.includes(voteFor)
  );
  const recentBetrayal = (juror.memory || []).some(
    m => m.participants.includes(voteFor) && /(betray|burned|flipped|lied|cut)/i.test(m.content || '')
  );
  const recentSave = (juror.memory || []).some(
    m => m.participants.includes(voteFor) && /(saved|protected|covered|had my back)/i.test(m.content || '')
  );
  if (sharedAlliance && !recentBetrayal) return 'loyal_alliance';
  if (recentBetrayal) return 'bitter_betrayed';
  if (recentSave) return 'social_connection';
  if (juror.psychProfile.suspicionLevel >= 55) return 'default_threat';
  return 'respect_strategic';
}

function buildDeterministicRationale(juror: Contestant, voteFor: string, gameState: GameState): string {
  const key = pickKey(juror, voteFor, gameState);
  const seed = `${juror.id || juror.name}|jury|${voteFor}|${key}`;
  const tmpl = seededPick(TEMPLATES[key], seed) || TEMPLATES.respect_strategic[0];
  return tmpl.replace(/\{vote\}/g, voteFor);
}

export async function generateJuryRationales(
  gameState: GameState,
  winner: string,
  finalVotes: { [juryMember: string]: string }
): Promise<{ [juryMember: string]: string }> {
  const rationales: { [juryMember: string]: string } = {};
  const juryMembers = gameState.juryMembers || [];
  if (!juryMembers.length) return rationales;

  for (const jurorName of juryMembers) {
    const voteFor = finalVotes[jurorName];
    if (!voteFor) continue;

    const juror = gameState.contestants.find(c => c.name === jurorName);
    if (!juror) continue;

    const deterministic = buildDeterministicRationale(juror, voteFor, gameState);
    let text = deterministic;

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

    rationales[jurorName] = text;
  }

  return rationales;
}

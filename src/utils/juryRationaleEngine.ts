import { GameState, Contestant } from '@/types/game';
import { generateLocalAIReply } from '@/utils/localLLM';

/**
 * LLM-assisted jury rationale generation.
 *
 * Uses Gemini (via generateLocalAIReply) to produce short, in-character
 * explanations for how each jury member voted at the finale, grounded in:
 * - Their psychProfile
 * - Their memory of the winner and other finalists
 * - Alliance and threat context
 *
 * This is purely narrative; it does not affect game outcome.
 */

export async function generateJuryRationales(
  gameState: GameState,
  winner: string,
  finalVotes: { [juryMember: string]: string }
): Promise<{ [juryMember: string]: string }> {
  const rationales: { [juryMember: string]: string } = {};
  const juryMembers = gameState.juryMembers || [];
  if (!juryMembers.length) return rationales;

  const finalists = gameState.contestants.filter(c => !c.isEliminated);
  const finalistNames = finalists.map(c => c.name);

  for (const jurorName of juryMembers) {
    const voteFor = finalVotes[jurorName];
    if (!voteFor) continue;

    const juror = gameState.contestants.find(c => c.name === jurorName);
    if (!juror) continue;

    try {
      const rationale = await generateSingleJurorRationale(gameState, juror, voteFor, winner, finalistNames);
      if (rationale) {
        rationales[jurorName] = rationale;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to generate jury rationale for', jurorName, e);
    }
  }

  return rationales;
}

async function generateSingleJurorRationale(
  gameState: GameState,
  juror: Contestant,
  voteFor: string,
  seasonWinner: string,
  finalistNames: string[]
): Promise<string | null> {
  const day = gameState.currentDay;
  const name = juror.name;

  // Pull juror's most recent, high-impact memories that involve finalists
  const relevantMemories = [...juror.memory]
    .filter(m =>
      m.day >= day - 21 &&
      m.participants.some(p => finalistNames.includes(p)) &&
      (m.type === 'scheme' ||
        m.type === 'conversation' ||
        m.type === 'elimination' ||
        m.type === 'event')
    )
    .sort((a, b) => Math.abs(b.emotionalImpact) - Math.abs(a.emotionalImpact))
    .slice(0, 8)
    .map(m => `Day ${m.day}: ${m.content}`);

  const socialContext = {
    day,
    finalists: finalistNames,
    votedFor: voteFor,
    seasonWinner,
    recentEvents: relevantMemories,
    alliances: gameState.alliances
      .filter(a => a.members.includes(name))
      .map(a => a.members),
  };

  const playerMessage = [
    `You are in the final jury.`,
    `You voted for ${voteFor} to win over the other finalists (${finalistNames.filter(n => n !== voteFor).join(', ') || 'N/A'}).`,
    `Explain in 1–2 sentences why you cast your vote for ${voteFor}.`,
    `Base it on how they played the game, how they treated you, and what you saw across the season.`,
  ].join(' ');

  const parsedInput = {
    primary: 'jury_rationale',
    voteFor,
    finalists: finalistNames,
  };

  const text = await generateLocalAIReply(
    {
      playerMessage,
      parsedInput,
      npc: {
        name: juror.name,
        publicPersona: juror.publicPersona,
        psychProfile: juror.psychProfile,
      },
      tone: 'strategic',
      conversationType: 'confessional',
      socialContext,
      playerName: gameState.playerName,
      intent: parsedInput,
    },
    { maxSentences: 2 }
  );

  const out = typeof text === 'string' ? text.trim() : '';
  if (!out) return null;
  return out;
}
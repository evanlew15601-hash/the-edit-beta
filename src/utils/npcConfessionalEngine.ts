import { GameState, Contestant } from '@/types/game';
import { memoryEngine } from '@/utils/memoryEngine';
import { relationshipGraphEngine } from '@/utils/relationshipGraphEngine';
import { generateLocalAIReply } from '@/utils/localLLM';

/**
 * NPCConfessionalEngine
 *
 * Generates short, LLM-assisted NPC confessionals for a small set of key
 * houseguests at key beats (e.g. weekly recap). These confessionals are stored
 * in the persistent MemorySystem as `GameMemoryEvent` entries of type
 * 'confessional' and can be used by recap/edit systems as in-world reasoning.
 *
 * This does not affect game mechanics; it is narrative-only.
 */

const MAX_NPC_CONFESSIONALS_PER_BATCH = 3;

export async function generateNPCConfessionalsForDay(gameState: GameState): Promise<void> {
  const { playerName, contestants, currentDay } = gameState;
  if (!playerName || !contestants || contestants.length === 0) return;

  // Only generate when there are enough contestants left to justify a recap
  const active = contestants.filter(c => !c.isEliminated && c.name !== playerName);
  if (active.length < 3) return;

  const selected = selectKeyNPCs(active, gameState).slice(0, MAX_NPC_CONFESSIONALS_PER_BATCH);
  if (!selected.length) return;

  for (const npc of selected) {
    try {
      const text = await buildConfessionalForNPC(npc, gameState);
      if (!text) continue;

      memoryEngine.recordEvent({
        day: currentDay,
        type: 'confessional',
        participants: [npc.name],
        content: text,
        emotionalImpact: 6,
        reliability: 'confirmed',
        strategicImportance: 8,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('NPCConfessionalEngine: failed to generate confessional for', npc.name, e);
    }
  }
}

/**
 * Select key NPCs for confessionals: socially and strategically central players.
 */
function selectKeyNPCs(active: Contestant[], gameState: GameState): Contestant[] {
  const scored: { c: Contestant; score: number }[] = [];

  active.forEach(c => {
    const relStats = relationshipGraphEngine.calculateSocialStanding(c.name);
    const socialPower = relStats.socialPower;
    const suspicion = c.psychProfile.suspicionLevel;
    const trust = c.psychProfile.trustLevel;

    let score = socialPower;
    // High suspicion and high trust both indicate interesting narrative positions
    score += suspicion * 0.4;
    score += trust * 0.3;

    // Minor boost if they share alliances with the player
    const inPlayerAlliance = gameState.alliances.some(
      a => a.members.includes(c.name) && a.members.includes(gameState.playerName)
    );
    if (inPlayerAlliance) score += 10;

    scored.push({ c, score });
  });

  return scored.sort((a, b) => b.score - a.score).map(s => s.c);
}

async function buildConfessionalForNPC(npc: Contestant, gameState: GameState): Promise<string | null> {
  const strategic = memoryEngine.getStrategicContext(npc.name, gameState);
  const activeCount = gameState.contestants.filter(c => !c.isEliminated).length;

  const currentStrategy = strategic?.currentStrategy || 'stay flexible and survive each vote';
  const recentEvents = (strategic?.recentEvents || []).slice(0, 3);
  const topThreats = (strategic?.topThreats || []).slice(0, 3);
  const allies = (strategic?.allies || []).slice(0, 3);

  const socialContext = {
    day: gameState.currentDay,
    activeCount,
    currentStrategy,
    topThreats,
    allies,
    recentEvents,
  };

  const playerMessage = [
    `It is day ${gameState.currentDay} with ${activeCount} people left.`,
    `You are alone in the diary room giving a confessional about your game.`,
    `Talk about how you see your position, the people you worry about, and any moves you made recently.`,
    `Be specific and grounded in relationships and votes rather than dramatic monologue.`,
  ].join(' ');

  const parsedInput = {
    primary: 'npc_confessional',
  };

  const text = await generateLocalAIReply(
    {
      playerMessage,
      parsedInput,
      npc: {
        name: npc.name,
        publicPersona: npc.publicPersona,
        psychProfile: npc.psychProfile,
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
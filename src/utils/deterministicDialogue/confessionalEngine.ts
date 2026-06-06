import { Contestant, GameState } from '@/types/game';
import { seededPick } from './decisionEngine';

// Build short, structured confessionals deterministically from NPC state.

const TEMPLATES = {
  paranoid: [
    "{player} is everywhere this week. That's never a coincidence.",
    "Something about how {player} has been moving feels rehearsed.",
    "I don't trust the smile. People who smile that much are counting votes.",
  ],
  threatened: [
    "If I don't move on {threat} soon, {threat} moves on me.",
    "{threat} is the biggest number in the room. That has to change.",
  ],
  loyal: [
    "{ally} is my anchor in here. I'm not breaking that.",
    "{ally} and I have an actual thing. The rest is noise.",
  ],
  scheming: [
    "Tonight I plant the seed. By tomorrow it's their idea.",
    "If I float {target}'s name three times this week, it sticks.",
  ],
  burnt: [
    "I gave them a chance. They used it against me. Done.",
    "That conversation wasn't a chat — it was a test, and I failed it on purpose.",
  ],
  reflective: [
    "Day {day}, and I'm still here. That's the only stat that matters.",
    "Down to {count}. Every word from here costs something.",
  ],
};

function pickTemplateKey(npc: Contestant, gameState: GameState): keyof typeof TEMPLATES {
  const susp = npc.psychProfile.suspicionLevel;
  const trust = npc.psychProfile.trustLevel;
  const activeCount = gameState.contestants.filter(c => !c.isEliminated).length;
  const recentBetrayal = (npc.memory || []).some(
    m => /betray|burned|flipped|lied/i.test(m.content || '') && gameState.currentDay - m.day <= 3
  );
  if (recentBetrayal) return 'burnt';
  if (susp >= 70) return 'paranoid';
  if (activeCount <= 6 && susp >= 50) return 'threatened';
  if (trust >= 60) return 'loyal';
  if (susp >= 40 && trust < 40) return 'scheming';
  return 'reflective';
}

export function buildDeterministicConfessional(npc: Contestant, gameState: GameState): string {
  const key = pickTemplateKey(npc, gameState);
  const seed = `${npc.id || npc.name}|conf|${gameState.currentDay}|${key}`;
  const tmpl = seededPick(TEMPLATES[key], seed) || TEMPLATES.reflective[0];

  const active = gameState.contestants.filter(c => !c.isEliminated && c.name !== npc.name);
  const ally = active.sort((a, b) => b.psychProfile.trustLevel - a.psychProfile.trustLevel)[0]?.name || gameState.playerName;
  const threat = active.sort((a, b) => b.psychProfile.suspicionLevel - a.psychProfile.suspicionLevel)[0]?.name || gameState.playerName;
  const target = threat;

  return tmpl
    .replace(/\{player\}/g, gameState.playerName)
    .replace(/\{ally\}/g, ally)
    .replace(/\{threat\}/g, threat)
    .replace(/\{target\}/g, target)
    .replace(/\{day\}/g, String(gameState.currentDay))
    .replace(/\{count\}/g, String(gameState.contestants.filter(c => !c.isEliminated).length));
}

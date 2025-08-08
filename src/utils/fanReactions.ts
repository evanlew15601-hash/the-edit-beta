import { GameState } from '@/types/game';

export function generateFanReactions(gameState: GameState): string[] {
  const { editPerception, currentDay } = gameState;
  const week = Math.floor(currentDay / 7) || 1;

  const base = editPerception.audienceApproval;
  const persona = editPerception.persona;

  const templatesPositive = [
    `That confession this week was iconic. ${persona} arc is real.`,
    `Low-key rooting for the player now. Growth every week!`,
    `Editor gave them so much screen time and they delivered.`,
    `Protect this one at all costs. Smart AND entertaining.`
  ];

  const templatesNeutral = [
    `Quiet week but I'm sensing a build-up. Next week will pop.`,
    `Under the radar but in a good way. Calculated.`,
    `Not much screen time but the vibes are shifting.`
  ];

  const templatesNegative = [
    `Villain era confirmed. That move was messy.`,
    `Too much screen time for that attitude.`,
    `Strategic or just chaotic? Jury is out.`
  ];

  let pool = templatesNeutral;
  if (base > 20) pool = templatesPositive;
  if (base < -20) pool = templatesNegative;

  // Personalize a bit with week and indices
  const reactions: string[] = [];
  for (let i = 0; i < 5; i++) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    reactions.push(`#Week${week}: ${pick}`);
  }
  return reactions;
}

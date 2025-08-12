import { GameState } from '@/types/game';

export function generateFanReactions(gameState: GameState): string[] {
  const { editPerception, currentDay } = gameState;
  const week = Math.floor(currentDay / 7) || 1;

  const base = editPerception.audienceApproval;
  const persona = editPerception.persona;

  const templatesPositive = [
    `Confessional clarity this week. ${persona} energy without forcing it.`,
    `Edit feels earned—steady screen time and a clean social read.`,
    `Subtle but effective moves; the audience can see the thread now.`,
    `Solid read of the room. Smart pacing, no extra fluff in the cut.`,
    `Growing arc: consistent diary rooms, consistent outcomes.`,
  ];

  const templatesNeutral = [
    `Quiet cut but intentional. Edging toward momentum.`,
    `Low screen-time, but the story still tracks.`,
    `Neutral edit: nothing invented, just vibes and small shifts.`,
    `Watching for a turn—foundation is there.`,
  ];

  const templatesNegative = [
    `Tone is slipping. Choices read messy in the cut.`,
    `Screen time without payoff isn’t helping.`,
    `Confessional didn’t land; narrative feels off-balance.`,
    `Momentum dipped—needs a reset next week.`,
  ];

  let pool = templatesNeutral;
  if (base > 20) pool = templatesPositive;
  if (base < -20) pool = templatesNegative;

  // Personalize a bit with week and indices, avoid inventing specifics
  const reactions: string[] = [];
  for (let i = 0; i < 6; i++) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    reactions.push(`#Week${week} • ${pick}`);
  }
  return reactions;
}

import { GameState } from '@/types/game';

export function generateFanReactions(gameState: GameState): string[] {
  const { editPerception, currentDay } = gameState;
  const week = Math.floor(currentDay / 7) || 1;

  const base = editPerception.audienceApproval;
  const persona = editPerception.persona;
  const screen = gameState.editPerception.screenTimeIndex;

  const templatesPositive = [
    `Confessional clarity this week. ${persona} energy without forcing it.`,
    `Edit feels earned—steady screen time and a clean social read.`,
    `Subtle but effective moves; the audience can see the throughline now.`,
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

  const byPersona: Record<string, string[]> = {
    Hero: [
      `Hero arc tracking—confessionals match outcomes.`,
      `Trustworthy beat: clear intent, clean execution.`,
    ],
    Villain: [
      `Compelling chaos—moves land even if messy.`,
      `Owns the screen; sharp edges but watchable.`,
    ],
    Underedited: [
      `Blink-and-miss—want more context for these moves.`,
      `Low presence but seeds are planted.`,
    ],
    Ghosted: [
      `Barely there—curious what the cameras are saving.`,
      `Story parked; waiting on a narrative turn.`,
    ],
    'Comic Relief': [
      `Levity landed; timing breaks the tension.`,
      `Fun beats that keep the episode breathing.`,
    ],
    'Dark Horse': [
      `Quiet competence—payoff brewing.`,
      `Shadows arc—few scenes, strong read.`,
    ],
  };

  let pool = templatesNeutral;
  if (base > 20) pool = templatesPositive;
  if (base < -20) pool = templatesNegative;

  const personaAdds = byPersona[persona] || [];

  const reactions: string[] = [];
  for (let i = 0; i < 6; i++) {
    const core = pool[Math.floor(Math.random() * pool.length)];
    const add = personaAdds.length ? ` ${personaAdds[Math.floor(Math.random() * personaAdds.length)]}` : '';
    const screenHint = screen > 60 ? ' • High presence this week.' : screen < 20 ? ' • Minimal presence.' : '';
    reactions.push(`#Week${week} • ${core}${add}${screenHint}`);
  }
  return reactions;
}

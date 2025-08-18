import { GameState } from '@/types/game';
import { memoryEngine } from './memoryEngine';

export function generateFanReactions(gameState: GameState): string[] {
  const { editPerception, currentDay } = gameState;
  const week = Math.floor(currentDay / 7) || 1;

  const base = editPerception.audienceApproval;
  const persona = editPerception.persona;
  const screen = gameState.editPerception.screenTimeIndex;

  // Get memory-driven events from this week
  const memory = memoryEngine.getMemorySystem();
  const weeklyEvents = memory.weeklyEvents[week] || [];
  const playerEvents = weeklyEvents.filter(event => 
    event.participants.includes(gameState.playerName)
  );

  // Generate reactions based on actual events
  const reactions: string[] = [];

  // Event-specific reactions
  playerEvents.forEach(event => {
    switch (event.type) {
      case 'alliance_form':
        reactions.push(`#Week${week} • New alliance forming - smart positioning or desperation move?`);
        break;
      case 'betrayal':
        reactions.push(`#Week${week} • The betrayal was messy but made for good TV. Villain edit incoming?`);
        break;
      case 'challenge':
        if (event.emotionalImpact > 5) {
          reactions.push(`#Week${week} • That challenge win was clutch. Hero moment right there.`);
        } else if (event.emotionalImpact < -3) {
          reactions.push(`#Week${week} • Challenge flop. The edit won't be kind about this one.`);
        }
        break;
      case 'scheme':
        reactions.push(`#Week${week} • Strategic gameplay finally showing. About time we see some moves.`);
        break;
      case 'vote':
        if (event.emotionalImpact > 3) {
          reactions.push(`#Week${week} • Solid vote - reading the room correctly.`);
        } else if (event.emotionalImpact < -3) {
          reactions.push(`#Week${week} • That vote choice might come back to haunt them.`);
        }
        break;
    }
  });

  // Persona-based reactions
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

  // Fill remaining slots with persona/approval reactions
  const personaAdds = byPersona[persona] || [];
  const remainingSlots = Math.max(0, 4 - reactions.length);
  
  const templatesPositive = [
    `Confessional clarity this week. ${persona} energy without forcing it.`,
    `Edit feels earned—steady screen time and a clean social read.`,
    `Subtle but effective moves; the audience can see the throughline now.`,
  ];

  const templatesNeutral = [
    `Quiet cut but intentional. Edging toward momentum.`,
    `Low screen-time, but the story still tracks.`,
    `Neutral edit: nothing invented, just vibes and small shifts.`,
  ];

  const templatesNegative = [
    `Tone is slipping. Choices read messy in the cut.`,
    `Screen time without payoff isn't helping.`,
    `Confessional didn't land; narrative feels off-balance.`,
  ];

  let pool = templatesNeutral;
  if (base > 20) pool = templatesPositive;
  if (base < -20) pool = templatesNegative;

  for (let i = 0; i < remainingSlots; i++) {
    const core = pool[Math.floor(Math.random() * pool.length)];
    const add = personaAdds.length ? ` ${personaAdds[Math.floor(Math.random() * personaAdds.length)]}` : '';
    const screenHint = screen > 60 ? ' • High presence this week.' : screen < 20 ? ' • Minimal presence.' : '';
    reactions.push(`#Week${week} • ${core}${add}${screenHint}`);
  }

  return reactions.slice(0, 6); // Limit to 6 reactions
}
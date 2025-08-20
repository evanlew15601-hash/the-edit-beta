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

  // Event-specific reactions with more variety
  const eventReactionPool: Record<string, string[]> = {
    alliance_form: [
      `Smart alliance move or desperate reach for safety?`,
      `New power bloc forming - could shake up the house`,
      `Strategic partnership or just convenience?`,
      `Alliance timing feels calculated but risky`
    ],
    betrayal: [
      `That betrayal was cold but effective television`,
      `Trust broken - but was it worth the fallout?`,
      `Messy move but might have been necessary`,
      `Villain moment that fans will remember`
    ],
    challenge: [
      `Challenge performance shows real competitor spirit`,
      `Physical game matching the strategic play`,
      `Competition win changes house dynamics`,
      `That challenge result shifts power balance`
    ],
    scheme: [
      `Strategic gameplay coming together nicely`,
      `Behind-the-scenes moves finally paying off`,
      `Calculated risk-taking at the right time`,
      `Social maneuvering shows game awareness`
    ],
    vote: [
      `Vote choice shows strong strategic thinking`,
      `Elimination decision reflects house dynamics`,
      `Voting pattern reveals true alliances`,
      `Smart positioning for next phase`
    ]
  };

  playerEvents.forEach(event => {
    const eventReactions = eventReactionPool[event.type];
    if (eventReactions) {
      const randomReaction = eventReactions[Math.floor(Math.random() * eventReactions.length)];
      reactions.push(`#Week${week} • ${randomReaction}`);
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
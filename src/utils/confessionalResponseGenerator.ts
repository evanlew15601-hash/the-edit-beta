import { GameState } from '@/types/game';
import { ConfessionalPrompt } from './confessionalEngine';

export function generateResponseOptions(prompt: ConfessionalPrompt, gameState: GameState): string[] {
  const { contestants, currentDay, alliances, editPerception } = gameState;
  const activeContestants = contestants.filter(c => !c.isEliminated && c.name !== gameState.playerName);
  const remainingCount = activeContestants.length + 1;
  const daysLeft = Math.max(0, gameState.nextEliminationDay - currentDay);
  
  // Create more variety with expanded options
  const baseOptions = generateBaseResponsesForPrompt(prompt, gameState);
  const tonalVariations = generateTonalVariations(prompt, gameState);
  const gameStateSpecific = generateGameStateSpecificOptions(prompt, gameState);
  
  // Combine and shuffle for variety
  const allOptions = [...baseOptions, ...tonalVariations, ...gameStateSpecific];
  return shuffleArray(allOptions).slice(0, 4);
}

function generateBaseResponsesForPrompt(prompt: ConfessionalPrompt, gameState: GameState): string[] {
  const { contestants, currentDay, alliances, editPerception } = gameState;
  const activeContestants = contestants.filter(c => !c.isEliminated && c.name !== gameState.playerName);
  
  switch (prompt.id) {
    case 'alliance_dynamics':
      return [
        `I think my alliance is solid for now, but I know eventually we'll have to turn on each other. I'm positioning myself to survive that.`,
        `There are cracks forming in our alliance. Some people are getting too comfortable and that makes them dangerous.`,
        `My alliance strategy is about loyalty until it's not. Right now I need these people, but I'm keeping my options open.`,
        `I feel good about my alliance but I'm not naive. Everyone here is playing for themselves ultimately.`
      ];

    case 'threat_assessment':
      const threat = activeContestants[0]?.name || 'them';
      return [
        `${threat} is definitely someone I'm keeping an eye on. They're playing hard and that could be a problem for my game.`,
        `I respect ${threat}'s game but they're getting too powerful. Something needs to be done about that soon.`,
        `${threat} thinks they're running this house but they're making themselves a target. I might not need to do anything.`,
        `${threat} is a strong player and I'd rather work with them than against them, but if they come for me, I'm ready.`
      ];

    case 'voting-plan':
      return [
        `I have a clear target in mind for this vote. It's someone who's been playing too hard too fast.`,
        `This vote is all about keeping the heat off me while taking out a threat. Strategic but not too obvious.`,
        `I'm torn between a few options, but I need to vote with my alliance to maintain trust.`,
        `My vote tonight is about long-term positioning. Sometimes you have to make moves that hurt now but help later.`
      ];

    case 'safety-concern':
      return [
        `I feel pretty safe this week but you never know in this game. I'm not taking anything for granted.`,
        `Honestly, I'm a little nervous. There's been some weird energy in the house and I don't know if I'm the target.`,
        `I think I'm good this week, but I'm always preparing for the worst. You have to in this game.`,
        `I'm confident in my position but paranoia keeps you alive in here. I'm staying alert.`
      ];

    case 'endgame_strategy':
      return [
        `My endgame is about taking people I can beat, but who also deserve to be there. It's a delicate balance.`,
        `I need to get to the end with the right people - loyal enough to take me, weak enough to lose to me.`,
        `My finale pitch will be about playing an honest game while making the moves I needed to make.`,
        `I'm thinking about jury management now. Every vote matters and every relationship could decide the winner.`
      ];

    case 'villain_defense':
      return [
        `If I'm the villain, so be it. I'm here to win, not to make friends. Sometimes that requires hard choices.`,
        `People can see me however they want. I know who I am and I'm playing the game I need to play.`,
        `The villain edit is just part of the game. I'd rather be seen as strategic than weak.`,
        `I'm not trying to be a villain, but I'm not going to apologize for making moves that benefit my game.`
      ];

    case 'underdog_story':
      return [
        `Flying under the radar has been intentional. Let everyone else fight while I position myself perfectly.`,
        `I know I haven't been getting much attention, but that's by design. The quiet game can be the winning game.`,
        `People sleeping on me is their mistake. I'm building relationships and making moves when it matters.`,
        `I may not be the loudest person here, but I'm observing everything and my time to shine is coming.`
      ];

    case 'homesick':
      return [
        `Day ${currentDay} and I miss home but this opportunity is worth it. I'm staying focused on why I'm here.`,
        `It's hard being away from family, but every day I'm here is a day closer to potentially changing my life.`,
        `The isolation is tough but it's also clarifying. It shows you who you really are under pressure.`,
        `Missing home keeps me motivated. I want to make this experience worth something when I get back.`
      ];

    case 'edit_awareness':
      return [
        `I think America sees me as ${editPerception.persona.toLowerCase()}. Whether that's accurate or not, I have to play with it.`,
        `The cameras catch everything, but they can only show what I give them. I try to be authentic while staying strategic.`,
        `I know I'm being watched and judged, but I can't let that change my game. I have to stay true to my strategy.`,
        `The edit will show what it shows. All I can do is play my game and hope the real me comes through.`
      ];

    default:
      // Generic responses for custom prompts
      return [
        `That's a complex situation and I'm still figuring out the best approach. This game changes every day.`,
        `I have thoughts about that, but I need to be careful about what I say and who might be listening.`,
        `It's all about timing in this game. Sometimes the right move isn't the obvious move.`,
        `Every decision here has consequences. I'm trying to think three steps ahead while dealing with today.`
      ];
  }
}

function generateTonalVariations(prompt: ConfessionalPrompt, gameState: GameState): string[] {
  const { editPerception, currentDay } = gameState;
  const intensity = editPerception.screenTimeIndex > 60 ? 'high' : editPerception.screenTimeIndex > 30 ? 'medium' : 'low';
  
  switch (prompt.id) {
    case 'alliance_dynamics':
      return [
        `My alliance feels secure but in this game, feelings don't matter - only actions do.`,
        `I trust my alliance as much as you can trust anyone here, which honestly isn't saying much.`,
        `Alliances are temporary partnerships. I'm committed until I'm not.`,
        `Working with my alliance is strategic, but I never forget everyone's playing for themselves.`
      ];
    case 'threat_assessment':
      return [
        `Some people here are playing chess while others are playing checkers. I see the difference.`,
        `There are obvious threats and hidden threats. The hidden ones worry me more.`,
        `Being paranoid in this game isn't paranoia - it's survival instinct.`,
        `I'm watching everyone but trying not to look like I'm watching everyone.`
      ];
    default:
      return [
        `The energy in the house shifts daily. You have to adapt or get left behind.`,
        `I came here with a plan but this game teaches you that plans are just starting points.`,
        `Every conversation here has layers. Nothing is ever just what it seems.`,
        `The pressure is getting to everyone differently. Some crack, some thrive.`
      ];
  }
}

function generateGameStateSpecificOptions(prompt: ConfessionalPrompt, gameState: GameState): string[] {
  const { contestants, alliances, currentDay } = gameState;
  const remainingCount = contestants.filter(c => !c.isEliminated).length;
  const phase = remainingCount > 8 ? 'early' : remainingCount > 5 ? 'middle' : 'endgame';
  
  const phaseSpecific = {
    early: [
      `It's still early but the foundation I'm building now will matter later.`,
      `Right now it's about positioning. Making big moves too early is dangerous.`,
      `Early game is about observation and relationship building. The strategy comes later.`
    ],
    middle: [
      `We're hitting the point where alliances start to fracture. I need to be ready.`,
      `The middle game is when your early positioning either pays off or destroys you.`,
      `This is when you find out who you can really trust in this game.`
    ],
    endgame: [
      `Every decision now directly impacts my path to the end. No room for error.`,
      `Endgame means jury management becomes just as important as strategy.`,
      `The finish line is close enough to see but far enough to lose everything.`
    ]
  };
  
  return phaseSpecific[phase] || [];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
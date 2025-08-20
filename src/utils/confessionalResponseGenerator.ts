import { GameState } from '@/types/game';
import { ConfessionalPrompt } from './confessionalEngine';

export function generateResponseOptions(prompt: ConfessionalPrompt, gameState: GameState): string[] {
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
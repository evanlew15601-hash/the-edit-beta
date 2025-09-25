
import { GameState } from '@/types/game';
import { DynamicConfessionalPrompt } from './enhancedConfessionalEngine';

interface ResponseTemplate {
  category: string;
  responses: string[];
}

const RESPONSE_TEMPLATES: ResponseTemplate[] = [
  {
    category: 'strategy',
    responses: [
      "I'm playing a careful game - making moves when I need to but not drawing attention.",
      "My strategy is to build trust with everyone and let them eliminate each other.",
      "I need to start making bigger moves or people will see me as just a follower.",
      "I'm positioning myself as someone everyone wants to work with until the very end.",
      "The key is knowing when to strike - too early and you're a target, too late and you're powerless.",
      "I'm playing multiple sides right now, which is risky but necessary.",
      "My plan is to eliminate the biggest threats before they realize I'm coming for them.",
      "I think I have what it takes to win, but I need to prove it in these next few weeks."
    ]
  },
  {
    category: 'alliance',
    responses: [
      "My alliance is solid right now, but I know that could change at any moment.",
      "I trust my alliance members, but I'm not naive - everyone is here to win.",
      "There are definitely some cracks forming, and I need to decide which side I'm on.",
      "I'm worried that some people in my alliance are getting too comfortable.",
      "We've been loyal to each other so far, but the game is about to get more cutthroat.",
      "I think we need to bring in one more person to secure our numbers.",
      "My alliance wants to target someone I'd rather keep around, which puts me in a tough spot.",
      "I'm playing without a solid alliance right now, which is terrifying but also liberating."
    ]
  },
  {
    category: 'voting',
    responses: [
      "If I had to vote right now, I'd probably go after the biggest overall threat.",
      "This vote is crucial - it could completely shift the power dynamics in the house.",
      "I'm torn between making a big move and playing it safe for another week.",
      "The house seems to be leaning one way, but I'm not sure that's the right move.",
      "I want to vote with the majority, but sometimes the majority is wrong.",
      "Someone needs to go who's been flying under the radar for too long.",
      "I'm nervous about this vote because it might expose where my true loyalties lie.",
      "This could be my chance to make a game-changing move if I have the courage."
    ]
  },
  {
    category: 'social',
    responses: [
      "I genuinely like them as a person, but this is still a game and I can't forget that.",
      "Something feels off about them lately - I'm keeping my guard up.",
      "They're playing both sides and I can see right through it.",
      "We have great chemistry, but I know they'd cut me if they had to.",
      "I think they see me as a bigger threat than I actually am.",
      "They've been giving me information, but I'm not sure how reliable it is.",
      "Our relationship started as strategy but it's becoming something more genuine.",
      "I trust them completely - we've had each other's backs since day one."
    ]
  },
  {
    category: 'reflection',
    responses: [
      "Looking back, I think I made some early mistakes that I'm still dealing with.",
      "I never expected to make it this far, but here I am and I'm not going down without a fight.",
      "This experience has taught me so much about myself and how I handle pressure.",
      "I came in with one strategy but I've had to completely adapt my approach.",
      "My biggest regret is probably trusting the wrong person too early in the game.",
      "I'm proud of how I've stayed true to myself while still playing strategically.",
      "The hardest part has been balancing being genuine with being competitive.",
      "I think I've grown as a person through this whole experience."
    ]
  },
  {
    category: 'general',
    responses: [
      "This game is so much more mental than I thought it would be.",
      "Every conversation could be the one that saves or destroys my game.",
      "I'm trying to stay positive but the pressure is really getting to everyone.",
      "People think they know who I am, but I have so much more to show them.",
      "The paranoia in this house is real - you can't trust anyone completely.",
      "I came here to win, and I'm not leaving until they force me out.",
      "This is the opportunity of a lifetime and I'm not wasting it.",
      "The social game is just as important as winning competitions."
    ]
  }
];

export function generateResponseOptions(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  // Get base responses for the prompt category
  const categoryResponses = RESPONSE_TEMPLATES.find(t => t.category === prompt.category)?.responses || [];
  
  // Generate contextual responses based on current game state
  const contextualResponses = generateContextualResponses(prompt, gameState);
  
  // Combine all responses
  const allResponses = [...categoryResponses, ...contextualResponses];
  
  // Shuffle and return a selection
  const shuffled = shuffleArray(allResponses);
  return shuffled.slice(0, Math.min(8, shuffled.length));
}

function generateContextualResponses(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  const responses: string[] = [];
  const activeCount = gameState.contestants.filter(c => !c.isEliminated).length;
  const playerAlliances = gameState.alliances.filter(a => a.members.includes(gameState.playerName));
  const daysToElimination = gameState.nextEliminationDay - gameState.currentDay;

  // Context-specific responses based on game state
  if (activeCount <= 6) {
    responses.push(
      "We're in the endgame now - every move has to be calculated perfectly.",
      "I need to start thinking about who I can actually beat in a final two."
    );
  }

  if (daysToElimination <= 2) {
    responses.push(
      "With elimination so close, I can't afford to make any mistakes.",
      "The pressure is intense right now - everyone is scrambling."
    );
  }

  if (playerAlliances.length === 0) {
    responses.push(
      "Playing solo is scary, but it also means I don't owe anyone anything.",
      "I need to find some allies fast or I'm going to be the next target."
    );
  }

  if (playerAlliances.length > 1) {
    responses.push(
      "I'm juggling multiple alliances right now, which is getting dangerous.",
      "Eventually these alliances are going to clash and I'll have to pick a side."
    );
  }

  // Add prompt-specific contextual responses
  switch (prompt.id) {
    case 'elimination-pressure':
      responses.push(
        "I think I'm safe this week, but you never know in this game.",
        "I'm worried there might be something brewing that I don't know about."
      );
      break;
    case 'alliance-trust':
      responses.push(
        "Trust is such a fluid thing in this game - it changes day by day.",
        "I want to believe in my alliance, but I've seen too many betrayals."
      );
      break;
    case 'competition-threat':
      responses.push(
        "Competition beasts are dangerous because they can save themselves.",
        "Sometimes you have to strike first before they get too powerful."
      );
      break;
  }

  return responses;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

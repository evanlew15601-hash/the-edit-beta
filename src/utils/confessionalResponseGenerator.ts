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
      "I need to stay under the radar while building strong alliances.",
      "My plan is to eliminate the biggest threats before they realize I'm coming for them.",
      "I'm playing a social game - people trust me and that's my biggest weapon.",
      "At this point, I need to start making big moves or I'll be seen as a follower.",
      "I'm focusing on jury management - every vote matters for the final.",
      "My strategy is simple: win competitions when I need to and lay low when I don't.",
      "I think I need to flip the script and target someone unexpected.",
      "Right now I'm trying to position myself as someone everyone wants to work with."
    ]
  },
  {
    category: 'social',
    responses: [
      "I trust them completely - we've had each other's backs since day one.",
      "Something feels off about them lately. I'm keeping my guard up.",
      "They're playing both sides and I see right through it.",
      "I think they see me as a bigger threat than I actually am.",
      "We have great chemistry, but I know they'd cut me if they had to.",
      "They're someone I genuinely want to work with long-term.",
      "I'm worried they're getting too close to people I don't trust.",
      "They've been giving me information, but I'm not sure if it's reliable."
    ]
  },
  {
    category: 'voting',
    responses: [
      "If I had to vote today, I'd probably target the biggest competition threat.",
      "I'm nervous about this vote - it could completely change my position.",
      "I think the house is leaning towards voting out someone I actually want to keep.",
      "This vote is crucial for my game. I need to make sure I'm on the right side.",
      "I'm torn between making a strategic move or playing it safe.",
      "Someone needs to go who's been playing too hard too fast.",
      "I want to vote with the majority, but the majority might be wrong.",
      "This might be my chance to make a big move, but the timing has to be perfect."
    ]
  },
  {
    category: 'alliance',
    responses: [
      "Our alliance is solid, but I'm starting to question some of our decisions.",
      "I trust my alliance members more than anyone else in this house.",
      "I think there are cracks forming and I need to decide which side I'm on.",
      "My alliance wants to target someone I'd rather keep around.",
      "I'm in multiple alliances and it's getting harder to juggle them all.",
      "I think we need to bring in one more person to strengthen our numbers.",
      "Some of my alliance members are getting too comfortable.",
      "I'm worried that someone in my alliance is feeding information to the other side."
    ]
  },
  {
    category: 'reflection',
    responses: [
      "Looking back, I think I made some mistakes early on that I'm still dealing with.",
      "I never expected to make it this far, but now I have to step up my game.",
      "This experience has taught me a lot about myself and how I handle pressure.",
      "I came in with one strategy, but I've had to completely change my approach.",
      "My biggest regret is probably trusting the wrong person too early.",
      "I'm proud of how I've adapted when things didn't go according to plan.",
      "The hardest part has been staying true to myself while playing strategically.",
      "I think I've grown so much as a person and as a competitor."
    ]
  },
  {
    category: 'general',
    responses: [
      "This game is so much more complex than I thought it would be.",
      "Every conversation could be the one that saves or destroys my game.",
      "I'm trying to balance being strategic with being authentic.",
      "The pressure is intense, but I'm not going down without a fight.",
      "People see me one way, but there's so much more to my game than they realize.",
      "I think I have what it takes to win, but I need to prove it now.",
      "This is the opportunity of a lifetime and I'm not wasting it.",
      "The mental game is just as important as the physical and social game."
    ]
  }
];

export function generateResponseOptions(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  const baseResponses = RESPONSE_TEMPLATES.find(t => t.category === prompt.category)?.responses || [];
  
  // Create contextual variations based on game state
  const contextualResponses = generateContextualResponses(prompt, gameState);
  
  // Combine and shuffle
  const allResponses = [...baseResponses, ...contextualResponses];
  
  // Return 6-8 unique responses
  const shuffled = shuffleArray(allResponses);
  return shuffled.slice(0, Math.min(8, shuffled.length));
}

function generateContextualResponses(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  const responses: string[] = [];
  const remainingCount = gameState.contestants.filter(c => !c.isEliminated).length;
  const playerAlliances = gameState.alliances.filter(a => a.members.includes(gameState.playerName));
  
  switch (prompt.category) {
    case 'strategy':
      if (remainingCount <= 6) {
        responses.push(
          "We're in the endgame now - every move has to be calculated.",
          "I need to start thinking about who I can beat in a final two."
        );
      }
      if (playerAlliances.length > 1) {
        responses.push("I'm juggling multiple alliances and it's getting dangerous.");
      }
      break;
      
    case 'alliance':
      if (playerAlliances.length === 0) {
        responses.push("I'm playing solo right now and it's scary but liberating.");
      }
      if (playerAlliances.some(a => a.strength < 60)) {
        responses.push("I can feel my alliance starting to fracture.");
      }
      break;
      
    case 'voting':
      if (gameState.immunityWinner === gameState.playerName) {
        responses.push("Having immunity changes everything - I can make bold moves.");
      }
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
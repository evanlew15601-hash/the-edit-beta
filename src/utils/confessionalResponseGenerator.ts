
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

/**
 * Tailored responses for twist-related prompts (host child / planted HG).
 * These are designed to map directly to the selected prompt ID so the answer feels connected.
 */
function generateTwistResponsesForPrompt(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  const id = prompt.id || '';
  const player = gameState.contestants.find(c => c.name === gameState.playerName);
  const isHostChild = player?.special && player.special.kind === 'hosts_estranged_child';
  const isPlanted = player?.special && player.special.kind === 'planted_houseguest';
  const res: string[] = [];

  if (id.startsWith('hc_') && isHostChild) {
    if (id === 'hc_keep_secret') {
      res.push(
        'I keep the focus on votes and numbers—my personal life stays outside the game.',
        'Rumors are oxygen; I starve them by playing cleaner than they expect.',
        'If people want a headline, I give them gameplay instead.',
      );
    } else if (id === 'hc_reveal_fallout') {
      res.push(
        'Trust is built in small scenes now—consistent actions, no theatrics.',
        'I’m rebuilding with honesty first, strategy second. In that order.',
        'I talk to the people I hurt first, then I let the rest watch me play.',
      );
    } else if (id === 'hc_edit_bias') {
      res.push(
        'The edit will tilt either way—I make sure the footage shows choices, not gossip.',
        'If the storyline drifts, I anchor it with confessionals about the game.',
        'I don’t control the narrative, but I control the next decision.',
      );
    }
  }

  if (id.startsWith('phg_') && isPlanted) {
    const firstTask = (player?.special && player.special.kind === 'planted_houseguest') ? (player.special.tasks || [])[0] : undefined;
    if (id === 'phg_mission_update') {
      res.push(
        firstTask ? `I make "${firstTask.description}" feel like everyone’s idea—never mine.` : 'I keep the mission invisible by aligning it with the house mood.',
        'I plant once, repeat lightly, and let someone else water it.',
        'The cover is consistency—one believable explanation, every time.',
      );
    } else if (id === 'phg_damage_control') {
      res.push(
        'If it slipped, I turn exposure into leverage: “I did it to help the game along.”',
        'I keep tone calm and detail specific—panic exposes you more than truth.',
        'I reframe the secret: it’s pressure I managed, not power I abused.',
      );
    } else if (id === 'phg_cover_story') {
      res.push(
        'My cover story is simple enough to repeat but broad enough to flex.',
        'I pick one line and say it the same way to everyone—it becomes true.',
        'I describe motives, not mechanics. People trust motives.',
      );
    }
  }

  if (id === 'arc_closer') {
    res.push(
      'What defined my season was how I turned moments into moves.',
      'The truth behind my edit is in the quiet decisions you didn’t notice.',
      'I played a story I could stand behind after the credits.',
    );
  }

  return res;
}

export function generateResponseOptions(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  // Get base responses for the prompt category
  const categoryResponses = RESPONSE_TEMPLATES.find(t => t.category === prompt.category)?.responses || [];
  
  // Generate contextual responses based on current game state
  const contextualResponses = generateContextualResponses(prompt, gameState);

  // Twist-aware answers mapped directly to the selected prompt
  const twistResponses = generateTwistResponsesForPrompt(prompt, gameState);

  // Producer tactic targeted responses (if any)
  const producerResponses = generateProducerResponsesIfAny(prompt, gameState);
  
  // Combine all responses and lightly weight prompt text to the front by echoing a concise framing
  const promptEcho = prompt.prompt ? [`${prompt.prompt.split('.')[0]}.`] : [];
  const allResponses = [...promptEcho, ...twistResponses, ...producerResponses, ...contextualResponses, ...categoryResponses];

  // Integrity guard: remove lines that reference events that haven't happened
  const validResponses = allResponses.filter(r => responseIsValid(r, gameState));
  
  // Shuffle and return a selection
  const shuffled = shuffleArray(validResponses);
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

// Producer tactic aware responses
function generateProducerResponsesIfAny(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  const res: string[] = [];
  const t = prompt.producerTactic?.kind;
  if (!t) return res;

  const activeContestants = gameState.contestants.filter(c => !c.isEliminated);
  const pickTarget = (): string | undefined => {
    const sorted = activeContestants
      .filter(c => c.name !== gameState.playerName)
      .sort((a, b) => (b.psychProfile.suspicionLevel || 0) - (a.psychProfile.suspicionLevel || 0));
    return sorted[0]?.name;
  };

  switch (t) {
    case 'soundbite':
      res.push(
        'The truth is… I make moves no one sees coming.',
        'The truth is… I’m playing my own game, not theirs.',
        'The truth is… trust is a currency and I’m rich.'
      );
      break;
    case 'bait': {
      const target = prompt.context?.targetName || pickTarget();
      if (target) {
        res.push(
          `${target} is a snake because they smile while they set traps.`,
          `${target} plays nice, then twists every conversation.`,
          `If ${target} wins, it’ll be because we ignored all the red flags.`
        );
      } else {
        res.push(
          'Some people smile with their mouth and lie with their eyes.',
          'The real threat is the one pretending to be harmless.'
        );
      }
      break;
    }
    case 'structured_retell': {
      const other = prompt.context?.targetName;
      res.push(
        `I was calm until ${other || 'they'} took it personal. That’s when it blew up.`,
        `First they pushed, then they denied it, and that’s when I drew a line.`,
        `I tried to de-escalate, but ${other || 'they'} wanted a scene—so I gave them one.`
      );
      break;
    }
    case 'damage_control':
      res.push(
        'I own my choices. If I hurt someone, I’ll fix it with gameplay, not excuses.',
        'It looked messy, but it was calculated—there’s a bigger plan behind it.',
        'That moment doesn’t define me; my next move will.'
      );
      break;
    case 'reframe':
      res.push(
        'I did what I had to because survival beats comfort.',
        'I did what I had to because loyalty without strategy is a liability.',
        'I did what I had to because this game rewards decisive people.'
      );
      break;
    case 'escalate':
      res.push(
        'Put me on the block, I’ll talk my way off.',
        'They keep underestimating me—until it’s too late.',
        'Everyone thinks they’re running the house. I actually am.'
      );
      break;
  }

  return res;
}

// Prevent responses that imply events that haven't occurred
function responseIsValid(text: string, gameState: GameState): boolean {
  const t = text.toLowerCase();
  const activeCount = gameState.contestants.filter(c => !c.isEliminated).length;

  const allowImmunity = !!gameState.immunityWinner;
  const allowJury = typeof gameState.daysUntilJury === 'number'
    ? gameState.daysUntilJury <= 0 || (gameState.juryMembers && gameState.juryMembers.length > 0)
    : false;
  const allowFinaleTalk = activeCount <= 5 || ['finale', 'post_season', 'final_3_vote'].includes(gameState.gamePhase);
  const allowEliminationTalk = (gameState.nextEliminationDay - gameState.currentDay) <= 2 || (gameState.votingHistory && gameState.votingHistory.length > 0);

  if (t.includes('immunity') && !allowImmunity) return false;
  if (t.includes('jury') && !allowJury) return false;
  if (t.includes('finale') && !allowFinaleTalk) return false;
  if (t.includes('elimination') && !allowEliminationTalk) return false;

  // Avoid lines that assert a win unless we have immunity winner (minimal check)
  if ((t.includes('won') || t.includes('win ')) && !allowImmunity) return false;

  return true;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

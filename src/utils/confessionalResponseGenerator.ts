
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
  // Strictly anchored to prompt
  const anchored = generatePromptAnchoredResponses(prompt, gameState);

  // Twist-aware answers mapped directly to the selected prompt
  const twistResponses = generateTwistResponsesForPrompt(prompt, gameState);

  // Contextual + producer + prompt-specific variants
  const contextualResponses = generateContextualResponses(prompt, gameState);
  const producerResponses = generateProducerResponsesIfAny(prompt, gameState);

  // Contextual lines (kept minimal and prompt-aware)
  const contextualResponses = generateContextualResponses(prompt, gameState);

  // Combine anchored first, then twist/producer/context
  const combined = [...anchored, ...twistResponses, ...producerResponses, ...contextualResponses];

  // Integrity guard: remove lines that reference events that haven't happened
  const valid = combined.filter(r => responseIsValid(r, gameState));

  // If very short, add a couple of category-coherent fallbacks strictly tied to the topic
  let pool = valid;
  if (pool.length < 3) {
    const catFallbacks = generatePromptAnchoredResponses(
      { ...prompt, id: `fallback-${prompt.category}` } as DynamicConfessionalPrompt,
      gameState
    );
    pool = [...pool, ...catFallbacks].filter((r, i, arr) => arr.indexOf(r) === i);
  }

  // Expand with variations (the UI will page these so they don't all show at once)
  const withVariations = generateVariationsForResponses(pool, prompt.suggestedTones?.[0]);

  // Shuffle and return a larger pool for paging; UI will slice to show only a few
  const shuffled = shuffleArray(withVariations);
  return shuffled.slice(0, Math.min(24, shuffled.length));
}

function pickAlternativeTarget(gameState: GameState, skip: string, exclude: string[] = []): string | undefined {
  const active = gameState.contestants.filter(c => !c.isEliminated && c.name !== skip && !exclude.includes(c.name));
  const sorted = active.sort((a, b) => (b.psychProfile.suspicionLevel || 0) - (a.psychProfile.suspicionLevel || 0));
  return sorted[0]?.name || undefined;
}

function listNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function generateContextualResponses(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  const responses: string[] = [];
  const activeCount = gameState.contestants.filter(c => !c.isEliminated).length;
  const playerAlliances = gameState.alliances.filter(a => a.members.includes(gameState.playerName));
  const daysToElimination = gameState.nextEliminationDay - gameState.currentDay;
  const entities = extractEntitiesFromPrompt(prompt, gameState);
  const target = entities[0];

  // Keep contextual responses relevant to the prompt category
  if (prompt.category === 'strategy' && activeCount <= 6) {
    responses.push(
      "We're in the endgame now - every move has to be calculated perfectly.",
      "I need to start thinking about who I can actually beat in a final two."
    );
  }

  if (prompt.category === 'voting' && daysToElimination <= 2) {
    responses.push(
      "With elimination so close, I can't afford to make any mistakes.",
      "The pressure is intense right now - everyone is scrambling."
    );
  }

  if (prompt.id === 'alliance-trust' && playerAlliances.length > 1) {
    responses.push(
      "Playing solo is scary, but it also means I don't owe anyone anything.",
      "I need to find some allies fast or I'm going to be the next target."
    );
  }

  if (prompt.id === 'competition-threat') {
    responses.push(
      "I'm juggling multiple alliances right now, which is getting dangerous.",
      "Eventually these alliances are going to clash and I'll have to pick a side."
    );

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

// Specific text tailored to the selected prompt
function generatePromptSpecificResponses(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  const res: string[] = [];
  const entities = extractEntitiesFromPrompt(prompt, gameState);
  const target = entities[0];

  switch (prompt.id) {
    case 'recent-dm-0':
    case 'recent-dm-1':
    case 'recent-dm-2':
      if (target) {
        res.push(
          `${target} shared something interesting—I’m testing if it’s real.`,
          `I gave ${target} a nugget to see if it spreads.`
        );
      }
      break;
    case 'recent-scheme-0':
    case 'recent-scheme-1':
    case 'recent-scheme-2':
      if (target) {
        res.push(
          `The talk about ${target} set up a path—we’ll see who bites.`,
          `If ${target} becomes the name, I need deniability ready.`
        );
      }
      break;
    case 'alliance-update-0':
    case 'alliance-update-1':
    case 'alliance-update-2':
      if (prompt.context?.members?.length) {
        res.push(
          `I’m keeping ${prompt.context.members.join(' and ')} aligned without overpromising.`,
          `If anyone wobbles, I’ll lock numbers with a side deal.`
        );
      }
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

  if ((t.includes('won') || t.includes('win ')) && !allowImmunity) return false;

  return true;
}

// Extract contestant names mentioned directly in the prompt text
function extractEntitiesFromPrompt(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  const text = `${prompt.prompt} ${prompt.followUp || ''}`.toLowerCase();
  const names = gameState.contestants
    .map(c => c.name)
    .filter(n => text.includes(n.toLowerCase()));
  const fromContext = prompt.context?.targetName ? [prompt.context.targetName] : [];
  const members = Array.isArray(prompt.context?.members) ? prompt.context.members : [];
  return Array.from(new Set([...(names || []), ...fromContext, ...members]));
}

// Keyword set by category + prompt id hints
function keywordsForPrompt(prompt: DynamicConfessionalPrompt): string[] {
  const k: string[] = [];
  switch (prompt.category) {
    case 'strategy':
      k.push('strategy', 'plan', 'move', 'position', 'numbers', 'threat', 'target');
      break;
    case 'alliance':
      k.push('alliance', 'trust', 'loyal', 'numbers', 'cracks');
      break;
    case 'voting':
      k.push('vote', 'numbers', 'majority', 'target', 'house');
      break;
    case 'social':
      k.push('relationship', 'friend', 'connection', 'trust', 'chemistry', 'guard');
      break;
    case 'reflection':
      k.push('looking', 'regret', 'mistake', 'learned', 'changed', 'proud', 'pressure');
      break;
    case 'general':
      k.push('game', 'house', 'america', 'edit', 'truth');
      break;
  }
  if (prompt.id.includes('competition-threat')) k.push('competition', 'immunity', 'danger');
  if (prompt.id.includes('recent-conflict')) k.push('conflict', 'blow-up', 'calm', 'push');
  if (prompt.id.includes('recent-dm')) k.push('dm', 'intel', 'private', 'information');
  if (prompt.id.includes('recent-scheme')) k.push('scheme', 'plan', 'setup');
  if (prompt.id.includes('jury-approaching')) k.push('jury', 'threat', 'story');
  if (prompt.id.includes('finale-positioning')) k.push('finale', 'endgame', 'moves');
  return k;
}

// Check if response text matches any keywords or entities
function responseMatchesPrompt(text: string, keywords: string[], entities: string[], category: string): boolean {
  const t = text.toLowerCase();
  const hasEntity = entities.some(e => t.includes(e.toLowerCase()));
  const hasKeyword = keywords.some(k => t.includes(k));
  if (category === 'general') {
    // Looser for general prompts
    return hasKeyword || hasEntity || t.includes('truth');
  }
  return hasKeyword || hasEntity;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

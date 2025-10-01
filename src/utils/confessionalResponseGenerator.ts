
import { GameState } from '@/types/game';
import { DynamicConfessionalPrompt } from './enhancedConfessionalEngine';

/**
 * Strictly prompt-anchored confessional responses, with lightweight variation generation.
 * Goal: Only surface answers that directly address the selected prompt, and provide
 * multiple variations without dumping everything at once (UI controls paging).
 */

// Prompt-specific anchored responses (dynamic based on game state)
function generatePromptAnchoredResponses(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  const res: string[] = [];
  const activeContestants = gameState.contestants.filter(c => !c.isEliminated);
  const activeCount = activeContestants.length;
  const playerAlliances = gameState.alliances.filter(a => a.members.includes(gameState.playerName) && !a.dissolved);
  const otherMembers = playerAlliances[0]?.members.filter(m => m !== gameState.playerName) || [];
  const daysToElim = gameState.nextEliminationDay - gameState.currentDay;

  const topSuspicious = [...activeContestants]
    .filter(c => c.name !== gameState.playerName)
    .sort((a, b) => (b.psychProfile.suspicionLevel || 0) - (a.psychProfile.suspicionLevel || 0))[0];

  const highTrust = [...activeContestants]
    .filter(c => c.name !== gameState.playerName && c.psychProfile.trustLevel > 60)
    .sort((a, b) => (b.psychProfile.trustLevel || 0) - (a.psychProfile.trustLevel || 0))[0];

  // Recent conflict partner (last 2 days, aggressive tone)
  const recentConflict = gameState.interactionLog
    ?.filter(l => l.day >= gameState.currentDay - 2 && l.tone === 'aggressive')
    .slice(-1)[0];
  const conflictOther = recentConflict?.participants.find(p => p !== gameState.playerName);

  switch (prompt.id) {
    case 'mid-game-strategy':
      res.push(
        `With ${activeCount} left, my plan is to lower my threat and manage numbers.`,
        `I'm sitting between power groups and letting them clash while I collect votes.`,
        `I need to pick endgame matchups at ${activeCount} and start quietly closing doors.`
      );
      break;
    case 'endgame-strategy':
      res.push(
        `At ${activeCount}, it's all jury optics and matchups.`,
        `I'm shaping a path where I sit next to people I actually beat at the end.`,
        `Every relationship is now either a shield or a liability—I'm pruning accordingly.`
      );
      break;
    case 'elimination-pressure':
      res.push(
        daysToElim <= 2 ? `Elimination is close; I'm calibrating votes hour by hour.` : `I'm already planning this week's votes before it gets chaotic.`,
        `I think I'm safe, but I'm not complacent—one flip changes everything.`,
        `If my name starts floating, I have a contingency ready.`
      );
      break;
    case 'alliance-trust':
      if (otherMembers.length > 0) {
        const [m1, m2] = otherMembers;
        res.push(
          `With ${otherMembers.join(' and ')}, trust is conditional and earned daily.`,
          m2 ? `I trust ${m1} more than ${m2}—that's my current read.` : `I trust ${m1}, but I verify every promise.`,
          `I'm testing loyalty before the vote, not after.`
        );
      } else {
        res.push(
          `If I commit to an alliance, I need proof they'll carry votes, not just words.`,
          `Trust is a currency—I'm spending it carefully this week.`,
          `I keep receipts; loyalty gets measured in actions.`
        );
      }
      break;
    case 'solo-game':
      res.push(
        `Without a solid alliance, I insulate my game with relationships and information.`,
        `I trade intel for goodwill and keep options open on both sides of the house.`,
        `I move in pairs, not packs—less exposure, more leverage.`
      );
      break;
    case 'social-connection':
      if (highTrust) {
        res.push(
          `With ${highTrust.name}, the connection is real—but game first, always.`,
          `${highTrust.name} and I click, but I'd still cut them if the math demands it.`,
          `It's genuine rapport with ${highTrust.name}, and I'm steering it toward votes.`
        );
      } else {
        res.push(
          `Real connection matters, but I anchor it to decisions, not vibes.`,
          `I keep bonds warm and promises conditional.`,
          `I make friendship useful without letting it blind me.`
        );
      }
      break;
    case 'competition-threat':
      if (topSuspicious) {
        const competitiveName = gameState.immunityWinner || topSuspicious.name;
        res.push(
          `${competitiveName} is dangerous because they can save themselves when it matters.`,
          `You either clip ${competitiveName} early or you watch them stack wins.`,
          `I'm scouting the week I make the move on ${competitiveName}—with numbers ready.`
        );
      } else {
        res.push(
          `Competition beasts force you to plan two weeks ahead.`,
          `If someone keeps saving themselves, you adjust the plan to remove their votes.`,
          `Threats grow if ignored; I trim them before endgame.`
        );
      }
      break;
    case 'game-reflection':
      res.push(
        `It's day ${gameState.currentDay}; I can name my wins and own my mistakes.`,
        `I adapted when plans broke—that's why I'm still here.`,
        `If I could restart, I'd pace trust slower and moves faster.`
      );
      break;
    case 'recent-conflict':
      if (conflictOther) {
        res.push(
          `Things got heated with ${conflictOther}; my side is simple: I matched energy, not malice.`,
          `I won't relitigate it, but ${conflictOther} pushed—I'm focused on consequences now.`,
          `I made my line clear with ${conflictOther}; next beat is managing fallout.`
        );
      } else {
        res.push(
          `When conflict hits, I keep it clean: one point, one boundary, then back to votes.`,
          `I de-escalate unless someone makes it personal—then I frame it and move.`,
          `Drama's a tool; I use it to set up the next decision.`
        );
      }
      break;
    case 'voting-strategy':
      if (topSuspicious) {
        res.push(
          `If I voted now, I'd target ${topSuspicious.name} and build the numbers before they notice.`,
          `The right vote is the one that weakens ${topSuspicious.name}'s web and strengthens mine.`,
          `I don't need unanimous—I need enough, and the story to justify it.`
        );
      } else {
        res.push(
          `I vote to shape the board, not to settle grudges.`,
          `I pick targets that collapse rival numbers and open lanes for me.`,
          `Votes are currency; I invest where returns compound.`
        );
      }
      break;
    case 'personal-growth':
      res.push(
        `This game forced me to make decisions I used to avoid—I'm sharper for it.`,
        `I learned how to stay calm while everything around me spun.`,
        `I grew by owning outcomes, not excuses.`
      );
      break;
    case 'early-game-positioning':
      res.push(
        `Early game is about insulation—make yourself useful, not loud.`,
        `I keep targets bigger than me and promises smaller than I can't keep.`,
        `I gather information and spend it sparingly for safety.`
      );
      break;
    case 'power-dynamics':
      res.push(
        `Power's shifting; I sit close enough to influence, far enough to dodge heat.`,
        `I map who actually moves votes and I attach myself to that engine.`,
        `I ride the wave now and plan to redirect it later.`
      );
      break;
    case 'jury-approaching':
      res.push(
        `With jury near, I'm tracking reputation as hard as numbers.`,
        `You build your final pitch now—every move needs a clean story.`,
        `Threat management matters, but so does looking like a closer.`
      );
      break;
    case 'finale-positioning':
      res.push(
        `Finale talk means pruning relationships into shields and goats.`,
        `I need a lane where my resume reads decisions, not accidents.`,
        `I pick endgame partners I beat on perception and performance.`
      );
      break;
    case 'edit-shaping':
      res.push(
        `To get screen time without blowing my game, I give clean confessionals with quotable lines.`,
        `I anchor the narrative in choices, not noise—producers cut clarity.`,
        `Bold line, simple story, visible move—that's how I get noticed.`
      );
      break;
    case 'balance-comedy-strategy':
      res.push(
        `My humor disarms; the strategy lands in the silence after.`,
        `I let jokes carry the social game and decisions carry the resume.`,
        `Funny keeps doors open; strategy decides who walks through.`
      );
      break;
    case 'underestimated':
      res.push(
        `People underestimate me because I'm measured—then I take the shot.`,
        `Being underestimated is leverage; I spend it when it hurts most.`,
        `I want them sleeping on me until the move wakes them up.`
      );
      break;
    case 'biggest-mistake':
      res.push(
        `My biggest mistake was trusting pace over proof—I've corrected that.`,
        `I misread an alliance early; now I test loyalty with actions first.`,
        `I learned the hard way to separate friendship from votes.`
      );
      break;
    case 'prod-soundbite-truth':
    case 'prod-bait-rival':
    case 'prod-retell-conflict':
    case 'prod-damage-control':
    case 'prod-reframe-persona':
      // Producer-tactic prompts get handled via generateProducerResponsesIfAny
      break;
    default: {
      // Fallback: keep strictly tied to prompt category
      const cat = prompt.category;
      if (cat === 'strategy') {
        res.push(
          `Strategy-wise, I balance threat and numbers for this exact situation.`,
          `I answer this by picking timing—early strike or late shield.`,
          `The plan responds to this prompt with calm moves and sharp outcomes.`
        );
      } else if (cat === 'alliance') {
        res.push(
          `On alliances, this question maps to trust I can verify.`,
          `I treat this as a loyalty test I run before the vote.`,
          `I keep commitments narrow and measurable around this topic.`
        );
      } else if (cat === 'voting') {
        res.push(
          `For this vote, I shape outcomes—not headlines.`,
          `The numbers for this exact scenario are already penciled in.`,
          `I pick the target that changes the board the most.`
        );
      } else if (cat === 'social') {
        res.push(
          `Socially, I keep this focused on bonding that converts to votes.`,
          `I manage warmth and boundaries around this situation.`,
          `I read intent first, then respond in kind.`
        );
      } else if (cat === 'reflection' || cat === 'general') {
        res.push(
          `I answer this honestly and tie it back to a decision I own.`,
          `The lesson here is pacing—on trust, on moves, on fallout.`,
          `I keep the takeaway simple so the next choice is clear.`
        );
      }
    }
  }

  return res;
}

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

// Lightweight synonym-based paraphrasing for variations
const SYNONYMS: Record<string, string[]> = {
  strategy: ['approach', 'plan'],
  numbers: ['votes', 'counts'],
  trust: ['confidence', 'faith'],
  eliminate: ['clip', 'remove'],
  threat: ['danger', 'problem'],
  alliance: ['group', 'team'],
  connect: ['bond', 'rapport'],
  votes: ['numbers', 'support'],
  calm: ['steady', 'composed'],
  move: ['play', 'decision'],
  finale: ['endgame', 'final stretch'],
};

function applySynonyms(text: string): string {
  let out = text;
  Object.keys(SYNONYMS).forEach((key) => {
    const variants = SYNONYMS[key];
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    if (regex.test(out)) {
      const replacement = variants[Math.floor(Math.random() * variants.length)];
      out = out.replace(regex, replacement);
    }
  });
  return out;
}

function withPrefix(text: string): string {
  const prefixes = ['Honestly, ', 'If I’m being real, ', 'Bottom line: '];
  const pick = prefixes[Math.floor(Math.random() * prefixes.length)];
  return pick + text.charAt(0).toLowerCase() + text.slice(1);
}

function withToneSuffix(text: string, toneHint?: string): string {
  switch (toneHint) {
    case 'aggressive':
      return `${text} And I won't apologize for it.`;
    case 'vulnerable':
      return `${text} And, yeah, that scares me a little.`;
    case 'humorous':
      return `${text} Which is kind of hilarious if you think about it.`;
    case 'dramatic':
      return `${text} The stakes couldn't be higher now.`;
    case 'strategic':
      return `${text} That's the calculus I'm making.`;
    case 'evasive':
      return `${text} I'll just say that.`;
    default:
      return text;
  }
}

function generateVariationsForResponses(baseResponses: string[], toneHint?: string): string[] {
  const out: string[] = [];
  baseResponses.forEach((line) => {
    const v1 = applySynonyms(line);
    const v2 = withPrefix(line);
    const v3 = withToneSuffix(line, toneHint);
    out.push(line, v1, v2, v3);
  });
  // Deduplicate after variations
  return Array.from(new Set(out));
}

export function generateResponseOptions(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  // Strictly anchored to prompt
  const anchored = generatePromptAnchoredResponses(prompt, gameState);

  // Twist-aware answers mapped directly to the selected prompt
  const twistResponses = generateTwistResponsesForPrompt(prompt, gameState);

  // Producer tactic targeted responses (if any)
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

function generateContextualResponses(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  const responses: string[] = [];
  const activeCount = gameState.contestants.filter(c => !c.isEliminated).length;
  const playerAlliances = gameState.alliances.filter(a => a.members.includes(gameState.playerName));
  const daysToElimination = gameState.nextEliminationDay - gameState.currentDay;

  // Keep contextual responses relevant to the prompt category
  if (prompt.category === 'strategy' && activeCount <= 6) {
    responses.push(
      `Endgame at ${activeCount} means timing over theatrics.`,
      `From here, every move needs a clean jury story.`
    );
  }

  if (prompt.category === 'voting' && daysToElimination <= 2) {
    responses.push(
      `With the vote near, I'm triple-counting numbers.`,
      `Safe isn't real unless the math holds.`
    );
  }

  if (prompt.id === 'alliance-trust' && playerAlliances.length > 1) {
    responses.push(
      `Juggling alliances is risk; I keep one truth per person and never improvise.`,
      `Eventually these groups collide—I want to be the one directing traffic.`
    );
  }

  if (prompt.id === 'competition-threat') {
    responses.push(
      `Competition beasts force the plan into earlier weeks.`,
      `I build a trap with numbers, then I spring it.`
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


import { GameState } from '@/types/game';
import { DynamicConfessionalPrompt } from './enhancedConfessionalEngine';

/**
 * Pre-written, human-sounding confessional lines.
 * No dynamic paraphrasing, no synonym churn, no artificial prefixes/suffixes.
 * We only fill simple tags from game context (names, counts, days) and return
 * a curated set of lines tied to the selected prompt.
 */

/** Static templates keyed by prompt id. Placeholders:
 * {PLAYER} - current player's name
 * {ACTIVE_COUNT} - number of active (non-eliminated) contestants
 * {DAYS_TO_ELIM} - days until next elimination
 * {OTHER_MEMBERS} - alliance members (excluding player), joined with " and "
 * {HIGH_TRUST_NAME} - a high-trust contestant's name
 * {TOP_SUSPICIOUS_NAME} - the most suspicious contestant's name
 * {COMPETITIVE_NAME} - a competitive threat (immunity winner if present)
 * {CONFLICT_OTHER} - most recent conflict partner
 * {CURRENT_DAY} - current day number
 * {TARGET} - producer/context target when applicable
 */
const TEMPLATES: Record<string, string[]> = {
  // Strategy progression
  'mid-game-strategy': [
    'With {ACTIVE_COUNT} left, I need to manage numbers without looking like a threat.',
    'I’m sitting between groups and letting them clash while I build votes.',
    'This is the phase where matchups matter—who I can actually beat at the end.'
  ],
  'endgame-strategy': [
    'At {ACTIVE_COUNT}, it’s all about jury optics and closing doors cleanly.',
    'I’m shaping a lane where the finals make sense for me—not just for the edit.',
    'Every relationship is either a shield or a liability. I’m pruning accordingly.'
  ],

  // Voting week
  'elimination-pressure': [
    'Elimination is close. I’m calibrating numbers hour by hour.',
    'I feel safe enough, but one flip changes everything.',
    'If my name starts to float, I already know the counter-move.'
  ],

  // Alliances
  'alliance-trust': [
    'With {OTHER_MEMBERS}, trust is earned daily and tested before the vote.',
    'I trust one of them more than the other—and I’m acting like that’s true.',
    'I verify promises. Loyalty gets measured in actions, not talk.'
  ],
  'solo-game': [
    'Without a solid alliance, I’m insulating with relationships and information.',
    'I trade intel for goodwill and keep options open on both sides of the house.',
    'Smaller circles, cleaner moves. Less exposure, more leverage.'
  ],

  // Social dynamics
  'social-connection': [
    'With {HIGH_TRUST_NAME}, the connection feels real—game first, always.',
    '{HIGH_TRUST_NAME} and I click, but I’d still cut them if the math says so.',
    'It’s genuine, and I’m steering it toward votes without making it messy.'
  ],

  // Threats and competitions
  'competition-threat': [
    '{COMPETITIVE_NAME} is dangerous because they can save themselves when it matters.',
    'You clip {COMPETITIVE_NAME} early or you watch them stack wins later.',
    'I’m scouting the week I make the move—with numbers ready.'
  ],

  // Reflection
  'game-reflection': [
    'It’s day {CURRENT_DAY}. I can name my wins and own my mistakes.',
    'Plans broke and I adapted. That’s why I’m still here.',
    'If I could restart, I’d pace trust slower and moves faster.'
  ],
  'personal-growth': [
    'This game forced decisions I used to avoid. I’m sharper for it.',
    'I learned how to stay calm while everything around me spun.',
    'I grew by owning outcomes, not excuses.'
  ],

  // Conflicts
  'recent-conflict': [
    'Things got heated with {CONFLICT_OTHER}. I matched energy, not malice.',
    'I won’t relitigate it. {CONFLICT_OTHER} pushed—now I manage the fallout.',
    'I set a clear line with {CONFLICT_OTHER}. The next beat is repair or distance.'
  ],

  // Voting strategy
  'voting-strategy': [
    'Right now I’d target {TOP_SUSPICIOUS_NAME} and build numbers before they notice.',
    'The right vote weakens {TOP_SUSPICIOUS_NAME}’s web and strengthens mine.',
    'I don’t need unanimous; I need enough—and the story to justify it.'
  ],

  // Stage-aware strategy
  'early-game-positioning': [
    'Early game is insulation—be useful, not loud.',
    'Keep targets bigger than you and promises small enough to keep.',
    'Gather information and spend it sparingly for safety.'
  ],
  'power-dynamics': [
    'Power’s shifting. I sit close enough to influence, far enough to dodge heat.',
    'I map who actually moves votes and attach to that engine.',
    'Ride the wave now, redirect it later.'
  ],
  'jury-approaching': [
    'With jury near, I’m tracking reputation as hard as numbers.',
    'You build your final pitch now—every move needs a clean story.',
    'Threat management matters, but so does looking like a closer.'
  ],
  'finale-positioning': [
    'Finale talk means pruning relationships into shields and goats.',
    'I need an endgame where my resume reads decisions, not accidents.',
    'I pick partners I beat on perception and performance.'
  ],
  'immunity-era-ends': [
    'With the weekly safety comp gone at {ACTIVE_COUNT}, every vote is naked math and relationships.',
    'No more automatic safety. If you misread the house now, you go home.',
    'Endgame without a safety net forces people to show where they really stand.'
  ],

  // Edit-awareness prompts
  'edit-shaping': [
    'To get screen time without blowing my game, I give clean confessionals with quotable lines.',
    'I anchor the narrative in choices, not noise. Producers cut clarity.',
    'Bold line, simple story, visible move—that’s how I get noticed.'
  ],
  'balance-comedy-strategy': [
    'My humor disarms; the strategy lands in the silence after.',
    'I let jokes carry the social game and decisions carry the resume.',
    'Funny keeps doors open; strategy decides who walks through.'
  ],
  'underestimated': [
    'People underestimate me because I’m measured—then I take the shot.',
    'Being underestimated is leverage. I spend it when it hurts most.',
    'I want them sleeping on me until the move wakes them up.'
  ],
  'biggest-mistake': [
    'Trusting pace over proof was my biggest mistake—and I corrected it.',
    'I misread an alliance early. Now I test loyalty with actions first.',
    'I learned to separate friendship from votes.'
  ],

  // Producer tactic prompts (fixed phrasing)
  'prod-soundbite-truth': [
    'The truth is… I make moves no one sees coming.',
    'The truth is… I’m playing my own game, not theirs.',
    'The truth is… trust is a currency and I’m rich.'
  ],
  'prod-bait-rival': [
    '{TARGET} smiles while they set traps.',
    '{TARGET} plays nice, then twists every conversation.',
    'If {TARGET} wins, it’s because we ignored all the red flags.'
  ],
  'prod-retell-conflict': [
    'I was calm until {TARGET} took it personal. That’s when it blew up.',
    'First they pushed, then they denied it—so I drew a line.',
    'I tried to de-escalate. {TARGET} wanted a scene, so I gave them one.'
  ],
  'prod-damage-control': [
    'I own my choices. If I hurt someone, I’ll fix it with gameplay—not excuses.',
    'It looked messy, but it was calculated. There’s a bigger plan behind it.',
    'That moment doesn’t define me. My next move will.'
  ],
  'prod-reframe-persona': [
    'I did what I had to because survival beats comfort.',
    'I did what I had to because loyalty without strategy is a liability.',
    'I did what I had to because this game rewards decisive people.'
  ],

  // Twist arcs
  'hc_keep_secret': [
    'I keep focus on votes and numbers—my personal life stays outside the game.',
    'Rumors are oxygen. I starve them by playing cleaner than they expect.',
    'If they want a headline, I give them gameplay instead.'
  ],
  'hc_reveal_fallout': [
    'Trust is built in small scenes now—consistent actions, no theatrics.',
    'I’m rebuilding with honesty first, strategy second.',
    'I talk to the people I hurt first, then let the rest watch me play.'
  ],
  'hc_edit_bias': [
    'The edit will tilt either way. I make sure the footage shows choices, not gossip.',
    'If the storyline drifts, I anchor it with clean confessionals about the game.',
    'I don’t control the narrative, but I control the next decision.'
  ],
  'phg_mission_update': [
    'I make the mission feel like everyone’s idea—never mine.',
    'I plant once, repeat lightly, and let someone else water it.',
    'The cover is consistency—one believable explanation, every time.'
  ],
  'phg_damage_control': [
    'If it slipped, I turn exposure into leverage: I did it to help the game along.',
    'Stay calm and specific—panic exposes you more than truth.',
    'Reframe the secret: pressure I managed, not power I abused.'
  ],
  'phg_cover_story': [
    'My cover story is simple enough to repeat but broad enough to flex.',
    'I pick one line and say it the same way to everyone—it becomes true.',
    'Describe motives, not mechanics. People trust motives.'
  ],
  'arc_closer': [
    'What defined my season was how I turned moments into moves.',
    'The truth behind my edit is in the quiet decisions you didn’t notice.',
    'I played a story I can stand behind after the credits.'
  ],

  // Fallbacks by category (used when specific id has low context)
  'fallback-strategy': [
    'Strategy-wise, I balance threat and numbers for this situation.',
    'This comes down to timing—early strike or late shield.',
    'Calm moves, clean outcomes. That’s the plan.'
  ],
  'fallback-alliance': [
    'On alliances, I ask for proof before I commit.',
    'I test loyalty before the vote, not after.',
    'Commitments stay narrow and measurable.'
  ],
  'fallback-voting': [
    'I vote to shape the board, not to settle grudges.',
    'I pick the target that changes the board the most.',
    'Numbers first, story second—and it needs to hold.'
  ],
  'fallback-social': [
    'Socially, I keep bonds warm and promises conditional.',
    'Connection matters, but I tie it back to decisions.',
    'Read intent first, then respond in kind.'
  ],
  'fallback-reflection': [
    'I answer this honestly and tie it to a choice I own.',
    'The lesson is pacing—on trust, on moves, on fallout.',
    'Keep the takeaway simple so the next choice is clear.'
  ],
  'fallback-general': [
    'I keep it simple, direct, and tied to the week’s decisions.',
    'I talk gameplay, not gossip.',
    'The camera gets the truth, clean and short.'
  ],
};

function fillTags(raw: string, prompt: DynamicConfessionalPrompt, gameState: GameState): string | null {
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

  const recentConflict = gameState.interactionLog
    ?.filter(l => l.day >= gameState.currentDay - 2 && l.tone === 'aggressive')
    .slice(-1)[0];
  const conflictOther = recentConflict?.participants.find(p => p !== gameState.playerName);

  const competitiveName = gameState.immunityWinner || topSuspicious?.name;

  let out = raw;
  const replacements: Record<string, string | undefined> = {
    '{PLAYER}': gameState.playerName,
    '{ACTIVE_COUNT}': String(activeCount),
    '{DAYS_TO_ELIM}': String(daysToElim),
    '{OTHER_MEMBERS}': otherMembers.length ? otherMembers.join(' and ') : undefined,
    '{HIGH_TRUST_NAME}': highTrust?.name,
    '{TOP_SUSPICIOUS_NAME}': topSuspicious?.name,
    '{COMPETITIVE_NAME}': competitiveName,
    '{CONFLICT_OTHER}': conflictOther,
    '{CURRENT_DAY}': String(gameState.currentDay),
    '{TARGET}': prompt.context?.targetName,
  };

  for (const [key, val] of Object.entries(replacements)) {
    if (out.includes(key)) {
      if (val === undefined) return null; // Missing context for this template
      out = out.split(key).join(val);
    }
  }

  // Basic punctuation tidy
  out = out.replace(/\s{2,}/g, ' ').trim();
  // Enforce 1–2 sentences max
  out = out.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 2).join(' ');
  return out;
}

function templatesForPrompt(prompt: DynamicConfessionalPrompt): string[] {
  const id = prompt.id || '';
  if (TEMPLATES[id]) return TEMPLATES[id];

  // Category fallbacks
  const cat = prompt.category;
  if (cat === 'strategy' && TEMPLATES['fallback-strategy']) return TEMPLATES['fallback-strategy'];
  if (cat === 'alliance' && TEMPLATES['fallback-alliance']) return TEMPLATES['fallback-alliance'];
  if (cat === 'voting' && TEMPLATES['fallback-voting']) return TEMPLATES['fallback-voting'];
  if (cat === 'social' && TEMPLATES['fallback-social']) return TEMPLATES['fallback-social'];
  if (cat === 'reflection' && TEMPLATES['fallback-reflection']) return TEMPLATES['fallback-reflection'];
  if (cat === 'general' && TEMPLATES['fallback-general']) return TEMPLATES['fallback-general'];
  return [];
}

function generateStaticResponses(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  const raws = templatesForPrompt(prompt);
  const filled = raws
    .map(r => fillTags(r, prompt, gameState))
    .filter((s): s is string => !!s);

  return filled;
}

function generateTwistResponsesForPrompt(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  // Twist templates are already in TEMPLATES by id; rely on fillTags for any context
  if (!prompt.id) return [];
  const raws = TEMPLATES[prompt.id] || [];
  return raws
    .map(r => fillTags(r, prompt, gameState))
    .filter((s): s is string => !!s);
}

function generateProducerResponsesIfAny(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  if (!prompt.producerTactic?.kind) return [];
  const raws = TEMPLATES[prompt.id] || [];
  // Provide a default target when the template expects {TARGET}
  const needsTarget = raws.some(r => r.includes('{TARGET}'));
  let targetName = prompt.context?.targetName;

  if (needsTarget && !targetName) {
    const activeContestants = gameState.contestants.filter(c => !c.isEliminated && c.name !== gameState.playerName);
    const sorted = activeContestants
      .sort((a, b) => (b.psychProfile.suspicionLevel || 0) - (a.psychProfile.suspicionLevel || 0));
    targetName = sorted[0]?.name;
  }

  const contextualPrompt = targetName ? { ...prompt, context: { ...(prompt.context || {}), targetName } } : prompt;

  return raws
    .map(r => fillTags(r, contextualPrompt, gameState))
    .filter((s): s is string => !!s);
}

export function generateResponseOptions(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  // Anchored to prompt id or category
  const anchored = generateStaticResponses(prompt, gameState);

  // Twist-aware lines
  const twist = generateTwistResponsesForPrompt(prompt, gameState);

  // Producer tactic lines
  const producer = generateProducerResponsesIfAny(prompt, gameState);

  // Merge in order of relevance
  const combined = [...anchored, ...twist, ...producer];

  // Integrity guard: remove lines that reference events that haven't happened
  const valid = combined.filter(r => responseIsValid(r, gameState));

  // If very short, add category fallbacks
  let pool = valid;
  if (pool.length < 3) {
    const fallbacks = templatesForPrompt({ ...prompt, id: `fallback-${prompt.category}` } as DynamicConfessionalPrompt)
      .map(r => fillTags(r, prompt, gameState))
      .filter((s): s is string => !!s);
    pool = [...pool, ...fallbacks];
  }

  // De-duplicate and shuffle minimally
  const unique = Array.from(new Set(pool));
  const shuffled = shuffleArray(unique);

  // Return a modest set; UI pages these
  return shuffled.slice(0, Math.min(12, shuffled.length));
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


import { GameState } from '@/types/game';
import { DynamicConfessionalPrompt } from './enhancedConfessionalEngine';

/**
 * Hand-written confessional lines that directly answer the specific producer
 * prompt being asked. Every line reads like something a real houseguest would
 * say to camera: contractions, plain words, one idea per sentence, no
 * template-speak.
 *
 * Prompt IDs are mapped 1:1 where possible. Dynamic IDs (recent-scheme-N,
 * recent-dm-N, alliance-update-N) are matched by prefix. A category fallback
 * is used only when no specific match exists.
 *
 * Tags:
 *  {PLAYER}, {ACTIVE_COUNT}, {DAYS_TO_ELIM}, {OTHER_MEMBERS},
 *  {HIGH_TRUST_NAME}, {TOP_SUSPICIOUS_NAME}, {COMPETITIVE_NAME},
 *  {CONFLICT_OTHER}, {CURRENT_DAY}, {TARGET}, {SCHEME_TARGET},
 *  {DM_PARTNER}, {BAIT_TARGET}, {PERSONA}
 * A template is dropped (not rendered) if any tag it uses is missing.
 */

const TEMPLATES: Record<string, string[]> = {
  // ── Strategy progression ────────────────────────────────────────────────
  'mid-game-strategy': [
    "Mid-game, my whole plan is stay useful and stay boring. If I'm never the loudest name in the room, I'm never the vote.",
    "With {ACTIVE_COUNT} of us left, I stop pushing moves and start letting other people's moves work for me.",
    "The middle of the game is where people forget you're playing. That's exactly where I want to be right now.",
  ],
  'endgame-strategy': [
    "At {ACTIVE_COUNT}, I'm done making friends. Every conversation is either building a vote or checking a name off my list.",
    "This late, I'm not trying to win the week. I'm trying to sit next to the people I actually beat.",
    "My positioning right now is simple. Be the second-most-dangerous person in every room, never the first.",
  ],

  // ── Voting week ─────────────────────────────────────────────────────────
  'elimination-pressure': [
    "Honestly? I feel okay about this vote. My name hasn't come up in any conversation I wasn't already in.",
    "I'm not comfortable yet. Comfortable is how people go home. I'll check in with three more people before I sleep tonight.",
    "The vote's coming and I've done my part. Now I just have to sit still and watch it land.",
  ],
  'voting-strategy': [
    "If I could pick right now, I'd send {TOP_SUSPICIOUS_NAME} home. They've been running numbers on me for a week.",
    "It would be {TOP_SUSPICIOUS_NAME}. Not because I hate them, because they're the one person I can't control.",
    "Right now? {TOP_SUSPICIOUS_NAME}. If I let them stay another week, I'm playing their game instead of mine.",
    "If I had the votes today, I'd take the shot at the strongest player left. Sitting on it just makes it harder later.",
  ],

  // ── Alliances ───────────────────────────────────────────────────────────
  'alliance-trust': [
    "Me and {OTHER_MEMBERS}? We're solid on paper. I still don't tell them everything, and I don't think they tell me either. That's just the game.",
    "I trust {OTHER_MEMBERS} more than anyone else in here, which honestly isn't saying much. I'd take the shot first if I had to.",
    "The alliance works because none of us are ready to break it yet. The second one of us is, we're all in trouble.",
  ],
  'solo-game': [
    "No alliance is actually kind of freeing. I don't owe anybody a vote, so I can go wherever the numbers are that week.",
    "My plan without a group is small conversations, everywhere. If everyone thinks they're my number one, nobody targets me.",
    "I'd rather have three loose friendships than one tight alliance right now. Alliances get people evicted.",
  ],

  // ── Social ──────────────────────────────────────────────────────────────
  'social-connection': [
    "Me and {HIGH_TRUST_NAME}? It's real. Which is exactly why it scares me a little, because I know how this game ends.",
    "Yeah, that friendship is genuine. I'd still write their name down if it saved my game. That's the honest answer.",
    "{HIGH_TRUST_NAME} is one of the few people I don't have to perform for. That's rare in here.",
  ],
  'recent-conflict': [
    "Look, {CONFLICT_OTHER} came at me and I answered. I'm not going to sit here and pretend I started it.",
    "With {CONFLICT_OTHER}, I said what I needed to say. Now I'm going to leave it alone and let them stew.",
    "The thing with {CONFLICT_OTHER} wasn't personal for me. It clearly was for them. That tells me everything.",
  ],

  // ── Competition threats ─────────────────────────────────────────────────
  'competition-threat': [
    "{COMPETITIVE_NAME} is the problem. If they keep winning when it matters, none of us get to touch them.",
    "You can't leave {COMPETITIVE_NAME} in this game. Every week they're still here is a week I'm not in control of my own vote.",
    "{COMPETITIVE_NAME} needs to go the first week they can't save themselves. That's the whole strategy.",
  ],

  // ── Reflection ──────────────────────────────────────────────────────────
  'game-reflection': [
    "Day {CURRENT_DAY} and I'm still here. That's more than most people can say, so I'll take it.",
    "I've made mistakes. I've also made two moves I'm proud of. On balance I think I'm playing a real game, not just surviving.",
    "Am I playing well? Ask me after the next vote. That's how this game works.",
  ],
  'personal-growth': [
    "This place has taught me to shut up more. I used to fill every silence. Now I let other people fill them and tell me things.",
    "I've learned I'm more patient than I thought. I've also learned I'm meaner than I thought. Both are useful in here.",
    "I came in wanting people to like me. Now I just want them to underestimate me. That's the real shift.",
  ],

  // ── Stage-aware strategy ────────────────────────────────────────────────
  'early-game-positioning': [
    "Early game, my only job is not to be interesting. Learn names, agree with everyone, don't pick a side yet.",
    "I'm making friends first and reading the room second. There's no vote worth swinging this early.",
    "First few weeks, I keep my mouth shut in group settings and do all my real talking one-on-one.",
  ],
  'power-dynamics': [
    "The person actually running the house isn't the loudest one. It's whoever the loud ones keep checking with.",
    "Power in here is moving. I'm trying to sit next to whoever has it this week without marrying them to it.",
    "Right now the game is being run by two people who don't realize they agree on everything. That's the alliance I need to break.",
  ],
  'jury-approaching': [
    "With jury coming, I'm watching my mouth more. Every eviction speech is a juror I'll need later.",
    "Threat level is the whole game now. I'd rather be underestimated by a juror than respected by one.",
    "I'm being nicer to people I'm about to vote out. That's a jury vote three weeks from now.",
  ],
  'finale-positioning': [
    "To get to the end I need one more big move and two people who'll never take the shot at me. That's the checklist.",
    "The finale isn't about the best game. It's about the best seat. I'm picking my seat right now.",
    "I need to sit next to someone the jury respects less than me. That's not mean, that's just how this works.",
  ],
  'immunity-era-ends': [
    "No safety comp changes everything. Nobody gets to hide behind a win anymore. It's just relationships and votes now.",
    "Without the weekly save, at {ACTIVE_COUNT} the game is finally honest. You either have the numbers or you don't.",
    "This is where quiet players get exposed. You can't win your way out anymore. You have to be somebody's number one.",
  ],

  // ── Edit-awareness ──────────────────────────────────────────────────────
  'edit-shaping': [
    "If I want more screen time, I have to say something clean in here. Producers cut sentences, not paragraphs.",
    "I don't need to blow up my game for airtime. I just need one good sentence per confessional and they'll use it.",
    "Screen time follows decisions. I'll get shown more the week I actually make a move, not before.",
  ],
  'balance-comedy-strategy': [
    "The jokes are how I get people to trust me. The strategy is what I do with that trust when they're not looking.",
    "Being funny is a shield. People don't vote out the guy making them laugh at breakfast.",
    "I keep it light in the house and heavy in the diary room. That's the whole balance.",
  ],
  'underestimated': [
    "Yeah, they're underestimating me. That's the plan. It's not an accident.",
    "People think I'm too nice to make a move. They're going to find out I'm not.",
    "Getting underestimated is the best thing that can happen to you in this house. I'm not going to correct anyone.",
  ],
  'biggest-mistake': [
    "My biggest mistake was trusting one person too fast. I won't do that again.",
    "I told somebody a plan before I needed to. It didn't burn me, but it could have. I've been quieter since.",
    "I got emotional in a conversation I should have been strategic in. That's the one I'd take back.",
  ],

  // ── Producer tactic prompts ─────────────────────────────────────────────
  'prod-soundbite-truth': [
    "The truth is, I'm the only person in this house playing every angle at once.",
    "The truth is, half the people in here already lost and don't know it yet.",
    "The truth is, I like these people and I'm still going to send them home one by one.",
  ],
  'prod-bait-rival': [
    "{BAIT_TARGET}. Every time. They smile at you and then your name is on the block.",
    "It's {BAIT_TARGET}, and I don't say that lightly. They're the one person in here whose word means nothing.",
    "If we don't take {BAIT_TARGET} out soon, one of us is going to wake up on the wrong side of a vote.",
  ],
  'prod-retell-conflict': [
    "I was calm until {TARGET} brought my family into it. That's where I stopped being polite.",
    "It started as a game conversation. Then {TARGET} made it personal, and I wasn't going to sit there and take it.",
    "I gave {TARGET} an out three times. They didn't want one. So we did it their way.",
  ],
  'prod-damage-control': [
    "Look, it happened. I'm not going to pretend it didn't. What I can do is show up tomorrow and play a cleaner game.",
    "I own it. I'd rather be the person who made the move and explained it than the person who hid.",
    "It looks worse than it was. Give me a week and the same people mad at me right now will be working with me again.",
  ],
  'prod-reframe-persona': [
    "I did what I had to because nobody in here was going to do it for me.",
    "I did what I had to because I didn't come this far to be nice on the way out.",
    "I did what I had to because the alternative was watching my game get played by somebody else.",
  ],

  // ── Twist arcs ──────────────────────────────────────────────────────────
  'hc_keep_secret': [
    "I'm not confirming anything in there. If they want to guess, let them guess. Guessing isn't proof.",
    "I keep the answer short and the same every time. That's how a lie stays a lie.",
    "The second I start explaining is the second they know. So I don't explain.",
  ],
  'hc_reveal_fallout': [
    "Now that it's out, all I can do is play straight from here. No more managing it, just playing.",
    "The people who trust me still trust me. The people who don't were never going to. I know where I stand now.",
    "I'd rather have it out and lose than keep it in and win. That part I'm actually okay with.",
  ],
  'hc_edit_bias': [
    "I can't control what airs. I can control what I do next, and that's what the tape will show.",
    "If the edit wants a villain, fine. I'll give them a villain who plays well.",
    "I stopped worrying about how I look about ten votes ago.",
  ],
  'phg_mission_update': [
    "The trick to the mission is making it sound like something anyone would suggest. Then it's not mine anymore.",
    "I plant the idea, walk away, and let somebody else say it back to me two days later. Works every time.",
    "I never push it twice. Push it twice and it's yours. Say it once and it belongs to the house.",
  ],
  'phg_damage_control': [
    "If somebody catches on, I lean in a little. Nervous people over-explain. I don't.",
    "The story stays the same no matter who's asking. That's the whole trick.",
    "I flip it. If they think I'm the plant, I ask them who they think it really is. People love to answer that.",
  ],
  'phg_cover_story': [
    "My cover is boring on purpose. Boring people don't get investigated.",
    "One line, same words, every time. I'd rather sound rehearsed than sound caught.",
    "The story is 90 percent true. That's why I can keep it straight.",
  ],
  'arc_closer': [
    "If this is my last confessional, I want it on record: I played. I didn't just show up.",
    "Whatever the edit does with me, the moves are the moves. I stand behind every one of them.",
    "This game is going to end and I'm going to be able to look at it and say I actually played it. That's what I wanted.",
  ],

  // ── Category fallbacks ──────────────────────────────────────────────────
  'fallback-strategy': [
    "My strategy this week is patience. I don't need to make the move. I need the move to make itself.",
    "It comes down to timing. I've got the numbers if I want them. I just don't want to spend them yet.",
    "I'm playing for two votes from now, not this one. That's where the real math is.",
  ],
  'fallback-alliance': [
    "On alliances? I take actions over promises. Words are free in here.",
    "I trust people the second time they help me, not the first. Once could be an accident.",
    "The best alliance is the one nobody else knows exists. That's what I'm building.",
  ],
  'fallback-voting': [
    "I vote for the person whose absence changes the game the most. Simple as that.",
    "My vote isn't personal. It's whichever name gives me the best next week.",
    "I pick the name I can defend to the jury later. Everything else is noise.",
  ],
  'fallback-social': [
    "Socially, I'm warm with everybody and close with almost nobody. That's on purpose.",
    "I ask more questions than I answer. People will hand you their whole game if you let them talk.",
    "I read intent first, then I decide how much of myself to give back.",
  ],
  'fallback-reflection': [
    "Honestly, I think about it more than I say out loud. The answer is I'm okay with how I've played.",
    "I've made choices in here I'd make again, and one or two I wouldn't. That's a normal season.",
    "The lesson is always the same. Slow down on trust, speed up on moves.",
  ],
  'fallback-general': [
    "I'll keep it short. I'm here, I'm playing, and I'm not done.",
    "Not much to say tonight that I haven't already said with a vote.",
    "One day at a time. That's genuinely the whole answer.",
  ],
};

// Dynamic-ID templates (matched by prefix)
const DYNAMIC_TEMPLATES: { prefix: string; templates: string[] }[] = [
  {
    prefix: 'recent-scheme-',
    templates: [
      "The conversation about {SCHEME_TARGET} went about how I wanted. I said less than they did, and now they think it was their idea.",
      "Talking about {SCHEME_TARGET} is the first step. I don't need agreement today. I need the name in the room.",
      "I planted it, they nodded, we moved on. By the end of the week, {SCHEME_TARGET}'s name won't feel like mine anymore.",
      "I don't love scheming on {SCHEME_TARGET}, but somebody's got to go and it's not going to be me.",
    ],
  },
  {
    prefix: 'recent-dm-',
    templates: [
      "The talk with {DM_PARTNER} was mostly them venting. I mostly listened. That's usually how you learn the most.",
      "{DM_PARTNER} pulled me aside because they needed somebody to trust. I'll take that. It's a number I didn't have this morning.",
      "It was a real conversation. Some of it was game, some of it wasn't. I know which parts to keep.",
      "{DM_PARTNER} told me more than they meant to. I'm not going to burn that. Not yet.",
    ],
  },
  {
    prefix: 'alliance-update-',
    templates: [
      "The alliance is fine. Not great, not broken. That's actually the sweet spot for me right now.",
      "Everyone's still saying the same names out loud. What matters is whether they're saying the same names when I'm not in the room.",
      "I feel good about my position in the group. I'd feel better if I knew who they'd cut first if it came down to it.",
      "We had a check-in and it went smooth. Smooth check-ins are usually the ones that hide the problems.",
    ],
  },
];

function extractNameAfter(prompt: string, marker: RegExp): string | undefined {
  const m = prompt.match(marker);
  return m?.[1]?.trim();
}

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

  // Extract dynamic prompt-embedded names
  const promptText = prompt.prompt || '';
  const schemeTarget = extractNameAfter(promptText, /conversations about ([A-Za-z][A-Za-z .'-]*?)\./);
  const dmPartner = extractNameAfter(promptText, /private conversation with ([A-Za-z][A-Za-z .'-]*?) recently/);
  const baitTarget = extractNameAfter(promptText, /\(([A-Za-z][A-Za-z .'-]*?) comes to mind\.\)/) || topSuspicious?.name;

  const replacements: Record<string, string | undefined> = {
    '{PLAYER}': gameState.playerName,
    '{ACTIVE_COUNT}': String(activeCount),
    '{DAYS_TO_ELIM}': String(daysToElim),
    '{OTHER_MEMBERS}': otherMembers.length ? formatList(otherMembers) : undefined,
    '{HIGH_TRUST_NAME}': highTrust?.name,
    '{TOP_SUSPICIOUS_NAME}': topSuspicious?.name,
    '{COMPETITIVE_NAME}': competitiveName,
    '{CONFLICT_OTHER}': conflictOther || prompt.context?.targetName,
    '{CURRENT_DAY}': String(gameState.currentDay),
    '{TARGET}': prompt.context?.targetName || conflictOther,
    '{SCHEME_TARGET}': schemeTarget,
    '{DM_PARTNER}': dmPartner,
    '{BAIT_TARGET}': baitTarget,
    '{PERSONA}': gameState.editPerception?.persona,
  };

  let out = raw;
  for (const [key, val] of Object.entries(replacements)) {
    if (out.includes(key)) {
      if (!val) return null;
      out = out.split(key).join(val);
    }
  }

  out = out.replace(/\s{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1').trim();
  // Cap at 2 sentences to keep it confessional-sized.
  out = out.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 2).join(' ');
  return out;
}

function formatList(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function templatesForPrompt(prompt: DynamicConfessionalPrompt): string[] {
  const id = prompt.id || '';
  if (TEMPLATES[id]) return TEMPLATES[id];

  const dyn = DYNAMIC_TEMPLATES.find(d => id.startsWith(d.prefix));
  if (dyn) return dyn.templates;

  return [];
}

function categoryFallback(cat: DynamicConfessionalPrompt['category']): string[] {
  switch (cat) {
    case 'strategy':   return TEMPLATES['fallback-strategy'];
    case 'alliance':   return TEMPLATES['fallback-alliance'];
    case 'voting':     return TEMPLATES['fallback-voting'];
    case 'social':     return TEMPLATES['fallback-social'];
    case 'reflection': return TEMPLATES['fallback-reflection'];
    default:           return TEMPLATES['fallback-general'];
  }
}

export function generateResponseOptions(prompt: DynamicConfessionalPrompt, gameState: GameState): string[] {
  const specific = templatesForPrompt(prompt)
    .map(r => fillTags(r, prompt, gameState))
    .filter((s): s is string => !!s);

  let pool = specific;
  if (pool.length < 3) {
    const fallbacks = categoryFallback(prompt.category)
      .map(r => fillTags(r, prompt, gameState))
      .filter((s): s is string => !!s);
    pool = [...pool, ...fallbacks];
  }

  // De-dupe while preserving relevance order (specifics first).
  const seen = new Set<string>();
  const ordered = pool.filter(l => {
    if (seen.has(l)) return false;
    seen.add(l);
    return true;
  });

  // Two-stage filter:
  //   1. reject lines that reference events the game hasn't reached
  //   2. reject lines that read as grammar-broken (run-ons, dangling tokens,
  //      POV drift). Broken lines are dropped and the pool re-selects from
  //      the remaining approved hand-crafted lines.
  const phaseOk = ordered.filter(r => responseIsValid(r, gameState));
  let clean = phaseOk.filter(isGrammaticallyClean);

  // If validation nuked everything, pull emergency fallbacks that we know
  // pass the grammar guard (short, first-person, no tokens).
  if (clean.length === 0) {
    clean = SAFE_FALLBACKS.slice();
  }

  const head = clean.slice(0, 2);
  const tail = shuffleArray(clean.slice(2));
  return [...head, ...tail].slice(0, 12);
}

/**
 * SAFE_FALLBACKS: minimal first-person confessional lines guaranteed to
 * pass every grammar check. Only used when the entire candidate pool is
 * rejected by the guards.
 */
const SAFE_FALLBACKS: string[] = [
  "I'm going to keep this short. I'm still here, and I'm still playing.",
  "I've said what I need to say with my vote. The rest is noise.",
  "One day at a time. That's the honest answer.",
];

/**
 * Reject lines that read as grammar-broken. Any failure here logs a warning
 * in dev so we can tighten the templates over time.
 *
 * Guards:
 *   - unfilled template tokens ({FOO})
 *   - dangling name slots ("with .", "about ,", "and .")
 *   - orphan articles ("the .", "a ,")
 *   - double spaces or floating punctuation
 *   - run-on sentences (> 32 words in a single sentence, or > 55 total)
 *   - second-person address drift ("you should", "your game" while the
 *     line is otherwise first-person)
 *   - starts with a lowercase letter or ends without terminal punctuation
 */
function isGrammaticallyClean(text: string): boolean {
  const reasons: string[] = [];

  if (!text || text.length < 4) reasons.push('empty');

  if (/\{[A-Z_]+\}/.test(text)) reasons.push('unfilled-token');

  if (/\b(with|about|for|to|from|and|of|on|by)\s+[.,!?]/i.test(text)) {
    reasons.push('dangling-name-slot');
  }

  if (/\b(the|a|an)\s+[.,!?]/i.test(text)) reasons.push('orphan-article');

  if (/\s{2,}/.test(text) || /\s[.,!?]/.test(text)) reasons.push('spacing');

  // Terminal punctuation + capitalized start
  if (!/[.!?]"?$/.test(text.trim())) reasons.push('no-terminal-punct');
  if (!/^["']?[A-Z]/.test(text.trim())) reasons.push('lowercase-start');

  // Run-on detection
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const totalWords = text.split(/\s+/).filter(Boolean).length;
  if (totalWords > 55) reasons.push('run-on-total');
  for (const s of sentences) {
    const w = s.split(/\s+/).filter(Boolean).length;
    if (w > 32) { reasons.push('run-on-sentence'); break; }
  }

  // POV drift: line uses first-person AND makes a direct second-person
  // statement about the listener. Idiomatic "you" (generic-you inside a
  // clause) is allowed; the guard only trips when both a first-person
  // subject clause AND a second-person subject clause are present in
  // separate sentences.
  const firstPersonSubject =
    /\b(I|I'm|I've|I'll|I'd|my|me)\b/.test(text);
  const secondPersonAddress = sentences.some(s =>
    /\b(you're|your)\b/i.test(s) && !/\b(I|I'm|I've|my|me)\b/.test(s)
  );
  if (firstPersonSubject && secondPersonAddress) {
    // Only flag when the second-person clause is clearly addressed to the
    // listener (imperative or possessive-your), not idiomatic generic-you.
    if (/\byour (game|move|vote|alliance|name|shot)\b/i.test(text)) {
      reasons.push('pov-drift');
    }
  }

  if (reasons.length > 0) {
    if (typeof console !== 'undefined' && process?.env?.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[confessional] rejected line:', reasons.join(','), '-', text);
    }
    return false;
  }
  return true;
}

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

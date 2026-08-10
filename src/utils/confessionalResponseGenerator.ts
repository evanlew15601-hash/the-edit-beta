
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
  // Every pool answers its prompt in three shapes, in this order:
  //   [0] KNOW   — the read: what I've actually observed or figured out
  //   [1] HIDE   — the concealment: what I'm not saying in the house
  //   [2] DECIDE — the commitment: the move I'm making next
  // Extra lines below those three are alternate phrasings of the same shapes.
  // No line is allowed to be a mood statement that doesn't answer the ask.

  // ── Strategy progression ────────────────────────────────────────────────
  'mid-game-strategy': [
    "What I know is the middle of this game belongs to whoever stops volunteering. Nobody's targeting me right now, so my plan is to keep it that way.",
    "What nobody in the house knows is I've already picked who I want gone at eight. Until then I'm agreeing with everybody.",
    "So moving forward: I hold my numbers, let two of them collide over the next vote, and pick up whoever loses.",
    "With {ACTIVE_COUNT} of us left, my read is that no one has a majority yet. My plan is to be the vote that makes one, and to charge for it.",
  ],
  'endgame-strategy': [
    "My read at {ACTIVE_COUNT} is that two people here beat me in front of a jury. So my positioning is simple: they leave before I have to sit beside them.",
    "What I'm not saying out loud is that I've stopped protecting one of my own people. They're my shield until they're my seat.",
    "Positioning for the final stretch means I need one person who'd never write my name and one person I know I beat. I'm locking both in this week.",
    "I'm done building. From here I'm spending. Every conversation I have from tonight is me cashing in a favor.",
  ],

  // ── Voting week ─────────────────────────────────────────────────────────
  'elimination-pressure': [
    "How I feel about the vote is grounded in what I've actually heard: my name hasn't come up in a single room I wasn't already standing in.",
    "I'm telling people I'm nervous. I'm not. I want them checking on me instead of counting me.",
    "I feel fine, and I'm still going to confirm three votes before I go to sleep. Feeling fine is how people get blindsided.",
    "Honestly, I don't have the votes locked and I know it. So tonight I go get them instead of sitting here hoping.",
  ],
  'voting-strategy': [
    "If it were today, {TOP_SUSPICIOUS_NAME}. What I know is they've been running my name in rooms I'm not in.",
    "{TOP_SUSPICIOUS_NAME}, and I'm not saying that to their face. I've been friendly with them all week on purpose.",
    "{TOP_SUSPICIOUS_NAME}. They're the one person left I can't steer, and I'm not spending another week reacting to them.",
    "It would be the strongest player left, not the person I like least. Waiting only makes that shot harder to take.",
  ],

  // ── Alliances ───────────────────────────────────────────────────────────
  'alliance-trust': [
    "How much do I trust {OTHER_MEMBERS}? Enough to share a target, not enough to share a timeline. They've kept every promise they've made to me so far, which is the only reason I'm still here.",
    "What I haven't told {OTHER_MEMBERS} is that I've got a second conversation running outside this group. If they knew, they'd cut me tonight.",
    "I'm staying in it through this vote, and then I'm reassessing. The second they start meeting without me, I'm the one who moves first.",
    "I trust the alliance to work while it's useful to all of us. That's not the same as trust, and I'd be lying if I called it that.",
  ],
  'solo-game': [
    "My game plan without a group is to be everybody's spare vote. What I know is that nobody eliminates the person they might need on Thursday.",
    "I let people think I'm closer to them than I am. That's the whole plan, and it only works if nobody compares notes.",
    "Since I don't have a group, I'm going to build the smallest one possible this week. Two people, no name, no meetings.",
    "No alliance means no obligations. I go where the numbers are that week, and I've been right about where they are twice now.",
  ],

  // ── Social ──────────────────────────────────────────────────────────────
  'social-connection': [
    "How real is it with {HIGH_TRUST_NAME}? Real. They're the only person in here I don't have to think before talking to.",
    "What {HIGH_TRUST_NAME} doesn't know is that I've already thought about the week I'd have to write their name. That's the part I keep to myself.",
    "It's real, and I'm still going to use it. I'd take them to the end if the jury math works, and cut them if it doesn't.",
    "It started as strategy and turned into something else. That's honestly the problem with it.",
  ],
  'recent-conflict': [
    "My side is this: {CONFLICT_OTHER} came at me in front of people, and I answered in front of the same people. I wasn't going to be the one who took it quietly.",
    "What I didn't say to {CONFLICT_OTHER} is that I know exactly who told them. I'm keeping that, because it's worth more later.",
    "I'm not apologizing to {CONFLICT_OTHER}. I'm going to be pleasant, let it cool, and vote them out when it's convenient.",
    "It wasn't personal for me and it clearly was for them. That tells me they'll make an emotional decision, and I can use that.",
  ],

  // ── Competition threats ─────────────────────────────────────────────────
  'competition-threat': [
    "{COMPETITIVE_NAME} is the threat, and it's not close. Every week they're still here is a week my vote isn't really mine.",
    "I've been telling {COMPETITIVE_NAME} they're safe with me. They are not safe with me.",
    "So the decision is: {COMPETITIVE_NAME} goes the first week they can't save themselves, and I'll take the blame for it if I have to.",
    "The read on {COMPETITIVE_NAME} is that people are scared to say their name first. I'm willing to be first if somebody backs me.",
  ],

  // ── Reflection ──────────────────────────────────────────────────────────
  'game-reflection': [
    "How am I playing? Day {CURRENT_DAY} and I've been named in a vote zero times. I'll take that as the answer.",
    "The part I don't advertise is how much of my position is luck. Two votes went my way that I had nothing to do with.",
    "I think I'm playing fine, and fine isn't enough anymore. So from here I'm the one starting the conversation instead of joining it.",
    "Two moves I'm proud of, one I'd take back. That's a real game, not just survival, and I know the difference.",
  ],
  'personal-growth': [
    "It's changed how much I talk. I used to fill silences. Now I let other people fill them, and they hand me their whole game.",
    "What it's really done is make me comfortable lying to people I like. I'm not proud of how easy that got.",
    "I came in wanting to be liked. I've decided I'd rather be underestimated, and I'm playing the rest of this that way.",
    "I'm more patient than I thought and meaner than I thought. In here, both of those have been useful.",
  ],

  // ── Stage-aware strategy ────────────────────────────────────────────────
  'early-game-positioning': [
    "To survive the first votes I need to be boring. What I know is that early evictions go to whoever picked a side first.",
    "I'm agreeing with everybody right now, and none of them know I haven't picked a single one of them.",
    "So my plan is: no group settings, all one-on-ones, and no name out of my mouth until somebody else says it first.",
    "I'm learning names and reading the room. There isn't a vote worth swinging this early, and I'm not going to pretend there is.",
  ],
  'power-dynamics': [
    "Who's really running it? Not the loud one. It's whoever the loud ones keep going to check with, and I've been watching who that is.",
    "I know two people are running this house and they don't realize they agree on everything. I'm not going to be the one who points it out to them.",
    "So my move is to get between those two before they notice they're a pair. That's the break I need.",
    "Power's shifting weekly, and my read is it lands with whoever wins the next vote outright. I want to be on that side of it.",
  ],
  'jury-approaching': [
    "Managing my threat level means watching my mouth in group rooms. Every person I vote out becomes someone who scores me later.",
    "What I'm hiding right now is how many of these votes were my idea. I'd rather a juror thinks I followed.",
    "So I'm being genuinely kind to the people I'm about to vote out. That's not fake, and it's also a jury vote.",
    "I'd rather be underestimated by a juror than respected by one. Respect this early just gets you evicted.",
  ],
  'finale-positioning': [
    "To secure my spot I need one more move that's clearly mine, plus two people who'd never take a shot at me. That's the checklist.",
    "The part I keep quiet is that I've already picked who I want beside me at the end, and they think it's mutual.",
    "So the move is: I take the shot at the strongest player myself instead of letting somebody else get credit for it.",
    "The end isn't about the best game, it's about the best seat. I'm choosing my seat this week, not hoping for one.",
  ],
  'immunity-era-ends': [
    "With no safety comp left, what I know is that at {ACTIVE_COUNT} nobody gets to hide behind a win. It's relationships and votes now.",
    "I've been acting like this doesn't change anything for me. It changes everything, and I don't want anyone doing that math out loud.",
    "So my endgame changes to one thing: be somebody's certain number one before the next vote, not their maybe.",
    "This is where quiet players get exposed. I can't win my way out anymore, so I have to be needed instead.",
  ],

  // ── Edit-awareness ──────────────────────────────────────────────────────
  'edit-shaping': [
    "How I get shown more is simple. Producers cut sentences, not paragraphs, so I give one clean sentence a night.",
    "I'm not blowing up my game for airtime. If they want a story from me, they can have the one I choose to tell.",
    "So I'm going to make the move I've been sitting on this week. Screen time follows decisions, not confessionals.",
    "I know exactly why I haven't been shown: I haven't done anything worth showing yet. That's on me, and it changes this week.",
  ],
  'balance-comedy-strategy': [
    "The way I balance it is the jokes get people comfortable, and comfortable people tell me things they shouldn't.",
    "Everybody thinks the jokes are all there is to me. I'd like to keep that going as long as possible.",
    "So I keep it light in the house and I do the real talking in here. That's the whole split.",
    "Being funny is a shield. Nobody writes down the name of the person making them laugh at breakfast.",
  ],
  'underestimated': [
    "Yeah, they are, and I know why: I've never raised my voice in this house once. They read that as harmless.",
    "They're underestimating me and I'm feeding it. I've played dumb in two conversations this week on purpose.",
    "So I'm not correcting anybody. I'd rather make the move and let them work out afterward that it was me.",
    "They think I'm too nice to take a shot. That's the read I want them to have going into this vote.",
  ],
  'biggest-mistake': [
    "My biggest mistake was trusting one person too fast, before they'd done anything to earn it. That's what I got wrong.",
    "The mistake I've never admitted to anybody is that I told a plan out loud a day before I needed to. It didn't burn me. It should have.",
    "So the fix is that from here nobody gets information until the moment they need it to help me.",
    "I got emotional in a conversation that should have been strategic. That's the one I'd take back.",
  ],

  // ── Producer tactic prompts ─────────────────────────────────────────────
  'prod-soundbite-truth': [
    "The truth is, I'm the only person in this house running every angle at once, and everybody thinks they're my exception.",
    "The truth is, I'm hiding a plan that ends two of the friendships I have in here.",
    "The truth is, I've already decided who I'm cutting, and I'm going to smile at them all week first.",
    "The truth is, half these people already lost this game and haven't noticed.",
  ],
  'prod-bait-rival': [
    "{BAIT_TARGET}, and I can point to when I learned it: they smiled at me and my name was in a room an hour later.",
    "{BAIT_TARGET}, and I've never once told them I think that. To their face, we're great.",
    "It's {BAIT_TARGET}, and the decision that comes with that is I'm not waiting for them to move on me first.",
    "{BAIT_TARGET}. I don't say that lightly. Their word hasn't meant anything since the first vote.",
  ],
  'prod-retell-conflict': [
    "Beat by beat: {TARGET} said my name in a group, I asked them to repeat it, they wouldn't, and that's when I went off.",
    "What I left out of that blow-up is that I already knew what {TARGET} had said. I let them lie about it first.",
    "I gave {TARGET} an out three times. They didn't take one. So now they're the name I push this week.",
    "It started as a game conversation and {TARGET} made it personal. I wasn't going to sit there and eat it.",
  ],
  'prod-damage-control': [
    "Here's what actually happened, and I'm not going to soften it: I made the move, it went badly, and people have every right to be mad.",
    "What I'm not telling the house is that I'd do it again with better timing. As far as they know, I regret all of it.",
    "So the plan is I stop explaining and start showing up. In a week the same people will be working with me again.",
    "I own it. I'd rather be the person who made the move and said so than the one who hid behind somebody else.",
  ],
  'prod-reframe-persona': [
    "I did what I had to because nobody in here was going to do it for me, and I could see the vote coming.",
    "I did what I had to because the alternative was letting somebody else decide when my game ended.",
    "I did what I had to because I'd already promised myself I wouldn't go out quiet.",
  ],

  // ── Twist arcs ──────────────────────────────────────────────────────────
  'hc_keep_secret': [
    "What I know is that nobody has proof. They have a feeling, and feelings don't get you evicted.",
    "I'm keeping the answer short and identical every single time. Consistency is the only thing holding this together.",
    "So I don't confirm, I don't deny, and I don't explain. Explaining is how people get caught.",
    "The second somebody asks twice, I get bored instead of nervous. Bored reads as honest in here.",
  ],
  'hc_reveal_fallout': [
    "Now that it's out, I know exactly where I stand: the people who trusted me still do, and the rest were never mine.",
    "What I'm still not saying is how long I could have kept it going if I'd wanted to.",
    "So from here I play it straight. No more managing the story, just votes and conversations.",
    "I'd rather have it out and lose than carry it and win. That part I actually mean.",
  ],
  'hc_edit_bias': [
    "I can't control what airs, and I know that. What airs is decided by what I do, so I'll give them something worth cutting.",
    "If the edit wants a villain, I'm not going to argue with it on camera. I just won't play like one in the house.",
    "So I stopped managing how I look about ten votes ago and started managing the numbers instead.",
  ],
  'phg_mission_update': [
    "The mission works because I make it sound like something anyone in the room would suggest. Then it isn't mine.",
    "Nobody knows the idea started with me, and I only get to keep that if I never push it twice.",
    "So tonight I say it once, walk out, and wait for somebody to say it back to me on Wednesday.",
  ],
  'phg_damage_control': [
    "What I know is that people who suspect you always tell you they suspect you. That's my warning system.",
    "I'm not defending myself. Nervous people over-explain, and I'd rather look bored than look caught.",
    "So if somebody presses me, I ask who they think it is instead. People love answering that question.",
  ],
  'phg_cover_story': [
    "My cover works because it's boring, and nobody investigates boring.",
    "It's ninety percent true, which is the only reason I can keep it straight under pressure.",
    "So it's one line, the same words, every time. I'd rather sound rehearsed than get caught improvising.",
  ],
  'arc_closer': [
    "If this is my last one, what I know is I played. I didn't just get carried to day {CURRENT_DAY}.",
    "The thing I never said in the house is that I saw most of it coming and chose to let it happen.",
    "So whatever happens at the vote, the moves were mine and I'll defend every one of them.",
  ],

  // ── Category fallbacks ──────────────────────────────────────────────────
  // Still answer-shaped: read, concealment, decision. Never mood filler.
  'fallback-strategy': [
    "My read this week is that nobody has the numbers locked, including the people acting like they do.",
    "What I'm not telling anyone is the order I want these people gone in. I've had it written in my head for days.",
    "So the decision is: I hold my vote until the last possible conversation, then sell it to whoever needs it most.",
    "I'm playing for two votes from now, not this one. That's where the math actually matters.",
  ],
  'fallback-alliance': [
    "What I know about these people is what they've done, not what they've promised. Two of them have actually shown up for me.",
    "None of them know I'm having the same conversation with somebody outside the group.",
    "So I stay in through this vote and move first the second I hear about a meeting I wasn't in.",
    "I trust people the second time they help me. Once could be an accident.",
  ],
  'fallback-voting': [
    "My read is that this vote is between two names, and only one of them makes my next week easier.",
    "I've told two people two different things about my vote. Only one of them is going to be right.",
    "So I'm voting for whoever I can explain to a juror later. Everything else is noise.",
    "It's not personal. I write down the name whose absence changes the most.",
  ],
  'fallback-social': [
    "Socially, what I know is that people hand you their whole game if you just keep asking questions.",
    "I'm warm with everybody and close with almost nobody, and I'd like that to stay invisible.",
    "So this week I stop spreading myself out and go deep with the two people who actually vote with me.",
    "I read intent first, then I decide how much of myself to give back.",
  ],
  'fallback-reflection': [
    "Where I'm at is this: I've made choices in here I'd make again, and one or two I wouldn't.",
    "What I don't say out loud is how much of this I've gotten wrong and gotten away with.",
    "So the lesson I'm actually applying from here is slower on trust, faster on moves.",
    "I think I'm playing a real game. Ask me again after the vote and I'll know for sure.",
  ],
  'fallback-general': [
    "What I know right now is that I'm still here and my name hasn't been said in a serious room.",
    "There's a conversation I had today that I'm not repeating to anybody in this house.",
    "So my next move is one more conversation tonight, and then I sleep on it.",
    "I've said what I need to say with my vote. The rest is talk.",
  ],
};


// Dynamic-ID templates (matched by prefix)
const DYNAMIC_TEMPLATES: { prefix: string; templates: string[] }[] = [
  {
    prefix: 'recent-scheme-',
    templates: [
      "How it went: I said less than they did about {SCHEME_TARGET}, and they walked out thinking the name was theirs.",
      "What they don't know is I've had the same conversation about {SCHEME_TARGET} with two other people this week.",
      "So the next step is I don't bring {SCHEME_TARGET} up again. Somebody else says it or it doesn't happen.",
      "It went fine. I got the name in the room without attaching myself to it, and that was the entire goal.",
    ],
  },
  {
    prefix: 'recent-dm-',
    templates: [
      "What it was about: {DM_PARTNER} needed somebody to vent to, and I learned who they're actually scared of.",
      "{DM_PARTNER} told me more than they meant to, and I haven't repeated a word of it. Not yet.",
      "So I'm treating {DM_PARTNER} as a real number now, and I'll spend it when the vote's close.",
      "Some of it was game and some of it wasn't. I know which half to keep.",
    ],
  },
  {
    prefix: 'alliance-update-',
    templates: [
      "How solid do I feel? Solid enough. Everyone's still saying the same names to my face, and I've checked that twice.",
      "What I haven't told them is that I already know who they'd cut first if it came down to it. It's me.",
      "So I'm going to force the issue this week and see who hesitates. Hesitation tells me everything.",
      "We had a check-in and it was smooth. Smooth check-ins are usually the ones hiding the problem.",
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
  const finalPool = [...head, ...tail].slice(0, 12);

  // Spoken-texture pass: give roughly half the options a natural verbal beat
  // (a lead-in, a hedge, or a closing thought) so the list doesn't read like
  // twelve polished press quotes. Applied after the grammar guard, and only
  // with devices that can't break capitalization, spacing or punctuation.
  return finalPool.map((line, i) => naturalize(line, i));
}

// ── Spoken texture ────────────────────────────────────────────────────────
// Devices are whole-sentence lead-ins or trailing thoughts. They never touch
// the interior of a hand-written line, so grammar stays intact.

const LEAD_INS: string[] = [
  "Honestly?",
  "Okay, real talk.",
  "Look.",
  "Here's the thing.",
  "I'll be straight with you.",
  "Can I be honest?",
  "See, this is the part nobody gets.",
  "Man.",
];

const TRAILING_BEATS: string[] = [
  "That's just where I'm at.",
  "And I'm okay with that.",
  "I don't know how else to put it.",
  "Say what you want about it.",
  "That's the whole thing.",
  "Anyway. Yeah.",
  "I've made peace with it.",
];

function hashOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 100000;
  return h;
}

function naturalize(line: string, index: number): string {
  const h = hashOf(line) + index * 7;
  const mode = h % 4; // 0 = lead-in, 1 = trailing beat, 2 & 3 = leave alone
  const words = line.split(/\s+/).filter(Boolean).length;

  if (mode === 0) {
    const lead = LEAD_INS[h % LEAD_INS.length];
    if (words + 4 > 50) return line;
    return `${lead} ${line}`;
  }

  if (mode === 1) {
    const beat = TRAILING_BEATS[h % TRAILING_BEATS.length];
    if (words + 6 > 50) return line;
    return `${line} ${beat}`;
  }

  return line;
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

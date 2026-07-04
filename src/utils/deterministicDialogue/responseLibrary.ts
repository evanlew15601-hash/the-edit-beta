import { Archetype, Emotion, MemoryRefKind, ResponseIntent } from './types';

// Authored response pools keyed by `${INTENT}_${EMOTION}`.
// Tokens: {player}, {target}, {days}, {about}, {people}, {event}
// Keep lines short, in-voice, never meta. Variants are selected deterministically.

type Pool = string[];
type LibraryShape = Partial<Record<`${ResponseIntent}_${Emotion}`, Pool>>;

export const RESPONSE_LIBRARY: LibraryShape = {
  // ───────────────────────── BUILD_TRUST ─────────────────────────
  BUILD_TRUST_SINCERE: [
    "I'm trying to be honest with you, {player}.",
    "I'm giving you more than I'm giving most people in here.",
    "I wouldn't say this to everyone — take it however you want, I'm being real.",
    "Look, I want us on the same page. No games right now.",
    "I'd rather tell you straight than have you hear it twisted.",
    "If I lie to you it shows up on tape. So I'm not going to.",
    "You and me — we don't have to dance around it. Talk to me.",
    "I've been burned by playing too tight. Trying it different with you.",
    "I'd rather lose honest than win sneaky with you in the room.",
  ],
  BUILD_TRUST_WARM: [
    "Honestly? You're one of the few I actually trust in this house.",
    "I want us solid. That's not a pitch, that's where I'm at.",
    "I've got your back. I just need to know you've got mine.",
    "You're one of maybe two people I'd take a bullet for in here.",
    "If it comes down to it, I'm not voting you out. Period.",
    "I sleep better knowing you're in the room, {player}. That's the truth.",
  ],
  BUILD_TRUST_GUARDED: [
    "I'll meet you halfway, but I need to see it first.",
    "Trust goes both ways. Start showing me and I'll show you.",
    "I want to believe that. I'm not all the way there yet.",
    "Words are cheap in here. Show me on the vote.",
    "I'm interested. I'm not sold.",
    "Earn a little, get a little. That's how I'm playing it.",
  ],

  // ───────────────────────── TEST_LOYALTY ─────────────────────────
  TEST_LOYALTY_GUARDED: [
    "Before I answer that — where do you stand?",
    "You've been hearing things too, right? Say a name.",
    "What would you do if you were the one making the call?",
    "I'm interested in your answer first, {player}.",
    "Say my name's on the block. Where's your vote going?",
    "Easy question: who's the next to go?",
    "If we're really aligned, prove it. Give me a name.",
    "Don't tell me you trust me. Tell me who you'd cut.",
  ],
  TEST_LOYALTY_SUSPICIOUS: [
    "You first. Who would you cut if it was easy?",
    "Tell me a name and I'll tell you if we're aligned.",
    "Don't dance. Who are you actually working with?",
    "Why are you in my ear right now? Be specific.",
    "Say the name out loud or stop talking to me about it.",
    "If you can't answer, I've already got my answer.",
  ],
  TEST_LOYALTY_COLD: [
    "Pick a side. Out loud. Right now.",
    "I need a name from you, {player}. Not a feeling.",
    "Last chance to be useful in this conversation.",
    "Vague gets you nowhere with me.",
  ],

  // ───────────────────────── WITHHOLD_INFO ─────────────────────────
  WITHHOLD_INFO_GUARDED: [
    "I'm keeping that to myself for now.",
    "Not everything needs to be discussed today.",
    "I'll let you know if that changes, {player}.",
    "I'm still thinking about it. Ask me tomorrow.",
    "Some of this is mine to hold.",
    "We're not there yet. Maybe after the vote.",
  ],
  WITHHOLD_INFO_SUSPICIOUS: [
    "I'm not putting that out in the open. Sorry.",
    "That's not a conversation I'm having yet.",
    "You'll know when I want you to know.",
    "Last person I told ran straight to {about}. So no.",
    "I learned to keep my mouth shut in here. Learn it too.",
  ],
  WITHHOLD_INFO_COLD: [
    "No.",
    "Pass.",
    "Drop it, {player}.",
    "That's a closed door.",
  ],

  // ───────────────────────── REVEAL_INFO ─────────────────────────
  REVEAL_INFO_SINCERE: [
    "Okay — between us. {about} is the name floating.",
    "I'll give you this much: it's not who you think.",
    "Here's what I heard, and I'm only saying it once.",
    "Two people pitched {about} to me yesterday. Different rooms, same name.",
    "It's {about}. If you didn't already know, you do now.",
  ],
  REVEAL_INFO_WARM: [
    "I'll tell you, because it's you. Don't burn me on it.",
    "You should know — they're talking about pushing {about}.",
    "I shouldn't say this, but you've earned it: {about} is the target.",
  ],
  REVEAL_INFO_PLAYFUL: [
    "Fine, fine. The name is {about}. You owe me.",
    "{about}. There. Now stop asking with that face.",
  ],

  // ───────────────────────── ACCUSE ─────────────────────────
  ACCUSE_ANGRY: [
    "You're lying, {player}. Stop.",
    "Don't insult me with that answer.",
    "I know what you did. Own it.",
    "Don't gaslight me on national TV.",
    "Say it to my face or stop saying it at all.",
    "You came in here to lie and I'm done pretending I don't see it.",
  ],
  ACCUSE_COLD: [
    "Your story keeps changing.",
    "Interesting how that's not what you said yesterday.",
    "Two different versions in two days. Pick one.",
    "Funny. {about} told me the opposite an hour ago.",
    "I've heard better lies from people who actually practice.",
  ],
  ACCUSE_SUSPICIOUS: [
    "Something's off with you and I can feel it.",
    "I've watched you do this to other people. Now it's me.",
    "Every time we talk lately, my number changes after.",
    "You smile too much when my name comes up.",
  ],

  // ───────────────────────── DEFLECT ─────────────────────────
  DEFLECT_PLAYFUL: [
    "Wow, getting deep already. Buy me dinner first.",
    "I'd answer that, but the cameras are too close.",
    "Next question, {player}.",
    "Hard pass. New topic — what's for dinner?",
    "Bold of you to ask that with a mic on.",
  ],
  DEFLECT_GUARDED: [
    "Let's circle back to that.",
    "Not here. Not now.",
    "I don't want to be on tape answering that one.",
    "Wrong room for that conversation.",
  ],
  DEFLECT_COLD: [
    "I'm not getting into it.",
    "Moving on.",
    "That's not on the table.",
  ],

  // ───────────────────────── AGREE ─────────────────────────
  AGREE_WARM: [
    "Yeah. I'm with you on that.",
    "Same page. Let's run it.",
    "Agreed. Tell me when.",
    "Read my mind. Let's do it.",
    "Finally, someone said it.",
  ],
  AGREE_SINCERE: [
    "Okay. I'm in.",
    "That tracks with what I've been thinking.",
    "Yeah, I can do that.",
    "You're not wrong. I'll back the play.",
  ],
  AGREE_GUARDED: [
    "I can go along with that — for now.",
    "Sure. As long as it stays small.",
    "Fine. But if it leaks, we're done.",
    "I'll move with you. One time.",
  ],

  // ───────────────────────── REFUSE ─────────────────────────
  REFUSE_COLD: [
    "No. Not happening.",
    "I won't do that.",
    "That's a no from me, {player}.",
    "Wrong ask. Wrong person.",
  ],
  REFUSE_ANGRY: [
    "Absolutely not, {player}. Don't ask me that again.",
    "You've got the wrong person for that move.",
    "Are you serious right now? No.",
    "I'm not torching my game for that. Find someone else.",
  ],
  REFUSE_GUARDED: [
    "I can't lock that in. Not yet.",
    "I'd rather sit this one out.",
    "Pass. Try me on a smaller ask.",
  ],

  // ───────────────────────── PROBE ─────────────────────────
  PROBE_SUSPICIOUS: [
    "What aren't you telling me?",
    "Who put that in your head?",
    "Say the part you're leaving out.",
    "Where'd you really hear that? Name it.",
    "You came to me first. Why?",
  ],
  PROBE_GUARDED: [
    "Walk me through it again. Slowly.",
    "And then what happened?",
    "Start from the part you skipped.",
    "Back up. Who was actually in the room?",
  ],
  PROBE_PLAYFUL: [
    "Spill. Don't make me drag it out of you.",
    "I see that face. Out with it.",
  ],

  // ───────────────────────── REASSURE ─────────────────────────
  REASSURE_WARM: [
    "Hey — you're fine. I'm not coming for you.",
    "Breathe. We're good.",
    "Stop spiraling. I've still got you.",
    "You're not on my list. You've never been on my list.",
    "Look at me. We're solid.",
  ],
  REASSURE_SINCERE: [
    "I'm not on that train, {player}. You're safe with me this week.",
    "Whatever you heard, it's not coming from my side.",
    "If your name comes up, it doesn't come up from me.",
  ],

  // ───────────────────────── THREATEN ─────────────────────────
  THREATEN_COLD: [
    "Cross me and I'll burn the whole week down.",
    "Try it. See what happens.",
    "I don't make threats. I make plans.",
  ],
  THREATEN_ANGRY: [
    "You come for me, I come back twice as hard.",
    "Don't make me a problem you can't solve, {player}.",
    "Touch my name on the block and I'll take three of yours with me.",
  ],

  // ───────────────────────── APOLOGIZE ─────────────────────────
  APOLOGIZE_SINCERE: [
    "That was on me. I should have told you first.",
    "I owe you that one. I'm sorry.",
    "You didn't deserve how I handled it. My fault.",
  ],
  APOLOGIZE_GUARDED: [
    "I get why you're mad. I'd be mad too.",
    "Fair. I could have played that cleaner.",
  ],

  // ───────────────────────── FLIRT ─────────────────────────
  FLIRT_PLAYFUL: [
    "You're trouble, {player}. The good kind.",
    "Careful — I might actually start liking you.",
    "If we weren't in here, this'd be a different conversation.",
    "You're going to get me in trouble on this show.",
    "Stop looking at me like that. The cameras can read minds.",
  ],
  FLIRT_WARM: [
    "I like having you around. That's all I'll say on camera.",
    "You're the one good thing about this week.",
  ],

  // ───────────────────────── JOKE ─────────────────────────
  JOKE_PLAYFUL: [
    "If this house had a thermostat, it'd be set to 'subtle chaos'.",
    "We're one bad sleep away from a meltdown, I swear.",
    "I came here for a million dollars and a tan. I'm losing on both.",
    "Production's going to need a longer episode this week.",
    "I haven't slept since the premiere and it shows.",
  ],

  // ───────────────────────── GREET ─────────────────────────
  GREET_WARM: [
    "There you are. I was about to come find you.",
    "Hey — good. I needed to talk to you.",
    "Perfect timing, {player}.",
  ],
  GREET_GUARDED: [
    "Hey. You got a minute?",
    "Can we talk? Just us.",
    "Walk with me. Not here.",
  ],
  GREET_COLD: [
    "We need to talk, {player}.",
    "Sit down. This won't take long.",
  ],

  // ───────────────────────── END_CONVO ─────────────────────────
  END_CONVO_GUARDED: [
    "That's all I've got for now.",
    "Let's pick this up later.",
    "I'm done talking about it tonight.",
    "Enough for one conversation.",
  ],
  END_CONVO_COLD: [
    "We're done here.",
    "Conversation's over, {player}.",
  ],
  END_CONVO_WARM: [
    "Okay. Good talk. Find me later if anything shifts.",
    "Love you. Mean it. Go.",
  ],

  // ───────────────────────── extra coverage ─────────────────────────
  BUILD_TRUST_PLAYFUL: [
    "Fine — I'm officially adopting you, {player}. Don't embarrass me.",
    "You and me? Dangerous combo. In the good way.",
  ],
  REASSURE_GUARDED: [
    "You're not the problem this week. That's all I can say out loud.",
    "Don't act different around me. That's how names come up.",
    "Nothing's changed on my end. Stop looking at me like it has.",
  ],
  REASSURE_PLAYFUL: [
    "Relax, {player}. If I were coming for you, you'd already be gone.",
    "Breathe. You're spiraling and it's not a good look for either of us.",
  ],
  AGREE_PLAYFUL: [
    "Oh, we're doing this? Fine. I'm in and I'm insufferable about it.",
    "Say less. I'm already halfway there.",
  ],
  AGREE_COLD: [
    "Fine. Once. Don't ask me twice.",
    "Yes. Move on.",
  ],
  REFUSE_SINCERE: [
    "I hear you. I'm still saying no.",
    "It's a good pitch, {player}. It's not for me. Not this week.",
  ],
  PROBE_COLD: [
    "Try that answer again. Slower.",
    "That's not what I asked.",
    "Real answer, {player}. Not the camera answer.",
  ],
  PROBE_ANGRY: [
    "Stop dancing and answer me.",
    "Who told you that? Name. Now.",
  ],
  DEFLECT_SINCERE: [
    "I don't have a clean answer for that yet. Let me sit with it.",
    "Ask me tomorrow. Tonight I don't trust my own mouth.",
  ],
  DEFLECT_SUSPICIOUS: [
    "Weird question, {player}. Why now?",
    "You're the third person to ask me that today. Interesting.",
  ],
  ACCUSE_GUARDED: [
    "I want to be wrong about this. Convince me I am.",
    "Something doesn't add up and it starts with you.",
  ],
  APOLOGIZE_WARM: [
    "I owe you one. And I know it.",
    "You were right. I was wrong. That's it.",
  ],
  THREATEN_GUARDED: [
    "Don't make me play the other side of this. You won't like it.",
    "I'd rather not go there with you. Don't push me there.",
  ],
  FLIRT_SINCERE: [
    "I don't know what this is. I know I like it.",
    "You make this house bearable. That's not nothing.",
  ],
  FLIRT_GUARDED: [
    "We should probably stop doing this on camera.",
    "Ask me that again when there aren't producers listening.",
  ],
  JOKE_WARM: [
    "You're the only reason I'm laughing today, {player}.",
    "Between us, this house is a sitcom with no writers.",
  ],

  GREET_SINCERE: [
    "Hey. I was hoping I'd catch you alone.",
    "Good — you. Come here for a second.",
  ],
  GREET_PLAYFUL: [
    "Well well well. Look who finally showed up.",
    "There's my favorite variable in this house.",
  ],
  END_CONVO_SINCERE: [
    "That's where I'll leave it. Think on it.",
    "I said what I needed to say.",
  ],
  END_CONVO_PLAYFUL: [
    "Okay, I'm being pulled by production emotionally. Bye.",
    "Aaand scene. Love you. Sort of.",
  ],
  TEST_LOYALTY_SINCERE: [
    "I'm asking straight: are you with me or not, {player}?",
    "Say it out loud once and I'll trust it. Are we together on this?",
  ],
  REVEAL_INFO_GUARDED: [
    "I'll give you a piece. Not all of it. {about}.",
    "One name. Don't ask me for two. {about}.",
  ],
  WITHHOLD_INFO_PLAYFUL: [
    "Oh, that? That's above your pay grade this week.",
    "Cute try, {player}. Try again after the vote.",
  ],
};

// ─────────────────────── ARCHETYPE FLAVOR POOLS ───────────────────────
// Optional overrides keyed by `${INTENT}_${EMOTION}_${ARCHETYPE}`. When a
// matching pool exists, the response engine prefers it over the generic one.
type ArchetypePool = Partial<Record<`${ResponseIntent}_${Emotion}_${Archetype}`, Pool>>;
export const ARCHETYPE_POOLS: ArchetypePool = {
  // Hothead — short, blunt, accusatory
  ACCUSE_ANGRY_Hothead: [
    "Don't. Just don't, {player}.",
    "You're full of it. Say it again, I dare you.",
    "I will end this conversation and your week. Try me.",
  ],
  REFUSE_ANGRY_Hothead: [
    "No. Move.",
    "Get out of my face with that pitch.",
  ],
  TEST_LOYALTY_COLD_Hothead: [
    "Name. Now.",
    "Talk fast or walk.",
  ],

  // Strategist — measured, transactional
  BUILD_TRUST_SINCERE_Strategist: [
    "Here's the math: you need me at six, I need you at four. Let's not waste it.",
    "I'm not asking for friendship. I'm asking for a number I can count on.",
    "Long game. You and me. Quiet. That's the offer.",
  ],
  TEST_LOYALTY_GUARDED_Strategist: [
    "Run me through your top three targets. Order them.",
    "Where's the value in keeping me past jury? Sell it.",
  ],
  REVEAL_INFO_SINCERE_Strategist: [
    "Two data points say {about}. I trust the second one more.",
    "The pattern points to {about}. I'm not guessing.",
  ],

  // Charmer — warm, disarming, uses names
  BUILD_TRUST_WARM_Charmer: [
    "{player}, listen — I don't say this to everyone. You're different.",
    "We are going to be so good for each other in here. I can feel it.",
  ],
  FLIRT_PLAYFUL_Charmer: [
    "Don't make me blush on national TV, {player}.",
    "If you keep looking at me like that I'm voting for you in the finale.",
  ],

  // PassiveAggressive — sly, sideways jabs
  ACCUSE_COLD_PassiveAggressive: [
    "Oh no, I believe you. Totally. That's why I'm asking three times.",
    "It's so cute when people think I can't count.",
    "No no, keep going. I love a good story.",
  ],
  DEFLECT_COLD_PassiveAggressive: [
    "Hm. Anyway.",
    "Sure, {player}. Whatever you say.",
  ],

  // Paranoid — anxious, suspicious of motive
  WITHHOLD_INFO_SUSPICIOUS_Paranoid: [
    "I told one person something once. They voted me out the next day. So no.",
    "Why are you asking me that? Why now? Why like this?",
  ],
  PROBE_SUSPICIOUS_Paranoid: [
    "Who sent you? Don't say nobody.",
    "What did they tell you to say to me?",
  ],

  // Stoic — terse, low affect
  AGREE_SINCERE_Stoic: [
    "Fine.",
    "Okay. Done.",
    "Works.",
  ],
  REFUSE_COLD_Stoic: [
    "No.",
    "Not interested.",
  ],

  // Wildcard — unpredictable, off-kilter
  JOKE_PLAYFUL_Wildcard: [
    "I think I saw God in the storage room. He said vote with your gut.",
    "Honestly? I'd flip on my own grandma this week. She knows what she did.",
  ],
  REVEAL_INFO_PLAYFUL_Wildcard: [
    "{about}. Or maybe not. Maybe I'm lying. Have fun!",
  ],
};

// ─────────────────────── BODY LANGUAGE LIBRARY ───────────────────────
// Short non-verbal beats woven into the line as a bracketed lead-in. Selected
// from a pool that matches the NPC's current emotion (with archetype tilts).
export const BODY_LANGUAGE: Record<Emotion, string[]> = {
  WARM: ['[half-smile]', '[steps closer]', '[soft laugh]', '[holds eye contact]', '[touches your arm briefly]'],
  SINCERE: ['[meets your eyes]', '[lowers voice]', '[settles in]', '[unfolds arms]'],
  GUARDED: ['[arms folded]', '[glances at the door]', '[leans away slightly]', '[checks the room]', '[forced neutral]'],
  SUSPICIOUS: ['[narrowed eyes]', '[head tilt]', '[long pause]', '[stops chewing]', '[watches your hands]'],
  ANXIOUS: ['[picks at sleeve]', '[shallow breath]', '[eyes darting]', '[swallows]'],
  COLD: ['[flat stare]', '[no expression]', '[mouth tight]', '[zero eye contact]'],
  ANGRY: ['[jaw set]', '[steps in]', '[finger jab]', '[voice drops, sharp]', '[chair scrape]'],
  PLAYFUL: ['[grin]', '[raised eyebrow]', '[mock gasp]', '[finger gun]'],
};

// Archetype tilts — appended/prefixed when a beat fires for these voices.
export const ARCHETYPE_BODY_TILTS: Partial<Record<Archetype, string[]>> = {
  Hothead: ['[fists tight]', '[heavy exhale]', '[towers over you]'],
  Stoic: ['[stillness]', '[nothing moves but the eyes]'],
  Charmer: ['[easy smile]', '[playful shrug]'],
  Paranoid: ['[scans the room twice]', '[whispers]'],
  PassiveAggressive: ['[smile that isn\'t a smile]', '[exaggerated nod]'],
  Wildcard: ['[bursts out laughing for no reason]', '[shrugs at the camera]'],
};

// ─────────────────────── MEMORY CALLBACKS ───────────────────────
// Now reference {people} and {event} pulled from real GameMemory, not just {days}.
export const MEMORY_CALLBACKS: Record<MemoryRefKind, string[]> = {
  betrayal: [
    "Last time I trusted you it cost me {people}.",
    "I haven't forgotten {event} — {days} days isn't long enough.",
    "You lit my game on fire over {event}. I remember every second.",
    "{people} went home because of what you pulled. So spare me.",
  ],
  save: [
    "You had the votes to bury me at {event} and you didn't. That bought a lot.",
    "{people} would have flipped on me without you in that room. Noted.",
    "Don't think I forgot what you did during {event}.",
  ],
  promise_kept: [
    "You told me you'd hold the line at {event}. You did. That matters.",
    "Last time you gave me your word, you kept it. I'm listening because of that.",
  ],
  promise_broken: [
    "You promised me {event} and walked it back the next day.",
    "Your word at {event} meant nothing {days} days later. Why is now different?",
  ],
  shared_vote: [
    "We voted together at {event}. Let's not break that pattern now.",
    "{people} and I were on the same number last round. Stay on it.",
  ],
  recent_scheme: [
    "I know what you tried to pull with {about}. Don't think I missed it.",
    "Your move on {about} is exactly why we're having this conversation.",
    "{people} already told me about {about}. So start over and be honest.",
  ],
};

export function getPool(intent: ResponseIntent, emotion: Emotion): string[] {
  return RESPONSE_LIBRARY[`${intent}_${emotion}`] ?? [];
}

export function getArchetypePool(
  intent: ResponseIntent,
  emotion: Emotion,
  archetype: Archetype
): string[] {
  return ARCHETYPE_POOLS[`${intent}_${emotion}_${archetype}`] ?? [];
}

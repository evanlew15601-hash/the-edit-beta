import { Emotion, MemoryRefKind, ResponseIntent } from './types';

// Authored response pools keyed by `${INTENT}_${EMOTION}`.
// Use {player}, {target}, {days}, {about} as tokens.
// Keep lines short, in-voice, never meta. Variants are selected deterministically.

type Pool = string[];
type LibraryShape = Partial<Record<`${ResponseIntent}_${Emotion}`, Pool>>;

export const RESPONSE_LIBRARY: LibraryShape = {
  // BUILD_TRUST
  BUILD_TRUST_SINCERE: [
    "I'm trying to be honest with you, {player}.",
    "I'm giving you more than I'm giving most people in here.",
    "I wouldn't say this to everyone — take it however you want, I'm being real.",
    "Look, I want us on the same page. No games right now.",
    "I'd rather tell you straight than have you hear it twisted.",
  ],
  BUILD_TRUST_WARM: [
    "Honestly? You're one of the few I actually trust in this house.",
    "I want us solid. That's not a pitch, that's where I'm at.",
    "I've got your back. I just need to know you've got mine.",
  ],
  BUILD_TRUST_GUARDED: [
    "I'll meet you halfway, but I need to see it first.",
    "Trust goes both ways. Start showing me and I'll show you.",
    "I want to believe that. I'm not all the way there yet.",
  ],

  // TEST_LOYALTY
  TEST_LOYALTY_GUARDED: [
    "Before I answer that — where do you stand?",
    "You've been hearing things too, right? Say a name.",
    "What would you do if you were the one making the call?",
    "I'm interested in your answer first, {player}.",
    "Say my name's on the block. Where's your vote going?",
  ],
  TEST_LOYALTY_SUSPICIOUS: [
    "You first. Who would you cut if it was easy?",
    "Tell me a name and I'll tell you if we're aligned.",
    "Don't dance. Who are you actually working with?",
  ],
  TEST_LOYALTY_COLD: [
    "Pick a side. Out loud. Right now.",
    "I need a name from you, {player}. Not a feeling.",
  ],

  // WITHHOLD_INFO
  WITHHOLD_INFO_GUARDED: [
    "I'm keeping that to myself for now.",
    "Not everything needs to be discussed today.",
    "I'll let you know if that changes, {player}.",
    "I'm still thinking about it. Ask me tomorrow.",
  ],
  WITHHOLD_INFO_SUSPICIOUS: [
    "I'm not putting that out in the open. Sorry.",
    "That's not a conversation I'm having yet.",
    "You'll know when I want you to know.",
  ],
  WITHHOLD_INFO_COLD: [
    "No.",
    "Pass.",
    "Drop it, {player}.",
  ],

  // REVEAL_INFO
  REVEAL_INFO_SINCERE: [
    "Okay — between us. {about} is the name floating.",
    "I'll give you this much: it's not who you think.",
    "Here's what I heard, and I'm only saying it once.",
  ],
  REVEAL_INFO_WARM: [
    "I'll tell you, because it's you. Don't burn me on it.",
    "You should know — they're talking about pushing {about}.",
  ],
  REVEAL_INFO_PLAYFUL: [
    "Fine, fine. The name is {about}. You owe me.",
  ],

  // ACCUSE
  ACCUSE_ANGRY: [
    "You're lying, {player}. Stop.",
    "Don't insult me with that answer.",
    "I know what you did. Own it.",
  ],
  ACCUSE_COLD: [
    "Your story keeps changing.",
    "Interesting how that's not what you said yesterday.",
    "Two different versions in two days. Pick one.",
  ],
  ACCUSE_SUSPICIOUS: [
    "Something's off with you and I can feel it.",
    "I've watched you do this to other people. Now it's me.",
  ],

  // DEFLECT
  DEFLECT_PLAYFUL: [
    "Wow, getting deep already. Buy me dinner first.",
    "I'd answer that, but the cameras are too close.",
    "Next question, {player}.",
  ],
  DEFLECT_GUARDED: [
    "Let's circle back to that.",
    "Not here. Not now.",
    "I don't want to be on tape answering that one.",
  ],
  DEFLECT_COLD: [
    "I'm not getting into it.",
    "Moving on.",
  ],

  // AGREE
  AGREE_WARM: [
    "Yeah. I'm with you on that.",
    "Same page. Let's run it.",
    "Agreed. Tell me when.",
  ],
  AGREE_SINCERE: [
    "Okay. I'm in.",
    "That tracks with what I've been thinking.",
  ],
  AGREE_GUARDED: [
    "I can go along with that — for now.",
    "Sure. As long as it stays small.",
  ],

  // REFUSE
  REFUSE_COLD: [
    "No. Not happening.",
    "I won't do that.",
  ],
  REFUSE_ANGRY: [
    "Absolutely not, {player}. Don't ask me that again.",
    "You've got the wrong person for that move.",
  ],
  REFUSE_GUARDED: [
    "I can't lock that in. Not yet.",
    "I'd rather sit this one out.",
  ],

  // PROBE
  PROBE_SUSPICIOUS: [
    "What aren't you telling me?",
    "Who put that in your head?",
    "Say the part you're leaving out.",
  ],
  PROBE_GUARDED: [
    "Walk me through it again. Slowly.",
    "And then what happened?",
  ],
  PROBE_PLAYFUL: [
    "Spill. Don't make me drag it out of you.",
  ],

  // REASSURE
  REASSURE_WARM: [
    "Hey — you're fine. I'm not coming for you.",
    "Breathe. We're good.",
    "Stop spiraling. I've still got you.",
  ],
  REASSURE_SINCERE: [
    "I'm not on that train, {player}. You're safe with me this week.",
    "Whatever you heard, it's not coming from my side.",
  ],

  // THREATEN
  THREATEN_COLD: [
    "Cross me and I'll burn the whole week down.",
    "Try it. See what happens.",
  ],
  THREATEN_ANGRY: [
    "You come for me, I come back twice as hard.",
    "Don't make me a problem you can't solve, {player}.",
  ],

  // APOLOGIZE
  APOLOGIZE_SINCERE: [
    "That was on me. I should have told you first.",
    "I owe you that one. I'm sorry.",
  ],
  APOLOGIZE_GUARDED: [
    "I get why you're mad. I'd be mad too.",
  ],

  // FLIRT
  FLIRT_PLAYFUL: [
    "You're trouble, {player}. The good kind.",
    "Careful — I might actually start liking you.",
    "If we weren't in here, this'd be a different conversation.",
  ],
  FLIRT_WARM: [
    "I like having you around. That's all I'll say on camera.",
  ],

  // JOKE
  JOKE_PLAYFUL: [
    "If this house had a thermostat, it'd be set to 'subtle chaos'.",
    "We're one bad sleep away from a meltdown, I swear.",
    "I came here for a million dollars and a tan. I'm losing on both.",
  ],

  // GREET
  GREET_WARM: [
    "There you are. I was about to come find you.",
    "Hey — good. I needed to talk to you.",
  ],
  GREET_GUARDED: [
    "Hey. You got a minute?",
    "Can we talk? Just us.",
  ],
  GREET_COLD: [
    "We need to talk, {player}.",
  ],

  // END_CONVO
  END_CONVO_GUARDED: [
    "That's all I've got for now.",
    "Let's pick this up later.",
    "I'm done talking about it tonight.",
  ],
  END_CONVO_COLD: [
    "We're done here.",
  ],
  END_CONVO_WARM: [
    "Okay. Good talk. Find me later if anything shifts.",
  ],
};

// Memory-callback overlays. Selected when a MemoryRef is present, woven into the
// chosen line as an additional sentence before or after.
export const MEMORY_CALLBACKS: Record<MemoryRefKind, string[]> = {
  betrayal: [
    "Last time I trusted you, it cost me.",
    "I haven't forgotten what you did {days} days ago.",
    "I lost a number because of you. I remember.",
  ],
  save: [
    "You've helped me before. I remember that.",
    "You had a chance to bury me {days} days ago and you didn't. That matters.",
  ],
  promise_kept: [
    "You said you'd hold the line and you did. Noted.",
  ],
  promise_broken: [
    "You promised me something {days} days ago. You didn't deliver.",
  ],
  shared_vote: [
    "We voted together last time. Let's not break that pattern.",
  ],
  recent_scheme: [
    "I know what you tried to pull with {about}. Don't think I missed it.",
  ],
};

export function getPool(intent: ResponseIntent, emotion: Emotion): string[] {
  return RESPONSE_LIBRARY[`${intent}_${emotion}`] ?? [];
}

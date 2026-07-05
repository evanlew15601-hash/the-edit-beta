// Hand-crafted, deterministic per-choice reaction bank.
// Every Choice in TAG_CHOICES has 3 variants per outcome category so NPCs
// respond to the SPECIFIC line the player picked, not just the intent bucket.
// Tokens: {npc}, {player}. Selection is seeded so identical context is stable
// but different day/turn/npc yields variety.

export type ReactionCategory = 'positive' | 'neutral' | 'negative';

export interface HandCraftedReactionSet {
  positive: string[];
  neutral: string[];
  negative: string[];
}

export const CHOICE_REACTIONS: Record<string, HandCraftedReactionSet> = {
  // ============================================================
  // TALK
  // ============================================================
  TALK_BUILD_ALLY_GAME_SINCERE_1: {
    positive: [
      "{npc}: Yeah. Let's lock it in — quiet duo, no leaks.",
      "{npc}: I've been waiting for you to say that. I'm in.",
      "{npc}: Deal. We keep this between us for now, okay?",
    ],
    neutral: [
      "{npc}: Maybe. Let me see how you vote this week first.",
      "{npc}: I'll think on it. Not a no.",
      "{npc}: I like the idea. I'm not ready to commit yet.",
    ],
    negative: [
      "{npc}: You're pitching everyone the same speech, aren't you?",
      "{npc}: I'd rather stay solo than owe you anything right now.",
      "{npc}: Little early to be locking in with me, {player}.",
    ],
  },
  TALK_BUILD_ALLY_GAME_SINCERE_2: {
    positive: [
      "{npc}: Locked in. Quiet and precise — I can play that.",
      "{npc}: Same page. Let's not tell anyone we're aligned.",
      "{npc}: I've been playing that way already. Nice to have company.",
    ],
    neutral: [
      "{npc}: Precise, huh. Prove it first — then we talk terms.",
      "{npc}: I hear you. Let me watch one more vote.",
      "{npc}: Not saying no. Not saying yes.",
    ],
    negative: [
      "{npc}: 'Quietly and precisely' — that's a pitch line.",
      "{npc}: You've said this exact thing to two other people, {player}.",
      "{npc}: Precision is earned. You haven't earned it with me.",
    ],
  },
  TALK_BUILD_ALLY_CHALLENGE_PLAYFUL_1: {
    positive: [
      "{npc}: Challenge partners it is. You keep me sharp.",
      "{npc}: Deal — I'll carry the puzzles, you carry the endurance.",
      "{npc}: We do work well together. I'm down.",
    ],
    neutral: [
      "{npc}: Sure, when the next one drops we'll pair up.",
      "{npc}: We'll see how the teams shake out.",
      "{npc}: Chemistry's fine. Doesn't mean we're an alliance.",
    ],
    negative: [
      "{npc}: One good challenge doesn't make us a duo, {player}.",
      "{npc}: Don't read too much into a team win.",
      "{npc}: I compete better alone. Sorry.",
    ],
  },
  TALK_BUILD_ALLY_ROMANCE_FLIRTY_1: {
    positive: [
      "{npc}: Partner in crime. I like the sound of that.",
      "{npc}: Careful — say things like that and I'll believe you.",
      "{npc}: You and me. Yeah. I could go there.",
    ],
    neutral: [
      "{npc}: Smooth. Ask me again when the cameras are off.",
      "{npc}: I'll take the compliment. That's all for now.",
      "{npc}: Cute. Very cute.",
    ],
    negative: [
      "{npc}: Don't dress up game moves as romance, {player}.",
      "{npc}: I've heard that line already this week.",
      "{npc}: That's transparent even for you.",
    ],
  },
  TALK_BUILD_ALLY_FOOD_NEUTRAL_1: {
    positive: [
      "{npc}: Meal team. I'm in. Kitchen at 6.",
      "{npc}: Cooking together is underrated in here. Let's do it.",
      "{npc}: Yeah — I actually miss having someone to plan meals with.",
    ],
    neutral: [
      "{npc}: Sure, when it's my turn on rotation.",
      "{npc}: Fine, whenever.",
      "{npc}: Not a bad idea.",
    ],
    negative: [
      "{npc}: Cooking with you would be all game talk. No thanks.",
      "{npc}: I prefer eating alone, honestly.",
      "{npc}: Pass. Kitchen is the one place I don't want strategy.",
    ],
  },
  TALK_BUILD_ALLY_SLEEP_SINCERE_1: {
    positive: [
      "{npc}: Yeah, come sit. My brain won't shut up either.",
      "{npc}: Late-night talks are the real alliance builders.",
      "{npc}: Please. I need someone to talk me down tonight.",
    ],
    neutral: [
      "{npc}: I was about to try to sleep. Keep it short?",
      "{npc}: Sure, sit for a bit.",
      "{npc}: Only if we don't talk game.",
    ],
    negative: [
      "{npc}: I actually just want to be alone right now, {player}.",
      "{npc}: Not tonight. My head's already too loud.",
      "{npc}: Feels like an angle. I'm going to bed.",
    ],
  },
  TALK_BUILD_ALLY_GAME_PERSONA_1: {
    positive: [
      "{npc}: That's the pitch I've been waiting to hear. In.",
      "{npc}: Controlled and quiet. Yes.",
      "{npc}: Say less. Let's start moving.",
    ],
    neutral: [
      "{npc}: Ambitious. I'll consider it.",
      "{npc}: Not committing today, but I hear the vision.",
      "{npc}: Come back to me after the next vote.",
    ],
    negative: [
      "{npc}: 'Control the board' — that's how targets get made, {player}.",
      "{npc}: Too much theater in that pitch.",
      "{npc}: You just told me exactly why I shouldn't trust you.",
    ],
  },

  TALK_PROBE_GAME_NEUTRAL_1: {
    positive: [
      "{npc}: Two names keep coming up — I'll tell you in the hammock later.",
      "{npc}: Votes are drifting. I've got a read. Find me after dinner.",
      "{npc}: There's a plan brewing. You're not on it. Yet.",
    ],
    neutral: [
      "{npc}: Nothing solid. People are still posturing.",
      "{npc}: Same names as yesterday. No movement.",
      "{npc}: I'm hearing noise, not intel.",
    ],
    negative: [
      "{npc}: Why do you keep asking me this every day, {player}?",
      "{npc}: If I knew, I wouldn't tell you first.",
      "{npc}: Fishing this hard is how you end up on the block.",
    ],
  },
  TALK_PROBE_GAME_NEUTRAL_2: {
    positive: [
      "{npc}: One person is stitching two sides together. Watch the kitchen.",
      "{npc}: Honest read? Votes are being coordinated after lights-out.",
      "{npc}: There's a pattern. Ask me in private and I'll draw it out.",
    ],
    neutral: [
      "{npc}: Too early to call a pattern.",
      "{npc}: Everyone's whispering. Nobody's committing.",
      "{npc}: I'd be guessing. So would you.",
    ],
    negative: [
      "{npc}: I'm not your scout, {player}.",
      "{npc}: That's the kind of question that gets repeated back to me later.",
      "{npc}: Pass. Not answering that one.",
    ],
  },
  TALK_PROBE_EVICTION_SUSPICIOUS_1: {
    positive: [
      "{npc}: Yeah — there's a swing happening. Two votes just moved.",
      "{npc}: I am nervous. Someone lied to my face this morning.",
      "{npc}: I'll tell you who's flipping if you promise not to name me.",
    ],
    neutral: [
      "{npc}: I'm always nervous on eviction night. Doesn't mean anything.",
      "{npc}: If there's a swing, it hasn't reached me.",
      "{npc}: Same count I had this morning.",
    ],
    negative: [
      "{npc}: You're the one making rounds, {player}.",
      "{npc}: Don't project your nerves on me.",
      "{npc}: That question is a trap and we both know it.",
    ],
  },
  TALK_PROBE_ROMANCE_PLAYFUL_1: {
    positive: [
      "{npc}: Okay fine — there's SOMETHING. Don't broadcast it.",
      "{npc}: I've been dying to tell someone. Sit down.",
      "{npc}: Guilty. It's real. Don't let it get to production.",
    ],
    neutral: [
      "{npc}: Nothing to spill. Sorry to disappoint.",
      "{npc}: Depends who's asking and why.",
      "{npc}: I don't do gossip on the record.",
    ],
    negative: [
      "{npc}: My love life isn't a segment, {player}.",
      "{npc}: Weird thing to ask me directly.",
      "{npc}: You want the tea so you can pour it on someone.",
    ],
  },

  TALK_FLIRT_ROMANCE_FLIRTY_1: {
    positive: [
      "{npc}: Dangerous, huh. I could get used to that from you.",
      "{npc}: You keep looking at me like that and I'll forget the game.",
      "{npc}: You're worse than me. I love it.",
    ],
    neutral: [
      "{npc}: Ha. Smooth, {player}.",
      "{npc}: Careful. Cameras are always on.",
      "{npc}: You're trying. I'll give you that.",
    ],
    negative: [
      "{npc}: Not the moment for that.",
      "{npc}: We're not doing this on camera, {player}.",
      "{npc}: Read the room.",
    ],
  },
  TALK_FLIRT_FOOD_FLIRTY_1: {
    positive: [
      "{npc}: Save you a plate later? In private?",
      "{npc}: You keep talking like that, dinner's on me.",
      "{npc}: Okay, that one actually worked.",
    ],
    neutral: [
      "{npc}: Cute line. I've heard cuter.",
      "{npc}: Ha. Get out of my kitchen, {player}.",
      "{npc}: Compliment accepted. Now move.",
    ],
    negative: [
      "{npc}: Please stop hovering while I cook.",
      "{npc}: Weird flex over a sandwich.",
      "{npc}: Not the vibe, {player}.",
    ],
  },
  TALK_FLIRT_CHALLENGE_PLAYFUL_1: {
    positive: [
      "{npc}: Watch me win the next one just for you.",
      "{npc}: Focused-me is a whole different person, huh?",
      "{npc}: You're just saying that because I beat you.",
    ],
    neutral: [
      "{npc}: Ha. Compete first, flirt after.",
      "{npc}: I'll take the compliment. Now stretch.",
      "{npc}: Sure, {player}.",
    ],
    negative: [
      "{npc}: Don't turn competition into a come-on.",
      "{npc}: That's a distraction and I don't need one.",
      "{npc}: Read the room. I'm dialed in.",
    ],
  },

  TALK_SOW_DOUBT_STRATEGY_SARCASTIC_1: {
    positive: [
      "{npc}: Yeah… I'd noticed that. Interesting you did too.",
      "{npc}: Now that you say it out loud — that IS a lot of new friendships fast.",
      "{npc}: I'll keep an eye on that. Thanks for pointing it out.",
    ],
    neutral: [
      "{npc}: Could be nothing. People pivot in here.",
      "{npc}: Maybe. Maybe they're just social.",
      "{npc}: Not sure I read it the same way.",
    ],
    negative: [
      "{npc}: You're the one planting that, {player}. Obvious.",
      "{npc}: That's a stretch and you know it.",
      "{npc}: Sowing seeds this loud — I see you.",
    ],
  },
  TALK_SOW_DOUBT_ROMANCE_DISMISSIVE_1: {
    positive: [
      "{npc}: Convenient timing, huh. I hadn't thought of that.",
      "{npc}: Strategic showmance is such a played move. Good catch.",
      "{npc}: Yeah — that romance did start suspiciously fast.",
    ],
    neutral: [
      "{npc}: Maybe. Or maybe they actually like each other.",
      "{npc}: Not everything is a chess move.",
      "{npc}: Timing is suspicious. Not proof.",
    ],
    negative: [
      "{npc}: That's a mean read, {player}.",
      "{npc}: You're bitter about something else and it's showing.",
      "{npc}: Don't drag their relationship into your game.",
    ],
  },

  TALK_JOKE_FOOD_PLAYFUL_1: {
    positive: [
      "{npc}: Ha — this stew IS an antagonist.",
      "{npc}: Michelin fell off. Perfect.",
      "{npc}: Okay, that got me. Good one.",
    ],
    neutral: [
      "{npc}: Heh. Solid.",
      "{npc}: Rough crowd for it, but sure.",
      "{npc}: I'll allow it.",
    ],
    negative: [
      "{npc}: Not in the mood, {player}.",
      "{npc}: Cook something better then.",
      "{npc}: Save the bit for confessional.",
    ],
  },
  TALK_JOKE_PRODUCTION_DISMISSIVE_1: {
    positive: [
      "{npc}: 'Dramatic Stare-Offs' — that's the show title now.",
      "{npc}: Producers are eating this up, huh.",
      "{npc}: The real treasure line got me. Stop.",
    ],
    neutral: [
      "{npc}: Ha. Producers are always listening.",
      "{npc}: Cute. Cameras probably loved that.",
      "{npc}: Careful making fun of production.",
    ],
    negative: [
      "{npc}: Don't drag production. They control the edit.",
      "{npc}: Corny, {player}. Sorry.",
      "{npc}: We're not that meta.",
    ],
  },

  TALK_INSULT_STRATEGY_AGGRESSIVE_1: {
    positive: [
      "{npc}: Say that again and see what happens.",
      "{npc}: Bold to insult my game to my face.",
      "{npc}: Noted, {player}. This one's going in the book.",
    ],
    neutral: [
      "{npc}: Cute opinion.",
      "{npc}: Sure. We'll see who's still here Sunday.",
      "{npc}: Alright.",
    ],
    negative: [
      "{npc}: You just made yourself a target.",
      "{npc}: Cross the line again and it's war, {player}.",
      "{npc}: Enjoy your week. It's your last one.",
    ],
  },
  TALK_INSULT_ROMANCE_AGGRESSIVE_1: {
    positive: [
      "{npc}: You sound threatened. That's cute.",
      "{npc}: Jealousy is loud, {player}.",
      "{npc}: Talk about my flirting again. I dare you.",
    ],
    neutral: [
      "{npc}: Weird thing to attack me for.",
      "{npc}: Okay?",
      "{npc}: Sure. Whatever helps you sleep.",
    ],
    negative: [
      "{npc}: My love life isn't your business.",
      "{npc}: Talk about me like that again and we're done.",
      "{npc}: That was ugly, {player}.",
    ],
  },

  TALK_BOOST_CHALLENGE_PLAYFUL_1: {
    positive: [
      "{npc}: You're right. Reset button hit. Let's take the next one.",
      "{npc}: Needed that. Thanks, {player}.",
      "{npc}: Okay okay — new energy. Let's go.",
    ],
    neutral: [
      "{npc}: We'll see.",
      "{npc}: Sure, positive vibes only.",
      "{npc}: I hear you.",
    ],
    negative: [
      "{npc}: Pep talks don't win competitions.",
      "{npc}: Save the cheerleading, {player}.",
      "{npc}: I don't need hype. I need a plan.",
    ],
  },
  TALK_BOOST_GROUP_SINCERE_1: {
    positive: [
      "{npc}: Group huddle! Yes. This is what we needed.",
      "{npc}: Stronger together — I'm in.",
      "{npc}: Okay this is actually raising the room.",
    ],
    neutral: [
      "{npc}: Sure, quick huddle then.",
      "{npc}: I'll take the vibe.",
      "{npc}: Fine, positive energy accepted.",
    ],
    negative: [
      "{npc}: This feels performative, {player}.",
      "{npc}: Rah-rah speeches aren't my thing.",
      "{npc}: Group therapy time again, huh.",
    ],
  },

  TALK_DEFLECT_EVICTION_APOLOGETIC_1: {
    positive: [
      "{npc}: Smart. Staying out of vote talk is the play.",
      "{npc}: Respect. Keep your cards close.",
      "{npc}: Fine — I'll ask someone else. No hard feelings.",
    ],
    neutral: [
      "{npc}: Hm. Okay.",
      "{npc}: Fair enough.",
      "{npc}: Alright, we drop it.",
    ],
    negative: [
      "{npc}: 'Neutral' is a vote too, {player}.",
      "{npc}: That's a dodge. I'll remember that.",
      "{npc}: You can't hide on vote night forever.",
    ],
  },
  TALK_DEFLECT_PRODUCTION_DISMISSIVE_1: {
    positive: [
      "{npc}: 'Let them starve' — I love that.",
      "{npc}: Agreed. No more paranoia for the cameras.",
      "{npc}: Refreshing. Everyone else is performing.",
    ],
    neutral: [
      "{npc}: Sure. Break from the game.",
      "{npc}: Alright, dropping it.",
      "{npc}: Whatever you need.",
    ],
    negative: [
      "{npc}: You're the loudest one for the cameras, {player}.",
      "{npc}: 'Ignore the game' — very convenient right now.",
      "{npc}: That's a dodge dressed as a philosophy.",
    ],
  },

  TALK_DIVERT_PERSONAL_NEUTRAL_1: {
    positive: [
      "{npc}: Thank you. I needed a normal conversation.",
      "{npc}: Yeah — let's talk about anything else. Please.",
      "{npc}: This is the most human minute I've had in days.",
    ],
    neutral: [
      "{npc}: Sure, we can talk about something else.",
      "{npc}: Okay. What's on your mind?",
      "{npc}: Alright.",
    ],
    negative: [
      "{npc}: You always divert right when it gets real, {player}.",
      "{npc}: Feels like you're avoiding my question.",
      "{npc}: Not now. We were actually getting somewhere.",
    ],
  },

  TALK_REVEAL_STRATEGY_SINCERE_1: {
    positive: [
      "{npc}: That changes things. Thank you for telling me.",
      "{npc}: I owe you one. Big one.",
      "{npc}: Between us. Always. I won't forget this, {player}.",
    ],
    neutral: [
      "{npc}: Okay. Filing that away.",
      "{npc}: Alright — I hear you.",
      "{npc}: Not sure what to do with that yet, but thanks.",
    ],
    negative: [
      "{npc}: Why are you telling me this, really?",
      "{npc}: Sounds like bait, {player}.",
      "{npc}: I don't want your secrets.",
    ],
  },

  // ============================================================
  // DM
  // ============================================================
  DM_BUILD_ALLY_STRATEGY_SINCERE_1: {
    positive: [
      "{npc}: Just us two. Done. Let's put names on paper.",
      "{npc}: I trust you back. This stays sealed.",
      "{npc}: Yes. Real pact. No leaks.",
    ],
    neutral: [
      "{npc}: I like the offer. Give me a night to sit with it.",
      "{npc}: Provisionally, yes. Show me a vote first.",
      "{npc}: I'm close to yes. Not there.",
    ],
    negative: [
      "{npc}: You're bidding too high, {player}. Slow down.",
      "{npc}: I don't do 'real pacts' this early.",
      "{npc}: Feels like a fishing trip in DMs.",
    ],
  },
  DM_BUILD_ALLY_STRATEGY_SINCERE_2: {
    positive: [
      "{npc}: Quietly. Yes. That's exactly how I want to play.",
      "{npc}: Off-record works. Nothing in group chats.",
      "{npc}: Protect each other — that's the whole game. In.",
    ],
    neutral: [
      "{npc}: Let me watch one more move from you.",
      "{npc}: Off-record noted. I'll respond off-record.",
      "{npc}: Not ready to commit. Keep talking though.",
    ],
    negative: [
      "{npc}: Everything you're offering off-record I've heard on-record.",
      "{npc}: I'm not signing anything private with you yet.",
      "{npc}: This DM screams 'target practice.'",
    ],
  },
  DM_BUILD_ALLY_ROMANCE_FLIRTY_1: {
    positive: [
      "{npc}: More than allies. I've been thinking the same thing.",
      "{npc}: If this is real, I'm all the way in.",
      "{npc}: Not just strategy — I feel it too.",
    ],
    neutral: [
      "{npc}: Let's not name it yet. But I'm not saying no.",
      "{npc}: Tell me that when we're not both playing a game.",
      "{npc}: I'll hold onto that.",
    ],
    negative: [
      "{npc}: Don't blur it, {player}. That's how people get hurt.",
      "{npc}: I don't trust game-plus-romance in here.",
      "{npc}: Feels like leverage, not feelings.",
    ],
  },

  DM_PROBE_EVICTION_NEUTRAL_1: {
    positive: [
      "{npc}: Real count: four for the obvious target, two floating. You're safe.",
      "{npc}: The block's flipping. I'll DM you when it locks.",
      "{npc}: Honest — you're not the target. Someone above you is.",
    ],
    neutral: [
      "{npc}: I have a count. I'm not sharing it in DMs.",
      "{npc}: Ask me face to face and I'll tell you.",
      "{npc}: Same numbers as this afternoon.",
    ],
    negative: [
      "{npc}: Why would I hand you the count, {player}?",
      "{npc}: Not answering that. Not tonight.",
      "{npc}: You're fishing and it's obvious.",
    ],
  },
  DM_PROBE_RUMOR_SUSPICIOUS_1: {
    positive: [
      "{npc}: Whatever you heard is half true. Let me clarify.",
      "{npc}: Ask me the specific thing and I'll answer straight.",
      "{npc}: Yeah — I'd rather set the record with you now.",
    ],
    neutral: [
      "{npc}: Depends on the rumor. Which one?",
      "{npc}: People talk. I don't chase every whisper.",
      "{npc}: I'll respond if you tell me who said it.",
    ],
    negative: [
      "{npc}: If you believed a rumor about me, that's on you.",
      "{npc}: Not defending myself in a DM.",
      "{npc}: Sounds like you started that rumor, {player}.",
    ],
  },
  DM_PROBE_STRATEGY_HARD_NEUTRAL_1: {
    positive: [
      "{npc}: Alright — real answer. My target this week is not you.",
      "{npc}: You want hard intel, here it is: two-side split forming.",
      "{npc}: I'll give you my whole read. Don't burn me with it.",
    ],
    neutral: [
      "{npc}: Half answer only. Ask something narrower.",
      "{npc}: I'll trade — you first.",
      "{npc}: Not free. What are you offering?",
    ],
    negative: [
      "{npc}: You want my whole game in one DM? No.",
      "{npc}: Hard question, wrong messenger, wrong day.",
      "{npc}: I'm not your intel source, {player}.",
    ],
  },

  DM_FLIRT_ROMANCE_FLIRTY_1: {
    positive: [
      "{npc}: Off-camera flirting hits different. Keep going.",
      "{npc}: I've been waiting for you to DM me that.",
      "{npc}: You're trouble in the best way.",
    ],
    neutral: [
      "{npc}: Careful. This gets read back if I screenshot it.",
      "{npc}: I'll allow the flirt. Nothing more tonight.",
      "{npc}: Cute in a DM. Would you say it out loud?",
    ],
    negative: [
      "{npc}: Not comfortable with that in writing, {player}.",
      "{npc}: Please stop DM-flirting me during game week.",
      "{npc}: Wrong channel, wrong energy.",
    ],
  },
  DM_FLIRT_SLEEP_FLIRTY_1: {
    positive: [
      "{npc}: You up too? Come find me. Quietly.",
      "{npc}: DM at 2am. Bold, {player}. I like it.",
      "{npc}: Same. Talk to me until I fall asleep.",
    ],
    neutral: [
      "{npc}: Sleeping soon. Talk tomorrow.",
      "{npc}: Ha. Long day. Rain check.",
      "{npc}: Cute. Goodnight.",
    ],
    negative: [
      "{npc}: Please don't DM me late-night stuff, {player}.",
      "{npc}: I'm actually trying to sleep.",
      "{npc}: This is the second time. Stop.",
    ],
  },

  DM_SOW_DOUBT_STRATEGY_SARCASTIC_1: {
    positive: [
      "{npc}: Yeah… that lines up with something I saw earlier.",
      "{npc}: Now I'm looking at them differently. Thanks for the DM.",
      "{npc}: Filing that. Quietly.",
    ],
    neutral: [
      "{npc}: Could be. Could be nothing.",
      "{npc}: I'll watch, but I won't act on a DM.",
      "{npc}: Noted, not confirmed.",
    ],
    negative: [
      "{npc}: You're planting in DMs now? Weak, {player}.",
      "{npc}: I'm going to ask them directly. In front of you.",
      "{npc}: This DM is going to hurt you more than them.",
    ],
  },
  DM_SOW_DOUBT_RUMOR_DISMISSIVE_1: {
    positive: [
      "{npc}: Rumor tracks. I'll dig quietly.",
      "{npc}: I'd heard fragments of that. This confirms it.",
      "{npc}: Okay — I'm paying attention now.",
    ],
    neutral: [
      "{npc}: A rumor is a rumor.",
      "{npc}: I'll listen, I won't repeat it.",
      "{npc}: Mmhm.",
    ],
    negative: [
      "{npc}: DM-gossip is a coward's game, {player}.",
      "{npc}: Not touching that.",
      "{npc}: This DM is going to boomerang.",
    ],
  },

  DM_REVEAL_STRATEGY_SINCERE_1: {
    positive: [
      "{npc}: That's huge. I owe you. This stays with me.",
      "{npc}: You didn't have to tell me. I won't forget it.",
      "{npc}: Okay — you just changed my whole week.",
    ],
    neutral: [
      "{npc}: I hear you. Let me sit with this.",
      "{npc}: Interesting. Not sure how to use it.",
      "{npc}: Thanks for the heads up.",
    ],
    negative: [
      "{npc}: Why me, and why now, {player}?",
      "{npc}: This smells like a plant.",
      "{npc}: I don't want to hold that secret.",
    ],
  },
  DM_REVEAL_GAME_SINCERE_2: {
    positive: [
      "{npc}: Big share. Big trust. Received, {player}.",
      "{npc}: I'll protect that information with my game.",
      "{npc}: Okay — this is the DM I needed tonight.",
    ],
    neutral: [
      "{npc}: Received. Thinking.",
      "{npc}: Copy. Not acting yet.",
      "{npc}: Okay. Noted.",
    ],
    negative: [
      "{npc}: Feels rehearsed, honestly.",
      "{npc}: Every reveal in here has a price. What's yours?",
      "{npc}: I'll believe it when I see it play out.",
    ],
  },

  DM_DEFLECT_RUMOR_APOLOGETIC_1: {
    positive: [
      "{npc}: Appreciate you not spreading it. Really.",
      "{npc}: Grown-up move, {player}. Thank you.",
      "{npc}: That means more than you know.",
    ],
    neutral: [
      "{npc}: Okay. Dropping it.",
      "{npc}: Understood.",
      "{npc}: Fine.",
    ],
    negative: [
      "{npc}: You brought up the rumor just to 'not spread' it.",
      "{npc}: That's a fake apology, {player}.",
      "{npc}: Weird DM. Weird energy.",
    ],
  },

  DM_DIVERT_PRESSURE_NEUTRAL_1: {
    positive: [
      "{npc}: Thanks for pulling me off the ledge. I needed that.",
      "{npc}: Right — pressure's temporary. Game's long.",
      "{npc}: You're the only one not stoking the fire tonight.",
    ],
    neutral: [
      "{npc}: Fine, we drop it.",
      "{npc}: Okay.",
      "{npc}: I hear you.",
    ],
    negative: [
      "{npc}: You always divert when I need actual answers.",
      "{npc}: Deflection dressed up as care, {player}.",
      "{npc}: Not tonight. I need to talk about it.",
    ],
  },

  DM_BOOST_MORALE_REASSURE_SINCERE_1: {
    positive: [
      "{npc}: I needed to hear that. Thank you, {player}.",
      "{npc}: You just kept me in this game.",
      "{npc}: Reading this three times. It matters.",
    ],
    neutral: [
      "{npc}: Appreciated.",
      "{npc}: Thanks. I'll be fine.",
      "{npc}: Kind of you.",
    ],
    negative: [
      "{npc}: DM reassurance feels performative.",
      "{npc}: Don't manage my emotions, {player}.",
      "{npc}: I'm not that fragile.",
    ],
  },

  DM_REVEAL_SLEEP_SINCERE_1: {
    positive: [
      "{npc}: 3am confessions hit different. Thank you for trusting me.",
      "{npc}: I won't forget you told me this at your lowest.",
      "{npc}: I'm here. Keep talking.",
    ],
    neutral: [
      "{npc}: I'm listening. Sleep after.",
      "{npc}: Okay. Hearing you.",
      "{npc}: Talk to me.",
    ],
    negative: [
      "{npc}: Middle of the night reveals feel manipulative, {player}.",
      "{npc}: I can't hold that at 3am. Sorry.",
      "{npc}: Please save this for daylight.",
    ],
  },

  // ============================================================
  // SCHEME
  // ============================================================
  SCHEME_SOW_DOUBT_STRATEGY_AGGRESSIVE_1: {
    positive: [
      "{npc}: You're right — we need to burn that read to the ground. Let's move.",
      "{npc}: I'm in. Let's poison the well before they do.",
      "{npc}: Aggressive but correct. Give me a target.",
    ],
    neutral: [
      "{npc}: I'll play, but softer. Aggression tips them off.",
      "{npc}: Maybe. Let me think about the timing.",
      "{npc}: I hear the pitch. Not committing yet.",
    ],
    negative: [
      "{npc}: That's not a scheme, that's a tantrum, {player}.",
      "{npc}: Too loud. We'd both get burned.",
      "{npc}: Pass. That plan has our fingerprints all over it.",
    ],
  },
  SCHEME_SOW_DOUBT_ROMANCE_DISMISSIVE_1: {
    positive: [
      "{npc}: Weaponizing the showmance. Cold. I like it.",
      "{npc}: Yeah — split them and the votes fall apart.",
      "{npc}: Deal. Let's plant the seed at breakfast.",
    ],
    neutral: [
      "{npc}: Risky. Romance stuff blows up in your face.",
      "{npc}: Possible. Let me think.",
      "{npc}: I'll consider it.",
    ],
    negative: [
      "{npc}: I'm not messing with real feelings for a vote.",
      "{npc}: That's ugly, {player}. Even for scheme talk.",
      "{npc}: No. Draw the line somewhere.",
    ],
  },
  SCHEME_ALLIANCE_COORDINATION_STRATEGIC_1: {
    positive: [
      "{npc}: Yes. Coordinated vote, split cover story. Let's build it.",
      "{npc}: Finally someone thinking two moves ahead. In.",
      "{npc}: Draw me the plan. I'll deliver my end.",
    ],
    neutral: [
      "{npc}: Sound in theory. Show me the assignments.",
      "{npc}: I'll listen, not commit yet.",
      "{npc}: Coordination only works if everyone actually does it.",
    ],
    negative: [
      "{npc}: Too many moving parts. This scheme dies on day one.",
      "{npc}: I don't trust the other names on this list.",
      "{npc}: Overengineered, {player}.",
    ],
  },
  SCHEME_INFORMATION_TRADE_NEUTRAL_1: {
    positive: [
      "{npc}: Fair trade. You give first, I match.",
      "{npc}: Deal. Here's mine — your turn.",
      "{npc}: Info for info. Clean transaction.",
    ],
    neutral: [
      "{npc}: Depends what you're offering.",
      "{npc}: Show me yours first.",
      "{npc}: Maybe. Small trade to test the waters?",
    ],
    negative: [
      "{npc}: I don't trade with people I can't verify.",
      "{npc}: You'd repackage anything I give you.",
      "{npc}: Not this week, {player}.",
    ],
  },
  SCHEME_BUILD_ALLY_STRATEGY_SINCERE_1: {
    positive: [
      "{npc}: Yes. Scheme-tight. This isn't a friendship, it's a partnership.",
      "{npc}: Locked. What's the first move?",
      "{npc}: I've been wanting to plot with you specifically.",
    ],
    neutral: [
      "{npc}: I'll partner on ONE move first. Prove it out.",
      "{npc}: Provisional partner. Not a blood oath.",
      "{npc}: Let me sit with it a day.",
    ],
    negative: [
      "{npc}: Building an alliance during a scheme is how you leak both.",
      "{npc}: No. Wrong time, wrong pitch, {player}.",
      "{npc}: I don't scheme with people I just met strategically.",
    ],
  },
  SCHEME_REVEAL_EVICTION_SINCERE_1: {
    positive: [
      "{npc}: That's the piece I was missing. We can flip this vote.",
      "{npc}: You just handed me the week, {player}.",
      "{npc}: Okay — new plan starts tonight.",
    ],
    neutral: [
      "{npc}: I hear it. Not sure I can act on it.",
      "{npc}: Interesting. Let me verify.",
      "{npc}: Filing it.",
    ],
    negative: [
      "{npc}: Feels like disinformation, {player}.",
      "{npc}: Why reveal that IN a scheme? That's suspicious.",
      "{npc}: You're setting me up.",
    ],
  },
  SCHEME_INSULT_STRATEGY_AGGRESSIVE_1: {
    positive: [
      "{npc}: You want smoke. Okay. Let's talk about YOUR game then.",
      "{npc}: Big words in a scheme meeting, {player}.",
      "{npc}: Say that in front of the group and see who folds.",
    ],
    neutral: [
      "{npc}: Weird energy for a scheme sit-down.",
      "{npc}: Alright.",
      "{npc}: Duly noted.",
    ],
    negative: [
      "{npc}: You just cost yourself a partner.",
      "{npc}: Enjoy scheming alone from now on.",
      "{npc}: We're done, {player}. That was unnecessary.",
    ],
  },
  SCHEME_SOW_DOUBT_FOOD_DISMISSIVE_1: {
    positive: [
      "{npc}: Kitchen politics is real. I'm in on the pettiness.",
      "{npc}: Petty scheme, effective scheme. Yes.",
      "{npc}: Ha — food drama moves votes. It really does.",
    ],
    neutral: [
      "{npc}: Small stakes, but okay.",
      "{npc}: Sure, we can plant it at dinner.",
      "{npc}: I'll play along.",
    ],
    negative: [
      "{npc}: Scheming over groceries is beneath me, {player}.",
      "{npc}: That's not a plan, that's a mood.",
      "{npc}: Pass.",
    ],
  },
  SCHEME_ULTIMATUM_BLOCK_AGGRESSIVE_1: {
    positive: [
      "{npc}: Ultimatum accepted. I'll block them with you.",
      "{npc}: You've got my vote and my silence.",
      "{npc}: Say the name. It's done.",
    ],
    neutral: [
      "{npc}: Big ask. Give me until tonight.",
      "{npc}: I hear the ultimatum. Not committing yet.",
      "{npc}: Depends on who the block is.",
    ],
    negative: [
      "{npc}: Don't ultimatum me, {player}. Ever.",
      "{npc}: That's not how you get my vote. That's how you lose it.",
      "{npc}: Retract that or we're done.",
    ],
  },
  SCHEME_ULTIMATUM_COUNTERMOVE_AGGRESSIVE_1: {
    positive: [
      "{npc}: Countermove is the right call. Let's flip the script on them.",
      "{npc}: I like the pivot. Details?",
      "{npc}: Yes — hit back before they realize we know.",
    ],
    neutral: [
      "{npc}: A countermove is loud. Are we ready for the fallout?",
      "{npc}: Show me the shape of it first.",
      "{npc}: Possibly. Tomorrow.",
    ],
    negative: [
      "{npc}: Countermove is just revenge with steps, {player}.",
      "{npc}: We'll both be on the block next week if we do this.",
      "{npc}: Too hot. I'm out.",
    ],
  },

  // ============================================================
  // ACTIVITY
  // ============================================================
  ACTIVITY_BUILD_ALLY_FOOD_PLAYFUL_1: {
    positive: [
      "{npc}: Cook crew for life. I'm in.",
      "{npc}: Yes — kitchen bonding is underrated.",
      "{npc}: Let's make it a nightly thing.",
    ],
    neutral: [
      "{npc}: Sure, when I'm on rotation.",
      "{npc}: Fine, sometimes.",
      "{npc}: Okay, {player}.",
    ],
    negative: [
      "{npc}: I don't want to cook with you every night, {player}.",
      "{npc}: Kitchen alone is my one peace here.",
      "{npc}: Pass.",
    ],
  },
  ACTIVITY_BUILD_ALLY_CHALLENGE_SINCERE_1: {
    positive: [
      "{npc}: Training partners. Yes. We sharpen each other.",
      "{npc}: I've been wanting a real workout buddy.",
      "{npc}: Deal — puzzle drills at sunrise.",
    ],
    neutral: [
      "{npc}: Sure, we can prep together sometimes.",
      "{npc}: Depends on the challenge.",
      "{npc}: Okay.",
    ],
    negative: [
      "{npc}: I train alone. Focus thing, not personal.",
      "{npc}: You'd distract me, honestly.",
      "{npc}: Not this week, {player}.",
    ],
  },
  ACTIVITY_JOKE_FOOD_PLAYFUL_1: {
    positive: [
      "{npc}: You cooking AND telling jokes? Dangerous combo.",
      "{npc}: Ha — okay, kitchen comedian.",
      "{npc}: That got me. Keep the bit going.",
    ],
    neutral: [
      "{npc}: Heh.",
      "{npc}: Cute.",
      "{npc}: Alright, funny.",
    ],
    negative: [
      "{npc}: Cook or joke. Not both.",
      "{npc}: Not landing tonight, {player}.",
      "{npc}: I'm too hungry for bits.",
    ],
  },
  ACTIVITY_JOKE_CHALLENGE_PLAYFUL_1: {
    positive: [
      "{npc}: Loose energy — I love it before a challenge.",
      "{npc}: Ha. Okay, that broke my nerves.",
      "{npc}: Good vibes only. Let's win this.",
    ],
    neutral: [
      "{npc}: Heh. Focus, {player}.",
      "{npc}: Cute. Now stretch.",
      "{npc}: Alright.",
    ],
    negative: [
      "{npc}: Not while I'm warming up.",
      "{npc}: You joke, we lose.",
      "{npc}: Dial it in, {player}.",
    ],
  },
  ACTIVITY_FLIRT_CHALLENGE_FLIRTY_1: {
    positive: [
      "{npc}: Flirting mid-challenge? I'll win just to hear more.",
      "{npc}: You're going to make me miss my mark, {player}.",
      "{npc}: Keep talking. I like the distraction.",
    ],
    neutral: [
      "{npc}: Ha. After the challenge, maybe.",
      "{npc}: Focus first.",
      "{npc}: Cute, {player}.",
    ],
    negative: [
      "{npc}: Not during a competition. Come on.",
      "{npc}: That's a distraction and I don't want it.",
      "{npc}: Read the room.",
    ],
  },
  ACTIVITY_FLIRT_FOOD_FLIRTY_1: {
    positive: [
      "{npc}: You cooking for me? That's a real move.",
      "{npc}: Save me the last bite, {player}.",
      "{npc}: Okay — dinner date, unofficial.",
    ],
    neutral: [
      "{npc}: Cute line. Try it after dinner.",
      "{npc}: Ha. Move over.",
      "{npc}: Compliment noted.",
    ],
    negative: [
      "{npc}: Please stop hovering while I plate up.",
      "{npc}: Not the vibe, {player}.",
      "{npc}: Weird energy over a stove.",
    ],
  },
  ACTIVITY_DIVERT_PERSONAL_NEUTRAL_1: {
    positive: [
      "{npc}: This is the most normal I've felt in a week.",
      "{npc}: Thanks for pulling us out of the game head-space.",
      "{npc}: I forgot we could just… hang.",
    ],
    neutral: [
      "{npc}: Sure, we can chill.",
      "{npc}: Fine by me.",
      "{npc}: Okay.",
    ],
    negative: [
      "{npc}: You always want to 'just hang' when a vote is close, {player}.",
      "{npc}: I can't turn my brain off right now.",
      "{npc}: Not tonight.",
    ],
  },
  ACTIVITY_BOOST_CHALLENGE_SINCERE_1: {
    positive: [
      "{npc}: Team energy. Let's take this one.",
      "{npc}: I needed that speech, {player}.",
      "{npc}: Locked in. Let's go.",
    ],
    neutral: [
      "{npc}: Alright, team. Focus up.",
      "{npc}: Sure.",
      "{npc}: Heard.",
    ],
    negative: [
      "{npc}: Save the pep talk for someone who needs it.",
      "{npc}: Rah-rah doesn't win challenges.",
      "{npc}: I've got my own headspace, thanks.",
    ],
  },

  // Self / cross-mode
  ANY_BOOST_SELF_SINCERE_1: {
    positive: [
      "{npc}: Talking to yourself, {player}? Whatever works.",
      "{npc}: Overheard the self-pep talk. Respect.",
      "{npc}: That was for the cameras and I'm not mad at it.",
    ],
    neutral: [
      "{npc}: You good?",
      "{npc}: Whispering to yourself is a choice.",
      "{npc}: Alright, {player}.",
    ],
    negative: [
      "{npc}: That was awkward to witness.",
      "{npc}: Talk to a person next time.",
      "{npc}: Cringed a little, not gonna lie.",
    ],
  },

  // Extras
  TALK_FLIRT_PRODUCTION_PLAYFUL_1: {
    positive: [
      "{npc}: Give the edit something juicy? Bold, {player}. I'm in.",
      "{npc}: Ha — play up for the cameras with me? Yes.",
      "{npc}: You want us clipped together? Okay.",
    ],
    neutral: [
      "{npc}: Cute. Cameras are always on.",
      "{npc}: Ha. Save it for confessional.",
      "{npc}: Playful. Noted.",
    ],
    negative: [
      "{npc}: Don't turn me into content, {player}.",
      "{npc}: That's producer-bait. Not doing it.",
      "{npc}: Weird choice for a flirt.",
    ],
  },
  TALK_INSULT_FOOD_SARCASTIC_1: {
    positive: [
      "{npc}: Roast my cooking again and I'll poison your plate.",
      "{npc}: Bold to insult the chef, {player}.",
      "{npc}: Say it louder, I dare you.",
    ],
    neutral: [
      "{npc}: Cook next time then.",
      "{npc}: Har har.",
      "{npc}: Duly noted.",
    ],
    negative: [
      "{npc}: You're insulting my food to feel superior. Got it.",
      "{npc}: That was petty, {player}.",
      "{npc}: Kitchen's closed to you.",
    ],
  },
  TALK_DEFLECT_ROMANCE_APOLOGETIC_1: {
    positive: [
      "{npc}: Thank you for not making it weird. Genuinely.",
      "{npc}: Appreciate you letting it drop.",
      "{npc}: We're okay. I promise.",
    ],
    neutral: [
      "{npc}: Fine. Dropped.",
      "{npc}: Okay.",
      "{npc}: Understood.",
    ],
    negative: [
      "{npc}: You keep half-answering me on this, {player}.",
      "{npc}: 'Sorry' isn't an answer to the question I asked.",
      "{npc}: Fine. I'll stop asking. Forever.",
    ],
  },
  TALK_DEFLECT_PUBLIC_STRONG_NEUTRAL_1: {
    positive: [
      "{npc}: Solid public poker face, {player}. Respect.",
      "{npc}: Everyone was watching and you gave them nothing. Nice.",
      "{npc}: Textbook deflect. I took notes.",
    ],
    neutral: [
      "{npc}: Reasonable answer for a room this big.",
      "{npc}: Okay. Fine.",
      "{npc}: Everyone heard you say nothing.",
    ],
    negative: [
      "{npc}: Deflecting in front of the whole house makes you look guilty.",
      "{npc}: That was too smooth. Everyone noticed.",
      "{npc}: You just painted a target on your own back, {player}.",
    ],
  },
  TALK_TEST_ALLIANCE_LOYALTY_SINCERE_1: {
    positive: [
      "{npc}: Test me all you want — my answer's the same. I'm with you.",
      "{npc}: I get it. You should be checking. And yes, I'm loyal.",
      "{npc}: Ask me anything. I don't have anything to hide from you.",
    ],
    neutral: [
      "{npc}: I understand the test. I'm still deciding my answer.",
      "{npc}: Fair question. Give me a beat.",
      "{npc}: Depends what the test is.",
    ],
    negative: [
      "{npc}: Testing me is how you lose me, {player}.",
      "{npc}: If you have to test my loyalty, we don't have any.",
      "{npc}: Insulting. Try trusting me instead.",
    ],
  },
  TALK_PRESSURE_PUBLIC_STRATEGY_NEUTRAL_1: {
    positive: [
      "{npc}: Pressuring me in public — bold move. It's working.",
      "{npc}: Fine. In front of everyone: yes, I'll commit.",
      "{npc}: Okay, {player}. You called me out. I'm with you.",
    ],
    neutral: [
      "{npc}: Not answering under pressure. Ask me privately.",
      "{npc}: Public pressure doesn't get a public answer.",
      "{npc}: I hear you. Not on camera.",
    ],
    negative: [
      "{npc}: Never corner me in public again.",
      "{npc}: You just declared war in front of everyone.",
      "{npc}: That was a mistake, {player}. And you know it.",
    ],
  },
};

export const getHandCraftedReaction = (
  choiceId: string,
  category: ReactionCategory,
  seed: string,
  npcName: string,
  playerName: string
): string | null => {
  const set = CHOICE_REACTIONS[choiceId];
  if (!set) return null;
  const arr = set[category];
  if (!arr || !arr.length) return null;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const idx = h % arr.length;
  return arr[idx]
    .replace(/\{npc\}/g, npcName)
    .replace(/\{player\}/g, playerName || 'you');
};

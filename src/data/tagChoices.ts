import { Choice } from '@/types/tagDialogue';

export const TAG_CHOICES: Choice[] = [
  // ========== TALK COMBINATIONS ==========
  
  // BuildAlliance + All Topics for Talk
  {
    choiceId: 'TALK_BUILD_ALLY_GAME_SINCERE_1',
    textVariants: [
      'I think we should work together in this game.',
      'Want to team up? I trust your instincts.',
      'We could be a powerful duo if we stick together.'
    ],
    intent: 'BuildAlliance',
    tone: 'Sincere',
    topics: ['Game', 'Strategy'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 2,
    weight: 1.0
  },
  {
    choiceId: 'TALK_BUILD_ALLY_GAME_SINCERE_2',
    textVariants: [
      'Let’s align our games—quietly and precisely.',
      'You fit how I want to play. Let’s lock it in.',
      'We’re compatible strategically. Work with me?'
    ],
    intent: 'BuildAlliance',
    tone: 'Sincere',
    topics: ['Game', 'Strategy'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 3,
    weight: 1.0
  },
  {
    choiceId: 'TALK_BUILD_ALLY_CHALLENGE_PLAYFUL_1',
    textVariants: [
      'We crushed that last challenge together!',
      'Want to be challenge partners? We have good chemistry.',
      'I feel like we balance each other out in competitions.'
    ],
    intent: 'BuildAlliance',
    tone: 'Playful',
    topics: ['Challenge'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'TALK_BUILD_ALLY_ROMANCE_FLIRTY_1',
    textVariants: [
      'I like having you as my partner in crime.',
      'You and me against the world?',
      'There\'s something special about our connection.'
    ],
    intent: 'BuildAlliance',
    tone: 'Flirty',
    topics: ['Romance'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 2,
    weight: 1.0
  },
  {
    choiceId: 'TALK_BUILD_ALLY_FOOD_NEUTRAL_1',
    textVariants: [
      'Want to cook together more often? We make a good team.',
      'I enjoy our kitchen talks. Good way to bond.',
      'Maybe we should plan meals together.'
    ],
    intent: 'BuildAlliance',
    tone: 'Neutral',
    topics: ['Food'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'TALK_BUILD_ALLY_SLEEP_SINCERE_1',
    textVariants: [
      'Can\'t sleep either? Want to chat quietly?',
      'Mind if I join you? My head\'s too noisy.',
      'Late night bonding hits different.'
    ],
    intent: 'BuildAlliance',
    tone: 'Sincere',
    topics: ['Sleep', 'PersonalHistory'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 1,
    weight: 1.0
  },

  // Persona-tailored phrasing (Hero vs Villain) via variants
  {
    choiceId: 'TALK_BUILD_ALLY_GAME_PERSONA_1',
    textVariants: [
      // Hero voice
      'We can protect each other and play clean. Team up?',
      'I want to make moves the right way. With you.',
      // Villain voice
      'You and I can control the board. Quietly.',
      'Let’s corner the narrative together—no apologies.'
    ],
    intent: 'BuildAlliance',
    tone: 'Sincere',
    topics: ['Game', 'Strategy'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 3,
    weight: 1.0
  },

  // ProbeForInfo + All Topics for Talk
  {
    choiceId: 'TALK_PROBE_GAME_NEUTRAL_1',
    textVariants: [
      'What are you hearing about the vote?',
      'Any whispers on where the votes are landing?',
      'Fill me in on the house dynamics?'
    ],
    intent: 'ProbeForInfo',
    tone: 'Neutral',
    topics: ['Game', 'Rumor'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'TALK_PROBE_GAME_NEUTRAL_2',
    textVariants: [
      'Give me your honest read—who’s pushing which names?',
      'Who’s coordinating right now, in your view?',
      'What’s the pattern you’re seeing on votes?'
    ],
    intent: 'ProbeForInfo',
    tone: 'Neutral',
    topics: ['Game', 'Strategy'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 2,
    weight: 1.0
  },
  {
    choiceId: 'TALK_PROBE_EVICTION_SUSPICIOUS_1',
    textVariants: [
      'You seem nervous about tonight. What\'s up?',
      'Any last-minute vote swings happening?',
      'Someone\'s been making rounds. Know who?'
    ],
    intent: 'ProbeForInfo',
    tone: 'Neutral',
    topics: ['Eviction', 'Strategy'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'TALK_PROBE_ROMANCE_PLAYFUL_1',
    textVariants: [
      'So what\'s the deal with you and {{target}}?',
      'Spill the tea on the house romance.',
      'Come on, give me the relationship gossip.',
      'Is there something going on between you and {{target}}?'
    ],
    intent: 'ProbeForInfo',
    tone: 'Playful',
    topics: ['Romance', 'Rumor'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 2,
    weight: 1.0
  },

  // Flirt + All Topics for Talk  
  {
    choiceId: 'TALK_FLIRT_ROMANCE_FLIRTY_1',
    textVariants: [
      'You look dangerous in a good way today.',
      'Careful, you might be distracting me on purpose.',
      'That smile could get me in trouble.'
    ],
    intent: 'Flirt',
    tone: 'Flirty',
    topics: ['Romance'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 2,
    weight: 1.0
  },
  {
    choiceId: 'TALK_FLIRT_FOOD_FLIRTY_1',
    textVariants: [
      'You make that sandwich look way better than it should.',
      'Save room for dessert? I might have something sweet later.',
      'The way you cook is honestly attractive.'
    ],
    intent: 'Flirt',
    tone: 'Flirty',
    topics: ['Food'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 2,
    weight: 1.0
  },
  {
    choiceId: 'TALK_FLIRT_CHALLENGE_PLAYFUL_1',
    textVariants: [
      'I love watching you compete. Pure fire.',
      'You\'re sexy when you\'re focused.',
      'That competitive spirit is really attractive.'
    ],
    intent: 'Flirt',
    tone: 'Playful',
    topics: ['Challenge'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 2,
    weight: 1.0
  },

  // SowDoubt + All Topics for Talk
  {
    choiceId: 'TALK_SOW_DOUBT_STRATEGY_SARCASTIC_1',
    textVariants: [
      'Funny how {{target}} is suddenly everyone\'s best friend.',
      'Wild that {{target}} found time to charm the whole house overnight.',
      'Interesting strategy {{target}} has been playing lately.',
      'Feels like {{target}} is trying too hard this week.'
    ],
    intent: 'SowDoubt',
    tone: 'Sarcastic',
    topics: ['Strategy', 'Rumor'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 3,
    weight: 1.0
  },
  {
    choiceId: 'TALK_SOW_DOUBT_ROMANCE_DISMISSIVE_1',
    textVariants: [
      'That relationship seems awfully convenient timing-wise.',
      'Funny how the romance started right before elimination.',
      'I wonder if those feelings are strategic.'
    ],
    intent: 'SowDoubt',
    tone: 'Dismissive',
    topics: ['Romance', 'Strategy'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 3,
    weight: 1.0
  },

  // MakeJoke + All Topics for Talk
  {
    choiceId: 'TALK_JOKE_FOOD_PLAYFUL_1',
    textVariants: [
      'If this kitchen had a Michelin star, it fell off the plate.',
      'This stew is plotting against us.',
      'I think the food is trying to eliminate us first.'
    ],
    intent: 'MakeJoke',
    tone: 'Playful',
    topics: ['Food'],
    targetType: 'Group',
    interactionTypes: ['talk'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'TALK_JOKE_PRODUCTION_DISMISSIVE_1',
    textVariants: [
      'Plot twist: the real treasure was the enemies we made along the way.',
      'Another riveting episode of "Dramatic Stare-Offs."',
      'I feel like we\'re in a reality TV show or something.'
    ],
    intent: 'MakeJoke',
    tone: 'Dismissive',
    topics: ['Production', 'Game'],
    targetType: 'Group',
    interactionTypes: ['talk'],
    cooldownDays: 1,
    weight: 1.0
  },

  // Insult + All Topics for Talk
  {
    choiceId: 'TALK_INSULT_STRATEGY_AGGRESSIVE_1',
    textVariants: [
      'If that\'s your plan, you won\'t last a week.',
      'That move screams amateur hour.',
      'Your strategy is as transparent as glass.'
    ],
    intent: 'Insult',
    tone: 'Aggressive',
    topics: ['Strategy', 'Game'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 4,
    weight: 1.0
  },
  {
    choiceId: 'TALK_INSULT_ROMANCE_AGGRESSIVE_1',
    textVariants: [
      'Your flirting strategy is falling flat with everyone.',
      'That charm offensive isn\'t fooling anyone.',
      'Using romance as strategy? How original.'
    ],
    intent: 'Insult',
    tone: 'Aggressive',
    topics: ['Romance', 'Strategy'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 4,
    weight: 1.0
  },

  // BoostMorale + All Topics for Talk
  {
    choiceId: 'TALK_BOOST_CHALLENGE_PLAYFUL_1',
    textVariants: [
      'Shake it off—we\'re due a win.',
      'Next challenge is ours. Let\'s make it fun.',
      'We\'ve got this! Stay positive.'
    ],
    intent: 'BoostMorale',
    tone: 'Playful',
    topics: ['Challenge'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'TALK_BOOST_GROUP_SINCERE_1',
    textVariants: [
      'Alright everyone, group huddle! We got this.',
      'Pep talk time - who needs positive vibes?',
      'We\'re stronger together than apart.'
    ],
    intent: 'BoostMorale',
    tone: 'Sincere',
    topics: ['Game', 'Challenge'],
    targetType: 'Group',
    interactionTypes: ['talk'],
    cooldownDays: 1,
    weight: 1.0
  },

  // Deflect + All Topics for Talk
  {
    choiceId: 'TALK_DEFLECT_EVICTION_APOLOGETIC_1',
    textVariants: [
      'Sorry, but I can\'t get pulled into vote talk.',
      'I feel bad, but I have to stay neutral.',
      'Let\'s talk about something else?'
    ],
    intent: 'Deflect',
    tone: 'Apologetic',
    topics: ['Eviction', 'Game'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'TALK_DEFLECT_PRODUCTION_DISMISSIVE_1',
    textVariants: [
      'Producers love paranoia—let them starve.',
      'I\'m not feeding the cameras today.',
      'Let\'s ignore the game for a bit.'
    ],
    intent: 'Deflect',
    tone: 'Dismissive',
    topics: ['Production', 'Game'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 2,
    weight: 1.0
  },

  // Divert + All Topics for Talk
  {
    choiceId: 'TALK_DIVERT_PERSONAL_NEUTRAL_1',
    textVariants: [
      'Let\'s focus on this instead of all that drama.',
      'Sometimes you just need to do something normal.',
      'Can we talk about something real for once?'
    ],
    intent: 'Divert',
    tone: 'Neutral',
    topics: ['PersonalHistory'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 1,
    weight: 1.0
  },

  // RevealSecret + All Topics for Talk
  {
    choiceId: 'TALK_REVEAL_STRATEGY_SINCERE_1',
    textVariants: [
      'I shouldn\'t say this, but I\'ve got your back.',
      'Low key: I covered for you earlier. Don\'t waste it.',
      'Between us - I know something you need to hear.'
    ],
    intent: 'RevealSecret',
    tone: 'Sincere',
    topics: ['Strategy', 'Game'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 5,
    weight: 1.0
  },

  // ========== DM COMBINATIONS ==========
  
  // BuildAlliance + All Topics for DM
  {
    choiceId: 'DM_BUILD_ALLY_STRATEGY_SINCERE_1',
    textVariants: [
      'Need to talk privately. Can we work together?',
      'I trust you more than anyone here. Alliance?',
      'Want to make a real pact? Just us two.'
    ],
    intent: 'BuildAlliance',
    tone: 'Sincere',
    topics: ['Strategy', 'Game'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 2,
    weight: 1.0
  },
  {
    choiceId: 'DM_BUILD_ALLY_STRATEGY_SINCERE_2',
    textVariants: [
      'Off-record: I want to build something real with you.',
      'Quietly—let’s protect each other.',
      'We move better in sync. You in?'
    ],
    intent: 'BuildAlliance',
    tone: 'Sincere',
    topics: ['Strategy', 'Game'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 3,
    weight: 1.0
  },
  {
    choiceId: 'DM_BUILD_ALLY_ROMANCE_FLIRTY_1',
    textVariants: [
      'Maybe we should be more than just game allies...',
      'I feel something between us. Want to explore it?',
      'This connection feels real. Not just strategy.'
    ],
    intent: 'BuildAlliance',
    tone: 'Flirty',
    topics: ['Romance'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 2,
    weight: 1.0
  },

  // ProbeForInfo + All Topics for DM  
  {
    choiceId: 'DM_PROBE_EVICTION_NEUTRAL_1',
    textVariants: [
      'Privately - what\'s the real vote count?',
      'Need intel. Who\'s actually going home?',
      'Be honest with me about tonight.'
    ],
    intent: 'ProbeForInfo',
    tone: 'Neutral',
    topics: ['Eviction', 'Strategy'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'DM_PROBE_RUMOR_SUSPICIOUS_1',
    textVariants: [
      'Heard some things about you. True or false?',
      'People are talking. Want to set the record straight?',
      'Need to know if I can trust you.'
    ],
    intent: 'ProbeForInfo',
    tone: 'Neutral',
    topics: ['Rumor', 'Strategy'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 2,
    weight: 1.0
  },
  {
    choiceId: 'DM_PROBE_STRATEGY_HARD_NEUTRAL_1',
    textVariants: [
      'Names. I need real names—who are you targeting?',
      'Cut the noise. Who are you voting tonight?',
      'I won’t leak. Give me the plan, no fluff.'
    ],
    intent: 'ProbeForInfo',
    tone: 'Neutral',
    topics: ['Strategy', 'Game'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 2,
    weight: 1.0
  },

  // Flirt + All Topics for DM
  {
    choiceId: 'DM_FLIRT_ROMANCE_FLIRTY_1',
    textVariants: [
      'Been thinking about you. A lot.',
      'Miss having you close. Meet me later?',
      'This tension between us is driving me crazy.'
    ],
    intent: 'Flirt',
    tone: 'Flirty',
    topics: ['Romance'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 2,
    weight: 1.0
  },
  {
    choiceId: 'DM_FLIRT_SLEEP_FLIRTY_1',
    textVariants: [
      'Can\'t sleep. Keep thinking about our conversation.',
      'Late night energy hits different with you.',
      'Wish we could talk somewhere more private.'
    ],
    intent: 'Flirt',
    tone: 'Flirty',
    topics: ['Sleep', 'Romance'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 2,
    weight: 1.0
  },

  // SowDoubt + All Topics for DM
  {
    choiceId: 'DM_SOW_DOUBT_STRATEGY_SARCASTIC_1',
    textVariants: [
      'Funny how {{target}} suddenly cares about loyalty.',
      'Notice how {{target}}\'s story keeps changing?',
      'Think {{target}} is playing you? Just saying.',
      '{{target}} keeps making promises that don\'t add up.'
    ],
    intent: 'SowDoubt',
    tone: 'Sarcastic',
    topics: ['Strategy', 'Rumor'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 3,
    weight: 1.0
  },
  {
    choiceId: 'DM_SOW_DOUBT_RUMOR_DISMISSIVE_1',
    textVariants: [
      '{{target}} talks a lot in private and says nothing in public.',
      'People keep repeating {{target}}\'s “harmless” slips.',
      'Watch who {{target}} smiles at right after meetings.'
    ],
    intent: 'SowDoubt',
    tone: 'Dismissive',
    topics: ['Rumor', 'Game'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 3,
    weight: 1.0
  },

  // RevealSecret + All Topics for DM
  {
    choiceId: 'DM_REVEAL_STRATEGY_SINCERE_1',
    textVariants: [
      'Nobody else can know this...',
      'Saw something that changes everything.',
      'I need you to know what really happened.'
    ],
    intent: 'RevealSecret',
    tone: 'Sincere',
    topics: ['Strategy', 'Game'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 5,
    weight: 1.0
  },
  {
    choiceId: 'DM_REVEAL_GAME_SINCERE_2',
    textVariants: [
      'I covered for you last round. Don\'t waste it.',
      'You were a target—someone flipped last second.',
      'Your name leaked. I shut it down.'
    ],
    intent: 'RevealSecret',
    tone: 'Sincere',
    topics: ['Game', 'Strategy'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 4,
    weight: 1.0
  },

  // Defensive social (use Deflect/Divert/BoostMorale patterns via DM)
  {
    choiceId: 'DM_DEFLECT_RUMOR_APOLOGETIC_1',
    textVariants: [
      'I\'m not engaging rumors about me. Ask me direct if you need.',
      'If you hear my name, come to me. I won’t chase gossip.',
      'I’m not fueling he-said-she-said. Let’s keep it simple.'
    ],
    intent: 'Deflect',
    tone: 'Apologetic',
    topics: ['Rumor', 'Game'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'DM_DIVERT_PRESSURE_NEUTRAL_1',
    textVariants: [
      'Let’s reset. Too much pressure makes bad reads.',
      'Take a breath—tomorrow we reassess.',
      'We’re forcing moves. That’s how people implode.'
    ],
    intent: 'Divert',
    tone: 'Neutral',
    topics: ['Game', 'PersonalHistory'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'DM_BOOST_MORALE_REASSURE_SINCERE_1',
    textVariants: [
      'I vouch for you in rooms. Keep calm—we’re fine.',
      'You’re good. I’m keeping your name clean.',
      'Eyes on the long game. We still control our lane.'
    ],
    intent: 'BoostMorale',
    tone: 'Sincere',
    topics: ['Game', 'PersonalHistory'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 1,
    weight: 1.0
  },

  // RevealSecret + All Topics for DM
  {
    choiceId: 'DM_REVEAL_STRATEGY_SINCERE_1',
    textVariants: [
      'Nobody else can know this...',
      'Saw something that changes everything.',
      'I need you to know what really happened.'
    ],
    intent: 'RevealSecret',
    tone: 'Sincere',
    topics: ['Strategy', 'Game'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 5,
    weight: 1.0
  },

  // ========== SCHEME COMBINATIONS ==========
  
  // SowDoubt + All Topics for Scheme
  {
    choiceId: 'SCHEME_SOW_DOUBT_STRATEGY_AGGRESSIVE_1',
    textVariants: [
      '{{target}} is playing everyone. Time to expose them.',
      'We need to turn people against {{target}} before it\'s too late.',
      '{{target}} thinks they\'re untouchable. Let\'s prove them wrong.',
      'Let\'s start planting seeds against {{target}} now.'
    ],
    intent: 'SowDoubt',
    tone: 'Aggressive',
    topics: ['Strategy', 'Game'],
    targetType: 'Person',
    interactionTypes: ['scheme'],
    cooldownDays: 4,
    weight: 1.0
  },
  {
    choiceId: 'SCHEME_SOW_DOUBT_ROMANCE_DISMISSIVE_1',
    textVariants: [
      'That romance is fake. Help me show everyone.',
      'They\'re using love as strategy. Disgusting.',
      'Time to expose this showmance for what it is.'
    ],
    intent: 'SowDoubt',
    tone: 'Dismissive',
    topics: ['Romance', 'Strategy'],
    targetType: 'Person',
    interactionTypes: ['scheme'],
    cooldownDays: 4,
    weight: 1.0
  },

  // Advanced alliance coordination choices
  {
    choiceId: 'SCHEME_ALLIANCE_COORDINATION_STRATEGIC_1',
    textVariants: [
      'We need to coordinate our votes perfectly this week.',
      'Let\'s plan our elimination strategy step by step.',
      'Time to activate our alliance - here\'s the plan.'
    ],
    intent: 'BuildAlliance',
    tone: 'Sincere',
    topics: ['Strategy', 'Game'],
    targetType: 'Person',
    interactionTypes: ['scheme'],
    cooldownDays: 3,
    weight: 1.0
  },
  {
    choiceId: 'SCHEME_INFORMATION_TRADE_NEUTRAL_1',
    textVariants: [
      'I\'ll share what I know if you share what you know.',
      'Let\'s pool our intelligence about the house dynamics.',
      'Trade information? You first, then I\'ll tell you my intel.'
    ],
    intent: 'ProbeForInfo',
    tone: 'Neutral',
    topics: ['Strategy', 'Rumor'],
    targetType: 'Person',
    interactionTypes: ['scheme'],
    cooldownDays: 2,
    weight: 1.0
  },

  // BuildAlliance + All Topics for Scheme
  {
    choiceId: 'SCHEME_BUILD_ALLY_STRATEGY_SINCERE_1',
    textVariants: [
      'Secret alliance? Nobody else needs to know.',
      'Let\'s work together behind the scenes.',
      'I need someone I can really trust. You interested?'
    ],
    intent: 'BuildAlliance',
    tone: 'Sincere',
    topics: ['Strategy', 'Game'],
    targetType: 'Person',
    interactionTypes: ['scheme'],
    cooldownDays: 3,
    weight: 1.0
  },

  // RevealSecret + All Topics for Scheme
  {
    choiceId: 'SCHEME_REVEAL_EVICTION_SINCERE_1',
    textVariants: [
      'I know who\'s really going home. Want in?',
      'The vote isn\'t what everyone thinks.',
      'I have inside information about tonight.'
    ],
    intent: 'RevealSecret',
    tone: 'Sincere',
    topics: ['Eviction', 'Strategy'],
    targetType: 'Person',
    interactionTypes: ['scheme'],
    cooldownDays: 5,
    weight: 1.0
  },

  // Insult + All Topics for Scheme  
  {
    choiceId: 'SCHEME_INSULT_STRATEGY_AGGRESSIVE_1',
    textVariants: [
      '{{target}} is an idiot if they think this will work.',
      'Time to show everyone how pathetic {{target}} really is.',
      '{{target}}\'s strategy is so bad it\'s embarrassing.',
      '{{target}} keeps fumbling basic moves.'
    ],
    intent: 'Insult',
    tone: 'Aggressive',
    topics: ['Strategy', 'Game'],
    targetType: 'Person',
    interactionTypes: ['scheme'],
    cooldownDays: 5,
    weight: 1.0
  },

  // ========== ACTIVITY COMBINATIONS ==========
  
  // BuildAlliance + All Topics for Activity
  {
    choiceId: 'ACTIVITY_BUILD_ALLY_FOOD_PLAYFUL_1',
    textVariants: [
      'This is way more fun with good people.',
      'We should team up for activities more often.',
      'I love our little cooking crew.'
    ],
    intent: 'BuildAlliance',
    tone: 'Playful',
    topics: ['Food'],
    targetType: 'Person',
    interactionTypes: ['activity'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'ACTIVITY_BUILD_ALLY_CHALLENGE_SINCERE_1',
    textVariants: [
      'We work well together in practice.',
      'Want to be workout partners regularly?',
      'I feel like we bring out each other\'s best.'
    ],
    intent: 'BuildAlliance',
    tone: 'Sincere',
    topics: ['Challenge'],
    targetType: 'Person',
    interactionTypes: ['activity'],
    cooldownDays: 1,
    weight: 1.0
  },

  // MakeJoke + All Topics for Activity
  {
    choiceId: 'ACTIVITY_JOKE_FOOD_PLAYFUL_1',
    textVariants: [
      'I think we\'re creating biological weapons in here.',
      'Gordon Ramsay would have a heart attack.',
      'At least we\'re bonding over mutual food crimes.'
    ],
    intent: 'MakeJoke',
    tone: 'Playful',
    topics: ['Food'],
    targetType: 'Group',
    interactionTypes: ['activity'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'ACTIVITY_JOKE_CHALLENGE_PLAYFUL_1',
    textVariants: [
      'If sweating was a sport, we\'d be Olympic champions.',
      'This workout is more dramatic than elimination night.',
      'I\'m training for the "Most Likely to Collapse" award.'
    ],
    intent: 'MakeJoke',
    tone: 'Playful',
    topics: ['Challenge'],
    targetType: 'Group',
    interactionTypes: ['activity'],
    cooldownDays: 1,
    weight: 1.0
  },

  // Flirt + All Topics for Activity
  {
    choiceId: 'ACTIVITY_FLIRT_CHALLENGE_FLIRTY_1',
    textVariants: [
      'You look good sweating. Just saying.',
      'Want me to spot you? I promise to focus.',
      'This workout is getting interesting.'
    ],
    intent: 'Flirt',
    tone: 'Flirty',
    topics: ['Challenge'],
    targetType: 'Person',
    interactionTypes: ['activity'],
    cooldownDays: 2,
    weight: 1.0
  },
  {
    choiceId: 'ACTIVITY_FLIRT_FOOD_FLIRTY_1',
    textVariants: [
      'Cooking together feels domestic. I like it.',
      'You\'re dangerously good at this.',
      'Save some of that for me later?'
    ],
    intent: 'Flirt',
    tone: 'Flirty',
    topics: ['Food'],
    targetType: 'Person',
    interactionTypes: ['activity'],
    cooldownDays: 2,
    weight: 1.0
  },

  // Divert + All Topics for Activity
  {
    choiceId: 'ACTIVITY_DIVERT_PERSONAL_NEUTRAL_1',
    textVariants: [
      'Let\'s focus on this instead of all that drama.',
      'Sometimes you need to do something normal.',
      'Nice to have a break from the game.'
    ],
    intent: 'Divert',
    tone: 'Neutral',
    topics: ['PersonalHistory'],
    targetType: 'Group',
    interactionTypes: ['activity'],
    cooldownDays: 1,
    weight: 1.0
  },

  // BoostMorale + All Topics for Activity
  {
    choiceId: 'ACTIVITY_BOOST_CHALLENGE_SINCERE_1',
    textVariants: [
      'We\'re all getting stronger every day.',
      'This team energy is exactly what we need.',
      'I believe in all of us.'
    ],
    intent: 'BoostMorale',
    tone: 'Sincere',
    topics: ['Challenge'],
    targetType: 'Group',
    interactionTypes: ['activity'],
    cooldownDays: 1,
    weight: 1.0
  },

  // Self-target options across all types
  {
    choiceId: 'ANY_BOOST_SELF_SINCERE_1',
    textVariants: [
      'I need to remember why I came here.',
      'Focus up - this is what I trained for.',
      'Stay true to yourself.'
    ],
    intent: 'BoostMorale',
    tone: 'Sincere',
    topics: ['PersonalHistory', 'Challenge'],
    targetType: 'Self',
    interactionTypes: ['talk', 'dm', 'scheme', 'activity'],
    cooldownDays: 1,
    weight: 1.0
  },

  // ========== QUIRKY/UNUSUAL COMBINATIONS ==========
  
  // Flirt + Production (meta flirting)
  {
    choiceId: 'TALK_FLIRT_PRODUCTION_PLAYFUL_1',
    textVariants: [
      'Are we giving the cameras a good show?',
      'I hope production is enjoying our chemistry.',
      'Think we\'re getting a romance edit?'
    ],
    intent: 'Flirt',
    tone: 'Playful',
    topics: ['Production', 'Romance'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 3,
    weight: 1.0
  },

  // Insult + Food (roasting cooking)
  {
    choiceId: 'TALK_INSULT_FOOD_SARCASTIC_1',
    textVariants: [
      'Did you learn to cook from a disaster documentary?',
      'That\'s not food, that\'s a cry for help.',
      'I\'ve seen better meals in prison movies.'
    ],
    intent: 'Insult',
    tone: 'Sarcastic',
    topics: ['Food'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 3,
    weight: 1.0
  },

  // RevealSecret + Sleep (midnight confessions)
  {
    choiceId: 'DM_REVEAL_SLEEP_SINCERE_1',
    textVariants: [
      'Can\'t sleep. Need to tell someone the truth.',
      '3 AM confessions hit different.',
      'Midnight thoughts are always the most honest.'
    ],
    intent: 'RevealSecret',
    tone: 'Sincere',
    topics: ['Sleep', 'PersonalHistory'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 4,
    weight: 1.0
  },

  // SowDoubt + Food (suspicious about eating habits)
  {
    choiceId: 'SCHEME_SOW_DOUBT_FOOD_DISMISSIVE_1',
    textVariants: [
      'Notice how {{target}} always eats alone?',
      'Weird how {{target}} hoards food but acts generous.',
      'Food behavior reveals true character.',
      '{{target}}\'s kitchen behavior is telling.'
    ],
    intent: 'SowDoubt',
    tone: 'Dismissive',
    topics: ['Food'],
    targetType: 'Person',
    interactionTypes: ['scheme'],
    cooldownDays: 4,
    weight: 1.0
  },

  // Deflect + Romance (avoiding relationship talk)
  {
    choiceId: 'TALK_DEFLECT_ROMANCE_APOLOGETIC_1',
    textVariants: [
      'Can we not talk about relationship stuff right now?',
      'I\'m not ready for that conversation.',
      'Let\'s keep things simple between us.'
    ],
    intent: 'Deflect',
    tone: 'Apologetic',
    topics: ['Romance'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 2,
    weight: 1.0
  },

  // ================= NEW: Stronger public deflections =================
  {
    choiceId: 'TALK_DEFLECT_PUBLIC_STRONG_NEUTRAL_1',
    textVariants: [
      'Not in public. If you want to talk votes, do it properly.',
      'I won’t entertain paranoia in front of everyone.',
      'Table it. Public chaos helps no one.'
    ],
    personaVariants: {
      Hero: [
        'Let’s not stir things in front of everyone. We can talk later.',
        'Respect the room—handle vote talk privately.',
      ],
      Villain: [
        'Not giving the cameras a meltdown. Take it offline.',
        'Save the theatrics. If you have something real, bring it in private.',
      ]
    },
    intent: 'Deflect',
    tone: 'Dismissive',
    topics: ['Production', 'Game'],
    targetType: 'Group',
    interactionTypes: ['talk'],
    cooldownDays: 2,
    weight: 1.0
  },

  // ================= NEW: Alliance trust tests =================
  {
    choiceId: 'TALK_TEST_ALLIANCE_LOYALTY_SINCERE_1',
    textVariants: [
      'If we’re solid, you’ll hear a name from me and keep it quiet.',
      'I need to know you won’t repeat this. Can you handle that?',
      'I’ll give you a piece—don’t let it travel.'
    ],
    personaVariants: {
      Hero: [
        'I’m trusting you with this. Please keep it contained.',
        'This stays between us. I believe you’ll protect it.',
      ],
      Villain: [
        'I leak to see who talks. Don’t make me test you.',
        'Prove you’re useful—hold this and don’t flinch.',
      ]
    },
    intent: 'ProbeForInfo',
    tone: 'Sincere',
    topics: ['Strategy', 'Game'],
    targetType: 'Person',
    interactionTypes: ['talk', 'dm'],
    cooldownDays: 3,
    weight: 1.0
  },

  // ================= NEW: Ultimatum schemes =================
  {
    choiceId: 'SCHEME_ULTIMATUM_BLOCK_AGGRESSIVE_1',
    textVariants: [
      'Pick a side now or I assume you’re against me.',
      'You’re either with us tonight or you’re a number for them.',
      'No more neutral—commit or be treated like opposition.'
    ],
    personaVariants: {
      Hero: [
        'We need clarity. If you’re with us, show it tonight.',
        'I won’t bully you, but I need a real commitment.',
      ],
      Villain: [
        'Choose now. Waver and I’ll make sure it costs you.',
        'Fence-sitters get burned. Decide.',
      ]
    },
    intent: 'SowDoubt',
    tone: 'Aggressive',
    topics: ['Strategy', 'Eviction'],
    targetType: 'Person',
    interactionTypes: ['scheme'],
    cooldownDays: 5,
    weight: 1.0
  },
  {
    choiceId: 'SCHEME_ULTIMATUM_COUNTERMOVE_AGGRESSIVE_1',
    textVariants: [
      'If they move on me, I move on them. Pass that along.',
      'You can stop a war or start one. Your call.',
      'Try me and see how loud it gets.'
    ],
    personaVariants: {
      Hero: [
        'I’ll defend myself, but I’d rather we avoid escalation.',
        'I prefer peace. Don’t force me to play messy.',
      ],
      Villain: [
        'Push me and I’ll set the house on fire—socially.',
        'Make it ugly and I’ll make it unforgettable.',
      ]
    },
    intent: 'SowDoubt',
    tone: 'Aggressive',
    topics: ['Strategy', 'Rumor'],
    targetType: 'Person',
    interactionTypes: ['scheme'],
    cooldownDays: 5,
    weight: 1.0
  },

  // ================= NEW: Hard strategic moves (public pressure) =================
  {
    choiceId: 'TALK_PRESSURE_PUBLIC_STRATEGY_NEUTRAL_1',
    textVariants: [
      'Numbers matter: say who you’re voting now.',
      'We’re clarifying the vote. Name your target.',
      'No smoke—state your plan.'
    ],
    personaVariants: {
      Hero: [
        'Let’s align on facts. Who are you voting?',
        'We need transparency to avoid chaos—who’s your vote?',
      ],
      Villain: [
        'Stop hiding. Say your target now.',
        'If you’re scared to show your vote, we’ll remember.',
      ]
    },
    intent: 'ProbeForInfo',
    tone: 'Neutral',
    topics: ['Game', 'Eviction'],
    targetType: 'Group',
    interactionTypes: ['talk'],
    cooldownDays: 3,
    weight: 1.0
  },

  // ================= EXPLICIT: Ask Vote (direct, minimal fluff) =================
  {
    choiceId: 'TALK_ASK_VOTE_DIRECT_NEUTRAL_1',
    textVariants: [
      'Who are you voting tonight?',
      'Be straight—who’s your vote?',
      'Name your target for me.'
    ],
    intent: 'AskVote',
    tone: 'Neutral',
    topics: ['Eviction', 'Strategy'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'DM_ASK_VOTE_DIRECT_NEUTRAL_1',
    textVariants: [
      'Privately—who are you voting tonight?',
      'No games: who’s your vote?',
      'I need a clean answer. Name your target.'
    ],
    intent: 'AskVote',
    tone: 'Neutral',
    topics: ['Eviction', 'Strategy'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 1,
    weight: 1.0
  },

  // ================= PRESSURE VARIANTS: Ask Vote with a pitch =================
  {
    choiceId: 'TALK_ASK_VOTE_PRESSURE_STRATEGY_NEUTRAL_1',
    textVariants: [
      'I need you on {{pitch}} tonight. Can you commit?',
      'Numbers line up if we take out {{pitch}}. Be straight—are you in?',
      'This week should be {{pitch}}. Name it with me.'
    ],
    intent: 'AskVote',
    tone: 'Neutral',
    topics: ['Eviction', 'Strategy'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 2,
    weight: 1.0
  },
  {
    choiceId: 'DM_ASK_VOTE_PRESSURE_STRATEGY_NEUTRAL_1',
    textVariants: [
      'Quietly: lock {{pitch}} with me.',
      'We move clean if you vote {{pitch}}. Can I count on you?',
      'No leaks—commit to {{pitch}} tonight and I’ll protect you.'
    ],
    intent: 'AskVote',
    tone: 'Neutral',
    topics: ['Eviction', 'Strategy'],
    targetType: 'Person',
    interactionTypes: ['dm'],
    cooldownDays: 2,
    weight: 1.0
  }
];
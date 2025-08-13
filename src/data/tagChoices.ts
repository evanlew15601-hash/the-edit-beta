import { Choice } from '@/types/tagDialogue';

export const TAG_CHOICES: Choice[] = [
  {
    choiceId: 'C_BUILD_ALLY_CHALLENGE_SINC_1',
    textVariants: [
      'I think we should team up for the next challenge.',
      'Want to pair up on the next one? We complement each other.'
    ],
    intent: 'BuildAlliance',
    tone: 'Sincere',
    topics: ['Challenge','Strategy'],
    targetType: 'Person',
    interactionTypes: ['talk','dm'],
    visibilityRules: { minTrust: -100 },
    cooldownDays: 2,
    weight: 1.0
  },
  {
    choiceId: 'C_PROBE_INFO_GAME_NEUTRAL_1',
    textVariants: [
      'What are you hearing about the vote?',
      'Any whispers on where the votes are landing?'
    ],
    intent: 'ProbeForInfo',
    tone: 'Neutral',
    topics: ['Game','Rumor','Eviction'],
    targetType: 'Person',
    interactionTypes: ['talk','dm'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'C_SOW_DOUBT_RUMOR_SARCASTIC_1',
    textVariants: [
      "Funny how Alex is suddenly everyone's best friend.",
      'Wild that Alex found time to charm the whole house overnight.'
    ],
    intent: 'SowDoubt',
    tone: 'Sarcastic',
    topics: ['Rumor','Game'],
    targetType: 'Person',
    interactionTypes: ['talk','dm'],
    cooldownDays: 3,
    weight: 1.0
  },
  {
    choiceId: 'C_BOOST_MORALE_CHALLENGE_PLAYFUL_1',
    textVariants: [
      "Shake it off—we're due a win.",
      "Next challenge is ours. Let's make it fun."
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
    choiceId: 'C_FLIRT_ROMANCE_FLIRTY_1',
    textVariants: [
      'You look dangerous in a good way today.',
      'Careful, you might be distracting me—on purpose.'
    ],
    intent: 'Flirt',
    tone: 'Flirty',
    topics: ['Romance'],
    targetType: 'Person',
    interactionTypes: ['talk','dm'],
    cooldownDays: 2,
    weight: 1.0
  },
  {
    choiceId: 'C_INSULT_GAME_AGGRESSIVE_1',
    textVariants: [
      "If that's your plan, you won't last a week.",
      'That move screams amateur hour.'
    ],
    intent: 'Insult',
    tone: 'Aggressive',
    topics: ['Game','Strategy'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 4,
    weight: 1.0
  },
  {
    choiceId: 'C_MAKE_JOKE_FOOD_PLAYFUL_1',
    textVariants: [
      'If this kitchen had a Michelin star, it fell off the plate.',
      'This stew is plotting against us.'
    ],
    intent: 'MakeJoke',
    tone: 'Playful',
    topics: ['Food'],
    targetType: 'Group',
    interactionTypes: ['talk','activity'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'C_REVEAL_SECRET_PERSONAL_SINC_1',
    textVariants: [
      "I shouldn't say this, but I will—I've got your back if you have mine.",
      "Low key: I covered for you earlier. Don't waste it."
    ],
    intent: 'RevealSecret',
    tone: 'Sincere',
    topics: ['PersonalHistory','Game'],
    targetType: 'Person',
    interactionTypes: ['dm','talk'],
    cooldownDays: 5,
    weight: 1.0
  },
  {
    choiceId: 'C_DEFLECT_PRODUCTION_DISMISSIVE_1',
    textVariants: [
      'Producers love paranoia—let them starve.',
      "I'm not feeding the cameras today."
    ],
    intent: 'Deflect',
    tone: 'Dismissive',
    topics: ['Production','Game'],
    targetType: 'Person',
    interactionTypes: ['talk','dm'],
    cooldownDays: 2,
    weight: 1.0
  },
  // Sleep & Personal combos
  {
    choiceId: 'C_BUILD_ALLY_SLEEP_SINCERE_1',
    textVariants: [
      "Can't sleep either? Wanna chat quietly?",
      "Mind if I join you? My head's too noisy to sleep."
    ],
    intent: 'BuildAlliance',
    tone: 'Sincere',
    topics: ['Sleep','PersonalHistory'],
    targetType: 'Person',
    interactionTypes: ['talk','dm'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'C_PROBE_SLEEP_NEUTRAL_1',
    textVariants: [
      'Been having weird dreams about the vote?',
      'Sleep talking reveals so much around here.'
    ],
    intent: 'ProbeForInfo',
    tone: 'Neutral',
    topics: ['Sleep','Rumor'],
    targetType: 'Person',
    interactionTypes: ['talk','dm'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'C_FLIRT_SLEEP_FLIRTY_1',
    textVariants: [
      'Hard to sleep when someone interesting is still awake.',
      'Late night energy hits different with the right company.'
    ],
    intent: 'Flirt',
    tone: 'Flirty',
    topics: ['Sleep','Romance'],
    targetType: 'Person',
    interactionTypes: ['talk','dm'],
    cooldownDays: 2,
    weight: 1.0
  },
  // Group targets
  {
    choiceId: 'C_BOOST_MORALE_GROUP_PLAYFUL_1',
    textVariants: [
      'Alright everyone, group huddle! We got this.',
      'Pep talk time - who needs some positive vibes?'
    ],
    intent: 'BoostMorale',
    tone: 'Playful',
    topics: ['Challenge','Game'],
    targetType: 'Group',
    interactionTypes: ['talk','activity'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'C_MAKE_JOKE_GROUP_PLAYFUL_1',
    textVariants: [
      'Did everyone else hear that production meeting through the walls?',
      'Plot twist: the real treasure was the enemies we made along the way.'
    ],
    intent: 'MakeJoke',
    tone: 'Playful',
    topics: ['Production','Game'],
    targetType: 'Group',
    interactionTypes: ['talk','activity'],
    cooldownDays: 1,
    weight: 1.0
  },
  // Scheme interactions
  {
    choiceId: 'C_SOW_DOUBT_SCHEME_SARCASTIC_1',
    textVariants: [
      'Heard Alex making rounds to everyone but us.',
      'Funny how Alex suddenly cares about everyone\'s feelings.'
    ],
    intent: 'SowDoubt',
    tone: 'Sarcastic',
    topics: ['Strategy','Rumor'],
    targetType: 'Person',
    interactionTypes: ['scheme','dm'],
    cooldownDays: 3,
    weight: 1.0
  },
  {
    choiceId: 'C_REVEAL_SECRET_SCHEME_SINCERE_1',
    textVariants: [
      'I need you to know something nobody else does.',
      'Between us - I saw something that changes everything.'
    ],
    intent: 'RevealSecret',
    tone: 'Sincere',
    topics: ['Strategy','Game'],
    targetType: 'Person',
    interactionTypes: ['scheme','dm'],
    cooldownDays: 5,
    weight: 1.0
  },
  // Odd/quirky combos  
  {
    choiceId: 'C_FLIRT_FOOD_FLIRTY_1',
    textVariants: [
      'You make that sandwich look way better than it should.',
      'Save room for dessert? I might have something sweet later.'
    ],
    intent: 'Flirt',
    tone: 'Flirty',
    topics: ['Food','Romance'],
    targetType: 'Person',
    interactionTypes: ['talk','activity'],
    cooldownDays: 2,
    weight: 1.0
  },
  {
    choiceId: 'C_INSULT_ROMANCE_AGGRESSIVE_1',
    textVariants: [
      'Your flirting strategy is as transparent as glass.',
      'That charm offensive is falling flat with everyone.'
    ],
    intent: 'Insult',
    tone: 'Aggressive',
    topics: ['Romance','Strategy'],
    targetType: 'Person',
    interactionTypes: ['talk'],
    cooldownDays: 4,
    weight: 1.0
  },
  {
    choiceId: 'C_MAKE_JOKE_EVICTION_DISMISSIVE_1',
    textVariants: [
      'At least the exit interviews will be more entertaining than the challenges.',
      'Another one bites the dust - cue the dramatic music.'
    ],
    intent: 'MakeJoke',
    tone: 'Dismissive',
    topics: ['Eviction','Production'],
    targetType: 'Group',
    interactionTypes: ['talk','activity'],
    cooldownDays: 2,
    weight: 1.0
  },
  // Self-target options  
  {
    choiceId: 'C_BOOST_MORALE_SELF_SINCERE_1',
    textVariants: [
      'I need to remember why I came here.',
      'Focus up - this is what I trained for.'
    ],
    intent: 'BoostMorale',
    tone: 'Sincere',
    topics: ['PersonalHistory','Challenge'],
    targetType: 'Self',
    interactionTypes: ['activity'],
    cooldownDays: 1,
    weight: 1.0
  },
  // More eviction combos
  {
    choiceId: 'C_PROBE_EVICTION_NEUTRAL_1',
    textVariants: [
      'Any last-minute vote swings happening?',
      'The house feels different before eliminations.'
    ],
    intent: 'ProbeForInfo',
    tone: 'Neutral',
    topics: ['Eviction','Strategy'],
    targetType: 'Person',
    interactionTypes: ['talk','dm'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'C_DEFLECT_EVICTION_APOLOGETIC_1',
    textVariants: [
      'Sorry, but I can\'t get pulled into this vote talk.',
      'I feel bad, but I have to stay neutral right now.'
    ],
    intent: 'Deflect',
    tone: 'Apologetic',
    topics: ['Eviction','Game'],
    targetType: 'Person',
    interactionTypes: ['talk','dm'],
    cooldownDays: 1,
    weight: 1.0
  },
  // Activity-specific choices
  {
    choiceId: 'C_BUILD_ALLY_ACTIVITY_PLAYFUL_1',
    textVariants: [
      'This is way more fun with good people.',
      'We should team up for activities more often.'
    ],
    intent: 'BuildAlliance',
    tone: 'Playful',
    topics: ['Challenge','Food'],
    targetType: 'Person',
    interactionTypes: ['activity'],
    cooldownDays: 1,
    weight: 1.0
  },
  {
    choiceId: 'C_DIVERT_ACTIVITY_NEUTRAL_1',
    textVariants: [
      'Let\'s focus on this instead of all that drama.',
      'Sometimes you just need to do something normal.'
    ],
    intent: 'Divert',
    tone: 'Neutral',
    topics: ['Food','PersonalHistory'],
    targetType: 'Group',
    interactionTypes: ['activity'],
    cooldownDays: 1,
    weight: 1.0
  }
];

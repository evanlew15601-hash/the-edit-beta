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
  }
];

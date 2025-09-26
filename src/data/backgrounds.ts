export const PRESET_BACKGROUNDS = [
  'College Athlete',
  'Startup Founder',
  'School Teacher',
  'Bartender',
  'ER Nurse',
  'Law Student',
  'Podcaster',
  'Ex-Pro Gamer',
  'Content Creator',
  'Blue-Collar Worker',
  'Fitness Trainer',
  'Real Estate Agent',
  'Data Analyst',
  'Musician',
  'Chef',
  'Other',
] as const;

export type PresetBackground = typeof PRESET_BACKGROUNDS[number];

export interface BackgroundPresetMeta {
  name: PresetBackground;
  personaHint: string;
  statBias?: Partial<Record<'social' | 'strategy' | 'physical' | 'deception', number>>;
}

export const BACKGROUND_META: BackgroundPresetMeta[] = [
  { name: 'College Athlete', personaHint: 'Competitor with team-first energy', statBias: { physical: 20, social: 5 } },
  { name: 'Startup Founder', personaHint: 'Strategic and persuasive', statBias: { strategy: 20, social: 10 } },
  { name: 'School Teacher', personaHint: 'Patient and observant', statBias: { social: 15, strategy: 5 } },
  { name: 'Bartender', personaHint: 'Social connector who reads the room', statBias: { social: 20, deception: 5 } },
  { name: 'ER Nurse', personaHint: 'Calm under pressure', statBias: { strategy: 10, physical: 10 } },
  { name: 'Law Student', personaHint: 'Argumentative and detail-oriented', statBias: { strategy: 15, deception: 10 } },
  { name: 'Podcaster', personaHint: 'Storyteller with audience awareness', statBias: { social: 15 } },
  { name: 'Ex-Pro Gamer', personaHint: 'Calm planner, clutch performer', statBias: { strategy: 10, physical: 10 } },
  { name: 'Content Creator', personaHint: 'Entertaining and performative', statBias: { social: 10, deception: 5 } },
  { name: 'Blue-Collar Worker', personaHint: 'Hard-working and resilient', statBias: { physical: 10, social: 5 } },
  { name: 'Fitness Trainer', personaHint: 'Disciplined and competitive', statBias: { physical: 20 } },
  { name: 'Real Estate Agent', personaHint: 'Negotiator and networker', statBias: { social: 15, strategy: 5 } },
  { name: 'Data Analyst', personaHint: 'Analytical and composed', statBias: { strategy: 20 } },
  { name: 'Musician', personaHint: 'Creative and charismatic', statBias: { social: 10 } },
  { name: 'Chef', personaHint: 'Leader in high-pressure environments', statBias: { physical: 5, strategy: 10 } },
  { name: 'Other', personaHint: 'Custom background', statBias: {} },
];

export type SpecialKind = 'none' | 'hosts_estranged_child' | 'planted_houseguest';

export interface SpecialLogicDescription {
  kind: SpecialKind;
  summary: string;
  triggers: string[]; // game events that may affect reveal
  consequences: string[]; // what happens if revealed or tasks fail
}

export const SPECIAL_BACKGROUNDS_LOGIC: SpecialLogicDescription[] = [
  {
    kind: 'hosts_estranged_child',
    summary: 'Secret relation to host. If exposed, audience edit swings and house trust shifts.',
    triggers: [
      'Rumor event mentions family ties',
      'Production hint during a twist',
      'Confessional leak memory referencing host',
    ],
    consequences: [
      'Trust -10 from suspicious players; +10 editBias due to storyline',
      'If embraced publicly: potential social boost with empathetic players',
    ],
  },
  {
    kind: 'planted_houseguest',
    summary: 'Receives production tasks. Failure risks secret reveal.',
    triggers: [
      'Weekly task assigned by production',
      'Task failure two days in a row',
      'Confessional leak reveals production interference',
    ],
    consequences: [
      'On failure chain: secretRevealed=true; suspicion spikes from strategic players',
      'On consistent success: subtle editBias boost and influence with chaos-prone NPCs',
    ],
  },
  {
    kind: 'none',
    summary: 'No special twist background.',
    triggers: [],
    consequences: [],
  },
];
import { Contestant, CharacterStats, Background, SpecialBackground } from '@/types/game';
import { BACKGROUND_META, PRESET_BACKGROUNDS } from '@/data/backgrounds';

const STATIC_NPC_NAMES = [
  'Ava', 'Liam', 'Mia', 'Noah', 'Zoe', 'Ethan', 'Isla', 'Lucas', 'Ivy', 'Mason',
  'Ruby', 'Logan', 'Nora', 'Elijah', 'Luna', 'James', 'Maya', 'Oliver', 'Hazel', 'Jack'
];

function baseStats(primary: keyof CharacterStats): CharacterStats {
  const baseline = { social: 50, strategy: 50, physical: 50, deception: 50, primary };
  const boost = 20;
  return {
    ...baseline,
    [primary]: baseline[primary] + boost,
  } as CharacterStats;
}

function biasFromBackground(bg: Background, stats: CharacterStats): CharacterStats {
  const meta = BACKGROUND_META.find(m => m.name === bg);
  if (!meta || !meta.statBias) return stats;
  const next = { ...stats };
  Object.entries(meta.statBias).forEach(([k, v]) => {
    const key = k as keyof CharacterStats;
    next[key] = Math.max(20, Math.min(95, (next[key] || 50) + (v || 0)));
  });
  return next;
}

function randomPersonaFromStats(stats: CharacterStats): string {
  // Simple mapping to publicPersona
  const { social, strategy, physical, deception } = stats;
  const max = Math.max(social, strategy, physical, deception);
  if (max === social) return 'Social Butterfly';
  if (max === strategy) return 'Strategic Player';
  if (max === physical) return 'Competitor';
  return 'Wildcard';
}

export interface NPCGenOptions {
  count: number;
  excludeNames?: string[];
}

export function generateStaticNPCs(opts: NPCGenOptions): Contestant[] {
  const taken = new Set(opts.excludeNames || []);
  const names = STATIC_NPC_NAMES.filter(n => !taken.has(n)).slice(0, opts.count);
  const result: Contestant[] = [];

  names.forEach((name, idx) => {
    const id = `npc_${name.toLowerCase()}`;
    const age = 21 + Math.floor(Math.random() * 19);
    const bg = PRESET_BACKGROUNDS[Math.floor(Math.random() * (PRESET_BACKGROUNDS.length - 1))] as Background; // avoid 'Other'
    const primaryPool = ['social', 'strategy', 'physical', 'deception'] as const;
    const primary = primaryPool[idx % primaryPool.length];

    const stats = biasFromBackground(bg, baseStats(primary));
    const publicPersona = randomPersonaFromStats(stats);

    const special: SpecialBackground = { kind: 'none' };

    result.push({
      id,
      name,
      age,
      background: bg,
      stats,
      special,
      publicPersona,
      psychProfile: {
        disposition: ['neutral'],
        trustLevel: Math.floor(Math.random() * 40) + 30,
        suspicionLevel: Math.floor(Math.random() * 40) + 20,
        emotionalCloseness: Math.floor(Math.random() * 40) + 20,
        editBias: 0,
      },
      memory: [],
      isEliminated: false,
    });
  });

  return result;
}
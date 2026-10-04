import type { Alliance, Contestant, GameState } from '@/types/game';

export type CycleBeat = 'villa' | 'challenge' | 'nominations' | 'production' | 'vote';

export interface CycleRead {
  beat: CycleBeat;
  label: string;
  daysToVote: number;
  brief: string;
}

export interface ThreatRead {
  name: string;
  score: number;
  reason: string;
  immune: boolean;
  inYourBloc: boolean;
}

export interface BlocRead {
  id: string;
  name: string;
  members: string[];
  strength: number;
  secret: boolean;
  yours: boolean;
  note: string;
}

export interface BondRead {
  names: [string, string];
  kind: 'showmance' | 'pair';
  strength: number;
  note: string;
}

export interface SitDownOption {
  id: 'game' | 'heart' | 'villain';
  label: string;
  line: string;
  tone: string;
  effect: string;
}

const BEATS: { id: CycleBeat; label: string }[] = [
  { id: 'villa', label: 'Villa' },
  { id: 'challenge', label: 'Head of House' },
  { id: 'nominations', label: 'Nominations' },
  { id: 'production', label: 'Veto' },
  { id: 'vote', label: 'Eviction' },
];

export function cycleBeats() {
  return BEATS;
}

export function readCycle(state: Pick<GameState, 'currentDay' | 'nextEliminationDay' | 'immunityWinner'>): CycleRead {
  const daysToVote = Math.max(0, (state.nextEliminationDay || state.currentDay) - state.currentDay);
  if (daysToVote <= 0) {
    return {
      beat: 'vote',
      label: 'Vote',
      daysToVote,
      brief: 'The house votes tonight. A pitch this late only lands if the bloc already agreed.',
    };
  }
  if (state.immunityWinner && daysToVote === 1) {
    return {
      beat: 'production',
      label: 'Production',
      daysToVote,
      brief: 'Veto is the last pull. Then the cycle format decides it: house vote, public vote, or an elim duel.',
    };
  }
  if (daysToVote === 1) {
    return {
      beat: 'nominations',
      label: 'Nominations',
      daysToVote,
      brief: 'Names are about to stick. The Head of House nominates. Veto can still pull one off before the eviction.',
    };
  }
  if (daysToVote === 2) {
    return {
      beat: 'challenge',
      label: 'Challenge',
      daysToVote,
      brief: 'Head of House is still open. The winner is safe and names the nominees. A loss means you need a bloc, not a speech.',
    };
  }
  return {
    beat: 'villa',
    label: 'Villa',
    daysToVote,
    brief: 'Life before the challenge. Build one real bond. Big moves this early get you nominated.',
  };
}

function allianceNote(size: number, house: number): string {
  if (house > 0 && size >= Math.ceil(house / 2)) {
    return 'Majority. They run the week until they have to eat each other.';
  }
  if (size >= 4) return 'Large enough to swing a vote if they hold.';
  if (size === 2) return 'A pair. Treat it like a showmance: loyal, and obvious.';
  return 'A pocket. Useful, not a majority.';
}

export function readBlocs(state: Pick<GameState, 'alliances' | 'playerName' | 'contestants'>): BlocRead[] {
  const house = state.contestants.filter(c => !c.isEliminated).length;
  return (state.alliances || [])
    .filter(a => !a.dissolved)
    .map((a: Alliance) => ({
      id: a.id,
      name: a.name || 'Unnamed bloc',
      members: a.members,
      strength: a.strength,
      secret: a.secret,
      yours: a.members.includes(state.playerName),
      note: allianceNote(a.members.length, house),
    }))
    .sort((a, b) => b.members.length - a.members.length || b.strength - a.strength);
}

export function readBonds(state: Pick<GameState, 'alliances' | 'contestants' | 'playerName'>): BondRead[] {
  const bonds: BondRead[] = [];
  for (const alliance of state.alliances || []) {
    if (alliance.dissolved || alliance.members.length !== 2) continue;
    bonds.push({
      names: [alliance.members[0], alliance.members[1]],
      kind: alliance.strength >= 70 ? 'showmance' : 'pair',
      strength: alliance.strength,
      note: alliance.strength >= 70
        ? 'Locked pair. They vote together until one of them is on the block.'
        : 'Working pair. Not a showmance yet.',
    });
  }

  const closest = [...state.contestants]
    .filter(c => !c.isEliminated && c.name !== state.playerName)
    .sort((a, b) => (b.psychProfile.emotionalCloseness || 0) - (a.psychProfile.emotionalCloseness || 0))[0];
  if (closest && (closest.psychProfile.emotionalCloseness || 0) >= 55) {
    const already = bonds.some(b => b.names.includes(state.playerName) && b.names.includes(closest.name));
    if (!already) {
      bonds.unshift({
        names: [state.playerName, closest.name],
        kind: 'showmance',
        strength: closest.psychProfile.emotionalCloseness,
        note: 'Your closest bond. They will cover you — and they make you a pair target.',
      });
    }
  }
  return bonds.slice(0, 4);
}

export function readThreats(state: Pick<GameState, 'contestants' | 'alliances' | 'playerName' | 'immunityWinner'>): ThreatRead[] {
  const live = state.contestants.filter(c => !c.isEliminated);
  const blocs = (state.alliances || []).filter(a => !a.dissolved);
  const yours = new Set(blocs.filter(a => a.members.includes(state.playerName)).flatMap(a => a.members));

  return live
    .map((c: Contestant) => {
      const stats = c.stats || { social: 50, strategy: 50, physical: 50, deception: 40 };
      const bloc = blocs.find(a => a.members.includes(c.name));
      const blocBonus = bloc ? Math.min(18, bloc.members.length * 4) : 0;
      const score = Math.round(
        stats.physical * 0.34 +
        stats.strategy * 0.34 +
        stats.social * 0.2 +
        stats.deception * 0.12 +
        blocBonus
      );
      const immune = c.name === state.immunityWinner;
      const reasons = [];
      if (stats.physical >= 70) reasons.push('challenge threat');
      if (stats.strategy >= 70) reasons.push('strategic');
      if (bloc && bloc.members.length >= 3) reasons.push(`in a ${bloc.members.length}`);
      if (!reasons.length) reasons.push(c.publicPersona || 'quiet');
      return {
        name: c.name,
        score: immune ? 0 : Math.max(0, Math.min(100, score)),
        reason: immune ? 'Immune this cycle' : reasons.join(' · '),
        immune,
        inYourBloc: yours.has(c.name),
      };
    })
    .sort((a, b) => Number(a.immune) - Number(b.immune) || b.score - a.score);
}

export function recommendedMove(state: GameState, cycle: CycleRead, blocs: BlocRead[], threats: ThreatRead[]): string {
  const yours = blocs.find(b => b.yours);
  const house = state.contestants.filter(c => !c.isEliminated).length;
  const top = threats.find(t => !t.immune && t.name !== state.playerName && !t.inYourBloc);

  if (cycle.beat === 'villa') {
    return yours
      ? `Stay with ${yours.name}. One real conversation beats a scheme this early.`
      : 'No bloc yet. Talk, do not pitch. A pair is enough until the first vote.';
  }
  if (cycle.beat === 'challenge') {
    return state.immunityWinner
      ? `${state.immunityWinner} has safety. Do not spend the day relitigating the challenge.`
      : 'Win safety or know who will. If you cannot win it, be the person the winner needs.';
  }
  if (cycle.beat === 'nominations' || cycle.beat === 'production') {
    if (yours && house > 0 && yours.members.length >= Math.ceil(house / 2)) {
      return 'Your bloc has the numbers. Pick a name and stop shopping the vote.';
    }
    return top
      ? `Numbers are forming around ${top.name}. Confirm it in private before you scheme.`
      : 'Ask one person where the vote is. Do not invent a target.';
  }
  return top
    ? `Vote is live. If the bloc is not on ${top.name}, you are the one flipping.`
    : 'Vote with the numbers you actually have. A solo hero vote is a confessional, not a plan.';
}

export function sitDownOptions(): SitDownOption[] {
  return [
    {
      id: 'game',
      label: 'Play it straight',
      line: 'I am here to play a clean game. I will tell you who I trust and why, and I will not invent a villain edit.',
      tone: 'strategic',
      effect: 'Strategy read. Steadier approval, less screen time.',
    },
    {
      id: 'heart',
      label: 'Give them the bond',
      line: 'The person I am closest to in here is the reason I am still playing. That is the story, not the vote.',
      tone: 'vulnerable',
      effect: 'Heart edit. Ratings like it. You become a pair.',
    },
    {
      id: 'villain',
      label: 'Feed the villain cut',
      line: 'If they want a villain, I will give them one. I know who is running this house and I am fine being the one who says it.',
      tone: 'aggressive',
      effect: 'Villain edit. Screen time up, trust down.',
    },
  ];
}

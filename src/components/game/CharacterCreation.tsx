import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { BACKGROUND_META, PRESET_BACKGROUNDS } from '@/data/backgrounds';
import { CharacterStats, Contestant, Background, SpecialBackground, StatInclination } from '@/types/game';
interface CharacterCreationProps {
  onCreate: (player: Contestant) => void;
}
const STAT_OPTIONS: {
  key: StatInclination;
  label: string;
  hint: string;
}[] = [{
  key: 'social',
  label: 'Social',
  hint: 'Excel in relationships and persuasion'
}, {
  key: 'strategy',
  label: 'Strategy',
  hint: 'Excel in planning and reading the game'
}, {
  key: 'physical',
  label: 'Physical',
  hint: 'Excel in competitions and endurance'
}, {
  key: 'deception',
  label: 'Deception',
  hint: 'Excel in lies, misdirection, and bluffing'
}];
export function CharacterCreation({
  onCreate
}: CharacterCreationProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [background, setBackground] = useState<Background>('College Athlete');
  const [customBackgroundText, setCustomBackgroundText] = useState('');
  const [inclination, setInclination] = useState<StatInclination>('social');
  const [specialKind, setSpecialKind] = useState<'none' | 'hosts_estranged_child' | 'planted_houseguest'>('none');
  const statBase = useMemo<CharacterStats>(() => {
    const base = {
      social: 50,
      strategy: 50,
      physical: 50,
      deception: 50,
      primary: inclination
    };
    base[inclination] += 20;
    return base;
  }, [inclination]);
  const statBiased = useMemo<CharacterStats>(() => {
    const meta = BACKGROUND_META.find(m => m.name === background);
    const next = {
      ...statBase
    };
    if (meta?.statBias) {
      Object.entries(meta.statBias).forEach(([key, boost]) => {
        const k = key as keyof CharacterStats;
        if (k !== 'primary' && typeof boost === 'number') {
          next[k] = Math.max(20, Math.min(95, ((next[k] as number) || 50) + boost));
        }
      });
    }
    return next;
  }, [statBase, background]);
  const personaHint = useMemo(() => {
    const meta = BACKGROUND_META.find(m => m.name === background);
    return meta?.personaHint || 'Custom background';
  }, [background]);
  const special: SpecialBackground = useMemo(() => {
    if (specialKind === 'none') return {
      kind: 'none'
    };
    if (specialKind === 'hosts_estranged_child') {
      return {
        kind: 'hosts_estranged_child',
        revealed: false
      };
    }
    return {
      kind: 'planted_houseguest',
      tasks: [{
        id: 'p1',
        description: 'Secretly influence the weekly target',
        dayAssigned: 2,
        difficulty: 'medium',
        objective: { kind: 'scheme_pitch', count: 2 },
        target: 2,
        progress: 0,
        completed: false
      }, {
        id: 'p2',
        description: 'Plant a misleading rumor in a group setting',
        dayAssigned: 5,
        difficulty: 'medium',
        objective: { kind: 'talk_count', count: 3, distinct: true },
        target: 3,
        progress: 0,
        completed: false
      }],
      secretRevealed: false,
      contractWeeks: 6,
      contractEndWeek: 6,
      contractEnded: false
    };
  }, [specialKind]);
  const canSubmit = name.trim().length >= 2 && typeof age === 'number' && age >= 18 && age <= 65;
  const handleSubmit = () => {
    if (!canSubmit) return;
    const id = `player_${name.toLowerCase().replace(/\s+/g, '_')}`;
    const persona = statBiased.strategy >= statBiased.social && statBiased.strategy >= statBiased.physical && statBiased.strategy >= statBiased.deception ? 'Strategic Player' : statBiased.social >= statBiased.physical && statBiased.social >= statBiased.deception ? 'Social Butterfly' : statBiased.physical >= statBiased.deception ? 'Competitor' : 'Wildcard';
    const player: Contestant = {
      id,
      name,
      age,
      background,
      customBackgroundText: background === 'Other' ? customBackgroundText : undefined,
      stats: statBiased,
      special,
      publicPersona: persona,
      psychProfile: {
        disposition: ['neutral'],
        trustLevel: 60,
        suspicionLevel: 25,
        emotionalCloseness: 30,
        editBias: 0
      },
      memory: [],
      isEliminated: false
    };
    onCreate(player);
  };
  return <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <Card className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-light">Create Your Character</h1>
            <p className="text-muted-foreground">Simple setup: choose a background and where you excel.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Age</label>
              <Input type="number" min={18} max={65} value={age} onChange={e => setAge(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Age (18-65)" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Preset Background</label>
            <Select value={background} onValueChange={val => setBackground(val as Background)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a background" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_BACKGROUNDS.map(bg => <SelectItem key={bg} value={bg}>
                    {bg}
                  </SelectItem>)}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">Persona hint: {personaHint}</div>
            {background === 'Other' && <div className="mt-2">
                <Textarea value={customBackgroundText} onChange={e => setCustomBackgroundText(e.target.value)} placeholder="Describe your background" />
              </div>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Stat Inclination</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {STAT_OPTIONS.map(opt => <Button key={opt.key} variant={inclination === opt.key ? 'action' : 'surveillance'} onClick={() => setInclination(opt.key)} className="h-auto py-3 min-h-[72px]">
                  <div>
                    <div className="font-medium">{opt.label}</div>
                    
                  </div>
                </Button>)}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
              <div>Social: {statBiased.social}</div>
              <div>Strategy: {statBiased.strategy}</div>
              <div>Physical: {statBiased.physical}</div>
              <div>Deception: {statBiased.deception}</div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Special Background (Twist)</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Button variant={specialKind === 'none' ? 'action' : 'surveillance'} onClick={() => setSpecialKind('none')}>
                None
              </Button>
              <Button variant={specialKind === 'hosts_estranged_child' ? 'action' : 'surveillance'} onClick={() => setSpecialKind('hosts_estranged_child')}>
                Host's Estranged Child
              </Button>
              <Button variant={specialKind === 'planted_houseguest' ? 'action' : 'surveillance'} onClick={() => setSpecialKind('planted_houseguest')}>
                Planted Houseguest
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              {specialKind === 'none' && 'Play a normal game without a hidden twist.'}
              {specialKind === 'hosts_estranged_child' && 'Secret relation to host. Risky if exposed; can sway edit and house dynamics.'}
              {specialKind === 'planted_houseguest' && 'Receive tasks from production. Failure risks your secret being revealed.'}
            </div>
          </div>

          <Button variant="action" size="wide" disabled={!canSubmit} onClick={handleSubmit}>
            Start Season
          </Button>
        </Card>
      </div>
    </div>;
}
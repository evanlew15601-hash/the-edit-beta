import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { useGame } from '@/contexts/GameContext';
import { defaultSeasonSetup, SeasonSetup } from '@/types/game';

export const SeasonSetupScreen = () => {
  const { gameState, confirmSeasonSetup, goToTitle } = useGame();
  const [setup, setSetup] = useState<SeasonSetup>(gameState.seasonSetup || defaultSeasonSetup());

  const setTwist = (key: keyof SeasonSetup['twists'], on: boolean) => {
    setSetup(prev => ({ ...prev, twists: { ...prev.twists, [key]: on } }));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Before the house opens</p>
          <h1 className="text-2xl font-medium">Season setup</h1>
          <p className="text-sm text-muted-foreground mt-1">
            One corridor. Cast size, jury, finale, blocs, and which twists can fire. You still play the week the same way after this.
          </p>
        </div>

        <Card className="p-4 space-y-3">
          <label className="block text-sm">
            Cast size ({setup.castSize}, including you)
            <input
              className="mt-1 w-full"
              type="range"
              min={8}
              max={16}
              value={setup.castSize}
              onChange={e => setSetup(prev => ({ ...prev, castSize: Number(e.target.value) }))}
            />
          </label>
          <div className="flex gap-2">
            {[5, 7, 9].map(n => (
              <Button key={n} size="sm" variant={setup.jurySize === n ? 'action' : 'outline'} onClick={() => setSetup(prev => ({ ...prev, jurySize: n }))}>
                {n}-person jury
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={setup.finaleSize === 2 ? 'action' : 'outline'} onClick={() => setSetup(prev => ({ ...prev, finaleSize: 2 }))}>
              Final 2
            </Button>
            <Button size="sm" variant={setup.finaleSize === 3 ? 'action' : 'outline'} onClick={() => setSetup(prev => ({ ...prev, finaleSize: 3 }))}>
              Final 3
            </Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={setup.nomineeCount === 2 ? 'action' : 'outline'} onClick={() => setSetup(prev => ({ ...prev, nomineeCount: 2 }))}>
              2 nominees
            </Button>
            <Button size="sm" variant={setup.nomineeCount === 3 ? 'action' : 'outline'} onClick={() => setSetup(prev => ({ ...prev, nomineeCount: 3 }))}>
              3 nominees
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['mixed', 'house', 'public', 'duel'] as const).map(fmt => (
              <Button key={fmt} size="sm" variant={setup.elimFormat === fmt ? 'action' : 'outline'} onClick={() => setSetup(prev => ({ ...prev, elimFormat: fmt }))}>
                {fmt === 'mixed' ? 'Mixed eviction' : fmt === 'house' ? 'House vote' : fmt === 'public' ? 'Public vote' : 'Elim duel'}
              </Button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={setup.showmances} onChange={e => setSetup(prev => ({ ...prev, showmances: e.target.checked }))} />
            Showmances vote as a pair
          </label>
        </Card>

        <Card className="p-4 space-y-2">
          <h2 className="text-sm font-medium">Blocs</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={setup.preseedAlliances} onChange={e => setSetup(prev => ({ ...prev, preseedAlliances: e.target.checked }))} />
            Seed one house alliance before day 1
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={setup.organicAlliances} onChange={e => setSetup(prev => ({ ...prev, organicAlliances: e.target.checked }))} />
            Let the house form alliances of 3+ on their own
          </label>
        </Card>

        <Card className="p-4 space-y-2">
          <h2 className="text-sm font-medium">Twists that can fire</h2>
          {(
            [
              ['confessional_leak', 'Confessional leak'],
              ['mole_reveal', 'Mole reveal'],
              ['edit_flip', 'Edit flip'],
              ['public_vote', 'Public vote'],
              ['double_elimination', 'Double elimination'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={setup.twists[key]} onChange={e => setTwist(key, e.target.checked)} />
              {label}
            </label>
          ))}
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" onClick={goToTitle}>Back</Button>
          <Button variant="action" onClick={() => confirmSeasonSetup(setup)}>Continue to cast</Button>
        </div>
      </div>
    </div>
  );
};

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { useGame } from '@/contexts/GameContext';

function eligible(gameState: ReturnType<typeof useGame>['gameState']) {
  return gameState.contestants.filter(c => !c.isEliminated && c.name !== gameState.immunityWinner);
}

export const NominationsScreen = () => {
  const { gameState, lockNominations } = useGame();
  const count = gameState.seasonSetup?.nomineeCount || 2;
  const hoh = gameState.immunityWinner;
  const youHold = hoh === gameState.playerName;
  const pool = eligible(gameState);
  const [picked, setPicked] = useState<string[]>([]);

  const toggle = (name: string) => {
    setPicked(prev => prev.includes(name) ? prev.filter(n => n !== name) : prev.length >= count ? prev : [...prev, name]);
  };

  const npcNoms = () => {
    const bloc = (gameState.alliances || []).find(a => a.members.includes(hoh || '') && !a.dissolved);
    return [...pool]
      .sort((a, b) => b.psychProfile.suspicionLevel - a.psychProfile.suspicionLevel)
      .filter(c => !bloc?.members.includes(c.name))
      .slice(0, count)
      .map(c => c.name);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <Card className="p-6 space-y-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">After the challenge</p>
          <h1 className="text-3xl font-light">Nominations</h1>
          <p className="text-sm text-muted-foreground">
            {hoh} won Head of House and is safe. They name {count}. A veto can still pull one off.
          </p>
          {youHold ? (
            <>
              <div className="grid gap-2">
                {pool.map(c => (
                  <Button key={c.name} variant={picked.includes(c.name) ? 'action' : 'outline'} onClick={() => toggle(c.name)}>
                    {c.name}
                  </Button>
                ))}
              </div>
              <Button disabled={picked.length !== count} onClick={() => lockNominations(picked)}>
                Lock {count} nominees
              </Button>
            </>
          ) : (
            <Button onClick={() => lockNominations(npcNoms())}>Hear the nominations</Button>
          )}
        </Card>
      </div>
    </div>
  );
};

export const VetoScreen = () => {
  const { gameState, setVetoHolder, resolveVeto } = useGame();
  const players = gameState.contestants.filter(c => !c.isEliminated);
  const draw = players
    .map(c => ({ name: c.name, score: (c.stats?.physical || 40) + Math.floor(Math.random() * 20) }))
    .sort((a, b) => b.score - a.score);
  const winner = gameState.vetoHolder || draw[0]?.name;
  const noms = gameState.nominees || [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <Card className="p-6 space-y-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Veto</p>
          <h1 className="text-3xl font-light">One name can come off</h1>
          <p className="text-sm text-muted-foreground">
            Nominees: {noms.join(', ') || 'none'}. Format this cycle: {gameState.weekFormat || 'house'}.
          </p>
          {!gameState.vetoHolder && (
            <Button onClick={() => winner && setVetoHolder(winner)}>Play the veto</Button>
          )}
          {gameState.vetoHolder && (
            <>
              <p className="text-sm">{gameState.vetoHolder} holds the veto.</p>
              {gameState.vetoHolder === gameState.playerName ? (
                <div className="grid gap-2">
                  {noms.map(name => (
                    <Button key={name} variant="outline" onClick={() => resolveVeto(name)}>Save {name}</Button>
                  ))}
                  <Button onClick={() => resolveVeto()}>Leave the block</Button>
                </div>
              ) : (
                <Button onClick={() => resolveVeto(noms.find(n => n !== gameState.vetoHolder))}>
                  Watch the veto
                </Button>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/enhanced-button';
import { useGame } from '@/contexts/GameContext';
import {
  cycleBeats,
  readBlocs,
  readBonds,
  readCycle,
  readThreats,
  recommendedMove,
  sitDownOptions,
} from '@/utils/villaStrategy';

export const VillaWeekBoard = () => {
  const { gameState, submitConfessional } = useGame();
  const [sat, setSat] = useState<string | null>(null);
  const cycle = readCycle(gameState);
  const blocs = readBlocs(gameState);
  const bonds = readBonds(gameState);
  const threats = readThreats(gameState).slice(0, 5);
  const move = recommendedMove(gameState, cycle, blocs, threats);
  const alreadySat = (gameState.confessionals || []).some(c => c.day === gameState.currentDay);
  const options = sitDownOptions();
  const houseNotes = (gameState.interactionLog || [])
    .filter(entry => entry.source === 'npc' || entry.type === 'npc')
    .slice(-3)
    .reverse();
  const rating = typeof gameState.viewerRating === 'number' ? gameState.viewerRating : 3.8;

  return (
    <Card className="p-5 md:p-6 rounded-lg">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">This cycle</p>
          <h2 className="text-xl md:text-2xl font-medium tracking-wide">Villa week</h2>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline">Day {gameState.currentDay}</Badge>
          <Badge variant="outline">{rating.toFixed(1)} rating</Badge>
          {gameState.immunityWinner && <Badge>Safety: {gameState.immunityWinner}</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1 mb-4">
        {cycleBeats().map(beat => {
          const on = beat.id === cycle.beat;
          return (
            <div
              key={beat.id}
              className={`rounded-md px-2 py-2 text-center text-[11px] md:text-xs ${on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              {beat.label}
            </div>
          );
        })}
      </div>

      <p className="text-sm mb-1">{cycle.brief}</p>
      <p className="text-sm text-muted-foreground mb-5">{move}</p>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Threat board</h3>
          <ul className="space-y-1.5">
            {threats.map(t => (
              <li key={t.name} className="flex items-baseline justify-between gap-2 text-sm">
                <span className={t.inYourBloc ? 'text-foreground' : ''}>
                  {t.name}
                  {t.name === gameState.playerName ? ' (you)' : ''}
                </span>
                <span className="text-xs text-muted-foreground text-right">{t.immune ? 'safe' : t.score} · {t.reason}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Blocs and bonds</h3>
          {blocs.length === 0 && bonds.length === 0 && (
            <p className="text-sm text-muted-foreground">No bloc yet. A pair is enough before the first vote.</p>
          )}
          <ul className="space-y-2">
            {blocs.slice(0, 3).map(b => (
              <li key={b.id} className="text-sm">
                <span className="font-medium">{b.name}</span>
                <span className="text-muted-foreground"> · {b.members.length} · {b.secret ? 'quiet' : 'known'}</span>
                <div className="text-xs text-muted-foreground">{b.note}</div>
              </li>
            ))}
            {bonds.map(b => (
              <li key={b.names.join('-')} className="text-sm">
                <span className="font-medium">{b.names.join(' & ')}</span>
                <span className="text-muted-foreground"> · {b.kind}</span>
                <div className="text-xs text-muted-foreground">{b.note}</div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Production sit-down</h3>
          <p className="text-xs text-muted-foreground mb-2">
            One answer shapes the edit this cycle. It records as your confessional.
          </p>
          <div className="grid gap-2">
            {options.map(opt => (
              <Button
                key={opt.id}
                variant={sat === opt.id ? 'action' : 'outline'}
                size="sm"
                disabled={alreadySat || sat !== null}
                onClick={() => {
                  submitConfessional(opt.line, opt.tone);
                  setSat(opt.id);
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {alreadySat || sat ? 'Session recorded. The cut is locked for today.' : options[0].effect}
          </p>
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mt-4 mb-1">House without you</h3>
          {houseNotes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Advance a day. NPCs talk, scheme, and pull you aside on their own.</p>
          ) : (
            <ul className="space-y-1">
              {houseNotes.map((note, i) => (
                <li key={i} className="text-xs text-muted-foreground">
                  {note.participants?.[0] || 'House'}: {note.content || note.tone || 'moved'}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
};

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { GameState } from '@/types/game';
import { getCurrentWeek, getWeekBounds } from '@/utils/taskEngine';

interface ProductionTasksPanelProps {
  gameState: GameState;
}

export const ProductionTasksPanel = ({ gameState }: ProductionTasksPanelProps) => {
  const player = gameState.contestants.find(c => c.name === gameState.playerName);
  const week = getCurrentWeek(gameState.currentDay);
  const { start, end } = getWeekBounds(week);

  if (!player || !player.special || player.special.kind !== 'planted_houseguest') return null;

  const tasks = (player.special.tasks || []).filter(t => (t.week ?? week) === week);

  return (
    <Card className="p-6 md:p-7 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">Production Mission</h3>
        <div className="text-xs text-muted-foreground">
          Week {week} • Due by Day {end}
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Production gives you secret weekly missions the audience sees on screen. Completing them quietly awards $1,000 each.
      </p>

      {tasks.length === 0 ? (
        <div className="text-sm text-muted-foreground">No mission assigned yet. Blend in and build cover.</div>
      ) : (
        <div className="space-y-4">
          {tasks.map((t) => {
            const pct = Math.min(100, Math.floor(((t.progress ?? 0) / (t.target ?? 1)) * 100));
            const complete = !!t.completed;
            return (
              <div key={t.id} className="ring-1 ring-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide">
                      {t.difficulty}
                    </span>
                    <span className="text-sm text-foreground">{t.description}</span>
                  </div>
                  <div className={`text-xs ${complete ? 'text-primary' : 'text-muted-foreground'}`}>
                    {complete ? 'Completed' : `Progress ${t.progress ?? 0}/${t.target ?? 1}`}
                  </div>
                </div>
                <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-2 ${complete ? 'bg-primary' : 'bg-primary/70'}`} style={{ width: `${complete ? 100 : pct}%` }} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Reward: ${t.reward ?? 1000} {t.rewarded ? '(awarded)' : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <div className="text-sm">
          Funds: <span className="font-medium">${gameState.playerFunds ?? 0}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => { /* reserved for future manual claim if needed */ }} disabled>
          Auto-verified
        </Button>
      </div>
    </Card>
  );
};
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GameState } from '@/types/game';
import { TrendingUp, TrendingDown, Activity, Tv } from 'lucide-react';

interface RatingsPanelProps {
  gameState: GameState;
}

export const RatingsPanel = ({ gameState }: RatingsPanelProps) => {
  const rating = typeof gameState.viewerRating === 'number' ? gameState.viewerRating : 3.8;
  const history = gameState.ratingsHistory || [];

  // Prefer weekly entries for display and delta calculations
  const weeklyHistory = history.filter(h => typeof h.reason === 'string' && h.reason.toLowerCase().startsWith('weekly'));
  const entries = weeklyHistory.length >= 2 ? weeklyHistory : history;

  const last = entries[entries.length - 1];
  const prev = entries[entries.length - 2];

  const delta = last && prev ? Math.round((last.rating - prev.rating) * 100) / 100 : 0;

  const trendIcon =
    delta > 0.01 ? <TrendingUp className="w-4 h-4 text-green-500" /> :
    delta < -0.01 ? <TrendingDown className="w-4 h-4 text-destructive" /> :
    <Activity className="w-4 h-4 text-muted-foreground" />;

  const displayRating = (last?.rating ?? rating);
  const percent = Math.round((displayRating / 10) * 100);

  const recentReasons = (weeklyHistory.length ? weeklyHistory : history)
    .slice(-3)
    .reverse()
    .map(h => h.reason)
    .filter(Boolean) as string[];

  return (
    <Card className="p-4 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Tv className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-medium">Weekly Ratings</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {trendIcon}
          <span className="ml-1">{delta > 0 ? '+' : ''}{delta}</span>
        </Badge>
      </div>

      <div className="flex items-baseline gap-3 mb-2">
        <div className="text-2xl font-semibold">{displayRating.toFixed(1)}</div>
        <span className="text-xs text-muted-foreground">/ 10</span>
      </div>

      <Progress value={percent} className="h-2 mb-3" />

      {recentReasons.length > 0 ? (
        <div className="space-y-1">
          {recentReasons.map((r, idx) => (
            <div key={idx} className="text-[11px] text-muted-foreground">• {r}</div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">Weekly buzz will appear here as the season progresses.</div>
      )}
    </Card>
  );
};
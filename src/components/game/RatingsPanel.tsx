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

  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const delta = last && prev ? Math.round((last.rating - prev.rating) * 100) / 100 : 0;

  const trendIcon =
    delta > 0.01 ? <TrendingUp className="w-4 h-4 text-green-500" /> :
    delta < -0.01 ? <TrendingDown className="w-4 h-4 text-destructive" /> :
    <Activity className="w-4 h-4 text-muted-foreground" />;

  const percent = Math.round((rating / 10) * 100);

  const recentReasons = history.slice(-3).reverse().map(h => h.reason).filter(Boolean) as string[];

  return (
    <Card className="p-4 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Tv className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-medium">Viewer Ratings</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {trendIcon}
          <span className="ml-1">{delta > 0 ? '+' : ''}{delta}</span>
        </Badge>
      </div>

      <div className="flex items-baseline gap-3 mb-2">
        <div className="text-2xl font-semibold">{rating.toFixed(1)}</div>
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
        <div className="text-xs text-muted-foreground">House buzz will appear here as the day progresses.</div>
      )}
    </Card>
  );
};
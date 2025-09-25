import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GameState } from '@/types/game';

interface Props {
  gameState: GameState;
}

export const AIOutcomeDebug = ({ gameState }: Props) => {
  const o = gameState.lastTagOutcome;
  if (!o) return null;

  return (
    <Card className="p-3 border-dashed border-2 border-muted">
      <div className="flex items-center justify-between">
        <div className="text-xs">
          <span className="font-medium mr-2">Tag Engine Debug</span>
          <Badge variant="outline" className="mr-2">{o.intent}</Badge>
          <Badge variant="secondary" className="mr-2">{o.topic}</Badge>
          <Badge variant={o.outcome.category === 'positive' ? 'secondary' : o.outcome.category === 'negative' ? 'destructive' : 'outline'}>
            {o.outcome.category}
          </Badge>
        </div>
        <div className="text-[11px] text-muted-foreground">
          choiceId: {o.choiceId}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        <div>trustΔ: {o.outcome.trustDelta.toFixed(3)}</div>
        <div>suspΔ: {o.outcome.suspicionDelta.toFixed(3)}</div>
        <div>inflΔ: {o.outcome.influenceDelta.toFixed(3)}</div>
        <div>entΔ: {o.outcome.entertainmentDelta.toFixed(3)}</div>
      </div>
      {o.outcome.notes && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          notes: {o.outcome.notes}
        </div>
      )}
    </Card>
  );
};
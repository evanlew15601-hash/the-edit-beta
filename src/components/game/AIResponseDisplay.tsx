import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReactionSummary } from '@/types/game';
import { MessageCircle, Eye, Zap } from 'lucide-react';

interface AIResponseDisplayProps {
  lastTarget?: string;
  actionType?: string;
  reactionSummary?: ReactionSummary;
}

export const AIResponseDisplay = ({ lastTarget, actionType, reactionSummary }: AIResponseDisplayProps) => {
  const getReactionIcon = () => {
    switch (reactionSummary?.take) {
      case 'positive': return <MessageCircle className="w-4 h-4 text-green-500" />;
      case 'pushback': return <Zap className="w-4 h-4 text-destructive" />;
      case 'suspicious': return <Eye className="w-4 h-4 text-yellow-600" />;
      case 'curious': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      default: return <MessageCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getContextIcon = () => {
    switch (reactionSummary?.context) {
      case 'private': return '🤫';
      case 'scheme': return '🎭';
      case 'activity': return '🏃';
      default: return '💬';
    }
  };

  const renderDelta = (label: string, value?: number, positiveClass = 'text-edit-hero', negativeClass = 'text-edit-villain') => {
    if (value === undefined || value === 0) return null;
    const sign = value > 0 ? '+' : '';
    const color = value > 0 ? positiveClass : negativeClass;
    return (
      <span className={`text-xs ${color} mr-3`}>
        {label} {sign}{value}
      </span>
    );
  };

  if (!lastTarget || !reactionSummary) {
    return null;
  }

  return (
    <Card className="p-4 animate-fade-in border-l-4 border-l-primary">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getReactionIcon()}
            <span className="text-sm font-medium">{lastTarget} reacted</span>
            <span className="text-lg">{getContextIcon()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={
              reactionSummary.take === 'positive' ? 'secondary' :
              reactionSummary.take === 'pushback' ? 'destructive' :
              reactionSummary.take === 'suspicious' ? 'outline' : 'outline'
            }>
              {reactionSummary.take}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {reactionSummary.context}
            </Badge>
          </div>
        </div>

        {/* Surface actual outcome deltas after execution */}
        {reactionSummary.deltas && (
          <div className="text-sm bg-muted/40 rounded p-2 flex items-center flex-wrap">
            <span className="text-xs text-muted-foreground mr-3">Outcome:</span>
            {renderDelta('Trust', reactionSummary.deltas.trust)}
            {renderDelta('Suspicion', reactionSummary.deltas.suspicion, 'text-edit-villain', 'text-edit-hero')}
            {renderDelta('Influence', reactionSummary.deltas.influence)}
            {renderDelta('Entertainment', reactionSummary.deltas.entertainment)}
          </div>
        )}
        
        {reactionSummary.notes && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
            <span className="font-medium">💭 </span>
            {reactionSummary.notes}
          </div>
        )}
      </div>
    </Card>
  );
};
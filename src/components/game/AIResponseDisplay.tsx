import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Users } from 'lucide-react';

import type { ReactionSummary } from '@/types/game';

interface AIResponseDisplayProps {
  lastResponse?: string;
  lastTarget?: string;
  actionType?: string;
  additions?: { strategy?: string; followUp?: string; risk?: string; memory?: string };
  reactionSummary?: ReactionSummary;
}

export const AIResponseDisplay = ({ lastResponse, lastTarget, actionType, additions, reactionSummary }: AIResponseDisplayProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (lastResponse || reactionSummary) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [lastResponse, reactionSummary]);

  if ((!lastResponse && !reactionSummary) || !isVisible) return null;

  const getActionIcon = () => {
    switch (actionType) {
      case 'talk':
        return <MessageCircle className="w-4 h-4" />;
      case 'dm':
        return <MessageCircle className="w-4 h-4" />;
      case 'scheme':
        return <Users className="w-4 h-4" />;
      case 'activity':
        return <Users className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  return (
    <Card className="p-4 border-surveillance-active/20 bg-surveillance-active/5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-surveillance-active/10">
          {getActionIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-surveillance-active">
              {lastTarget} {lastResponse ? 'responds:' : 'acknowledged'}
            </h4>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {actionType}
            </span>
          </div>
          {lastResponse ? (
            <ScrollArea className="max-h-24">
              <p className="text-sm text-foreground italic">
                "{lastResponse}"
              </p>
              {additions && (additions.strategy || additions.followUp || additions.risk || additions.memory) ? (
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  {additions.strategy && <p><strong>Strategy:</strong> {additions.strategy.replace(/^Strategy:\s*/,'')}</p>}
                  {additions.followUp && <p><strong>Follow-up:</strong> {additions.followUp.replace(/^Follow-up:\s*/,'')}</p>}
                  {additions.risk && <p><strong>Risk:</strong> {additions.risk.replace(/^Leak risk:\s*/,'Leak risk: ')}</p>}
                  {additions.memory && <p><strong>Memory:</strong> {additions.memory.replace(/^Memory impact:\s*/,'Impact: ')}</p>}
                </div>
              ) : null}
            </ScrollArea>
          ) : reactionSummary ? (
            <div className="text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Take:</span>
                <span className="px-2 py-0.5 rounded-md border text-xs capitalize">
                  {reactionSummary.take}
                </span>
                <span className="text-muted-foreground">Context:</span>
                <span className="px-2 py-0.5 rounded-md border text-xs capitalize">
                  {reactionSummary.context}
                </span>
              </div>
              {reactionSummary.notes ? (
                <p className="mt-2 text-xs text-muted-foreground">{reactionSummary.notes}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </Card>
  );
};
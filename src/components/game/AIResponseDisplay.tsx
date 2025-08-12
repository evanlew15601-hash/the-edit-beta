import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MessageCircle, Users } from 'lucide-react';

import type { ReactionSummary } from '@/types/game';

interface AIResponseDisplayProps {
  lastResponse?: string;
  lastTarget?: string;
  actionType?: string;
  additions?: { strategy?: string; followUp?: string; risk?: string; memory?: string };
  reactionSummary?: ReactionSummary;
}

export const AIResponseDisplay = ({ lastTarget, actionType, reactionSummary }: AIResponseDisplayProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (reactionSummary) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [reactionSummary]);

  if (!reactionSummary || !isVisible) return null;

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
              {lastTarget} acknowledged
            </h4>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {actionType}
            </span>
          </div>
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

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Users } from 'lucide-react';

interface AIResponseDisplayProps {
  lastResponse?: string;
  lastTarget?: string;
  actionType?: string;
}

export const AIResponseDisplay = ({ lastResponse, lastTarget, actionType }: AIResponseDisplayProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (lastResponse) {
      setIsVisible(true);
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => setIsVisible(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [lastResponse]);

  if (!lastResponse || !isVisible) return null;

  const getActionIcon = () => {
    switch (actionType) {
      case 'talk':
        return <MessageCircle className="w-4 h-4" />;
      case 'dm':
        return <MessageCircle className="w-4 h-4" />;
      case 'scheme':
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
              {lastTarget} responds:
            </h4>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {actionType}
            </span>
          </div>
          <ScrollArea className="max-h-24">
            <p className="text-sm text-foreground italic">
              "{lastResponse}"
            </p>
          </ScrollArea>
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
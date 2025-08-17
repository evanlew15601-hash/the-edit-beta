import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Heart, AlertTriangle } from 'lucide-react';

interface RelationshipChange {
  id: string;
  contestantName: string;
  type: 'trust' | 'suspicion' | 'bond' | 'threat';
  delta: number;
  timestamp: number;
}

interface RelationshipChangeIndicatorProps {
  changes: RelationshipChange[];
}

export const RelationshipChangeIndicator = ({ changes }: RelationshipChangeIndicatorProps) => {
  const [visibleChanges, setVisibleChanges] = useState<RelationshipChange[]>([]);

  useEffect(() => {
    // Show new changes with fade-in animation
    const newChanges = changes.filter(change => 
      !visibleChanges.find(v => v.id === change.id)
    );
    
    if (newChanges.length > 0) {
      setVisibleChanges(prev => [...prev, ...newChanges]);
      
      // Auto-remove after 5 seconds
      newChanges.forEach(change => {
        setTimeout(() => {
          setVisibleChanges(prev => prev.filter(v => v.id !== change.id));
        }, 5000);
      });
    }
  }, [changes, visibleChanges]);

  const getChangeIcon = (type: string, delta: number) => {
    const isPositive = delta > 0;
    
    switch (type) {
      case 'trust':
        return isPositive ? 
          <TrendingUp className="w-3 h-3 text-green-500" /> : 
          <TrendingDown className="w-3 h-3 text-destructive" />;
      case 'suspicion':
        return isPositive ? 
          <TrendingUp className="w-3 h-3 text-yellow-600" /> : 
          <TrendingDown className="w-3 h-3 text-green-500" />;
      case 'bond':
        return <Heart className="w-3 h-3 text-pink-500" />;
      case 'threat':
        return <AlertTriangle className="w-3 h-3 text-destructive" />;
      default:
        return null;
    }
  };

  const getChangeText = (change: RelationshipChange) => {
    const absValue = Math.abs(change.delta);
    const direction = change.delta > 0 ? '+' : '';
    
    return `${change.contestantName}: ${change.type} ${direction}${absValue}`;
  };

  if (visibleChanges.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {visibleChanges.map((change) => (
        <div
          key={change.id}
          className="animate-fade-in bg-background border border-border rounded-lg p-3 shadow-lg"
        >
          <div className="flex items-center gap-2">
            {getChangeIcon(change.type, change.delta)}
            <span className="text-sm font-medium">
              {getChangeText(change)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
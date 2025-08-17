import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Contestant } from '@/types/game';
import { MessageCircle, Users, Eye, Zap } from 'lucide-react';

interface NPCActivity {
  id: string;
  participants: string[];
  action: string;
  type: 'conversation' | 'scheme' | 'alliance' | 'observation';
  timestamp: number;
  visibility: 'public' | 'private' | 'hidden';
}

interface AmbientNPCActivityProps {
  contestants: Contestant[];
  currentDay: number;
  playerName: string;
}

export const AmbientNPCActivity = ({ contestants, currentDay, playerName }: AmbientNPCActivityProps) => {
  const [activities, setActivities] = useState<NPCActivity[]>([]);

  useEffect(() => {
    // Generate ambient NPC activities every 30-60 seconds
    const interval = setInterval(() => {
      generateAmbientActivity();
    }, Math.random() * 30000 + 30000); // 30-60 seconds

    return () => clearInterval(interval);
  }, [contestants, currentDay]);

  const generateAmbientActivity = () => {
    const activeContestants = contestants.filter(c => !c.isEliminated && c.name !== playerName);
    if (activeContestants.length < 2) return;

    // Pick random contestants for the activity
    const participant1 = activeContestants[Math.floor(Math.random() * activeContestants.length)];
    const participant2 = activeContestants.find(c => c.id !== participant1.id) || participant1;

    const activityTypes = [
      {
        type: 'conversation' as const,
        actions: [
          'are having a quiet conversation by the pool',
          'are discussing strategy in the kitchen',
          'are sharing stories on the couch',
          'are whispering in the bedroom'
        ],
        visibility: Math.random() > 0.3 ? 'public' as const : 'private' as const
      },
      {
        type: 'alliance' as const,
        actions: [
          'seem to be forming a closer bond',
          'are making promises to each other',
          'are discussing voting plans',
          'are planning their next moves'
        ],
        visibility: 'private' as const
      },
      {
        type: 'scheme' as const,
        actions: [
          'are plotting something suspicious',
          'are spreading rumors about others',
          'are planning to manipulate the vote',
          'are discussing who to target next'
        ],
        visibility: 'hidden' as const
      },
      {
        type: 'observation' as const,
        actions: [
          'notice you watching them',
          'are keeping an eye on other contestants',
          'are studying voting patterns',
          'are analyzing social dynamics'
        ],
        visibility: 'public' as const
      }
    ];

    const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
    const action = activityType.actions[Math.floor(Math.random() * activityType.actions.length)];

    // Only show public activities and some private ones (if player happens to notice)
    const shouldShow = activityType.visibility === 'public' || 
                      (activityType.visibility === 'private' && Math.random() > 0.7) ||
                      (activityType.visibility === 'hidden' && Math.random() > 0.9);

    if (!shouldShow) return;

    const newActivity: NPCActivity = {
      id: `${Date.now()}-${Math.random()}`,
      participants: [participant1.name, participant2.name],
      action,
      type: activityType.type,
      timestamp: Date.now(),
      visibility: activityType.visibility
    };

    setActivities(prev => [newActivity, ...prev].slice(0, 8)); // Keep only last 8 activities

    // Auto-remove after 2 minutes
    setTimeout(() => {
      setActivities(prev => prev.filter(a => a.id !== newActivity.id));
    }, 120000);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'conversation': return <MessageCircle className="w-3 h-3 text-blue-500" />;
      case 'alliance': return <Users className="w-3 h-3 text-green-500" />;
      case 'scheme': return <Zap className="w-3 h-3 text-destructive" />;
      case 'observation': return <Eye className="w-3 h-3 text-yellow-600" />;
      default: return <MessageCircle className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'public': return null;
      case 'private': return <Badge variant="outline" className="text-xs">Private</Badge>;
      case 'hidden': return <Badge variant="destructive" className="text-xs">Suspicious</Badge>;
      default: return null;
    }
  };

  if (activities.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Eye className="w-4 h-4 text-muted-foreground" />
        House Activity
      </h3>
      
      <ScrollArea className="h-40">
        <div className="space-y-2">
          {activities.map((activity) => (
            <div 
              key={activity.id} 
              className="text-xs p-2 rounded bg-muted/50 animate-fade-in"
            >
              <div className="flex items-center gap-2 mb-1">
                {getActivityIcon(activity.type)}
                <span className="font-medium">
                  {activity.participants.join(' & ')}
                </span>
                {getVisibilityBadge(activity.visibility)}
              </div>
              <p className="text-muted-foreground">{activity.action}</p>
              <span className="text-xs text-muted-foreground">
                {Math.round((Date.now() - activity.timestamp) / 60000)}m ago
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
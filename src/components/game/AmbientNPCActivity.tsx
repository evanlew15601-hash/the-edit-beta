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
  }, [contestants, currentDay, playerName]);

  const generateAmbientActivity = () => {
    const activeContestants = contestants.filter(c => !c.isEliminated && c.name !== playerName);
    if (activeContestants.length < 2) return;

    // First, see if there are any background conversations flagged as "overheard_possible"
    // in the contestants' memory. These come from the BackgroundConversationEngine and
    // represent real strategic talks the player might plausibly glimpse.
    const overheardMap = new Map<string, { participants: string[]; topicTag?: string }>();

    activeContestants.forEach(c => {
      (c.memory || []).forEach(m => {
        if (m.day !== currentDay) return;
        if (!m.tags || !m.tags.includes('background_conversation') || !m.tags.includes('overheard_possible')) return;

        const names = (m.participants || []).filter(n => n && n !== playerName);
        if (names.length < 2) return;

        const key = names.slice(0, 2).sort().join('|');
        if (!overheardMap.has(key)) {
          const topicTag = (m.tags || []).find(t =>
            t === 'gossip' ||
            t === 'vote_plan' ||
            t === 'alliance_talk' ||
            t === 'revenge_talk'
          );
          overheardMap.set(key, { participants: names.slice(0, 2), topicTag });
        }
      });
    });

    const overheardCandidates = Array.from(overheardMap.values());

    // With some probability, surface a real background conversation instead of a fully random ambient one
    if (overheardCandidates.length > 0 && Math.random() > 0.4) {
      const candidate = overheardCandidates[Math.floor(Math.random() * overheardCandidates.length)];
      const [p1, p2] = candidate.participants;

      let type: NPCActivity['type'] = 'conversation';
      let visibility: NPCActivity['visibility'] = 'private';
      let actions: string[] = [];

      switch (candidate.topicTag) {
        case 'gossip':
        case 'revenge_talk':
        case 'vote_plan':
          type = 'scheme';
          visibility = 'hidden';
          actions = [
            'are whispering about something urgent',
            'keep glancing around while talking in low voices',
            'are having an intense private conversation',
          ];
          break;
        case 'alliance_talk':
          type = 'alliance';
          visibility = 'private';
          actions = [
            'are huddled together whispering',
            'are making plans together away from the others',
            'are quietly coordinating their next move',
          ];
          break;
        default:
          type = 'conversation';
          visibility = 'private';
          actions = [
            'are having a quiet conversation away from the group',
            'are chatting softly in the corner',
            'are talking in low tones by the hallway',
          ];
          break;
      }

      const action = actions[Math.floor(Math.random() * actions.length)];

      const newActivity: NPCActivity = {
        id: `${Date.now()}-${Math.random()}`,
        participants: [p1, p2],
        action,
        type,
        timestamp: Date.now(),
        visibility,
      };

      setActivities(prev => [newActivity, ...prev].slice(0, 8)); // Keep only last 8 activities

      // Auto-remove after 2 minutes
      setTimeout(() => {
        setActivities(prev => prev.filter(a => a.id !== newActivity.id));
      }, 120000);

      return;
    }

    // Fallback: generate a generic ambient activity not tied to specific background conversations
    const participant1 = activeContestants[Math.floor(Math.random() * activeContestants.length)];
    const participant2 = activeContestants.find(c => c.id !== participant1.id) || participant1;

    const activityTypes = [
      {
        type: 'conversation' as const,
        actions: [
          'are having a quiet conversation by the pool',
          'are discussing camp life in the kitchen',
          'are sharing stories on the couch',
          'are talking about today\'s events'
        ],
        visibility: Math.random() > 0.5 ? 'public' as const : 'private' as const
      },
      {
        type: 'alliance' as const,
        actions: [
          'seem to be having a private discussion',
          'are huddled together whispering',
          'are exchanging meaningful looks',
          'appear to be making plans together'
        ],
        visibility: 'private' as const
      },
      {
        type: 'scheme' as const,
        actions: [
          'are whispering about something urgent',
          'seem to be discussing strategy',
          'are having an intense conversation',
          'appear to be coordinating something'
        ],
        visibility: 'hidden' as const
      },
      {
        type: 'observation' as const,
        actions: [
          'notice you watching them',
          'are keeping an eye on other contestants',
          'are watching the group dynamics',
          'seem to be studying the social situation'
        ],
        visibility: 'public' as const
      }
    ];

    const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
    const action = activityType.actions[Math.floor(Math.random() * activityType.actions.length)];

    // More realistic overhearing chances - important info should be rare
    const shouldShow = activityType.visibility === 'public' || 
                      (activityType.visibility === 'private' && Math.random() > 0.85) || // 15% chance for private
                      (activityType.visibility === 'hidden' && Math.random() > 0.95);   // 5% chance for hidden

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
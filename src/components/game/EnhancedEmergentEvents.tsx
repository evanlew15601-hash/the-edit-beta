import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GameState } from '@/types/game';
import { Zap, Users, Heart, Target, AlertTriangle, Crown } from 'lucide-react';
import {
  EnhancedEmergentEvents as StructuredEmergentEvents,
  EmergentEvent as StructuredEmergentEvent,
} from '@/utils/enhancedEmergentEvents';

type UIEmergentEvent = StructuredEmergentEvent & {
  intensity: 'low' | 'medium' | 'high' | 'explosive';
  playerInvolvement: 'none' | 'witness' | 'participant' | 'catalyst';
  autoResolveTime?: number;
};

interface EnhancedEmergentEventsProps {
  gameState: GameState;
  onEmergentEventChoice: (event: any, choiceId: string) => void;
}

export const EnhancedEmergentEvents = ({ gameState, onEmergentEventChoice }: EnhancedEmergentEventsProps) => {
  const [activeEvents, setActiveEvents] = useState<UIEmergentEvent[]>([]);
  const [eventHistory, setEventHistory] = useState<UIEmergentEvent[]>([]);

  const { contestants } = gameState;

  useEffect(() => {
    generateEmergentEvents();
    const interval = setInterval(generateEmergentEvents, 45000); // Check every 45 seconds
    return () => clearInterval(interval);
  }, [gameState.currentDay, gameState.contestants.length]);

  const generateEmergentEvents = () => {
    const activeContestants = contestants.filter(c => !c.isEliminated);
    if (activeContestants.length < 3) return;

    // Ask the structured emergent system for a possible event
    const baseEvent = StructuredEmergentEvents.generateEmergentEvent(gameState);
    if (!baseEvent || activeEvents.length >= 2) return;

    // Derive UI-specific fields (intensity, involvement, auto-resolve)
    const intensity: UIEmergentEvent['intensity'] = (() => {
      switch (baseEvent.type) {
        case 'alliance_crisis':
        case 'vote_chaos':
          return 'high';
        case 'strategy_leak':
        case 'trust_shift':
          return 'medium';
        case 'competition_twist':
        case 'social_drama':
        default:
          return 'low';
      }
    })();

    const playerInvolvement: UIEmergentEvent['playerInvolvement'] = (() => {
      const involvesPlayer = baseEvent.participants.includes(gameState.playerName);
      if (involvesPlayer) return 'participant';
      if (baseEvent.type === 'social_drama' || baseEvent.type === 'vote_chaos') return 'witness';
      return 'none';
    })();

    const autoResolveTime =
      playerInvolvement === 'none' ? 25000 : undefined;

    const newEvent: UIEmergentEvent = {
      ...baseEvent,
      intensity,
      playerInvolvement,
      autoResolveTime,
    };

    setActiveEvents(prev => [...prev, newEvent]);

    if (newEvent.playerInvolvement === 'none' && newEvent.autoResolveTime) {
      setTimeout(() => {
        resolveEvent(newEvent.id, 'auto');
      }, newEvent.autoResolveTime);
    }
  };

  

  const resolveEvent = (eventId: string, modeOrChoiceId: string) => {
    const event = activeEvents.find(e => e.id === eventId);
    if (!event) return;

    setActiveEvents(prev => prev.filter(e => e.id !== eventId));
    setEventHistory(prev => [...prev, event].slice(-10)); // Keep last 10 events
    
    if (modeOrChoiceId !== 'auto') {
      let choiceId = modeOrChoiceId;
      const normalized = modeOrChoiceId.toLowerCase();
      const isPacifist = normalized === 'pacifist';
      const isHeadfirst = normalized === 'headfirst';

      if (Array.isArray(event.choices) && event.choices.length > 0 && (isPacifist || isHeadfirst)) {
        const choices = event.choices as any[];
        const sorted = [...choices].sort(
          (a, b) => (a.editEffect ?? 0) - (b.editEffect ?? 0)
        );
        const low = sorted[0];
        const high = sorted[sorted.length - 1];
        choiceId = isPacifist ? low.id : high.id;
      }

      onEmergentEventChoice(event, choiceId);
    }
  };

  const getEventIcon = (type: UIEmergentEvent['type']) => {
    switch (type) {
      case 'alliance_crisis': return <Users className="w-5 h-5 text-blue-500" />;
      case 'strategy_leak': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'vote_chaos': return <Zap className="w-5 h-5 text-red-500" />;
      case 'competition_twist': return <Crown className="w-5 h-5 text-yellow-500" />;
      case 'social_drama': return <Heart className="w-5 h-5 text-pink-500" />;
      case 'trust_shift': return <Target className="w-5 h-5 text-purple-500" />;
    }
  };

  const getIntensityColor = (intensity: UIEmergentEvent['intensity']) => {
    switch (intensity) {
      case 'low': return 'border-border bg-card text-card-foreground';
      case 'medium': return 'border-border bg-card text-card-foreground';
      case 'high': return 'border-border bg-card text-card-foreground';
      case 'explosive': return 'border-destructive bg-destructive/10 text-destructive-foreground';
    }
  };

  if (activeEvents.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-foreground">Emergent Events</h3>
      {activeEvents.map((event) => (
        <Alert key={event.id} className={`${getIntensityColor(event.intensity)} border-2`}>
          <div className="flex items-start gap-4">
            <div className="mt-1">
              {getEventIcon(event.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-foreground">{event.title}</h4>
                <Badge variant="outline" className="text-xs">
                  {event.intensity}
                </Badge>
                <Badge 
                  variant={event.playerInvolvement === 'participant' ? 'default' : 'secondary'} 
                  className="text-xs"
                >
                  {event.playerInvolvement === 'participant' ? 'You\'re involved' : 
                   event.playerInvolvement === 'witness' ? 'You witnessed this' :
                   event.playerInvolvement === 'catalyst' ? 'You caused this' : 'Ongoing'}
                </Badge>
              </div>
              <AlertDescription className="mb-3 text-foreground">
                {event.description}
              </AlertDescription>
              
              {event.choices && (
                <div className="grid gap-2">
                  {/* For now, keep simple Pacifist / Headfirst mapping.
                      Later we can surface each structured choice explicitly
                      and update the handler to accept choice IDs directly. */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveEvent(event.id, 'pacifist')}
                    className="text-left justify-start bg-background hover:bg-accent text-foreground"
                  >
                    <span className="flex-1">Stay Pacifist</span>
                    <Badge variant="secondary" className="text-xs ml-2">
                      low drama
                    </Badge>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => resolveEvent(event.id, 'headfirst')}
                    className="text-left justify-start bg-background hover:bg-accent text-foreground"
                  >
                    <span className="flex-1">Jump In Headfirst</span>
                    <Badge variant="secondary" className="text-xs ml-2">
                      high drama
                    </Badge>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
};
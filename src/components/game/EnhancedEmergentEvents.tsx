import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GameState } from '@/types/game';
import { Zap, Users, Heart, Target, AlertTriangle, Crown } from 'lucide-react';

interface EmergentEvent {
  id: string;
  type: 'conflict' | 'alliance_formation' | 'betrayal' | 'romance' | 'rumor_spread' | 'power_shift';
  title: string;
  description: string;
  participants: string[];
  intensity: 'low' | 'medium' | 'high' | 'explosive';
  playerInvolvement: 'none' | 'witness' | 'participant' | 'catalyst';
  choices?: {
    id: string;
    text: string;
    consequences: string[];
    type: 'aggressive' | 'passive' | 'strategic' | 'social';
  }[];
  autoResolveTime?: number;
}

interface EnhancedEmergentEventsProps {
  gameState: GameState;
  onEmergentEventChoice: (event: any, choice: 'pacifist' | 'headfirst') => void;
}

export const EnhancedEmergentEvents = ({ gameState, onEmergentEventChoice }: EnhancedEmergentEventsProps) => {
  const [activeEvents, setActiveEvents] = useState<EmergentEvent[]>([]);
  const [eventHistory, setEventHistory] = useState<EmergentEvent[]>([]);

  const { contestants, currentDay } = gameState;

  useEffect(() => {
    generateEmergentEvents();
    const interval = setInterval(generateEmergentEvents, 45000); // Check every 45 seconds
    return () => clearInterval(interval);
  }, [gameState.currentDay, gameState.contestants.length]);

  const generateEmergentEvents = () => {
    const activeContestants = contestants.filter(c => !c.isEliminated);
    if (activeContestants.length < 3) return;

    // Calculate drama factors
    const dramaTension = calculateDramaTension();
    const shouldGenerateEvent = Math.random() < getDramaThreshold(dramaTension);
    
    if (!shouldGenerateEvent || activeEvents.length >= 2) return;

    const newEvent = generateRandomEvent(activeContestants, dramaTension);
    if (newEvent) {
      setActiveEvents(prev => [...prev, newEvent]);
      
      // Auto-resolve some events if player isn't involved
      if (newEvent.playerInvolvement === 'none' && newEvent.autoResolveTime) {
        setTimeout(() => {
          resolveEvent(newEvent.id, 'auto');
        }, newEvent.autoResolveTime);
      }
    }
  };

  const calculateDramaTension = () => {
    let tension = 0;
    
    // Recent eliminations increase tension
    const recentEliminations = gameState.votingHistory.filter(v => 
      v.day >= gameState.currentDay - 3
    ).length;
    tension += recentEliminations * 15;
    
    // Alliance dynamics
    const allianceCount = gameState.alliances.length;
    tension += Math.min(allianceCount * 10, 30);
    
    // Player activity level
    tension += gameState.dailyActionCount * 5;
    
    // Game phase intensity
    const remainingCount = gameState.contestants.filter(c => !c.isEliminated).length;
    if (remainingCount <= 5) tension += 25;
    if (remainingCount <= 3) tension += 40;
    
    return Math.min(tension, 100);
  };

  const getDramaThreshold = (tension: number) => {
    // Higher tension = more likely events
    return Math.min(0.15 + (tension / 500), 0.4);
  };

  const generateRandomEvent = (contestants: any[], tension: number): EmergentEvent | null => {
    const eventTypes = [
      {
        type: 'conflict' as const,
        weight: tension > 60 ? 3 : 1,
        generator: () => generateConflictEvent(contestants)
      },
      {
        type: 'alliance_formation' as const,
        weight: gameState.alliances.length < 3 ? 2 : 1,
        generator: () => generateAllianceEvent(contestants)
      },
      {
        type: 'betrayal' as const,
        weight: gameState.alliances.length > 0 ? 2 : 0,
        generator: () => generateBetrayalEvent(contestants)
      },
      {
        type: 'romance' as const,
        weight: tension < 70 ? 2 : 1,
        generator: () => generateRomanceEvent(contestants)
      },
      {
        type: 'rumor_spread' as const,
        weight: 2,
        generator: () => generateRumorEvent(contestants)
      },
      {
        type: 'power_shift' as const,
        weight: gameState.currentDay % 7 >= 5 ? 2 : 1,
        generator: () => generatePowerShiftEvent(contestants)
      }
    ];

    const totalWeight = eventTypes.reduce((sum, et) => sum + et.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const eventType of eventTypes) {
      random -= eventType.weight;
      if (random <= 0) {
        return eventType.generator();
      }
    }
    
    return null;
  };

  const generateConflictEvent = (contestants: any[]): EmergentEvent => {
    const participants = getRandomParticipants(contestants, 2);
    const intensity = Math.random() > 0.6 ? 'high' : 'medium';
    
    return {
      id: `conflict-${Date.now()}`,
      type: 'conflict',
      title: 'Heated Confrontation',
      description: `${participants[0]} and ${participants[1]} got into a heated argument about strategy and loyalty. Tension is escalating rapidly.`,
      participants,
      intensity,
      playerInvolvement: participants.includes(gameState.playerName) ? 'participant' : 'witness',
      choices: [
        {
          id: 'pacifist',
          text: 'Try to defuse the situation',
          consequences: ['Maintain peace', 'Appear as mediator'],
          type: 'social'
        },
        {
          id: 'headfirst',
          text: 'Escalate the conflict',
          consequences: ['Damage relationships', 'Gain aggressive reputation'],
          type: 'aggressive'
        }
      ],
      autoResolveTime: participants.includes(gameState.playerName) ? undefined : 30000
    };
  };

  const generateAllianceEvent = (contestants: any[]): EmergentEvent => {
    const participants = getRandomParticipants(contestants, Math.random() > 0.5 ? 3 : 2);
    
    return {
      id: `alliance-${Date.now()}`,
      type: 'alliance_formation',
      title: 'Secret Alliance Forming',
      description: `${participants.join(', ')} are quietly discussing forming a new alliance. They're being careful about who might be watching.`,
      participants,
      intensity: 'medium',
      playerInvolvement: participants.includes(gameState.playerName) ? 'participant' : Math.random() > 0.7 ? 'witness' : 'none',
      choices: [
        {
          id: 'pacifist',
          text: 'Pretend you didn\'t notice',
          consequences: ['Maintain plausible deniability', 'Miss strategic opportunity'],
          type: 'passive'
        },
        {
          id: 'headfirst',
          text: 'Report the alliance to others',
          consequences: ['Gain information currency', 'Risk retaliation'],
          type: 'strategic'
        }
      ],
      autoResolveTime: 25000
    };
  };

  const generateBetrayalEvent = (contestants: any[]): EmergentEvent => {
    const alliance = gameState.alliances[Math.floor(Math.random() * gameState.alliances.length)];
    if (!alliance) return generateConflictEvent(contestants);
    
    const betrayer = alliance.members[Math.floor(Math.random() * alliance.members.length)];
    const target = alliance.members.find(m => m !== betrayer) || alliance.members[0];
    
    return {
      id: `betrayal-${Date.now()}`,
      type: 'betrayal',
      title: 'Alliance Betrayal',
      description: `${betrayer} is secretly planning to betray ${target} and their alliance. Whispers of disloyalty are spreading.`,
      participants: [betrayer, target],
      intensity: 'high',
      playerInvolvement: [betrayer, target].includes(gameState.playerName) ? 'participant' : 'witness',
      choices: [
        {
          id: 'pacifist',
          text: 'Stay neutral and observe',
          consequences: ['Avoid taking sides', 'Miss strategic opportunity'],
          type: 'passive'
        },
        {
          id: 'headfirst',
          text: 'Use this information strategically',
          consequences: ['Gain leverage', 'Risk being caught'],
          type: 'strategic'
        }
      ],
      autoResolveTime: 20000
    };
  };

  const generateRomanceEvent = (contestants: any[]): EmergentEvent => {
    const participants = getRandomParticipants(contestants, 2);
    const title = 'Unexpected Chemistry';
    const desc = `${participants[0]} and ${participants[1]} were spotted getting close. People are starting to talk.`;

    return {
      id: `romance-${Date.now()}`,
      type: 'romance',
      title,
      description: desc,
      participants,
      intensity: 'low',
      playerInvolvement: participants.includes(gameState.playerName) ? 'participant' : Math.random() > 0.5 ? 'witness' : 'none',
      choices: [
        {
          id: 'pacifist',
          text: 'Downplay the romance',
          consequences: ['Reduce attention', 'Protect social image'],
          type: 'social',
        },
        {
          id: 'headfirst',
          text: 'Lean into it',
          consequences: ['Increase screen time', 'Risk strategic blowback'],
          type: 'aggressive',
        },
      ],
      autoResolveTime: 30000,
    };
  };

  const generateRumorEvent = (contestants: any[]): EmergentEvent => {
    const participants = getRandomParticipants(contestants, 2);
    const rumorTarget = participants[1];
    return {
      id: `rumor-${Date.now()}`,
      type: 'rumor_spread',
      title: 'Whispers Spread',
      description: `${participants[0]} heard something about ${rumorTarget}. The house is buzzing.`,
      participants,
      intensity: 'medium',
      playerInvolvement: participants.includes(gameState.playerName) ? 'participant' : 'witness',
      choices: [
        {
          id: 'pacifist',
          text: 'Quietly fact-check',
          consequences: ['Reduce misinformation', 'Appear calm'],
          type: 'strategic',
        },
        {
          id: 'headfirst',
          text: 'Amplify the rumor',
          consequences: ['Create chaos', 'Damage relationships'],
          type: 'aggressive',
        },
      ],
      autoResolveTime: participants.includes(gameState.playerName) ? undefined : 25000,
    };
  };

  const generatePowerShiftEvent = (contestants: any[]): EmergentEvent => {
    const group = getRandomParticipants(contestants, 3);
    return {
      id: `power-${Date.now()}`,
      type: 'power_shift',
      title: 'Numbers Shift Quietly',
      description: `${group.join(', ')} are recalculating the vote. The plan might be changing.`,
      participants: group,
      intensity: 'high',
      playerInvolvement: group.includes(gameState.playerName) ? 'participant' : Math.random() > 0.6 ? 'witness' : 'none',
      choices: [
        {
          id: 'pacifist',
          text: 'Stabilize the plan',
          consequences: ['Prevent flip', 'Maintain trust'],
          type: 'strategic',
        },
        {
          id: 'headfirst',
          text: 'Push the flip',
          consequences: ['Upset alliances', 'Increase threat level'],
          type: 'aggressive',
        },
      ],
      autoResolveTime: 20000,
    };
  };

  const getRandomParticipants = (contestants: any[], count: number) => {
    const nonPlayer = contestants.filter(c => c.name !== gameState.playerName);
    const selected = [];
    
    // Sometimes include player based on involvement chance
    if (Math.random() > 0.6 && count > 1) {
      selected.push(gameState.playerName);
      count--;
    }
    
    const shuffled = [...nonPlayer].sort(() => 0.5 - Math.random());
    selected.push(...shuffled.slice(0, count).map(c => c.name));
    
    return selected;
  };

  const resolveEvent = (eventId: string, choiceId: string) => {
    const event = activeEvents.find(e => e.id === eventId);
    if (!event) return;

    setActiveEvents(prev => prev.filter(e => e.id !== eventId));
    setEventHistory(prev => [...prev, event].slice(-10)); // Keep last 10 events
    
    if (choiceId !== 'auto') {
      const choice = choiceId as 'pacifist' | 'headfirst';
      onEmergentEventChoice(event, choice);
    }
  };

  const getEventIcon = (type: EmergentEvent['type']) => {
    switch (type) {
      case 'conflict': return <Zap className="w-5 h-5 text-red-500" />;
      case 'alliance_formation': return <Users className="w-5 h-5 text-blue-500" />;
      case 'betrayal': return <Target className="w-5 h-5 text-purple-500" />;
      case 'romance': return <Heart className="w-5 h-5 text-pink-500" />;
      case 'rumor_spread': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'power_shift': return <Crown className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getIntensityColor = (intensity: EmergentEvent['intensity']) => {
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
                  {event.choices.map((choice) => (
                    <Button
                      key={choice.id}
                      variant="outline"
                      size="sm"
                      onClick={() => resolveEvent(event.id, choice.id)}
                      className="text-left justify-start bg-background hover:bg-accent text-foreground"
                    >
                      <span className="flex-1">{choice.text}</span>
                      <Badge variant="secondary" className="text-xs ml-2">
                        {choice.type}
                      </Badge>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
};
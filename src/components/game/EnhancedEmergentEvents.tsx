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
  onEventChoice: (eventId: string, choiceId: string) => void;
}

export const EnhancedEmergentEvents = ({ gameState, onEventChoice }: EnhancedEmergentEventsProps) => {
  const [activeEvents, setActiveEvents] = useState<EmergentEvent[]>([]);
  const [eventHistory, setEventHistory] = useState<EmergentEvent[]>([]);

  useEffect(() => {
    generateEmergentEvents();
    const interval = setInterval(generateEmergentEvents, 45000); // Check every 45 seconds
    return () => clearInterval(interval);
  }, [gameState.currentDay, gameState.contestants.length]);

  const generateEmergentEvents = () => {
    const activeContestants = gameState.contestants.filter(c => !c.isEliminated);
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
        weight: 1,
        generator: () => generateRomanceEvent(contestants)
      },
      {
        type: 'rumor_spread' as const,
        weight: 2,
        generator: () => generateRumorEvent(contestants)
      },
      {
        type: 'power_shift' as const,
        weight: tension > 70 ? 2 : 1,
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
      choices: participants.includes(gameState.playerName) ? [
        {
          id: 'escalate',
          text: 'Escalate the conflict',
          consequences: ['Damage relationships', 'Gain aggressive reputation'],
          type: 'aggressive'
        },
        {
          id: 'defuse',
          text: 'Try to defuse the situation',
          consequences: ['Maintain peace', 'Appear as mediator'],
          type: 'social'
        },
        {
          id: 'exploit',
          text: 'Use the conflict strategically',
          consequences: ['Gain strategic advantage', 'Risk being exposed'],
          type: 'strategic'
        }
      ] : [
        {
          id: 'stay_neutral',
          text: 'Stay out of it',
          consequences: ['Avoid taking sides', 'Miss strategic opportunity'],
          type: 'passive'
        },
        {
          id: 'pick_side',
          text: 'Support one side',
          consequences: ['Strengthen one relationship', 'Damage another'],
          type: 'social'
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
      choices: participants.includes(gameState.playerName) ? [
        {
          id: 'join_enthusiastically',
          text: 'Join the alliance eagerly',
          consequences: ['Secure alliance spot', 'Appear desperate'],
          type: 'social'
        },
        {
          id: 'negotiate_terms',
          text: 'Negotiate your position',
          consequences: ['Better alliance terms', 'Risk being excluded'],
          type: 'strategic'
        }
      ] : [
        {
          id: 'report_alliance',
          text: 'Report the alliance to others',
          consequences: ['Gain information currency', 'Risk retaliation'],
          type: 'strategic'
        },
        {
          id: 'ignore',
          text: 'Pretend you didn\'t notice',
          consequences: ['Maintain plausible deniability', 'Miss strategic opportunity'],
          type: 'passive'
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
      choices: [betrayer, target].includes(gameState.playerName) ? [
        {
          id: 'expose_betrayer',
          text: 'Expose the betrayal',
          consequences: ['Save alliance', 'Create enemy'],
          type: 'aggressive'
        },
        {
          id: 'join_betrayal',
          text: 'Join the betrayal',
          consequences: ['Gain new ally', 'Damage reputation'],
          type: 'strategic'
        }
      ] : [
        {
          id: 'leverage_information',
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
    
    return {
      id: `romance-${Date.now()}`,
      type: 'romance',
      title: 'Romantic Connection',
      description: `${participants[0]} and ${participants[1]} seem to be developing a romantic connection. This could change the game dynamics significantly.`,
      participants,
      intensity: 'medium',
      playerInvolvement: participants.includes(gameState.playerName) ? 'participant' : 'witness',
      choices: [
        {
          id: 'support_romance',
          text: 'Support the relationship',
          consequences: ['Gain allies\' loyalty', 'Strengthen power couple'],
          type: 'social'
        },
        {
          id: 'exploit_romance',
          text: 'Exploit the relationship',
          consequences: ['Gain strategic advantage', 'Risk alienating both'],
          type: 'strategic'
        }
      ],
      autoResolveTime: 35000
    };
  };

  const generateRumorEvent = (contestants: any[]): EmergentEvent => {
    const spreader = contestants[Math.floor(Math.random() * contestants.length)];
    const target = contestants.find(c => c !== spreader) || contestants[0];
    
    return {
      id: `rumor-${Date.now()}`,
      type: 'rumor_spread',
      title: 'Spreading Rumors',
      description: `${spreader.name} is spreading rumors about ${target.name}'s game strategy and loyalty. The information is circulating quickly.`,
      participants: [spreader.name, target.name],
      intensity: 'medium',
      playerInvolvement: [spreader.name, target.name].includes(gameState.playerName) ? 'participant' : 'witness',
      choices: [
        {
          id: 'spread_further',
          text: 'Help spread the rumors',
          consequences: ['Damage target\'s reputation', 'Associate with gossip'],
          type: 'aggressive'
        },
        {
          id: 'defend_target',
          text: 'Defend the target',
          consequences: ['Gain target\'s loyalty', 'Conflict with spreader'],
          type: 'social'
        },
        {
          id: 'investigate',
          text: 'Investigate the truth',
          consequences: ['Gain accurate information', 'Reveal your interest'],
          type: 'strategic'
        }
      ],
      autoResolveTime: 30000
    };
  };

  const generatePowerShiftEvent = (contestants: any[]): EmergentEvent => {
    const leader = contestants[Math.floor(Math.random() * contestants.length)];
    
    return {
      id: `power-shift-${Date.now()}`,
      type: 'power_shift',
      title: 'Power Dynamics Shifting',
      description: `${leader.name} is making bold moves to consolidate power and influence. The game hierarchy is shifting rapidly.`,
      participants: [leader.name],
      intensity: 'high',
      playerInvolvement: leader.name === gameState.playerName ? 'catalyst' : 'witness',
      choices: [
        {
          id: 'challenge_power',
          text: 'Challenge their power play',
          consequences: ['Potential leadership', 'High risk confrontation'],
          type: 'aggressive'
        },
        {
          id: 'align_with_power',
          text: 'Align with the power player',
          consequences: ['Secure position', 'Appear as follower'],
          type: 'strategic'
        },
        {
          id: 'build_counter_alliance',
          text: 'Build counter-alliance',
          consequences: ['Unite opposition', 'Create clear sides'],
          type: 'strategic'
        }
      ],
      autoResolveTime: 25000
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
      onEventChoice(eventId, choiceId);
    }
  };

  const getEventIcon = (type: EmergentEvent['type']) => {
    switch (type) {
      case 'conflict': return <Zap className="w-5 h-5 text-red-500" />;
      case 'alliance_formation': return <Users className="w-5 h-5 text-blue-500" />;
      case 'betrayal': return <Target className="w-5 h-5 text-purple-500" />;
      case 'romance': return <Heart className="w-5 h-5 text-pink-500" />;
      case 'rumor_spread': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'power_shift': return <Crown className="w-5 h-5 text-gold-500" />;
    }
  };

  const getIntensityColor = (intensity: EmergentEvent['intensity']) => {
    switch (intensity) {
      case 'low': return 'border-green-200 bg-green-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'high': return 'border-orange-200 bg-orange-50';
      case 'explosive': return 'border-red-200 bg-red-50';
    }
  };

  if (activeEvents.length === 0) return null;

  return (
    <div className="space-y-4">
      {activeEvents.map((event) => (
        <Alert key={event.id} className={`${getIntensityColor(event.intensity)} border-2`}>
          <div className="flex items-start gap-4">
            <div className="mt-1">
              {getEventIcon(event.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium">{event.title}</h4>
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
              <AlertDescription className="mb-3">
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
                      className="text-left justify-start"
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
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState, Contestant } from '@/types/game';
import { TAG_CHOICES } from '@/data/tagChoices';
import { Brain, Heart, Zap, Shield, Target, Clock } from 'lucide-react';

interface TagChoice {
  id: string;
  text: string;
  type: 'strategic' | 'emotional' | 'aggressive' | 'deceptive' | 'neutral';
  consequences: string[];
  cooldown?: number;
}

interface EnhancedTagDialogueEngineProps {
  gameState: GameState;
  onTagTalk: (target: string, choiceId: string, interaction: 'talk' | 'dm' | 'scheme' | 'activity') => void;
}

export const EnhancedTagDialogueEngine = ({ gameState, onTagTalk }: EnhancedTagDialogueEngineProps) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [interactionType, setInteractionType] = useState<'talk' | 'dm' | 'scheme' | 'activity'>('talk');
  const [availableChoices, setAvailableChoices] = useState<TagChoice[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string>('');

  const { contestants, playerName, currentDay, tagChoiceCooldowns = {} } = gameState;

  useEffect(() => {
    if (selectedTarget) {
      generateContextualChoices();
    }
  }, [selectedTarget, interactionType, currentDay]);

  const generateContextualChoices = () => {
    const target = contestants.find(c => c.name === selectedTarget);
    if (!target) return;

    const baseChoices = TAG_CHOICES[interactionType] || [];
    
    // Enhanced choices based on relationship and context
    const enhancedChoices: TagChoice[] = [
      ...baseChoices,
      // Relationship-based choices
      ...(target.psychProfile.trustLevel > 70 ? [
        {
          id: `trust-leverage-${target.name}`,
          text: `Leverage your close relationship with ${target.name}`,
          type: 'strategic' as const,
          consequences: ['Potential alliance strengthening', 'Risk of appearing manipulative'],
          cooldown: 3
        }
      ] : []),
      
      ...(target.psychProfile.trustLevel < 30 ? [
        {
          id: `repair-relationship-${target.name}`,
          text: `Attempt to repair damaged relationship with ${target.name}`,
          type: 'emotional' as const,
          consequences: ['May rebuild trust', 'Could be seen as fake'],
          cooldown: 2
        }
      ] : []),
      
      // Disposition-based choices
      ...(target.psychProfile.disposition.includes('Paranoid') ? [
        {
          id: `exploit-paranoia-${target.name}`,
          text: `Subtly feed into ${target.name}'s paranoid tendencies`,
          type: 'deceptive' as const,
          consequences: ['May create chaos', 'High risk of backfire'],
          cooldown: 5
        }
      ] : []),
      
      ...(target.psychProfile.disposition.includes('Loyal') ? [
        {
          id: `appeal-loyalty-${target.name}`,
          text: `Appeal to ${target.name}'s sense of loyalty`,
          type: 'emotional' as const,
          consequences: ['Strong emotional connection', 'May create long-term obligation'],
          cooldown: 4
        }
      ] : []),
      
      // Memory-based choices
      ...(target.memory.some(m => m.type === 'scheme' && m.participants.includes(playerName)) ? [
        {
          id: `address-past-scheme-${target.name}`,
          text: `Address past strategic moves with ${target.name}`,
          type: 'neutral' as const,
          consequences: ['May clear the air', 'Could bring up old wounds'],
          cooldown: 2
        }
      ] : [])
    ];

    // Filter out choices on cooldown
    const filteredChoices = enhancedChoices.filter(choice => {
      const cooldownEnd = tagChoiceCooldowns[choice.id];
      return !cooldownEnd || currentDay >= cooldownEnd;
    });

    setAvailableChoices(filteredChoices.slice(0, 8)); // Limit to 8 choices for UI
  };

  const getChoiceIcon = (type: TagChoice['type']) => {
    switch (type) {
      case 'strategic': return <Brain className="w-4 h-4 text-blue-500" />;
      case 'emotional': return <Heart className="w-4 h-4 text-pink-500" />;
      case 'aggressive': return <Zap className="w-4 h-4 text-red-500" />;
      case 'deceptive': return <Target className="w-4 h-4 text-purple-500" />;
      case 'neutral': return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getChoiceColor = (type: TagChoice['type']) => {
    switch (type) {
      case 'strategic': return 'border-blue-200 hover:bg-blue-50';
      case 'emotional': return 'border-pink-200 hover:bg-pink-50';
      case 'aggressive': return 'border-red-200 hover:bg-red-50';
      case 'deceptive': return 'border-purple-200 hover:bg-purple-50';
      case 'neutral': return 'border-gray-200 hover:bg-gray-50';
    }
  };

  const getRemainingCooldown = (choiceId: string) => {
    const cooldownEnd = tagChoiceCooldowns[choiceId];
    return cooldownEnd ? Math.max(0, cooldownEnd - currentDay) : 0;
  };

  const availableTargets = contestants.filter(c => !c.isEliminated && c.name !== playerName);

  if (availableTargets.length === 0) return null;

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Enhanced Tag Dialogue
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Advanced conversation strategies with deep consequences
        </p>
      </div>

      {/* Target and Interaction Selection */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Target</label>
          <select 
            value={selectedTarget} 
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="w-full p-2 border border-border rounded text-sm"
          >
            <option value="">Select target...</option>
            {availableTargets.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Interaction</label>
          <select 
            value={interactionType} 
            onChange={(e) => setInteractionType(e.target.value as any)}
            className="w-full p-2 border border-border rounded text-sm"
          >
            <option value="talk">Talk</option>
            <option value="dm">Direct Message</option>
            <option value="scheme">Scheme</option>
            <option value="activity">Activity</option>
          </select>
        </div>
      </div>

      {selectedTarget && (
        <>
          <ScrollArea className="h-64 mb-4">
            <div className="space-y-3">
              {availableChoices.map((choice) => {
                const cooldownDays = getRemainingCooldown(choice.id);
                const isOnCooldown = cooldownDays > 0;
                
                return (
                  <div 
                    key={choice.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      getChoiceColor(choice.type)
                    } ${selectedChoice === choice.id ? 'ring-2 ring-primary' : ''} ${
                      isOnCooldown ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => !isOnCooldown && setSelectedChoice(choice.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getChoiceIcon(choice.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {choice.type}
                          </Badge>
                          {choice.cooldown && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {choice.cooldown}d cooldown
                            </Badge>
                          )}
                          {isOnCooldown && (
                            <Badge variant="destructive" className="text-xs">
                              {cooldownDays}d remaining
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-2">{choice.text}</p>
                        <div className="space-y-1">
                          {choice.consequences.map((consequence, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground">
                              • {consequence}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setSelectedChoice('');
                setSelectedTarget('');
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="action" 
              className="flex-1"
              disabled={!selectedChoice}
              onClick={() => {
                if (selectedChoice && selectedTarget) {
                  onTagTalk(selectedTarget, selectedChoice, interactionType);
                  setSelectedChoice('');
                  setSelectedTarget('');
                }
              }}
            >
              Execute Choice
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Contestant } from '@/types/game';
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
  target: Contestant;
  playerName: string;
  interactionType: 'talk' | 'dm' | 'scheme' | 'activity';
  onChoiceSelect: (choiceId: string) => void;
  cooldowns: { [choiceId: string]: number };
  currentDay: number;
}

export const EnhancedTagDialogueEngine = ({ 
  target, 
  playerName, 
  interactionType, 
  onChoiceSelect, 
  cooldowns, 
  currentDay 
}: EnhancedTagDialogueEngineProps) => {
  const [availableChoices, setAvailableChoices] = useState<TagChoice[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string>('');

  useEffect(() => {
    generateContextualChoices();
  }, [target, interactionType, currentDay]);

  const generateContextualChoices = () => {
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
      ] : []),
      
      // Game phase specific choices
      ...(currentDay > 20 ? [
        {
          id: `endgame-positioning-${target.name}`,
          text: `Discuss endgame positioning with ${target.name}`,
          type: 'strategic' as const,
          consequences: ['Clarifies future plans', 'Reveals your intentions'],
          cooldown: 3
        }
      ] : []),
      
      // Interaction type specific enhancements
      ...(interactionType === 'scheme' ? [
        {
          id: `complex-scheme-${target.name}`,
          text: `Propose a complex multi-layered plan to ${target.name}`,
          type: 'strategic' as const,
          consequences: ['High reward potential', 'High complexity risk'],
          cooldown: 7
        }
      ] : []),
      
      ...(interactionType === 'dm' ? [
        {
          id: `intimate-confession-${target.name}`,
          text: `Share something deeply personal with ${target.name}`,
          type: 'emotional' as const,
          consequences: ['Creates strong bond', 'Vulnerability risk'],
          cooldown: 5
        }
      ] : [])
    ];

    // Filter out choices on cooldown
    const filteredChoices = enhancedChoices.filter(choice => {
      const cooldownEnd = cooldowns[choice.id];
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
    const cooldownEnd = cooldowns[choiceId];
    return cooldownEnd ? Math.max(0, cooldownEnd - currentDay) : 0;
  };

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          {getChoiceIcon('strategic')}
          Enhanced Dialogue Options
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose your approach with {target.name} carefully - each choice has lasting consequences
        </p>
      </div>

      <ScrollArea className="h-80">
        <div className="space-y-3">
          {availableChoices.map((choice) => {
            const cooldownDays = getRemainingCooldown(choice.id);
            const isOnCooldown = cooldownDays > 0;
            
            return (
              <div 
                key={choice.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
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

      <div className="mt-4 flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => setSelectedChoice('')}
        >
          Cancel
        </Button>
        <Button 
          variant="action" 
          className="flex-1"
          disabled={!selectedChoice}
          onClick={() => selectedChoice && onChoiceSelect(selectedChoice)}
        >
          Execute Choice
        </Button>
      </div>
    </Card>
  );
};
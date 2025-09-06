import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState, Contestant } from '@/types/game';
import { Users, Eye, Shield, AlertTriangle, Target } from 'lucide-react';

interface AllianceIntelligenceProps {
  gameState: GameState;
  selectedAlliance?: string;
}

export const AllianceIntelligencePanel = ({ gameState, selectedAlliance }: AllianceIntelligenceProps) => {
  const [expandedIntel, setExpandedIntel] = useState<string>('');

  const alliance = gameState.alliances.find(a => a.id === selectedAlliance);
  if (!alliance) return null;

  const generateAllianceIntelligence = (member: string) => {
    const contestant = gameState.contestants.find(c => c.name === member);
    if (!contestant) return [];

    const intel = [];
    
    // Trust-based intelligence
    if (contestant.psychProfile.trustLevel > 70) {
      intel.push({
        type: 'truth',
        confidence: 'high',
        info: `${member} is genuinely loyal to this alliance and unlikely to betray it`,
        source: 'behavioral_analysis'
      });
      
      // Reveal voting intentions (truthful)
      if (gameState.gamePhase === 'player_vote' || gameState.currentDay === gameState.nextEliminationDay) {
        const targetMemory = contestant.memory.filter(m => 
          m.type === 'scheme' || m.type === 'conversation'
        ).slice(-3);
        
        if (targetMemory.length > 0) {
          const likelyTarget = targetMemory[0].participants.find(p => 
            p !== member && p !== gameState.playerName
          );
          
          if (likelyTarget) {
            intel.push({
              type: 'truth',
              confidence: 'medium',
              info: `${member} is likely targeting ${likelyTarget} in the next vote`,
              source: 'alliance_discussion'
            });
          }
        }
      }
    } else if (contestant.psychProfile.trustLevel < 40) {
      intel.push({
        type: 'deception',
        confidence: 'medium',
        info: `${member} may be planning to betray this alliance soon`,
        source: 'suspicious_behavior'
      });
      
      // Generate misleading voting info
      if (gameState.gamePhase === 'player_vote') {
        const randomTarget = gameState.contestants
          .filter(c => !c.isEliminated && c.name !== member && c.name !== gameState.playerName)
          [Math.floor(Math.random() * gameState.contestants.filter(c => !c.isEliminated && c.name !== member).length)];
        
        if (randomTarget) {
          intel.push({
            type: 'deception',
            confidence: 'low',
            info: `${member} claims they're voting for ${randomTarget.name} (may be lying)`,
            source: 'private_conversation'
          });
        }
      }
    }

    // Memory-based intelligence
    const recentMemories = contestant.memory.filter(m => 
      m.day >= gameState.currentDay - 3
    ).slice(0, 2);

    recentMemories.forEach(memory => {
      if (memory.type === 'scheme') {
        intel.push({
          type: 'strategic',
          confidence: 'medium',
          info: `${member} has been scheming with ${memory.participants.join(', ')} recently`,
          source: 'observation'
        });
      } else if (memory.type === 'conversation' && memory.emotionalImpact > 5) {
        intel.push({
          type: 'social',
          confidence: 'high',
          info: `${member} had a positive interaction with ${memory.participants.filter(p => p !== member).join(', ')}`,
          source: 'alliance_intel'
        });
      }
    });

    return intel;
  };

  const getIntelTypeIcon = (type: string) => {
    switch (type) {
      case 'truth': return <Shield className="w-4 h-4 text-green-500" />;
      case 'deception': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'strategic': return <Target className="w-4 h-4 text-blue-500" />;
      case 'social': return <Users className="w-4 h-4 text-purple-500" />;
      default: return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900';
      case 'low': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900';
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4">
         <h3 className="text-lg font-medium flex items-center gap-2">
           <Users className="w-5 h-5 text-primary" />
           Alliance Intelligence: {alliance.name || `Alliance ${alliance.id.slice(-4)}`}
         </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Trust Level: {alliance.strength}% • {alliance.members.length} members
        </p>
      </div>

      <ScrollArea className="h-64">
        <div className="space-y-4">
          {alliance.members
            .filter(member => member !== gameState.playerName)
            .map(member => {
              const intel = generateAllianceIntelligence(member);
              const isExpanded = expandedIntel === member;
              
              return (
                <div key={member} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground">{member}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedIntel(isExpanded ? '' : member)}
                    >
                      {isExpanded ? 'Hide' : 'View'} Intel
                    </Button>
                  </div>
                  
                  {isExpanded && (
                    <div className="space-y-2 mt-3">
                      {intel.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          No significant intelligence available
                        </p>
                      ) : (
                        intel.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 bg-muted rounded">
                            {getIntelTypeIcon(item.type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getConfidenceColor(item.confidence)}`}
                                >
                                  {item.confidence} confidence
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {item.source}
                                </Badge>
                              </div>
                              <p className="text-sm text-foreground">{item.info}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </ScrollArea>
    </Card>
  );
};
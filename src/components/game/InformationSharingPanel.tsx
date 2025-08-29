
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState } from '@/types/game';
import { InformationTradingEngine, InformationLog } from '@/utils/informationTradingEngine';
import { Eye, EyeOff, MessageSquare, AlertTriangle, Users } from 'lucide-react';

interface InformationSharingPanelProps {
  gameState: GameState;
}

export const InformationSharingPanel = ({ gameState }: InformationSharingPanelProps) => {
  const [sharedInfo, setSharedInfo] = useState<InformationLog[]>([]);

  useEffect(() => {
    if (gameState) {
      // Generate fresh trading information
      InformationTradingEngine.generateTradableInformation(gameState);
      
      // Get shared information logs for the player
      const playerInfo = InformationTradingEngine.getSharedInformation(gameState.playerName, gameState);
      setSharedInfo(playerInfo);
      
      console.log('Information panel loaded with', playerInfo.length, 'items');
    }
  }, [gameState]);

  if (sharedInfo.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center space-y-2">
          <EyeOff className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No intelligence gathered yet.
          </p>
          <p className="text-xs text-muted-foreground">
            Information will be automatically shared when you interact with contestants.
          </p>
          <p className="text-xs text-muted-foreground">
            Day {gameState.currentDay} - Have conversations, DMs, or alliance meetings to gather intel
          </p>
        </div>
      </Card>
    );
  }

  const getInfoIcon = (type: string) => {
    switch (type) {
      case 'voting_plan': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'alliance_secret': return <Users className="w-4 h-4 text-purple-500" />;
      case 'threat_assessment': return <Eye className="w-4 h-4 text-red-500" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getReliabilityColor = (reliability: number) => {
    if (reliability >= 80) return 'text-green-500';
    if (reliability >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getReliabilityLabel = (reliability: number) => {
    if (reliability >= 80) return '✓ Reliable';
    if (reliability >= 60) return '? Uncertain';
    return '✗ Questionable';
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="w-5 h-5 text-surveillance-active" />
        <h3 className="font-medium">Intelligence Network</h3>
        <Badge variant="outline" className="ml-auto">
          {sharedInfo.length} {sharedInfo.length === 1 ? 'item' : 'items'}
        </Badge>
      </div>

      <ScrollArea className="max-h-64">
        <div className="space-y-3">
          {sharedInfo.map((log) => {
            const info = log.information;
            return (
              <div key={log.id} className="border border-border rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getInfoIcon(info.type)}
                    <span className="font-medium text-sm">{log.from}</span>
                    <span className="text-xs text-muted-foreground">
                      ({log.context.replace('_', ' ')})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {info.type.replace('_', ' ')}
                    </Badge>
                    <span 
                      className={`text-xs font-medium ${getReliabilityColor(info.reliability)}`}
                      title={`${Math.round(info.reliability)}% reliability`}
                    >
                      {getReliabilityLabel(info.reliability)}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-foreground">
                  "{info.content}"
                </p>

                {info.is_lie && (
                  <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                    🎭 This person might be lying or misinformed
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Day {log.day}</span>
                  <span>Value: {Math.round(info.strategic_value)}/100</span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="mt-4 p-3 bg-muted rounded border border-border">
        <p className="text-xs text-muted-foreground">
          💡 Information accuracy depends on your relationships. Some contestants may lie to protect their interests.
        </p>
      </div>
    </Card>
  );
};

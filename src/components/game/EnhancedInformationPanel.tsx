import { useState, useEffect } from 'react';
import { GameState } from '@/types/game';
import { InformationTradingEngine, InformationLog } from '@/utils/informationTradingEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Eye, MessageCircle, Users, AlertTriangle, Heart, Target } from 'lucide-react';

interface EnhancedInformationPanelProps {
  gameState: GameState;
}

export const EnhancedInformationPanel = ({ gameState }: EnhancedInformationPanelProps) => {
  const [sharedInfo, setSharedInfo] = useState<InformationLog[]>([]);

  useEffect(() => {
    // Force generation and retrieval of information
    InformationTradingEngine.generateTradableInformation(gameState);
    InformationTradingEngine.autoGenerateIntelligence(gameState);
    const info = InformationTradingEngine.getSharedInformation(gameState.playerName, gameState);
    console.log('Enhanced info panel updating with:', info.length, 'items');
    setSharedInfo(info);
  }, [gameState.currentDay, gameState.playerName]);

  const getInfoIcon = (type: string) => {
    switch (type) {
      case 'voting_plan': return <Target className="h-4 w-4" />;
      case 'alliance_secret': return <Users className="h-4 w-4" />;
      case 'trust_level': return <Heart className="h-4 w-4" />;
      case 'threat_assessment': return <AlertTriangle className="h-4 w-4" />;
      case 'rumor': return <MessageCircle className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const getReliabilityColor = (reliability: number): string => {
    if (reliability >= 80) return 'text-green-600 dark:text-green-400';
    if (reliability >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getReliabilityLabel = (reliability: number): string => {
    if (reliability >= 80) return 'Highly Reliable';
    if (reliability >= 60) return 'Somewhat Reliable';
    return 'Questionable';
  };

  if (sharedInfo.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Intelligence Network
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Intelligence gathering in progress...
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Conversations and observations will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Intelligence Network ({sharedInfo.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {sharedInfo.map((log) => (
              <div key={log.id} className="border border-border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getInfoIcon(log.information.type)}
                    <span className="text-xs font-medium text-foreground">
                      {log.from}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {log.context}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Day {log.day}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {log.information.type.replace('_', ' ')}
                    </Badge>
                    <span className={`text-xs ${getReliabilityColor(log.information.reliability)}`}>
                      {getReliabilityLabel(log.information.reliability)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-foreground">
                    {log.information.content}
                  </p>
                  
                  {log.information.is_lie && (
                    <Badge variant="destructive" className="text-xs">
                      Potentially False
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
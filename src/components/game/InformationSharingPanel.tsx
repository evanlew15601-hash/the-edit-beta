import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState } from '@/types/game';
import { generateIntelligenceNetwork, IntelligenceItem } from '@/utils/informationSharingEngine';
import { Eye, EyeOff, MessageSquare, AlertTriangle } from 'lucide-react';

interface InformationSharingPanelProps {
  gameState: GameState;
}

export const InformationSharingPanel = ({ gameState }: InformationSharingPanelProps) => {
  const sharedInfo = generateIntelligenceNetwork(gameState);

  if (sharedInfo.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center space-y-2">
          <EyeOff className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Build trust with contestants to unlock intel.
          </p>
          <p className="text-xs text-muted-foreground">
            Trust level 40+ required for information sharing.
          </p>
        </div>
      </Card>
    );
  }

  const getInfoIcon = (type: IntelligenceItem['type']) => {
    switch (type) {
      case 'voting_plan': return <AlertTriangle className="w-4 h-4" />;
      case 'alliance_info': return <Eye className="w-4 h-4" />;
      case 'threat_assessment': return <MessageSquare className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getReliabilityColor = (reliability: number) => {
    if (reliability >= 80) return 'text-edit-hero';
    if (reliability <= 40) return 'text-edit-villain';
    return 'text-foreground';
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="w-5 h-5 text-surveillance-active" />
        <h3 className="font-medium">Intelligence Network</h3>
      </div>

      <ScrollArea className="max-h-64">
        <div className="space-y-3">
          {sharedInfo.map((info, index) => (
            <div key={index} className="border border-border rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getInfoIcon(info.type)}
                  <span className="font-medium text-sm">{info.source}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {info.type.replace('_', ' ')}
                  </Badge>
                  <span className={`text-xs ${getReliabilityColor(info.reliability)}`}>
                    {info.reliability >= 80 ? '✓' : info.reliability <= 40 ? '✗' : '?'}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-foreground italic">
                "{info.content}"
              </p>

              {info.reliability <= 40 && (
                <p className="text-xs text-edit-villain">
                  🎭 This person is being deceptive
                </p>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="mt-4 p-3 bg-muted rounded border border-border">
        <p className="text-xs text-muted-foreground">
          💡 Information quality depends on your relationships. Some people may lie to protect their own interests.
        </p>
      </div>
    </Card>
  );
};
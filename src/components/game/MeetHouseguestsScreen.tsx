import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/enhanced-button';
import { GameState, Contestant } from '@/types/game';
import { Users, Star, IdCard, Heart, Flame } from 'lucide-react';

interface MeetHouseguestsScreenProps {
  gameState: GameState;
  onContinue: () => void;
}

export const MeetHouseguestsScreen = ({ gameState, onContinue }: MeetHouseguestsScreenProps) => {
  const contestants = gameState.contestants;

  const renderContestantCard = (c: Contestant) => {
    const isPlayer = c.name === gameState.playerName;

    return (
      <Card key={c.id} className={`p-4 flex flex-col gap-2 ${isPlayer ? 'border-primary/20 bg-primary/10' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`font-medium ${isPlayer ? 'text-primary' : ''}`}>
              {c.name}{isPlayer ? ' (You)' : ''}
            </div>
            <div className="text-xs text-muted-foreground">
              {c.publicPersona}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {c.stats?.primary && (
              <Badge variant={isPlayer ? 'secondary' : 'outline'} className="text-[10px]">
                <Star className="w-3 h-3 mr-1" />
                {c.stats.primary}
              </Badge>
            )}
            {c.special && c.special.kind !== 'none' && (
              <Badge variant={isPlayer ? 'secondary' : 'outline'} className="text-[10px]">
                {c.special.kind === 'hosts_estranged_child' && 'Host’s Child'}
                {c.special.kind === 'planted_houseguest' && 'Planted HG'}
              </Badge>
            )}
          </div>
        </div>

        <div className="text-xs flex items-center gap-2">
          <IdCard className="w-3 h-3 text-muted-foreground" />
          <span>
            {c.age ? `Age ${c.age}` : 'Age unknown'}
            {c.background ? ` • ${c.background}` : ''}
          </span>
        </div>

        {c.customBackgroundText && (
          <div className="text-xs text-muted-foreground">
            {c.customBackgroundText}
          </div>
        )}

        {c.stats && (
          <div className="grid grid-cols-2 gap-2 text-[11px] text-foreground pt-1">
            <div className="flex items-center gap-2">
              <Heart className="w-3 h-3 text-pink-500" />
              <span>Social: {c.stats.social}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-3 h-3 text-blue-500" />
              <span>Strategy: {c.stats.strategy}</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-3 h-3 text-orange-500" />
              <span>Physical: {c.stats.physical}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-3 h-3 text-green-500" />
              <span>Deception: {c.stats.deception}</span>
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-light">Meet the Houseguests</h1>
              <p className="text-muted-foreground">Premiere night: intros and first impressions</p>
            </div>
          </div>
          <ScrollArea className="h-[520px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contestants.map(renderContestantCard)}
            </div>
          </ScrollArea>
          <Button variant="action" size="wide" className="mt-6" onClick={onContinue}>
            Begin Week 1
          </Button>
        </Card>
      </div>
    </div>
  );
}
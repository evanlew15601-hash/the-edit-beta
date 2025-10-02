import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState, Contestant } from '@/types/game';
import { AIVotingStrategy } from '@/utils/aiVotingStrategy';
import { Target, Vote, MessageCircle, Shield, AlertTriangle } from 'lucide-react';

interface VotingIntelligencePanelProps {
  gameState: GameState;
}

export const VotingIntelligencePanel: React.FC<VotingIntelligencePanelProps> = ({ gameState }) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [pressureResult, setPressureResult] = useState<{
    name: string;
    target: string;
    reasoning: string;
    isLying: boolean;
    confidence: string;
  } | null>(null);

  const availableTargets = useMemo(
    () => gameState.contestants.filter(c => !c.isEliminated && c.name !== gameState.playerName),
    [gameState.contestants, gameState.playerName]
  );

  const targetNPC = useMemo(
    () => gameState.contestants.find(c => c.name === selectedTarget),
    [gameState.contestants, selectedTarget]
  );

  // Generate voting plans for all NPCs
  const votingPlans = useMemo(() => {
    return AIVotingStrategy.generateWeeklyVotingPlans(gameState);
  }, [gameState.currentDay, gameState.contestants]);

  const handlePressure = () => {
    if (!targetNPC) return;
    
    const shareableInfo = AIVotingStrategy.getShareableVotingInfo(targetNPC, gameState, votingPlans);
    const plan = votingPlans.get(targetNPC.name);
    
    setPressureResult({
      name: targetNPC.name,
      target: shareableInfo.target,
      reasoning: shareableInfo.reasoning,
      isLying: shareableInfo.isLying,
      confidence: plan ? `${plan.confidence}%` : 'Unknown'
    });
  };

  // Show voting overview for all NPCs
  const votingOverview = useMemo(() => {
    const overview: { [target: string]: number } = {};
    votingPlans.forEach((plan, voterName) => {
      if (plan.target === 'undecided') return;
      overview[plan.target] = (overview[plan.target] || 0) + 1;
    });
    return Object.entries(overview).sort((a, b) => b[1] - a[1]);
  }, [votingPlans]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Vote className="w-5 h-5 text-primary" />
        <h3 className="font-medium">Voting Intelligence</h3>
        <Badge variant="outline" className="text-[10px] ml-auto">Week {Math.floor((gameState.currentDay - 1) / 7) + 1}</Badge>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Ask houseguests about their voting plans. They may lie, deflect, or tell the truth based on trust and strategy.
      </p>

      {/* Voting Landscape Overview */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium">Voting Landscape</span>
        </div>
        <div className="bg-muted/40 rounded p-3 space-y-2">
          {votingOverview.length > 0 ? (
            votingOverview.map(([target, count]) => (
              <div key={target} className="flex items-center justify-between text-sm">
                <span className={target === gameState.playerName ? 'text-destructive font-medium' : ''}>
                  {target}
                </span>
                <Badge variant={target === gameState.playerName ? 'destructive' : 'outline'}>
                  {count} {count === 1 ? 'vote' : 'votes'}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No clear targets yet</p>
          )}
        </div>
      </div>

      {/* Press a Specific Player */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Press Someone</span>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm">Select Person</label>
          <Select value={selectedTarget} onValueChange={setSelectedTarget}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a houseguest..." />
            </SelectTrigger>
            <SelectContent className="z-50 bg-popover text-popover-foreground">
              {availableTargets.map((contestant) => (
                <SelectItem key={contestant.id} value={contestant.name}>
                  {contestant.name} - {contestant.publicPersona}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          variant="action" 
          onClick={handlePressure} 
          disabled={!selectedTarget}
          className="w-full"
        >
          <Target className="w-4 h-4 mr-2" />
          Ask About Their Vote
        </Button>
      </div>

      {/* Result Display */}
      {pressureResult && (
        <ScrollArea className="max-h-48 border-t border-border pt-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{pressureResult.name}'s Response</span>
              {pressureResult.isLying && (
                <Badge variant="destructive" className="text-[10px]">
                  May be lying
                </Badge>
              )}
            </div>
            
            <div className="bg-muted/40 rounded p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium">
                  Target: {pressureResult.target === gameState.playerName ? 'YOU' : pressureResult.target}
                </span>
              </div>
              
              <p className="text-sm text-foreground">
                "{pressureResult.reasoning}"
              </p>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Confidence: {pressureResult.confidence}</span>
                {!pressureResult.isLying && (
                  <Badge variant="outline" className="text-[9px]">Seems honest</Badge>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      )}

      {/* Alliance Version Hint */}
      {gameState.alliances.length > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded">
            <Shield className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground">
              Use Alliance Meetings to coordinate votes with trusted members
            </p>
          </div>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground space-y-1 bg-muted/30 rounded p-2">
        <p>💡 NPCs decide votes at week start based on threats, relationships, and game phase</p>
        <p>🎭 They may lie if they don't trust you or are targeting an ally</p>
        <p>📊 Use this intel to build counter-strategies and flip votes</p>
      </div>
    </Card>
  );
};

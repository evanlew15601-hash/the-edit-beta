import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { GameState, Contestant } from '@/types/game';
import { VoteDeclarationCard } from './VoteDeclarationCard';
import { askForEliminationVote } from '@/utils/voteInferenceEngine';

interface EliminationVoteAskPanelProps {
  gameState: GameState;
}

export const EliminationVoteAskPanel: React.FC<EliminationVoteAskPanelProps> = ({ gameState }) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [result, setResult] = useState<{
    name: string;
    declaredTarget: string;
    reasoning: string;
    honesty: 'truth' | 'lie' | 'maybe';
    explanation?: string;
    likelyTarget?: string;
  } | null>(null);

  const availableTargets = useMemo(
    () => gameState.contestants.filter(c => !c.isEliminated && c.name !== gameState.playerName),
    [gameState.contestants, gameState.playerName]
  );

  const targetNPC: Contestant | undefined = useMemo(
    () => gameState.contestants.find(c => c.name === selectedTarget),
    [gameState.contestants, selectedTarget]
  );

  const canAsk = !!selectedTarget;

  const handleAsk = () => {
    if (!targetNPC) return;
    const { declaredTarget, reasoning, honesty, explanation, likelyTarget } = askForEliminationVote(targetNPC, gameState);
    setResult({
      name: targetNPC.name,
      declaredTarget,
      reasoning,
      honesty,
      explanation,
      likelyTarget
    });
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="font-medium">Ask How They’re Voting</h3>
        <Badge variant="outline" className="text-[10px] ml-auto">No meta gaming</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Ask a specific houseguest to state their elimination vote plan. We’ll show their declared target with a heuristic honesty label (truth/lie/maybe).
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium">Select Person</label>
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

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => { setSelectedTarget(''); setResult(null); }} className="flex-1">
          Reset
        </Button>
        <Button variant="action" onClick={handleAsk} disabled={!canAsk} className="flex-1">
          Ask for Vote
        </Button>
      </div>

      {result && (
        <ScrollArea className="max-h-64">
          <VoteDeclarationCard
            voterName={result.name}
            declaredTarget={result.declaredTarget}
            reasoning={result.reasoning}
            honesty={result.honesty}
            explanation={result.explanation}
            likelyTarget={result.likelyTarget}
          />
        </ScrollArea>
      )}
    </Card>
  );
};
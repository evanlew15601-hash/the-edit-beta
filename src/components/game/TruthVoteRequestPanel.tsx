import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { GameState, Contestant } from '@/types/game';
import { TruthVoteCard } from './TruthVoteCard';
import { getTruthVote } from '@/utils/truthVoteEngine';

interface TruthVoteRequestPanelProps {
  gameState: GameState;
}

export const TruthVoteRequestPanel: React.FC<TruthVoteRequestPanelProps> = ({ gameState }) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [statement, setStatement] = useState('');
  const [result, setResult] = useState<{ name: string; vote: 'truth' | 'lie' | 'maybe'; rationale?: string } | null>(null);

  const availableTargets = useMemo(
    () => gameState.contestants.filter(c => !c.isEliminated && c.name !== gameState.playerName),
    [gameState.contestants, gameState.playerName]
  );

  const targetNPC: Contestant | undefined = useMemo(
    () => gameState.contestants.find(c => c.name === selectedTarget),
    [gameState.contestants, selectedTarget]
  );

  const canRequest = selectedTarget && statement.trim().length >= 8;

  const handleRequestVote = () => {
    if (!targetNPC) return;
    const { vote, rationale } = getTruthVote(targetNPC, statement, gameState);
    setResult({ name: targetNPC.name, vote, rationale });
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="font-medium">Ask for a Truth Vote</h3>
        <Badge variant="outline" className="text-[10px] ml-auto">No meta gaming</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Ask a specific houseguest to vote whether a statement is truth, lie, or maybe. This is their read—not omniscient knowledge.
      </p>

      <div className="grid grid-cols-1 gap-3">
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

        <div className="space-y-2">
          <label className="text-sm font-medium">Statement</label>
          <Textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="Write the claim you want them to judge (e.g., 'I didn't leak the plan')"
            className="min-h-[88px]"
          />
          <div className="text-[11px] text-muted-foreground">
            Tip: Keep it specific. Avoid revealing others’ private info in public.
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => { setSelectedTarget(''); setStatement(''); setResult(null); }} className="flex-1">
          Reset
        </Button>
        <Button variant="action" onClick={handleRequestVote} disabled={!canRequest} className="flex-1">
          Ask for Vote
        </Button>
      </div>

      {result && (
        <ScrollArea className="max-h-64">
          <TruthVoteCard
            voterName={result.name}
            vote={result.vote}
            statement={statement}
            rationale={result.rationale}
          />
        </ScrollArea>
      )}
    </Card>
  );
};
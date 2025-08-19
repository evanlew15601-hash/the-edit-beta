import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { GameState } from '@/types/game';

interface PlayerVoteScreenProps {
  gameState: GameState;
  onSubmitVote: (choice: string) => void;
}

export const PlayerVoteScreen = ({ gameState, onSubmitVote }: PlayerVoteScreenProps) => {
  const [choice, setChoice] = useState<string>('');

  const active = gameState.contestants.filter(c => !c.isEliminated);
  const eligible = active.filter(c => c.name !== gameState.playerName && c.name !== gameState.immunityWinner);
  
  // Hide other votes unless shared via trust/alliances
  const hideOtherVotes = true;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="p-6">
          <h1 className="text-3xl font-light mb-2">Cast Your Vote</h1>
          <p className="text-muted-foreground mb-6">Choose the contestant you want to eliminate.</p>

          {gameState.immunityWinner && (
            <div className="mb-4 p-3 rounded border border-border bg-muted/50 text-sm">
              {gameState.immunityWinner} is immune this week.
            </div>
          )}

          <div className="grid gap-3">
            {eligible.map(c => (
              <label key={c.id} className={`flex items-center justify-between border border-border rounded p-3 cursor-pointer transition-colors ${choice === c.name ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                <div>
                  <div className="font-medium text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.publicPersona}</div>
                  {hideOtherVotes && (
                    <div className="text-xs text-surveillance-inactive mt-1">Vote intentions hidden</div>
                  )}
                </div>
                <input
                  type="radio"
                  name="player-vote"
                  value={c.name}
                  checked={choice === c.name}
                  onChange={() => setChoice(c.name)}
                  className="accent-primary"
                />
              </label>
            ))}
          </div>

          <Button
            variant="surveillance"
            size="wide"
            disabled={!choice}
            onClick={() => choice && onSubmitVote(choice)}
            className="mt-6"
          >
            Submit Vote
          </Button>
        </Card>
      </div>
    </div>
  );
};

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState } from '@/types/game';

interface AFPCardProps {
  gameState: GameState;
  onAFPVote: (choice: string) => void;
}

export const AFPCard = ({ gameState, onAFPVote }: AFPCardProps) => {
  const [voted, setVoted] = useState(false);
  const allContestants = gameState.contestants.map(c => c.name);

  const handleVote = (name: string) => {
    onAFPVote(name);
    setVoted(true);
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-light mb-2">America's Favorite Player</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Vote for the season's favorite. Your vote will be combined with AI audience voting based on edit perception and game performance.
      </p>
      <ScrollArea className="max-h-56 pr-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allContestants.map((name) => (
            <Button
              key={name}
              variant={voted ? 'disabled' : 'surveillance'}
              size="wide"
              onClick={() => !voted && handleVote(name)}
              disabled={voted}
            >
              {voted ? 'Vote Recorded' : `Vote: ${name}`}
            </Button>
          ))}
        </div>
      </ScrollArea>
      
      {voted && (
        <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded">
          <p className="text-sm text-primary">
            <strong>Vote submitted!</strong> AFP results will be revealed in the season recap.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Winner determined by edit perception, game performance, and audience voting.
          </p>
        </div>
      )}
    </Card>
  );
};

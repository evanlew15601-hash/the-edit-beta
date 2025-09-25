import { useState, useMemo } from 'react';
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
  // Optional preferences
  const [excludeWinner, setExcludeWinner] = useState(false);
  const [favorPositive, setFavorPositive] = useState(false);

  const candidates = useMemo(() => {
    let list = (Array.isArray(gameState.contestants) ? gameState.contestants : []).filter(Boolean);

    if (excludeWinner && gameState.gameWinner) {
      list = list.filter(c => c && c.name !== gameState.gameWinner);
    }

    // Favor positive personas (reorder only)
    if (favorPositive) {
      const positiveKeywords = ['Hero', 'Fan Favorite', 'Contender'];
      list = list
        .slice()
        .sort((a, b) => {
          const aName = (a?.name || '').toString();
          const bName = (b?.name || '').toString();
          const aPersona = (a?.publicPersona || '').toLowerCase();
          const bPersona = (b?.publicPersona || '').toLowerCase();
          const aPos = positiveKeywords.some(k => aPersona.includes(k.toLowerCase())) ? 1 : 0;
          const bPos = positiveKeywords.some(k => bPersona.includes(k.toLowerCase())) ? 1 : 0;
          if (aPos !== bPos) return bPos - aPos;
          return aName.localeCompare(bName);
        });
    } else {
      list = list.slice().sort((a, b) => (a?.name || '').toString().localeCompare((b?.name || '').toString()));
    }

    return list.map(c => c?.name || '').filter(Boolean);
  }, [gameState.contestants, gameState.gameWinner, excludeWinner, favorPositive]);

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

      <div className="flex items-center gap-4 mb-3 text-xs">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={excludeWinner}
            onChange={(e) => setExcludeWinner(e.target.checked)}
          />
          Exclude winner
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={favorPositive}
            onChange={(e) => setFavorPositive(e.target.checked)}
          />
          Favor positive personas in ordering
        </label>
      </div>

      <ScrollArea className="max-h-56 pr-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {candidates.map((name) => (
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

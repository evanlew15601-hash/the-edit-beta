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
  
  // Show lightweight hints when the player likely has insight (alliances or high trust)
  const playerAlliances = gameState.alliances.filter(a => a.members.includes(gameState.playerName));
  const hasInsight = playerAlliances.length > 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="p-6">
          <h1 className="text-3xl font-light mb-1">Eviction Night</h1>
          <p className="text-sm text-muted-foreground mb-1">Player Vote</p>
          <p className="text-sm text-muted-foreground mb-6">
            Choose the houseguest you want to evict. Your vote will be locked in once submitted.
          </p>

          {gameState.immunityWinner && (
            <div className="mb-4 p-3 rounded border border-border bg-muted/50 text-sm">
              {gameState.immunityWinner} is immune this week.
            </div>
          )}

          {eligible.length === 0 ? (
            <div className="p-4 border border-warning/20 bg-warning/10 rounded text-sm">
              No eligible targets to vote for this round. {gameState.immunityWinner ? `${gameState.immunityWinner} has immunity.` : ''}
            </div>
          ) : (
            <>
              <div className="grid gap-3">
            {eligible.map(c => {
              const sharedAlliance = playerAlliances.find(a => a.members.includes(c.name));
              const contestant = gameState.contestants.find(x => x.name === c.name);
              const rapport = contestant ? contestant.psychProfile.trustLevel : 0;

              // Predictive hint: likely alliance coordination target (non-binding)
              let allianceHint: string | null = null;
              try {
                const validTargets = eligible.map(e => e.name);
                // naive pick: highest suspicion among eligibles if shared alliance exists
                if (sharedAlliance) {
                  const ranked = validTargets
                    .map(name => {
                      const ct = gameState.contestants.find(cc => cc.name === name);
                      return { name, s: ct ? ct.psychProfile.suspicionLevel : 0 };
                    })
                    .sort((a, b) => b.s - a.s);
                  allianceHint = ranked[0]?.name || null;
                }
              } catch {}

              return (
                <label key={c.id} className={`flex items-center justify-between border border-border rounded p-3 cursor-pointer transition-colors ${choice === c.name ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                  <div>
                    <div className="font-medium text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.publicPersona}</div>
                    <div className="text-xs mt-1 flex flex-wrap gap-2">
                      {sharedAlliance && <span className="text-primary">Shared alliance</span>}
                      {!sharedAlliance && hasInsight && rapport > 60 && (
                        <span className="text-muted-foreground">High rapport</span>
                      )}
                      {!hasInsight && (
                        <span className="text-surveillance-inactive">Vote intentions hidden</span>
                      )}
                      {allianceHint && allianceHint !== c.name && sharedAlliance && (
                        <span className="text-accent">Alliance may target: {allianceHint}</span>
                      )}
                    </div>
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
              );
            })}
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
              {!choice && eligible.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Select a houseguest above to cast your vote.
                </p>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

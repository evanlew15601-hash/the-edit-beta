import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { GameState } from '@/types/game';

interface VotingDebugPanelProps {
  gameState: GameState;
  onAdvanceDay: () => void;
  onProceedToJuryVote: () => void;
  onProceedToFinaleAsJuror: () => void;
  onProceedToJuryVoteAsJuror: () => void;
  onGoToFinal3Vote: () => void;
  onContinueFromElimination: () => void;
  onToggleDebug: () => void;
  // New: phase-specific actions
  onSubmitPlayerVote?: (choice: string) => void;
  onSubmitFinal3Vote?: (choice: string) => void;
  onTieBreakResult?: (eliminated: string, winner1: string, winner2: string, method?: 'challenge' | 'fire_making' | 'random_draw') => void;
  onEndGame?: (winner: string, votes: { [juryMember: string]: string }, rationales?: { [juryMember: string]: string }) => void;
}

export const VotingDebugPanel: React.FC<VotingDebugPanelProps> = ({
  gameState,
  onAdvanceDay,
  onProceedToJuryVote,
  onProceedToFinaleAsJuror,
  onProceedToJuryVoteAsJuror,
  onGoToFinal3Vote,
  onContinueFromElimination,
  onToggleDebug,
}) => {
  if (!gameState.debugMode) return null;

  const active = gameState.contestants.filter(c => !c.isEliminated);
  const eliminated = gameState.contestants.filter(c => c.isEliminated);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[340px]">
      <Card className="p-4 shadow-xl border border-border bg-card/95 backdrop-blur-md rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[11px] text-muted-foreground">Developer Tools</div>
            <div className="text-xs text-muted-foreground">Phase</div>
            <div className="text-sm font-medium">{gameState.gamePhase}</div>
          </div>
          <Button variant="surveillance" size="sm" onClick={onToggleDebug} aria-label="Toggle Debug HUD">
            {gameState.debugMode ? 'Hide Debug' : 'Show Debug'}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
          <div className="p-2 border rounded">
            <div className="text-muted-foreground">Day</div>
            <div className="font-medium">{gameState.currentDay}</div>
          </div>
          <div className="p-2 border rounded">
            <div className="text-muted-foreground">Next Elim Day</div>
            <div className="font-medium">{gameState.nextEliminationDay}</div>
          </div>
          <div className="p-2 border rounded">
            <div className="text-muted-foreground">Active</div>
            <div className="font-medium">{active.length}</div>
          </div>
          <div className="p-2 border rounded">
            <div className="text-muted-foreground">Eliminated</div>
            <div className="font-medium">{eliminated.length}</div>
          </div>
          <div className="p-2 border rounded col-span-2">
            <div className="text-muted-foreground">Immunity</div>
            <div className="font-medium">{gameState.immunityWinner || 'None'}</div>
          </div>
          <div className="p-2 border rounded col-span-2">
            <div className="text-muted-foreground">Jury Members</div>
            <div className="font-medium">
              {(gameState.juryMembers || []).join(', ') || 'None'}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button variant="action" onClick={onAdvanceDay} className="w-full">
            Advance Day
          </Button>
          <Button variant="action" onClick={onProceedToJuryVote} className="w-full">
            Proceed to Jury Vote (Player Finalist)
          </Button>
          <Button variant="secondary" onClick={onProceedToFinaleAsJuror} className="w-full">
            Proceed to Finale (Player as Juror)
          </Button>
          <Button variant="secondary" onClick={onProceedToJuryVoteAsJuror} className="w-full">
            Direct to Jury Vote (Player as Juror)
          </Button>
          <Button variant="outline" onClick={onGoToFinal3Vote} className="w-full">
            Go to Final 3 Vote (Test)
          </Button>
          <Button variant="surveillance" onClick={() => onContinueFromElimination()} className="w-full">
            Continue From Elimination
          </Button>
          <Button
            variant="critical"
            onClick={() => window.dispatchEvent(new Event('testForceElimination'))}
            className="w-full"
          >
            Force Player Elimination (Test)
          </Button>

          {/* Phase-specific quick actions */}
          {gameState.gamePhase === 'player_vote' && onSubmitPlayerVote && (
            <div className="mt-2 border-t border-border pt-2">
              <div className="text-xs text-muted-foreground mb-1">Quick Player Vote</div>
              {nonPlayerActive.map(c => (
                <Button
                  key={c.name}
                  variant="outline"
                  size="sm"
                  onClick={() => onSubmitPlayerVote(c.name)}
                  className="w-full mb-1"
                >
                  Vote: {c.name}
                </Button>
              ))}
            </div>
          )}

          {gameState.gamePhase === 'final_3_vote' && (onSubmitFinal3Vote || onTieBreakResult) && (
            <div className="mt-2 border-t border-border pt-2">
              <div className="text-xs text-muted-foreground mb-1">Quick Final 3 Vote</div>
              {/* Submit vote against one of the non-player finalists */}
              {nonPlayerActive.map(c => (
                <Button
                  key={`f3-${c.name}`}
                  variant="outline"
                  size="sm"
                  onClick={() => onSubmitFinal3Vote && onSubmitFinal3Vote(c.name)}
                  className="w-full mb-1"
                >
                  Vote Out: {c.name}
                </Button>
              ))}
              {/* Simple tie-break helpers: pick a winner among non-player actives */}
              {onTieBreakResult && nonPlayerActive.length >= 2 && (
                <div className="mt-2">
                  <div className="text-[11px] text-muted-foreground mb-1">Tie-break helpers</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const winners = nonPlayerActive.slice(0, 2).map(c => c.name);
                      const eliminated = active.find(c => c.name !== gameState.playerName && !winners.includes(c.name))?.name || nonPlayerActive[2]?.name || '';
                      onTieBreakResult(eliminated || '', winners[0], winners[1], 'challenge');
                    }}
                    className="w-full"
                  >
                    Tie-break: Advance first two non-player actives
                  </Button>
                </div>
              )}
            </div>
          )}

          {gameState.gamePhase === 'jury_vote' && onEndGame && (
            <div className="mt-2 border-t border-border pt-2">
              <div className="text-xs text-muted-foreground mb-1">Quick Jury Result</div>
              {active.map(c => (
                <Button
                  key={`jury-${c.name}`}
                  variant="outline"
                  size="sm"
                  onClick={() => onEndGame && onEndGame(c.name, {}, {})}
                  className="w-full mb-1"
                >
                  Set Winner: {c.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 text-[11px] text-muted-foreground">
          Shortcut: Press Shift+D to toggle this panel.
        </div>
      </Card>
    </div>
  );
};
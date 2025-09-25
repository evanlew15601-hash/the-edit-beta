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
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="p-4 shadow-lg border-primary/30 bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-muted-foreground">Phase</div>
            <div className="text-sm font-medium">{gameState.gamePhase}</div>
          </div>
          <Button variant="surveillance" size="sm" onClick={onToggleDebug}>
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
        </div>

        <div className="mt-3 text-[11px] text-muted-foreground">
          Shortcut: Press Shift+D to toggle this panel.
        </div>
      </Card>
    </div>
  );
};
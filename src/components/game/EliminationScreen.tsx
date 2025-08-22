import { Button } from '@/components/ui/enhanced-button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState } from '@/types/game';

interface EliminationScreenProps {
  gameState: GameState;
  onContinue: () => void;
}

export const EliminationScreen = ({ gameState, onContinue }: EliminationScreenProps) => {
  const latestElimination = gameState.votingHistory[gameState.votingHistory.length - 1];
  const eliminatedContestant = gameState.contestants.find(c => c.name === latestElimination?.eliminated);
  const remainingCount = gameState.contestants.filter(c => !c.isEliminated).length;

  if (!latestElimination) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Error loading elimination data</p>
      </div>
    );
  }

  const isPlayerEliminated = latestElimination.eliminated === gameState.playerName;

  return (
    <div className="min-h-screen bg-background">
      <ScrollArea className="h-screen">
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-8 pr-4">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-light tracking-wide text-foreground">
            ELIMINATION CEREMONY
          </h1>
          <div className="w-24 h-px bg-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground font-light tracking-wider uppercase">
            Day {gameState.currentDay}
          </p>
        </div>

        {/* Elimination Reveal */}
        <Card className="p-8 text-center space-y-6">
          {isPlayerEliminated ? (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-destructive/20 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 bg-destructive rounded-full"></div>
              </div>
              <h2 className="text-2xl font-light text-destructive">
                Your journey ends here
              </h2>
              <p className="text-foreground leading-relaxed">
                {latestElimination.reason}
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded p-4">
                <p className="text-sm text-destructive">
                  Game Over. Your final edit will be revealed in the recap.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-surveillance-active/20 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 bg-surveillance-active rounded-full animate-pulse"></div>
              </div>
              <h2 className="text-2xl font-light text-foreground">
                {eliminatedContestant?.name} has been eliminated
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {latestElimination.reason}
              </p>
              <p className="text-sm text-surveillance-active">
                {remainingCount} contestants remaining
              </p>
            </div>
          )}
        </Card>

        {/* Tie-break Event (if any) */}
        {latestElimination.tieBreak && (
          <Card className="p-6">
            <h3 className="text-xl font-light mb-4">Tie-Break Resolution</h3>
            <div className="space-y-2 text-sm">
              {latestElimination.tieBreak.log.map((line: string, idx: number) => (
                <p key={idx} className="text-foreground">• {line}</p>
              ))}
            </div>
            {latestElimination.tieBreak.revote && (
              <div className="mt-4">
                <h4 className="font-medium mb-2 text-muted-foreground">Revote Breakdown</h4>
                <div className="space-y-1 text-sm">
                  {Object.entries(latestElimination.tieBreak.revote.counts).map(([name, count]) => (
                    <div key={name} className="flex justify-between">
                      <span>{name}</span>
                      <span className="text-muted-foreground">{count} votes</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Voting Summary */}
        <Card className="p-6">
          <h3 className="text-xl font-light mb-4">Elimination Summary</h3>
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-2xl font-light text-destructive">{latestElimination.eliminated}</p>
              <p className="text-sm text-muted-foreground">has been eliminated</p>
              <p className="text-lg font-medium">by house vote</p>
            </div>
            
            {/* Show votes only if player was eliminated */}
            {isPlayerEliminated ? (
              <div className="space-y-3">
                <h4 className="font-medium text-center">How the house voted:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(latestElimination.votes).map(([voter, target]) => (
                    <div key={voter} className="flex justify-between border border-border rounded p-2">
                      <span className="text-foreground">{voter}</span>
                      <span className={target === gameState.playerName ? 'text-destructive' : 'text-muted-foreground'}>
                        → {target}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bg-destructive/10 border border-destructive/20 rounded p-3 text-center">
                  <p className="text-xs text-destructive">
                    Now that you're eliminated, you can see how everyone voted
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-muted/50 border border-border rounded p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Individual votes remain secret until finale or elimination
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Eliminated Contestant Info */}
        {!isPlayerEliminated && eliminatedContestant && (
          <Card className="p-6">
            <h3 className="text-xl font-light mb-4">Contestant Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">{eliminatedContestant.name}</h4>
                <p className="text-sm text-muted-foreground mb-3">{eliminatedContestant.publicPersona}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Days Survived:</span>
                    <span className="text-foreground">{eliminatedContestant.eliminationDay}</span>
                  </div>
                  
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Final Disposition</h4>
                <p className="text-sm text-foreground">
                  {eliminatedContestant.psychProfile.disposition.join(', ')}
                </p>
                {eliminatedContestant.isMole && (
                  <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded">
                    <p className="text-sm text-destructive font-medium">
                      SECRET REVEALED: {eliminatedContestant.name} was the mole
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Continue Button */}
        <div className="text-center pt-6">
          <Button 
            variant="surveillance" 
            size="wide" 
            onClick={onContinue}
          >
            {isPlayerEliminated ? 'Restart Game' : 'Continue Game'}
          </Button>
        </div>
        </div>
      </ScrollArea>
    </div>
  );
};
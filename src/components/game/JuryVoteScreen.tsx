import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Progress } from '@/components/ui/progress';
import { Crown, Vote, Users } from 'lucide-react';
import { GameState, Contestant } from '@/types/game';

interface JuryVoteScreenProps {
  gameState: GameState;
  playerSpeech?: string;
  onGameEnd: (winner: string, votes: { [juryMember: string]: string }) => void;
}

export const JuryVoteScreen = ({ gameState, playerSpeech, onGameEnd }: JuryVoteScreenProps) => {
  const [votes, setVotes] = useState<{ [juryMember: string]: string }>({});
  const [winner, setWinner] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [voteStable, setVoteStable] = useState(false); // FIXED: Prevent vote flickering
  const [deliberationProgress, setDeliberationProgress] = useState(0);

  // Pacing controls
  const RESULT_DELAY_MS = 1500;
  const REVEAL_INTERVAL_MS = 700;
  const PROGRESS_STEP = 3;

  // Animated reveal of jury votes
  const [revealedCount, setRevealedCount] = useState(0);

  const finalTwo = gameState.contestants.filter(c => !c.isEliminated);
  const juryMembers = gameState.contestants.filter(c => 
    c.isEliminated && 
    gameState.juryMembers?.includes(c.name)
  );
  
  // Check if player is eliminated and in jury
  const playerContestant = gameState.contestants.find(c => c.name === gameState.playerName);
  const playerEliminated = gameState.isPlayerEliminated || playerContestant?.isEliminated || false;
  const isPlayerInJury = playerEliminated && gameState.juryMembers?.includes(gameState.playerName);
  
  console.log('JuryVoteScreen - Final two:', finalTwo.map(c => c.name));
  console.log('JuryVoteScreen - All contestants:', gameState.contestants.map(c => ({ name: c.name, eliminated: c.isEliminated, day: c.eliminationDay })));
  console.log('JuryVoteScreen - Jury members from gameState:', gameState.juryMembers);
  console.log('JuryVoteScreen - Filtered jury members:', juryMembers.map(j => j.name));
  console.log('JuryVoteScreen - Total jury members:', juryMembers.length);
  console.log('JuryVoteScreen - Player eliminated?', playerEliminated);
  console.log('JuryVoteScreen - isPlayerEliminated flag?', gameState.isPlayerEliminated);
  console.log('JuryVoteScreen - Player in jury?', isPlayerInJury);
  
  useEffect(() => {
    // Only simulate votes once, and do not include player's vote if they're in the jury.
    if (voteStable) return;

    const juryVotes: { [juryMember: string]: string } = {};

    juryMembers.forEach(juryMember => {
      // If the player is in the jury, skip their vote until they choose.
      if (isPlayerInJury && juryMember.name === gameState.playerName) return;

      // Calculate vote probability for each finalist
      const finalTwoScores = finalTwo.map(finalist => {
        let score = 50; // Base score

        // Relationship with jury member
        const memories = juryMember.memory.filter(m =>
          m.participants.includes(finalist.name)
        );

        const relationshipScore = memories.reduce((sum, memory) => {
          return sum + memory.emotionalImpact;
        }, 0);

        score += relationshipScore * 5;

        // Speech impact (if it was the player finalist)
        if (finalist.name === gameState.playerName && playerSpeech) {
          const speechImpact = playerSpeech.length > 100 ? 15 : 5;
          score += speechImpact;
        }

        // Random factor for unpredictability (applied once)
        score += (Math.random() - 0.5) * 20;

        return { name: finalist.name, score };
      });

      // Vote for highest score
      const topChoice = finalTwoScores.reduce((prev, current) =>
        current.score > prev.score ? current : prev
      );

      juryVotes[juryMember.name] = topChoice.name;
    });

    setVotes(juryVotes);

    // If the player is not in the jury, all votes are in, mark stable.
    if (!isPlayerInJury) {
      setVoteStable(true);
    }
  }, [finalTwo, juryMembers, gameState.playerName, playerSpeech, voteStable, isPlayerInJury]);

  // Visual deliberation progress indicator
  useEffect(() => {
    if (showResults) {
      setDeliberationProgress(100);
      return;
    }

    // If player is in the jury and hasn't voted, progress caps at 80% until they vote.
    const awaitingPlayer = isPlayerInJury && !votes[gameState.playerName];
    const target = awaitingPlayer ? 80 : 100;

    const interval = setInterval(() => {
      setDeliberationProgress(prev => {
        if (prev >= target) return prev;
        return Math.min(prev + PROGRESS_STEP, target);
      });
    }, 120);

    return () => clearInterval(interval);
  }, [isPlayerInJury, votes, gameState.playerName, showResults, PROGRESS_STEP]);

  // Once votes are stable, compute the winner and show results once.
  useEffect(() => {
    if (!voteStable || showResults) return;

    const voteCounts: { [finalist: string]: number } = {};
    finalTwo.forEach(f => (voteCounts[f.name] = 0));

    Object.values(votes).forEach(vote => {
      if (voteCounts[vote] !== undefined) voteCounts[vote]++;
    });

    const winnerName = Object.entries(voteCounts).reduce((prev, current) =>
      current[1] > prev[1] ? current : prev
    )[0];

    setWinner(winnerName);

    // Show results after a brief delay for dramatic effect
    const timer = setTimeout(() => setShowResults(true), RESULT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [voteStable, votes, finalTwo, showResults, RESULT_DELAY_MS]);

  // Start animated per-juror reveal once results are shown
  useEffect(() => {
    if (!showResults) {
      setRevealedCount(0);
      return;
    }

    // Reveal one juror at a time
    const interval = setInterval(() => {
      setRevealedCount(prev => {
        const next = prev + 1;
        if (next >= juryMembers.length) {
          clearInterval(interval);
          return juryMembers.length;
        }
        return next;
      });
    }, REVEAL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [showResults, juryMembers.length, REVEAL_INTERVAL_MS]);

  const getVoteCount = (finalist: string, revealedOnly?: boolean) => {
    if (!revealedOnly) {
      return Object.values(votes).filter(vote => vote === finalist).length;
    }
    // Count only revealed juror votes
    const revealedJurors = juryMembers.slice(0, revealedCount).map(j => j.name);
    return revealedJurors.reduce((sum, jurorName) => {
      return votes[jurorName] === finalist ? sum + 1 : sum;
    }, 0);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Vote className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-light">Jury Vote</h1>
              <p className="text-muted-foreground">The jury decides the winner</p>
            </div>
          </div>

          {!showResults ? (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-2xl font-light mb-4">
                  {isPlayerInJury ? "Cast Your Jury Vote" : "Jury Deliberation"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {isPlayerInJury 
                    ? "As a jury member, you now vote for who should win the game..."
                    : "The jury is now deliberating and voting for the winner..."
                  }
                </p>
                
                {/* Player Jury Vote Section */}
                {isPlayerInJury && !votes[gameState.playerName] && (
                  <Card className="p-4 border-primary/20 bg-primary/10 mb-6">
                    <h3 className="font-medium mb-3">Your Jury Vote</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Vote for who you think deserves to win based on their gameplay, strategy, and speeches.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {finalTwo.map(finalist => (
                        <Button
                          key={finalist.name}
                          variant="surveillance"
                          onClick={() => {
                            setVotes(prev => {
                              const updated = { ...prev, [gameState.playerName]: finalist.name };
                              // When all jury members (including player) have voted, lock votes.
                              if (Object.keys(updated).length === juryMembers.length) {
                                setVoteStable(true);
                              }
                              return updated;
                            });
                          }}
                          className="h-auto p-4"
                                         >
                          <div className="text-center">
                            <div className="font-medium">{finalist.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {finalist.publicPersona}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </Card>
                )}
                
                {votes[gameState.playerName] && (
                  <Card className="p-4 border-primary/20 bg-primary/10 mb-6">
                    <p className="text-sm">
                      <strong>Your vote:</strong> You voted for {votes[gameState.playerName]} to win.
                    </p>
                  </Card>
                )}
              </Card>
              
              <div className="text-center space-y-6">
                <div className="bg-primary/10 border border-primary/20 rounded p-6">
                  <Users className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-medium mb-2">
                    {isPlayerInJury ? "Other jury members are deliberating..." : "The jury is deliberating..."}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Each jury member is considering the finalists' games and casting their vote.
                  </p>

                  <div className="space-y-2">
                    <Progress value={deliberationProgress} />
                    <div className="text-xs text-muted-foreground">
                      {isPlayerInJury && !votes[gameState.playerName]
                        ? `Awaiting your vote to complete deliberations (${deliberationProgress}%)`
                        : `Deliberation progress: ${deliberationProgress}%`}
                    </div>
                  </div>
                </div>
              
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {finalTwo.map(finalist => (
                    <Card key={finalist.id} className="p-4">
                      <div className={`font-medium text-center ${
                        finalist.name === gameState.playerName ? 'text-primary' : ''
                      }`}>
                        {finalist.name}
                        {finalist.name === gameState.playerName && ' (You)'}
                      </div>
                      <div className="text-sm text-muted-foreground text-center">
                        {finalist.publicPersona}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="font-medium mb-4">Jury Votes</h3>
                <div className="space-y-3">
                  {/* Animated per-juror reveal */}
                  {juryMembers.map((jury, idx) => {
                    const revealed = idx < revealedCount;
                    return (
                      <div
                        key={jury.id}
                        className={`flex justify-between items-center p-3 border rounded transition-colors ${
                          jury.name === gameState.playerName ? 'border-primary/20 bg-primary/10' : 'border-border'
                        }`}
                      >
                        <span className={`font-medium ${jury.name === gameState.playerName ? 'text-primary' : ''}`}>
                          {jury.name}{jury.name === gameState.playerName ? ' (You)' : ''}
                        </span>
                        <span className={`font-medium ${revealed ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {revealed ? `voted for ${votes[jury.name]}` : 'vote sealed...'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-medium mb-4">Final Vote Count</h3>
                <div className="space-y-3">
                  {finalTwo.map(finalist => (
                    <div key={finalist.id} className="flex justify-between items-center p-3 border border-border rounded">
                      <span className={`font-medium ${
                        finalist.name === gameState.playerName ? 'text-primary' : ''
                      }`}>
                        {finalist.name}
                        {finalist.name === gameState.playerName && ' (You)'}
                      </span>
                      <span className="font-medium">
                        {getVoteCount(finalist.name, true)} votes
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className={`p-6 text-center ${
                winner === gameState.playerName 
                  ? 'bg-primary/10 border-primary/20' 
                  : 'bg-muted/50'
              }`}>
                <Crown className="w-16 h-16 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-light mb-2">
                  {winner === gameState.playerName ? 'Congratulations!' : `${winner} Wins!`}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {winner === gameState.playerName 
                    ? 'You have won the game! Your strategy and social gameplay impressed the jury.'
                    : `${winner} has been crowned the winner by the jury vote.`
                  }
                </p>
                <div className="text-lg font-medium mb-6">
                  Final Score: {getVoteCount(winner, true)} - {getVoteCount(finalTwo.find(f => f.name !== winner)?.name || '', true)}
                </div>
                <Button
                  variant="action"
                  onClick={() => onGameEnd(winner, votes)}
                  className="w-full"
                  disabled={revealedCount < juryMembers.length}
                >
                  View Game Summary
                </Button>
              </Card>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
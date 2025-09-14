import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { GameState } from '@/types/game';
import { Crown, Users, Trophy } from 'lucide-react';

interface Final3VoteScreenProps {
  gameState: GameState;
  onSubmitVote: (choice: string) => void;
  onTieBreakResult: (eliminated: string, winner1: string, winner2: string) => void;
}

export const Final3VoteScreen = ({ gameState, onSubmitVote, onTieBreakResult }: Final3VoteScreenProps) => {
  const [choice, setChoice] = useState<string>('');
  const [showingResults, setShowingResults] = useState(false);
  const [voteResults, setVoteResults] = useState<{ [name: string]: number }>({});
  const [tieBreakActive, setTieBreakActive] = useState(false);
  const [challengeResults, setChallengeResults] = useState<{ name: string; time: number }[]>([]);

  // Check if player is still active in Final 3
  const finalThree = gameState.contestants.filter(c => !c.isEliminated);
  const playerStillActive = finalThree.some(c => c.name === gameState.playerName);
  const eligible = finalThree.filter(c => c.name !== gameState.playerName);
  
  console.log('Final3VoteScreen - Final three contestants:', finalThree.map(c => c.name));
  console.log('Final3VoteScreen - Player still active?', playerStillActive);
  console.log('Final3VoteScreen - Eligible for elimination:', eligible.map(c => c.name));

  // If player is not active, don't show voting screen (should have been eliminated before Final 3)
  if (!playerStillActive) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="p-6 text-center">
            <h1 className="text-3xl font-light mb-4">Final 3 Vote</h1>
            <div className="bg-destructive/10 border border-destructive/20 rounded p-4">
              <p className="text-destructive">
                Error: Player is not in the Final 3. This screen should not be shown.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Remaining contestants: {finalThree.map(c => c.name).join(', ')}
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (showingResults && !tieBreakActive) {
      // Simulate AI votes
      const votes: { [name: string]: number } = {};
      finalThree.forEach(c => votes[c.name] = 0);

      // Add player vote
      if (choice) {
        votes[choice]++;
      }

      // BALANCED: Generate AI votes with less player bias
      finalThree.filter(c => c.name !== gameState.playerName).forEach(voter => {
        const targets = finalThree.filter(t => t.name !== voter.name);
        
        // Score each target based on relationships
        const scores = targets.map(target => {
          let score = 50;
          
          // Check relationships - reduced impact
          const memories = voter.memory.filter(m => 
            m.participants.includes(target.name) && m.day >= gameState.currentDay - 14
          );
          
          const relationshipScore = memories.reduce((sum, memory) => {
            return sum + (memory.emotionalImpact * (memory.content.includes('betrayal') ? -1.5 : 0.5));
          }, 0);
          
          score += relationshipScore * 2; // Reduced from 3
          
          // REDUCED bias against player
          if (target.name === gameState.playerName) {
            score += 15; // Boost player score to reduce elimination bias
          }
          
          // Add randomness - increased for more unpredictability
          score += (Math.random() - 0.5) * 40;
          
          return { name: target.name, score };
        });
        
        // Vote for lowest score (want to eliminate)
        const target = scores.reduce((prev, current) => 
          current.score < prev.score ? current : prev
        );
        
        votes[target.name]++;
      });

      setVoteResults(votes);

      // Check for ties
      const voteValues = Object.values(votes);
      const maxVotes = Math.max(...voteValues);
      const playersWithMaxVotes = Object.entries(votes).filter(([_, v]) => v === maxVotes);

      if (playersWithMaxVotes.length > 1 && voteValues.every(v => v === 1)) {
        // 1-1-1 tie - trigger challenge
        setTieBreakActive(true);
        
        // Generate challenge results
        const results = finalThree.map(contestant => ({
          name: contestant.name,
          time: Math.random() * 300 + 180 // 3-8 minute times
        })).sort((a, b) => a.time - b.time);
        
        setChallengeResults(results);
        
        // Top 2 advance, last is eliminated
        setTimeout(() => {
          onTieBreakResult(results[2].name, results[0].name, results[1].name);
        }, 4000);
      }
    }
  }, [showingResults, choice, gameState, finalThree, tieBreakActive, onTieBreakResult]);

  const handleSubmitVote = () => {
    if (choice) {
      onSubmitVote(choice);
      setShowingResults(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (tieBreakActive) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-light">Tie-Break Challenge</h1>
                <p className="text-muted-foreground">Obstacle course challenge determines final 2</p>
              </div>
            </div>

            <div className="text-center space-y-6">
              <div className="bg-primary/10 border border-primary/20 rounded p-6">
                <h3 className="text-xl font-medium mb-2">1-1-1 Vote Tie!</h3>
                <p className="text-muted-foreground">
                  Since all three contestants received one vote each, they must compete in 
                  a physical challenge. The two fastest times advance to the final 2.
                </p>
              </div>

              {challengeResults.length > 0 && (
                <Card className="p-6">
                  <h3 className="font-medium mb-4">Challenge Results</h3>
                  <div className="space-y-3">
                    {challengeResults.map((result, index) => (
                      <div 
                        key={result.name} 
                        className={`flex justify-between items-center p-3 border rounded ${
                          index < 2 ? 'border-primary/20 bg-primary/10' : 'border-destructive/20 bg-destructive/10'
                        }`}
                      >
                        <span className={`font-medium ${
                          result.name === gameState.playerName ? 'text-primary' : ''
                        }`}>
                          {result.name}
                          {result.name === gameState.playerName && ' (You)'}
                        </span>
                        <div className="text-right">
                          <div className="font-medium">{formatTime(result.time)}</div>
                          <div className={`text-sm ${
                            index < 2 ? 'text-primary' : 'text-destructive'
                          }`}>
                            {index < 2 ? 'Advances to Final 2' : 'Eliminated'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (showingResults) {
    const maxVotes = Math.max(...Object.values(voteResults));
    const eliminated = Object.entries(voteResults).find(([_, votes]) => votes === maxVotes)?.[0];

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Crown className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-light">Final 3 Vote Results</h1>
                <p className="text-muted-foreground">The final 2 has been decided</p>
              </div>
            </div>

            <Card className="p-6 mb-6">
              <h3 className="font-medium mb-4">Vote Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(voteResults).map(([name, votes]) => (
                  <div key={name} className="flex justify-between items-center p-3 border border-border rounded">
                    <span className={`font-medium ${
                      name === gameState.playerName ? 'text-primary' : ''
                    }`}>
                      {name}
                      {name === gameState.playerName && ' (You)'}
                    </span>
                    <span className="font-medium">
                      {votes} vote{votes !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className={`p-6 text-center ${
              eliminated === gameState.playerName 
                ? 'bg-destructive/10 border-destructive/20' 
                : 'bg-primary/10 border-primary/20'
            }`}>
              {eliminated === gameState.playerName ? (
                <div>
                  <h2 className="text-2xl font-light mb-2 text-destructive">
                    You have been eliminated
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Your journey ends at 3rd place. You'll now join the jury to help decide the winner.
                  </p>
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-light mb-2">
                    {eliminated} has been eliminated
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    You've made it to the final 2! Prepare for finale speeches and the jury vote.
                  </p>
                </div>
              )}
            </Card>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-light">Final 3 Vote</h1>
              <p className="text-muted-foreground">Vote to eliminate one contestant</p>
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded p-4 mb-6">
            <p className="text-sm">
              <strong>Final 3 Rules:</strong> Each contestant votes to eliminate one other contestant. 
              If there's a 2-1 vote, the contestant with 2 votes is eliminated. 
              If there's a 1-1-1 tie, all three compete in a physical challenge - 
              the two fastest advance to the final 2.
            </p>
          </div>

          <div className="grid gap-3">
            {eligible.map(c => (
              <label 
                key={c.id} 
                className={`flex items-center justify-between border border-border rounded p-3 cursor-pointer transition-colors ${
                  choice === c.name ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
              >
                <div>
                  <div className="font-medium text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.publicPersona}</div>
                </div>
                <input
                  type="radio"
                  name="final3-vote"
                  value={c.name}
                  checked={choice === c.name}
                  onChange={() => setChoice(c.name)}
                  className="accent-primary"
                />
              </label>
            ))}
          </div>

          <Button
            variant="action"
            size="wide"
            disabled={!choice}
            onClick={handleSubmitVote}
            className="mt-6"
          >
            Cast Final Vote
          </Button>
        </Card>
      </div>
    </div>
  );
};
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
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

  const finalTwo = gameState.contestants.filter(c => !c.isEliminated);
  const juryMembers = gameState.contestants.filter(c => 
    c.isEliminated && 
    gameState.juryMembers?.includes(c.name)
  );
  
  // Only auto-advance to final 2 if the player was eliminated when jury phase started
  const playerEliminated = gameState.contestants.find(c => c.name === gameState.playerName)?.isEliminated;
  if (playerEliminated && finalTwo.length > 2) {
    // Simulate rapid eliminations to get to final 2 when player is watching from jury
    const autoEliminated = finalTwo.slice(2); // Everyone except first 2
    autoEliminated.forEach(contestant => {
      contestant.isEliminated = true;
      contestant.eliminationDay = gameState.currentDay;
    });
  }

  useEffect(() => {
    // Simulate jury voting based on relationships and speeches
    const juryVotes: { [juryMember: string]: string } = {};
    
    juryMembers.forEach(juryMember => {
      // Calculate vote probability for each finalist
      const finalTwoScores = finalTwo.map(finalist => {
        let score = 50; // Base score
        
        // Relationship with jury member
        const memories = juryMember.memory.filter(m => 
          m.participants.includes(finalist.name === gameState.playerName ? gameState.playerName : finalist.name)
        );
        
        const relationshipScore = memories.reduce((sum, memory) => {
          return sum + memory.emotionalImpact;
        }, 0);
        
        score += relationshipScore * 5;
        
        // Speech impact (if it was the player)
        if (finalist.name === gameState.playerName && playerSpeech) {
          const speechImpact = playerSpeech.length > 100 ? 15 : 5;
          score += speechImpact;
        }
        
        // Random factor for unpredictability
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
    
    // Determine winner
    const voteCounts: { [finalist: string]: number } = {};
    finalTwo.forEach(f => voteCounts[f.name] = 0);
    
    Object.values(juryVotes).forEach(vote => {
      voteCounts[vote]++;
    });
    
    const winnerName = Object.entries(voteCounts).reduce((prev, current) => 
      current[1] > prev[1] ? current : prev
    )[0];
    
    setWinner(winnerName);
    
    // Show results after a delay
    setTimeout(() => setShowResults(true), 2000);
  }, [finalTwo, juryMembers, gameState.playerName, playerSpeech]);

  const getVoteCount = (finalist: string) => {
    return Object.values(votes).filter(vote => vote === finalist).length;
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
            <div className="text-center space-y-6">
              <div className="bg-primary/10 border border-primary/20 rounded p-6">
                <Users className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">
                  The jury is deliberating...
                </h3>
                <p className="text-muted-foreground">
                  Each jury member is considering the finalists' games and casting their vote.
                </p>
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
          ) : (
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="font-medium mb-4">Jury Votes</h3>
                <div className="space-y-3">
                  {juryMembers.map(jury => (
                    <div key={jury.id} className="flex justify-between items-center p-3 border border-border rounded">
                      <span className="font-medium">{jury.name}</span>
                      <span className={`font-medium ${
                        votes[jury.name] === gameState.playerName ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        voted for {votes[jury.name]}
                      </span>
                    </div>
                  ))}
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
                        {getVoteCount(finalist.name)} votes
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
                  Final Score: {getVoteCount(winner)} - {getVoteCount(finalTwo.find(f => f.name !== winner)?.name || '')}
                </div>
                <Button
                  variant="action"
                  onClick={() => onGameEnd(winner, votes)}
                  className="w-full"
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
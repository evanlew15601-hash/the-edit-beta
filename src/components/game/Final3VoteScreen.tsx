import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { GameState } from '@/types/game';
import { Crown, Users, Trophy } from 'lucide-react';

interface Final3VoteScreenProps {
  gameState: GameState;
  onSubmitVote: (choice: string) => void;
  onTieBreakResult: (
    eliminated: string,
    winner1: string,
    winner2: string,
    method?: 'challenge' | 'fire_making' | 'random_draw',
    results?: { name: string; time: number }[],
    selectionReason?: 'player_persuasion' | 'npc_choice' | 'manual'
  ) => void;
}

export const Final3VoteScreen = ({ gameState, onSubmitVote, onTieBreakResult }: Final3VoteScreenProps) => {
  const [choice, setChoice] = useState<string>('');
  const [showingResults, setShowingResults] = useState(false);
  const [voteResults, setVoteResults] = useState<{ [name: string]: number }>({});
  const [tieBreakActive, setTieBreakActive] = useState(false);

  // New: configurable tie-break method selection (only for 1-1-1 Final 3 event)
  type TieBreakMethod = 'challenge' | 'fire_making' | 'random_draw';
  const [tieBreakMethod, setTieBreakMethod] = useState<TieBreakMethod | null>(null);
  const [playerPreferredMethod, setPlayerPreferredMethod] = useState<TieBreakMethod | null>(null);
  const [persuasionOutcome, setPersuasionOutcome] = useState<'success' | 'fail' | null>(null);

  const [challengeResults, setChallengeResults] = useState<{ name: string; time: number }[]>([]);

  // FIXED: Validate Final 3 state
  const finalThree = gameState.contestants.filter(c => !c.isEliminated);
  const playerStillActive = finalThree.some(c => c.name === gameState.playerName);
  const eligible = finalThree.filter(c => c.name !== gameState.playerName);
  
  console.log('[Final3VoteScreen] Final three:', finalThree.map(c => c.name));
  console.log('[Final3VoteScreen] Player active?', playerStillActive);
  console.log('[Final3VoteScreen] Eligible targets:', eligible.map(c => c.name));

  // Guard: Must have exactly 3 contestants
  if (finalThree.length !== 3) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="p-6 text-center">
            <h1 className="text-3xl font-light mb-4">Final 3 Vote</h1>
            <div className="bg-destructive/10 border border-destructive/20 rounded p-4">
              <p className="text-destructive">
                Error: Expected exactly 3 contestants, found {finalThree.length}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Active: {finalThree.map(c => c.name).join(', ')}
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Guard: Player must be in Final 3
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

      // Check for 1-1-1 tie (Final 3 event only)
      const voteValues = Object.values(votes);
      const maxVotes = Math.max(...voteValues);
      const playersWithMaxVotes = Object.entries(votes).filter(([_, v]) => v === maxVotes);

      if (playersWithMaxVotes.length > 1 && voteValues.every(v => v === 1)) {
        // 1-1-1 tie: let the group decide the route to resolve it
        setTieBreakActive(true);
        setTieBreakMethod(null);
      }
    }
  }, [showingResults, choice, gameState, finalThree, tieBreakActive]);

  // Execute selected tie-break route
  useEffect(() => {
    if (!tieBreakActive || !tieBreakMethod) return;

    const selectionReason: 'player_persuasion' | 'npc_choice' | 'manual' =
      persuasionOutcome === 'success' ? 'player_persuasion' :
      persuasionOutcome === 'fail' ? 'npc_choice' :
      'manual';

    if (tieBreakMethod === 'challenge') {
      const results = finalThree.map(contestant => ({
        name: contestant.name,
        time: Math.random() * 300 + 180 // 3-8 minute times
      })).sort((a, b) => a.time - b.time);
      
      setChallengeResults(results);
      
      setTimeout(() => {
        onTieBreakResult(results[2].name, results[0].name, results[1].name, 'challenge', results, selectionReason);
      }, 4000);
    }

    if (tieBreakMethod === 'fire_making') {
      // Simulate fire-making times (lower is faster)
      const results = finalThree.map(contestant => ({
        name: contestant.name,
        time: Math.random() * 240 + 120 // 2-6 minute times
      })).sort((a, b) => a.time - b.time);

      setChallengeResults(results);

      setTimeout(() => {
        onTieBreakResult(results[2].name, results[0].name, results[1].name, 'fire_making', results, selectionReason);
      }, 4000);
    }

    if (tieBreakMethod === 'random_draw') {
      const shuffled = [...finalThree].sort(() => Math.random() - 0.5);
      const eliminated = shuffled[0].name;
      const remaining = shuffled.slice(1).map(c => c.name);

      // No time results to show, but we can present an info card briefly
      setChallengeResults([]);

      setTimeout(() => {
        onTieBreakResult(eliminated, remaining[0], remaining[1], 'random_draw', [], selectionReason);
      }, 2000);
    }
  }, [tieBreakActive, tieBreakMethod, finalThree, onTieBreakResult, persuasionOutcome]);

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
                <h1 className="text-3xl font-light">1-1-1 Tie Resolution</h1>
                <p className="text-muted-foreground">Final 3 must decide how to proceed</p>
              </div>
            </div>

            {!tieBreakMethod ? (
              <div className="space-y-6">
                <div className="bg-primary/10 border border-primary/20 rounded p-6">
                  <h3 className="text-xl font-medium mb-2">Vote resulted in 1-1-1</h3>
                  <p className="text-muted-foreground">
                    Choose a tie-break route to determine who is eliminated. The remaining two advance to the Final 2.
                  </p>
                </div>

                {/* Persuasion mini-event */}
                <Card className="p-4 border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Propose a route</div>
                      <div className="text-xs text-muted-foreground">Try to persuade the other two to your preferred method.</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <Button
                      variant={playerPreferredMethod === 'challenge' ? 'action' : 'surveillance'}
                      onClick={() => setPlayerPreferredMethod('challenge')}
                      className="transition-transform hover:scale-[1.02]"
                    >
                      Obstacle Challenge
                    </Button>
                    <Button
                      variant={playerPreferredMethod === 'fire_making' ? 'action' : 'surveillance'}
                      onClick={() => setPlayerPreferredMethod('fire_making')}
                      className="transition-transform hover:scale-[1.02]"
                    >
                      Fire-Making
                    </Button>
                    <Button
                      variant={playerPreferredMethod === 'random_draw' ? 'action' : 'surveillance'}
                      onClick={() => setPlayerPreferredMethod('random_draw')}
                      className="transition-transform hover:scale-[1.02]"
                    >
                      Random Draw
                    </Button>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Button
                      variant="action"
                      disabled={!playerPreferredMethod}
                      onClick={() => {
                        // Persuasion success based on trust + recent memories
                        const others = finalThree.filter(c => c.name !== gameState.playerName);
                        const trustSum = others.reduce((sum, c) => sum + (c.psychProfile.trustLevel || 0), 0);
                        const recentImpact = others.reduce((sum, c) => {
                          const recent = c.memory.filter(m => m.participants.includes(gameState.playerName) && m.day >= gameState.currentDay - 7);
                          return sum + recent.reduce((s, m) => s + m.emotionalImpact, 0);
                        }, 0);
                        const base = 40;
                        const score = base + trustSum * 0.1 + recentImpact * 5 + (Math.random() * 40 - 20);
                        const success = score >= 50;
                        setPersuasionOutcome(success ? 'success' : 'fail');

                        if (success && playerPreferredMethod) {
                          setTieBreakMethod(playerPreferredMethod);
                          setPersuasionOutcome('success');
                        } else {
                          // NPCs choose a method based on their preferences
                          const npcPreferred = (() => {
                            // Compute simple preference: more strategic contestants avoid random
                            const strategicBias = others.reduce((sum, c) => sum + (c.psychProfile.suspicionLevel < 50 ? 1 : 0), 0);
                            const methods: TieBreakMethod[] = ['challenge', 'fire_making', 'random_draw'];
                            const weights = methods.map(m => {
                              if (m === 'random_draw') return 1; // least preferred
                              if (m === 'fire_making') return 2 + strategicBias;
                              return 3 + strategicBias; // challenge
                            });
                            const total = weights.reduce((a, b) => a + b, 0);
                            const r = Math.random() * total;
                            let acc = 0;
                            for (let i = 0; i < methods.length; i++) {
                              acc += weights[i];
                              if (r <= acc) return methods[i];
                            }
                            return 'challenge';
                          })();
                          setTieBreakMethod(npcPreferred);
                          setPersuasionOutcome('fail');
                        }
                      }}
                      className="transition-transform hover:scale-[1.02]"
                    >
                      Persuade
                    </Button>
                    {persuasionOutcome && (
                      <span className={`text-sm ${persuasionOutcome === 'success' ? 'text-primary' : 'text-muted-foreground'}`}>
                        {persuasionOutcome === 'success' ? 'They agreed to your route.' : 'They declined your proposal.'}
                      </span>
                    )}
                  </div>
                </Card>

                <div className="grid gap-3 mt-6">
                  <Card className="p-4 border-border transition-transform hover:scale-[1.01]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Obstacle Challenge</div>
                        <div className="text-xs text-muted-foreground">Fastest two advance. Slowest is eliminated.</div>
                      </div>
                      <Button variant="action" onClick={() => setTieBreakMethod('challenge')}>Choose</Button>
                    </div>
                  </Card>

                  <Card className="p-4 border-border transition-transform hover:scale-[1.01]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Fire-Making</div>
                        <div className="text-xs text-muted-foreground">Fastest two to make fire advance. Slowest is eliminated.</div>
                      </div>
                      <Button variant="action" onClick={() => setTieBreakMethod('fire_making')}>Choose</Button>
                    </div>
                  </Card>

                  <Card className="p-4 border-border transition-transform hover:scale-[1.01]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Random Draw</div>
                        <div className="text-xs text-muted-foreground">Draw rocks. One is eliminated at random.</div>
                      </div>
                      <Button variant="action" onClick={() => setTieBreakMethod('random_draw')}>Choose</Button>
                    </div>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="bg-primary/10 border border-primary/20 rounded p-6">
                  <h3 className="text-xl font-medium mb-2">
                    {tieBreakMethod === 'challenge' && 'Obstacle Challenge'}
                    {tieBreakMethod === 'fire_making' && 'Fire-Making Challenge'}
                    {tieBreakMethod === 'random_draw' && 'Random Draw (Rocks)'}
                  </h3>
                  <p className="text-muted-foreground">
                    {tieBreakMethod === 'random_draw'
                      ? 'One contestant will be eliminated at random.'
                      : 'The two fastest advance to the final 2.'}
                  </p>
                </div>

                {challengeResults.length > 0 && (tieBreakMethod === 'challenge' || tieBreakMethod === 'fire_making') && (
                  <Card className="p-6">
                    <h3 className="font-medium mb-4">Results</h3>
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

                {tieBreakMethod === 'random_draw' && (
                  <Card className="p-6">
                    <div className="text-sm text-muted-foreground">
                      Drawing rocks...
                    </div>
                  </Card>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (showingResults) {
    const maxVotes = Math.max(...Object.values(voteResults));
    const eliminated = Object.entries(voteResults).find(([_, votes]) => votes === maxVotes)?.[0];
    const finalists = finalThree.filter(c => c.name !== eliminated);

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

            <Card className="p-6">
              <h3 className="font-medium mb-3">Final 2</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {finalists.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-3 border rounded bg-primary/5">
                    <div className={`font-medium ${f.name === gameState.playerName ? 'text-primary' : ''}`}>
                      {f.name}{f.name === gameState.playerName ? ' (You)' : ''}
                    </div>
                    <span className="text-xs text-primary">Advances</span>
                  </div>
                ))}
              </div>
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
              If there's a 1-1-1 tie, the Final 3 must choose a tie-break route (challenge, fire-making, or random draw).
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
import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Progress } from '@/components/ui/progress';
import { Trophy, Zap, Clock, Target } from 'lucide-react';
import { GameState, Contestant } from '@/types/game';

interface ImmunityCompetitionScreenProps {
  gameState: GameState;
  onContinue: (winner: string) => void;
}

const competitions = [
  {
    name: "Memory Palace",
    description: "Contestants must memorize and recite a complex sequence of house events.",
    type: "mental",
    icon: <Target className="w-6 h-6" />
  },
  {
    name: "Endurance Challenge",
    description: "Who can hold their position the longest while staying alert and focused?",
    type: "physical",
    icon: <Clock className="w-6 h-6" />
  },
  {
    name: "Social Puzzle",
    description: "Navigate a complex web of alliances and relationships to find the solution.",
    type: "social",
    icon: <Zap className="w-6 h-6" />
  },
  {
    name: "Strategic Thinking",
    description: "Outmaneuver opponents in a game of pure strategy and forward-thinking.",
    type: "strategic",
    icon: <Trophy className="w-6 h-6" />
  }
];

export const ImmunityCompetitionScreen = ({ gameState, onContinue }: ImmunityCompetitionScreenProps) => {
  const [competition, setCompetition] = useState(() => 
    competitions[Math.floor(Math.random() * competitions.length)]
  );
  const [participants, setParticipants] = useState<{ name: string; progress: number; isPlayer?: boolean }[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [winner, setWinner] = useState<string>('');
  const [playerChoice, setPlayerChoice] = useState<string>('');
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const activeContestants = gameState.contestants.filter(c => !c.isEliminated);

  useEffect(() => {
    // Initialize participants (dedupe player)
    const initialParticipants = [
      ...activeContestants.filter(c => c.name !== gameState.playerName).map(c => ({ name: c.name, progress: 0 })),
      { name: gameState.playerName, progress: 0, isPlayer: true }
    ];
    setParticipants(initialParticipants);
  }, [activeContestants, gameState.playerName]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const startCompetition = () => {
    setIsRunning(true);

    // clear any existing timers
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    intervalRef.current = window.setInterval(() => {
      setParticipants(prev => {
        const updated = prev.map(p => {
          let progressIncrease = 3 + Math.random() * 8;

          if (p.isPlayer) {
            switch (playerChoice) {
              case 'aggressive':
                progressIncrease += 4;
                if (Math.random() < 0.1) progressIncrease = Math.max(1, progressIncrease - 6);
                break;
              case 'steady':
                progressIncrease += 2;
                break;
              case 'conservative':
                progressIncrease += 1;
                break;
            }
          } else {
            // NPC performance based on their characteristics
            const contestant = activeContestants.find(c => c.name === p.name);
            if (contestant) {
              const isCompetitive = contestant.psychProfile.disposition.includes('competitive');
              const isDriven = contestant.psychProfile.disposition.includes('driven');
              if (isCompetitive || isDriven) progressIncrease += 2.5;
            }
          }

          const next = Math.max(0, Math.min(100, p.progress + progressIncrease));
          return { ...p, progress: next };
        });

        const reachedWinner = updated.find(p => p.progress >= 100);
        if (reachedWinner) {
          setWinner(reachedWinner.name);
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setIsRunning(false);
        }

        return updated;
      });
    }, 450);

    // Failsafe: pick current leader after 20s if no winner
    timeoutRef.current = window.setTimeout(() => {
      setParticipants(prev => {
        const leader = [...prev].sort((a, b) => b.progress - a.progress)[0];
        if (leader) {
          setWinner(leader.name);
          setIsRunning(false);
        }
        return prev;
      });
      if (intervalRef.current) clearInterval(intervalRef.current);
    }, 20000);
  };

  const strategies = [
    {
      key: 'aggressive',
      name: 'Go All Out',
      description: 'Push yourself to the limit. High risk, high reward.',
      risk: 'High'
    },
    {
      key: 'steady',
      name: 'Pace Yourself',
      description: 'Maintain consistent performance throughout.',
      risk: 'Medium'
    },
    {
      key: 'conservative',
      name: 'Play It Safe',
      description: 'Avoid mistakes, even if it means slower progress.',
      risk: 'Low'
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            {competition.icon}
            <div>
              <h1 className="text-2xl font-light">Immunity Competition</h1>
              <p className="text-sm text-muted-foreground">Day {gameState.currentDay}</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-primary/10 to-surveillance-active/10 border border-primary/20 rounded p-4 mb-6">
            <h2 className="text-lg font-medium mb-2">{competition.name}</h2>
            <p className="text-muted-foreground">{competition.description}</p>
            <div className="mt-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">
                Winner gains immunity from elimination this week
              </span>
            </div>
          </div>

          {!winner && !isRunning && (
            <div className="space-y-4">
              <h3 className="font-medium">Choose your strategy:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {strategies.map(strategy => (
                  <button
                    key={strategy.key}
                    onClick={() => setPlayerChoice(strategy.key)}
                    className={`p-4 text-left border border-border rounded transition-colors ${
                      playerChoice === strategy.key 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium">{strategy.name}</div>
                    <div className="text-sm text-muted-foreground mb-2">{strategy.description}</div>
                    <div className="text-xs text-accent">Risk: {strategy.risk}</div>
                  </button>
                ))}
              </div>
              
              <Button
                variant="action"
                onClick={startCompetition}
                disabled={!playerChoice}
                className="w-full"
              >
                Start Competition
              </Button>
            </div>
          )}

          {(isRunning || winner) && (
            <div className="space-y-4">
              <h3 className="font-medium">Competition Progress</h3>
              {participants.map(participant => (
                <div key={participant.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${participant.isPlayer ? 'text-primary' : ''}`}>
                      {participant.name}
                      {participant.isPlayer && ' (You)'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(participant.progress)}%
                    </span>
                  </div>
                  <Progress 
                    value={participant.progress} 
                    className={participant.name === winner ? 'border-primary' : ''}
                  />
                </div>
              ))}
              
              {winner && (
                <div className="bg-primary/10 border border-primary/20 rounded p-4 text-center space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Trophy className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-medium">
                      {winner === gameState.playerName ? 'You won!' : `${winner} wins!`}
                    </h3>
                  </div>
                  <p className="text-muted-foreground">
                    {winner} has earned immunity and cannot be eliminated this week.
                  </p>
                  <Button
                    variant="action"
                    onClick={() => onContinue(winner)}
                    className="w-full"
                  >
                    Continue to Elimination
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Crown, Users, MessageSquare } from 'lucide-react';
import { GameState } from '@/types/game';

interface FinaleScreenProps {
  gameState: GameState;
  onSubmitSpeech: (speech: string) => void;
  onContinue: () => void;
}

export const FinaleScreen = ({ gameState, onSubmitSpeech, onContinue }: FinaleScreenProps) => {
  const [playerSpeech, setPlayerSpeech] = useState('');
  const [speechSubmitted, setSpeechSubmitted] = useState(false);
  const [npcSpeeches, setNpcSpeeches] = useState<{ name: string; speech: string }[]>([]);

  const finalTwo = gameState.contestants.filter(c => !c.isEliminated);
  const juryMembers = gameState.contestants.filter(c => 
    c.isEliminated && 
    gameState.juryMembers?.includes(c.name)
  );

  const handleSubmitSpeech = () => {
    onSubmitSpeech(playerSpeech);
    setSpeechSubmitted(true);
    
    // Generate NPC speeches
    const speeches = finalTwo
      .filter(c => c.name !== gameState.playerName)
      .map(contestant => ({
        name: contestant.name,
        speech: generateNPCSpeech(contestant, gameState)
      }));
    setNpcSpeeches(speeches);
  };

  const generateNPCSpeech = (contestant: any, gameState: GameState) => {
    const speeches = [
      `I've played this game with honesty and integrity. Every move I made was strategic but never personal. I deserve to win because I stayed true to myself while adapting to every twist.`,
      `This game has been the ultimate test of strategy and social skills. I formed genuine connections while making the tough decisions needed to get here. I earned my spot in this finale.`,
      `I've faced elimination multiple times but fought my way here through pure determination. My journey proves that you can overcome any obstacle with the right mindset and strategy.`,
      `Every alliance I made, every vote I cast, every conversation I had was part of my larger strategy. I played a complete game and deserve your votes to crown me the winner.`,
      `I know I made enemies along the way, but that's because I was willing to make the hard choices. I played to win, not to be liked, and that's why I'm sitting here today.`
    ];
    return speeches[Math.floor(Math.random() * speeches.length)];
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Crown className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-light">Finale Night</h1>
              <p className="text-muted-foreground">Final speeches before the jury vote</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5" />
                <h3 className="font-medium">Final Two</h3>
              </div>
              <div className="space-y-2">
                {finalTwo.map(contestant => (
                  <div 
                    key={contestant.id} 
                    className={`p-2 rounded border ${
                      contestant.name === gameState.playerName 
                        ? 'bg-primary/10 border-primary/20' 
                        : 'bg-muted border-border'
                    }`}
                  >
                    <div className="font-medium">
                      {contestant.name}
                      {contestant.name === gameState.playerName && ' (You)'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {contestant.publicPersona}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5" />
                <h3 className="font-medium">Jury Members</h3>
              </div>
              <ScrollArea className="max-h-32">
                <div className="space-y-1">
                  {juryMembers.map(jury => (
                    <div key={jury.id} className="text-sm p-1">
                      {jury.name}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {!speechSubmitted ? (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5" />
                <h3 className="font-medium">Your Final Speech</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                This is your final chance to convince the jury why you deserve to win. 
                Your speech will be remembered and could sway votes in your favor.
              </p>
              <Textarea
                value={playerSpeech}
                onChange={(e) => setPlayerSpeech(e.target.value)}
                placeholder="Address the jury. Explain your strategy, acknowledge your moves, and make your case for why you deserve to win..."
                className="min-h-[120px] mb-4"
              />
              <Button
                variant="action"
                onClick={handleSubmitSpeech}
                disabled={!playerSpeech.trim()}
                className="w-full"
              >
                Deliver Speech
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="font-medium mb-3">Final Speeches</h3>
                
                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <div className="font-medium text-primary mb-2">
                      {gameState.playerName} (Your Speech)
                    </div>
                    <p className="text-sm italic">"{playerSpeech}"</p>
                  </div>

                  {npcSpeeches.map(speech => (
                    <div key={speech.name} className="border-l-4 border-muted pl-4">
                      <div className="font-medium mb-2">{speech.name}</div>
                      <p className="text-sm italic">"{speech.speech}"</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 text-center">
                <Crown className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">
                  The speeches have been given
                </h3>
                <p className="text-muted-foreground mb-4">
                  The jury will now deliberate and cast their final votes to crown the winner.
                </p>
                <Button
                  variant="action"
                  onClick={onContinue}
                  className="w-full"
                >
                  Proceed to Jury Vote
                </Button>
              </Card>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
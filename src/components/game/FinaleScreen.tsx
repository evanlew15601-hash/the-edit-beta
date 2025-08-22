import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Crown, Users, MessageSquare } from 'lucide-react';
import { GameState } from '@/types/game';
import { AFPCard } from './AFPCard';

interface FinaleScreenProps {
  gameState: GameState;
  onSubmitSpeech: (speech: string) => void;
  onContinue: () => void;
  onAFPVote: (choice: string) => void;
}

export const FinaleScreen = ({ gameState, onSubmitSpeech, onContinue, onAFPVote }: FinaleScreenProps) => {
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
    // Generate contextual speech based on their game journey
    const playerInteractions = contestant.memory.filter(m => 
      m.participants.includes(gameState.playerName)
    ).length;
    
    const allianceCount = gameState.alliances.filter(a => 
      a.members.includes(contestant.name)
    ).length;
    
    const speeches = [
      `I built meaningful relationships in this house while staying true to my strategy. ${playerInteractions > 10 ? `My conversations with ${gameState.playerName} shaped my game.` : 'I navigated every challenge with integrity.'} You should vote for someone who played with both heart and mind.`,
      
      `This game tested every part of me - strategically, socially, and emotionally. ${allianceCount > 1 ? 'I worked with multiple groups but never betrayed my core values.' : 'I stayed loyal to my alliances throughout.'} I earned this spot through consistent gameplay and tough decisions.`,
      
      `I've survived ${gameState.currentDay} days by adapting to every twist while keeping my word. ${contestant.psychProfile?.trustLevel > 50 ? 'I built trust through honesty' : 'I made the hard moves when necessary'}. That's the kind of winner this game deserves.`,
      
      `Every move I made was calculated but never cruel. I formed genuine connections - ${playerInteractions > 5 ? `especially with ${gameState.playerName} - ` : ''}and used strategy without losing my humanity. I played the game the right way.`,
      
      `I know some of you may hold grudges, but I played to win while respecting each of you. ${gameState.immunityWinner === contestant.name ? 'My immunity win shows I can compete' : 'I fought my way here through pure social game'}. Vote for the player who deserves it most.`
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

              {/* America's Favorite Player */}
              <AFPCard gameState={gameState} onAFPVote={onAFPVote} />

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
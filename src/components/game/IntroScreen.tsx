import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';

interface IntroScreenProps {
  onStartGame: (playerName: string) => void;
  onLoadGame?: () => void;
  onDeleteSave?: () => void;
}

export const IntroScreen = ({ onStartGame, onLoadGame, onDeleteSave }: IntroScreenProps) => {
  const [playerName, setPlayerName] = useState('');
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    try {
      setHasSave(!!localStorage.getItem('rtv_game_state'));
    } catch {
      setHasSave(false);
    }
  }, []);

  const handleSubmit = () => {
    if (playerName.trim()) {
      onStartGame(playerName.trim());
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center space-y-8 p-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-light tracking-wide text-foreground">
            THE EDIT
          </h1>
          <div className="w-24 h-px bg-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground font-light tracking-wider uppercase">
            Episode One
          </p>
        </div>

        <div className="bg-card border border-border p-8 space-y-6">
          <div className="space-y-4">
            <p className="text-foreground text-lg font-light leading-relaxed">
              Location: The House
            </p>
            <p className="text-muted-foreground text-base leading-relaxed">
              The lights buzz on. Cameras swing into place. You sit alone in the diary room.
            </p>
          </div>

          <div className="border-l-2 border-primary pl-6 space-y-3">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">
              Mars Vega (Host)
            </p>
            <p className="text-foreground italic leading-relaxed">
              "Welcome to The Edit. From this moment on, everything you say, and everything you don't, becomes part of your story."
            </p>
          </div>

          <div className="space-y-4 pt-6">
            <p className="text-foreground">
              Please introduce yourself.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="flex-1 bg-input border-border text-foreground"
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <Button 
                onClick={handleSubmit}
                disabled={!playerName.trim()}
                variant="surveillance"
                size="default"
              >
                Enter the House
              </Button>
            </div>

            {hasSave && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="outline" onClick={onLoadGame}>
                  Continue
                </Button>
                <Button variant="destructive" onClick={() => {
                  if (confirm('Delete save file? This cannot be undone.')) onDeleteSave?.();
                }}>
                  Delete Save
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>All actions have consequences</p>
          <p>Everything is being recorded</p>
          <p>Trust no one completely</p>
        </div>
      </div>
    </div>
  );
};
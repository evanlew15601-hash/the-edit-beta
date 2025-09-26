import { Button } from '@/components/ui/enhanced-button';
import { Button as TopButton } from '@/components/ui/button';

interface IntroScreenProps {
  onStartGame: (playerName?: string) => void;
  onContinue?: () => void;
  onDeleteSave?: () => void;
  debugMode?: boolean;
  onToggleDebug?: () => void;
  hasSave?: boolean;
}

export const IntroScreen = ({ onStartGame, onContinue, onDeleteSave, debugMode, onToggleDebug, hasSave }: IntroScreenProps) => {
  const handleStart = () => {
    onStartGame();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="w-full bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-3 flex items-center justify-between">
          <div className="text-sm font-medium">The Edit</div>
          <div className="flex items-center gap-2">
            <TopButton variant="secondary" size="sm" onClick={onContinue} disabled={!hasSave} aria-label="Continue">
              Continue
            </TopButton>
            <TopButton variant="outline" size="sm" onClick={onDeleteSave} disabled={!hasSave} aria-label="Delete Save">
              Delete Save
            </TopButton>
            <TopButton
              variant={debugMode ? 'secondary' : 'outline'}
              size="sm"
              onClick={onToggleDebug}
              aria-pressed={!!debugMode}
              aria-label="Toggle debug"
            >
              Debug: {debugMode ? 'ON' : 'OFF'}
            </TopButton>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
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
                Begin your season with character creation. Your name will be set and validated there.
              </p>
              <div className="flex justify-center">
                <Button 
                  onClick={handleStart}
                  variant="surveillance"
                  size="wide"
                >
                  Begin Character Creation
                </Button>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>All actions have consequences</p>
            <p>Everything is being recorded</p>
            <p>Trust no one completely</p>
          </div>
        </div>
      </div>
    </div>
  );
};
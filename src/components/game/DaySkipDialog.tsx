import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Clock, Zap } from 'lucide-react';
import { EmergentEventInterruptor } from '@/utils/emergentEventInterruptor';
import { GameState } from '@/types/game';

interface DaySkipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSkip: () => void;
  currentDay: number;
  gameState: GameState;
  onEventChoice: (event: any, choice: 'pacifist' | 'headfirst') => void;
}

export const DaySkipDialog = ({ isOpen, onClose, onConfirmSkip, currentDay, gameState, onEventChoice }: DaySkipDialogProps) => {
  const [isSkipping, setIsSkipping] = useState(false);
  const [emergentEvent, setEmergentEvent] = useState<any>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');

  const handleSkip = async () => {
    setIsSkipping(true);
    
    // Simulate checking for AI events that might interrupt
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Check for emergent event that would interrupt the skip
    const interruptEvent = EmergentEventInterruptor.checkForEventInterruption(gameState);
    
    if (interruptEvent) {
      setEmergentEvent(interruptEvent);
      setIsSkipping(false);
      return;
    }

    onConfirmSkip();
    setIsSkipping(false);
  };

  const handleChoice = (choice: 'pacifist' | 'headfirst') => {
    if (emergentEvent) {
      onEventChoice(emergentEvent, choice);
      // After handling emergent event, proceed with day skip
      setTimeout(() => {
        onConfirmSkip();
      }, 100);
    }
    setEmergentEvent(null);
    setIsSkipping(false);
    onClose();
  };
  const skipReasons = [
    {
      title: 'Rest & Observe',
      description: 'Take a day to lay low and watch the house dynamics unfold without your direct involvement.',
      risk: 'Low'
    },
    {
      title: 'Strategic Patience',
      description: 'Sometimes the best move is no move. Let others make mistakes while you stay out of drama.',
      risk: 'Low'
    },
    {
      title: 'Burnout Recovery',
      description: 'Social gameplay is exhausting. Take time to recover your mental energy for future challenges.',
      risk: 'Medium'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]" aria-describedby="skip-dialog-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Skip Day {currentDay}
          </DialogTitle>
          <DialogDescription id="skip-dialog-description">
            Skipping advances the day without spending actions. Events may still occur.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            <div className="bg-accent/10 border border-accent/20 rounded p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <p className="text-sm text-accent font-medium mb-2">
                    Passive Strategy Warning
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Skipping a day means you won't take any actions, but the game continues around you. 
                    Other contestants will still interact, form alliances, and plot against each other.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Why skip this day?</label>
              {skipReasons.map((reason, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedReason(reason.title)}
                  className={`w-full text-left p-3 border rounded transition-colors ${
                    selectedReason === reason.title ? 'bg-primary/10 border-primary' : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="font-medium mb-1">{reason.title}</div>
                  <div className="text-sm text-muted-foreground mb-2">{reason.description}</div>
                  <div className="text-xs text-accent">Risk Level: {reason.risk}</div>
                </button>
              ))}
            </div>

            <div className="bg-accent/10 border border-accent/20 rounded p-4">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <p className="text-sm text-accent font-medium mb-2">
                    Unscripted Moments Can Happen
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Even when trying to lay low, moments might force you back into action. 
                    Staying calm or stepping in will both shape how others see you.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded p-4">
              <h4 className="font-medium mb-2">What happens when you skip:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• You use no actions but the day still advances</li>
                <li>• Other contestants continue their strategies</li>
                <li>• NPC interactions happen without your input</li>
                <li>• Small chance of being pulled into emergent events</li>
                <li>• Your edit might change to "under the radar"</li>
              </ul>
            </div>

            {isSkipping && (
              <div className="bg-primary/10 border border-primary/20 rounded p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  <p className="text-sm text-primary">
                    Checking for emergent events that might require your attention...
                  </p>
                </div>
              </div>
            )}

            {emergentEvent && (
              <div className="bg-destructive/10 border border-destructive/20 rounded p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <h4 className="font-medium text-destructive mb-2">{emergentEvent.title}</h4>
                    <p className="text-sm text-foreground mb-3">{emergentEvent.description}</p>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        <strong>Immediate Impact:</strong> {emergentEvent.impact.immediate}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Long-term Impact:</strong> {emergentEvent.impact.longTerm}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => handleChoice('pacifist')} 
                    className="w-full"
                  >
                    Stay Pacifist
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleChoice('headfirst')} 
                    className="w-full"
                  >
                    Jump In Headfirst
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1" disabled={isSkipping || emergentEvent}>
                Cancel
              </Button>
              <Button 
                variant="action" 
                onClick={handleSkip} 
                disabled={!selectedReason || isSkipping || !!emergentEvent}
                className="flex-1"
              >
                {isSkipping ? 'Checking...' : 'Skip Day'}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
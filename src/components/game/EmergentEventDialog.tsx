import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Zap, AlertTriangle } from 'lucide-react';
import { EmergentEvent } from '@/utils/emergentEventInterruptor';

interface EmergentEventDialogProps {
  event: EmergentEvent | null;
  isOpen: boolean;
  onChoice: (choice: 'pacifist' | 'headfirst') => void;
  onClose: () => void;
}

export const EmergentEventDialog = ({ event, isOpen, onChoice, onClose }: EmergentEventDialogProps) => {
  if (!event) return null;

  const handleChoice = (choice: 'pacifist' | 'headfirst') => {
    onChoice(choice);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" aria-describedby="emergent-event-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-destructive" />
            {event.title}
          </DialogTitle>
          <DialogDescription id="emergent-event-description">
            An unexpected situation requires your immediate attention.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-destructive/10 border border-destructive/20 rounded p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="text-sm text-foreground mb-3">{event.description}</p>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    <strong>Immediate Impact:</strong> {event.impact.immediate}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Long-term Impact:</strong> {event.impact.longTerm}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded p-4">
            <h4 className="font-medium mb-2">Involved Contestants:</h4>
            <p className="text-sm text-muted-foreground">
              {event.involvedContestants.join(', ')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={() => handleChoice('pacifist')} 
              className="w-full"
            >
              Stay Calm & Observe
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
      </DialogContent>
    </Dialog>
  );
};
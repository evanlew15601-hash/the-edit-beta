import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Contestant } from '@/types/game';

interface ObservationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contestants: Contestant[];
  onSubmit: () => void;
}

export const ObservationDialog = ({ isOpen, onClose, contestants, onSubmit }: ObservationDialogProps) => {
  const [selectedObservation, setSelectedObservation] = useState<string>('');

  // Generate dynamic observation scenarios based on contestant relationships
  const generateObservationScenarios = () => {
    const scenarios = [
      {
        id: 'alliance_meeting',
        title: 'Secret Alliance Meeting',
        participants: [contestants[0]?.name, contestants[1]?.name].filter(Boolean),
        description: 'Two contestants are whispering in the corner, planning something.',
        revelation: 'You discover they\'re planning to vote together and target the strongest players.'
      },
      {
        id: 'betrayal_plot',
        title: 'Betrayal in Motion',
        participants: [contestants[2]?.name, contestants[3]?.name].filter(Boolean),
        description: 'Someone is talking behind another contestant\'s back.',
        revelation: 'You learn that trust is being broken and alliances are shifting.'
      },
      {
        id: 'emotional_moment',
        title: 'Vulnerable Moment',
        participants: [contestants[4]?.name].filter(Boolean),
        description: 'A contestant is having a private emotional moment.',
        revelation: 'You gain insight into their true motivations and fears.'
      },
      {
        id: 'strategy_session',
        title: 'Game Strategy Discussion',
        participants: [contestants[5]?.name, contestants[6]?.name].filter(Boolean),
        description: 'Contestants are analyzing the game and other players.',
        revelation: 'You learn how others perceive you and who they see as threats.'
      }
    ];

    return scenarios.filter(s => s.participants.length > 0);
  };

  const scenarios = generateObservationScenarios();

  const handleObserve = (scenarioId: string) => {
    setSelectedObservation(scenarioId);
  };

  const handleSubmit = () => {
    if (selectedObservation) {
      onSubmit();
      setSelectedObservation('');
    }
  };

  const selectedScenario = scenarios.find(s => s.id === selectedObservation);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Observe Other Contestants</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-accent/10 border border-accent/20 rounded p-3">
            <p className="text-sm text-accent">
              Watch from the shadows. What you observe may reveal alliances, betrayals, or valuable information about the social dynamics.
            </p>
          </div>

          {!selectedObservation ? (
            <div className="space-y-3">
              <label className="text-sm font-medium">Choose what to observe:</label>
              {scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => handleObserve(scenario.id)}
                  className="w-full p-4 text-left border border-border rounded transition-colors hover:bg-muted"
                >
                  <div className="font-medium mb-1">{scenario.title}</div>
                  <div className="text-sm text-muted-foreground mb-2">{scenario.description}</div>
                  <div className="text-xs text-accent">
                    Participants: {scenario.participants.join(', ')}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-card border border-border rounded p-4">
                <h3 className="font-medium mb-2">{selectedScenario?.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{selectedScenario?.description}</p>
                
                <div className="bg-background border border-border rounded p-3">
                  <p className="text-sm font-medium mb-2">What you discovered:</p>
                  <p className="text-sm text-foreground">{selectedScenario?.revelation}</p>
                </div>
              </div>

              <div className="bg-surveillance-active/10 border border-surveillance-active/20 rounded p-3">
                <p className="text-xs text-surveillance-active">
                  This information has been added to your memory. You can use it in future conversations and strategies.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="action" 
              onClick={handleSubmit} 
              disabled={!selectedObservation}
              className="flex-1"
            >
              {selectedObservation ? 'Complete Observation' : 'Select Observation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
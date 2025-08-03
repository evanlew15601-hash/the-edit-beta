import { useState } from 'react';
import { Button } from '@/components/ui/enhanced-button';
import { Card } from '@/components/ui/card';
import { GameState } from '@/types/game';
import { ConversationDialog } from './ConversationDialog';
import { DirectMessageDialog } from './DirectMessageDialog';
import { ConfessionalDialog } from './ConfessionalDialog';
import { ObservationDialog } from './ObservationDialog';
import { SchemeDialog } from './SchemeDialog';

interface ActionPanelProps {
  gameState: GameState;
  onUseAction: (actionType: string, target?: string, content?: string, tone?: string) => void;
  onAdvanceDay: () => void;
}

export const ActionPanel = ({ gameState, onUseAction, onAdvanceDay }: ActionPanelProps) => {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  
  const allActionsUsed = gameState.playerActions.every(action => action.used);
  const hasCompletedConfessional = gameState.playerActions.find(a => a.type === 'confessional')?.used;

  const getActionDescription = (type: string) => {
    switch (type) {
      case 'talk':
        return 'Have a conversation with another contestant. Choose your tone carefully.';
      case 'dm':
        return 'Send a private message. May be leaked by the recipient.';
      case 'confessional':
        return 'Record your thoughts. Directly affects your edit and public perception.';
      case 'observe':
        return 'Watch other contestants interact. Gain intelligence without being seen.';
      case 'scheme':
        return 'Attempt to manipulate votes, spread rumors, or form secret alliances.';
      default:
        return '';
    }
  };

  const handleActionClick = (actionType: string) => {
    if (gameState.playerActions.find(a => a.type === actionType)?.used) return;
    setActiveDialog(actionType);
  };

  const handleDialogClose = () => {
    setActiveDialog(null);
  };

  const handleActionSubmit = (actionType: string, target?: string, content?: string, tone?: string) => {
    onUseAction(actionType, target, content, tone);
    setActiveDialog(null);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-light mb-4">Daily Actions</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Choose 3 actions to shape your day. Each choice has consequences.
        </p>
        
        <div className="grid gap-4">
          {gameState.playerActions.map((action, index) => (
            <div key={index} className="border border-border rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium capitalize">{action.type.replace('_', ' ')}</h3>
                <Button
                  variant={action.used ? "disabled" : "action"}
                  size="sm"
                  used={action.used}
                  onClick={() => handleActionClick(action.type)}
                >
                  {action.used ? 'Used' : 'Select'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {getActionDescription(action.type)}
              </p>
              {action.used && action.target && (
                <p className="text-xs text-surveillance-active mt-2">
                  Used on: {action.target}
                </p>
              )}
            </div>
          ))}
        </div>

        {allActionsUsed && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">All actions completed for Day {gameState.currentDay}</p>
                {!hasCompletedConfessional && (
                  <p className="text-xs text-destructive">Warning: No confessional recorded</p>
                )}
              </div>
              <Button
                variant="surveillance"
                size="wide"
                onClick={onAdvanceDay}
              >
                Proceed to Next Day
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Dialog Components */}
      <ConversationDialog
        isOpen={activeDialog === 'talk'}
        onClose={handleDialogClose}
        contestants={gameState.contestants.filter(c => !c.isEliminated)}
        onSubmit={(target, content, tone) => handleActionSubmit('talk', target, content, tone)}
      />
      
      <DirectMessageDialog
        isOpen={activeDialog === 'dm'}
        onClose={handleDialogClose}
        contestants={gameState.contestants.filter(c => !c.isEliminated)}
        onSubmit={(target, content, tone) => handleActionSubmit('dm', target, content, tone)}
      />
      
      <ConfessionalDialog
        isOpen={activeDialog === 'confessional'}
        onClose={handleDialogClose}
        onSubmit={(content, tone) => handleActionSubmit('confessional', undefined, content, tone)}
      />
      
      <ObservationDialog
        isOpen={activeDialog === 'observe'}
        onClose={handleDialogClose}
        contestants={gameState.contestants.filter(c => !c.isEliminated)}
        onSubmit={() => handleActionSubmit('observe')}
      />
      
      <SchemeDialog
        isOpen={activeDialog === 'scheme'}
        onClose={handleDialogClose}
        contestants={gameState.contestants.filter(c => !c.isEliminated)}
        onSubmit={(target, content, tone) => handleActionSubmit('scheme', target, content, tone)}
      />
    </div>
  );
};
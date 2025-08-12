import { GameState } from '@/types/game';
import { DashboardHeader } from './DashboardHeader';
import { ActionPanel } from './ActionPanel';
import { ContestantGrid } from './ContestantGrid';
import { TwistNotification } from './TwistNotification';
import { AIResponseDisplay } from './AIResponseDisplay';
import { AISettingsPanel } from './AISettingsPanel';

interface GameplayScreenProps {
  gameState: GameState;
  onUseAction: (actionType: string, target?: string, content?: string, tone?: string) => void;
  onAdvanceDay: () => void;
}

export const GameplayScreen = ({ gameState, onUseAction, onAdvanceDay }: GameplayScreenProps) => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader gameState={gameState} />
      
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Twist Notification */}
        <TwistNotification gameState={gameState} />
        
        {/* AI Response Display */}
        <AIResponseDisplay 
          lastResponse={gameState.lastAIResponse}
          lastTarget={gameState.lastActionTarget}
          actionType={gameState.lastActionType}
          additions={gameState.lastAIAdditions}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Action Panel */}
          <div className="lg:col-span-2">
            <ActionPanel
              gameState={gameState}
              onUseAction={onUseAction}
              onAdvanceDay={onAdvanceDay}
            />
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <AISettingsPanel
              depth={gameState.aiSettings.depth}
              additions={gameState.aiSettings.additions}
              onChange={(next) => {
                // Note: This setter lives inside the hook; we dispatch a custom event to update
                window.dispatchEvent(new CustomEvent('ai-settings:update', { detail: next }));
              }}
            />
            <ContestantGrid contestants={gameState.contestants} />
          </div>
        </div>
      </div>
    </div>
  );
};
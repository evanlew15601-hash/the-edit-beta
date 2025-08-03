import { GameState } from '@/types/game';
import { DashboardHeader } from './DashboardHeader';
import { ActionPanel } from './ActionPanel';
import { ContestantGrid } from './ContestantGrid';
import { TwistNotification } from './TwistNotification';

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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Action Panel */}
          <div className="lg:col-span-2">
            <ActionPanel
              gameState={gameState}
              onUseAction={onUseAction}
              onAdvanceDay={onAdvanceDay}
            />
          </div>
          
          {/* Contestant Information */}
          <div className="lg:col-span-1">
            <ContestantGrid contestants={gameState.contestants} />
          </div>
        </div>
      </div>
    </div>
  );
};
import { useGame } from '@/contexts/GameContext';
import { TwistNotification } from './TwistNotification';
import { AIResponseDisplay } from './AIResponseDisplay';
import { AIOutcomeDebug } from './AIOutcomeDebug';
import { EnhancedEmergentEvents } from './EnhancedEmergentEvents';
import { VillaWeekBoard } from './VillaWeekBoard';
import { HouseDesk } from './HouseDesk';

export const GameplayScreen = () => {
  const { gameState } = useGame();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-5">
        <TwistNotification />
        <VillaWeekBoard />
        <AIResponseDisplay
          lastTarget={gameState.lastActionTarget}
          actionType={gameState.lastActionType}
          reactionSummary={gameState.lastAIReaction}
          aiLine={gameState.lastAIResponse}
          isGenerating={gameState.lastAIResponseLoading}
        />
        {gameState.debugMode && <AIOutcomeDebug />}
        <EnhancedEmergentEvents />
        <HouseDesk />
      </div>
    </div>
  );
};

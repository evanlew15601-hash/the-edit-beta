import { useGame } from '@/contexts/GameContext';
import { ActionPanel } from './ActionPanel';
import { ContestantGrid } from './ContestantGrid';
import { TwistNotification } from './TwistNotification';
import { AIResponseDisplay } from './AIResponseDisplay';
import { MemoryPanel } from './MemoryPanel';
import { AmbientNPCActivity } from './AmbientNPCActivity';
import { EnhancedInformationPanel } from './EnhancedInformationPanel';
import { EnhancedTagDialogueEngine } from './EnhancedTagDialogueEngine';
import { EnhancedEmergentEvents } from './EnhancedEmergentEvents';
import { AllianceIntelligencePanel } from './AllianceIntelligencePanel';
import { AIOutcomeDebug } from './AIOutcomeDebug';
import { RatingsPanel } from './RatingsPanel';
import { BasicConversationEngine } from './BasicConversationEngine';
import { VotingIntelligencePanel } from './VotingIntelligencePanel';
import { ProductionTasksPanel } from './ProductionTasksPanel';

export const GameplayScreen = () => {
  const { gameState } = useGame();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Twist Notification */}
        <TwistNotification />
        
        {/* AI Response Display */}
        <AIResponseDisplay 
          lastTarget={gameState.lastActionTarget}
          actionType={gameState.lastActionType}
          reactionSummary={gameState.lastAIReaction}
          aiLine={gameState.lastAIResponse}
          isGenerating={gameState.lastAIResponseLoading}
        />

        {/* Debug surface for verifying Tag Dialogue integration (hidden unless debugMode) */}
        {gameState.debugMode && <AIOutcomeDebug />}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Action Panel */}
          <div className="lg:col-span-2">
            <ActionPanel />
          </div>
          
           <div className="lg:col-span-1 space-y-6">
             <RatingsPanel />
             <MemoryPanel />
             <EnhancedInformationPanel />
             <ProductionTasksPanel />
             {gameState.alliances.length > 0 && (
               <AllianceIntelligencePanel />
             )}
             {/* Voting Intelligence - Ask NPCs about their voting plans */}
             <VotingIntelligencePanel />
             {/* Basic RPG-style conversation (lightweight set options) */}
             <BasicConversationEngine />
             <EnhancedTagDialogueEngine />
             <EnhancedEmergentEvents />
             <AmbientNPCActivity />
             <ContestantGrid />
           </div>
        </div>
      </div>
    </div>
  );
};
import { GameState } from '@/types/game';
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
import { EliminationVoteAskPanel } from './EliminationVoteAskPanel';

interface GameplayScreenProps {
  gameState: GameState;
  onUseAction: (actionType: string, target?: string, content?: string, tone?: string) => void;
  onAdvanceDay: () => void;
  onEmergentEventChoice: (event: any, choice: 'pacifist' | 'headfirst') => void;
  onForcedConversationReply: (from: string, content: string, tone: string) => void;
  onTagTalk: (target: string, choiceId: string, interaction: 'talk' | 'dm' | 'scheme' | 'activity') => void;
}

export const GameplayScreen = ({ gameState, onUseAction, onAdvanceDay, onEmergentEventChoice, onForcedConversationReply, onTagTalk }: GameplayScreenProps) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Twist Notification */}
        <TwistNotification gameState={gameState} />
        
        {/* AI Response Display */}
        <AIResponseDisplay 
          lastTarget={gameState.lastActionTarget}
          actionType={gameState.lastActionType}
          reactionSummary={gameState.lastAIReaction}
        />

        {/* Debug surface for verifying Tag Dialogue integration (hidden unless debugMode) */}
        {gameState.debugMode && <AIOutcomeDebug gameState={gameState} />}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Action Panel */}
          <div className="lg:col-span-2">
            <ActionPanel
              gameState={gameState}
              onUseAction={onUseAction}
              onAdvanceDay={onAdvanceDay}
              onEmergentEventChoice={onEmergentEventChoice}
              onForcedConversationReply={onForcedConversationReply}
              onTagTalk={onTagTalk}
              onAllianceMeeting={(allianceId: string, agenda: string, tone: string) => {
                onUseAction('alliance_meeting', allianceId, agenda, tone);
              }}
            />
          </div>
          
           <div className="lg:col-span-1 space-y-6">
             <RatingsPanel gameState={gameState} />
             <MemoryPanel gameState={gameState} />
             <EnhancedInformationPanel gameState={gameState} />
             {gameState.alliances.length > 0 && (
               <AllianceIntelligencePanel 
                 gameState={gameState}
                 selectedAlliance={gameState.alliances[0]?.id}
               />
             )}
             {/* Ask how they’re voting (elimination plans) */}
             <EliminationVoteAskPanel gameState={gameState} />
             {/* Basic RPG-style conversation (lightweight set options) */}
             <BasicConversationEngine
               gameState={gameState}
               onUseAction={onUseAction}
             />
             <EnhancedTagDialogueEngine
               gameState={gameState}
               onTagTalk={onTagTalk}
             />
             <EnhancedEmergentEvents
               gameState={gameState}
               onEmergentEventChoice={onEmergentEventChoice}
             />
             <AmbientNPCActivity 
               contestants={gameState.contestants}
               currentDay={gameState.currentDay}
               playerName={gameState.playerName}
             />
             <ContestantGrid contestants={gameState.contestants} playerName={gameState.playerName} />
           </div>
        </div>
      </div>
    </div>
  );
};
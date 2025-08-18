import { GameState } from '@/types/game';
import { DashboardHeader } from './DashboardHeader';
import { ActionPanel } from './ActionPanel';
import { ContestantGrid } from './ContestantGrid';
import { TwistNotification } from './TwistNotification';
import { AIResponseDisplay } from './AIResponseDisplay';
import { MemoryPanel } from './MemoryPanel';
import { AmbientNPCActivity } from './AmbientNPCActivity';
import { InformationSharingPanel } from './InformationSharingPanel';

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
      <DashboardHeader gameState={gameState} />
      
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Twist Notification */}
        <TwistNotification gameState={gameState} />
        
        {/* AI Response Display */}
        <AIResponseDisplay 
          lastTarget={gameState.lastActionTarget}
          actionType={gameState.lastActionType}
          reactionSummary={gameState.lastAIReaction}
        />
        
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
            <MemoryPanel gameState={gameState} />
            <InformationSharingPanel gameState={gameState} />
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
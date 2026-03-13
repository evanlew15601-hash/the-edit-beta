import { useState } from 'react';
import { Button } from '@/components/ui/enhanced-button';
import { Card } from '@/components/ui/card';
import { useGame } from '@/contexts/GameContext';
import { GameState } from '@/types/game';
import { ConversationDialog } from './ConversationDialog';
import { DirectMessageDialog } from './DirectMessageDialog';
import { ConfessionalDialog } from './ConfessionalDialog';
import { ObservationDialog } from './ObservationDialog';
import { SchemeDialog } from './SchemeDialog';
import { DaySkipDialog } from './DaySkipDialog';
import { ActivityDialog } from './ActivityDialog';
import { AllianceMeetingDialog } from './AllianceMeetingDialog';
import { TagConversationDialog } from './TagConversationDialog';
import { CreateAllianceDialog } from './CreateAllianceDialog';
import { AddAllianceMemberDialog } from './AddAllianceMemberDialog';
import { AISettingsPanel } from './AISettingsPanel';
import { UserPlus } from 'lucide-react';
import { HouseMeetingDialog } from './HouseMeetingDialog';

type GameActionType =
  GameState['playerActions'][number]['type']
  | 'create_alliance'
  | 'add_alliance_members'
  | 'house_meeting'
  | 'alliance_meeting';

export const ActionPanel = () => {
  const {
    gameState,
    advanceDay,
  } = useGame();

  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [tagTalkOpen, setTagTalkOpen] = useState(false);
  const [tagTalkType, setTagTalkType] = useState<'talk' | 'dm' | 'scheme' | 'activity'>('talk');
  const [allianceMeetingOpen, setAllianceMeetingOpen] = useState(false);
  const [createAllianceOpen, setCreateAllianceOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const forcedItem = (gameState.forcedConversationsQueue || [])[0];
  
  const remainingActions = Math.max(0, (gameState.dailyActionCap ?? 10) - (gameState.dailyActionCount ?? 0));
  const hasCompletedConfessional = gameState.playerActions.find(a => a.type === 'confessional')?.used;
  const allActionsUsed = (gameState.dailyActionCount ?? 0) >= (gameState.dailyActionCap ?? 10);

  const getActionDescription = (type: GameActionType | string) => {
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
      case 'activity':
        return 'Start a light house activity to build rapport and stir subtle dynamics.';
      case 'alliance_meeting':
        return 'Call a private meeting with your alliance members to strategize.';
      case 'house_meeting':
        return 'Call a public House Meeting that affects the whole house.';
      default:
        return '';
    }
  };

  const handleActionClick = (actionType: GameActionType) => {
    setActiveDialog(actionType);
  };

  const handleDialogClose = () => {
    setActiveDialog(null);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-7 rounded-lg shadow-sm">
        <h2 className="text-xl md:text-2xl font-medium tracking-wide mb-2">Daily Actions</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Use up to {gameState.dailyActionCap} actions per day (optional). Used {gameState.dailyActionCount}/{gameState.dailyActionCap}.
        </p>
        
        <div className="grid gap-4">
          {gameState.playerActions.map((action, index) => (
            <div key={index} className="ring-1 ring-border rounded-lg p-4 hover:bg-muted/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium capitalize">{action.type.replace('_', ' ')}</h3>
                <div className="flex gap-2">
                  {(action.type === 'talk' || action.type === 'dm' || action.type === 'scheme' || action.type === 'activity') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setTagTalkType(action.type as 'talk' | 'dm' | 'scheme' | 'activity');
                        setTagTalkOpen(true);
                      }}
                      disabled={allActionsUsed}
                    >
                      Tag {action.type.charAt(0).toUpperCase() + action.type.slice(1)}
                    </Button>
                  )}
                  <Button
                    variant="action"
                    size="sm"
                    onClick={() => handleActionClick(action.type)}
                  >
                    Select
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {getActionDescription(action.type)}
              </p>
            </div>
          ))}
        </div>

        {/* Public House Meeting */}
        <div className="mt-4 ring-1 ring-border rounded-lg p-4 hover:bg-muted/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">House Meeting</h3>
            <div className="flex gap-2">
              <Button
                variant="action"
                size="sm"
                onClick={() => setActiveDialog('house_meeting')}
                disabled={allActionsUsed}
              >
                Call House Meeting
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Call a public meeting to address the house. Multi-round choices with ripple effects on trust, alliances, and votes.
          </p>
        </div>

        {/* Settings panel for deterministic variants and outcome scaling */}
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-lg font-medium mb-3">AI & Dialogue Settings</h3>
          <AISettingsPanel
            depth={gameState.aiSettings.depth}
            additions={gameState.aiSettings.additions}
            deterministicPersonaVariants={gameState.aiSettings.deterministicPersonaVariants}
            outcomeScaling={gameState.aiSettings.outcomeScaling}
            useLocalLLM={gameState.aiSettings.useLocalLLM}
            onChange={(next) => {
              // Merge into aiSettings within gameState
              const merged = {
                ...gameState.aiSettings,
                ...('depth' in next ? { depth: next.depth } : {}),
                ...('additions' in next ? { additions: next.additions! } : {}),
                ...('deterministicPersonaVariants' in next ? { deterministicPersonaVariants: next.deterministicPersonaVariants } : {}),
                ...('outcomeScaling' in next ? { outcomeScaling: next.outcomeScaling } : {}),
                ...('useLocalLLM' in next ? { useLocalLLM: next.useLocalLLM } : {}),
              };
              // Local update only – ActionPanel isn't the state owner; dispatch via custom event
              window.dispatchEvent(new CustomEvent('updateAISettings', { detail: merged }));
            }}
          />
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Alliance Management</h3>
            <p className="text-xs text-muted-foreground">
              {gameState.alliances.length} active alliance
              {gameState.alliances.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            {gameState.alliances.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setAllianceMeetingOpen(true)}
                disabled={allActionsUsed}
                className="flex-1"
              >
                Call Meeting
              </Button>
            )}
            {gameState.alliances.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => setAddMemberOpen(true)}
                disabled={allActionsUsed}
                className="flex items-center gap-1"
              >
                <UserPlus className="w-4 h-4" />
                Add Members
              </Button>
            )}
            <Button
              variant="action"
              onClick={() => setCreateAllianceOpen(true)}
              disabled={allActionsUsed}
              className={gameState.alliances.length === 0 ? 'w-full' : ''}
            >
              {gameState.alliances.length > 0 ? 'New Alliance' : 'Create Alliance'}
            </Button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              {allActionsUsed ? (
                <>
                  <p className="text-sm text-foreground">
                    All actions completed for Day {gameState.currentDay}
                  </p>
                  {!hasCompletedConfessional && (
                    <p className="text-xs text-destructive">Warning: No confessional recorded</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Proceed to next day</p>
                  <p className="text-xs text-muted-foreground">
                    You have {remainingActions} unused action
                    {remainingActions === 1 ? '' : 's'}. You can let the house move without you.
                  </p>
                </>
              )}
            </div>
            <Button
              variant={allActionsUsed ? 'surveillance' : 'outline'}
              size="wide"
              onClick={allActionsUsed ? advanceDay : () => setShowSkipDialog(true)}
            >
              Proceed to Next Day
            </Button>
          </div>
        </div>
      </Card>

      {/* Dialog Components */}
      {/* Forced Conversation */}
      <ConversationDialog
        isOpen={!!forcedItem}
        onClose={() => { /* forced; do not allow closing without reply */ }}
        forced
        presetTarget={forcedItem?.from}
        forcedTopic={forcedItem?.topic}
      />

      <ConversationDialog
        isOpen={activeDialog === 'talk'}
        onClose={handleDialogClose}
      />
      
      <DirectMessageDialog
        isOpen={activeDialog === 'dm'}
        onClose={handleDialogClose}
      />
      
      <ConfessionalDialog
        isOpen={activeDialog === 'confessional'}
        onClose={handleDialogClose}
      />
      
      <ObservationDialog
        isOpen={activeDialog === 'observe'}
        onClose={handleDialogClose}
      />
      
      <SchemeDialog
        isOpen={activeDialog === 'scheme'}
        onClose={handleDialogClose}
      />

      <DaySkipDialog
         isOpen={showSkipDialog}
         onClose={() => setShowSkipDialog(false)}
       />

      <ActivityDialog
        isOpen={activeDialog === 'activity'}
        onClose={handleDialogClose}
      />

      <TagConversationDialog
        isOpen={tagTalkOpen}
        onClose={() => setTagTalkOpen(false)}
        interactionType={tagTalkType}
      />

      <AllianceMeetingDialog
        isOpen={allianceMeetingOpen}
        onClose={() => setAllianceMeetingOpen(false)}
      />

      {/* House Meeting - public, multi-round */}
      <HouseMeetingDialog
        isOpen={activeDialog === 'house_meeting' || !!gameState.ongoingHouseMeeting}
        onClose={() => setActiveDialog(null)}
      />

      <CreateAllianceDialog
        isOpen={createAllianceOpen}
        onClose={() => setCreateAllianceOpen(false)}
      />

      <AddAllianceMemberDialog
        isOpen={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
      />
    </div>
  );
};
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
import { AlliancePlanningDialog } from './AlliancePlanningDialog';
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
    submitAlliancePlan,
  } = useGame();

  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [tagTalkOpen, setTagTalkOpen] = useState(false);
  const [tagTalkType, setTagTalkType] = useState<'talk' | 'dm' | 'scheme' | 'activity'>('talk');
  const [allianceMeetingOpen, setAllianceMeetingOpen] = useState(false);
  const [createAllianceOpen, setCreateAllianceOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [alliancePlanOpen, setAlliancePlanOpen] = useState(false);
  const playerAlliance = (gameState.alliances || []).find(a => a.members.includes(gameState.playerName));
  const forcedItem = (gameState.forcedConversationsQueue || [])[0];
  
  const remainingActions = Math.max(0, (gameState.dailyActionCap ?? 10) - (gameState.dailyActionCount ?? 0));
  const hasCompletedConfessional = gameState.playerActions.find(a => a.type === 'confessional')?.used;
  const allActionsUsed = (gameState.dailyActionCount ?? 0) >= (gameState.dailyActionCap ?? 10);
  const groupActionsUsed = (gameState.groupActionsUsedToday ?? 0) >= 2;

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

  const lanes: { title: string; hint: string; types: string[] }[] = [
    { title: 'Social', hint: 'Build the bond before you pitch.', types: ['talk', 'activity', 'observe'] },
    { title: 'Scheme', hint: 'One clean pitch. Loud schemes leak.', types: ['scheme', 'dm'] },
    { title: 'Broadcast', hint: 'Production is listening. This is the edit.', types: ['confessional'] },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-7 rounded-lg shadow-sm">
        <div className="flex items-end justify-between gap-3 mb-1">
          <h2 className="text-xl md:text-2xl font-medium tracking-wide">Today in the house</h2>
          <p className="text-xs text-muted-foreground">{gameState.dailyActionCount}/{gameState.dailyActionCap} used</p>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          {remainingActions} action{remainingActions === 1 ? '' : 's'} left. Skipping a day is allowed — the house will still move.
        </p>

        <div className="grid gap-5">
          {lanes.map(lane => {
            const actions = lane.types
              .map(type => gameState.playerActions.find(a => a.type === type))
              .filter(Boolean) as typeof gameState.playerActions;
            if (actions.length === 0) return null;
            return (
              <div key={lane.title}>
                <div className="mb-2">
                  <h3 className="text-sm font-medium">{lane.title}</h3>
                  <p className="text-xs text-muted-foreground">{lane.hint}</p>
                </div>
                <div className="grid gap-2">
                  {actions.map(action => (
                    <div key={action.type} className="flex items-center justify-between gap-3 ring-1 ring-border rounded-lg px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium capitalize">{action.type.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">{getActionDescription(action.type)}</p>
                      </div>
                      <Button
                        variant="action"
                        size="sm"
                        onClick={() => handleActionClick(action.type)}
                        disabled={allActionsUsed}
                      >
                        Open
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setTagTalkType('talk');
              setTagTalkOpen(true);
            }}
            disabled={allActionsUsed}
          >
            Deeper talk
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveDialog('house_meeting')}
            disabled={allActionsUsed || groupActionsUsed || !!gameState.ongoingHouseMeeting}
          >
            House meeting
          </Button>
        </div>

        <details className="mt-6 pt-4 border-t border-border">
          <summary className="text-sm text-muted-foreground cursor-pointer">Dialogue settings</summary>
          <div className="pt-3">
            <AISettingsPanel
              depth={gameState.aiSettings.depth}
              additions={gameState.aiSettings.additions}
              deterministicPersonaVariants={gameState.aiSettings.deterministicPersonaVariants}
              outcomeScaling={gameState.aiSettings.outcomeScaling}
              useLocalLLM={gameState.aiSettings.useLocalLLM}
              onChange={(next) => {
                const merged = {
                  ...gameState.aiSettings,
                  ...('depth' in next ? { depth: next.depth } : {}),
                  ...('additions' in next ? { additions: next.additions! } : {}),
                  ...('deterministicPersonaVariants' in next ? { deterministicPersonaVariants: next.deterministicPersonaVariants } : {}),
                  ...('outcomeScaling' in next ? { outcomeScaling: next.outcomeScaling } : {}),
                  ...('useLocalLLM' in next ? { useLocalLLM: next.useLocalLLM } : {}),
                };
                window.dispatchEvent(new CustomEvent('updateAISettings', { detail: merged }));
              }}
            />
          </div>
        </details>

        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Your bloc</h3>
            <p className="text-xs text-muted-foreground">
              {(gameState.alliances || []).filter(a => !a.dissolved).length} active
            </p>
          </div>
          <div className="flex gap-2">
            {(gameState.alliances || []).length > 0 && (
              <Button
                variant="outline"
                onClick={() => setAllianceMeetingOpen(true)}
                disabled={allActionsUsed}
                className="flex-1"
              >
                Call Meeting
              </Button>
            )}
            {(gameState.alliances || []).length > 0 && (
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
            {playerAlliance && (
              <Button
                variant="secondary"
                onClick={() => setAlliancePlanOpen(true)}
                disabled={allActionsUsed}
                className="flex-1"
              >
                Influence Alliance
              </Button>
            )}
            <Button
              variant="action"
              onClick={() => setCreateAllianceOpen(true)}
              disabled={allActionsUsed}
              className={(gameState.alliances || []).length === 0 ? 'w-full' : ''}
            >
              {(gameState.alliances || []).length > 0 ? 'New Alliance' : 'Create Alliance'}
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
        forcedTurn={forcedItem?.turn}
        forcedMaxTurns={forcedItem?.maxTurns}
        forcedPending={forcedItem?.pendingFollowUp}
        forcedHistory={forcedItem?.history}
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

      {playerAlliance && (
        <AlliancePlanningDialog
          isOpen={alliancePlanOpen}
          onClose={() => setAlliancePlanOpen(false)}
          alliance={playerAlliance}
          onSubmitPlan={(plan, responses) => submitAlliancePlan(playerAlliance.id, plan, responses as any)}
        />
      )}
    </div>
  );
};
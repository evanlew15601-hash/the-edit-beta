import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/enhanced-button';
import { Card } from '@/components/ui/card';
import { GameState } from '@/types/game';
import { ConversationDialog } from './ConversationDialog';
import { DirectMessageDialog } from './DirectMessageDialog';
import { ConfessionalDialog } from './ConfessionalDialog';
import { ObservationDialog } from './ObservationDialog';
import { SchemeDialog } from './SchemeDialog';
import { DaySkipDialog } from './DaySkipDialog';
import { EmergentEventDialog } from './EmergentEventDialog';
import { ActivityDialog } from './ActivityDialog';
import { AllianceMeetingDialog } from './AllianceMeetingDialog';
import { TagConversationDialog } from './TagConversationDialog';
import { CreateAllianceDialog } from './CreateAllianceDialog';
import { AddAllianceMemberDialog } from './AddAllianceMemberDialog';
import { AISettingsPanel } from './AISettingsPanel';
import { Plus, UserPlus } from 'lucide-react';
import { HouseMeetingDialog } from './HouseMeetingDialog';

interface ActionPanelProps {
  gameState: GameState;
  onUseAction: (actionType: string, target?: string, content?: string, tone?: string) => void;
  onAdvanceDay: () => void;
  onEmergentEventChoice: (event: any, choice: 'pacifist' | 'headfirst') => void;
  onForcedConversationReply: (from: string, content: string, tone: string) => void;
  onTagTalk: (target: string, choiceId: string, interaction: 'talk' | 'dm' | 'scheme' | 'activity') => void;
  onAllianceMeeting: (allianceId: string, agenda: string, tone: string) => void;
  onHouseMeetingChoice: (choice: 'persuasive' | 'defensive' | 'aggressive' | 'manipulative' | 'silent') => void;
  onEndHouseMeeting: () => void;
}

export const ActionPanel = ({ gameState, onUseAction, onAdvanceDay, onEmergentEventChoice, onForcedConversationReply, onTagTalk, onAllianceMeeting, onHouseMeetingChoice, onEndHouseMeeting }: ActionPanelProps) => {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [forcedOpen, setForcedOpen] = useState(false);
  const [tagTalkOpen, setTagTalkOpen] = useState(false);
  const [tagTalkType, setTagTalkType] = useState<'talk' | 'dm' | 'scheme' | 'activity'>('talk');
  const [allianceMeetingOpen, setAllianceMeetingOpen] = useState(false);
  const [createAllianceOpen, setCreateAllianceOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const forcedItem = (gameState.forcedConversationsQueue || [])[0];
  
  const remainingActions = Math.max(0, (gameState.dailyActionCap ?? 10) - (gameState.dailyActionCount ?? 0));
  const hasCompletedConfessional = gameState.playerActions.find(a => a.type === 'confessional')?.used;
  const allActionsUsed = (gameState.dailyActionCount ?? 0) >= (gameState.dailyActionCap ?? 10);
  
  console.log('ActionPanel render - dailyActionCount:', gameState.dailyActionCount);
  console.log('ActionPanel render - remainingActions:', remainingActions);
  console.log('ActionPanel render - allActionsUsed:', allActionsUsed);

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

  const handleActionClick = (actionType: string) => {
    setActiveDialog(actionType);
  };

  const handleDialogClose = () => {
    setActiveDialog(null);
  };

  const handleActionSubmit = (actionType: string, target?: string, content?: string, tone?: string) => {
    onUseAction(actionType, target, content, tone);
    setActiveDialog(null);
  };

  // Auto-open forced pull-aside if queued
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if ((gameState.forcedConversationsQueue || []).length > 0) {
      setForcedOpen(true);
    } else {
      setForcedOpen(false);
    }
  }, [gameState.forcedConversationsQueue]);

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
            onChange={(next) => {
              // Merge into aiSettings within gameState
              const merged = {
                ...gameState.aiSettings,
                ...('depth' in next ? { depth: next.depth } : {}),
                ...('additions' in next ? { additions: next.additions! } : {}),
                ...('deterministicPersonaVariants' in next ? { deterministicPersonaVariants: next.deterministicPersonaVariants } : {}),
                ...('outcomeScaling' in next ? { outcomeScaling: next.outcomeScaling } : {}),
              };
              // Local update only – ActionPanel isn't the state owner; dispatch via custom event
              window.dispatchEvent(new CustomEvent('updateAISettings', { detail: merged }));
            }}
          />
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

        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Alliance Management</h3>
            <p className="text-xs text-muted-foreground">{gameState.alliances.length} active alliance{gameState.alliances.length > 1 ? 's' : ''}</p>
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
              className={gameState.alliances.length === 0 ? "w-full" : ""}
            >
              {gameState.alliances.length > 0 ? 'New Alliance' : 'Create Alliance'}
            </Button>
          </div>
        </div>

        {!allActionsUsed && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Passive Strategy Option</p>
                <p className="text-xs text-muted-foreground">Skip remaining actions and advance day</p>
              </div>
              <Button
                variant="outline"
                size="wide"
                onClick={() => setShowSkipDialog(true)}
              >
                Proceed to Next Day
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Dialog Components */}
      {/* Forced Conversation */}
      <ConversationDialog
        isOpen={forcedOpen && !!forcedItem}
        onClose={() => { /* forced; do not allow closing without reply */ }}
        contestants={gameState.contestants.filter(c => !c.isEliminated)}
        onSubmit={(target, content, tone) => {
          onForcedConversationReply(target, content, tone);
          setForcedOpen(false);
        }}
        forced
        presetTarget={forcedItem?.from}
        forcedTopic={forcedItem?.topic}
      />

      <ConversationDialog
        isOpen={activeDialog === 'talk'}
        onClose={handleDialogClose}
        contestants={gameState.contestants.filter(c => !c.isEliminated && c.name !== gameState.playerName)}
        onSubmit={(target, content, tone) => handleActionSubmit('talk', target, content, tone)}
      />
      
      <DirectMessageDialog
        isOpen={activeDialog === 'dm'}
        onClose={handleDialogClose}
        contestants={gameState.contestants.filter(c => !c.isEliminated && c.name !== gameState.playerName)}
        onSubmit={(target, content, tone) => handleActionSubmit('dm', target, content, tone)}
      />
      
      <ConfessionalDialog
        isOpen={activeDialog === 'confessional'}
        onClose={handleDialogClose}
        onSubmit={(content, tone) => handleActionSubmit('confessional', undefined, content, tone)}
        gameState={gameState}
      />
      
      <ObservationDialog
        isOpen={activeDialog === 'observe'}
        onClose={handleDialogClose}
        contestants={gameState.contestants.filter(c => !c.isEliminated && c.name !== gameState.playerName)}
        onSubmit={() => handleActionSubmit('observe')}
      />
      
      <SchemeDialog
        isOpen={activeDialog === 'scheme'}
        onClose={handleDialogClose}
        contestants={gameState.contestants.filter(c => !c.isEliminated && c.name !== gameState.playerName)}
        onSubmit={(target, content, tone) => handleActionSubmit('scheme', target, content, tone)}
      />

      <DaySkipDialog
         isOpen={showSkipDialog}
         onClose={() => setShowSkipDialog(false)}
         onConfirmSkip={onAdvanceDay}
         currentDay={gameState.currentDay}
         gameState={gameState}
         onEventChoice={onEmergentEventChoice}
       />

      <ActivityDialog
        isOpen={activeDialog === 'activity'}
        onClose={handleDialogClose}
        onSubmit={(content) => handleActionSubmit('activity', undefined, content)}
      />

      <TagConversationDialog
        isOpen={tagTalkOpen}
        onClose={() => setTagTalkOpen(false)}
        gameState={gameState}
        contestants={gameState.contestants.filter(c => !c.isEliminated)}
        onSubmit={(target, choiceId, interaction) => { 
          onTagTalk(target, choiceId, tagTalkType); 
          setTagTalkOpen(false); 
        }}
        interactionType={tagTalkType}
      />

      <AllianceMeetingDialog
        isOpen={allianceMeetingOpen}
        onClose={() => setAllianceMeetingOpen(false)}
        alliances={gameState.alliances}
        contestants={gameState.contestants.filter(c => !c.isEliminated)}
        playerName={gameState.playerName}
        onSubmit={(allianceId, agenda, tone) => {
          onAllianceMeeting(allianceId, agenda, tone);
          setAllianceMeetingOpen(false);
        }}
      />

      {/* House Meeting - public, multi-round */}
      <HouseMeetingDialog
        isOpen={activeDialog === 'house_meeting' || !!gameState.ongoingHouseMeeting}
        onClose={() => setActiveDialog(null)}
        gameState={gameState}
        onStart={(topic, target) => {
          onUseAction('house_meeting', target, topic, 'neutral');
          // Keep dialog open to proceed through rounds
        }}
        onChoice={(choice) => {
          onHouseMeetingChoice(choice);
        }}
        onEnd={() => {
          onEndHouseMeeting();
          setActiveDialog(null);
        }}
      />

      <CreateAllianceDialog
        isOpen={createAllianceOpen}
        onClose={() => setCreateAllianceOpen(false)}
        contestants={gameState.contestants}
        playerName={gameState.playerName}
        onSubmit={(name, members) => {
          onUseAction('create_alliance', name, members.join(','), 'strategic');
          setCreateAllianceOpen(false);
        }}
      />

      <AddAllianceMemberDialog
        isOpen={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        alliances={gameState.alliances}
        contestants={gameState.contestants}
        playerName={gameState.playerName}
        onSubmit={(allianceId, newMembers) => {
          onUseAction('add_alliance_members', allianceId, newMembers.join(','), 'strategic');
          setAddMemberOpen(false);
        }}
      />

      <EmergentEventDialog
        event={gameState.lastEmergentEvent}
        isOpen={!!gameState.lastEmergentEvent}
        onChoice={(choice) => {
          if (gameState.lastEmergentEvent) {
            onEmergentEventChoice(gameState.lastEmergentEvent, choice);
          }
        }}
        onClose={() => {
          // Clear the emergent event to prevent lockup
          if (gameState.lastEmergentEvent) {
            onEmergentEventChoice(gameState.lastEmergentEvent, 'pacifist'); // Default choice to clear
          }
        }}
      />
    </div>
  );
};
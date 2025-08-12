import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Contestant, GameState } from '@/types/game';
import { TAG_CHOICES } from '@/data/tagChoices';
import { Choice } from '@/types/tagDialogue';
import { formatTag, isChoiceAvailable, pickVariant } from '@/utils/tagDialogueEngine';

interface TagConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  contestants: Contestant[];
  onSubmit: (target: string, choiceId: string) => void;
}

export const TagConversationDialog = ({ isOpen, onClose, gameState, contestants, onSubmit }: TagConversationDialogProps) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [selectedChoiceId, setSelectedChoiceId] = useState<string>('');

  const targetContestant = useMemo(() => contestants.find(c => c.name === selectedTarget), [contestants, selectedTarget]);

  const availableChoices: Choice[] = useMemo(() => {
    if (!targetContestant) return [];
    return TAG_CHOICES.filter(ch => isChoiceAvailable(ch, targetContestant, gameState.playerName, gameState)).slice(0, 6);
  }, [targetContestant, gameState]);

  const handleSubmit = () => {
    if (selectedTarget && selectedChoiceId) {
      onSubmit(selectedTarget, selectedChoiceId);
      setSelectedTarget('');
      setSelectedChoiceId('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Tag Conversation (Beta)</DialogTitle>
          <DialogDescription>Select a strategic line with clear intent and tone.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Target</label>
              <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose who to talk to..." />
                </SelectTrigger>
                <SelectContent>
                  {contestants.map((contestant) => (
                    <SelectItem key={contestant.id} value={contestant.name}>
                      {contestant.name} - {contestant.publicPersona}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {targetContestant && (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">Showing top options for {targetContestant.name}</div>
                <div className="grid grid-cols-1 gap-3">
                  {availableChoices.map((ch) => {
                    const seed = `${gameState.currentDay}|${gameState.playerName}|${targetContestant.id}|${ch.choiceId}`;
                    const preview = pickVariant(ch, seed);
                    const active = selectedChoiceId === ch.choiceId;
                    return (
                      <button
                        key={ch.choiceId}
                        onClick={() => setSelectedChoiceId(ch.choiceId)}
                        className={`p-4 text-left border rounded transition-colors ${active ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}
                      >
                        <div className="text-sm mb-2 text-foreground">{preview}</div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{formatTag(ch.intent)}</Badge>
                          <Badge variant="secondary">{formatTag(ch.tone)}</Badge>
                          {ch.topics.slice(0,2).map(t => (
                            <Badge key={t} variant="outline">{formatTag(t)}</Badge>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button variant="action" onClick={handleSubmit} disabled={!selectedTarget || !selectedChoiceId} className="flex-1">Say It</Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

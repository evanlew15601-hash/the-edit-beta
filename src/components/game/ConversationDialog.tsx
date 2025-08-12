import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Contestant } from '@/types/game';

interface ConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contestants: Contestant[];
  onSubmit: (target: string, content: string, tone: string) => void;
  // Forced pull-aside support
  forced?: boolean;
  presetTarget?: string;
  forcedTopic?: string;
}

export const ConversationDialog = ({ isOpen, onClose, contestants, onSubmit, forced, presetTarget, forcedTopic }: ConversationDialogProps) => {
  const [selectedTarget, setSelectedTarget] = useState<string>(presetTarget || '');
  const [content, setContent] = useState(forcedTopic || '');
  const [tone, setTone] = useState<string>('');

  const handleSubmit = () => {
    if (selectedTarget && content && tone) {
      onSubmit(selectedTarget, content, tone);
      setSelectedTarget('');
      setContent('');
      setTone('');
    }
  };

  const toneOptions = [
    { value: 'friendly', label: 'Friendly', description: 'Build trust and rapport' },
    { value: 'strategic', label: 'Strategic', description: 'Share information tactically' },
    { value: 'aggressive', label: 'Aggressive', description: 'Confront or challenge' },
    { value: 'flirty', label: 'Flirty', description: 'Use charm and attraction' },
    { value: 'suspicious', label: 'Suspicious', description: 'Question their motives' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Start a Conversation</DialogTitle>
          <DialogDescription>Open a strategic or social chat that may impact relationships.</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Target</label>
            <Select value={selectedTarget} onValueChange={setSelectedTarget} disabled={!!forced && !!presetTarget}>
              <SelectTrigger>
                <SelectValue placeholder={forced && presetTarget ? presetTarget : 'Choose who to talk to...'} />
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Conversation Topic</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={forcedTopic ? forcedTopic : 'What do you want to discuss? Your approach will be remembered...'}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tone</label>
            <div className="grid grid-cols-1 gap-3">
              {toneOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTone(option.value)}
                  className={`p-3 text-left border border-border rounded transition-colors ${
                    tone === option.value 
                      ? 'bg-primary/10 border-primary' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="action" 
              onClick={handleSubmit} 
              disabled={!selectedTarget || !content || !tone}
              className="flex-1"
            >
              Start Conversation
            </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
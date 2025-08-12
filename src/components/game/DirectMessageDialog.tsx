import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Contestant } from '@/types/game';

interface DirectMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contestants: Contestant[];
  onSubmit: (target: string, content: string, tone: string) => void;
}

export const DirectMessageDialog = ({ isOpen, onClose, contestants, onSubmit }: DirectMessageDialogProps) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [content, setContent] = useState('');
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
    { value: 'secretive', label: 'Secretive', description: 'Share sensitive information privately' },
    { value: 'alliance', label: 'Alliance Building', description: 'Propose working together' },
    { value: 'warning', label: 'Warning', description: 'Alert them to danger or threats' },
    { value: 'manipulation', label: 'Manipulation', description: 'Influence their decisions' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Send Direct Message</DialogTitle>
          <DialogDescription>Private messages can leak; choose words and tone carefully.</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
          <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
            <p className="text-sm text-destructive">
              Warning: Private messages may be leaked by the recipient. Trust carefully.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Recipient</label>
            <Select value={selectedTarget} onValueChange={setSelectedTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Choose who to message..." />
              </SelectTrigger>
              <SelectContent>
                {contestants.map((contestant) => (
                  <SelectItem key={contestant.id} value={contestant.name}>
                    {contestant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Message Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What do you want to say privately? Choose your words carefully..."
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Approach</label>
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
              Send Message
            </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
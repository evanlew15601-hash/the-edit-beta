import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConfessionalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, tone: string) => void;
}

export const ConfessionalDialog = ({ isOpen, onClose, onSubmit }: ConfessionalDialogProps) => {
  const [content, setContent] = useState('');
  const [tone, setTone] = useState<string>('');

  const handleSubmit = () => {
    if (content && tone) {
      onSubmit(content, tone);
      setContent('');
      setTone('');
    }
  };

  const toneOptions = [
    { value: 'strategic', label: 'Strategic', description: 'Explain your game plan and reasoning', impact: '+Screen Time, +Approval' },
    { value: 'vulnerable', label: 'Vulnerable', description: 'Share personal struggles and emotions', impact: '+Approval, +Sympathy' },
    { value: 'aggressive', label: 'Aggressive', description: 'Attack others or defend yourself harshly', impact: '+Screen Time, -Approval' },
    { value: 'humorous', label: 'Humorous', description: 'Keep things light and entertaining', impact: '+Approval, Comic Relief edit' },
    { value: 'dramatic', label: 'Dramatic', description: 'Create moments that demand attention', impact: '++Screen Time, Variable approval' },
    { value: 'evasive', label: 'Evasive', description: 'Avoid revealing too much information', impact: '-Screen Time, Mysterious edit' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Diary Room Confessional</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
          <div className="bg-surveillance-confessional/20 border border-surveillance-confessional/40 rounded p-4">
            <p className="text-sm text-foreground">
              You are alone in the diary room. The cameras are rolling. What you say here will directly shape how the audience sees you. Choose your words carefully.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Your Confessional</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts about the game, other contestants, your strategy, or anything else on your mind..."
              className="min-h-[150px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Delivery Style</label>
            <div className="grid grid-cols-1 gap-3">
              {toneOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTone(option.value)}
                  className={`p-3 text-left border border-border rounded transition-colors ${
                    tone === option.value 
                      ? 'bg-surveillance-confessional/10 border-surveillance-confessional' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground mb-1">{option.description}</div>
                  <div className="text-xs text-surveillance-confessional">{option.impact}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="confessional" 
              onClick={handleSubmit} 
              disabled={!content || !tone}
              className="flex-1"
            >
              Record Confessional
            </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
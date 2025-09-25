import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Contestant } from '@/types/game';
import { Badge } from '@/components/ui/badge';
import { getTrustDelta, getSuspicionDelta } from '@/utils/actionEngine';

interface DirectMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contestants: Contestant[];
  onSubmit: (target: string, content: string, tone: string) => void;
}

const PRESETS = [
  { label: 'Start backchannel', tone: 'secretive', text: (name: string) => `Quiet channel. Keep it discreet—no leaks, ${name}.` },
  { label: 'Soft intel leak', tone: 'secretive', text: (name: string) => `Between us: one name is wobbling. Use this carefully.` },
  { label: 'Alliance pitch', tone: 'alliance', text: (name: string) => `Two is a start. Lock with me and we pull a third quietly, ${name}.` },
  { label: 'Discreet warning', tone: 'warning', text: (name: string) => `Watch your step—someone floated your name. Keep it calm and tight.` },
  { label: 'Nudge decision', tone: 'manipulation', text: (_: string) => `This move looks clean. You’ll be fine. Trust the numbers.` },
  { label: 'Midnight check-in', tone: 'secretive', text: (name: string) => `Ping me after lights out. We align off-camera, ${name}.` },
];

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

  const preview = useMemo(() => {
    if (!selectedTarget || !tone) return null;
    const npc = contestants.find(c => c.name === selectedTarget);
    if (!npc) return null;
    // DM dynamics: trust a bit stronger, suspicion baseline risk higher for secretive/manipulation
    const baseTrust = getTrustDelta('friendly', npc.psychProfile.disposition);
    const trust =
      tone === 'alliance' ? baseTrust + 2 :
      tone === 'warning' ? baseTrust - 1 :
      tone === 'manipulation' ? baseTrust - 2 :
      baseTrust + 1;
    const suspBase =
      tone === 'secretive' || tone === 'manipulation' ? 3 : tone === 'warning' ? 2 : 1;
    const susp = suspBase + getSuspicionDelta(tone, content || '');
    const influence = tone === 'manipulation' || tone === 'alliance' ? 3 : 1;
    const entertainment = 1; // DMs are lower entertainment generally
    return { trust, susp, influence, entertainment };
  }, [selectedTarget, tone, content, contestants]);

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

          {/* Quick Suggestions */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Suggestions</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    const txt = p.text(selectedTarget || 'you');
                    setContent(txt);
                    setTone(p.tone);
                  }}
                  className="p-2 text-left border border-border rounded hover:bg-muted transition-colors"
                >
                  <div className="text-xs text-muted-foreground">{p.label}</div>
                  <div className="text-sm">{p.text(selectedTarget || 'you')}</div>
                </button>
              ))}
            </div>
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

          {/* Outcome Preview */}
          {preview && (
            <div className="flex items-center flex-wrap gap-2 bg-muted/40 border border-border/60 rounded p-2.5">
              <span className="text-xs text-muted-foreground">Preview</span>
              <Badge variant="outline">Trust {preview.trust >= 0 ? `+${preview.trust}` : preview.trust}</Badge>
              <Badge variant="outline" className={preview.susp < 0 ? 'text-edit-hero' : 'text-edit-villain'}>
                Suspicion {preview.susp >= 0 ? `+${preview.susp}` : preview.susp}
              </Badge>
              <Badge variant="outline">Influence {preview.influence >= 0 ? `+${preview.influence}` : preview.influence}</Badge>
              <Badge variant="outline">Entertainment {preview.entertainment >= 0 ? `+${preview.entertainment}` : preview.entertainment}</Badge>
            </div>
          )}

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
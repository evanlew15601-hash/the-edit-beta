import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Contestant } from '@/types/game';

interface DirectMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contestants: Contestant[];
  onSubmit: (target: string, content: string, tone: string) => void;
}

type Preset = { id: string; label: string; text: string; tone: 'secretive' | 'alliance' | 'warning' | 'manipulation' };

export const DirectMessageDialog = ({ isOpen, onClose, contestants, onSubmit }: DirectMessageDialogProps) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [content, setContent] = useState('');
  const [tone, setTone] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const handleSubmit = () => {
    if (selectedTarget && content && tone) {
      onSubmit(selectedTarget, content, tone);
      setSelectedTarget('');
      setContent('');
      setTone('');
      setSelectedPreset('');
    }
  };

  const toneOptions = [
    { value: 'secretive', label: 'Secretive', description: 'Share sensitive information privately' },
    { value: 'alliance', label: 'Alliance Building', description: 'Propose working together' },
    { value: 'warning', label: 'Warning', description: 'Alert them to danger or threats' },
    { value: 'manipulation', label: 'Manipulation', description: 'Influence their decisions' }
  ];

  const presets: Preset[] = useMemo(() => {
    const name = selectedTarget || '{{target}}';
    return [
      { id: 'backchannel', label: 'Start backchannel', tone: 'secretive', text: `Quietly keep me posted, ${name}. If you hear names or shifts, send me a note first.` },
      { id: 'soft_leak', label: 'Leak soft intel', tone: 'secretive', text: `I heard a light whisper about a pivot. Not confirmed—sharing so we stay ahead, ${name}.` },
      { id: 'ally_dm', label: 'Alliance pitch', tone: 'alliance', text: `We look steady together, ${name}. Let’s keep it quiet and align votes when needed.` },
      { id: 'warning_dm', label: 'Warn discreetly', tone: 'warning', text: `Someone floated your name in the kitchen. Keep a low profile today—I'll monitor it, ${name}.` },
      { id: 'nudge_dm', label: 'Nudge decision', tone: 'manipulation', text: `If we tilt the vote subtly, we avoid heat. I can handle the messaging—stay calm, ${name}.` },
      { id: 'midnight_check', label: 'Midnight check-in', tone: 'secretive', text: `Late update later? Quick pulse check to keep things tidy, ${name}.` },
    ];
  }, [selectedTarget]);

  const targetObj = useMemo(() => contestants.find(c => c.name === selectedTarget), [contestants, selectedTarget]);
  const preview = useMemo(() => {
    if (!targetObj) return null;
    const disp = (targetObj.psychProfile?.disposition || []).join(' ').toLowerCase();
    const isParanoid = disp.includes('paranoid');
    const isStrategic = disp.includes('strategic');
    let trust = tone === 'alliance' ? 0.12 : tone === 'secretive' ? 0.08 : tone === 'warning' ? -0.02 : tone === 'manipulation' ? -0.04 : 0.05;
    let suspicion = tone === 'secretive' ? (isParanoid ? 0.08 : 0.03) : tone === 'warning' ? 0.05 : tone === 'manipulation' ? 0.1 : 0.02;
    let influence = (isStrategic ? 0.12 : 0.08) + (tone === 'manipulation' ? 0.05 : 0) + (tone === 'alliance' ? 0.03 : 0);
    let entertainment = 0.04;
    const round = (n: number) => Math.round(n * 100) / 100;
    return { trust: round(trust), suspicion: round(suspicion), influence: round(influence), entertainment: round(entertainment) };
  }, [targetObj, tone]);

  const handlePresetClick = (p: Preset) => {
    setSelectedPreset(p.id);
    setTone(p.tone);
    setContent(p.text);
  };

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

            {/* Quick presets */}
            {selectedTarget && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Quick Suggestions</label>
                <div className="grid grid-cols-2 gap-3">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePresetClick(p)}
                      className={`p-3 text-left border border-border rounded transition-colors ${
                        selectedPreset === p.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{p.label}</div>
                        <Badge variant="outline" className="text-xs capitalize">{p.tone}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 line-clamp-3">{p.text}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

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

            {/* Outcome preview */}
            {preview && (
              <div className="text-sm bg-muted/40 rounded-md p-2.5 flex items-center flex-wrap border border-border/60">
                <span className="text-xs text-muted-foreground mr-3">Likely effects</span>
                <div className="inline-flex items-center gap-2">
                  <span className={`${preview.trust > 0 ? 'text-edit-hero' : 'text-edit-villain'} text-xs`}>Trust {preview.trust > 0 ? '+' : ''}{preview.trust}</span>
                  <span className={`${preview.suspicion > 0 ? 'text-edit-villain' : 'text-edit-hero'} text-xs`}>Suspicion {preview.suspicion > 0 ? '+' : ''}{preview.suspicion}</span>
                  <span className="text-xs">Influence {preview.influence > 0 ? '+' : ''}{preview.influence}</span>
                  <span className="text-xs">Entertainment {preview.entertainment > 0 ? '+' : ''}{preview.entertainment}</span>
                </div>
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
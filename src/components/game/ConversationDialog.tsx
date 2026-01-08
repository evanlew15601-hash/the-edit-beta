import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Contestant } from '@/types/game';
import { getTrustDelta, getSuspicionDelta } from '@/utils/actionEngine';
import { Badge } from '@/components/ui/badge';

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

const PRESETS = [
  { label: 'Alliance pitch', tone: 'strategic', text: (name: string) => `I think we can be solid—two votes locked. You in, ${name}?` },
  { label: 'Coordinate votes', tone: 'strategic', text: (name: string) => `Numbers look tight. If we aim at one name, can you pull yours, ${name}?` },
  { label: 'Probe for info', tone: 'suspicious', text: (name: string) => `Where's your head at? Who do you trust least right now, ${name}?` },
  { label: 'Reveal soft secret', tone: 'friendly', text: (name: string) => `Between us, I heard a whisper on ${name}—keep this narrow, just us.` },
  { label: 'Boost morale', tone: 'friendly', text: (name: string) => `You're good. Keep steady. We can control the next vote together.` },
  { label: 'Deflect drama', tone: 'friendly', text: (name: string) => `Let's keep it calm in public and talk substance privately.` },
  { label: 'Test loyalty', tone: 'strategic', text: (name: string) => `Can you lock this name with me? Quiet and clean, ${name}.` },
  { label: 'Call out softly', tone: 'aggressive', text: (name: string) => `Some stories don't add up. Walk me through your last move, ${name}.` },
  { label: 'Light flirt', tone: 'flirty', text: (name: string) => `You make the house interesting. Maybe we work together... and enjoy it.` },
  { label: 'Make a joke', tone: 'friendly', text: (_: string) => `If the house had a thermostat, it'd be set to 'subtle chaos'.` },
];

export const ConversationDialog = ({ isOpen, onClose, contestants, onSubmit, forced, presetTarget, forcedTopic }: ConversationDialogProps) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [content, setContent] = useState('');
  const [tone, setTone] = useState<string>('');

  // Set preset values when dialog opens or props change
  useEffect(() => {
    if (isOpen) {
      setSelectedTarget(presetTarget || '');
      setContent(forcedTopic || '');
      setTone('');
    }
  }, [isOpen, presetTarget, forcedTopic]);

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

  const preview = useMemo(() => {
    if (!selectedTarget || !tone) return null;
    const npc = contestants.find(c => c.name === selectedTarget);
    if (!npc) return null;
    const trust = getTrustDelta(tone, npc.psychProfile.disposition);
    const susp = getSuspicionDelta(tone, content || '');
    // Simple heuristics for influence/entertainment previews
    const influence = tone === 'strategic' ? 2 : tone === 'aggressive' ? -1 : 1;
    const entertainment = tone === 'flirty' ? 2 : tone === 'aggressive' ? 2 : 1;
    return { trust, susp, influence, entertainment };
  }, [selectedTarget, tone, content, contestants]);

  return (
    &lt;Dialog open={isOpen} onOpenChange={onClose}&gt;
      &lt;DialogContent className="max-w-2xl max-h-[90vh]"&gt;
        &lt;DialogHeader&gt;
          &lt;DialogTitle&gt;{forced ? 'Pulled Aside' : 'Start a Conversation'}&lt;/DialogTitle&gt;
          &lt;DialogDescription&gt;
            {forced
              ? 'Respond to a houseguest pulling you aside. This reactive moment does not consume one of your daily actions, but it will still be remembered.'
              : 'Open a strategic or social chat that uses one of your daily Talk actions and may impact relationships.'}
          &lt;/DialogDescription&gt;
        &lt;/DialogHeader&gt;
        
        &lt;ScrollArea className="max-h-[60vh] pr-4"&gt;
          &lt;div className="space-y-6"&gt;
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
              <SelectContent className="z-50 bg-popover text-popover-foreground">
                {contestants.map((contestant) => (
                  <SelectItem key={contestant.id} value={contestant.name}>
                    {contestant.name} - {contestant.publicPersona}
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
                    const txt = p.text(selectedTarget || 'them');
                    setContent(txt);
                    setTone(p.tone);
                  }}
                  className="p-2 text-left border border-border rounded hover:bg-muted transition-colors"
                >
                  <div className="text-xs text-muted-foreground">{p.label}</div>
                  <div className="text-sm">{p.text(selectedTarget || 'them')}</div>
                </button>
              ))}
            </div>
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
              Start Conversation
            </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
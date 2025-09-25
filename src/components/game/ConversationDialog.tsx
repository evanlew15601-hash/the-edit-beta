import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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

type Preset = { id: string; label: string; text: string; tone: 'friendly' | 'strategic' | 'aggressive' | 'flirty' | 'suspicious' };

export const ConversationDialog = ({ isOpen, onClose, contestants, onSubmit, forced, presetTarget, forcedTopic }: ConversationDialogProps) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [content, setContent] = useState('');
  const [tone, setTone] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  // Set preset values when dialog opens or props change
  useEffect(() => {
    if (isOpen) {
      setSelectedTarget(presetTarget || '');
      setContent(forcedTopic || '');
      setTone('');
      setSelectedPreset('');
    }
  }, [isOpen, presetTarget, forcedTopic]);

  const targetObj = useMemo(() => contestants.find(c => c.name === selectedTarget), [contestants, selectedTarget]);

  const presets: Preset[] = useMemo(() => {
    const name = selectedTarget || '{{target}}';
    return [
      // Strategic
      { id: 'ally_pitch', label: 'Alliance pitch', tone: 'strategic', text: `I think we can cover each other. Let's keep it tight and compare notes later, ${name}.` },
      { id: 'vote_coord', label: 'Coordinate votes', tone: 'strategic', text: `Names are starting to float. I want to keep ours safe. We can quietly align, ${name}.` },
      { id: 'probe_info', label: 'Probe for info', tone: 'strategic', text: `What are you hearing about next? Any plans forming that I should know about, ${name}?` },
      { id: 'reveal_soft', label: 'Reveal a soft secret', tone: 'strategic', text: `I'm hearing a whisper about a plan. It's not confirmed—sharing so we stay ahead, ${name}.` },
      // Friendly / Morale
      { id: 'boost_morale', label: 'Boost morale', tone: 'friendly', text: `Ignore the noise—focus on the next move. You've got this, ${name}. Let's reset and go again.` },
      { id: 'bond', label: 'Bond casually', tone: 'friendly', text: `Quick check-in: how are you feeling about the room today, ${name}? Want to keep things steady.` },
      // Defensive / Deflect
      { id: 'deflect_drama', label: 'Deflect drama', tone: 'friendly', text: `I'm staying out of the mess. If anyone drags my name, I'll correct it calmly. Let's keep distance, ${name}.` },
      { id: 'test_loyalty', label: 'Test loyalty', tone: 'suspicious', text: `Someone pushed a story about me. If you hear it, tell me—I'll trace the source, ${name}.` },
      // Aggressive
      { id: 'call_out', label: 'Call out softly', tone: 'aggressive', text: `If someone plays games with my name, I'm not letting it slide. Just a heads-up, ${name}.` },
      // Flirty / Social
      { id: 'light_flirt', label: 'Light flirt', tone: 'flirty', text: `Careful—you make this game feel less cold, ${name}. Let's look out for each other.` },
      { id: 'joke', label: 'Make a joke', tone: 'friendly', text: `If the kitchen talk was a challenge, we'd win it. Low stakes, high laughs, ${name}.` },
    ];
  }, [selectedTarget]);

  const toneOptions = [
    { value: 'friendly', label: 'Friendly', description: 'Build trust and rapport' },
    { value: 'strategic', label: 'Strategic', description: 'Share information tactically' },
    { value: 'aggressive', label: 'Aggressive', description: 'Confront or challenge' },
    { value: 'flirty', label: 'Flirty', description: 'Use charm and attraction' },
    { value: 'suspicious', label: 'Suspicious', description: 'Question their motives' }
  ];

  const preview = useMemo(() => {
    if (!targetObj) return null;
    const disp = (targetObj.psychProfile?.disposition || []).join(' ').toLowerCase();
    const isParanoid = disp.includes('paranoid');
    const isStrategic = disp.includes('strategic');
    const isSocial = disp.includes('social');
    const baseTrust = tone === 'friendly' ? 0.12 : tone === 'flirty' ? 0.1 : tone === 'strategic' ? 0.08 : tone === 'aggressive' ? -0.08 : tone === 'suspicious' ? -0.02 : 0.05;
    const baseSusp = tone === 'strategic' ? 0.05 : tone === 'aggressive' ? 0.1 : tone === 'suspicious' ? 0.12 : tone === 'flirty' ? -0.02 : tone === 'friendly' ? -0.02 : 0.04;
    let trust = baseTrust + (isSocial ? 0.03 : 0) + (isStrategic && tone === 'strategic' ? 0.02 : 0);
    let suspicion = baseSusp + (isParanoid ? 0.04 : 0);
    let influence = (isStrategic ? 0.1 : 0.05) + (tone === 'strategic' ? 0.03 : 0);
    let entertainment = (isSocial ? 0.08 : 0.05) + (tone === 'flirty' ? 0.06 : tone === 'friendly' ? 0.02 : 0);
    const round = (n: number) => Math.round(n * 100) / 100;
    return { trust: round(trust), suspicion: round(suspicion), influence: round(influence), entertainment: round(entertainment) };
  }, [targetObj, tone]);

  const handlePresetClick = (p: Preset) => {
    setSelectedPreset(p.id);
    setTone(p.tone);
    setContent(p.text);
  };

  const handleSubmit = () => {
    if (selectedTarget && content && tone) {
      onSubmit(selectedTarget, content, tone);
      setSelectedTarget('');
      setContent('');
      setTone('');
      setSelectedPreset('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Start a Conversation</DialogTitle>
          <DialogDescription>Open a strategic or social chat that may impact relationships.</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Target selection */}
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

            {/* Topic editor */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Conversation Topic</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={forcedTopic ? forcedTopic : 'What do you want to discuss? Your approach will be remembered...'}
                className="min-h-[100px]"
              />
            </div>

            {/* Tone selection */}
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

            {/* Actions */}
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
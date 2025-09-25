import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Contestant } from '@/types/game';

interface SchemeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contestants: Contestant[];
  onSubmit: (target: string, content: string, tone: string) => void;
}

type Preset = { id: string; label: string; text: string; tone: 'vote_manipulation' | 'alliance_break' | 'rumor_spread' | 'fake_alliance' | 'information_trade' };

export const SchemeDialog = ({ isOpen, onClose, contestants, onSubmit }: SchemeDialogProps) => {
  const [schemeType, setSchemeType] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [content, setContent] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const handleSubmit = () => {
    if (schemeType && selectedTarget && content) {
      onSubmit(selectedTarget, content, schemeType);
      setSchemeType('');
      setSelectedTarget('');
      setContent('');
      setSelectedPreset('');
    }
  };

  const schemeOptions = [
    { 
      value: 'vote_manipulation', 
      label: 'Vote Manipulation', 
      description: 'Try to influence someone\'s vote for the next elimination',
      risk: 'Medium - May damage trust if discovered'
    },
    { 
      value: 'alliance_break', 
      label: 'Break Alliance', 
      description: 'Attempt to turn alliance members against each other',
      risk: 'High - Very dangerous if exposed'
    },
    { 
      value: 'rumor_spread', 
      label: 'Spread Rumors', 
      description: 'Plant false or exaggerated information about another contestant',
      risk: 'Medium - May backfire and hurt your reputation'
    },
    { 
      value: 'fake_alliance', 
      label: 'Fake Alliance', 
      description: 'Pretend to form an alliance while planning betrayal',
      risk: 'High - Massive trust damage if discovered'
    },
    { 
      value: 'information_trade', 
      label: 'Information Trading', 
      description: 'Exchange secrets or intelligence for loyalty',
      risk: 'Low - Relatively safe if information is valuable'
    }
  ];

  const selectedScheme = schemeOptions.find(s => s.value === schemeType);

  const presets: Preset[] = useMemo(() => {
    const name = selectedTarget || '{{target}}';
    return [
      { id: 'tilt_vote', label: 'Tilt the vote', tone: 'vote_manipulation', text: `Keep it subtle—float a name twice and let others repeat it. We nudge the room without showing our hand against ${name}.` },
      { id: 'seed_split', label: 'Seed split', tone: 'alliance_break', text: `Point out misaligned goals. Suggest ${name} has a side plan—ask questions, don’t accuse. Let cracks appear naturally.` },
      { id: 'soft_rumor', label: 'Soft rumor', tone: 'rumor_spread', text: `Light rumor: ${name} was seen making side deals. Don’t press—let it travel lightly and gather momentum.` },
      { id: 'fake_bond', label: 'Fake alliance bond', tone: 'fake_alliance', text: `Offer temporary protection to ${name}. Keep it transactional; extract intel while managing suspicion.` },
      { id: 'trade_secret', label: 'Trade a secret', tone: 'information_trade', text: `Share a harmless detail for a real piece of intel from ${name}. Keep receipts and track who leaks.` },
    ];
  }, [selectedTarget]);

  const targetObj = useMemo(() => contestants.find(c => c.name === selectedTarget), [contestants, selectedTarget]);
  const preview = useMemo(() => {
    if (!targetObj || !schemeType) return null;
    const disp = (targetObj.psychProfile?.disposition || []).join(' ').toLowerCase();
    const isParanoid = disp.includes('paranoid');
    const isStrategic = disp.includes('strategic');
    // Baselines per scheme type
    let trust = 0, suspicion = 0, influence = 0.08, entertainment = 0.05;
    switch (schemeType) {
      case 'vote_manipulation':
        trust = -0.04; suspicion = 0.08; influence += 0.08; break;
      case 'alliance_break':
        trust = -0.08; suspicion = 0.12; influence += 0.06; entertainment += 0.04; break;
      case 'rumor_spread':
        trust = -0.06; suspicion = 0.1; entertainment += 0.06; break;
      case 'fake_alliance':
        trust = -0.12; suspicion = 0.15; influence += 0.04; break;
      case 'information_trade':
        trust = -0.02; suspicion = 0.05; influence += 0.1; break;
    }
    if (isParanoid) suspicion += 0.05;
    if (isStrategic) influence += 0.04;
    const round = (n: number) => Math.round(n * 100) / 100;
    return { trust: round(trust), suspicion: round(suspicion), influence: round(influence), entertainment: round(entertainment) };
  }, [targetObj, schemeType]);

  const handlePresetClick = (p: Preset) => {
    setSelectedPreset(p.id);
    setSchemeType(p.tone);
    setContent(p.text);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Execute a Scheme</DialogTitle>
          <DialogDescription>High risk moves that can change trust and suspicion.</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
              <p className="text-sm text-destructive">
                Warning: Schemes can backfire spectacularly. Success depends on your reputation, the target's psychology, and pure chance.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type of Scheme</label>
              <div className="grid grid-cols-1 gap-3">
                {schemeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSchemeType(option.value)}
                    className={`p-3 text-left border border-border rounded transition-colors ${
                      schemeType === option.value 
                        ? 'bg-destructive/10 border-destructive' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground mb-1">{option.description}</div>
                    <div className="text-xs text-destructive">{option.risk}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick presets */}
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
                      <Badge variant="outline" className="text-xs capitalize">{p.tone.replace('_', ' ')}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 line-clamp-3">{p.text}</div>
                  </button>
                ))}
              </div>
            </div>

            {schemeType && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Primary Target</label>
                  <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose your target..." />
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
                  <label className="text-sm font-medium">Execution Plan</label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`Describe how you want to execute this ${selectedScheme?.label.toLowerCase()}. Be specific about your approach...`}
                    className="min-h-[120px]"
                  />
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

                <div className="bg-card border border-border rounded p-4">
                  <h4 className="font-medium mb-2">Scheme Analysis</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="text-foreground">{selectedScheme?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Risk Level:</span>
                      <span className="text-destructive">{selectedScheme?.risk}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target:</span>
                      <span className="text-foreground">{selectedTarget || 'Not selected'}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                variant="critical" 
                onClick={handleSubmit} 
                disabled={!schemeType || !selectedTarget || !content}
                className="flex-1"
              >
                Execute Scheme
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Contestant } from '@/types/game';
import { Badge } from '@/components/ui/badge';

interface SchemeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contestants: Contestant[];
  onSubmit: (target: string, content: string, tone: string) => void;
}

const PRESETS = [
  { label: 'Tilt vote', value: 'vote_manipulation', text: (name: string) => `Push subtle arguments against ${name}; never show your hand.` },
  { label: 'Seed split', value: 'alliance_break', text: (name: string) => `Plant small doubts to fracture ${name}'s alliance from inside.` },
  { label: 'Soft rumor', value: 'rumor_spread', text: (name: string) => `Float a vague concern about ${name}, no hard claims—let it breathe.` },
  { label: 'Fake bond', value: 'fake_alliance', text: (name: string) => `Offer trust to ${name} you won't keep; pull leverage later.` },
  { label: 'Trade secret', value: 'information_trade', text: (_: string) => `Exchange minor intel for loyalty—keep your core safe.` },
];

export const SchemeDialog = ({ isOpen, onClose, contestants, onSubmit }: SchemeDialogProps) => {
  const [schemeType, setSchemeType] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (schemeType && selectedTarget && content) {
      onSubmit(selectedTarget, content, schemeType);
      setSchemeType('');
      setSelectedTarget('');
      setContent('');
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

  const preview = useMemo(() => {
    if (!selectedTarget || !schemeType) return null;
    // Baseline suspicion higher for schemes; trust varies by type
    const trust =
      schemeType === 'information_trade' ? 2 :
      schemeType === 'vote_manipulation' ? 1 :
      schemeType === 'rumor_spread' ? -2 :
      schemeType === 'fake_alliance' ? -4 :
      schemeType === 'alliance_break' ? -3 : 0;
    const suspicionBase =
      schemeType === 'information_trade' ? 2 :
      schemeType === 'vote_manipulation' ? 4 :
      schemeType === 'rumor_spread' ? 6 :
      schemeType === 'fake_alliance' ? 8 :
      schemeType === 'alliance_break' ? 7 : 3;
    const influence =
      schemeType === 'vote_manipulation' ? 3 :
      schemeType === 'alliance_break' ? 2 :
      schemeType === 'information_trade' ? 2 : 1;
    const entertainment =
      schemeType === 'rumor_spread' || schemeType === 'fake_alliance' ? 3 : 2;
    return { trust, susp: suspicionBase, influence, entertainment };
  }, [selectedTarget, schemeType]);

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

          {/* Quick Suggestions */}
          {schemeType && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Quick Suggestions</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {PRESETS.filter(p => p.value === schemeType || schemeType).map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      const txt = p.text(selectedTarget || 'them');
                      setContent(txt);
                    }}
                    className="p-2 text-left border border-border rounded hover:bg-muted transition-colors"
                  >
                    <div className="text-xs text-muted-foreground">{p.label}</div>
                    <div className="text-sm">{p.text(selectedTarget || 'them')}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

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
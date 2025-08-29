import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Contestant } from '@/types/game';

interface SchemeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contestants: Contestant[];
  onSubmit: (target: string, content: string, tone: string) => void;
}

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
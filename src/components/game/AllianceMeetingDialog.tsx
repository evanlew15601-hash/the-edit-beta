import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alliance, Contestant } from '@/types/game';
import { relationshipGraphEngine } from '@/utils/relationshipGraphEngine';
import { Users, Shield, Eye } from 'lucide-react';

interface AllianceMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  alliances: Alliance[];
  contestants: Contestant[];
  playerName: string;
  onSubmit: (allianceId: string, agenda: string, tone: string) => void;
}

export const AllianceMeetingDialog = ({ isOpen, onClose, alliances, contestants, playerName, onSubmit }: AllianceMeetingDialogProps) => {
  const [selectedAlliance, setSelectedAlliance] = useState<string>('');
  const [agenda, setAgenda] = useState('');
  const [tone, setTone] = useState<string>('');

  const handleSubmit = () => {
    if (selectedAlliance && agenda && tone) {
      onSubmit(selectedAlliance, agenda, tone);
      setSelectedAlliance('');
      setAgenda('');
      setTone('');
    }
  };

  const toneOptions = [
    { value: 'strategic', label: 'Strategic', description: 'Plan moves and discuss threats', icon: '🎯' },
    { value: 'reassuring', label: 'Reassuring', description: 'Build trust and solidarity', icon: '🤝' },
    { value: 'warning', label: 'Warning', description: 'Alert about dangers', icon: '⚠️' },
    { value: 'deceptive', label: 'Deceptive', description: 'Share false information', icon: '🎭' }
  ];

  const agendaPrompts = [
    'Plan the next elimination target',
    'Discuss who to trust outside the alliance',
    'Coordinate challenge strategies',
    'Share information about other players',
    'Plan a fake alliance with others',
    'Decide how to handle a betrayal',
    'Strategize about jury management'
  ];

  const selectedAllianceData = alliances.find(a => a.id === selectedAlliance);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Alliance Meeting
          </DialogTitle>
          <DialogDescription>
            Call a private meeting with your alliance members. Outcomes depend on member trust and personalities.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            <div className="bg-primary/10 border border-primary/20 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Secret Meeting</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Alliance meetings are private and secure. Your discussion won't be overheard by outsiders.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Alliance</label>
              <Select value={selectedAlliance} onValueChange={setSelectedAlliance}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your alliance..." />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover text-popover-foreground">
                   {alliances.map((alliance) => (
                     <SelectItem key={alliance.id} value={alliance.id}>
                       <div className="flex items-center gap-2">
                         <span>{alliance.name || `Alliance ${alliance.id.slice(-4)}`}</span>
                         <Badge variant="outline">
                           {alliance.members.length} members
                         </Badge>
                       </div>
                     </SelectItem>
                   ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAllianceData && (
              <div className="bg-muted border border-border rounded p-3">
                <h4 className="font-medium mb-2">Alliance Members</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedAllianceData.members.map(member => {
                    const contestant = contestants.find(c => c.name === member);
                    return (
                      <div key={member} className="flex items-center gap-1 bg-background border border-border rounded px-2 py-1">
                        <span className="text-sm">{member}</span>
                        {(() => {
                          const relationship = relationshipGraphEngine.getRelationship(playerName, member);
                          const trustLevel = relationship?.trust || 50;
                          return (
                            <span className="text-xs text-muted-foreground">
                              (Trust: {Math.round(trustLevel)})
                            </span>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Meeting Agenda</label>
              <Textarea
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder="What do you want to discuss with your alliance?"
                className="min-h-[100px]"
              />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Suggested topics:</p>
                <div className="grid grid-cols-1 gap-1">
                  {agendaPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setAgenda(prompt)}
                      className="text-left hover:text-foreground transition-colors"
                    >
                      • {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Meeting Tone</label>
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
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{option.icon}</span>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </div>
                    </div>
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
                disabled={!selectedAlliance || !agenda || !tone}
                className="flex-1"
              >
                Call Meeting
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
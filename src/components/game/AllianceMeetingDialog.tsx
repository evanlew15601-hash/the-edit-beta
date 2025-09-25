import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alliance, Contestant } from '@/types/game';
import { relationshipGraphEngine } from '@/utils/relationshipGraphEngine';
import { Users, Shield } from 'lucide-react';

interface AllianceMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  alliances: Alliance[];
  contestants: Contestant[];
  playerName: string;
  onSubmit: (allianceId: string, agenda: string, tone: string) => void;
}

type Preset = { id: string; label: string; text: string; tone: 'strategic' | 'reassuring' | 'warning' | 'deceptive' };

export const AllianceMeetingDialog = ({ isOpen, onClose, alliances, contestants, playerName, onSubmit }: AllianceMeetingDialogProps) => {
  const [selectedAlliance, setSelectedAlliance] = useState<string>('');
  const [agenda, setAgenda] = useState('');
  const [tone, setTone] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const handleSubmit = () => {
    if (selectedAlliance && agenda && tone) {
      onSubmit(selectedAlliance, agenda, tone);
      setSelectedAlliance('');
      setAgenda('');
      setTone('');
      setSelectedPreset('');
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

  const presets: Preset[] = useMemo(() => {
    return [
      { id: 'lock_targets', label: 'Lock targets (strategic)', tone: 'strategic', text: 'Two names only this week. Keep chatter minimal. We move as one and show no cracks.' },
      { id: 'reassure', label: 'Reassure members', tone: 'reassuring', text: 'We keep it steady and protect each other. If someone hears noise, bring it here first.' },
      { id: 'warn', label: 'Warning about leaks', tone: 'warning', text: 'A leak hit the room. We tighten channels—no side DMs. If you hear my name, report immediately.' },
      { id: 'deception_plan', label: 'Deception: fake bond', tone: 'deceptive', text: 'We set a soft trap: offer a casual bond to an outsider and trace if they leak. Keep receipts.' },
    ];
  }, []);

  const preview = useMemo(() => {
    if (!tone || !selectedAllianceData) return null;
    let trust = tone === 'reassuring' ? 0.12 : tone === 'strategic' ? 0.08 : tone === 'warning' ? -0.02 : tone === 'deceptive' ? -0.06 : 0.05;
    let suspicion = tone === 'deceptive' ? 0.08 : tone === 'warning' ? 0.06 : tone === 'strategic' ? 0.02 : tone === 'reassuring' ? -0.02 : 0.03;
    let influence = tone === 'strategic' ? 0.08 : 0.06;
    let entertainment = 0.04;
    const round = (n: number) => Math.round(n * 100) / 100;
    return { trust: round(trust), suspicion: round(suspicion), influence: round(influence), entertainment: round(entertainment) };
  }, [tone, selectedAllianceData]);

  const handlePresetClick = (p: Preset) => {
    setSelectedPreset(p.id);
    setTone(p.tone);
    setAgenda(p.text);
  };

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
                      <Badge variant="outline" className="text-xs capitalize">{p.tone}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 line-clamp-3">{p.text}</div>
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
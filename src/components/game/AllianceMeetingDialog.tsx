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

const QUICK_SUGGESTIONS = [
  { label: 'Lock targets (strategic)', tone: 'strategic', agenda: 'Lock next target and assign cover stories.' },
  { label: 'Reassure', tone: 'reassuring', agenda: 'Reassure everyone of loyalty and tighten trust.' },
  { label: 'Warn', tone: 'warning', agenda: 'Issue quiet warnings about possible betrayals.' },
  { label: 'Deception plan', tone: 'deceptive', agenda: 'Share a deceptive narrative to mislead outsiders.' },
];

export const AllianceMeetingDialog = ({ isOpen, onClose, alliances, contestants, playerName, onSubmit }: AllianceMeetingDialogProps) => {
  const [selectedAlliance, setSelectedAlliance] = useState<string>('');
  const [agenda, setAgenda] = useState('');
  const [tone, setTone] = useState<string>('');
  const [pitchTarget, setPitchTarget] = useState<string>('');

  const handleSubmit = () => {
    if (selectedAlliance && agenda && tone) {
      const finalAgenda = pitchTarget ? `${agenda} [PitchTarget: ${pitchTarget}]` : agenda;
      onSubmit(selectedAlliance, finalAgenda, tone);
      setSelectedAlliance('');
      setAgenda('');
      setTone('');
      setPitchTarget('');
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

  const preview = useMemo(() => {
    if (!selectedAllianceData || !tone) return null;
    const members = selectedAllianceData.members
      .map(name => contestants.find(c => c.name === name))
      .filter(Boolean) as Contestant[];
    if (!members.length) return null;

    const avgTrust = members.reduce((sum, m) => sum + (m.psychProfile.trustLevel || 0), 0) / members.length;
    const paranoidCount = members.filter(m => m.psychProfile.disposition.includes('paranoid')).length;
    const strategicCount = members.filter(m => m.psychProfile.disposition.includes('calculating') || m.psychProfile.disposition.includes('analytical')).length;
    const socialCount = members.filter(m => m.psychProfile.disposition.includes('diplomatic') || m.psychProfile.disposition.includes('agreeable')).length;

    // Base deltas scaled by tone
    let trust = tone === 'reassuring' ? 4 : tone === 'strategic' ? 2 : tone === 'warning' ? -1 : -2;
    let susp = tone === 'deceptive' ? 4 : tone === 'warning' ? 3 : tone === 'strategic' ? 1 : -1;
    let influence = tone === 'strategic' ? 4 : tone === 'deceptive' ? 3 : 2;
    let entertainment = tone === 'reassuring' ? 2 : tone === 'warning' ? 2 : 1;

    // Persona-aware weights
    trust += Math.round((avgTrust / 50) - 1); // avgTrust amplifies/dampens
    susp += paranoidCount; // paranoid members increase suspicion
    trust += Math.max(0, socialCount - 1); // social members increase trust
    entertainment += Math.max(0, Math.floor(socialCount / 2)); // social -> more entertainment
    influence += Math.max(0, strategicCount - 1); // strategic -> more influence

    // Tone-specific adjustments
    if (tone === 'warning') {
      trust -= paranoidCount; // warnings hurt trust with paranoid folks
    }
    if (tone === 'strategic') {
      influence += Math.ceil(strategicCount / 2);
    }
    if (tone === 'deceptive') {
      susp += Math.ceil(paranoidCount / 2);
    }

    return { trust, susp, influence, entertainment };
  }, [selectedAllianceData, tone, contestants]);

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

            {/* Simplified pitch: choose a single elimination target for the alliance */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Pitch Target (optional)</label>
              <Select value={pitchTarget} onValueChange={setPitchTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="Select someone to pitch as the vote target..." />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover text-popover-foreground">
                  {contestants
                    .filter(c => !c.isEliminated && c.name !== playerName)
                    .filter(c => !selectedAllianceData || !selectedAllianceData.members.includes(c.name))
                    .map(c => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name} - {c.publicPersona}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">If set, the agenda will include this pitched target and meeting will try to align alliance plans to it.</p>
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quick Suggestions</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {QUICK_SUGGESTIONS.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => {
                      setAgenda(q.agenda);
                      setTone(q.tone);
                    }}
                    className="p-2 text-left border border-border rounded hover:bg-muted transition-colors"
                  >
                    <div className="text-xs text-muted-foreground">{q.label}</div>
                    <div className="text-sm">{q.agenda}</div>
                  </button>
                ))}
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
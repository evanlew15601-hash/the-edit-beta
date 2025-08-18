import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GameState, Alliance } from '@/types/game';
import { relationshipGraphEngine } from '@/utils/relationshipGraphEngine';
import { Users, MessageSquare } from 'lucide-react';

interface SelectiveAllianceMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (allianceId: string, attendees: string[], agenda: string, tone: string) => void;
  gameState: GameState;
}

export const SelectiveAllianceMeetingDialog = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  gameState 
}: SelectiveAllianceMeetingDialogProps) => {
  const [selectedAlliance, setSelectedAlliance] = useState<string>('');
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [agenda, setAgenda] = useState('');
  const [tone, setTone] = useState('');

  const playerAlliances = gameState.alliances.filter(alliance =>
    alliance.members.includes(gameState.playerName)
  );

  const selectedAllianceData = playerAlliances.find(a => a.id === selectedAlliance);

  const handleAttendeeToggle = (memberName: string) => {
    setSelectedAttendees(prev => 
      prev.includes(memberName)
        ? prev.filter(name => name !== memberName)
        : [...prev, memberName]
    );
  };

  const handleSubmit = () => {
    if (selectedAlliance && selectedAttendees.length > 0 && agenda && tone) {
      onSubmit(selectedAlliance, selectedAttendees, agenda, tone);
      setSelectedAlliance('');
      setSelectedAttendees([]);
      setAgenda('');
      setTone('');
    }
  };

  const getMemberTrustLevel = (memberName: string) => {
    const relationship = relationshipGraphEngine.getRelationship(gameState.playerName, memberName);
    return relationship?.trust || 0;
  };

  const getMemberLoyalty = (memberName: string) => {
    const trust = getMemberTrustLevel(memberName);
    if (trust >= 8) return { label: 'Loyal', color: 'text-edit-hero' };
    if (trust >= 6) return { label: 'Trustworthy', color: 'text-foreground' };
    if (trust >= 4) return { label: 'Neutral', color: 'text-muted-foreground' };
    if (trust >= 2) return { label: 'Suspicious', color: 'text-edit-villain' };
    return { label: 'Untrustworthy', color: 'text-edit-villain' };
  };

  const toneOptions = [
    { value: 'strategic', label: 'Strategic', description: 'Focus on game moves and voting plans' },
    { value: 'diplomatic', label: 'Diplomatic', description: 'Build consensus and maintain harmony' },
    { value: 'urgent', label: 'Urgent', description: 'Address immediate threats and concerns' },
    { value: 'secretive', label: 'Secretive', description: 'Share sensitive information carefully' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-surveillance-active" />
            Private Alliance Meeting
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alliance Selection */}
          {playerAlliances.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Select Alliance</label>
              <Select value={selectedAlliance} onValueChange={setSelectedAlliance}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an alliance..." />
                </SelectTrigger>
                <SelectContent>
                  {playerAlliances.map(alliance => (
                    <SelectItem key={alliance.id} value={alliance.id}>
                      Alliance {alliance.id} ({alliance.members.length} members)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Member Selection */}
          {selectedAllianceData && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Select Attendees</label>
              <div className="grid grid-cols-1 gap-3">
                {selectedAllianceData.members
                  .filter(member => member !== gameState.playerName)
                  .map(member => {
                    const loyalty = getMemberLoyalty(member);
                    const trust = getMemberTrustLevel(member);
                    
                    return (
                      <div
                        key={member}
                        className="flex items-center justify-between p-3 border border-border rounded"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedAttendees.includes(member)}
                            onCheckedChange={() => handleAttendeeToggle(member)}
                          />
                          <div>
                            <p className="font-medium">{member}</p>
                            <p className={`text-xs ${loyalty.color}`}>
                              {loyalty.label} (Trust: {trust}/10)
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          {trust >= 7 ? 'Will likely agree' :
                           trust >= 5 ? 'May have questions' :
                           trust >= 3 ? 'Might be hesitant' :
                           'Could be resistant'}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Meeting Agenda */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Meeting Agenda</label>
            <Textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="What do you want to discuss? (voting plans, concerns, strategy adjustments...)"
              className="min-h-[100px]"
            />
          </div>

          {/* Meeting Tone */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Meeting Tone</label>
            <div className="grid grid-cols-1 gap-2">
              {toneOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setTone(option.value)}
                  className={`p-3 text-left border border-border rounded transition-colors ${
                    tone === option.value 
                      ? 'bg-surveillance-active/10 border-surveillance-active' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="surveillance"
              onClick={handleSubmit}
              disabled={!selectedAlliance || selectedAttendees.length === 0 || !agenda || !tone}
              className="flex-1"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Start Meeting
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
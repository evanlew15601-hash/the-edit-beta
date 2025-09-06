import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alliance, Contestant } from '@/types/game';
import { relationshipGraphEngine } from '@/utils/relationshipGraphEngine';
import { Users, UserPlus, Shield } from 'lucide-react';

interface AddAllianceMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  alliances: Alliance[];
  contestants: Contestant[];
  playerName: string;
  onSubmit: (allianceId: string, newMembers: string[]) => void;
}

export const AddAllianceMemberDialog = ({ isOpen, onClose, alliances, contestants, playerName, onSubmit }: AddAllianceMemberDialogProps) => {
  const [selectedAlliance, setSelectedAlliance] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const handleSubmit = () => {
    if (selectedAlliance && selectedMembers.length > 0) {
      onSubmit(selectedAlliance, selectedMembers);
      setSelectedAlliance('');
      setSelectedMembers([]);
    }
  };

  const handleMemberToggle = (member: string) => {
    setSelectedMembers(prev => 
      prev.includes(member) 
        ? prev.filter(m => m !== member)
        : [...prev, member]
    );
  };

  const playerAlliances = alliances.filter(alliance => alliance.members.includes(playerName));
  const selectedAllianceData = alliances.find(a => a.id === selectedAlliance);
  
  const availableContestants = contestants.filter(c => 
    !c.isEliminated && 
    c.name !== playerName && 
    !selectedAllianceData?.members.includes(c.name)
  );

  const getTrustLevel = (contestantName: string) => {
    const relationship = relationshipGraphEngine.getRelationship(playerName, contestantName);
    return relationship?.trust || 50;
  };

  const getTrustColor = (trust: number) => {
    if (trust >= 70) return 'text-green-600';
    if (trust >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAcceptanceChance = (trust: number) => {
    if (trust >= 80) return 'Very Likely';
    if (trust >= 60) return 'Likely';
    if (trust >= 40) return 'Uncertain';
    if (trust >= 20) return 'Unlikely';
    return 'Very Unlikely';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add Alliance Members
          </DialogTitle>
          <DialogDescription>
            Invite additional members to strengthen your existing alliances. Trust levels affect acceptance rates.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            <div className="bg-primary/10 border border-primary/20 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Alliance Expansion</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Expanding alliances requires trust. Higher trust levels mean better acceptance rates.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Alliance to Expand</label>
              <Select value={selectedAlliance} onValueChange={setSelectedAlliance}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your alliance..." />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover text-popover-foreground">
                  {playerAlliances.map((alliance) => (
                    <SelectItem key={alliance.id} value={alliance.id}>
                      <div className="flex items-center gap-2">
                        <span>{alliance.name || `Alliance ${alliance.id.slice(-4)}`}</span>
                        <Badge variant="outline">
                          {alliance.members.length} members
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className={alliance.strength > 70 ? 'text-green-600' : alliance.strength > 40 ? 'text-yellow-600' : 'text-red-600'}
                        >
                          {alliance.strength}% trust
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAllianceData && (
              <div className="bg-muted border border-border rounded p-3">
                <h4 className="font-medium mb-2">Current Alliance Members</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedAllianceData.members.map(member => (
                    <Badge key={member} variant="secondary">
                      {member}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedAlliance && (
              <div className="space-y-3">
                <label className="text-sm font-medium">Available Contestants</label>
                <div className="space-y-3">
                  {availableContestants.map(contestant => {
                    const trust = getTrustLevel(contestant.name);
                    const isSelected = selectedMembers.includes(contestant.name);
                    
                    return (
                      <div key={contestant.name} className="flex items-center gap-3 p-3 border border-border rounded">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleMemberToggle(contestant.name)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{contestant.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {contestant.publicPersona}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-muted-foreground">
                              Trust: <span className={getTrustColor(trust)}>{Math.round(trust)}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Acceptance: <span className={getTrustColor(trust)}>{getAcceptanceChance(trust)}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                disabled={!selectedAlliance || selectedMembers.length === 0}
                className="flex-1"
              >
                Add Members ({selectedMembers.length})
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
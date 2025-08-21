import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Contestant } from '@/types/game';
import { relationshipGraphEngine } from '@/utils/relationshipGraphEngine';
import { Users, Shield, Plus } from 'lucide-react';

interface CreateAllianceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contestants: Contestant[];
  playerName: string;
  onSubmit: (name: string, members: string[]) => void;
}

export const CreateAllianceDialog = ({ isOpen, onClose, contestants, playerName, onSubmit }: CreateAllianceDialogProps) => {
  const [allianceName, setAllianceName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([playerName]);

  const availableContestants = contestants.filter(c => 
    !c.isEliminated && c.name !== playerName
  );

  const handleMemberToggle = (memberName: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberName) 
        ? prev.filter(m => m !== memberName)
        : [...prev, memberName]
    );
  };

  const handleSubmit = () => {
    if (allianceName.trim() && selectedMembers.length >= 2) {
      onSubmit(allianceName.trim(), selectedMembers);
      setAllianceName('');
      setSelectedMembers([playerName]);
      onClose();
    }
  };

  const getTrustLevel = (memberName: string) => {
    const relationship = relationshipGraphEngine.getRelationship(playerName, memberName);
    return relationship?.trust || 50;
  };

  const getTrustColor = (trust: number) => {
    if (trust >= 70) return 'text-green-500';
    if (trust >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Create New Alliance
          </DialogTitle>
          <DialogDescription>
            Form a strategic partnership with other contestants. Choose wisely - loyalty matters.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            <div className="bg-primary/10 border border-primary/20 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Alliance Formation</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Creating an alliance sends invitations to selected members. Success depends on your relationships.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alliance-name">Alliance Name</Label>
              <Input
                id="alliance-name"
                value={allianceName}
                onChange={(e) => setAllianceName(e.target.value)}
                placeholder="Enter alliance name..."
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <Label>Select Members (including yourself)</Label>
              
              <div className="bg-muted border border-border rounded p-3 mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">You</span>
                  <Badge variant="outline">Leader</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {playerName} (Alliance founder)
                </p>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableContestants.map(contestant => {
                  const isSelected = selectedMembers.includes(contestant.name);
                  const trustLevel = getTrustLevel(contestant.name);
                  const likelihood = trustLevel >= 60 ? 'High' : trustLevel >= 40 ? 'Medium' : 'Low';
                  
                  return (
                    <div 
                      key={contestant.name} 
                      className="flex items-center justify-between p-3 border border-border rounded hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleMemberToggle(contestant.name)}
                        />
                        <div>
                          <p className="font-medium">{contestant.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Trust: <span className={getTrustColor(trustLevel)}>{Math.round(trustLevel)}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge 
                          variant={likelihood === 'High' ? 'default' : likelihood === 'Medium' ? 'secondary' : 'destructive'}
                        >
                          {likelihood} chance
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {likelihood === 'High' ? 'Very likely to accept' : 
                           likelihood === 'Medium' ? 'Might accept' : 'Unlikely to accept'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-muted border border-border rounded p-3">
              <p className="text-sm font-medium mb-1">Alliance Summary</p>
              <p className="text-xs text-muted-foreground">
                <strong>{selectedMembers.length}</strong> total members selected
              </p>
              <p className="text-xs text-muted-foreground">
                Larger alliances are harder to manage but provide more security
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                variant="action" 
                onClick={handleSubmit} 
                disabled={!allianceName.trim() || selectedMembers.length < 2}
                className="flex-1"
              >
                Create Alliance
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
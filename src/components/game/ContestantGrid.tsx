import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Contestant } from '@/types/game';

interface ContestantGridProps {
  contestants: Contestant[];
}

export const ContestantGrid = ({ contestants }: ContestantGridProps) => {
  const activeContestants = contestants.filter(c => !c.isEliminated);
  const eliminatedContestants = contestants.filter(c => c.isEliminated);

  const getTrustColor = (trustLevel: number) => {
    if (trustLevel > 30) return 'text-edit-hero';
    if (trustLevel < -30) return 'text-edit-villain';
    return 'text-muted-foreground';
  };

  const getDispositionText = (disposition: string[]) => {
    return disposition.join(', ');
  };

  return (
    <div className="space-y-6 max-h-[80vh]">
      <Card className="p-6">
        <h2 className="text-xl font-light mb-4">Active Contestants</h2>
        <ScrollArea className="max-h-[50vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
          {activeContestants.map((contestant) => (
            <div key={contestant.id} className="border border-border rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">{contestant.name}</h3>
                <div className="w-2 h-2 bg-surveillance-active rounded-full"></div>
              </div>
              
              <p className="text-sm text-muted-foreground">{contestant.publicPersona}</p>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trust Level:</span>
                  <span className={getTrustColor(contestant.psychProfile.trustLevel)}>
                    {contestant.psychProfile.trustLevel > 0 ? '+' : ''}{contestant.psychProfile.trustLevel}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Disposition:</span>
                  <span className="text-foreground">
                    {getDispositionText(contestant.psychProfile.disposition)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interactions:</span>
                  <span className="text-foreground">
                    {contestant.memory.length}
                  </span>
                </div>
              </div>

              {contestant.isMole && (
                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-destructive uppercase tracking-wide">
                    Unknown Status
                  </span>
                </div>
              )}
            </div>
          ))}
          </div>
        </ScrollArea>
      </Card>

      {eliminatedContestants.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-light mb-4">Eliminated</h2>
          <ScrollArea className="max-h-[30vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pr-4">
            {eliminatedContestants.map((contestant) => (
              <div key={contestant.id} className="border border-border rounded p-3 opacity-60">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-muted-foreground">{contestant.name}</h3>
                  <div className="w-2 h-2 bg-surveillance-inactive rounded-full"></div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Day {contestant.eliminationDay}
                </p>
              </div>
            ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Contestant } from '@/types/game';
import { Heart, Shield, Eye, Zap, AlertTriangle, Star } from 'lucide-react';
import { memoryEngine } from '@/utils/memoryEngine';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface ContestantGridProps {
  contestants: Contestant[];
  playerName?: string;
}

export const ContestantGrid = ({ contestants, playerName }: ContestantGridProps) => {
  const activeContestants = contestants.filter(c => !c.isEliminated);
  
  const getRelationshipData = (contestant: Contestant) => {
    if (!playerName) return null;
    
    const journal = memoryEngine.getMemorySystem().privateJournals[playerName];
    if (!journal) return null;
    
    return {
      threat: journal.threatAssessment[contestant.name] || 0,
      bond: journal.personalBonds[contestant.name] || 0,
      trust: contestant.psychProfile.trustLevel,
      suspicion: contestant.psychProfile.suspicionLevel
    };
  };

  const getThreatColor = (level: number) => {
    if (level >= 8) return 'text-destructive';
    if (level >= 5) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  const getRecentActivity = (contestant: Contestant) => {
    const recentMemory = contestant.memory
      .filter(m => m.participants?.includes(playerName || ''))
      .slice(-1)[0];
    
    if (!recentMemory) return null;
    
    const daysSince = Math.max(1, (Date.now() / 86400000) - recentMemory.day);
    return {
      type: recentMemory.type,
      impact: recentMemory.emotionalImpact,
      recency: daysSince
    };
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-light mb-4">Contestants</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeContestants.map((contestant) => {
            const relationshipData = getRelationshipData(contestant);
            const recentActivity = getRecentActivity(contestant);
            const isHighThreat = relationshipData && relationshipData.threat >= 7;
            const isCloseAlly = relationshipData && relationshipData.bond >= 3;
            
            return (
              <Card 
                key={contestant.id} 
                className={`p-4 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer ${
                  isHighThreat ? 'border-destructive/50 bg-destructive/5 hover:bg-destructive/10' : 
                  isCloseAlly ? 'border-green-500/50 bg-green-500/5 hover:bg-green-500/10' : 
                  'hover:bg-muted/50'
                }`}
              >
                <div className="space-y-3">
                  {/* Header with name and status indicators */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">
                        {contestant.name}
                        {contestant.name === playerName ? ' (You)' : ''}
                      </h4>
                      <p className="text-xs text-muted-foreground">{contestant.publicPersona}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {isHighThreat && <AlertTriangle className="w-4 h-4 text-destructive" />}
                      {isCloseAlly && <Heart className="w-4 h-4 text-green-500" />}
                      {recentActivity && recentActivity.recency <= 2 && (
                        <Zap className="w-3 h-3 text-yellow-500 animate-pulse" />
                      )}
                    </div>
                  </div>

                  {/* Relationship metrics */}
                  {relationshipData && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-3 h-3 text-blue-500" />
                        <span className="text-xs">Trust</span>
                        <Progress 
                          value={Math.max(0, relationshipData.trust + 100) / 2} 
                          className="flex-1 h-1"
                        />
                        <span className="text-xs w-8">{relationshipData.trust}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Eye className="w-3 h-3 text-orange-500" />
                        <span className="text-xs">Suspicion</span>
                        <Progress 
                          value={relationshipData.suspicion} 
                          className="flex-1 h-1"
                        />
                        <span className="text-xs w-8">{relationshipData.suspicion}</span>
                      </div>
                      
                      {relationshipData.threat > 0 && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3 text-destructive" />
                          <span className="text-xs">Threat Level</span>
                          <span className={`text-xs font-medium ${getThreatColor(relationshipData.threat)}`}>
                            {relationshipData.threat}/10
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recent activity indicator */}
                  {recentActivity && (
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Recent:</span>
                        <Badge 
                          variant={recentActivity.impact > 0 ? "secondary" : recentActivity.impact < 0 ? "destructive" : "outline"}
                          className="text-xs"
                        >
                          {recentActivity.type}
                        </Badge>
                        {recentActivity.recency <= 1 && (
                          <span className="text-xs text-yellow-600">Fresh</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Disposition tags */}
                  <div className="flex flex-wrap gap-1">
                    {contestant.psychProfile.disposition.slice(0, 2).map((trait, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {trait}
                      </Badge>
                    ))}
                    {/* Stat inclination badge (separate from weekly edit persona) */}
                    {contestant.stats?.primary && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="text-[10px] ml-1 cursor-help">
                            <Star className="w-3 h-3 mr-1" />
                            {contestant.stats.primary}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Primary stat inclination — influences subtle gameplay outcomes
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {/* Special background badge with tooltips - only show for the player */}
                    {contestant.name === playerName && contestant.special && contestant.special.kind !== 'none' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className="text-[10px] ml-1 cursor-help"
                          >
                            {contestant.special.kind === 'hosts_estranged_child' && 'Host’s Child'}
                            {contestant.special.kind === 'planted_houseguest' && 'Planted HG'}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {contestant.special.kind === 'hosts_estranged_child'
                            ? 'Secret relation to host. If revealed, trust shifts and edit bias rises.'
                            : 'Receives production tasks. Failing tasks risks secret reveal.'}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/enhanced-button';
import { GameState } from '@/types/game';
import { Clock, Users, AlertCircle, Star, Flame } from 'lucide-react';

interface EnhancedInformationPanelProps {
  gameState: GameState;
}

export const EnhancedInformationPanel = ({ gameState }: EnhancedInformationPanelProps) => {
  // Get recent interactions that actually matter
  const recentInteractions = (gameState.interactionLog || [])
    .filter(log => log.day >= gameState.currentDay - 3)
    .slice(0, 8);

  // Generate meaningful alliance insights
  const allianceInsights = gameState.alliances
    .filter(a => !a.dissolved && a.members.includes(gameState.playerName))
    .map(alliance => ({
      info: `${alliance.name || 'Unnamed Alliance'}: ${alliance.members.length} members, strength ${alliance.strength}%`,
      day: alliance.formed,
      type: 'alliance'
    }));

  // Get contestant relationship insights
  const relationshipInsights = gameState.contestants
    .filter(c => !c.isEliminated && c.name !== gameState.playerName)
    .slice(0, 3)
    .map(contestant => ({
      info: `${contestant.name}: Trust ${contestant.psychProfile.trustLevel}, Suspicion ${contestant.psychProfile.suspicionLevel}`,
      day: gameState.currentDay,
      type: 'relationship'
    }));

  // Elimination threats
  const threats = gameState.contestants
    .filter(c => !c.isEliminated && c.name !== gameState.playerName)
    .filter(c => c.psychProfile.suspicionLevel > 60 || c.psychProfile.trustLevel < -20)
    .slice(0, 2)
    .map(contestant => ({
      info: `${contestant.name} may be targeting you - high suspicion levels detected`,
      day: gameState.currentDay,
      type: 'threat'
    }));

  const player = gameState.contestants.find(c => c.name === gameState.playerName);
  const isPlanted = player?.special && player.special.kind === 'planted_houseguest';

  const castQuickStats = gameState.contestants
    .filter(c => !c.isEliminated)
    .slice(0, 4)
    .map(c => ({
      name: c.name,
      primary: c.stats?.primary,
      special: c.special?.kind,
    }));

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center space-x-2">
        <AlertCircle className="w-4 h-4 text-primary" />
        <h3 className="font-medium text-foreground">House Intelligence</h3>
      </div>

      <ScrollArea className="h-64">
        <div className="space-y-4">
          {/* Alliance Information */}
          {allianceInsights.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Users className="w-3 h-3 text-edit-hero" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Your Alliances
                </span>
              </div>
              {allianceInsights.map((insight, index) => (
                <div key={index} className="text-xs text-foreground border-l-2 border-edit-hero pl-2">
                  <span>{insight.info}</span>
                </div>
              ))}
            </div>
          )}

          {/* Threat Assessment */}
          {threats.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-3 h-3 text-edit-villain" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Potential Threats
                </span>
              </div>
              {threats.map((threat, index) => (
                <div key={index} className="text-xs text-foreground border-l-2 border-edit-villain pl-2">
                  <span>{threat.info}</span>
                </div>
              ))}
            </div>
          )}

          {/* Relationship Status */}
          {relationshipInsights.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Users className="w-3 h-3 text-edit-darkhorse" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Relationship Status
                </span>
              </div>
              {relationshipInsights.map((insight, index) => (
                <div key={index} className="text-xs text-foreground border-l-2 border-edit-darkhorse pl-2">
                  <span>{insight.info}</span>
                </div>
              ))}
            </div>
          )}

          {/* Cast Quick Stats (separate from weekly edit persona) */}
          {castQuickStats.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Star className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Cast Quick Stats
                </span>
              </div>
              {castQuickStats.map((c) => (
                <div key={c.name} className="text-xs text-foreground border-l-2 border-primary pl-2 flex items-center justify-between">
                  <span>{c.name}</span>
                  <div className="flex items-center gap-2">
                    {c.primary && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Star className="w-3 h-3 mr-1" />
                        {c.primary}
                      </Badge>
                    )}
                    {c.special && c.special !== 'none' && (
                      <Badge variant="outline" className="text-[10px]">
                        {c.special === 'hosts_estranged_child' ? 'Host’s Child' : 'Planted HG'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Planted Houseguest Task Panel (if applicable) */}
          {isPlanted && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Flame className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Production Tasks
                </span>
              </div>
              {(player!.special as any).tasks.map((task: any) => (
                <div key={task.id} className="text-xs text-foreground border-l-2 border-primary pl-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{task.description}</div>
                      <div className="text-[10px] text-muted-foreground">Assigned Day {task.dayAssigned}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={task.completed ? 'secondary' : 'outline'} className="text-[10px]">
                        {task.completed ? 'Completed' : 'Pending'}
                      </Badge>
                      {!task.completed && (
                        <>
                          <Button
                            variant="action"
                            size="sm"
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('plantedTaskUpdate', { detail: { taskId: task.id, completed: true } }));
                            }}
                          >
                            Complete
                          </Button>
                          <Button
                            variant="surveillance"
                            size="sm"
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('plantedTaskUpdate', { detail: { taskId: task.id, completed: false } }));
                            }}
                          >
                            Fail
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Activity */}
          {recentInteractions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Recent Activity
                </span>
              </div>
              {recentInteractions.slice(0, 4).map((interaction, index) => (
                <div key={index} className="text-xs text-foreground border-l-2 border-primary pl-2">
                  <div className="flex items-center justify-between">
                    <span>
                      {interaction.type.toUpperCase()}: {interaction.participants.filter(p => p !== gameState.playerName).join(', ')}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Day {interaction.day}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Game Status */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Game Status
            </span>
            <div className="text-xs text-foreground space-y-1">
              <div>• {gameState.contestants.filter(c => !c.isEliminated).length} contestants remaining</div>
              <div>• Next elimination: Day {gameState.nextEliminationDay}</div>
              {gameState.immunityWinner && (
                <div>• {gameState.immunityWinner} has immunity</div>
              )}
              {gameState.juryMembers && (
                <div>• Jury phase: {gameState.juryMembers.length} members</div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
};
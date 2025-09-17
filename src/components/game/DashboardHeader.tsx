import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Shield, Crown, Timer } from 'lucide-react';
import { GameState } from '@/types/game';

interface DashboardHeaderProps {
  gameState: GameState;
}

export const DashboardHeader = ({ gameState }: DashboardHeaderProps) => {
  const activeContestants = gameState.contestants.filter(c => !c.isEliminated);
  const remainingCount = activeContestants.length;
  
  // Calculate weeks until jury (enhanced countdown) - FIXED to update properly
  const daysUntilJury = Math.max(0, gameState.daysUntilJury - (gameState.currentDay - 1));
  const weeksUntilJury = daysUntilJury > 0 ? Math.ceil(daysUntilJury / 7) : 0;
  const isJuryPhase = gameState.juryMembers && gameState.juryMembers.length > 0;
  
  // Enhanced elimination countdown
  const daysUntilElimination = gameState.nextEliminationDay ? 
    Math.max(0, gameState.nextEliminationDay - gameState.currentDay) : 0;
  
  // Get phase-specific subtitle
  const getPhaseSubtitle = () => {
    if (remainingCount === 3) return "Final Three";
    if (remainingCount === 2) return "Final Two";
    if (isJuryPhase) return "Jury Phase";
    if (weeksUntilJury <= 2) return "Pre-Jury Finale";
    return "Pre-Jury";
  };

  const getPersonaColor = (persona: string) => {
    switch (persona) {
      case 'Hero': return 'text-edit-hero';
      case 'Villain': return 'text-edit-villain';
      case 'Underedited': return 'text-edit-underedited';
      case 'Ghosted': return 'text-edit-ghosted';
      case 'Comic Relief': return 'text-edit-comic';
      case 'Dark Horse': return 'text-edit-darkhorse';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-light tracking-wide">
                Day <span className="font-medium">{gameState.currentDay}</span>
              </h1>
              <p className="text-sm text-muted-foreground">{getPhaseSubtitle()}</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Remaining Contestants */}
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{remainingCount}</span>
                <span className="text-xs text-muted-foreground">left</span>
              </div>
              
              {/* Elimination Countdown */}
              {daysUntilElimination > 0 && (
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">{daysUntilElimination}</span>
                  <span className="text-xs text-muted-foreground">
                    {daysUntilElimination === 1 ? 'day' : 'days'} until elimination
                  </span>
                </div>
              )}
              
              {/* Jury Countdown or Status */}
              {!isJuryPhase && weeksUntilJury > 0 ? (
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium">{weeksUntilJury}</span>
                  <span className="text-xs text-muted-foreground">
                    {weeksUntilJury === 1 ? 'week' : 'weeks'} to jury
                  </span>
                </div>
              ) : isJuryPhase ? (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Jury Phase
                </Badge>
              ) : null}
              
              {/* Immunity Winner */}
              {gameState.immunityWinner && (
                <Badge variant="default" className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {gameState.immunityWinner} has immunity
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Debug Skip to Final 3 Button */}
            {remainingCount > 3 && (
              <button 
                onClick={() => {
                  // Trigger skip to jury via window event
                  window.dispatchEvent(new CustomEvent('skipToJury'));
                }}
                className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
              >
                Skip→Jury
              </button>
            )}
            
            {/* Test Force Elimination Button */}
            {isJuryPhase && (
              <button 
                onClick={() => {
                  // Trigger force elimination test
                  window.dispatchEvent(new CustomEvent('testForceElimination'));
                }}
                className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/80"
              >
                Test Elimination
              </button>
            )}
            
            {/* Action Count */}
            <div className="text-right">
              <div className="text-sm font-medium">
                {gameState.dailyActionCount}/{gameState.dailyActionCap}
              </div>
              <div className="text-xs text-muted-foreground">Actions</div>
            </div>
            
            {/* Edit Perception Indicator */}
            <Card className="px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground">Edit</div>
                <Badge variant={
                  gameState.editPerception.persona === 'Hero' ? 'default' :
                  gameState.editPerception.persona === 'Villain' ? 'destructive' :
                  gameState.editPerception.persona === 'Underedited' ? 'secondary' : 'outline'
                }>
                  {gameState.editPerception.persona}
                </Badge>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Shield, Crown, Timer, Star } from 'lucide-react';
import { GameState } from '@/types/game';

interface DashboardHeaderProps {
  gameState: GameState;
  onSave?: () => void;
  onLoad?: () => void;
  onDeleteSave?: () => void;
  onTitle?: () => void;
  onToggleDebug?: () => void;
  hasSave?: boolean;
  onOpenRoster?: () => void;
}

export const DashboardHeader = ({ gameState, onSave, onLoad, onDeleteSave, onTitle, onToggleDebug, hasSave, onOpenRoster }: DashboardHeaderProps) => {
  const activeContestants = gameState.contestants.filter(c => !c.isEliminated);
  const remainingCount = activeContestants.length;
  
  // Calculate weeks until jury (enhanced countdown)
  const daysUntilJury = Math.max(0, (gameState.daysUntilJury || 0) - (gameState.currentDay - 1));
  const weeksUntilJury = daysUntilJury > 0 ? Math.ceil(daysUntilJury / 7) : 0;
  const isJuryPhase = gameState.juryMembers && gameState.juryMembers.length > 0;
  
  // Elimination countdown
  const daysUntilElimination = gameState.nextEliminationDay ? 
    Math.max(0, gameState.nextEliminationDay - gameState.currentDay) : 0;
  
  const getPhaseSubtitle = () => {
    if (remainingCount === 3) return "Final Three";
    if (remainingCount === 2) return "Final Two";
    if (isJuryPhase) return "Jury Phase";
    if (weeksUntilJury <= 2) return "Pre-Jury Finale";
    return "Pre-Jury";
  };

  // Roster quick access toggle, persisted
  const [rosterPinned, setRosterPinned] = useState<boolean>(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('rtv_roster_button_pinned');
      setRosterPinned(raw ? JSON.parse(raw) : false);
    } catch {}
  }, []);
  const toggleRosterPinned = () => {
    const next = !rosterPinned;
    setRosterPinned(next);
    try {
      localStorage.setItem('rtv_roster_button_pinned', JSON.stringify(next));
    } catch {}
  };

  const showRosterButton = gameState.gamePhase === 'premiere' || rosterPinned;

  return (
    <div className="bg-background/90 backdrop-blur-md border-b border-border/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 md:gap-6">
            <div>
              <h1 className="text-xl md:text-2xl font-medium tracking-wide">
                Day <span className="font-medium">{gameState.currentDay}</span>
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">{getPhaseSubtitle()}</p>
            </div>
            
            <div className="flex items-center gap-3 md:gap-4">
              {/* Remaining Contestants */}
              <div className="flex items-center gap-2" aria-label="Remaining contestants">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{remainingCount}</span>
                <span className="text-xs text-muted-foreground">left</span>
              </div>
              
              {/* Elimination Countdown */}
              {daysUntilElimination > 0 && (
                <div className="flex items-center gap-2" aria-label="Days until elimination">
                  <Timer className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">{daysUntilElimination}</span>
                  <span className="text-xs text-muted-foreground">
                    {daysUntilElimination === 1 ? 'day' : 'days'} until elimination
                  </span>
                </div>
              )}
              
              {/* Jury Countdown or Status */}
              {!isJuryPhase && weeksUntilJury > 0 ? (
                <div className="flex items-center gap-2" aria-label="Weeks until jury">
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
                <Badge variant="default" className="flex items-center gap-1" aria-label="Immunity winner">
                  <Shield className="w-3 h-3" />
                  {gameState.immunityWinner} has immunity
                </Badge>
              )}

              {/* Roster quick access */}
              {showRosterButton && (
                <div className="flex items-center gap-1">
                  <Button variant="secondary" size="sm" onClick={onOpenRoster} aria-label="Meet the Houseguests">
                    <Users className="w-4 h-4 mr-1" />
                    Roster
                  </Button>
                  <Button
                    variant={rosterPinned ? 'secondary' : 'outline'}
                    size="icon"
                    onClick={toggleRosterPinned}
                    aria-pressed={rosterPinned}
                    aria-label="Pin roster button"
                    className="h-8 w-8"
                    title="Pin roster button"
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            {/* Action Count */}
            <div className="text-right hidden sm:block" aria-label="Action count">
              <div className="text-sm font-medium">
                {gameState.dailyActionCount}/{gameState.dailyActionCap}
              </div>
              <div className="text-xs text-muted-foreground">Actions</div>
            </div>
            
            {/* Edit Perception Indicator */}
            <Card className="px-2 md:px-3 py-2 hidden sm:block rounded-md" aria-label="Edit persona">
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

            {/* Unified Controls */}
            <div className="flex items-center gap-1 md:gap-2">
              <Button variant="secondary" size="sm" onClick={onSave} aria-label="Save game">
                Save
              </Button>
              <Button variant="secondary" size="sm" onClick={onLoad} aria-label="Load last save" disabled={!hasSave}>
                Load
              </Button>
              <Button variant="outline" size="sm" onClick={onDeleteSave} aria-label="Delete saved game" disabled={!hasSave}>
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={onTitle} aria-label="Quit to title">
                Title
              </Button>
              <Button
                variant={gameState.debugMode ? 'secondary' : 'outline'}
                size="sm"
                onClick={onToggleDebug}
                aria-pressed={gameState.debugMode}
                aria-label="Toggle debug"
              >
                Debug: {gameState.debugMode ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
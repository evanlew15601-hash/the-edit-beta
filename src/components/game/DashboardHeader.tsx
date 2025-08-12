import { GameState } from '@/types/game';

interface DashboardHeaderProps {
  gameState: GameState;
}

export const DashboardHeader = ({ gameState }: DashboardHeaderProps) => {
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
    <div className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div>
              <h1 className="text-2xl font-light tracking-wide text-foreground">
                THE EDIT
              </h1>
              <p className="text-sm text-muted-foreground">
                Day {gameState.currentDay} • {gameState.contestants.filter(c => !c.isEliminated).length} Remaining
              </p>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Screen Time</p>
                <p className="text-lg font-light text-foreground">
                  {gameState.editPerception.screenTimeIndex}%
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Approval</p>
                <p className={`text-lg font-light ${
                  gameState.editPerception.audienceApproval > 0 ? 'text-edit-hero' : 
                  gameState.editPerception.audienceApproval < 0 ? 'text-edit-villain' : 
                  'text-foreground'
                }`}>
                  {gameState.editPerception.audienceApproval > 0 ? '+' : ''}{gameState.editPerception.audienceApproval}
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Edit Status</p>
                <p className={`text-sm font-light ${getPersonaColor(gameState.editPerception.persona)}`}>
                  {gameState.editPerception.persona}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {gameState.immunityWinner ? (
              <div className="px-2 py-1 rounded-md border border-primary/30 bg-primary/10">
                <span className="text-xs text-primary uppercase tracking-wide">Immunity: {gameState.immunityWinner}</span>
              </div>
            ) : null}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-surveillance-active rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Live</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
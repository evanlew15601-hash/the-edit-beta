import { Button } from '@/components/ui/enhanced-button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState, WeeklyEdit } from '@/types/game';

interface WeeklyRecapScreenProps {
  gameState: GameState;
  onContinue: () => void;
}

export const WeeklyRecapScreen = ({ gameState, onContinue }: WeeklyRecapScreenProps) => {
  const currentWeek = Math.floor(gameState.currentDay / 7);
  const weeklyConfessionals = gameState.confessionals.filter(
    c => c.day > (currentWeek - 1) * 7 && c.day <= currentWeek * 7
  );

  // Generate weekly edit summary
  const weeklyEdit: WeeklyEdit = {
    week: currentWeek,
    playerPersona: gameState.editPerception.persona,
    selectedQuote: gameState.editPerception.weeklyQuote || 'No significant confessionals this week',
    approvalShift: gameState.editPerception.lastEditShift,
    eventMontage: [
      'Strategic conversations in the common area',
      'Heated discussion about loyalty and trust',
      'Private alliance meetings in the dead of night',
      'Emotional confessions in the diary room'
    ],
    realityVsEdit: {
      whatHappened: 'Complex web of relationships, strategic planning, and genuine emotional moments',
      whatWasShown: 'Edited to emphasize drama, conflict, and your current narrative arc'
    }
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
    <div className="min-h-screen bg-background">
      <ScrollArea className="h-screen">
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-8 pr-4">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-light tracking-wide text-foreground">
            WEEKLY EDIT
          </h1>
          <div className="w-24 h-px bg-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground font-light tracking-wider uppercase">
            Week {currentWeek} Recap
          </p>
        </div>

        {/* Player Edit Summary */}
        <Card className="p-8 space-y-6">
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-light text-foreground">Your Public Persona</h2>
            <p className={`text-3xl font-light ${getPersonaColor(weeklyEdit.playerPersona)}`}>
              {weeklyEdit.playerPersona}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Screen Time Index</p>
                <p className="text-2xl font-light text-foreground">
                  {gameState.editPerception.screenTimeIndex}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Approval Shift</p>
                <p className={`text-2xl font-light ${
                  weeklyEdit.approvalShift > 0 ? 'text-edit-hero' : 
                  weeklyEdit.approvalShift < 0 ? 'text-edit-villain' : 
                  'text-foreground'
                }`}>
                  {weeklyEdit.approvalShift > 0 ? '+' : ''}{weeklyEdit.approvalShift}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Featured Quote */}
        <Card className="p-6">
          <h3 className="text-xl font-light mb-4">Featured Confessional</h3>
          <blockquote className="border-l-4 border-primary pl-6 italic text-lg leading-relaxed text-foreground">
            "{weeklyEdit.selectedQuote}"
          </blockquote>
          <p className="text-sm text-muted-foreground mt-3">
            - {gameState.playerName}, Diary Room
          </p>
        </Card>

        {/* Event Montage */}
        <Card className="p-6">
          <h3 className="text-xl font-light mb-4">This Week's Drama</h3>
          <div className="space-y-3">
            {weeklyEdit.eventMontage.map((event, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-surveillance-active rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-foreground">{event}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Reality vs Edit */}
        <Card className="p-6">
          <h3 className="text-xl font-light mb-4">Behind the Edit</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 text-edit-hero">What Really Happened</h4>
              <p className="text-sm text-foreground leading-relaxed">
                {weeklyEdit.realityVsEdit.whatHappened}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-3 text-edit-villain">What Was Shown</h4>
              <p className="text-sm text-foreground leading-relaxed">
                {weeklyEdit.realityVsEdit.whatWasShown}
              </p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-muted rounded border border-border">
            <p className="text-xs text-muted-foreground">
              Remember: The edit shapes everything. Your actions matter, but how they're presented matters more.
            </p>
          </div>
        </Card>

        {/* Stats Summary */}
        <Card className="p-6">
          <h3 className="text-xl font-light mb-4">Week {currentWeek} Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-light text-foreground">{weeklyConfessionals.length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Confessionals</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-light text-foreground">
                {gameState.contestants.filter(c => !c.isEliminated).length}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Remaining</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-light text-foreground">{gameState.alliances.length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Alliances</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-light text-foreground">{gameState.currentDay}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Days Survived</p>
            </div>
          </div>
        </Card>

        {/* Continue Button */}
        <div className="text-center pt-6">
          <Button 
            variant="surveillance" 
            size="wide" 
            onClick={onContinue}
          >
            Continue to Next Week
          </Button>
        </div>
        </div>
      </ScrollArea>
    </div>
  );
};
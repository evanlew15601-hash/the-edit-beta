import { Button } from '@/components/ui/enhanced-button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState, WeeklyEdit } from '@/types/game';
import { generateFanReactions } from '@/utils/fanReactions';
import { buildWeeklyEdit } from '@/utils/weeklyEditBuilder';
import { calculateLegacyEditPerception } from '@/utils/editEngine';

interface WeeklyRecapScreenProps {
  gameState: GameState;
  onContinue: () => void;
}

export const WeeklyRecapScreen = ({ gameState, onContinue }: WeeklyRecapScreenProps) => {
  const currentWeek = Math.floor((gameState.currentDay - 1) / 7) + 1;
  const weekStartDay = (currentWeek - 1) * 7 + 1;
  const weekEndDay = currentWeek * 7;
  
  const weeklyConfessionals = gameState.confessionals.filter(
    c => c.day >= weekStartDay && c.day <= weekEndDay
  );
  
  console.log(`Week ${currentWeek} confessionals:`, weeklyConfessionals.length, 'from days', weekStartDay, 'to', weekEndDay);

  // Generate weekly edit summary and update edit perception
  const weeklyEdit: WeeklyEdit = buildWeeklyEdit(gameState);
  const updatedEditPerception = calculateLegacyEditPerception(
    gameState.confessionals,
    gameState.editPerception,
    gameState.currentDay,
    gameState
  );

  const fanReactions = generateFanReactions(gameState);

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
        
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-light tracking-wide text-foreground">Weekly Edit Recap</h1>
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
                  {updatedEditPerception.screenTimeIndex}%
                </p>
                {updatedEditPerception.lastEditShift !== 0 && (
                  <p className={`text-xs ${updatedEditPerception.lastEditShift > 0 ? 'text-edit-hero' : 'text-edit-villain'}`}>
                    {updatedEditPerception.lastEditShift > 0 ? '+' : ''}{updatedEditPerception.lastEditShift} this week
                  </p>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Audience Approval</p>
                <p className={`text-2xl font-light ${
                  updatedEditPerception.audienceApproval > 0 ? 'text-edit-hero' : 
                  updatedEditPerception.audienceApproval < 0 ? 'text-edit-villain' : 
                  'text-foreground'
                }`}>
                  {updatedEditPerception.audienceApproval > 0 ? '+' : ''}{Math.round(updatedEditPerception.audienceApproval)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Featured Quote */}
        <Card className="p-6">
          <h3 className="text-xl font-light mb-4">Featured Confessional</h3>
          <blockquote className="border-l-4 border-primary pl-6 italic text-lg leading-relaxed text-foreground">
            "{updatedEditPerception.weeklyQuote || weeklyEdit.selectedQuote || 'No significant confessionals this week.'}"
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

        {/* Viral Moments (actually happened) */}
        {weeklyEdit.viralMoments?.length ? (
          <Card className="p-6">
            <h3 className="text-xl font-light mb-4">Viral Moments</h3>
            <div className="space-y-2">
              {weeklyEdit.viralMoments.map((m, i) => (
                <p key={i} className="text-sm text-foreground">• {m}</p>
              ))}
            </div>
          </Card>
        ) : null}

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

        {/* Fan Reactions */}
        <Card className="p-6">
          <h3 className="text-xl font-light mb-4">Fan Reactions</h3>
          <div className="space-y-2">
            {fanReactions.map((r, i) => (
              <p key={i} className="text-sm text-foreground">• {r}</p>
            ))}
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

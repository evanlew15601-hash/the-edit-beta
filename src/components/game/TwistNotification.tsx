import { Button } from '@/components/ui/enhanced-button';
import { Card } from '@/components/ui/card';
import { GameState } from '@/types/game';

interface TwistNotificationProps {
  gameState: GameState;
}

export const TwistNotification = ({ gameState }: TwistNotificationProps) => {
  const recentTwist = gameState.twistsActivated[gameState.twistsActivated.length - 1];
  
  if (!recentTwist) return null;

  const getTwistMessage = (twistId: string) => {
    if (twistId.includes('confessional_leak')) {
      return {
        title: 'TWIST: Confessional Leak',
        description: 'Your recent diary room sessions have been leaked to all contestants!',
        impact: 'Trust levels with all contestants have been severely impacted.'
      };
    }
    if (twistId.includes('mole_reveal')) {
      return {
        title: 'TWIST: The Mole Revealed',
        description: 'One of the contestants has been working for production this entire time.',
        impact: 'House dynamics have completely shifted. Paranoia is at an all-time high.'
      };
    }
    if (twistId.includes('edit_flip')) {
      return {
        title: 'TWIST: Edit Manipulation',
        description: 'The producers have dramatically altered how the audience sees you.',
        impact: 'Your public perception has been completely flipped by the editing team.'
      };
    }
    if (twistId.includes('public_vote')) {
      return {
        title: 'TWIST: Public Vote Override',
        description: 'The audience has intervened to save their favorite contestant.',
        impact: 'Normal elimination rules have been suspended for this cycle.'
      };
    }
    return {
      title: 'TWIST ACTIVATED',
      description: 'Something unexpected has occurred in the house.',
      impact: 'The game has changed in unexpected ways.'
    };
  };

  const twist = getTwistMessage(recentTwist);

  return (
    <Card className="p-6 border-destructive bg-destructive/5">
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-destructive rounded-full animate-pulse"></div>
          <h3 className="text-lg font-medium text-destructive">{twist.title}</h3>
        </div>
        
        <p className="text-foreground">{twist.description}</p>
        
        <div className="p-3 bg-background rounded border border-border">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Impact:</span> {twist.impact}
          </p>
        </div>
      </div>
    </Card>
  );
};
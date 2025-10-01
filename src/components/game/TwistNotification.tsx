import { Button } from '@/components/ui/enhanced-button';
import { Card } from '@/components/ui/card';
import { GameState } from '@/types/game';

interface TwistNotificationProps {
  gameState: GameState;
}

export const TwistNotification = ({ gameState }: TwistNotificationProps) => {
  const twists = gameState.twistsActivated || [];
  const recentTwist = twists[twists.length - 1];
  const player = gameState.contestants.find(c => c.name === gameState.playerName);
  const spec = player?.special && player.special.kind === 'planted_houseguest' ? player.special : undefined;

  // Contract end decision banner (only if not already closed/decided)
  const contractClosed = twists.includes('planted_contract_closed');
  const showContractEnd = !!spec && spec.contractEnded && !spec.secretRevealed && !contractClosed;
  if (showContractEnd) {
    const week = Math.max(1, Math.floor((gameState.currentDay - 1) / 7) + 1);
    return (
      <Card className="p-4 border border-border bg-muted/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">Production Contract Ended</div>
            <div className="text-xs text-muted-foreground">
              Weekly missions concluded (Week {week - 1}). Choose: reveal the twist or keep it secret.
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="critical"
              size="sm"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('plantedContractDecision', { detail: { reveal: true } }));
              }}
            >
              Reveal Twist
            </Button>
            <Button
              variant="action"
              size="sm"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('plantedContractDecision', { detail: { reveal: false } }));
              }}
            >
              Keep Secret
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Other twist banners (optional future handling based on recentTwist)
  if (recentTwist === 'planted_reveal') {
    return (
      <Card className="p-4 border border-border bg-muted/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">Twist Revealed</div>
            <div className="text-xs text-muted-foreground">
              Your planted houseguest twist is public. Expect trust shifts and edit attention.
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { /* passive banner */ }}>
            OK
          </Button>
        </div>
      </Card>
    );
  }

  return null;
};
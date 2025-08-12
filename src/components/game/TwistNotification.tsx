import { Button } from '@/components/ui/enhanced-button';
import { Card } from '@/components/ui/card';
import { GameState } from '@/types/game';

interface TwistNotificationProps {
  gameState: GameState;
}

export const TwistNotification = ({ gameState }: TwistNotificationProps) => {
  const recentTwist = gameState.twistsActivated[gameState.twistsActivated.length - 1];
  
  if (!recentTwist) return null;

  // Temporarily suppress twist UI since mechanics are not implemented for all
  return null;
};
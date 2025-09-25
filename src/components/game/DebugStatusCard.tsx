import { Card } from '@/components/ui/card';
import { GameState } from '@/types/game';

interface Props {
  gameState: GameState;
}

export const DebugStatusCard = ({ gameState }: Props) => {
  const active = gameState.contestants.filter(c => !c.isEliminated);
  const profiles = Object.keys(gameState.reactionProfiles || {}).length;
  const tagCooldowns = Object.keys(gameState.tagChoiceCooldowns || {}).length;
  const lastOutcome = gameState.lastTagOutcome;

  return (
    <Card className="p-3 border-dashed border-2 border-muted">
      <div className="text-xs font-medium mb-2">Systems Status</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        <div>phase: {gameState.gamePhase}</div>
        <div>active: {active.length}</div>
        <div>profiles: {profiles}</div>
        <div>cooldowns: {tagCooldowns}</div>
      </div>
      <div className="mt-2 text-[11px]">
        lastAIReaction: {gameState.lastAIReaction ? 'set' : 'none'}
      </div>
      <div className="text-[11px]">
        lastTagOutcome: {lastOutcome ? `${lastOutcome.intent}/${lastOutcome.topic}/${lastOutcome.outcome.category}` : 'none'}
      </div>
    </Card>
  );
};
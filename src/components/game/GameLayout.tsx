import { ReactNode } from 'react';
import { GameState } from '@/types/game';
import { DashboardHeader } from './DashboardHeader';

interface GameLayoutProps {
  gameState: GameState;
  children: ReactNode;
  onSaveGame?: () => void;
  onLoadGame?: () => void;
  onDeleteGame?: () => void;
  onQuitToTitle?: () => void;
  onToggleDebug?: () => void;
}

export const GameLayout = ({
  gameState,
  children,
  onSaveGame,
  onLoadGame,
  onDeleteGame,
  onQuitToTitle,
  onToggleDebug,
}: GameLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        gameState={gameState}
        onSaveGame={onSaveGame}
        onLoadGame={onLoadGame}
        onDeleteGame={onDeleteGame}
        onQuitToTitle={onQuitToTitle}
        onToggleDebug={onToggleDebug}
      />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  );
};
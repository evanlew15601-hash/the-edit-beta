import React from 'react';
import { useGameState } from '@/hooks/useGameState';

type GameContextValue = ReturnType<typeof useGameState>;

const GameContext = React.createContext<GameContextValue | null>(null);

export const GameProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const value = useGameState();
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const ctx = React.useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within <GameProvider>');
  }
  return ctx;
};

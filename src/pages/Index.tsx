import { useGameState } from '@/hooks/useGameState';
import { IntroScreen } from '@/components/game/IntroScreen';
import { GameplayScreen } from '@/components/game/GameplayScreen';
import { EliminationScreen } from '@/components/game/EliminationScreen';
import { WeeklyRecapScreen } from '@/components/game/WeeklyRecapScreen';

const Index = () => {
  const {
    gameState,
    startGame,
    useAction,
    advanceDay,
    continueFromElimination,
    continueFromWeeklyRecap,
    resetGame
  } = useGameState();

  const renderScreen = () => {
    switch (gameState.gamePhase) {
      case 'intro':
        return <IntroScreen onStartGame={startGame} />;
      
      case 'daily':
        return (
          <GameplayScreen
            gameState={gameState}
            onUseAction={useAction}
            onAdvanceDay={advanceDay}
          />
        );
      
      case 'elimination':
        return (
          <EliminationScreen
            gameState={gameState}
            onContinue={continueFromElimination}
          />
        );
      
      case 'weekly_recap':
        return (
          <WeeklyRecapScreen
            gameState={gameState}
            onContinue={continueFromWeeklyRecap}
          />
        );
      
      default:
        return <IntroScreen onStartGame={startGame} />;
    }
  };

  return renderScreen();
};

export default Index;

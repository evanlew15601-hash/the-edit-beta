import { useGameState } from '@/hooks/useGameState';
import { IntroScreen } from '@/components/game/IntroScreen';
import { GameplayScreen } from '@/components/game/GameplayScreen';
import { EliminationScreen } from '@/components/game/EliminationScreen';
import { WeeklyRecapScreen } from '@/components/game/WeeklyRecapScreen';
import { ImmunityCompetitionScreen } from '@/components/game/ImmunityCompetitionScreen';
import { FinaleScreen } from '@/components/game/FinaleScreen';
import { JuryVoteScreen } from '@/components/game/JuryVoteScreen';

const Index = () => {
  const {
    gameState,
    startGame,
    useAction,
    advanceDay,
    setImmunityWinner,
    submitFinaleSpeech,
    endGame,
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
      
      case 'immunity_competition':
        return (
          <ImmunityCompetitionScreen
            gameState={gameState}
            onContinue={setImmunityWinner}
          />
        );
      
      case 'finale':
        return (
          <FinaleScreen
            gameState={gameState}
            onSubmitSpeech={submitFinaleSpeech}
            onContinue={() => {}} // Handled by submitFinaleSpeech
          />
        );
      
      case 'jury_vote':
        return (
          <JuryVoteScreen
            gameState={gameState}
            onGameEnd={endGame}
          />
        );
      
      default:
        return <IntroScreen onStartGame={startGame} />;
    }
  };

  return renderScreen();
};

export default Index;

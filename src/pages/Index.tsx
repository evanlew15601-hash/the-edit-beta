import { useGameState } from '@/hooks/useGameState';
import { IntroScreen } from '@/components/game/IntroScreen';
import { GameplayScreen } from '@/components/game/GameplayScreen';
import { WeeklyRecapScreen } from '@/components/game/WeeklyRecapScreen';
import { ImmunityCompetitionScreen } from '@/components/game/ImmunityCompetitionScreen';
import { JuryVoteScreen } from '@/components/game/JuryVoteScreen';
import { PremiereCutscene } from '@/components/game/PremiereCutscene';
import { EliminationEpisode } from '@/components/game/EliminationEpisode';
import { FinaleEpisode } from '@/components/game/FinaleEpisode';

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
    resetGame,
    handleEmergentEventChoice,
    completePremiere,
  } = useGameState();

  const renderScreen = () => {
    switch (gameState.gamePhase) {
      case 'intro':
        return <IntroScreen onStartGame={startGame} />;
      case 'premiere':
        return <PremiereCutscene onComplete={completePremiere} />;
      
      case 'daily':
        return (
          <GameplayScreen
             gameState={gameState}
             onUseAction={useAction}
             onAdvanceDay={advanceDay}
             onEmergentEventChoice={handleEmergentEventChoice}
           />
        );
      
      case 'elimination':
        return (
          <EliminationEpisode
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
          <FinaleEpisode
            gameState={gameState}
            onSubmitSpeech={submitFinaleSpeech}
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

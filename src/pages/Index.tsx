import React from 'react';
import { useGameState } from '@/hooks/useGameState';
import { IntroScreen } from '@/components/game/IntroScreen';
import { GameplayScreen } from '@/components/game/GameplayScreen';
import { WeeklyRecapScreen } from '@/components/game/WeeklyRecapScreen';
import { ImmunityCompetitionScreen } from '@/components/game/ImmunityCompetitionScreen';
import { JuryVoteScreen } from '@/components/game/JuryVoteScreen';
import { PremiereCutscene } from '@/components/game/PremiereCutscene';
import { EliminationEpisode } from '@/components/game/EliminationEpisode';
import { FinaleEpisode } from '@/components/game/FinaleEpisode';
import { PlayerVoteScreen } from '@/components/game/PlayerVoteScreen';
import { Final3VoteScreen } from '@/components/game/Final3VoteScreen';
import { PostSeasonRecapScreen } from '@/components/game/PostSeasonRecapScreen';

const Index = () => {
  const {
    gameState,
    startGame,
    useAction,
    advanceDay,
    setImmunityWinner,
    submitFinaleSpeech,
    submitPlayerVote,
    submitFinal3Vote,
    respondToForcedConversation,
    submitAFPVote,
    endGame,
    continueFromElimination,
    continueFromWeeklyRecap,
    resetGame,
    handleEmergentEventChoice,
    completePremiere,
    tagTalk,
    handleTieBreakResult,
    proceedToJuryVote,
    loadSavedGame,
    // new helpers
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...rest
  } = useGameState();

  // derive helpers from hook via rest if needed
  const saveGame = (rest as any).saveGame as () => void;
  const goToTitle = (rest as any).goToTitle as () => void;
  const toggleDebugMode = (rest as any).toggleDebugMode as () => void;

  // expose debug toggle globally for header
  (window as any).toggleDebugMode = toggleDebugMode;

  // Test force elimination event handler
  React.useEffect(() => {
    const handleTestElimination = () => {
      // Force player elimination during jury phase for testing
      console.log('Testing force elimination...');
      console.log('Current game state before elimination:', {
        phase: gameState.gamePhase,
        contestants: gameState.contestants.map(c => ({ name: c.name, eliminated: c.isEliminated })),
        juryMembers: gameState.juryMembers,
        isPlayerEliminated: gameState.isPlayerEliminated
      });
      continueFromElimination(true); // Force player elimination
    };

    window.addEventListener('testForceElimination', handleTestElimination);
    return () => window.removeEventListener('testForceElimination', handleTestElimination);
  }, [continueFromElimination]);

  const renderScreen = () => {
    switch (gameState.gamePhase) {
      case 'intro':
        return <IntroScreen onStartGame={startGame} onLoadGame={loadSavedGame} onDeleteSave={resetGame} />;
      case 'premiere':
        return <PremiereCutscene onComplete={completePremiere} />;
      
      case 'daily':
        return (
           <GameplayScreen
              gameState={gameState}
              onUseAction={useAction}
              onAdvanceDay={advanceDay}
              onEmergentEventChoice={handleEmergentEventChoice}
              onForcedConversationReply={respondToForcedConversation}
              onTagTalk={tagTalk}
              onSaveGame={saveGame}
              onLoadGame={loadSavedGame}
              onDeleteGame={resetGame}
              onQuitToTitle={goToTitle}
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
            onAFPVote={submitAFPVote}
            onContinue={proceedToJuryVote}
          />
        );
      
      case 'final_3_vote':
        return (
          <Final3VoteScreen
            gameState={gameState}
            onSubmitVote={submitFinal3Vote}
            onTieBreakResult={handleTieBreakResult}
          />
        );
      
      case 'jury_vote':
        return (
          <JuryVoteScreen
            gameState={gameState}
            playerSpeech={gameState.finaleSpeech}
            onGameEnd={endGame}
          />
        );

      case 'player_vote':
        return (
          <PlayerVoteScreen
            gameState={gameState}
            onSubmitVote={submitPlayerVote}
          />
        );
      
      case 'post_season':
        return (
          <PostSeasonRecapScreen
            gameState={gameState}
            winner={gameState.gameWinner || 'Unknown'}
            finalVotes={gameState.finalJuryVotes || {}}
            onRestart={resetGame}
          />
        );
      
      default:
        return <IntroScreen onStartGame={startGame} />;
    }
  };

  return renderScreen();
};

export default Index;

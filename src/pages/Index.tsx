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
import { GameLayout } from '@/components/game/GameLayout';

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
        return <IntroScreen onStartGame={startGame} onLoadGame={loadSavedGame} onDeleteSave={resetGame} onToggleDebug={toggleDebugMode} />;
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
              onToggleDebug={toggleDebugMode}
            />
        );
      
      case 'elimination':
        return (
          <GameLayout
            gameState={gameState}
            onSaveGame={saveGame}
            onLoadGame={loadSavedGame}
            onDeleteGame={resetGame}
            onQuitToTitle={goToTitle}
            onToggleDebug={toggleDebugMode}
          >
            <EliminationEpisode
              gameState={gameState}
              onContinue={continueFromElimination}
            />
          </GameLayout>
        );
      
      case 'weekly_recap':
        return (
          <GameLayout
            gameState={gameState}
            onSaveGame={saveGame}
            onLoadGame={loadSavedGame}
            onDeleteGame={resetGame}
            onQuitToTitle={goToTitle}
            onToggleDebug={toggleDebugMode}
          >
            <WeeklyRecapScreen
              gameState={gameState}
              onContinue={continueFromWeeklyRecap}
            />
          </GameLayout>
        );
      
      case 'immunity_competition':
        return (
          <GameLayout
            gameState={gameState}
            onSaveGame={saveGame}
            onLoadGame={loadSavedGame}
            onDeleteGame={resetGame}
            onQuitToTitle={goToTitle}
            onToggleDebug={toggleDebugMode}
          >
            <ImmunityCompetitionScreen
              gameState={gameState}
              onContinue={setImmunityWinner}
            />
          </GameLayout>
        );
      
      case 'finale':
        return (
          <GameLayout
            gameState={gameState}
            onSaveGame={saveGame}
            onLoadGame={loadSavedGame}
            onDeleteGame={resetGame}
            onQuitToTitle={goToTitle}
            onToggleDebug={toggleDebugMode}
          >
            <FinaleEpisode
              gameState={gameState}
              onSubmitSpeech={submitFinaleSpeech}
              onAFPVote={submitAFPVote}
              onContinue={proceedToJuryVote}
            />
          </GameLayout>
        );
      
      case 'final_3_vote':
        return (
          <GameLayout
            gameState={gameState}
            onSaveGame={saveGame}
            onLoadGame={loadSavedGame}
            onDeleteGame={resetGame}
            onQuitToTitle={goToTitle}
            onToggleDebug={toggleDebugMode}
          >
            <Final3VoteScreen
              gameState={gameState}
              onSubmitVote={submitFinal3Vote}
              onTieBreakResult={handleTieBreakResult}
            />
          </GameLayout>
        );
      
      case 'jury_vote':
        return (
          <GameLayout
            gameState={gameState}
            onSaveGame={saveGame}
            onLoadGame={loadSavedGame}
            onDeleteGame={resetGame}
            onQuitToTitle={goToTitle}
            onToggleDebug={toggleDebugMode}
          >
            <JuryVoteScreen
              gameState={gameState}
              playerSpeech={gameState.finaleSpeech}
              onGameEnd={endGame}
            />
          </GameLayout>
        );

      case 'player_vote':
        return (
          <GameLayout
            gameState={gameState}
            onSaveGame={saveGame}
            onLoadGame={loadSavedGame}
            onDeleteGame={resetGame}
            onQuitToTitle={goToTitle}
            onToggleDebug={toggleDebugMode}
          >
            <PlayerVoteScreen
              gameState={gameState}
              onSubmitVote={submitPlayerVote}
            />
          </GameLayout>
        );
      
      case 'post_season':
        return (
          <GameLayout
            gameState={gameState}
            onSaveGame={saveGame}
            onLoadGame={loadSavedGame}
            onDeleteGame={resetGame}
            onQuitToTitle={goToTitle}
            onToggleDebug={toggleDebugMode}
          >
            <PostSeasonRecapScreen
              gameState={gameState}
              winner={gameState.gameWinner || 'Unknown'}
              finalVotes={gameState.finalJuryVotes || {}}
              onRestart={resetGame}
            />
          </GameLayout>
        );
      
      default:
        return <IntroScreen onStartGame={startGame} />;
    }
  };

  return renderScreen();
};

export default Index;

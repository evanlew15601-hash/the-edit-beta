import React from 'react';
import { useGameState } from '@/hooks/useGameState';
import { IntroScreen } from '@/components/game/IntroScreen';
import { GameplayScreen } from '@/components/game/GameplayScreen';
import { WeeklyRecapScreen } from '@/components/game/WeeklyRecapScreen';
import { ImmunityCompetitionScreen } from '@/components/game/ImmunityCompetitionScreen';
import { JuryVoteScreen } from '@/components/game/JuryVoteScreen';
import { PremiereCutscene } from '@/components/game/PremiereCutscene';
import { Cutscene } from '@/components/game/cutscenes/Cutscene';
import { CharacterCreation } from '@/components/game/CharacterCreation';
import { EliminationEpisode } from '@/components/game/EliminationEpisode';
import { FinaleEpisode } from '@/components/game/FinaleEpisode';
import { PlayerVoteScreen } from '@/components/game/PlayerVoteScreen';
import { Final3VoteScreen } from '@/components/game/Final3VoteScreen';
import { PostSeasonRecapScreen } from '@/components/game/PostSeasonRecapScreen';
import { VotingDebugPanel } from '@/components/game/VotingDebugPanel';
import { DashboardHeader } from '@/components/game/DashboardHeader';
import { ErrorBoundary } from '@/components/game/ErrorBoundary';
import { MeetHouseguestsScreen } from '@/components/game/MeetHouseguestsScreen';

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
    completeRoster,
    openRoster,
    tagTalk,
    handleTieBreakResult,
    proceedToJuryVote,
    // New debug/test helpers
    proceedToFinaleAsJuror,
    proceedToJuryVoteAsJuror,
    setupFinal3,
    setupFinal3TieBreak,
    toggleDebugMode,
    saveGame,
    loadSavedGame,
    deleteSavedGame,
    hasSavedGame,
    goToTitle,
    finalizeCharacterCreation,
    handleHouseMeetingChoice,
    endHouseMeeting,
    completeCutscene,
  } = useGameState();

  // Keyboard shortcut: Shift+D to toggle debug HUD
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === 'd') {
        toggleDebugMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDebugMode]);

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
  }, [continueFromElimination, gameState]);

  const renderScreen = () => {
    switch (gameState.gamePhase) {
      case 'intro':
        return (
          <IntroScreen 
            onStartGame={startGame}
            onContinue={loadSavedGame}
            onDeleteSave={() => {
              if (window.confirm('Delete saved game? This cannot be undone.')) {
                deleteSavedGame();
              }
            }}
            debugMode={gameState.debugMode}
            onToggleDebug={toggleDebugMode}
            hasSave={hasSavedGame()}
          />
        );
      case 'character_creation':
        return (
          <CharacterCreation
            onCreate={finalizeCharacterCreation}
          />
        );
      case 'premiere':
        return <PremiereCutscene onComplete={completePremiere} gameState={gameState} />;
      case 'houseguests_roster':
        return (
          <MeetHouseguestsScreen
            gameState={gameState}
            onContinue={completeRoster}
          />
        );
      case 'daily':
        return (
           <GameplayScreen
              gameState={gameState}
              onUseAction={useAction}
              onAdvanceDay={advanceDay}
              onEmergentEventChoice={handleEmergentEventChoice}
              onForcedConversationReply={respondToForcedConversation}
              onTagTalk={tagTalk}
              onHouseMeetingChoice={handleHouseMeetingChoice}
              onEndHouseMeeting={endHouseMeeting}
            />
        );

      case 'cutscene':
        return (
          <Cutscene
            title={gameState.currentCutscene?.title || 'Story'}
            slides={gameState.currentCutscene?.slides || []}
            onComplete={completeCutscene}
            ctaLabel={gameState.currentCutscene?.ctaLabel || 'Continue'}
          />
        );
      
      case 'elimination':
        return (
          <EliminationEpisode
            gameState={gameState}
            onContinue={continueFromElimination}
          />
        );
      
      case 'weekly_recap': {
        const isOnWeekBoundary = gameState.currentDay > 1 && gameState.currentDay % 7 === 0;
        if (!isOnWeekBoundary) {
          console.warn('[Index] Invalid weekly_recap state; falling back to daily', {
            currentDay: gameState.currentDay,
          });
          return (
            <GameplayScreen
              gameState={gameState}
              onUseAction={useAction}
              onAdvanceDay={advanceDay}
              onEmergentEventChoice={handleEmergentEventChoice}
              onForcedConversationReply={respondToForcedConversation}
              onTagTalk={tagTalk}
              onHouseMeetingChoice={handleHouseMeetingChoice}
              onEndHouseMeeting={endHouseMeeting}
            />
          );
        }

        return (
          <WeeklyRecapScreen
            gameState={gameState}
            onContinue={continueFromWeeklyRecap}
          />
        );
      }
      
      case 'immunity_competition':
        return (
          <ImmunityCompetitionScreen
            gameState={gameState}
            onContinue={setImmunityWinner}
          />
        );
      
      case 'finale': {
        const activeFinalists = gameState.contestants.filter(c => !c.isEliminated);
        if (activeFinalists.length !== 2) {
          console.warn('[Index] Invalid finale state; falling back to daily', {
            activeNames: activeFinalists.map(c => c.name),
          });
          return (
            <GameplayScreen
              gameState={gameState}
              onUseAction={useAction}
              onAdvanceDay={advanceDay}
              onEmergentEventChoice={handleEmergentEventChoice}
              onForcedConversationReply={respondToForcedConversation}
              onTagTalk={tagTalk}
              onHouseMeetingChoice={handleHouseMeetingChoice}
              onEndHouseMeeting={endHouseMeeting}
            />
          );
        }

        // If the player is eliminated and watching as a juror, continue to the juror-specific jury vote flow.
        // Otherwise, proceed to the standard jury vote where the player is a finalist.
        const onFinaleContinue = gameState.isPlayerEliminated ? proceedToJuryVoteAsJuror : proceedToJuryVote;
        return (
          <FinaleEpisode
            gameState={gameState}
            onSubmitSpeech={submitFinaleSpeech}
            onAFPVote={submitAFPVote}
            onContinue={onFinaleContinue}
          />
        );
      }
      
      case 'final_3_vote': {
        const activeFinalThree = gameState.contestants.filter(c => !c.isEliminated);
        const playerInActive = activeFinalThree.some(c => c.name === gameState.playerName);
        if (activeFinalThree.length !== 3 || !playerInActive) {
          console.warn('[Index] Invalid final_3_vote state; falling back to daily', {
            activeNames: activeFinalThree.map(c => c.name),
            player: gameState.playerName,
          });
          return (
            <GameplayScreen
              gameState={gameState}
              onUseAction={useAction}
              onAdvanceDay={advanceDay}
              onEmergentEventChoice={handleEmergentEventChoice}
              onForcedConversationReply={respondToForcedConversation}
              onTagTalk={tagTalk}
              onHouseMeetingChoice={handleHouseMeetingChoice}
              onEndHouseMeeting={endHouseMeeting}
            />
          );
        }

        return (
          <Final3VoteScreen
            gameState={gameState}
            onSubmitVote={submitFinal3Vote}
            onTieBreakResult={handleTieBreakResult}
          />
        );
      }
      
      case 'jury_vote': {
        const activeFinalists = gameState.contestants.filter(c => !c.isEliminated);
        const juryMembers = gameState.juryMembers || [];
        const juryValid =
          juryMembers.length >= 1 &&
          juryMembers.every(name =>
            gameState.contestants.some(c => c.name === name && c.isEliminated)
          );

        if (activeFinalists.length !== 2 || !juryValid) {
          console.warn('[Index] Invalid jury_vote state; falling back to daily', {
            activeNames: activeFinalists.map(c => c.name),
            juryMembers,
          });
          return (
            <GameplayScreen
              gameState={gameState}
              onUseAction={useAction}
              onAdvanceDay={advanceDay}
              onEmergentEventChoice={handleEmergentEventChoice}
              onForcedConversationReply={respondToForcedConversation}
              onTagTalk={tagTalk}
              onHouseMeetingChoice={handleHouseMeetingChoice}
              onEndHouseMeeting={endHouseMeeting}
            />
          );
        }

        return (
          <JuryVoteScreen
            gameState={gameState}
            playerSpeech={gameState.finaleSpeech}
            onGameEnd={endGame}
          />
        );
      }

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

  const showHeader = gameState.gamePhase !== 'intro';

  return (
    <ErrorBoundary>
      {showHeader && (
        <DashboardHeader 
          gameState={gameState}
          onSave={saveGame}
          onLoad={loadSavedGame}
          onDeleteSave={() => {
            if (window.confirm('Delete saved game? This cannot be undone.')) {
              deleteSavedGame();
            }
          }}
          onTitle={goToTitle}
          onToggleDebug={toggleDebugMode}
          hasSave={hasSavedGame()}
          onOpenRoster={openRoster}
        />
      )}
      {renderScreen()}
      <VotingDebugPanel
        gameState={gameState}
        onAdvanceDay={advanceDay}
        onProceedToJuryVote={proceedToJuryVote}
        onProceedToFinaleAsJuror={proceedToFinaleAsJuror}
        onProceedToJuryVoteAsJuror={proceedToJuryVoteAsJuror}
        onGoToFinal3Vote={setupFinal3}
        onGoToFinal3TieBreak={setupFinal3TieBreak}
        onContinueFromElimination={() => continueFromElimination()}
        onToggleDebug={toggleDebugMode}
        // New phase-specific quick actions
        onSubmitPlayerVote={submitPlayerVote}
        onSubmitFinal3Vote={submitFinal3Vote}
        onTieBreakResult={(eliminated, w1, w2, method) => handleTieBreakResult(eliminated, w1, w2, method)}
        onEndGame={(winner, votes, rationales) => endGame(winner, votes, rationales)}
      />
    </ErrorBoundary>
  );
};

export default Index;

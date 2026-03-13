import React from 'react';
import { useGame } from '@/contexts/GameContext';
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
  const { gameState, toggleDebugMode, continueFromElimination, completeCutscene } = useGame();

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

  // Test force elimination event handler (debug-only)
  React.useEffect(() => {
    const handleTestElimination = () => {
      if (!gameState.debugMode) return;
      continueFromElimination(true); // Force player elimination
    };

    window.addEventListener('testForceElimination', handleTestElimination);
    return () => window.removeEventListener('testForceElimination', handleTestElimination);
  }, [continueFromElimination, gameState.debugMode]);

  const renderScreen = () => {
    switch (gameState.gamePhase) {
      case 'intro':
        return <IntroScreen />;
      case 'character_creation':
        return <CharacterCreation />;
      case 'premiere':
        return <PremiereCutscene />;
      case 'houseguests_roster':
        return <MeetHouseguestsScreen />;
      case 'daily':
        return <GameplayScreen />;

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
        return <EliminationEpisode />;

      case 'weekly_recap':
        return <WeeklyRecapScreen />;

      case 'immunity_competition':
        return <ImmunityCompetitionScreen />;

      case 'finale':
        return <FinaleEpisode />;

      case 'final_3_vote':
        return <Final3VoteScreen />;

      case 'jury_vote':
        return <JuryVoteScreen />;

      case 'player_vote':
        return <PlayerVoteScreen />;

      case 'post_season':
        return <PostSeasonRecapScreen />;

      default:
        return <IntroScreen />;
    }
  };

  const showHeader = gameState.gamePhase !== 'intro';

  return (
    <ErrorBoundary>
      {showHeader && <DashboardHeader />}
      {renderScreen()}
      <VotingDebugPanel />
    </ErrorBoundary>
  );
};

export default Index;

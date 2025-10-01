import React from 'react';
import { GameState } from '@/types/game';
import { EliminationVoteAskPanel } from './EliminationVoteAskPanel';

interface TruthVoteRequestPanelProps {
  gameState: GameState;
}

/**
 * Backward-compatibility shim:
 * If older code still imports TruthVoteRequestPanel, render the new elimination vote ask panel instead.
 * No "Statement" input; this surfaces declared elimination vote plans with honesty heuristics.
 */
export const TruthVoteRequestPanel: React.FC<TruthVoteRequestPanelProps> = ({ gameState }) => {
  return <EliminationVoteAskPanel gameState={gameState} />;
};

export default TruthVoteRequestPanel;
import { askForEliminationVote } from '@/utils/voteInferenceEngine';

/**
 * Backward-compatibility shim for legacy truth-vote engine.
 * Redirects to elimination vote inference and returns a compatible shape.
 */
export interface TruthVoteResult {
  vote: 'truth' | 'lie' | 'maybe';
  statement?: string;
  rationale?: string;
  explanation?: string;
  declaredTarget?: string;
  likelyTarget?: string;
}

export const askTruthVote = (npc: any, gameState: any, options?: { statement?: string }): TruthVoteResult => {
  const res = askForEliminationVote(npc, gameState, gameState?.weeklyVotingPlans, { strict: true });
  return {
    vote: res.honesty,
    statement: options?.statement || '',
    rationale: res.reasoning,
    explanation: res.explanation,
    declaredTarget: res.declaredTarget,
    likelyTarget: res.likelyTarget,
  };
};

export default askTruthVote;
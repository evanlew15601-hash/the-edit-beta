import React from 'react';
import { VoteDeclarationCard } from './VoteDeclarationCard';

/**
 * Backward-compatibility shim for legacy TruthVoteCard.
 * Maps any provided props to the VoteDeclarationCard which shows declared elimination vote plans.
 */
export const TruthVoteCard: React.FC<any> = (props: any) => {
  const voterName = props.voterName || props.name || 'Unknown';
  const declaredTarget = props.declaredTarget || props.target || 'undecided';
  const reasoning = props.reasoning || props.rationale || '';
  const explanation = props.explanation || '';
  const likelyTarget = props.likelyTarget || props.inferredTarget || undefined;

  // Legacy "vote" prop might be 'Truth' | 'Lie' | 'Maybe'
  const rawVote = (props.vote || props.honesty || '').toString().toLowerCase();
  const honesty: 'truth' | 'lie' | 'maybe' =
    rawVote === 'truth' ? 'truth' :
    rawVote === 'lie' ? 'lie' :
    rawVote === 'maybe' ? 'maybe' : (props.honesty || 'maybe');

  return (
    <VoteDeclarationCard
      voterName={voterName}
      declaredTarget={declaredTarget}
      reasoning={reasoning}
      honesty={honesty}
      explanation={explanation}
      likelyTarget={likelyTarget}
    />
  );
};

export default TruthVoteCard;
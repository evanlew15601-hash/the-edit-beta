import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';

type TruthVoteValue = 'truth' | 'lie' | 'maybe';

interface TruthVoteCardProps {
  voterName: string;
  vote: TruthVoteValue;
  statement: string;
  rationale?: string;
}

const VoteIcon: React.FC<{ vote: TruthVoteValue }> = ({ vote }) => {
  if (vote === 'truth') return <CheckCircle className="w-5 h-5 text-green-600" />;
  if (vote === 'lie') return <XCircle className="w-5 h-5 text-red-600" />;
  return <HelpCircle className="w-5 h-5 text-yellow-600" />;
};

const voteLabel = (vote: TruthVoteValue) => {
  if (vote === 'truth') return 'Truth';
  if (vote === 'lie') return 'Lie';
  return 'Maybe';
};

const voteColorClass = (vote: TruthVoteValue) => {
  if (vote === 'truth') return 'text-green-700';
  if (vote === 'lie') return 'text-red-700';
  return 'text-yellow-700';
};

export const TruthVoteCard: React.FC<TruthVoteCardProps> = ({ voterName, vote, statement, rationale }) => {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="uppercase text-[10px]">Truth Vote</Badge>
          <span className="text-sm text-muted-foreground">by {voterName}</span>
        </div>
        <VoteIcon vote={vote} />
      </div>

      <div className="mb-3">
        <div className="text-xs text-muted-foreground">Statement</div>
        <div className="text-sm text-foreground line-clamp-2">“{statement}”</div>
      </div>

      <div className={`text-sm font-medium ${voteColorClass(vote)} mb-2`}>
        {voterName} votes: {voteLabel(vote)}
      </div>

      {rationale && (
        <div className="text-xs text-muted-foreground">
          {rationale}
        </div>
      )}
    </Card>
  );
};
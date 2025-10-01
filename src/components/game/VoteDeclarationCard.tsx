import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCheck, AlertTriangle, HelpCircle } from 'lucide-react';

type VoteHonesty = 'truth' | 'lie' | 'maybe';

interface VoteDeclarationCardProps {
  voterName: string;
  declaredTarget: string;
  reasoning: string;
  honesty: VoteHonesty;
  explanation?: string;
  likelyTarget?: string;
}

const HonestyIcon: React.FC<{ honesty: VoteHonesty }> = ({ honesty }) => {
  if (honesty === 'truth') return <UserCheck className="w-5 h-5 text-green-600" />;
  if (honesty === 'lie') return <AlertTriangle className="w-5 h-5 text-red-600" />;
  return <HelpCircle className="w-5 h-5 text-yellow-600" />;
};

const honestyLabel = (h: VoteHonesty) => h === 'truth' ? 'Truth' : h === 'lie' ? 'Lie' : 'Maybe';
const honestyColor = (h: VoteHonesty) => h === 'truth' ? 'text-green-700' : h === 'lie' ? 'text-red-700' : 'text-yellow-700';

export const VoteDeclarationCard: React.FC<VoteDeclarationCardProps> = ({
  voterName,
  declaredTarget,
  reasoning,
  honesty,
  explanation,
  likelyTarget
}) => {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="uppercase text-[10px]">Elimination Vote</Badge>
          <span className="text-xs text-muted-foreground">by {voterName}</span>
        </div>
        <HonestyIcon honesty={honesty} />
      </div>

      <div className="mb-3 space-y-1">
        <div className="text-xs text-muted-foreground">Declared target</div>
        <div className="text-sm text-foreground">
          {declaredTarget === 'undecided' ? 'Undecided' : declaredTarget}
        </div>
        <div className="text-xs text-muted-foreground">Reasoning</div>
        <div className="text-sm text-foreground">{reasoning}</div>
      </div>

      <div className={`text-sm font-medium ${honestyColor(honesty)} mb-2`}>
        Honesty read: {honestyLabel(honesty)}
      </div>

      {explanation && (
        <div className="text-xs text-muted-foreground mb-2">
          {explanation}
        </div>
      )}

      {likelyTarget && declaredTarget !== 'undecided' && (
        <div className="text-[11px] text-muted-foreground">
          Heuristic inference: likely {likelyTarget}
        </div>
      )}
    </Card>
  );
};
import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGame } from '@/contexts/GameContext';
import { AIVotingStrategy } from '@/utils/aiVotingStrategy';
import { EnhancedInformationEngine } from '@/utils/enhancedInformationEngine';
import { Target, Vote, MessageCircle, Shield } from 'lucide-react';

const TOPICS = [
  { value: 'voting_plans', label: 'Who they are voting' },
  { value: 'alliance_info', label: 'Where their alliances stand' },
  { value: 'threat_assessment', label: 'Who they think the threat is' },
  { value: 'game_status', label: 'How they read the house' },
] as const;

type TopicValue = (typeof TOPICS)[number]['value'];

export const VotingIntelligencePanel: React.FC = () => {
  const { gameState } = useGame();
  const [selectedNPC, setSelectedNPC] = useState<string>('');
  const [desiredTarget, setDesiredTarget] = useState<string>('');
  const [topic, setTopic] = useState<TopicValue>('voting_plans');
  const [result, setResult] = useState<{
    mode: 'ask' | 'pressure';
    name: string;
    target: string;
    reasoning?: string;
    isLying?: boolean;
    confidence?: string;
    success?: boolean;
    commitment?: 'soft' | 'firm';
    notes?: string;
    topicLabel?: string;
    quote?: string;
    shared?: boolean;
    accuracy?: number;
  } | null>(null);

  const availableNPCs = useMemo(
    () => gameState.contestants.filter(c => !c.isEliminated && c.name !== gameState.playerName),
    [gameState.contestants, gameState.playerName]
  );

  const availableVoteTargets = useMemo(
    () => gameState.contestants.filter(c => !c.isEliminated && c.name !== gameState.playerName).map(c => c.name),
    [gameState.contestants, gameState.playerName]
  );

  const npc = useMemo(
    () => gameState.contestants.find(c => c.name === selectedNPC),
    [gameState.contestants, selectedNPC]
  );

  // Generate voting plans for all NPCs (private to this panel; not surfaced directly)
  const votingPlans = useMemo(() => {
    return AIVotingStrategy.generateWeeklyVotingPlans(gameState);
  }, [gameState.currentDay, gameState.contestants]);

  const askPlan = () => {
    if (!npc) return;
    const topicLabel = TOPICS.find(t => t.value === topic)?.label;

    // What they actually say, and whether they are shading it, comes from the
    // information engine: trust, suspicion, alliances, personality and recent
    // memory decide whether they open up, hedge, or lie outright.
    const response = EnhancedInformationEngine.processInformationRequest(
      { asker: gameState.playerName, target: npc.name, topic, context: 'strategic' },
      gameState,
      votingPlans
    );

    if (topic === 'voting_plans') {
      const shareable = AIVotingStrategy.getShareableVotingInfo(npc, gameState, votingPlans);
      const plan = votingPlans.get(npc.name);
      setResult({
        mode: 'ask',
        name: npc.name,
        target: shareable.target,
        reasoning: shareable.reasoning,
        isLying: shareable.isLying || response.isLie,
        confidence: plan ? `${plan.confidence}%` : 'Unknown',
        topicLabel,
        quote: response.information,
        shared: response.willShare,
        accuracy: response.accuracy,
      });
      return;
    }

    setResult({
      mode: 'ask',
      name: npc.name,
      target: '',
      isLying: response.isLie,
      topicLabel,
      quote: response.information,
      shared: response.willShare,
      accuracy: response.accuracy,
    });
  };

  const applyPressure = () => {
    if (!npc || !desiredTarget) return;
    const res = AIVotingStrategy.attemptVotePressure(npc, desiredTarget, gameState, { context: 'direct' });
    setResult({
      mode: 'pressure',
      name: npc.name,
      target: res.chosenTarget,
      success: res.success,
      commitment: res.commitment,
      notes: res.notes,
    });
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Vote className="w-5 h-5 text-primary" />
        <h3 className="font-medium">Voting Intelligence</h3>
        <Badge variant="outline" className="text-[10px] ml-auto">Week {Math.floor((gameState.currentDay - 1) / 7) + 1}</Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        You must ask or apply pressure to learn or influence votes. No global tally is shown.
      </p>

      {/* Ask an NPC about their plan */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Ask Someone</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-2">
            <label className="text-sm">Person</label>
            <Select value={selectedNPC} onValueChange={setSelectedNPC}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a houseguest..." />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover text-popover-foreground">
                {availableNPCs.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name} - {c.publicPersona}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm">Ask about</label>
            <Select value={topic} onValueChange={(v) => setTopic(v as TopicValue)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover text-popover-foreground">
                {TOPICS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end sm:col-span-2">
            <Button
              variant="action"
              onClick={askPlan}
              disabled={!selectedNPC}
              className="w-full"
            >
              <Target className="w-4 h-4 mr-2" />
              Ask Them
            </Button>
          </div>
        </div>
      </div>

      {/* Apply pressure for a specific target */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Apply Vote Pressure</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="space-y-2">
            <label className="text-sm">Person</label>
            <Select value={selectedNPC} onValueChange={setSelectedNPC}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a houseguest..." />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover text-popover-foreground">
                {availableNPCs.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name} - {c.publicPersona}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm">Ask to vote for</label>
            <Select value={desiredTarget} onValueChange={setDesiredTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Select target..." />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover text-popover-foreground">
                {availableVoteTargets.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="surveillance"
              onClick={applyPressure}
              disabled={!selectedNPC || !desiredTarget}
              className="w-full"
            >
              <Target className="w-4 h-4 mr-2" />
              Pressure to Commit
            </Button>
          </div>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <ScrollArea className="max-h-56 border-t border-border pt-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {result.name} • {result.mode === 'ask' ? (result.topicLabel || 'Shared Plan') : 'Pressure Result'}
              </span>
              {result.mode === 'ask' && result.isLying && (
                <Badge variant="destructive" className="text-[10px]">May be lying</Badge>
              )}
              {result.mode === 'pressure' && (
                <Badge variant={result.success ? 'secondary' : 'destructive'} className="text-[10px]">
                  {result.success ? (result.commitment === 'firm' ? 'Committed' : 'Soft commitment') : 'Resisted'}
                </Badge>
              )}
            </div>

            <div className="bg-muted/40 rounded p-3 space-y-2">
              {result.target && (
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium">
                    Target: {result.target === gameState.playerName ? 'YOU' : result.target}
                  </span>
                </div>
              )}

              {result.mode === 'ask' && (
                <>
                  {result.quote && (
                    <p className="text-sm text-foreground italic">"{result.quote}"</p>
                  )}
                  {result.reasoning && result.reasoning !== result.quote && (
                    <p className="text-xs text-muted-foreground">Their read: {result.reasoning}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
                    {result.confidence && <span>Confidence: {result.confidence}</span>}
                    {typeof result.accuracy === 'number' && (
                      <span>Reliability: {Math.round(result.accuracy * 100)}%</span>
                    )}
                    {result.shared === false && (
                      <Badge variant="outline" className="text-[9px]">Held back</Badge>
                    )}
                    {result.shared && !result.isLying && (
                      <Badge variant="outline" className="text-[9px]">Seems honest</Badge>
                    )}
                  </div>
                </>
              )}

              {result.mode === 'pressure' && result.notes && (
                <p className="text-xs text-muted-foreground">{result.notes}</p>
              )}
            </div>

          </div>
        </ScrollArea>
      )}

      {/* Alliance Version Hint */}
      {gameState.alliances.length > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded">
            <Shield className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground">
              Use Alliance Meetings to coordinate a specific vote target with trusted members
            </p>
          </div>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground space-y-1 bg-muted/30 rounded p-2">
        <p>💡 No free info: you must ask or create leverage to learn votes.</p>
        <p>🎭 NPCs may lie if they don't trust you or are targeting an ally.</p>
        <p>🧠 Pressure succeeds more with trusted allies and aligned incentives.</p>
      </div>
    </Card>
  );
};

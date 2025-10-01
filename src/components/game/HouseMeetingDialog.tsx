import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { GameState, Contestant, HouseMeetingTopic, HouseMeetingToneChoice } from '@/types/game';
import { houseMeetingEngine } from '@/utils/houseMeetingEngine';
import { Users, Megaphone, AlertTriangle } from 'lucide-react';

interface HouseMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onStart: (topic: HouseMeetingTopic, target?: string) => void;
  onChoice: (choice: HouseMeetingToneChoice) => void;
  onEnd: () => void;
}

const TOPIC_OPTIONS: { value: HouseMeetingTopic; label: string }[] = [
  { value: 'nominate_target', label: 'Nominate target' },
  { value: 'defend_self', label: 'Defend self' },
  { value: 'shift_blame', label: 'Shift blame' },
  { value: 'expose_alliance', label: 'Expose alliance' },
];

export const HouseMeetingDialog = ({ isOpen, onClose, gameState, onStart, onChoice, onEnd }: HouseMeetingDialogProps) => {
  const hm = gameState.ongoingHouseMeeting;
  const [topic, setTopic] = useState<HouseMeetingTopic>('nominate_target');
  const [target, setTarget] = useState<string>('');
  const activeContestants = useMemo(() => gameState.contestants.filter(c => !c.isEliminated), [gameState.contestants]);
  const canClose = !hm?.forcedOpen;

  useEffect(() => {
    if (isOpen) {
      setTopic('nominate_target');
      setTarget('');
    }
  }, [isOpen]);

  const showStartScreen = !hm;

  const moodLabel = hm ? (hm.mood === 'heated' ? 'Heated' : hm.mood === 'tense' ? 'Tense' : 'Calm') : '';

  const options = hm?.currentOptions || houseMeetingEngine.buildOptions(topic);

  const handleStart = () => {
    onStart(topic, target || undefined);
  };

  const handleChoice = (choice: HouseMeetingToneChoice) => {
    onChoice(choice);
  };

  const roundCount = hm ? `${hm.currentRound + 1} / ${hm.maxRounds}` : '—';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (open === false && canClose) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            House Meeting
          </DialogTitle>
          <DialogDescription>
            Public, multi-round discussion with ripple effects on trust, alliances, and votes.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          {showStartScreen ? (
            <div className="space-y-6">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Player-Initiated Meeting</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose a topic and optionally select a target to address publicly.
                </p>
              </Card>

              <div className="space-y-2">
                <label className="text-sm font-medium">Topic</label>
                <Select value={topic} onValueChange={(v) => setTopic(v as HouseMeetingTopic)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a meeting topic..." />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover text-popover-foreground">
                    {TOPIC_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(topic === 'nominate_target' || topic === 'expose_alliance' || topic === 'shift_blame') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target (optional)</label>
                  <Select value={target} onValueChange={setTarget}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a person to call out..." />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-popover text-popover-foreground">
                      {activeContestants
                        .filter(c => c.name !== gameState.playerName)
                        .map(c => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.name} — {c.publicPersona}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="action" className="flex-1" onClick={handleStart}>
                  Call House Meeting
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-muted border border-border rounded p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Round {roundCount}</Badge>
                  <Badge variant="outline">Mood: {moodLabel}</Badge>
                  {hm.isAIInitiated && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      AI-initiated
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Topic: {hm.topic.replace('_', ' ')}{hm.target ? ` • Target: ${hm.target}` : ''}
                </p>
                <div className="mt-3 space-y-2">
                  {hm.conversationLog.slice(-3).map((line, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium">{line.speaker}:</span> <span className="text-foreground">{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Response</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {options.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => handleChoice(opt.tone)}
                      className="p-3 text-left border border-border rounded hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="uppercase text-[10px]">{opt.tone}</Badge>
                        <span className="text-sm">{opt.text}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Effects vary by mood and house personalities
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Participants */}
              <div className="bg-card border border-border rounded p-3">
                <h4 className="font-medium mb-2">Participants</h4>
                <div className="flex flex-wrap gap-2">
                  {hm.participants.map(name => (
                    <Badge key={name} variant="outline">{name}</Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                {!hm.forcedOpen && (
                  <Button variant="outline" className="flex-1" onClick={onClose}>
                    Close
                  </Button>
                )}
                <Button
                  variant="action"
                  className="flex-1"
                  disabled={hm.currentRound + 1 < hm.maxRounds}
                  onClick={onEnd}
                >
                  End Meeting
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
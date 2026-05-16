import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useGame } from '@/contexts/GameContext';
import { TAG_CHOICES } from '@/data/tagChoices';
import { Choice, IntentTag, ToneTag, TopicTag, TargetType, InteractionType } from '@/types/tagDialogue';
import { formatTag, isChoiceAvailable, pickVariant } from '@/utils/tagDialogueEngine';

interface TagConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  interactionType?: InteractionType; // New prop to set the interaction type
}

export const TagConversationDialog = ({ isOpen, onClose, interactionType }: TagConversationDialogProps) => {
  const { gameState, tagTalk } = useGame();
  const contestants = useMemo(() => gameState.contestants.filter((c) => !c.isEliminated), [gameState.contestants]);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [selectedGroupTargets, setSelectedGroupTargets] = useState<string[]>([]);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string>('');
  const [intent, setIntent] = useState<IntentTag | ''>('');
  const [tone, setTone] = useState<ToneTag | ''>('');
  const [topic, setTopic] = useState<TopicTag | ''>('');
  const [targetType, setTargetType] = useState<TargetType>('Person');
  const [interaction, setInteraction] = useState<InteractionType>('talk');

  // Auto-set interaction type when component opens based on dialog type
  useEffect(() => {
    if (isOpen) {
      // Reset selections
      setSelectedTarget('');
      setSelectedGroupTargets([]);
      setSelectedChoiceId('');
      setIntent('');
      setTone('');
      setTopic('');
      setTargetType('Person');
      // Set interaction type from prop if provided
      if (interactionType) {
        setInteraction(interactionType);
      }
    }
  }, [isOpen, interactionType]);

  const targetContestant = useMemo(() => contestants.find(c => c.name === selectedTarget), [contestants, selectedTarget]);

  const filtered: Choice[] = useMemo(() => {
    let pool = TAG_CHOICES;
    if (intent) pool = pool.filter(c => c.intent === intent);
    if (tone) pool = pool.filter(c => c.tone === tone);
    if (topic) pool = pool.filter(c => c.topics.includes(topic));
    if (targetType) pool = pool.filter(c => c.targetType === targetType);
    if (interaction) pool = pool.filter(c => (c.interactionTypes || ['talk']).includes(interaction));
    if (targetContestant) pool = pool.filter(ch => isChoiceAvailable(ch, targetContestant, gameState.playerName, gameState));
    return pool;
  }, [intent, tone, topic, targetType, interaction, targetContestant, gameState]);

  const handleSubmit = () => {
    if (!selectedChoiceId) return;
    if (targetType === 'Person') {
      if (!selectedTarget) return;
      tagTalk(selectedTarget, selectedChoiceId, interaction);
    } else if (targetType === 'Group') {
      if (selectedGroupTargets.length === 0) return;
      // Apply the choice to each selected contestant for a group effect
      selectedGroupTargets.forEach(name => tagTalk(name, selectedChoiceId, interaction));
    } else if (targetType === 'Self') {
      tagTalk(gameState.playerName, selectedChoiceId, interaction);
    } else {
      // Audience / Object — no specific contestant; pass type as marker
      tagTalk(targetType.toLowerCase(), selectedChoiceId, interaction);
    }
    setSelectedTarget('');
    setSelectedGroupTargets([]);
    setSelectedChoiceId('');
    onClose();
  };

  const toggleGroupTarget = (name: string) => {
    setSelectedGroupTargets(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const intents: IntentTag[] = ['BuildAlliance','ProbeForInfo','Divert','SowDoubt','BoostMorale','Flirt','Insult','MakeJoke','RevealSecret','Deflect'];
  const tones: ToneTag[] = ['Sincere','Sarcastic','Flirty','Aggressive','Playful','Dismissive','Apologetic','Neutral'];
  const topics: TopicTag[] = ['Game','Strategy','Romance','Food','Sleep','Challenge','Eviction','Rumor','PersonalHistory','Production'];
  // Only show target types that have authored lines available. Object/Audience
  // currently have no choices, which made the dialog impossible to submit.
  const availableTargetTypes = useMemo(() => {
    const set = new Set<TargetType>();
    TAG_CHOICES.forEach((c) => set.add(c.targetType));
    return (['Person','Group','Self','Object','Audience'] as TargetType[]).filter(t => set.has(t));
  }, []);
  const targetTypes: TargetType[] = availableTargetTypes;

  const targetOptions = targetType === 'Person'
    ? contestants.filter((c) => c.name !== gameState.playerName)
    : contestants;

  const interactionLabel = interaction.charAt(0).toUpperCase() + interaction.slice(1);
  const disabledReason = !selectedChoiceId
    ? 'Pick a line below to send.'
    : targetType === 'Person' && !selectedTarget
      ? 'Choose who you are talking to.'
      : targetType === 'Group' && selectedGroupTargets.length === 0
        ? 'Pick at least one houseguest for the group.'
        : '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Tag {interaction.charAt(0).toUpperCase() + interaction.slice(1)}</DialogTitle>
          <DialogDescription>Pick tags to shape your intent, tone, topic, and target.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Intent</label>
              <Select value={intent} onValueChange={(v) => setIntent(v as IntentTag)}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent className="z-50 bg-popover text-popover-foreground">
                  {intents.map(it => (
                    <SelectItem key={it} value={it}>{formatTag(it)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Tone</label>
              <Select value={tone} onValueChange={(v) => setTone(v as ToneTag)}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent className="z-50 bg-popover text-popover-foreground">
                  {tones.map(t => (
                    <SelectItem key={t} value={t}>{formatTag(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Topic</label>
              <Select value={topic} onValueChange={(v) => setTopic(v as TopicTag)}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent className="z-50 bg-popover text-popover-foreground">
                  {topics.map(t => (
                    <SelectItem key={t} value={t}>{formatTag(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Target Type</label>
              <Select value={targetType} onValueChange={(v) => setTargetType(v as TargetType)}>
                <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
                <SelectContent className="z-50 bg-popover text-popover-foreground">
                  {targetTypes.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Target</label>
              {targetType === 'Person' && (
                <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                  <SelectTrigger><SelectValue placeholder="Choose who to talk to..." /></SelectTrigger>
                  <SelectContent className="z-50 bg-popover text-popover-foreground">
                    {targetOptions.map((contestant) => (
                      <SelectItem key={contestant.id} value={contestant.name}>
                        {contestant.name} - {contestant.publicPersona}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {targetType === 'Group' && (
                <ScrollArea className="h-32 rounded border border-border p-2">
                  <div className="space-y-1">
                    {contestants.filter(c => c.name !== gameState.playerName).map(c => (
                      <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted px-1 py-0.5 rounded">
                        <Checkbox
                          checked={selectedGroupTargets.includes(c.name)}
                          onCheckedChange={() => toggleGroupTarget(c.name)}
                        />
                        <span>{c.name}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              )}
              {targetType !== 'Person' && targetType !== 'Group' && (
                <div className="text-xs text-muted-foreground py-2">
                  No specific target needed for {targetType}.
                </div>
              )}
            </div>
          </div>

          {targetType === 'Group' && selectedGroupTargets.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Targeting {selectedGroupTargets.length} contestant{selectedGroupTargets.length === 1 ? '' : 's'}: {selectedGroupTargets.join(', ')}
            </div>
          )}

          <ScrollArea className="flex-1 min-h-0 pr-4">
            <div className="grid grid-cols-1 gap-3">
              {filtered.map((ch) => {
                const seed = `${gameState.currentDay}|${gameState.playerName}|${selectedTarget}|${ch.choiceId}`;
                const preview = pickVariant(ch, seed);
                const active = selectedChoiceId === ch.choiceId;
                return (
                  <button
                    key={ch.choiceId}
                    onClick={() => setSelectedChoiceId(ch.choiceId)}
                    className={`p-4 text-left border rounded transition-colors ${active ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}
                  >
                    <div className="text-sm mb-2 text-foreground">{preview}</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{formatTag(ch.intent)}</Badge>
                      <Badge variant="secondary">{formatTag(ch.tone)}</Badge>
                      {ch.topics.slice(0,2).map(t => (
                        <Badge key={t} variant="outline">{formatTag(t)}</Badge>
                      ))}
                      <Badge variant="outline">{ch.targetType}</Badge>
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No choices match the current filters. Try clearing Intent/Tone/Topic.
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-3 pt-2 border-t border-border">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              variant="action"
              onClick={handleSubmit}
              disabled={
                !selectedChoiceId ||
                (targetType === 'Person' && !selectedTarget) ||
                (targetType === 'Group' && selectedGroupTargets.length === 0)
              }
              className="flex-1"
            >
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

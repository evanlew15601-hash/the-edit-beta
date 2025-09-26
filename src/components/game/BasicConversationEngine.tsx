import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState, Contestant } from '@/types/game';
import { getTrustDelta, getSuspicionDelta } from '@/utils/actionEngine';

type BasicTone = 'friendly' | 'strategic' | 'aggressive' | 'flirty' | 'suspicious' | 'neutral';

interface BasicOption {
  id: string;
  label: string;
  tone: BasicTone;
  text: (name: string) => string;
  description: string;
}

const BASIC_OPTIONS: BasicOption[] = [
  // Neutral idle chatter (steady state, minimal impact)
  {
    id: 'idle_chatter_kitchen',
    label: 'Idle chatter (kitchen)',
    tone: 'neutral',
    text: (name) => `Talk with ${name} about cooking plans and snacks—keep it light.`,
    description: 'Steady vibe; tiny trust gains, low suspicion',
  },
  {
    id: 'idle_chatter_weather',
    label: 'Idle chatter (weather)',
    tone: 'neutral',
    text: (name) => `Comment with ${name} on the AC, lighting, and general house comfort.`,
    description: 'Non-game talk; maintains stability',
  },
  {
    id: 'idle_chatter_chores',
    label: 'Idle chatter (chores)',
    tone: 'neutral',
    text: (name) => `Coordinate dish duty with ${name} and joke about the cleanup rotation.`,
    description: 'Shared task chat; minor rapport signals',
  },

  // Friendly social builders
  {
    id: 'friendly_smalltalk',
    label: 'Friendly small talk',
    tone: 'friendly',
    text: (name) => `Chat casually with ${name} about the day and pay a simple compliment.`,
    description: 'Build light rapport; lowers suspicion slightly',
  },
  {
    id: 'light_tease',
    label: 'Light tease',
    tone: 'friendly',
    text: (name) => `Tease ${name} lightly about a harmless habit; keep it playful.`,
    description: 'Slight bond-building if they enjoy banter',
  },

  // Romance-heavy choices
  {
    id: 'romance_flirt_direct',
    label: 'Direct flirt',
    tone: 'flirty',
    text: (name) => `Tell ${name} they look great today and you enjoy their energy around you.`,
    description: 'Stronger closeness; can lower suspicion if reciprocated',
  },
  {
    id: 'romance_cozy_chat',
    label: 'Cozy late-night chat',
    tone: 'flirty',
    text: (name) => `Invite ${name} to a quiet, cozy chat—share a personal story and listen to theirs.`,
    description: 'Deepen bond; mild trust bump, decent entertainment',
  },
  {
    id: 'romance_playful_banter',
    label: 'Playful banter',
    tone: 'flirty',
    text: (name) => `Trade a couple of playful lines with ${name}—keep it charming, not heavy.`,
    description: 'Light attraction signal; low risk, modest closeness',
  },

  // Calm drama options (defuse, redirect without confrontation)
  {
    id: 'calm_drama_defuse',
    label: 'Calmly defuse drama',
    tone: 'friendly',
    text: (name) => `Acknowledge tension and suggest to ${name} a cool-down—no public escalation.`,
    description: 'Reduce suspicion; modest trust if they value calm',
  },
  {
    id: 'calm_drama_redirect',
    label: 'Redirect away from drama',
    tone: 'neutral',
    text: (name) => `Steer ${name} toward neutral topics to avoid vote talk and rumors.`,
    description: 'Keeps things steady; lowers risk of blowback',
  },
  {
    id: 'calm_drama_validate',
    label: 'Validate and reframe',
    tone: 'friendly',
    text: (name) => `Let ${name} vent briefly, validate feelings, then reframe toward solutions.`,
    description: 'Builds trust; reduces paranoia slightly',
  },

  // Strategic probes (lightweight)
  {
    id: 'strategic_probe',
    label: 'Strategic probe',
    tone: 'strategic',
    text: (name) => `Gently ask ${name} what they\'re hearing about the vote without pushing.`,
    description: 'Gain intel; may raise suspicion',
  },

  // Soft accountability without aggression
  {
    id: 'soft_call_out',
    label: 'Soft call-out',
    tone: 'aggressive',
    text: (name) => `Point out a small inconsistency in ${name}\'s story—calm but firm.`,
    description: 'Tests honesty; risks trust hit',
  },

  // Light skepticism (non-hostile questioning)
  {
    id: 'skeptical_question',
    label: 'Skeptical question',
    tone: 'suspicious',
    text: (name) => `Ask ${name} why they\'re talking to certain people—probe motives.`,
    description: 'Raises suspicion; may yield clarity',
  },
];

interface BasicConversationEngineProps {
  gameState: GameState;
  onUseAction: (actionType: string, target?: string, content?: string, tone?: string) => void;
}

export const BasicConversationEngine = ({ gameState, onUseAction }: BasicConversationEngineProps) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');

  const availableTargets = useMemo(
    () => gameState.contestants.filter(c => !c.isEliminated && c.name !== gameState.playerName),
    [gameState.contestants, gameState.playerName]
  );

  const targetNPC: Contestant | undefined = useMemo(
    () => gameState.contestants.find(c => c.name === selectedTarget),
    [gameState.contestants, selectedTarget]
  );

  const option: BasicOption | undefined = useMemo(
    () => BASIC_OPTIONS.find(o => o.id === selectedOption),
    [selectedOption]
  );

  const preview = useMemo(() => {
    if (!targetNPC || !option) return null;
    const content = option.text(targetNPC.name);
    const trust = getTrustDelta(option.tone, targetNPC.psychProfile.disposition);
    const susp = getSuspicionDelta(option.tone, content);
    // Lightweight heuristics for influence/entertainment
    const influence = option.tone === 'strategic' ? 2 : option.tone === 'aggressive' ? -1 : 1;
    const entertainment = option.tone === 'flirty' ? 2 : option.tone === 'aggressive' ? 2 : option.tone === 'neutral' ? 0 : 1;
    return { trust, susp, influence, entertainment };
  }, [targetNPC, option]);

  const onSend = () => {
    if (!targetNPC || !option) return;
    const content = `[Basic] ${option.label}: ${option.text(targetNPC.name)}`;
    onUseAction('talk', targetNPC.name, content, option.tone);
    setSelectedOption('');
    setSelectedTarget('');
  };

  if (availableTargets.length === 0) return null;

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium">Basic RPG Conversation</h3>
        <p className="text-sm text-muted-foreground">
          Simple set choices that lightly build or damage relationships
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Target</label>
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md text-sm bg-input focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Select target...</option>
            {availableTargets.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Remaining actions</label>
          <Badge variant="outline">
            {Math.max(0, (gameState.dailyActionCap ?? 10) - (gameState.dailyActionCount ?? 0))} left
          </Badge>
        </div>
      </div>

      {selectedTarget && (
        <>
          <ScrollArea className="h-60 mb-4">
            <div className="space-y-3">
              {BASIC_OPTIONS.map(opt => {
                const isActive = selectedOption === opt.id;
                const label = opt.label;
                const description = opt.description;
                const text = targetNPC ? opt.text(targetNPC.name) : opt.text('them');
                // Simple preview using current target
                const trust = targetNPC ? getTrustDelta(opt.tone, targetNPC.psychProfile.disposition) : 0;
                const susp = targetNPC ? getSuspicionDelta(opt.tone, text) : 0;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOption(opt.id)}
                    className={`w-full text-left p-3 border rounded-lg transition-colors ${isActive ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">{label}</Badge>
                      <Badge variant="outline" className="uppercase text-[10px]">{opt.tone}</Badge>
                    </div>
                    <p className="text-sm text-foreground mb-1">{text}</p>
                    <p className="text-xs text-muted-foreground mb-2">{description}</p>
                    <div className="text-[11px] text-muted-foreground">
                      Likely effects:
                      <span className={trust >= 0 ? 'text-edit-hero ml-1' : 'text-edit-villain ml-1'}>
                        Trust {trust >= 0 ? `+${trust}` : trust}
                      </span>
                      <span className={susp >= 0 ? 'text-edit-villain ml-2' : 'text-edit-hero ml-2'}>
                        Suspicion {susp >= 0 ? `+${susp}` : susp}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Outcome Preview for the selected option */}
          {preview && (
            <div className="flex items-center flex-wrap gap-2 bg-muted/40 border border-border/60 rounded p-2.5 mb-4">
              <span className="text-xs text-muted-foreground">Preview</span>
              <Badge variant="outline">Trust {preview.trust >= 0 ? `+${preview.trust}` : preview.trust}</Badge>
              <Badge variant="outline" className={preview.susp < 0 ? 'text-edit-hero' : 'text-edit-villain'}>
                Suspicion {preview.susp >= 0 ? `+${preview.susp}` : preview.susp}
              </Badge>
              <Badge variant="outline">Influence {preview.influence >= 0 ? `+${preview.influence}` : preview.influence}</Badge>
              <Badge variant="outline">Entertainment {preview.entertainment >= 0 ? `+${preview.entertainment}` : preview.entertainment}</Badge>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSelectedOption('');
                setSelectedTarget('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="action"
              className="flex-1"
              disabled={!selectedOption}
              onClick={onSend}
            >
              Say it
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};
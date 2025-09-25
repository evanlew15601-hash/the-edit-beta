import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface AISettingsPanelProps {
  depth: 'brief' | 'standard' | 'deep';
  additions: { strategyHint: boolean; followUp: boolean; riskEstimate: boolean; memoryImpact: boolean };
  deterministicPersonaVariants?: boolean;
  outcomeScaling?: { trustSuspicionScale: number; influenceScale: number; entertainmentScale: number };
  onChange: (next: Partial<{ 
    depth: 'brief' | 'standard' | 'deep'; 
    additions: AISettingsPanelProps['additions'];
    deterministicPersonaVariants?: boolean;
    outcomeScaling?: { trustSuspicionScale: number; influenceScale: number; entertainmentScale: number };
  }>) => void;
}

export function AISettingsPanel({ depth, additions, deterministicPersonaVariants = false, outcomeScaling = { trustSuspicionScale: 40, influenceScale: 20, entertainmentScale: 20 }, onChange }: AISettingsPanelProps) {
  return (
    <Card className="p-4 space-y-4">
      <div>
        <h4 className="font-medium">AI Reply Depth</h4>
        <RadioGroup
          value={depth}
          onValueChange={(v) => onChange({ depth: v as any })}
          className="mt-2 grid grid-cols-3 gap-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="brief" id="depth-brief" />
            <Label htmlFor="depth-brief">Brief</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="standard" id="depth-standard" />
            <Label htmlFor="depth-standard">Standard</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="deep" id="depth-deep" />
            <Label htmlFor="depth-deep">Deep</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Additions</h4>
        <div className="flex items-center justify-between">
          <Label>Strategy hint</Label>
          <Switch checked={additions.strategyHint} onCheckedChange={(v) => onChange({ additions: { ...additions, strategyHint: v } })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Follow-up suggestion</Label>
          <Switch checked={additions.followUp} onCheckedChange={(v) => onChange({ additions: { ...additions, followUp: v } })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Risk estimate</Label>
          <Switch checked={additions.riskEstimate} onCheckedChange={(v) => onChange({ additions: { ...additions, riskEstimate: v } })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Memory impact</Label>
          <Switch checked={additions.memoryImpact} onCheckedChange={(v) => onChange({ additions: { ...additions, memoryImpact: v } })} />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Enhanced Tag Dialogue</h4>
        <div className="flex items-center justify-between">
          <Label>Deterministic persona-variant selection</Label>
          <Switch checked={deterministicPersonaVariants} onCheckedChange={(v) => onChange({ deterministicPersonaVariants: v })} />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Outcome Scaling</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="border rounded p-2">
            <Label className="block mb-1">Trust/Suspicion</Label>
            <input
              type="range"
              min={10}
              max={80}
              value={outcomeScaling.trustSuspicionScale}
              onChange={(e) => onChange({ outcomeScaling: { ...outcomeScaling, trustSuspicionScale: Number(e.target.value) } })}
              className="w-full"
            />
            <div className="mt-1 text-muted-foreground">Scale: {outcomeScaling.trustSuspicionScale}</div>
          </div>
          <div className="border rounded p-2">
            <Label className="block mb-1">Influence</Label>
            <input
              type="range"
              min={5}
              max={40}
              value={outcomeScaling.influenceScale}
              onChange={(e) => onChange({ outcomeScaling: { ...outcomeScaling, influenceScale: Number(e.target.value) } })}
              className="w-full"
            />
            <div className="mt-1 text-muted-foreground">Scale: {outcomeScaling.influenceScale}</div>
          </div>
          <div className="border rounded p-2">
            <Label className="block mb-1">Entertainment</Label>
            <input
              type="range"
              min={5}
              max={40}
              value={outcomeScaling.entertainmentScale}
              onChange={(e) => onChange({ outcomeScaling: { ...outcomeScaling, entertainmentScale: Number(e.target.value) } })}
              className="w-full"
            />
            <div className="mt-1 text-muted-foreground">Scale: {outcomeScaling.entertainmentScale}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

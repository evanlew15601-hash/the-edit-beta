import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface AISettingsPanelProps {
  depth: 'brief' | 'standard' | 'deep';
  additions: { strategyHint: boolean; followUp: boolean; riskEstimate: boolean; memoryImpact: boolean };
  onChange: (next: Partial<{ depth: 'brief' | 'standard' | 'deep'; additions: AISettingsPanelProps['additions'] }>) => void;
}

export function AISettingsPanel({ depth, additions, onChange }: AISettingsPanelProps) {
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
    </Card>
  );
}

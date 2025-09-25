import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface ActivityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
}

const ACTIVITIES = [
  {
    value: 'group_task',
    title: 'Group Task',
    description: 'Coordinate a small house task together (light cleaning, cooking, organizing).'
  },
  {
    value: 'workout_session',
    title: 'Workout Session',
    description: 'Lead a casual workout to bond and show leadership.'
  },
  {
    value: 'truth_or_dare',
    title: 'Truth or Dare Circle',
    description: 'Spark mild drama and reveals without direct confrontation.'
  },
  {
    value: 'cook_off',
    title: 'Cook-Off Mini Challenge',
    description: 'Friendly competition that creates light rivalries and alliances.'
  }
];

type Preset = { id: string; label: string; text: string; activity: string };

export const ActivityDialog = ({ isOpen, onClose, onSubmit }: ActivityDialogProps) => {
  const [selected, setSelected] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const presets: Preset[] = useMemo(() => {
    return [
      { id: 'organize_pantry', label: 'Organize pantry (group task)', activity: 'group_task', text: 'Quick kitchen reset. Pair up and sort—creates light bonding without drama.' },
      { id: 'stretch_circle', label: 'Stretch circle (workout)', activity: 'workout_session', text: 'Casual 10-min stretch; low pressure leadership moment.' },
      { id: 'truth_light', label: 'Soft Truth/Dare rules', activity: 'truth_or_dare', text: 'Keep it mild—two questions max, no heavy reveals. Builds fun without fallout.' },
      { id: 'duo_cookoff', label: 'Duo cook-off', activity: 'cook_off', text: 'Two pairs compete—friendly rivalry. Winner gets dessert pick.' },
    ];
  }, []);

  const preview = useMemo(() => {
    if (!selected) return null;
    // Simple preview per activity type
    switch (selected) {
      case 'group_task':
        return { trust: 0.06, suspicion: -0.02, influence: 0.02, entertainment: 0.03 };
      case 'workout_session':
        return { trust: 0.05, suspicion: -0.02, influence: 0.03, entertainment: 0.04 };
      case 'truth_or_dare':
        return { trust: 0.02, suspicion: 0.04, influence: 0.01, entertainment: 0.08 };
      case 'cook_off':
        return { trust: 0.03, suspicion: 0.02, influence: 0.02, entertainment: 0.07 };
      default:
        return null;
    }
  }, [selected]);

  const handlePresetClick = (p: Preset) => {
    setSelectedPreset(p.id);
    setSelected(p.activity);
  };

  const handleSubmit = () => {
    if (selected) {
      onSubmit(selected);
      setSelected('');
      setSelectedPreset('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Start a House Activity</DialogTitle>
          <DialogDescription>Low-stakes social actions that subtly shift dynamics.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Pick a low-stakes activity to subtly shift social dynamics.
              </p>
              <div className="grid grid-cols-1 gap-3">
                {ACTIVITIES.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => setSelected(a.value)}
                    className={`p-3 text-left border border-border rounded transition-colors ${
                      selected === a.value ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium">{a.title}</div>
                    <div className="text-sm text-muted-foreground">{a.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick presets */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quick Suggestions</label>
              <div className="grid grid-cols-2 gap-3">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePresetClick(p)}
                    className={`p-3 text-left border border-border rounded transition-colors ${
                      selectedPreset === p.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{p.label}</div>
                      <Badge variant="outline" className="text-xs capitalize">{p.activity.replace('_', ' ')}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 line-clamp-3">{p.text}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Outcome preview */}
            {preview && (
              <div className="text-sm bg-muted/40 rounded-md p-2.5 flex items-center flex-wrap border border-border/60">
                <span className="text-xs text-muted-foreground mr-3">Likely effects</span>
                <div className="inline-flex items-center gap-2">
                  <span className={`${preview.trust > 0 ? 'text-edit-hero' : 'text-edit-villain'} text-xs`}>Trust {preview.trust > 0 ? '+' : ''}{preview.trust}</span>
                  <span className={`${preview.suspicion > 0 ? 'text-edit-villain' : 'text-edit-hero'} text-xs`}>Suspicion {preview.suspicion > 0 ? '+' : ''}{preview.suspicion}</span>
                  <span className="text-xs">Influence {preview.influence > 0 ? '+' : ''}{preview.influence}</span>
                  <span className="text-xs">Entertainment {preview.entertainment > 0 ? '+' : ''}{preview.entertainment}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button variant="action" onClick={handleSubmit} disabled={!selected} className="flex-1">
                Start Activity
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

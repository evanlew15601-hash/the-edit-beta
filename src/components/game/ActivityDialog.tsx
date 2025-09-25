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
    title: 'Organize Pantry',
    description: 'Coordinate a small house task together (light cleaning, organizing).'
  },
  {
    value: 'workout_session',
    title: 'Stretch Circle',
    description: 'Lead a casual workout to bond and show leadership.'
  },
  {
    value: 'truth_or_dare',
    title: 'Soft Truth/Dare',
    description: 'Spark mild drama and reveals without direct confrontation.'
  },
  {
    value: 'cook_off',
    title: 'Duo Cook-Off',
    description: 'Friendly competition that creates light rivalries and alliances.'
  }
];

export const ActivityDialog = ({ isOpen, onClose, onSubmit }: ActivityDialogProps) => {
  const [selected, setSelected] = useState<string>('');

  const handleSubmit = () => {
    if (selected) {
      onSubmit(selected);
      setSelected('');
    }
  };

  const preview = useMemo(() => {
    if (!selected) return null;
    // Low-stakes deltas
    const trust = selected === 'group_task' || selected === 'stretch_session' ? 2 : 1;
    const susp = selected === 'truth_or_dare' ? 2 : -1;
    const influence = selected === 'cook_off' ? 2 : 1;
    const entertainment = selected === 'truth_or_dare' || selected === 'cook_off' ? 3 : 2;
    return { trust, susp, influence, entertainment };
  }, [selected]);

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

            {/* Outcome Preview */}
            {preview && (
              <div className="flex items-center flex-wrap gap-2 bg-muted/40 border border-border/60 rounded p-2.5">
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

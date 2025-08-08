import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { ScrollArea } from '@/components/ui/scroll-area';

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

export const ActivityDialog = ({ isOpen, onClose, onSubmit }: ActivityDialogProps) => {
  const [selected, setSelected] = useState<string>('');

  const handleSubmit = () => {
    if (selected) {
      onSubmit(selected);
      setSelected('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Start a House Activity</DialogTitle>
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

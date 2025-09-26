import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { ScrollArea } from '@/components/ui/scroll-area';

export type CutsceneSlide = {
  title?: string;
  speaker?: string;
  text: string;
  aside?: string;
};

interface CutsceneProps {
  title: string;
  slides: CutsceneSlide[];
  onComplete: () => void;
  ctaLabel?: string;
}

export const Cutscene = ({ title, slides, onComplete, ctaLabel = 'Continue' }: CutsceneProps) => {
  const [index, setIndex] = useState(0);

  // Guard: handle empty or invalid slide arrays safely
  if (!slides || slides.length === 0) {
    return (
      <div className="min-h-screen bg-background px-6 py-10">
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-light text-foreground">{title}</h1>
            <div className="w-20 h-px bg-primary mx-auto" />
          </div>
          <Card className="p-6">
            <div className="space-y-4">
              <p className="text-muted-foreground">No scenes available.</p>
              <div className="flex justify-end">
                <Button variant="action" size="sm" onClick={onComplete}>
                  {ctaLabel}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const current = slides[index];
  const isLast = index === slides.length - 1;

  const next = () => {
    if (isLast) onComplete();
    else setIndex((i) => Math.min(i + 1, slides.length - 1));
  };

  const prev = () => setIndex((i) => Math.max(i - 1, 0));

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-light text-foreground">{title}</h1>
          <div className="w-20 h-px bg-primary mx-auto" />
        </div>

        <Card className="p-6">
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-3">
              {current?.title && (
                <div className="text-sm uppercase tracking-wide text-muted-foreground">{current.title}</div>
              )}
              {current?.speaker && (
                <div className="text-sm text-primary/80">{current.speaker}</div>
              )}
              <p className="text-foreground leading-relaxed">{current?.text || ''}</p>
              {current?.aside && (
                <p className="text-sm text-muted-foreground italic">{current.aside}</p>
              )}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between mt-6">
            <div className="text-xs text-muted-foreground">
              {index + 1} / {slides.length}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={prev} disabled={index === 0}>
                Back
              </Button>
              <Button variant="action" size="sm" onClick={next} className="hover-scale">
                {isLast ? ctaLabel : 'Next'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

import { Cutscene, CutsceneSlide } from './cutscenes/Cutscene';

interface PremiereCutsceneProps {
  onComplete: () => void;
}

export const PremiereCutscene = ({ onComplete }: PremiereCutsceneProps) => {
  const slides: CutsceneSlide[] = [
    {
      title: 'Cold Open',
      speaker: 'Narrator',
      text: 'Cameras hum. Doors slide open. A dozen stories cross in one house. The edit will decide which one becomes legend.',
    },
    {
      title: 'Confessional',
      speaker: 'You',
      text: 'Day one. New faces, new tells. Play quiet. Listen louder. The story starts whether I speak or not.',
    },
    {
      title: 'Host Stinger',
      speaker: 'Mars Vega (Host)',
      text: 'Welcome to The Edit. Every conversation is a choice. Every silence is too. Good luck.',
    },
    {
      title: 'House Entry',
      text: 'Footsteps on polished floor. The room adjusts to you. Time to write the first line of your story.',
      aside: 'Tip: confessionals shift your screen-time and approval. Use them.',
    },
  ];

  return <Cutscene title="Premiere Night" slides={slides} onComplete={onComplete} ctaLabel="Enter the House" />;
};

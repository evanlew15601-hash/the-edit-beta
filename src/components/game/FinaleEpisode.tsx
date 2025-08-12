import { useState } from 'react';
import { Cutscene, CutsceneSlide } from './cutscenes/Cutscene';
import { FinaleScreen } from './FinaleScreen';
import { GameState } from '@/types/game';

interface FinaleEpisodeProps {
  gameState: GameState;
  onSubmitSpeech: (speech: string) => void;
}

export const FinaleEpisode = ({ gameState, onSubmitSpeech }: FinaleEpisodeProps) => {
  const [cutsceneDone, setDone] = useState(false);

  const slides: CutsceneSlide[] = [
    {
      title: 'Final Montage',
      text: 'Two stories left in the edit. Every vote is a sentence, together they write the ending.',
    },
    {
      title: 'The Room',
      text: 'The jury watches. You can feel history waiting for your words.',
      aside: 'Tip: your speech won’t invent facts. It frames the truth they already saw.',
    },
  ];

  if (!cutsceneDone) {
    return <Cutscene title="Finale Night" slides={slides} onComplete={() => setDone(true)} ctaLabel="Deliver Speeches" />;
  }

  return (
    <FinaleScreen
      gameState={gameState}
      onSubmitSpeech={onSubmitSpeech}
      onContinue={() => { /* handled inside FinaleScreen via submit */ }}
    />
  );
};

import { useState } from 'react';
import { Cutscene } from './cutscenes/Cutscene';
import { FinaleScreen } from './FinaleScreen';
import { GameState, CutsceneSlide } from '@/types/game';

interface FinaleEpisodeProps {
  gameState: GameState;
  onSubmitSpeech: (speech: string) => void;
  onAFPVote: (choice: string) => void;
  onContinue: () => void;
}

export const FinaleEpisode = ({ gameState, onSubmitSpeech, onAFPVote, onContinue }: FinaleEpisodeProps) => {
  const [cutsceneDone, setDone] = useState(false);

  const slides: CutsceneSlide[] = [
    {
      title: 'Final Montage',
      text: 'Two houseguests left. One walks out with the grand prize, one walks out with a keychain.',
    },
    {
      title: 'The Room',
      text: 'The jury files in and takes their seats. They’re not just picking a winner, they’re deciding who played the better game.',
      aside: 'Tip: talk about your moves, your loyalty, and why you beat the person next to you.',
    },
  ];

  if (!cutsceneDone) {
    return <Cutscene title="Finale Night" slides={slides} onComplete={() => setDone(true)} ctaLabel="Deliver Speeches" />;
  }

  return (
    <FinaleScreen
      gameState={gameState}
      onSubmitSpeech={onSubmitSpeech}
      onAFPVote={onAFPVote}
      onContinue={onContinue}
    />
  );
};

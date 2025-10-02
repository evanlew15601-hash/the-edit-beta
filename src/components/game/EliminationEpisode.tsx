import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Cutscene } from './cutscenes/Cutscene';
import { EliminationScreen } from './EliminationScreen';
import { GameState, CutsceneSlide } from '@/types/game';

interface EliminationEpisodeProps {
  gameState: GameState;
  onContinue: () => void;
}

export const EliminationEpisode = ({ gameState, onContinue }: EliminationEpisodeProps) => {
  const [cutsceneDone, setDone] = useState(false);

  const slides: CutsceneSlide[] = [
    {
      title: 'The Call',
      speaker: 'Narrator',
      text: 'Lights dip. Housemates line up. There is a hush the cameras love. Someone is about to become backstory.',
    },
    {
      title: 'Whispers',
      text: 'Eyes dart. Deals echo in muscle memory. You catch a glance that says more than a paragraph.',
    },
    {
      title: 'The Read',
      speaker: 'Host',
      text: 'It’s time. When I say your name, you are out of the game.',
    },
  ];

  if (!cutsceneDone) {
    return <Cutscene title="Elimination Night" slides={slides} onComplete={() => setDone(true)} ctaLabel="Reveal" />;
  }

  return <EliminationScreen gameState={gameState} onContinue={onContinue} />;
};

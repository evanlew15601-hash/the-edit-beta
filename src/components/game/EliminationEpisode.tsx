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

  const active = gameState.contestants.filter((c) => !c.isEliminated);
  const nominees = active.filter((c) => c.isNominated);
  const nomineeNames = nominees.map((c) => c.name);
  const hasNominees = nomineeNames.length > 0;

  const slides: CutsceneSlide[] = [
    {
      title: 'Tonight on The Edit',
      speaker: 'Mars Vega (Host)',
      text:
        'The lights are down, the house is lined up, and for one of you this is the last time you stand here as a houseguest.',
    },
    {
      title: 'Previously This Week',
      speaker: 'Narrator',
      text:
        'Whispers in the bedroom turned into plans at the kitchen table. Tonight we see which name made it onto the ballot.',
    },
    {
      title: 'On the Block',
      speaker: 'Narrator',
      text: hasNominees
        ? `Facing the vote: ${nomineeNames.join(' and ')}. One of them will leave the house tonight.`
        : 'The house has made up its mind. Someone is about to find out the vote did not break their way.',
    },
    {
      title: 'The Read',
      speaker: 'Mars Vega (Host)',
      text:
        'It is time. When I say your name, your game on The Edit is over and your story becomes part of the season.',
    },
  ];

  if (!cutsceneDone) {
    return <Cutscene title="Elimination Night" slides={slides} onComplete={() => setDone(true)} ctaLabel="Reveal" />;
  }

  return <EliminationScreen gameState={gameState} onContinue={onContinue} />;
};

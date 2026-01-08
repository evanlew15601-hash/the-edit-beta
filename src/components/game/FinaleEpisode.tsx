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

  const finalists = gameState.contestants.filter((c) => !c.isEliminated).map((c) => c.name);
  const finalistLine =
    finalists.length === 2 ? `${finalists[0]} and ${finalists[1]}` : `${finalists.join(', ')}`;

  const persona = gameState.editPerception.persona;
  const personaLabel =
    persona === 'Hero'
      ? 'a steady player the show often framed in a positive light'
      : persona === 'Villain'
      ? 'a player the show highlighted when conflict started'
      : persona === 'Dark Horse'
      ? 'a player who gained attention later in the season'
      : persona === 'Underedited'
      ? 'a player who appeared less often but was present in key moments'
      : 'a player the audience never fully agreed on';

  const slides: CutsceneSlide[] = [
    {
      title: 'Final Package',
      speaker: 'Narrator',
      text:
        'From move-in to this moment, every conversation, every vote, and every confessional has been cut into a season of The Edit.',
    },
    {
      title: 'The Chairs',
      speaker: 'Mars Vega (Host)',
      text:
        finalists.length >= 2
          ? `Two houseguests remain at the end of this story: ${finalistLine}. One will walk out with the win, one will walk out with a story the jury did not buy.`
          : 'The final seats are filled. One person will walk out with the win, one will walk out with a story the jury did not buy.',
    },
    {
      title: 'How You Played',
      speaker: 'Narrator',
      text: `The edit has pushed you as ${personaLabel}. Tonight, the jury decides whether the game they lived matches the story they watched.`,
    },
    {
      title: 'The Jury',
      speaker: 'Mars Vega (Host)',
      text:
        'The people you voted with, and against, now hold your fate. They are not just picking a winner, they are deciding whose game they are willing to sign their names to.',
      aside: 'In your speech, own your moves, your mistakes, and why you deserve to be the last one standing.',
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

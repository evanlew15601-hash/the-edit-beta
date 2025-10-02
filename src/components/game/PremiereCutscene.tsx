import { Cutscene } from './cutscenes/Cutscene';
import { GameState, CutsceneSlide } from '@/types/game';

interface PremiereCutsceneProps {
  onComplete: () => void;
  gameState?: GameState;
}

export const PremiereCutscene = ({ onComplete, gameState }: PremiereCutsceneProps) => {
  const contestants = gameState?.contestants || [];
  const playerName = gameState?.playerName || 'You';

  // Build Big Brother style intros and first meeting montage
  const introSlides: CutsceneSlide[] = [];

  introSlides.push({
    title: 'Cold Open',
    speaker: 'Narrator',
    text: 'Cameras hum. Doors slide open. A dozen stories cross in one house. The edit will decide which one becomes legend.',
  });

  // Player intro
  const player = contestants.find(c => c.name === playerName);
  if (player) {
    introSlides.push({
      title: 'Your Arrival',
      speaker: playerName,
      text:
        player.background && player.background !== 'Other'
          ? `${playerName}, ${player.background.toLowerCase()}. Strengths: ${
              player.stats?.primary || 'social'
            }. Eyes on the room, hands steady on the story.`
          : `${playerName}. Strengths: ${player.stats?.primary || 'social'}. Take a breath. Step in.`,
      aside: player.customBackgroundText ? `Backstory: ${player.customBackgroundText}` : undefined,
    });
  } else {
    introSlides.push({
      title: 'Confessional',
      speaker: 'You',
      text: 'Day one. New faces, new tells. Play quiet. Listen louder. The story starts whether I speak or not.',
    });
  }

  // Quick-fire intros for a subset of NPCs
  contestants
    .filter(c => c.name !== playerName)
    .slice(0, 7)
    .forEach(c => {
      const prim = c.stats?.primary || 'social';
      const special =
        c.special && c.special.kind !== 'none'
          ? c.special.kind === 'hosts_estranged_child'
            ? 'Rumored ties beyond the walls.'
            : 'Production plants curious seeds.'
          : undefined;

      introSlides.push({
        title: 'Arrival',
        speaker: c.name,
        text:
          c.background && c.background !== 'Other'
            ? `${c.name}, ${c.background.toLowerCase()}. Leans ${prim}. ${c.publicPersona}.`
            : `${c.name}. Leans ${prim}. ${c.publicPersona}.`,
        aside: special,
      });
    });

  // First meeting montage
  introSlides.push({
    title: 'The Meeting',
    text:
      'Helloes overlap. Hugs, handshakes, glances. Names travel fast; judgments travel faster. The house calibrates social gravity.',
    aside: 'Tip: Observe early. First impressions harden into habits.',
  });

  // Host welcome
  introSlides.push({
    title: 'Host Stinger',
    speaker: 'Mars Vega (Host)',
    text:
      'Welcome to The Edit. Every conversation is a choice. Every silence is too. Your first week starts now—good luck.',
  });

  // House entry
  introSlides.push({
    title: 'House Entry',
    text:
      'Footsteps on polished floor. The room adjusts to you. Time to write the first line of your story.',
    aside: 'Confessionals affect screen-time and approval. Use them.',
  });

  return (
    <Cutscene
      title="Premiere Night"
      slides={introSlides}
      onComplete={onComplete}
      ctaLabel="Enter the House"
    />
  );
};

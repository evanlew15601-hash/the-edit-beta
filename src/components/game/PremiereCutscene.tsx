import { Cutscene, CutsceneSlide } from './cutscenes/Cutscene';
import { GameState } from '@/types/game';

interface PremiereCutsceneProps {
  onComplete: () => void;
  gameState?: GameState;
}

export const PremiereCutscene = ({ onComplete, gameState }: PremiereCutsceneProps) => {
  const contestants = gameState?.contestants || [];
  const playerName = gameState?.playerName || 'You';
  const player = contestants.find(c => c.name === playerName);

  const introSlides: CutsceneSlide[] = [];

  // Cold open tied to player's selected twist
  const primary = player?.stats?.primary || 'social';
  const bgText =
    player?.background && player.background !== 'Other'
      ? `${playerName}, ${player.background.toLowerCase()}.`
      : `${playerName}.`;
  const personalAside = player?.customBackgroundText ? `Backstory: ${player.customBackgroundText}` : undefined;

  introSlides.push({
    title: 'Cold Open',
    speaker: 'Narrator',
    text:
      player?.special?.kind === 'hosts_estranged_child'
        ? 'Some stories walk into the house on their own. Yours is one of them. What you reveal—and when—will define the next few weeks.'
        : player?.special?.kind === 'planted_houseguest'
          ? 'A season starts. You have an assignment. Make it look like you don’t.'
          : 'Cameras hum. Doors slide open. A dozen stories cross in one house. The edit will decide which one becomes legend.',
  });

  // Player intro, personalized by special background
  if (player) {
    const isHostChild = player.special && player.special.kind === 'hosts_estranged_child';
    const isPlanted = player.special && player.special.kind === 'planted_houseguest';
    const firstTask = isPlanted ? (player.special as any).tasks?.[0] : undefined;

    introSlides.push({
      title: 'Your Arrival',
      speaker: playerName,
      text:
        isHostChild
          ? `${bgText} Strengths: ${primary}. Keep the game clean; keep the secret cleaner.`
          : isPlanted
            ? `${bgText} Strengths: ${primary}. Mission brief in pocket. Face neutral. Plan moving.`
            : `${bgText} Strengths: ${primary}. Take a breath. Step in.`,
      aside: personalAside,
    });

    if (isHostChild) {
      introSlides.push(
        {
          title: 'Private Resolve',
          speaker: playerName,
          text: 'I’m here to play. If whispers start, they’ll talk about my moves, not my name.',
          aside: 'Tip: Use confessionals to frame the story around gameplay.',
        },
        {
          title: 'Seed Control',
          text: 'Rumors travel fast; oxygen is limited. Alliances and consistency suffocate speculation.',
        }
      );
    }

    if (isPlanted) {
      introSlides.push(
        {
          title: 'Producer Briefing',
          speaker: 'Narrator',
          text:
            firstTask
              ? `Week 1 Task: "${firstTask.description}". Make it feel organic.`
              : 'Week 1 Task: Blend in. Write a cover story you can repeat without thinking.',
          aside: 'Consistency beats brilliance. Pick one line; repeat it.',
        },
        {
          title: 'Cover Story',
          text: 'Choose motives, not mechanics. People trust motives. Mechanics expose you.',
        }
      );
    }
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
    .slice(0, 6)
    .forEach(c => {
      const prim = c.stats?.primary || 'social';
      introSlides.push({
        title: 'Arrival',
        speaker: c.name,
        text:
          c.background && c.background !== 'Other'
            ? `${c.name}, ${c.background.toLowerCase()}. Leans ${prim}. ${c.publicPersona}.`
            : `${c.name}. Leans ${prim}. ${c.publicPersona}.`,
      });
    });

  // First meeting montage
  introSlides.push({
    title: 'The Meeting',
    text:
      'Helloes overlap. Hugs, handshakes, glances. Names travel fast; judgments travel faster. The house calibrates social gravity.',
    aside: 'Observe early. First impressions harden into habits.',
  });

  // Host welcome
  introSlides.push({
    title: 'Host Stinger',
    speaker: 'Mars Vega (Host)',
    text:
      'Welcome to The Edit. Every conversation is a choice. Every silence is too. Your first week starts now—good luck.',
  });

  // Twist-aware house entry nudge
  introSlides.push({
    title: 'House Entry',
    text:
      player?.special?.kind === 'hosts_estranged_child'
        ? 'Eyes on the room, not on the rumor. If the truth surfaces, control its framing.'
        : player?.special?.kind === 'planted_houseguest'
          ? 'Keep the mission invisible. Plant lightly; let someone else water it.'
          : 'Footsteps on polished floor. The room adjusts to you. Time to write the first line of your story.',
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

import { Cutscene } from './cutscenes/Cutscene';
import { GameState, CutsceneSlide } from '@/types/game';

const describeBackground = (label?: string) => {
  if (!label) return '';
  const trimmed = label.trim();
  if (!trimmed) return '';
  const firstChar = trimmed[0].toLowerCase();
  const useAn = ['a', 'e', 'i', 'o', 'u'].includes(firstChar);
  return `${useAn ? 'an' : 'a'} ${trimmed.toLowerCase()}`;
};

interface PremiereCutsceneProps {
  onComplete: () => void;
  gameState?: GameState;
}

export const PremiereCutscene = ({ onComplete, gameState }: PremiereCutsceneProps) => {
  const contestants = gameState?.contestants || [];
  const playerName = gameState?.playerName || 'You';

  const player = contestants.find(c => c.name === playerName);
  const others = contestants.filter(c => c.name !== playerName && !c.isEliminated);

  const introSlides: CutsceneSlide[] = [];

  // Cold open: walking toward a show you've only seen from the couch
  introSlides.push({
    title: 'Studio Night',
    speaker: 'Narrator',
    text:
      'The hallway outside the stage smells like cold air and hot lights. At the end of it waits the door you\'ve seen a hundred times on TV—only this time, your mic is the one that\'s live.',
  });

  if (player) {
    const backgroundLabel =
      player.background === 'Other'
        ? player.customBackgroundText
        : player.background;
    const primary = player.stats?.primary;

    introSlides.push({
      title: 'On Deck',
      speaker: playerName,
      text:
        backgroundLabel
          ? `Back home you\'re ${describeBackground(backgroundLabel)}. Tonight you\'re the person about to walk into a house full of strangers and cameras.`
          : 'Back home you had a normal life. Tonight you\'re the person about to walk into a house full of strangers and cameras.',
      aside:
        primary
          ? `You quietly decide to lean on your ${primary} game first. Everything else can wait.`
          : undefined,
    });
  } else {
    introSlides.push({
      title: 'On Deck',
      speaker: 'You',
      text:
        'You roll your shoulders once, feeling the weight of the mic pack. Whatever your life was before this hallway, it stays on the other side of the door.',
    });
  }

  // First steps into the house
  introSlides.push({
    title: 'First Steps Inside',
    speaker: 'Narrator',
    text:
      'The door opens on a room that looks slightly smaller than it did on screen. Bright, too bright. A dozen empty seats and too many cameras wait for the cast to exist.',
  });

  // Feature a handful of other houseguests with small, grounded snapshots
  const featured = others.slice(0, 4);
  featured.forEach(c => {
    const bg =
      c.background === 'Other' && c.customBackgroundText
        ? c.customBackgroundText
        : c.background;
    introSlides.push({
      title: 'First Impressions',
      speaker: c.name,
      text: [
        bg
          ? `${c.name} laughs as they cross the threshold, talking about life as ${describeBackground(bg)}.`
          : `${c.name} fills the doorway with an easy grin.`,
        c.publicPersona
          ? `Casting calls them "${c.publicPersona}". You watch to see whether the room believes it.`
          : 'They take in the room quickly, eyes bouncing from camera to faces and back again.',
      ].join(' '),
    });
  });

  // Group settling scene
  introSlides.push({
    title: 'The Room Fills',
    speaker: 'Narrator',
    text:
      'Shoes hit the floor, bags thump against couches, and names start to overlap. Some people hug like instant friends; others hover just outside the circle, measuring.',
    aside: 'You don\'t have to be the loudest voice in the room. You just have to remember who spoke first and who watched.',
  });

  // Host welcome
  introSlides.push({
    title: 'Live from the Stage',
    speaker: 'Mars Vega (Host)',
    text:
      'Welcome to The Edit. Sixteen strangers, one house, and a season of choices. Every move you make from this moment on is part of the story we tell.',
  });

  // Final beat before normal gameplay
  introSlides.push({
    title: 'Your Turn',
    speaker: playerName || 'You',
    text:
      'You feel the eyes, the lights, the weight of the key wall you can\'t see yet. However this season plays out, the first move is simple: walk in and sit down.',
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

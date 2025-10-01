import { GameState, CutsceneSlide, NarrativeBeat } from '@/types/game';
import { BACKGROUND_META } from '@/data/backgrounds';

function getPlayer(gs: GameState) {
  return gs.contestants.find(c => c.name === gs.playerName);
}

function getBackstoryContext(gs: GameState): { summary?: string; line?: string } {
  const p = getPlayer(gs);
  if (!p) return {};
  const bgName = p.background;
  const meta = bgName ? BACKGROUND_META.find(m => m.name === bgName) : undefined;
  const hint = meta?.personaHint ? `—${meta.personaHint}` : '';
  const backgroundLine = p.customBackgroundText
    ? `Backstory: ${p.customBackgroundText}`
    : bgName
    ? `Background: ${bgName}${hint ? ` ${hint}` : ''}.`
    : undefined;
  const summary =
    p.customBackgroundText
      ? `You carry a ${bgName || 'custom'} backstory that informs how you read the room.`
      : bgName
      ? `Your ${bgName.toLowerCase()} background shapes your timing and tone.`
      : undefined;
  return { summary, line: backgroundLine };
}

export function buildTwistIntroCutscene(gs: GameState) {
  const arc = gs.twistNarrative?.arc || 'none';
  const player = getPlayer(gs);
  const name = player?.name || 'You';
  const back = getBackstoryContext(gs);

  let title = 'Twist: Prologue';
  let slides: CutsceneSlide[] = [];
  let ctaLabel = 'Continue';

  if (arc === 'hosts_child') {
    title = 'Prologue: The Unspoken';
    slides = [
      {
        title: 'Establishing Shot',
        speaker: 'Narrator',
        text: 'Some stories enter the house before the houseguests do. Yours is one of them. The walls are neutral; the cameras are not.',
        aside: back.summary || 'Start from game first principles: votes, numbers, timing.',
      },
      {
        title: 'Backstory',
        speaker: name,
        text: back.line
          ? `${back.line} However it reads on TV, it won’t play the votes for me.`
          : 'I brought a life outside this house. In here, only moves matter.',
        aside: 'Use confessionals to frame who you are before the house frames you.',
      },
      {
        title: 'Private Resolve',
        speaker: name,
        text: 'I came to play this game. The rest stays off the table—until the game forces it on. If that moment comes, I’ll choose the frame before someone else does.',
        aside: 'Keep focus: gameplay first, reveal only if necessary.',
      },
      {
        title: 'Seeds',
        text: 'Whispers arrive before proof. A glance lingers. A rumor finds a host. You prepare the antidote before the cut.',
        aside: 'Tip: confessionals shape perception—plant context before events plant you.',
      },
    ];
    ctaLabel = 'Enter Week 1';
  } else if (arc === 'planted_houseguest') {
    title = 'Prologue: The Assignment';
    const firstTask = player?.special && player.special.kind === 'planted_houseguest'
      ? (player.special.tasks || [])[0]
      : undefined;
    slides = [
      {
        title: 'Briefing',
        speaker: 'Narrator',
        text: 'You have a mission. Production will test subtlety, timing, and cover. Your job is to make art look like reality.',
        aside: back.summary || 'Leverage your day-one persona to hide day-two influence.',
      },
      {
        title: 'Cover Story',
        speaker: name,
        text: back.line
          ? `${back.line} That’s my camouflage. I’ll repeat it until even I believe it.`
          : 'No explicit backstory on file. So I’ll write one and perform it until it sticks.',
      },
      {
        title: 'Week 1',
        speaker: name,
        text: firstTask
          ? `Mission assigned: "${firstTask.description}". I’ll fold it into natural conversation beats and let others carry it.`
          : 'No explicit mission yet. Blend in; build a believable cover; front-load normalcy.',
        aside: 'Consistent story beats matter more than loud ones.',
      },
      {
        title: 'Operating Principle',
        text: 'What you repeat becomes what they believe. Define habits, phrases, and tells now. Later, they’ll justify your moves for you.',
      },
    ];
    ctaLabel = 'Enter Week 1';
  } else {
    title = 'Prologue';
    slides = [
      { title: 'Orientation', text: 'A new game starts. The house calibrates around you. You choose the signal; the edit chooses the volume.', aside: back.summary },
      { title: 'Identity', speaker: name, text: back.line || 'I’ll let my game define my identity here.' },
      { title: 'Thesis', text: 'Every choice becomes footage. Every silence becomes implication. You’ll use both.' },
    ];
  }

  return { title, slides, ctaLabel, type: 'twist_intro' as const };
}

export function buildMidGameCutscene(gs: GameState, beat: NarrativeBeat) {
  const arc = gs.twistNarrative?.arc || 'none';
  const player = getPlayer(gs);
  const name = player?.name || 'You';
  const back = getBackstoryContext(gs);

  const slides: CutsceneSlide[] = [];

  if (arc === 'hosts_child') {
    if (beat.id === 'hc_rumor_swirl') {
      slides.push(
        {
          title: 'Air Currents',
          speaker: 'Narrator',
          text: 'Rumors circle without landing. Your name is lighter and heavier at the same time. Gravity builds with repetition.',
        },
        {
          title: 'Containment',
          speaker: name,
          text: 'I heard it. They heard it. We move anyway. Tighten alliances; limit oxygen. I’ll feed them gameplay until the rumor starves.',
          aside: 'Pick confessionals that steer the audience back to gameplay.',
        },
        {
          title: 'Context',
          speaker: name,
          text: back.line
            ? `${back.line} That explains my tone—not my vote. I’ll keep reminding them of the difference.`
            : 'My personal story informs my tone, not my target.',
        },
      );
    } else if (beat.id === 'hc_reveal') {
      slides.push(
        {
          title: 'Moment of Truth',
          text: 'Silence breaks. The connection leaves shadows and steps into light. The room reads you; you read the room.',
        },
        {
          title: 'Frame It',
          speaker: name,
          text: 'It’s part of my life, not my strategy. Judge me by my moves. If you can’t, I’ll give you moves you can’t ignore.',
        },
        {
          title: 'Edit Math',
          text: 'A reveal reframes old footage and scripts new confessionals. You choose which clips they remember.',
          aside: 'Deliver a clean, memorable thesis right after the reveal.',
        },
      );
    } else {
      slides.push(
        { title: beat.title, text: 'A beat activates. It’s not the only story, but it shapes the next few scenes.' },
        { title: 'Grounding', speaker: name, text: back.line || 'I anchor back to who I am so the house can predict me—until it can’t.' },
      );
    }
  } else if (arc === 'planted_houseguest') {
    if (beat.id === 'phg_risky_plant') {
      slides.push(
        {
          title: 'The Plant',
          speaker: 'Narrator',
          text: 'Risk is the premium paid for influence. You place a seed and pretend you forgot you did. The house waters it for you.',
        },
        {
          title: 'Execution',
          speaker: name,
          text: 'Casual tone. Specific detail. Someone repeats it. Now it lives. If it traces back, it still sounds like me.',
        },
        {
          title: 'Cover Integrity',
          text: back.line
            ? `Your cover loops through your ${player?.background?.toLowerCase() || 'day-one'} habits. Repetition protects you.`
            : 'Define a habit, a phrase, a daily rhythm—make it your alibi.',
        },
      );
    } else if (beat.id === 'phg_close_call') {
      slides.push(
        {
          title: 'Close Call',
          text: 'Eyes linger too long. Your alibi needs a second draft. You slow your pulse and speed up your context.',
          aside: 'Consistency beats brilliance. Repeat the cover.',
        },
        {
          title: 'Reframe',
          speaker: name,
          text: back.line
            ? `Lean into ${player?.background?.toLowerCase()}: give a reason only that persona would give.`
            : 'Offer a reason only your established persona would offer.',
        },
      );
    } else {
      slides.push(
        { title: beat.title, text: 'Mid-game beat active. Stay ahead of the narrative curve.' },
        { title: 'Grounding', speaker: name, text: back.line || 'If they recognize my rhythm, they won’t question my tempo.' },
      );
    }
  } else {
    slides.push(
      { title: beat.title, text: 'Mid-game scene. Choices connect to reputation; reputation connects to votes.' },
      { title: 'Identity Thread', speaker: name, text: back.line || 'I keep a throughline so people can read my moves—and misread the next one.' },
    );
  }

  return { title: 'Mid-Game Beat', slides, ctaLabel: 'Return to Game', type: 'mid_game' as const };
}

export function buildTwistResultCutscene(gs: GameState, result: 'success' | 'failure', ctx?: { taskId?: string }) {
  const arc = gs.twistNarrative?.arc || 'none';
  const player = getPlayer(gs);
  const name = player?.name || 'You';
  const back = getBackstoryContext(gs);

  const slides: CutsceneSlide[] = [];
  let title = 'Result';

  if (arc === 'planted_houseguest') {
    title = result === 'success' ? 'Mission: Clear' : 'Mission: Compromised';
    if (result === 'success') {
      slides.push(
        {
          title: 'Clean Cut',
          text: 'The move reads natural. No one sees the stitch. The story breathes on its own.',
        },
        {
          title: 'Leverage',
          speaker: name,
          text: 'Subtle wins compound. I cash small chips later for big ones. The less I take credit, the more it pays.',
        },
        {
          title: 'Cover Status',
          text: back.line ? back.line : 'Your cover holds because you kept performing the same person.',
        },
      );
    } else {
      slides.push(
        {
          title: 'Noise',
          text: 'Someone hears a seam. Suspicion rises faster than truth. Your next words decide if it frays.',
        },
        {
          title: 'Damage Control',
          speaker: name,
          text: 'Reframe without overexplaining. Repeat the cover. Change the subject. Give them a new puzzle that solves the old one.',
        },
        {
          title: 'Collateral',
          text: 'Trust dips in the short term; edit sharpens the outline. You can still turn edges into angles.',
        },
      );
    }
  } else if (arc === 'hosts_child') {
    title = result === 'success' ? 'Trust Rebuilt' : 'Trust Fractured';
    slides.push(
      {
        title: 'Fallout',
        text: result === 'success'
          ? 'A steady week softens the edges of perception. Confessionals match behavior; the story feels earned.'
          : 'A sharp moment makes the edit sharper. Silence looks like strategy; strategy looks like deflection.',
      },
      {
        title: 'Next Beat',
        speaker: name,
        text: result === 'success'
          ? 'Keep it simple; make it about votes and numbers. Familiarity rebuilds safety.'
          : 'Own the moment; make the next one a counterweight. Give people a reason to root for the game you play.',
      },
      {
        title: 'Grounding',
        text: back.line || 'Re-anchor to your stated identity so the reveal becomes context, not definition.',
      },
    );
  } else {
    slides.push(
      { text: result === 'success' ? 'Positive momentum. Small wins bank future options.' : 'A setback—recover on the next choice. Define the lesson so others don’t define you.' },
      { title: 'Identity Thread', text: back.line || 'Return to your throughline before you pivot.' },
    );
  }

  return { 
    title, 
    slides, 
    ctaLabel: 'Return to Game', 
    type: result === 'success' ? 'twist_result_success' as const : 'twist_result_failure' as const 
  };
}

export function buildFinaleCutscene(gs: GameState) {
  const arc = gs.twistNarrative?.arc || 'none';
  const player = getPlayer(gs);
  const name = player?.name || 'You';
  const back = getBackstoryContext(gs);

  const slides: CutsceneSlide[] = [];

  if (arc === 'hosts_child') {
    slides.push(
      {
        title: 'Throughline',
        text: 'A rumor became a reveal became a resolved story. You turned a headline into context and context into gameplay.',
      },
      {
        title: 'Backstory Thread',
        text: back.line || 'Your personal story became a lens, not a leash.',
      },
      {
        title: 'Closing Statement',
        speaker: name,
        text: 'Judge the game I played, not the headline I carried. The moves hold up without the lore.',
      },
    );
  } else if (arc === 'planted_houseguest') {
    slides.push(
      {
        title: 'Ledger',
        text: 'Some missions succeeded. Some exposed. The pattern tells the truth: consistent cover, controlled reveals, leverage banked.',
      },
      {
        title: 'Backstory Thread',
        text: back.line || 'Your cover worked because your identity never broke character.',
      },
      {
        title: 'Closing Statement',
        speaker: name,
        text: 'I planted, I pivoted, and I kept the house alive. The question now is: did I keep my own game alive too?',
      },
    );
  } else {
    slides.push(
      { title: 'Epilogue', text: 'The season writes its epilogue. One story remains: the winner. Your identity stitched the edit together.' },
      { title: 'Backstory Thread', text: back.line || 'Your background quietly explained your decisions all season.' },
    );
  }

  return { title: 'Arc Finale', slides, ctaLabel: 'Proceed', type: 'finale_twist' as const };
}
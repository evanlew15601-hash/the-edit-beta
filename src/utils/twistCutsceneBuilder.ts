import { GameState, CutsceneSlide, NarrativeBeat } from '@/types/game';

function getPlayer(gs: GameState) {
  return gs.contestants.find(c => c.name === gs.playerName);
}

export function buildTwistIntroCutscene(gs: GameState) {
  const arc = gs.twistNarrative?.arc || 'none';
  const player = getPlayer(gs);
  const name = player?.name || 'You';

  let title = 'Twist: Prologue';
  let slides: CutsceneSlide[] = [];
  let ctaLabel = 'Continue';

  if (arc === 'hosts_child') {
    title = 'Prologue: The Unspoken';
    slides = [
      {
        title: 'Establishing Shot',
        speaker: 'Narrator',
        text: 'Some stories enter the house before the houseguests do. Yours is one of them.',
      },
      {
        title: 'Private Resolve',
        speaker: name,
        text: 'I came to play this game. The rest stays off the table—until the game forces it on.',
        aside: 'Keep focus: gameplay first, reveal only if necessary.',
      },
      {
        title: 'Seeds',
        text: 'Whispers arrive before proof. The edit is listening.',
        aside: 'Tip: Confessionals shape perception—use them to frame the truth.',
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
        text: 'You have a mission. Production will test subtlety, timing, and cover.',
      },
      {
        title: 'Week 1',
        speaker: name,
        text: firstTask
          ? `Mission assigned: "${firstTask.description}". Make it look organic.`
          : 'No explicit mission yet. Blend in; build a believable cover.',
        aside: 'Consistent story beats matter more than loud ones.',
      },
      {
        title: 'Cover Story',
        text: 'What you repeat becomes what they believe. Write it carefully.',
      },
    ];
    ctaLabel = 'Enter Week 1';
  } else {
    title = 'Prologue';
    slides = [
      { text: 'A new game starts. The house calibrates around you.' },
      { text: 'Every choice becomes footage. Every silence becomes implication.' },
    ];
  }

  return { title, slides, ctaLabel, type: 'twist_intro' as const };
}

export function buildMidGameCutscene(gs: GameState, beat: NarrativeBeat) {
  const arc = gs.twistNarrative?.arc || 'none';
  const player = getPlayer(gs);
  const name = player?.name || 'You';

  const slides: CutsceneSlide[] = [];

  if (arc === 'hosts_child') {
    if (beat.id === 'hc_rumor_swirl') {
      slides.push(
        {
          title: 'Air Currents',
          speaker: 'Narrator',
          text: 'Rumors circle without landing. Your name is lighter and heavier at the same time.',
        },
        {
          title: 'Containment',
          speaker: name,
          text: 'I heard it. They heard it. We move anyway. Tighten alliances; limit oxygen.',
          aside: 'Pick confessionals that steer the audience back to gameplay.',
        },
      );
    } else if (beat.id === 'hc_reveal') {
      slides.push(
        {
          title: 'Moment of Truth',
          text: 'Silence breaks. The connection leaves shadows and steps into light.',
        },
        {
          title: 'Frame It',
          speaker: name,
          text: 'It’s part of my life, not my strategy. Judge me by my moves.',
        },
      );
    } else {
      slides.push(
        {
          title: beat.title,
          text: 'A beat activates. It’s not the only story, but it shapes the next few scenes.',
        },
      );
    }
  } else if (arc === 'planted_houseguest') {
    if (beat.id === 'phg_risky_plant') {
      slides.push(
        {
          title: 'The Plant',
          speaker: 'Narrator',
          text: 'Risk is the premium paid for influence. You place a seed and pretend you forgot you did.',
        },
        {
          title: 'Execution',
          speaker: name,
          text: 'Casual tone. Specific detail. Someone repeats it. Now it lives.',
        },
      );
    } else if (beat.id === 'phg_close_call') {
      slides.push(
        {
          title: 'Close Call',
          text: 'Eyes linger too long. Your alibi needs a second draft.',
          aside: 'Consistency beats brilliance. Repeat the cover.',
        },
      );
    } else {
      slides.push({ title: beat.title, text: 'Mid-game beat active. Stay ahead of the narrative curve.' });
    }
  } else {
    slides.push({ title: beat.title, text: 'Mid-game scene.' });
  }

  return { title: 'Mid-Game Beat', slides, ctaLabel: 'Return to Game', type: 'mid_game' as const };
}

export function buildTwistResultCutscene(gs: GameState, result: 'success' | 'failure', ctx?: { taskId?: string }) {
  const arc = gs.twistNarrative?.arc || 'none';
  const player = getPlayer(gs);
  const name = player?.name || 'You';

  const slides: CutsceneSlide[] = [];
  let title = 'Result';

  if (arc === 'planted_houseguest') {
    title = result === 'success' ? 'Mission: Clear' : 'Mission: Compromised';
    if (result === 'success') {
      slides.push(
        {
          title: 'Clean Cut',
          text: 'The move reads natural. No one sees the stitch.',
        },
        {
          title: 'Leverage',
          speaker: name,
          text: 'Subtle wins compound. I cash small chips later for big ones.',
        },
      );
    } else {
      slides.push(
        {
          title: 'Noise',
          text: 'Someone hears a seam. Suspicion rises faster than truth.',
        },
        {
          title: 'Damage Control',
          speaker: name,
          text: 'Reframe without overexplaining. Repeat the cover. Change the subject.',
        },
      );
    }
  } else if (arc === 'hosts_child') {
    title = result === 'success' ? 'Trust Rebuilt' : 'Trust Fractured';
    slides.push(
      {
        title: 'Fallout',
        text: result === 'success'
          ? 'A steady week softens the edges of perception.'
          : 'A sharp moment makes the edit sharper.',
      },
      {
        title: 'Next Beat',
        speaker: name,
        text: result === 'success'
          ? 'Keep it simple; make it about votes and numbers.'
          : 'Own the moment; make the next one a counterweight.',
      },
    );
  } else {
    slides.push({ text: result === 'success' ? 'Positive momentum.' : 'A setback—recover on the next choice.' });
  }

  return { title, slides, ctaLabel: 'Return to Game', type: (result === 'success' ? 'twist_result_success' : 'twist_result_failure') as const };
}

export function buildFinaleCutscene(gs: GameState) {
  const arc = gs.twistNarrative?.arc || 'none';
  const player = getPlayer(gs);
  const name = player?.name || 'You';

  const slides: CutsceneSlide[] = [];

  if (arc === 'hosts_child') {
    slides.push(
      {
        title: 'Throughline',
        text: 'A rumor became a reveal became a resolved story.',
      },
      {
        title: 'Closing Statement',
        speaker: name,
        text: 'Judge the game I played, not the headline I carried.',
      },
    );
  } else if (arc === 'planted_houseguest') {
    slides.push(
      {
        title: 'Ledger',
        text: 'Some missions succeeded. Some exposed. The pattern tells the truth.',
      },
      {
        title: 'Closing Statement',
        speaker: name,
        text: 'I planted, I pivoted, and I kept the house alive. The question now is: did I keep my own game alive too?',
      },
    );
  } else {
    slides.push({ text: 'The season writes its epilogue. One story remains: the winner.' });
  }

  return { title: 'Arc Finale', slides, ctaLabel: 'Proceed', type: 'finale_twist' as const };
}
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
    const approval = Math.round(gs.editPerception?.audienceApproval || 0);
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
          aside: `Audience approval: ${approval}. Keep confessionals about votes, not gossip.`,
        },
      );
    } else if (beat.id === 'hc_reveal') {
      const revealed = !!(player?.special && player.special.kind === 'hosts_estranged_child' && player.special.revealed);
      slides.push(
        {
          title: 'Moment of Truth',
          text: revealed
            ? 'Silence breaks. The connection steps into light—and the game adjusts.'
            : 'The reveal beat activates. Whether you speak now or later will shape perception.',
        },
        {
          title: 'Frame It',
          speaker: name,
          text: revealed
            ? 'It’s part of my life, not my strategy. Judge me by my moves.'
            : 'If I reveal, I’ll own it—then get back to numbers.',
        },
      );
    } else if (beat.id === 'hc_consequence') {
      slides.push(
        {
          title: 'Fallout Management',
          text: 'Trust dips faster than it climbs. The next few conversations matter.',
          aside: 'Keep tone steady. Anchor the edit in gameplay.',
        }
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
    const spec = player?.special && player.special.kind === 'planted_houseguest' ? player.special : undefined;
    const pendingCount = spec ? (spec.tasks || []).filter(t => !t.completed).length : 0;
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
          aside: `Pending missions: ${pendingCount}`,
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
    } else if (beat.id === 'phg_exposure_test') {
      const exposed = !!(spec && spec.secretRevealed);
      slides.push(
        {
          title: 'Exposure Test',
          text: exposed
            ? 'The secret slipped. Damage control becomes leverage—or a target.'
            : 'Pressure rises around your cover. Keep storytelling tight.',
        },
        {
          title: 'Pivot',
          speaker: name,
          text: exposed
            ? 'I own it, reframe, and keep the house moving. Panic exposes you worse than truth.'
            : 'Repeat the line. Anchor motives. Move the conversation elsewhere.',
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
    const taskDesc = (() => {
      const spec = player?.special && player.special.kind === 'planted_houseguest' ? player.special : undefined;
      if (!spec || !ctx?.taskId) return undefined;
      const t = (spec.tasks || []).find(x => x.id === ctx.taskId);
      return t?.description;
    })();

    if (result === 'success') {
      slides.push(
        {
          title: 'Clean Cut',
          text: taskDesc ? `\"${taskDesc}\" reads natural. No one sees the stitch.` : 'The move reads natural. No one sees the stitch.',
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
          text: taskDesc ? `\"${taskDesc}\" leaves a seam. Suspicion rises faster than truth.` : 'Someone hears a seam. Suspicion rises faster than truth.',
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
    const revealDay = player?.special && player.special.kind === 'hosts_estranged_child' ? (player.special.revealDay || undefined) : undefined;
    slides.push(
      {
        title: 'Throughline',
        text: revealDay
          ? `A rumor became a reveal (Day ${revealDay}) became a resolved story.`
          : 'A rumor stayed rumor. The game stayed the story.',
      },
      {
        title: 'Closing Statement',
        speaker: name,
        text: 'Judge the game I played, not the headline I carried.',
      },
    );
  } else if (arc === 'planted_houseguest') {
    const tasks = player?.special && player.special.kind === 'planted_houseguest' ? (player.special.tasks || []) : [];
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const exposed = player?.special && player.special.kind === 'planted_houseguest' ? !!player.special.secretRevealed : false;
    slides.push(
      {
        title: 'Ledger',
        text: `${completed}/${total} missions completed.${exposed ? ' Secret exposed; damage control became part of the play.' : ' Cover held; subtlety did the heavy lifting.'}`,
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
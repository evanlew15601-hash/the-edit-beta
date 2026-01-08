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

  const base =
    bgName === 'Other'
      ? p.customBackgroundText || undefined
      : bgName;

  const summary = base
    ? `Before the show you were ${bgName === 'Other' ? base.toLowerCase() : `a ${base.toLowerCase()}`}. Some of that still leaks into every room you walk into.`
    : undefined;

  const line = base
    ? `${p.name} — ${base}${meta?.personaHint ? ` (${meta.personaHint.toLowerCase()})` : ''}.`
    : undefined;

  return { summary, line };
}

function getPlantedSpec(gs: GameState) {
  const p = getPlayer(gs);
  if (!p || !p.special || p.special.kind !== 'planted_houseguest') return undefined;
  return p.special;
}

function describeMission(gs: GameState, taskId?: string): string | undefined {
  const spec = getPlantedSpec(gs);
  if (!spec) return undefined;
  const tasks = spec.tasks || [];
  const task = taskId
    ? tasks.find(t => t.id === taskId)
    : tasks.find(t => !t.completed);
  return task?.description;
}

export function buildTwistIntroCutscene(gs: GameState) {
  const arc = gs.twistNarrative?.arc || 'none';
  const player = getPlayer(gs);
  const name = player?.name || 'You';
  const back = getBackstoryContext(gs);

  let title = 'Prologue';
  let slides: CutsceneSlide[] = [];
  let ctaLabel = 'Enter Week 1';

  if (arc === 'hosts_child') {
    title = 'Prologue: The Connection';
    slides = [
      {
        title: 'Studio Corridor',
        speaker: 'Narrator',
        text:
          'The hallway outside the stage smells like cold air and hot lights. At the end of it, a door you know from TV waits with your name on the call sheet.',
        aside: back.summary,
      },
      {
        title: 'Family Math',
        speaker: name,
        text:
          'On paper I am a houseguest. Off paper I am the person who shares a bloodline with Mars Vega. We do not talk about it. We barely talk at all.',
      },
      {
        title: 'Plan A',
        speaker: name,
        text:
          'Walk in normal. Play like everyone else. Build trust on votes and conversations, not on a last name nobody has heard yet.',
        aside: 'If the secret comes out, it has to come out in my words, not a rumor.',
      },
      {
        title: 'The Risk',
        speaker: 'Narrator',
        text:
          'Inside the house, people search for angles. One stray comment, one familiar look at the host, and your season becomes a storyline instead of a game.',
      },
    ];
  } else if (arc === 'planted_houseguest') {
    title = 'Prologue: The Assignment';
    const mission = describeMission(gs);
    slides = [
      {
        title: 'Briefing',
        speaker: 'Narrator',
        text:
          'A producer leans in just off camera: “You\'re here to play the game—and one more.” The second job is the one nobody else signed up for.',
        aside: back.summary,
      },
      {
        title: 'Cover Story',
        speaker: name,
        text:
          'Whatever my bio says on the lower third, that\'s my camouflage. I smile, nod, and learn the house like a map I might have to redraw on command.',
      },
      {
        title: 'Mission One',
        speaker: name,
        text: mission
          ? `First card reads: “${mission}”. Simple words, messy implications. I have to make it look like it was my idea all along.`
          : 'The tasks will come. Until they do, I practice sounding like someone with nothing to hide.',
      },
      {
        title: 'Ground Rules',
        speaker: 'Narrator',
        text:
          'Success is invisible. Failure becomes a twist episode. Somewhere between those, there’s a way to win the game and keep the contract.',
      },
    ];
  } else {
    title = 'Prologue: No Twist';
    slides = [
      {
        title: 'Orientation',
        speaker: 'Narrator',
        text:
          'A new game starts. The house is empty for exactly one second, and then it isn\'t. Every person who walks in rewrites the odds.',
        aside: back.summary,
      },
      {
        title: 'Who You Are',
        speaker: name,
        text:
          back.line ||
          'You take inventory of your own habits: who you talk to first, where you stand, how long you hold eye contact.',
      },
      {
        title: 'Quiet Promise',
        speaker: name,
        text:
          'Play the game in front of you, not the season you watched. One conversation, one vote, one week at a time.',
      },
    ];
  }

  return { title, slides, ctaLabel, type: 'twist_intro' as const };
}

// Mid-game beats map onto the dynamic narrative beats generated from gameplay.
// We keep them lightweight but scene-based so they feel like glimpses, not lectures.
export function buildMidGameCutscene(gs: GameState, beat: NarrativeBeat) {
  const arc = gs.twistNarrative?.arc || 'none';
  const player = getPlayer(gs);
  const name = player?.name || 'You';
  const back = getBackstoryContext(gs);

  const slides: CutsceneSlide[] = [];
  let title = 'Mid-Game Beat';
  const ctaLabel = 'Return to Game';

  if (arc === 'hosts_child') {
    switch (beat.id) {
      case 'hc_first_week':
        slides.push(
          {
            title: 'Eyes on You',
            speaker: 'Narrator',
            text:
              'There is always one person who watches a little too long. They don’t know the secret, but they can feel that something about you does not quite match your story.',
          },
          {
            title: 'Adjustment',
            speaker: name,
            text:
              'I keep every conversation shallow by one layer. Stories about home are shorter, jokes about the host are careful. I let other people talk until they forget to study me.',
            aside: 'For now, the safest move is to be useful and unremarkable at the same time.',
          },
        );
        break;

      case 'hc_build_trust':
        slides.push(
          {
            title: 'Safe Corner',
            speaker: 'Narrator',
            text:
              'Late at night, the noise thins out. One person keeps drifting back to you, asking how you really see the game.',
          },
          {
            title: 'Anchor',
            speaker: name,
            text:
              'If I have one person who would defend me in a room I am not in, the secret is half as dangerous. I give them honesty about strategy, if not about bloodlines.',
            aside: 'Trust built on game talk is harder to weaponize later.',
          },
        );
        break;

      case 'hc_voting_block':
        slides.push(
          {
            title: 'Numbers, Not Headlines',
            speaker: 'Narrator',
            text:
              'Names bounce around the house like loose change. Somewhere under the noise is the simple math of who stays and who leaves.',
          },
          {
            title: 'Quiet Coalition',
            speaker: name,
            text:
              'I don’t need everyone. I just need enough. Three solid votes become four. I listen more than I pitch and let them feel like it was their idea to keep me.',
          },
        );
        break;

      case 'hc_reveal_timing':
        slides.push(
          {
            title: 'The Question',
            speaker: 'Narrator',
            text:
              'The longer the secret lives in the house, the louder the reveal will sound. You can feel the moment approaching, even if nobody has said it out loud.',
          },
          {
            title: 'If, When, How',
            speaker: name,
            text:
              'Do I tell them before they guess? Do I wait for a calm week or use a storm to hide inside of? Whatever I choose, I only get to do it once.',
            aside: 'You rehearse one clean version in your head, just in case.',
          },
        );
        break;

      case 'hc_immediate_fallout':
        slides.push(
          {
            title: 'After the Reveal',
            speaker: 'Narrator',
            text:
              'The room went quiet, then loud, then strangely polite. People replay old conversations in their heads, editing your words with new information.',
          },
          {
            title: 'Holding Still',
            speaker: name,
            text:
              'I let them talk first. I answer what they ask and nothing they don’t. It has to feel like I trusted them with this, not like they got caught in someone else’s story.',
          },
        );
        break;

      case 'hc_rebuild_trust':
        slides.push(
          {
            title: 'Check-Ins',
            speaker: 'Narrator',
            text:
              'A few days later, the house has not decided if your reveal was a vulnerability or a move.',
          },
          {
            title: 'Reps',
            speaker: name,
            text:
              'I keep every promise small and visible: vote where I said I would, show up when I said I would. Let consistency drown out the headline.',
          },
        );
        break;

      case 'hc_flip_narrative':
        slides.push(
          {
            title: 'Owning the Label',
            speaker: 'Narrator',
            text:
              'What was once gossip is now shorthand: “the host’s kid.” You can’t put it back in the box, but you can decide what it means.',
          },
          {
            title: 'Reframe',
            speaker: name,
            text:
              'If I lean into it, it has to be on my terms. I frame it as pressure, not privilege. If they see me working harder, maybe they stop waiting for unseen help.',
          },
        );
        break;

      case 'hc_jury_pitch':
        slides.push(
          {
            title: 'Future Audience',
            speaker: 'Narrator',
            text:
              'Somewhere down the line, the people sitting across from you now might be sitting on a jury bench instead.',
          },
          {
            title: 'Closing Argument (Early Draft)',
            speaker: name,
            text:
              'If I get to finale night, I want them to say I played despite the connection, not because of it. That means every week from now has to prove it.',
          },
        );
        break;

      default:
        slides.push(
          {
            title: beat.title,
            speaker: 'Narrator',
            text:
              beat.summary ||
              'Mid-arc moment: the secret sits just under the surface of every conversation.',
          },
          {
            title: 'Grounding',
            speaker: name,
            text:
              back.line ||
              'I keep returning to who I said I was on Day 1 so the house can predict me—until I need them to be wrong.',
          },
        );
    }
  } else if (arc === 'planted_houseguest') {
    switch (beat.id) {
      case 'phg_current_mission': {
        const mission = describeMission(gs);
        slides.push(
          {
            title: 'This Week\'s Card',
            speaker: 'Narrator',
            text:
              mission
                ? `Production\'s note is simple: “${mission}”. The execution won\'t be.`
                : 'The mission is vague on paper but sharp in your head: move pieces without anyone seeing your hand.',
          },
          {
            title: 'Threading the Needle',
            speaker: name,
            text:
              mission
                ? 'I fold the task into conversations I needed to have anyway. If it works, nobody will be able to point to the moment it started.'
                : 'Until I know the exact ask, I keep collecting information and favours. A twist is easier to pull when people already owe you something.',
          },
        );
        break;
      }

      case 'phg_avoid_detection':
        slides.push(
          {
            title: 'Too Many Questions',
            speaker: 'Narrator',
            text:
              'Someone in the house is staring at the gaps in your story instead of the story itself.',
          },
          {
            title: 'Cover Maintenance',
            speaker: name,
            text:
              'I repeat the same details, the same tone, the same jokes. If I am predictable, suspicion has nowhere new to go.',
            aside: 'Consistency is a better alibi than any speech.',
          },
        );
        break;

      case 'phg_balance_act':
        slides.push(
          {
            title: 'Two Games at Once',
            speaker: 'Narrator',
            text:
              'The mission wants you bold. The social game wants you careful. Sometimes they want opposite things in the very same conversation.',
          },
          {
            title: 'Tightrope',
            speaker: name,
            text:
              'If a task ever forces me to choose between the contract and the vote, I need to know which one I am actually here to win.',
          },
        );
        break;

      case 'phg_contract_decision':
        slides.push(
          {
            title: 'End of the Fine Print',
            speaker: 'Narrator',
            text:
              'The quiet part of your deal is almost over. One more week of missions, one big choice about what to do with the truth.',
          },
          {
            title: 'Reveal or Bury',
            speaker: name,
            text:
              'If I tell them, I get a story and a target on my back. If I don’t, I get to keep the secret and hope production never forces the issue.',
          },
        );
        break;

      case 'phg_exposed':
        slides.push(
          {
            title: 'Caught Out',
            speaker: 'Narrator',
            text:
              'The whispers finally lined up. Someone said the word “plant” and nobody laughed it off.',
          },
          {
            title: 'On Record',
            speaker: name,
            text:
              'I admit enough of it to sound honest and keep enough of it vague to stay dangerous. If they\'re going to call me a twist, I might as well be a useful one.',
          },
        );
        break;

      case 'phg_reframe':
        slides.push(
          {
            title: 'Spin Control',
            speaker: 'Narrator',
            text:
              'Your secret job becomes a headline for everyone else. You need a version that makes keeping you around sound smart, not sentimental.',
          },
          {
            title: 'New Pitch',
            speaker: name,
            text:
              'I sell it as proof that I can follow through under pressure. If I can execute someone else’s agenda this well, imagine what I can do for yours.',
          },
        );
        break;

      case 'phg_use_intel':
        slides.push(
          {
            title: 'Playing the Extra Information',
            speaker: 'Narrator',
            text:
              'Little production hints and offhand comments have piled up in the back of your mind. They\'re not spoilers, but they are leverage.',
          },
          {
            title: 'Soft Power',
            speaker: name,
            text:
              'I don\'t quote what I know. I just nudge people toward moves that line up with it. If they think the idea is theirs, the twist keeps paying.',
          },
        );
        break;

      default: {
        const mission = describeMission(gs);
        slides.push(
          {
            title: beat.title,
            speaker: 'Narrator',
            text:
              beat.summary ||
              'Mid-arc moment: you are still balancing the mission against the relationships that will decide your fate.',
          },
          {
            title: 'Check Your Cover',
            speaker: name,
            text:
              mission
                ? `Whatever else happens this week, I can\'t let “${mission}” be the thing that exposes me.`
                : back.line || 'I remind myself what version of me the house has seen so far, and I don\'t break character.',
          },
        );
        break;
      }
    }
  } else {
    slides.push(
      {
        title: beat.title,
        speaker: 'Narrator',
        text:
          beat.summary ||
          'Mid-game scene: the way you handle this moment will echo in the next vote more than you think.',
      },
      {
        title: 'Identity Thread',
        speaker: name,
        text:
          back.line ||
          'You keep one throughline in how you play so people can read your moves—and misread the next one.',
      },
    );
  }

  if (slides.length === 0) {
    slides.push(
      {
        title: beat.title,
        speaker: 'Narrator',
        text:
          beat.summary ||
          'The week tilts a little. You feel the twist underneath your conversations.',
      },
      {
        title: 'Quiet Resolve',
        speaker: name,
        text:
          back.line ||
          'You make a quiet promise to keep your story steady, even as the house gets louder.',
      },
    );
  }

  return { title, slides, ctaLabel, type: 'mid_game' as const };
}

export function buildTwistResultCutscene(
  gs: GameState,
  result: 'success' | 'failure',
  ctx?: { taskId?: string },
) {
  const arc = gs.twistNarrative?.arc || 'none';
  const player = getPlayer(gs);
  const name = player?.name || 'You';
  const back = getBackstoryContext(gs);

  const slides: CutsceneSlide[] = [];
  let title = 'Result';

  if (arc === 'planted_houseguest') {
    const mission = describeMission(gs, ctx?.taskId);
    title = result === 'success' ? 'Mission Cleared' : 'Mission Compromised';

    if (result === 'success') {
      slides.push(
        {
          title: 'Clean Thread',
          speaker: 'Narrator',
          text:
            'The conversation lands exactly where you wanted it. No one turns the moment over in their hands looking for seams.',
        },
        {
          title: 'Quiet Win',
          speaker: name,
          text:
            mission
              ? `“${mission}” is done, and nobody will ever know it was real. That\'s the perfect twist: effective and forgettable.`
              : 'Another invisible success. The more of those I stack, the easier it is to pretend I\'m just playing straight.',
        },
        {
          title: 'Cover Check',
          speaker: 'Narrator',
          text:
            back.line ||
            'From the outside, you still look like the person you said you were on Day 1.',
        },
      );
    } else {
      slides.push(
        {
          title: 'Static',
          speaker: 'Narrator',
          text:
            'The room does not quite buy your explanation. A look lasts one beat too long. Someone files the moment away for later.',
        },
        {
          title: 'Patch Job',
          speaker: name,
          text:
            'I can\'t panic. I repeat my cover, give them a simpler story to focus on, and make sure my next visible move is boring and reliable.',
        },
        {
          title: 'Cost',
          speaker: 'Narrator',
          text:
            'Trust dips in the short term. The twist storyline sharpens around you. It\'s not fatal, but it is louder than you wanted.',
        },
      );
    }
  } else if (arc === 'hosts_child') {
    title = result === 'success' ? 'Trust Rebuilt' : 'Trust Fractured';
    slides.push(
      {
        title: 'How It Played',
        speaker: 'Narrator',
        text:
          result === 'success'
            ? 'A steady week softens the sharp edges of the reveal. People start talking about your decisions again instead of your last name.'
            : 'A messy argument or a shaky vote pulls the old suspicion back into focus. The connection to Mars Vega becomes the easy explanation.',
      },
      {
        title: 'Next Beat',
        speaker: name,
        text:
          result === 'success'
            ? 'Keep everything simple and visible. Say what I\'m doing before I do it and then actually do it.'
            : 'I own the mistake, then give them something better to talk about. A clean move, a clear vote, anything that isn\'t family drama.',
      },
      {
        title: 'Grounding',
        speaker: 'Narrator',
        text:
          back.line ||
          'You re-anchor to the version of yourself you want remembered when the season is over.',
      },
    );
  } else {
    slides.push(
      {
        title: result === 'success' ? 'Small Momentum' : 'A Bump in the Path',
        speaker: 'Narrator',
        text:
          result === 'success'
            ? 'It wasn\'t a headline moment, but it nudged the week in your favour.'
            : 'It stung, but the game rarely ends on one bad beat.',
      },
      {
        title: 'What You Take From It',
        speaker: name,
        text:
          back.line ||
          'I decide what this means before anyone else does. Lesson learned, then back to work.',
      },
    );
  }

  return {
    title,
    slides,
    ctaLabel: 'Return to Game',
    type: result === 'success' ? ('twist_result_success' as const) : ('twist_result_failure' as const),
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
        title: 'From Secret to Storyline',
        speaker: 'Narrator',
        text:
          'What started as a line on a confidential document turned into late-night whispers, a reveal, and a season-long negotiation with perception.',
      },
      {
        title: 'Who You Were Here',
        speaker: name,
        text:
          'I didn\'t get to choose the twist, but I did get to choose what to do with it. Judge me by the alliances I built and the votes I survived, not by the name on my birth certificate.',
      },
      {
        title: 'Final Frame',
        speaker: 'Narrator',
        text:
          back.line ||
          'In the edit, your backstory becomes context. At the jury table, your moves are the only evidence that matters.',
      },
    );
  } else if (arc === 'planted_houseguest') {
    slides.push(
      {
        title: 'The Ledger',
        speaker: 'Narrator',
        text:
          'Some missions landed clean. Some almost blew everything up. Together they drew a map of how far you were willing to go for influence.',
      },
      {
        title: 'Owning It',
        speaker: name,
        text:
          'I was a plant, a player, and sometimes both at once. If I did it well, the people who lived it with me will say I made their season better, not worse.',
      },
      {
        title: 'After the Contract',
        speaker: 'Narrator',
        text:
          back.line ||
          'When the credits roll and the contract ends, what\'s left is whether people remember you as a twist or as a contender.',
      },
    );
  } else {
    slides.push(
      {
        title: 'Season\'s End',
        speaker: 'Narrator',
        text:
          'The house is smaller, quieter, and full of echoes. All the small choices that felt forgettable now sit in a straight line leading to this moment.',
      },
      {
        title: 'What Stuck',
        speaker: name,
        text:
          back.line ||
          'Whatever people say about my game when they leave this place, I want it to sound like they watched the same person from premiere to finale.',
      },
    );
  }

  return { title: 'Arc Finale', slides, ctaLabel: 'Proceed', type: 'finale_twist' as const };
}
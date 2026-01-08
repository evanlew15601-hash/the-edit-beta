import { GameState, CutsceneSlide, NarrativeBeat } from '@/types/game';

function getPlayer(gs: GameState) {
  return gs.contestants.find((c) => c.name === gs.playerName);
}

function getBackstoryContext(gs: GameState): { summary?: string; line?: string } {
  const p = getPlayer(gs);
  if (!p) return {};
  const bgName = p.background;

  const base =
    bgName === 'Other'
      ? (p.customBackgroundText && p.customBackgroundText.trim()) || undefined
      : bgName;

  const summary = base
    ? `Before the show, you worked as ${base.toLowerCase()}.`
    : undefined;

  const line = base ? `${p.name}, ${base}.` : undefined;

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
  const task = taskId ? tasks.find((t) => t.id === taskId) : tasks.find((t) => !t.completed);
  return task?.description;
}

export function buildTwistIntroCutscene(gs: GameState) {
  const arc = gs.twistNarrative?.arc || 'none';
  const player = getPlayer(gs);
  const name = player?.name || 'You';
  const back = getBackstoryContext(gs);

  let title = 'Prologue';
  let slides: CutsceneSlide[] = [];
  const ctaLabel = 'Enter Week 1';

  if (arc === 'hosts_child') {
    title = 'Prologue: The Connection';
    slides = [
      {
        title: 'Legal Line',
        speaker: 'Narrator',
        text:
          'Weeks before move-in, someone in a quiet office added one sentence to a contract: you are related to Mars Vega.',
        aside: back.summary,
      },
      {
        title: 'Control Room',
        speaker: 'Producer',
        text:
          "“We keep it quiet until we do not,” a producer says to Mars over a stack of rundown cards. “If the season drags, we open that box on air.”",
      },
      {
        title: 'Walk-On Instructions',
        speaker: 'Stage Manager',
        text:
          "At the edge of the stage, a hand adjusts your mic. “On live shows, look at Mars like any other host. No hugs. No jokes about home. We will tell you if that changes.”",
      },
      {
        title: 'Plan A',
        speaker: name,
        text:
          "Go in like I am just another contestant. Make friends, make votes, pretend the cameras do not know my last name.",
      },
    ];
  } else if (arc === 'planted_houseguest') {
    title = 'Prologue: The Assignment';
    slides = [
      {
        title: 'Off-Camera Offer',
        speaker: 'Producer',
        text:
          "“You are not just a player,” they say in a windowless office. “You are staff on The Edit. Every week, you get a mission the others do not see.”",
        aside: back.summary,
      },
      {
        title: 'Audience Tease',
        speaker: 'Mars Vega (Host)',
        text:
          '“This season, someone inside that house will be taking secret orders from us,” Mars tells the cameras. “At home, you will see every mission. The house will see none of it.”',
      },
      {
        title: 'First Card',
        speaker: 'Narrator',
        text:
          'They slide you a sealed envelope with a glossy logo. Inside: this week’s instructions, written for viewers to read along as a graphic under your face.',
      },
      {
        title: 'Cover Story',
        speaker: name,
        text:
          "On the call sheet I am just another houseguest. On the network schedule I am a recurring twist. My job is to make the missions look like my own bad ideas.",
      },
    ];
  } else {
    title = 'Prologue: No Twist';
    slides = [
      {
        title: 'Orientation',
        speaker: 'Narrator',
        text:
          'The house is dressed, the lights are set, and the season is ready. For once, there is no secret twist with your name on it.',
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
          'Play the week in front of you. Whatever the network has planned, your job is simple: stay off the block and out of the worst conversations.',
      },
    ];
  }

  return { title, slides, ctaLabel, type: 'twist_intro' as const };
}

// Mid-game beats are treated as fixed episodes.
// Gameplay timing decides when they trigger, but the scenes themselves are scripted.
export function buildMidGameCutscene(gs: GameState, beat: NarrativeBeat) {
  const arc = gs.twistNarrative?.arc || 'none';
  const player = getPlayer(gs);
  const name = player?.name || 'You';
  const back = getBackstoryContext(gs);

  const slides: CutsceneSlide[] = [];
  const title = 'Mid-Game Beat';
  const ctaLabel = 'Return to Game';

  if (arc === 'hosts_child') {
    switch (beat.id) {
      case 'hc_first_week':
        slides.push(
          {
            title: 'Casting Playback',
            speaker: 'Narrator',
            text:
              'In a dark control room, producers scrub through early footage of the house. Your face keeps popping up on their monitors, circled on a printout that reads “family tie.”',
          },
          {
            title: 'Quiet Notes',
            speaker: 'Producer',
            text:
              "“Keep them safe for now,” someone says. “We cannot burn the host’s kid on week one. Tease it in confessionals, not in votes.”",
          },
          {
            title: 'Inside the House',
            speaker: name,
            text:
              "All I feel is normal first-week nerves. I do not hear the part where people in another building are already protecting my screen time.",
          },
        );
        break;

      case 'hc_build_trust':
        slides.push(
          {
            title: 'Leading Questions',
            speaker: 'Narrator',
            text:
              'In the confessional, the lights are a little brighter than usual. A producer off camera keeps circling back to your family.',
          },
          {
            title: 'Confessional Prompt',
            speaker: 'Producer',
            text:
              '“What would Mars say if they saw you aligned with this person?” they ask. “Would they be proud? Would they be worried?”',
          },
          {
            title: 'Answer on Tape',
            speaker: name,
            text:
              'I try to talk about strategy instead of childhood. They nod, but I can tell they are really listening for the name, not the plan.',
          },
        );
        break;

      case 'hc_voting_block':
        slides.push(
          {
            title: 'Segment Meeting',
            speaker: 'Narrator',
            text:
              'Around a table covered in paper coffee cups, someone reads out the current boot order. Your name is on the maybe list.',
          },
          {
            title: 'Programming Note',
            speaker: 'Producer',
            text:
              '“We cannot lose them before we use them,” a producer says. “If the vote gets close, push more confessionals from another target. We need this reveal later in the season.”',
          },
          {
            title: 'Unseen Help',
            speaker: name,
            text:
              'Inside the house, I just feel like the tide turned at the last minute. I do not know an entire building quietly nudged it away from me.',
          },
        );
        break;

      case 'hc_reveal_timing':
        slides.push(
          {
            title: 'Whiteboard',
            speaker: 'Narrator',
            text:
              'On a wall in the control room, weeks are written in marker. Under this one, someone has circled your name and written “soft reveal?”.',
          },
          {
            title: 'The Pitch',
            speaker: 'Producer',
            text:
              '“We build a segment,” they tell Mars. “You ask a question you would only ask your own kid. We cut to confessional. If it plays, we lean in. If not, we save the hard reveal for later.”',
          },
          {
            title: 'Rehearsal',
            speaker: name,
            text:
              'In my head I practice both versions: the one where I say nothing, and the one where I admit everything into a camera lens before I say it to the house.',
          },
        );
        break;

      case 'hc_immediate_fallout':
        slides.push(
          {
            title: 'Live Segment',
            speaker: 'Narrator',
            text:
              'On eviction night, the studio audience quiets on command. Mars looks at you a half-second too long before reading the teleprompter.',
          },
          {
            title: 'On-Air Reveal',
            speaker: 'Mars Vega (Host)',
            text:
              '“There is something the other houseguests do not know about you,” Mars says for millions of viewers and a dozen stunned players. “We have family in the house.”',
          },
          {
            title: 'Silence',
            speaker: name,
            text:
              'I hear the crowd before I hear my own heartbeat. Inside the house, people stare at me like I have changed shape. In the control room, someone nods at the ratings monitor.',
          },
        );
        break;

      case 'hc_rebuild_trust':
        slides.push(
          {
            title: 'Damage Report',
            speaker: 'Narrator',
            text:
              'Back in the control room, they watch the fallout like game tape. Who sits closer, who pulls away, who avoids looking at you at all.',
          },
          {
            title: 'Producer Note',
            speaker: 'Producer',
            text:
              '“Let them talk it out,” one says. “Then feed them prompts about fairness and second chances. We want this to feel messy, not rigged.”',
          },
          {
            title: 'In the House',
            speaker: name,
            text:
              'I spend the week repeating the same sentence: judge me by my votes, not my family. I do not know how much of that will actually make air.',
          },
        );
        break;

      case 'hc_flip_narrative':
        slides.push(
          {
            title: 'Edit Bay',
            speaker: 'Narrator',
            text:
              'In a small dark room, someone drags clips of you across a timeline. Moments of nerves get cut against shots of Mars looking proud, then worried, then proud again.',
          },
          {
            title: 'New Storyline',
            speaker: 'Producer',
            text:
              '“We sell it as pressure, not privilege,” they decide. “The kid who had to work twice as hard to prove they were not handed anything.”',
          },
          {
            title: 'What You Control',
            speaker: name,
            text:
              'All I can actually control are the people I vote with and the people I look in the eye. Whatever they turn that into later is not really up to me.',
          },
        );
        break;

      case 'hc_jury_pitch':
        slides.push(
          {
            title: 'Final Package',
            speaker: 'Narrator',
            text:
              'As the season narrows, an editor assembles a montage: your first confessional, the reveal, every time someone said your last name like an accusation.',
          },
          {
            title: 'Producer Directive',
            speaker: 'Producer',
            text:
              '“In their final plea, ask about Mars,” they tell the host. “The audience has watched that thread all season. We need to hear how they see it now.”',
          },
          {
            title: 'Preparing Your Words',
            speaker: name,
            text:
              'If I make it to that last chair, I will have to explain the game I played and the parent I played it in front of. One answer for the jury, another for the cameras.',
          },
        );
        break;

      default:
        slides.push(
          {
            title: beat.title,
            speaker: 'Narrator',
            text:
              'Mid-arc moment: in another building, people decide how much of your real life belongs on television.',
          },
          {
            title: 'Grounding',
            speaker: name,
            text:
              back.line ||
              'I keep returning to who I said I was on Day 1 so the people in this house can decide for themselves, no matter what the network does.',
          },
        );
    }
  } else if (arc === 'planted_houseguest') {
    switch (beat.id) {
      case 'phg_current_mission':
        slides.push(
          {
            title: "Tonight's Gimmick",
            speaker: 'Narrator',
            text:
              'In a rundown meeting, a line on the board reads: “Secret mission: plant.” Next to it, your face is printed twice—once for the control room, once for the graphics team.',
          },
          {
            title: 'Viewer Card',
            speaker: 'Mars Vega (Host)',
            text:
              '“At home, you will see the mission on your screen,” Mars tells the audience. “Inside the house, they will have no idea one of their own is working for us.”',
          },
          {
            title: 'Envelope in Hand',
            speaker: name,
            text:
              'They give me the card and tell me to smile. Whatever the words say this week, millions of people will read them before I take my first step toward the target.',
          },
        );
        break;

      case 'phg_avoid_detection':
        slides.push(
          {
            title: 'Suspicion is Content',
            speaker: 'Narrator',
            text:
              'In the control room, someone rewinds a clip of another player squinting at you. “They are onto them,” a voice says, not worried—excited.',
          },
          {
            title: 'House Angle',
            speaker: name,
            text:
              'Around the kitchen table, they joke about production plants like it is a myth. I laugh along and check my face for tells in the reflection of the oven door.',
          },
          {
            title: 'Quiet Decision',
            speaker: 'Producer',
            text:
              '“Do not save them if they get caught,” a producer decides. “If the house sniffs it out, that is our episode.”',
          },
        );
        break;

      case 'phg_balance_act':
        slides.push(
          {
            title: 'Two Scoreboards',
            speaker: 'Narrator',
            text:
              'On one monitor, the game board shows votes, alliances, risk. On another, a smaller graphic tracks your missions: green checkmarks, red Xs.',
          },
          {
            title: 'Confessional Pressure',
            speaker: 'Producer',
            text:
              '“The mission only works if you lean into it,” they remind you. “If you sand off the edges to protect your game, there is nothing to air.”',
          },
          {
            title: 'Choosing the Hurt',
            speaker: name,
            text:
              'Every time I push a little too hard on someone, I have to ask which thing I am damaging: my chances of winning, or their night of television.',
          },
        );
        break;

      case 'phg_contract_decision':
        slides.push(
          {
            title: 'End of the Deal',
            speaker: 'Narrator',
            text:
              'In a cramped office away from the set, your original contract sits on the table. Someone has highlighted the clauses about “additional on-air obligations.”',
          },
          {
            title: 'One More Stunt',
            speaker: 'Producer',
            text:
              '“We can end the missions quietly,” they say, tapping the paper, “or we can pay you more to go out in a blaze. Live reveal, clip package, the whole thing.”',
          },
          {
            title: 'Your Line',
            speaker: name,
            text:
              'I am still just a contestant trying to not get voted out. But here, away from the house, I am also someone being asked how much of my own game I am willing to sell for a segment.',
          },
        );
        break;

      case 'phg_exposed':
        slides.push(
          {
            title: 'Live Confession',
            speaker: 'Narrator',
            text:
              'On a live show, the big screen fills with a montage: your missions, your near-misses, graphics that shout “SECRET PLANT” over slow-motion reactions.',
          },
          {
            title: 'On Stage',
            speaker: 'Mars Vega (Host)',
            text:
              '“All season long, one of you has been working for us,” Mars tells the house. “Every mission you saw at home, they lived in secret.”',
          },
          {
            title: 'In the Spotlight',
            speaker: name,
            text:
              'I stand there while the others count back through moments that did not make sense at the time. Whatever I say now, the edit has already decided what I was.',
          },
        );
        break;

      case 'phg_reframe':
        slides.push(
          {
            title: 'Post-Game Spin',
            speaker: 'Narrator',
            text:
              'In a network hallway, someone practices the phrase “superfan plant” until it sounds less harsh. The press release will say the twist was about love of The Edit.',
          },
          {
            title: 'Exit Interview',
            speaker: name,
            text:
              'Every interviewer asks the same thing: did you feel used? I give them the answer that gets me booked again: I talk about how “fun” it was to be part of The Edit.',
          },
          {
            title: "What You Do Not Say",
            speaker: 'Narrator',
            text:
              'Off camera, your throat is hoarse from repeating the same safe story. The parts about pressure and guilt stay between you and the empty hotel room.',
          },
        );
        break;

      case 'phg_use_intel':
        slides.push(
          {
            title: 'Earpiece',
            speaker: 'Narrator',
            text:
              'During a late-season segment, a producer feeds you gentle nudges through a hidden speaker: who might flip, what might play well if you say it out loud.',
          },
          {
            title: 'Soft Cheating',
            speaker: 'Producer',
            text:
              '“We are not telling you what to do,” they insist between takes. “We are just giving you information the audience already has.”',
          },
          {
            title: 'Carrying It Back',
            speaker: name,
            text:
              'I walk back into the house with knowledge I did not earn, trying to use it without looking like I can see the cameras more clearly than everyone else.',
          },
        );
        break;

      default:
        slides.push(
          {
            title: beat.title,
            speaker: 'Narrator',
            text:
              'Mid-arc moment: you are still taking orders from a room nobody else can see.',
          },
          {
            title: 'Check Your Cover',
            speaker: name,
            text:
              back.line || 'I remind myself what version of me the house has seen so far, and I do not break character.',
          },
        );
    }
  } else {
    slides.push(
      {
        title: beat.title,
        speaker: 'Narrator',
        text:
          'Mid-season scene: the way you handle this moment will echo in the next vote more than you think.',
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
    title = result === 'success' ? 'Mission Cleared' : 'Mission Compromised';

    if (result === 'success') {
      slides.push(
        {
          title: 'Control Room Reaction',
          speaker: 'Narrator',
          text:
            'In the booth, someone marks your mission as a green check. A producer smiles without looking away from the ratings graph.',
        },
        {
          title: 'Segment Wrap',
          speaker: 'Producer',
          text:
            '“Perfect,” they say into their headset. “We got the laugh, we got the gasp, and the house is none the wiser. Flag it for the recap.”',
        },
        {
          title: 'Your Take',
          speaker: name,
          text:
            'On my side of the cameras, it just feels like a risk that happened to land. The envelope goes back in a drawer. The people I pushed have no idea why.',
        },
      );
    } else {
      slides.push(
        {
          title: 'Red X',
          speaker: 'Narrator',
          text:
            'On the mission tracker, your line turns red. The control room winces; a missed stunt is dead airtime.',
        },
        {
          title: 'Blame to Share',
          speaker: 'Producer',
          text:
            '“We cut around it,” someone says. “Blame the house vibe, blame the timing. Nobody at home needs to know how hard we tried to force this one.”',
        },
        {
          title: 'Carrying the Cost',
          speaker: name,
          text:
            'Out here, failure does not feel abstract. It looks like strained eye contact and a week where my moves made less sense to everyone but the viewers who saw the card.',
        },
      );
    }
  } else if (arc === 'hosts_child') {
    title = result === 'success' ? 'Trust Rebuilt' : 'Trust Fractured';
    slides.push(
      {
        title: 'Package Review',
        speaker: 'Narrator',
        text:
          result === 'success'
            ? 'In the edit bay, someone strings together clips where houseguests defend you unprompted. The story tilts toward “earned respect.”'
            : 'The editors lean on the tense moments: side-eyes after votes, quiet whispers about favoritism. The story tilts back toward “rigged.”',
      },
      {
        title: 'Network Note',
        speaker: 'Producer',
        text:
          result === 'success'
            ? '“We show that they stood on their own two feet,” a note reads. “Family connection as pressure, not shield.”'
            : '“Lean into the discomfort,” another note says. “This is what people will argue about on the drive home.”',
      },
      {
        title: 'Inside Your Head',
        speaker: name,
        text:
          back.line ||
          'I can only measure the week in conversations and votes. Somewhere else, people I have never met are deciding whether to call it a comeback or a mistake.',
      },
    );
  } else {
    slides.push(
      {
        title: result === 'success' ? 'Small Momentum' : 'A Bump in the Path',
        speaker: 'Narrator',
        text:
          result === 'success'
            ? 'It was not a headline moment, but it nudged the week in your favour.'
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
        title: 'Two Audiences',
        speaker: 'Narrator',
        text:
          'On finale night, the live crowd cheers for a season they watched. Somewhere in the dark, Mars watches a child they barely got to speak to on camera.',
      },
      {
        title: 'Backstage',
        speaker: 'Producer',
        text:
          '“We got what we needed,” someone says, nodding at a monitor playing your family montage on loop. “Heart, conflict, a little mess. It will test well.”',
      },
      {
        title: 'Who You Were Here',
        speaker: name,
        text:
          back.line ||
          'I played with the people in this house, not the person on that stage. When they talk about this season later, I want them arguing about my moves, not my bloodline.',
      },
    );
  } else if (arc === 'planted_houseguest') {
    slides.push(
      {
        title: 'Twist Recap',
        speaker: 'Narrator',
        text:
          'The finale package turns your missions into a highlight reel: slow-motion glances, bold text, a narrator acting like every envelope changed the course of the game.',
      },
      {
        title: 'Green Room Debrief',
        speaker: 'Producer',
        text:
          '“The plant landed,” they tell a network executive. “We can sell the format again next year.” On the screen behind them, your face freezes on a smile that looks more tired than triumphant.',
      },
      {
        title: 'After the Contract',
        speaker: name,
        text:
          back.line ||
          'When the lights cool and the mic comes off, all that is left is the question I have to live with: did I come here to win, or to give them a better show?',
      },
    );
  } else {
    slides.push(
      {
        title: "Season's End",
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
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
      // Scripted beats for Host's Child arc (deterministic across playthroughs)
      switch (beat.id) {
        case 'hc_premiere_seeds':
          slides.push(
            {
              title: 'Premiere Seeds',
              speaker: 'Narrator',
              text: 'Introductions skate across the surface. Yours leaves a wake. Someone will notice the current before they notice the cause.',
            },
            {
              title: 'Opening Move',
              speaker: name,
              text: 'I set tempo: calm, useful, unemotional. If anyone clocks a story, they’ll have to dig through the gameplay to reach it.',
              aside: 'Anchor to votes and numbers on Days 1–3.',
            },
          );
          break;
        case 'hc_mars_private_meet':
          slides.push(
            {
              title: 'Behind the Scenes',
              speaker: 'Narrator',
              text: 'A quiet hall, a closed door. Mars Vega doesn’t need cameras to read the room.',
            },
            {
              title: 'Private: Mars Vega',
              speaker: name,
              text: 'We keep it professional. I set boundaries: my story isn’t a prop; my game is the show.',
              aside: 'This meeting is off-camera. Choose the tone and move on.',
              choices: [
                { id: 'hc_private_keep_game', text: 'Keep it strictly game. “No favors.”', televised: false },
                { id: 'hc_private_seek_grace', text: 'Ask for off-camera grace to control timing.', televised: false },
              ],
              televised: false,
            },
          );
          break;
        case 'hc_consequence':
          slides.push(
            {
              title: 'Consequences',
              text: 'Reveals don’t end scenes; they start negotiations. Trust resets to pending. Your allies test the new math.',
            },
            {
              title: 'Terms',
              speaker: name,
              text: 'No theatrics. I’ll make a clean week: direct talks, measurable follow-through. People remember consistency.',
            },
          );
          break;
        case 'hc_mars_televised_checkin':
          slides.push(
            {
              title: 'Broadcast',
              speaker: 'Narrator',
              text: 'The red light blinks on. A check-in with Mars Vega turns a story into a segment.',
            },
            {
              title: 'On-Camera: Mars Vega',
              speaker: name,
              text: 'I set the frame myself before anyone else does.',
              aside: 'Televised choice — a light edit impact applies.',
              choices: [
                { id: 'hc_tv_own', text: 'Own it cleanly. Set terms and move forward.', televised: true, editDelta: 4 },
                { id: 'hc_tv_deflect', text: 'Deflect to strategy. Minimize the headline.', televised: true, editDelta: -2 },
              ],
              televised: true,
            },
          );
          break;
        case 'hc_redemption_attempt':
          slides.push(
            {
              title: 'Redemption Attempt',
              speaker: 'Narrator',
              text: 'A steady run of days can rewrite a headline. The audience loves competence more than confessions.',
            },
            {
              title: 'Plan',
              speaker: name,
              text: 'Stack small wins: help a target feel safe, call the numbers early, deliver the vote. Repeat until the room relaxes.',
            },
          );
          break;
        case 'hc_final_reckoning':
          slides.push(
            {
              title: 'Final Reckoning',
              text: 'The season remembers the throughline you deliver now. You decide if the story lands on spectacle or substance.',
            },
            {
              title: 'Closing Frame',
              speaker: name,
              text: 'Judge the moves. The connection is biography; the gameplay is the argument.',
            },
          );
          break;
        default:
          // Fallback should rarely hit because all host-child beats are scripted above
          slides.push(
            { title: beat.title, text: 'Mid-arc scene. You choose the frame before others do.' },
            { title: 'Grounding', speaker: name, text: back.line || 'I anchor back to who I am so the house can predict me—until it can’t.' },
          );
      }
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
      // Scripted beats for Planted Houseguest arc (deterministic across playthroughs)
      switch (beat.id) {
        case 'phg_mission_brief':
          slides.push(
            {
              title: 'Mission Brief',
              speaker: 'Narrator',
              text: 'The first assignment is the simplest: look ordinary while being specific. Specific reads as truth even when it’s performance.',
            },
            {
              title: 'Protocol',
              speaker: name,
              text: 'I’ll define a routine and keep it so consistent that any move fits inside it.',
              aside: 'Repeat your cover details out loud. Repetition is camouflage.',
            },
          );
          break;
        case 'phg_producer_brief':
          slides.push(
            {
              title: 'Behind the Scenes',
              speaker: 'Narrator',
              text: 'A producer checks your cover integrity. Notes are given in whispers, not scripts.',
            },
            {
              title: 'Producer Brief',
              speaker: name,
              text: 'Guardrails are fine; I need room to improvise without breaking character.',
              aside: 'Off-camera. Choose how tightly you want to play it.',
              choices: [
                { id: 'phg_guardrails_tight', text: 'Accept tighter guardrails. Fewer flashy moves.', televised: false },
                { id: 'phg_guardrails_loose', text: 'Ask for leeway to pivot mid-conversation.', televised: false },
              ],
              televised: false,
            },
          );
          break;
        case 'phg_cover_story':
          slides.push(
            {
              title: 'Cover Story Built',
              text: 'A believable story isn’t one sentence; it’s five habits. People trust habits.',
            },
            {
              title: 'Mantra',
              speaker: name,
              text: back.line
                ? `${back.line} That’s the spine. Every conversation bends to that shape.`
                : 'I’ll pick a simple identity and never deviate on camera.',
            },
          );
          break;
        case 'phg_risky_plant':
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
          break;
        case 'phg_close_call':
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
          break;
        case 'phg_mars_televised_checkin':
          slides.push(
            {
              title: 'Broadcast',
              speaker: 'Narrator',
              text: 'Mars Vega leads a quick check-in. The camera looks for a wink; the audience looks for a tell.',
            },
            {
              title: 'On-Camera: Mars Vega',
              speaker: name,
              text: 'I can be legible without being obvious.',
              aside: 'Televised choice — a light edit impact applies.',
              choices: [
                { id: 'phg_tv_wink', text: 'Give a playful line that keeps the cover intact.', televised: true, editDelta: 3 },
                { id: 'phg_tv_straight', text: 'Play it straight and low-key.', televised: true, editDelta: 1 },
              ],
              televised: true,
            },
          );
          break;
        case 'phg_double_down':
          slides.push(
            {
              title: 'Double-Down Mission',
              speaker: 'Narrator',
              text: 'Success invites greed. The assignment scales. Precision matters more than speed.',
            },
            {
              title: 'Execution',
              speaker: name,
              text: 'Two small pushes instead of one big shove. Let other people narrate my idea back to me.',
            },
          );
          break;
        case 'phg_exposure_test':
          slides.push(
            {
              title: 'Exposure Test',
              text: 'The room runs a silent audit. Your tells are in the edit. If they find one, you’ll need a reason they already believe.',
            },
            {
              title: 'Countermeasure',
              speaker: name,
              text: 'I’ll answer suspicion with something boring and repeatable. Suspicion hates boredom.',
            },
          );
          break;
        case 'phg_endgame_leverage':
          slides.push(
            {
              title: 'Endgame Leverage',
              text: 'Influence compounds. Quiet credits become loud debts. Spend carefully.',
            },
            {
              title: 'Ask',
              speaker: name,
              text: 'I’ll trade the smallest visible favor for the largest invisible vote.',
            },
          );
          break;
        default:
          // Fallback should rarely hit because all planted-HG beats are scripted above
          slides.push(
            { title: beat.title, text: 'Mid-arc scene. Keep the cover consistent while steering outcomes.' },
            { title: 'Grounding', speaker: name, text: back.line || 'If they recognize my rhythm, they won’t question my tempo.' },
          );
      }
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
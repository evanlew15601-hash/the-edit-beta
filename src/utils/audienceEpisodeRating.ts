import { GameState, VotingRecord, EpisodeRatingResult } from '@/types/game';
import { memoryEngine } from './memoryEngine';
import { buildEnhancedWeeklyEdit } from './enhancedMemoryRecap';

const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));

export function computeWeeklyEpisodeRating(gs: GameState): EpisodeRatingResult {
  const week = Math.max(1, Math.floor((gs.currentDay - 1) / 7) + 1);
  const startDay = (week - 1) * 7 + 1;
  const endDay = week * 7;

  const memorySystem = memoryEngine.getMemorySystem();
  const weeklyEvents = memorySystem.weeklyEvents[week] || [];
  const confessionals = gs.confessionals.filter(c => c.day >= startDay && c.day <= endDay);
  const votingThisWeek = gs.votingHistory.filter(v => v.day >= startDay && v.day <= endDay);
  const eliminationThisWeek: VotingRecord | undefined = votingThisWeek[votingThisWeek.length - 1];

  const weeklyEdit = buildEnhancedWeeklyEdit(gs);
  const viralMomentsCount = weeklyEdit.viralMoments?.length ?? 0;

  let dramaRaw = 0;
  let strategyRaw = 0;
  let heartRaw = 0;
  let chaosRaw = 0;

  let betrayals = 0;
  let highImpactSchemes = 0;
  let quietSchemes = 0;
  let intenseConversations = 0;
  let allianceForms = 0;
  let allianceMeetings = 0;
  let emotionalConfessionals = 0;
  let strategicConfessionals = 0;
  let vulnerableConfessionals = 0;
  let tieBreakUsed = false;
  let blindsides = 0;

  for (const e of weeklyEvents) {
    if (e.type === 'betrayal') {
      betrayals += 1;
      dramaRaw += 3;
      if (e.emotionalImpact >= 7) dramaRaw += 2;
    }

    if (e.type === 'scheme') {
      strategyRaw += 2;
      if (e.emotionalImpact >= 5) {
        highImpactSchemes += 1;
        dramaRaw += 2;
      } else {
        quietSchemes += 1;
        dramaRaw += 0.5;
      }
    }

    if (e.type === 'alliance_form') {
      allianceForms += 1;
      strategyRaw += 1.5;
    }

    // Check for alliance_meeting via content since type doesn't include it
    if ((e as any).type === 'alliance_meeting' || (e.content && e.content.includes('alliance meeting'))) {
      allianceMeetings += 1;
      strategyRaw += 1.2;
    }

    if (e.type === 'conversation') {
      if (e.emotionalImpact >= 4) {
        intenseConversations += 1;
        dramaRaw += 1;
        heartRaw += 1;
      } else if (e.emotionalImpact <= -5) {
        heartRaw -= 1;
      }
    }
  }

  for (const c of confessionals) {
    if (c.tone === 'vulnerable') {
      vulnerableConfessionals += 1;
      heartRaw += 2;
    } else if (c.tone === 'dramatic') {
      emotionalConfessionals += 1;
      heartRaw += 1;
    }
    if (c.tone === 'strategic') {
      strategicConfessionals += 1;
      strategyRaw += 1;
    }

    if (typeof c.audienceScore === 'number') {
      heartRaw += (c.audienceScore - 50) / 50;
    }
  }

  for (const v of votingThisWeek) {
    dramaRaw += 1;

    const voteTargets = Object.values(v.votes);
    const distinctTargets = new Set(voteTargets).size;

    if (v.tieBreak) {
      tieBreakUsed = true;
      dramaRaw += 1.5;
      // Check for random_draw via cast since type is narrower
      if ((v.tieBreak.method as string) === 'random_draw') {
        chaosRaw += 3;
      }
    }

    if (distinctTargets >= 3) {
      strategyRaw += 2;
    } else if (distinctTargets === 2) {
      const counts: Record<string, number> = {};
      for (const target of voteTargets) {
        counts[target] = (counts[target] || 0) + 1;
      }
      const sortedCounts = Object.values(counts).sort((a, b) => b - a);
      if (sortedCounts.length >= 2 && Math.abs(sortedCounts[0] - sortedCounts[1]) <= 2) {
        strategyRaw += 1.5;
      }
    }

    if (typeof v.reason === 'string' && v.reason.toLowerCase().includes('blindside')) {
      blindsides += 1;
      dramaRaw += 2;
    }
  }

  const twistsActivated = gs.twistsActivated || [];
  chaosRaw += twistsActivated.length * 1.5;

  const DRAMA_TARGET = 12;
  const STRATEGY_TARGET = 10;
  const HEART_TARGET = 8;
  const CHAOS_TARGET = 6;

  const dramaNorm = clamp(dramaRaw / DRAMA_TARGET, 0, 1);
  const strategyNorm = clamp(strategyRaw / STRATEGY_TARGET, 0, 1);
  const heartNorm = clamp(heartRaw / HEART_TARGET, 0, 1);
  const chaosNorm = clamp(chaosRaw / CHAOS_TARGET, 0, 1);

  const base = 5.5;
  const dramaComponent = 2.2 * dramaNorm;
  const strategyComponent = 1.7 * strategyNorm;
  const heartComponent = 1.0 * heartNorm;
  const chaosPenalty =
    chaosNorm <= 0.5 ? -0.5 * (0.5 - chaosNorm) : -1.5 * (chaosNorm - 0.5);

  const approval = gs.editPerception?.audienceApproval ?? 0;
  const approvalAdjustment = (approval / 100) * 0.7;

  const viralAdjustment = Math.min(viralMomentsCount, 4) * 0.15;

  const noise = 0;

  let total =
    base +
    dramaComponent +
    strategyComponent +
    heartComponent +
    chaosPenalty +
    approvalAdjustment +
    viralAdjustment +
    noise;

  total = clamp(total, 1.0, 9.8);

  const history = gs.ratingsHistory || [];
  const weeklyEntries = history.filter(
    h => typeof h.reason === 'string' && h.reason.toLowerCase().startsWith('weekly')
  );
  const prevWeekly = weeklyEntries[weeklyEntries.length - 1];
  const previousWeeklyRating = prevWeekly?.rating;
  const delta =
    typeof previousWeeklyRating === 'number'
      ? Math.round((total - previousWeeklyRating) * 100) / 100
      : undefined;

  const intensity =
    dramaNorm >= 0.7 ? 'high_drama' :
    dramaNorm <= 0.3 ? 'quiet' :
    'balanced';

  const strategicDepth =
    strategyNorm >= 0.7 ? 'high' :
    strategyNorm <= 0.3 ? 'low' :
    'medium';

  const emotionalTone =
    heartNorm >= 0.6 ? 'warm' :
    heartNorm <= 0.3 ? 'cold' :
    'mixed';

  let chaosType: 'stable' | 'spicy' | 'unfair';
  if (chaosNorm <= 0.3) chaosType = 'stable';
  else if (chaosNorm <= 0.7) chaosType = 'spicy';
  else chaosType = 'unfair';

  let audienceMood: 'loved' | 'mixed' | 'hated';
  if (total >= 7.5 && approval >= 0) audienceMood = 'loved';
  else if (total <= 4.5 && approval <= -20) audienceMood = 'hated';
  else audienceMood = 'mixed';

  let weekSummaryTag:
    | 'under_the_radar'
    | 'messy_but_entertaining'
    | 'strategic_masterclass'
    | 'emotional_episode'
    | 'twist_fallout'
    | 'slow_burn';

  if (intensity === 'high_drama' && chaosType === 'spicy') {
    weekSummaryTag = 'messy_but_entertaining';
  } else if (strategicDepth === 'high' && dramaNorm >= 0.5) {
    weekSummaryTag = 'strategic_masterclass';
  } else if (emotionalTone === 'warm' && dramaNorm <= 0.5) {
    weekSummaryTag = 'emotional_episode';
  } else if (chaosType === 'unfair' || twistsActivated.length > 0) {
    weekSummaryTag = 'twist_fallout';
  } else if (intensity === 'quiet' && strategicDepth === 'low') {
    weekSummaryTag = 'under_the_radar';
  } else {
    weekSummaryTag = 'slow_burn';
  }

  const bits: string[] = [];

  if (intensity === 'high_drama') bits.push('High-drama week');
  else if (intensity === 'quiet') bits.push('Quiet, under-the-radar week');
  else bits.push('Balanced episode');

  if (strategicDepth === 'high') bits.push('with strong strategic play');
  else if (strategicDepth === 'low') bits.push('with light strategy');
  else bits.push('with mixed strategy');

  const driverBits: string[] = [];
  if (betrayals > 0) driverBits.push(`${betrayals} betrayal${betrayals > 1 ? 's' : ''}`);
  if (blindsides > 0) driverBits.push(`${blindsides} blindside vote${blindsides > 1 ? 's' : ''}`);
  if (emotionalConfessionals + vulnerableConfessionals >= 2) {
    driverBits.push('emotional confessionals');
  }
  if (twistsActivated.length > 0) {
    driverBits.push('a twist-influenced outcome');
  }

  if (driverBits.length > 0) {
    bits.push('featuring ' + driverBits.slice(0, 3).join(', '));
  }

  if (audienceMood === 'loved') {
    bits.push('— fans are loving it.');
  } else if (audienceMood === 'hated') {
    bits.push('— viewers are frustrated this week.');
  } else {
    bits.push('— audience is split.');
  }

  const narrativeReason = bits.join(' ');

  return {
    week,
    window: { startDay, endDay },
    dimensions: {
      drama: { raw: dramaRaw, normalized: dramaNorm },
      strategy: { raw: strategyRaw, normalized: strategyNorm },
      heart: { raw: heartRaw, normalized: heartNorm },
      chaos: { raw: chaosRaw, normalized: chaosNorm },
    },
    events: {
      betrayals,
      highImpactSchemes,
      quietSchemes,
      intenseConversations,
      allianceForms,
      allianceMeetings,
      emotionalConfessionals,
      strategicConfessionals,
      vulnerableConfessionals,
      eliminationThisWeek,
      twistsActivated,
      tieBreakUsed,
      blindsides,
      viralMomentsCount,
    },
    rating: {
      base,
      dramaComponent,
      strategyComponent,
      heartComponent,
      chaosPenalty,
      approvalAdjustment,
      viralAdjustment,
      noise,
      total,
    },
    trend: {
      previousWeeklyRating,
      delta,
    },
    labels: {
      intensity,
      strategicDepth,
      emotionalTone,
      chaosType,
      audienceMood,
      weekSummaryTag,
    },
    narrativeReason,
  };
}
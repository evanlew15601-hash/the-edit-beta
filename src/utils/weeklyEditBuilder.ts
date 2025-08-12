import { GameState, WeeklyEdit } from '@/types/game';

function withinWeek(day: number, week: number) {
  return day > (week - 1) * 7 && day <= week * 7;
}

function truncate(text: string, max = 140) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export function buildWeeklyEdit(gameState: GameState): WeeklyEdit {
  const week = Math.max(1, Math.floor(gameState.currentDay / 7));
  const { confessionals, alliances, votingHistory, editPerception, playerName, contestants } = gameState;

  const weeklyConfs = confessionals.filter(c => withinWeek(c.day, week));

  // Tone distribution and dominant tone
  const toneCounts = weeklyConfs.reduce<Record<string, number>>((acc, c) => {
    acc[c.tone] = (acc[c.tone] || 0) + 1;
    return acc;
  }, {});
  const dominantTone = Object.entries(toneCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Featured quote: highest editImpact, then by length, then latest
  const featured = [...weeklyConfs]
    .sort((a, b) => (b.editImpact ?? 0) - (a.editImpact ?? 0) || (b.content?.length ?? 0) - (a.content?.length ?? 0) || b.day - a.day)[0];

  const selectedQuote = truncate(
    featured?.content || editPerception.weeklyQuote || 'Quiet week—no standout confessional.',
    160
  );

  // Alliance events this week
  const alliancesFormed = alliances.filter(a => withinWeek(a.formed, week));
  const alliancesActive = alliances.filter(a => withinWeek(a.lastActivity, week));

  // Elimination this week
  const elim = votingHistory.find(v => withinWeek(v.day, week));
  const elimLine = elim
    ? `Elimination: ${elim.eliminated} left after a ${Object.values(elim.votes || {}).length}-vote.`
    : undefined;

  // Simple memory-driven moments (scan contestants for notable events)
  const notableMoments: string[] = [];
  for (const c of contestants) {
    for (const m of c.memory || []) {
      if (!withinWeek(m.day, week)) continue;
      if (m.type === 'scheme' && m.emotionalImpact >= 3) {
        notableMoments.push(`A scheme brews involving ${m.participants.join(', ')}.`);
      }
      if (m.type === 'conversation' && m.emotionalImpact >= 4) {
        notableMoments.push(`Tense exchange with ${m.participants.join(', ')}.`);
      }
      if (m.type === 'observation' && m.emotionalImpact >= 4) {
        notableMoments.push(`You clock a subtle social tell during downtime.`);
      }
    }
  }

  const eventMontage = [
    dominantTone ? `Diary room leaned ${dominantTone}.` : undefined,
    alliancesFormed.length
      ? `Alliance formed: ${alliancesFormed.map(a => a.members.join(' & ')).join(' | ')}`
      : undefined,
    alliancesActive.length && !alliancesFormed.length
      ? `Alliances shifted quietly; bonds tested.`
      : undefined,
    elimLine,
    ...notableMoments,
  ].filter(Boolean) as string[];

  const whatHappenedBits: string[] = [];
  if (weeklyConfs.length) whatHappenedBits.push(`${weeklyConfs.length} confessionals with ${dominantTone || 'mixed'} tone.`);
  if (alliancesFormed.length) whatHappenedBits.push(`New alliance${alliancesFormed.length > 1 ? 's' : ''} formed.`);
  if (elim) whatHappenedBits.push(`${elim.eliminated} eliminated.`);

  const whatWasShown = [
    `Cut frames you as a ${editPerception.persona.toLowerCase()}.`,
    dominantTone ? `Emphasis on ${dominantTone} diary rooms.` : undefined,
    editPerception.lastEditShift > 0
      ? `Audience warmed slightly.`
      : editPerception.lastEditShift < 0
      ? `Audience cooled.`
      : `Audience held steady.`,
  ].filter(Boolean).join(' ');

  const whatHappened = whatHappenedBits.length
    ? whatHappenedBits.join(' ')
    : 'Quiet strategic positioning; social threads set for next week.';

  return {
    week,
    playerPersona: editPerception.persona,
    selectedQuote,
    approvalShift: editPerception.lastEditShift,
    eventMontage: eventMontage.slice(0, 5),
    realityVsEdit: {
      whatHappened,
      whatWasShown,
    },
  };
}

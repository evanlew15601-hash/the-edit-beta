import { GameState, WeeklyEdit } from '@/types/game';

function withinWeek(day: number, week: number) {
  return day > (week - 1) * 7 && day <= week * 7;
}

function truncate(text: string, max = 140) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export function buildWeeklyEdit(gameState: GameState): WeeklyEdit {
  const week = Math.max(1, Math.floor((gameState.currentDay - 1) / 7) + 1);
  const weekStartDay = (week - 1) * 7 + 1;
  const weekEndDay = week * 7;
  const { confessionals, alliances, votingHistory, editPerception, playerName, contestants } = gameState;

  const weeklyConfs = confessionals.filter(c => c.day >= weekStartDay && c.day <= weekEndDay);

  // Tone distribution and dominant tone
  const toneCounts = weeklyConfs.reduce<Record<string, number>>((acc, c) => {
    acc[c.tone] = (acc[c.tone] || 0) + 1;
    return acc;
  }, {});
  const dominantTone = Object.entries(toneCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Featured quote: highest audienceScore, then editImpact, then length, then latest
  const featured = [...weeklyConfs]
    .sort((a, b) => (b.audienceScore ?? -Infinity) - (a.audienceScore ?? -Infinity) || (b.editImpact ?? 0) - (a.editImpact ?? 0) || (b.content?.length ?? 0) - (a.content?.length ?? 0) || b.day - a.day)[0];

  const selectedQuote = truncate(
    featured?.content || editPerception.weeklyQuote || 'Quiet week—no standout confessional.',
    160
  );

  // Alliance events this week
  const alliancesFormed = alliances.filter(a => a.formed >= weekStartDay && a.formed <= weekEndDay);
  const alliancesActive = alliances.filter(a => a.lastActivity >= weekStartDay && a.lastActivity <= weekEndDay);

  // Elimination this week
  const elim = votingHistory.find(v => v.day >= weekStartDay && v.day <= weekEndDay);
  const elimLine = elim
    ? `Elimination: ${elim.eliminated} left after a ${Object.values(elim.votes || {}).length}-vote.`
    : undefined;

  // Simple memory-driven moments (scan contestants for notable events)
  const notableMoments: string[] = [];
  const viralMoments: string[] = [];
  
  // Scan contestant memories
  for (const c of contestants) {
    for (const m of c.memory || []) {
      if (m.day < weekStartDay || m.day > weekEndDay) continue;
      if (m.type === 'scheme' && m.emotionalImpact >= 3) {
        const line = `A scheme brews involving ${m.participants.join(', ')}.`;
        notableMoments.push(line);
        if (m.participants.includes(playerName)) viralMoments.push(line);
      }
      if (m.type === 'conversation' && m.emotionalImpact >= 4) {
        const line = `Tense exchange with ${m.participants.join(', ')}.`;
        notableMoments.push(line);
        if (m.participants.includes(playerName)) viralMoments.push(line);
      }
      if (m.type === 'observation' && m.emotionalImpact >= 4) {
        const line = `You clock a subtle social tell during downtime.`;
        notableMoments.push(line);
        if (m.participants.includes(playerName)) viralMoments.push(line);
      }
    }
  }

  // Include logged interactions between player and NPCs
  const logs = (gameState.interactionLog || []).filter(l => l.day >= weekStartDay && l.day <= weekEndDay && l.participants?.includes(playerName));
  const ranked = logs
    .map(l => ({
      score: (l.type === 'scheme' ? 5 : l.type === 'dm' ? 3 : l.type === 'talk' ? 2 : 1) + (l.ai_response ? 1 : 0) + (l.content ? Math.min(3, Math.floor((l.content.length || 0) / 60)) : 0),
      text: l.type === 'scheme' ? `You pitched a risky move to ${l.participants.filter(p => p !== playerName).join(', ')}.`
        : l.type === 'dm' ? `Private DM with ${l.participants.filter(p => p !== playerName).join(', ')} stirred questions.`
        : l.type === 'talk' ? `On-camera talk with ${l.participants.filter(p => p !== playerName).join(', ')} set the tone.`
        : l.type === 'activity' ? `Shared activity created goodwill.`
        : `You observed a moment that might change things.`
    }))
    .sort((a,b) => b.score - a.score)
    .slice(0, 5)
    .map(r => r.text);
  viralMoments.push(...ranked);

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
    viralMoments: Array.from(new Set(viralMoments)).slice(0, 6),
    realityVsEdit: {
      whatHappened,
      whatWasShown,
    },
  };
}

import { GameState, WeeklyEdit } from '@/types/game';
import { memoryEngine } from './memoryEngine';

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

  // Get confessionals from memory system for this week
  const memorySystem = memoryEngine.getMemorySystem();
  const weeklyEvents = memorySystem.weeklyEvents[week] || [];
  const confessionalEvents = weeklyEvents.filter(e => 
    e.type === 'confessional' && 
    e.participants.includes(playerName)
  );

  // Also get stored confessionals
  const weeklyConfs = confessionals.filter(c => c.day >= weekStartDay && c.day <= weekEndDay);

  // Ensure we have confessionals to work with
  const allConfessionals = weeklyConfs.length > 0 ? weeklyConfs : 
    confessionalEvents.map(e => ({
      id: `event-${e.id}`,
      day: e.day,
      content: e.content.replace(/^Confessional \([^)]+\): "/, '').replace(/"$/, ''),
      tone: e.content.match(/Confessional \(([^)]+)\):/)?.[1] || 'neutral',
      editImpact: e.strategicImportance,
      audienceScore: e.emotionalImpact * 10,
      selected: e.strategicImportance > 5
    }));

  // Tone distribution and dominant tone
  const toneCounts = allConfessionals.reduce<Record<string, number>>((acc, c) => {
    acc[c.tone] = (acc[c.tone] || 0) + 1;
    return acc;
  }, {});
  const dominantTone = Object.entries(toneCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Featured quote: highest audienceScore, then editImpact, then length, then latest
  const featured = [...allConfessionals]
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

  // Enhanced drama tracking with narrative coherence
  const recentActions = (gameState.interactionLog || []).filter(l => l.day >= weekStartDay && l.day <= weekEndDay && l.participants?.includes(playerName));
  
  // Detect narrative arc patterns
  const narrativeElements = detectNarrativeElements(gameState, week, recentActions, editPerception);
  
  // Build contextual montage based on player's edit trajectory
  const personalizedMontage = buildPersonalizedMontage(dominantTone, alliancesFormed, alliancesActive, elimLine, notableMoments, recentActions, editPerception);

  const eventMontage = personalizedMontage.filter(Boolean) as string[];

  const whatHappenedBits: string[] = [];
  if (allConfessionals.length) whatHappenedBits.push(`${allConfessionals.length} confessionals with ${dominantTone || 'mixed'} tone.`);
  if (alliancesFormed.length) whatHappenedBits.push(`New alliance${alliancesFormed.length > 1 ? 's' : ''} formed.`);
  if (elim) whatHappenedBits.push(`${elim.eliminated} eliminated.`);

  // Enhanced reality vs edit narrative
  const enhancedEditNarrative = buildEditNarrative(editPerception, dominantTone, narrativeElements, elim);
  
  const whatWasShown = enhancedEditNarrative;

  const whatHappened = whatHappenedBits.length
    ? whatHappenedBits.join(' ') + ` ${narrativeElements.behindScenesContext}`
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

// Enhanced narrative detection
function detectNarrativeElements(gameState: GameState, week: number, recentActions: any[], editPerception: any) {
  const strategicMoves = recentActions.filter(a => a.type === 'scheme').length;
  const socialMoves = recentActions.filter(a => a.type === 'talk' || a.type === 'dm').length;
  const allianceMoves = recentActions.filter(a => a.type === 'alliance_meeting').length;
  
  let arcType = 'steady';
  if (strategicMoves >= 3) arcType = 'strategic_mastermind';
  else if (socialMoves >= 4) arcType = 'social_player';
  else if (allianceMoves >= 2) arcType = 'alliance_coordinator';
  else if (editPerception.lastEditShift > 15) arcType = 'rising_star';
  else if (editPerception.lastEditShift < -15) arcType = 'falling_target';
  
  const behindScenesContext = getBehindScenesContext(arcType, strategicMoves, socialMoves);
  
  return {
    arcType,
    behindScenesContext,
    strategicIntensity: strategicMoves,
    socialIntensity: socialMoves
  };
}

function getBehindScenesContext(arcType: string, strategicMoves: number, socialMoves: number): string {
  switch (arcType) {
    case 'strategic_mastermind':
      return 'Multiple strategic conversations happened off-camera, building complex vote scenarios.';
    case 'social_player':
      return 'Extensive relationship-building occurred during downtime and casual interactions.';
    case 'alliance_coordinator':
      return 'Secret alliance meetings and coordination dominated your behind-the-scenes time.';
    case 'rising_star':
      return 'Your game momentum built through subtle moves that impressed both contestants and producers.';
    case 'falling_target':
      return 'Warning signs accumulated as other players began viewing you as a threat.';
    default:
      return 'Steady gameplay with measured social and strategic positioning.';
  }
}

function buildPersonalizedMontage(dominantTone: string, alliancesFormed: any[], alliancesActive: any[], elimLine: string | undefined, notableMoments: string[], recentActions: any[], editPerception: any): (string | undefined)[] {
  const base = [
    dominantTone ? `Diary room tone: ${dominantTone} (${getPersonaContext(editPerception.persona, dominantTone)}).` : undefined,
    alliancesFormed.length
      ? `New alliance formed: ${alliancesFormed.map(a => a.name || a.members.join(' & ')).join(' | ')}`
      : undefined,
    alliancesActive.length && !alliancesFormed.length
      ? `Alliance dynamics evolved as relationships were tested.`
      : undefined,
    elimLine
  ];
  
  // Add persona-specific montage elements
  const personalizedElements = getPersonalizedElements(editPerception.persona, recentActions, notableMoments);
  
  return [...base, ...personalizedElements, ...notableMoments.slice(0, 3)];
}

function getPersonaContext(persona: string, tone: string): string {
  const toneMap: { [key: string]: { [key: string]: string } } = {
    'Villain': {
      'strategic': 'calculated manipulation',
      'aggressive': 'direct confrontation',
      'suspicious': 'paranoid scheming'
    },
    'Hero': {
      'friendly': 'genuine connection',
      'strategic': 'noble gameplay',
      'suspicious': 'justified concern'
    },
    'Mastermind': {
      'strategic': 'chess-like planning',
      'friendly': 'social manipulation',
      'aggressive': 'power moves'
    }
  };
  
  return toneMap[persona]?.[tone] || 'authentic gameplay';
}

function getPersonalizedElements(persona: string, recentActions: any[], notableMoments: string[]): string[] {
  const elements = [];
  
  if (persona.includes('Villain') || persona.includes('Mastermind')) {
    if (recentActions.some(a => a.type === 'scheme')) {
      elements.push('Strategic scheming intensified with calculated precision.');
    }
  }
  
  if (persona.includes('Hero') || persona.includes('Fan Favorite')) {
    if (recentActions.some(a => a.type === 'talk')) {
      elements.push('Genuine connections formed through authentic conversations.');
    }
  }
  
  if (persona.includes('Social')) {
    elements.push('Social web expanded through careful relationship management.');
  }
  
  return elements;
}

function buildEditNarrative(editPerception: any, dominantTone: string, narrativeElements: any, elim: any): string {
  const baseNarrative = `Edit frames you as a ${editPerception.persona.toLowerCase()}.`;
  
  const toneNarrative = dominantTone ? ` Your ${dominantTone} confessionals ${getToneEditEffect(dominantTone, editPerception.persona)}.` : '';
  
  const audienceShift = editPerception.lastEditShift > 0
    ? ' Audience sentiment improved this week.'
    : editPerception.lastEditShift < 0
    ? ' Audience sentiment declined.'
    : ' Audience sentiment remained stable.';
    
  const arcNarrative = getArcNarrative(narrativeElements.arcType, editPerception.persona);
  
  return baseNarrative + toneNarrative + audienceShift + arcNarrative;
}

function getToneEditEffect(tone: string, persona: string): string {
  if (persona.includes('Villain')) {
    return tone === 'aggressive' ? 'reinforced your villain edit' : 'showed calculated strategy';
  }
  if (persona.includes('Hero')) {
    return tone === 'friendly' ? 'highlighted your authenticity' : 'revealed strategic depth';
  }
  return 'shaped your narrative arc';
}

function getArcNarrative(arcType: string, persona: string): string {
  const narratives = {
    'strategic_mastermind': ' Your mastermind capabilities were showcased prominently.',
    'social_player': ' Your social game received major screen time.',
    'alliance_coordinator': ' Your role as a strategic coordinator was emphasized.',
    'rising_star': ' Your trajectory was painted as ascending.',
    'falling_target': ' Foreshadowing suggested upcoming challenges.',
    'steady': ' Your consistent gameplay was portrayed as methodical.'
  };
  
  return narratives[arcType] || '';
}

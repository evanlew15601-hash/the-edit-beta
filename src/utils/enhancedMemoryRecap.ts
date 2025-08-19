import { GameState, WeeklyEdit } from '@/types/game';
import { memoryEngine } from './memoryEngine';
import { generateFanReactions } from './fanReactions';

// Enhanced recap that truly pulls from memory and creates compelling content
export function buildEnhancedWeeklyEdit(gameState: GameState): WeeklyEdit {
  const week = Math.max(1, Math.floor((gameState.currentDay - 1) / 7) + 1);
  const weekStartDay = (week - 1) * 7 + 1;
  const weekEndDay = week * 7;
  const { confessionals, alliances, votingHistory, editPerception, playerName } = gameState;

  // Get memory events for this week
  const memorySystem = memoryEngine.getMemorySystem();
  const weeklyEvents = memorySystem.weeklyEvents[week] || [];
  
  // Filter events that actually involve the player
  const playerEvents = weeklyEvents.filter(e => 
    e.participants.includes(playerName) && 
    e.strategicImportance >= 4
  );

  // Get confessionals - prioritize ones that were actually recorded
  const storedConfessionals = confessionals.filter(c => c.day >= weekStartDay && c.day <= weekEndDay);
  const memoryConfessionals = weeklyEvents.filter(e => 
    e.type === 'confessional' && 
    e.participants.includes(playerName)
  );
  
  // Build confessional summary
  const allConfessionals = storedConfessionals.length > 0 ? storedConfessionals : 
    memoryConfessionals.map(e => ({
      id: `memory-${e.id}`,
      day: e.day,
      content: e.content.replace(/^Confessional \([^)]+\): "/, '').replace(/"$/, ''),
      tone: e.content.match(/Confessional \(([^)]+)\):/)?.[1] || 'strategic',
      editImpact: e.strategicImportance,
      audienceScore: e.emotionalImpact * 10,
      selected: e.strategicImportance > 6
    }));

  // Get the best confessional quote
  const featuredConfessional = allConfessionals
    .sort((a, b) => (b.audienceScore || 0) - (a.audienceScore || 0) || (b.editImpact || 0) - (a.editImpact || 0))[0];
  
  const selectedQuote = featuredConfessional?.content?.slice(0, 160) || 
    "I'm playing this game one move at a time.";

  // Build event montage from real events
  const eventMontage: string[] = [];
  
  // Process player-involved events
  playerEvents.forEach(event => {
    switch (event.type) {
      case 'alliance_form':
        eventMontage.push(`New alliance formed with ${event.participants.filter(p => p !== playerName).join(', ')}`);
        break;
      case 'betrayal':
        eventMontage.push(`Trust broken - ${event.content.slice(0, 60)}...`);
        break;
      case 'scheme':
        if (event.emotionalImpact > 5) {
          eventMontage.push(`Strategic move against ${event.participants.filter(p => p !== playerName).join(', ')}`);
        }
        break;
      case 'conversation':
        if (event.emotionalImpact >= 4) {
          eventMontage.push(`Intense discussion with ${event.participants.filter(p => p !== playerName).join(', ')}`);
        }
        break;
      case 'vote':
        eventMontage.push(`Elimination vote cast`);
        break;
    }
  });

  // Add elimination if it happened this week
  const weekElimination = votingHistory.find(v => v.day >= weekStartDay && v.day <= weekEndDay);
  if (weekElimination) {
    eventMontage.push(`${weekElimination.eliminated} eliminated`);
  }

  // Build viral moments from high-impact events
  const viralMoments: string[] = [];
  
  playerEvents
    .filter(e => e.emotionalImpact >= 6)
    .sort((a, b) => b.emotionalImpact - a.emotionalImpact)
    .slice(0, 4)
    .forEach(event => {
      switch (event.type) {
        case 'scheme':
          viralMoments.push(`Your scheming session caught viewers' attention`);
          break;
        case 'betrayal':
          viralMoments.push(`The betrayal moment sparked social media debates`);
          break;
        case 'alliance_form':
          viralMoments.push(`Fans are analyzing your new alliance strategy`);
          break;
        case 'conversation':
          viralMoments.push(`Your conversation became a trending topic`);
          break;
        default:
          viralMoments.push(`This moment had fans talking`);
      }
    });

  // Reality vs Edit comparison
  const actualEvents = playerEvents.length;
  const shownEvents = eventMontage.length;
  
  const whatHappened = actualEvents > 0 
    ? `You were involved in ${actualEvents} strategic moments this week`
    : `Quiet week focused on relationship building`;
    
  const whatWasShown = shownEvents > 0
    ? `Edit highlighted ${shownEvents} key moments, framing you as ${editPerception.persona.toLowerCase()}`
    : `Limited screen time this week - edit focused elsewhere`;

  return {
    week,
    playerPersona: editPerception.persona,
    selectedQuote,
    approvalShift: editPerception.lastEditShift,
    eventMontage: eventMontage.slice(0, 6),
    viralMoments: viralMoments.slice(0, 4),
    realityVsEdit: {
      whatHappened,
      whatWasShown,
    },
  };
}
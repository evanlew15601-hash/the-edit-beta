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
  
  // Generate dynamic quotes based on actual week events and persona
  const selectedQuote = featuredConfessional?.content?.slice(0, 160) || 
    this.generateDynamicQuote(gameState, week, playerEvents);

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

function generateDynamicQuote(gameState: GameState, week: number, playerEvents: any[]): string {
  const { editPerception, alliances, contestants } = gameState;
  const activeCount = contestants.filter(c => !c.isEliminated).length;
  
  // Base quotes on persona and week activity
  if (playerEvents.length > 3) {
    // Active week quotes
    const quotes = [
      `This week has been intense. I've had to make some difficult decisions but I think I'm positioning myself well.`,
      `A lot is happening right now and I need to stay focused on my long-term strategy while handling the immediate threats.`,
      `I'm playing multiple angles this week. Sometimes you have to create chaos to find opportunity.`,
      `The game is accelerating and I'm ready for it. This is where the real players separate from the followers.`
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
  
  // Persona-based quotes
  switch (editPerception.persona) {
    case 'Hero':
      return `I'm trying to play with integrity while still making the moves I need to make. It's a fine line to walk.`;
    case 'Villain':
      return `I know people see me as ruthless, but this is a game and I'm here to win. I'll do what's necessary.`;
    case 'Underedited':
      return `I may not be getting much screen time, but I'm observing everything and my moment will come.`;
    case 'Dark Horse':
      return `People are starting to notice my game, which means I need to be even more strategic about my next moves.`;
    default:
      return `Day ${week * 7} and I'm still here. Every day is a victory and I'm not taking anything for granted.`;
  }
}
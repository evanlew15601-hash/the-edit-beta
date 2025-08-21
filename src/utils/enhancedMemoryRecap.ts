import { GameState, WeeklyEdit } from '@/types/game';
import { memoryEngine } from './memoryEngine';
import { generateFanReactions } from './fanReactions';

// Enhanced recap that truly pulls from memory and creates compelling content
export function buildEnhancedWeeklyEdit(gameState: GameState): WeeklyEdit {
  const currentWeek = Math.max(1, Math.floor((gameState.currentDay - 1) / 7) + 1);
  const week = currentWeek;
  const weekStartDay = (week - 1) * 7 + 1;
  const weekEndDay = week * 7;
  const { confessionals, alliances, votingHistory, editPerception, playerName } = gameState;

  // Create unique quotes based on game state and week
  const dynamicQuotes = [
    `Day ${gameState.currentDay} and I'm still here fighting. That says something about my game.`,
    `${gameState.alliances.length} alliance${gameState.alliances.length !== 1 ? 's' : ''} and counting. I'm positioning myself for the long haul.`,
    `${gameState.contestants.filter(c => !c.isEliminated).length} of us left. Every decision matters now.`,
    `My strategy is evolving with the game. What worked week one won't work now.`,
    `The edit can say what it wants - I know what really happened in these conversations.`,
    `Week ${currentWeek} has been a test of everything I've learned so far.`,
    `I'm not the same player who walked in here. This game changes you.`,
    `Trust is currency in here, and I'm learning who's worth investing in.`
  ];
  
  // Get recent confessionals for this week
  const recentConfessionals = gameState.confessionals.filter(c => 
    c.day >= weekStartDay && c.day <= weekEndDay
  );
  
  // Dynamic quote generation with more variety and current state awareness
  const gameStateQuotes = [
    `Day ${gameState.currentDay}: ${gameState.contestants.filter(c => !c.isEliminated).length} of us left and I'm still fighting for this.`,
    `${gameState.alliances.length} alliance${gameState.alliances.length !== 1 ? 's' : ''} in play right now. I'm ${gameState.alliances.some(a => a.members.includes(playerName)) ? 'positioned strategically' : 'playing independently'}.`,
    `Week ${currentWeek} has tested everything I thought I knew about this game.`,
    `The house dynamics are shifting daily. What worked yesterday might not work tomorrow.`,
    `I came here with a plan, but this game has taught me to adapt constantly.`,
    `Trust is the most valuable currency in here, and I'm learning who deserves mine.`,
    `Every conversation could be my last if I play it wrong. The pressure is real.`,
    `${Math.floor(Math.random() * 3) === 0 ? 'Some people think they have me figured out, but I have more moves left.' : 'I\'m not the same person who walked through these doors. This game changes you.'}`,
    `The edit will show what it shows, but I know the real story of what's happening here.`
  ];
  
  // Use actual confessional or generate dynamic quote with current context
  const finalSelectedQuote = recentConfessionals.length > 0 
    ? recentConfessionals[recentConfessionals.length - 1].content 
    : gameStateQuotes[Math.floor(Math.random() * gameStateQuotes.length)];

  console.log(`[WeeklyRecap] Week ${currentWeek}: Using ${recentConfessionals.length > 0 ? 'actual' : 'generated'} quote for ${playerName}`);
  
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
  
  const finalQuote = featuredConfessional?.content?.slice(0, 160) || 
    generateDynamicQuote(gameState, week, playerEvents) || finalSelectedQuote;

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

  // Build varied viral moments from high-impact events
  const viralMoments: string[] = [];
  
  const viralMomentTemplates = {
    scheme: [
      `Your strategic planning session went viral on social media`,
      `Fans are dissecting your scheming techniques frame by frame`,
      `Your behind-the-scenes maneuvering became a trending hashtag`,
      `Viewers called your scheming session "masterclass television"`
    ],
    betrayal: [
      `The betrayal moment sparked heated debates across fan communities`,
      `Your betrayal move divided the fanbase - some love it, some hate it`,
      `The betrayal clip became the most-watched moment of the season`,
      `Fans are still arguing about whether your betrayal was justified`
    ],
    alliance_form: [
      `Your alliance formation strategy is being analyzed by superfans`,
      `New alliance news broke the internet with speculation posts`,
      `Fans are creating alliance charts to track your partnerships`,
      `Your alliance move got featured in multiple recap podcasts`
    ],
    conversation: [
      `Your conversation became the most-quoted moment of the week`,
      `One line from your conversation launched a thousand memes`,
      `Fans are obsessing over the subtext in your conversation`,
      `Your conversation clip hit a million views in 24 hours`
    ],
    vote: [
      `Your voting strategy sparked analysis videos across YouTube`,
      `Fans are praising your calculated voting decision`,
      `Your vote choice became a case study in strategic gameplay`,
      `The voting moment you created is being called iconic`
    ],
    confessional: [
      `Your confessional segment went viral for its raw honesty`,
      `Fans are quoting your confessional lines in their bios`,
      `Your confessional became required viewing for strategy analysis`,
      `The confessional clip broke viewing records for the episode`
    ]
  };

  playerEvents
    .filter(e => e.emotionalImpact >= 4) // Lowered threshold for more viral moments
    .sort((a, b) => b.emotionalImpact - a.emotionalImpact)
    .slice(0, 5) // Increased to 5 potential moments
    .forEach(event => {
      const templates = viralMomentTemplates[event.type as keyof typeof viralMomentTemplates] || [
        `This moment had fans talking across all platforms`,
        `Your gameplay moment became essential viewing`,
        `Fans are calling this moment television gold`,
        `This scene became the highlight of the episode`
      ];
      
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      viralMoments.push(randomTemplate);
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
    selectedQuote: finalQuote,
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
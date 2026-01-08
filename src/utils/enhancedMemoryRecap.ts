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
      content: e.content.replace(/^Confessional \([^)]+\): \"/, '').replace(/\"$/, ''),
      tone: e.content.match(/Confessional \(([^)]+)\):/)?.[1] || 'strategic',
      editImpact: e.strategicImportance,
      audienceScore: e.emotionalImpact * 10,
      selected: e.strategicImportance > 6
    }));

  // Get the best confessional quote (slightly favor aired/selected)
  const featuredConfessional = allConfessionals
    .sort((a, b) => ((b.audienceScore || 0) + (b.selected ? 0.5 : 0)) - ((a.audienceScore || 0) + (a.selected ? 0.5 : 0)) || (b.editImpact || 0) - (a.editImpact || 0))[0];
  
  const finalQuote = featuredConfessional?.content?.slice(0, 160) || 
    generateDynamicQuote(gameState, week, playerEvents) || finalSelectedQuote;

  // Build event montage from real events, framed like a \"previously on\" package
  const eventMontage: string[] = [];
  
  // Process player-involved events
  playerEvents.forEach(event => {
    const others = event.participants.filter(p => p !== playerName);
    switch (event.type) {
      case 'alliance_form':
        eventMontage.push(
          `A quiet conversation turned into a new voting bloc with ${others.join(', ')}.`
        );
        break;
      case 'betrayal':
        eventMontage.push(
          `Trust snapped when a deal broke in the open: ${event.content.slice(0, 60)}...`
        );
        break;
      case 'scheme':
        if (event.emotionalImpact > 5) {
          eventMontage.push(
            `A late-night plan against ${others.join(', ')} put your name deeper in The Edit's strategy notes.`
          );
        }
        break;
      case 'conversation':
        if (event.emotionalImpact >= 4) {
          eventMontage.push(
            `A conversation with ${others.join(', ')} changed how the house read your game.`
          );
        }
        break;
      case 'vote':
        eventMontage.push(`The vote locked in, and another key turned in the front door.`);
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

  // Generate diverse viral moments based on actual strategic play
  const viralMomentsByType = new Map<string, number>();
  
  playerEvents
    .filter(e => e.emotionalImpact >= 3) // Lowered threshold for more variety
    .sort((a, b) => b.emotionalImpact - a.emotionalImpact)
    .slice(0, 6) // Increased potential moments
    .forEach(event => {
      // Track how many times we've used this event type
      const currentCount = viralMomentsByType.get(event.type) || 0;
      viralMomentsByType.set(event.type, currentCount + 1);
      
      // Use different templates based on how many times we've seen this type
      const templates = viralMomentTemplates[event.type as keyof typeof viralMomentTemplates] || [
        `This strategic moment had fans talking across all platforms`,
        `Your gameplay move became essential viewing this week`,
        `Fans are calling this scene television gold`,
        `This moment became the highlight of the episode for viewers`
      ];
      
      // Rotate through templates to avoid repetition
      const templateIndex = currentCount % templates.length;
      viralMoments.push(templates[templateIndex]);
    });

  // Reality vs Edit comparison
  const actualEvents = playerEvents.length;
  const shownEvents = eventMontage.length;
  
  const whatHappened = actualEvents > 0 
    ? `In reality, you touched ${actualEvents} high-impact moments this week.`
    : `In the house, it was a quieter week focused on relationship building.`;
    
  const whatWasShown = shownEvents > 0
    ? `In the episodes, the edit zoomed in on ${shownEvents} of those beats and kept pushing you as ${editPerception.persona.toLowerCase()}.`
    : `On The Edit, your screen time dipped as the story shifted to other players.`;

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

// New: Build a per-contestant memory recap for finale dialogs
export function buildContestantMemoryRecap(gameState: GameState, contestantName: string) {
  const contestant = gameState.contestants.find(c => c.name === contestantName);
  if (!contestant) {
    return {
      name: contestantName,
      summary: `No data available.`,
      topMoments: [],
      sentiment: 0,
    };
  }

  // Recent memories (last 30)
  const recent = contestant.memory.slice(-30);

  // Compute sentiment and categorize events
  const sentiment = recent.reduce((sum, m) => sum + m.emotionalImpact, 0);
  const schemes = recent.filter(m => m.type === 'scheme').length;
  const talks = recent.filter(m => m.type === 'conversation').length;
  const betrayals = recent.filter(m => m.content.toLowerCase().includes('betrayal')).length;

  const summaryParts = [];
  summaryParts.push(`${contestant.name} showed ${schemes} strategic move${schemes !== 1 ? 's' : ''} and ${talks} key conversation${talks !== 1 ? 's' : ''} in recent days.`);
  if (betrayals > 0) summaryParts.push(`${betrayals} betrayal-related event${betrayals !== 1 ? 's' : ''} impacted perception.`);
  summaryParts.push(`Overall recent sentiment: ${sentiment >= 0 ? 'positive' : 'negative'} (${sentiment}).`);

  const topMoments = recent
    .sort((a, b) => Math.abs(b.emotionalImpact) - Math.abs(a.emotionalImpact))
    .slice(0, 8)
    .map(m => ({
      day: m.day,
      type: m.type,
      content: m.content,
      emotionalImpact: m.emotionalImpact,
      participants: m.participants,
    }));

  return {
    name: contestant.name,
    summary: summaryParts.join(' '),
    topMoments,
    sentiment,
  };
}
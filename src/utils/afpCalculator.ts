import { GameState } from '@/types/game';

interface AFPCandidate {
  name: string;
  score: number;
  editPerception: number;
  gamePerformance: number;
  audienceVote: number;
}

export const calculateAFPRanking = (gameState: GameState, playerVote?: string): AFPCandidate[] => {
  // Eligibility: all contestants who made jury or deeper (common AFP pool),
  // but if fewer, include everyone to avoid empty results.
  const eligible = (() => {
    const jurySet = new Set(gameState.juryMembers || []);
    const fromJury = gameState.contestants.filter(c => jurySet.has(c.name));
    return fromJury.length >= 5 ? fromJury : gameState.contestants;
  })();

  const afpCandidates: AFPCandidate[] = eligible.map(contestant => {
    // Calculate edit perception score (40% of total)
    const editScore = calculateEditScore(contestant, gameState);
    
    // Calculate game performance score (35% of total)  
    const gameScore = calculateGameScore(contestant, gameState);
    
    // Calculate audience vote simulation (25% of total)
    const audienceScore = calculateAudienceScore(contestant, gameState, playerVote);
    
    const totalScore = (editScore * 0.4) + (gameScore * 0.35) + (audienceScore * 0.25);
    
    return {
      name: contestant.name,
      score: totalScore,
      editPerception: editScore,
      gamePerformance: gameScore,
      audienceVote: audienceScore
    };
  });

  // Sort by total score descending and normalize scores to 0-100 band for display consistency
  const ranked = afpCandidates.sort((a, b) => b.score - a.score);
  const maxScore = ranked[0]?.score || 1;
  const normalized = ranked.map(c => ({
    ...c,
    score: Math.min(100, Math.max(0, (c.score / maxScore) * 100))
  }));

  return normalized;
};

function calculateEditScore(contestant: any, gameState: GameState): number {
  let score = 50; // Base score

  // Defensive guards for legacy or partial saves
  const mem = Array.isArray(contestant?.memory) ? contestant.memory : [];
  const persona = (contestant?.publicPersona || '').toLowerCase();
  
  // Positive edit factors
  if (mem.length > 15) score += 20; // High screen time
  if (persona.includes('strategist') || persona.includes('strategic')) score += 15;
  if (persona.includes('social')) score += 15;
  if (persona.includes('challenge') || persona.includes('competitor')) score += 10;
  
  // Alliance leadership bonus
  const allianceLeader = Array.isArray(gameState.alliances) && gameState.alliances.some(a => 
    a.members.includes(contestant.name) && a.members[0] === contestant.name
  );
  if (allianceLeader) score += 15;
  
  // Confessional quality (if player)
  if (contestant?.name === gameState.playerName) {
    const confessionals = gameState.confessionals?.length || 0;
    score += Math.min(confessionals * 2, 30);
  }
  
  return Math.max(0, Math.min(100, score));
}

function calculateGameScore(contestant: any, gameState: GameState): number {
  let score = 30; // Base score
  
  // Days survived bonus
  const daysPlayed = contestant?.eliminationDay || gameState.currentDay;
  score += (daysPlayed / Math.max(1, gameState.currentDay)) * 40;
  
  // Strategic gameplay
  const mem = Array.isArray(contestant?.memory) ? contestant.memory : [];
  const strategicMoves = mem.filter((m: any) => 
    m.type === 'conversation' || m.type === 'scheme'
  ).length;
  score += Math.min(strategicMoves, 20);
  
  // Alliance performance
  const alliances = Array.isArray(gameState.alliances) ? gameState.alliances : [];
  const successfulAlliances = alliances.filter(a => 
    a.members.includes(contestant.name) && !a.dissolved
  ).length;
  score += successfulAlliances * 5;
  
  return Math.max(0, Math.min(100, score));
}

function calculateAudienceScore(contestant: any, gameState: GameState, playerVote?: string): number {
  let score = 50; // Base score

  const persona = (contestant?.publicPersona || '').toLowerCase();
  
  // Player vote influence (20% boost if they voted for this person)
  if (playerVote === contestant?.name) {
    score += 20;
  }
  
  // Personality factors that audiences typically love
  if (persona.includes('underdog')) score += 15;
  if (persona.includes('entertaining')) score += 15;
  if (persona.includes('honest')) score += 10;
  if (persona.includes('strategic') && !persona.includes('ruthless')) score += 10;

  // Favor positive personas (Hero/Fan Favorite/Contender); gentle nudge
  if (persona.includes('hero') || persona.includes('fan favorite') || persona.includes('contender')) {
    score += 12;
  }
  // Villain bias: slightly negative unless also entertaining (then offset)
  if (persona.includes('villain') || persona.includes('antagonist') || persona.includes('troublemaker')) {
    score -= 5;
    if (persona.includes('entertaining')) score += 8;
  }
  
  // Social game strength
  const mem = Array.isArray(contestant?.memory) ? contestant.memory : [];
  const socialConnections = mem.filter((m: any) => 
    m.emotionalImpact > 0
  ).length;
  score += Math.min(socialConnections, 15);
  
  // Weekly audience signals from favoriteTally
  const tallies = gameState.favoriteTally || {};
  const maxTally = Object.values(tallies).length ? Math.max(...Object.values(tallies)) : 0;
  const contestantTally = tallies[contestant?.name] || 0;
  if (maxTally > 0) {
    // Scale to up to +25 points
    const bonus = Math.min(25, (contestantTally / maxTally) * 25);
    score += bonus;
  }

  // Penalty for being too strategic/ruthless
  if (persona.includes('ruthless')) score -= 10;
  if (persona.includes('manipulative')) score -= 15;
  
  return Math.max(0, Math.min(100, score));
}
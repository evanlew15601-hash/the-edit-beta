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
  
  // Positive edit factors
  if (contestant.memory.length > 15) score += 20; // High screen time
  if (contestant.publicPersona.includes('strategic')) score += 15;
  if (contestant.publicPersona.includes('social')) score += 15;
  if (contestant.publicPersona.includes('challenge')) score += 10;
  
  // Alliance leadership bonus
  const allianceLeader = gameState.alliances.some(a => 
    a.members.includes(contestant.name) && a.members[0] === contestant.name
  );
  if (allianceLeader) score += 15;
  
  // Confessional quality (if player)
  if (contestant.name === gameState.playerName) {
    const confessionals = gameState.confessionals?.length || 0;
    score += Math.min(confessionals * 2, 30);
  }
  
  return Math.max(0, Math.min(100, score));
}

function calculateGameScore(contestant: any, gameState: GameState): number {
  let score = 30; // Base score
  
  // Days survived bonus
  const daysPlayed = contestant.eliminationDay || gameState.currentDay;
  score += (daysPlayed / gameState.currentDay) * 40;
  
  // Strategic gameplay
  const strategicMoves = contestant.memory.filter(m => 
    m.type === 'conversation' || m.type === 'scheme'
  ).length;
  score += Math.min(strategicMoves, 20);
  
  // Alliance performance
  const successfulAlliances = gameState.alliances.filter(a => 
    a.members.includes(contestant.name) && !a.dissolved
  ).length;
  score += successfulAlliances * 5;
  
  return Math.max(0, Math.min(100, score));
}

function calculateAudienceScore(contestant: any, gameState: GameState, playerVote?: string): number {
  let score = 50; // Base score
  
  // Player vote influence (20% boost if they voted for this person)
  if (playerVote === contestant.name) {
    score += 20;
  }
  
  // Personality factors that audiences typically love
  if (contestant.publicPersona.includes('underdog')) score += 15;
  if (contestant.publicPersona.includes('entertaining')) score += 15;
  if (contestant.publicPersona.includes('honest')) score += 10;
  if (contestant.publicPersona.includes('strategic') && !contestant.publicPersona.includes('ruthless')) score += 10;
  
  // Social game strength
  const socialConnections = contestant.memory.filter(m => 
    m.emotionalImpact > 0
  ).length;
  score += Math.min(socialConnections, 15);
  
  // Penalty for being too strategic/ruthless
  if (contestant.publicPersona.includes('ruthless')) score -= 10;
  if (contestant.publicPersona.includes('manipulative')) score -= 15;
  
  return Math.max(0, Math.min(100, score));
}
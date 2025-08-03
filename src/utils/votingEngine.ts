import { Contestant, Alliance, VotingRecord } from '@/types/game';

export const processVoting = (
  contestants: Contestant[],
  playerName: string,
  alliances: Alliance[]
): VotingRecord => {
  const activeContestants = contestants.filter(c => !c.isEliminated);
  
  if (activeContestants.length <= 2) {
    // Finale - different voting logic
    return {
      day: 0,
      eliminated: '',
      votes: {},
      reason: 'Finale reached'
    };
  }

  // Calculate threat levels for each contestant
  const threatLevels = new Map<string, number>();
  
  activeContestants.forEach(contestant => {
    let threat = 0;
    
    // Base threat from psychological profile
    threat += contestant.psychProfile.trustLevel * 0.3;
    threat += contestant.psychProfile.suspicionLevel * 0.2;
    
    // Alliance considerations
    const contestantAlliances = alliances.filter(a => a.members.includes(contestant.name));
    threat += contestantAlliances.length * 10;
    
    // Edit bias (production favorites get protected)
    threat -= contestant.psychProfile.editBias * 2;
    
    // Random factor for unpredictability
    threat += (Math.random() - 0.5) * 20;
    
    threatLevels.set(contestant.name, threat);
  });

  // Add player to threat calculation
  const playerThreat = 50 + (Math.random() - 0.5) * 30;
  threatLevels.set(playerName, playerThreat);

  // Generate votes based on relationships and threat levels
  const votes: { [voterName: string]: string } = {};
  const voteCounts = new Map<string, number>();

  activeContestants.forEach(voter => {
    if (voter.name === playerName) return; // Player votes separately
    
    // Find target with highest threat that isn't in voter's alliance
    const voterAlliances = alliances.filter(a => a.members.includes(voter.name));
    const allianceMembers = new Set(voterAlliances.flatMap(a => a.members));
    
    let targetName = '';
    let highestThreat = -Infinity;
    
    [...activeContestants, { name: playerName }].forEach(target => {
      if (target.name === voter.name) return;
      if (allianceMembers.has(target.name) && Math.random() > 0.1) return; // 90% alliance loyalty
      
      const threat = threatLevels.get(target.name) || 0;
      
      // Factor in personal relationships
      let personalModifier = 0;
      if (target.name !== playerName) {
        const relationship = voter.memory.filter(m => 
          m.participants.includes(target.name) && m.type === 'conversation'
        ).reduce((sum, m) => sum + m.emotionalImpact, 0);
        personalModifier = -relationship * 5;
      }
      
      const finalThreat = threat + personalModifier;
      
      if (finalThreat > highestThreat) {
        highestThreat = finalThreat;
        targetName = target.name;
      }
    });
    
    votes[voter.name] = targetName;
    const currentCount = voteCounts.get(targetName) || 0;
    voteCounts.set(targetName, currentCount + 1);
  });

  // Find who received the most votes
  let eliminated = '';
  let maxVotes = 0;
  
  voteCounts.forEach((count, name) => {
    if (count > maxVotes) {
      maxVotes = count;
      eliminated = name;
    }
  });

  // If player received most votes, they're eliminated
  const reason = eliminated === playerName 
    ? 'You have been eliminated by the other contestants'
    : `${eliminated} was seen as the biggest threat and received ${maxVotes} votes`;

  return {
    day: 0, // Will be set by caller
    eliminated,
    votes,
    reason
  };
};
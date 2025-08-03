import { Contestant } from '@/types/game';

// Calculate trust delta based on tone and contestant disposition
export const getTrustDelta = (tone: string, disposition: string[]): number => {
  let baseDelta = 0;
  
  switch (tone) {
    case 'friendly':
      baseDelta = disposition.includes('trusting') ? 8 : disposition.includes('suspicious') ? 2 : 5;
      break;
    case 'strategic':
      baseDelta = disposition.includes('calculating') ? 6 : disposition.includes('honest') ? -2 : 3;
      break;
    case 'aggressive':
      baseDelta = disposition.includes('confrontational') ? 2 : disposition.includes('diplomatic') ? -15 : -8;
      break;
    case 'flirty':
      baseDelta = disposition.includes('trusting') ? 7 : disposition.includes('paranoid') ? -5 : 4;
      break;
    case 'suspicious':
      baseDelta = disposition.includes('paranoid') ? 5 : disposition.includes('loyal') ? -8 : -3;
      break;
    default:
      baseDelta = 1;
  }

  // Add random variance
  return baseDelta + Math.floor(Math.random() * 3 - 1);
};

// Calculate suspicion delta based on tone and content
export const getSuspicionDelta = (tone: string, content: string): number => {
  let baseDelta = 0;
  
  // Analyze content for suspicious keywords
  const suspiciousWords = ['vote', 'eliminate', 'target', 'alliance', 'secret', 'plan', 'strategy'];
  const suspiciousWordCount = suspiciousWords.filter(word => 
    content.toLowerCase().includes(word)
  ).length;
  
  switch (tone) {
    case 'suspicious':
      baseDelta = 10 + suspiciousWordCount * 2;
      break;
    case 'strategic':
      baseDelta = 5 + suspiciousWordCount * 3;
      break;
    case 'aggressive':
      baseDelta = 8 + suspiciousWordCount;
      break;
    case 'friendly':
      baseDelta = Math.max(0, suspiciousWordCount * 2 - 2);
      break;
    default:
      baseDelta = suspiciousWordCount;
  }

  return Math.min(20, baseDelta);
};

// Calculate chance of message leak based on contestant psychology
export const calculateLeakChance = (psychProfile: any): number => {
  let baseChance = 0.1; // 10% base chance
  
  // Increase based on disposition
  if (psychProfile.disposition.includes('honest')) baseChance += 0.2;
  if (psychProfile.disposition.includes('rebellious')) baseChance += 0.15;
  if (psychProfile.disposition.includes('paranoid')) baseChance += 0.1;
  if (psychProfile.disposition.includes('loyal')) baseChance -= 0.15;
  if (psychProfile.disposition.includes('deceptive')) baseChance -= 0.1;
  
  // Adjust based on trust level
  baseChance += (50 - psychProfile.trustLevel) / 500; // Lower trust = higher leak chance
  
  // Adjust based on suspicion level
  baseChance += psychProfile.suspicionLevel / 1000;
  
  return Math.max(0, Math.min(0.8, baseChance));
};

// Calculate success chance of schemes
export const calculateSchemeSuccess = (
  playerName: string, 
  target: Contestant, 
  content: string, 
  schemeType: string
): boolean => {
  let successChance = 0.5; // 50% base chance
  
  // Adjust based on target's trust level with player
  successChance += target.psychProfile.trustLevel / 200; // Higher trust = higher success
  
  // Adjust based on target's suspicion level
  successChance -= target.psychProfile.suspicionLevel / 200;
  
  // Adjust based on scheme type
  switch (schemeType) {
    case 'vote_manipulation':
      successChance += target.psychProfile.disposition.includes('conformist') ? 0.2 : -0.1;
      break;
    case 'alliance_break':
      successChance += target.psychProfile.disposition.includes('paranoid') ? 0.15 : -0.2;
      break;
    case 'rumor_spread':
      successChance += target.psychProfile.disposition.includes('reactive') ? 0.2 : -0.1;
      break;
    case 'fake_alliance':
      successChance += target.psychProfile.disposition.includes('trusting') ? 0.25 : -0.15;
      break;
    case 'information_trade':
      successChance += target.psychProfile.disposition.includes('calculating') ? 0.1 : 0;
      break;
  }
  
  // Content quality affects success
  if (content.length > 50) successChance += 0.1; // Detailed schemes are more convincing
  if (content.toLowerCase().includes('trust')) successChance += 0.05;
  
  // Random factor
  successChance += (Math.random() - 0.5) * 0.2;
  
  return Math.random() < Math.max(0.1, Math.min(0.9, successChance));
};

// Generate dynamic NPC interactions based on memory and relationships
export const generateNPCInteractions = (contestants: Contestant[], currentDay: number): any[] => {
  const interactions = [];
  
  for (let i = 0; i < contestants.length; i++) {
    for (let j = i + 1; j < contestants.length; j++) {
      const contestant1 = contestants[i];
      const contestant2 = contestants[j];
      
      if (contestant1.isEliminated || contestant2.isEliminated) continue;
      
      // Calculate relationship tension
      const sharedMemories = contestant1.memory.filter(m => 
        m.participants.includes(contestant2.name)
      );
      
      const tensionLevel = sharedMemories.reduce((sum, m) => sum + Math.abs(m.emotionalImpact), 0);
      
      // Generate interaction if tension is high enough
      if (tensionLevel > 5 || Math.random() < 0.3) {
        const interactionType = tensionLevel > 10 ? 'conflict' : 
                               tensionLevel > 7 ? 'tension' : 'neutral';
        
        interactions.push({
          participants: [contestant1.name, contestant2.name],
          type: interactionType,
          description: generateInteractionDescription(contestant1, contestant2, interactionType),
          impact: Math.floor(tensionLevel),
          day: currentDay
        });
      }
    }
  }
  
  return interactions.slice(0, 3); // Limit to 3 interactions per day
};

// Generate description for NPC interactions
const generateInteractionDescription = (c1: Contestant, c2: Contestant, type: string): string => {
  const descriptions = {
    conflict: [
      `${c1.name} and ${c2.name} had a heated argument about game strategy`,
      `Tension exploded between ${c1.name} and ${c2.name} during dinner`,
      `${c1.name} accused ${c2.name} of being untrustworthy`
    ],
    tension: [
      `${c1.name} seemed uncomfortable around ${c2.name}`,
      `${c1.name} and ${c2.name} avoided each other most of the day`,
      `There's visible tension between ${c1.name} and ${c2.name}`
    ],
    neutral: [
      `${c1.name} and ${c2.name} had a casual conversation`,
      `${c1.name} and ${c2.name} discussed the weather and food`,
      `${c1.name} and ${c2.name} shared a quiet moment together`
    ]
  };
  
  const options = descriptions[type as keyof typeof descriptions];
  return options[Math.floor(Math.random() * options.length)];
};
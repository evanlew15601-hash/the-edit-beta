import { Contestant } from '@/types/game';

const names = [
  'Alex', 'Morgan', 'River', 'Sage', 'Quinn', 'Blake', 'Rowan', 'Kai', 
  'Ari', 'Nova', 'Zara', 'Phoenix', 'Dakota', 'Ember', 'Lux', 'Vale'
];

const personas = [
  'The Charmer', 'The Strategist', 'The Wildcard', 'The Loyalist', 
  'The Instigator', 'The Peacekeeper', 'The Outsider', 'The Competitor',
  'The Manipulator', 'The Truth-Teller', 'The Follower', 'The Rebel'
];

const dispositions = [
  ['trusting', 'optimistic'], ['suspicious', 'calculating'], ['impulsive', 'emotional'],
  ['loyal', 'reliable'], ['paranoid', 'reactive'], ['diplomatic', 'cautious'],
  ['independent', 'analytical'], ['competitive', 'driven'], ['deceptive', 'cunning'],
  ['honest', 'direct'], ['conformist', 'agreeable'], ['rebellious', 'confrontational']
];

export const generateContestants = (count: number): Contestant[] => {
  const shuffledNames = [...names].sort(() => Math.random() - 0.5);
  const shuffledPersonas = [...personas].sort(() => Math.random() - 0.5);
  
  return Array.from({ length: count }, (_, index) => {
    const name = shuffledNames[index];
    const persona = shuffledPersonas[index];
    const disposition = dispositions[index % dispositions.length];
    
    // One contestant will be secretly a mole (revealed later)
    const isMole = index === Math.floor(Math.random() * count);
    
    return {
      id: `contestant_${index + 1}`,
      name,
      publicPersona: persona,
      psychProfile: {
        disposition,
        trustLevel: 0, // Start neutral relationship with player
        suspicionLevel: Math.floor(Math.random() * 30),
        emotionalCloseness: 0, // Start neutral emotional connection
        editBias: Math.floor(Math.random() * 20) - 10
      },
      memory: [],
      isEliminated: false,
      isMole
    };
  });
};
import { MemorySystem, PrivateJournal, GameMemoryEvent, GossipNetwork, MemoryQuery, MemorySearchResult } from '@/types/memory';
import { Contestant, GameState } from '@/types/game';

export class MemoryEngine {
  private memory: MemorySystem = {
    privateJournals: {},
    sharedMemory: [],
    gossipNetwork: [],
    weeklyEvents: {}
  };

  initializeJournals(contestants: Contestant[]): void {
    contestants.forEach(contestant => {
      this.memory.privateJournals[contestant.id] = {
        contestantId: contestant.id,
        currentStrategy: this.generateInitialStrategy(contestant),
        shortTermGoals: this.generateInitialGoals(contestant, 'short'),
        longTermGoals: this.generateInitialGoals(contestant, 'long'),
        votingPlan: '',
        allianceNotes: {},
        threatAssessment: {},
        personalBonds: {},
        promises: [],
        secrets: [],
        memoryEvents: []
      };
    });
  }

  private generateInitialStrategy(contestant: Contestant): string {
    const strategies = [
      'Fly under the radar until jury phase',
      'Build strong alliances early and stay loyal',
      'Play aggressively and eliminate threats',
      'Float between alliances as needed',
      'Focus on winning challenges for safety',
      'Use social bonds to secure votes',
      'Create chaos to advance position'
    ];
    
    const personality = contestant.psychProfile;
    
    if (personality.trustLevel > 70) {
      return 'Build strong alliances early and stay loyal';
    } else if (personality.suspicionLevel > 70) {
      return 'Play aggressively and eliminate threats';
    } else if (personality.disposition.includes('strategic')) {
      return 'Float between alliances as needed';
    } else {
      return strategies[Math.floor(Math.random() * strategies.length)];
    }
  }

  private generateInitialGoals(contestant: Contestant, term: 'short' | 'long'): string[] {
    const shortGoals = [
      'Avoid being nominated',
      'Win next immunity challenge',
      'Form alliance with strong players',
      'Gather information about voting plans',
      'Build trust with majority'
    ];

    const longGoals = [
      'Make it to final 4',
      'Control jury votes',
      'Eliminate biggest threats',
      'Maintain alliance loyalty',
      'Build resume for finale'
    ];

    const goals = term === 'short' ? shortGoals : longGoals;
    return goals.slice(0, 2 + Math.floor(Math.random() * 2));
  }

  recordEvent(event: Omit<GameMemoryEvent, 'id'>): GameMemoryEvent {
    const fullEvent: GameMemoryEvent = {
      ...event,
      id: `${event.day}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Add to shared memory
    this.memory.sharedMemory.push(fullEvent);

    // Add to weekly events
    const week = Math.ceil(event.day / 7);
    if (!this.memory.weeklyEvents[week]) {
      this.memory.weeklyEvents[week] = [];
    }
    this.memory.weeklyEvents[week].push(fullEvent);

    // Add to participant journals
    event.participants.forEach(participantName => {
      const participant = this.findContestantByName(participantName);
      if (participant) {
        this.memory.privateJournals[participant].memoryEvents.push(fullEvent);
      }
    });

    return fullEvent;
  }

  private findContestantByName(name: string): string | null {
    return Object.keys(this.memory.privateJournals).find(id => {
      // This is a simplified lookup - in practice you'd need contestant name mapping
      return id.includes(name.toLowerCase().replace(/\s/g, ''));
    }) || null;
  }

  recordPromise(from: string, to: string, promise: string, day: number): void {
    const fromJournal = this.memory.privateJournals[from];
    const toJournal = this.memory.privateJournals[to];

    if (fromJournal) {
      fromJournal.promises.push({ to, promise, day, kept: null });
    }

    // The recipient also remembers the promise
    this.recordEvent({
      day,
      type: 'promise',
      participants: [from, to],
      content: `${from} promised ${to}: ${promise}`,
      emotionalImpact: 3,
      reliability: 'confirmed',
      strategicImportance: 7
    });
  }

  recordSecret(about: string, secret: string, knownBy: string, day: number): void {
    const journal = this.memory.privateJournals[knownBy];
    if (journal) {
      journal.secrets.push({ about, secret, day, sharedWith: [] });
    }
  }

  shareSecret(secretHolder: string, recipient: string, about: string): boolean {
    const holderJournal = this.memory.privateJournals[secretHolder];
    const recipientJournal = this.memory.privateJournals[recipient];

    if (!holderJournal || !recipientJournal) return false;

    const secret = holderJournal.secrets.find(s => s.about === about);
    if (!secret) return false;

    // Add to shared list
    secret.sharedWith.push(recipient);

    // Recipient learns the secret
    recipientJournal.secrets.push({
      about: secret.about,
      secret: secret.secret,
      day: secret.day,
      sharedWith: [secretHolder]
    });

    return true;
  }

  spreadGossip(info: string, source: string, day: number, reliability: GossipNetwork['reliability']): void {
    const gossip: GossipNetwork = {
      info,
      source,
      day,
      spreadTo: [],
      reliability,
      strategicValue: reliability === 'confirmed' ? 8 : reliability === 'rumor' ? 5 : 2
    };

    this.memory.gossipNetwork.push(gossip);
  }

  updateThreatAssessment(assessor: string, target: string, threatLevel: number): void {
    const journal = this.memory.privateJournals[assessor];
    if (journal) {
      journal.threatAssessment[target] = Math.max(0, Math.min(10, threatLevel));
    }
  }

  updatePersonalBond(person1: string, person2: string, bondStrength: number): void {
    const journal1 = this.memory.privateJournals[person1];
    const journal2 = this.memory.privateJournals[person2];

    const clampedBond = Math.max(-5, Math.min(5, bondStrength));

    if (journal1) {
      journal1.personalBonds[person2] = clampedBond;
    }
    if (journal2) {
      journal2.personalBonds[person1] = clampedBond;
    }
  }

  queryMemory(contestantId: string, query: MemoryQuery): MemorySearchResult {
    const journal = this.memory.privateJournals[contestantId];
    if (!journal) {
      return { events: [], relevantGossip: [], personalNotes: [] };
    }

    let events = [...journal.memoryEvents];

    // Apply filters
    if (query.participantFilter) {
      events = events.filter(e => 
        query.participantFilter!.some(p => e.participants.includes(p))
      );
    }

    if (query.typeFilter) {
      events = events.filter(e => query.typeFilter!.includes(e.type));
    }

    if (query.dayRange) {
      events = events.filter(e => 
        e.day >= query.dayRange!.start && e.day <= query.dayRange!.end
      );
    }

    if (query.minImportance !== undefined) {
      events = events.filter(e => e.strategicImportance >= query.minImportance!);
    }

    if (query.reliability) {
      events = events.filter(e => query.reliability!.includes(e.reliability));
    }

    // Get relevant gossip
    const relevantGossip = this.memory.gossipNetwork.filter(g => 
      g.spreadTo.includes(contestantId) || g.source === contestantId
    );

    // Generate personal notes based on strategy and relationships
    const personalNotes = this.generatePersonalNotes(journal);

    return {
      events: events.sort((a, b) => b.day - a.day),
      relevantGossip: relevantGossip.sort((a, b) => b.day - a.day),
      personalNotes
    };
  }

  private generatePersonalNotes(journal: PrivateJournal): string[] {
    const notes: string[] = [];
    
    // Notes about promises
    journal.promises.forEach(p => {
      if (p.kept === null) {
        notes.push(`Must follow through on promise to ${p.to}: ${p.promise}`);
      } else if (p.kept === false) {
        notes.push(`Broke promise to ${p.to} - they may not trust me`);
      }
    });

    // Notes about threats
    Object.entries(journal.threatAssessment).forEach(([person, threat]) => {
      if (threat > 7) {
        notes.push(`${person} is a major threat - consider voting them out`);
      }
    });

    // Notes about allies
    Object.entries(journal.personalBonds).forEach(([person, bond]) => {
      if (bond > 3) {
        notes.push(`${person} is a close ally - protect them`);
      } else if (bond < -3) {
        notes.push(`${person} dislikes me - be careful around them`);
      }
    });

    return notes.slice(0, 5); // Limit to most important notes
  }

  updateVotingPlan(contestantId: string, target: string, reasoning: string): void {
    const journal = this.memory.privateJournals[contestantId];
    if (journal) {
      journal.votingPlan = target;
      
      // Record the reasoning as a memory event
      this.recordEvent({
        day: this.getCurrentDay(),
        type: 'vote',
        participants: [contestantId],
        content: `Planning to vote for ${target}: ${reasoning}`,
        emotionalImpact: 0,
        reliability: 'confirmed',
        strategicImportance: 9
      });
    }
  }

  private getCurrentDay(): number {
    // This would be provided by the game state
    return Math.max(...this.memory.sharedMemory.map(e => e.day), 1);
  }

  getStrategicContext(contestantId: string, gameState: GameState): {
    currentStrategy: string;
    recentEvents: string[];
    topThreats: string[];
    allies: string[];
  } | null {
    const journal = this.memory.privateJournals[contestantId];
    if (!journal) return null;

    const recentEvents = journal.memoryEvents
      .filter(e => e.day >= gameState.currentDay - 3)
      .sort((a, b) => b.strategicImportance - a.strategicImportance);

    const topThreats = Object.entries(journal.threatAssessment)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([name]) => name);

    const closestAllies = Object.entries(journal.personalBonds)
      .filter(([,bond]) => bond > 2)
      .sort(([,a], [,b]) => b - a)
      .map(([name]) => name);

    return {
      currentStrategy: journal.currentStrategy,
      recentEvents: recentEvents.slice(0, 3).map(e => e.content),
      topThreats,
      allies: closestAllies
    };
  }

  getMemorySystem(): MemorySystem {
    return this.memory;
  }

  resetMemory(): void {
    this.memory = {
      privateJournals: {},
      sharedMemory: [],
      gossipNetwork: [],
      weeklyEvents: {}
    };
  }
}

export const memoryEngine = new MemoryEngine();
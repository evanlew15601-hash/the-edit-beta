import { Contestant, GameState, GameMemory } from '@/types/game';
import { relationshipGraphEngine } from './relationshipGraphEngine';
import { NPCDecision, npcAutonomyEngine } from './npcAutonomyEngine';

export type EmergentEvent = {
  id: string;
  type: 'conflict' | 'alliance_formation' | 'betrayal' | 'romance' | 'rumor_spread' | 'confession_leak' | 'power_shift';
  participants: string[];
  description: string;
  triggers: string[];
  consequences: EventConsequence[];
  dramaTension: number; // 0-100
  day: number;
  playerInvolvement: 'none' | 'witness' | 'participant' | 'catalyst';
  outcome?: 'resolved' | 'escalated' | 'ongoing';
};

export type EventConsequence = {
  type: 'relationship_change' | 'alliance_shift' | 'vote_influence' | 'edit_impact' | 'memory_creation';
  targets: string[];
  values: { [key: string]: number };
  description: string;
};

export type EventSeed = {
  probability: number; // 0-1
  requiredConditions: EventCondition[];
  eventGenerator: () => EmergentEvent;
};

export type EventCondition = {
  type: 'relationship_threshold' | 'motive_intensity' | 'memory_count' | 'time_elapsed' | 'social_standing';
  participants?: string[];
  threshold: number;
  comparison: 'greater' | 'less' | 'equal';
};

class EmergentEventEngine {
  private activeEvents: EmergentEvent[] = [];
  private eventSeeds: Map<string, EventSeed[]> = new Map();
  private lastEventTime: Map<string, number> = new Map();
  private dramaTensionLevels: Map<string, number> = new Map();

  // Initialize event seeding system
  initializeEventSeeds(): void {
    this.setupConflictSeeds();
    this.setupAllianceSeeds();
    this.setupBetrayalSeeds();
    this.setupRomanceSeeds();
    this.setupRumorSeeds();
    this.setupConfessionSeeds();
  }

  // Main event generation - called every game cycle
  generateEmergentEvents(gameState: GameState): EmergentEvent[] {
    const newEvents: EmergentEvent[] = [];
    
    // Update drama tension levels
    this.updateDramaTension(gameState);
    
    // Check for spontaneous events based on current conditions
    const spontaneousEvents = this.checkSpontaneousEvents(gameState);
    newEvents.push(...spontaneousEvents);
    
    // Generate personality-driven events from memories and relationships
    const memoryEvents = this.generateMemoryBasedEvents(gameState);
    newEvents.push(...memoryEvents);
    
    // Generate escalation events from existing tensions
    const escalationEvents = this.generateEscalationEvents(gameState);
    newEvents.push(...escalationEvents);
    
    // Ensure minimum drama level
    if (newEvents.length === 0 && this.shouldForceEvent(gameState)) {
      const forcedEvent = this.generateMinimumDramaEvent(gameState);
      if (forcedEvent) newEvents.push(forcedEvent);
    }

    // If any events fired, record the time for pacing checks
    if (newEvents.length > 0) {
      const now = Date.now();
      this.lastEventTime.set('global', now);
    }
    
    // Process event consequences
    newEvents.forEach(event => {
      this.processEventConsequences(event, gameState);
      this.activeEvents.push(event);
    });
    
    // Clean up old events
    this.cleanupOldEvents(gameState.currentDay);
    
    return newEvents;
  }

  private setupConflictSeeds(): void {
    const conflictSeeds: EventSeed[] = [
      {
        probability: 0.7,
        requiredConditions: [
          {
            type: 'relationship_threshold',
            threshold: -30,
            comparison: 'less'
          }
        ],
        eventGenerator: () => this.generateConflictEvent()
      },
      {
        probability: 0.5,
        requiredConditions: [
          {
            type: 'motive_intensity',
            threshold: 80,
            comparison: 'greater'
          }
        ],
        eventGenerator: () => this.generateMotivatedConflict()
      }
    ];
    
    this.eventSeeds.set('conflict', conflictSeeds);
  }

  private setupAllianceSeeds(): void {
    const allianceSeeds: EventSeed[] = [
      {
        probability: 0.6,
        requiredConditions: [
          {
            type: 'relationship_threshold',
            threshold: 70,
            comparison: 'greater'
          }
        ],
        eventGenerator: () => this.generateAllianceFormation()
      }
    ];
    
    this.eventSeeds.set('alliance', allianceSeeds);
  }

  private setupBetrayalSeeds(): void {
    const betrayalSeeds: EventSeed[] = [
      {
        probability: 0.4,
        requiredConditions: [
          {
            type: 'motive_intensity',
            threshold: 75,
            comparison: 'greater'
          }
        ],
        eventGenerator: () => this.generateBetrayalEvent()
      }
    ];
    
    this.eventSeeds.set('betrayal', betrayalSeeds);
  }

  private setupRomanceSeeds(): void {
    const romanceSeeds: EventSeed[] = [
      {
        probability: 0.3,
        requiredConditions: [
          {
            type: 'relationship_threshold',
            threshold: 80,
            comparison: 'greater'
          }
        ],
        eventGenerator: () => this.generateRomanceEvent()
      }
    ];
    
    this.eventSeeds.set('romance', romanceSeeds);
  }

  private setupRumorSeeds(): void {
    const rumorSeeds: EventSeed[] = [
      {
        probability: 0.8,
        requiredConditions: [
          {
            type: 'memory_count',
            threshold: 3,
            comparison: 'greater'
          }
        ],
        eventGenerator: () => this.generateRumorSpread()
      }
    ];
    
    this.eventSeeds.set('rumor', rumorSeeds);
  }

  private setupConfessionSeeds(): void {
    const confessionSeeds: EventSeed[] = [
      {
        probability: 0.2,
        requiredConditions: [
          {
            type: 'motive_intensity',
            threshold: 90,
            comparison: 'greater'
          }
        ],
        eventGenerator: () => this.generateConfessionLeak()
      }
    ];
    
    this.eventSeeds.set('confession', confessionSeeds);
  }

  private updateDramaTension(gameState: GameState): void {
    const nonPlayerContestants = gameState.contestants.filter(
      contestant => !contestant.isEliminated && contestant.name !== gameState.playerName
    );

    nonPlayerContestants.forEach(contestant => {
      let tension = 0;

      // Calculate tension from relationships
      const relationships = relationshipGraphEngine.getRelationshipsForContestant(contestant.name);
      const relCount = relationships.length || 1;
      const averageSuspicion = relationships.reduce((sum, rel) => sum + rel.suspicion, 0) / relCount;
      const averageTrust = relationships.reduce((sum, rel) => sum + rel.trust, 0) / relCount;

      tension += averageSuspicion;
      tension += Math.max(0, 50 - averageTrust);

      // Add tension from recent negative memories
      const recentNegativeMemories = contestant.memory.filter(m =>
        m.day >= gameState.currentDay - 3 && m.emotionalImpact < -3
      );
      tension += recentNegativeMemories.length * 10;

      // Add tension from motives
      const motives = npcAutonomyEngine.getNPCMotives(contestant.name);
      const highIntensityMotives = motives.filter(m => m.intensity > 70);
      tension += highIntensityMotives.length * 15;

      this.dramaTensionLevels.set(contestant.name, Math.min(100, tension));
    });
  }

  private checkSpontaneousEvents(gameState: GameState): EmergentEvent[] {
    const events: EmergentEvent[] = [];
    
    this.eventSeeds.forEach((seeds, category) => {
      seeds.forEach(seed => {
        if (this.evaluateConditions(seed.requiredConditions, gameState) && 
            Math.random() < seed.probability) {
          events.push(seed.eventGenerator());
        }
      });
    });
    
    return events;
  }

  private generateMemoryBasedEvents(gameState: GameState): EmergentEvent[] {
    const events: EmergentEvent[] = [];
    
    // Look for patterns in memories that could trigger events
    const nonPlayerContestants = gameState.contestants.filter(c => !c.isEliminated && c.name !== gameState.playerName);
    nonPlayerContestants.forEach(contestant => {
      // Check for revenge triggers
      const betrayalMemories = contestant.memory.filter(m => 
        m.type === 'scheme' && m.emotionalImpact < -5 && m.day >= gameState.currentDay - 5
      );
      
      if (betrayalMemories.length > 0 && Math.random() < 0.4) {
        const revengeEvent = this.generateRevengeEvent(contestant, betrayalMemories[0]);
        if (revengeEvent) events.push(revengeEvent);
      }
      
      // Check for alliance opportunities from positive memories
      const positiveMemories = contestant.memory.filter(m => 
        m.type === 'conversation' && m.emotionalImpact > 5 && m.day >= gameState.currentDay - 3
      );
      
      if (positiveMemories.length >= 2 && Math.random() < 0.3) {
        const allianceEvent = this.generateMemoryBasedAlliance(contestant, positiveMemories);
        if (allianceEvent) events.push(allianceEvent);
      }
    });
    
    return events;
  }

  private generateEscalationEvents(gameState: GameState): EmergentEvent[] {
    const events: EmergentEvent[] = [];
    
    // Look for ongoing events that can escalate
    this.activeEvents.forEach(event => {
      if (event.outcome === 'ongoing' && event.dramaTension > 60) {
        if (Math.random() < 0.3) {
          const escalation = this.generateEscalation(event, gameState);
          if (escalation) events.push(escalation);
        }
      }
    });
    
    return events;
  }

  private shouldForceEvent(gameState: GameState): boolean {
    // Force an event if drama is too low, or it has been a long time since the last one.
    const tensionValues = Array.from(this.dramaTensionLevels.values());
    const averageTension = tensionValues.length
      ? tensionValues.reduce((sum, tension) => sum + tension, 0) / tensionValues.length
      : 0;

    const lastTimes = Array.from(this.lastEventTime.values());
    const timeSinceLastEvent = lastTimes.length
      ? Date.now() - Math.max(...lastTimes)
      : Infinity;
    
    return averageTension < 30 || timeSinceLastEvent > 600000; // 10 minutes
  }

  private generateMinimumDramaEvent(gameState: GameState): EmergentEvent | null {
    // Generate a low-key drama event to maintain engagement
    const activeNonPlayer = gameState.contestants.filter(c => !c.isEliminated && c.name !== gameState.playerName);
    
    if (activeNonPlayer.length < 2) return null;
    
    const randomPair = this.getRandomPair(activeNonPlayer);
    
    return {
      id: `forced-drama-${Date.now()}`,
      type: 'rumor_spread',
      participants: [randomPair[0].name, randomPair[1].name],
      description: `${randomPair[0].name} was overheard making comments about ${randomPair[1].name}'s game strategy`,
      triggers: ['low_drama_threshold'],
      consequences: [
        {
          type: 'relationship_change',
          targets: [randomPair[0].name, randomPair[1].name],
          values: { suspicion: 15, trust: -10 },
          description: 'Increased suspicion from overheard comments'
        }
      ],
      dramaTension: 40,
      day: gameState.currentDay,
      playerInvolvement: 'witness',
      outcome: 'ongoing'
    };
  }

  private generateConflictEvent(): EmergentEvent {
    return {
      id: `conflict-${Date.now()}`,
      type: 'conflict',
      participants: [],
      description: 'A heated argument erupted during dinner',
      triggers: ['high_suspicion'],
      consequences: [],
      dramaTension: 70,
      day: 0,
      playerInvolvement: 'witness'
    };
  }

  private generateMotivatedConflict(): EmergentEvent {
    return {
      id: `motivated-conflict-${Date.now()}`,
      type: 'conflict',
      participants: [],
      description: 'Tensions finally boiled over into confrontation',
      triggers: ['motive_intensity'],
      consequences: [],
      dramaTension: 85,
      day: 0,
      playerInvolvement: 'witness'
    };
  }

  private generateAllianceFormation(): EmergentEvent {
    return {
      id: `alliance-${Date.now()}`,
      type: 'alliance_formation',
      participants: [],
      description: 'A new alliance was secretly formed',
      triggers: ['high_trust'],
      consequences: [],
      dramaTension: 50,
      day: 0,
      playerInvolvement: 'none'
    };
  }

  private generateBetrayalEvent(): EmergentEvent {
    return {
      id: `betrayal-${Date.now()}`,
      type: 'betrayal',
      participants: [],
      description: 'An alliance was broken through betrayal',
      triggers: ['high_motive_intensity'],
      consequences: [],
      dramaTension: 90,
      day: 0,
      playerInvolvement: 'witness'
    };
  }

  private generateRomanceEvent(): EmergentEvent {
    return {
      id: `romance-${Date.now()}`,
      type: 'romance',
      participants: [],
      description: 'Romance is blooming between contestants',
      triggers: ['high_emotional_closeness'],
      consequences: [],
      dramaTension: 30,
      day: 0,
      playerInvolvement: 'witness'
    };
  }

  private generateRumorSpread(): EmergentEvent {
    return {
      id: `rumor-${Date.now()}`,
      type: 'rumor_spread',
      participants: [],
      description: 'Whispers and rumors are circulating',
      triggers: ['memory_accumulation'],
      consequences: [],
      dramaTension: 60,
      day: 0,
      playerInvolvement: 'participant'
    };
  }

  private generateConfessionLeak(): EmergentEvent {
    return {
      id: `confession-leak-${Date.now()}`,
      type: 'confession_leak',
      participants: [],
      description: 'Private confessions have leaked to other contestants',
      triggers: ['extreme_motive'],
      consequences: [],
      dramaTension: 80,
      day: 0,
      playerInvolvement: 'catalyst'
    };
  }

  private evaluateConditions(conditions: EventCondition[], gameState: GameState): boolean {
    return conditions.every(condition => {
      // Implementation would check actual game conditions
      return Math.random() < 0.3; // Placeholder
    });
  }

  private generateRevengeEvent(contestant: Contestant, triggerMemory: GameMemory): EmergentEvent | null {
    const targets = triggerMemory.participants.filter(p => p !== contestant.name);
    if (targets.length === 0) return null;
    
    return {
      id: `revenge-${Date.now()}`,
      type: 'conflict',
      participants: [contestant.name, targets[0]],
      description: `${contestant.name} confronted ${targets[0]} about past betrayal`,
      triggers: ['revenge_memory'],
      consequences: [
        {
          type: 'relationship_change',
          targets: [contestant.name, targets[0]],
          values: { trust: -20, suspicion: 25 },
          description: 'Confrontation damaged relationship further'
        }
      ],
      dramaTension: 75,
      day: 0,
      playerInvolvement: 'witness',
      outcome: 'escalated'
    };
  }

  private generateMemoryBasedAlliance(contestant: Contestant, memories: GameMemory[]): EmergentEvent | null {
    const potentialAllies = memories.flatMap(m => m.participants).filter(p => p !== contestant.name);
    if (potentialAllies.length === 0) return null;
    
    const ally = potentialAllies[0];
    
    return {
      id: `memory-alliance-${Date.now()}`,
      type: 'alliance_formation',
      participants: [contestant.name, ally],
      description: `${contestant.name} and ${ally} decided to form a secret alliance`,
      triggers: ['positive_memory_pattern'],
      consequences: [
        {
          type: 'alliance_shift',
          targets: [contestant.name, ally],
          values: { allianceStrength: 60 },
          description: 'Secret alliance formed'
        }
      ],
      dramaTension: 45,
      day: 0,
      playerInvolvement: 'none',
      outcome: 'resolved'
    };
  }

  private generateEscalation(baseEvent: EmergentEvent, gameState: GameState): EmergentEvent | null {
    return {
      id: `escalation-${baseEvent.id}-${Date.now()}`,
      type: baseEvent.type,
      participants: baseEvent.participants,
      description: `The situation between ${baseEvent.participants.join(' and ')} has escalated further`,
      triggers: ['event_escalation'],
      consequences: [
        {
          type: 'relationship_change',
          targets: baseEvent.participants,
          values: { suspicion: 20, trust: -15 },
          description: 'Escalation worsened relationships'
        }
      ],
      dramaTension: Math.min(100, baseEvent.dramaTension + 20),
      day: gameState.currentDay,
      playerInvolvement: baseEvent.playerInvolvement,
      outcome: 'ongoing'
    };
  }

  private processEventConsequences(event: EmergentEvent, gameState: GameState): void {
    event.consequences.forEach(consequence => {
      switch (consequence.type) {
        case 'relationship_change':
          this.applyRelationshipChanges(consequence, gameState.currentDay);
          break;
        case 'alliance_shift':
          this.applyAllianceChanges(consequence);
          break;
        case 'memory_creation':
          this.createEventMemories(event, gameState);
          break;
      }
    });
  }

  private applyRelationshipChanges(consequence: EventConsequence, currentDay: number): void {
    if (consequence.targets.length >= 2) {
      const source = consequence.targets[0];
      const target = consequence.targets[1];
      
      relationshipGraphEngine.updateRelationship(
        source,
        target,
        consequence.values.trust || 0,
        consequence.values.suspicion || 0,
        consequence.values.emotionalCloseness || 0,
        'confrontation',
        consequence.description,
        currentDay
      );
    }
  }

  private applyAllianceChanges(consequence: EventConsequence): void {
    if (consequence.targets.length >= 2) {
      relationshipGraphEngine.formAlliance(
        consequence.targets[0],
        consequence.targets[1],
        consequence.values.allianceStrength || 50
      );
    }
  }

  private createEventMemories(event: EmergentEvent, gameState: GameState): void {
    event.participants.forEach(participantName => {
      const contestant = gameState.contestants.find(c => c.name === participantName);
      if (contestant && !contestant.isEliminated) {
        const memory: GameMemory = {
          day: gameState.currentDay,
          type: 'observation',
          participants: event.participants,
          content: event.description,
          emotionalImpact: event.dramaTension > 70 ? -5 : event.dramaTension > 40 ? 0 : 3,
          timestamp: Date.now()
        };
        
        contestant.memory.push(memory);
      }
    });
  }

  private cleanupOldEvents(currentDay: number): void {
    this.activeEvents = this.activeEvents.filter(event => {
      return currentDay - event.day <= 7; // Keep events for 7 days
    });
  }

  private getRandomPair(contestants: Contestant[]): [Contestant, Contestant] {
    const first = contestants[Math.floor(Math.random() * contestants.length)];
    const remaining = contestants.filter(c => c.id !== first.id);
    const second = remaining[Math.floor(Math.random() * remaining.length)];
    return [first, second];
  }

  // Debug methods
  getActiveEvents(): EmergentEvent[] {
    return [...this.activeEvents];
  }

  getDramaTension(contestantName: string): number {
    return this.dramaTensionLevels.get(contestantName) || 0;
  }
}

export const emergentEventEngine = new EmergentEventEngine();
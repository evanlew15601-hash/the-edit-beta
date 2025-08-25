import { GameState, Contestant, PlayerAction } from '@/types/game';
import { npcAutonomyEngine, NPCDecision } from './npcAutonomyEngine';
import { emergentEventEngine, EmergentEvent } from './emergentEventEngine';
import { npcResponseEngine, NPCResponse } from './npcResponseEngine';
import { relationshipGraphEngine } from './relationshipGraphEngine';
import { speechActClassifier } from './speechActClassifier';

export type GameUpdate = {
  npcDecisions: NPCDecision[];
  emergentEvents: EmergentEvent[];
  playerInteractionResults: NPCResponse[];
  systemStatusChecks: SystemCheck[];
  debugInfo?: DebugInfo;
};

export type SystemCheck = {
  system: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  recommendations?: string[];
};

export type DebugInfo = {
  dramaTensionLevels: { [npcName: string]: number };
  relationshipSummary: { [npcName: string]: any };
  npcMotives: { [npcName: string]: any[] };
  speechClassification?: any;
  playerProfile: any;
};

class GameSystemIntegrator {
  private isInitialized = false;
  private debugMode = false;
  private lastUpdateTime = 0;
  private updateInterval = 30000; // 30 seconds between autonomous updates

  // Initialize all AI systems
  initializeSystems(gameState: GameState, enableDebug = false): void {
    this.debugMode = enableDebug;
    
    // Initialize relationship graph
    relationshipGraphEngine.initializeRelationships(gameState.contestants);
    
    // Initialize NPC personalities and motives
    npcAutonomyEngine.initializeNPCs(gameState.contestants);
    
    // Initialize event seeding
    emergentEventEngine.initializeEventSeeds();
    
    this.isInitialized = true;
    this.lastUpdateTime = Date.now();
    
    console.log('🤖 AI Systems Initialized:', {
      contestants: gameState.contestants.length,
      debugMode: this.debugMode
    });
  }

  // Main system update - called periodically
  updateGameSystems(gameState: GameState): GameUpdate {
    if (!this.isInitialized) {
      this.initializeSystems(gameState, this.debugMode);
    }

    const currentTime = Date.now();
    const shouldUpdate = currentTime - this.lastUpdateTime > this.updateInterval;
    
    let npcDecisions: NPCDecision[] = [];
    let emergentEvents: EmergentEvent[] = [];
    
    if (shouldUpdate) {
      // Generate NPC autonomous decisions
      npcDecisions = npcAutonomyEngine.updateNPCAutonomy(gameState);
      
      // Generate emergent events
      emergentEvents = emergentEventEngine.generateEmergentEvents(gameState);
      
      // Process NPC decisions as events
      npcDecisions.forEach(decision => {
        this.processNPCDecision(decision, gameState);
      });
      
      this.lastUpdateTime = currentTime;
    }
    
    // Run system integrity checks
    const systemChecks = this.runSystemChecks(gameState);
    
    // Generate debug info if enabled
    const debugInfo = this.debugMode ? this.generateDebugInfo(gameState) : undefined;
    
    return {
      npcDecisions,
      emergentEvents,
      playerInteractionResults: [],
      systemStatusChecks: systemChecks,
      debugInfo
    };
  }

  // Process player action with advanced AI response
  processPlayerAction(action: PlayerAction, gameState: GameState): NPCResponse | null {
    if (!action.content || !action.target) return null;
    
    const response = npcResponseEngine.generateResponse(
      action.content,
      action.target,
      gameState,
      action.type === 'dm' ? 'private' : 'public'
    );
    
    // Process follow-up actions
    if (response.followUpAction) {
      this.scheduleFollowUpAction(response.followUpAction, action.target!, gameState);
    }
    
    // Create memories for both player and NPC
    this.createInteractionMemories(action, response, gameState);
    
    return response;
  }

  // Process NPC autonomous decisions
  private processNPCDecision(decision: NPCDecision, gameState: GameState): void {
    const actor = gameState.contestants.find(c => c.name === decision.actor);
    if (!actor || actor.isEliminated) return;
    
    switch (decision.type) {
      case 'initiate_conversation':
        this.processNPCInitiatedConversation(decision, gameState);
        break;
      case 'send_dm':
        this.processNPCDirectMessage(decision, gameState);
        break;
      case 'propose_alliance':
        this.processAllianceProposal(decision, gameState);
        break;
      case 'betray_alliance':
        this.processBetrayalAction(decision, gameState);
        break;
      case 'spread_rumor':
        this.processRumorSpread(decision, gameState);
        break;
      case 'confront':
        this.processConfrontation(decision, gameState);
        break;
      case 'flirt':
        this.processFlirtation(decision, gameState);
        break;
      case 'scheme':
        this.processScheme(decision, gameState);
        break;
    }
  }

  private processNPCInitiatedConversation(decision: NPCDecision, gameState: GameState): void {
    // Create a conversation event that the player can see/respond to
    const actor = gameState.contestants.find(c => c.name === decision.actor);
    if (!actor) return;
    
    // Add to actor's memory
    actor.memory.push({
      day: gameState.currentDay,
      type: 'conversation',
      participants: [decision.actor, decision.target || 'Player'],
      content: decision.content,
      emotionalImpact: 2,
      timestamp: Date.now()
    });
    
    // Update relationships
    if (decision.target) {
      relationshipGraphEngine.updateRelationship(
        decision.actor,
        decision.target,
        3, 0, 2,
        'conversation',
        'Initiated friendly conversation',
        gameState.currentDay
      );
}
  }

  private processNPCDirectMessage(decision: NPCDecision, gameState: GameState): void {
    // Handle NPC sending DM to player or other NPC
    const target = decision.target || 'Player';
    
    if (target === 'Player') {
      // Store as pending player notification
      // This would trigger a UI notification that player received a DM
    } else {
      // NPC to NPC communication
      const targetContestant = gameState.contestants.find(c => c.name === target);
      if (targetContestant && !targetContestant.isEliminated) {
        // Both NPCs remember this interaction
        [decision.actor, target].forEach(name => {
          const contestant = gameState.contestants.find(c => c.name === name);
          if (contestant) {
            contestant.memory.push({
              day: gameState.currentDay,
              type: 'dm',
              participants: [decision.actor, target],
              content: decision.content,
              emotionalImpact: 1,
              timestamp: Date.now()
            });
          }
        });
        
        // Update relationship
        relationshipGraphEngine.updateRelationship(
          decision.actor,
          target,
          2, -1, 3,
          'conversation',
          'Private message exchange',
          gameState.currentDay
        );
      }
    }
  }

  private processAllianceProposal(decision: NPCDecision, gameState: GameState): void {
    if (!decision.target) return;
    
    const targetContestant = gameState.contestants.find(c => c.name === decision.target);
    if (!targetContestant || targetContestant.isEliminated) return;
    
    // Check if target accepts alliance (based on their relationship and personality)
    const relationship = relationshipGraphEngine.getRelationship(decision.target, decision.actor);
    const acceptChance = relationship ? (relationship.trust + 50) / 150 : 0.3;
    
    if (Math.random() < acceptChance) {
      // Alliance formed
      relationshipGraphEngine.formAlliance(decision.actor, decision.target, 60);
      
      // Create memories
      [decision.actor, decision.target].forEach(name => {
        const contestant = gameState.contestants.find(c => c.name === name);
        if (contestant) {
          contestant.memory.push({
            day: gameState.currentDay,
            type: 'scheme',
            participants: [decision.actor, decision.target],
            content: `Secret alliance formed with ${name === decision.actor ? decision.target : decision.actor}`,
            emotionalImpact: 5,
            timestamp: Date.now()
          });
        }
      });
    } else {
      // Alliance rejected - creates suspicion
      relationshipGraphEngine.updateRelationship(
        decision.target,
        decision.actor,
        -5, 10, -2,
        'scheme',
        'Rejected alliance proposal',
        gameState.currentDay
      );
    }
  }

  private processBetrayalAction(decision: NPCDecision, gameState: GameState): void {
    if (!decision.target) return;
    
    // Break existing alliance
    relationshipGraphEngine.breakAlliance(decision.actor, decision.target, 70);
    
    // Create dramatic memories
    [decision.actor, decision.target].forEach(name => {
      const contestant = gameState.contestants.find(c => c.name === name);
      if (contestant) {
        contestant.memory.push({
          day: gameState.currentDay,
          type: 'scheme',
          participants: [decision.actor, decision.target],
          content: `${decision.actor} betrayed their alliance with ${decision.target}`,
          emotionalImpact: name === decision.target ? -8 : 3,
          timestamp: Date.now()
        });
      }
    });
  }

  private processRumorSpread(decision: NPCDecision, gameState: GameState): void {
    // Spread rumor to multiple contestants
    const activeContestants = gameState.contestants.filter(c => 
      !c.isEliminated && c.name !== decision.actor && c.name !== decision.target
    );
    
    // Select 2-3 random contestants to hear the rumor
    const rumorTargets = activeContestants
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(3, activeContestants.length));
    
    rumorTargets.forEach(target => {
      target.memory.push({
        day: gameState.currentDay,
        type: 'observation',
        participants: [decision.actor, decision.target || 'Unknown'],
        content: `${decision.actor} spread rumors: ${decision.content}`,
        emotionalImpact: -2,
        timestamp: Date.now()
      });
      
      // Increase suspicion toward rumor target
      if (decision.target) {
        relationshipGraphEngine.updateRelationship(
          target.name,
          decision.target,
          -3, 8, -1,
          'scheme',
          'Heard concerning rumors',
          gameState.currentDay
        );
      }
    });
  }

  private processConfrontation(decision: NPCDecision, gameState: GameState): void {
    if (!decision.target) return;
    
    // High-drama confrontation
    relationshipGraphEngine.updateRelationship(
      decision.actor,
      decision.target,
      -15, 20, -10,
      'confrontation',
      decision.content,
      gameState.currentDay
    );
    
    // Mutual memory creation
    [decision.actor, decision.target].forEach(name => {
      const contestant = gameState.contestants.find(c => c.name === name);
      if (contestant) {
        contestant.memory.push({
          day: gameState.currentDay,
          type: 'conversation',
          participants: [decision.actor, decision.target],
          content: `Confrontation: ${decision.content}`,
          emotionalImpact: name === decision.target ? -6 : 2,
          timestamp: Date.now()
        });
      }
    });
  }

  private processFlirtation(decision: NPCDecision, gameState: GameState): void {
    if (!decision.target) return;
    
    // Romance attempt
    const relationship = relationshipGraphEngine.getRelationship(decision.target, decision.actor);
    const receptiveness = relationship ? relationship.emotionalCloseness : 30;
    
    if (receptiveness > 50) {
      // Positive response
      relationshipGraphEngine.updateRelationship(
        decision.actor,
        decision.target,
        5, -3, 15,
        'conversation',
        'Romantic interaction',
        gameState.currentDay
      );
    } else {
      // Awkward or rejected
      relationshipGraphEngine.updateRelationship(
        decision.actor,
        decision.target,
        -2, 5, -5,
        'conversation',
        'Unwelcome romantic advance',
        gameState.currentDay
      );
    }
  }

  private processScheme(decision: NPCDecision, gameState: GameState): void {
    // Complex scheming action - could involve multiple participants
    const actor = gameState.contestants.find(c => c.name === decision.actor);
    if (!actor) return;
    
    actor.memory.push({
      day: gameState.currentDay,
      type: 'scheme',
      participants: [decision.actor, decision.target || 'Multiple'],
      content: decision.content,
      emotionalImpact: 4,
      timestamp: Date.now()
    });
    
    // Scheming affects multiple relationships slightly
    const activeContestants = gameState.contestants.filter(c => 
      !c.isEliminated && c.name !== decision.actor
    );
    
    activeContestants.forEach(contestant => {
      if (Math.random() < 0.3) { // 30% chance they notice something
        relationshipGraphEngine.updateRelationship(
          contestant.name,
          decision.actor,
          -1, 3, 0,
          'conversation',
          'Noticed suspicious behavior',
          gameState.currentDay
        );
      }
    });
  }

  private scheduleFollowUpAction(action: string, npcName: string, gameState: GameState): void {
    // Schedule follow-up actions for next update cycle
    // This could be enhanced to have a proper action queue
    setTimeout(() => {
      switch (action) {
        case 'dm_player':
          // Generate follow-up DM
          break;
        case 'spread_rumor':
          // Generate rumor spreading
          break;
        case 'form_alliance':
          // Attempt alliance formation
          break;
        case 'betray':
          // Plan betrayal
          break;
      }
    }, Math.random() * 60000 + 30000); // 30-90 seconds delay
  }

  private createInteractionMemories(action: PlayerAction, response: NPCResponse, gameState: GameState): void {
    if (!action.target) return;
    
    const npc = gameState.contestants.find(c => c.name === action.target);
    if (!npc) return;
    
    // Create memory for NPC
    npc.memory.push({
      day: gameState.currentDay,
      type: action.type === 'dm' ? 'dm' : 'conversation',
      participants: ['Player', action.target],
      content: `Player: ${action.content}`,
      emotionalImpact: response.memoryImpact,
      timestamp: Date.now()
    });
    
    // Update relationship decay to prevent stagnation
    relationshipGraphEngine.decayRelationships(gameState.currentDay);
  }

  private runSystemChecks(gameState: GameState): SystemCheck[] {
    const checks: SystemCheck[] = [];
    
    // Check for system stagnation
    const activeDrama = gameState.contestants.reduce((sum, c) => {
      if (c.isEliminated) return sum;
      const recentMemories = c.memory.filter(m => m.day >= gameState.currentDay - 2);
      return sum + recentMemories.length;
    }, 0);
    
    if (activeDrama < 5) {
      checks.push({
        system: 'Drama Engine',
        status: 'warning',
        message: 'Low social activity detected',
        recommendations: ['Force minimum drama event', 'Increase NPC initiative']
      });
    }
    
    // Check relationship graph health
    const totalRelationships = gameState.contestants.length * (gameState.contestants.length - 1);
    const extremeRelationships = gameState.contestants.reduce((count, c1) => {
      return count + relationshipGraphEngine.getRelationshipsForContestant(c1.name)
        .filter(rel => rel.trust < 20 || rel.trust > 80 || rel.suspicion > 80).length;
    }, 0);
    
    if (extremeRelationships / totalRelationships > 0.6) {
      checks.push({
        system: 'Relationship Graph',
        status: 'warning',
        message: 'Too many extreme relationships',
        recommendations: ['Apply relationship decay', 'Generate reconciliation events']
      });
    }
    
    // Check for infinite loops or deadlocks
    const lastUpdate = Date.now() - this.lastUpdateTime;
    if (lastUpdate > this.updateInterval * 2) {
      checks.push({
        system: 'Update Cycle',
        status: 'warning',
        message: 'Update cycle running slowly',
        recommendations: ['Check for performance issues']
      });
    }
    
    return checks;
  }

  private generateDebugInfo(gameState: GameState): DebugInfo {
    const dramaTensionLevels: { [key: string]: number } = {};
    const relationshipSummary: { [key: string]: any } = {};
    const npcMotives: { [key: string]: any[] } = {};
    
    gameState.contestants.forEach(contestant => {
      if (contestant.isEliminated || contestant.name === 'Player') return;
      
      dramaTensionLevels[contestant.name] = emergentEventEngine.getDramaTension(contestant.name);
      relationshipSummary[contestant.name] = relationshipGraphEngine.calculateSocialStanding(contestant.name);
      npcMotives[contestant.name] = npcAutonomyEngine.getNPCMotives(contestant.name);
    });
    
    return {
      dramaTensionLevels,
      relationshipSummary,
      npcMotives,
      playerProfile: speechActClassifier.getPlayerProfile()
    };
  }

  // Public debug methods
  enableDebugMode(): void {
    this.debugMode = true;
  }

  disableDebugMode(): void {
    this.debugMode = false;
  }

  getSystemStatus(): any {
    return {
      initialized: this.isInitialized,
      debugMode: this.debugMode,
      lastUpdate: this.lastUpdateTime,
      updateInterval: this.updateInterval
    };
  }

  // Force system updates (for testing)
  forceUpdate(gameState: GameState): GameUpdate {
    this.lastUpdateTime = 0; // Force update
    return this.updateGameSystems(gameState);
  }
}

export const gameSystemIntegrator = new GameSystemIntegrator();
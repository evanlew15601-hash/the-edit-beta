import { Contestant, GameState, GameMemory } from '@/types/game';
import { relationshipGraphEngine } from './relationshipGraphEngine';
import { speechActClassifier } from './speechActClassifier';

// NPC autonomous decision types
export type NPCDecision = {
  type: 'initiate_conversation' | 'send_dm' | 'propose_alliance' | 'betray_alliance' | 'spread_rumor' | 'confront' | 'flirt' | 'scheme';
  actor: string;
  target?: string;
  content: string;
  motivation: string;
  urgency: number; // 0-100
  executionTime: number; // timestamp
};

export type NPCMotive = {
  type: 'survival' | 'alliance_building' | 'revenge' | 'romance' | 'chaos' | 'information_gathering';
  intensity: number; // 0-100
  targets: string[];
  deadline?: number; // day number
};

export type NPCPersonalityProfile = {
  aggressiveness: number; // 0-100
  manipulation: number; // 0-100
  loyalty: number; // 0-100
  paranoia: number; // 0-100
  charisma: number; // 0-100
  intelligence: number; // 0-100
  emotionality: number; // 0-100
  risk_tolerance: number; // 0-100
};

class NPCAutonomyEngine {
  private decisionQueue: NPCDecision[] = [];
  private npcMotives: Map<string, NPCMotive[]> = new Map();
  private npcPersonalities: Map<string, NPCPersonalityProfile> = new Map();
  private lastActionTime: Map<string, number> = new Map();

  // Initialize NPC personalities and base motives
  initializeNPCs(contestants: Contestant[]): void {
    contestants.forEach(contestant => {
      if (contestant.name === 'Player') return;
      
      // Generate personality profile from disposition
      const personality = this.generatePersonalityProfile(contestant);
      this.npcPersonalities.set(contestant.name, personality);
      
      // Generate initial motives
      const motives = this.generateInitialMotives(contestant, personality);
      this.npcMotives.set(contestant.name, motives);
      
      this.lastActionTime.set(contestant.name, Date.now());
    });
  }

  // Main autonomy update - called every game cycle
  updateNPCAutonomy(gameState: GameState): NPCDecision[] {
    const activeContestants = gameState.contestants.filter(c => !c.isEliminated && c.name !== 'Player');
    const decisions: NPCDecision[] = [];

    activeContestants.forEach(npc => {
      // Update motives based on current game state
      this.updateNPCMotives(npc, gameState);
      
      // Generate potential decisions
      const potentialDecisions = this.generatePotentialDecisions(npc, gameState);
      
      // Evaluate and select best decision
          const selectedDecision = this.selectBestDecision(potentialDecisions, npc, gameState);
          
          if (selectedDecision && this.shouldExecuteDecision(selectedDecision, npc)) {
            decisions.push(selectedDecision);
            this.lastActionTime.set(npc.name, Date.now());
          }
    });

    return decisions;
  }

  private generatePersonalityProfile(contestant: Contestant): NPCPersonalityProfile {
    const disposition = contestant.psychProfile.disposition;
    
    return {
      aggressiveness: disposition.includes('confrontational') ? 80 : disposition.includes('aggressive') ? 90 : 30,
      manipulation: disposition.includes('deceptive') ? 85 : disposition.includes('calculating') ? 70 : 25,
      loyalty: disposition.includes('loyal') ? 85 : disposition.includes('treacherous') ? 15 : 50,
      paranoia: disposition.includes('paranoid') ? 90 : disposition.includes('suspicious') ? 70 : 30,
      charisma: disposition.includes('charming') ? 85 : disposition.includes('diplomatic') ? 75 : 40,
      intelligence: disposition.includes('calculating') ? 85 : disposition.includes('strategic') ? 80 : 50,
      emotionality: disposition.includes('emotional') ? 85 : disposition.includes('reactive') ? 75 : 40,
      risk_tolerance: disposition.includes('rebellious') ? 80 : disposition.includes('conservative') ? 20 : 50
    };
  }

  private generateInitialMotives(contestant: Contestant, personality: NPCPersonalityProfile): NPCMotive[] {
    const motives: NPCMotive[] = [];
    
    // Everyone has survival as base motive
    motives.push({
      type: 'survival',
      intensity: 70 + Math.random() * 30,
      targets: []
    });

    // Add personality-driven motives
    if (personality.manipulation > 60) {
      motives.push({
        type: 'alliance_building',
        intensity: personality.manipulation,
        targets: []
      });
    }

    return motives;
  }

  private updateNPCMotives(npc: Contestant, gameState: GameState): void {
    const motives = this.npcMotives.get(npc.name) || [];
    const personality = this.npcPersonalities.get(npc.name)!;
    const relationships = relationshipGraphEngine.getRelationshipsForContestant(npc.name);

    // Update survival motive based on social standing
    const survivalMotive = motives.find(m => m.type === 'survival');
    if (survivalMotive) {
      const averageTrust = relationships.reduce((sum, rel) => sum + rel.trust, 0) / relationships.length;
      survivalMotive.intensity = Math.max(50, 100 - averageTrust);
    }

    // Add revenge motives for betrayals
    const recentBetrayal = npc.memory.find(m => 
      m.type === 'scheme' && 
      m.day >= gameState.currentDay - 2 && 
      m.emotionalImpact < -5
    );
    
    if (recentBetrayal && !motives.some(m => m.type === 'revenge')) {
      motives.push({
        type: 'revenge',
        intensity: Math.abs(recentBetrayal.emotionalImpact) * 10,
        targets: recentBetrayal.participants.filter(p => p !== npc.name),
        deadline: gameState.currentDay + 3
      });
    }

    // Add romance motives for high charisma NPCs
    if (personality.charisma > 70 && !motives.some(m => m.type === 'romance')) {
      const potentialTargets = relationships
        .filter(rel => rel.trust > 60 && rel.emotionalCloseness > 50)
        .map(rel => rel.target);
      
      if (potentialTargets.length > 0) {
        motives.push({
          type: 'romance',
          intensity: personality.charisma,
          targets: potentialTargets
        });
      }
    }

    this.npcMotives.set(npc.name, motives);
  }

  private generatePotentialDecisions(npc: Contestant, gameState: GameState): NPCDecision[] {
    const motives = this.npcMotives.get(npc.name) || [];
    const personality = this.npcPersonalities.get(npc.name)!;
    const relationships = relationshipGraphEngine.getRelationshipsForContestant(npc.name);
    const decisions: NPCDecision[] = [];

    motives.forEach(motive => {
      switch (motive.type) {
        case 'survival':
          // Look for alliance opportunities
          const potentialAllies = relationships
            .filter(rel => rel.trust > 50 && !rel.isInAlliance)
            .sort((a, b) => b.trust - a.trust);
          
          if (potentialAllies.length > 0) {
            decisions.push({
              type: 'propose_alliance',
              actor: npc.name,
              target: potentialAllies[0].target,
              content: this.generateAllianceProposal(npc.name, potentialAllies[0].target, personality),
              motivation: 'survival',
              urgency: motive.intensity,
              executionTime: Date.now()
            });
          }
          break;

        case 'information_gathering':
          // Send DMs to gather intel
          const intelTargets = relationships
            .filter(rel => rel.trust > 40)
            .sort((a, b) => b.trust - a.trust);
          
          if (intelTargets.length > 0) {
            decisions.push({
              type: 'send_dm',
              actor: npc.name,
              target: intelTargets[0].target,
              content: this.generateIntelGatheringMessage(npc.name, intelTargets[0].target, personality),
              motivation: 'information_gathering',
              urgency: motive.intensity,
              executionTime: Date.now()
            });
          }
          break;

        case 'revenge':
          // Confront or scheme against targets
          if (motive.targets.length > 0) {
            const revengeTarget = motive.targets[0];
            const actionType = personality.aggressiveness > 60 ? 'confront' : 'scheme';
            
            decisions.push({
              type: actionType,
              actor: npc.name,
              target: revengeTarget,
              content: this.generateRevengeAction(npc.name, revengeTarget, actionType, personality),
              motivation: 'revenge',
              urgency: motive.intensity,
              executionTime: Date.now()
            });
          }
          break;

        case 'chaos':
          // Spread rumors or create drama
          const rumorTargets = relationships.filter(rel => rel.suspicion < 30);
          if (rumorTargets.length > 0) {
            decisions.push({
              type: 'spread_rumor',
              actor: npc.name,
              target: rumorTargets[Math.floor(Math.random() * rumorTargets.length)].target,
              content: this.generateRumor(npc.name, personality),
              motivation: 'chaos',
              urgency: motive.intensity,
              executionTime: Date.now()
            });
          }
          break;

        case 'romance':
          // Flirt with targets
          if (motive.targets.length > 0) {
            decisions.push({
              type: 'flirt',
              actor: npc.name,
              target: motive.targets[0],
              content: this.generateFlirtMessage(npc.name, motive.targets[0], personality),
              motivation: 'romance',
              urgency: motive.intensity,
              executionTime: Date.now()
            });
          }
          break;
      }
    });

    return decisions;
  }

  private selectBestDecision(decisions: NPCDecision[], npc: Contestant, gameState: GameState): NPCDecision | null {
    if (decisions.length === 0) return null;

    // Weight decisions by urgency and personality fit
    const weightedDecisions = decisions.map(decision => ({
      decision,
      weight: this.calculateDecisionWeight(decision, npc, gameState)
    }));

    // Sort by weight and add randomness
    weightedDecisions.sort((a, b) => b.weight - a.weight);
    
    // Pick from top 3 with weighted randomness
    const topDecisions = weightedDecisions.slice(0, 3);
    const totalWeight = topDecisions.reduce((sum, wd) => sum + wd.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const wd of topDecisions) {
      currentWeight += wd.weight;
      if (random <= currentWeight) {
        return wd.decision;
      }
    }

    return topDecisions[0]?.decision || null;
  }

  private calculateDecisionWeight(decision: NPCDecision, npc: Contestant, gameState: GameState): number {
    const personality = this.npcPersonalities.get(npc.name)!;
    let weight = decision.urgency;

    // Personality modifiers
    switch (decision.type) {
      case 'confront':
        weight *= (personality.aggressiveness / 100);
        break;
      case 'scheme':
        weight *= (personality.manipulation / 100);
        break;
      case 'propose_alliance':
        weight *= (personality.intelligence / 100);
        break;
      case 'flirt':
        weight *= (personality.charisma / 100);
        break;
      case 'spread_rumor':
        weight *= (personality.manipulation / 100) * (personality.risk_tolerance / 100);
        break;
    }

    // Recent action penalty
    const timeSinceLastAction = Date.now() - (this.lastActionTime.get(npc.name) || 0);
    if (timeSinceLastAction < 300000) { // 5 minutes
      weight *= 0.5;
    }

    return weight;
  }

  private shouldExecuteDecision(decision: NPCDecision, npc: Contestant): boolean {
    // Cooldown check
    const timeSinceLastAction = Date.now() - (this.lastActionTime.get(npc.name) || 0);
    if (timeSinceLastAction < 180000) { // 3 minutes minimum
      return false;
    }

    // Urgency threshold
    if (decision.urgency < 40) {
      return Math.random() < 0.3;
    }

    return Math.random() < (decision.urgency / 100);
  }

  private generateAllianceProposal(actor: string, target: string, personality: NPCPersonalityProfile): string {
    const templates = [
      `Hey ${target}, I think we should work together. We both know this game is getting intense.`,
      `${target}, I've been thinking... we could really help each other out in this game.`,
      `Listen ${target}, I trust you more than most people here. Want to form an alliance?`,
      `${target}, we need to stick together if we want to survive the next few votes.`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateIntelGatheringMessage(actor: string, target: string, personality: NPCPersonalityProfile): string {
    const templates = [
      `${target}, what do you think about the other contestants? I'm trying to figure out who to trust.`,
      `Hey ${target}, have you noticed anything weird about anyone lately?`,
      `${target}, I'm worried about the next vote. Do you know which way people are leaning?`,
      `I feel like there's some drama brewing. ${target}, have you heard anything?`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateRevengeAction(actor: string, target: string, actionType: string, personality: NPCPersonalityProfile): string {
    if (actionType === 'confront') {
      return `${target}, we need to talk. I know what you did and I'm not going to let it slide.`;
    } else {
      return `I'm going to make sure everyone knows what kind of person ${target} really is.`;
    }
  }

  private generateRumor(actor: string, personality: NPCPersonalityProfile): string {
    const rumors = [
      "I think there's a secret alliance that we don't know about.",
      "Someone here is definitely not being honest about their game strategy.",
      "I heard some interesting conversations that everyone should know about.",
      "There's definitely more going on behind the scenes than we realize."
    ];
    
    return rumors[Math.floor(Math.random() * rumors.length)];
  }

  private generateFlirtMessage(actor: string, target: string, personality: NPCPersonalityProfile): string {
    const templates = [
      `${target}, you've been looking really good lately. Just wanted you to know.`,
      `I really enjoy our conversations, ${target}. You're different from everyone else here.`,
      `${target}, want to spend some time together away from all this drama?`,
      `I feel like we have a real connection, ${target}. This place is crazy but you keep me grounded.`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // Get current motives for debugging
  getNPCMotives(npcName: string): NPCMotive[] {
    return this.npcMotives.get(npcName) || [];
  }

  // Get personality profile for debugging
  getNPCPersonality(npcName: string): NPCPersonalityProfile | undefined {
    return this.npcPersonalities.get(npcName);
  }
}

export const npcAutonomyEngine = new NPCAutonomyEngine();

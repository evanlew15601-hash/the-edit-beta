import { Contestant, GameState, GameMemory } from '@/types/game';
import { speechActClassifier, SpeechAct, PlayerLinguisticProfile } from './speechActClassifier';
import { relationshipGraphEngine } from './relationshipGraphEngine';
import { npcAutonomyEngine, NPCPersonalityProfile } from './npcAutonomyEngine';

export type NPCResponseContext = {
  contestant: Contestant;
  relationship: any;
  recentMemories: GameMemory[];
  motives: any[];
  socialContext: SocialContext;
  playerProfile: PlayerLinguisticProfile;
  playerName: string;
};

export type SocialContext = {
  alliances: string[];
  threats: string[];
  opportunities: string[];
  currentDramaTension: number;
  recentEvents: string[];
};

export type NPCResponse = {
  content: string;
  tone: 'friendly' | 'suspicious' | 'flirty' | 'aggressive' | 'strategic' | 'neutral';
  consequences: ResponseConsequence[];
  followUpAction?: 'dm_player' | 'spread_rumor' | 'form_alliance' | 'betray' | 'confess' | 'scheme';
  emotionalSubtext: {
    sincerity: number;
    manipulation: number;
    fear: number;
    attraction: number;
    anger: number;
  };
  memoryImpact: number; // How memorable this interaction will be
};

export type ResponseConsequence = {
  type: 'trust_change' | 'suspicion_change' | 'memory_creation' | 'motive_shift' | 'reputation_change';
  value: number;
  description: string;
};

class NPCResponseEngine {
  private conversationHistory: Map<string, string[]> = new Map();
  private playerBehaviorPatterns: Map<string, number> = new Map();
  private npcPerceptions: Map<string, NPCPlayerPerception> = new Map();

  // Generate dynamic NPC response to player message
  generateResponse(
    playerMessage: string,
    targetNPC: string,
    gameState: GameState,
    conversationType: 'public' | 'private' | 'confessional'
  ): NPCResponse {
    const speechAct = speechActClassifier.classifyMessage(playerMessage, 'Player', {
      allContestantNames: gameState.contestants.map(c => c.name)
    });

    if (speechActClassifier.isMetaText(playerMessage)) {
      return this.generateMetaResponse(targetNPC, playerMessage, speechAct);
    }

    const npc = gameState.contestants.find(c => c.name === targetNPC);
    if (!npc) throw new Error(`NPC ${targetNPC} not found`);

    const context = this.buildResponseContext(npc, gameState, speechAct);

    this.updateNPCPerception(targetNPC, speechAct, playerMessage, context);

    // Generate contextual response with access to the player's message
    const response = this.constructResponse(speechAct, context, conversationType, playerMessage);

    this.processResponseConsequences(response, npc, gameState);

    this.updateConversationHistory(targetNPC, gameState.playerName, playerMessage, response.content);

    return response;
  }

  private buildResponseContext(npc: Contestant, gameState: GameState, speechAct: SpeechAct): NPCResponseContext {
    const playerName = gameState.playerName;
    const relationship = relationshipGraphEngine.getRelationship(npc.name, playerName);
    const recentMemories = npc.memory
      .filter(m => m.participants.includes(playerName))
      .slice(-5); // Last 5 interactions with player
    
    const motives = npcAutonomyEngine.getNPCMotives(npc.name);
    const playerProfile = speechActClassifier.getPlayerProfile();
    
    // Build social context
    const alliances = relationshipGraphEngine.getAllAlliances()
      .filter(a => a.members.includes(npc.name))
      .flatMap(a => a.members.filter(m => m !== npc.name));
    
    const threats = relationshipGraphEngine.getRelationshipsForContestant(npc.name)
      .filter(rel => rel.suspicion > 70 || rel.trust < 20)
      .map(rel => rel.target);
    
    const opportunities = relationshipGraphEngine.getRelationshipsForContestant(npc.name)
      .filter(rel => rel.trust > 60 && !rel.isInAlliance)
      .map(rel => rel.target);
    
    const socialContext: SocialContext = {
      alliances,
      threats,
      opportunities,
      currentDramaTension: this.calculateDramaTension(npc, gameState),
      recentEvents: this.getRecentEvents(npc, gameState)
    };
    
    return {
      contestant: npc,
      relationship,
      recentMemories,
      motives,
      socialContext,
      playerProfile,
      playerName
    };
  }

  private updateNPCPerception(
    npcName: string, 
    speechAct: SpeechAct, 
    message: string, 
    context: NPCResponseContext
  ): void {
    let perception = this.npcPerceptions.get(npcName) || this.initializeNPCPerception();
    
    // Update perception based on speech act
    switch (speechAct.primary) {
      case 'alliance_proposal':
        perception.playerRole = 'potential_ally';
        perception.trustworthiness += speechAct.emotionalSubtext.sincerity * 0.1;
        break;
      case 'threatening':
        perception.playerRole = 'threat';
        perception.dangerLevel += speechAct.threatLevel * 0.1;
        break;
      case 'flirting':
        perception.playerRole = 'romantic_interest';
        perception.attraction += speechAct.emotionalSubtext.attraction * 0.1;
        break;
      case 'information_fishing':
        perception.playerRole = 'information_seeker';
        perception.manipulationAwareness += speechAct.manipulationLevel * 0.1;
        break;
      case 'gaslighting':
        perception.playerRole = 'manipulator';
        perception.manipulationAwareness += 30;
        perception.trustworthiness -= 20;
        break;
    }
    
    // Update based on context and history
    if (context.recentMemories.length > 3) {
      const consistencyScore = this.calculateConsistency(context.recentMemories);
      perception.reliability = consistencyScore;
    }
    
    // Track linguistic patterns
    perception.linguisticNotes.push(this.analyzeLinguisticPattern(message));
    if (perception.linguisticNotes.length > 10) {
      perception.linguisticNotes = perception.linguisticNotes.slice(-10);
    }
    
    this.npcPerceptions.set(npcName, perception);
  }

  private constructResponse(
    speechAct: SpeechAct, 
    context: NPCResponseContext, 
    conversationType: 'public' | 'private' | 'confessional',
    playerMessage?: string
  ): NPCResponse {
    const npc = context.contestant;
    const personality = npcAutonomyEngine.getNPCPersonality(npc.name);
    const perception = this.npcPerceptions.get(npc.name) || this.initializeNPCPerception();

    const responseStrategy = this.determineResponseStrategy(speechAct, context, perception, personality);

    // Generate response content with access to the player's message for richer context
    const content = this.generateResponseContent(speechAct, context, responseStrategy, playerMessage);

    let tone = this.determineTone(speechAct, context, personality, perception);
    // Drama tension influences tone slightly
    if (context.socialContext.currentDramaTension > 70 && tone === 'neutral') {
      tone = 'suspicious';
    }

    const emotionalSubtext = this.calculateEmotionalSubtext(speechAct, context, personality);
    const consequences = this.calculateConsequences(speechAct, context, responseStrategy);
    const followUpAction = this.determineFollowUpAction(speechAct, context, responseStrategy);

    return {
      content,
      tone,
      consequences,
      followUpAction,
      emotionalSubtext,
      memoryImpact: this.calculateMemoryImpact(speechAct, context)
    };
  }

  private determineResponseStrategy(
    speechAct: SpeechAct,
    context: NPCResponseContext,
    perception: NPCPlayerPerception,
    personality?: NPCPersonalityProfile
  ): ResponseStrategy {
    if (!personality) {
      return { approach: 'neutral', agenda: 'none', deceptionLevel: 0 };
    }

    // Base strategy on NPC's current motives and perception of player
    let approach: ResponseStrategy['approach'] = 'neutral';
    let agenda: ResponseStrategy['agenda'] = 'none';
    let deceptionLevel = 0;

    // Primary motive influence
    const primaryMotive = context.motives[0];
    if (primaryMotive) {
      switch (primaryMotive.type) {
        case 'survival':
          if (perception.playerRole === 'threat') {
            approach = 'defensive';
            agenda = 'deflect_suspicion';
          } else if (perception.playerRole === 'potential_ally') {
            approach = 'strategic_alliance';
            agenda = 'build_trust';
          }
          break;
        case 'revenge':
          if (primaryMotive.targets.includes(context.playerName)) {
            approach = 'hostile';
            agenda = 'psychological_warfare';
          }
          break;
        case 'romance':
          if (speechAct.primary === 'flirting') {
            approach = 'reciprocal_flirting';
            agenda = 'build_intimacy';
          }
          break;
        case 'information_gathering':
          approach = 'information_extraction';
          agenda = 'gather_intel';
          deceptionLevel = personality.manipulation * 0.5;
          break;
      }
    }

    // Personality modifiers
    if (personality.paranoia > 70) {
      deceptionLevel += 20;
      if (approach === 'neutral') approach = 'suspicious';
    }

    if (personality.manipulation > 80) {
      deceptionLevel += personality.manipulation * 0.3;
    }

    if (personality.aggressiveness > 70 && speechAct.threatLevel > 30) {
      approach = 'confrontational';
    }

    return {
      approach,
      agenda,
      deceptionLevel: Math.min(100, deceptionLevel)
    };
  }

  private composeContextTail(
    context: NPCResponseContext,
    speechAct?: SpeechAct,
    playerMessage?: string
  ): string | null {
    const names = Array.from(new Set<string>([
      ...context.socialContext.alliances,
      ...context.socialContext.threats,
      ...context.socialContext.opportunities,
      context.playerName,
    ])).filter(Boolean);

    let mention: string | undefined;
    if (playerMessage) {
      const lower = playerMessage.toLowerCase();
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      for (const n of names) {
        const key = esc(n.toLowerCase());
        const re = new RegExp(`\\b${key}\\b`, 'i');
        if (re.test(lower)) { mention = n; break; }
      }
    }

    const recent = context.socialContext.recentEvents?.slice(-1)[0];
    const ally1 = context.socialContext.alliances[0];
    const threat1 = context.socialContext.threats[0];

    if (speechAct?.informationSeeking) {
      if (mention) return `Be specific—what exactly about ${mention}?`;
      return `Be specific—alliances, votes, or trust?`;
    }

    if (context.socialContext.currentDramaTension > 65) {
      if (threat1) return `People are already wary of ${threat1}.`;
      if (recent) return `Earlier today: ${recent}.`;
    }

    if (ally1 && (speechAct?.trustBuilding || (context.relationship && context.relationship.isInAlliance))) {
      return `Keep our lane with ${ally1} in mind.`;
    }

    return null;
  }

  private generateResponseContent(
    speechAct: SpeechAct,
    context: NPCResponseContext,
    strategy: ResponseStrategy,
    playerMessage?: string
  ): string {
    const npc = context.contestant;
    const perception = this.npcPerceptions.get(npc.name) || this.initializeNPCPerception();

    const responseTemplates = this.getResponseTemplates(strategy, speechAct, perception);
    const template = this.selectBestTemplate(responseTemplates, context);

    return this.customizeTemplate(template, context, perception, speechAct, playerMessage);
  }

  private getResponseTemplates(
    strategy: ResponseStrategy,
    speechAct: SpeechAct,
    perception: NPCPlayerPerception
  ): ResponseTemplate[] {
    const templates: ResponseTemplate[] = [];

    // Provide multiple context-capable variants per approach
    switch (strategy.approach) {
      case 'defensive':
        templates.push(
          {
            content: "Not sure what you're getting at about {MENTION}. I've been honest.",
            tags: ['defensive', 'denial'],
            trustRequirement: 0,
            manipulationLevel: 10
          },
          {
            content: "If this is about {MENTION}, I kept it clean. Do not twist it.",
            tags: ['defensive', 'denial'],
            trustRequirement: 0,
            manipulationLevel: 10
          }
        );
        break;
      case 'strategic_alliance':
        templates.push(
          {
            content: "We should stick together. Keep it narrow—{ALLY} or {MENTION}, but no leaks.",
            tags: ['alliance', 'strategic'],
            trustRequirement: 40,
            manipulationLevel: 30
          },
          {
            content: "If we line up with {ALLY}, we can pull numbers without noise.",
            tags: ['alliance', 'strategic'],
            trustRequirement: 40,
            manipulationLevel: 30
          }
        );
        break;
      case 'hostile':
        templates.push(
          {
            content: "You've got some nerve. If this is about {MENTION}, pick your lane.",
            tags: ['hostile', 'threatening'],
            trustRequirement: 0,
            manipulationLevel: 0
          },
          {
            content: "Watch yourself. I do not play messy over {MENTION}.",
            tags: ['hostile', 'threatening'],
            trustRequirement: 0,
            manipulationLevel: 0
          }
        );
        break;
      case 'information_extraction':
        templates.push(
          {
            content: "What exactly about {MENTION}? Alliances, votes, or trust?",
            tags: ['fishing', 'manipulation'],
            trustRequirement: 30,
            manipulationLevel: 60
          },
          {
            content: "Give me specifics—names and numbers. If it's {MENTION}, say what you heard.",
            tags: ['fishing', 'manipulation'],
            trustRequirement: 30,
            manipulationLevel: 60
          }
        );
        break;
      case 'reciprocal_flirting':
        templates.push(
          {
            content: "You're pretty charming yourself. I want to keep this quiet and real.",
            tags: ['flirting', 'romance'],
            trustRequirement: 50,
            manipulationLevel: 20
          },
          {
            content: "I like this. Just keep it subtle—no showy scenes.",
            tags: ['flirting', 'romance'],
            trustRequirement: 50,
            manipulationLevel: 20
          }
        );
        break;
      case 'suspicious':
        templates.push(
          {
            content: "Why ask me this about {MENTION}? What's your angle?",
            tags: ['suspicious', 'questioning'],
            trustRequirement: 20,
            manipulationLevel: 10
          },
          {
            content: "If you're probing {MENTION}, say why. I notice patterns.",
            tags: ['suspicious', 'questioning'],
            trustRequirement: 20,
            manipulationLevel: 10
          }
        );
        break;
      case 'confrontational':
        templates.push(
          {
            content: "Are you threatening me? If this is about {MENTION}, you picked the wrong person.",
            tags: ['confrontational', 'aggressive'],
            trustRequirement: 0,
            manipulationLevel: 0
          },
          {
            content: "Say it clean. If you're pushing on {MENTION}, we can settle it directly.",
            tags: ['confrontational', 'aggressive'],
            trustRequirement: 0,
            manipulationLevel: 0
          }
        );
        break;
      default:
        templates.push(
          {
            content: "I hear you. Earlier today: {RECENT_EVENT}.",
            tags: ['neutral', 'thoughtful'],
            trustRequirement: 30,
            manipulationLevel: 5
          },
          {
            content: "Let me think about that. Keep {ALLY} in mind.",
            tags: ['neutral', 'thoughtful'],
            trustRequirement: 30,
            manipulationLevel: 5
          }
        );
    }

    return templates;
  }

  private selectBestTemplate(templates: ResponseTemplate[], context: NPCResponseContext): ResponseTemplate {
    // Filter templates based on relationship requirements
    const relationship = context.relationship;
    const viableTemplates = templates.filter(template => {
      return !relationship || relationship.trust >= template.trustRequirement;
    });
    
    if (viableTemplates.length === 0) {
      // Fallback to neutral response
      return {
        content: "I see. That's... interesting.",
        tags: ['neutral'],
        trustRequirement: 0,
        manipulationLevel: 0
      };
    }
    
    // Select template based on personality and situation
    return viableTemplates[Math.floor(Math.random() * viableTemplates.length)];
  }

  private customizeTemplate(
    template: ResponseTemplate,
    context: NPCResponseContext,
    perception: NPCPlayerPerception,
    speechAct?: SpeechAct,
    playerMessage?: string
  ): string {
    // Fill placeholders first for natural integration
    let content = this.fillTemplatePlaceholders(template.content, context, speechAct, playerMessage);

    // Relationship memory hint
    if (context.recentMemories.length > 0) {
      const lastMemory = context.recentMemories[context.recentMemories.length - 1];
      if (lastMemory.emotionalImpact < -3) {
        content += " After what happened before, I am cautious.";
      } else if (lastMemory.emotionalImpact > 3) {
        content += " I appreciate that we can talk like this.";
      }
    }

    // Personality modifiers
    const personality = npcAutonomyEngine.getNPCPersonality(context.contestant.name);
    if (personality) {
      if (personality.paranoia > 70 && template.tags.includes('suspicious')) {
        content += " Everyone has an angle.";
      }
      if (personality.charisma > 70 && template.tags.includes('alliance')) {
        content = content.replace("stick together", "be an effective team");
      }
    }

    // Linguistic note
    if (perception.linguisticNotes.length > 3) {
      const playerPattern = perception.linguisticNotes[perception.linguisticNotes.length - 1];
      if (playerPattern.includes('formal') && Math.random() < 0.3) {
        content += " You choose your words carefully.";
      }
    }

    // Context-aware tail: mention names/events without fabricating details
    const tail = this.composeContextTail(context, speechAct, playerMessage);
    if (tail) {
      content = /[.!?]$/.test(content) ? `${content} ${tail}` : `${content}. ${tail}`;
    }

    return content;
  }

  private fillTemplatePlaceholders(
    content: string,
    context: NPCResponseContext,
    speechAct?: SpeechAct,
    playerMessage?: string
  ): string {
    const ally = context.socialContext.alliances[0];
    const threat = context.socialContext.threats[0];
    const recent = context.socialContext.recentEvents?.slice(-1)[0];
    let mention = speechAct?.namedMentions?.[0];

    // Fallback mention from player's message across social context names
    if (!mention && playerMessage) {
      const names = Array.from(new Set<string>([
        ...context.socialContext.alliances,
        ...context.socialContext.threats,
        ...context.socialContext.opportunities,
        context.playerName,
      ])).filter(Boolean);
      const lower = playerMessage.toLowerCase();
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\if (!mention && playerMessage) {
      const names = Array.from(new Set<string>([
        ...context.socialContext.alliances,
        ...context.socialContext.threats,
        ...context.socialContext.opportunities,
        'Player',
      ])).filter(Boolean);
      const lower = playerMessage.toLowerCase();
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      for (const n of names) {
        const key = esc(n.toLowerCase());
        const re = new RegExp(`\\b${key}\\b`, 'i');
        if (re.test(lower)) { mention = n; break; }
      }
    }');
      for (const n of names) {
        const key = esc(n.toLowerCase());
        const re = new RegExp(`\\b${key}\\b`, 'i');
        if (re.test(lower)) { mention = n; break; }
      }
    }

    const replacements: Record<string, string> = {
      '{ALLY}': ally || 'our lane',
      '{THREAT}': threat || 'people',
      '{RECENT_EVENT}': recent || 'something earlier',
      '{MENTION}': mention || 'that',
    };

    let out = content;
    Object.entries(replacements).forEach(([k, v]) => {
      out = out.replace(new RegExp(k, 'g'), v);
    });

    // Clean up double spaces if placeholders were adjacent
    return out.replace(/\s{2,}/g, ' ').trim();
  }

  private determineTone(
    speechAct: SpeechAct,
    context: NPCResponseContext,
    personality?: NPCPersonalityProfile,
    perception?: NPCPlayerPerception
  ): NPCResponse['tone'] {
    if (!personality || !perception) return 'neutral';

    let tone: NPCResponse['tone'] = 'neutral';

    if (speechAct.primary === 'flirting' && perception.playerRole === 'romantic_interest') {
      tone = 'flirty';
    } else if (speechAct.threatLevel > 50 || perception.playerRole === 'threat') {
      tone = 'aggressive';
    } else if (speechAct.manipulationLevel > 60 || perception.manipulationAwareness > 50) {
      tone = 'suspicious';
    } else if (context.relationship && context.relationship.trust > 60) {
      tone = 'friendly';
    } else if (personality.intelligence > 70 && speechAct.informationSeeking) {
      tone = 'strategic';
    }

    // Drama tension nudges tone
    if (context.socialContext.currentDramaTension > 60 && tone === 'neutral') {
      tone = 'suspicious';
    } else if (context.socialContext.currentDramaTension < 30 && tone === 'suspicious') {
      tone = 'neutral';
    }

    return tone;
  }

  private calculateEmotionalSubtext(
    speechAct: SpeechAct,
    context: NPCResponseContext,
    personality?: NPCPersonalityProfile
  ): NPCResponse['emotionalSubtext'] {
    const base = speechAct.emotionalSubtext;
    
    if (!personality) {
      return {
        sincerity: base.sincerity,
        manipulation: base.manipulation,
        fear: base.fear,
        attraction: base.attraction,
        anger: base.anger
      };
    }
    
    return {
      sincerity: Math.max(0, Math.min(100, base.sincerity - personality.manipulation * 0.5)),
      manipulation: Math.min(100, base.manipulation + personality.manipulation * 0.3),
      fear: Math.min(100, base.fear + personality.paranoia * 0.2),
      attraction: base.attraction,
      anger: Math.min(100, base.anger + personality.aggressiveness * 0.2)
    };
  }

  private calculateConsequences(
    speechAct: SpeechAct,
    context: NPCResponseContext,
    strategy: ResponseStrategy
  ): ResponseConsequence[] {
    const consequences: ResponseConsequence[] = [];
    
    // Trust changes based on speech act and strategy
    if (speechAct.trustBuilding && strategy.deceptionLevel < 30) {
      consequences.push({
        type: 'trust_change',
        value: 5 + speechAct.emotionalSubtext.sincerity * 0.1,
        description: 'Player seems genuine'
      });
    }
    
    if (speechAct.manipulationLevel > 50) {
      consequences.push({
        type: 'suspicion_change',
        value: speechAct.manipulationLevel * 0.2,
        description: 'Player seems manipulative'
      });
    }
    
    // Memory creation for significant interactions
    if (speechAct.confidence > 70 || strategy.deceptionLevel > 50) {
      consequences.push({
        type: 'memory_creation',
        value: Math.max(speechAct.confidence, strategy.deceptionLevel),
        description: 'Memorable interaction'
      });
    }
    
    return consequences;
  }

  private determineFollowUpAction(
    speechAct: SpeechAct,
    context: NPCResponseContext,
    strategy: ResponseStrategy
  ): NPCResponse['followUpAction'] {
    // Determine if NPC will take action after this conversation
    if (strategy.agenda === 'gather_intel' && speechAct.informationSeeking) {
      return 'dm_player';
    }
    
    if (speechAct.primary === 'alliance_proposal' && strategy.approach === 'strategic_alliance') {
      return 'form_alliance';
    }
    
    if (speechAct.threatLevel > 70) {
      return 'spread_rumor';
    }
    
    if (strategy.approach === 'hostile') {
      return 'scheme';
    }
    
    return undefined;
  }

  private calculateMemoryImpact(speechAct: SpeechAct, context: NPCResponseContext): number {
    let impact = 5; // Base impact
    
    impact += speechAct.confidence * 0.1;
    impact += speechAct.emotionalSubtext.anger * 0.15;
    impact += speechAct.emotionalSubtext.fear * 0.1;
    impact += speechAct.manipulationLevel * 0.1;
    impact += speechAct.threatLevel * 0.2;
    
    return Math.min(10, Math.max(-10, impact));
  }

  private generateMetaResponse(targetNPC: string, message: string, speechAct: SpeechAct): NPCResponse {
    const metaResponse = speechActClassifier.generateMetaResponse(targetNPC, message);
    
    return {
      content: metaResponse,
      tone: 'suspicious',
      consequences: [
        {
          type: 'suspicion_change',
          value: 20,
          description: 'Player acting strangely'
        },
        {
          type: 'reputation_change',
          value: -10,
          description: 'Others think player is weird'
        }
      ],
      emotionalSubtext: {
        sincerity: 10,
        manipulation: 0,
        fear: 15,
        attraction: 0,
        anger: 5
      },
      memoryImpact: 8
    };
  }

  private processResponseConsequences(response: NPCResponse, npc: Contestant, gameState: GameState): void {
    response.consequences.forEach(consequence => {
      switch (consequence.type) {
        case 'trust_change':
          relationshipGraphEngine.updateRelationship(
            npc.name,
            gameState.playerName,
            consequence.value,
            0,
            0,
            'conversation',
            consequence.description,
            gameState.currentDay
          );
          break;
        case 'suspicion_change':
          relationshipGraphEngine.updateRelationship(
            npc.name,
            gameState.playerName,
            0,
            consequence.value,
            0,
            'conversation',
            consequence.description,
            gameState.currentDay
          );
          break;
        case 'memory_creation':
          const memory: GameMemory = {
            day: gameState.currentDay,
            type: 'conversation',
            participants: [gameState.playerName, npc.name],
            content: `Significant conversation with ${gameState.playerName}`,
            emotionalImpact: response.memoryImpact,
            timestamp: Date.now()
          };
          npc.memory.push(memory);
          break;
      }
    });
  }

  private updateConversationHistory(npcName: string, playerName: string, playerMessage: string, npcResponse: string): void {
    let history = this.conversationHistory.get(npcName) || [];
    history.push(`${playerName}: ${playerMessage}`);
    history.push(`${npcName}: ${npcResponse}`);
    
    // Keep only last 20 exchanges
    if (history.length > 40) {
      history = history.slice(-40);
    }
    
    this.conversationHistory.set(npcName, history);
  }

  private calculateDramaTension(npc: Contestant, gameState: GameState): number {
    const relationships = relationshipGraphEngine.getRelationshipsForContestant(npc.name);
    const avgSuspicion = relationships.reduce((sum, rel) => sum + rel.suspicion, 0) / relationships.length;
    const recentConflicts = npc.memory.filter(m => 
      m.day >= gameState.currentDay - 2 && m.emotionalImpact < -3
    ).length;
    
    return Math.min(100, avgSuspicion + recentConflicts * 10);
  }

  private getRecentEvents(npc: Contestant, gameState: GameState): string[] {
    return npc.memory
      .filter(m => m.day >= gameState.currentDay - 2)
      .map(m => m.content);
  }

  private initializeNPCPerception(): NPCPlayerPerception {
    return {
      playerRole: 'unknown',
      trustworthiness: 50,
      dangerLevel: 20,
      manipulationAwareness: 30,
      attraction: 0,
      reliability: 50,
      linguisticNotes: []
    };
  }

  private calculateConsistency(memories: GameMemory[]): number {
    // Analyze consistency in player's messages and actions
    // This is a simplified implementation
    return 50 + (Math.random() - 0.5) * 40;
  }

  private analyzeLinguisticPattern(message: string): string {
    const patterns = [];
    
    if (message.length > 100) patterns.push('verbose');
    if (message.split('?').length > 2) patterns.push('questioning');
    if (/\b(please|thank you|would|could)\b/i.test(message)) patterns.push('formal');
    if (/[!]{2,}|[A-Z]{3,}/.test(message)) patterns.push('emotional');
    
    return patterns.join(', ') || 'neutral';
  }

  // Debug methods
  getNPCPerception(npcName: string): NPCPlayerPerception | undefined {
    return this.npcPerceptions.get(npcName);
  }

  getConversationHistory(npcName: string): string[] {
    return this.conversationHistory.get(npcName) || [];
  }
}

// Supporting types
type ResponseStrategy = {
  approach: 'defensive' | 'strategic_alliance' | 'hostile' | 'information_extraction' | 
           'reciprocal_flirting' | 'suspicious' | 'confrontational' | 'neutral';
  agenda: 'deflect_suspicion' | 'build_trust' | 'psychological_warfare' | 'build_intimacy' | 
          'gather_intel' | 'none';
  deceptionLevel: number; // 0-100
};

type ResponseTemplate = {
  content: string;
  tags: string[];
  trustRequirement: number;
  manipulationLevel: number;
};

type NPCPlayerPerception = {
  playerRole: 'unknown' | 'ally' | 'threat' | 'pawn' | 'tool' | 'shield' | 'target' | 
             'potential_ally' | 'romantic_interest' | 'information_seeker' | 'manipulator';
  trustworthiness: number; // 0-100
  dangerLevel: number; // 0-100
  manipulationAwareness: number; // 0-100
  attraction: number; // 0-100
  reliability: number; // 0-100 (consistency in behavior)
  linguisticNotes: string[]; // Observations about how player speaks
};

export const npcResponseEngine = new NPCResponseEngine();

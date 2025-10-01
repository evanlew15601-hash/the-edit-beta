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
  gameState: GameState;
  playerMessage: string;
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
    // Classify the player's speech act
    const speechAct = speechActClassifier.classifyMessage(playerMessage, 'Player');
    
    // Check for meta-text
    if (speechActClassifier.isMetaText(playerMessage)) {
      return this.generateMetaResponse(targetNPC, playerMessage, speechAct);
    }
    
    // Get NPC context
    const npc = gameState.contestants.find(c => c.name === targetNPC);
    if (!npc) throw new Error(`NPC ${targetNPC} not found`);
    
    const context = this.buildResponseContext(npc, gameState, speechAct, playerMessage);
    
    // Update NPC perception of player
    this.updateNPCPerception(targetNPC, speechAct, playerMessage, context);
    
    // Generate contextual response
    const response = this.constructResponse(speechAct, context, conversationType);
    
    // Process response consequences
    this.processResponseConsequences(response, npc, gameState);
    
    // Store conversation history
    this.updateConversationHistory(targetNPC, playerMessage, response.content);
    
    return response;
  }

  private buildResponseContext(npc: Contestant, gameState: GameState, speechAct: SpeechAct, playerMessage: string): NPCResponseContext {
    const relationship = relationshipGraphEngine.getRelationship(npc.name, 'Player');
    const recentMemories = npc.memory
      .filter(m => m.participants.includes('Player'))
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
      gameState,
      playerMessage
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
    conversationType: 'public' | 'private' | 'confessional'
  ): NPCResponse {
    const npc = context.contestant;
    const personality = npcAutonomyEngine.getNPCPersonality(npc.name);
    const perception = this.npcPerceptions.get(npc.name) || this.initializeNPCPerception();
    
    // Determine response strategy based on motive and perception
    const responseStrategy = this.determineResponseStrategy(speechAct, context, perception, personality);
    
    // Generate response content
    const content = this.generateResponseContent(speechAct, context, responseStrategy);
    
    // Determine tone based on personality and relationship
    const tone = this.determineTone(speechAct, context, personality, perception);
    
    // Calculate emotional subtext
    const emotionalSubtext = this.calculateEmotionalSubtext(speechAct, context, personality);
    
    // Determine consequences
    const consequences = this.calculateConsequences(speechAct, context, responseStrategy);
    
    // Check for follow-up actions
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
          if (primaryMotive.targets.includes('Player')) {
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

  private generateResponseContent(
    speechAct: SpeechAct,
    context: NPCResponseContext,
    strategy: ResponseStrategy
  ): string {
    const npc = context.contestant;
    const perception = this.npcPerceptions.get(npc.name) || this.initializeNPCPerception();
    
    // Response templates based on strategy and speech act
    const responseTemplates = this.getResponseTemplates(strategy, speechAct, perception);
    
    // Select appropriate template and customize
    const template = this.selectBestTemplate(responseTemplates, context);
    
    // Fill in template with context-specific information
    return this.customizeTemplate(template, context, perception, speechAct);
  }

  private getResponseTemplates(
    strategy: ResponseStrategy,
    speechAct: SpeechAct,
    perception: NPCPlayerPerception
  ): ResponseTemplate[] {
    const templates: ResponseTemplate[] = [];
    
    // Add templates based on strategy
    switch (strategy.approach) {
      case 'defensive':
        templates.push({
          content: "I'm not sure what you're getting at, but I've been nothing but honest.",
          tags: ['defensive', 'denial'],
          trustRequirement: 0,
          manipulationLevel: 10
        });
        break;
      case 'strategic_alliance':
        templates.push({
          content: "You know what? I think we understand each other. We should stick together.",
          tags: ['alliance', 'strategic'],
          trustRequirement: 40,
          manipulationLevel: 30
        });
        break;
      case 'hostile':
        templates.push({
          content: "You've got some nerve talking to me like that. Watch yourself.",
          tags: ['hostile', 'threatening'],
          trustRequirement: 0,
          manipulationLevel: 0
        });
        break;
      case 'information_extraction':
        templates.push({
          content: "That's interesting... tell me more about what you've been hearing around here.",
          tags: ['fishing', 'manipulation'],
          trustRequirement: 30,
          manipulationLevel: 60
        });
        break;
      case 'reciprocal_flirting':
        templates.push({
          content: "You're pretty charming yourself. I've been hoping we'd get some time to talk.",
          tags: ['flirting', 'romance'],
          trustRequirement: 50,
          manipulationLevel: 20
        });
        break;
      case 'suspicious':
        templates.push({
          content: "Why are you asking me this? What's your angle here?",
          tags: ['suspicious', 'questioning'],
          trustRequirement: 20,
          manipulationLevel: 10
        });
        break;
      case 'confrontational':
        templates.push({
          content: "Are you threatening me? Because if you are, you picked the wrong person.",
          tags: ['confrontational', 'aggressive'],
          trustRequirement: 0,
          manipulationLevel: 0
        });
        break;
      default:
        templates.push({
          content: "I hear what you're saying. Let me think about that.",
          tags: ['neutral', 'thoughtful'],
          trustRequirement: 30,
          manipulationLevel: 5
        });
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
    speechAct: SpeechAct
  ): string {
    let content = template.content;

    // If the player asked a direct question, provide a direct answer with game context
    if (speechAct.informationSeeking || /\?/.test(context.playerMessage)) {
      const direct = this.buildDirectAnswerForQuestion(context.playerMessage, context);
      if (direct) {
        content = direct;
      }
    }
    
    // Add personal touches based on relationship history
    if (context.recentMemories.length > 0) {
      const lastMemory = context.recentMemories[context.recentMemories.length - 1];
      if (lastMemory.emotionalImpact < -3) {
        content += " After what happened before, I'm not sure I trust this.";
      } else if (lastMemory.emotionalImpact > 3) {
        content += " I'm glad we can talk like this.";
      }
    }
    
    // Add personality-specific language patterns
    const personality = npcAutonomyEngine.getNPCPersonality(context.contestant.name);
    if (personality) {
      if (personality.paranoia > 70 && template.tags.includes('suspicious')) {
        content += " Everyone's got an agenda here.";
      }
      
      if (personality.charisma > 70 && template.tags.includes('alliance')) {
        content = content.replace("stick together", "be a great team");
      }
    }
    
    // Reference player's linguistic patterns if NPC has noticed them
    if (perception.linguisticNotes.length > 3) {
      const playerPattern = perception.linguisticNotes[perception.linguisticNotes.length - 1];
      if (playerPattern.includes('formal') && Math.random() < 0.3) {
        content += " You always speak so... carefully.";
      }
    }
    
    return content;
  }

  // Build a direct, context-aware answer to the player's question
  private buildDirectAnswerForQuestion(message: string, context: NPCResponseContext): string | null {
    const lower = message.toLowerCase();
    const names = this.extractMentionedNames(message, context.gameState);

    const isVote = /\\b(vote|votes|voting|majority|target|whose name|name is)\\b/.test(lower);
    const isAlliance = /\\b(alliance|team up|work with|who (are|you're|you are) with|numbers)\\b/.test(lower);
    const isRumor = /\\b(rumor|whispers?|gossip|leak|who's talking)\\b/.test(lower);
    const isComp = /\\b(immunity|challenge|competition|who won|win)\\b/.test(lower);
    const isTrust = /\\b(trust|loyal|reliable|flip|faith|on your side)\\b/.test(lower);

    if (isVote) {
      const target = names[0] || this.pickLikelyTargetFromContext(context);
      const allies = this.getAllianceMembersForNPC(context);
      const majority = this.computeMajorityThreshold(context.gameState);

      if (!target) {
        return `Right now the names are moving, but the room is settling soon. Majority is ${majority}.`;
      }

      const pushers = allies.length ? `${this.listNames(allies)} are pushing it with me` : `that's where the room is leaning`;
      let answer = `Right now, ${target} is the name—${pushers}. Majority is ${majority}.`;

      // Backup if target is immune
      const immune = context.gameState.immunityWinner;
      if (immune && immune === target) {
        const alt = this.pickAlternativeTarget(context, target);
        if (alt) {
          answer = `Immunity is on ${target}, so the backup is ${alt}. Majority is ${majority}.`;
        }
      }
      return answer;
    }

    if (isAlliance) {
      const allies = this.getAllianceMembersForNPC(context);
      if (allies.length) {
        const wobble = context.socialContext.opportunities[0];
        return wobble
          ? `I'm working with ${this.listNames(allies)}. ${wobble} is wobbly; we keep it tight.`
          : `I'm working with ${this.listNames(allies)}. We keep it quiet and clean.`;
      }
      const near = context.socialContext.opportunities.slice(0, 2);
      return near.length
        ? `Not locked in. I talk to ${this.listNames(near)} and keep options open.`
        : `I'm keeping options open and testing conversations.`;
    }

    if (isRumor) {
      const subject = names[0] || this.pickLikelyTargetFromContext(context);
      const pushers = context.socialContext.threats.slice(0, 2);
      return subject
        ? pushers.length
          ? `The whispers are about ${subject}. ${this.listNames(pushers)} keep spreading it.`
          : `The whispers are about ${subject}. It's coming from a few rooms.`
        : `The whispers are moving fast. People are testing names without committing.`;
    }

    if (isComp) {
      const immune = context.gameState.immunityWinner;
      if (immune) {
        const alt = this.pickAlternativeTarget(context, immune);
        return alt
          ? `Immunity went to ${immune}. The plan shifts to ${alt}.`
          : `Immunity went to ${immune}. We're reassessing the plan.`;
      }
      const fallback = this.pickLikelyTargetFromContext(context);
      return fallback
        ? `No immunity yet. If ${fallback} wins, the vote flips and we regroup.`
        : `No immunity yet. The plan depends on who can save themselves.`;
    }

    if (isTrust) {
      const target = names[0];
      if (target) {
        const rel = relationshipGraphEngine.getRelationship(context.contestant.name, target);
        if (rel) {
          if (rel.trust >= 60) {
            return `I trust ${target}. They've been steady with me and haven't leaked.`;
          }
          if (rel.suspicion >= 60) {
            return `I don't trust ${target}. They push names and leak softly. I'm watching them.`;
          }
          return `I'm neutral on ${target}. They talk to everyone, so I keep guard up.`;
        }
      }
      return `Trust shifts daily. I keep receipts and adjust as the room changes.`;
    }

    return null;
  }

  private extractMentionedNames(message: string, gameState: GameState): string[] {
    const lower = message.toLowerCase();
    const names = gameState.contestants
      .filter(c => !c.isEliminated)
      .map(c => c.name)
      .filter(n => lower.includes(n.toLowerCase()));
    return Array.from(new Set(names));
  }

  private pickLikelyTargetFromContext(context: NPCResponseContext): string | undefined {
    const active = context.gameState.contestants.filter(c => !c.isEliminated && c.name !== context.contestant.name && c.name !== context.gameState.playerName);
    const sorted = active.sort((a, b) => (b.psychProfile.suspicionLevel || 0) - (a.psychProfile.suspicionLevel || 0));
    const candidate = sorted[0]?.name;
    const immune = context.gameState.immunityWinner;
    if (candidate && immune && candidate === immune) {
      return sorted[1]?.name || undefined;
    }
    return candidate;
  }

  private pickAlternativeTarget(context: NPCResponseContext, skip: string): string | undefined {
    const active = context.gameState.contestants.filter(c => !c.isEliminated && c.name !== context.contestant.name && c.name !== context.gameState.playerName && c.name !== skip);
    const sorted = active.sort((a, b) => (b.psychProfile.suspicionLevel || 0) - (a.psychProfile.suspicionLevel || 0));
    return sorted[0]?.name || undefined;
  }

  private getAllianceMembersForNPC(context: NPCResponseContext): string[] {
    const alliances = context.gameState.alliances.filter(a => a.members.includes(context.contestant.name));
    // Return 2-3 other names in the closest alliance (highest strength)
    const best = alliances.sort((a, b) => (b.strength || 0) - (a.strength || 0))[0];
    if (!best) return [];
    return best.members.filter(m => m !== context.contestant.name && m !== context.gameState.playerName).slice(0, 3);
  }

  private computeMajorityThreshold(gameState: GameState): number {
    const activeCount = gameState.contestants.filter(c => !c.isEliminated).length;
    return Math.floor(activeCount / 2) + 1;
  }

  private listNames(names: string[]): string {
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }

  private determineTone(
    speechAct: SpeechAct,
    context: NPCResponseContext,
    personality?: NPCPersonalityProfile,
    perception?: NPCPlayerPerception
  ): NPCResponse['tone'] {
    if (!personality || !perception) return 'neutral';
    
    // Base tone on speech act and relationship
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
            npc.name, 'Player', consequence.value, 0, 0,
            'conversation', consequence.description, gameState.currentDay
          );
          break;
        case 'suspicion_change':
          relationshipGraphEngine.updateRelationship(
            npc.name, 'Player', 0, consequence.value, 0,
            'conversation', consequence.description, gameState.currentDay
          );
          break;
        case 'memory_creation':
          const memory: GameMemory = {
            day: gameState.currentDay,
            type: 'conversation',
            participants: ['Player', npc.name],
            content: `Significant conversation with Player`,
            emotionalImpact: response.memoryImpact,
            timestamp: Date.now()
          };
          npc.memory.push(memory);
          break;
      }
    });
  }

  private updateConversationHistory(npcName: string, playerMessage: string, npcResponse: string): void {
    let history = this.conversationHistory.get(npcName) || [];
    history.push(`Player: ${playerMessage}`);
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

import { Contestant, GameState, GameMemory } from '@/types/game';
import { PerceivedIntent, GlobalToneProfile, NPCSpecificToneProfile } from '@/types/interpretation';
import { speechActClassifier, SpeechAct } from './speechActClassifier';
import { relationshipGraphEngine, Relationship } from './relationshipGraphEngine';
import { npcAutonomyEngine, NPCPersonalityProfile } from './npcAutonomyEngine';
import { generateLocalAIReply } from './localLLM';
import { logInteractionToCloud, fetchRecentInteractions } from './interactionLogger';
import { analyzeSurface } from './textSurfaceAnalyzer';
import { conversationIntentEngine } from './conversationIntentEngine';
import { buildIntentHypotheses } from './intentHypothesisEngine';
import { socialInterpretationEngine } from './socialInterpretationEngine';

export type SocialContext = {
  alliances: string[];
  threats: string[];
  opportunities: string[];
  currentDramaTension: number;
  recentEvents: string[];
};

export type NPCResponseContext = {
  contestant: Contestant;
  playerName: string;
  relationship?: Relationship | null;
  recentMemories: GameMemory[];
  socialContext: SocialContext;
  conversationType: 'public' | 'private' | 'confessional';
};

type ToneProfileSnapshot = {
  globalTone: GlobalToneProfile;
  npcTone?: NPCSpecificToneProfile;
};

export type ResponseConsequence = {
  type: 'trust_change' | 'suspicion_change' | 'memory_creation' | 'reputation_change';
  value: number;
  description: string;
};

export type NPCResponse = {
  content: string;
  tone: 'friendly' | 'neutral' | 'aggressive' | 'suspicious' | 'flirty' | 'strategic';
  consequences: ResponseConsequence[];
  emotionalSubtext: {
    sincerity: number;
    manipulation: number;
    fear: number;
    attraction: number;
    anger: number;
  };
  memoryImpact: number;
  followUpAction?: 'dm_player' | 'form_alliance' | 'spread_rumor' | 'scheme';
};

type NPCPlayerPerception = {
  trustLevel: number;
  suspicionLevel: number;
  consistencyScore: number;
  lastInteractionDay: number;
  manipulationAwareness: number;
  playerRole: 'ally' | 'threat' | 'showmance' | 'neutral' | 'romantic_interest';
  linguisticNotes: string[];
};

class NPCResponseEngine {
  private conversationHistory: Map<string, string[]> = new Map();
  private npcPerceptions: Map<string, NPCPlayerPerception> = new Map();

  async generateResponse(
    playerMessage: string,
    targetNPC: string,
    gameState: GameState,
    conversationType: 'public' | 'private' | 'confessional'
  ): Promise<NPCResponse> {
    const npc = gameState.contestants.find(c => c.name === targetNPC);
    if (!npc) {
      console.error('NPC not found:', {
        targetNPC,
        availableContestants: gameState.contestants.map(c => c.name),
        totalContestants: gameState.contestants.length,
      });
      return {
        content: `💭 I'm not sure who you're talking to. (Debug: Looking for "${targetNPC}" but found ${gameState.contestants.length} contestants)`,
        tone: 'neutral',
        consequences: [],
        emotionalSubtext: {
          sincerity: 40,
          manipulation: 0,
          fear: 0,
          attraction: 0,
          anger: 0,
        },
        memoryImpact: 0,
      };
    }

    const speechAct: SpeechAct = speechActClassifier.classifyMessage(playerMessage, 'Player', {
      allContestantNames: gameState.contestants.map(c => c.name),
    });

    if (speechActClassifier.isMetaText(playerMessage)) {
      return this.generateMetaResponse(targetNPC, playerMessage);
    }

    // Layer 1: surface analysis (shape only, no meaning)
    const surface = analyzeSurface(playerMessage);

    const context = this.buildResponseContext(npc, gameState, speechAct, conversationType);
    const personality = npcAutonomyEngine.getNPCPersonality(npc.name);
    const perception = this.updateNPCPerception(npc.name, context, speechAct);

    // Layer 2 & 3: intent hypotheses and NPC-specific interpretation
    let socialReading: PerceivedIntent | undefined;
    try {
      const conversationIntent = conversationIntentEngine.parse(
        playerMessage,
        speechAct,
        gameState.contestants.map(c => c.name)
      );

      const intents = buildIntentHypotheses({
        message: playerMessage,
        speechAct,
        conversationIntent,
        surface,
        playerProfile: speechActClassifier.getPlayerProfile(),
      });

      const fallbackPersonality: NPCPersonalityProfile = personality || {
        aggressiveness: 50,
        manipulation: 50,
        loyalty: 50,
        paranoia: 50,
        charisma: 50,
        intelligence: 50,
        emotionality: 50,
        risk_tolerance: 50,
      };

      socialReading = socialInterpretationEngine.interpretForNPC({
        npcName: npc.name,
        intents,
        surface,
        personality: fallbackPersonality,
        npcContext: context,
      });
    } catch (e) {
      // Keep failures non-fatal; fall back to existing behavior
      console.warn('Social interpretation failed, falling back to base tone logic:', e);
    }

    const baseTone = this.determineTone(speechAct, context, personality, perception);
    const tone = socialReading
      ? this.adjustToneWithSocialReading(baseTone, socialReading, personality)
      : baseTone;

    // Pull recent cloud interactions between this NPC and the player
    let recentCloudInteractions:
      | {
          playerMessage: string;
          aiResponse: string;
          createdAt: string;
          type: string;
        }[]
      = [];
    if (gameState.playerName) {
      recentCloudInteractions = await fetchRecentInteractions({
        npcName: npc.name,
        playerName: gameState.playerName,
        limit: 6,
      });
    }

    const lastInteractionsFromCloud = recentCloudInteractions
      .slice(0, 3)
      .map(i => i.playerMessage || i.aiResponse)
      .filter(Boolean);

    const recentEventsFromCloud = recentCloudInteractions
      .slice(0, 5)
      .map(i => i.playerMessage || i.aiResponse)
      .filter(Boolean);

    // Use Lovable Cloud-backed memory for content generation
    let content: string;
    try {
      content = await generateLocalAIReply({
        playerMessage,
        parsedInput: speechAct,
        npc: {
          name: npc.name,
          publicPersona: npc.publicPersona,
          psychProfile: npc.psychProfile,
        },
        tone,
        conversationType,
        socialContext: {
          alliances: context.socialContext.alliances,
          threats: context.socialContext.threats,
          recentEvents: [
            ...recentEventsFromCloud,
            ...context.socialContext.recentEvents,
          ].slice(0, 8),
          lastInteractions: [
            ...lastInteractionsFromCloud,
            ...context.recentMemories.slice(-3).map(m => m.content),
          ].slice(0, 3),
        },
        playerName: gameState.playerName,
      });
    } catch (e) {
      console.warn('AI generation failed in npcResponseEngine, using rule-based fallback:', e);
      content = this.generateContent(speechAct, context, tone, playerMessage);
    }

    const emotionalSubtext = this.calculateEmotionalSubtext(speechAct, personality);

    const interpretationState = socialInterpretationEngine.getState();
    const toneProfiles: ToneProfileSnapshot = {
      globalTone: interpretationState.globalTone,
      npcTone: interpretationState.npcTone.get(npc.name),
    };

    const consequences = this.calculateConsequences(
      speechAct,
      emotionalSubtext,
      socialReading,
      toneProfiles
    );
    const followUpAction = this.determineFollowUpAction(
      speechAct,
      context,
      tone,
      consequences,
      socialReading,
      toneProfiles
    );
    const memoryImpact = this.calculateMemoryImpact(speechAct, emotionalSubtext);

    this.processResponseConsequences(npc, context.playerName, consequences, gameState);
    this.updateConversationHistory(npc.name, playerMessage, content);

    void logInteractionToCloud({
      day: gameState.currentDay,
      type:
        conversationType === 'confessional'
          ? 'confessional'
          : conversationType === 'private'
          ? 'dm'
          : 'conversation',
      participants: [gameState.playerName, npc.name].filter(Boolean),
      npcName: npc.name,
      playerName: gameState.playerName,
      playerMessage,
      aiResponse: content,
      tone,
    });

    return {
      content,
      tone,
      consequences,
      emotionalSubtext,
      memoryImpact,
      followUpAction,
    };
  }

  private buildResponseContext(
    npc: Contestant,
    gameState: GameState,
    speechAct: SpeechAct,
    conversationType: 'public' | 'private' | 'confessional'
  ): NPCResponseContext {
    const playerName = gameState.playerName;
    const relationship = relationshipGraphEngine.getRelationship(npc.name, playerName);
    const recentMemories = (npc.memory || []).filter(
      m => m.day >= gameState.currentDay - 3 && m.participants.includes(playerName)
    );

    const alliancesForNPC = gameState.alliances.filter(a => a.members.includes(npc.name));
    const alliancePartners = Array.from(
      new Set(
        alliancesForNPC
          .flatMap(a => a.members)
          .filter(name => name !== npc.name)
      )
    );

    const threatCandidates = gameState.contestants.filter(
      c => !c.isEliminated && c.name !== npc.name
    );
    const threats = threatCandidates
      .filter(c => {
        const rel = relationshipGraphEngine.getRelationship(npc.name, c.name);
        return rel ? rel.suspicion > 60 : false;
      })
      .map(c => c.name);

    const opportunities = threatCandidates
      .filter(c => {
        const rel = relationshipGraphEngine.getRelationship(npc.name, c.name);
        return rel ? rel.trust > 65 && !rel.isInAlliance : false;
      })
      .map(c => c.name);

    const recentEvents: string[] = (npc.memory || [])
      .filter(m => m.day >= gameState.currentDay - 2)
      .slice(-4)
      .map(m => m.content);

    const dramaEvents = (gameState.interactionLog || []).filter(
      entry =>
        entry.day >= gameState.currentDay - 2 &&
        (entry.type === 'scheme' || entry.type === 'alliance_meeting' || entry.type === 'activity')
    );
    const currentDramaTension = Math.max(
      10,
      Math.min(100, 30 + dramaEvents.length * 10 + (speechAct.threatLevel || 0) * 0.2)
    );

    const socialContext: SocialContext = {
      alliances: alliancePartners,
      threats,
      opportunities,
      currentDramaTension,
      recentEvents,
    };

    return {
      contestant: npc,
      playerName,
      relationship,
      recentMemories,
      socialContext,
      conversationType,
    };
  }

  private initializeNPCPerception(): NPCPlayerPerception {
    return {
      trustLevel: 50,
      suspicionLevel: 30,
      consistencyScore: 50,
      lastInteractionDay: 1,
      manipulationAwareness: 20,
      playerRole: 'neutral',
      linguisticNotes: [],
    };
  }

  private updateNPCPerception(
    npcName: string,
    context: NPCResponseContext,
    speechAct: SpeechAct
  ): NPCPlayerPerception {
    let perception = this.npcPerceptions.get(npcName);
    if (!perception) {
      perception = this.initializeNPCPerception();
    }

    if (context.relationship) {
      perception.trustLevel = context.relationship.trust;
      perception.suspicionLevel = context.relationship.suspicion;
      perception.lastInteractionDay =
        context.relationship.lastInteraction ||
        context.recentMemories.at(-1)?.day ||
        perception.lastInteractionDay;
    }

    const manipulationSignal = speechAct.manipulationLevel ?? 0;
    perception.manipulationAwareness = Math.max(
      0,
      Math.min(100, perception.manipulationAwareness * 0.8 + manipulationSignal * 0.2)
    );

    const extremity =
      Math.max(
        speechAct.emotionalSubtext?.anger || 0,
        speechAct.emotionalSubtext?.fear || 0
      ) / 100;
    perception.consistencyScore = Math.max(
      0,
      Math.min(100, perception.consistencyScore * 0.9 + (1 - extremity) * 10)
    );

    perception.playerRole = this.inferPlayerRole(context, perception);

    const pattern = this.analyzeLinguisticPattern(speechAct);
    if (pattern) {
      perception.linguisticNotes.push(pattern);
      if (perception.linguisticNotes.length > 8) {
        perception.linguisticNotes = perception.linguisticNotes.slice(-8);
      }
    }

    this.npcPerceptions.set(npcName, perception);
    return perception;
  }

  private inferPlayerRole(
    context: NPCResponseContext,
    perception: NPCPlayerPerception
  ): NPCPlayerPerception['playerRole'] {
    const rel = context.relationship;
    if (!rel) return 'neutral';

    if (rel.trust > 70 && rel.emotionalCloseness > 65) {
      return 'showmance';
    }
    if (rel.trust > 65 && rel.suspicion < 40) {
      return 'ally';
    }
    if (rel.suspicion > 65 || perception.manipulationAwareness > 70) {
      return 'threat';
    }
    return 'neutral';
  }

  private determineTone(
    speechAct: SpeechAct,
    context: NPCResponseContext,
    personality?: NPCPersonalityProfile,
    perception?: NPCPlayerPerception
  ): NPCResponse['tone'] {
    let tone: NPCResponse['tone'] = 'neutral';

    if (speechAct.primary === 'flirting' && perception?.playerRole === 'showmance') {
      tone = 'flirty';
    } else if (speechAct.threatLevel > 60) {
      tone = 'aggressive';
    } else if (
      speechAct.manipulationLevel > 60 ||
      (perception?.manipulationAwareness || 0) > 60
    ) {
      tone = 'suspicious';
    } else if (context.relationship && context.relationship.trust > 60) {
      tone = 'friendly';
    } else if (speechAct.informationSeeking) {
      tone = 'strategic';
    }

    if (personality) {
      if (personality.aggressiveness > 75 && tone === 'neutral') {
        tone = 'aggressive';
      }
      if (
        personality.charisma > 75 &&
        tone === 'neutral' &&
        context.relationship?.trust > 55
      ) {
        tone = 'friendly';
      }
    }

    if (context.socialContext.currentDramaTension > 70 && tone === 'neutral') {
      tone = 'suspicious';
    } else if (context.socialContext.currentDramaTension < 30 && tone === 'suspicious') {
      tone = 'neutral';
    }

    return tone;
  }

  /**
   * Adjust the base tone using NPC-specific social interpretation.
   * This is intentionally conservative: it nudges, not overrides.
   */
  private adjustToneWithSocialReading(
    baseTone: NPCResponse['tone'],
    socialReading: PerceivedIntent,
    personality?: NPCPersonalityProfile
  ): NPCResponse['tone'] {
    let tone = baseTone;

    // If interpretation is very uncertain, keep base tone
    if (socialReading.certainty < 0.35) {
      return tone;
    }

    const hostile = socialReading.perceivedHostility;
    const warm = socialReading.perceivedWarmth;

    // High perceived warmth can soften neutral/suspicious tones
    if (warm > 70 && hostile < 40) {
      if (tone === 'neutral' || tone === 'suspicious') {
        tone = 'friendly';
      }
    }

    // High perceived hostility can sharpen neutral/friendly tones
    if (hostile > 70) {
      const aggressiveBias = personality?.aggressiveness ?? 50;
      if (tone === 'neutral' && aggressiveBias > 60) {
        tone = 'aggressive';
      } else if (tone === 'friendly') {
        tone = 'suspicious';
      }
    }

    return tone;
  }

  private generateContent(
    speechAct: SpeechAct,
    context: NPCResponseContext,
    tone: NPCResponse['tone'],
    _playerMessage: string
  ): string {
    const ally = context.socialContext.alliances[0];
    const threat = context.socialContext.threats[0];
    const recent = context.socialContext.recentEvents[0];
    const mention = speechAct.namedMentions?.[0];

    const player = context.playerName || 'you';

    switch (speechAct.primary) {
      case 'alliance_proposal':
        if (tone === 'friendly' || tone === 'strategic') {
          const partner = ally || player;
          return `If we lock in with ${partner}, we can keep the numbers clean. I'm open, but no leaks.`;
        }
        return `You want to work together? I need to see consistency before I commit to anything.`;

      case 'flirting':
        if (tone === 'flirty') {
          return `You're bold, ${player}. I like it, but let's keep this between us and off the feeds.`;
        }
        return `You're charming, but I'm not sure mixing game and feelings is smart.`;

      case 'information_fishing': {
        const subject = mention || threat || ally || 'people';
        if (tone === 'strategic') {
          return `What exactly about ${subject}? Votes, alliances, or just vibes? I don't hand out info for free.`;
        }

        if (tone === 'suspicious' || context.socialContext.currentDramaTension > 60) {
          return `You keep circling around ${subject}. If you want something from me, say whether you're protecting me or aiming at me.`;
        }

        return `You're probing a lot right now, and I'm clocking it. Be clear whether you want numbers, a target, or just reassurance.`;
      }

      case 'expressing_trust':
        return `I hear you. Trust goes both ways, and I'm clocking how you move as much as what you say.`;

      case 'expressing_suspicion':
        return `If you have doubts, say them clean. Half-accusations just make everyone more paranoid.`;

      case 'testing_loyalty':
        return `You're not wrong to test people. Just remember I'm tracking who tests and who actually shows up.`;

      case 'complimenting':
        return `I appreciate that. Compliments are nice, but actions on vote night matter more.`;

      case 'insulting':
        if (tone === 'aggressive') {
          return `Careful. If you're going to come for me like that, you better not miss.`;
        }
        return `Okay. Noted. But throwing shots says more about your position than mine.`;

      default:
        break;
    }

    if (tone === 'friendly') {
      return recent
        ? `I get where you're coming from. After ${recent.toLowerCase()}, I'm trying to keep things solid with you.`
        : `I get it. I'm trying to keep things simple and honest between us in here.`;
    }

    if (tone === 'aggressive') {
      const target = mention || threat || player;
      return `If you're pushing this hard on ${target}, don't be surprised when people start pushing back.`;
    }

    if (tone === 'suspicious') {
      const target = mention || player;
      return `Why are you asking me this about ${target}? I'm not convinced your angle is clean.`;
    }

    if (tone === 'strategic') {
      const focus = mention || threat || ally || 'the vote';
      return `We can talk strategy about ${focus}, but I need to know you're not repeating this word-for-word.`;
    }

    return `I hear you. I'm taking all of this in and figuring out where you actually stand.`;
  }

  private calculateEmotionalSubtext(
    speechAct: SpeechAct,
    personality?: NPCPersonalityProfile
  ): NPCResponse['emotionalSubtext'] {
    const base = speechAct.emotionalSubtext || {
      sincerity: 50,
      manipulation: 0,
      fear: 0,
      attraction: 0,
      anger: 0,
      confidence: 50,
      desperation: 0,
    };

    if (!personality) {
      return {
        sincerity: base.sincerity,
        manipulation: base.manipulation,
        fear: base.fear,
        attraction: base.attraction,
        anger: base.anger,
      };
    }

    return {
      sincerity: Math.max(0, Math.min(100, base.sincerity - personality.manipulation * 0.3)),
      manipulation: Math.min(100, base.manipulation + personality.manipulation * 0.3),
      fear: Math.min(100, base.fear + personality.paranoia * 0.2),
      attraction: base.attraction,
      anger: Math.min(100, base.anger + personality.aggressiveness * 0.2),
    };
  }

  private calculateConsequences(
    speechAct: SpeechAct,
    emotionalSubtext: NPCResponse['emotionalSubtext'],
    socialReading?: PerceivedIntent,
    toneProfiles?: ToneProfileSnapshot
  ): ResponseConsequence[] {
    const consequences: ResponseConsequence[] = [];

    let trustDelta = 0;
    let suspicionDelta = 0;
    const trustReasons: string[] = [];
    const suspicionReasons: string[] = [];

    // Baseline from explicit trust-building and manipulation signals
    if (speechAct.trustBuilding && emotionalSubtext.sincerity > 40) {
      const baseTrust = 5 + emotionalSubtext.sincerity * 0.1;
      trustDelta += baseTrust;
      trustReasons.push('Player seems genuinely invested in trust');
    }

    if (speechAct.manipulationLevel > 50) {
      const baseSuspicion = speechAct.manipulationLevel * 0.2;
      suspicionDelta += baseSuspicion;
      suspicionReasons.push('Player is coming off as manipulative');
    }

    // Strongly emotional / threatening moments are still memorable on their own
    if (speechAct.threatLevel > 40 || emotionalSubtext.anger > 40) {
      consequences.push({
        type: 'memory_creation',
        value: Math.max(speechAct.threatLevel, emotionalSubtext.anger),
        description: 'Confrontational or tense interaction',
      });
    }

    // Fold in NPC-specific social interpretation
    if (socialReading) {
      const warmth = socialReading.perceivedWarmth;
      const hostility = socialReading.perceivedHostility;
      const certainty = socialReading.certainty;
      const certaintyScale = 0.5 + certainty * 0.5; // 0.5..1

      // Warmth can amplify trust when things feel genuinely connective
      if (warmth > 55 && hostility < 50) {
        const warmthBoost = ((warmth - 55) / 45) * 6; // up to ~6 at warmth 100
        trustDelta += warmthBoost * certaintyScale;
        trustReasons.push('NPC reads the player as warm and connective');
      }

      // Hostility pushes toward suspicion
      if (hostility > 55) {
        const hostilityBoost = ((hostility - 55) / 45) * 8; // up to ~8
        suspicionDelta += hostilityBoost * certaintyScale;
        suspicionReasons.push('NPC reads the player as hostile or adversarial');
      }

      // Social strategy and motive shading
      if (socialReading.perceivedSocialStrategy === 'bonding') {
        trustDelta += 2 * certaintyScale;
        trustReasons.push('Social strategy feels bonding');
      } else if (
        socialReading.perceivedSocialStrategy === 'distancing' ||
        socialReading.perceivedSocialStrategy === 'dominance'
      ) {
        suspicionDelta += 2 * certaintyScale;
        suspicionReasons.push('Social strategy feels distancing or dominant');
      }

      if (socialReading.perceivedGameMotive === 'reputation_management') {
        suspicionDelta += 3 * certaintyScale;
        suspicionReasons.push('Conversation feels like reputation management');
      }

      if (socialReading.divergenceScore > 60) {
        suspicionDelta += 2 * certaintyScale;
        suspicionReasons.push('Player behavior feels inconsistent with prior pattern');
      }
    }

    // Tone profiles capture slower-moving impressions over many messages
    if (toneProfiles) {
      const { globalTone, npcTone } = toneProfiles;

      // Globally volatile tone creates a small ongoing suspicion tax
      if (globalTone.emotionalVolatility > 65) {
        suspicionDelta += 1.5;
        suspicionReasons.push('Player has been emotionally volatile overall');
      }

      if (npcTone) {
        if (npcTone.perceivedFakeness > 55) {
          if (trustDelta > 0) {
            trustDelta *= 0.6; // dampen trust gains when the player feels fake
            trustReasons.push('Perceived fakeness dampens trust gains');
          }
          suspicionDelta += 2;
          suspicionReasons.push('NPC suspects the player is being fake');
        }

        if (npcTone.perceivedConsistency > 65 && suspicionDelta > 0) {
          // Consistent behavior can soften some suspicion
          suspicionDelta *= 0.8;
          suspicionReasons.push('Consistent behavior tempers suspicion slightly');
        }
      }
    }

    if (trustDelta !== 0) {
      const clampedTrust = Math.max(-10, Math.min(20, trustDelta));
      consequences.push({
        type: 'trust_change',
        value: clampedTrust,
        description:
          trustReasons.join('; ') ||
          'Trust shifts based on how the player comes across',
      });
    }

    if (suspicionDelta !== 0) {
      const clampedSuspicion = Math.max(0, Math.min(25, suspicionDelta));
      consequences.push({
        type: 'suspicion_change',
        value: clampedSuspicion,
        description:
          suspicionReasons.join('; ') ||
          'Suspicion shifts based on how the player comes across',
      });
    }

    return consequences;
  }

  private determineFollowUpAction(
    speechAct: SpeechAct,
    context: NPCResponseContext,
    tone: NPCResponse['tone'],
    consequences: ResponseConsequence[],
    socialReading?: PerceivedIntent,
    toneProfiles?: ToneProfileSnapshot
  ): NPCResponse['followUpAction'] | undefined {
    const drama = context.socialContext.currentDramaTension;
    const rel = context.relationship;
    const suspicionShift = consequences.find(
      c => c.type === 'suspicion_change' && c.value > 0
    );

    const npcTone = toneProfiles?.npcTone;
    const globalTone = toneProfiles?.globalTone;
    const warmth = socialReading?.perceivedWarmth ?? 0;
    const hostility = socialReading?.perceivedHostility ?? 0;
    const certainty = socialReading?.certainty ?? 0;

    const hasSuspicion = !!suspicionShift && suspicionShift.value > 0;
    const highWarm = warmth > 65;
    const highHostile = hostility > 65;
    const conflictAvoidantPlayer = globalTone ? globalTone.conflictAvoidance > 60 : false;
    const playerFeelsFake = npcTone ? npcTone.perceivedFakeness > 60 : false;

    // Alliance formation: explicit proposal OR clear alliance-signaling motive
    if (
      rel &&
      rel.trust > 60 &&
      (rel.suspicion ?? 0) < 55 &&
      (speechAct.primary === 'alliance_proposal' ||
        socialReading?.perceivedGameMotive === 'alliance_signaling')
    ) {
      return 'form_alliance';
    }

    // Strategic information-seeking often invites a DM follow-up rather than public chatter
    if (speechAct.informationSeeking && tone === 'strategic') {
      if (hasSuspicion && (playerFeelsFake || highHostile) && drama > 55) {
        // If this info-fishing feels shady in a hot house, treat it as rumor fuel
        return 'spread_rumor';
      }
      return 'dm_player';
    }

    // Warm, public bonding with solid trust can move to a private check-in
    if (
      context.conversationType === 'public' &&
      rel &&
      rel.trust > 55 &&
      (rel.suspicion ?? 0) < 50 &&
      highWarm &&
      !hasSuspicion &&
      (conflictAvoidantPlayer || tone === 'friendly')
    ) {
      return 'dm_player';
    }

    // Decide when this turns into rumor fuel vs private scheming
    if (hasSuspicion) {
      const suspicionIntensity = suspicionShift!.value;
      const baseThreshold = 65;
      const fakenessBias = playerFeelsFake ? -10 : 0;
      const volatilityBias = globalTone && globalTone.emotionalVolatility > 70 ? -5 : 0;
      const rumorThreshold = baseThreshold + fakenessBias + volatilityBias;

      if (
        (drama > rumorThreshold || tone === 'aggressive' || highHostile) &&
        certainty > 0.4 &&
        suspicionIntensity > 0
      ) {
        return 'spread_rumor';
      }

      // If suspicion is present but not explosive, this leans toward quiet scheming
      if (tone === 'aggressive' || hostility > 55) {
        return 'scheme';
      }
    }

    // Fallback: aggressive tone without clear suspicion still pushes toward scheming
    if (tone === 'aggressive') {
      return 'scheme';
    }

    return undefined;
  }

  private calculateMemoryImpact(
    speechAct: SpeechAct,
    emotionalSubtext: NPCResponse['emotionalSubtext']
  ): number {
    let impact = 5;

    impact += speechAct.confidence * 0.1;
    impact += emotionalSubtext.anger * 0.15;
    impact += emotionalSubtext.fear * 0.1;
    impact += speechAct.manipulationLevel * 0.1;
    impact += speechAct.threatLevel * 0.2;

    return Math.min(10, Math.max(-10, Math.round(impact)));
  }

  private processResponseConsequences(
    npc: Contestant,
    playerName: string,
    consequences: ResponseConsequence[],
    gameState: GameState
  ): void {
    consequences.forEach(consequence => {
      switch (consequence.type) {
        case 'trust_change':
          relationshipGraphEngine.updateRelationship(
            npc.name,
            playerName,
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
            playerName,
            0,
            consequence.value,
            0,
            'conversation',
            consequence.description,
            gameState.currentDay
          );
          break;
        case 'memory_creation':
          npc.memory.push({
            day: gameState.currentDay,
            type: 'conversation',
            participants: [playerName, npc.name],
            content: consequence.description,
            emotionalImpact: Math.max(
              -10,
              Math.min(10, Math.round(consequence.value / 10))
            ),
            timestamp: Date.now(),
          });
          break;
        case 'reputation_change':
          // Reputation change could propagate to other NPCs; keep local for now.
          break;
      }
    });
  }

  private updateConversationHistory(
    npcName: string,
    playerMessage: string,
    npcReply: string
  ): void {
    const history = this.conversationHistory.get(npcName) || [];
    history.push(`Player: ${playerMessage}`);
    history.push(`${npcName}: ${npcReply}`);
    const trimmed = history.slice(-10);
    this.conversationHistory.set(npcName, trimmed);
  }

  private analyzeLinguisticPattern(speechAct: SpeechAct): string | null {
    const sub = speechAct.emotionalSubtext;
    if (!sub) return null;

    if (sub.anger > 60) return 'angry';
    if (sub.fear > 60) return 'anxious';
    if (sub.attraction > 60) return 'flirty';
    if (sub.manipulation > 60) return 'manipulative';
    if (sub.sincerity > 70) return 'formal';
    return null;
  }

  private generateMetaResponse(targetNPC: string, message: string): NPCResponse {
    const metaText = speechActClassifier.generateMetaResponse(targetNPC, message);

    return {
      content: metaText,
      tone: 'suspicious',
      consequences: [
        {
          type: 'suspicion_change',
          value: 20,
          description: 'Player is acting strangely or breaking the fourth wall',
        },
        {
          type: 'reputation_change',
          value: -10,
          description: 'Others might see the player as unstable',
        },
      ],
      emotionalSubtext: {
        sincerity: 10,
        manipulation: 0,
        fear: 15,
        attraction: 0,
        anger: 5,
      },
      memoryImpact: 8,
    };
  }

  getNPCPerception(npcName: string): NPCPlayerPerception | undefined {
    return this.npcPerceptions.get(npcName);
  }

  getConversationHistory(npcName: string): string[] {
    return this.conversationHistory.get(npcName) || [];
  }
}

export const npcResponseEngine = new NPCResponseEngine();
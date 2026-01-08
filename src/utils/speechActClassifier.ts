// Speech Act Classification Engine for The Edit
export type SpeechAct = {
  primary: SpeechActType;
  secondary?: SpeechActType;
  confidence: number; // 0-100
  emotionalSubtext: EmotionalSubtext;
  manipulationLevel: number; // 0-100
  informationSeeking: boolean;
  trustBuilding: boolean;
  threatLevel: number; // 0-100
  namedMentions?: string[]; // Contestant names detected in player's message
};

export type SpeechActType = 
  | 'alliance_proposal'
  | 'flirting'
  | 'threatening'
  | 'testing_loyalty'
  | 'gaslighting'
  | 'information_fishing'
  | 'sabotaging'
  | 'withholding_info'
  | 'distracting'
  | 'downplaying_betrayal'
  | 'expressing_trust'
  | 'expressing_suspicion'
  | 'seeking_reassurance'
  | 'deflecting'
  | 'provoking'
  | 'complimenting'
  | 'insulting'
  | 'confessing'
  | 'lying'
  | 'gossiping'
  | 'banter'
  | 'neutral_conversation';

export type EmotionalSubtext = {
  anger: number;
  fear: number;
  attraction: number;
  manipulation: number;
  sincerity: number;
  desperation: number;
  confidence: number;
};

export type PlayerLinguisticProfile = {
  averageMessageLength: number;
  formalityLevel: number; // 0-100
  emotionalExpressiveness: number; // 0-100
  manipulationTendency: number; // 0-100
  directnessLevel: number; // 0-100
  vocabularyComplexity: number; // 0-100
  questioningFrequency: number; // 0-100
  commonPhrases: string[];
  speechPatterns: string[];
  lastAnalyzedMessages: string[];
  totalMessagesAnalyzed: number;
};

class SpeechActClassifier {
  private playerProfile: PlayerLinguisticProfile;
  private speechActPatterns: Map<SpeechActType, RegExp[]>;
  private emotionalWords: Map<string, EmotionalSubtext>;

  constructor() {
    this.playerProfile = this.initializePlayerProfile();
    this.speechActPatterns = this.initializeSpeechActPatterns();
    this.emotionalWords = this.initializeEmotionalWords();
  }

  private initializePlayerProfile(): PlayerLinguisticProfile {
    return {
      averageMessageLength: 50,
      formalityLevel: 50,
      emotionalExpressiveness: 50,
      manipulationTendency: 30,
      directnessLevel: 50,
      vocabularyComplexity: 50,
      questioningFrequency: 20,
      commonPhrases: [],
      speechPatterns: [],
      lastAnalyzedMessages: [],
      totalMessagesAnalyzed: 0
    };
  }

  private initializeSpeechActPatterns(): Map<SpeechActType, RegExp[]> {
    const patterns = new Map<SpeechActType, RegExp[]>();

    patterns.set('alliance_proposal', [
      /\b(work together|team up|alliance|partner|trust each other)\b/i,
      /\b(we should|let's stick|join forces|have my back)\b/i,
      /\b(mutual benefit|protect each other|stronger together)\b/i
    ]);

    patterns.set('flirting', [
      /\b(cute|attractive|like you|special connection|chemistry)\b/i,
      /\b(spend time|alone together|private|intimate)\b/i,
      /\b(beautiful|handsome|charming|amazing|incredible)\b/i
    ]);

    patterns.set('threatening', [
      /\b(or else|better watch|regret|consequences|warning)\b/i,
      /\b(make you pay|get you|destroy|ruin|eliminate)\b/i,
      /\b(don't mess|cross me|enemy|target)\b/i
    ]);

    patterns.set('testing_loyalty', [
      /\b(can I trust|are you with|where do you stand|loyalty)\b/i,
      /\b(prove|show me|demonstrate|test)\b/i,
      /\b(really on my side|actually support|genuine)\b/i
    ]);

    patterns.set('gaslighting', [
      /\b(you're imagining|didn't happen|misremembering|paranoid)\b/i,
      /\b(overreacting|too sensitive|crazy|dramatic)\b/i,
      /\b(that's not what|never said|you're confused)\b/i
    ]);

    patterns.set('information_fishing', [
      /\b(what do you think about|heard anything|know anything|what's the word)\b/i,
      /\b(tell me about|fill me in|what's happening|insider info)\b/i,
      /\b(between you and me|confidentially|secretly)\b/i
    ]);

    patterns.set('sabotaging', [
      /\b(spread the word|everyone should know|expose|reveal)\b/i,
      /\b(can't be trusted|fake|liar|manipulative)\b/i,
      /\b(turn against|poison|undermine)\b/i
    ]);

    patterns.set('withholding_info', [
      /\b(can't say|won't tell|secret|private|classified)\b/i,
      /\b(not ready|maybe later|ask me tomorrow)\b/i,
      /\b(need to know basis|selective|protected)\b/i
    ]);

    patterns.set('expressing_suspicion', [
      /\b(don't trust|suspicious|fishy|sketchy|shady)\b/i,
      /\b(something's off|not right|weird|strange)\b/i,
      /\b(hiding something|lying|deceptive)\b/i
    ]);

    patterns.set('seeking_reassurance', [
      /\b(am I safe|do you still|everything okay|worried)\b/i,
      /\b(need to know|promise me|swear|guarantee)\b/i,
      /\b(still friends|still allies|still together)\b/i
    ]);

    patterns.set('deflecting', [
      /\b(change the subject|talk about something else|anyway)\b/i,
      /\b(not important|doesn't matter|forget about it)\b/i,
      /\b(moving on|whatever|so what)\b/i
    ]);

    // Added depth: more social/game speech acts
    patterns.set('expressing_trust', [
      /\b(trust you|i trust|honest|be straight|be real)\b/i,
      /\b(open with you|transparent|no games)\b/i,
      /\b(promise|i swear|you have my word)\b/i,
    ]);

    patterns.set('complimenting', [
      /\b(respect|impressed|smart|strong|social|well played)\b/i,
      /\b(good read|nice move|great game|admire)\b/i,
    ]);

    patterns.set('insulting', [
      /\b(stupid|idiot|coward|snake|fake|two-faced)\b/i,
      /\b(useless|pathetic|weak|annoying)\b/i,
    ]);

    patterns.set('confessing', [
      /\b(i lied|i messed up|i was wrong|my fault|i'm sorry|apologize)\b/i,
      /\b(confess|truth is|to be honest)\b/i,
    ]);

    patterns.set('lying', [
      /\b(honestly|truth is)\b(?!)/i, // weak heuristic; strengthened by context elsewhere
      /\b(swore i didn't|never happened|that's not true)\b/i,
    ]);

    patterns.set('provoking', [
      /\b(try me|say it to my face|do something|make me)\b/i,
      /\b(bet you won't|come at me|bring it)\b/i,
    ]);

    patterns.set('gossiping', [
      /\b(did you hear|rumor|they said|apparently)\b/i,
      /\b(secret|talking about|word is)\b/i,
    ]);

    patterns.set('banter', [
      /\b(lol|haha|lmao|rofl)\b/i,
      /\b(joking|kidding|just kidding|banter|funny)\b/i,
    ]);

    return patterns;
  }

  private initializeEmotionalWords(): Map<string, EmotionalSubtext> {
    const words = new Map<string, EmotionalSubtext>();

    // Anger words
    ['angry', 'furious', 'mad', 'pissed', 'rage', 'hate'].forEach(word => {
      words.set(word, { anger: 80, fear: 0, attraction: 0, manipulation: 20, sincerity: 70, desperation: 30, confidence: 60 });
    });

    // Fear words
    ['scared', 'afraid', 'worried', 'nervous', 'terrified', 'anxious'].forEach(word => {
      words.set(word, { anger: 0, fear: 80, attraction: 0, manipulation: 10, sincerity: 80, desperation: 60, confidence: 20 });
    });

    // Attraction words
    ['love', 'adore', 'attracted', 'beautiful', 'gorgeous', 'sexy'].forEach(word => {
      words.set(word, { anger: 0, fear: 0, attraction: 90, manipulation: 30, sincerity: 60, desperation: 20, confidence: 70 });
    });

    // Sincerity/repair/thanks
    ['sorry', 'apologize', 'apologies', 'forgive', 'thank', 'thanks', 'appreciate', 'grateful', 'honest', 'truth'].forEach(word => {
      words.set(word, { anger: 0, fear: 0, attraction: 0, manipulation: 0, sincerity: 85, desperation: 10, confidence: 55 });
    });

    // Respect/admiration
    ['respect', 'admire', 'impressed', 'well played'].forEach(word => {
      words.set(word, { anger: 0, fear: 0, attraction: 20, manipulation: 10, sincerity: 75, desperation: 5, confidence: 60 });
    });

    // Hostile insults
    ['stupid', 'idiot', 'coward', 'snake', 'fake', 'useless', 'pathetic', 'weak'].forEach(word => {
      words.set(word, { anger: 85, fear: 0, attraction: 0, manipulation: 20, sincerity: 20, desperation: 15, confidence: 70 });
    });

    // Light banter / humor
    ['lol', 'haha', 'lmao', 'rofl', 'kidding', 'joking', 'funny'].forEach(word => {
      words.set(word, { anger: 0, fear: 0, attraction: 10, manipulation: 0, sincerity: 65, desperation: 0, confidence: 60 });
    });

    // Gossip-y markers (slightly manipulative, moderate sincerity)
    ['rumor', 'apparently', 'secret'].forEach(word => {
      words.set(word, { anger: 0, fear: 5, attraction: 0, manipulation: 40, sincerity: 40, desperation: 10, confidence: 50 });
    });

    return words;
  }

  // Main classification function
  classifyMessage(message: string, speaker: string, context?: any): SpeechAct {
    // Update player profile
    this.updatePlayerProfile(message, speaker);

    // Detect speech acts
    const detectedActs = this.detectSpeechActs(message);
    const emotionalSubtext = this.analyzeEmotionalSubtext(message);
    const manipulationLevel = this.calculateManipulationLevel(message);
    const threatLevel = this.calculateThreatLevel(message);

    // Determine primary speech act
    const primary = detectedActs.length > 0 ? detectedActs[0].type : 'neutral_conversation';
    const secondary = detectedActs.length > 1 ? detectedActs[1].type : undefined;
    const confidence = detectedActs.length > 0 ? detectedActs[0].confidence : 50;

    // Named mentions (contestant names) if provided
    const allNames: string[] = Array.isArray(context?.allContestantNames) ? context.allContestantNames : [];
    const namedMentions = allNames.length ? this.extractNamesFromMessage(message, allNames) : [];

    return {
      primary,
      secondary,
      confidence,
      emotionalSubtext,
      manipulationLevel,
      informationSeeking: this.isInformationSeeking(message),
      trustBuilding: this.isTrustBuilding(message),
      threatLevel,
      namedMentions
    };
  }

  private updatePlayerProfile(message: string, speaker: string): void {
    if (speaker !== 'Player') return;

    this.playerProfile.totalMessagesAnalyzed++;
    this.playerProfile.lastAnalyzedMessages.push(message);
    
    // Keep only last 20 messages
    if (this.playerProfile.lastAnalyzedMessages.length > 20) {
      this.playerProfile.lastAnalyzedMessages = this.playerProfile.lastAnalyzedMessages.slice(-20);
    }

    // Update average message length
    this.playerProfile.averageMessageLength = 
      (this.playerProfile.averageMessageLength * (this.playerProfile.totalMessagesAnalyzed - 1) + message.length) / 
      this.playerProfile.totalMessagesAnalyzed;

    // Update formality level
    const formalWords = ['please', 'thank you', 'would', 'could', 'might', 'perhaps'];
    const formalCount = formalWords.filter(word => message.toLowerCase().includes(word)).length;
    this.playerProfile.formalityLevel = 
      (this.playerProfile.formalityLevel * 0.9) + (formalCount / formalWords.length * 100 * 0.1);

    // Update emotional expressiveness
    const emotionalPunctuation = (message.match(/[!?]{2,}|[.]{3,}/g) || []).length;
    const capsWords = (message.match(/[A-Z]{2,}/g) || []).length;
    const emotionalScore = Math.min(100, (emotionalPunctuation + capsWords) * 20);
    this.playerProfile.emotionalExpressiveness = 
      (this.playerProfile.emotionalExpressiveness * 0.9) + (emotionalScore * 0.1);

    // Update questioning frequency
    const questionCount = (message.match(/\?/g) || []).length;
    const questioningScore = Math.min(100, questionCount * 50);
    this.playerProfile.questioningFrequency = 
      (this.playerProfile.questioningFrequency * 0.9) + (questioningScore * 0.1);

    // Update manipulation tendency
    const manipulativePatterns = /\b(convince|persuade|make you|should really|trust me|between us)\b/gi;
    const manipulativeMatches = (message.match(manipulativePatterns) || []).length;
    const manipulationScore = Math.min(100, manipulativeMatches * 25);
    this.playerProfile.manipulationTendency = 
      (this.playerProfile.manipulationTendency * 0.9) + (manipulationScore * 0.1);
  }

  private detectSpeechActs(message: string): Array<{type: SpeechActType, confidence: number}> {
    const detectedActs: Array<{type: SpeechActType, confidence: number}> = [];

    this.speechActPatterns.forEach((patterns, actType) => {
      let matchCount = 0;
      let totalPatterns = patterns.length;

      patterns.forEach(pattern => {
        if (pattern.test(message)) {
          matchCount++;
        }
      });

      if (matchCount > 0) {
        const confidence = (matchCount / totalPatterns) * 100;
        detectedActs.push({ type: actType, confidence });
      }
    });

    // Sort by confidence
    detectedActs.sort((a, b) => b.confidence - a.confidence);

    return detectedActs;
  }

  private analyzeEmotionalSubtext(message: string): EmotionalSubtext {
    const subtext: EmotionalSubtext = {
      anger: 0,
      fear: 0,
      attraction: 0,
      manipulation: 0,
      sincerity: 50,
      desperation: 0,
      confidence: 50
    };

    // Analyze words
    const words = message.toLowerCase().split(/\s+/);
    let matchedWords = 0;

    words.forEach(word => {
      const emotionalData = this.emotionalWords.get(word);
      if (emotionalData) {
        matchedWords++;
        Object.keys(subtext).forEach(key => {
          subtext[key as keyof EmotionalSubtext] += emotionalData[key as keyof EmotionalSubtext];
        });
      }
    });

    // Average the values
    if (matchedWords > 0) {
      Object.keys(subtext).forEach(key => {
        subtext[key as keyof EmotionalSubtext] /= matchedWords;
      });
    }

    // Analyze punctuation and caps for emotional intensity
    const exclamationCount = (message.match(/!/g) || []).length;
    const questionCount = (message.match(/\?/g) || []).length;
    const capsCount = (message.match(/[A-Z]/g) || []).length;

    if (exclamationCount > 1) subtext.confidence += 20;
    if (questionCount > 2) subtext.desperation += 15;
    if (capsCount > message.length * 0.3) subtext.anger += 25;

    // Normalize values
    Object.keys(subtext).forEach(key => {
      subtext[key as keyof EmotionalSubtext] = Math.max(0, Math.min(100, subtext[key as keyof EmotionalSubtext]));
    });

    return subtext;
  }

  private calculateManipulationLevel(message: string): number {
    let score = 0;

    // Manipulation indicators
    const manipulationPatterns = [
      /\b(trust me|believe me|I promise|I swear)\b/gi,
      /\b(just between us|our secret|don't tell)\b/gi,
      /\b(you should|you need to|you have to)\b/gi,
      /\b(everyone thinks|people are saying)\b/gi
    ];

    manipulationPatterns.forEach(pattern => {
      const matches = (message.match(pattern) || []).length;
      score += matches * 25;
    });

    return Math.min(100, score);
  }

  private calculateThreatLevel(message: string): number {
    let score = 0;

    const threatPatterns = [
      /\b(or else|better watch|regret|consequences)\b/gi,
      /\b(make you pay|get you|eliminate|target)\b/gi,
      /\b(cross me|enemy|against me)\b/gi
    ];

    threatPatterns.forEach(pattern => {
      const matches = (message.match(pattern) || []).length;
      score += matches * 30;
    });

    return Math.min(100, score);
  }

  private isInformationSeeking(message: string): boolean {
    const lower = message.toLowerCase().trim();

    // Exclusions: statements containing "what" but not asking
    const exclusionPatterns = [
      /not what/i,
      /that's what/i,
      /what i (said|meant|did)/i,
      /you know what/i,
    ];
    if (exclusionPatterns.some((p) => p.test(message))) {
      // Only count as info-seeking if explicitly a question
      return /\?/.test(message);
    }

    // Strong interrogative signals
    const startsWithInterrogative = /^\s*(what|who|when|where|why|how)\b/i.test(message);
    const startsWithAux = /^\s*(can|could|would|will|do|does|did|are|is|was|were|should|shall|have|has|had|may|might)\b/i.test(message);
    const explicitAsk = /\b(tell me|let me know|fill me in|what's the plan|what's happening)\b/i.test(message);

    if (/\?/.test(message)) return true;
    if (startsWithInterrogative || startsWithAux || explicitAsk) return true;

    return false;
  }

  private isTrustBuilding(message: string): boolean {
    const trustPatterns = [
      /\b(trust|honest|sincere|genuine|real)\b/i,
      /\b(open|transparent|straight|direct)\b/i,
      /\b(promise|swear|guarantee|commit)\b/i
    ];

    return trustPatterns.some(pattern => pattern.test(message));
  }

  // Get player's linguistic profile
  getPlayerProfile(): PlayerLinguisticProfile {
    return { ...this.playerProfile };
  }

  // Check for meta-text (fourth wall breaking)
  isMetaText(message: string): boolean {
    const metaPatterns = [
      /\b(NPC|AI|artificial|robot|program|code)\b/i,
      /\b(game|simulation|fake|not real|scripted)\b/i,
      /\b(developer|programmer|lovable|system)\b/i
    ];

    return metaPatterns.some(pattern => pattern.test(message));
  }

  // Generate NPC response to meta-text
  generateMetaResponse(npcName: string, message: string): string {
    const responses = [
      `${npcName} looks at you strangely. "What are you talking about? You're being really weird right now."`,
      `${npcName} frowns. "Are you feeling okay? You're saying some pretty bizarre things."`,
      `${npcName} takes a step back. "I don't know what game you think you're playing, but this is real life."`,
      `${npcName} looks concerned. "You're starting to sound like you've lost touch with reality."`,
      `${npcName} shakes their head. "I think the pressure is getting to you. You need to snap out of it."`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Extract any contestant names mentioned in the message
  private extractNamesFromMessage(message: string, allNames: string[]): string[] {
    const lower = message.toLowerCase();
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mentions: string[] = [];
    allNames.forEach(name => {
      const n = (name || '').trim();
      if (!n) return;
      const re = new RegExp(`\\b${esc(n.toLowerCase())}\\b`, 'i');
      if (re.test(lower)) mentions.push(name);
    });
    return Array.from(new Set(mentions));
  }
}

export const speechActClassifier = new SpeechActClassifier();

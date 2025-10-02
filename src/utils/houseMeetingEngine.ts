import { GameState, HouseMeetingOption, HouseMeetingState, HouseMeetingToneChoice, HouseMeetingTopic, ReactionSummary } from '@/types/game';

type PerPersonDelta = { trust?: number; suspicion?: number; closeness?: number };
type DeltasByName = { [name: string]: PerPersonDelta };

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export const houseMeetingEngine = {
  getMood(gameState: GameState): HouseMeetingState['mood'] {
    const active = gameState.contestants.filter(c => !c.isEliminated);
    const avgSusp = active.reduce((s, c) => s + (c.psychProfile.suspicionLevel || 0), 0) / Math.max(1, active.length);
    if (avgSusp > 60) return 'heated';
    if (avgSusp > 40) return 'tense';
    return 'calm';
  },

  buildOptions(topic: HouseMeetingTopic): HouseMeetingOption[] {
    const base: HouseMeetingOption[] = [
      { id: 'persuasive', text: 'Make a persuasive case', tone: 'persuasive' },
      { id: 'defensive', text: 'Defend yourself calmly', tone: 'defensive' },
      { id: 'aggressive', text: 'Call people out directly', tone: 'aggressive' },
      { id: 'manipulative', text: 'Spin a narrative to redirect blame', tone: 'manipulative' },
      { id: 'silent', text: 'Say nothing', tone: 'silent' },
    ];
    // Minor topic-specific text tweaks
    return base.map(opt => {
      switch (topic) {
        case 'nominate_target':
          if (opt.tone === 'persuasive') return { ...opt, text: 'Persuade the house to lock a target' };
          if (opt.tone === 'aggressive') return { ...opt, text: 'Aggressively nominate and justify' };
          return opt;
        case 'defend_self':
          if (opt.tone === 'defensive') return { ...opt, text: 'Defend your actions and clarify stories' };
          if (opt.tone === 'silent') return { ...opt, text: 'Stay quiet and let others talk' };
          return opt;
        case 'shift_blame':
          if (opt.tone === 'manipulative') return { ...opt, text: 'Redirect attention to others' };
          return opt;
        case 'expose_alliance':
          if (opt.tone === 'aggressive') return { ...opt, text: 'Expose an alliance publicly' };
          if (opt.tone === 'persuasive') return { ...opt, text: 'Carefully reveal patterns to sway votes' };
          return opt;
      }
    });
  },

  generateAIStatement(state: HouseMeetingState): string {
    const { topic, target, mood, participants, currentRound, initiator } = state;

    // Scripted beats by topic and round (0-based)
    const T = (name: string) => name || 'Someone';
    const tgt = target ? T(target) : 'someone';
    const host = T(initiator);
    const other = T(participants.find(n => n !== initiator && n !== target) || participants[0] || 'Someone');

    const scripts: Record<HouseMeetingTopic, string[]> = {
      nominate_target: [
        `${host}: I want a clean week. ${tgt} has been playing both sides. We should lock this in.`,
        `${other}: If we don't unify, the numbers slip. ${tgt} makes the most sense right now.`,
        `${host}: This isn't personal. It's protection. Are we aligned or not?`
      ],
      defend_self: [
        `${host}: I'm not the one stirring chaos. Check the timelines—accusations don't line up.`,
        `${other}: I've seen you put in work socially. This pile-on feels performative.`,
        `${host}: If I were coming after you, you'd know. I'm here to stabilize the house, not blow it up.`
      ],
      shift_blame: [
        `${host}: We're aiming at the wrong person. Look at who benefits if ${tgt} stays quiet in the corner.`,
        `${other}: I've heard whispers that line up. Someone's managing narratives off camera.`,
        `${host}: Stop letting the obvious slide. If we miss this window, we deserve the fallout.`
      ],
      expose_alliance: [
        `${host}: Fine. Cards on the table—there's a bloc voting together. I can name two members right now.`,
        `${other}: You can feel it. Side conversations, synchronized stories, perfectly timed pushbacks.`,
        `${host}: If you want proof, compare who never call each other out. It's curated. It's deliberate.`
      ]
    };

    const lines = scripts[topic] || ['The room buzzes with low voices.'];
    const line = lines[Math.min(currentRound, lines.length - 1)];

    const tone = mood === 'heated'
      ? ' Voices overlap, tension rises.'
      : mood === 'tense'
      ? ' The room is wary.'
      : ' Calm but focused.';

    return `[Round ${currentRound + 1}] ${line}${tone}`;
  },

  applyChoice(state: HouseMeetingState, choice: HouseMeetingToneChoice, gameState: GameState): {
    updatedState: HouseMeetingState;
    deltas: DeltasByName;
    reaction: ReactionSummary;
    allianceExposureBoost?: { allianceId: string; delta: number }[];
    joinedParticipants?: string[];
  } {
    const names = gameState.contestants.filter(c => !c.isEliminated).map(c => c.name);
    const mood = state.mood;
    const initiator = state.initiator;
    const target = state.target;
    const participants = Array.from(new Set(state.participants.concat(names))); // ensure whole house present

    const deltas: DeltasByName = {};
    const addDelta = (name: string, t: number, s: number, e = 0) => {
      const cur = deltas[name] || {};
      deltas[name] = { trust: (cur.trust || 0) + t, suspicion: (cur.suspicion || 0) + s, closeness: (cur.closeness || 0) + e };
    };

    // Base weights per tone, adjusted by mood
    const moodAmp = mood === 'heated' ? 1.4 : mood === 'tense' ? 1.1 : 1.0;
    const forAll = (trust: number, susp: number, closeness = 0) => {
      participants.forEach(n => addDelta(n, Math.round(trust * moodAmp), Math.round(susp * moodAmp), Math.round(closeness * moodAmp)));
    };

    let allianceExposureBoost: { allianceId: string; delta: number }[] | undefined;
    let joinedParticipants: string[] | undefined;

    switch (choice) {
      case 'persuasive':
        // Trust up slightly for initiator with social types, suspicion down mildly
        forAll(0, 0, 0);
        participants.forEach(n => {
          const c = gameState.contestants.find(x => x.name === n);
          if (!c) return;
          const isSocial = (c.psychProfile.disposition || []).some(d => ['diplomatic', 'agreeable'].includes(d));
          const trustBump = isSocial ? 4 : 2;
          const suspDrop = isSocial ? -3 : -1;
          addDelta(n, trustBump, suspDrop, 0);
        });
        if (target) {
          // If nominating target, their allies lose trust in initiator, others gain
          gameState.alliances.forEach(a => {
            if (a.members.includes(target)) {
              a.exposureRisk = clamp((a.exposureRisk || 20) + 8, 0, 100);
            }
          });
        }
        break;

      case 'defensive':
        // Mostly affects perception of initiator; others reduce suspicion a bit
        participants.forEach(n => {
          const isInitiator = n === initiator;
          addDelta(n, isInitiator ? 3 : 1, isInitiator ? -5 : -1, isInitiator ? 2 : 0);
        });
        break;

      case 'aggressive':
        // Raises drama; trust down for many; suspicion up sharply for target and initiator
        forAll(-2, 2, -1);
        if (target) {
          participants.forEach(n => {
            const inTargetAlliance = gameState.alliances.some(a => a.members.includes(n) && a.members.includes(target));
            if (inTargetAlliance) addDelta(n, -4, 5, -2);
            else addDelta(n, -1, 2, -1);
          });
        }
        // Argument chain: 1-2 random joiners next round (simulated escalation)
        const others = gameState.contestants.filter(c => !c.isEliminated && !participants.includes(c.name));
        joinedParticipants = others.sort(() => 0.5 - Math.random()).slice(0, Math.min(2, others.length)).map(c => c.name);
        break;

      case 'manipulative':
        // Mixed outcomes: some buy it, paranoid amplify suspicion; alliances exposure increases if topic is expose_alliance
        participants.forEach(n => {
          const c = gameState.contestants.find(x => x.name === n);
          if (!c) return;
          const paranoid = (c.psychProfile.disposition || []).includes('paranoid');
          addDelta(n, paranoid ? -3 : 2, paranoid ? 6 : 1, paranoid ? -1 : 0);
        });
        if (state.topic === 'expose_alliance') {
          allianceExposureBoost = gameState.alliances.map(a => ({ allianceId: a.id, delta: 6 }));
        }
        break;

      case 'silent':
        // Nuanced: in heated mood, seen as shady; in calm mood, can be strategic
        if (mood === 'heated') {
          forAll(-2, 4, -1);
        } else if (mood === 'tense') {
          forAll(-1, 2, 0);
        } else {
          forAll(2, -2, 1);
        }
        break;
    }

    // Build reaction summary for UI
    const avgTrust = participants.reduce((s, n) => s + (deltas[n]?.trust || 0), 0) / Math.max(1, participants.length);
    const avgSusp = participants.reduce((s, n) => s + (deltas[n]?.suspicion || 0), 0) / Math.max(1, participants.length);

    const reaction: ReactionSummary = {
      take:
        avgTrust > 0 && avgSusp <= 0 ? 'positive' :
        avgTrust < 0 && avgSusp > 0 ? 'pushback' :
        avgSusp > 0 ? 'suspicious' : 'neutral',
      context: 'public',
      notes: `House Meeting (${state.topic}) - ${choice}`,
      deltas: { trust: Math.round(avgTrust), suspicion: Math.round(avgSusp), influence: 2, entertainment: choice === 'aggressive' ? 4 : choice === 'silent' ? 1 : 3 }
    };

    const nextRound = Math.min(state.currentRound + 1, state.maxRounds);
    const updatedState: HouseMeetingState = {
      ...state,
      currentRound: nextRound,
      mood: this.getMood(gameState),
      conversationLog: [
        ...state.conversationLog,
        { speaker: 'House', text: this.generateAIStatement(state) },
        { speaker: state.initiator, text: `${initiator} chose: ${choice}` }
      ],
      currentOptions: this.buildOptions(state.topic),
      participants: Array.from(new Set([ ...state.participants, ...(joinedParticipants || []) ])),
    };

    return { updatedState, deltas, reaction, allianceExposureBoost, joinedParticipants };
  },

  detectAIInitiation(gameState: GameState): HouseMeetingState | null {
    const active = gameState.contestants.filter(c => !c.isEliminated);
    if (active.length < 4) return null;

    const mostSuspicious = [...active].sort((a, b) => (b.psychProfile.suspicionLevel || 0) - (a.psychProfile.suspicionLevel || 0))[0];
    const player = gameState.playerName;
    const playerSusp = active.find(c => c.name === player)?.psychProfile.suspicionLevel || 0;

    // Tension heuristic
    const recentSchemes = (gameState.interactionLog || []).filter(e => e.day >= gameState.currentDay - 2 && e.type === 'scheme').length;
    const tensionScore = recentSchemes * 10 + active.reduce((s, c) => s + c.psychProfile.suspicionLevel, 0) / Math.max(1, active.length);

    const shouldTrigger = tensionScore > 55 || playerSusp > 60 || (mostSuspicious?.psychProfile.suspicionLevel || 0) > 70;
    if (!shouldTrigger) return null;

    const initiator = mostSuspicious?.name || player;
    const topic: HouseMeetingTopic = playerSusp > 60 ? 'defend_self' : 'shift_blame';
    const participants = active.map(c => c.name);

    const state: HouseMeetingState = {
      id: `hm_${Date.now()}`,
      initiator,
      topic,
      target: playerSusp > 60 ? player : undefined,
      isAIInitiated: true,
      participants,
      currentRound: 0,
      maxRounds: 3,
      mood: this.getMood(gameState),
      conversationLog: [{ speaker: initiator, text: `Call House Meeting: ${topic.replace('_', ' ')}` }],
      currentOptions: this.buildOptions(topic),
      forcedOpen: true,
    };

    return state;
  }
};
import { GameState, HouseMeetingOption, HouseMeetingState, HouseMeetingToneChoice, HouseMeetingTopic, ReactionSummary } from '@/types/game';

type PerPersonDelta = { trust?: number; suspicion?: number; closeness?: number };
type DeltasByName = { [name: string]: PerPersonDelta };

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export const houseMeetingEngine = {
  generateOpeningStatement(input: { topic: HouseMeetingTopic; target?: string; initiator: string }): string {
    const target = input.target || 'the house';
    switch (input.topic) {
      case 'nominate_target':
        return input.target
          ? `I called this because I think ${target} needs to be the target this week. I want everyone to say where they stand.`
          : `I called this because the vote is getting vague. I want us to talk openly about who the target should be.`;
      case 'defend_self':
        return `I called this because my name is getting twisted. I want to answer it in front of everyone instead of chasing whispers.`;
      case 'shift_blame':
        return input.target
          ? `I think we're looking in the wrong direction. If we're talking about threats, ${target} needs to be part of that conversation.`
          : `I think we're looking in the wrong direction. I want to talk about who's actually benefiting from the chaos.`;
      case 'expose_alliance':
        return input.target
          ? `I called this because people are pretending ${target} isn't connected. I want the house to look at the patterns.`
          : `I called this because there are voting blocs forming and everyone keeps pretending not to see them.`;
    }
  },

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

  generateAIStatement(state: HouseMeetingState, choice?: HouseMeetingToneChoice): string {
    const { topic, target, mood, participants, currentRound, initiator } = state;

    const names = participants.filter(Boolean);
    const responder = names.find(n => n !== initiator && n !== target) || names.find(n => n !== initiator) || 'Someone';
    const subject = target || 'the vote';
    const round = Math.max(0, currentRound);

    const byChoice: Record<HouseMeetingToneChoice, Record<HouseMeetingTopic, string[]>> = {
      persuasive: {
        nominate_target: [
          `${responder}: If we're naming ${subject}, I need reasons, not vibes.`,
          `${responder}: That case makes sense, but people need to own their votes out loud.`,
          `${responder}: I'm willing to hear it. I'm not signing onto a pile-on.`
        ],
        defend_self: [
          `${responder}: A calm explanation helps. It doesn't erase the questions, but it helps.`,
          `${responder}: If the timelines check out, people should stop embellishing it.`,
          `${responder}: I respect you answering it in the room instead of ducking it.`
        ],
        shift_blame: [
          `${responder}: That's a fair redirect. We should ask who benefits before we pick a target.`,
          `${responder}: If ${subject} is connected to this, say the pattern clearly.`,
          `${responder}: I'm listening. Just don't turn this into smoke with no fire.`
        ],
        expose_alliance: [
          `${responder}: Patterns matter, but names matter too. If there's a bloc, be specific.`,
          `${responder}: I have noticed people voting together. I'm not pretending I haven't.`,
          `${responder}: If this is true, it changes the week. If it's not, it makes you a target.`
        ]
      },
      defensive: {
        nominate_target: [
          `${responder}: Don't make this about your safety only. Tell us why ${subject} is bad for the house.`,
          `${responder}: I get protecting yourself. I need the logic behind the name.`,
          `${responder}: Defense is fine, but the target still needs to make sense.`
        ],
        defend_self: [
          `${responder}: That's the first version I've heard that actually lines up.`,
          `${responder}: I still have questions, but I appreciate the direct answer.`,
          `${responder}: Okay. That clears up part of it, not all of it.`
        ],
        shift_blame: [
          `${responder}: Careful. Redirecting blame can look like dodging blame.`,
          `${responder}: Maybe, but don't ask us to forget why this started.`,
          `${responder}: If you're right, prove it without making the room do the work.`
        ],
        expose_alliance: [
          `${responder}: If you're exposing something to defend yourself, people are going to question the timing.`,
          `${responder}: The timing is messy, but the point might still be real.`,
          `${responder}: I need more than 'they talk a lot.' Everyone talks in here.`
        ]
      },
      aggressive: {
        nominate_target: [
          `${responder}: Calling ${subject} out like that might rally people, or it might blow back on you.`,
          `${responder}: The name is out now. Nobody gets to act confused later.`,
          `${responder}: That's a hard shot. Be ready for one back.`
        ],
        defend_self: [
          `${responder}: You can be angry, but volume doesn't make the story cleaner.`,
          `${responder}: I hear the frustration. I also hear panic.`,
          `${responder}: If you wanted the room calm, that was not the way to get there.`
        ],
        shift_blame: [
          `${responder}: That was direct. Now ${subject} gets to answer it.`,
          `${responder}: If you're wrong, you just made an enemy for no reason.`,
          `${responder}: The room heard you. Don't pretend later that you were just asking questions.`
        ],
        expose_alliance: [
          `${responder}: If you're naming an alliance, name it. Half-exposing it helps nobody.`,
          `${responder}: That's a grenade. Some people in here just got very quiet.`,
          `${responder}: You may be right, but now everyone knows you were watching.`
        ]
      },
      manipulative: {
        nominate_target: [
          `${responder}: That's a neat story. Maybe too neat.`,
          `${responder}: I can see the angle, but I can also see why it benefits you.`,
          `${responder}: You're framing this well. That makes me trust it less, not more.`
        ],
        defend_self: [
          `${responder}: You're smoothing over the part people are actually worried about.`,
          `${responder}: That's a good spin. I still want the plain version.`,
          `${responder}: You made it sound reasonable. I need to know if it's true.`
        ],
        shift_blame: [
          `${responder}: That redirect is convenient, but it isn't impossible.`,
          `${responder}: You're trying to move the spotlight. The question is whether it belongs there.`,
          `${responder}: I can follow the logic. I just don't know if I trust the messenger.`
        ],
        expose_alliance: [
          `${responder}: Exposing an alliance helps you too. Let's not pretend this is charity.`,
          `${responder}: The pattern is interesting. The timing is even more interesting.`,
          `${responder}: If that bloc is real, the house needs to know. If not, this is dangerous.`
        ]
      },
      silent: {
        nominate_target: [
          `${responder}: Silence doesn't give us a target. It just makes people fill in blanks.`,
          `${responder}: If you called this meeting, staying quiet is a choice too.`,
          `${responder}: Nobody can read your mind. That's risky right now.`
        ],
        defend_self: [
          `${responder}: If your name is in trouble, silence might not save you.`,
          `${responder}: Not answering leaves the worst version alive.`,
          `${responder}: Maybe you're taking the high road. Maybe you're hiding. Hard to tell.`
        ],
        shift_blame: [
          `${responder}: You can't redirect the room and then disappear from the conversation.`,
          `${responder}: If there's another angle, now is the time to say it.`,
          `${responder}: The pause says as much as an accusation.`
        ],
        expose_alliance: [
          `${responder}: If you know about a bloc, say it clearly or don't bring it up.`,
          `${responder}: Half-silence makes everyone paranoid.`,
          `${responder}: The room is going to remember who avoided names.`
        ]
      }
    };

    const topicLines = byChoice[choice || 'persuasive']?.[topic] || [`${responder}: The room is listening, but people need specifics.`];
    const line = topicLines[round % topicLines.length];

    const tone = mood === 'heated'
      ? ' Voices start overlapping.'
      : mood === 'tense'
      ? ' The room stays tense.'
      : ' The room stays focused.';

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
        // Trust up more strongly when you frame a coherent case; social types are especially swayed.
        forAll(0, 0, 0);
        participants.forEach(n => {
          const c = gameState.contestants.find(x => x.name === n);
          if (!c) return;
          const isSocial = (c.psychProfile.disposition || []).some(d =>
            ['diplomatic', 'agreeable'].includes(d)
          );
          const trustBump = isSocial ? 6 : 3;
          const suspDrop = isSocial ? -4 : -2;
          addDelta(n, trustBump, suspDrop, 0);
        });
        if (target) {
          // If nominating target, their allies lose trust in initiator and alliances become more exposed
          gameState.alliances.forEach(a => {
            if (a.members.includes(target)) {
              a.exposureRisk = clamp((a.exposureRisk || 20) + 10, 0, 100);
            }
          });
        }
        break;

      case 'defensive':
        // Stronger impact on how your defense lands: you can either calm the room or look like you're spinning.
        participants.forEach(n => {
          const isInitiator = n === initiator;
          addDelta(
            n,
            isInitiator ? 5 : 2,   // bigger trust swing on your own defense
            isInitiator ? -7 : -2, // clearer suspicion drop if you come off credible
            isInitiator ? 3 : 0
          );
        });
        break;

      case 'aggressive':
        // Raises drama; trust down sharply; suspicion spikes especially around the target and their allies.
        forAll(-3, 3, -1);
        if (target) {
          participants.forEach(n => {
            const inTargetAlliance = gameState.alliances.some(
              a => a.members.includes(n) && a.members.includes(target)
            );
            if (inTargetAlliance) addDelta(n, -6, 7, -3);
            else addDelta(n, -2, 3, -1);
          });
        }
        // Argument chain: 1-2 random joiners next round (simulated escalation)
        const others = gameState.contestants.filter(
          c => !c.isEliminated && !participants.includes(c.name)
        );
        joinedParticipants = others
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.min(2, others.length))
          .map(c => c.name);
        break;

      case 'manipulative':
        // Mixed outcomes: some buy the spin, paranoid players amplify suspicion; bigger exposure when you drag alliances into it.
        participants.forEach(n => {
          const c = gameState.contestants.find(x => x.name === n);
          if (!c) return;
          const paranoid = (c.psychProfile.disposition || []).includes('paranoid');
          addDelta(
            n,
            paranoid ? -4 : 3,
            paranoid ? 8 : 2,
            paranoid ? -1 : 0
          );
        });
        if (state.topic === 'expose_alliance') {
          allianceExposureBoost = gameState.alliances.map(a => ({
            allianceId: a.id,
            delta: 8
          }));
        }
        break;

      case 'silent':
        // Nuanced: in heated mood, silence now looks more damning; in calm mood, it can be a stronger strategic choice.
        if (mood === 'heated') {
          forAll(-3, 5, -1);
        } else if (mood === 'tense') {
          forAll(-2, 3, 0);
        } else {
          forAll(3, -3, 1);
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
      deltas: {
        trust: Math.round(avgTrust),
        suspicion: Math.round(avgSusp),
        influence: 4,
        entertainment: choice === 'aggressive' ? 7 : choice === 'silent' ? 2 : 5
      }
    };

    const nextRound = Math.min(state.currentRound + 1, state.maxRounds);
    const updatedState: HouseMeetingState = {
      ...state,
      currentRound: nextRound,
      mood: this.getMood(gameState),
      conversationLog: [
        ...state.conversationLog,
        { speaker: state.initiator, text: this.describePlayerChoice(state.topic, choice, target) },
        { speaker: 'House', text: this.generateAIStatement(state, choice) }
      ],
      currentOptions: this.buildOptions(state.topic),
      participants: Array.from(new Set([ ...state.participants, ...(joinedParticipants || []) ])),
    };

    return { updatedState, deltas, reaction, allianceExposureBoost, joinedParticipants };
  },

  describePlayerChoice(topic: HouseMeetingTopic, choice: HouseMeetingToneChoice, target?: string): string {
    const subject = target || 'the room';
    const lines: Record<HouseMeetingToneChoice, Record<HouseMeetingTopic, string>> = {
      persuasive: {
        nominate_target: `I lay out the case against ${subject} and ask people to commit instead of whispering.`,
        defend_self: `I answer the accusations point by point and keep my voice steady.`,
        shift_blame: `I explain why the house is looking in the wrong place and point to the bigger pattern.`,
        expose_alliance: `I connect the votes and side conversations without overselling it.`
      },
      defensive: {
        nominate_target: `I explain why naming ${subject} protects my game and the house's numbers.`,
        defend_self: `I defend myself directly and correct the parts that got exaggerated.`,
        shift_blame: `I push back on the blame and ask people to look at who benefits.`,
        expose_alliance: `I explain why exposing this now is about transparency, not panic.`
      },
      aggressive: {
        nominate_target: `I call out ${subject} directly and make the vote impossible to ignore.`,
        defend_self: `I push back hard and tell the room to stop twisting my name.`,
        shift_blame: `I put the blame on ${subject} and dare them to answer it.`,
        expose_alliance: `I call the alliance out in front of everyone and force reactions.`
      },
      manipulative: {
        nominate_target: `I frame ${subject} as the logical target and make it sound like the house's idea.`,
        defend_self: `I reframe the story so my choices look measured instead of messy.`,
        shift_blame: `I move the conversation toward ${subject} without making it look rehearsed.`,
        expose_alliance: `I reveal just enough about the alliance to make people suspicious.`
      },
      silent: {
        nominate_target: `I let the room sit with the name instead of adding more fuel.`,
        defend_self: `I stop defending myself and let the room judge what has already been said.`,
        shift_blame: `I hold back and watch who rushes to fill the silence.`,
        expose_alliance: `I stop short of naming more names and let the tension do the work.`
      }
    };
    return lines[choice][topic];
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
      maxRounds: 5,
      mood: this.getMood(gameState),
      conversationLog: [{ speaker: initiator, text: this.generateOpeningStatement({ topic, target: playerSusp > 60 ? player : undefined, initiator }) }],
      currentOptions: this.buildOptions(topic),
      forcedOpen: true,
    };

    return state;
  }
};
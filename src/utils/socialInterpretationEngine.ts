import {
  AntiExploitProfile,
  GlobalToneProfile,
  IntentHypotheses,
  NPCSpecificToneProfile,
  PerceivedIntent,
  RiskTolerance,
  SocialStrategy,
  EmotionalPosture,
  GameMotive,
  SurfaceFeatures,
} from '@/types/interpretation';
import { NPCPersonalityProfile } from './npcAutonomyEngine';
import type { NPCResponseContext } from './npcResponseEngine';

/**
 * Social Interpretation Engine
 *
 * Takes global intent hypotheses and produces NPC-specific interpretations,
 * plus rolling tone and anti-exploit profiles.
 *
 * This is intentionally conservative in its influence at first:
 * it nudges tone and perception rather than overriding existing logic.
 */

export type InterpretForNPCInput = {
  npcName: string;
  intents: IntentHypotheses;
  surface: SurfaceFeatures;
  personality: NPCPersonalityProfile;
  npcContext: NPCResponseContext;
};

export type SocialInterpretationEngineState = {
  globalTone: GlobalToneProfile;
  npcTone: Map<string, NPCSpecificToneProfile>;
  antiExploit: AntiExploitProfile;
};

const initialState: SocialInterpretationEngineState = {
  globalTone: {
    baselineAssertiveness: 50,
    emotionalVolatility: 50,
    performativeVsPrivate: 0,
    conflictAvoidance: 50,
    averageRiskTolerance: 50,
    messageCount: 0,
  },
  npcTone: new Map(),
  antiExploit: {
    repetitivePatternScore: 0,
    keywordSpamScore: 0,
    PRLikeToneScore: 0,
    metaGamingScore: 0,
  },
};

class SocialInterpretationEngine {
  private state: SocialInterpretationEngineState = initialState;

  interpretForNPC(input: InterpretForNPCInput): PerceivedIntent {
    const { npcName, intents, surface, personality, npcContext } = input;

    const social = this.weightAxisByPersonality<SocialStrategy>(
      intents.socialStrategy,
      personality,
      'social'
    );
    const emotional = this.weightAxisByPersonality<EmotionalPosture>(
      intents.emotionalPosture,
      personality,
      'emotional'
    );
    const motive = this.weightAxisByPersonality<GameMotive>(
      intents.gameMotive,
      personality,
      'motive'
    );
    const risk = this.weightAxisByPersonality<RiskTolerance>(
      intents.riskTolerance,
      personality,
      'risk'
    );

    const perceivedSocialStrategy = this.sampleAxis(social, personality);
    const perceivedEmotionalPosture = this.sampleAxis(emotional, personality);
    const perceivedGameMotive = this.sampleAxis(motive, personality);
    const perceivedRiskTolerance = this.sampleAxis(risk, personality);

    const divergenceScore = this.computeDivergence(intents, {
      perceivedSocialStrategy,
      perceivedEmotionalPosture,
      perceivedGameMotive,
      perceivedRiskTolerance,
    });

    const certainty = this.computeCertainty(intents, personality, npcContext.socialContext.currentDramaTension);

    const { hostility, warmth } = this.deriveAffect(
      perceivedSocialStrategy,
      perceivedEmotionalPosture,
      perceivedGameMotive,
      npcContext
    );

    this.updateGlobalTone(intents, surface, npcContext.conversationType === 'public');
    this.updateNPCTone(npcName, intents, surface, npcContext);
    this.updateAntiExploit(surface, intents);

    return {
      npcName,
      perceivedSocialStrategy,
      perceivedEmotionalPosture,
      perceivedGameMotive,
      perceivedRiskTolerance,
      divergenceScore,
      perceivedHostility: hostility,
      perceivedWarmth: warmth,
      certainty,
    };
  }

  getState(): SocialInterpretationEngineState {
    return this.state;
  }

  private weightAxisByPersonality<T extends string>(
    axis: { axis: string; options: { label: T; weight: number }[]; confidence: number },
    personality: NPCPersonalityProfile,
    kind: 'social' | 'emotional' | 'motive' | 'risk'
  ): { axis: string; options: { label: T; weight: number }[]; confidence: number } {
    const adjusted = axis.options.map(opt => {
      let weight = opt.weight;

      switch (kind) {
        case 'social':
          if (opt.label === 'bonding') {
            weight *= 1 + personality.loyalty / 300;
          }
          if (opt.label === 'distancing') {
            weight *= 1 + personality.paranoia / 300;
          }
          if (opt.label === 'dominance') {
            weight *= 1 + personality.aggressiveness / 300;
          }
          break;
        case 'emotional':
          if (opt.label === 'performative' && personality.paranoia > 60) {
            weight *= 1.2;
          }
          if (opt.label === 'sincere' && personality.loyalty > 60) {
            weight *= 1.15;
          }
          break;
        case 'motive':
          if (opt.label === 'reputation_management' && personality.manipulation > 60) {
            weight *= 1.2;
          }
          if (opt.label === 'information_fishing' && personality.intelligence > 60) {
            weight *= 1.2;
          }
          break;
        case 'risk':
          if (opt.label === 'bold') {
            weight *= 1 + personality.risk_tolerance / 300;
          }
          if (opt.label === 'risk_averse' && personality.risk_tolerance < 40) {
            weight *= 1.1;
          }
          break;
      }

      return { ...opt, weight };
    });

    const total = adjusted.reduce((acc, o) => acc + o.weight, 0) || 1;
    const normalized = adjusted.map(o => ({ ...o, weight: o.weight / total }));

    return {
      axis: axis.axis,
      options: normalized,
      confidence: axis.confidence,
    };
  }

  private sampleAxis<T extends string>(
    axis: { options: { label: T; weight: number }[]; confidence: number },
    personality: NPCPersonalityProfile
  ): T {
    // Use argmax most of the time; add small noise for emotional NPCs
    if (!axis.options.length) {
      return axis.axis === 'socialStrategy'
        ? ('bonding' as T)
        : axis.axis === 'riskTolerance'
        ? ('cautious' as T)
        : axis.options[0]?.label;
    }

    const sorted = [...axis.options].sort((a, b) => b.weight - a.weight);
    const top = sorted[0];
    const volatility = personality.emotionality / 100;

    if (volatility < 0.3 || axis.confidence > 0.7) {
      return top.label;
    }

    // Simple weighted random among top 2–3 when volatile / low confidence
    const candidates = sorted.slice(0, Math.min(3, sorted.length));
    const total = candidates.reduce((acc, c) => acc + c.weight, 0) || 1;
    const r = Math.random() * total;
    let acc = 0;
    for (const c of candidates) {
      acc += c.weight;
      if (r <= acc) return c.label;
    }
    return top.label;
  }

  private computeDivergence(
    intents: IntentHypotheses,
    perceived: {
      perceivedSocialStrategy: SocialStrategy;
      perceivedEmotionalPosture: EmotionalPosture;
      perceivedGameMotive: GameMotive;
      perceivedRiskTolerance: RiskTolerance;
    }
  ): number {
    const axisDistance = <T extends string>(
      axis: { options: { label: T; weight: number }[] },
      chosen: T
    ): number => {
      const opt = axis.options.find(o => o.label === chosen);
      if (!opt) return 0.25;
      return Math.max(0, 1 - opt.weight);
    };

    const dSocial = axisDistance(intents.socialStrategy, perceived.perceivedSocialStrategy);
    const dEmotional = axisDistance(intents.emotionalPosture, perceived.perceivedEmotionalPosture);
    const dMotive = axisDistance(intents.gameMotive, perceived.perceivedGameMotive);
    const dRisk = axisDistance(intents.riskTolerance, perceived.perceivedRiskTolerance);

    // Scale to 0..100
    return Math.round(((dSocial + dEmotional + dMotive + dRisk) / 4) * 100);
  }

  private computeCertainty(
    intents: IntentHypotheses,
    personality: NPCPersonalityProfile,
    dramaTension: number
  ): number {
    const base =
      (intents.socialStrategy.confidence +
        intents.emotionalPosture.confidence +
        intents.gameMotive.confidence +
        intents.riskTolerance.confidence) /
      4;

    // Paranoid NPCs are "certain" more easily; calmer NPCs hesitate more
    const paranoiaBoost = personality.paranoia / 300;
    const dramaBoost = dramaTension / 400;

    return Math.max(0, Math.min(1, base + paranoiaBoost + dramaBoost));
  }

  private deriveAffect(
    social: SocialStrategy,
    emotional: EmotionalPosture,
    motive: GameMotive,
    npcContext: NPCResponseContext
  ): { hostility: number; warmth: number } {
    let hostility = 20;
    let warmth = 20;

    // Social strategy contributions
    if (social === 'bonding') warmth += 30;
    if (social === 'distancing') hostility += 15;
    if (social === 'dominance') hostility += 25;
    if (social === 'deflection') hostility += 5;

    // Emotional posture contributions
    if (emotional === 'sincere') warmth += 25;
    if (emotional === 'performative') {
      hostility += 10;
      warmth += 5;
    }
    if (emotional === 'passive_aggressive') hostility += 20;
    if (emotional === 'guarded') hostility += 5;

    // Motive contributions
    if (motive === 'reputation_management' && npcContext.conversationType === 'public') {
      hostility += 15;
    }
    if (motive === 'alliance_signaling') {
      warmth += 15;
    }

    // Relationship context
    const rel = npcContext.relationship;
    if (rel) {
      if (rel.trust > 65 && rel.suspicion < 40) {
        warmth += 15;
        hostility -= 10;
      }
      if (rel.suspicion > 65) {
        hostility += 20;
        warmth -= 10;
      }
    }

    // Clamp
    hostility = Math.max(0, Math.min(100, hostility));
    warmth = Math.max(0, Math.min(100, warmth));

    return { hostility, warmth };
  }

  private updateGlobalTone(
    intents: IntentHypotheses,
    surface: SurfaceFeatures,
    isPublic: boolean
  ): void {
    const tone = this.state.globalTone;
    const count = tone.messageCount + 1;

    const assertivenessSample =
      surface.hedgingCount === 0 && surface.directAddressCount > 0 ? 70 : 40;
    const volatilitySample =
      surface.emotionalWordIntensity + surface.exclamationCount * 10 + surface.allCapsWordCount * 15;

    const riskSample =
      intents.riskTolerance.options.find(o => o.label === 'bold')?.weight ?? 0.25;

    const performativeSample =
      intents.emotionalPosture.options.find(o => o.label === 'performative')?.weight ?? 0.25;

    // Online EMA-style update
    tone.baselineAssertiveness =
      (tone.baselineAssertiveness * tone.messageCount + assertivenessSample) / count;
    tone.emotionalVolatility =
      (tone.emotionalVolatility * tone.messageCount + volatilitySample) / count;
    tone.averageRiskTolerance =
      (tone.averageRiskTolerance * tone.messageCount + riskSample * 100) / count;

    if (isPublic) {
      tone.performativeVsPrivate =
        tone.performativeVsPrivate * 0.9 + performativeSample * 20;
    } else {
      tone.performativeVsPrivate =
        tone.performativeVsPrivate * 0.9 - performativeSample * 10;
    }

    tone.conflictAvoidance =
      (tone.conflictAvoidance * tone.messageCount +
        (surface.hedgingCount > 0 ? 65 : 35)) /
      count;

    tone.messageCount = count;
    this.state.globalTone = tone;
  }

  private updateNPCTone(
    npcName: string,
    intents: IntentHypotheses,
    surface: SurfaceFeatures,
    npcContext: NPCResponseContext
  ): void {
    const existing = this.state.npcTone.get(npcName) || {
      npcName,
      perceivedAssertiveness: 50,
      perceivedVolatility: 50,
      perceivedFakeness: 0,
      perceivedConsistency: 50,
    };

    const rel = npcContext.relationship;
    const assertivenessSample =
      surface.hedgingCount === 0 && surface.directAddressCount > 0 ? 70 : 40;
    const volatilitySample =
      surface.emotionalWordIntensity + surface.exclamationCount * 10 + surface.allCapsWordCount * 15;
    const performativeWeight =
      intents.emotionalPosture.options.find(o => o.label === 'performative')?.weight ?? 0;

    existing.perceivedAssertiveness =
      existing.perceivedAssertiveness * 0.9 + assertivenessSample * 0.1;
    existing.perceivedVolatility =
      existing.perceivedVolatility * 0.9 + volatilitySample * 0.1;

    // Fakeness rises when performative posture appears often, especially in public
    const performativeBump =
      performativeWeight * (npcContext.conversationType === 'public' ? 25 : 10);
    existing.perceivedFakeness = Math.max(
      0,
      Math.min(100, existing.perceivedFakeness * 0.9 + performativeBump * 0.1)
    );

    // Consistency nudged by volatility and relationship trust
    const trust = rel?.trust ?? 50;
    const consistencySample =
      100 -
      Math.min(60, Math.abs(existing.perceivedVolatility - 50)) +
      (trust - 50) * 0.2;
    existing.perceivedConsistency =
      existing.perceivedConsistency * 0.85 + consistencySample * 0.15;

    this.state.npcTone.set(npcName, existing);
  }

  private updateAntiExploit(surface: SurfaceFeatures, intents: IntentHypotheses): void {
    const state = this.state.antiExploit;

    // PR-like tone: polite, hedged, low fragmentation, low caps
    if (
      surface.wordCount > 0 &&
      surface.politenessCount > 0 &&
      surface.hedgingCount > 0 &&
      surface.fragmentRatio < 0.3 &&
      surface.allCapsWordCount === 0
    ) {
      state.PRLikeToneScore = Math.min(100, state.PRLikeToneScore + 1.5);
    } else {
      state.PRLikeToneScore = Math.max(0, state.PRLikeToneScore - 0.5);
    }

    // Meta gaming: explicit metaText
    if (surface.metaText) {
      state.metaGamingScore = Math.min(100, state.metaGamingScore + 10);
    } else {
      state.metaGamingScore = Math.max(0, state.metaGamingScore - 1);
    }

    // Keyword spam: crude heuristic based on conversation topic and speechActs count
    const strategicActs = intents.speechActs.filter(a =>
      a.type.toLowerCase().includes('alliance') ||
      a.type.toLowerCase().includes('vote') ||
      a.type.toLowerCase().includes('information')
    );
    if (surface.wordCount > 0 && strategicActs.length > 2) {
      state.keywordSpamScore = Math.min(100, state.keywordSpamScore + 1);
    } else {
      state.keywordSpamScore = Math.max(0, state.keywordSpamScore - 0.5);
    }

    this.state.antiExploit = state;
  }
}

export const socialInterpretationEngine = new SocialInterpretationEngine();
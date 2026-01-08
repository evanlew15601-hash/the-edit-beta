import {
  AxisDistribution,
  EmotionalPosture,
  GameMotive,
  IntentHypotheses,
  RiskTolerance,
  SocialStrategy,
  SurfaceFeatures,
} from '@/types/interpretation';
import { ConversationIntent } from './conversationIntentEngine';
import { PlayerLinguisticProfile, SpeechAct } from './speechActClassifier';

export type IntentHypothesisInput = {
  message: string;
  speechAct: SpeechAct;
  conversationIntent: ConversationIntent;
  surface: SurfaceFeatures;
  playerProfile?: PlayerLinguisticProfile;
};

function normalizeAxis<T extends string>(weights: Record<T, number>): { label: T; weight: number }[] {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((acc, [, w]) => acc + Math.max(w, 0), 0) || 1;
  return entries.map(([label, w]) => ({
    label,
    weight: Math.max(w, 0) / total,
  }));
}

function confidenceFromPeakedness(options: { weight: number }[]): number {
  if (!options.length) return 0;
  const weights = options.map(o => o.weight || 0);
  const max = Math.max(...weights);
  const min = Math.min(...weights);
  // Simple heuristic: more separation between max/min -> higher confidence
  return Math.min(1, Math.max(0, (max - min) * 1.25));
}

function buildSocialStrategyAxis(input: IntentHypothesisInput): AxisDistribution<SocialStrategy> {
  const { speechAct, surface, conversationIntent } = input;
  const weights: Record<SocialStrategy, number> = {
    bonding: 1,
    distancing: 1,
    dominance: 1,
    deflection: 1,
  };

  // Bonding signals
  if (speechAct.trustBuilding) weights.bonding += 2;
  if (surface.politenessCount > 0) weights.bonding += 1;
  if (conversationIntent.topic === 'relationship' || conversationIntent.topic === 'life') {
    weights.bonding += 1;
  }

  // Distancing signals
  if (speechAct.primary === 'expressing_suspicion') weights.distancing += 2;
  if (surface.absolutesCount > 0) weights.distancing += 1;
  if (speechAct.emotionalSubtext.anger > 60) weights.distancing += 1.5;

  // Dominance signals
  if (speechAct.threatLevel > 40 || speechAct.primary === 'threatening') {
    weights.dominance += 2.5;
  }
  if (surface.bluntMarkersCount > 0) weights.dominance += 1;
  if (surface.averageSentenceLength > 18 && surface.hedgingCount === 0) {
    weights.dominance += 1;
  }

  // Deflection signals
  if (speechAct.primary === 'deflecting' || speechAct.primary === 'withholding_info') {
    weights.deflection += 2;
  }
  if (surface.hedgingCount > 1 && !surface.endsWithQuestion) {
    weights.deflection += 1;
  }
  if (surface.fragmentRatio > 0.6) {
    weights.deflection += 0.5;
  }

  const options = normalizeAxis<SocialStrategy>(weights);
  const confidence = confidenceFromPeakedness(options);

  return { axis: 'socialStrategy', options, confidence };
}

function buildEmotionalPostureAxis(input: IntentHypothesisInput): AxisDistribution<EmotionalPosture> {
  const { speechAct, surface } = input;
  const weights: Record<EmotionalPosture, number> = {
    guarded: 1,
    performative: 1,
    sincere: 1,
    passive_aggressive: 1,
  };

  const sub = speechAct.emotionalSubtext;

  // Guarded: hedging, withholding, low expressiveness
  if (surface.hedgingCount > 0) weights.guarded += 1.5;
  if (speechAct.primary === 'withholding_info' || speechAct.primary === 'deflecting') {
    weights.guarded += 1.5;
  }
  if (sub.fear > 50 && sub.confidence < 50) {
    weights.guarded += 1;
  }

  // Performative: high punctuation, caps, PR-like politeness
  if (surface.emotionalWordIntensity > 55 && (surface.exclamationCount > 1 || surface.allCapsWordCount > 0)) {
    weights.performative += 1.5;
  }
  if (surface.politenessCount > 0 && surface.emotionalWordIntensity > 40) {
    weights.performative += 1;
  }

  // Sincere: high sincerity, moderate intensity, few manipulation cues
  if (sub.sincerity > 60 && speechAct.manipulationLevel < 40) {
    weights.sincere += 2;
  }
  if (surface.hedgingCount > 0 && surface.exclamationCount <= 1) {
    weights.sincere += 0.5;
  }

  // Passive-aggressive: mix of politeness and anger/absolutes
  if (surface.politenessCount > 0 && (sub.anger > 40 || surface.absolutesCount > 0)) {
    weights.passive_aggressive += 2;
  }
  if (speechAct.primary === 'insulting' && surface.politenessCount > 0) {
    weights.passive_aggressive += 1.5;
  }

  const options = normalizeAxis<EmotionalPosture>(weights);
  const confidence = confidenceFromPeakedness(options);

  return { axis: 'emotionalPosture', options, confidence };
}

function buildGameMotiveAxis(input: IntentHypothesisInput): AxisDistribution<GameMotive> {
  const { speechAct, conversationIntent } = input;
  const weights: Record<GameMotive, number> = {
    information_fishing: 1,
    alliance_signaling: 1,
    reputation_management: 1,
    venting: 1,
  };

  // Information fishing
  if (speechAct.informationSeeking) weights.information_fishing += 2.5;
  if (speechAct.primary === 'information_fishing') weights.information_fishing += 2;
  if (conversationIntent.wantsInfoOn && conversationIntent.wantsInfoOn.length > 0) {
    weights.information_fishing += 1;
  }

  // Alliance signaling
  if (speechAct.primary === 'alliance_proposal') weights.alliance_signaling += 3;
  if (conversationIntent.topic === 'alliance') {
    weights.alliance_signaling += 1.5;
  }

  // Reputation management
  if (conversationIntent.topic === 'edit') {
    weights.reputation_management += 2.5;
  }
  if (speechAct.primary === 'downplaying_betrayal') {
    weights.reputation_management += 2;
  }

  // Venting
  const sub = speechAct.emotionalSubtext;
  if (sub.anger > 60 || sub.desperation > 60) {
    weights.venting += 2;
  }
  if (!speechAct.informationSeeking && !speechAct.trustBuilding && sub.anger > 40) {
    weights.venting += 1;
  }

  const options = normalizeAxis<GameMotive>(weights);
  const confidence = confidenceFromPeakedness(options);

  return { axis: 'gameMotive', options, confidence };
}

function buildRiskToleranceAxis(input: IntentHypothesisInput): AxisDistribution<RiskTolerance> {
  const { speechAct, surface } = input;
  const weights: Record<RiskTolerance, number> = {
    bold: 1,
    cautious: 1,
    reckless: 1,
    risk_averse: 1,
  };

  const sub = speechAct.emotionalSubtext;

  // Bold: threats, naming names, low hedging, directness
  if (speechAct.threatLevel > 40 || speechAct.primary === 'threatening') {
    weights.bold += 2.5;
  }
  if (surface.hedgingCount === 0 && surface.directAddressCount > 0) {
    weights.bold += 1.5;
  }

  // Reckless: bold + emotional volatility + public context (context will adjust later)
  if (weights.bold > 1 && sub.anger > 60) {
    weights.reckless += 1.5;
  }

  // Cautious: hedging, questions, private tone (context can adjust)
  if (surface.hedgingCount > 0) {
    weights.cautious += 1.5;
  }
  if (surface.endsWithQuestion && !speechAct.threatLevel) {
    weights.cautious += 0.5;
  }

  // Risk-averse: repeated hedging, low emotional intensity
  if (surface.hedgingCount > 1 && sub.anger < 40 && sub.confidence < 50) {
    weights.risk_averse += 1.5;
  }

  const options = normalizeAxis<RiskTolerance>(weights);
  const confidence = confidenceFromPeakedness(options);

  return { axis: 'riskTolerance', options, confidence };
}

export function buildIntentHypotheses(input: IntentHypothesisInput): IntentHypotheses {
  const socialStrategy = buildSocialStrategyAxis(input);
  const emotionalPosture = buildEmotionalPostureAxis(input);
  const gameMotive = buildGameMotiveAxis(input);
  const riskTolerance = buildRiskToleranceAxis(input);

  const speechActs = [
    {
      type: input.speechAct.primary,
      confidence: input.speechAct.confidence,
    },
    ...(input.speechAct.secondary
      ? [
          {
            type: input.speechAct.secondary,
            confidence: Math.max(10, Math.round(input.speechAct.confidence * 0.5)),
          },
        ]
      : []),
  ];

  return {
    socialStrategy,
    emotionalPosture,
    gameMotive,
    riskTolerance,
    speechActs,
    conversationTopic: input.conversationIntent.topic,
  };
}
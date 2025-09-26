import { GameState, ReactionSummary, Confessional, InteractionLogEntry } from '@/types/game';

const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));

/**
 * Lightweight ratings model.
 * - Keeps viewerRating in [0, 10]
 * - Applies small deltas from actions/confessionals/emergent events
 * - Adds a daily "background buzz" based on NPC memory and voting/alliances
 */
export const ratingsEngine = {
  getInitial(): number {
    // Start mid-low to let growth feel earned
    return 3.8;
  },

  applyReaction(prev: GameState, reaction?: ReactionSummary): { rating: number; reason?: string } {
    if (!reaction) {
      return { rating: prev.viewerRating ?? ratingsEngine.getInitial() };
    }
    const ent = reaction.deltas?.entertainment ?? 0;
    const infl = reaction.deltas?.influence ?? 0;
    const trust = reaction.deltas?.trust ?? 0;
    const susp = reaction.deltas?.suspicion ?? 0;

    // Small, bounded impact per interaction
    let delta =
      ent * 0.02 +
      infl * 0.01 +
      (trust > 0 ? trust * 0.005 : trust * 0.002) -
      (susp > 0 ? susp * 0.01 : susp * 0.003);

    delta = clamp(delta, -0.25, 0.25);
    const next = clamp((prev.viewerRating ?? ratingsEngine.getInitial()) + delta, 0, 10);

    const reason = `engagement: ${reaction.context}, ${reaction.take}`;
    return { rating: next, reason };
  },

  applyConfessional(prev: GameState, conf: Confessional): { rating: number; reason?: string } {
    const base = prev.viewerRating ?? ratingsEngine.getInitial();
    const impact = conf.editImpact ?? 0;
    const audience = conf.audienceScore ?? 50;

    let delta = impact * 0.02 + ((audience - 50) / 100) * 0.3;
    delta += conf.selected ? 0.05 : -0.02; // aired confessionals get a tiny boost

    const next = clamp(base + clamp(delta, -0.5, 0.6), 0, 10);
    const reason = `confessional: ${conf.selected ? 'aired' : 'unaired'} (${conf.tone})`;
    return { rating: next, reason };
  },

  applyEmergent(prev: GameState, editImpact: number, title?: string): { rating: number; reason?: string } {
    const base = prev.viewerRating ?? ratingsEngine.getInitial();
    const delta = clamp(editImpact * 0.02, -0.3, 0.4);
    const next = clamp(base + delta, 0, 10);
    const reason = `event: ${title || 'emergent'} (${editImpact >= 0 ? 'dramatic' : 'calm'})`;
    return { rating: next, reason };
  },

  applyDailyBuzz(prev: GameState): { rating: number; reason?: string } {
    const base = prev.viewerRating ?? ratingsEngine.getInitial();

    // Recent NPC memory signals
    const mems = prev.contestants.flatMap(c => c.memory || []);
    const recent = mems.filter(m => m.day >= prev.currentDay - 1);
    const drama = recent.filter(m => (m.type === 'scheme' || m.type === 'event') && (m.emotionalImpact ?? 0) < 0).length;
    const strategy = recent.filter(m => m.type === 'conversation' && (m.emotionalImpact ?? 0) > 3).length;
    const eliminations = recent.filter(m => m.type === 'elimination').length;

    const allianceActivityToday = prev.alliances.filter(a => a.lastActivity === prev.currentDay).length;

    let delta =
      drama * 0.05 +
      strategy * 0.03 +
      eliminations * 0.2 +
      allianceActivityToday * 0.04;

    // Gentle mean reversion to avoid runaway
    delta += (3.5 - base) * 0.01;

    delta = clamp(delta, -0.3, 0.5);
    const next = clamp(base + delta, 0, 10);

    const reason = `daily buzz: drama ${drama}, strategy ${strategy}, elim ${eliminations}`;
    return { rating: next, reason };
  },

  // Convenience for logging mini history entries
  appendHistory(prev: GameState, rating: number, reason?: string): GameState {
    const history = [...(prev.ratingsHistory ?? [])];
    history.push({ day: prev.currentDay, rating: Math.round(rating * 100) / 100, reason });
    return { ...prev, viewerRating: rating, ratingsHistory: history };
  },

  // Generic handler for interaction log entries if needed later
  applyFromInteraction(prev: GameState, entry?: InteractionLogEntry): { rating: number; reason?: string } {
    if (!entry) return { rating: prev.viewerRating ?? ratingsEngine.getInitial() };
    const type = entry.type;
    let delta = 0;
    if (type === 'scheme') delta += 0.12;
    if (type === 'activity') delta += 0.06;
    if (type === 'dm') delta += 0.04;
    if (type === 'talk') delta += 0.03;
    const next = clamp((prev.viewerRating ?? ratingsEngine.getInitial()) + clamp(delta, -0.2, 0.2), 0, 10);
    return { rating: next, reason: `interaction: ${type}` };
  }
};
// Game Talk Heuristics for domain-specific, free, and smart replies
// Focus: alliance/vote/targets/numbers/loyalty prompts and the phrase "talk game"

export type GameTalkTags = {
  isGameTalk: boolean;
  subtypes: Array<'alliance' | 'vote' | 'numbers' | 'targets' | 'where_head' | 'plan' | 'trust_check' | 'leak_check' | 'meta_phrase'>;
  confidence: number; // 0-100
};

export function detectGameTalk(message: string): GameTalkTags {
  const m = (message || '').toLowerCase();
  let score = 0;
  const subtypes: GameTalkTags['subtypes'] = [];

  const add = (t: GameTalkTags['subtypes'][number], s: number) => { if (!subtypes.includes(t)) subtypes.push(t); score += s; };

  if (/\btalk(ing)?\s+game\b/.test(m) || /\bgame\s+talk\b/.test(m) || /\bwhere'?s?\s+your\s+head\s+at\b/.test(m)) add('meta_phrase', 25);
  if (/\balliance|team up|work together|numbers\b/.test(m)) add('alliance', 30);
  if (/\bvote|voting|evict|target\b/.test(m)) { add('vote', 25); add('targets', 25); }
  if (/\bnumbers|do we have the numbers|we have (the )?votes?\b/.test(m)) add('numbers', 20);
  if (/\bwhere('?s)?\s+(your|ya)\s+head\s+at\b/.test(m) || /\bwhat'?s?\s+the\s+plan\b/.test(m)) add('where_head', 20);
  if (/\bplan|strategy|move\b/.test(m)) add('plan', 15);
  if (/\bcan i trust|are you with|loyal|solid\b/.test(m)) add('trust_check', 20);
  if (/\bkeep this between us|do not leak|between you and me|quiet\b/.test(m)) add('leak_check', 10);

  const isGameTalk = score >= 25;
  const confidence = Math.min(100, score);
  return { isGameTalk, subtypes, confidence };
}

export type GameTalkContext = {
  conversationType: 'public' | 'private' | 'confessional' | string;
  npc: { name: string; trustLevel?: number; suspicionLevel?: number; closeness?: number } | null;
  day?: number;
};

export function craftGameTalkReply(
  message: string,
  tags: GameTalkTags,
  ctx: GameTalkContext
): string {
  const trust = ctx.npc?.trustLevel ?? 40;
  const susp = ctx.npc?.suspicionLevel ?? 30;
  const closeness = ctx.npc?.closeness ?? 20;
  const isPrivate = ctx.conversationType === 'private';

  // Public deflection with strategic subtext
  if (!isPrivate) {
    if (susp > 55) return 'Not here; too many ears. Circle back when it is quiet.';
    return 'Later. I am keeping things calm in the open.';
  }

  // Private: engage; choose a concrete next step
  const mentionsAlliance = tags.subtypes.includes('alliance');
  const mentionsVote = tags.subtypes.includes('vote') || tags.subtypes.includes('targets');
  const mentionsNumbers = tags.subtypes.includes('numbers');

  if (mentionsAlliance && trust > 55 && susp < 50) {
    return 'I am in, but we keep it narrow. Two names, one test tomorrow.';
  }

  if (mentionsVote || mentionsNumbers) {
    if (susp > 60) return 'Maybe; first, who do you have for numbers and why me?';
    return 'I can pull two if you lock one. Who is the clean target?';
  }

  // Generic private game talk: probe and set a minimal commitment
  if (trust > 60 || closeness > 40) {
    return 'I will work with you if the pitch is tight. Which name and what cover story?';
  }

  return 'I will listen, but I need clarity—name, timing, and who carries the vote.';
}

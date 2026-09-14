// House Drama Feed
//
// Derives the living social story of the house from state the player could
// PLAUSIBLY HAVE WITNESSED IN PUBLIC: things that happened in front of them,
// conversations they were part of, arguments the whole house saw, alliances they
// belong to or that have visibly leaked, and huddles they physically caught.
// Private schemes, DMs, confessionals and hidden alliances never appear here.
//
// Each thread carries influence options so the feed is something the player can
// act on, not a static ticker.

import type { Contestant, GameState, GameMemory } from '@/types/game';

export type DramaKind = 'conflict' | 'alliance' | 'conversation' | 'target';

export type DramaInfluence =
  | 'take_side_a'
  | 'take_side_b'
  | 'defuse'
  | 'fan_flames'
  | 'insert_self'
  | 'warn_target'
  | 'stay_out';

export interface DramaInfluenceOption {
  id: DramaInfluence;
  label: string;
  hint: string;
  risk: 'low' | 'medium' | 'high';
}

export interface DramaThread {
  id: string;
  kind: DramaKind;
  day: number;
  participants: string[]; // public figures in the thread
  subject?: string; // who it's about, when different from participants
  headline: string; // one spoken-feed sentence
  witnessed: string; // how the player knows
  heat: number; // 0..100, drives ordering
  options: DramaInfluenceOption[];
}

const PUBLIC_TAGS = ['public', 'meeting', 'overheard_possible', 'house_meeting'];

function sawItInPublic(m: GameMemory, playerName: string): boolean {
  if (m.participants?.includes(playerName)) return true; // player was there
  if (m.type === 'event' || m.type === 'elimination' || m.type === 'alliance_meeting') {
    // House-wide moments are seen by everyone in the room.
    if ((m.tags || []).some((t) => PUBLIC_TAGS.includes(t))) return true;
    if (m.type === 'event' || m.type === 'elimination') return true;
  }
  return (m.tags || []).includes('overheard_possible');
}

function isPrivateChannel(m: GameMemory): boolean {
  return m.type === 'dm' || m.type === 'confessional_leak' || m.type === 'scheme';
}

function nameList(names: string[]): string {
  if (names.length === 0) return 'the house';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function conflictOptions(a: string, b: string): DramaInfluenceOption[] {
  return [
    { id: 'take_side_a', label: `Back ${a}`, hint: `${a} owes you; ${b} won't forget it.`, risk: 'medium' },
    { id: 'take_side_b', label: `Back ${b}`, hint: `${b} owes you; ${a} won't forget it.`, risk: 'medium' },
    { id: 'defuse', label: 'Calm it down', hint: 'Both cool off on you, the house sees a peacemaker.', risk: 'low' },
    { id: 'fan_flames', label: 'Keep it burning', hint: 'Great television, and they stay aimed at each other — if nobody clocks you.', risk: 'high' },
    { id: 'stay_out', label: 'Stay out of it', hint: 'Nothing gained, nothing risked.', risk: 'low' },
  ];
}

function huddleOptions(names: string[]): DramaInfluenceOption[] {
  return [
    { id: 'insert_self', label: 'Walk in on it', hint: 'Force your way into the conversation.', risk: 'medium' },
    { id: 'fan_flames', label: 'Tell the house', hint: `Make sure everyone knows ${nameList(names)} are working together.`, risk: 'high' },
    { id: 'stay_out', label: 'Let it play out', hint: 'Watch and keep the read to yourself.', risk: 'low' },
  ];
}

function targetOptions(subject: string): DramaInfluenceOption[] {
  return [
    { id: 'warn_target', label: `Warn ${subject}`, hint: `${subject} trusts you; the ones aiming at them won't.`, risk: 'medium' },
    { id: 'fan_flames', label: 'Push it along', hint: `Help the house settle on ${subject}.`, risk: 'high' },
    { id: 'stay_out', label: 'Say nothing', hint: 'Keep your hands clean.', risk: 'low' },
  ];
}

/**
 * Build the drama feed. Only publicly witnessed material is used.
 */
export function buildDramaFeed(state: GameState, limit = 6): DramaThread[] {
  const { playerName, currentDay } = state;
  const active = state.contestants.filter((c) => !c.isEliminated && c.name !== playerName);
  const threads: DramaThread[] = [];
  const seen = new Set<string>();

  const push = (t: DramaThread) => {
    const key = `${t.kind}|${[...t.participants].sort().join('|')}|${t.subject || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    threads.push(t);
  };

  // 1) Public blowups and heated public moments the player was around for.
  for (const c of active) {
    for (const m of (c.memory || []).slice(-25).reverse()) {
      if (m.day < currentDay - 3) continue;
      if (isPrivateChannel(m)) continue;
      if (!sawItInPublic(m, playerName)) continue;
      const others = (m.participants || []).filter((p) => p !== playerName && !p.startsWith('['));
      if (m.emotionalImpact <= -4 && others.length >= 2) {
        const [a, b] = others;
        push({
          id: `conflict-${a}-${b}-${m.day}`,
          kind: 'conflict',
          day: m.day,
          participants: [a, b],
          headline: `${a} and ${b} still haven't squashed what happened in front of everyone.`,
          witnessed: m.participants.includes(playerName) ? 'You were standing right there.' : 'The whole house saw it.',
          heat: Math.min(100, 55 + Math.abs(m.emotionalImpact) * 4),
          options: conflictOptions(a, b),
        });
      }
    }
  }

  // 2) Pairs the player physically caught huddled up (overheard, not read).
  for (const c of active) {
    for (const m of (c.memory || []).slice(-25).reverse()) {
      if (m.day < currentDay - 2) continue;
      if (!(m.tags || []).includes('overheard_possible')) continue;
      const others = (m.participants || []).filter((p) => p !== playerName);
      if (others.length < 2) continue;
      push({
        id: `huddle-${others.slice(0, 2).join('-')}-${m.day}`,
        kind: 'conversation',
        day: m.day,
        participants: others.slice(0, 2),
        headline: `${nameList(others.slice(0, 2))} keep breaking off to talk where nobody can hear.`,
        witnessed: 'You caught them mid-sentence and they changed the subject.',
        heat: 50,
        options: huddleOptions(others.slice(0, 2)),
      });
    }
  }

  // 3) Alliances the player is in, or ones that have visibly leaked.
  for (const a of state.alliances) {
    if (a.dissolved) continue;
    const inIt = a.members.includes(playerName);
    const leaked = (a.exposureRisk || 0) >= 65;
    if (!inIt && !leaked) continue; // hidden alliances stay hidden
    const others = a.members.filter((m) => m !== playerName);
    if (others.length < 2) continue;
    push({
      id: `alliance-${a.id}`,
      kind: 'alliance',
      day: a.formed,
      participants: others,
      headline: inIt
        ? `${nameList(others)} are running your alliance's numbers without much help from you.`
        : `The house is openly saying ${nameList(others)} are working as a group.`,
      witnessed: inIt ? "You're in the room for it." : 'It stopped being a secret days ago.',
      heat: inIt ? 45 : 70,
      options: huddleOptions(others.slice(0, 3)),
    });
  }

  // 4) Someone the house is visibly circling — only when it's been said out loud.
  const talkedAboutOpenly = new Map<string, number>();
  for (const c of active) {
    for (const m of (c.memory || []).slice(-20)) {
      if (m.day < currentDay - 3) continue;
      if (isPrivateChannel(m)) continue;
      if (!sawItInPublic(m, playerName)) continue;
      const mention = active.find((x) => (m.content || '').includes(x.name) && !m.participants.includes(x.name));
      if (mention && m.emotionalImpact < 0) {
        talkedAboutOpenly.set(mention.name, (talkedAboutOpenly.get(mention.name) || 0) + 1);
      }
    }
  }
  for (const [subject, count] of [...talkedAboutOpenly.entries()].sort((x, y) => y[1] - x[1]).slice(0, 2)) {
    if (count < 2) continue;
    push({
      id: `target-${subject}-${currentDay}`,
      kind: 'target',
      day: currentDay,
      participants: active.filter((c) => c.name !== subject).slice(0, 2).map((c) => c.name),
      subject,
      headline: `${subject}'s name keeps coming up in the kitchen, and not kindly.`,
      witnessed: "You've heard it said out loud more than once.",
      heat: 60 + count * 5,
      options: targetOptions(subject),
    });
  }

  return threads
    .sort((a, b) => b.day - a.day || b.heat - a.heat)
    .slice(0, limit);
}

export interface DramaEffect {
  perContestant: Record<string, { trust: number; suspicion: number; closeness: number }>;
  note: string;
  entertainment: number;
  influence: number;
}

/**
 * Resolve an influence choice into concrete social effects. Effects are named so
 * the player always learns who moved and why.
 */
export function resolveDramaInfluence(
  thread: DramaThread,
  option: DramaInfluence,
  state: GameState,
): DramaEffect {
  const per: DramaEffect['perContestant'] = {};
  const bump = (name: string, trust: number, suspicion: number, closeness = 0) => {
    if (!name) return;
    const c = state.contestants.find((x) => x.name === name && !x.isEliminated);
    if (!c) return;
    const cur = per[name] || { trust: 0, suspicion: 0, closeness: 0 };
    per[name] = { trust: cur.trust + trust, suspicion: cur.suspicion + suspicion, closeness: cur.closeness + closeness };
  };
  const [a, b] = thread.participants;
  const bystanders = state.contestants
    .filter((c) => !c.isEliminated && c.name !== state.playerName && !thread.participants.includes(c.name))
    .map((c) => c.name);

  switch (option) {
    case 'take_side_a':
      bump(a, 10, -4, 4);
      bump(b, -9, 8, -3);
      return { perContestant: per, note: `You backed ${a} in front of people. ${a} remembers it; ${b} does too.`, entertainment: 5, influence: 4 };
    case 'take_side_b':
      bump(b, 10, -4, 4);
      bump(a, -9, 8, -3);
      return { perContestant: per, note: `You backed ${b} in front of people. ${b} remembers it; ${a} does too.`, entertainment: 5, influence: 4 };
    case 'defuse':
      bump(a, 5, -5, 2);
      bump(b, 5, -5, 2);
      bystanders.slice(0, 3).forEach((n) => bump(n, 3, -2, 1));
      return { perContestant: per, note: 'You took the heat out of the room. Both of them, and the people watching, took note.', entertainment: 2, influence: 3 };
    case 'fan_flames': {
      bump(a, -2, 5);
      bump(b, -2, 5);
      // The house partly clocks who kept it going.
      bystanders.slice(0, 3).forEach((n) => bump(n, -1, 4));
      const subj = thread.subject;
      if (subj) bump(subj, -6, 6);
      return { perContestant: per, note: 'You kept it going. Great television — and a few people noticed who was stirring.', entertainment: 8, influence: 5 };
    }
    case 'insert_self':
      thread.participants.forEach((n) => bump(n, 3, 4, 2));
      return { perContestant: per, note: `You walked straight into it. ${nameList(thread.participants)} let you in, warily.`, entertainment: 4, influence: 4 };
    case 'warn_target': {
      const subj = thread.subject || a;
      bump(subj, 14, -8, 6);
      thread.participants.filter((n) => n !== subj).forEach((n) => bump(n, -7, 9));
      return { perContestant: per, note: `You told ${subj} what you'd heard. They owe you now; the ones aiming at them are asking who talked.`, entertainment: 6, influence: 5 };
    }
    case 'stay_out':
    default:
      return { perContestant: per, note: 'You let it burn without you. Nobody blames you, nobody thanks you.', entertainment: 0, influence: 0 };
  }
}

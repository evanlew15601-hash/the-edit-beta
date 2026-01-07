import { SpeechAct, SpeechActType } from "./speechActClassifier";

export type ConversationTopic =
  | "vote"
  | "alliance"
  | "relationship"
  | "edit"
  | "life"
  | "other";

export interface ConversationIntent {
  primaryAct: SpeechActType;
  secondaryAct?: SpeechActType;
  topic: ConversationTopic;
  voteTarget?: string;
  mentionedAllies?: string[];
  mentionedThreats?: string[];
  wantsAllianceWith?: string[];
  wantsToExclude?: string[];
  wantsInfoOn?: string[];
  explicitNumbers?: {
    ours?: number;
    theirs?: number;
    needed?: number;
  };
}

function normalizeNames(allNames: string[], mentions?: string[] | null): string[] {
  if (!Array.isArray(mentions) || mentions.length === 0) return [];
  const nameSet = new Set(allNames);
  return Array.from(
    new Set(
      mentions.filter((n) => !!n && nameSet.has(n))
    )
  );
}

function detectTopic(message: string): ConversationTopic {
  const lower = message.toLowerCase();

  if (/\b(vote|votes|evict|eviction|on the block|put (them|him|her) up|backdoor|target)\b/.test(lower)) {
    return "vote";
  }

  if (/\b(alliance|work together|team up|numbers|ride or die|final two|final 2|us three|we three)\b/.test(lower)) {
    return "alliance";
  }

  if (/\b(trust|feel about|feel with|feel around|vibe|relationship|where we stand|how we are)\b/.test(lower)) {
    return "relationship";
  }

  if (/\b(edit|viewers|audience|screen time|airtime|segment|episode|feeds?)\b/.test(lower)) {
    return "edit";
  }

  if (/\b(where are you from|what do you do|job|work|outside the game|real life|back home)\b/.test(lower)) {
    return "life";
  }

  return "other";
}

function extractVoteTarget(
  message: string,
  topic: ConversationTopic,
  speechAct: SpeechAct,
  validMentions: string[]
): string | undefined {
  if (topic !== "vote") return undefined;
  if (!validMentions.length) return undefined;

  const lower = message.toLowerCase();

  // If exactly one mention and we are clearly talking votes, treat as target
  if (validMentions.length === 1) {
    if (/\b(vote|votes|evict|send home|get rid of|target)\b/.test(lower)) {
      return validMentions[0];
    }
  }

  // If speech act is clearly aggressive/manipulative and mentions a name, use first
  if (
    ["threatening", "sabotaging", "gaslighting"].includes(speechAct.primary) &&
    validMentions.length > 0
  ) {
    return validMentions[0];
  }

  return undefined;
}

function extractNumbers(message: string) {
  const lower = message.toLowerCase();
  const explicit: ConversationIntent["explicitNumbers"] = {};
  const have = lower.match(/\bwe (have|got)\s+(\d+)\b/);
  if (have) {
    explicit.ours = parseInt(have[2], 10);
  }
  const need = lower.match(/\bneed\s+(\d+)\b/);
  if (need) {
    explicit.needed = parseInt(need[1], 10);
  }
  const theyHave = lower.match(/\bthey (have|got)\s+(\d+)\b/);
  if (theyHave) {
    explicit.theirs = parseInt(theyHave[2], 10);
  }
  return explicit.ours || explicit.theirs || explicit.needed ? explicit : undefined;
}

function escapeForRegex(name: string) {
  return name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractExclusions(
  message: string,
  allNames: string[],
  mentions: string[]
): string[] {
  const lower = message.toLowerCase();
  const excluded: string[] = [];

  for (const name of allNames) {
    if (!name) continue;
    const n = name.toLowerCase();
    const esc = escapeForRegex(n);
    if (
      new RegExp(`\\bwithout\\s+${esc}\\b`).test(lower) ||
      new RegExp(`\\bnot\\s+${esc}\\b`).test(lower) ||
      new RegExp(`\\bexcept\\s+${esc}\\b`).test(lower)
    ) {
      excluded.push(name);
    }
  }

  // If we explicitly say "us" or "we" with one name, treat other mentioned as exclusion
  if (/\bus\b|\bwe\b/.test(lower) && mentions.length > 1) {
    // naive: exclude all but first mentioned
    excluded.push(...mentions.slice(1));
  }

  return Array.from(new Set(excluded));
}

class ConversationIntentEngine {
  parse(message: string, speechAct: SpeechAct, allContestantNames: string[]): ConversationIntent {
    const topic = detectTopic(message);
    const validMentions = normalizeNames(allContestantNames, speechAct.namedMentions);

    const voteTarget = extractVoteTarget(message, topic, speechAct, validMentions);
    const explicitNumbers = extractNumbers(message);
    const wantsInfoOn =
      speechAct.informationSeeking && validMentions.length ? validMentions : undefined;

    const wantsAllianceWith =
      topic === "alliance" && validMentions.length ? validMentions : undefined;

    const wantsToExclude =
      topic === "alliance" || topic === "vote"
        ? extractExclusions(message, allContestantNames, validMentions)
        : [];

    const intent: ConversationIntent = {
      primaryAct: speechAct.primary,
      secondaryAct: speechAct.secondary,
      topic,
      voteTarget,
      mentionedAllies: validMentions.length ? validMentions : undefined,
      mentionedThreats: undefined, // can be refined later
      wantsAllianceWith: wantsAllianceWith && wantsAllianceWith.length ? wantsAllianceWith : undefined,
      wantsToExclude: wantsToExclude && wantsToExclude.length ? wantsToExclude : undefined,
      wantsInfoOn,
      explicitNumbers,
    };

    return intent;
  }
}

export const conversationIntentEngine = new ConversationIntentEngine();
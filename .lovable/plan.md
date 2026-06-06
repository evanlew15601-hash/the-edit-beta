# Deterministic Tag-Talk as the Primary Conversation System

Goal: the entire social sim — NPC replies, pull-asides, confessionals, perception, memory tagging — must work correctly with AI fully disabled. AI becomes a stylistic wrapper only.

## Architecture

New pipeline for every NPC utterance:

```text
Player input / trigger
  → Intent Interpretation (speechActClassifier + conversationIntentEngine)
  → NPC Perception (socialInterpretationEngine, memoryEngine, relationshipGraph)
  → NPC Decision (new: npcDecisionEngine — picks response intent + emotion + reveal level)
  → Response Tag Bundle (TOPIC, INTENT, EMOTION, TRUST, SUSPICION, CERTAINTY, CONTEXT, REPUTATION, ARCHETYPE, MEMORY_REF?)
  → Deterministic Dialogue (new: deterministicResponseLibrary, filtered by archetype)
  → [optional] AI rephrase pass (style only, never changes tags/effects)
```

All trust/suspicion/memory/vote/alliance effects are computed from the tag bundle in the simulation layer, BEFORE any text is generated. The string is cosmetic.

## New files

1. `src/data/responseLibrary.ts`
   - Authored pools keyed by `${INTENT}_${EMOTION}` with 4–8 variants each.
   - Covers: BUILD_TRUST, TEST_LOYALTY, WITHHOLD_INFO, REVEAL_INFO, ACCUSE, DEFLECT, AGREE, REFUSE, PROBE, REASSURE, THREATEN, APOLOGIZE, FLIRT, JOKE, GREET, END_CONVO × emotions (SINCERE, GUARDED, SUSPICIOUS, ANGRY, PLAYFUL, ANXIOUS, COLD, WARM).
   - Plus memory-callback variants gated by `MEMORY_REF` (betrayal, save, promise_kept, promise_broken, shared_vote).

2. `src/data/personalityFilters.ts`
   - Archetype → text transform / variant selector (Hothead, Strategist, PassiveAggressive, Charmer, Paranoid, Stoic, Wildcard).
   - Maps `psychProfile.disposition` + key traits → archetype.

3. `src/utils/npcDecisionEngine.ts`
   - `decideResponse(npc, playerIntent, gameState): ResponseTagBundle`
   - Pure function. Reads memory, trust, suspicion, alliance state, recent events, reputation.
   - Picks response INTENT + EMOTION + CERTAINTY + reveal level deterministically (seeded RNG by `npc.id + day + turn`).
   - Selects optional MEMORY_REF when a relevant memory exists.

4. `src/utils/deterministicResponseEngine.ts`
   - `renderResponse(bundle, npc): string`
   - Pulls from `responseLibrary`, applies `personalityFilters`, substitutes `{player}`, `{target}`, `{memory}` tokens.
   - Never calls AI.

5. `src/utils/misinterpretationLibrary.ts`
   - For each (playerIntent, tone) pair, authored confessional/observation snippets keyed by NPC perception outcome (from `socialInterpretationEngine`).

6. `src/utils/deterministicConfessionalEngine.ts`
   - Replaces runtime AI confessionals. Builds from interpretation + emotion + goals using authored templates.

## Edits

- `src/utils/npcResponseEngine.ts` — route through `npcDecisionEngine` → `deterministicResponseEngine`. Remove direct AI calls from the critical path. Keep an optional `enhanceWithAI` step gated by a setting, that ONLY rephrases the deterministic string and is discarded if it changes length/structure dramatically or fails.
- `src/utils/npcConfessionalEngine.ts` — replace `generateLocalAIReply` call with `deterministicConfessionalEngine`; AI rephrase optional.
- `src/utils/backgroundConversationEngine.ts` — same swap.
- `src/utils/juryRationaleEngine.ts` — deterministic rationale templates keyed by jury member's memory/trust/suspicion of finalists; AI optional.
- `src/hooks/useGameState.ts`
  - `runPullAsideFollowUp`: compute next NPC line via `npcDecisionEngine` + `deterministicResponseEngine`. Apply trust/suspicion deltas from the bundle, NOT from any AI text. Only call AI as optional rephrase after deltas are committed.
  - `respondToForcedConversation`: deltas already come from tags via `actionEngine`; ensure no AI-derived deltas remain.
- `src/utils/localLLM.ts` — keep as a thin rephrase helper. Add `rephraseDeterministic(text, styleHints)` that returns input on failure. Mark `generateLocalAIReply` as legacy.
- `src/components/game/AISettingsPanel.tsx` — add toggle "AI Style Enhancement (optional)"; default OFF. When OFF, app must never hit the edge function.
- `src/components/game/ConversationDialog.tsx` — show a small "Deterministic" / "Style-enhanced" badge on each NPC turn so the player can see source-of-truth.

## Tag bundle type

In `src/types/tagDialogue.ts` add:

```ts
export type ResponseIntent = 'BUILD_TRUST' | 'TEST_LOYALTY' | 'WITHHOLD_INFO' | 'REVEAL_INFO'
  | 'ACCUSE' | 'DEFLECT' | 'AGREE' | 'REFUSE' | 'PROBE' | 'REASSURE'
  | 'THREATEN' | 'APOLOGIZE' | 'FLIRT' | 'JOKE' | 'GREET' | 'END_CONVO';
export type Emotion = 'SINCERE'|'GUARDED'|'SUSPICIOUS'|'ANGRY'|'PLAYFUL'|'ANXIOUS'|'COLD'|'WARM';
export type Archetype = 'Hothead'|'Strategist'|'PassiveAggressive'|'Charmer'|'Paranoid'|'Stoic'|'Wildcard';
export interface ResponseTagBundle {
  topic: TopicTag;
  intent: ResponseIntent;
  emotion: Emotion;
  certainty: 'LOW'|'MEDIUM'|'HIGH';
  trustBand: 'LOW'|'MEDIUM'|'HIGH';
  suspicionBand: 'LOW'|'MEDIUM'|'HIGH';
  context: 'PRIVATE'|'PUBLIC'|'GROUP';
  reputation: 'TRUSTED'|'NEUTRAL'|'UNPREDICTABLE'|'DISTRUSTED';
  archetype: Archetype;
  memoryRef?: { eventId: string; kind: 'betrayal'|'save'|'promise_kept'|'promise_broken'|'shared_vote' };
  effects: { trust: number; suspicion: number; entertainment: number; influence: number };
}
```

`effects` is computed by the decision engine from the bundle (using existing `actionEngine` deltas) so callers apply state changes from the bundle, never from text.

## Audit (Step 7)

Grep and remove any path where AI output changes:
- trust/suspicion deltas
- alliance formation
- vote targets
- memory creation
- perception/intent

Verified targets: `npcResponseEngine.ts`, `useGameState.ts` pull-aside follow-up, `npcConfessionalEngine.ts` (currently only writes memory event with AI text — switch to deterministic text first, then store).

## Scope notes

- This is a large refactor; I will do it in one pass but keep changes additive where possible: new engines coexist with old ones, and existing call sites are switched over file-by-file. Old `generateLocalAIReply` stays as the optional rephraser.
- Default behavior after this change: AI Style Enhancement OFF. Game fully playable with zero edge-function calls.
- I will not redesign `actionEngine` deltas — they already come from tags.

## Deliverable

After this lands:
- Disabling AI in settings produces a fully coherent season.
- Every NPC line in pull-asides, free conversations, and confessionals is traceable to a tag bundle.
- AI, when enabled, only rephrases — verified by a guard that discards rephrasings that change length by >2× or are empty.

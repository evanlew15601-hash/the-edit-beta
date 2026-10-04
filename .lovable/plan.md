# Strategy Simulation Overhaul

## Goal
Use Hasbeen Villa as systems inspiration while preserving this game's identity as an interactive reality-show social strategy game. The upgrade should make every conversation, alliance, scheme, public incident, competition, vote, and edit feed one coherent simulation.

## Player Experience
- Every day presents consequential tradeoffs: build trust, collect information, protect an alliance, manipulate a target, manage public perception, or prepare for power.
- Houseguests act independently between player turns: they talk, lobby, form grudges, compare claims, reconsider loyalties, and pursue their own endgame interests.
- The player only learns what they directly witness, are told, or can reasonably infer. Hidden motives and private deals remain simulated but unseen.
- Strategy intensifies as the cast shrinks: loyalty matters earlier, while threat management, competition records, jury respect, and betrayal timing matter later.
- Outcomes are explainable through witnessed evidence without exposing raw hidden scores.

## Implementation Phases

### 1. One Social Source of Truth
- Create one shared interaction resolver for free-text talk, Tag-Talk, group talk, pull-asides, house meetings, schemes, and drama interventions.
- Make the relationship graph authoritative for directional trust, suspicion, closeness, alliance loyalty, and recent interaction history.
- Synchronize contestant-facing summaries from that graph instead of independently changing duplicate trust and suspicion fields.
- Apply diminishing returns and social fatigue when repeatedly targeting the same person or repeating the same approach.
- Preserve deterministic Tag-Talk as the decision source; optional AI remains wording-only.

### 2. Hidden Personality and Compatibility
- Derive stable hidden traits from each houseguest's existing personality and stats: warmth, loyalty, authenticity, cooperation, composure, ego, risk tolerance, gullibility, and strategic intensity.
- Add directional compatibility between every pair, distinct from current trust. Compatibility influences how quickly trust forms, how grudges persist, and which approaches work.
- Use separate strategic affinity and personal closeness so allies can dislike one another and friends can become strategic threats.
- Keep these values hidden; surface them only through behavior, witnessed reactions, and natural dialogue.

### 3. Unified NPC Strategy Utility
- Replace fragmented targeting rules with a shared utility model used by nominations, votes, saves, lobbying, alliance plans, information sharing, and autonomous conversations.
- Score options from relationship, suspicion, alliance loyalty, conflicting alliances, recent changes, grudges, promises, known threats, competition record, edit/reputation, jury implications, and controlled personality-based uncertainty.
- Scale weights by game phase so NPC priorities evolve naturally from early social positioning to late-game threat removal and jury planning.
- Store concise decision reasons for testing and debugging, while showing only diegetic clues to the player.

### 4. Autonomous House Simulation
- Add a bounded between-turn simulation where NPCs choose a small number of purposeful actions: private talk, public discussion, lobbying, reassurance, confrontation, alliance recruitment, information exchange, or target testing.
- Persist convictions such as grudges, promises, suspected lies, protected allies, and preferred targets with decay and reinforcement.
- Resolve conflicting alliance loyalties explicitly rather than treating every alliance as equally binding.
- Feed only publicly witnessed or legitimately learned outcomes into the House Drama feed; private actions remain hidden until leaked or revealed.

### 5. Information and Deception Economy
- Consolidate information trading, enhanced information, planted beliefs, and corroboration into one knowledge ledger recording source, subject, confidence, privacy, age, and corroboration state.
- Let NPCs compare claims over multiple days, independently corroborate them, withhold information, trade it, leak it, or expose a liar.
- Make manipulation viable but situational: compatibility, trust, gullibility, specificity, corroboration, repetition, and delivery context determine success.
- Allow information to influence targets, alliances, confrontations, and jury opinions rather than ending as flavor text.

### 6. Alliance Strategy
- Give alliances shared targets, protected members, promises, voting discipline, exposure risk, and conflicting obligations.
- Expand alliance influence into concrete proposals: nominate, save, vote, recruit, exclude, leak, or abandon a target.
- Members respond according to personal utility and may agree, hedge, secretly defect, or counter-propose.
- Track alliance history so betrayal, loyalty, and timing affect future cooperation and jury respect.

### 7. Power, Voting, and Episode Structure
- Formalize each cycle into composable phases: social play, competition, power decision, campaigning, vote, aftermath, and recap.
- Make power outcomes feed strategic decisions: competition record raises threat, immunity changes lobbying, and visible safety can enable riskier play.
- Ensure nomination, save, and eviction decisions all use the unified strategy utility while respecting the player's incomplete information.
- Keep the current season format, but structure phases so future twists or alternate vote formats can be added without duplicating logic.

### 8. Edit, Ratings, and Jury Consequences
- Turn edit and audience response into strategic feedback rather than cosmetic meters.
- Public conflict, visible loyalty, entertaining risks, hypocrisy, underdog momentum, and competition performance shape the weekly edit.
- Let reputation affect information credibility, social leverage, selected public twists, tie-break sentiment, and audience awards without overriding the core social game.
- Make jurors evaluate finalists from lived memory: loyalty, betrayals, agency, respect, personal treatment, and visible game ownership.

### 9. Presentation and Player Agency
- Reorganize the gameplay screen around the current decision, witnessed house activity, strategic relationships, and remaining daily actions.
- Replace overlapping conversation and intelligence surfaces with shared controls and consistent outcomes.
- Show concise consequence previews where the player should reasonably anticipate risk; never reveal exact hidden calculations.
- Keep debug explanations behind debug mode for balancing and regression work.

## Technical Approach
- Introduce small pure engines for hidden traits, strategic utility, knowledge state, and autonomous turns.
- Route existing systems through shared interfaces before deleting superseded paths.
- Refactor the oversized game-state hook incrementally into focused action resolvers without changing save compatibility.
- Version or safely normalize saved state so existing seasons receive defaults for new fields.
- Remove dead or duplicate information, conversation, and “enhanced” modules only after all active call sites move to the consolidated systems.
- Record deterministic seeds and decision reasons so simulation outcomes remain reproducible in tests.

## Verification
- Unit tests for compatibility, phase scaling, conflicting alliances, conviction decay, information corroboration, manipulation outcomes, and target selection.
- Regression tests proving free-text and Tag-Talk apply equivalent social rules and cannot desynchronize relationship state.
- Multi-day simulation tests verifying NPC autonomy, information visibility, alliances, voting, and jury memory remain coherent.
- Live playthrough checks for an early week, a midgame betrayal, a late-game threat vote, and the finale across desktop and mobile layouts.

## Delivery Order
Implement phases 1–3 first because every later mechanic depends on one authoritative social state and decision model. Then add autonomy and information, followed by alliances/voting, and finish with edit/jury consequences and interface consolidation. Each phase must leave the game playable and tested.

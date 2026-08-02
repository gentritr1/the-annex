# Architecture

## Core invariant

Canonical state is deterministic and serializable. A model can interpret state or propose content; it cannot silently mutate evidence, trust, access, alarms, decisions, or run history. The MVP event log is source-addressable and auditable; canonical state replay is intentionally deferred until a real migration or debugging need proves its shape.

```text
Authored content → explicit action → pure reducer → canonical state → local save
                                      ↓
                                  event log

Canonical state → optional provider adapter → candidates → authored validation → UI
```

## Current boundaries

### Content

`src/game/content.ts` is the case registry and shared resolver layer. Authored labels,
narrative copy, evidence definitions, action effects, puzzle fragments, decisions, hearing
questions, and outcome contracts live in `src/game/cases/case77.ts` and
`src/game/cases/case81.ts`. Content is data and pure derivation, not mutable runtime state.
The global `unnumberedReadingRoom` definition is the intentional exception to case
ownership: it belongs to the campaign's Fourth Margin and carries one entry anchor for
each authored `SceneWorldKind`, while `canEnterUnnumberedReadingRoom(state)` remains a
pure projection of the registered `reader-key-04` discovery.

### Engine

`src/game/engine.ts` owns transitions. Components dispatch intent such as
`COMMIT_FIELD_ACTION`, `COMMIT_DEPOSITION`, `SET_TRIBUNAL_CHOICE`, and `DECIDE`; they do
not calculate trust, add evidence, or author campaign facts directly. A verdict commits
only when the case-owned outcome resolver returns every declared fact with an allowed
value. Invalid or repeated actions leave state unchanged.

### Persistence

`src/game/persistence.ts` stores a versioned JSON snapshot and a separate
accessibility-preferences record in `localStorage`. The current save schema is **v3**
(`CURRENT_SAVE_SCHEMA`), the single source of truth used by encode, decode, migration,
and tests.

- v2 introduced `caseId` and `precedents` (`caseId → latest decision id`).
- v3 introduced `tribunalChoice` for the active case and `caseOutcomes`
  (`caseId → exactly three case-owned facts`) for bounded campaign causality.

The outcome map is not a completed-case trace. It contains only the facts declared by a
case bundle and validates every fact id and value during verdict commit and save decode.
Legacy completed cases receive explicit `unknown` or `not-proven` fallbacks; old consent
or method tags are never reinterpreted as testimony permission.

Loading runs `migrateRawSave` **before** `decodeGameState`: the raw parsed save is brought up to `CURRENT_SAVE_SCHEMA` through an ordered pipeline of pure functions in `saveMigrations`, keyed by the version they upgrade *from* and applied in sequence. A non-record save, a missing/non-number `schemaVersion`, a version below 1, or a version above current (never downgrade) all migrate to `null`; decode then validates the migrated record strictly. This replaces the old hard `schemaVersion !== 1` rejection that silently dropped every save on a version bump.

**Adding v4 later:** add the new fields to `GameState`; write a `3` entry in
`saveMigrations` that reshapes a v3 record into v4 (pure, no I/O, and no speculative
inference); bump `CURRENT_SAVE_SCHEMA` and the `GameState.schemaVersion` literal; and add
a hand-authored v3 fixture proving an old save still loads with progress intact. The
pipeline chains every intermediate migration automatically.

Run history (`previousRuns`) is bounded: the engine caps it to the last `MAX_PREVIOUS_RUNS` (20) at push time in `START_NEXT_RUN`, and the 1→2 migration truncates any oversized legacy array. Only the most recent runs are kept; cross-run residue reads `.at(-1)`, so trimming is not observable.

The `SAVE_KEY` string (`'the-annex.case-77.save.v1'`) is frozen: its `.v1` suffix is a historical *key name*, not the schema version. Renaming it would orphan every existing save under the old key — the schema version lives inside the payload as `schemaVersion`. A future migration is added per schema version rather than weakening validation. Clearing progress intentionally preserves accessibility preferences.

### Presentation

React components receive state and dispatch actions. Hearing objections, legal-channel
labels, and reactive world materials are read-only projections of canonical state.
UI-only choices such as the open case-file tab remain intentionally unpersisted.
Accessibility preferences are stored independently and survive clearing or changing case
progress.

The Unnumbered Reading Room follows the same progressive-enhancement boundary as the
bounded case worlds, but it has no canonical interaction channel. Reader Key 04 is its
only persisted input. Room visibility, current camera, selected reading point, per-visit
opened point ids, object arrangements, and the all-lamps line remain component-local
state.
The three points are authored presentation definitions, not Fourth Margin secrets, and
room interaction never dispatches `DISCOVER_SECRET` or any other `GameAction`. WebGL and
semantic fallback consume the same definition; neither may add evidence, legal reward,
case outcome, precedent, or run-history data.

## Adding a model later

Add a server-side provider adapter only when there is a concrete feature. The adapter should accept a redacted, schema-bounded snapshot and return candidates with stable IDs. A deterministic validator selects, edits, or rejects those candidates before display.

Recommended order:

1. Offline authoring critique and quest-rule validation.
2. Non-canonical debrief reflection candidates.
3. Bounded hints selected from authored intents.
4. Social dialogue only after latency, privacy, cost, and regression controls are measured.

Claude- or Kimi-family models can occupy the same reviewer/candidate role without becoming runtime dependencies. Provider names must not leak into domain types.

## Extension seams

- Add a third case as a self-contained case bundle and register it in
  `src/game/content.ts`. Keep its authored outcome facts explicit and add structural
  cross-reference tests before extending shared interfaces.
- Add a new method tag only when it changes rules or reporting, not for copy flavor.
- Add a persona through the shared persona definition and trust map.
- Add cross-run residue as a compact summary, never by retaining the entire previous state graph.
- Add cloud saves behind the persistence interface after authentication exists.

## Current cross-run contract

Each completed run summary stores only its decision, first approach, distinct method tags,
evidence count, alarm, and final trust state. Separately, `precedents` retains the latest
decision per case and `caseOutcomes` retains exactly three authored facts per completed
case. On the next run, strong positive or negative relationships return as a bounded `+1`
or `-1` residue after the player chooses an approach. The briefing and first audit event
name the prior outcome and methods; later cases may consume only explicitly declared
outcome facts. This provides visible, deterministic consequence without cloning the
previous case graph.

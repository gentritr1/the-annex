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

`src/game/content.ts` contains labels, narrative copy, evidence definitions, action effects, puzzle fragments, and decisions. It is data, not mutable runtime state.

### Engine

`src/game/engine.ts` owns transitions. Components dispatch intent such as `COMMIT_FIELD_ACTION`; they do not calculate trust or add evidence directly. Invalid or repeated actions leave state unchanged.

### Persistence

`src/game/persistence.ts` stores a versioned JSON snapshot and a separate accessibility-preferences record in `localStorage`. Loading decodes every nested field and rejects malformed or incompatible saves. A future migration should be added per schema version rather than weakening validation. Clearing progress intentionally preserves accessibility preferences.

### Presentation

React components receive state and dispatch actions. UI-only choices such as the open case-rail tab are intentionally not persisted.

## Adding a model later

Add a server-side provider adapter only when there is a concrete feature. The adapter should accept a redacted, schema-bounded snapshot and return candidates with stable IDs. A deterministic validator selects, edits, or rejects those candidates before display.

Recommended order:

1. Offline authoring critique and quest-rule validation.
2. Non-canonical debrief reflection candidates.
3. Bounded hints selected from authored intents.
4. Social dialogue only after latency, privacy, cost, and regression controls are measured.

Claude- or Kimi-family models can occupy the same reviewer/candidate role without becoming runtime dependencies. Provider names must not leak into domain types.

## Extension seams

- Add a second case by duplicating the current content module first. Extract a shared case contract only after two cases prove the reuse pattern; the current engine is intentionally Case 77-specific.
- Add a new method tag only when it changes rules or reporting, not for copy flavor.
- Add a persona through the shared persona definition and trust map.
- Add cross-run residue as a compact summary, never by retaining the entire previous state graph.
- Add cloud saves behind the persistence interface after authentication exists.

## Current cross-run contract

Each completed run stores only its decision, first approach, distinct method tags, evidence count,
alarm, and final trust state. On the next run, strong positive or negative relationships return as a
bounded `+1` or `-1` residue after the player chooses an approach. The briefing and first audit event
name the prior outcome and methods, so the memory has both a visible explanation and a deterministic
effect without cloning the previous case graph.

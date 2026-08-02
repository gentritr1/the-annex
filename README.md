# The Annex MVP

A standalone, playable browser vertical slice about auditing a contested identity in a city whose civic infrastructure stores human memory.

Two linked case files — **Case 77: Mara Vale** and **Case 81: The Commissioned Witness** — prove three mechanics together:

- multiple investigative methods that change access and social response;
- a philosophical reconstruction puzzle with several valid interpretations;
- persistent character memory and a second-run recontextualization hook.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4173`.

## Quality checks

```bash
npm run lint
npm run test
npm run build
```

## Architecture

The game is deliberately local-first and deterministic:

- `src/game/content.ts` contains authored case content and definitions.
- `src/game/engine.ts` is the only place that mutates canonical game state.
- `src/game/persistence.ts` owns versioned local save/load behavior.
- `src/components/` renders phases and dispatches explicit game actions.
- every meaningful choice appends a source-addressable audit event.
- completed runs carry a bounded, inspectable relationship and method residue into the next loop.

Future AI integrations are proposal-only: models may draft dialogue, reflections, or hints, but authored validation decides what enters canonical state. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## MVP scope

Included: two linked cases, four investigative sites each, four method families, a reconstruction puzzle, four major personas plus a Mirror residue hook, tribunal outcomes, local persistence, responsive controls, accessibility preferences, distinct bounded 3D hubs for Case 77's rain-cooled civic concourse and Case 81's dry deposition annex, and a world-first cinematic HUD with inline dialogue and an in-game case/evidence codex.

Deferred: 3D first-person traversal, collision and physics, combat, open-world districts, character rigs, cloud accounts, live freeform NPC chat, procedural missions, and production-final character/audio pipelines.

## Project context

- [PRODUCT.md](PRODUCT.md) defines users, purpose, principles, and boundaries.
- [DESIGN.md](DESIGN.md) defines the visual system.
- [docs/CONTENT_AUTHORING.md](docs/CONTENT_AUTHORING.md) explains how to add a future case safely.
- [docs/3D_AMBIENCE_SLICE.md](docs/3D_AMBIENCE_SLICE.md) defines the bounded 3D vertical slice and its safe narrative seams.
- [docs/CINEMATIC_HUD.md](docs/CINEMATIC_HUD.md) defines the game-like HUD, dialogue, codex, and state boundaries.
- [docs/PROVENANCE.md](docs/PROVENANCE.md) tracks generated and authored assets.

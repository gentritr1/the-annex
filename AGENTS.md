# Project guidance

- Keep canonical game state deterministic, serializable, and owned by `src/game/engine.ts`.
- Treat future model providers as proposal-only adapters; never let a model silently mutate evidence, trust, access, alarms, outcomes, or run history.
- Prefer simple, explicit code over speculative abstraction. Duplicate until a second real case proves a shared shape.
- Keep authored content in `src/game/content.ts` and validate every cross-reference with tests.
- Preserve accessibility preferences independently from case progress.
- Run `npm run lint`, `npm run test`, and `npm run build` before handing off changes.
- Record the source and intended use of generated assets in `docs/PROVENANCE.md`.

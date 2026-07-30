# Nonlinear causal browser-playtest failure

The guarded browser pass stopped before committing refinement or evidence.

**Failed stage:** Lint production source

## Stage log

```text

===== Install project dependencies =====

added 250 packages, and audited 251 packages in 4s

64 packages are looking for funding
  run `npm fund` for details

5 high severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.

===== Check speculative-route refinement syntax =====

===== Apply Care to Archive speculative-route refinement =====
patched src/game/causal.ts
patched src/game/causal.test.ts

===== Lint production source =====

> the-annex-mvp@0.1.0 lint
> eslint .


/home/runner/work/the-annex/the-annex/scripts/nonlinear-browser-playtest.ts
  1:1  error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions

✖ 1 problem (1 error, 0 warnings)

```

## Vite log

```text
```

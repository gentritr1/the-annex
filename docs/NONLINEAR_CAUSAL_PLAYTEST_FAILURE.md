# Nonlinear causal browser-playtest failure

The guarded browser pass stopped before committing refinement or evidence.

**Failed stage:** Lint production source

## Stage log

```text

===== Install project dependencies =====

added 250 packages, and audited 251 packages in 5s

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
  201:7  error  'state' is never reassigned. Use 'const' instead  prefer-const

✖ 1 problem (1 error, 0 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.

```

## Vite log

```text
```

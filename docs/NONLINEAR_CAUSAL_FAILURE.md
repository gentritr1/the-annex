# Nonlinear causal bootstrap failure

The guarded production pass stopped before committing implementation files.

**Failed stage:** Lint

```text

===== Install dependencies =====

added 250 packages, and audited 251 packages in 8s

64 packages are looking for funding
  run `npm fund` for details

5 high severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.

===== Repair guarded UI codemod literals =====
repaired guarded UI codemod literals

===== Check core codemod syntax =====

===== Check UI codemod syntax =====

===== Apply canonical changes =====
patched src/game/types.ts
patched src/game/persistence.ts
patched src/game/engine.ts
patched src/game/engine.ts
patched src/game/engine.ts
patched src/game/cases/case81.ts
patched src/game/engine.test.ts

===== Apply investigation and presentation changes =====
patched src/game/causal.ts
patched src/game/causal.ts
patched src/game/causal.ts
patched src/components/Investigation.tsx
patched src/components/Investigation.tsx
patched src/components/Investigation.tsx
patched src/components/Investigation.tsx
patched src/components/Investigation.tsx
patched src/components/Investigation.tsx
patched src/components/Investigation.tsx
patched src/components/Investigation.tsx
patched src/components/Investigation.tsx
patched src/components/Investigation.tsx
patched src/components/Investigation.tsx
patched src/components/Investigation.tsx
patched src/components/Investigation.tsx
patched src/components/Investigation.tsx
patched src/components/Investigation.tsx
appended src/styles.css
appended docs/PROVENANCE.md

===== Lint =====

> the-annex-mvp@0.1.0 lint
> eslint .


/home/runner/work/the-annex/the-annex/src/components/Reconstruction.tsx
  36:28  error  Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This value was memoized in source but not in compilation output.

/home/runner/work/the-annex/the-annex/src/components/Reconstruction.tsx:36:28
  34 |     .join('|')
  35 |
> 36 |   const latticeFragments = useMemo(
     |                            ^^^^^^^^
> 37 |     () =>
     | ^^^^^^^^^
> 38 |       fragments.map((fragment) =>
     …
     | ^^^^^^^^^
> 49 |     [anchorStates, fragments],
     | ^^^^^^^^^
> 50 |   )
     | ^^^^ Could not preserve existing memoization
  51 |
  52 |   const corroboratedFragmentIds = fragments
  53 |     .filter((fragment) => anchorStates[fragment.id] === 'corroborated')                                                                                                                                                                                                          react-hooks/preserve-manual-memoization
  49:6   error  Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This dependency may be mutated later, which could cause the value to change unexpectedly.

/home/runner/work/the-annex/the-annex/src/components/Reconstruction.tsx:49:6
  47 |           : fragment,
  48 |       ),
> 49 |     [anchorStates, fragments],
     |      ^^^^^^^^^^^^ This dependency may be modified later
  50 |   )
  51 |
  52 |   const corroboratedFragmentIds = fragments                                                                                                                                                                                                                                                                                                                                                                                                                                                react-hooks/preserve-manual-memoization
  49:20  error  Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This dependency may be mutated later, which could cause the value to change unexpectedly.

/home/runner/work/the-annex/the-annex/src/components/Reconstruction.tsx:49:20
  47 |           : fragment,
  48 |       ),
> 49 |     [anchorStates, fragments],
     |                    ^^^^^^^^^ This dependency may be modified later
  50 |   )
  51 |
  52 |   const corroboratedFragmentIds = fragments                                                                                                                                                                                                                                                                                                                                                                                                                                    react-hooks/preserve-manual-memoization
  71:5   error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/home/runner/work/the-annex/the-annex/src/components/Reconstruction.tsx:71:5
  69 |
  70 |   useEffect(() => {
> 71 |     setCommitArmed(false)
     |     ^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  72 |     setSpeculationAcknowledged(false)
  73 |   }, [selectedStateKey])
  74 |  react-hooks/set-state-in-effect

/home/runner/work/the-annex/the-annex/src/scene/BeatStage.tsx
  84:7  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/home/runner/work/the-annex/the-annex/src/scene/BeatStage.tsx:84:7
  82 |     if (!seen || !autoAdvance || held) return
  83 |     if (shown < total) {
> 84 |       setShown(total)
     |       ^^^^^^^^ Avoid calling setState() directly within an effect
  85 |       return
  86 |     }
  87 |     const timer = window.setTimeout(completeNow, reducedMotion ? 0 : 520)  react-hooks/set-state-in-effect

✖ 5 problems (5 errors, 0 warnings)

```

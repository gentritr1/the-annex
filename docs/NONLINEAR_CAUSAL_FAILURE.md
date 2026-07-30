# Nonlinear causal bootstrap failure

The guarded production pass stopped before committing implementation files.

**Failed stage:** Test

```text

===== Install dependencies =====

added 250 packages, and audited 251 packages in 6s

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


===== Test =====

> the-annex-mvp@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/the-annex/the-annex[39m

 [32m✓[39m src/game/persistence.test.ts [2m([22m[2m20 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [31m❯[39m src/game/engine.test.ts [2m([22m[2m36 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 29[2mms[22m[39m
     [32m✓[39m accepts only one action per site[32m 3[2mms[22m[39m
     [32m✓[39m requires two field sites and a reconstruction before tribunal[32m 1[2mms[22m[39m
     [32m✓[39m keeps a reconstruction unresolved until exactly two anchors are selected[32m 0[2mms[22m[39m
     [32m✓[39m records how many selected anchors the field route corroborated[32m 1[2mms[22m[39m
     [32m✓[39m requires field evidence before opening the memory lattice[32m 0[2mms[22m[39m
     [32m✓[39m locks the forged resolution unless the maintenance override was acquired[32m 1[2mms[22m[39m
     [32m✓[39m tags the forged Case 77 finding as fraud/systems with a warning event[32m 1[2mms[22m[39m
     [32m✓[39m tags a lawful Case 77 finding as procedure with a neutral event[32m 0[2mms[22m[39m
     [32m✓[39m carries a compact run summary into the next loop[32m 1[2mms[22m[39m
     [32m✓[39m turns prior social trust into bounded residue on the next approach[32m 0[2mms[22m[39m
     [32m✓[39m records the run verdict as the case precedent, not before[32m 0[2mms[22m[39m
     [32m✓[39m starts a fresh game with no precedents and the current case id[32m 0[2mms[22m[39m
     [32m✓[39m caps carried run history at twenty and keeps the most recent runs[32m 1[2mms[22m[39m
     [32m✓[39m records the trust cause of a field action in the event log[32m 0[2mms[22m[39m
     [32m✓[39m names carried-over personas as residue on the next run approach[32m 0[2mms[22m[39m
     [32m✓[39m ignores an unregistered case id[32m 0[2mms[22m[39m
     [32m✓[39m opens Case 81 from a completed Case 77 run, carrying precedent, history, and the loop counter[32m 0[2mms[22m[39m
     [32m✓[39m carries Case 77 trust residue into Case 81 (the personas cross cases)[32m 0[2mms[22m[39m
     [32m✓[39m does not fold an incomplete current run into history and keeps the counter[32m 0[2mms[22m[39m
     [32m✓[39m never destroys Case 77 progress: START_CASE back to case-77 works symmetrically[32m 0[2mms[22m[39m
     [32m✓[39m plays a full Case 81 run through the shared engine to a verdict[32m 0[2mms[22m[39m
     [32m✓[39m gates Case 81 availability on a recorded Case 77 precedent[32m 0[2mms[22m[39m
     [32m✓[39m tags the forged seal-certification finding as fraud/systems with a warning event[32m 0[2mms[22m[39m
     [32m✓[39m tags a lawful Case 81 finding as procedure with a neutral event[32m 0[2mms[22m[39m
[31m     [31m×[31m gives Case 81 standing-deadlock a warning tone even when an anchor is corroborated[39m[32m 8[2mms[22m[39m
     [32m✓[39m doubles the alarm and swaps in the variant copy when Case 77 was overwritten[32m 1[2mms[22m[39m
     [32m✓[39m lands alarm 1 with today’s copy, byte-identical, without the precedent[32m 0[2mms[22m[39m
     [32m✓[39m commits a sworn deposition: resolves the site, records consent yes, tags care[32m 1[2mms[22m[39m
     [32m✓[39m cross entry answers no when asked; not asking records unasked[32m 1[2mms[22m[39m
     [32m✓[39m rejects a deposition whose beats or action do not match the authored skeleton[32m 0[2mms[22m[39m
     [32m✓[39m is a no-op for a case with no deposition block (Case 77)[32m 0[2mms[22m[39m
     [32m✓[39m plays a full strike-testimony run through the deposition to the fifth verdict[32m 0[2mms[22m[39m
     [32m✓[39m authenticate-chain: custody-chain evidence, registrar +2, no alarm or override[32m 1[2mms[22m[39m
     [32m✓[39m trace-checksum: checksum-drift evidence, registrar −1 / archivist +1, no alarm or override[32m 1[2mms[22m[39m
     [32m✓[39m walk-acoustic-shadow: sensor-omission evidence, defector +2, no alarm, no override[32m 1[2mms[22m[39m
     [32m✓[39m forge-authority: maintenance-override evidence, +1 alarm, tribunal override, defector +1 / registrar −1[32m 0[2mms[22m[39m
 [32m✓[39m src/game/content.test.ts [2m([22m[2m112 tests[22m[2m)[22m[32m 104[2mms[22m[39m
 [32m✓[39m src/game/room.test.ts [2m([22m[2m23 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [31m❯[39m src/game/ledger.test.ts [2m([22m[2m23 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 46[2mms[22m[39m
     [32m✓[39m ends on exactly the alarm the reducer holds, on every route[32m 3[2mms[22m[39m
     [32m✓[39m records a cost only at the moments that moved it, with before and after[32m 1[2mms[22m[39m
     [32m✓[39m reads the PRECEDENT-resolved delta, not the authored base[32m 1[2mms[22m[39m
     [32m✓[39m clamps at the ceiling the reducer clamps at[32m 0[2mms[22m[39m
     [32m✓[39m a fresh run states only what a fresh run supports[32m 0[2mms[22m[39m
     [32m✓[39m names each closed location and the exhibit it put on the record[32m 1[2mms[22m[39m
     [32m✓[39m reports the model by its authored title, or that none is on file[32m 1[2mms[22m[39m
[31m     [31m×[31m the threshold sentence can never disagree with canEnterTribunal[39m[32m 10[2mms[22m[39m
     [32m✓[39m counts contradictions with the right singular and plural[32m 1[2mms[22m[39m
     [32m✓[39m states a carried precedent only when one is carried[32m 1[2mms[22m[39m
     [32m✓[39m assembles sentences only — no fragment, no double space, curly quotes only[32m 1[2mms[22m[39m
     [32m✓[39m quotes claim and contradiction verbatim, for admitted exhibits only[32m 1[2mms[22m[39m
     [32m✓[39m holds nothing for a run that has admitted nothing[32m 0[2mms[22m[39m
     [32m✓[39m cannot surface an unadmitted exhibit, however the case authors it[32m 1[2mms[22m[39m
     [32m✓[39m a fresh run is one moment, no filings, nothing carried in[32m 1[2mms[22m[39m
     [32m✓[39m reads forwards, one moment per logged event, ascending[32m 1[2mms[22m[39m
     [32m✓[39m every index entry lands exactly once — in a moment or carried in[32m 1[2mms[22m[39m
     [32m✓[39m a filing moment carries its exhibit, its location and its contradiction pair[32m 3[2mms[22m[39m
     [32m✓[39m prints each presence once inside a moment — the name-count rule, per moment[32m 0[2mms[22m[39m
     [32m✓[39m carries a prior ruling in as its own entry, outside the run’s own log[32m 0[2mms[22m[39m
     [32m✓[39m is deterministic and never mutates the state it reads[32m 1[2mms[22m[39m
     [32m✓[39m reads the event’s own order, not its array position[32m 1[2mms[22m[39m
     [32m✓[39m no case-81 prose reaches a case-77 ledger, and no case-77 prose a case-81 one[32m 13[2mms[22m[39m
 [32m✓[39m src/ambience/audio.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m src/game/recordIndex.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 45[2mms[22m[39m
 [32m✓[39m src/game/acousticShadow.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/game/causal.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/game/custodyRail.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/game/siteRecordText.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/game/sceneLabels.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/game/sceneState.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/game/personaRecord.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/game/beats.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/components/SceneZone.commit.test.tsx [2m([22m[2m10 tests[22m[2m)[22m[32m 145[2mms[22m[39m
 [32m✓[39m src/components/PersonaPortrait.test.tsx [2m([22m[2m5 tests[22m[2m)[22m[32m 60[2mms[22m[39m
 [32m✓[39m src/game/fieldCta.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/scene/previewTreatment.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/scene/rainPresence.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/game/persistence.roundtrip.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m

[31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 2 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m src/game/engine.test.ts[2m > [22mauthored decision & reconstruction semantics (Case 81)[2m > [22mgives Case 81 standing-deadlock a warning tone even when an anchor is corroborated
[31m[1mAssertionError[22m: expected null to be 'standing-deadlock' // Object.is equality[39m

[32m- Expected:[39m
"standing-deadlock"

[31m+ Received:[39m
null

[36m [2m❯[22m src/game/engine.test.ts:[2m390:30[22m[39m
    [90m388|[39m     s [33m=[39m [34mgameReducer[39m(s[33m,[39m { type[33m:[39m [32m'SUBMIT_RECONSTRUCTION'[39m })
    [90m389|[39m
    [90m390|[39m     [34mexpect[39m(s[33m.[39mreconstruction)[33m.[39m[34mtoBe[39m([32m'standing-deadlock'[39m)
    [90m   |[39m                              [31m^[39m
    [90m391|[39m     [35mconst[39m event [33m=[39m s[33m.[39mevents[33m.[39m[34mat[39m([33m-[39m[34m1[39m)
    [90m392|[39m     [34mexpect[39m(event[33m?.[39mdetail)[33m.[39m[34mtoContain[39m([32m'1 of 2 anchors were corroborated'[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯[22m[39m

[41m[1m FAIL [22m[49m src/game/ledger.test.ts[2m > [22mbuildFindings — the clerk’s summary[2m > [22mthe threshold sentence can never disagree with canEnterTribunal
[31m[1mAssertionError[22m: expected [ false, false, false, false ] to deeply equal [ false, false, false, true ][39m

[32m- Expected[39m
[31m+ Received[39m

[2m  [[22m
[2m    false,[22m
[2m    false,[22m
[2m    false,[22m
[32m-   true,[39m
[31m+   false,[39m
[2m  ][22m

[36m [2m❯[22m src/game/ledger.test.ts:[2m172:42[22m[39m
    [90m170|[39m
    [90m171|[39m     // The walk must actually cross the gate, or this test proves noth…
    [90m172|[39m     expect(states.map(canEnterTribunal)).toEqual([false, false, false,…
    [90m   |[39m                                          [31m^[39m
    [90m173|[39m     [35mfor[39m ([35mconst[39m step [35mof[39m states) {
    [90m174|[39m       const line = buildFindings(step).find((finding) => finding.id ==…

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯[22m[39m


[2m Test Files [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m19 passed[39m[22m[90m (21)[39m
[2m      Tests [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m362 passed[39m[22m[90m (364)[39m
[2m   Start at [22m 16:31:24
[2m   Duration [22m 2.95s[2m (transform 1.45s, setup 0ms, import 3.00s, tests 608ms, environment 2.38s)[22m


::error file=/home/runner/work/the-annex/the-annex/src/game/engine.test.ts,title=src/game/engine.test.ts > authored decision & reconstruction semantics (Case 81) > gives Case 81 standing-deadlock a warning tone even when an anchor is corroborated,line=390,column=30::AssertionError: expected null to be 'standing-deadlock' // Object.is equality%0A%0A- Expected:%0A"standing-deadlock"%0A%0A+ Received:%0Anull%0A%0A ❯ src/game/engine.test.ts:390:30%0A%0A

::error file=/home/runner/work/the-annex/the-annex/src/game/ledger.test.ts,title=src/game/ledger.test.ts > buildFindings — the clerk’s summary > the threshold sentence can never disagree with canEnterTribunal,line=172,column=42::AssertionError: expected [ false, false, false, false ] to deeply equal [ false, false, false, true ]%0A%0A- Expected%0A+ Received%0A%0A  [%0A    false,%0A    false,%0A    false,%0A-   true,%0A+   false,%0A  ]%0A%0A ❯ src/game/ledger.test.ts:172:42%0A%0A
```

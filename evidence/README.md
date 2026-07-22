# Evidence packs

## True 3D scene depth

The authoritative suffix is **`true-3d-final`**. A depth capture is canonical
only when all of the following are true:

- its JSON is `depth-measurements-true-3d-final.json`;
- `metadata.authoritative` and `acceptance.passed` are both `true`;
- the capture was made after the application source was declared stable; and
- the JSON records the capture timestamp, app URL, viewport matrix, Chrome
  version, Git HEAD/dirty state, and the unchanged `motion.ts` rAF token count.

If that suffixed JSON is absent, the final depth acceptance is still pending.
Files carrying `before`, `after`, `pristine-*`, or any other suffix are useful
diagnostics, not release evidence.

Generate the authoritative pack against a running local app with:

```sh
node scripts/evidence-depth.mjs http://localhost:5199/ true-3d-final
```

The raw-CDP harness has no added runtime dependency. It exercises both cases at
1280×800 and 390×844 under three independent modes: normal motion, OS-level
`prefers-reduced-motion`, and the in-app Access → Reduce motion setting. The
selected evidence sites (`registry` and `counsel-office`) remain in the shared
diorama rather than swapping to generated close-read art.

The command exits non-zero if any acceptance invariant fails. The JSON retains
the complete measurements and failure list even on failure:

- fixed pointer swing is strictly `near > mid > far > background`, with pixel
  deltas for both cases and both viewports;
- in normal motion, all four art planes and all four hotspot-plane instances
  remain mutually compensated within 2 px even when the investigation's
  initially selected site has applied its authored focus scale; under both
  reduced-motion gates, all four art planes rest within 2 px of the frame;
- `.scene-pgroup` and `.scene-hgroup` use the same inline and computed transform,
  under active authored perspective and a `preserve-3d` chain;
- four hotspots per case (eight total per viewport) remain at least 44×44 px and
  within 2 px of a point projected through their authored art plane while focused;
- an authored figure is inside `.scene-pgroup` and remains within 2 px of its
  authored plane at rest and in focus; and
- both reduced-motion gates keep both projected groups at `transform: none`
  before and after selection while preserving the same rest geometry.

Normal-motion settled, focused, OS-reduced rest, and app-reduced rest screenshots
are emitted for each case and viewport. Pixel comparison to an approved visual
baseline remains a review step; the harness's 2 px geometry checks prove the
compensating depth scale, not perceptual image identity.

## Case 81 ambience (sweep, amber flicker, alarm atmosphere)

Captured 2026-07-20 against the dev server (`npm run dev -- --port 5199`) in headless
Chrome driven over raw CDP (`cdp.mjs`, no added dependencies). All alarm state was
reached in play; nothing was written to game state or storage by hand.

## (a) Clerestory light sweep moved

- `sweep-t0_20260720-225247.png` — sweep transform `translateX(90.3%)`
- `sweep-t35_20260720-225331.png` — sweep transform `translateX(223.4%)`
- 44 s apart (filenames are capture timestamps); +133.1% measured vs +132%
  expected at 360% per 120 s period. Driven from the single existing rAF in
  `src/scene/motion.ts` (`frame()`), period authored as
  `scene.ambience.sweepPeriodMs` in `src/game/cases/case81.ts`.

## (b) Alarm side-by-side (neutral scene state)

- `side-by-side_alarm0-vs-alarm2_neutral.png` — composed from
  `alarm0-neutral-final_20260720-231615.png` and
  `alarm2-neutral-final_20260720-231415.png`, both captured at the same sweep
  phase (88.1%) so the light band cannot confound the comparison.
- Alarm reached by play: Case 77 run filed the forge + one more site, filed a
  reconstruction, and took the `overwrite-record` verdict; Case 81 then filed
  "Forge the certification seal", which the precedent doubles to +2 alarm
  (civic trace "2 traces" visible in `reduced-motion-final_*.png`'s record
  panel; the gold filed hotspot marks the filing in the alarm-2 shot).
- Measured on the final build: `--alarm-haze-o` = 0 at alarm 0, 0.24 at alarm 2;
  upper-scene mean luminance +14%.
- **Content ceiling (finding):** alarm 3 is not reachable in current content.
  Case 81 has exactly one alarm-positive action (`forge-certification-seal`,
  +1 base, +2 with the Vale-forgery precedent) and each site files once, so the
  legitimate ceiling is alarm 2. Tier 3 (veil 0.38, 96 motes @ 10–23 px/s) is
  authored in the table and will engage if content ever reaches it; the tier-2
  shot above demonstrates the mechanism at the playable maximum.

## (c) Reduced motion — sweep and flicker frozen

- `reduced-motion-final_20260720-231754.png` — taken with the in-game Access →
  Reduce motion toggle on. Verified live: sweep parked at exactly
  `translateX(35%)` and unchanged 8 s later; `--amber-flicker` unset (strip at
  full state opacity); dust cleared. The alarm haze veil remains as a static
  treatment, per spec.

## (d) Single rAF preserved

- `grep -c requestAnimationFrame src/scene/motion.ts` = **3** before the diff
  (header comment + 2 call sites) and **3** after. No second loop, no CSS
  infinite animation.

## Gates

- `npm run lint` clean; `npm run test` 146/146 passed; `npm run build` clean
  (re-run after the final veil change).

## Notes

- Per-tier values (haze veil, maxParticles, fall-speed range) and the sweep
  period / amber dip depth live in `src/game/cases/case81.ts` (`scene.alarm`,
  `scene.ambience`) as absolute authored values; `motion.ts` holds none of them.
- Amber flicker dips are time-derived (three layered sinusoids thresholded at
  2.0 of 3.0 — simulated ≈0.57 dips/min, ≤2/min cap honored), never per-frame
  random.
- The two sweep shots predate the alarm-veil element (sweep code identical in
  both builds); all other shots are the final build.

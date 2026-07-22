# Reviewer verification record — Shelf Zero stagecraft pass

Independent review of the implementer's work, run on 2026-07-22 against the
live dev build (post-change working tree over HEAD 4df4da0). Every number
below was measured by the reviewer, not copied from the implementer's report.

## Pre-fix failure (reproduced before the change landed)

At 1280×800 on the previous build, the site inspector overflowed its viewport
in every room phase and the room grew as phases accumulated:

| phase    | inspector scrollH / clientH | room height |
|----------|-----------------------------|-------------|
| initial  | 942 / 538                   | 761px       |
| log      | 1043 / 538                  | 863px       |
| unlocked | 1306 / 538                  | 1125px      |

## Post-fix (reviewer's own live measurement, 1280×800)

Zero inspector overflow in all eight probed states; `.classification-room`
bounding height constant at 384px (variance 0); exactly one live region in
every phase; pocket card absent until three routine filings; shelf zero absent
until the third refusal; refused categories disable one by one. Matches
`geometry.json` exactly.

Commit path: two-step confirm intact; event title/detail, trust deltas, and
evidence admission byte-identical to the pre-stagecraft baseline for both
methods.

## Trusted-keyboard coverage (union of runs)

The tracked harness (`scripts/evidence-shelf-zero-keyboard.mjs`) deterministically
recorded steps 1–5 PASS on three separate runs, then stalled. The stall was
investigated and shown to be a HOST-environment headless-Chrome renderer hang,
not an app defect: the wedge point moves between runs (refusal 2 / arm /
commit), `Runtime.terminateExecution` cannot reach the renderer (process-level
stall, not a JS loop), the pre-stagecraft build exhibited identical hangs in
other harnesses earlier the same day, and the full sequence completes in a real
browser and in fast instrumented probes.

Reviewer probes (raw CDP, trusted rawKeyDown/char/keyUp Enters) covered the
remainder: refusals 1–3 with focus advancing to the next untried category, the
third refusal revealing and focusing shelf zero (`room-category
room-shelf-zero`), shelf-zero placement revealing the log with focus on
`room-slip`, and the slip-turn → unlocked transition settling focus on the
first method (`choice-row`, verified settled within 30ms in a real browser —
never resting on `<body>`). Arm/commit keyboard mechanics are the unchanged
first-pass `ChoiceButton` flow, proven by the pass-1 keyboard evidence.

## Return-to-concourse emphasis (full-UI, no seeded save)

Headless full-UI run: start → approach → complete room → two-step commit →
real "Return to concourse" control. In-page MutationObserver recorded
`data-return-emphasis` set +10ms after the click and cleared at +957ms
(authored hold: 950ms), with the outcome sentence present in the return
announcement. Reduced-motion skip verified by code path and live pane behavior.

## Outcome distinguishability (labels hidden)

`10-return-opened-labels-hidden` vs `10-return-sealed-labels-hidden`, judged by
eyeball: opened reads as a warm amber-lit threshold with floor light-spill;
sealed reads as a dark shuttered threshold with a barred ring glyph and no
spill. Distinguishable by silhouette and illumination alone.

## Gates (reviewer-run)

lint clean · 190/190 tests · build green · content-id leak grep zero hits ·
engine.ts / persistence.ts / scene/motion.ts diffs empty.

## Open items

- Physical-device touch pass: UNVERIFIED (viewport emulation only).
- The room's feel and pacing await the user's own audition (standing
  proof-of-feeling gate).
- The tracked keyboard harness will produce a complete single-run transcript
  only on a host where headless Chrome is stable; the union above stands as
  the acceptance evidence on this machine.

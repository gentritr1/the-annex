# Evidence pack — armed commit state (two-click arm → confirm)

Captured 2026-07-21 against the dev server (`npm run dev -- --port 5199`) in headless
Chrome driven over raw CDP (`armed-commit.mjs`, no added dependencies). Every
interaction is trusted input (`Input.dispatchMouseEvent` / `Input.dispatchKeyEvent`),
so arm/disarm/confirm travel the real pointerdown/keydown/click pipeline. The run is
one continuous playthrough from a fresh save (`localStorage.clear()` + reload);
nothing was written to game state or storage by hand. Full step-by-step log:
`transcript.txt` (47 PASS, 0 FAIL).

Reproduce: `npm run dev -- --port 5199`, then
`node evidence/armed-commit.mjs http://127.0.0.1:5199 evidence/armed-commit`
(exit 0 = all checks passed).

## (a) Armed vs unarmed — live computed styles, all three surfaces

`getComputedStyle` on the live elements (never the stylesheet), so the
`.site-inspector .site-actions .choice-row` and media-query grid overrides are
settled by measurement, not by reading the cascade:

| Surface | Dump pair | Armed transform (measured) |
|---|---|---|
| Field method (Registry intake) | `01-investigation-unarmed.json` / `02-investigation-armed.json` | title appends `— select again to file`; bg `rgba(0,0,0,0)` → `oklch(0.26 0.06 70)`; `box-shadow` gains `inset` amber frame + 3px leading bar; hint `…— final for this run`, weight 400 → 650, color fog-dim → amber-soft; sibling opacity 1 → 0.42 |
| Reconstruction commit | `07-reconstruction-unarmed.json` / `08-reconstruction-armed.json` | label `File reconstruction →` → `Confirm irreversible filing — select again to file ✓`; bg `oklch(0.72 0.14 70)` → `oklch(0.86 0.08 78)`; `inset 0 0 0 2px` night ring appears; footer warning color record → amber-soft |
| Tribunal finding | `11-tribunal-unarmed.json` / `12-tribunal-armed.json` | same row transform as the field surface (same measured values) |

Screenshots: `01-investigation-unarmed.png` / `02-investigation-armed.png`,
`04-reconstruction-armed.png`, `05-tribunal-armed.png`.

Two cascade findings from the measurement work, both fixed and now asserted:

- The amber armed frame is an **inset box-shadow, not an outline**, so it can
  never be overridden by (or override) the global `button:focus-visible` ring.
- The armed aside (`Confirm`, 7 monospace glyphs) was clipped by the tighter
  site-inspector grid (22px arrow column) and spilled in the tribunal grid
  (28px). The fix widens the aside column only while armed; the first attempt
  silently lost to the `.site-inspector` override at equal (0,3,0) specificity
  and was caught by measuring `gridTemplateColumns` on the live row. The
  runner now asserts `asideScrollWidth ≤ asideClientWidth` on armed rows
  (56px = 56px on both row surfaces).

## (b) Escape / outside-click / location-switch disarm, visibly and silently

Dumps `04`–`06` (field), `09`–`10` (lattice), `13`–`14` (tribunal): after each
gesture, no `.choice-row-armed` remains, computed bg/shadow/opacity return to
rest values on the live elements, and every commit-surface live region reads
empty (silent disarm). Location switching additionally remounts the method
list (keyed by site), verified by arming on B, switching B → C → B, and
finding zero armed rows.

Measurement caveat (documented by `../armed-commit-probe.mjs`): headless=new
does not reliably advance the CSS-transition clock between input events, so a
computed style can read a frozen transition start (hover fill, or the
disabled→enabled fill on the lattice commit) long after wall-clock duration.
The runner forces two real BeginFrames (`settleFrames`) before every
computed-style dump; the probe shows the same elements reading rest values
immediately after forced frames.

## (c) aria-live announces arming

Each commit surface carries a view-layer `role="status"` region (the engine
channel is untouched). Dumps capture the region text at arm time —
`"Authenticate the custody chain — select again to file."` (field),
`"Reconstruction filing — select again to file."` (lattice),
`"Certify Mara Vale as continuous — select again to file."` (tribunal) — and
empty at rest and after every disarm gesture, so each arm is a `'' → line`
change and re-arms re-announce.

## (d) Cold-eyes script — fresh save to first filed action

Script transcript (from `transcript.txt`), single clicks only; between clicks
the script reads nothing but what the UI displays:

1. click `Open a new audit` (title screen, fresh save)
2. click the first briefing approach (single click — reversible, not a commit)
3. click the first method at Registry intake → the row transforms and its
   label now reads `Authenticate the custody chain — select again to file`
   (screenshot `02`), sibling recedes, aside reads `Confirm`
4. click the same method again → `Filed` (screenshot `03`,
   `03-investigation-filed.json`)

No stall: the armed label is the instruction for the second click. The same
script then continues through the full game loop (second site, lattice,
tribunal, verdict) using only single clicks.

## Gates

- `npm run lint` clean; `npm run test` 148/148 passed; `npm run build` clean
  (re-run after the final aside-column change).

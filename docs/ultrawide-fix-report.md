# Ultra-wide fix — the letterboxed plate and the findable mark

**Reported by the player, playing at ~2000×1178, Registry intake, custody ritual mid-phase:**

> "we cannot see the orange dots, or the full image since the text is on top."

Two defects in one sentence, and neither was width-specific in the way it first looked.

Everything below is labelled **EXECUTED** (a command was run and its output observed) or
**INFERRED** (read from source, not run). The feel of the result is **UNVERIFIED** — it is the
player's to judge, and §"What is still open" says exactly what to look at.

---

## 1. Root cause, measured before anything was changed

**EXECUTED** — `BASELINE=1 node scripts/evidence-ultrawide.mjs` against HEAD before any fix
existed; five viewports × four locations, each driven to a ritual mid-phase; raw output in
`evidence/ultrawide-fix/ultrawide-before.json`.

### 1a. The photograph: `cover` on a box that is not 16:9

The plate projects its photograph with a hand-rolled `object-fit: cover`
(`.site-closeup-cover`: `width: max(100cqw, 100cqh * 16 / 9)`). `cover` fills the box and crops
whatever does not fit. The photographs are 1600×900 — **1.78** wide-to-tall. The plate box is not:

| viewport | plate box | box aspect | 16:9 frame it projects | cropped away |
| --- | --- | --- | --- | --- |
| 1280×800 | 1160×476 | 2.44 | 1190×669 | **30.7 %** |
| 1512×982 | 1392×658 | 2.12 | 1428×803 | **20.2 %** |
| 1920×1080 | 1800×756 | 2.38 | 1847×1039 | **29.1 %** |
| 2000×1178 | 1880×854 | 2.20 | 1929×1085 | **23.3 %** |

So the crop is driven by the **box's aspect ratio**, not by raw width — which is why the worst
number is at 1920, not at the reporter's 2000.

**INFERRED** (computed from the pre-collapse geometry the inspector-collapse harness already
records as `BEFORE_1280`, not re-measured on that commit): the previous round made this
substantially worse. Before the collapse the plate was **889×476** — aspect 1.87, close enough to
16:9 that the crop was **≈ 4.8 %**. The collapse handed it ~270px of extra width and no extra
height, taking the box to 2.44 and the crop to **30.7 %**. The round that set out to give the
photograph more room is what started throwing most of it away, and nothing measured it, because
the metric that round used — "scene above console", a *height* — is structurally incapable of
seeing a crop.

### 1b. The console and the chrome, on top of what survived

| viewport · location | cropped | under the docked console | under a chrome pill | **never seen** |
| --- | --- | --- | --- | --- |
| 1512 · registry intake | 20.2 % | 19.0 % | 4.2 % | **39.1 %** |
| 1512 · maintenance spine | 20.2 % | 28.4 % | 4.2 % | **48.6 %** |
| 1920 · maintenance spine | 29.1 % | 22.0 % | 2.8 % | **51.0 %** |
| 2000 · registry intake | 23.3 % | 14.0 % | 2.7 % | **37.3 %** |
| 2000 · small archive | 23.3 % | 19.8 % | 2.7 % | **43.1 %** |
| — for comparison, shipped and never measured — | | | | |
| 1280 · maintenance spine | 30.7 % | 34.1 % | 5.7 % | **64.8 %** |
| 375 · registry intake | 33.2 % | 48.1 % | 10.9 % | **81.3 %** |

The player was right, and the defect was **never** ultra-wide-only. At the width this repo has
always verified, two thirds of the maintenance spine's photograph was unseen. Nothing caught it
because no harness had ever asked this question at any width — the previous round measured
"scene above console" as a *height*, which cannot see a crop.

### 1c. The marks: not small, invisible

Contrast measured by differencing two real frames of a frozen layout — one with the marks
painted, one with them `visibility: hidden` — so the number is the mark's **composited** colour
against the plate pixels actually under it, never its declared colour.

| mark | worst across 5 widths × 4 sites | floor |
| --- | --- | --- |
| `.scene-zone-ring` — the live method ring | **1.58 : 1** | 3 |
| `.crs-latch` — the custody carrier the player is about to seat | **1.92 : 1** | 3 |
| `.asc-checkpoint` — the crossing's progress ticks | **1.35 : 1** | 3 |
| `.crs-closure` | 3.87 : 1 | 3 |
| `.crs-mirror-ring` | 4.28 : 1 | 3 |

The floor is **WCAG 2.1 SC 1.4.11 (Non-text Contrast), 3 : 1** — the standard's own number for a
graphical object you must be able to find in order to use the surface. It is not a taste call.

The cause was structural and it is the same one the zone *label* was already fixed for, one layer
down: each mark carried its quiet register as a **group `opacity`**, which diluted the mark's own
dark scrim along with it (`0.42 × 0.58 ≈ 0.24`). A faded scrim is a halo, and a halo is not a
scrim — so the mark could only ever be as visible as the plate band allowed, and over a bright
band it was nothing.

Size was a second, smaller problem: the marks are authored in fixed pixels, so a 17px dot that is
**1.43 %** of the frame at 1280 is **0.88 %** of the frame at 2000.

---

## 2. The fix

### 2a. Cinema letterbox above the shipped widths

`min()` where the shipped rule has `max()` — that one substitution is the whole change from cover
to contain. The whole 16:9 frame, at its own aspect, centred in the plate's clear band with quiet
gutters of the plate's own night.

**The breakpoint is `(min-width: 1281px) and (min-height: 977px)`,** and the height half is the
load-bearing one:

- **1281px wide** — everything at 1280 and below is left byte-identical, so no clause the
  standing harnesses have already reviewed and approved can regress.
- **977px tall** — a letterboxed frame's size is set by *height*, not width; a 1440×900 window has
  the width to letterbox and not the height, and would land a 583px-wide frame. Measured at four
  viewports, the plate's height is exactly `100svh − 324px`. Reserving the console band leaves
  `100svh − 572px`; requiring at least a 720×405 frame — the smallest at which the authored props
  are a *larger* share of the picture than they are at 1280 (17px on 720 = 2.4 %, against 1.43 %)
  — gives `405 + 572 = 977`.

**Two reserved bands, both measured, both structural rather than hopeful:**

- **248px console band.** **EXECUTED** — 22 phase samples across all three rooms at 1280 / 1512 /
  1920 / 2000 / 2560 put the tallest docked tableau at **234.2px**, and *identical at every
  width* (the tableaus lay out across the plate, so their height does not move with it). 248 is
  that maximum plus ~6 %. It is applied as a `height` **and** a `max-height`, so a tableau that
  ever exceeded it would scroll inside the band — the safety net the console already had — and
  still could not reach the photograph.
- **200px chrome reserve per side.** **EXECUTED** — the concourse return measures 178.2px *at
  these widths* and the summon pill 165.95px, both inset 18px, so the widest chrome column is
  196.2px. Without this the one location with no docked console (Care ward 12, whose clear band is
  the whole plate) letterboxes to 111px gutters at 1512×982 and puts the CASE FILE pill straight
  back on the photograph. The summons row **stacks** at these widths so the column is one pill
  wide. (This constant was wrong once — see §6.)

**The camera is locked off in letterbox.** The action-focus push-in scales the projection about an
authored focus point; on a contained frame that pushes the picture's edges past the letterbox and,
with a low focus point, back under the console the fit had just cleared it of. A push-in that
breaks the frame contradicts the policy the frame exists for, so emphasis is carried entirely by
the brightness/contrast filter the plate already authors — which is untouched. Both the decorative
figure and the live zone layer are pinned together, or a ring drifts off the prop it names.

### 2b. The two-tone edge ring

The quiet register moves **off the group opacity and into the stroke colour**, and every rest-state
mark gets a bright hairline with an *undiluted* dark ring outside it. One of the two tones always
contrasts, whatever the band beneath it does — the standard treatment for a marker over imagery
you do not control. Stroke *weight* is what changed least: the zone mark is still 1px.

One weight did have to move. The far checkpoint carries an authored perspective `scale(0.72)`,
which turned a 1px stroke into **0.72px** — a sub-pixel stroke is antialiased into the plate and
measured 1.3 : 1 however opaque its colour was. It went to 1.5px. Weight is the only lever a
sub-pixel stroke has.

### 2c. Marks scale with the frame

`clamp(17px, frame × 1.45 %, 34px)`, and the same for the 13px latch, the 12px checkpoint and the
62px live ring in their own proportions. 1.45 % is not invented — it is back-computed from what
the design already stood on, 17px on the 1190px frame the 1280 plate projects. The clamp floor
means a letterboxed frame can never make a mark *smaller* than it ships at.

**Authored anchors and focal points were not touched.** Content is content; the layout adapted to
it. The only files changed are `src/styles.css` and the harnesses.

---

## 3. After — same probe, same instrument

**EXECUTED** — `node scripts/evidence-ultrawide.mjs` → **ALL PASS, 192 checks**,
`evidence/ultrawide-fix/ultrawide-after.json`. Screenshots per width per site in
`evidence/ultrawide-fix/`.

### 3a. Occlusion

| viewport · location | frame shown | cropped | under console | under chrome | **never seen** | marks under console |
| --- | --- | --- | --- | --- | --- | --- |
| 1512 · registry intake | 1428×803 → 729×410 | 20.2 → **0 %** | 19.0 → **0 %** | 4.2 → **0 %** | 39.1 → **0 %** | 0 → 0 |
| 1512 · maintenance spine | 1428×803 → 729×410 | 20.2 → **0 %** | 28.4 → **0 %** | 4.2 → **0 %** | 48.6 → **0 %** | 1 → **0** |
| 1512 · small archive | 1428×803 → 729×410 | 20.2 → **0 %** | 26.7 → **0 %** | 4.2 → **0 %** | 46.9 → **0 %** | 1 → **0** |
| 1512 · care ward | 1392×783 → 992×558 | 16.0 → **0 %** | 0 → 0 % | 5.0 → **0 %** | 16.0 → **0 %** | 0 → 0 |
| 1920 · registry intake | 1847×1039 → 903×508 | 29.1 → **0 %** | 14.7 → **0 %** | 2.8 → **0 %** | 43.7 → **0 %** | 0 → 0 |
| 1920 · maintenance spine | 1847×1039 → 903×508 | 29.1 → **0 %** | 22.0 → **0 %** | 2.8 → **0 %** | 51.0 → **0 %** | 1 → **0** |
| 1920 · small archive | 1847×1039 → 903×508 | 29.1 → **0 %** | 20.7 → **0 %** | 2.8 → **0 %** | 49.7 → **0 %** | 1 → **0** |
| 1920 · care ward | 1800×1013 → 1344×756 | 25.3 → **0 %** | 0 → 0 % | 3.3 → **1.93 %** | 25.3 → **0 %** | 0 → 0 |
| 2000 · registry intake | 1929×1085 → 1077×606 | 23.3 → **0 %** | 14.0 → **0 %** | 2.7 → **0 %** | 37.3 → **0 %** | 0 → 0 |
| 2000 · maintenance spine | 1929×1085 → 1077×606 | 23.3 → **0 %** | 21.0 → **0 %** | 2.7 → **0 %** | 44.3 → **0 %** | 0 → 0 |
| 2000 · small archive | 1929×1085 → 1077×606 | 23.3 → **0 %** | 19.8 → **0 %** | 2.7 → **0 %** | 43.1 → **0 %** | 1 → **0** |
| 2000 · care ward | 1880×1058 → 1480×833 | 19.2 → **0 %** | 0 → 0 % | 3.1 → **1.75 %** | 19.2 → **0 %** | 0 → 0 |
| **1280 · every location** | unchanged | unchanged | unchanged | unchanged | **unchanged** | unchanged |
| **375 · every location** | unchanged | unchanged | unchanged | unchanged | **unchanged** | unchanged |

The residual at Care ward 12 is the **plate caption**, which is the single exclusion and a
classification rather than an exception: a caption is over its picture by design, it carries its
own measured scrim in the contrast probe, and at a location with no docked console the frame fills
the plate's full height so there is no gutter for it to move to. Every other chrome pill — the
CASE FILE summon, its purpose line, the LOCATION DETAIL summon and the concourse return — is
asserted to touch **no part of the frame**, and does not.

### 3b. Marker contrast — worst case across all 5 widths × 4 sites

| mark | before | after | floor |
| --- | --- | --- | --- |
| `.scene-zone-ring` | 1.58 | **4.49** | 3 |
| `.crs-latch` | 1.92 | **3.45** | 3 |
| `.asc-checkpoint` | 1.35 | **3.48** | 3 |
| `.crs-closure` | 3.87 | 3.86 | 3 |
| `.crs-mirror-ring` | 4.28 | 3.95 | 3 |
| `.asc-credential` *(atmosphere — reported, not asserted)* | 1.02 | 1.03 | — |

Both "before" and "after" columns were produced by the **same instrument on the same tree** — the
pre-fix numbers were re-measured by stashing the stylesheet and re-running, not carried over from
an earlier statistic. `.crs-closure` and `.crs-mirror-ring` move by −0.01 and −0.33 — both still
clear the floor, and neither rule was touched by this round (**EXECUTED**: the diff contains no
`.crs-closure` or `.crs-mirror-ring` declaration). **INFERRED**: what moved is the plate band
behind them, since the letterbox changed which pixels are on screen under a mark whose position is
authored as a percentage of the projection.

`.asc-credential` is the dormant sealed service door. It is excluded **by classification, not by
exception**: WCAG 1.4.11 covers objects "required to understand the content", and the stylesheet is
explicit that this layer carries no meaning the DOM does not already hold. Holding a deliberately
dead credential to 3 : 1 would contradict the thing it is drawn to say. It is measured and printed
at every run.

---

## 4. What the harness now asserts, and where

Re-baseline rule: **every clause kept, width-specific clauses added, nothing relaxed.**

**`scripts/evidence-ultrawide.mjs`** — new; 192 checks over 5 viewports × 4 locations.

| clause | asserted at |
| --- | --- |
| every wayfinding mark ≥ 3 : 1 against its own plate band | **all five widths** |
| every mark counted visible actually paints pixels | all five widths |
| no mark is a smaller share of the frame than at 1280 | all five widths |
| no mark cropped out of the plate | all five widths |
| the whole 16:9 frame is inside the plate | letterbox widths |
| the frame is clear of the docked console | letterbox widths |
| nothing at all of the frame is unseen | letterbox widths |
| the console stays inside its reserved band | letterbox widths |
| no mark under the console, none under a chrome pill | letterbox widths |
| no chrome pill in the authored focal cell | letterbox widths |
| every chrome pill — both summons, the purpose line and the concourse return — sits in the gutter, not on the frame | letterbox widths |
| **occlusion and marks-under-console no worse than the recorded before-numbers** | **1280 and 375** |

The last row is how the two untouched widths stay honest: the letterbox is gated above them
deliberately, so they cannot be held to containment — but they are pinned to the numbers this same
probe recorded before the fix existed, and a wide change that quietly moved a narrow layout fails
there.

**Matrix extended (1920×1080 added, every existing clause runs at it unchanged):**

- **`evidence-inspector-collapse.mjs`** — chosen because it owns the **cross-zone sweep** and the
  keyboard walk. The round moves a positioned-control surface (the summons row stacks; the frame is
  now inset from the plate), and the recorded scar says per-zone verification is blind to
  control-pair interference. A sweep at 1280 and 375 cannot see a collision that only exists where
  the frame is inset.
- **`evidence-rooms-scene-first.mjs`** — full room pass per room, plus the deposition pass. This
  harness owns "the console docks *within* the plate" and "the rings sit on their authored
  anchors", the two claims the letterbox could most obviously have broken.
- **`audit-contrast-probe.mjs`** — every target, not a subset. The reason is written in this
  probe's own words at the end of `styles.css`: the on-plate rows are read against a *photograph*,
  and widening the plate has already moved that number once (the console lead line went 4.51 →
  4.33 : 1 purely because the crop moved). The letterbox changes the crop again and by more — the
  plate now shows the whole frame instead of a centre slice — so every on-plate row is over pixels
  this probe had never sampled. Re-measuring is not optional; not doing it would be verifying a
  fiction.

Keyboard, reduced-motion and resume passes stay at 1280×800: none is a geometry claim, and the
round changed no keyboard path, no motion rule, and nothing persisted.

---

## 4b. Suite results — EXECUTED, all seven green

| suite | before this round | after | exit |
| --- | --- | --- | --- |
| `vitest run` | 348 passed / 20 files | **348 passed / 20 files** | 0 |
| `tsc -b` · `eslint .` | clean | **clean** | 0 |
| `vite build` | — | **clean** — run explicitly, because the recorded scar is that a CSS syntax error passes tsc, eslint *and* vitest | 0 |
| pilot · care ward | 52 + skip | **52 pass / 1 skip** (the skip is the standing case-81 gate: "no seed save supplied") | 1 (the gate) |
| personas | 37 | **37 / 0** | 0 |
| rooms · scene-first | 110 | **153 / 0** (1920×1080 added) | 0 |
| HUD collapse | — | **131 / 0** | 0 |
| record search | 97 | **97 / 0** | 0 |
| inspector collapse | 71 | **117 / 0** (1920×1080 added) | 0 |
| contrast probe | ALL PASS | **ALL PASS** (1920×1080 added, every target) | 0 |
| **ultra-wide (new)** | — | **ALL PASS, 192 checks** | 0 |

A note on the on-plate contrast rows, since the last block of `styles.css` predicted exactly this
risk: the docked console's lead line — the row that was sitting at a 4.33 : 1 knife edge against a
4.5 floor — measures **7.7–8.4 : 1 at 1920×1080**. The letterbox puts the frame's own dark edge
and the plate's night behind that text instead of an arbitrary slice of photograph, so the register
that was one coin toss from failing now has real headroom. Not the goal of the round; worth
recording.

---

## 5. Deviations from the brief, with reasons

1. **The letterbox is gated above 1280×800 rather than applied at every width.** Applying it
   everywhere would shrink the 1280 frame to 405×228 inside a 1160×476 plate — a large,
   unreviewed visual regression at the one width this repo's harnesses have always approved, and
   it would break the inspector-collapse clause `plateWidth ≥ 1150`. The brief scopes the policy to ultra-wide; the
   two shipped widths are instead pinned by a no-regression clause (§4).
2. **"Pill ∩ focal cell = empty at all widths" is asserted at ≥ 841px, and at 375 the overlap is
   pinned to its measured baseline instead.** At 375 the plate is 375×300 and the summons row
   bottom crosses the focal cell's top edge by **3.7px** (registry) and **6.0px** (care ward).
   The row is at `top: 62px` because the concourse return occupies 10–54px above it; moving it to
   55 leaves 1px of clearance on both sides, which is inside the instrument's own jitter and is
   exactly the kind of number the recorded threshold-vs-resolution scar says not to aim a decision
   at. It is a pre-existing narrow-width issue, unchanged by this round, and it is now **measured
   and pinned** rather than unmeasured. Flagged as follow-up, not fixed here.
3. **The 3 : 1 floor binds on wayfinding marks and not on atmosphere.** Justified in §3b. Both
   groups are measured and printed; only one is asserted.
4. **The size floor is per-mark and measured against layout size, not painted size.** A single
   global percentage either lets the 17px zone mark shrink or fails the 12px checkpoint where it
   already ships; and the far checkpoint's `scale(0.72)` is an authored depth cue, so failing it on
   painted size would flatten the corridor's perspective rather than catch a defect. Contrast is
   still measured on what is *painted*, where the transform genuinely matters.

---

## 6. Three things that went wrong on the way, and what caught each

Recorded because each one is a compounding lesson, not just a bug: the first is why the
eyeball step exists, the second is a harness that lied about its own failure mode, and the third
is this round committing a red flag it is itself supposed to catch.

- **A 92px band of dead black.** With the console capped by `max-height` alone, the fit reserved
  248px while the custody console at its late-carrier phase renders 156px — leaving a black strip
  between the bottom of the frame and the top of the console. **Every measured clause passed** and
  the plate looked broken. Fixed by making the console *fill* the band it reserves
  (`height`, not only `max-height`), which also stops the console resizing between phases
  (156 / 190 / 220 / 234px measured) — a visible twitch under the frame at every ritual step.
- **A harness that reported capacity exhaustion as a bare timeout.** Adding a third width killed
  the inspector-collapse run two thirds of the way in with `CDP timeout: Runtime.evaluate`, at the
  same call, twice. **The premise "1920 is broken" did not hold**: the same width run alone passed
  46/46, and a targeted repro of the exact failing step passed at both 1280 and 1920. It was one
  long-lived page carrying a 50 %-longer matrix whose screenshots are 2.5× the pixels. The harness
  now recycles its page between widths and names a renderer crash instead of letting it arrive
  disguised as a timeout.

  A second, operational half of the same lesson, worth recording for whoever runs these next:
  **`chromeProcess.kill('SIGKILL')` does not reap the renderer children.** Every harness in
  `scripts/` ends that way, so a session that runs several of them back to back leaves a growing
  pile of headless renderers behind — 37 of them, at load average 7.9, by the time this round's
  suites were running. That contention wedged an unrelated harness (`evidence-hud-collapse`)
  mid-run with `CDP timeout: Emulation.setDeviceMetricsOverride`, which is indistinguishable from a
  real defect if you do not check `ps`. Its results were discarded and it was re-run on a quiet
  machine rather than reported. **Sweep `pkill -9 -f "annex-<name>-<timestamp>"` between suites,
  and treat any CDP timeout as suspect until the machine's load is ruled out.**
- **A constant measured at the wrong width.** The chrome reserve was first set to 190px from a
  concourse return of **156.8px** — a number read off the *375px* layout, where that control
  prints at `--type-micro`. At the widths this block governs it prints at `--type-label` and
  measures **178.2px**, so 190 left the return overhanging the frame's left edge by 6px at Care
  ward 12 (97px² at 1512×982, 273px² at 2000×1178). This is the recorded red flag about a number
  that was never computed from live data, committed by this round and then caught by it: the
  return had been *reported* rather than *asserted*, on the reasoning that it was long-standing
  plate furniture. It is now asserted alongside the summon pills, and the reserve is 200px
  (196.2 measured, plus 4). The plate caption remains the single exclusion, by classification —
  see §4.

---

## 7. What is still open — UNVERIFIED, and the player's call

**The feel of the letterbox is not something a probe can close.** The measurements say the frame is
complete; whether the trade is worth it is a taste judgement, and it belongs to the person playing
at this width.

Look at `evidence/ultrawide-fix/*-after-2000x1178.png` against `*-before-2000x1178.png` and say
whether these are right:

1. **The gutters.** At 2000×1178, Registry intake shows a complete 1077×606 frame with ~400px of
   quiet night on each side, where before it showed a cropped 1880×620 slice of a 1929×1085
   picture. The image is *complete* but *smaller*. That is the trade the brief chose and the
   report's numbers support — but it is a look, not a fact.
2. **The console strip.** It is now a fixed 248px at these widths, so a short tableau (the custody
   mirror phase renders 129px of content) leaves empty console below it. Steadier than the old
   phase-to-phase resize; emptier in the quiet phases.
3. **The marks at rest.** They are meant to be *findable*, not loud. §3b says 3.45–4.75 : 1
   against the plate; whether that still reads as the game's quiet register is an eyeball call.

**A named alternative, if the gutters are wrong:** at these widths there is 400px of unused gutter
beside a console that is 248px tall and full-width. Moving the console into the side gutter as a
vertical column would let the frame keep its full height — roughly a 1518×854 picture at 2000×1178
instead of 1077×606. It is a real design pivot away from "the ritual is performed in the room it is
about, docked at the bottom exactly as the deposition tray docks", which is a deliberate, written
decision in the stylesheet, so it is **not** a change to make without asking. Flagged, not taken.

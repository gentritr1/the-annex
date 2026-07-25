# Design-gap audit — 2026-07-25

**Trigger.** The completed scene-first redesign was auditioned and ruled: *"good in a way — but the TEXT IS TOO DOMINANT, the AMBIENCE IS BARELY SEEN; make things more readable; find the gaps that keep this UX from being great in terms of UNDERSTANDING THE GAME."*

**Method.** The live Vite app was driven at 1280×800 and 375×812 in headless Chrome over raw CDP, not read from stills. Nine surfaces per viewport: concourse, close-read with a docked console, terminal zones, staged beat, result strip, case-file drawer, tribunal, debrief, memory lattice. Every computed read was taken with transitions **and** animations disabled and two frames allowed to pass (the recorded transition-clock scar); every interaction used `el.click()`.

Harnesses written for this pass:

| script | what it measures |
|---|---|
| `scripts/audit-design-gap.mjs` | glyph-area fraction (union of every visible text node's line boxes), text-block fraction, distinct font sizes and size/weight/case pairs actually on screen, plate share of the viewport, and the share of the plate covered by docked chrome |
| `scripts/audit-contrast-probe.mjs` | **composited** WCAG contrast: it hides the glyphs (not the element), paints a swatch of every text colour so an `oklch()` value is resolved to sRGB *by the renderer* rather than by string maths (recorded oklch scar), screenshots, and reports the worst pixel in each glyph box — with an occlusion filter so covered text is not measured |

Artefacts: `evidence/design-gap-fix/` — `measurements-before.json`, `measurements-after.json`, `contrast-probe-before.json`, `contrast-probe.json`, and before/after PNG pairs for all nine surfaces at both viewports.

---

## 1. What the measurements found

### Text dominance — the number is *variety*, not volume

Glyph area was never the problem. The concourse spends 7.7% of a 1280×800 viewport on glyphs; the debrief, which the user liked, spends 11.8%. **More** ink, and it reads as calmer.

The difference is hierarchy, and it measured cleanly:

| screen (1280×800, before) | distinct font sizes on screen | size/weight/case combinations | largest text | size range |
|---|---|---|---|---|
| concourse | 13 | 23 | 16.32px | **1.76 : 1** |
| close-read + console | 15 | 26 | 16.32px | 1.76 : 1 |
| terminal zones | 15 | 27 | 16.32px | 1.76 : 1 |
| case-file drawer | 17 | 31 | 16.32px | 1.76 : 1 |
| **debrief** | 14 | **16** | **57.6px** | **6.2 : 1** |

On the concourse, 44% of all glyph area sat at a single size — 11.52px — in three different weights (400, 600, 650-caps-mono). Nothing on that screen was ever the biggest thing. With no anchor to triage against, the eye has to read everything, so everything reads as dominant. The debrief and tribunal — the two screens the player sees *once* — are the only ones with a real display step, and they are the two the user did not complain about.

Underneath that, the stylesheet carried **58 distinct `font-size` values in 283 declarations**, 47 of them crowded between 0.55rem and 1.05rem. The clearest symptom: the choice row's three slots were re-authored per surface —

| slot | sizes found, one per surface |
|---|---|
| `.choice-body strong` (title) | 0.78 · 0.79 · 0.82 · 0.85 · 0.88 · 0.90 · 0.98 rem |
| `.choice-body > span` (body) | 0.71 · 0.72 · 0.73 · 0.74 · 0.78 · 0.86 rem |
| `.choice-body small` (cost) | 0.64 · 0.65 · 0.66 · 0.69 · 0.70 · 0.75 rem |

— so the same kind of sentence changed size as the player walked between locations, and size stopped meaning anything. This is the database's `Typography / Font Size Scale` anti-pattern ("random font sizes / arbitrary sizes") at full strength.

Caps-mono system labels were set at **650–750 weight** — a heading weight on a label. On the concourse that was 8,266px² of ink, the second-largest block on the screen behind the body copy the labels only existed to introduce.

### Ambience visibility — the chrome is opaque exactly where the scene is

| surface (before) | plate share of viewport | plate covered by docked chrome |
|---|---|---|
| concourse @1280 | 35.9% | 5.6% |
| close-read @1280 | 35.9% | **46.0%** |
| terminal zones @1280 | 35.9% | **58.6%** |
| close-read @375 | 37.0% | **81.3%** |

The docked room console's fill was `oklch(0.1 0.008 240 / 0.82 → 0.97)` with `blur(6px)`. The comment above that rule already stated the intent — *"The console is a console, not a lid: the plate it is docked over has to stay readable above it"* — and the numbers did not carry it. At 0.97 alpha the room the player is standing in is sealed off by the control panel for it.

Three suppressions stacked on the same photograph: the plate art at `brightness(0.84) saturate(0.92)`, then a `0.55`-alpha vignette, then the console. Beside it, a `434×546` inspector on a **solid** `oklch(0.16)` fill that measured ~85% empty in close-read, and a full-width `oklch(0.16)` dock bar, both sitting on one flat `--night-soft` field. Roughly 47.5% of the 1280 viewport was opaque, text-bearing slab.

### Comprehension — and one real accessibility defect

Measured on the **pre-pass** build (`contrast-probe-before.json`): the plate caption fails WCAG AA against the concourse's amber light pool — **4.30:1 at 1280 and 2.75:1 at 375** against a 4.5:1 floor. A `text-shadow` halo was carrying the whole job. A halo is not a scrim, and this scene is authored to have bright passages.

The 2026-07-19 critique's heuristic #10 (*Help and documentation*, scored 2/10) is the one that has **not** moved. Its "Jordan, first-time narrative player" red flag still stands: the counters read `0 / 2 · SITES` and `Needed · MODEL`, which name a state without naming a purpose; nothing on the concourse says why the case file is worth opening, what a "reconstruction" is for, or what the stance words commit you to.

---

## 2. Ranked findings

Severity: **P1** blocks the user's stated complaint · **P2** materially degrades it · **P3** polish.
Effort: **S** ≤ ½ day · **M** 1–2 days · **L** > 2 days.

### P1-A — No type hierarchy on the surfaces the player actually lives in · S · **DONE**
The investigation screens had a 1.76:1 total size range across 23–27 combinations, with 44% of glyph area at one size in three weights. **Fix:** an eight-step documented scale in `:root`, roles not sizes, with the whole working band snapped onto it and a display anchor restored to the surface heading.
*Evidence:* `01-concourse-1280x800-{before,after}.png`; sizes 13 → 7, pairs 23 → 18.

### P1-B — The docked console seals off the room it is a console for · S · **DONE**
`0.82→0.97` alpha over 46–81% of the plate. **Fix:** `0.60→0.86` with `blur(14px) saturate(1.06)`; the high-contrast and forced-colors overrides already force an opaque fill and are untouched.
*Evidence:* `03-zones-1280x800-{before,after}.png` — the amber pool is visible through the console in the after frame.

### P1-C — Plate caption fails WCAG AA over the scene · S · **DONE**
4.30:1 and 2.75:1 pre-pass, from relying on `text-shadow`. **Fix:** the gradient scrim the tribunal and debrief heroes already use, sized so its strong band sits *under* the caption row.
*Evidence:* `contrast-probe-before.json` (2 failures) → `contrast-probe.json` (0 failures, worst now 7.74:1).

### P1-D — The inspector column is ~85% empty in close-read and the plate pays for it · M · **PARTLY DONE / rest PROPOSED**
Measured in close-read at 1280: inspector `434×546` carrying two sentences and ~450px of nothing, while the plate was squeezed to a `792×210` letterbox strip.
*Done (CSS proportion only, nothing moved):* workspace ratio `1.55fr / minmax(330px, 0.85fr)` → `1.92fr / minmax(316px, 0.74fr)`, page padding trimmed. Plate 35.9% → 41.3% of the viewport.
*PROPOSED (structural — not built):* when a room console is docked, the inspector has no job left; collapse it to a narrow spine (index chip + heading + the record paragraph) and let the plate take the full width, or move the record text into the console's own header. This is the single largest remaining ambience win at 1280 and it is a layout decision, not a style one.

### P1-E — The site name is on screen three times · S · **PROPOSED**
The concourse paints A/B/C/D rings on the plate, repeats all four names in the switcher strip below it, and repeats the current one again in the inspector header. At 375 that strip is a 140px 2×2 grid sitting directly under the plate — the largest single steal of scene height on a phone.
*Sketch:* the plate rings already carry the letters; the strip only needs the **unvisited** ones, or it collapses to a single-row segmented control. Removing a nav is structural; not built.

### P2-A — Caps-mono labels set at heading weight · S · **DONE**
650–750 weight caps-mono competing with the content it labels. **Fix:** `--label-weight: 500` and `--label-tracking: 0.06em` on the shared label primitive, label line-height 1.4 → 1.3. **Colour is unchanged, so no contrast ratio moved.** Note the honest limit: the glyph-area metric measures line boxes, so it cannot see a weight reduction — this one is an eyeball claim backed by the screenshot pair, not by a number.

### P2-B — The scene is dimmed three times over · S · **DONE**
Plate art `brightness(0.84) contrast(1.07) saturate(0.92)` → `brightness(0.93) contrast(1.05) saturate(0.99)`; vignette default alpha `0.55` → `0.42`.

### P2-C — Solid slabs where glass would do · S · **DONE**
`.site-inspector` and `.field-dock` moved from opaque `--concrete` to `oklch(0.16 0.012 240 / 0.72–0.74)` with `blur(12px) saturate(1.04)`, over a `.scene-column` that is now a night → night-soft gradient instead of one flat fill. Honest caveat: there is no scene art behind these panels, so this reads as depth, not as ambience. The real win here is P1-D.

### P2-D — The smallest text in the game sits on the photograph · S · **DONE**
`.site-closeup-zone-label` was 9.92px at 750 weight over a 0.58 scrim. **Fix:** the label step (11.2px / 10.72px at 375), weight 600, padding `3px 5px` → `4px 7px`, scrim `0.58` → `0.88`.

### P2-E — The mobile console covers 82% of the plate · M · **PROPOSED**
Translucency (P1-B) is now doing real work here, but the geometry is unchanged: 81.6% of a 300px plate. The plate's own `min-height` is deliberately fixed at 375 (a taller plate re-opens the authored zone-anchor crop — see the measured note at `.world-pane`), so this cannot be solved by growing the plate. It needs the console to become a *sheet with a peek state* — docked at ~45% with a drag/tap to full height — which is new interaction, not styling.

### P2-F — Comprehension: state is named, purpose is not · M · **PROPOSED**
`0 / 2 · SITES` and `Needed · MODEL` are the only standing orientation. A first-timer can read every control and still miss the campaign model — the critique's heuristic #10 (2/10), unchanged since 2026-07-19.
*Sketch, in the game's own voice, one line each at the moment it becomes true, not a tutorial:*
- first arrival at the concourse — *"Two locations reach the tribunal. Which two is the first thing you decide."*
- first evidence admitted — the case-file summon says once, in place of its counts: *"Your record starts here."*
- reconstruction unlocked — replace `Needed · MODEL` with *"The tribunal will not hear findings without a model of what happened."*
- first stance offered — one clause under each stance naming what it costs, not what it is.
This is authored copy on existing surfaces and belongs to the writer, not to a CSS pass. Not built.

### P3-A — The display band is still unconsolidated · S · **PROPOSED**
Ten values above 1.5rem — 1.8 / 1.85 / 2 / 2.2 / 2.4 / 2.45 / 2.7 / 3.25 / 4 / 5.6rem — remain authored per surface. They currently *do* read as hierarchy (the debrief's 6.2:1 range is the best on any screen), so collapsing them is taste-bearing and wants an eyeball, not a script. Deliberately no `--type-hero` token was invented: a token nobody can point at a screen for is a lie.

### P3-B — Copy length on UI chrome · S · **NOT DONE, deliberately**
`DRAG TO LOOK · SELECT A THRESHOLD` and similar plate captions are candidates for a trim, but they are authored strings living in `src/game/cases/`, which this pass treats as off limits. Flagged for the writer.

### P3-C — `1 ADMITTED SIGNALS` · S · **PROPOSED**
Number agreement on the tribunal's admitted-signal line. Content-adjacent; one-line fix wherever that string is composed.

---

## 3. What was implemented

All changes are CSS in `src/styles.css`. **No reducer, no persistence, no narrative content, no component markup, and no new class names** (`git diff` introduces zero new selectors — every `+.foo` line is an existing class joining a consolidated group).

### Authored values changed — old → new, absolute

**New tokens (`:root`)**

| token | value | role |
|---|---|---|
| `--type-micro` | `0.64rem` (10.24px) | codes, timecodes, state stamps · caps-mono only |
| `--type-label` | `0.7rem` (11.2px) | system labels, chips, plate captions · caps-mono only |
| `--type-meta` | `0.76rem` (12.16px) | the line under a title; costs; counters |
| `--type-body` | `0.82rem` (13.12px) | record body inside a panel |
| `--type-read` | `0.88rem` (14.08px) | narrative meant to be read, not scanned |
| `--type-title` | `1.05rem` (16.8px) | panel and card titles |
| `--type-scene` | `1.4rem` (22.4px) | the one heading naming the surface in view |
| `--label-weight` | `500` | was 650–750 across the label primitives |
| `--label-tracking` | `0.06em` | was 0.04–0.055em |

A `@media (max-width: 700px)` block steps the whole band down one notch (`0.62 / 0.67 / 0.73 / 0.79 / 0.85 / 1 / 1.28rem`). This is not cosmetic: consolidating the sizes collapsed the narrow layout's scattered per-selector shrinks and put ~12% more glyph area on a 375px screen than it had before. The band carries the density now, in one place. Display sizes are not stepped — on a small screen the hero *is* the hierarchy.

**Type applications**

| selector | before | after |
|---|---|---|
| `.choice-body strong` | `0.98rem` | `var(--type-title)` |
| `.choice-body > span` | `0.86rem` | `var(--type-read)` |
| `.choice-body small` | `0.75rem` | `var(--type-meta)` |
| `{.site-inspector, .deposition-choices, .classification-room, .custody-rail-room, .acoustic-shadow-room, .scene-zone} .choice-body strong` | `0.90 / 0.85 / 0.82 / 0.79 / 0.78 / 0.88rem` (six rules) | `var(--type-body)`, one rule |
| …` .choice-body > span` | `0.78 / 0.73 / 0.78 / 0.72 / 0.71 / 0.74rem` | `var(--type-meta)`, one rule |
| …` .choice-body small` | `0.69 / 0.66 / 0.70 / 0.65 / 0.64 / 0.70rem` | `var(--type-label)`, one rule |
| `.site-header h2` | `1.02rem` | `var(--type-scene)` + `letter-spacing: -0.02em`, line-height `1.2` → `1.16` |
| `.site-description` | `0.8rem` / lh `1.5` | `var(--type-read)` / lh `1.55` |
| `.field-dock-copy > p` | `0.74rem` / lh `1.4` | `var(--type-meta)` / lh `1.45` |
| `.field-threshold` | `0.72rem` | `var(--type-meta)` |
| `.section-heading p` | `0.91rem` | `var(--type-read)` |
| `.section-context` | `0.78rem` | `var(--type-meta)` |
| `.field-objectives > span` | `0.62rem`, no weight, ls `0.04em` | `var(--type-micro)`, `var(--label-weight)`, `var(--label-tracking)` |
| `.field-objectives strong` | `0.76rem` | `var(--type-meta)` |
| shared label primitive (`.case-code, .rail-label, .choice-method, .selection-count, .site-index, .site-state, .fragment-code, .evidence-status, .event-order, .phase-status, .scene-coordinates, .world-caption, .world-label, .registry-caption, .button-meta`) | `0.72rem` / `650` / lh `1.4` / ls `0.055em` | `var(--type-label)` / `var(--label-weight)` / lh `1.3` / `var(--label-tracking)` |
| `.site-closeup-zone-label` | `0.62rem` / `750` / ls `0.05em` / pad `3px 5px` | `var(--type-label)` / `600` / `var(--label-tracking)` / pad `4px 7px` |
| **232 further declarations** | 47 distinct values in 0.55–1.5rem | snapped to the nearest of the 7 working-band tokens |

**Ambience and breathing**

| selector | property | before | after |
|---|---|---|---|
| `.room-console` | `background` | `linear-gradient(to top, oklch(0.1 0.008 240 / 0.97) 40%, oklch(0.1 0.008 240 / 0.82))` | `linear-gradient(to top, oklch(0.09 0.008 240 / 0.86) 38%, oklch(0.09 0.008 240 / 0.6))` |
| `.room-console` | `backdrop-filter` | `blur(6px)` | `blur(14px) saturate(1.06)` |
| `.room-console` | `border-top` | `1px solid var(--line)` | `1px solid var(--line-strong)` |
| `.site-closeup-projection > img` | `filter` | `brightness(0.84) contrast(1.07) saturate(0.92)` | `brightness(0.93) contrast(1.05) saturate(0.99)` |
| `.scene-preview-vignette` | `--preview-vignette-alpha` default | `0.55` | `0.42` |
| `.site-inspector` | `background` / `backdrop-filter` / `padding` | `var(--concrete)` / none / `0 18px 18px` | `oklch(0.16 0.012 240 / 0.72)` / `blur(12px) saturate(1.04)` / `0 16px 16px` |
| `.field-dock` | `background` / `backdrop-filter` / `padding` | `var(--concrete)` / none / `11px 13px` | `oklch(0.16 0.012 240 / 0.74)` / `blur(12px) saturate(1.04)` / `10px 13px` |
| `.scene-column` | `background` | `var(--night-soft)` | `linear-gradient(180deg, var(--night) 0%, var(--night-soft) 46%, oklch(0.13 0.008 236) 100%)` |
| `.site-closeup-zone-label` | `background` | `oklch(0.04 0 0 / 0.58)` | `oklch(0.03 0 0 / 0.88)` |
| `.world-caption::before` | — | *(did not exist)* | `linear-gradient(to top, oklch(0.03 0 0 / 0.88), oklch(0.03 0 0 / 0.82) 52%, oklch(0.03 0 0 / 0.42) 76%, transparent)`, `height: calc(100% + 58px)`, `z-index: -1` |
| `.field-workspace` | `grid-template-columns` | `minmax(0, 1.55fr) minmax(330px, 0.85fr)` | `minmax(0, 1.92fr) minmax(316px, 0.74fr)` |
| `.field-workspace` | `height` / `gap` | `max(500px, 100svh - 254px)` / `14px` | `max(500px, 100svh - 242px)` / `12px` |
| `.investigation-page` | `padding` / `gap` | `18px 20px 20px` / `14px` | `14px 18px 16px` / `12px` |
| `.investigation-page` @≥900 | `padding` | `18px 16px 20px` | `14px 16px 16px` |
| `.investigation-page` @<700 | `padding` | `18px 14px 32px` | `12px 14px 28px` |

---

## 4. Verification

### Text-fraction and hierarchy, before → after

**1280×800**

| surface | glyph % | text-block % | distinct sizes | size/weight/case pairs | plate % of viewport | plate covered by docked chrome % |
|---|---|---|---|---|---|---|
| concourse | 7.7 → 7.8 | 16.2 → 16.7 | **13 → 7** | **23 → 18** | **35.9 → 41.3** | 5.6 → 5.4 |
| close-read + console | 9.5 → 9.8 | 21.0 → 21.1 | **15 → 8** | **26 → 20** | **35.9 → 41.3** | 46.0 → 44.7 |
| terminal zones | 11.8 → 12.0 | 26.2 → 27.0 | **15 → 8** | **27 → 20** | **35.9 → 41.3** | 58.6 → 56.5 |
| staged beat | 11.8 → 12.0 | 26.2 → 27.0 | 15 → 8 | 27 → 20 | 35.9 → 41.3 | 58.6 → 56.5 |
| result strip | 11.8 → 12.0 | 26.2 → 27.0 | 15 → 8 | 27 → 20 | 35.9 → 41.3 | 58.6 → 56.5 |
| case-file drawer | 12.5 → 12.7 | 27.6 → 28.1 | **17 → 8** | **31 → 24** | — | — |
| tribunal | 8.9 → 9.0 | 22.6 → 22.8 | 16 → 9 | 16 → 14 | 42.7 → 42.7 | 0 |
| debrief | 11.8 → 11.6 | 24.8 → 24.4 | 14 → 7 | 16 → 14 | 46.9 → 46.9 | 0 |
| memory lattice | 9.3 → 9.2 | 20.3 → 20.1 | 13 → 7 | 17 → 15 | 60.6 → 60.6 | 0.6 → 0.7 |

**375×812**

| surface | glyph % | text-block % | distinct sizes | pairs | plate % | chrome over plate % |
|---|---|---|---|---|---|---|
| concourse | 15.2 → 16.0 | 39.4 → 39.7 | **11 → 5** | 17 → 14 | 37.0 | 15.9 → 15.3 |
| close-read + console | 23.4 → 22.9 | 50.8 → 50.4 | **14 → 6** | 23 → 18 | 37.0 | 81.3 → 81.6 |
| terminal zones | 29.4 → 28.7 | 59.8 → 60.7 | 13 → 6 | 24 → 18 | 37.0 | 81.3 → 81.6 |
| case-file drawer | 31.0 → 30.4 | 59.1 → 58.6 | **16 → 6** | 26 → 20 | — | — |
| tribunal | 21.1 → 19.7 | 47.3 → 46.1 | 13 → 7 | 13 → 11 | 57.5 | 0 |
| debrief | 24.2 → 22.7 | 49.7 → 49.8 | 14 → 7 | 16 → 14 | 63.1 | 0 |
| memory lattice | 20.4 → 19.0 | 42.1 → 41.3 | 10 → 6 | 15 → 12 | 37.2 | 5.5 → 6.0 |

**Read these honestly.** Distinct sizes fell 45–65% on every surface and the plate grew 15% at 1280 — those are the claims this pass earns. Glyph area is *near-neutral*: down on 8 of 15 surfaces, up by ≤0.8pp on the rest, and up 0.8pp on the 375 concourse. Chasing that number down was never the fix; if it had been, the debrief (11.8%) would be the offender rather than the screen the user liked. What the metric cannot see at all is the label weight drop from 650 to 500, which is where a real part of the perceived reduction lives — that one is carried by the screenshot pair, not by a number.

**Two intermediate states of this pass are recorded because they were wrong.** A first cut promoted body copy up the scale and left the rest of the band untouched: distinct sizes went *up* (13→14, 15→17) and glyph area rose on every surface. The second cut retuned the band downward and snapped all 232 remaining declarations. The numbers above are from the third state.

### Composited contrast

Not `getComputedStyle().backgroundColor` — the changed surfaces are translucent over a photograph, so the declared background is no longer the background the text is read against. Every text style probed against the pixels actually painted, worst pixel in each glyph box, `oklch` resolved through the renderer.

| | pre-pass build | after |
|---|---|---|
| WCAG AA failures | **2** | **0** |
| concourse plate caption @1280 | 4.30 : 1 (floor 4.5) | **8.09 : 1** |
| concourse plate caption @375 | 2.75 : 1 | **7.74 : 1** |
| docked console · choice title / body / cost | — | 8.0–19.3 : 1 |
| docked console · prompt (over translucent fill on art) | — | 4.66–5.11 : 1 |
| on-plate zone label | 8.07 : 1 | 7.72–7.89 : 1 |
| inspector heading / record body (over glass) | — | 19.27 : 1 / 8.01 : 1 |
| command-bar counter label | — | 5.04 : 1 |

The pre-pass baseline was taken by stashing `src/styles.css`, running the identical probe against the same commit's app, and restoring — so the two failures are a reproduced pre-fix defect, not an inferred one.

*Probe limitations, stated:* three artefacts were found and fixed during this pass, each of which had produced a false failure — `visibility:hidden` also hides an element's own scrim; a child with its own `color` does not inherit `transparent` and its surviving glyphs get sampled as background; and text covered by a higher-stacked surface was being measured against that surface's glyphs (the plate caption under a docked console reported a fixed 1.66:1 against `--fog-dim`, which is console text). The probe samples the *parent* element's colour, which is the dimmer one in mixed-colour labels — conservative. `text-shadow` halos are excluded from the background, which is also conservative.

### Suites and harnesses

| check | result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | clean |
| `npx eslint .` | clean |
| `npx vitest run` | 294 passed / 16 files |
| `npx vite build` | ✓ |
| `scripts/evidence-hud-collapse.mjs` | **123 PASS / 0 FAIL** |
| `scripts/evidence-rooms-scene-first.mjs` | **110 PASS / 0 FAIL** |
| `scripts/evidence-pilot-care-ward.mjs` | **52 PASS / 1 known seed-save skip** (= documented 53) |
| `scripts/evidence-persona-portraits.mjs` | **37 PASS / 0 FAIL** |

**Zero harness assertions were edited.** Nothing was deleted, weakened, or re-baselined. Notably the two hard layout gates survived unchanged: *"the collapsed page fits without a scrollbar"* at 1280, and *"every docked tableau still fits without scrolling"* across all three room consoles — the latter is what the wider workspace ratio was partly protecting.

Accessibility paths intact and re-proved by the HUD harness: reduced-motion, high-contrast (`.high-contrast .room-console` still forces an opaque `var(--night)` and drops the blur), and forced-colors (`Canvas`, blur none). Cross-zone control-pair sweep and the 375 zone-anchor crop / ≥44px tap-target checks all still pass.

### Not verified

- **Feel.** Whether the scene now reads as dominant enough is the user's call on the screenshot pairs in `evidence/design-gap-fix/`. Nothing here settles it.
- **Device.** All measurements are headless Chrome at DPR 1. Backdrop-filter cost and the blur's appearance on a real display are unmeasured. `backdrop-filter` was already in use on seven surfaces before this pass, so the capability is not new — but two more full-width blurred panels is a rendering-cost change that wants one look on a real machine.
- **Case 81.** Every measurement was taken in Case 77. The shared stylesheet means the type scale applies, but Case 81's own art and copy lengths were not measured.

---

## 5. Scar for project memory

> **CSS syntax errors are invisible to `tsc`, `eslint` and `vitest` in this repo.** A malformed comment shipped a stylesheet that failed PostCSS while all three checks stayed green; the only signal was the dev server returning an error document, which showed up as a harness failure two steps later (`landing did not render`). **Detection rule:** any pass that edits `src/styles.css` must run `npx vite build` (or fetch `/src/styles.css` from the dev server) before running a harness — a green suite is not evidence the stylesheet parses.

> **A contrast probe that reads declared background colours verifies a fiction once a surface is translucent.** Measure the composited pixels, hide only the glyphs (never the element), resolve `oklch` through the renderer, and skip occluded text — three separate false failures came from getting each of those wrong.

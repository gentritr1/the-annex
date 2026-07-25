# Deposition Annex — Ellis Marne, scene-first redesign (prototype)

Standalone prototype. No `src/` or game code touched — one HTML file, inline CSS/JS, no deps.
Open: http://localhost:3000/deposition-redesign.html

**Audition this (10 lines):**
1. At rest the annex fills the viewport — dark, rain-dark register, a warm shaft from the pendant, Ellis Marne seated at the table (presence 0.90). Only a site label + one caption. The scene rests neutral on load (no preview until you hover/Tab in).
2. Two entry ring-zones at the threshold: **Swear the witness in** (amber, near Ellis) vs **Cross-examine** (cyan). Hover/focus previews the room in ~300ms: *sworn* warms + steadies the shaft; *cross* hardens + cools the light, sharpens the shaft edge, tightens the vignette, tenses Ellis (scale 1→0.992, dim to 0.86). Obviously different — judge whether they read.
3. Commit is arm→confirm on the ring ("Select again to begin"); Escape / click-away disarms.
4. Three statement beats play *over the scene*, staged clause-by-clause (hold = 900+45·chars, clamped 1700–4500ms); click or any key advances. Ellis's words change with the entry path (sworn = civic/ordered; cross = guarded/sharp).
5. After each statement, three in-scene verb rings appear near the table — **Let it stand / Interrupt / Corroborate**. Hover previews ambient (interrupt = hard cold pulse + Ellis dims to 0.66; corroborate = warm steady; let = neutral). Commit files it and echoes one line ("You cut in and reset the terms.").
6. The **consent beat** is the centerpiece: **Ask whether they consent** vs **Do not ask**. Asking stills the room (~2s), then Ellis answers per path — *sworn* → "Yes…"; *cross* → refusal.
7. **The refusal is witnessed**: the room dims around Ellis (grade → 0.55, vignette closes to 0.92 on Ellis), but Ellis **holds at 0.66, unmoved** (scale stays 1; a brightness lift keeps them lit) for a held ~2.5s before the close. Center stage, in full view.
8. Closing line over the scene, then a compact strip: `Transcript committed · [entry path] · consent: [asked-yes / asked-no / not asked]` + **Replay the other path**.
9. Reduce-motion toggle (top-right): kills animation + dust, states switch instantly, staged text renders as a block, the refusal hold is instant but still visually distinct.
10. All narrative strings are verbatim from the brief (curly punctuation preserved); only micro-labels (zone captions, rest caption) are new, in the quiet civic register. Feel is the user's call — not claimed here.

## Ambient value-sets
Absolute values, not multipliers. Read via `getComputedStyle` on `.grade` / `.shaft` / `#ellis` with transitions disabled to read settled targets. `dust ×` is the canvas mote speed multiplier read live from `data-state` in the draw loop.

| state | grade filter (room light temperature) | shaft opacity / blur | vignette (`--vig`) | Ellis opacity | Ellis scale | dust × |
|-------|----------------------------------------|----------------------|--------------------|---------------|-------------|--------|
| **rest** | `brightness(.8) contrast(1.06) saturate(.9) hue-rotate(0)` | `.34` / `blur(6px)` | `.60` @ 50/46 | `.90` | `1` | 0.5 |
| **sworn** (warm, steady) | `brightness(.92) contrast(1) saturate(1.06) hue-rotate(-8deg)` | `.52` / `blur(5px)` | `.50` wide | `.90` | `1` | 0.4 |
| **cross** (hard, cold) | `brightness(.7) contrast(1.24) saturate(.82) hue-rotate(12deg)` | `.62` / `blur(1.5px)` | `.82` tight | `.86` | `0.992` | 1.6 |
| **letstand** (neutral) | `brightness(.82) contrast(1.06) saturate(.92) hue-rotate(0)` | `.36` / `blur(6px)` | `.60` | `.90` | `1` | 0.5 |
| **interrupt** (hard/cold, Ellis dims) | `brightness(.66) contrast(1.3) saturate(.8) hue-rotate(14deg)` | `.66` / `blur(1px)` | `.86` tight | `.66` | `0.99` | 1.9 |
| **corroborate** (warm steady) | `brightness(.9) contrast(1.02) saturate(1.06) hue-rotate(-8deg)` | `.50` / `blur(5px)` | `.52` | `.90` | `1` | 0.4 |
| **stillness** (consent hold) | `brightness(.8) contrast(1.05) saturate(.88) hue-rotate(0)` | `.42` / `blur(5px)` | `.62` | `.90` | `1` | **0** (frozen) |
| **refusal** (witnessed) | `brightness(.55) contrast(1.16) saturate(.8) hue-rotate(6deg)` | `.22` / `blur(8px)` | `.92` on Ellis | `.66` | `1` (unmoved) | **0** (frozen) |

- Shaft hue swaps warm `oklch(0.84 0.11 78)` (sworn/corroborate/let/rest) ↔ cool `oklch(0.85 0.09 205)` (cross/interrupt/refusal).
- Warm/cold presence washes: warm near Ellis (`--wash-warm-op` up in sworn/corroborate), cold on the examiner side (up in cross/interrupt/refusal); interrupt fires a one-shot `cold-pulse`.
- **Ellis on refusal**: opacity `0.66` and scale `1` (unmoved) while the room grade drops to `0.55` — a compensating `--ellis-bright: 1.42` (vs `0.92` baseline) keeps Ellis lit as the room recedes. The vignette centers on Ellis (`--vig-cx: 40%`) so its dark ring closes on the surround, not on them.

## Plate value-match
The source plate (`case-81-deposition-annex.webp`) is a bright interior; a constant `.darken` layer (multiply, `oklch(0.06 0.015 250 / ~.62)` + radial pool) plus the per-state grade pull it into the same rain-dark register as the care-ward prototype before any reactive grade applies.

## Scar honored
Care-ward's one taught lesson — *a looping photographic texture must never visibly reset* — is sidestepped by design: this scene has **no drifting photographic layer**. Atmosphere is procedural `<canvas>` dust in the shaft (no loop point to snap), killed under reduce-motion. The shaft, washes, and grades are static CSS whose only motion is the 300ms cross-fade between states.

## Assets used (no new art)
- `/images/case-81-deposition-annex.webp` — the annex interior plate (graded rain-dark).
- `/images/ellis-marne-scene.webp` — Ellis, background-removed cutout, composited at the table (presence is a state).
- `/images/ellis-marne-dossier.webp` — registry photograph, a small dim prop on the table edge.

## Verification (executed unless noted)
- **Zero console errors** after driving both full paths + replay (headless CDP + in-page).
- **Both paths driven via `el.click()`** (real arm→confirm): sworn/ask → `consent: asked-yes`, strip `Transcript committed · Sworn · consent: asked-yes`; cross/ask → `consent: asked-no`, final state `refusal`, strip `… · Cross-examined · consent: asked-no`; "Do not ask" → `consent: not asked`. Every verbatim line rendered in order (captured via MutationObserver).
- **Ambient tables** above are computed values (transitions disabled).
- **Reduced motion**: computed `transition-duration` / `animation-duration` = `0s` on grade/shaft/vignette/Ellis/beat-line; beat text opacity `1` immediately; dust canvas `display:none`; refusal hold instant but still visually distinct (state applies).
- **Keyboard**: zones are native `<button>`s, tabbable in DOM order; focus is auto-managed to mid-flow groups and restored on Escape-disarm; keydown advances staged beats (executed). *INFERRED (platform guarantee):* native Enter/Space activation of a focused `<button>` — the headless harness can only inject untrusted key events, which fire JS listeners but not native button defaults, so this one step was not machine-executed.
- **Feel is UNVERIFIED** — pending user audition.

## Evidence
`evidence/deposition-redesign/` (headless Chrome, true resolution):
desktop 1280×800 — `rest`, `entry-sworn-hover`, `entry-cross-hover`, `verb-choice`, `consent-question`, `refusal-hold`, `closing-strip`, `refusal-reducemotion`; mobile 375×812 — `rest`, `consent-question`, `refusal-hold`.

## Capture-support note
A `?shot=<name>` query param (and `&rm=1`) jumps to one composition for stills; it is gated behind the param and inert in normal play. Shots stop the dust rAF so a headless capture can settle and exit.

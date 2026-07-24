# Care ward 12 — scene-first redesign (prototype)

Standalone prototype. No src/ or game code touched. Open: http://localhost:3000/care-ward-redesign.html

**Audition this (10 lines):**
1. At rest the scene fills the viewport — only a site label + one caption. Choice controls live *in* the scene as two rings (amber near her = LISTEN, cyan near the instruments = PRESSURE).
2. Hover/focus a ring: the *room* reacts within ~300ms. LISTEN softens rain + warms light; PRESSURE floods/sharpens rain, goes cold, tightens the vignette. The two states are meant to be obviously different — judge whether they read.
3. Ambient values (computed, verified — see below) are absolute, not multipliers.
4. Commit is arm→confirm on the ring: first select shows "Select again to file"; second select files. Escape / click-away disarms.
5. The beat plays *over the scene*, staged clause-by-clause (~600ms); click or any key advances instantly. Persona reactions follow, attributed. Result strip slides in at the bottom.
6. "Replay the other path" resets so you can audition both LISTEN and PRESSURE.
7. Reduce-motion toggle (top-right): kills all animation, rain goes static, states switch instantly, staged text renders as a full block.
8. Try it keyboard-only (Tab / Enter / Space) and at 375px width — both were tested.
9. All narrative strings are verbatim from the brief; only micro-labels (zone captions, the rest caption) are new, in the quiet civic register.
10. This is a presentation prototype — feel is the user's call, not claimed here.

## Ambient value-sets (getComputedStyle on `#rainMatte` + `.grade`, transitions disabled to read settled targets)
| state | rain matte opacity | rain matte blur | grade filter (light temperature) | vignette |
|-------|-------------------|-----------------|----------------------------------|----------|
| rest | `0.28` | `blur(1.1px)` | `hue-rotate(0) saturate(1) brightness(1) contrast(1)` | 0.55 @ 50%/46% |
| LISTEN | `0.16` | `blur(2.4px)` | `hue-rotate(-12deg) saturate(1.08) brightness(1.1) contrast(0.96)` | 0.42, wider/left |
| PRESSURE | `0.62` | `blur(0px)` | `hue-rotate(18deg) saturate(0.82) brightness(0.82) contrast(1.22)` | 0.86, tight/right |

Hand-written `<canvas>` rain streaks layer on top: fall speed ×0.5 (listen) vs ×1.9 (pressure), warm vs cold streak hue. Killed (`display:none`) under reduce-motion.

## Zone anchors
LISTEN at x 0.23 / y 0.56, PRESSURE at x 0.78 / y 0.54 — matching the game's authored anchors. Both are real `<button>`s, ≥44×44px, focus-ringed.

## Assets used (no new art)
- `/images/site-scenes/care-ward-12.webp` — master plate
- `/images/site-scenes/care-ward-rain-memory.jpg` — rain matte (screen-blended, the reactive layer)

## Known limitation
When advancing the beat *manually* by key/click, the final press flushes all lines; one further press reveals the result strip (auto-play reveals it on its own). No dead end — verified.

## Evidence
Screenshots in `evidence/care-ward-redesign/` (desktop 1280×800 + mobile 375×812): rest, listen-hover, pressure-hover, mid-beat, both result strips, reduced-motion. Captured via headless Chrome/CDP (`scratchpad/capture.mjs`).

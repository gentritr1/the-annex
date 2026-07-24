# Small Archive — scene-first redesign (prototype)

Standalone prototype. No src/ or game code touched. Open: http://localhost:3000/small-archive-redesign.html
Grammar standard it matches: `public/care-ward-redesign.html` (scene fills viewport; in-scene ring-zone buttons; ~300ms ambient previews in absolute values; arm→confirm on the zone; staged dialogue with length-scaled holds; reduce-motion; keyboard-only; 375px mobile).

**Audition this (10 lines):**
1. AT REST the archive fills the viewport — a site label, one caption ("The drawer waits, its cards unread in the dark."), and the drawer glowing faint amber. That glow is the only invitation.
2. Activate the drawer to DRAW a card (typographic, over the scene: title · question · source). Three category slots — Continuation (amber) / Property (cyan) / Failed recovery (rose) — become the filing targets. File each with arm→confirm ("Select again to file"); the card flies in and flattens, then the filed line + the statute's "…and keeps nothing else." play staged. Each filing calms the drawer glow and steadies the room (see table).
3. Card three done, the drawer offers THE POCKET CARD ("…who did 77-A become while everyone argued about Mara?"). Try to file it into any class: it lifts at the corner and springs back — a real refusal, three escalating lines, the form insisting "Category error." each time.
4. After the third refusal SHELF ZERO opens low-left ("Unfiled… This record has no class."). Place the card there; the Archivist sets it "beneath the others," and light reaches the lower shelf.
5. The restriction index (the shutter, upper-right) reveals three removal slips, read one by one in a register-ledger typeface, then the Archivist unlocks the two methods.
6. TWO METHODS at centre: hover/focus "Answer the question the statute avoids" (warm, open — the shelf light brightens) vs "Seal the prohibited category index" (cold, shuttered — the index hardens, the room closes in). The two rooms are meant to be obviously different; judge whether they read.
7. Commit is arm→confirm on the ring. Each outcome plays its event + persona reactions staged over the scene, then a compact standing strip slides in. "Replay the other path" returns to the methods step only (not the whole filing ritual).
8. Reduce-motion toggle (top-right, or OS preference on load): all durations 0, card physics skipped, grain static — every line stays fully legible and advance-paced (click / any key), never auto-timed.
9. Keyboard-only completable end to end: focus always lands on the next actionable button (drawer → slot → drawer … → shelf → shutter → answer); real `<button>`s ≥44px throughout, incl. cards and slots.
10. Presentation prototype — feel is the user's call, not claimed here.

## Ambient value-sets (live `getComputedStyle(plate)`; grade filter read with transitions disabled to get the settled target, not the transition start frame)
Absolute values, not multipliers. `--grade` is the whole-plate light temperature; the rest are layer opacities (`0` = off).

| state | grade filter (light temperature) | drawer-glow | shelf-glow | index-harden | vignette | grain (dust) |
|-------|----------------------------------|-------------|------------|--------------|----------|--------------|
| **rest** | `brightness(1) contrast(1) saturate(1)` | `0.50` | `0` | `0` | `0.62` | `0.30` |
| filed ×1 | (rest grade) | `0.40` | `0` | `0` | `0.62` | `0.30` |
| filed ×2 | (rest grade) | `0.30` | `0` | `0` | `0.62` | `0.30` |
| **settled** (3 filed) | `brightness(1.05) contrast(1.02) saturate(1)` | `0.22` | `0` | `0` | `0.56` | `0.22` |
| **shelf** (shelf zero open) | `brightness(1.09) contrast(1.02) saturate(1.02)` | `0.20` | `0.42` | `0` | `0.50` | `0.20` |
| **answer** (preview / commit) | `brightness(1.18) contrast(1) saturate(1.06)` | `0.22` | `0.74` | `0` | `0.40` | `0.16` |
| **seal** (preview / commit) | `brightness(0.82) contrast(1.20) saturate(0.85)` | `0.14` | `0.16` | `0.60` | `0.88` | `0.42` |

Read them yourself: `__smallArchive.var('--shelf-glow')` etc. The **answer↔seal** contrast is the load-bearing one — answer lifts brightness +18% and opens the vignette while the shelf glows to `0.74`; seal drops brightness to `0.82`, hardens the index (`0.60`, off elsewhere), and tightens the vignette to `0.88`.

## Zone anchors (master-normalized, matching the authored anchors)
drawer `x0.35 y0.72` · shelf zero `x0.28 y0.88` · restriction index / shutter `x0.66 y0.42` · methods `~x0.52 y0.5` (answer left-warm, seal right at the index). Category slots sit as a filing rack along the lower scene.

## Looping-texture scar (from the care-ward standard)
The one drifting texture is the archive grain (inline SVG turbulence, no asset). Two layers drift on the same 7.5s cycle a half-period apart, each fading to **opacity 0 exactly at its background-position reset** — a matte grain can't tile seamlessly, so a single sliding copy would snap at every loop. Under reduce-motion it goes static (one layer, no drift). The plate's own opacity is never ramped from a low value (avoids the `annex-scene-opacity-strand` black-plate strand).

## Verification run (headless Chrome / raw CDP — `scripts/evidence-small-archive.mjs`; reviewer can re-run)
- **EXECUTED** full ritual via `__smallArchive` hooks: 3 filings, 3 pocket refusals in order, shelf zero, 3 slips + unlock, then BOTH methods via replay. Every narrative line printed matches the brief verbatim (curly punctuation preserved); both strips exact: `Evidence admitted: Question filed under no category · Standing: The Small Archivist +2 · The Shepherd +1` and `Evidence admitted: Sealed category index · Standing: The Registrar +1 · The Small Archivist −2`.
- **EXECUTED** zero page/console errors across the full desktop + mobile runs.
- **EXECUTED** ambient table above via live getComputedStyle at each state.
- **EXECUTED** keyboard focus lands on the next actionable button at every transition; all controls real `<button>`s ≥44px.
- **EXECUTED** animated path does not dead-end (after each beat finishes, `data-beat` clears and the next zone reveals); reduce-motion durations `0s`, refusal legible as static text + outline state.
- **UNVERIFIED (user audition):** feel, pacing, and whether answer↔seal read as obviously different rooms — the standing proof-of-feeling gate.

## Evidence
`evidence/small-archive-redesign/` — desktop 1280×800: `01-rest`, `02-card-filing`, `03-pocket-refusal`, `04-shelf-zero`, `05-slips`, `06-answer-hover`, `07-seal-hover`, `08-answer-strip`, `09-seal-strip`; mobile 375×812: `01-rest`, `02-card-filing`.

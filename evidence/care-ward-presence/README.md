# Care Ward 12 rain-memory presence evidence

Captured from the production build on 2026-07-23 through the in-app browser. Both
filed compositions were reached through the real two-step method controls in
separate same-browser origins, so neither outcome was produced by mutating DOM or
canonical game state.

## What the captures prove

- `care-resolved-desktop.jpg` — the Care filing lands as a continuous cyan
  chair-to-platform relation while the patient remains a still part of the
  approved master.
- `pressure-resolved-desktop.jpg` — the Pressure filing lands as a segmented
  diagnostic arc from the right apparatus. It is distinguishable from Care by
  position and silhouette, not only color.
- `pressure-resolved-mobile.jpg` — the Pressure composition has zero document
  horizontal overflow at 375×812 and the action trace survives the responsive
  source projection.
- `care-resolved-reduced-high-contrast-mobile.jpg` — app reduced motion plus high
  contrast mounts no auxiliary rain image, retains a static 2px solid Care
  trace, and has zero document horizontal overflow at 375×812.

The generated matte is one optional VFX asset. At normal motion the settled close
read mounted three source-registered compositor regions (`left`, `right`, and
`floor`) with animations `cwr-rain-left`, `cwr-rain-right`, and
`cwr-rain-floor`. Under app reduced motion plus high contrast, the matte root and
all three image regions were absent. The approved
`/images/site-scenes/care-ward-12.webp` remained the base in every state.

The central protected band is explicit in CSS: rear masks stop before the
privacy membrane and the floor mask is transparent from x 42.5% through 58.5%.
The patient is never redrawn, copied, transformed, brightened, or animated.

## Verification

- `npm run lint` — pass
- `npm run test` — 218/218 pass
- `npm run build` — pass
- Engine, persistence, world, scene-motion, and ambience/audio diffs — zero
- Normal resolved states — Care and Pressure each reported the authored
  presentation state, cyan trace, and resolved source marker
- Accessible resolved state — no matte element; trace animation `none`,
  transition duration `0s`, opacity `1`, and 2px structural border

Exact generated-asset source, prompt, mode, derivation, and intended use are in
`docs/PROVENANCE.md`.

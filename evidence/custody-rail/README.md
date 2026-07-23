# Registry Intake — Custody Rail

This pack proves the bounded Registry investigation added before its two existing
field methods. Three admitted carriers seat in marked notches, an unassigned carrier
is refused after closure, and the audit mirror reveals mark 04. The methods appear
only after the player explicitly carries that reading forward.

## Result

- Desktop room height: `384px` in every measured phase; variance `0`.
- Desktop inspector overflow: `0` in every phase, including armed confirmation.
- Mobile room height: `320px` in every measured phase at `375px`; horizontal
  overflow `0`.
- Exactly one room live region in every phase.
- No method rows or visible plate method markers before acknowledgement.
- The old entry-time checksum echo never mounts for this authored room.
- The complete fourth-minute reading is unclipped on desktop and mobile.
- Every enabled room control is at least `44px`; measured minimum `48px`.
- Focus never lands on `<body>` through the measured sequence.
- Trusted Enter seats a carrier and advances focus; first method activation arms,
  and Escape disarms.
- Both independent full-UI commits resolve to their authored structural silhouettes:
  continuous chain / press ring versus stopped rail / dashed mirror return.
- Reduced motion plus high contrast retains the same geometry and shape cues.

The detailed state-by-state values and filed copy are in
`measurements.json`; `transcript.txt` is the short pass/fail digest.

## Captures

1. `01-intake.jpg`
2. `02-closure-gate.jpg`
3. `03-late-carrier-refused.jpg`
4. `04-fourth-minute-reading.jpg`
5. `05-methods.jpg`
6. `06-armed.jpg`
7. `07-mobile-375.jpg`
8. `08-reduced-high-contrast.jpg`
9. `09-resolved-chain.jpg`
10. `09-resolved-return.jpg`

## Reproduction

```sh
node scripts/evidence-custody-rail.mjs http://127.0.0.1:4176/
```

The runner disables CSS transitions and animations in the live page before every
computed-style/geometry read, matching the project’s documented headless transition
scar. Long raw-key sequences can also wedge this host’s headless Chrome process, so
the proof isolates one trusted Enter/focus handoff and uses deterministic DOM
activation for the longer geometry and outcome sweeps.

No new raster was generated for this pass. The approved
`registry-intake.webp` master already contains the press, carriers, closure gate,
and mirror spindle; React/CSS adds only source-registered, pointer-inert traces.

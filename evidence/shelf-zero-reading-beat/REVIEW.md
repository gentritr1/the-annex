# Reviewer verification record — Shelf Zero reading beat

Independent review on 2026-07-23 against the live dev build (working tree over
HEAD 5bfcedc). All numbers below measured by the reviewer.

## Pre-fix defect (on record from the stagecraft review)

At 5bfcedc, one TURN_SLIP flipped the phase to `unlocked` (probe log:
`{"phase":"unlocked","methods":2}` immediately after the first slip click) —
the log unmounted with two slips unread; the fragment survived only in the
~3.3em-clamped announce region.

## Post-fix (reviewer's live measurements, 1280×800)

Eight-state sweep (initial, refusal-3, log-0, reading-1, reading-3, two
re-selections, methods): room height 384px in every state (variance 0),
inspector overflow 0, exactly one live region, methods count 0 through
reading-3 and 2 only after the proceed activation, proceed control present
exactly from the first turn. Each of the three fragments individually rendered
in the reading area with `scrollHeight <= clientHeight + 1` (no clipping).
Re-selecting turned slips works in both directions.

`roomUnlocked` semantics diff-verified untouched; `src/world`,
`src/game/engine.ts`, `src/game/persistence.ts`, `src/scene/motion.ts` all
zero-line diffs.

## Focus handoffs

Real browser: slip turn → `.room-reading`, second turn → `.room-reading`,
proceed → first `.choice-row`; never `<body>`. Trusted-input (headless CDP,
rawKeyDown/char/keyUp Enter): slip Enter → `room-reading` (phase log, methods
0), proceed Enter → `choice-row` (phase unlocked, methods 2). The host's
intermittent headless wedge did not strike these short probes; the
implementer's longer harness run recorded an honest partial transcript plus a
live-DOM cross-check (`keyboard-crosscheck.json`).

## Return payoff regression check (full UI, no seeded save)

Complete run through the new reading beat → two-step commit (event title
byte-identical) → real Return control: `data-return-emphasis` set +12ms,
cleared +962ms (spec 950ms), outcome `shelf-zero-opened`, return announcement
carries the outcome sentence. World-layer code untouched by this pass.

## Visual corrections (eyeballed)

Recessed unlabeled fourth cell present pre-reveal; active card keyline +
corner-fold (amber stripe gone); plate PROCEDURE/INQUIRY markers absent during
room phases and restored in methods; methods description/consequence type
visibly larger and fully contained. Mobile 375 reading state: full fragment
readable, one-row tabs, ≥44px targets.

## Gates (reviewer-run)

lint clean · 195/195 tests · build green · content-id leak grep clean.

## Open items

Unchanged from the stagecraft record: physical-device touch pass; the user's
own audition of pacing (the proceed label "Take your reading to the Archivist"
is in-voice and rendered as the room's single amber forward control — judged
clear, but wording is one line to revisit if playtests stumble).

# The Annex — UX Fix Pass (2026-07)

**Scope:** a build pass removing play barriers named by `docs/ux-review-2026-07.md`
— **F-2, F-5 (+F-1's CTA half), F-6, F-9, F-11**, plus the bounded slice of
**F-3/F-4** ("F-3-lite" / "F-4-lite"). Ambience, fiction, and every non-goal were
left untouched. This document is the acceptance record: per-item before/after
screenshots, the CTA state table, the `getComputedStyle` runtime log, the
out-of-scope diff, and the honesty tags.

**Honesty tags.** *Observed* = seen running in the app at 1280×800 (or 375×812) via
the in-app browser / headless capture. *Runtime-measured* = read from
`getComputedStyle` / `getBoundingClientRect` on the live page. *Inferred* = read from
code, not separately eyeballed.

**Verification run (all four, all green):**

| Check | Result |
|---|---|
| `npx vitest run` | **248 passed / 11 files** (incl. the new `fieldCta.test.ts`, 11 cases) |
| `npx tsc -b` | exit 0 |
| `npx eslint` (touched files) | exit 0 |
| `getComputedStyle` runtime checks | logged below — every new rule confirmed live |
| Evidence regenerated → `docs/ux-review-assets/after/` | 14 shots via `scripts/ux-fix-pass-capture.mjs` (Node 24) |

Evidence lives in `docs/ux-review-assets/` (**before** — the original review baseline,
unchanged) and `docs/ux-review-assets/after/` (**after** — this pass). The original
`ux-review-capture.mjs` was **not** re-run in place (that would overwrite the before
baseline); `ux-fix-pass-capture.mjs` drives the identical `el.click()` paths and
writes to `after/`, plus two fix-specific shots.

---

## F-2 · One site vocabulary + an explicit threshold sentence

**Change.** The rail counter "Locations filed 0/4" is now "Sites filed 0/2" —
matching the header chip's term (**sites**) and denominator (**/2**), both clamped to
the threshold so filing a 3rd/4th site reads "2/2" in both places rather than a
mismatched 3/4-vs-2/2. A new in-voice line sits on the investigation screen, visible
without opening anything:

> The tribunal will hear a record of two sites. The other two are yours to leave
> read or unread.

**Accept — Observed @1280×800** (`after/desktop-03-investigation-registry-intake.png`):
the header reads `0 / 2 SITES`, the rail reads `Sites filed 0 / 2`, and the threshold
sentence is present under the command bar. **No two counters with different
denominators.**
Before: `desktop-02-briefing-rail.png` (rail `Locations filed 0/4`) +
`desktop-04-custody-rail-methods.png` (header `0/2` beside rail `0/4`).

---

## F-5 (+F-1's CTA half) · State-aware progression footer

**Change.** The footer CTA is now resolved by a pure, unit-tested function
(`src/game/fieldCta.ts`) that names the player's actual next step in every state and
**never promises an action its click can't deliver**. Because the site inspector is
always mounted (the methods aren't gated behind a separate "enter" step but behind
the close-read ritual), the CTA tracks the ritual phase and disappears once the live
method list is on screen. Site order and the custody ritual length are unchanged
(both gated on human playtest — non-goals).

**CTA state table — Observed live @1280×800** (custody-rail site, Case 77):

| Investigation state | Before (single label) | After (this pass) |
|---|---|---|
| Custody ritual — intake | `Choose a method here` | `Seat the carriers on the rail` |
| Custody ritual — late-carrier | `Choose a method here` | `Test the refused carrier` |
| Custody ritual — mirror | `Choose a method here` | `Read the audit mirror` |
| Custody ritual — reading | `Choose a method here` | `Take in the mirror’s mark` |
| Methods revealed (custody or plain site) | `Choose a method here` | **(no CTA — live list carries it)** |
| 1 site filed, no model | `Open memory lattice` | `Open memory lattice` |
| Model filed, < 2 sites | `Complete one more site` | `Complete one more site` |
| 2 sites + model (threshold met) | `Enter tribunal` | `Enter tribunal` |

The `ritual-step` CTA's click scrolls/focuses the live room control (honest delivery,
not a dead promise). The last three rows were already sound in the old code and were
preserved.

**Accept — Observed:**
- Desktop, methods revealed → **no footer CTA** below the method list
  (`after/desktop-04-custody-rail-methods.png`; before:
  `desktop-04-custody-rail-methods.png` shows `Choose a method here →` beneath the
  already-visible methods).
- **Mobile 375** → the CTA no longer renders below the methods it used to point back
  up at (`after/mobile-04-custody-methods.png`; before: `mobile-02-investigation.png`).
- **Unit test:** `src/game/fieldCta.test.ts` covers every `FieldCtaKind`, the
  null (methods-visible) case, the in-voice fallback, and each room's step-label map
  including the terminal-phase → `null` guards.

---

## F-6 · Progressive rail disclosure

**Change.** At minute 1 the Case tab shows only **Active dilemma**, the **dossier
photo**, and the **status grid**. **Social memory** joins the flow the first time any
trust reads nonzero; **Methods recorded** joins the first time a tag exists. No
animation — they simply appear in place.

**Accept — Observed:**
- Briefing (before first choice): rail labels = `["Active dilemma"]` only; Social
  memory and Methods absent (`after/desktop-02-briefing-rail.png`).
- After the first commit (Care approach): rail labels =
  `["Active dilemma","Social memory","Methods recorded"]`
  (`after/desktop-03-investigation-registry-intake.png`).

---

## F-9 · Tribunal fold

**Change.** The chamber banner min-height is capped against viewport **height**
(`min(clamp(420px, 48vw, 560px), 52vh)`), so the first decision peeks above the fold
at 1280×800. `object-fit: cover; object-position: center` keeps the focal point — the
banner is shrunk/letterboxed, never distorted.

**Accept — Runtime-measured @1280×800** (`after/desktop-07-tribunal.png`):

| Metric | Value |
|---|---|
| Viewport height | 800px |
| `.tribunal-chamber` computed `min-height` | **416px** (was clamped 610px) |
| "Issue a finding" heading top | 693px (above fold) |
| First decision ("Certify Mara Vale…") top | **773px < 800** → peeks above the fold |

---

## F-11 · Preferences surfaces

**Change (a) — popover anchor.** At the two-column desktop layout (≥1181px, where the
380px rail occupies the right column) the Access popover now anchors clear of the
rail (`right: calc(380px + 16px)`), opening over the scene column so it never covers
the Active dilemma.

**Change (b) — parity.** `StartScreen` now exposes the same **five** toggles as the
in-game header (added **Show trust values**).

**Accept — Runtime-measured @1280×800** (`after/desktop-10-access-popover.png`):

| Rect | left | right |
|---|---|---|
| Open popover | 612px | **862px** |
| Rail "Active dilemma" `h2` | **919px** | 1262px |

Popover right (862) < dilemma left (919) → **no overlap, `covers:false`**; the
dilemma is fully readable with the popover open.

**Parity — Observed:** start-screen toggles =
`["Reduce motion","High contrast","Larger text","Show trust values","Ambient sound"]`
— identical to the in-game header.

---

## F-4-lite + F-3-lite · First trust point visible; "Methods recorded" defined

**Change (F-4-lite).** When a persona's trust moves but the label word doesn't cross
a band, a small **static ▲/▼ marker** now holds beside that persona until the next
field commit retires it. It is set independent of motion preference (the first-class
reduced-motion path); the existing 1100ms pulse remains as the motion path.
`getTrustLabel` bands, the `showTrustNumbers` default, and engine tag assignment are
**unchanged** (non-goals).

**Change (F-3-lite).** A one-line in-voice definition now sits under the "Methods
recorded" label:

> How you reached each finding. The people here — and the cases that follow — keep
> the record of it.

**Accept — Observed:**
- Care approach → Shepherd (+1) stays **`UNCERTAIN`** but now shows a visible **▲**
  (`after/desktop-03-investigation-registry-intake.png`).
- **Reduced motion** (in-game "Reduce motion" ON): no pulse class present, but the
  static **▲** persists on the Shepherd row in cyan — Runtime-measured
  `.trust-marker` color `oklch(0.78 0.11 190)` (`--cyan`). *(Observed live; not in the
  headless set, which runs full-motion.)*
- **Marker clears after the next commit:** committing the checksum method retired the
  Shepherd's ▲ (marker → null) while the commit's own in-band deltas produced fresh
  markers (Registrar **▼** coral, Small Archivist **▲** cyan). Observed live.

---

## `getComputedStyle` runtime log (every new CSS rule, live @1280×800)

Per the immersion guardrail (a prior authored rule was silently overridden by an
ancestor cascade), each new rule was confirmed to take effect at runtime, not just in
source.

| Selector | Property | Computed value | Verdict |
|---|---|---|---|
| `.field-threshold` | grid-column | `1 / -1` | ✓ spans the command bar |
| `.field-threshold` | display / visibility | `block` / `visible` | ✓ shown, no opening needed |
| `.field-threshold` | font-size / color | `11.52px` / `oklch(0.59 0.018 215)` | ✓ muted, in-scale |
| `.trust-marker` (rise) | color | `oklch(0.78 0.11 190)` (`--cyan`) | ✓ |
| `.trust-marker` | display / visibility / font-size | `block` / `visible` / `9.6px` | ✓ renders beside the label |
| `.trust-marker-fall` | color | `var(--coral)` per rule; **▼** observed live on the Registrar | ✓ glyph observed; color *Inferred* from the symmetric rule (not separately dumped) |
| `.rail-note` | display / font-size / margin | `block` / `11.52px` / `0 0 8px` | ✓ |
| `.preferences-popover` (≥1181px) | right / width | `396px` / `250px` → rect clears the rail | ✓ `covers:false` |
| `.tribunal-chamber` | min-height | `416px` @800vh (first decision top 773 < 800) | ✓ folds |

---

## Out-of-scope diffs

**None.** Files changed:

| File | Nature |
|---|---|
| `src/game/fieldCta.ts` | new — pure CTA resolver + ritual step-label maps |
| `src/game/fieldCta.test.ts` | new — unit test, all CTA states |
| `src/components/Investigation.tsx` | F-2 threshold line; F-5 state-aware CTA wiring |
| `src/components/CaseRail.tsx` | F-2 counter; F-6 disclosure; F-4-lite marker; F-3-lite line |
| `src/components/StartScreen.tsx` | F-11 "Show trust values" toggle |
| `src/styles.css` | new rules: `.field-threshold`, `.trust-marker*`, `.rail-note`; F-9 chamber cap; F-11 popover anchor |
| `scripts/ux-fix-pass-capture.mjs` | new — after-state capture harness |
| `docs/ux-review-assets/after/*` | new — regenerated evidence |

No change to `src/ambience/`, `src/scene/`, audio, `src/game/cases/`, `engine.ts`,
persistence/schema, or dependencies. `getTrustLabel` bands, `showTrustNumbers`
default, engine tag assignment, site order, custody-rail length, arm/confirm policy,
deposition verbs, and mobile diorama hotspots (all non-goals) were left untouched.

---

## Unverified / caveats

- **`.trust-marker-fall` color** — the ▼ glyph was observed live on the Registrar
  after the checksum commit, but its computed coral color was not separately dumped
  (only the rise color was). It is set by the same `.trust-marker-fall{color:var(--coral)}`
  rule as the confirmed rise color. *Inferred, low risk.*
- **Audio / motion feel** — unchanged by this pass and not judged here (headless,
  sound-off), consistent with the original review's Unverifiable-by-agent section.
- **Whether the CTA rewording "feels" right to a first-timer** — a playtest question.
  This pass makes the label *accurate* (falsifiably: it names the live step and never
  the wrong one); whether it lands emotionally is the human checklist's to answer.

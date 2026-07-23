# The Annex — UX / Playability Review (2026-07)

**Reviewer role:** first-time-player legibility & pacing diagnosis. Diagnosing, not fixing — no source was changed except adding `scripts/ux-review-capture.mjs` (a headless screenshot harness) and this document.

**The question:** *Where does a first-time player lose the thread, and where does the experience turn monotone?*

**Short answer.**
- **Losing the thread** happens almost entirely at the **first field site**. The concourse opens on *Registry intake*, whose custody-rail room is a ~7-step ritual, while a persistent amber **"Choose a method here"** button promises a method list that the ritual doesn't deliver until the end. Combined with two different site counters (`0/2 SITES` vs `Locations filed 0/4`), this is the one place I genuinely hesitated about what the game wanted. Everything downstream — reconstruction, tribunal, deposition, debrief — is legible.
- **Turning monotone** is a mild risk, not a failure. The close-read rooms are genuinely *different* mechanics (custody rail, timing-based crossing, direct choice, classification), so variety *between* sites is a strength. The friction is that some rooms *add* advance-only steps rather than remove them, every field commit costs a two-click "arm/confirm," and the deposition reuses the same three verbs for three beats in a row.

The rest of the experience is more legible than expected: the **event-result panels** and **debrief** consistently explain *why* state changed (e.g., "Registrar −1, Small Archivist +1"), which rescues the rail's weaker live signals.

---

## Method (what was actually played)

Played on the running dev server (`npm run dev`, served at `http://localhost:4174`) driven through the in-app browser, plus a headless-Chrome replay (`scripts/ux-review-capture.mjs`, run under Node 24 for the CDP WebSocket) to persist the evidence PNGs in `docs/ux-review-assets/`.

- **Case 77 (The Vale Continuity Claim)** — start → *Care* approach → Registry intake custody rail (full ritual, *Trace the checksum* method) → Care ward 12 (*Let 77-A tell one memory*) → memory lattice (Embodied echo + Recognition) → sampled the Maintenance Spine acoustic-shadow crossing → tribunal → **Certify continuity** verdict → debrief.
- **Case 81 (The Commissioned Witness)** — carried the precedent in from Case 77 → *Care* approach → **Ellis Marne deposition** via *Cross-examine* (all five beats; asked consent → **Ellis refused, "No"** — the refusal path) → Restoration lab (*Replicate the memory seed*) → memory lattice (fabricated-witness model) → tribunal (precedent from Case 77 correctly cited) → **Recognize Ellis Marne as a person** verdict → debrief (consent-aware "fourth minute" revelation).
- **Mobile 375×812** — briefing, investigation, and the deposition modal.

**Evidence:** each finding cites a PNG in `docs/ux-review-assets/`.
**Honesty tags:** *Observed* = I saw it in the running app. *Inferred (code)* = read from source, not eyeballed. Feel-dependent items are quarantined in **Unverifiable-by-agent**.

---

## Findings (ranked by severity)

### P2 — causes friction / risks the thread

---

#### F-1 · The default first site buries its method choice behind a ~7-step ritual, under a CTA that mislabels the path
**Focus area:** Guidance + Pacing · **Severity:** P2 (borders P1 for the very first site) · **Effort:** M
**Evidence:** `desktop-03-investigation-registry-intake.png`, `desktop-04-custody-rail-methods.png`
**Component:** `src/components/Investigation.tsx` (footer CTA + default site), `src/components/CustodyRailRoom.tsx`, `src/game/custodyRail.ts`

*Observed.* The concourse opens with *Registry intake* "in view." To file it, a first-timer performs: enter → seat carrier 1 → seat 2 → seat 3 → test the unassigned carrier → read the audit mirror → advance past the "Mirror Mark 04" reading beat → **then** arm a method → confirm it. That is ~8 interactions, and only the last is a real decision; the rest are advance-only "click to continue" beats. Throughout, a large amber **"Choose a method here →"** button sits in the footer — but clicking it does *not* present methods; it enters the same ritual. The other three rooms (e.g. Care ward, `desktop-05-care-ward.png`) show their two methods immediately, so the default site is the heaviest one a player meets first.

**Why it costs comprehension:** the CTA's verb ("Choose a method") sets an expectation the first site actively defers, so the player's model of "how do I act here?" is wrong for ~7 steps.

**Fix sketch:** Don't default the concourse to the heaviest room — open "in view" on a direct-choice site, and/or make the footer CTA state-aware so it names the real next step ("Seat the carriers on the rail" → "Commit a method") instead of a generic "Choose a method here." Keep the mirror/reading beat as the single ritual flourish.

---

#### F-2 · Two different site counters (`0/2 SITES` vs `Locations filed 0/4`) with no statement that 2 is the tribunal threshold
**Focus area:** Guidance / Vocabulary · **Severity:** P2 · **Effort:** S
**Evidence:** `desktop-04-custody-rail-methods.png` (header `0/2 SITES · Needed MODEL` while the rail reads `Locations filed 0/4`)
**Component:** `src/components/Investigation.tsx` (requirement chip) vs `src/components/CaseRail.tsx` (`Locations filed x/4`)

*Observed.* The field header advertises `0 / 2 SITES` and `Needed MODEL`; the rail simultaneously advertises `Locations filed 0 / 4`. Nothing says the tribunal needs only **2 of 4** and the other two are optional depth. I had to reconcile the mismatch myself. A first-timer can't tell whether the target is 2 or 4, and may over-explore (all four) or feel blocked.

**Fix sketch:** Unify the language: header "2 of 4 sites needed for tribunal," rail "Sites filed 2/4," and mark the extra two explicitly as optional depth. (This is also the honest place to tell the player their route matters more than their coverage.)

---

#### F-3 · "Methods recorded" accumulates tags the player can't map to any choice they made
**Focus area:** Vocabulary · **Severity:** P2 · **Effort:** S–M
**Evidence:** `desktop-02-briefing-rail.png` (rail shows **Care · Negotiation** immediately after the *Care* approach), `desktop-07-tribunal.png` (six tags by tribunal)
**Component:** `src/game/engine.ts:41` (`approachMethods`), `src/components/CaseRail.tsx` (Methods recorded block)

*Observed + Inferred (code).* Choosing **"Begin with the person"** instantly records two tags — **Care** *and* **Negotiation** — although nothing in that approach's copy mentions negotiation. `approachMethods.care = ['care','negotiation']` (`engine.ts:43`). A later care field action silently added **Nonviolent**. By the tribunal I had six method tags (Care, Negotiation, Systems, Procedure, Nonviolent, Reconstruction) with no in-game explanation of what a "method" is or whether it has consequences. The label implies these are load-bearing (they *are* — personas and precedents read them — Inferred (code)), but a new player can't see the link, so the block reads as atmosphere.

**Fix sketch:** Make the tag-to-action mapping legible — only add tags the chosen copy actually names, or attach a one-line definition ("Methods are *how* you reached each finding; witnesses and future cases remember them"). Drop tags (like Negotiation on a "listen to her" choice) that don't correspond to a visible player action.

---

#### F-4 · Trust ("Social memory") barely moves and gates nothing, so the rail's most prominent block rarely visibly matters
**Focus area:** Rail legibility / Vocabulary · **Severity:** P2 · **Effort:** S–M
**Evidence:** `desktop-04-custody-rail-methods.png` (all four personas "UNCERTAIN" mid-run), `desktop-07-tribunal.png` (Shepherd "COMMITTED" only after cumulative gains)
**Component:** `src/game/engine.ts:208` (`getTrustLabel`), `src/components/CaseRail.tsx:126`

*Observed + Inferred (code).* `getTrustLabel` maps the entire **−1…+1** band to "uncertain" (`engine.ts:208`), so the *first* trust point a player earns produces **no visible change** — I chose the Care approach (Shepherd +1) and the label stayed "UNCERTAIN." Labels only shift at ±2 ("open") and ±4 ("committed"). "Show trust values" (numbers) defaults **off**, and — per the known design facts — trust gates nothing at runtime. The result is a large, prominent rail block whose changes are coarse, delayed, and consequence-free. The field-result panels *do* print the exact delta ("Registrar −1, Small Archivist +1"), which is where the causality actually lands — the rail lags behind that.

**Fix sketch:** Give change a visible beat even when the label doesn't cross a threshold (a small ▲/▼ pip or a brief highlight — the code already computes a `pulse`, but only under non-reduced-motion and it's easy to miss), and/or narrow the "uncertain" band so a single point moves the word. Consider defaulting "Show trust values" on. Longer term: let trust visibly matter somewhere a first-timer sees (even a debrief clause "because the Shepherd trusted your order…" — current reflections are largely generic).

---

#### F-5 · The persistent "Choose a method here" CTA competes with the live controls and is redundant once methods are shown — worse on mobile
**Focus area:** Guidance · **Severity:** P2 · **Effort:** M
**Evidence:** `desktop-04-custody-rail-methods.png` (CTA still present below an already-visible method list), `mobile-02-investigation.png` (CTA sits *below* the visible methods, pointing back up)
**Component:** `src/components/Investigation.tsx` (progression footer)

*Observed.* The amber footer CTA is always present during investigation. After the method list is revealed, it points "here" at content already on screen; on mobile it renders beneath the methods it refers to. This is the same control implicated in F-1 and is the single most persistent "what do I do?" ambiguity in the loop.

**Fix sketch:** Make it state-aware — hide or disable it once the method list is visible, and otherwise relabel to the concrete next action and scroll-to/emphasize the live control rather than duplicating intent.

---

### P3 — polish / lower-impact

---

#### F-6 · The Case tab is fully populated at minute 1, mostly with empty/neutral states
**Focus area:** Rail legibility · **Severity:** P3 · **Effort:** S
**Evidence:** `desktop-02-briefing-rail.png`
**Component:** `src/components/CaseRail.tsx` (Case panel renders all blocks unconditionally)

*Observed.* At the briefing the rail already shows the status grid (`0/4`, `open`, `quiet`, `Run 1`), four personas all "UNCERTAIN," and "Methods recorded — Your first choice will appear here." Three of the five blocks are in a null state before the player has done anything. It's readable, not overwhelming, but it front-loads low-signal chrome. The blocks that earn minute-1 attention are **Active dilemma** and the **dossier photo**; Social memory and Methods could appear progressively (they already have empty-state copy — show them once non-empty).

**Fix sketch:** Progressive disclosure — reveal Social memory and Methods once the first choice records into them; keep the dilemma and status grid.

---

#### F-7 · The Registry-intake ritual and the acoustic-shadow crossing repeat their own internal loop; every field commit costs a two-click "arm/confirm"
**Focus area:** Pacing / Monotony · **Severity:** P3 · **Effort:** S–M
**Evidence:** `desktop-03-investigation-registry-intake.png`, `desktop-04-custody-rail-methods.png`; acoustic-shadow crossing observed live (Maintenance Spine, 3 checkpoints, each a read→"listen for the next pulse"→cross loop)
**Component:** `src/game/custodyRail.ts`, `src/game/acousticShadow.ts`, `src/components/ChoiceButton.tsx` (`requiresConfirmation`)

*Observed.* Variety *between* rooms is real and good. The monotony risk is internal: the acoustic-shadow crossing repeats the same read→listen→cross beat three times, the custody rail chains several advance-only steps, and the arm-then-confirm pattern (`ChoiceButton`) adds a click to *every* field method, not only the irreversible ones. The confirm-twice is the most-repeated micro-friction in the loop.

**Fix sketch:** Reserve arm/confirm for genuinely irreversible/high-cost actions (forge, tribunal verdict, deposition commit) rather than every field method; consider trimming one checkpoint from the acoustic-shadow loop.

---

#### F-8 · The deposition's three statement beats reuse the identical three verbs
**Focus area:** Pacing / Monotony · **Severity:** P3 · **Effort:** S (content-adjacent — flagged, not prescribed)
**Evidence:** `desktop-09-deposition.png`, `mobile-03-deposition.png` (beat 1); beats 2–3 observed live
**Component:** `src/game/cases/case81.ts` (`deposition.statementBeats`)

*Observed.* Oath, Collapse, and Fourth-minute each offer **Let it stand / Interrupt / Corroborate** — three same-shaped beats in a row. The statements and stakes escalate well (the writing carries it), but the choice grammar is perfectly uniform until the Consent beat breaks the pattern. This is a mechanical-shape note, not a content critique.

**Fix sketch:** Let one beat (e.g. Fourth-minute, where the stakes shift) swap one verb for a distinct option so the grammar isn't uniform.

---

#### F-9 · At the tribunal, the decision buttons sit below the fold on a 1280×800 viewport
**Focus area:** Guidance · **Severity:** P3 · **Effort:** S
**Evidence:** `desktop-07-tribunal.png` (opening view = cinematic banner + "Review findings"; "Issue a finding" and the four decisions are below the fold)
**Component:** `src/scene/TribunalChamber.tsx` (banner height), `src/components/Tribunal.tsx`

*Observed.* The tribunal opens on a full-height chamber banner and the "Admitted record" strip; the actual findings require a scroll. There's no strong "scroll for the decision" signal.

**Fix sketch:** Cap the banner height at the tribunal so at least the first decision peeks above the fold.

---

#### F-10 · On mobile, the diorama's four location hotspots cluster, overlap, and read as tappable but aren't
**Focus area:** Mobile 375px · **Severity:** P3 · **Effort:** M
**Evidence:** `mobile-02-investigation.png`
**Component:** scene stage / world hotspot rendering on the mobile crop (`src/scene/…`, mobile `crops` in the case scene data)

*Observed.* On the narrow crop the four hotspot circles pile into a ~120px cluster over Ellis, unlabeled and overlapping — not viable tap targets. Function is preserved because the canonical control is the 2×2 location grid below (which works well), but the clustered circles are a false affordance. (Per DESIGN.md the DOM switcher is intentionally canonical, so this is a presentation cleanup, not a routing bug.)

**Fix sketch:** On the mobile crop, de-emphasize the diorama hotspots as clearly presentational, or spread them to match the crop so they don't read as buttons.

---

#### F-11 · The Access-preferences popover overlays and obscures the top of the Case rail when open (desktop)
**Focus area:** Guidance / Rail legibility · **Severity:** P3 · **Effort:** S
**Evidence:** `desktop-08-debrief.png` (popover covering "Active dilemma")
**Component:** `src/components/CaseHeader.tsx` (`.preferences-popover`) + `src/styles.css`

*Observed.* The header preferences are a `<details>`/`<summary>` (click-to-toggle — keyboard/touch reachable, so **not** a hover-only a11y problem). But when open on desktop it expands over the rail column and covers the Active dilemma rather than anchoring clear of content. Minor, and it closes on click.

Also, minor inconsistency (Inferred/Observed): the **start-screen** Access panel exposes four toggles (Reduce motion, High contrast, Larger text, Ambient sound — `desktop-08` shows it open) while the **in-game** header exposes five (adds "Show trust values"). A player looking for trust numbers on the title screen won't find the control there.

**Fix sketch:** Constrain/anchor the popover so it doesn't cover the rail (or mark the rail inert while it's open); align the two preference surfaces.

---

## Strengths worth preserving (not findings — protect these in any fix)

- **Cause→effect is legible where it counts.** Every field commit prints its trust deltas, evidence admitted, and a persona reaction; the debrief adds a **"record of refusals"** (the A–D / E–H roads not taken) and per-persona reflections. This is the backbone of the game's legibility and it works. *Evidence: `desktop-08-debrief.png`, plus live debrief text.*
- **Cross-run and cross-case memory land.** The Mirror "Residual signal" quotes your last verdict at the next briefing, and Case 81's tribunal explicitly cites your Case 77 ruling ("Last case you ruled Mara Vale continuous… it can carry an oath"). *Observed live.*
- **The deposition is the high point.** The consent beat, Ellis's refusal, and the consent-aware "fourth minute" revelation form a clean, legible payoff. *Evidence: `desktop-09-deposition.png`; revelation observed live.*
- **Room variety is real.** Custody rail, timing crossing, direct choice, and classification are distinct mechanics — the antidote to monotony is already in the build.
- **Mobile fundamentals are solid.** Rail collapses to a summary toggle, controls are full-width with large tap targets, and the deposition modal scales cleanly. *Evidence: `mobile-01/02/03`.*

---

## Top 5 changes by playability-per-effort

| # | Change | Finding | Effort | Why it pays |
|---|--------|---------|--------|-------------|
| 1 | Make the investigation footer CTA state-aware (name the real next action; don't open on the heaviest room first) | F-1, F-5 | M | Removes the single biggest "lose the thread" moment — the first site — for two findings at once |
| 2 | State the tribunal threshold and reconcile the two site counters (`2 of 4 needed`) | F-2 | S | One copy pass kills a recurring "is it 2 or 4?" confusion |
| 3 | Give trust changes a visible beat and/or narrow the "uncertain" band; consider defaulting trust numbers on | F-4 | S–M | Makes the rail's largest block actually register when it moves |
| 4 | Define or de-mystify "Methods recorded"; stop adding tags the player didn't visibly choose | F-3 | S–M | Turns an atmosphere-only label into a legible one |
| 5 | Reserve arm/confirm for irreversible actions; reveal Social memory / Methods progressively | F-6, F-7 | S | Trims the most-repeated micro-friction and the minute-1 chrome |

---

## Unverifiable-by-agent (needs a human ear/eye)

- **Audio** — ambient beds, the alarm-tier air treatment, deposition press/corroborate acoustics. Played headless / sound-off; cannot judge presence or feel.
- **Motion feel** — parallax drift, the ≤480ms camera travel, pulse cadence, dust/rain. The state-driven *look* reads correctly in screenshots (e.g. the custody rail visibly lights up as carriers seat), but whether the animation *feels* right is an eyeball call.
- **Whether the loop "turns monotone" emotionally** — F-7/F-8 are structural (same-shaped beats, repeated confirms). Whether a real player *feels* bored vs. absorbed by the writing is a playtest question, not an agent one.

## Open questions only a human playtest can answer

1. Do first-timers read "Methods recorded" as meaningful, or ignore it? (If ignored, F-3 is moot; if noticed-but-opaque, F-3 is urgent.)
2. Is the custody-rail ritual felt as immersive texture or as busywork on first contact? (Decides whether F-1's fix should shorten it or just re-order which site comes first.)
3. Do players ever notice trust changing, given it gates nothing — and would they *want* it to gate something?
4. Does the reconstruction feel consequential? It affects trust and is quoted back as a "Filed model:" tension line at the tribunal, but it does **not** change which decisions are available (*Inferred (code): `Tribunal.tsx` builds the decision list independently of `state.reconstruction`*). Players may expect the lattice to unlock or close options.
5. With 2/4 sites sufficient, do players under-explore (miss content) or over-explore (grind all four)? — informs how loudly F-2 should advertise "optional depth."

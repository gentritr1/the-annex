# Persona entities + minimal-HUD plan — the four presences become people, the rest goes behind a summon

Status: **design plan only. No code, no assets.** Every "current code" claim below
was read at the cited `file:line` in this session. This plan is a sibling of
`docs/scene-first-integration-plan.md` and does **not** fork it: §3 and §5 fold
into that plan's deferred **step 8**, and §5 states exactly where the rest
interleaves with its remaining steps 6–9.

Register throughout: **recommendation + one-line rationale**, not option menus.
Open questions are capped at three and live at the foot.

---

## 0. What the persona layer actually is today (verified)

| fact | citation |
|---|---|
| Four personas, global (not case-scoped): id / name / role / principle. Nothing else. | `src/game/content.ts:33`–`58`; shape at `src/game/types.ts:194`–`199` |
| `PersonaId = 'registrar' \| 'shepherd' \| 'defector' \| 'archivist'` | `src/game/types.ts:11` |
| `personaName(id)` is the only persona accessor the view layer has | `src/game/content.ts:60`–`62` |
| Their only visual identity is an abstract 24×24 stroke sigil, explicitly decorative and `aria-hidden`, "no text, no faces" | `src/ambience/sigils.tsx:1`–`5`, dispatch at `:81`–`92` |
| Trust is `Record<PersonaId, number>` on `GameState`; the five band words come from one pure fn | `src/game/types.ts:105`; `src/game/engine.ts:208`–`214` (`committed ≥4 / open ≥2 / uncertain / guarded ≤−2 / opposed ≤−4`) |
| Rail "Social memory" = a 4-row `<ul>`, gated on any-trust-nonzero, each row `signal-dot · 20px sigil · name+role · band word (+▲▼ marker)` | `src/components/CaseRail.tsx:29`, `:159`–`194`; CSS grid `8px 20px minmax(0,1fr) auto`, `min-height:58px` at `src/styles.css:5418` |
| The pulse (1100 ms, cyan/coral, suppressed under reduced motion) and the persistent ▲▼ marker (motion-independent, retired on the next commit) are both **view-local** | `src/components/CaseRail.tsx:36`–`84` |
| `ReactionQuotes` renders `aria-hidden` sigil + name + line; used in the filed site card, the model-filed dock block, the event log, and the scene detail drawer | `src/components/ReactionQuotes.tsx:16`–`34`; mounted at `Investigation.tsx:1197`, `:1323`, `CaseRail.tsx:267`, `SceneDetailDrawer.tsx:157` |
| `BeatStage` renders a speaker line as bare text `"{personaName} —"` with `data-speaker` on the `<p>`; the whole stanza is `aria-hidden` and mirrored into one polite live region | `src/scene/BeatStage.tsx:26`–`28`, `:130`–`150` |
| Debrief renders one `<blockquote>` per persona: sigil + name + band word + authored reflection | `src/components/Debrief.tsx:186`, `:194`–`206`; content fn `case77.ts:1147`–`1174`, contract `types.ts:1113` |
| The scene result strip already prints per-persona standing deltas as text | `src/components/Investigation.tsx:1030`–`1039` |
| **Ellis is the only photographic person**, and it is a *content-authored* record — `caseFile.dossierImage {src, caption, alt}`, optional, rendered by a case-agnostic component with no id literal | `src/game/types.ts:716`–`720`, `:732`–`733`; `case81.ts:54`–`58`; `src/components/DossierPhoto.tsx:8`–`28` |
| The registry-photo treatment is already specified in absolute values: `grayscale(0.35) contrast(0.98) brightness(0.97)`, 1px `--line` border, 2px radius, `--night-soft` backing, mono caption in `--fog-dim` | `src/styles.css:6870`–`6898` |
| Shipped Ellis dossier asset: **9,410 bytes**, 360×418, WebP q82 | `public/images/ellis-marne-dossier.webp`; provenance row `docs/PROVENANCE.md:15` |
| `getReactionsForSource(caseId, sourceType, sourceId, precedents)` resolves the authored reactions for **any** logged event | `src/game/content.ts:152`–`166` |
| `GameEvent` carries `{id, order, sourceType, sourceId, title, detail, tone, methodTags}` — enough to cite a line back to its moment | `src/game/types.ts:82`–`91` |
| The rail is an App-level third column, `case-layout: minmax(0,1fr) 380px` | `src/App.tsx:361`; `src/styles.css:684`–`688` |

**Load-bearing consequence:** the persona layer is already *data + a decorative
mark*. Everything this plan adds is (a) one additive optional content field, (b)
one new presentational component, and (c) a container change on the rail. **No
reducer, no persistence, no engine file is touched.** The precedent for the
content field is `caseFile.dossierImage` — additive, optional, id-free, and never
serialized (`persistence.ts` serializes `GameState` only; static content
definitions are not part of a save).

---

## 1. Persona visual identity

### 1.1 Recommendation: registry-photograph portraits in Ellis's *photographic* register, but under a **duty-roster** frame, not a subject-dossier frame

Adopt the established people-as-records language — monochrome/desaturated civic
registry photography, flat institutional light, neutral wall, the same
`grayscale(0.35) contrast(0.98) brightness(0.97)` value treatment
(`styles.css:6879`) — because it is already the game's only answer to "what does
a person look like in this world," and inventing a second photographic idiom for
four characters would read as two art directions in one product.

**But do not reuse `.registry-photo` / `DossierPhoto` for personas.** Ellis's
photo means *this person is the case's subject, held in the file*
(`case81.ts:56` caption: `81-C · registry photograph`). The four presences are
not subjects; they are the people who speak to you about the subject. Rendering
them in the identical frame would state, visually, a thing the fiction denies.
The fix is cheap and entirely at the frame, not the photograph: a **new
`.persona-portrait` family** with its own crop ratio and its own authored
caption vocabulary (`Registrar · standing credential`), sharing the same
filter/border/backing values so the two read as one photographic world.

This also solves the Archivist honestly: a child in a **duty roster** is a
custodian at her post; the same child in a **subject dossier** is a child on
file. The frame carries the difference.

### 1.2 Recommendation: ONE portrait per persona; stance is a UI treatment, never a second raster

Agreed with the brief, for four reasons, in order of weight:

1. **Consistency risk.** Generated candidates drift in likeness between runs;
   five stance variants per persona is five chances for the Shepherd to become a
   different person when trust moves. One selected frame per persona removes the
   failure mode entirely rather than mitigating it.
2. **Stance is already data** with a pure resolver (`engine.ts:208`–`214`) and
   already has an authored visual vocabulary (cyan rise / coral fall,
   `styles.css:5481`–`5485`). CSS can express five bands over one photo; it
   cannot make five photos look like one person.
3. **Byte weight** against the recorded 1.9 MB-in-deploy scar: 4 assets ≈ 40 KB,
   20 assets ≈ 200 KB.
4. **Transitions.** A stance *change* must cross-fade; swapping the `src` of an
   `<img>` cannot be carried by a `clip-path`/`transform` reveal, and an
   opacity-ramp swap is exactly the recorded `annex-scene-opacity-strand`
   failure. A single stable `<img>` under a changing border/filter has no such
   frame to strand at.

The one thing the photograph itself must carry per persona is **gaze**, because
gaze is character, not state — and it is free (one staging decision per prompt,
not an extra asset).

### 1.3 Casting, derived from the authored voice

Each casting line below is derived from lines actually authored for that persona,
cited. Ages are stated because a generator will otherwise pick one.

**The Registrar** — *Custodian of legal continuity*; "A person is a chain the
city can verify." (`content.ts:35`–`39`)
> Casting: a composed civil servant of about 55, close-cropped grey hair, dark
> high-collared municipal coat, hands out of frame, **direct level gaze**, the
> expression of someone reading you as an entry rather than a person.

Derived from `case77.ts:216` ("every source traceable… line by line, in a hand
the city can read") and `case77.ts:300` ("that is a finding the record can hold…
whatever the ward feels") — institutional precision that is neither warm nor
cruel. Direct gaze: the Registrar is the one presence with standing to look
straight at an auditor.

**The Shepherd** — *Care-ward advocate*; "Care recognizes a self before procedure
does." (`content.ts:40`–`44`)
> Casting: a ward worker of about 40, hair tied back, plain care-ward tunic worn
> soft at the collar, shoulders slightly turned toward camera, **direct gaze,
> steady and tired**, a face that has been in a room with someone all night.

Derived from `case77.ts:262` ("she was a person in that room, not a file — I'll
remember the order you chose") and `case77.ts:296` ("she'll carry that you had to
hurt her before you would believe her"). Direct gaze, because the Shepherd's whole
function is refusing to look away.

**The Defector** — *Compromised systems guide*; "Every clean record is hiding who
paid for it." (`content.ts:45`–`49`)
> Casting: a former official of about 50, unshaven, collar open, a stripped-out
> credential lanyard still around the neck, body squared to camera but **eyes
> averted just off-lens**, three-quarter head turn, the pose of someone who has
> sat for this photograph before under a different name.

Derived from `case81.ts:355` ("I'd laugh, but I used to be the one holding seals
like this") and `case77.ts:364` ("the law bricked that door up for a reason —
whatever you sign through it, you own"). Averted gaze is the compromise made
visible; it is also the one contrast that makes the four-portrait set read as
four people rather than four institutional headshots.

**The Small Archivist** — *Collector of missing categories*; "What you refuse to
name still becomes evidence." (`content.ts:50`–`57`) — **a child.**
> Casting: a child of about eleven, serious and composed, dark hair, a work
> apron worn over ordinary clothes with an index tab held in one hand,
> photographed **at her post in the stacks** at three-quarter length, **direct
> level gaze**, natural neutral expression.

Derived from `case77.ts:391` ("you told me when Mara might have stopped — most
adults won't. I filed your doubt where the form keeps no box for it") and
`case77.ts:414` ("three people were on that shelf") — she is a working custodian
who out-reasons the adults, not a mascot and not a victim.

**Non-negotiable safeguards for this portrait** (these belong in the prompt's
negative constraints AND in the review checklist before the asset is accepted):
three-quarter length **not** a head-and-shoulders mugshot crop; **at work, with
her tool in hand**, not posed against a blank wall; no height chart, no ID board,
no number placard, no identifying-mark framing, no restraint, no institutional
gown, no medical context, no tears or distress, no smile-for-the-camera, no
adult-styled posing, clothing plainly age-appropriate. Her caption is authored
**off-register** on purpose — she holds no credential the city issued — which is
characterful and also removes the last mugshot connotation.

### 1.4 Exact generation spec

**Pipeline:** the same one that produced Ellis's dossier photograph —
**Higgsfield Soul Cast**, generating a **three-panel identity turnaround sheet at
2048×1152**, from which the near-frontal panel is cropped as the registry photo
(`docs/PROVENANCE.md:13`). Matching the generator, not just the prompt, is what
keeps the five photographic people in one world.

**Candidates: 2 per persona (8 generations total), user picks one each.** Same
count and selection ritual as every prior Annex asset (`PROVENANCE.md:10`, `:12`
— "second of two candidates, selected in review"). Vary between the two
candidates **only** framing/expression micro-staging; keep the style block
byte-identical so the choice is about the person, not the look.

**Shared style block** (prepended verbatim to all four prompts):

> Use case: identity portrait sheet. Asset type: monochrome civic registry
> photograph for a narrative investigation game set in a rain-dark municipal
> memory archive. One person, photographed as an institutional record: flat even
> frontal institutional light, no key-light drama, plain unlit concrete-grey wall
> at a shallow distance, no environment detail behind the subject except where
> specified. Desaturated near-monochrome with a faint cool cast; near-black,
> blue-grey and fog-grey values only. Slight photographic grain, the physical
> character of an archived print rather than a digital headshot. Sober,
> bureaucratic, humane. Composition: single subject, centred, head and shoulders
> (unless otherwise specified), generous quiet margin, vertical crop-safe.

**Shared negative constraints** (all four):

> No readable text, numbers, dates, name plates, ID boards, badges with legible
> print, signage, logos, emblems, watermarks, UI, HUD, or overlays. No height
> chart or mugshot backdrop. No weapons, restraints, uniforms of any real force,
> medical equipment, or gore. No smiling for camera, glamour lighting, beauty
> retouching, fashion styling, studio backdrop gradient, bokeh, lens flare,
> bloom, or shallow-depth portrait blur. No amber, cyan, coral, purple, or
> magenta accents — the runtime supplies every semantic colour. No resemblance to
> any real, living, or public person. No cyberpunk, no sci-fi costume, no fantasy
> ornament, no franchise reference. Not a painting or illustration.

Then one **subject block** per persona, which is the casting paragraph from §1.3
verbatim plus its gaze direction; plus, for the Archivist only, the §1.3
safeguard sentence appended to the negative constraints.

**Delivery, per persona:**

| property | value | why |
|---|---|---|
| master | `docs/assets/personas/{id}-portrait-original.png`, 2048×1152 sheet, **out of `dist/`** | matches every prior master (`PROVENANCE.md:5`, `:13`) |
| crop | near-frontal panel → **360×418** (portrait 0.861:1) | byte-identical delivery geometry to Ellis (`PROVENANCE.md:15`), so one CSS sizing rule covers both photographic idioms |
| encode | `cwebp -q 82` | the repo's standing setting for every shipped raster |
| delivery path | `public/images/personas/{id}.webp` | new folder; keeps the persona set inspectable as a set |
| **byte budget** | **≤ 12 KB each, ≤ 48 KB for all four** | Ellis is 9,410 B at the same geometry and quality; a portrait exceeding 12 KB means the crop kept background detail it should not have |
| `alt` | authored in-voice on the content field, e.g. `Registry photograph of the Registrar, custodian of legal continuity.` | mirrors `case81.ts:57` exactly |
| caption | authored per persona; three read as credentials, the Archivist's does not | see §1.1 |

**Value-matching rule (recorded scar — `annex-campaign-decisions`, the Ellis
raster ghosting entry).** A generated plate lit against a non-black surround
cannot be dropped into this dark UI raw. The binding rule for these portraits:
they are **matted, never blended** — an `<img>` inside a bordered `.persona-portrait`
frame with `--night-soft` backing and the exact registry filter values
(`styles.css:6879`), no `mix-blend-mode`, no screen composite. Acceptance is a
runtime `getComputedStyle` read of the rendered `filter` **and** an eyeball of the
portrait beside `ellis-marne-dossier.webp` at final delivery size in the dark
shell — if the four portraits sit brighter than Ellis, the crop or the encode is
wrong, not the CSS.

**Provenance requirements** (`docs/PROVENANCE.md` convention, one row per asset,
master row + derived row, as every prior asset has): generator name and version,
**seed**, master resolution, selection note ("second of two candidates, selected
in review"), the exact prompt text in a new `### Persona registry portraits`
section, the reviewed-for list (no readable text, no logos, no real-person
likeness, Archivist safeguards confirmed), and the derived row's encode
parameters and final byte count.

---

## 2. Persona entity surfaces

One new presentational component carries all of these:
**`src/components/PersonaPortrait.tsx`** — props `{ personaId, size: 'chip' | 'card' | 'sheet', stance?: TrustLabel }`. It renders the authored portrait when
`PersonaDefinition.portrait` exists and **falls back to the existing
`PersonaSigil`** when it does not. That fallback is not politeness: it is what
lets steps A–D ship before or after the user has picked portraits, and it is the
forced-colors path (§4).

Content change, additive and optional, mirroring `CaseFileDossierImage`
(`types.ts:716`–`720`) one-for-one:

```ts
// types.ts — additive, optional, never persisted
export interface PersonaPortrait { src: string; caption: string; alt: string }
export interface PersonaDefinition {
  id: PersonaId; name: string; role: string; principle: string
  portrait?: PersonaPortrait   // ← new
}
```

### 2.a Portrait chips on every attributed line

**Genre pattern borrowed: Disco Elysium's portrait-attributed voices** — a face
in the gutter of every spoken line is what turns a wall of attributed text into a
cast talking.

- **`ReactionQuotes`** (`ReactionQuotes.tsx:22`–`31`): swap the 17px
  `.reaction-sigil` for a **34px `.persona-chip` portrait**, keeping the existing
  flex row, the name, and the quote unchanged. This lands the change in **all
  four** places it renders at once (filed card `Investigation.tsx:1197`,
  model-filed dock `:1323`, event log `CaseRail.tsx:267`, detail drawer
  `SceneDetailDrawer.tsx:157`) — the component was already the single seam.
  The log variant (`variant='log'`) keeps its no-animation contract.
- **`BeatStage`** (`BeatStage.tsx:141`–`149`): the speaker line already carries
  `data-speaker={line.speaker}` on the `<p>` (`:144`). Render a **48px portrait
  inline before the name** on `scene-beat-line--speaker` only. The stanza is
  `aria-hidden` and mirrored into the live region (`:130`–`134`) — the portrait
  adds nothing to that mirror, so **no AT change at all**, which is the reason to
  do it here rather than restructure the beat.
- **Scene result strip** (`Investigation.tsx:1030`–`1039`): the standing line
  currently reads `personaName +1`. Prefix each entry with a **24px chip**. This
  is where a stance change is felt, so this is where the face should be (§2.d).

### 2.b Rail rows become compact entity cards

**Genre pattern borrowed: the persona/companion status card** (Citizen Sleeper's
drive cards, Pentiment's cast panel) — portrait, name, role, one state word.

Density is the risk (§6.3), so the recommendation is deliberately conservative:
**change the grid's second cell from `20px` to `40px` and keep `min-height: 58px`
unchanged** (`styles.css:5418`). A 40px square portrait fits inside a 58px row
with the existing 10px gap; the rail is 380px wide (`styles.css:687`), and the
name/role cell loses 20px of a `minmax(0,1fr)` that already ellipsises
(`styles.css:5529`–`5533`). Everything else in the row — signal dot, name, role,
band word, ▲▼ marker — stays exactly as authored.

Also: **drop the per-row idle "breathe" animation** for portrait rows
(`styles.css:5452`–`5464`). A pulsing opacity on an abstract mark is ambience; on
a human face it is uncanny. Sigil fallback rows keep it.

### 2.c The summonable **persona dossier** — "The people on this case"

**Genre pattern borrowed: the journal/codex character sheet** (Pentiment,
Citizen Sleeper, Disco Elysium's thought cabinet) — one screen where the cast is
a list of full cards you can read at leisure, never a thing that interrupts.

**Not a second summon.** It is a **fourth tab on the existing case-file surface**
(§3). Tab label `People`; the panel's own heading is the diegetic line
**"The people on this case"**.

Per persona, one card: portrait (`sheet` size, ~120px wide), name, role,
principle, current stance word (+ the number when `settings.showTrustNumbers`, as
`CaseRail.tsx:182` already does), and **their on-the-record lines this run**.

**Feasibility of the "lines this run" list — VERIFIED, read not run:**
`state.events` carries `{order, sourceType, sourceId, title}` (`types.ts:82`–`91`)
and `getReactionsForSource(caseId, sourceType, sourceId, precedents)`
(`content.ts:152`–`166`) returns the authored `PersonaReaction[]` for any of them.
So the assembly is a pure derivation over existing state:

```
for each event in state.events (ascending order)
  for each reaction in getReactionsForSource(state.caseId, e.sourceType, e.sourceId, state.precedents)
    if reaction.persona === personaId → { order: e.order, cite: e.title, line: reaction.line }
```

This is exactly what the event log already does per-event (`CaseRail.tsx:267`–
`274`), transposed from event-major to persona-major. **No reducer change, no new
persisted field, no content change.** Recommendation: put it in a new pure helper
`src/game/personaRecord.ts` → `personaRunLines(state, personaId)`, unit-tested
like `fieldCta`/`beats` (the repo's established discipline), so the component
stays presentational and the derivation is provable without a DOM.

Diegetic framing, no gamey chrome: card heading is the persona's name; the lines
list is captioned **"On the record this run"**; each line is cited as
`{event.title}` in mono `--fog-dim`, exactly the register the event log uses. An
empty list reads **"Nothing said on the record yet."** — not "0 quotes."

### 2.d Where stance *changes* surface

**Recommendation: both, but split by register — and add no new animation.**

- **The rail entity card keeps today's mechanism unchanged**: the 1100 ms
  cyan/coral pulse (`CaseRail.tsx:63`, suppressed under reduced motion) and the
  motion-independent ▲▼ marker retired on the next commit (`:38`–`45`, `:70`–`76`).
  It is already correct, already reduced-motion-complete, and already the answer
  to "the pulse is easy to miss." Do not reinvent it. **One change only:** the
  pulse is a `box-shadow` ring on the `<li>` (`styles.css:5481`–`5489`) — confirm
  at runtime it still reads as a ring around the row and not a halo around the
  face after the portrait lands.
- **The chip in the result strip is the quiet toast** (§2.a): the moment a
  method is filed, the face of whoever's standing moved appears beside the
  delta, on the plate, where the player is already looking
  (`Investigation.tsx:1030`–`1039`). It is a mount, not an animation, so reduced
  motion needs nothing.
- **The dossier card does not animate at all.** It is summoned; by definition the
  change happened before it opened. Animating on open would be a lie about when.

Net: zero new keyframes, zero new reduced-motion branches.

---

## 3. Minimal-HUD restructure — "just the needed"

This section **is** `scene-first-integration-plan.md` step 8, specified. It does
not create a parallel plan.

### 3.1 One summonable surface, tabbed — not two summons

**Recommendation: the persona dossier is a fourth tab on the case-file surface.**
Genre convention is overwhelming here (journal/codex with tabs: Pentiment,
Disco Elysium, Citizen Sleeper, Return of the Obra Dinn's book), and three
concrete repo facts make it the cheap answer too:

1. The rail **already has a tab bar** with correct `aria-pressed` /
   `aria-controls` / `id` wiring (`CaseRail.tsx:102`–`115`). A fourth entry is a
   one-token change to a typed union (`RailTab`, `:13`).
2. The rail is **already a self-contained column** (`App.tsx:361`) — wrapping it
   in a summon is a container change, not a rewrite, exactly as the integration
   plan states (`scene-first-integration-plan.md:86`–`90`).
3. **AT: one focus trap, not two.** Two independently-summonable dialogs over the
   same plate is the double-trap risk in §6.5; one surface with tabs removes it
   by construction.

### 3.2 Presentation: right-docked drawer ≥900px, full-height sheet <700px

**Recommendation: a right-docked focus-trapped drawer, reusing the
`SceneDetailDrawer` pattern verbatim** — portalled to `document.body`, `role="dialog"` + `aria-modal="true"`, Escape closes, Tab cycles inside, focus
returned to the summoning button on unmount, view-preference classes repeated at
the portal boundary (`SceneDetailDrawer.tsx:44`–`53`, `:55`–`75`, `:77`–`87`,
`:92`).

Rationale for a drawer over the alternatives, in one line each: a **centered
modal** fights a layout whose case column is already a right-hand 380px band
(`styles.css:687`) and throws away the spatial "the file is over there" metaphor;
**full screen** on desktop discards the scene the file is *about*, which is the
one thing scene-first exists to protect. At **375px** the drawer becomes a
full-height sheet — the same collapse the detail drawer already performs and the
pilot already captured at 375×812.

### 3.3 What stays ALWAYS-ON during investigation

Recommendation, with the argument for each, against today's chrome
(`Investigation.tsx:857`–`881` header, `:1309`–`1345` footer dock):

| element | verdict | argument |
|---|---|---|
| **Site label** (`world-caption`, `:1066`) | **KEEP** | Where you are is not information you should have to summon. One line. |
| **Objectives counter** (sites `x/y`, model, `:865`–`876`) | **KEEP** | It is the win condition, it is two tokens, and it is the only always-on answer to "why am I still here." |
| **Threshold line** (`field-threshold`, `:877`–`880`) | **KEEP, conditionally** | Onboarding copy that becomes noise once understood. Show it until the **first site is filed**, then retire it — the objectives counter carries the same fact numerically from then on. |
| **Civic alarm — only when nonzero** | **KEEP, and this is a promotion** | Alarm currently lives **only** in the rail (`CaseRail.tsx:144`–`149`). The moment the rail goes behind a summon, a raised alarm becomes invisible — a strictly worse game. Promote it to the scene chrome, rendered only when `state.alarm > 0`, in `--coral` per the existing `text-risk` convention. This is the one place the restructure *adds* always-on density, deliberately. |
| **`fieldCta` dock** (`:1336`–`1345`) | **KEEP, unchanged** | It is a pure, unit-tested function that already returns `null` while methods are on screen (`fieldCta.ts:67`; tests `fieldCta.test.ts:62`–`71`), so it self-suppresses during the choice. Move its container, touch no logic. |
| `<h1>` "Investigate the district" + `field-command-copy` (`:860`–`864`) | **DROP from view** | Both are label-for-the-page copy the scene now says better. Keep the `<h1>` as `sr-only` so the heading order and `aria-labelledby="field-heading"` survive. |
| Route breadcrumb Field→Memory→Tribunal (`:1310`–`1316`) | **DROP** | It duplicates the `fieldCta` label, which already names the next step in the same words. |
| `filed-model` details block (`:1319`–`1325`) | **MOVE** into the case-file surface (Case tab) | It is a filed record; filed records live in the file. |
| Rail case / evidence / log | **MOVE behind the summon** | This is plan Open Question 3 → §Open questions. |

### 3.4 Summon affordances on the scene chrome

**Recommendation: exactly two summon buttons, plus the existing navigation
control — three controls total on the plate.**

| control | label | state |
|---|---|---|
| existing | **"Location detail"** | already shipped, `.scene-detail-summon`, top-right of the plate (`Investigation.tsx:1051`–`1059`) |
| **new** | **"Case file"** | opens the tabbed drawer; the word already names the surface in two places (`aria-label="Case file"` at `CaseRail.tsx:87`, mobile toggle `:95`) — reusing it costs the player nothing to learn |
| existing | "← Return to concourse" | navigation, not a summon (`:1061`–`1065`) |

Both summons are plain civic nouns in the game's register, and the "Case file"
button carries the existing live counts as a `<small>` (`{n} evidence · {n} events`, exactly `CaseRail.tsx:96`–`98`) so the player can tell whether
opening it is worth it — the counts are the summon's own preview, which is what
keeps a hidden surface from feeling hidden. Two summons is also the ceiling:
a third would put more chrome on the plate than the plate has methods.

---

## 4. Binding constraints this plan complies with

1. **DOM canonical for keyboard/touch/AT.** Every persona surface added here is
   real DOM: portraits are `<img>` inside existing text rows, the dossier is a
   tab panel inside a real dialog. Nothing is gated behind the world view
   (`annex-investigation-inspector-always-mounted`), and nothing becomes reachable
   only through the scene.
2. **Focus-trapped dialogs per the existing pattern.** The case-file drawer copies
   `SceneDetailDrawer.tsx:44`–`75` (rAF focus with `preventScroll`, frame
   cancelled on unmount per the rAF-focus-after-unmount scar; Escape
   `stopPropagation` + close; Tab cycle; focus restored to the opener) and the
   `Deposition` tray's portal + repeated-preference-class boundary
   (`SceneDetailDrawer.tsx:77`–`87`).
3. **No WebGL.** Nothing here renders anything but `<img>`, CSS, and existing SVG.
4. **Reducer/persistence untouched; content additive-only.** The one content
   change is optional `PersonaDefinition.portrait?` (§2), the exact shape and
   optionality of `caseFile.dossierImage` (`types.ts:732`–`733`). No save schema
   bump: static content definitions are never serialized. `personaRunLines` is a
   pure derivation over existing `GameState` + existing content lookups.
5. **Reduced motion / high contrast / forced colors first-class.** Zero new
   keyframes (§2.d). Under **forced colors**, photographs are unreliable —
   `PersonaPortrait` renders the **sigil fallback** in `@media (forced-colors: active)`, which is the `currentColor`-only mark the sigils were built to be
   (`sigils.tsx:11`–`19`). Under **high contrast**, portraits render with the
   border promoted and the grayscale filter dropped. The idle breathe is removed
   from portrait rows outright (§2.b).
6. **Curly-punctuation civic register, no gamey chrome.** All new copy is civic
   nouns: "Case file", "The people on this case", "On the record this run",
   "Nothing said on the record yet." No badges, no XP, no "relationship level",
   no meters. Authored quote strings already carry curly quotes
   (`case77.ts:216` et al.) and are rendered verbatim.
7. **No `opacity` + `fill-mode: both` reveals.** Nothing in this plan reveals by
   opacity ramp. The drawer reuses `scene-detail-drawer-in`, whose resting style
   is the visible one (`docs/pilot-care-ward-report.md:170`–`177`).
8. **New class names grepped against existing selectors** (class-collision scar —
   the `.ellis` collision was invisible to every text assertion). **Checked in
   this session against `src/styles.css` and all `src/**/*.tsx`: `persona-card`,
   `persona-chip`, `persona-portrait`, `persona-dossier`, `dossier-sheet`,
   `casebook`, `casefile-surface`, `summon-bar`, `entity-card`, `standing-card`,
   `witness-card`, `reaction-portrait`, `beat-portrait`, `scene-summon` — all
   return 0 occurrences.** Note the near-misses that are **taken**: `.persona-list`,
   `.persona-sigil`, `.persona-signal` (`styles.css:5410`–`5446`),
   `.registry-photo*` (`:6870`–`6898`), `.room-active-card` / `.room-card-*`
   (`:8122`–`:8161`). Re-run the grep for any name added during implementation.
9. **`getComputedStyle` verification with transitions killed** (transition-clock
   scar: the pane reads the START frame) — required for the portrait `filter`
   value, the rail row height, and the drawer's docked geometry.
10. **`el.click()`** for every interaction in headless verification; synthetic
    `dispatchEvent` does not reach React (`annex-preview-pane-quirks`, and the
    pilot's own `SceneZone.commit.test.tsx` note).
11. **Evidence screenshot per distinct state**, following
    `scripts/evidence-*.mjs` convention, at **1280×800 and 375×812**: rail with
    portraits, reaction chip in the filed card, beat speaker line with portrait,
    result strip standing chip, dossier tab per persona (4), empty-dossier state,
    forced-colors fallback, high-contrast, reduced-motion, drawer open at both
    widths.

---

## 5. Migration sequence

**Where this interleaves with `scene-first-integration-plan.md` steps 6–9:**

- **Steps A–D land between plan step 5 and plan step 6** (i.e. next, before the
  rooms). Rationale: they have **zero dependency** on rooms or deposition — they
  touch `ReactionQuotes`, `BeatStage`, and the rail, all of which are already in
  their final form — and they pay off immediately inside the *already-shipped*
  Care ward pilot, where the beat and result strip are the surfaces the user just
  auditioned. Waiting for rooms delays visible payoff for no technical gain.
- **Steps E–F ARE plan step 8**, executed as its persona-aware version. They must
  not land before plan steps 6–7, because collapsing the rail behind a summon
  while the rooms still render their consoles in the inspector would hide
  in-progress ritual state.
- **Plan steps 6, 7 and 9 are unchanged and unblocked** by anything here.

Resulting order: `plan 1–5 (shipped)` → **`0, A, B, C, D`** → `plan 6` → `plan 7`
→ **`E, F, G`** ( = plan 8 ) → `plan 9`.

| # | size | step | files |
|---|---|---|---|
| **0** | **M** | **Asset generation — BLOCKED on user selection.** 8 candidates (2 per persona) per §1.4; user picks 4; crop, encode, byte-check, PROVENANCE rows + prompt section. Ships no code. | `docs/assets/personas/*-original.png`, `public/images/personas/*.webp`, `docs/PROVENANCE.md` |
| **A** | **S** | Additive content: `PersonaPortrait` type + `PersonaDefinition.portrait?`; author the four entries (src/caption/alt). No render change. Guard with a `content.test.ts` case asserting every persona either has a complete portrait triple or none. | `src/game/types.ts`, `src/game/content.ts`, `src/game/content.test.ts` |
| **B** | **S** | `PersonaPortrait.tsx` + `.persona-portrait` CSS (three sizes, stance treatment, sigil fallback, forced-colors/high-contrast branches). Unwired except a render test. | `src/components/PersonaPortrait.tsx`, `src/styles.css` |
| **C** | **S** | Wire the chips: `ReactionQuotes` (hits all four mount points at once), `BeatStage` speaker line, scene result strip standing entries. | `src/components/ReactionQuotes.tsx`, `src/scene/BeatStage.tsx`, `src/components/Investigation.tsx`, `src/styles.css` |
| **D** | **S** | Rail rows → entity cards: grid cell `20px`→`40px`, `min-height` unchanged, breathe removed on portrait rows. Debrief blockquotes take the `card` portrait in the same pass (same component, one line each). | `src/components/CaseRail.tsx`, `src/components/Debrief.tsx`, `src/styles.css` |
| **E** | **M** | `personaRunLines` pure helper + tests; `People` tab added to `RailTab`; the dossier panel. Rail still in place as a column. | `src/game/personaRecord.ts`, `src/game/personaRecord.test.ts`, `src/components/CaseRail.tsx`, `src/styles.css` |
| **F** | **M/L** | **= plan step 8.** `CaseFileDrawer` wrapper (portal + trap, `SceneDetailDrawer` pattern) hosting `CaseRail`; `"Case file"` summon on the plate with live counts; `case-layout` collapses to scene-dominant single column; always-on set reduced per §3.3 **including the alarm promotion**; full-bleed 375 pass (also closes the pilot's known 13px pressure-ring crop). | `src/App.tsx`, `src/components/CaseFileDrawer.tsx`, `src/components/CaseRail.tsx`, `src/components/Investigation.tsx`, `src/styles.css` |
| **G** | **S** | AT + preference + evidence pass: forced-colors sigil fallback verified, high-contrast, reduced-motion, keyboard-only transcript through both summons, `getComputedStyle` table, screenshots per §4.11, `dist/` byte delta recorded. | `scripts/evidence-persona-entities.mjs`, `src/styles.css` |

Every step keeps `npx vitest run`, `npx tsc -b`, `npx eslint .` green and the game
fully playable, per the repo's established step discipline.

---

## 6. Risks — top 5, each with detection and verification

**1. Portrait weight in the shipped bundle** (the recorded 1.9 MB-PNG-in-deploy
scar, `annex-mvp-shipping-backlog` item 1).
*Detection:* a hard budget — ≤12 KB per portrait, ≤48 KB for the set, against
Ellis's 9,410 B at identical geometry and quality.
*Verify:* `npm run build`, then `find dist/images/personas -type f -exec ls -l` and
a recorded before/after total `dist/` size in the step-G evidence JSON. Assert no
PNG master reaches `dist/` (the exact shape of the original scar). Fail the step
on any portrait over budget rather than shipping and revisiting.

**2. Visual inconsistency across generated candidates** — four portraits that
look like four different photographers, or a candidate whose likeness drifts from
the world.
*Detection:* review the eight candidates **as a contact sheet at final delivery
size (360×418) inside the dark shell**, never at 2048px in an image viewer —
resolution flatters, and the scar that matters is value, not detail.
*Verify:* the four selected portraits rendered beside `ellis-marne-dossier.webp`
in one screenshot at 1280×800, plus a `getComputedStyle` read of `filter` on each
`.persona-portrait img` with transitions disabled, asserting the registry values
(`grayscale(0.35) contrast(0.98) brightness(0.97)`). Acceptance is the **user's
eyeball** — this is a taste gate, and math cannot close it.

**3. Rail density regression** — a 40px portrait pushing the four rows past the
fold, or the role line ellipsising to uselessness at 380px.
*Detection:* the change is specified as width-only (`20px`→`40px` in a
`8px 20px minmax(0,1fr) auto` grid) with `min-height: 58px` unchanged
(`styles.css:5418`), so any height change is a bug, not a trade-off.
*Verify:* runtime `getBoundingClientRect().height` on each `.persona-list li`
before and after, with transitions killed, asserting equality; plus screenshots of
the Social-memory block at 1280×800 and 375×812 with all four roles legible.
**Fallback if it fails:** the portrait drops to 32px before the row height moves.

**4. AT double-announcement or a portrait becoming a second name.**
*Detection:* every persona name is **already** a text node beside its mark in all
five surfaces (`ReactionQuotes.tsx:27`, `CaseRail.tsx:177`, `Debrief.tsx:200`,
`BeatStage.tsx:27`, `Investigation.tsx:1035`), and today's sigils are all
`aria-hidden` (`ReactionQuotes.tsx:23`, `CaseRail.tsx:173`, `sigils.tsx:5`).
**Rule: chip and card portraits render `alt=""` inside an `aria-hidden` wrapper —
only the `sheet` portrait in the dossier, where the authored `alt` is the record's
own description, is exposed.**
*Verify:* an accessibility-tree dump per surface asserting **exactly one text
occurrence of each persona name**, plus the beat's live region (`BeatStage.tsx:130`–
`134`) asserted byte-identical to its pre-change output — the stanza is
`aria-hidden`, so a portrait there must change nothing an AT user hears.

**5. Modal focus-trap collision** — the case-file drawer and the detail drawer
both open, or Escape/close returning focus to a button that has since unmounted.
*Detection:* two portalled `aria-modal` dialogs over one plate is the
architectural hazard §3.1 was designed to reduce (persona dossier = a tab, not a
third dialog), leaving exactly two possible dialogs.
*Verify:* assert **mutual exclusivity** in code (opening one closes the other) and
prove it live: open A, open B, assert `document.querySelectorAll('[aria-modal="true"]').length === 1`; then a keyboard-only transcript per drawer —
summon → focus lands inside → Tab cycles without escaping → Escape closes →
`document.activeElement` is the summoning button, never `<body>` (the pilot's
transcript method, `docs/pilot-care-ward-report.md:190`–`208`, and the
focus-dropped-when-the-stanza-settled scar at `:296`–`298`).

---

## Open questions for the user

1. **Portrait frame: duty roster or subject dossier?** My recommendation is the
   photographic register of Ellis's registry photograph under a *duty-roster*
   frame with its own caption vocabulary (§1.1), so the four presences do not
   read as four more case subjects. The alternative — the identical
   `.registry-photo` treatment Ellis wears — is one less CSS family and a
   stronger "everyone in this city is a file" statement, at the cost of that
   semantic distinction. This is a fiction call, not a technical one.
2. **The Small Archivist's staging — sign off before generation.** §1.3 casts her
   at about eleven, three-quarter length, at her post in the stacks with an index
   tab in hand, direct level gaze, with explicit anti-mugshot safeguards. Please
   confirm the age and the at-work staging (or name a different one) **before**
   step 0 spends generations, since this is the one portrait where a wrong read is
   not a re-crop.
3. **Rail behind the summon on wide desktops — confirm** (this is
   `scene-first-integration-plan.md` Open Question 3, still unanswered, and step F
   cannot start without it). My recommendation is **yes, fully behind the summon**,
   made safe by the alarm promotion in §3.3 — the only always-on fact the rail
   currently monopolises. If you would rather the cast never fully disappear, the
   cheap variant is a persistent four-portrait strip on the chrome that summons
   the People tab directly; I do **not** recommend it, as it re-adds always-on
   density the redesign exists to remove.

---

## Amendment 2026-07-25 — art-direction pivot (user-ratified)

The user rejected the photoreal direction after seeing candidates ("too real...
should be an animated style distinct to this game") and selected, from three
style probes of the Registrar, **Style B: painterly noir** — expressive painterly
illustration, visible brushwork, dark gouache/dry-brush, graphic-novel noir
register, faces built from planes of muted value, edges dissolving into a
near-black ground. §1.4's generation spec is superseded as follows; everything
else in this plan (§2–§6, all sequencing, all budgets-by-role) stands, since the
sigil-fallback architecture never depended on the art style.

| property | was (§1.4) | now |
|---|---|---|
| generator | Higgsfield Soul Cast, 3-panel sheet 2048×1152 | **nano_banana_pro (Nano Banana Pro), single portrait, 2:3, 2k** |
| style block | monochrome civic registry *photograph* | **the Style B painterly-noir block, verbatim from the winning probe** |
| crop | near-frontal panel → 360×418 | **center-crop the 2:3 render → 360×418 (same delivery geometry)** |
| filter treatment | registry grayscale filter | **none needed at rest — the palette is authored into the paint; the registry filter values remain available as the high-contrast fallback** |
| candidates | 2 per persona, Soul Cast | 2 per persona, same ritual; the winning Registrar probe may stand as a candidate |

**The Ellis question (two mediums):** default adopted per review recommendation —
**the living cast is painted; Ellis's registry dossier remains photographic**,
because a photograph is what a file holds of its *subject*: the medium difference
carries the fiction's subject/staff distinction ratified with the duty-roster
frame. Revisit only if the user asks for one medium everywhere (would re-generate
`ellis-marne-dossier.webp` + scene figure in Style B).

Byte budget unchanged (≤12 KB delivered / ≤48 KB set). Archivist staging and
safeguards carried over verbatim into the painterly prompts. The eight photoreal
Soul Cast candidates are retired unused (provenance: generated 2026-07-25,
rejected at the style gate before any entered the repo).

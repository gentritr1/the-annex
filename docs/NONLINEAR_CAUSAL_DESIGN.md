# The Annex — Nonlinear Causal Design

**Status:** implementation contract for the Case 77 / Case 81 production pass  
**Research time-box:** one focused source pass, then implementation. The pass stopped gathering references once the same usable mechanisms repeated across immersive-sim, investigative, relationship-reactive, and loop structures.  
**Core rule:** `choice → immediate response → persistent environmental change → altered later affordance or resistance → hearing/debrief consequence`

This document describes mechanisms, not borrowed expression. No referenced game’s art direction, dialogue, characters, UI, lore, scene composition, or branded terminology is reproduced.

## 1. Research findings

### 1.1 Holistic level state instead of isolated narrative flags

Steve Lee’s GDC workshop argues that gameplay, presentation, and story work best when authored together, especially through affordances, intentionality, worldbuilding, and interactive storytelling. Arkane’s *Dishonored* co-direction talk similarly describes coherent systems and world fiction as the basis for player improvisation rather than a sequence of disconnected story switches.

**Mechanic adopted:** a route consequence must change at least two channels, and at least one must be spatial, environmental, or procedural. A paragraph swap is not a causal route.

**Application to The Annex:**

- A filed Registry method leaves a carrier rail, mirror mark, or closure gate in a persistent state.
- A prior checksum can change the Maintenance room’s authority reading and acoustic treatment before the player chooses a method.
- A deposition state changes Counsel occupancy, recorder, shutter, argument, objection, and sound pressure.
- Every visible state has equivalent DOM copy and remains legible under reduced motion.

**Not adopted:** freeform physics, combat, unrestricted locomotion, or a general-purpose simulation. The Annex remains a bounded authored drama.

Sources:

- Steve Lee, “Level Design Workshop: An Approach to Holistic Level Design,” GDC 2017: https://www.gdcvault.com/play/1024301/Level-Design-Workshop-An-Approach
- Harvey Smith and Raphaël Colantonio, “Empowering the Player in a Story-Rich World: Co-Directing Dishonored,” GDC 2013: https://www.gdcvault.com/play/1018062

### 1.2 Inexpensive local changes with disproportionate later impact

Eidos-Montréal’s Prague-hub talk explicitly discusses inexpensive local changes that produce larger consequences. The useful lesson is not “make a giant hub”; it is to reuse existing rooms, props, portal labels, sound filters, NPC placements, and tribunal surfaces as state carriers.

**Mechanic adopted:** bounded local mutations are authored at reconvergence points. The route graph changes a room’s interpretation and affordance without cloning the entire remainder of the case.

**Application to The Annex:**

- Existing portal outcomes carry route-specific labels and variants.
- Existing close-up plates gain state layers through React/CSS and the current world-outcome contract.
- Existing synthesized audio changes occlusion, hum, and room pressure rather than introducing decorative tracks.
- Existing tribunal and debrief components retain the route facts.

**Not adopted:** a separate map or bespoke level for every branch.

Source:

- Sylvain Douce, “A City of a Thousand Choices: Prague City Hub in Deus Ex: Mankind Divided,” GDC 2017: https://gdcvault.com/play/1024003/A-City-of-a-Thousand

### 1.3 Environmental storytelling as evidence of action

Harvey Smith and Matthias Worch’s environmental-storytelling work treats props, lighting, composition, and the player’s inference as narrative delivery. BioShock-like authored spatial drama is useful here only as a mechanism: the environment should carry a fact the player caused or failed to cause.

**Mechanic adopted:** every filed site gets a settled revisit state, and every case has a non-dialogue environmental response.

**Application to The Annex:**

- carrier latch / audit mirror;
- ward chair / handwritten card / rain filtering;
- archive drawer / taxonomy shutter;
- maintenance footprints / credential seam;
- deposition chair / recorder / consent track;
- restoration clock / seed cradle;
- service drawer / dormant seal;
- counsel tables / admissibility shutter / retained objection.

The state describes canonical facts, not moral colour. Amber, cyan, sealing, opening, or pressure do not mean “good” or “evil.”

Source:

- Harvey Smith and Matthias Worch, “What Happened Here? Environmental Storytelling,” GDC 2010: https://www.gdcvault.com/play/1012647/what-happened-here-environmental

### 1.4 Bounded reconvergence instead of a growing story tree

CD Projekt RED’s nonlinear-narrative talk foregrounds both branching models and their design/production costs. Cassie Phillipps’s efficient-branching talk distinguishes rerouting choices from defining choices. The relevant production principle is to branch where the player acts, retain facts through the shared middle, then reconverge at a hearing that remembers the route.

**Mechanic adopted:** authored openings, a small number of ordered collisions, and shared reconstruction/tribunal/debrief surfaces.

**Application to The Annex:**

- Four approaches stage four different first rooms or encounters.
- The player is released into the same four-site case after the opening.
- Only selected site pairs have authored order consequences.
- All lawful findings remain available.
- The tribunal changes support, objection, admissibility framing, environmental staging, and precedent text without multiplying verdict implementations.

**Not adopted:** a generic branching-dialogue tree, hundreds of permanent booleans, or a unique late-game scene for every permutation.

Sources:

- Marcin Blacha and Mateusz Tomaszkiewicz, “Schrodinger’s Cat in a Mercedes: Making Games with Nonlinear Narrative,” GDC 2013: https://www.gdcvault.com/play/1017730/Schrodinger-s-Cat-in-a
- Cassie Phillipps, “All Choice No Consequence: Efficiently Branching Narrative,” GDC 2016: https://www.gdcvault.com/play/1023409/All-Choice-No-Consequence-Efficiently

### 1.5 Investigation that permits incomplete knowledge and irreversible judgment

Josh Sawyer’s discussion of *Pentiment* describes an investigation designed around incomplete confidence: it does not canonize a single culprit and instead asks what the player values under bad conditions. The hearing is not a checklist for a correct ending.

**Mechanic adopted:** reconstruction knowledge has three explicit states—unknown, known but unsupported, corroborated. A model may be filed with one corroborated and one speculative known anchor, but the cost is explicit and persistent.

**Application to The Annex:**

- Unknown anchors show no decisive full content.
- Two corroborated anchors may be filed.
- One corroborated plus one known unsupported anchor may be filed after acknowledgement.
- Two unsupported anchors may not be filed.
- A speculative anchor creates a tribunal objection and remains contested in debrief/event facts.
- Evidence collection never locks a lawful verdict or reveals a perfect route.

**Not adopted:** suspect elimination, a hidden solution score, or an author-approved correct finding.

Source:

- Josh Sawyer interview, “Making Pentiment’s most macabre murder mysteries,” Game Developer, 2022: https://www.gamedeveloper.com/design/making-pentiment-s-most-macabre-murder-mysteries

### 1.6 Relationship micro-reactivity that changes conduct, not endings

Justin Keenan’s GDC talk describes the cost and value of detailed narrative reactivity. The useful boundary for The Annex is to turn existing trust into deterministic conduct at a shared hearing rather than author a massive dialogue lattice.

**Mechanic adopted:** trust determines one supporter and one objector at explicit thresholds. The result changes who volunteers evidence/protection, who objects or withdraws, and whether two NPCs address each other. It never grants a secret good verdict.

**Application to The Annex:**

- Supporter: highest trust at `+2` or above.
- Objector: lowest trust at `−1` or below.
- Ties resolve through a fixed per-case persona order.
- When both exist, they address each other directly.
- No threshold removes a lawful finding; absence of support means a harder-feeling but completable procedure.

**Not adopted:** random relationship checks, persuasion rolls, romance systems, or a hidden morality score.

Source:

- Justin Keenan, “Disco Elysium: Meaningless Choices and Impractical Advice,” GDC 2021: https://www.gdcvault.com/play/1027160/-Disco-Elysium-Meaningless-Choices

### 1.7 Knowledge and replay shortcuts without replay erasure

*The Forgotten City* developer interview describes knowledge as the lasting power in a loop and highlights shortcuts for already-repeated dialogue/tasks. Arkane’s *Mooncrash* talk provides a complementary lesson: existing mechanics can be dismantled and recombined around a reset structure without discarding authored content.

**Mechanic adopted:** already-seen passive beats receive fast transcript, skip-seen, and optional per-beat auto-advance. Irreversible filing confirmations remain mandatory.

**Application to The Annex:**

- Seen-beat IDs live in a separate capped local preference store.
- They do not enter canonical case state, event facts, precedents, or save migration.
- Reduced motion reveals the transcript immediately.
- A new route still plays its authored beat once before the shortcut appears.

**Not adopted:** loop inventory, quest delegation, temporal simulation, or knowledge that silently changes canonical facts.

Sources:

- Nick Pearce interview, “Depth, direction, agency: The looping narrative structure of The Forgotten City,” Game Developer, 2021: https://www.gamedeveloper.com/design/delving-into-the-narrative-structure-of-the-forgotten-city
- Rich Wilson, “Mooncrash: Resetting the Immersive Simulation,” GDC 2019: https://www.gdcvault.com/play/1026375/-Mooncrash-Resetting-the-Immersive

## 2. Route graph

Legend:

- `→` canonical action order;
- `[P]` procedural mutation;
- `[E]` environmental mutation;
- `[S]` spatial mutation;
- `[I]` informational mutation;
- `[N]` social/NPC mutation;
- `[L]` legal/hearing mutation;
- dashed reconvergence means the route retains facts but rejoins a shared phase.

### 2.1 Case 77

```text
APPROACH
  Procedure → Registry Intake / Registrar / custody rail
  Care      → Care Ward 12 / Shepherd + 77-A / visitor chair
  Covert    → Maintenance Spine / Defector / rain-shadow
  Inquiry   → Small Archive / Archivist / open taxonomy drawer
        |
        v
OPEN FOUR-SITE FIELD
        |
        +-- Registry: trace late checksum
        |       → Maintenance entered later
        |       → linked mark-04 authority reading [E][P][I]
        |       → filed maintenance method establishes bounded coordination fact [L]
        |
        +-- Maintenance: forge authority
        |       → Registry entered later
        |       → elevated gate, light, hum, and traced-authority acknowledgement [S][E][P]
        |       → evidence admitted; authority path remains attributed [L]
        |
        +-- Care: listen to 77-A
        |       → temporary “Mara” request + ordinary tea request [N]
        |       → Archive entered later with handwritten Mara card [S][P]
        |       → name remains non-evidentiary [L]
        |
        +-- Care: pressure-test 77-A
        |       → guarded “77-A” request + ordinary window request [N]
        |       → Archive entered later with blank-name / 77-A card [S][P]
        |       → request remains separate from consent/personhood [L]
        |
        +-- Skip Care
                → valid investigation
                → pre-hearing subject chair empty; no name or want invented [S][N]
                → tribunal/debrief explicitly retain unheard-subject fact [L]
        |
        v
RECONSTRUCTION
  two corroborated anchors
       OR
  one corroborated + one acknowledged speculative known anchor
        |
        v
TRIBUNAL
  ordered route facts + subject staging + deterministic supporter/objector
        |
        v
VERDICT → SKIPPABLE TABLEAU → DEBRIEF/PRECEDENT
```

### 2.2 Case 81

```text
APPROACH
  Procedure → Deposition Suite / Registrar / recorder armed
  Care      → Deposition Suite / Shepherd + Ellis / shutter held
  Covert    → Records Annex / Defector / dormant seal
  Inquiry   → Restoration Lab / Archivist / minute-four clock
        |
        v
OPEN FOUR-SITE FIELD
        |
        +-- Deposition route
        |     voluntary protected use
        |     refused use
        |     compelled/unasked use
        |     or no deposition account
        |       → Counsel entered later
        |       → Voss + Quill occupancy, witness-chair position,
        |          recorder state, admissibility shutter, available argument,
        |          live objection, and acoustics [S][E][P][N][L]
        |
        +-- Records: forge dormant seal
        |       → live trace and inherited security pressure in Counsel [E][P][L]
        |       → prior Case 77 forgery increases the pressure without deciding the result
        |
        +-- Other sites
                → persistent filed drawer/clock/seed/brief states on revisit [S][E][P]
        |
        v
RECONSTRUCTION
  same explicit knowledge-state contract
        |
        v
TRIBUNAL
  Counsel consent state + live objection + support/objector exchange retained
        |
        v
VERDICT → SKIPPABLE TABLEAU → DEBRIEF/PRECEDENT
```

## 3. State and persistence plan

### 3.1 Canonical sources

Canonical case facts remain exclusively reducible from `GameState` in `src/game/engine.ts`:

- ordered `completedActions`;
- `completedSites`;
- admitted `evidence`;
- `trust`;
- `alarm`;
- `tribunalOverride`;
- `depositionRecord`;
- `precedents`;
- filed reconstruction event facts.

The causal layer does not mutate state. It is a pure authored selector over the reducer-owned facts.

### 3.2 New persisted fact shape

No schema-version bump is required. `GameEvent` gains an optional reconstruction-only `facts` object:

```ts
interface GameEventFacts {
  speculativeFragments?: FragmentId[]
  anchorStates?: Record<FragmentId, 'known' | 'corroborated'>
}
```

Reasons:

1. A filed model must preserve whether an anchor was speculative at commitment time, even if later field evidence corroborates the same fragment.
2. The data belongs to the irreversible reconstruction event, not to a mutable global branch flag.
3. Optional tolerance lets old schema-2 saves load unchanged.
4. Persistence validates every fragment ID against the active case and rejects malformed knowledge values.

### 3.3 Derived, non-persisted state

The following are always recomputed:

- current approach opening;
- current fragment knowledge before filing;
- ordered route chains and their primed/resolved phase;
- persistent site outcome labels and acoustic treatment;
- supporter/objector and tie result;
- 77-A pre-hearing request/staging;
- Ellis’s ordinary detail;
- Counsel occupants, shutter, argument, objection, and security pressure;
- immediate aftermath tableau.

This prevents duplicate truth and keeps migrations bounded.

### 3.4 View-local and preference state

These never enter canonical state:

- whether the player acknowledged a room’s changed procedural presentation on this visit;
- whether an immediate aftermath tableau was dismissed;
- which passive beat is currently revealing;
- capped `seen beat` IDs used only for replay convenience.

Accessibility settings remain in their existing independent settings block. Causal progress cannot toggle reduced motion, contrast, text size, subtitle plate, or sound.

## 4. Consequence matrix

| Trigger | Immediate response | Persistent world state | Later affordance/resistance | Hearing/debrief consequence | Channels |
|---|---|---|---|---|---|
| Case 77 Procedure opening | Registrar meets player at custody rail | Registry close-up staged first | Rail ritual is first objective; all sites then reopen | Approach remains in event history | S, E, P, N |
| Case 77 Care opening | 77-A is present before file language | Visitor chair and rain-soft ward staging | Listen or pressure shapes later Archive card | Requested address retained as non-evidence | S, E, P, N, L |
| Registry checksum → Maintenance | Mark 04 changes corridor reading | linked authority signal and altered occlusion/hum | explicit linked-reading acknowledgement before method | coordination may be argued only in this order | E, P, I, L |
| Maintenance forgery → Registry | Registry inherits forged hand | raised light/security/hum at gate | traced-authority acknowledgement before rail | authority path admitted and attributed | S, E, P, L |
| Care listen → Archive | Archive receives “Mara — temporary” | physical card remains in drawer/shelf state | category interaction starts from requested address | address does not become proof | S, P, N, L |
| Care pressure → Archive | Archive receives guarded “77-A” | blank name field remains physically separate | category interaction cannot infer consent | pressure and request remain distinct | S, P, N, L |
| Skip Care | no subject encounter in field | hearing-side chair remains empty | no support can be invented from subject consent | tribunal/debrief preserve unheard absence | S, N, L |
| File one unsupported reconstruction anchor | explicit acknowledgement before commit | event permanently stores speculative fragment | live authored objection; anchor never displays as corroborated | contested cost remains in precedent/debrief | P, I, L |
| Trust ≥ +2 | NPC volunteers support/protection | supporter occupies hearing position | corroboration/protection is offered | support line enters hearing; no verdict unlock | N, P, L |
| Trust ≤ −1 | NPC files objection/withdraws aid | objector occupies hearing position | player proceeds through contested lawful route | objection remains; no verdict lock | N, P, L |
| Both support and objection | NPCs address each other | shared hearing staging | direct argument exposes proof limits | exchange retained in hearing | N, L |
| Case 81 voluntary deposition → Counsel | Ellis’s yes remains beside account | both advocates, chair, recorder, open-to-review shutter | protected-use argument available | Quill objects to commission despite consent | S, E, P, N, L |
| Case 81 refusal → Counsel | refusal lamp overlays transcript | empty chair and half-closed shutter | use must answer refusal | live objection persists at tribunal | S, E, P, N, L |
| Case 81 compelled/unasked → Counsel | pressure sequence or blank consent track | barred/notched shutter and changed hum | argument is narrowed by actual record | tribunal retains compulsion/unknown willingness | S, E, P, N, L |
| Case 81 no deposition → Counsel | briefs exist without account | witness chair absent; shutter closed | neither advocate may represent Ellis’s wishes | tribunal cannot invent consent/testimony | S, P, N, L |
| Records forgery/prior Vale forgery | scanner rechecks authority | live civic trace under Counsel floor | security acknowledgement and resistance | authority remains admissible but unclean | E, P, L |
| Verdict committed | no new reducer mutation | short tableau expresses existing facts | skippable; written debrief remains | outcome cost is made spatially immediate | S, E, L |
| Seen passive beat | replay controls appear | separate capped preference history | fast transcript / skip / auto-advance | filing confirmation remains irreversible | P |

## 5. Exact production scope

### Canonical engine and persistence

- Add reconstruction event facts for anchor knowledge at filing time.
- Reject selection of unknown fragments in the reducer.
- Reject reconstruction submission unless exactly two anchors are known and at least one is corroborated.
- Keep all reconstruction/decision outcomes deterministic.
- Decode old schema-2 saves with missing event facts unchanged.
- Validate any present event facts against active-case fragment IDs.

### Authored content and selectors

- Author eight approach openings with first site, presence, environmental cue, and objective.
- Author settled states for every field action across both cases.
- Author four Case 77 ordered chains and two Case 81 ordered chains.
- Derive all route variants from existing action order, evidence, trust, alarm, deposition, and precedent facts.
- Author deterministic support/objection lines and direct exchanges.
- Author 77-A request/want/absence variants, Ellis ordinary details, both Counsel advocates, and outcome tableaux.

### Components and world presentation

- Stage the approach’s initial site instead of always opening the concourse/first list item.
- Display persistent causal room state in the inspector and portal switcher.
- Reuse existing close-up/world/audio systems for changed spatial/environmental state.
- Add one explicit procedural gate where an ordered chain changes how the next room must be read.
- Replace reconstruction leak with sanitized unknown anchors and explicit speculation acknowledgement.
- Add Counsel variation, tribunal route memory, supporter/objector exchange, and immediate aftermath.
- Add replay controls for already-seen staged beats.
- Add semantic equivalents and responsive/reduced-motion styling.

### Verification

- Reducer and selector tests for every route invariant.
- Persistence round-trip and malformed-fact rejection.
- Existing cross-reference, content, component, scene, accessibility, and migration suites.
- `npm run lint`, `npm run test`, `npm run build`.
- Browser playthroughs at desktop, `390×844`, `320×568`, and reduced motion with console-error capture.

## 6. Controls against combinatorial explosion

1. **No route enum.** Site order is read from the existing ordered action IDs.
2. **No permanent room-state flags.** Settled states derive from the action filed at that site.
3. **No consent duplicate.** Counsel reads the existing `depositionRecord`.
4. **No relationship branch tree.** One support selector and one objection selector use fixed thresholds and tie orders.
5. **No verdict multiplication.** Every lawful finding remains in the common tribunal; route facts alter framing, resistance, staging, and precedent.
6. **No full-path scene copies.** Each chain mutates a shared target room and then reconverges.
7. **No speculative-evidence promotion.** The reconstruction event stores commitment-time knowledge rather than modifying admitted evidence.
8. **No presentation truth.** CSS, audio, and tableau components express reducer facts and never dispatch new case facts.
9. **No accessibility coupling.** Settings are neither conditions nor consequences of case choices.
10. **No random outcomes.** Every selector is a pure, stable function; ties use authored order.
11. **No generic dialogue system.** Only the scenes required to prove the pattern are authored.
12. **No new case.** The framework is proven across Cases 77 and 81 before extension.

## 7. Extension contract for future cases

A future case may join this framework only when it supplies:

- four approach openings or a documented smaller shared approach vocabulary;
- fragment knowledge rules that never expose unknown decisive content;
- one settled state for every field action;
- at most a small authored set of ordered chains with an explicit reconvergence point;
- support/objection lines for the shared cast or a documented deterministic replacement;
- one outcome tableau per decision;
- at least one environmental or procedural response;
- automated tests proving determinism, persistence, completion, and accessibility.

A proposed chain should be rejected when it changes only dialogue, requires a new permanent flag that can be derived, removes a lawful verdict, implies a moral score, or creates a bespoke downstream branch with no reconvergence plan.

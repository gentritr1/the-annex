# The Annex — In-Game HUD Prototype Brief

**Status:** Design exploration brief  
**Audience:** Product designers, UI/UX agents, frontend prototype agents, game-design reviewers  
**Last updated:** 2026-08-02  
**Prototype target:** The complete playable loop, with Case 77 as the primary visual test case and Case 81 as the anti-reskin validation case

## Why this document exists

The Annex already has a playable deterministic game loop, authored scenes, a cinematic investigation HUD, bounded spatial worlds, reconstruction, tribunal decisions, accessibility modes, and persistent replay memory.

The next HUD prototypes should not invent a different game. They should test how clearly and naturally the current game communicates:

- where the player is;
- what the player can do now;
- what will become irreversible;
- what entered the official record;
- who was affected by the method used;
- what remains uncertain;
- why another run may reveal a different interpretation.

This is a design exploration brief, not permission to change canonical game rules. Prototype agents may reorganize presentation, hierarchy, motion, and interaction feedback. They must not silently change evidence, trust, access, alarm, reconstruction validity, findings, save data, or run history.

## Product and emotional north star

The player is a civic auditor working after midnight inside infrastructure that stores human memory. The interface should feel precise enough to trust, rain-dark and quietly uncanny, but centered on people rather than technology for its own sake.

The HUD is not a cockpit and not a dashboard floating over a game. It is the visible edge of a municipal procedure taking place inside a human crisis.

The desired emotional rhythm is:

> orient → become curious → choose a method → feel its human cost → build an interpretation → accept uncertainty → rule → wonder what another method would have revealed

Retention should come from unresolved interpretation and remembered treatment, not from noisy meters, busywork, loot, or artificial urgency.

## Canonical gameplay loop

```mermaid
flowchart LR
  A["Briefing: choose an opening posture"] --> B["Concourse: orient in the case world"]
  B --> C["Enter a location"]
  C --> D["Inspect and choose one method"]
  D --> E["Review irreversible filing"]
  E --> F["Commit evidence, relationships, trace, and source-backed anchors"]
  F --> G{"Two sites filed?"}
  G -- "No" --> B
  G -- "Yes" --> H["Reconstruction: pair two known anchors"]
  H --> I["Preview argument, support, and limitation"]
  I --> J["File one bounded model"]
  J --> K["Tribunal: hear the subject and set legal reach"]
  K --> L["Issue a finding"]
  L --> M["Debrief: consequences, contradictions, and remembered method"]
  M --> N["Replay with residual knowledge"]
  N --> A
```

### Core player verbs

1. **Orient** — understand the active case, immediate objective, available thresholds, and filed-record budget.
2. **Enter** — choose a location in the world rather than from a detached menu.
3. **Inspect** — read the room, its people, its ritual, and its available methods.
4. **Choose** — select a method that changes what the record can honestly contain.
5. **Review** — see the cost and finality before filing.
6. **File** — commit one authored outcome through the deterministic engine.
7. **Listen** — receive the consequence beat and character response without another decision competing for attention.
8. **Reconstruct** — combine two source-backed anchors into one bounded interpretation.
9. **Rule** — decide legal personhood and legal reach without pretending the metaphysical question is settled.
10. **Reflect and replay** — see consequences, remembered treatment, remaining contradictions, and a reason to try another method.

## Rules prototypes must preserve

### Canonical state ownership

- `src/game/engine.ts` owns deterministic, serializable game state.
- UI and rendering layers project state and dispatch explicit actions.
- The HUD never owns or invents evidence, trust, alarm, access, findings, or dialogue.
- Three.js worlds, motion, lighting, particles, and sound are presentation-only.
- A model or generative system may propose presentation or interpretation, but it must never silently mutate canonical state.

### Investigation commitment

- Each case offers four field locations.
- The player may file exactly two locations in a normal run.
- Each filed location accepts one method; the alternative closes for the run.
- Unfiled locations remain inspectable after the budget is reached, but cannot be added to the filed record.
- An irreversible action must have a clear review state before commitment.

### Evidence and reconstruction

- Every discovered reconstruction anchor has an authored site, action, source, and reveal.
- The reconstruction uses exactly two known anchors and requires at least one corroborated anchor.
- The player sees the resulting argument, its support, and its limitation before filing it.
- The preview and the submitted reconstruction resolve through the same deterministic selector.

### Tribunal and personhood

- The affected person is present before legal findings.
- Subject-hearing presence is explicitly non-evidentiary.
- All ordinary lawful findings remain available once prerequisites are met.
- Only authored override findings may be route-gated.
- The UI may clarify consequences; it must not label a ruling morally correct.

## The current HUD system

The current investigation HUD uses a world-first perimeter composition.

### Persistent regions

| Region | Current responsibility | Required meaning |
|---|---|---|
| Upper left | Case identity and current objective | “Where am I, and what matters now?” |
| Upper right | Filed sites, evidence count, trace, Case File, Evidence | “What has entered the record?” |
| Center | Authored world, room, portal, ritual, or close read | “What place or person am I acting upon?” |
| Lower left | Character channel, consequence dialogue, or current exchange | “Who is speaking, and what did my method mean to them?” |
| Lower right | Contextual actions and irreversible confirmation | “What can I do now?” |
| Overlays | Case File, Evidence, location detail, accessibility preferences | “What can I inspect without changing the case?” |

### Current semantic color roles

- **Service amber:** player action, active commitment, human warmth.
- **Archive cyan:** authenticated record, verified evidence, stable focus reinforcement.
- **Civic coral:** trace, irreversible risk, unresolved conflict.
- **Record white:** essential narrative and instruction.
- **Archive fog:** secondary context only; never essential body copy.
- **Night / concrete / raised:** architectural depth and reading surfaces.

Do not swap these meanings for visual variety.

### Current input grammar

- Visible pointer/touch controls are at least 44px high.
- Tab remains ordinary focus navigation.
- `Alt+C` opens the Case File and `Alt+E` opens Evidence when no higher-priority state owns input.
- Enter/Space activates focused controls.
- A consequence beat is player-paced and may also accept a deliberate non-modifier key.
- Modal drawers trap focus, inert the background, and return focus to their opener.
- Reduced motion, high contrast, larger text, Easy Read, subtitle plate, forced colors, and safe-area insets are first-class modes.

## Attention-state contract

A strong prototype should make one layer dominant at a time. The game may display persistent context, but only one surface should ask for action.

| State | Player question | Must dominate | May remain quiet | Must not compete |
|---|---|---|---|---|
| Briefing | “How do I begin?” | Opening posture and its exact remembered effect | Subject/public record | World navigation, evidence tools |
| Concourse | “Where should I go?” | World thresholds and one suggested entry | Case identity, 0/2 progress | Dialogue, method controls |
| Location arrival | “What is this place?” | Room identity and readable environmental premise | Case progress | Filing action before the room is understood |
| Method preview | “What kind of action is this?” | One method description and cost | Alternative method, location detail | Evidence archive and unrelated counters |
| Armed filing | “Am I sure?” | Exact method, finality, file/cancel | Case identity and filed-site count | Other methods, navigation, codex shortcuts |
| Consequence beat | “What just happened?” | Current speaker and latest one or two lines | Case identity and settled counters | New site choices, evidence browsing, competing prompts |
| Filed result | “What entered the record?” | Evidence, source-backed anchors, relationship/trace result | Character reaction | Another irreversible decision |
| Filing budget reached | “What was omitted?” | 2/2 state and route to reconstruction | Inspectable omitted locations | Disabled-looking controls with no explanation |
| Reconstruction selection | “What can these facts support?” | Anchor identity, source, corroboration | Case File | Verdict hints, relationship optimization |
| Reconstruction preview | “What argument am I filing?” | Thesis, support, limitation, finality | Selected anchors | Tribunal outcome forecasting |
| Tribunal opening | “Who is affected?” | Subject hearing and case sufficiency | Evidence/model summary | Final finding before the person is heard |
| Tribunal decision | “What law am I making?” | Precedent scope and lawful findings | Live objection, unresolved contradictions | Decorative world interaction |
| Debrief | “What changed, and why replay?” | Consequences, remembered method, remaining contradiction | Run metrics | New-case pressure or score chasing |

## Ambience contract

### Case 77 — The Rain Ledger

- Submerged civic archive below stormwater level.
- Rain and pressure infrastructure are functional worldbuilding, not a visual filter.
- Severe concrete, smoked bronze, black ceramic, wet reflections, and narrow warm service light.
- Human warmth appears locally: a lamp, a portrait, a voice, a remembered request.
- The world should feel watchful and inhabited, not like generic neon cyberpunk.

### Case 81 — The Deposition Annex

- Dry legal counterpart to Case 77.
- Pale record metal, scored stone, suspended dust, still clerestory light, and controlled acoustics.
- Testimony and consent are the primary atmosphere; rain language should not leak into this case.
- The deposition must remain a legal and interpersonal interaction, not become another four-door evidence hub with a different skin.

### Motion

- Normal UI transitions: 150–250ms, purposeful, ease-out.
- Spatial camera journey: approximately 480–520ms, followed by a source-anchored aperture no longer than 360ms.
- Motion communicates entry, selection, state change, or consequence—never decoration alone.
- Reduced motion replaces camera journeys with immediate authored poster states.
- Content must already be visible in its resting state; animation cannot be required for legibility.

### Sound

- Ambient sound is opt-in and begins only after a real user gesture.
- Weather, ventilation, room tone, and restrained machinery may change perspective by location.
- Audio never becomes the only carrier of evidence, instruction, cost, or state.
- Dialogue structure must remain subtitles-ready even when no voice acting exists.

## Current strengths to retain

- The environment owns most of the viewport.
- The HUD is a projection of authored state rather than a second game system.
- Irreversible choices use explicit arm/review/file grammar.
- Case File and Evidence are semantic, keyboard-accessible DOM surfaces.
- Dialogue is player-paced and now preserves speaker identity while older lines leave cleanly.
- The two-site budget gives routes meaning and supports replay.
- Reconstruction exposes uncertainty rather than hiding it behind a score.
- The tribunal distinguishes evidence from a person’s ordinary request.
- Accessibility preferences are independent from case progress.

## Current design tensions worth prototyping

1. **Persistent context versus scene focus.** Case identity, objective, counters, dialogue, prompts, and the world can all be visible together. Prototypes should test when persistent information should dim, compress, or disappear.
2. **Corner separation.** Dialogue and its Continue control live in different corners. This preserves the world but may weaken their relationship.
3. **Objective repetition.** The objective, interaction hint, room copy, and primary action can paraphrase one another.
4. **Counter meaning.** Sites and evidence are useful orientation, but repeated counters can make the experience feel like a dashboard or collection game.
5. **Consequence density.** The immediate beat should feel human; the complete evidence/source/trust record belongs in the filed result or Case File.
6. **Mobile stacking.** At phone width, title, status, dialogue, and actions can occupy most of the viewport even when each part is individually readable.
7. **Case distinction.** One HUD grammar must support both the spatial rain-ledger case and the testimony-led deposition case without flattening their identities.
8. **Replay invitation.** The interface should expose meaningful omission and contradiction without turning future routes into a checklist.

## Prototype directions

Build the directions as presentation-only alternatives over the same fixture states. Do not fork engine rules to make a concept look better.

### Direction A — Perimeter Registry

**Recommendation:** Start here. It evolves the shipped composition with the lowest implementation risk.

**Hypothesis:** The current world-first HUD becomes clearer if each corner has one stable responsibility and nonessential regions enter a quiet state whenever dialogue or commitment owns attention.

**Composition:**

- Case/objective remains upper left.
- Record counters and codex tools remain upper right.
- Dialogue remains lower left.
- Contextual action remains lower right.
- During a consequence beat, objective detail and record controls soften while the speaker plate and Continue action visually connect through alignment, shared baseline, or a restrained route line.
- During confirmation, every nonessential surface recedes while File and Cancel remain explicit.

**What this tests:**

- Whether stronger quiet states solve overload without changing the established layout.
- Whether dialogue and its continuation control can feel like one exchange while staying at opposite edges.
- Whether persistent counters remain helpful when their contrast responds to attention state.

**Primary risk:** It may improve polish without changing the deeper feeling that several unrelated instruments surround the world.

### Direction B — Focus Channel

**Hypothesis:** The HUD should behave like a single civic channel that changes role with the current verb, while only compact case identity and filed-record status persist.

**Composition:**

- A small permanent header keeps case identity and 0/2 progress.
- One adaptive channel occupies the lower third and changes between orientation, method preview, confirmation, dialogue, and result.
- The channel retains stable typography and control placement even as content changes.
- Case File and Evidence remain summoned overlays, not persistent buttons during every state.
- The world receives more uninterrupted space, especially on mobile.

**What this tests:**

- Whether one contextual channel reduces cognitive load and repeated copy.
- Whether a stable action area improves learned interaction across rooms and cases.
- Whether hiding codex tools until summoned harms orientation.

**Primary risk:** The adaptive region may feel like a conventional game dialogue box and reduce the distinct municipal-instrument character.

### Direction C — Split Record

**Hypothesis:** The strongest version may accept less visual purity in exchange for a clearer relationship between world, testimony, and official record.

**Composition:**

- The upper 65–72% remains the spatial world.
- A persistent bottom record band contains the current speaker, latest statement, contextual action, and a compact filed-result transition.
- Case identity and progress compress into the top edge or the record band.
- The band expands for confirmation and filed results, then returns to a shallow resting state.
- Mobile uses the same vertical order rather than overlaying several fixed plates.

**What this tests:**

- Whether a single anchored record surface makes dialogue and action feel more natural.
- Whether source/evidence feedback can appear without covering the world.
- Whether this layout produces the best mobile behavior.

**Primary risk:** It may feel less immersive or too similar to a narrative-adventure subtitle tray if its materials and motion are generic.

## Required prototype fixture states

Every direction must render the same states so comparisons are honest.

1. Fresh Case 77 concourse, Care opening posture, 0/2 sites.
2. Care Ward arrival with two available methods.
3. “Let 77-A tell one memory uninterrupted” method preview.
4. Armed filing review with File and Cancel.
5. Mid-consequence beat showing **The Shepherd** and one current line.
6. Completed consequence beat showing **The Shepherd** and the latest two lines.
7. Filed result with evidence, source-backed anchors, relationship change, and no trace increase.
8. Two-site budget reached while an omitted location remains inspectable.
9. Reconstruction with two anchors selected and the model preview visible.
10. Tribunal opening with subject hearing before findings.
11. Case 81 deposition consent state.
12. Case 81 tribunal state proving the concept does not depend on rain-ledger imagery.

### Responsive and accessibility fixtures

- Desktop: 1440×900 and 1280×720.
- Small laptop: 1024×768.
- Phone portrait: 390×844 and minimum supported 320×568.
- Phone landscape: 844×390.
- Keyboard-only focus pass.
- Reduced motion.
- High contrast.
- Larger text.
- Easy Read.
- Subtitle plate.
- Forced colors where supported.
- Longest realistic case title, objective, speaker name, dialogue line, evidence title, and action label.

## Prototype evaluation rubric

Score each category from 1–5. A concept that violates a non-negotiable constraint is not eligible to win, regardless of total score.

| Category | Weight | Evaluation question |
|---|---:|---|
| Immediate clarity | 25% | Can a new player identify the current objective and primary action within five seconds? |
| Attention control | 20% | Does one layer clearly own the moment during exploration, confirmation, dialogue, and ruling? |
| World presence | 15% | Does the environment remain the primary spatial experience rather than background art behind UI? |
| Narrative humanity | 15% | Are the speaker, affected person, and consequence more memorable than the counters? |
| Commitment confidence | 10% | Can the player distinguish preview, armed, filed, and settled states without hesitation? |
| Accessibility and responsive behavior | 10% | Does the structure remain complete and operable across the required modes and sizes? |
| Case portability | 5% | Does it serve both Case 77 and Case 81 without making them feel like reskins? |

### Non-negotiable pass conditions

- No essential text below WCAG 2.2 AA contrast.
- No text clipping, silent line clamp, or inaccessible overflow.
- No action below a 44×44px target where touch applies.
- No horizontal page scroll at supported widths.
- No hidden irreversible consequence.
- No second source of canonical game state.
- No essential meaning conveyed only by color, audio, hover, animation, or WebGL.
- No prototype-specific evidence, trust, alarm, or outcome logic.
- No generic neon-cyberpunk, glass dashboard, or decorative terminal noise.

## Prototype deliverables for agents

Each prototype agent should return:

1. A short written hypothesis.
2. The direction name and any deliberate deviation from this brief.
3. Interactive implementation over fixture data or a presentation-only flag.
4. Desktop and mobile screenshots for every required attention state.
5. A 30–60 second capture showing exploration → confirmation → consequence → filed result.
6. Keyboard and accessibility notes.
7. The completed evaluation rubric with evidence, not preference alone.
8. Three strengths, three observed failures, and one recommendation: advance, combine, or reject.
9. Confirmation that canonical engine and persistence files were not changed.

Prototype code should be isolated behind a presentation-only switch, story/harness, or separate branch. Do not make three permanent HUD systems coexist in production code.

## Suggested comparison process

1. Prototype Direction A first as the control/evolution of the shipped HUD.
2. Build Directions B and C from the same fixture states in parallel.
3. Review all concepts first without explanation: record five-second clarity and emotional preference.
4. Run the complete fixture matrix.
5. Score independently using the rubric.
6. Combine only proven strengths; do not average all three layouts into one overloaded compromise.
7. Test the winning combined direction in a complete Case 77 run and one Case 81 route.
8. Only then plan production integration.

## Agent handoff prompt

Copy this block into a new agent task and replace `[DIRECTION]`:

```text
Create a presentation-only in-game HUD prototype for The Annex using Direction [DIRECTION] from docs/IN_GAME_HUD_PROTOTYPE_BRIEF.md.

Read PRODUCT.md, DESIGN.md, docs/CINEMATIC_HUD.md, docs/3D_AMBIENCE_SLICE.md, and the prototype brief completely before changing anything. Inspect the existing CinematicHud, BeatStage, Investigation, Reconstruction, Tribunal, and accessibility treatments.

Preserve the deterministic gameplay loop and all canonical engine behavior. Do not edit engine rules, authored evidence effects, trust, alarm, access, outcomes, persistence, or run history to support the prototype. The prototype is a projection of existing state.

Implement the required fixture states at desktop and mobile sizes, including keyboard, reduced-motion, high-contrast, larger-text, Easy Read, and subtitle-plate checks. Keep the world primary, make one attention owner obvious in each state, and expose irreversible consequences before commitment.

Return screenshots, a short interaction capture, the completed rubric, observed failures, and an advance/combine/reject recommendation. Do not claim success from aesthetics alone.
```

## Source map

Read these before implementation:

- Product and design system: `PRODUCT.md`, `DESIGN.md`
- Current HUD contract: `docs/CINEMATIC_HUD.md`
- Spatial and ambience contract: `docs/3D_AMBIENCE_SLICE.md`
- Story and universe: `docs/GAME_CONTENT_STORY_BIBLE_AND_AUDIT.md`
- Canonical rules: `src/game/engine.ts`
- Authored cases: `src/game/cases/case77.ts`, `src/game/cases/case81.ts`
- Investigation orchestration: `src/components/Investigation.tsx`
- Investigation HUD: `src/components/CinematicHud.tsx`
- Cinematic phase HUD: `src/components/CinematicPhaseHud.tsx`
- Consequence dialogue: `src/scene/BeatStage.tsx`
- Reconstruction: `src/components/Reconstruction.tsx`, `src/scene/MemoryLatticeStage.tsx`
- Tribunal: `src/components/Tribunal.tsx`, `src/scene/TribunalChamber.tsx`
- Main visual system: `src/styles.css`, `src/cinematicHud.css`

## Deferred systems and anti-goals

Do not use a HUD prototype as a back door for:

- first-person locomotion, physics, collision, combat, or open-world scope;
- unrestricted AI dialogue;
- voiced-dialogue production;
- new evidence, trust, alarm, or ending systems;
- a morality score;
- quest-marker clutter;
- additional currencies, collectibles, or retention meters;
- a new design system unrelated to The Midnight Registry;
- a full rewrite of Case 77 or Case 81.

Those may be separate future projects. This exploration asks one focused question: **which HUD structure best lets the current game world, human stakes, and irreversible civic decisions remain understandable at the same time?**

## Decision record template

After prototype review, append a short decision:

```markdown
## HUD prototype decision — YYYY-MM-DD

**Selected direction:**

**Why it won:**

**Evidence:**

**Strengths to combine from other directions:**

**Rejected ideas and why:**

**Remaining risks:**

**Production integration boundary:**
```

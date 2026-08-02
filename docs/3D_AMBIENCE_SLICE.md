# Cases 77 and 81 — bounded 3D ambience slice

## Creative north star

**The Rain Ledger** is an original civic-deco memory archive built below the
city's stormwater level. Rain is not decoration: the archive routes it through
pressure wells to cool memory infrastructure. Smoked bronze records institutional
age, black ceramic carries human records, and severe concrete keeps the place
public rather than luxurious.

**The Deposition Annex** is its dry legal counterpart: pale record metal, scored
stone, suspended dust, a testimony dais, and four chamber thresholds held under
still clerestory light. Its dryness is canonical—Case 81 never borrows Case 77's
rain language. The deposition close read brings Ellis into human scale without
turning the account into an automatic legal finding.

The scene borrows only broad mood qualities from dystopian and submerged
immersive fiction: oppressive scale, worn civic ornament, tactile machinery, and
environmental storytelling. It does not reproduce another franchise's
architecture, terminology, characters, props, or color language.

## What is playable

- Both cases have distinct bounded Three.js hubs with authored home cameras,
  bounded drag look, and four camera destinations.
- Four projected DOM portals and the persistent location switcher call the same
  `SiteId` selection path in each case. Portrait layouts keep all four 48px
  threshold controls visible through the approved poster projection.
- The Case 77 rain-ledger monument and stormwell, and the Case 81 testimony dais,
  dust shafts, record geometry, threshold kit, shadows, and architectural lights
  are presentation only.
- Filed, selected, opened, sealed, and alarm states alter the place without
  granting the renderer any game-state authority.
- Optional ambient audio changes acoustic perspective by camera destination
  after a user gesture.
- Case 81's Deposition Suite opens a semantic four-beat transcript from either
  in-scene method ring; entering it does not silently file evidence or settle
  testimony use.

## Rendering contract

- WebGL is lazy progressive enhancement over a complete authored poster.
- Reduced motion stays on the poster and skips the renderer entirely.
- The world renders an initial frame, authored state changes, camera travel, and
  direct drag only. It returns to an idle render loop after each.
- Rendering pauses offscreen and while the document is hidden.
- Geometry, materials, textures, listeners, observers, and the WebGL context are
  disposed when the scene is covered or unmounted.
- Device pixel ratio is capped, textures are WebP runtime derivatives, repeated
  geometry is cached, and static soft shadows update only when geometry state
  changes.

## Narrative injection seams

New writing should enter through authored content, not through the renderer:

1. Add or revise sites, actions, outcomes, dialogue, and evidence in
   `src/game/content.ts` or a registered case module.
2. Keep canonical effects in `src/game/engine.ts`.
3. Use `SceneWorldPortal.siteId` as the only bridge from a spatial threshold to
   the investigation flow.
4. Derive environmental payoffs from committed authored outcomes, as the current
   opened seam and sealed shutter do.
5. Keep all essential names, instructions, costs, evidence, and dialogue in
   semantic DOM surfaces.

## Deliberately deferred

This ambience slice does not add first-person locomotion, collision, physics,
combat, a character rig, unrestricted NPC dialogue, or an open district. Those
are gameplay-system projects with different accessibility, performance, content,
and testing requirements. A later inhabitable-room pilot should start with the
Maintenance Spine because its route geometry, acoustic states, and authored
methods already exist.

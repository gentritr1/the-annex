# Cinematic investigation HUD

For presentation-only HUD explorations, shared fixture states, and the agent
handoff rubric, see `docs/IN_GAME_HUD_PROTOTYPE_BRIEF.md`.

## North star

Case 77 now presents its spatial investigation as a playable world with
perimeter HUD, not as a dashboard around a 3D panel. The approved composition is
preserved at:

`docs/assets/hud/case77-cinematic-hud-approved.png`

The implementation inherits the project’s existing civic-deco material language
and uses broad immersive-fiction qualities—world-first composition, restrained
diegetic instrumentation, player-paced dialogue, and an in-game codex—without
copying another game’s terminology, interface, architecture, or iconography.

## Gameplay composition

- The Three.js concourse or authored close-up owns the full viewport.
- The upper-left HUD names the active case and current actionable objective.
- The upper-right HUD reports filed sites, admitted evidence, civic trace, and
  opens the real Case File or Evidence view.
- Authored location copy, method previews, and post-filing character reactions
  occupy a cinematic lower third.
- Contextual actions sit at the lower-right; world portals remain the sole
  location picker.
- `BeatStage` remains the player-paced cinematic dialogue system after a commit.
- The existing focus-trapped case-file drawer remains the codex. Evidence can be
  opened directly without creating a second overlay or second game state.

## State and writing contract

The HUD is a projection of existing state and callbacks:

- `src/game/engine.ts` remains the only owner of canonical progress.
- `src/components/Investigation.tsx` derives objectives, counters, reactions,
  and contextual prompts from the same authored content used by the record.
- `src/components/CinematicHud.tsx` owns no evidence, trust, alarm, outcome, or
  run state.
- A cinematic beat begins only after the corresponding field action has already
  committed.
- New narrative belongs in the registered case content. The HUD should never
  invent or persist dialogue.

## Input and accessibility

- Every HUD action is a visible 44px-or-larger button for mouse, keyboard, touch,
  and assistive technology.
- Tab remains ordinary focus navigation.
- Optional `Alt+C` and `Alt+E` chords open Case File and Evidence. They are
  disabled while camera travel, dialogue, or another overlay owns input.
- The hidden legacy inspector is inert in the spatial presentation; its stable
  room-console host is reparented into the scene before becoming interactive.
- Reduced motion skips WebGL and uses the authored poster with an idle render
  loop.
- High contrast, larger text, easy read, subtitle plate, forced colors, and safe
  area insets have explicit HUD treatments.
- Non-spatial Case 81 retains its existing investigation layout.

## Verification evidence

- `evidence/cinematic-hud/desktop-concourse-1280x720.png`
- `evidence/cinematic-hud/mobile-post-filing-375x812.png`
- `evidence/cinematic-hud/measurements.json`

The recorded checks cover 1280×720 desktop, 375×812 small phone, 844×390
landscape, high-contrast larger text, reduced motion, active civic trace,
console/HUD separation, keyboard codex shortcuts, focus trapping, and direct
Evidence orientation.

## Scope boundary

This is a production-quality cinematic vertical slice, not a claim that the
browser MVP now contains the full systems budget of a commercial AAA game.
First-person locomotion, collision, physics, character rigs, animation graphs,
AI schedules, voiced dialogue, streaming levels, and production audio remain
separate gameplay projects.

import type {
  AcousticShadowPhaseId,
  AcousticShadowPlateState,
  AcousticShadowRoomDefinition,
  AcousticShadowStageId,
} from './types'

// The pure state machine behind the Maintenance Spine's Acoustic Shadow room. It
// is a plain reducer — no React, no DOM, no Date.now, no Math.random, no timers —
// so every transition is unit-testable in isolation, and the AcousticShadowRoom
// component is a thin view over it. Nothing here is persisted: the caller (a React
// component) holds the state view-locally, so leaving the site or reloading resets
// it, exactly like the classification room. The reducer resolves every announcement
// string from the authored definition it is handed, so the aria-live copy stays in
// the content layer and out of the component.
//
// The room is one occupied place, not a scrolling list. At each checkpoint the
// player reads one discrete authored sensor-pulse state, advances the pulse
// manually ("Listen for the next pulse" — no clock, no deadline), and chooses one
// of two physically named shadow bands. An EXPOSED band waits (the beam reaches it
// first): no failure, no restart, no progress lost, the attempt is recorded and
// visible. A MASKED band crosses to the next checkpoint. After the third crossing
// the route is ready and the two canonical methods take the stage.

export interface AcousticShadowState {
  // Which checkpoint the crossing is at (0-based). Equals checkpoints.length once
  // the route is ready (past the final checkpoint) — no checkpoint derives in.
  checkpointIndex: number
  // The pulse currently shown at the active checkpoint. Reset to 0 on each crossing.
  pulseIndex: number
  // checkpointId -> band ids tried WHILE EXPOSED at that checkpoint, in press order.
  // Recorded so the view can show a non-punitive "waited" trace; never blocks a
  // later masked crossing of the same band.
  attempts: Readonly<Record<string, readonly string[]>>
  // The route is plotted (the third checkpoint was crossed). Gates the methods.
  routeReady: boolean
  // The last state-change line, for the view's aria-live region. Empty at rest so
  // an initial render never announces.
  lastAnnouncement: string
}

export type AcousticShadowEvent =
  | { type: 'LISTEN' }
  | { type: 'CHOOSE_BAND'; bandId: string }

export function initialAcousticShadowState(): AcousticShadowState {
  return {
    checkpointIndex: 0,
    pulseIndex: 0,
    attempts: {},
    routeReady: false,
    lastAnnouncement: '',
  }
}

// The active checkpoint, or undefined once the route is ready (index past the last).
export function activeCheckpoint(
  state: AcousticShadowState,
  room: AcousticShadowRoomDefinition,
) {
  return room.checkpoints[state.checkpointIndex]
}

// The pulse currently presented at the active checkpoint, or undefined if none.
export function currentPulse(
  state: AcousticShadowState,
  room: AcousticShadowRoomDefinition,
) {
  return activeCheckpoint(state, room)?.pulses[state.pulseIndex]
}

// The band ids tried-while-exposed at the active checkpoint (empty once ready).
function attemptedBandIds(
  state: AcousticShadowState,
  room: AcousticShadowRoomDefinition,
): readonly string[] {
  const checkpoint = activeCheckpoint(state, room)
  if (!checkpoint) return []
  return state.attempts[checkpoint.id] ?? []
}

// The derived lifecycle phase (never stored). 'survey' is the pristine first look;
// 'crossing' is any active checkpoint the player has begun reading; 'route-ready'
// is the plotted-but-not-crossed state where the two methods appear.
export function acousticShadowPhase(
  state: AcousticShadowState,
  room: AcousticShadowRoomDefinition,
): AcousticShadowPhaseId {
  if (state.routeReady) return 'route-ready'
  const pristine =
    state.checkpointIndex === 0 &&
    state.pulseIndex === 0 &&
    attemptedBandIds(state, room).length === 0
  return pristine ? 'survey' : 'crossing'
}

// The decorative plate presentation handed up to the close-read stage.
export function acousticShadowPlate(
  state: AcousticShadowState,
  room: AcousticShadowRoomDefinition,
): AcousticShadowPlateState {
  return {
    phase: acousticShadowPhase(state, room),
    checkpointIndex: state.checkpointIndex,
    pulseIndex: state.pulseIndex,
    routeReady: state.routeReady,
    attemptedCount: attemptedBandIds(state, room).length,
  }
}

// The plate stage a presentation emphasises. A fixed mapping onto the authored zone
// vocabulary so the close-read plate can march near → mid → far into the corridor
// as checkpoints are crossed, then drift to the sealed credential door once the
// final method choice becomes available. Never the amber door before route-ready.
const CROSSING_STAGES: readonly AcousticShadowStageId[] = ['near', 'mid', 'far']

export function acousticShadowStageFor(
  plate: AcousticShadowPlateState,
): AcousticShadowStageId {
  if (plate.routeReady || plate.phase === 'route-ready') return 'credential'
  if (plate.phase === 'survey') return 'near'
  return CROSSING_STAGES[Math.min(plate.checkpointIndex, CROSSING_STAGES.length - 1)]!
}

// Whether the two canonical methods are available. Pure read of state — the exact
// gate the view unlocks the methods behind, mirrored so tests read one source.
export function acousticShadowUnlocked(state: AcousticShadowState): boolean {
  return state.routeReady
}

export function acousticShadowReducer(
  state: AcousticShadowState,
  event: AcousticShadowEvent,
  room: AcousticShadowRoomDefinition,
): AcousticShadowState {
  switch (event.type) {
    case 'LISTEN': {
      // Advancing the pulse is inert once the route is ready (no active checkpoint).
      const checkpoint = activeCheckpoint(state, room)
      if (state.routeReady || !checkpoint || checkpoint.pulses.length === 0) return state
      const pulseIndex = (state.pulseIndex + 1) % checkpoint.pulses.length
      const pulse = checkpoint.pulses[pulseIndex]!
      return { ...state, pulseIndex, lastAnnouncement: pulse.reading }
    }

    case 'CHOOSE_BAND': {
      const checkpoint = activeCheckpoint(state, room)
      if (state.routeReady || !checkpoint) return state
      const band = checkpoint.bands.find((candidate) => candidate.id === event.bandId)
      const pulse = checkpoint.pulses[state.pulseIndex]
      if (!band || !pulse) return state

      const exposure = pulse.exposure[band.id]
      if (exposure === 'masked') {
        // Cross on the blind interval. Advance to the next checkpoint, or plot the
        // route if this was the last. Progress is never lost; the pulse resets.
        const isLast = state.checkpointIndex >= room.checkpoints.length - 1
        return {
          ...state,
          checkpointIndex: state.checkpointIndex + 1,
          pulseIndex: 0,
          routeReady: isLast ? true : state.routeReady,
          lastAnnouncement: checkpoint.crossLine,
        }
      }

      // Exposed: the beam reaches it first, so the investigator waits. No failure,
      // no restart, no progress lost — the attempt is recorded (visible, once).
      const tried = state.attempts[checkpoint.id] ?? []
      if (tried.includes(band.id) && state.lastAnnouncement === band.exposedLine) {
        // Re-pressing the same exposed band with its line already showing is a
        // strict no-op (never re-announces redundantly).
        return state
      }
      const nextTried = tried.includes(band.id) ? tried : [...tried, band.id]
      return {
        ...state,
        attempts: { ...state.attempts, [checkpoint.id]: nextTried },
        lastAnnouncement: band.exposedLine,
      }
    }

    default:
      return state
  }
}

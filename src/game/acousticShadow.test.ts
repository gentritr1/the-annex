import { describe, expect, it } from 'vitest'
import { getCaseContent } from './content'
import {
  acousticShadowPhase,
  acousticShadowPlate,
  acousticShadowReducer,
  acousticShadowStageFor,
  acousticShadowUnlocked,
  activeCheckpoint,
  currentPulse,
  initialAcousticShadowState,
  type AcousticShadowEvent,
  type AcousticShadowState,
} from './acousticShadow'
import type {
  AcousticShadowCheckpointDefinition,
  AcousticShadowRoomDefinition,
} from './types'

// The Maintenance Spine is the only authored acoustic-shadow room today; its
// definition is the fixture the pure reducer is exercised against. The test reads
// authored ids only — never hardcodes case content beyond resolving the fixture.
const room: AcousticShadowRoomDefinition = (() => {
  const site = getCaseContent('case-77').sites.find((candidate) => candidate.acousticShadow)
  if (!site?.acousticShadow) throw new Error('expected an authored acoustic-shadow room')
  return site.acousticShadow
})()

function play(
  events: readonly AcousticShadowEvent[],
  start: AcousticShadowState = initialAcousticShadowState(),
): AcousticShadowState {
  return events.reduce((state, event) => acousticShadowReducer(state, event, room), start)
}

// The single blind interval authored for a checkpoint: the (pulseIndex, bandId)
// where exactly one band is masked. Derived from content so the test never pins a
// literal id — mirrors the content-test invariant that exactly one exists.
function blindInterval(checkpoint: AcousticShadowCheckpointDefinition): {
  pulseIndex: number
  bandId: string
} {
  const found: { pulseIndex: number; bandId: string }[] = []
  checkpoint.pulses.forEach((pulse, pulseIndex) => {
    checkpoint.bands.forEach((band) => {
      if (pulse.exposure[band.id] === 'masked') found.push({ pulseIndex, bandId: band.id })
    })
  })
  expect(found).toHaveLength(1)
  return found[0]!
}

// Advance the pulse (via LISTEN) to a target index, then choose the masked band —
// the trusted crossing of one checkpoint. Determinism relies only on LISTEN cycling.
function crossCheckpoint(
  state: AcousticShadowState,
  checkpoint: AcousticShadowCheckpointDefinition,
): AcousticShadowState {
  const { pulseIndex, bandId } = blindInterval(checkpoint)
  const listens: AcousticShadowEvent[] = Array.from({ length: pulseIndex }, () => ({
    type: 'LISTEN',
  }))
  return play([...listens, { type: 'CHOOSE_BAND', bandId }], state)
}

describe('acoustic shadow reducer', () => {
  it('has exactly three checkpoints, each with two bands and one blind interval', () => {
    expect(room.checkpoints).toHaveLength(3)
    room.checkpoints.forEach((checkpoint) => {
      expect(checkpoint.bands).toHaveLength(2)
      expect(checkpoint.pulses.length).toBeGreaterThanOrEqual(2)
      // Exactly one (pulse, band) is masked — blindInterval asserts the count.
      blindInterval(checkpoint)
    })
  })

  it('starts on survey at the first checkpoint with nothing announced', () => {
    const state = initialAcousticShadowState()
    expect(state.checkpointIndex).toBe(0)
    expect(state.pulseIndex).toBe(0)
    expect(state.routeReady).toBe(false)
    expect(state.lastAnnouncement).toBe('')
    expect(acousticShadowPhase(state, room)).toBe('survey')
    expect(activeCheckpoint(state, room)?.id).toBe(room.checkpoints[0]!.id)
  })

  it('advances the pulse cyclically on LISTEN and announces the new reading', () => {
    const checkpoint = room.checkpoints[0]!
    let state = initialAcousticShadowState()
    for (let step = 1; step <= checkpoint.pulses.length; step += 1) {
      state = acousticShadowReducer(state, { type: 'LISTEN' }, room)
      const expectedIndex = step % checkpoint.pulses.length
      expect(state.pulseIndex).toBe(expectedIndex)
      expect(state.lastAnnouncement).toBe(checkpoint.pulses[expectedIndex]!.reading)
    }
    // After a full cycle the pulse index is back to 0 (cyclic, never out of range).
    expect(state.pulseIndex).toBe(0)
    // Listening leaves survey once the pristine condition breaks (pulse moved).
    const moved = acousticShadowReducer(initialAcousticShadowState(), { type: 'LISTEN' }, room)
    expect(acousticShadowPhase(moved, room)).toBe('crossing')
  })

  it('choosing an EXPOSED band never advances, records the attempt, and is non-punitive', () => {
    const checkpoint = room.checkpoints[0]!
    const { pulseIndex, bandId: maskedBandId } = blindInterval(checkpoint)
    // Pick a band that is EXPOSED at pulse 0 (the pristine survey pulse).
    const exposedBand = checkpoint.bands.find(
      (band) => checkpoint.pulses[0]!.exposure[band.id] === 'exposed',
    )!
    const state = acousticShadowReducer(
      initialAcousticShadowState(),
      { type: 'CHOOSE_BAND', bandId: exposedBand.id },
      room,
    )
    // No progress: same checkpoint, pulse unchanged, not route-ready.
    expect(state.checkpointIndex).toBe(0)
    expect(state.routeReady).toBe(false)
    expect(state.lastAnnouncement).toBe(exposedBand.exposedLine)
    // The attempt is recorded (visible) and non-blocking.
    expect(state.attempts[checkpoint.id]).toEqual([exposedBand.id])
    expect(acousticShadowPlate(state, room).attemptedCount).toBe(1)

    // Re-pressing the same exposed band with its line already showing is a no-op.
    const again = acousticShadowReducer(state, { type: 'CHOOSE_BAND', bandId: exposedBand.id }, room)
    expect(again).toBe(state)

    // The masked band still crosses afterwards — the attempt punished nothing.
    void pulseIndex
    void maskedBandId
    const crossed = crossCheckpoint(state, checkpoint)
    expect(crossed.checkpointIndex).toBe(1)
  })

  it('choosing the MASKED band at the blind interval advances the checkpoint', () => {
    const checkpoint = room.checkpoints[0]!
    const crossed = crossCheckpoint(initialAcousticShadowState(), checkpoint)
    expect(crossed.checkpointIndex).toBe(1)
    expect(crossed.pulseIndex).toBe(0)
    expect(crossed.routeReady).toBe(false)
    expect(crossed.lastAnnouncement).toBe(checkpoint.crossLine)
    expect(acousticShadowPhase(crossed, room)).toBe('crossing')
    expect(activeCheckpoint(crossed, room)?.id).toBe(room.checkpoints[1]!.id)
  })

  it('reaches the route-ready boundary EXACTLY after the third crossing, not before', () => {
    let state = initialAcousticShadowState()
    // First two crossings: never route-ready, methods locked.
    state = crossCheckpoint(state, room.checkpoints[0]!)
    expect(acousticShadowUnlocked(state)).toBe(false)
    expect(acousticShadowPhase(state, room)).not.toBe('route-ready')
    state = crossCheckpoint(state, room.checkpoints[1]!)
    expect(acousticShadowUnlocked(state)).toBe(false)
    expect(acousticShadowPhase(state, room)).not.toBe('route-ready')

    // Third crossing flips route-ready exactly once, at index === checkpoints.length.
    state = crossCheckpoint(state, room.checkpoints[2]!)
    expect(state.routeReady).toBe(true)
    expect(state.checkpointIndex).toBe(room.checkpoints.length)
    expect(acousticShadowUnlocked(state)).toBe(true)
    expect(acousticShadowPhase(state, room)).toBe('route-ready')
    expect(state.lastAnnouncement).toBe(room.checkpoints[2]!.crossLine)
    // The plate reports the route-ready credential drift.
    expect(acousticShadowStageFor(acousticShadowPlate(state, room))).toBe('credential')
  })

  it('methods stay locked (route not ready) through every pre-final state', () => {
    // Only route-ready unlocks; survey and crossing never do.
    expect(acousticShadowUnlocked(initialAcousticShadowState())).toBe(false)
    const mid = crossCheckpoint(initialAcousticShadowState(), room.checkpoints[0]!)
    expect(acousticShadowUnlocked(mid)).toBe(false)
  })

  it('is inert once the route is ready — LISTEN and CHOOSE_BAND are no-ops', () => {
    let state = initialAcousticShadowState()
    room.checkpoints.forEach((checkpoint) => {
      state = crossCheckpoint(state, checkpoint)
    })
    expect(state.routeReady).toBe(true)
    expect(activeCheckpoint(state, room)).toBeUndefined()
    expect(currentPulse(state, room)).toBeUndefined()
    // Both events return the SAME state object (strict no-op) once ready.
    expect(acousticShadowReducer(state, { type: 'LISTEN' }, room)).toBe(state)
    expect(
      acousticShadowReducer(state, { type: 'CHOOSE_BAND', bandId: room.checkpoints[0]!.bands[0]!.id }, room),
    ).toBe(state)
  })

  it('treats unknown bands and out-of-order/degenerate events as strict no-ops', () => {
    const base = initialAcousticShadowState()
    // Unknown band id is a no-op.
    expect(acousticShadowReducer(base, { type: 'CHOOSE_BAND', bandId: 'no-such-band' }, room)).toBe(base)
    // A band id valid at another checkpoint but not this one is a no-op here.
    const foreignBand = room.checkpoints[2]!.bands[0]!.id
    if (!room.checkpoints[0]!.bands.some((band) => band.id === foreignBand)) {
      expect(acousticShadowReducer(base, { type: 'CHOOSE_BAND', bandId: foreignBand }, room)).toBe(base)
    }
    // An unknown event type is a no-op.
    expect(
      acousticShadowReducer(base, { type: 'UNKNOWN' } as unknown as AcousticShadowEvent, room),
    ).toBe(base)
  })

  it('resets to the survey start on remount (fresh initial state)', () => {
    // Simulates a location switch / reload: the caller re-derives initial state.
    let state = initialAcousticShadowState()
    state = crossCheckpoint(state, room.checkpoints[0]!)
    expect(state.checkpointIndex).toBe(1)
    const remounted = initialAcousticShadowState()
    expect(remounted).toEqual({
      checkpointIndex: 0,
      pulseIndex: 0,
      attempts: {},
      routeReady: false,
      lastAnnouncement: '',
    })
    expect(acousticShadowPhase(remounted, room)).toBe('survey')
  })

  it('is deterministic: the same event sequence yields the same state', () => {
    const c0 = blindInterval(room.checkpoints[0]!)
    const c1 = blindInterval(room.checkpoints[1]!)
    const sequence: AcousticShadowEvent[] = [
      { type: 'LISTEN' },
      { type: 'CHOOSE_BAND', bandId: room.checkpoints[0]!.bands[0]!.id },
      ...Array.from({ length: c0.pulseIndex }, () => ({ type: 'LISTEN' }) as AcousticShadowEvent),
      { type: 'CHOOSE_BAND', bandId: c0.bandId },
      ...Array.from({ length: c1.pulseIndex }, () => ({ type: 'LISTEN' }) as AcousticShadowEvent),
      { type: 'CHOOSE_BAND', bandId: c1.bandId },
    ]
    expect(play(sequence)).toEqual(play(sequence))
  })

  it('maps the derived phase to a plate stage across the crossing depth', () => {
    // survey → near; crossing marches near → mid → far; route-ready → credential.
    expect(acousticShadowStageFor(acousticShadowPlate(initialAcousticShadowState(), room))).toBe('near')
    let state = acousticShadowReducer(initialAcousticShadowState(), { type: 'LISTEN' }, room)
    expect(acousticShadowStageFor(acousticShadowPlate(state, room))).toBe('near')
    state = crossCheckpoint(initialAcousticShadowState(), room.checkpoints[0]!)
    expect(acousticShadowStageFor(acousticShadowPlate(state, room))).toBe('mid')
    state = crossCheckpoint(state, room.checkpoints[1]!)
    expect(acousticShadowStageFor(acousticShadowPlate(state, room))).toBe('far')
    state = crossCheckpoint(state, room.checkpoints[2]!)
    expect(acousticShadowStageFor(acousticShadowPlate(state, room))).toBe('credential')
  })
})

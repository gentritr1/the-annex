import { describe, expect, it } from 'vitest'
import { getCaseContent } from './content'
import {
  allCarriersSeated,
  custodyRailPhase,
  custodyRailPlate,
  custodyRailReducer,
  custodyRailStageFor,
  custodyRailUnlocked,
  initialCustodyRailState,
  type CustodyRailEvent,
  type CustodyRailState,
} from './custodyRail'
import type { CustodyRailDefinition } from './types'

const room: CustodyRailDefinition = (() => {
  const site = getCaseContent('case-77').sites.find(
    (candidate) => candidate.custodyRail,
  )
  if (!site?.custodyRail) throw new Error('expected an authored custody rail')
  return site.custodyRail
})()

function play(
  events: readonly CustodyRailEvent[],
  start: CustodyRailState = initialCustodyRailState(),
): CustodyRailState {
  return events.reduce(
    (state, event) => custodyRailReducer(state, event, room),
    start,
  )
}

function seatAll(order = room.carriers.map((carrier) => carrier.id)) {
  return play(
    order.map((carrierId) => ({ type: 'SEAT_CARRIER', carrierId })),
  )
}

function reachReading() {
  return play(
    [
      ...room.carriers.map(
        (carrier) =>
          ({ type: 'SEAT_CARRIER', carrierId: carrier.id }) as CustodyRailEvent,
      ),
      { type: 'TRY_LATE_CARRIER' },
      { type: 'READ_MIRROR' },
    ],
  )
}

describe('custody rail reducer', () => {
  it('starts pristine with exactly three authored carriers and no announcement', () => {
    const state = initialCustodyRailState()
    expect(room.carriers).toHaveLength(3)
    expect(state).toEqual({
      seatedCarrierIds: [],
      lateCarrierTried: false,
      mirrorRead: false,
      proceeded: false,
      lastAnnouncement: '',
    })
    expect(custodyRailPhase(state, room)).toBe('intake')
    expect(custodyRailUnlocked(state)).toBe(false)
  })

  it('seats a known carrier once and announces its authored response', () => {
    const carrier = room.carriers[1]!
    const state = custodyRailReducer(
      initialCustodyRailState(),
      { type: 'SEAT_CARRIER', carrierId: carrier.id },
      room,
    )
    expect(state.seatedCarrierIds).toEqual([carrier.id])
    expect(state.lastAnnouncement).toBe(carrier.seatedLine)

    const duplicate = custodyRailReducer(
      state,
      { type: 'SEAT_CARRIER', carrierId: carrier.id },
      room,
    )
    expect(duplicate).toBe(state)
  })

  it('treats an unknown carrier as a strict no-op', () => {
    const state = initialCustodyRailState()
    expect(
      custodyRailReducer(
        state,
        { type: 'SEAT_CARRIER', carrierId: 'not-a-carrier' },
        room,
      ),
    ).toBe(state)
  })

  it('accepts arbitrary handling order but normalizes the rail to authored order', () => {
    const reverse = [...room.carriers]
      .reverse()
      .map((carrier) => carrier.id)
    const forward = room.carriers.map((carrier) => carrier.id)
    const reversedState = seatAll(reverse)
    const forwardState = seatAll(forward)

    expect(reversedState.seatedCarrierIds).toEqual(forward)
    expect(reversedState).toEqual(forwardState)
    expect(reversedState.lastAnnouncement).toBe(room.closureLine)
  })

  it('reaches the late-carrier boundary exactly after the third seat', () => {
    let state = initialCustodyRailState()
    room.carriers.slice(0, 2).forEach((carrier) => {
      state = custodyRailReducer(
        state,
        { type: 'SEAT_CARRIER', carrierId: carrier.id },
        room,
      )
      expect(allCarriersSeated(state, room)).toBe(false)
      expect(custodyRailPhase(state, room)).toBe('intake')
    })
    state = custodyRailReducer(
      state,
      { type: 'SEAT_CARRIER', carrierId: room.carriers[2]!.id },
      room,
    )
    expect(allCarriersSeated(state, room)).toBe(true)
    expect(custodyRailPhase(state, room)).toBe('late-carrier')
    expect(state.lastAnnouncement).toBe(room.closureLine)
  })

  it('cannot test the unassigned carrier before official intake closes', () => {
    const state = initialCustodyRailState()
    expect(
      custodyRailReducer(state, { type: 'TRY_LATE_CARRIER' }, room),
    ).toBe(state)

    const partial = play([
      { type: 'SEAT_CARRIER', carrierId: room.carriers[0]!.id },
      { type: 'SEAT_CARRIER', carrierId: room.carriers[1]!.id },
    ])
    expect(
      custodyRailReducer(partial, { type: 'TRY_LATE_CARRIER' }, room),
    ).toBe(partial)
  })

  it('refuses the late carrier once, then makes the mirror the next phase', () => {
    const closed = seatAll()
    const refused = custodyRailReducer(
      closed,
      { type: 'TRY_LATE_CARRIER' },
      room,
    )
    expect(refused.lateCarrierTried).toBe(true)
    expect(refused.lastAnnouncement).toBe(room.lateCarrier.refusalLine)
    expect(custodyRailPhase(refused, room)).toBe('mirror')

    expect(
      custodyRailReducer(refused, { type: 'TRY_LATE_CARRIER' }, room),
    ).toBe(refused)
  })

  it('keeps the mirror inert until refusal, then reveals its stationary reading', () => {
    const closed = seatAll()
    expect(custodyRailReducer(closed, { type: 'READ_MIRROR' }, room)).toBe(
      closed,
    )

    const refused = custodyRailReducer(
      closed,
      { type: 'TRY_LATE_CARRIER' },
      room,
    )
    const reading = custodyRailReducer(
      refused,
      { type: 'READ_MIRROR' },
      room,
    )
    expect(reading.mirrorRead).toBe(true)
    expect(reading.lastAnnouncement).toBe(room.mirror.readLine)
    expect(custodyRailPhase(reading, room)).toBe('reading')
    expect(custodyRailUnlocked(reading)).toBe(true)

    expect(
      custodyRailReducer(reading, { type: 'READ_MIRROR' }, room),
    ).toBe(reading)
  })

  it('does not proceed before discovery; proceeding clears the live line', () => {
    const closed = seatAll()
    expect(
      custodyRailReducer(closed, { type: 'PROCEED_TO_METHODS' }, room),
    ).toBe(closed)

    const reading = reachReading()
    const methods = custodyRailReducer(
      reading,
      { type: 'PROCEED_TO_METHODS' },
      room,
    )
    expect(methods.proceeded).toBe(true)
    expect(methods.lastAnnouncement).toBe('')
    expect(custodyRailPhase(methods, room)).toBe('methods')
    expect(custodyRailUnlocked(methods)).toBe(true)
  })

  it('is inert after methods replace the worktop', () => {
    const methods = custodyRailReducer(
      reachReading(),
      { type: 'PROCEED_TO_METHODS' },
      room,
    )
    const events: CustodyRailEvent[] = [
      { type: 'SEAT_CARRIER', carrierId: room.carriers[0]!.id },
      { type: 'TRY_LATE_CARRIER' },
      { type: 'READ_MIRROR' },
      { type: 'PROCEED_TO_METHODS' },
    ]
    events.forEach((event) => {
      expect(custodyRailReducer(methods, event, room)).toBe(methods)
    })
  })

  it('maps every lifecycle phase to its authored plate focus', () => {
    let state = initialCustodyRailState()
    expect(custodyRailStageFor(custodyRailPlate(state, room).phase)).toBe(
      'press',
    )
    state = seatAll()
    expect(custodyRailStageFor(custodyRailPlate(state, room).phase)).toBe(
      'closure',
    )
    state = custodyRailReducer(state, { type: 'TRY_LATE_CARRIER' }, room)
    expect(custodyRailStageFor(custodyRailPlate(state, room).phase)).toBe(
      'mirror',
    )
    state = custodyRailReducer(state, { type: 'READ_MIRROR' }, room)
    expect(custodyRailStageFor(custodyRailPlate(state, room).phase)).toBe(
      'mirror',
    )
    state = custodyRailReducer(state, { type: 'PROCEED_TO_METHODS' }, room)
    expect(custodyRailStageFor(custodyRailPlate(state, room).phase)).toBe(
      'methods',
    )
  })

  it('is deterministic and a remount returns the pristine intake', () => {
    const sequence: CustodyRailEvent[] = [
      { type: 'SEAT_CARRIER', carrierId: room.carriers[2]!.id },
      { type: 'SEAT_CARRIER', carrierId: room.carriers[0]!.id },
      { type: 'SEAT_CARRIER', carrierId: room.carriers[1]!.id },
      { type: 'TRY_LATE_CARRIER' },
      { type: 'READ_MIRROR' },
    ]
    expect(play(sequence)).toEqual(play(sequence))
    expect(initialCustodyRailState()).toEqual({
      seatedCarrierIds: [],
      lateCarrierTried: false,
      mirrorRead: false,
      proceeded: false,
      lastAnnouncement: '',
    })
  })
})

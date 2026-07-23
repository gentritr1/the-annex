import type {
  CustodyRailDefinition,
  CustodyRailPhaseId,
  CustodyRailPlateState,
  CustodyRailStageId,
} from './types'

// The pure state machine behind Registry Intake's custody rail. It has no React,
// DOM, timers, randomness, or canonical game state. The caller owns it view-locally,
// so switching sites or reloading silently restores the pristine intake.
export interface CustodyRailState {
  // Always normalized to authored carrier order, even when handled out of order.
  seatedCarrierIds: readonly string[]
  lateCarrierTried: boolean
  mirrorRead: boolean
  proceeded: boolean
  // The room's single visible + polite announcement. Empty at rest.
  lastAnnouncement: string
}

export type CustodyRailEvent =
  | { type: 'SEAT_CARRIER'; carrierId: string }
  | { type: 'TRY_LATE_CARRIER' }
  | { type: 'READ_MIRROR' }
  | { type: 'PROCEED_TO_METHODS' }

export function initialCustodyRailState(): CustodyRailState {
  return {
    seatedCarrierIds: [],
    lateCarrierTried: false,
    mirrorRead: false,
    proceeded: false,
    lastAnnouncement: '',
  }
}

function normalizedCarrierIds(
  ids: readonly string[],
  room: CustodyRailDefinition,
): readonly string[] {
  const selected = new Set(ids)
  return room.carriers
    .map((carrier) => carrier.id)
    .filter((carrierId) => selected.has(carrierId))
}

export function allCarriersSeated(
  state: CustodyRailState,
  room: CustodyRailDefinition,
): boolean {
  return state.seatedCarrierIds.length === room.carriers.length
}

// The exact view-level unlock: the unassigned carrier has been refused by the
// closed rail AND its mirror mark has been read.
export function custodyRailUnlocked(state: CustodyRailState): boolean {
  return state.lateCarrierTried && state.mirrorRead
}

export function custodyRailPhase(
  state: CustodyRailState,
  room: CustodyRailDefinition,
): CustodyRailPhaseId {
  if (state.proceeded) return 'methods'
  if (state.mirrorRead) return 'reading'
  if (state.lateCarrierTried) return 'mirror'
  if (allCarriersSeated(state, room)) return 'late-carrier'
  return 'intake'
}

export function custodyRailPlate(
  state: CustodyRailState,
  room: CustodyRailDefinition,
): CustodyRailPlateState {
  return {
    phase: custodyRailPhase(state, room),
    seatedCarrierIds: state.seatedCarrierIds,
    lateCarrierTried: state.lateCarrierTried,
    mirrorRead: state.mirrorRead,
  }
}

const PHASE_STAGE: Readonly<Record<CustodyRailPhaseId, CustodyRailStageId>> = {
  intake: 'press',
  'late-carrier': 'closure',
  mirror: 'mirror',
  reading: 'mirror',
  methods: 'methods',
}

export function custodyRailStageFor(
  phase: CustodyRailPhaseId,
): CustodyRailStageId {
  return PHASE_STAGE[phase]
}

export function custodyRailReducer(
  state: CustodyRailState,
  event: CustodyRailEvent,
  room: CustodyRailDefinition,
): CustodyRailState {
  // Once the methods replace the worktop, every handling event is a strict no-op.
  if (state.proceeded) return state

  switch (event.type) {
    case 'SEAT_CARRIER': {
      if (
        state.lateCarrierTried ||
        state.mirrorRead ||
        allCarriersSeated(state, room)
      ) {
        return state
      }
      const carrier = room.carriers.find(
        (candidate) => candidate.id === event.carrierId,
      )
      if (!carrier || state.seatedCarrierIds.includes(carrier.id)) return state

      const seatedCarrierIds = normalizedCarrierIds(
        [...state.seatedCarrierIds, carrier.id],
        room,
      )
      const finalCarrier = seatedCarrierIds.length === room.carriers.length
      return {
        ...state,
        seatedCarrierIds,
        lastAnnouncement: finalCarrier ? room.closureLine : carrier.seatedLine,
      }
    }

    case 'TRY_LATE_CARRIER': {
      if (
        !allCarriersSeated(state, room) ||
        state.lateCarrierTried ||
        state.mirrorRead
      ) {
        return state
      }
      return {
        ...state,
        lateCarrierTried: true,
        lastAnnouncement: room.lateCarrier.refusalLine,
      }
    }

    case 'READ_MIRROR': {
      if (!state.lateCarrierTried || state.mirrorRead) return state
      return {
        ...state,
        mirrorRead: true,
        lastAnnouncement: room.mirror.readLine,
      }
    }

    case 'PROCEED_TO_METHODS': {
      if (!custodyRailUnlocked(state)) return state
      return { ...state, proceeded: true, lastAnnouncement: '' }
    }

    default:
      return state
  }
}

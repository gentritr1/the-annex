import { describe, expect, it } from 'vitest'
import { getCaseContent } from './content'
import {
  activeCard,
  filedRoutineCount,
  initialRoomState,
  pocketCard,
  resolveSiteOutcomes,
  roomPhase,
  roomReducer,
  roomStageFor,
  roomUnlocked,
  routineCards,
  shelfZeroVisible,
  SHELF_ZERO_TARGET,
  type RoomEvent,
  type RoomState,
} from './room'
import type { ClassificationRoomDefinition } from './types'

// The Small Archive is the only authored room today; its definition is the fixture
// the pure reducer is exercised against. The test reads authored ids only — never
// hardcodes case content beyond resolving the fixture.
const room: ClassificationRoomDefinition = (() => {
  const site = getCaseContent('case-77').sites.find((candidate) => candidate.room)
  if (!site?.room) throw new Error('expected an authored classification room')
  return site.room
})()

const classifiable = routineCards(room)
const unclassifiable = pocketCard(room)!
const categories = room.categories

function play(events: readonly RoomEvent[], start: RoomState = initialRoomState()): RoomState {
  return events.reduce((state, event) => roomReducer(state, event, room), start)
}

// File all three routine cards under the first category, reaching the pocket card.
function fileAllRoutine(): RoomState {
  return play(classifiable.map(() => ({ type: 'FILE_UNDER_CATEGORY', categoryId: categories[0]!.id })))
}

// Refuse the pocket card under every category (the third refusal reveals shelf zero).
function refuseAll(start: RoomState): RoomState {
  return play(
    categories.map((category) => ({ type: 'FILE_UNDER_CATEGORY', categoryId: category.id })),
    start,
  )
}

describe('classification room reducer', () => {
  it('has exactly one unclassifiable card and three classifiable ones', () => {
    expect(classifiable).toHaveLength(3)
    expect(room.cards.filter((card) => !card.classifiable)).toHaveLength(1)
    expect(categories).toHaveLength(3)
  })

  it('derives the active card in authored order, then the pocket card, then none', () => {
    // Fresh room presents the first routine card, no selection needed.
    expect(activeCard(initialRoomState(), room)?.id).toBe(classifiable[0]!.id)

    // Filing routine cards advances the slot through authored order.
    let state = roomReducer(
      initialRoomState(),
      { type: 'FILE_UNDER_CATEGORY', categoryId: categories[0]!.id },
      room,
    )
    expect(activeCard(state, room)?.id).toBe(classifiable[1]!.id)
    state = roomReducer(state, { type: 'FILE_UNDER_CATEGORY', categoryId: categories[0]!.id }, room)
    expect(activeCard(state, room)?.id).toBe(classifiable[2]!.id)
    state = roomReducer(state, { type: 'FILE_UNDER_CATEGORY', categoryId: categories[0]!.id }, room)

    // All routine cards filed: the pocket card is now the active card.
    expect(filedRoutineCount(state, room)).toBe(3)
    expect(activeCard(state, room)?.id).toBe(unclassifiable.id)
  })

  it('accepts a classifiable card under EVERY category and flattens it', () => {
    categories.forEach((category) => {
      const state = roomReducer(
        initialRoomState(),
        { type: 'FILE_UNDER_CATEGORY', categoryId: category.id },
        room,
      )
      const card = classifiable[0]!
      expect(state.filedCards[card.id]).toBe(category.id)
      // The accepted line carries the card's own copy plus the interpolated class.
      expect(state.lastAnnouncement).toContain(category.label)
      expect(state.lastAnnouncement).not.toContain('{category}')
      // Accepting a card never reveals shelf zero.
      expect(shelfZeroVisible(state, room)).toBe(false)
    })
  })

  it('refuses the pocket card under EVERY category with escalating copy', () => {
    const atPocket = fileAllRoutine()
    categories.forEach((category, index) => {
      const state = roomReducer(atPocket, { type: 'FILE_UNDER_CATEGORY', categoryId: category.id }, room)
      // Refusal never files the pocket card; it stays the active card.
      expect(state.filedCards[unclassifiable.id]).toBeUndefined()
      expect(activeCard(state, room)?.id).toBe(unclassifiable.id)
      expect(state.triedCategories).toEqual([category.id])
      // The authored escalating line for this refusal, plus the system objection.
      expect(state.lastAnnouncement).toContain(unclassifiable.refusalLines![0])
      expect(state.lastAnnouncement).toContain(room.refusalObjection)
      // Category-agnostic: the refusal never names the class it refused.
      expect(state.lastAnnouncement).not.toContain(category.label)
      void index
    })
  })

  it('records each tried category once and walks the escalating refusal lines', () => {
    const atPocket = fileAllRoutine()
    let state = atPocket
    unclassifiable.refusalLines!.forEach((line, index) => {
      state = roomReducer(
        state,
        { type: 'FILE_UNDER_CATEGORY', categoryId: categories[index]!.id },
        room,
      )
      expect(state.triedCategories).toHaveLength(index + 1)
      expect(state.lastAnnouncement).toContain(line)
    })
    // Re-pressing an already-tried category is a no-op.
    const again = roomReducer(state, { type: 'FILE_UNDER_CATEGORY', categoryId: categories[0]!.id }, room)
    expect(again).toBe(state)
  })

  it('hides shelf zero until the THIRD refusal, and never on an acceptance', () => {
    expect(shelfZeroVisible(initialRoomState(), room)).toBe(false)

    const atPocket = fileAllRoutine()
    expect(shelfZeroVisible(atPocket, room)).toBe(false)

    // First and second refusals do not reveal it.
    const oneRefusal = roomReducer(atPocket, { type: 'FILE_UNDER_CATEGORY', categoryId: categories[0]!.id }, room)
    expect(shelfZeroVisible(oneRefusal, room)).toBe(false)
    const twoRefusals = roomReducer(oneRefusal, { type: 'FILE_UNDER_CATEGORY', categoryId: categories[1]!.id }, room)
    expect(shelfZeroVisible(twoRefusals, room)).toBe(false)

    // The third refusal reveals it.
    const threeRefusals = roomReducer(twoRefusals, { type: 'FILE_UNDER_CATEGORY', categoryId: categories[2]!.id }, room)
    expect(shelfZeroVisible(threeRefusals, room)).toBe(true)
  })

  it('refuses shelf-zero filing before the third refusal', () => {
    const atPocket = fileAllRoutine()
    // No refusals yet: shelf zero is not visible, so the placement is a no-op.
    const state = roomReducer(atPocket, { type: 'FILE_ON_SHELF_ZERO' }, room)
    expect(state.cardOnShelfZero).toBe(false)
    expect(state.filedCards[unclassifiable.id]).toBeUndefined()

    // One refusal is still not enough.
    const oneRefusal = roomReducer(atPocket, { type: 'FILE_UNDER_CATEGORY', categoryId: categories[0]!.id }, room)
    const early = roomReducer(oneRefusal, { type: 'FILE_ON_SHELF_ZERO' }, room)
    expect(early.cardOnShelfZero).toBe(false)
  })

  it('places the card on shelf zero only after the third refusal', () => {
    const state = roomReducer(refuseAll(fileAllRoutine()), { type: 'FILE_ON_SHELF_ZERO' }, room)
    expect(state.cardOnShelfZero).toBe(true)
    expect(state.filedCards[unclassifiable.id]).toBe(SHELF_ZERO_TARGET)
    expect(state.lastAnnouncement).toContain(room.shelfZero.holdingLine)
    // The pocket card has left the slot; nothing derives in.
    expect(activeCard(state, room)).toBeUndefined()
  })

  it('turns a restriction-log slip only once the card is on shelf zero', () => {
    const slip = room.slips[0]!
    // No slips before the card is placed.
    const early = play([{ type: 'TURN_SLIP', slipId: slip.id }])
    expect(early.turnedSlips).toHaveLength(0)

    const placed = roomReducer(refuseAll(fileAllRoutine()), { type: 'FILE_ON_SHELF_ZERO' }, room)
    const turned = roomReducer(placed, { type: 'TURN_SLIP', slipId: slip.id }, room)
    expect(turned.turnedSlips).toEqual([slip.id])
    expect(turned.lastAnnouncement).toBe(slip.fragment)

    // Turning the same slip again is a no-op.
    const again = roomReducer(turned, { type: 'TURN_SLIP', slipId: slip.id }, room)
    expect(again).toBe(turned)
  })

  it('unlocks exactly when the card is on shelf zero AND ≥1 slip is turned', () => {
    // Neither discovery.
    expect(roomUnlocked(initialRoomState())).toBe(false)

    // Discovery #1 only.
    const shelfOnly = roomReducer(refuseAll(fileAllRoutine()), { type: 'FILE_ON_SHELF_ZERO' }, room)
    expect(roomUnlocked(shelfOnly)).toBe(false)

    // Discovery #2 added.
    const both = roomReducer(shelfOnly, { type: 'TURN_SLIP', slipId: room.slips[0]!.id }, room)
    expect(roomUnlocked(both)).toBe(true)
  })

  it('never unlocks from slips alone (slips are inert before shelf zero)', () => {
    const state = play([
      { type: 'TURN_SLIP', slipId: room.slips[0]!.id },
      { type: 'TURN_SLIP', slipId: room.slips[1]!.id },
      { type: 'TURN_SLIP', slipId: room.slips[2]!.id },
    ])
    expect(state.turnedSlips).toHaveLength(0)
    expect(roomUnlocked(state)).toBe(false)
  })

  it('maps the derived phase and plate stage through the room lifecycle', () => {
    expect(roomPhase(initialRoomState(), room)).toBe('routine')
    expect(roomStageFor('routine')).toBe('drawer')

    const atPocket = fileAllRoutine()
    expect(roomPhase(atPocket, room)).toBe('pocket')
    expect(roomStageFor('pocket')).toBe('drawer')

    const refused = refuseAll(atPocket)
    expect(roomPhase(refused, room)).toBe('shelf-zero')
    expect(roomStageFor('shelf-zero')).toBe('shelf-zero')

    const placed = roomReducer(refused, { type: 'FILE_ON_SHELF_ZERO' }, room)
    expect(roomPhase(placed, room)).toBe('log')
    expect(roomStageFor('log')).toBe('restriction-log')

    const unlockedState = roomReducer(placed, { type: 'TURN_SLIP', slipId: room.slips[0]!.id }, room)
    expect(roomPhase(unlockedState, room)).toBe('unlocked')
    expect(roomStageFor('unlocked')).toBe('methods')
  })

  it('is deterministic: the same event sequence yields the same state', () => {
    const sequence: RoomEvent[] = [
      { type: 'FILE_UNDER_CATEGORY', categoryId: categories[2]!.id },
      { type: 'FILE_UNDER_CATEGORY', categoryId: categories[0]!.id },
      { type: 'FILE_UNDER_CATEGORY', categoryId: categories[1]!.id },
      { type: 'FILE_UNDER_CATEGORY', categoryId: categories[0]!.id },
      { type: 'FILE_UNDER_CATEGORY', categoryId: categories[1]!.id },
      { type: 'FILE_UNDER_CATEGORY', categoryId: categories[2]!.id },
      { type: 'FILE_ON_SHELF_ZERO' },
      { type: 'TURN_SLIP', slipId: room.slips[1]!.id },
    ]
    expect(play(sequence)).toEqual(play(sequence))
  })

  it('ignores unknown categories and slips, and no-ops with no active card', () => {
    const base = initialRoomState()
    // Unknown category is a no-op.
    expect(roomReducer(base, { type: 'FILE_UNDER_CATEGORY', categoryId: 'no-class' }, room)).toBe(base)
    // Unknown slip before placement is a no-op.
    expect(roomReducer(base, { type: 'TURN_SLIP', slipId: 'no-slip' }, room)).toBe(base)

    // Once the pocket card is placed, no active card remains: filing is a no-op.
    const placed = roomReducer(refuseAll(fileAllRoutine()), { type: 'FILE_ON_SHELF_ZERO' }, room)
    expect(roomReducer(placed, { type: 'FILE_UNDER_CATEGORY', categoryId: categories[0]!.id }, room)).toBe(
      placed,
    )
  })
})

describe('resolveSiteOutcomes (completedActions → resolved outcome)', () => {
  const sites = getCaseContent('case-77').sites
  const roomSite = sites.find((site) => site.room)!
  const [openAction, sealAction] = roomSite.actionIds

  it('yields no entry for a room site with no committed action', () => {
    expect(resolveSiteOutcomes(sites, []).has(roomSite.id)).toBe(false)
  })

  it('resolves the opened outcome for the first action', () => {
    const outcomes = resolveSiteOutcomes(sites, [openAction!])
    expect(outcomes.get(roomSite.id)).toEqual(roomSite.room!.worldOutcome[openAction!])
    expect(outcomes.get(roomSite.id)?.variant).toBe('opened')
  })

  it('resolves the sealed outcome for the second action', () => {
    const outcomes = resolveSiteOutcomes(sites, [sealAction!])
    expect(outcomes.get(roomSite.id)).toEqual(roomSite.room!.worldOutcome[sealAction!])
    expect(outcomes.get(roomSite.id)?.variant).toBe('sealed')
  })

  it('never resolves an outcome for a site without a room', () => {
    const plainSite = sites.find((site) => !site.room)!
    const outcomes = resolveSiteOutcomes(sites, plainSite.actionIds.map((id) => id))
    expect(outcomes.has(plainSite.id)).toBe(false)
  })
})

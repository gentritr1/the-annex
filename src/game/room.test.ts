import { describe, expect, it } from 'vitest'
import { getCaseContent } from './content'
import {
  initialRoomState,
  resolveSiteOutcomes,
  roomFocusFor,
  roomReducer,
  roomUnlocked,
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

const classifiable = room.cards.filter((card) => card.classifiable)
const unclassifiable = room.cards.find((card) => !card.classifiable)!
const categories = room.categories

function play(events: readonly RoomEvent[], start: RoomState = initialRoomState()): RoomState {
  return events.reduce((state, event) => roomReducer(state, event, room), start)
}

describe('classification room reducer', () => {
  it('has exactly one unclassifiable card and three classifiable ones', () => {
    expect(classifiable).toHaveLength(3)
    expect(room.cards.filter((card) => !card.classifiable)).toHaveLength(1)
    expect(categories).toHaveLength(3)
  })

  it('accepts a classifiable card under EVERY category and flattens it', () => {
    const card = classifiable[0]!
    categories.forEach((category) => {
      const state = play([
        { type: 'SELECT_CARD', cardId: card.id },
        { type: 'FILE_UNDER_CATEGORY', categoryId: category.id },
      ])
      expect(state.filedCards[card.id]).toBe(category.id)
      expect(state.selectedCardId).toBeNull()
      // The accepted line carries the card's own copy plus the interpolated class.
      expect(state.lastAnnouncement).toContain(category.label)
      expect(state.lastAnnouncement).not.toContain('{category}')
      // Accepting a card never reveals shelf zero.
      expect(shelfZeroVisible(state)).toBe(false)
    })
  })

  it('refuses the unclassifiable card under EVERY category', () => {
    categories.forEach((category) => {
      const state = play([
        { type: 'SELECT_CARD', cardId: unclassifiable.id },
        { type: 'FILE_UNDER_CATEGORY', categoryId: category.id },
      ])
      // Refusal never files the card; it returns to the drawer and stays selected.
      expect(state.filedCards[unclassifiable.id]).toBeUndefined()
      expect(state.selectedCardId).toBe(unclassifiable.id)
      expect(state.refusedOnce).toBe(true)
      expect(state.lastAnnouncement).toContain(room.refusalObjection)
      // Category-agnostic: the refusal never names the class it refused.
      expect(state.lastAnnouncement).not.toContain(category.label)
    })
  })

  it('hides shelf zero before the first refusal and shows it after', () => {
    const fresh = initialRoomState()
    expect(shelfZeroVisible(fresh)).toBe(false)

    // A classifiable filing does not reveal it.
    const afterAccept = play([
      { type: 'SELECT_CARD', cardId: classifiable[0]!.id },
      { type: 'FILE_UNDER_CATEGORY', categoryId: categories[0]!.id },
    ])
    expect(shelfZeroVisible(afterAccept)).toBe(false)

    const afterRefusal = play([
      { type: 'SELECT_CARD', cardId: unclassifiable.id },
      { type: 'FILE_UNDER_CATEGORY', categoryId: categories[0]!.id },
    ])
    expect(shelfZeroVisible(afterRefusal)).toBe(true)
  })

  it('refuses shelf-zero filing before the card has ever been refused', () => {
    const state = play([
      { type: 'SELECT_CARD', cardId: unclassifiable.id },
      { type: 'FILE_ON_SHELF_ZERO' },
    ])
    // Shelf zero is not visible yet, so the placement is a no-op.
    expect(state.cardOnShelfZero).toBe(false)
    expect(state.filedCards[unclassifiable.id]).toBeUndefined()
  })

  it('places the card on shelf zero only after a refusal', () => {
    const state = play([
      { type: 'SELECT_CARD', cardId: unclassifiable.id },
      { type: 'FILE_UNDER_CATEGORY', categoryId: categories[1]!.id },
      { type: 'FILE_ON_SHELF_ZERO' },
    ])
    expect(state.cardOnShelfZero).toBe(true)
    expect(state.filedCards[unclassifiable.id]).toBe(SHELF_ZERO_TARGET)
    expect(state.lastAnnouncement).toContain(room.shelfZero.holdingLine)
  })

  it('turns a restriction-log slip only once the card is on shelf zero', () => {
    const slip = room.slips[0]!
    // No slips before the card is placed.
    const early = play([{ type: 'TURN_SLIP', slipId: slip.id }])
    expect(early.turnedSlips).toHaveLength(0)

    const placed = play([
      { type: 'SELECT_CARD', cardId: unclassifiable.id },
      { type: 'FILE_UNDER_CATEGORY', categoryId: categories[0]!.id },
      { type: 'FILE_ON_SHELF_ZERO' },
    ])
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
    const shelfOnly = play([
      { type: 'SELECT_CARD', cardId: unclassifiable.id },
      { type: 'FILE_UNDER_CATEGORY', categoryId: categories[0]!.id },
      { type: 'FILE_ON_SHELF_ZERO' },
    ])
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

  it('maps the derived plate focus through the room stages', () => {
    expect(roomFocusFor(initialRoomState())).toBe('drawer')

    const refused = play([
      { type: 'SELECT_CARD', cardId: unclassifiable.id },
      { type: 'FILE_UNDER_CATEGORY', categoryId: categories[0]!.id },
    ])
    expect(roomFocusFor(refused)).toBe('shelf-zero')

    const placed = roomReducer(refused, { type: 'FILE_ON_SHELF_ZERO' }, room)
    expect(roomFocusFor(placed)).toBe('restriction-log')

    const unlockedState = roomReducer(placed, { type: 'TURN_SLIP', slipId: room.slips[0]!.id }, room)
    expect(roomFocusFor(unlockedState)).toBe('methods')
  })

  it('is deterministic: the same event sequence yields the same state', () => {
    const sequence: RoomEvent[] = [
      { type: 'SELECT_CARD', cardId: classifiable[0]!.id },
      { type: 'FILE_UNDER_CATEGORY', categoryId: categories[2]!.id },
      { type: 'SELECT_CARD', cardId: unclassifiable.id },
      { type: 'FILE_UNDER_CATEGORY', categoryId: categories[0]!.id },
      { type: 'FILE_UNDER_CATEGORY', categoryId: categories[1]!.id },
      { type: 'FILE_ON_SHELF_ZERO' },
      { type: 'TURN_SLIP', slipId: room.slips[1]!.id },
    ]
    expect(play(sequence)).toEqual(play(sequence))
  })

  it('ignores unknown cards, categories, and slips', () => {
    const base = initialRoomState()
    expect(roomReducer(base, { type: 'SELECT_CARD', cardId: 'no-card' }, room)).toBe(base)
    const selected = roomReducer(base, { type: 'SELECT_CARD', cardId: unclassifiable.id }, room)
    expect(
      roomReducer(selected, { type: 'FILE_UNDER_CATEGORY', categoryId: 'no-class' }, room),
    ).toBe(selected)
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

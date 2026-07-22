import type {
  ClassificationRoomDefinition,
  FieldActionId,
  RoomStageId,
  SiteDefinition,
  SiteId,
  SiteWorldOutcome,
} from './types'

// The pure state machine behind the Small Archive's classification room. It is a
// plain reducer — no React, no Date.now, no Math.random — so every transition is
// unit-testable in isolation, and the ClassificationRoom component is a thin view
// over it. Nothing here is persisted: the caller (a React component) holds the
// state view-locally, so leaving the site or reloading resets it, exactly like the
// Case 81 deposition tray. The reducer resolves every announcement string from the
// authored definition it is handed, so the aria-live copy stays in the content
// layer and out of the component.

// A sentinel category recorded for the card filed on shelf zero — the label-less
// target that is not one of the statute's three classes.
export const SHELF_ZERO_TARGET = 'shelf-zero'

export interface RoomState {
  // The card the player has picked up, or null when the drawer is at rest.
  selectedCardId: string | null
  // cardId -> the category id it accepted (or SHELF_ZERO_TARGET for the card held
  // on shelf zero). A filed card leaves the drawer.
  filedCards: Readonly<Record<string, string>>
  // True once the unclassifiable card has been refused at least once — shelf zero
  // only appears after that first refusal (discovery #1's precondition).
  refusedOnce: boolean
  // Discovery #1: the unclassifiable card has been placed on shelf zero.
  cardOnShelfZero: boolean
  // Discovery #2 progress: which restriction-log slips have been turned.
  turnedSlips: readonly string[]
  // The last state-change line, for the view's aria-live region. Empty at rest so
  // an initial render never announces.
  lastAnnouncement: string
}

export type RoomEvent =
  | { type: 'SELECT_CARD'; cardId: string }
  | { type: 'FILE_UNDER_CATEGORY'; categoryId: string }
  | { type: 'FILE_ON_SHELF_ZERO' }
  | { type: 'TURN_SLIP'; slipId: string }

export function initialRoomState(): RoomState {
  return {
    selectedCardId: null,
    filedCards: {},
    refusedOnce: false,
    cardOnShelfZero: false,
    turnedSlips: [],
    lastAnnouncement: '',
  }
}

// Replace every {category} token with the chosen category's label.
function interpolateCategory(template: string, categoryLabel: string): string {
  return template.replace(/\{category\}/g, categoryLabel)
}

// Discovery #1 (card on shelf zero) AND discovery #2 (≥1 slip turned) — the exact
// gate the two canonical methods unlock behind. Pure read of state.
export function roomUnlocked(state: RoomState): boolean {
  return state.cardOnShelfZero && state.turnedSlips.length >= 1
}

// Whether shelf zero — the label-less fourth target — is available yet. It appears
// only after the unclassifiable card's first refusal.
export function shelfZeroVisible(state: RoomState): boolean {
  return state.refusedOnce
}

// The decorative plate stage the room currently emphasises, derived (never
// stored). The component hands this up as `roomFocus`; the plate maps it to an
// authored zone coordinate.
export function roomFocusFor(state: RoomState): RoomStageId {
  if (roomUnlocked(state)) return 'methods'
  if (state.cardOnShelfZero) return 'restriction-log'
  if (state.refusedOnce) return 'shelf-zero'
  return 'drawer'
}

export function roomReducer(
  state: RoomState,
  event: RoomEvent,
  room: ClassificationRoomDefinition,
): RoomState {
  switch (event.type) {
    case 'SELECT_CARD': {
      const card = room.cards.find((candidate) => candidate.id === event.cardId)
      // A filed card is no longer in the drawer; selecting an unknown/filed card
      // is a no-op.
      if (!card || state.filedCards[event.cardId]) return state
      if (state.selectedCardId === event.cardId) return state
      return { ...state, selectedCardId: event.cardId, lastAnnouncement: '' }
    }

    case 'FILE_UNDER_CATEGORY': {
      const cardId = state.selectedCardId
      if (!cardId) return state
      const card = room.cards.find((candidate) => candidate.id === cardId)
      const category = room.categories.find((candidate) => candidate.id === event.categoryId)
      if (!card || !category || state.filedCards[cardId]) return state

      if (!card.classifiable) {
        // The unclassifiable card refuses EVERY category and returns to the drawer
        // (it stays selected so shelf zero, once visible, can take it). The first
        // refusal is what reveals shelf zero.
        const refusal = `${card.refusalLine ?? ''} ${room.refusalObjection}`.trim()
        return { ...state, refusedOnce: true, lastAnnouncement: refusal }
      }

      // A classifiable card accepts any class: it files, the statute flattens it,
      // and the drawer loses it.
      const accepted = `${card.filedLine ?? ''} ${interpolateCategory(
        room.flattenLine,
        category.label,
      )}`.trim()
      return {
        ...state,
        selectedCardId: null,
        filedCards: { ...state.filedCards, [cardId]: category.id },
        lastAnnouncement: accepted,
      }
    }

    case 'FILE_ON_SHELF_ZERO': {
      const cardId = state.selectedCardId
      // Shelf zero only accepts the selected unclassifiable card, and only once it
      // is visible (after the first refusal).
      if (!cardId || !shelfZeroVisible(state)) return state
      const card = room.cards.find((candidate) => candidate.id === cardId)
      if (!card || card.classifiable || state.filedCards[cardId]) return state

      const held = `${room.shelfZero.objection} ${room.shelfZero.holdingLine}`.trim()
      return {
        ...state,
        selectedCardId: null,
        cardOnShelfZero: true,
        filedCards: { ...state.filedCards, [cardId]: SHELF_ZERO_TARGET },
        lastAnnouncement: held,
      }
    }

    case 'TURN_SLIP': {
      // Slips only exist once the card is on shelf zero (phase 2). Turning an
      // already-turned or unknown slip is a no-op.
      if (!state.cardOnShelfZero) return state
      const slip = room.slips.find((candidate) => candidate.id === event.slipId)
      if (!slip || state.turnedSlips.includes(event.slipId)) return state
      return {
        ...state,
        turnedSlips: [...state.turnedSlips, event.slipId],
        lastAnnouncement: slip.fragment,
      }
    }

    default:
      return state
  }
}

// ── Outcome derivation (concourse alteration on return) ──────────────────────
// Map committed field actions to the resolved room outcome for each site that
// authors a room. Content-driven and pure: it reads only the authored worldOutcome
// map, so no site or action id is hardcoded here or in any consumer. A site with a
// room but no committed action yields no entry (none).
export function resolveSiteOutcomes(
  sites: readonly SiteDefinition[],
  completedActions: readonly FieldActionId[],
): Map<SiteId, SiteWorldOutcome> {
  const completed = new Set(completedActions)
  const outcomes = new Map<SiteId, SiteWorldOutcome>()
  for (const site of sites) {
    if (!site.room) continue
    for (const actionId of site.actionIds) {
      if (!completed.has(actionId)) continue
      const outcome = site.room.worldOutcome[actionId]
      if (outcome) outcomes.set(site.id, outcome)
      break
    }
  }
  return outcomes
}

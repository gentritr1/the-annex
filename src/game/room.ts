import type {
  ClassificationRoomDefinition,
  FieldActionId,
  RoomPhaseId,
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
//
// The room is one physical workstation, not a scrolling list. There is no card
// selection: the ACTIVE card is derived — the first unfiled routine (classifiable)
// card in authored order, then the single unclassifiable "pocket" card once all
// three routine cards are filed. One category press files the active card. The
// pocket card refuses each category (escalating copy) and, only after the third
// refusal, the unlabeled shelf-zero target appears in a slot the tableau reserved
// from the start.

// A sentinel category recorded for the card filed on shelf zero — the label-less
// target that is not one of the statute's three classes.
export const SHELF_ZERO_TARGET = 'shelf-zero'

export interface RoomState {
  // cardId -> the category id it accepted (or SHELF_ZERO_TARGET for the card held
  // on shelf zero). A filed card leaves the active slot; the next card derives in.
  filedCards: Readonly<Record<string, string>>
  // Which categories the pocket card has been pressed against (view-local, in
  // press order). Each records one refusal; a category may be tried only once.
  triedCategories: readonly string[]
  // Discovery #1: the unclassifiable card has been placed on shelf zero.
  cardOnShelfZero: boolean
  // Discovery #2 progress: which restriction-log slips have been turned.
  turnedSlips: readonly string[]
  // The slip currently shown in the reading area (the last turned or re-selected).
  // Null until the first slip is turned. Reading all three stays optional.
  selectedSlipId: string | null
  // The reading beat has been acknowledged: the player asked to move to the two
  // canonical methods. The canonical unlock rule (roomUnlocked) is untouched; this
  // only gates the VIEW's swap from the log tableau to the methods.
  proceeded: boolean
  // The last state-change line, for the view's aria-live region. Empty at rest so
  // an initial render never announces.
  lastAnnouncement: string
}

export type RoomEvent =
  | { type: 'FILE_UNDER_CATEGORY'; categoryId: string }
  | { type: 'FILE_ON_SHELF_ZERO' }
  | { type: 'TURN_SLIP'; slipId: string }
  | { type: 'PROCEED_TO_METHODS' }

export function initialRoomState(): RoomState {
  return {
    filedCards: {},
    triedCategories: [],
    cardOnShelfZero: false,
    turnedSlips: [],
    selectedSlipId: null,
    proceeded: false,
    lastAnnouncement: '',
  }
}

// Replace every {category} token with the chosen category's label.
function interpolateCategory(template: string, categoryLabel: string): string {
  return template.replace(/\{category\}/g, categoryLabel)
}

// The routine (classifiable) cards, in authored order.
export function routineCards(room: ClassificationRoomDefinition) {
  return room.cards.filter((card) => card.classifiable)
}

// The single unclassifiable "pocket" card, or undefined if a room authors none.
export function pocketCard(room: ClassificationRoomDefinition) {
  return room.cards.find((card) => !card.classifiable)
}

// How many routine cards are filed so far (the plate's flatten counter).
export function filedRoutineCount(
  state: RoomState,
  room: ClassificationRoomDefinition,
): number {
  return routineCards(room).filter((card) => state.filedCards[card.id]).length
}

// The card the workstation is currently presenting: the first unfiled routine card
// in authored order, then the pocket card once every routine card is filed. Null
// once the pocket card leaves the slot (placed on shelf zero) — nothing derives in.
export function activeCard(state: RoomState, room: ClassificationRoomDefinition) {
  const routine = routineCards(room).find((card) => !state.filedCards[card.id])
  if (routine) return routine
  const pocket = pocketCard(room)
  if (pocket && !state.filedCards[pocket.id]) return pocket
  return undefined
}

// Discovery #1 (card on shelf zero) AND discovery #2 (≥1 slip turned) — the exact
// gate the two canonical methods unlock behind. Pure read of state. UNTOUCHED: name,
// signature, and semantics are the canonical unlock rule and must not change.
export function roomUnlocked(state: RoomState): boolean {
  return state.cardOnShelfZero && state.turnedSlips.length >= 1
}

// Whether the reading beat may be acknowledged (the proceed control is offered).
// Identical to the canonical unlock rule — proceeding is the view-level beat that
// turns an unlocked room into the methods phase, never a second gate.
export function canProceed(state: RoomState): boolean {
  return roomUnlocked(state)
}

// Whether shelf zero — the label-less fourth target — is available yet. It appears
// only after the pocket card has been refused under EVERY statute category (the
// third refusal, since there are exactly three classes).
export function shelfZeroVisible(
  state: RoomState,
  room: ClassificationRoomDefinition,
): boolean {
  return state.triedCategories.length >= room.categories.length
}

// The derived lifecycle phase (never stored). The component swaps the bounded
// tableau's content by this, and maps it to an authored plate zone for the drift.
export function roomPhase(
  state: RoomState,
  room: ClassificationRoomDefinition,
): RoomPhaseId {
  // The methods take the stage only once the reading beat is acknowledged. Until
  // then an unlocked room stays on the log so its central discovery is read, not
  // rushed off — the canonical unlock rule (roomUnlocked) is unchanged.
  if (roomUnlocked(state) && state.proceeded) return 'unlocked'
  if (state.cardOnShelfZero) return 'log'
  if (filedRoutineCount(state, room) < routineCards(room).length) return 'routine'
  // Every routine card is filed: the pocket card is in the slot.
  if (shelfZeroVisible(state, room)) return 'shelf-zero'
  return 'pocket'
}

// The plate stage a phase emphasises. A fixed mapping onto the authored zone
// vocabulary (RoomStageId) so the close-read plate can drift toward the drawer,
// the reserved aperture, the restriction shutter, or the consequential centre.
const PHASE_STAGE: Readonly<Record<RoomPhaseId, RoomStageId>> = {
  routine: 'drawer',
  pocket: 'drawer',
  'shelf-zero': 'shelf-zero',
  log: 'restriction-log',
  unlocked: 'methods',
}

export function roomStageFor(phase: RoomPhaseId): RoomStageId {
  return PHASE_STAGE[phase]
}

export function roomReducer(
  state: RoomState,
  event: RoomEvent,
  room: ClassificationRoomDefinition,
): RoomState {
  switch (event.type) {
    case 'FILE_UNDER_CATEGORY': {
      const card = activeCard(state, room)
      const category = room.categories.find((candidate) => candidate.id === event.categoryId)
      if (!card || !category) return state

      if (!card.classifiable) {
        // The pocket card refuses EVERY category and stays in the slot. Each
        // category may be tried only once; the third refusal reveals shelf zero.
        if (state.triedCategories.includes(category.id)) return state
        const nextTried = [...state.triedCategories, category.id]
        const lines = card.refusalLines ?? []
        const line = lines[Math.min(nextTried.length - 1, lines.length - 1)] ?? ''
        const refusal = `${line} ${room.refusalObjection}`.trim()
        return { ...state, triedCategories: nextTried, lastAnnouncement: refusal }
      }

      // A classifiable card accepts any class: it files, the statute flattens it,
      // and the next card derives into the slot.
      const accepted = `${card.filedLine ?? ''} ${interpolateCategory(
        room.flattenLine,
        category.label,
      )}`.trim()
      return {
        ...state,
        filedCards: { ...state.filedCards, [card.id]: category.id },
        lastAnnouncement: accepted,
      }
    }

    case 'FILE_ON_SHELF_ZERO': {
      // Shelf zero accepts the active unclassifiable card, and only once it is
      // visible (after the third refusal).
      const card = activeCard(state, room)
      if (!card || card.classifiable || !shelfZeroVisible(state, room)) return state

      const held = `${room.shelfZero.objection} ${room.shelfZero.holdingLine}`.trim()
      return {
        ...state,
        cardOnShelfZero: true,
        filedCards: { ...state.filedCards, [card.id]: SHELF_ZERO_TARGET },
        lastAnnouncement: held,
      }
    }

    case 'TURN_SLIP': {
      // Slips only exist once the card is on shelf zero. Turning an unknown slip is
      // a no-op.
      if (!state.cardOnShelfZero) return state
      const slip = room.slips.find((candidate) => candidate.id === event.slipId)
      if (!slip) return state

      if (state.turnedSlips.includes(event.slipId)) {
        // Already turned: re-selecting the SAME slip never re-announces (no-op);
        // selecting a DIFFERENT already-turned slip re-selects it and announces its
        // fragment once. Reading is non-destructive and repeatable.
        if (state.selectedSlipId === event.slipId) return state
        return { ...state, selectedSlipId: event.slipId, lastAnnouncement: slip.fragment }
      }

      // A freshly turned slip: mark it turned, select it, announce its fragment.
      return {
        ...state,
        turnedSlips: [...state.turnedSlips, event.slipId],
        selectedSlipId: event.slipId,
        lastAnnouncement: slip.fragment,
      }
    }

    case 'PROCEED_TO_METHODS': {
      // The view-level acknowledgement of the reading beat. Inert unless the room is
      // canonically unlocked; it clears the announcement because the methods phase
      // speaks for itself (focus lands on the first method and the unlock line is
      // already in the DOM) — no announcement duplication.
      if (!roomUnlocked(state)) return state
      return { ...state, proceeded: true, lastAnnouncement: '' }
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

import { useEffect, useReducer, useRef } from 'react'
import {
  activeCard,
  canProceed,
  filedRoutineCount,
  initialRoomState,
  roomPhase,
  roomReducer,
  shelfZeroVisible,
  type RoomEvent,
  type RoomState,
} from '../game/room'
import type {
  ClassificationRoomDefinition,
  FieldActionDefinition,
  FieldActionId,
  RoomPlateState,
} from '../game/types'
import { ChoiceButton } from './ChoiceButton'

interface ClassificationRoomProps {
  room: ClassificationRoomDefinition
  // The two resolved canonical methods for this site, in authored order.
  actions: readonly FieldActionDefinition[]
  // Files a method through the existing engine commit path (two-step confirm lives
  // in ChoiceButton). Identical to the plain site-actions commit.
  onCommitAction: (actionId: FieldActionId) => void
  // Mirrors the method a ChoiceButton is drawing attention to, so the plate can
  // emphasise its zone (same contract as the plain site-actions list).
  onPreviewChange: (actionId: FieldActionId | null) => void
  // Reports the derived plate presentation (phase + progress counters) so the
  // close-read plate can reflect the room's stagecraft as decorative emphasis.
  onRoomPresentationChange: (presentation: RoomPlateState) => void
}

// The pending-focus fallback chain: when the control that held focus unmounts (an
// accepted card advances the slot, a refused category disables, shelf zero and the
// slips appear, the tableau flips to methods), focus lands on the FIRST existing,
// enabled control in this order — never on <body>. The reading area and proceed
// control sit at their lifecycle positions (after the slips, before the methods) so
// no transition in the reading beat can strand focus on <body>.
const FOCUS_CHAIN = [
  '.room-category:not(.room-shelf-zero):not([disabled])',
  '.room-shelf-zero:not([disabled])',
  '.room-slip:not([disabled])',
  '.room-reading',
  '.room-proceed:not([disabled])',
  '.classification-room .choice-row',
] as const

// One physical workstation over the pure room reducer (src/game/room.ts). All game
// rules live there; this component renders the current phase as one bounded tableau
// that transforms IN PLACE — the active card in a fixed slot, three category
// targets in fixed positions, a reserved shelf-zero slot — then swaps to the
// restriction log and finally to the two canonical methods, nothing accumulating
// below. Nothing here is persisted: the reducer state is local, so leaving the site
// or reloading resets the room silently. The methods commit through the unchanged
// ChoiceButton flow.
export function ClassificationRoom({
  room,
  actions,
  onCommitAction,
  onPreviewChange,
  onRoomPresentationChange,
}: ClassificationRoomProps) {
  const [state, dispatch] = useReducer(
    (current: RoomState, event: RoomEvent) => roomReducer(current, event, room),
    undefined,
    initialRoomState,
  )
  const rootRef = useRef<HTMLDivElement>(null)

  const phase = roomPhase(state, room)
  const shelfZero = shelfZeroVisible(state, room)
  const card = activeCard(state, room)
  const filedCount = filedRoutineCount(state, room)
  const refusalCount = state.triedCategories.length
  const turnedCount = state.turnedSlips.length
  const isWorktop = phase === 'routine' || phase === 'pocket' || phase === 'shelf-zero'
  const selectedSlip = room.slips.find((slip) => slip.id === state.selectedSlipId)
  const proceedReady = canProceed(state)

  // Keep the plate's decorative stagecraft in step with the room. Depends only on
  // the primitive presentation values, so it fires exactly on a phase/count change.
  useEffect(() => {
    onRoomPresentationChange({ phase, filedCount, refusalCount, turnedCount })
  }, [phase, filedCount, refusalCount, turnedCount, onRoomPresentationChange])

  // Move keyboard focus after a transition unmounts the control that held it. A
  // frame-deferred focus loses the race when the target mounts in the same commit,
  // so the request is held until an effect runs after React commits the new markup,
  // then the fallback chain finds the first enabled control that exists.
  // A request is a list of PREFERRED selectors tried before the shared fallback
  // chain, so a transition can steer focus to a specific landing (the reading area
  // after a slip turn, the first method after proceeding) while still degrading to
  // the chain if that landing is absent — never <body>.
  const pendingFocusRef = useRef<readonly string[] | null>(null)
  useEffect(() => {
    const prefer = pendingFocusRef.current
    if (!prefer) return
    const root = rootRef.current
    if (!root) return
    for (const selector of [...prefer, ...FOCUS_CHAIN]) {
      const target = root.querySelector<HTMLElement>(selector)
      if (target && !(target as HTMLButtonElement).disabled) {
        pendingFocusRef.current = null
        target.focus()
        return
      }
    }
  })
  function requestFocus(prefer: readonly string[] = []) {
    pendingFocusRef.current = prefer
  }

  function fileUnder(categoryId: string) {
    dispatch({ type: 'FILE_UNDER_CATEGORY', categoryId })
    requestFocus()
  }

  function fileOnShelfZero() {
    dispatch({ type: 'FILE_ON_SHELF_ZERO' })
    requestFocus()
  }

  function turnSlip(slipId: string) {
    dispatch({ type: 'TURN_SLIP', slipId })
    // Turning or re-selecting a slip hands focus to the reading area so the fragment
    // is announced to the same place a sighted reader is looking.
    requestFocus(['.room-reading'])
  }

  function proceedToMethods() {
    dispatch({ type: 'PROCEED_TO_METHODS' })
    // Acknowledging the beat swaps the tableau to methods; focus the first method.
    requestFocus(['.classification-room .choice-row'])
  }

  return (
    <div
      className="classification-room"
      key="classification-room"
      ref={rootRef}
      data-room-phase={phase}
    >
      {/* The ONE live region inside the room: visible AND announced, so acceptance,
          refusal, shelf-zero, slip, and unlock changes are never colour-only. */}
      <p className="room-announce" role="status" aria-live="polite">
        {state.lastAnnouncement}
      </p>

      <div className="room-stage">
        {isWorktop && card && (
          <div className="room-worktop">
            <p className="room-prompt">
              The Archivist slides one card across the desk. File it under the statute’s classes.
            </p>
            <article className="room-active-card" aria-label={`Active card: ${card.title}`}>
              <span className="room-card-title">{card.title}</span>
              <span className="room-card-question">{card.question}</span>
              <span className="room-card-source">{card.source}</span>
            </article>
            <div className="room-targets" role="group" aria-label="File the card under a class">
              {room.categories.map((category) => {
                const tried = state.triedCategories.includes(category.id)
                return (
                  <button
                    key={category.id}
                    type="button"
                    className="room-category"
                    data-refused={tried ? 'true' : undefined}
                    disabled={tried}
                    onClick={() => fileUnder(category.id)}
                  >
                    <span className="room-category-label">{category.label}</span>
                    {tried ? <span className="room-category-state">Refused</span> : null}
                  </button>
                )
              })}
              {/* The aperture's slot is reserved from the first render (empty), so
                  the tableau height never jumps when shelf zero appears. */}
              <div className="room-shelf-slot">
                {shelfZero && (
                  <button
                    type="button"
                    className="room-category room-shelf-zero"
                    onClick={fileOnShelfZero}
                    aria-label="Shelf zero — the unlabeled shelf"
                  >
                    <span className="room-category-label" aria-hidden="true">
                      ▁▁
                    </span>
                    <span className="room-category-state">shelf zero</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {phase === 'log' && (
          <div className="room-log">
            <p className="room-log-lead">{room.readingLead}</p>
            {/* Three compact slip tabs in one row. They stay mounted through the whole
                beat, so turning one never leaves an unmount hole. The selected tab is
                distinct beyond colour: aria-current plus the data-selected treatment. */}
            <div className="room-slip-tabs" role="group" aria-label="Restriction-log removal slips">
              {room.slips.map((slip) => {
                const turned = state.turnedSlips.includes(slip.id)
                const selected = state.selectedSlipId === slip.id
                return (
                  <button
                    key={slip.id}
                    type="button"
                    className="room-slip"
                    data-turned={turned ? 'true' : undefined}
                    data-selected={selected ? 'true' : undefined}
                    aria-pressed={turned}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => turnSlip(slip.id)}
                  >
                    <span className="room-slip-label">{slip.label}</span>
                    <span className="room-slip-state">
                      {turned ? (selected ? 'Reading' : 'Turned') : 'Face down'}
                    </span>
                  </button>
                )
              })}
            </div>
            {/* A stable reading area: fixed height, no inner scroll. It shows the
                selected slip's complete fragment and can receive focus so the turn
                hands off to where the text actually appears. */}
            <div className="room-reading" tabIndex={-1} aria-label="The turned slip, read in full">
              {selectedSlip ? (
                <p className="room-reading-fragment">{selectedSlip.fragment}</p>
              ) : (
                <p className="room-reading-rest">
                  Turn a slip to read what the register kept.
                </p>
              )}
            </div>
            {/* The proceed slot is reserved from the log's first render (fixed height),
                so revealing the control when the room unlocks never jolts the layout.
                Reading all three slips stays optional. */}
            <div className="room-proceed-slot">
              {proceedReady && (
                <button type="button" className="room-proceed" onClick={proceedToMethods}>
                  {room.proceedLabel}
                </button>
              )}
            </div>
          </div>
        )}

        {phase === 'unlocked' && (
          <div className="room-methods">
            <p className="room-unlock">{room.unlockLine}</p>
            {actions.map((action) => (
              <ChoiceButton
                key={action.id}
                title={action.title}
                label={action.methodLabel}
                description={action.description}
                consequence={action.consequence}
                tone={action.alarmDelta > 0 ? 'risk' : 'default'}
                requiresConfirmation
                suppressLiveRegion
                onAttentionChange={(active) => onPreviewChange(active ? action.id : null)}
                onClick={() => onCommitAction(action.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

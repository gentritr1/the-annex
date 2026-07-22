import { useEffect, useReducer, useRef } from 'react'
import {
  activeCard,
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
// enabled control in this order — never on <body>.
const FOCUS_CHAIN = [
  '.room-category:not(.room-shelf-zero):not([disabled])',
  '.room-shelf-zero:not([disabled])',
  '.room-slip:not([disabled])',
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

  // Keep the plate's decorative stagecraft in step with the room. Depends only on
  // the primitive presentation values, so it fires exactly on a phase/count change.
  useEffect(() => {
    onRoomPresentationChange({ phase, filedCount, refusalCount, turnedCount })
  }, [phase, filedCount, refusalCount, turnedCount, onRoomPresentationChange])

  // Move keyboard focus after a transition unmounts the control that held it. A
  // frame-deferred focus loses the race when the target mounts in the same commit,
  // so the request is held until an effect runs after React commits the new markup,
  // then the fallback chain finds the first enabled control that exists.
  const pendingFocusRef = useRef(false)
  useEffect(() => {
    if (!pendingFocusRef.current) return
    const root = rootRef.current
    if (!root) return
    for (const selector of FOCUS_CHAIN) {
      const target = root.querySelector<HTMLElement>(selector)
      if (target && !(target as HTMLButtonElement).disabled) {
        pendingFocusRef.current = false
        target.focus()
        return
      }
    }
  })
  function requestFocusChain() {
    pendingFocusRef.current = true
  }

  function fileUnder(categoryId: string) {
    dispatch({ type: 'FILE_UNDER_CATEGORY', categoryId })
    requestFocusChain()
  }

  function fileOnShelfZero() {
    dispatch({ type: 'FILE_ON_SHELF_ZERO' })
    requestFocusChain()
  }

  function turnSlip(slipId: string) {
    dispatch({ type: 'TURN_SLIP', slipId })
    requestFocusChain()
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
            <p className="room-log-lead">
              Beside shelf zero, three removal slips mark where cards used to sit.
            </p>
            <ul className="room-slip-list">
              {room.slips.map((slip) => {
                const turned = state.turnedSlips.includes(slip.id)
                return (
                  <li key={slip.id}>
                    <button
                      type="button"
                      className={`room-slip ${turned ? 'room-slip--turned' : ''}`}
                      aria-pressed={turned}
                      aria-expanded={turned}
                      onClick={() => turnSlip(slip.id)}
                    >
                      <span className="room-slip-tab">
                        {turned ? 'Turned' : 'Turn the slip'}
                      </span>
                      <span className="room-slip-fragment">
                        {turned ? slip.fragment : 'A removal slip, face down.'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
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

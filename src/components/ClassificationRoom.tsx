import { useEffect, useReducer, useRef } from 'react'
import {
  initialRoomState,
  roomFocusFor,
  roomReducer,
  roomUnlocked,
  shelfZeroVisible,
  type RoomEvent,
  type RoomState,
} from '../game/room'
import type {
  ClassificationRoomDefinition,
  FieldActionDefinition,
  FieldActionId,
  RoomStageId,
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
  // Reports the derived plate stage so the close-read plate can reflect the room's
  // progress as decorative zone emphasis.
  onRoomFocusChange: (stage: RoomStageId) => void
}

// A thin view over the pure room reducer (src/game/room.ts). All game rules live
// there; this component only renders the current room state as real DOM buttons and
// announces transitions. Nothing here is persisted — the reducer state is local, so
// leaving the site or reloading resets the room, exactly like the deposition tray.
// The two canonical methods appear only once both discoveries are made, committing
// through the unchanged ChoiceButton flow.
export function ClassificationRoom({
  room,
  actions,
  onCommitAction,
  onPreviewChange,
  onRoomFocusChange,
}: ClassificationRoomProps) {
  const [state, dispatch] = useReducer(
    (current: RoomState, event: RoomEvent) => roomReducer(current, event, room),
    undefined,
    initialRoomState,
  )
  const rootRef = useRef<HTMLDivElement>(null)

  const unlocked = roomUnlocked(state)
  const shelfZero = shelfZeroVisible(state)
  const focus = roomFocusFor(state)

  // Keep the plate's decorative emphasis in step with the room stage.
  useEffect(() => {
    onRoomFocusChange(focus)
  }, [focus, onRoomFocusChange])

  // Move keyboard focus to a room control after a transition unmounts the one
  // that was focused (placing the card removes the filing rack, so the browser
  // drops focus to <body>). A frame-deferred focus loses that race when the
  // target mounts in the same commit, so the request is held until an effect
  // runs after React has committed the new markup — retrying across renders
  // until the target exists.
  const pendingFocusRef = useRef<string | null>(null)
  useEffect(() => {
    const selector = pendingFocusRef.current
    if (!selector) return
    const target = rootRef.current?.querySelector<HTMLElement>(selector)
    if (!target) return
    pendingFocusRef.current = null
    target.focus()
  })
  function focusInRoom(selector: string) {
    pendingFocusRef.current = selector
  }

  function selectCard(cardId: string) {
    dispatch({ type: 'SELECT_CARD', cardId })
    focusInRoom('.room-category')
  }

  function fileUnder(categoryId: string) {
    const cardId = state.selectedCardId
    const card = room.cards.find((candidate) => candidate.id === cardId)
    dispatch({ type: 'FILE_UNDER_CATEGORY', categoryId })
    if (card?.classifiable) {
      // Accepted: the card leaves the drawer and the filing panel closes. Land on
      // the next drawer card so keyboard users keep their place.
      focusInRoom('.room-card')
    } else if (!shelfZero) {
      // First refusal reveals shelf zero — land the player on it.
      focusInRoom('.room-shelf-zero')
    }
  }

  function fileOnShelfZero() {
    dispatch({ type: 'FILE_ON_SHELF_ZERO' })
    focusInRoom('.room-slip')
  }

  function turnSlip(slipId: string) {
    // The slip button survives its own turn, so it keeps focus naturally; drop
    // any unconsumed request so this render cannot replay a stale handoff.
    pendingFocusRef.current = null
    dispatch({ type: 'TURN_SLIP', slipId })
  }

  const drawerCards = room.cards.filter((card) => !state.filedCards[card.id])
  const selectedCard = state.selectedCardId
    ? room.cards.find((card) => card.id === state.selectedCardId)
    : undefined

  return (
    <div className="classification-room" key="classification-room" ref={rootRef}>
      {/* One view-local live region: visible AND announced, so acceptance, refusal,
          shelf-zero, slip, and unlock changes are never color-only. */}
      <p className="room-announce" role="status" aria-live="polite">
        {state.lastAnnouncement}
      </p>

      <section className="room-drawer" aria-label="The Archivist’s drawer">
        <p className="room-prompt">
          The Archivist has pulled four question-cards. File one, then read what the statute keeps.
        </p>
        <ul className="room-card-list">
          {drawerCards.map((card) => {
            const selected = card.id === state.selectedCardId
            return (
              <li key={card.id}>
                <button
                  type="button"
                  className={`room-card ${selected ? 'room-card--selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() => selectCard(card.id)}
                >
                  <span className="room-card-title">{card.title}</span>
                  <span className="room-card-question">{card.question}</span>
                  <span className="room-card-source">{card.source}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {selectedCard && (
        <section className="room-filing" aria-label={`File ${selectedCard.title}`}>
          <p className="room-filing-lead">
            File <strong>{selectedCard.title}</strong> under:
          </p>
          <div className="room-targets">
            {room.categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className="room-category"
                onClick={() => fileUnder(category.id)}
              >
                {category.label}
              </button>
            ))}
            {shelfZero && (
              <button
                type="button"
                className="room-category room-shelf-zero"
                onClick={fileOnShelfZero}
                aria-label="Shelf zero — the unlabeled shelf"
              >
                <span aria-hidden="true">▁</span>
                <small>shelf zero</small>
              </button>
            )}
          </div>
        </section>
      )}

      {state.cardOnShelfZero && (
        <section className="room-log" aria-label="The restriction log">
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
        </section>
      )}

      <section className="room-methods" aria-label="Field methods">
        {unlocked ? (
          <>
            <p className="room-unlock" aria-live="polite">
              {room.unlockLine}
            </p>
            {actions.map((action) => (
              <ChoiceButton
                key={action.id}
                title={action.title}
                label={action.methodLabel}
                description={action.description}
                consequence={action.consequence}
                tone={action.alarmDelta > 0 ? 'risk' : 'default'}
                requiresConfirmation
                onAttentionChange={(active) =>
                  onPreviewChange(active ? action.id : null)
                }
                onClick={() => onCommitAction(action.id)}
              />
            ))}
          </>
        ) : (
          <>
            <p className="room-locked-reason">{room.lockedLine}</p>
            <ul className="room-locked-list">
              {actions.map((action) => (
                <li key={action.id} className="room-locked" aria-disabled="true">
                  <span className="room-locked-method">{action.methodLabel}</span>
                  <span className="room-locked-title">{action.title}</span>
                  <span className="room-locked-lock" aria-hidden="true">
                    Locked
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}

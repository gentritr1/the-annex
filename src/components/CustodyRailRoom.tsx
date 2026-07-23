import { useEffect, useReducer, useRef } from 'react'
import {
  custodyRailPhase,
  custodyRailPlate,
  custodyRailReducer,
  initialCustodyRailState,
  type CustodyRailEvent,
  type CustodyRailState,
} from '../game/custodyRail'
import type {
  CustodyRailDefinition,
  CustodyRailPlateState,
  FieldActionDefinition,
  FieldActionId,
} from '../game/types'
import { ChoiceButton } from './ChoiceButton'

interface CustodyRailRoomProps {
  room: CustodyRailDefinition
  actions: readonly FieldActionDefinition[]
  onCommitAction: (actionId: FieldActionId) => void
  onPreviewChange: (actionId: FieldActionId | null) => void
  onRoomPresentationChange: (presentation: CustodyRailPlateState) => void
}

// Effect-driven focus handoff copied from the two proven bounded rooms. Each
// transition may disable or unmount the control that held focus; the first enabled
// physical control in this chain receives it after React commits the new phase.
const FOCUS_CHAIN = [
  '.cr-carrier:not([disabled])',
  '.cr-late-carrier:not([disabled])',
  '.cr-mirror:not([disabled])',
  '.cr-reading',
  '.cr-proceed:not([disabled])',
  '.custody-rail-room .choice-row',
] as const

export function CustodyRailRoom({
  room,
  actions,
  onCommitAction,
  onPreviewChange,
  onRoomPresentationChange,
}: CustodyRailRoomProps) {
  const [state, dispatch] = useReducer(
    (current: CustodyRailState, event: CustodyRailEvent) =>
      custodyRailReducer(current, event, room),
    undefined,
    initialCustodyRailState,
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const pendingFocusRef = useRef<readonly string[] | null>(null)
  const phase = custodyRailPhase(state, room)
  const seated = new Set(state.seatedCarrierIds)

  useEffect(() => {
    onRoomPresentationChange(custodyRailPlate(state, room))
  }, [phase, room, state, onRoomPresentationChange])

  useEffect(() => {
    const preferred = pendingFocusRef.current
    const root = rootRef.current
    if (!preferred || !root) return

    for (const selector of [...preferred, ...FOCUS_CHAIN]) {
      const target = root.querySelector<HTMLElement>(selector)
      if (target && !(target as HTMLButtonElement).disabled) {
        pendingFocusRef.current = null
        target.focus()
        return
      }
    }
  })

  function requestFocus(preferred: readonly string[] = []) {
    pendingFocusRef.current = preferred
  }

  function seatCarrier(carrierId: string) {
    const isKnown = room.carriers.some((carrier) => carrier.id === carrierId)
    const finalCarrier =
      isKnown &&
      !state.seatedCarrierIds.includes(carrierId) &&
      state.seatedCarrierIds.length + 1 === room.carriers.length
    dispatch({ type: 'SEAT_CARRIER', carrierId })
    requestFocus(
      finalCarrier
        ? ['.cr-late-carrier']
        : ['.cr-carrier:not([disabled])'],
    )
  }

  function tryLateCarrier() {
    dispatch({ type: 'TRY_LATE_CARRIER' })
    requestFocus(['.cr-mirror'])
  }

  function readMirror() {
    dispatch({ type: 'READ_MIRROR' })
    requestFocus(['.cr-reading'])
  }

  function proceedToMethods() {
    dispatch({ type: 'PROCEED_TO_METHODS' })
    requestFocus(['.custody-rail-room .choice-row'])
  }

  return (
    <div
      className="custody-rail-room"
      ref={rootRef}
      data-custody-phase={phase}
    >
      {/* The room's only live region. It is visible while machinery answers, then
          visually hidden when the stationary reading or methods carry the beat. */}
      <p className="cr-announce" role="status" aria-live="polite">
        {state.lastAnnouncement}
      </p>

      <div className="cr-stage">
        {phase === 'intake' || phase === 'late-carrier' ? (
          <div className="cr-intake">
            <p className="cr-lead">
              {phase === 'intake' ? room.intro : room.lateCarrier.prompt}
            </p>

            <div
              className="cr-carriers"
              role="group"
              aria-label="Admitted carriers at the custody rail"
            >
              {room.carriers.map((carrier) => {
                const isSeated = seated.has(carrier.id)
                return (
                  <button
                    key={carrier.id}
                    type="button"
                    className="cr-carrier"
                    data-seated={isSeated ? 'true' : undefined}
                    disabled={isSeated || phase !== 'intake'}
                    aria-pressed={isSeated}
                    onClick={() => seatCarrier(carrier.id)}
                    aria-label={`${carrier.actionLabel}. ${carrier.source}`}
                  >
                    <span className="cr-carrier-label">{carrier.label}</span>
                    <span className="cr-carrier-source">{carrier.source}</span>
                    <span className="cr-carrier-state">
                      {isSeated ? 'Seated' : 'Available'}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="cr-rail-readout">
              <span>Official intake</span>
              <strong>
                {state.seatedCarrierIds.length} / {room.carriers.length} seated
              </strong>
            </div>

            {/* Reserved from the first render so the late carrier never jolts the
                tableau when the third admitted carrier closes the rail. */}
            <div className="cr-late-slot">
              {phase === 'late-carrier' ? (
                <button
                  type="button"
                  className="cr-late-carrier"
                  onClick={tryLateCarrier}
                >
                  <span>
                    <strong>{room.lateCarrier.label}</strong>
                    <small>{room.lateCarrier.source}</small>
                  </span>
                  <span className="cr-control-verb">
                    {room.lateCarrier.actionLabel}
                  </span>
                </button>
              ) : (
                <span className="cr-late-rest" aria-hidden="true">
                  Closure gate waiting
                </span>
              )}
            </div>
          </div>
        ) : null}

        {phase === 'mirror' ? (
          <div className="cr-mirror-stage">
            <p className="cr-lead">{room.mirror.prompt}</p>
            <div className="cr-refused-carrier" aria-label="The refused carrier">
              <span>
                <strong>{room.lateCarrier.label}</strong>
                <small>{room.lateCarrier.source}</small>
              </span>
              <span>Refused after closure</span>
            </div>
            <button type="button" className="cr-mirror" onClick={readMirror}>
              <span>
                <strong>{room.mirror.label}</strong>
                <small>One open audit notch</small>
              </span>
              <span className="cr-control-verb">{room.mirror.actionLabel}</span>
            </button>
          </div>
        ) : null}

        {phase === 'reading' ? (
          <div className="cr-reading-beat">
            <div
              className="cr-reading"
              tabIndex={-1}
              aria-labelledby="custody-reading-label custody-reading-line"
              aria-describedby="custody-reading-restraint"
            >
              <span className="cr-reading-label" id="custody-reading-label">
                {room.mirror.readingLabel}
              </span>
              <p className="cr-reading-line" id="custody-reading-line">
                {room.mirror.readingLine}
              </p>
              <p
                className="cr-reading-restraint"
                id="custody-reading-restraint"
              >
                {room.mirror.restraintLine}
              </p>
            </div>
            <button type="button" className="cr-proceed" onClick={proceedToMethods}>
              {room.proceedLabel}
            </button>
          </div>
        ) : null}

        {phase === 'methods' ? (
          <div className="cr-methods">
            <p className="cr-unlock">{room.unlockLine}</p>
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
                onAttentionChange={(active) =>
                  onPreviewChange(active ? action.id : null)
                }
                onClick={() => onCommitAction(action.id)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

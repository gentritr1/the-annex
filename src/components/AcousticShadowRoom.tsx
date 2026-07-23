import { useEffect, useReducer, useRef } from 'react'
import {
  acousticShadowPhase,
  acousticShadowPlate,
  acousticShadowReducer,
  activeCheckpoint,
  currentPulse,
  initialAcousticShadowState,
  type AcousticShadowEvent,
  type AcousticShadowState,
} from '../game/acousticShadow'
import type {
  AcousticShadowPlateState,
  AcousticShadowRoomDefinition,
  FieldActionDefinition,
  FieldActionId,
} from '../game/types'
import { ChoiceButton } from './ChoiceButton'

interface AcousticShadowRoomProps {
  room: AcousticShadowRoomDefinition
  // The two resolved canonical methods for this site, in authored order.
  actions: readonly FieldActionDefinition[]
  // Files a method through the existing engine commit path (two-step confirm lives
  // in ChoiceButton). Identical to the plain site-actions commit.
  onCommitAction: (actionId: FieldActionId) => void
  // Mirrors the method a ChoiceButton is drawing attention to, so the plate can
  // emphasise its zone (same contract as the plain site-actions list).
  onPreviewChange: (actionId: FieldActionId | null) => void
  // Reports the derived plate presentation (phase + depth/pulse counters) so the
  // close-read plate reflects the crossing as decorative emphasis, and so
  // Investigation can look up this phase's acoustic treatment.
  onRoomPresentationChange: (presentation: AcousticShadowPlateState) => void
}

// The pending-focus fallback chain: when a transition unmounts the control that
// held focus (a crossing swaps the checkpoint, the route-ready tableau replaces the
// bands with the two methods), focus lands on the FIRST existing, enabled control in
// this order — never on <body>. Copied from the classification room's approved
// mechanism.
const FOCUS_CHAIN = [
  '.as-listen:not([disabled])',
  '.as-band:not([disabled])',
  '.as-reading',
  '.acoustic-shadow-room .choice-row',
] as const

// One occupied reconnaissance place over the pure acoustic-shadow reducer
// (src/game/acousticShadow.ts). All game rules live there; this component renders
// the current phase as one bounded tableau that transforms IN PLACE — one checkpoint
// with its two band choices and the manual pulse control, then the two canonical
// methods, nothing accumulating below. Nothing here is persisted: the reducer state
// is local, so leaving the site or reloading resets the room silently. The methods
// commit through the unchanged ChoiceButton flow.
export function AcousticShadowRoom({
  room,
  actions,
  onCommitAction,
  onPreviewChange,
  onRoomPresentationChange,
}: AcousticShadowRoomProps) {
  const [state, dispatch] = useReducer(
    (current: AcousticShadowState, event: AcousticShadowEvent) =>
      acousticShadowReducer(current, event, room),
    undefined,
    initialAcousticShadowState,
  )
  const rootRef = useRef<HTMLDivElement>(null)

  const phase = acousticShadowPhase(state, room)
  const checkpoint = activeCheckpoint(state, room)
  const pulse = currentPulse(state, room)
  const routeReady = state.routeReady
  const checkpointIndex = state.checkpointIndex
  const attempted = checkpoint ? state.attempts[checkpoint.id] ?? [] : []
  const attemptedCount = attempted.length

  // Keep the plate's decorative stagecraft (and the reported acoustics) in step with
  // the room. Depends only on the primitive presentation values, so it fires exactly
  // on a phase / depth / pulse / attempt change.
  useEffect(() => {
    onRoomPresentationChange(acousticShadowPlate(state, room))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, checkpointIndex, state.pulseIndex, routeReady, attemptedCount, onRoomPresentationChange, room])

  // Move keyboard focus after a transition unmounts the control that held it. A
  // frame-deferred focus loses the race when the target mounts in the same commit,
  // so the request is held until an effect runs after React commits the new markup,
  // then the fallback chain finds the first enabled control that exists.
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

  function listen() {
    // Advancing the pulse never unmounts the Listen control, so focus stays put;
    // the single live region announces the new reading.
    dispatch({ type: 'LISTEN' })
  }

  function chooseBand(bandId: string) {
    // Decide the focus landing from the state BEFORE dispatch: a masked band crosses
    // (the bands unmount), so steer focus to the next meaningful control; an exposed
    // band waits (the bands stay), so leave focus where it is.
    const exposure = pulse?.exposure[bandId]
    if (exposure === 'masked') {
      const isLast = checkpointIndex >= room.checkpoints.length - 1
      requestFocus(isLast ? ['.acoustic-shadow-room .choice-row'] : ['.as-reading', '.as-listen'])
    }
    dispatch({ type: 'CHOOSE_BAND', bandId })
  }

  return (
    <div
      className="acoustic-shadow-room"
      key="acoustic-shadow-room"
      ref={rootRef}
      data-acoustic-phase={phase}
    >
      {/* The ONE live region inside the room: visible AND announced, so each pulse
          reading, wait, and crossing is never colour-only. */}
      <p className="as-announce" role="status" aria-live="polite">
        {state.lastAnnouncement}
      </p>

      <div className="as-stage">
        {!routeReady && checkpoint && pulse ? (
          <div className="as-crossing">
            <p className="as-lead">{phase === 'survey' ? room.intro : checkpoint.prompt}</p>
            <div className="as-checkpoint-head">
              <span className="as-station">{checkpoint.station}</span>
              <span className="as-progress" aria-label={`Checkpoint ${checkpointIndex + 1} of ${room.checkpoints.length}`}>
                {checkpointIndex + 1} / {room.checkpoints.length}
              </span>
            </div>

            {/* A stable reading area: fixed height, no inner scroll. It shows the
                current pulse in full and can receive focus so a crossing hands off to
                where the next reading appears. */}
            <div
              className="as-reading"
              tabIndex={-1}
              aria-label="The current sensor pulse, read in full"
            >
              <span className="as-pulse-label">{pulse.label}</span>
              <p className="as-pulse-reading">{pulse.reading}</p>
            </div>

            <button type="button" className="as-listen" onClick={listen}>
              {room.listenLabel}
              <span className="as-listen-meta" aria-hidden="true">
                pulse {state.pulseIndex + 1} / {checkpoint.pulses.length}
              </span>
            </button>

            <div className="as-bands" role="group" aria-label={room.bandGroupLabel}>
              {checkpoint.bands.map((band) => {
                const exposure = pulse.exposure[band.id]
                const waited = attempted.includes(band.id)
                const masked = exposure === 'masked'
                return (
                  <button
                    key={band.id}
                    type="button"
                    className="as-band"
                    data-exposure={exposure}
                    data-waited={waited ? 'true' : undefined}
                    onClick={() => chooseBand(band.id)}
                  >
                    <span className="as-band-name">{band.name}</span>
                    <span className="as-band-state">
                      {masked ? 'Rain-masked · cross here' : 'Beam-exposed · the beam reaches it first'}
                      {waited && !masked ? ' · you waited' : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {routeReady ? (
          <div className="as-methods">
            <p className="as-route-ready">{room.routeReadyLine}</p>
            <p className="as-credential">{room.credentialLine}</p>
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
        ) : null}
      </div>
    </div>
  )
}

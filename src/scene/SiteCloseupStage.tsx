import type { CSSProperties } from 'react'
import { roomStageFor } from '../game/room'
import type {
  FieldActionDefinition,
  FieldActionId,
  RoomPlateState,
  RoomStageId,
  SiteDefinition,
} from '../game/types'

export const SITE_CLOSEUP_ENTRY_MS = 360

interface SiteCloseupStageProps {
  closeup: NonNullable<SiteDefinition['closeup']>
  entryOrigin?: {
    x: number
    y: number
  }
  actions: readonly FieldActionDefinition[]
  activeActionId: FieldActionId | null
  resolvedActionId?: FieldActionId
  // The classification room's derived presentation (phase + progress counters).
  // Presentation only — the plate stays aria-hidden and carries no interactive
  // elements. Drives the drawer/refusal/aperture/log/methods stagecraft below.
  roomStage?: RoomPlateState
  // The room's authored plate anchors, in master-normalized [0,1] coordinates.
  roomZones?: Readonly<Record<RoomStageId, { x: number; y: number }>>
}

// A view-only location close read. The authored raster creates spatial identity;
// React and CSS supply its legible state. No evidence or game rule lives here.
export function SiteCloseupStage({
  closeup,
  entryOrigin,
  actions,
  activeActionId,
  resolvedActionId,
  roomStage,
  roomZones,
}: SiteCloseupStageProps) {
  const focalX = closeup.focalPoint?.x ?? 0.5
  const focalY = closeup.focalPoint?.y ?? 0.5
  const actionById = new Map(actions.map((action) => [action.id, action]))
  const emphasizedActionId = resolvedActionId ?? activeActionId
  const emphasizedZone = closeup.zones?.find((zone) => zone.actionId === emphasizedActionId)
  // The room's current stagecraft anchor, resolved from its phase → authored zone.
  const roomFocus =
    roomStage && roomZones ? roomZones[roomStageFor(roomStage.phase)] : undefined
  // The room stage takes precedence for the focus point while a room is active and
  // no method is being previewed/resolved, so the plate drifts toward the drawer,
  // the reserved aperture, the restriction shutter, or the consequential centre.
  const focusPoint =
    roomFocus && !emphasizedZone
      ? roomFocus
      : { x: emphasizedZone?.x ?? closeup.focalPoint?.x ?? 0.5, y: emphasizedZone?.y ?? closeup.focalPoint?.y ?? 0.5 }
  const stageStyle = {
    '--site-focal-position-x': `${focalX * 100}%`,
    '--site-focal-position-y': `${focalY * 100}%`,
    '--site-focal-offset-x': `${focalX * -100}%`,
    '--site-focal-offset-y': `${focalY * -100}%`,
    '--site-focus-x': `${focusPoint.x * 100}%`,
    '--site-focus-y': `${focusPoint.y * 100}%`,
    '--site-entry-x': `${(entryOrigin?.x ?? 0.5) * 100}%`,
    '--site-entry-y': `${(entryOrigin?.y ?? 0.5) * 100}%`,
    '--site-closeup-entry-duration': `${SITE_CLOSEUP_ENTRY_MS}ms`,
  } as CSSProperties

  const phase = roomStage?.phase
  const showRoomStage = Boolean(roomStage && roomZones)

  return (
    <figure
      className="site-closeup-stage"
      data-emphasis={emphasizedZone || roomFocus ? 'true' : undefined}
      data-room-focus={roomFocus && !emphasizedZone ? 'true' : undefined}
      data-room-phase={phase}
      data-resolved={resolvedActionId ? 'true' : undefined}
      style={stageStyle}
      aria-hidden="true"
    >
      <div className="site-closeup-cover">
        <div className="site-closeup-projection">
          <img
            src={closeup.src}
            alt=""
            width={1600}
            height={900}
            loading="eager"
            decoding="async"
          />
          <div className="site-closeup-depth" />
          {closeup.atmosphere === 'category-register' && !showRoomStage ? (
            <div className="site-closeup-sweep" />
          ) : null}
          {closeup.atmosphere === 'rain-reflection' ? (
            <div className="site-closeup-rain-memory" />
          ) : null}
          {closeup.atmosphere === 'checksum-echo' ? (
            <div className="site-closeup-checksum-echo" />
          ) : null}
          {closeup.atmosphere === 'authority-diagnostic' ? (
            <div className="site-closeup-authority-diagnostic" />
          ) : null}
          {closeup.atmosphere === 'argument-register' ? (
            <div className="site-closeup-argument-register" />
          ) : null}
          {closeup.atmosphere === 'category-register' ? (
            <div className="site-closeup-category-register" />
          ) : null}
          {showRoomStage && roomStage && roomZones ? (
            <RoomStagecraft roomStage={roomStage} roomZones={roomZones} />
          ) : null}
          {closeup.zones ? (
            <div className="site-closeup-zones">
              {closeup.zones.map((zone) => {
                const action = actionById.get(zone.actionId)
                const state =
                  resolvedActionId === zone.actionId
                    ? 'resolved'
                    : activeActionId === zone.actionId
                      ? 'active'
                      : 'dormant'
                return (
                  <div
                    className="site-closeup-zone"
                    data-edge={zone.x <= 0.32 ? 'start' : zone.x >= 0.68 ? 'end' : undefined}
                    data-state={state}
                    key={zone.actionId}
                    style={{ left: `${zone.x * 100}%`, top: `${zone.y * 100}%` }}
                  >
                    <span className="site-closeup-zone-mark" />
                    <span className="site-closeup-zone-label">
                      {action?.methodLabel ?? 'Method'}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </figure>
  )
}

// The authored, pointer-inert plate overlays for the classification room. Each
// lives in plate source space (percentage of the 1600×900 projection) from the
// room's authored zone anchors, on the painted props: the open drawer (lower-left),
// the shuttered restriction index (upper right), and the empty aperture beneath the
// drawer. CSS gates every one-shot off under reduced motion, landing each phase on
// its distinct static composition. Essential meaning stays in the DOM text; this is
// flourish.
function RoomStagecraft({
  roomStage,
  roomZones,
}: {
  roomStage: RoomPlateState
  roomZones: Readonly<Record<RoomStageId, { x: number; y: number }>>
}) {
  const drawer = roomZones.drawer
  const aperture = roomZones['shelf-zero']
  const index = roomZones['restriction-log']
  const anchor = (point: { x: number; y: number }): CSSProperties => ({
    left: `${point.x * 100}%`,
    top: `${point.y * 100}%`,
  })
  const marks = [0, 1, 2]
  return (
    <div className="site-closeup-room" data-room-phase={roomStage.phase}>
      {/* The open drawer registers and settles as routine cards flatten. */}
      <div className="scr-drawer" style={anchor(drawer)}>
        <span className="scr-drawer-glow" />
        <span className="scr-drawer-register" />
        {/* One-shot flatten response: remounts per filed card so it replays. */}
        {roomStage.filedCount > 0 ? (
          <span className="scr-drawer-flatten" key={roomStage.filedCount} />
        ) : null}
      </div>

      {/* Three category traces near the shuttered index, extinguishing per refusal. */}
      <div className="scr-refusals" style={anchor(index)}>
        {marks.map((i) => (
          <span
            key={i}
            className="scr-trace"
            data-extinguished={i < roomStage.refusalCount ? 'true' : undefined}
          />
        ))}
      </div>

      {/* The unlabeled aperture beneath the drawer register — dark slot, edge light. */}
      <div className="scr-aperture" style={anchor(aperture)} />

      {/* Three ghost-slip impressions on the shutter, turning with the DOM slips. */}
      <div className="scr-slips" style={anchor(index)}>
        {marks.map((i) => (
          <span
            key={i}
            className="scr-slip"
            data-turned={i < roomStage.turnedCount ? 'true' : undefined}
          />
        ))}
      </div>

      {/* Methods: the room settles toward its consequential centre. */}
      <div className="scr-settle" />
    </div>
  )
}

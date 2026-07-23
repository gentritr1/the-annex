import { useState, type CSSProperties } from 'react'
import { acousticShadowStageFor } from '../game/acousticShadow'
import { roomStageFor } from '../game/room'
import type {
  AcousticShadowPlateState,
  AcousticShadowRoomDefinition,
  AcousticShadowStageId,
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
  // The acoustic-shadow room's derived presentation (phase + depth/pulse counters).
  // Presentation only — same aria-hidden, pointer-inert contract as the room props,
  // kept separate from them. Drives the near/mid/far/credential stagecraft below.
  acousticStage?: AcousticShadowPlateState
  // The acoustic-shadow room's authored plate anchors, master-normalized [0,1].
  acousticZones?: Readonly<Record<AcousticShadowStageId, { x: number; y: number }>>
  // Which resolved crossing to render once a maintenance method is filed: 'shadow'
  // keeps one quiet broken interval in the cadence with the door dormant; 'credential'
  // answers the amber aperture while the sensor chain stays intact. Presentation only.
  acousticResolvedVariant?: 'shadow' | 'credential'
  // Optional source-faithful depth assets for the acoustic close read. They mount
  // only after the settled closeup is active and both reduced-motion signals are
  // clear, so the atomic master remains the no-download fallback.
  acousticDepthAssets?: AcousticShadowRoomDefinition['depthAssets']
  depthEnhancementEnabled?: boolean
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
  acousticStage,
  acousticZones,
  acousticResolvedVariant,
  acousticDepthAssets,
  depthEnhancementEnabled = false,
}: SiteCloseupStageProps) {
  const focalX = closeup.focalPoint?.x ?? 0.5
  const focalY = closeup.focalPoint?.y ?? 0.5
  const actionById = new Map(actions.map((action) => [action.id, action]))
  const emphasizedActionId = resolvedActionId ?? activeActionId
  const emphasizedZone = closeup.zones?.find((zone) => zone.actionId === emphasizedActionId)
  // The room's current stagecraft anchor, resolved from its phase → authored zone.
  const roomFocus =
    roomStage && roomZones ? roomZones[roomStageFor(roomStage.phase)] : undefined
  // The acoustic-shadow room's current anchor, resolved from its plate → authored
  // zone (near/mid/far as checkpoints cross, credential once the route is ready).
  const acousticFocus =
    acousticStage && acousticZones
      ? acousticZones[acousticShadowStageFor(acousticStage)]
      : undefined
  const derivedFocus = roomFocus ?? acousticFocus
  // A room stage takes precedence for the focus point while a room is active and no
  // method is being previewed/resolved, so the plate drifts along its own vocabulary
  // (the classification drawer/aperture/log, or the corridor's near/mid/far/door).
  const focusPoint =
    derivedFocus && !emphasizedZone
      ? derivedFocus
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
  const acousticPhase = acousticStage?.phase
  const showAcousticStage = Boolean(acousticStage && acousticZones)
  const acousticDepthStage =
    acousticStage && acousticZones
      ? acousticShadowStageFor(acousticStage)
      : acousticResolvedVariant === 'credential'
        ? 'credential'
        : acousticResolvedVariant === 'shadow'
          ? 'far'
          : undefined

  return (
    <figure
      className="site-closeup-stage"
      data-emphasis={emphasizedZone || derivedFocus ? 'true' : undefined}
      data-room-focus={derivedFocus && !emphasizedZone ? 'true' : undefined}
      data-room-phase={phase}
      data-acoustic-phase={acousticPhase}
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
          {depthEnhancementEnabled && acousticDepthAssets && acousticDepthStage ? (
            <AcousticShadowDepthStack
              masterSrc={closeup.src}
              cleanBackplateSrc={acousticDepthAssets.cleanBackplateSrc}
              rainMatteSrc={acousticDepthAssets.rainMatteSrc}
              depthStage={acousticDepthStage}
              pulseKey={
                acousticStage
                  ? `${acousticStage.checkpointIndex}-${acousticStage.pulseIndex}`
                  : `resolved-${acousticResolvedVariant ?? 'none'}`
              }
              resolvedVariant={acousticResolvedVariant}
            />
          ) : null}
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
          {showAcousticStage && acousticStage && acousticZones ? (
            <AcousticShadowStagecraft acousticStage={acousticStage} acousticZones={acousticZones} />
          ) : null}
          {resolvedActionId && acousticZones && acousticResolvedVariant ? (
            <AcousticShadowResolved variant={acousticResolvedVariant} acousticZones={acousticZones} />
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

// A deliberately shallow, source-faithful depth split for the Maintenance master.
// The complete original remains below as the atomic fallback. Two copies of the
// original are clipped to its nearest occluders and move by only a few pixels; an
// edited clean plate is visible solely in the gutters they uncover. A generated
// rain/reflection matte sits above them at low opacity. Both auxiliary assets must
// load before the stack appears; any failure leaves the approved master untouched.
function AcousticShadowDepthStack({
  masterSrc,
  cleanBackplateSrc,
  rainMatteSrc,
  depthStage,
  pulseKey,
  resolvedVariant,
}: {
  masterSrc: string
  cleanBackplateSrc: string
  rainMatteSrc: string
  depthStage: AcousticShadowStageId
  pulseKey: string
  resolvedVariant?: 'shadow' | 'credential'
}) {
  const [cleanLoaded, setCleanLoaded] = useState(false)
  const [rainLoaded, setRainLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const ready = cleanLoaded && rainLoaded && !failed
  const layerStyle = (src: string): CSSProperties => ({
    backgroundImage: `url("${src}")`,
  })

  return (
    <div
      className="site-closeup-acoustic-depth"
      data-ready={ready ? 'true' : undefined}
      data-depth-stage={depthStage}
      data-resolved-variant={resolvedVariant}
    >
      <div className="asc-depth-clean asc-depth-clean--left">
        <img
          src={cleanBackplateSrc}
          alt=""
          width={1600}
          height={900}
          decoding="async"
          onLoad={() => setCleanLoaded(true)}
          onError={() => setFailed(true)}
        />
      </div>
      <div className="asc-depth-clean asc-depth-clean--pier" aria-hidden="true">
        <span style={layerStyle(cleanBackplateSrc)} />
      </div>

      <span
        className="asc-depth-foreground asc-depth-foreground--left"
        style={layerStyle(masterSrc)}
      />
      <span
        className="asc-depth-foreground asc-depth-foreground--pier"
        style={layerStyle(masterSrc)}
      />

      <img
        key={pulseKey}
        className="asc-depth-rain"
        src={rainMatteSrc}
        alt=""
        width={1600}
        height={900}
        decoding="async"
        onLoad={() => setRainLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
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

// The authored, pointer-inert plate overlays for the Acoustic Shadow crossing. They
// live in plate source space (percentage of the 1600×900 projection) from the room's
// authored near/mid/far/credential anchors on the corridor. Progress reads through
// perspective: the three checkpoint registrations march into the vanishing route and
// dim as they are crossed; a shadow break occludes the reflection at the current
// stage; the sealed amber credential only answers once the route is ready. CSS gates
// every one-shot off under reduced motion, landing each phase on its distinct static
// composition. Essential meaning stays in the DOM room text; this is flourish.
function AcousticShadowStagecraft({
  acousticStage,
  acousticZones,
}: {
  acousticStage: AcousticShadowPlateState
  acousticZones: Readonly<Record<AcousticShadowStageId, { x: number; y: number }>>
}) {
  const anchor = (point: { x: number; y: number }): CSSProperties => ({
    left: `${point.x * 100}%`,
    top: `${point.y * 100}%`,
  })
  const depthStages: readonly AcousticShadowStageId[] = ['near', 'mid', 'far']
  const currentStage = acousticShadowStageFor(acousticStage)
  return (
    <div
      className="site-closeup-acoustic"
      data-acoustic-phase={acousticStage.phase}
      data-route-ready={acousticStage.routeReady ? 'true' : undefined}
    >
      {/* Three checkpoint registrations along the corridor depth: ahead, current,
          crossed. Perspective compression + dimming carries the progress. */}
      {depthStages.map((stage, index) => {
        const registration = acousticStage.routeReady
          ? 'crossed'
          : index < acousticStage.checkpointIndex
            ? 'crossed'
            : index === acousticStage.checkpointIndex
              ? 'current'
              : 'ahead'
        return (
          <span
            key={stage}
            className="asc-checkpoint"
            data-depth={stage}
            data-state={registration}
            style={anchor(acousticZones[stage])}
          />
        )
      })}
      {/* The rain-shadow break at the current stage — occludes the beam reflection.
          Remounts per pulse so the occlusion replays; static under reduced motion. */}
      {!acousticStage.routeReady ? (
        <span
          className="asc-shadow"
          key={`shadow-${acousticStage.checkpointIndex}-${acousticStage.pulseIndex}`}
          style={anchor(acousticZones[currentStage])}
        />
      ) : null}
      {/* The sealed service door: faint at rest, a single restrained amber answer
          once the route is ready and the door is noticed. */}
      <span
        className="asc-credential"
        data-route-ready={acousticStage.routeReady ? 'true' : undefined}
        style={anchor(acousticZones.credential)}
      />
    </div>
  )
}

// The settled maintenance closeup after a method is filed. Neither outcome reads as
// the morally correct route: 'shadow' keeps one quiet broken interval in the sensor
// cadence along the corridor with the credential door dormant; 'credential' answers
// the amber aperture at the door while the corridor's sensor chain stays intact. The
// authored resolved record is the semantic explanation; this is decorative.
function AcousticShadowResolved({
  variant,
  acousticZones,
}: {
  variant: 'shadow' | 'credential'
  acousticZones: Readonly<Record<AcousticShadowStageId, { x: number; y: number }>>
}) {
  const anchor = (point: { x: number; y: number }): CSSProperties => ({
    left: `${point.x * 100}%`,
    top: `${point.y * 100}%`,
  })
  return (
    <div className="site-closeup-acoustic-resolved" data-variant={variant}>
      {variant === 'shadow' ? (
        <span className="asc-broken-interval" style={anchor(acousticZones.far)} />
      ) : (
        <span className="asc-credential-amber" style={anchor(acousticZones.credential)} />
      )}
    </div>
  )
}

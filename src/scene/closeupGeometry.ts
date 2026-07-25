import type { CSSProperties } from 'react'
import { acousticShadowStageFor } from '../game/acousticShadow'
import { custodyRailStageFor } from '../game/custodyRail'
import { roomStageFor } from '../game/room'
import type {
  AcousticShadowPlateState,
  AcousticShadowStageId,
  CustodyRailDefinition,
  CustodyRailPlateState,
  RoomPlateState,
  RoomStageId,
  SiteDefinition,
} from '../game/types'

export const SITE_CLOSEUP_ENTRY_MS = 360

type CloseupDefinition = NonNullable<SiteDefinition['closeup']>

interface Anchor {
  x: number
  y: number
}

// The single source of the close-read plate's projection geometry. Both the
// decorative (aria-hidden) plate and the scene-first interactive zone layer read
// these custom properties, so a live button and the prop it names can never
// drift apart under responsive cropping or the action-focus camera.
export function closeupStageStyle(
  closeup: CloseupDefinition,
  entryOrigin: Anchor | undefined,
  focusPoint: Anchor,
): CSSProperties {
  const focalX = closeup.focalPoint?.x ?? 0.5
  const focalY = closeup.focalPoint?.y ?? 0.5
  return {
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
}

interface DerivedFocusInput {
  roomStage?: RoomPlateState
  roomZones?: Readonly<Record<RoomStageId, Anchor>>
  acousticStage?: AcousticShadowPlateState
  acousticZones?: Readonly<Record<AcousticShadowStageId, Anchor>>
  custodyStage?: CustodyRailPlateState
  custodyDefinition?: CustodyRailDefinition
}

// A bounded room's own plate anchor, resolved from its current phase through the
// room's authored zone map. Extracted here (rather than living inside the
// close-read figure) so the decorative plate and the live scene-first zone layer
// read ONE derivation: a ring and the prop it names can never drift apart, and a
// room's camera cannot move under a button that stayed put.
export function derivedStageFocus({
  roomStage,
  roomZones,
  acousticStage,
  acousticZones,
  custodyStage,
  custodyDefinition,
}: DerivedFocusInput): Anchor | undefined {
  const roomFocus = roomStage && roomZones ? roomZones[roomStageFor(roomStage.phase)] : undefined
  const acousticFocus =
    acousticStage && acousticZones
      ? acousticZones[acousticShadowStageFor(acousticStage)]
      : undefined
  const custodyFocus =
    custodyStage && custodyDefinition
      ? custodyDefinition.zones[custodyRailStageFor(custodyStage.phase)]
      : undefined
  return roomFocus ?? acousticFocus ?? custodyFocus
}

// The plate's focus anchor: the emphasized method's authored zone if a method is
// previewed or filed, else the room's own phase anchor while a bounded room is
// active, else the authored focal point.
export function closeupFocusPoint(
  closeup: CloseupDefinition,
  emphasizedActionId: string | null | undefined,
  derivedFocus?: Anchor,
): Anchor {
  const zone = emphasizedActionId
    ? closeup.zones?.find((item) => item.actionId === emphasizedActionId)
    : undefined
  if (derivedFocus && !zone) return derivedFocus
  return {
    x: zone?.x ?? closeup.focalPoint?.x ?? 0.5,
    y: zone?.y ?? closeup.focalPoint?.y ?? 0.5,
  }
}

import type { CSSProperties } from 'react'
import type { SiteDefinition } from '../game/types'

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

// The plate's focus anchor for a plain (roomless) site: the emphasized method's
// authored zone, else the authored focal point. Rooms derive their own focus from
// their phase, so this helper deliberately covers only the scene-first case.
export function closeupFocusPoint(
  closeup: CloseupDefinition,
  emphasizedActionId: string | null | undefined,
): Anchor {
  const zone = emphasizedActionId
    ? closeup.zones?.find((item) => item.actionId === emphasizedActionId)
    : undefined
  return {
    x: zone?.x ?? closeup.focalPoint?.x ?? 0.5,
    y: zone?.y ?? closeup.focalPoint?.y ?? 0.5,
  }
}

import type { CSSProperties } from 'react'
import type { FieldActionDefinition, FieldActionId, SiteDefinition } from '../game/types'

interface SiteCloseupStageProps {
  closeup: NonNullable<SiteDefinition['closeup']>
  actions: readonly FieldActionDefinition[]
  activeActionId: FieldActionId | null
  resolvedActionId?: FieldActionId
}

// A view-only location close read. The authored raster creates spatial identity;
// React and CSS supply its legible state. No evidence or game rule lives here.
export function SiteCloseupStage({
  closeup,
  actions,
  activeActionId,
  resolvedActionId,
}: SiteCloseupStageProps) {
  const focalX = closeup.focalPoint?.x ?? 0.5
  const focalY = closeup.focalPoint?.y ?? 0.5
  const actionById = new Map(actions.map((action) => [action.id, action]))
  const emphasizedActionId = resolvedActionId ?? activeActionId
  const emphasizedZone = closeup.zones?.find((zone) => zone.actionId === emphasizedActionId)
  const stageStyle = {
    '--site-focal-position-x': `${focalX * 100}%`,
    '--site-focal-position-y': `${focalY * 100}%`,
    '--site-focal-offset-x': `${focalX * -100}%`,
    '--site-focal-offset-y': `${focalY * -100}%`,
    '--site-focus-x': `${(emphasizedZone?.x ?? closeup.focalPoint?.x ?? 0.5) * 100}%`,
    '--site-focus-y': `${(emphasizedZone?.y ?? closeup.focalPoint?.y ?? 0.5) * 100}%`,
  } as CSSProperties

  return (
    <figure
      className="site-closeup-stage"
      data-emphasis={emphasizedZone ? 'true' : undefined}
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
          <div className="site-closeup-sweep" />
          {closeup.atmosphere === 'rain-reflection' ? (
            <div className="site-closeup-rain-memory" />
          ) : null}
          {closeup.atmosphere === 'checksum-echo' ? (
            <div className="site-closeup-checksum-echo" />
          ) : null}
          {closeup.atmosphere === 'authority-diagnostic' ? (
            <div className="site-closeup-authority-diagnostic" />
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

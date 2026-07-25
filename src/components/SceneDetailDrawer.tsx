import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { personaName } from '../game/content'
import type {
  AccessibilitySettings,
  FieldActionDefinition,
  PersonaId,
  SiteDefinition,
} from '../game/types'
import { ReactionQuotes } from './ReactionQuotes'
import { recordPortalClass } from './recordMode'

interface SceneDetailDrawerProps {
  site: SiteDefinition
  // Every method authored at this location, in authored order — including after
  // one is filed, so the route not taken stays readable.
  actions: readonly FieldActionDefinition[]
  completedAction?: FieldActionDefinition
  // The admitted evidence title and logged event title, resolved by the caller
  // from the same state the inspector's filed card reads.
  evidenceTitle?: string
  eventTitle?: string
  settings: AccessibilitySettings
  onClose: () => void
}

// The canonical text surface for a scene-first site: full method prose, the
// filed record, and the persona reactions, in a focus-trapped dialog that is
// always reachable and never removed. It reuses the Deposition tray's pattern
// (portalled out of the shell, Escape closes, Tab cycles inside) rather than
// being a CSS-hidden panel, so assistive tech and detail-readers keep the exact
// text the in-scene captions abbreviate.
export function SceneDetailDrawer({
  site,
  actions,
  completedAction,
  evidenceTitle,
  eventTitle,
  settings,
  onClose,
}: SceneDetailDrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null
    const frame = window.requestAnimationFrame(() => {
      dialogRef.current?.focus({ preventScroll: true })
    })
    return () => {
      window.cancelAnimationFrame(frame)
      returnFocusRef.current?.focus?.({ preventScroll: true })
    }
  }, [])

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    if (!focusables || focusables.length === 0) return
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  // Portalled outside .annex-app, so the view-preference classes are re-declared
  // at the boundary exactly as the deposition tray does — through the one shared
  // seam, which also names this drawer a RECORD MODE surface.
  const portalClass = recordPortalClass('scene-detail-portal', settings)

  const trustEntries = Object.entries(completedAction?.trust ?? {}).filter(
    ([, delta]) => delta !== 0,
  )

  return createPortal(
    <div className={portalClass}>
      <div
        className="scene-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scene-detail-heading"
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={handleKeyDown}
      >
        <header className="scene-detail-header">
          <div>
            <p className="section-context">Location detail</p>
            <h2 id="scene-detail-heading">
              {site.index} · {site.name}
            </h2>
          </div>
          <button className="scene-detail-close" type="button" onClick={onClose}>
            Close <span aria-hidden="true">✕</span>
          </button>
        </header>

        <div className="scene-detail-body">
          <p className="scene-detail-description">{site.description}</p>

          {completedAction ? (
            <section className="scene-detail-filed" aria-label="Filed result">
              <h3>{eventTitle ?? completedAction.eventTitle}</h3>
              <p>{completedAction.eventDetail}</p>
              <div className="record-delta">
                {evidenceTitle && (
                  <span>
                    <small>Evidence admitted</small>
                    <strong>{evidenceTitle}</strong>
                  </span>
                )}
                <span>
                  <small>Civic trace</small>
                  <strong className={completedAction.alarmDelta > 0 ? 'text-risk' : ''}>
                    {completedAction.alarmDelta > 0
                      ? `+${completedAction.alarmDelta} alarm`
                      : 'No new trace'}
                  </strong>
                </span>
                {trustEntries.length > 0 && (
                  <span>
                    <small>Standing</small>
                    <strong>
                      {trustEntries
                        .map(
                          ([id, delta]) =>
                            `${personaName(id as PersonaId)} ${delta > 0 ? '+' : ''}${delta}`,
                        )
                        .join(' · ')}
                    </strong>
                  </span>
                )}
                {completedAction.grantsTribunalOverride && (
                  <span>
                    <small>Authority</small>
                    <strong>Override acquired</strong>
                  </span>
                )}
              </div>
              <ReactionQuotes reactions={completedAction.reactions} />
            </section>
          ) : null}

          <section className="scene-detail-methods" aria-label="Methods at this location">
            <h3>{completedAction ? 'Both methods, in full' : 'The methods in this room'}</h3>
            {actions.map((action) => (
              <article
                className="scene-detail-method"
                data-filed={action.id === completedAction?.id ? 'true' : undefined}
                key={action.id}
              >
                <p className="scene-detail-method-label">{action.methodLabel}</p>
                <h4>{action.title}</h4>
                <p>{action.description}</p>
                <p className="scene-detail-method-cost">{action.consequence}</p>
              </article>
            ))}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  )
}

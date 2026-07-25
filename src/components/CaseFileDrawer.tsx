import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getCaseContent } from '../game/content'
import type { AccessibilitySettings, GameState } from '../game/types'
import { CaseRail } from './CaseRail'

interface CaseFileDrawerProps {
  state: GameState
  onClose: () => void
}

interface CaseFileSummonProps {
  state: GameState
  onOpen: () => void
  className?: string
}

// ONE definition of the summon, mounted in exactly one place at a time: on the
// scene chrome during the investigation, and in the shell on every other case
// surface (briefing, memory lattice, tribunal, debrief), which no longer carry a
// rail column of their own. The counts ARE the preview — they are what keeps a
// summoned surface from feeling hidden.
export function CaseFileSummon({ state, onOpen, className }: CaseFileSummonProps) {
  // The two live counts the retired mobile rail toggle used to print, resolved
  // the way the rail itself resolves them, so the button and the surface it
  // opens can never disagree.
  const { evidenceDefinitions } = getCaseContent(state.caseId)
  const counts = {
    evidence: evidenceDefinitions.filter((item) => state.evidence.includes(item.id)).length,
    events: state.events.length,
  }
  return (
    <button
      className={['casefile-summon', className].filter(Boolean).join(' ')}
      type="button"
      onClick={onOpen}
    >
      <strong>Case file</strong>
      <small>
        {counts.evidence} evidence · {counts.events} events
      </small>
    </button>
  )
}

// The case file, summoned. A right-docked focus-trapped drawer at ≥900px and a
// full-height sheet below 700px, hosting the existing CaseRail — case, evidence,
// log, and the roster dossier — as its four tabs.
//
// It copies SceneDetailDrawer's conventions exactly rather than inventing a
// second dialog idiom: portalled to <body>, role="dialog" + aria-modal, rAF
// focus with preventScroll (frame cancelled on unmount, per the recorded
// rAF-focus-after-unmount scar), Escape stops propagation and closes, Tab cycles
// inside, focus is returned to the summoning button on unmount, and the
// view-preference classes are repeated at the portal boundary because the portal
// lands outside .annex-app.
//
// Mutual exclusivity with the location-detail drawer is enforced by the caller
// (opening one closes the other), so there is never more than one aria-modal
// dialog over the plate — the double-trap hazard the tabbed design exists to
// remove.
export function CaseFileDrawer({ state, onClose }: CaseFileDrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const settings: AccessibilitySettings = state.settings

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
    // Wider than the detail drawer's selector on purpose: the rail's evidence
    // entries and the filed-model block are <details>, whose <summary> is
    // natively tabbable. Leaving summaries out of the cycle would let Tab walk
    // out of the dialog from the last one.
    const focusables = [
      ...(dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), summary, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? []),
    ].filter((element) => element.offsetParent !== null || element === document.activeElement)
    if (focusables.length === 0) return
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

  const portalClass = [
    'casefile-portal',
    settings.highContrast ? 'high-contrast' : '',
    settings.reducedMotion ? 'reduce-motion' : '',
    settings.textSize === 'large' ? 'large-text' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return createPortal(
    <div className={portalClass}>
      <div
        className="casefile-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="casefile-heading"
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={handleKeyDown}
      >
        <header className="casefile-header">
          <div>
            <p className="section-context">Held on this case</p>
            <h2 id="casefile-heading">Case file</h2>
          </div>
          <button className="casefile-close" type="button" onClick={onClose}>
            Close <span aria-hidden="true">✕</span>
          </button>
        </header>
        <CaseRail state={state} />
      </div>
    </div>,
    document.body,
  )
}

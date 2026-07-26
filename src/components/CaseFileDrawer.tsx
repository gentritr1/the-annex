import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getCaseContent } from '../game/content'
import type { AccessibilitySettings, GameState } from '../game/types'
import { CaseRail } from './CaseRail'
import { purposeCopy, showsCaseFilePurpose } from './purposeCopy'
import { recordPortalClass } from './recordMode'

interface CaseFileDrawerProps {
  state: GameState
  onClose: () => void
  // The run's query trail and the way to append to it. Both are owned by the
  // shell, not by this drawer: the drawer unmounts every time it closes, and a
  // trail that unmounted with it would never accumulate. View-local, never
  // persisted (App.tsx states why).
  queryTrail: readonly string[]
  onQuery: (query: string) => void
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
  // W1-4 · P2-F. While nothing is admitted, the counts state a fact with no
  // content behind it — the one moment a first-timer cannot tell why this button
  // is worth pressing. The purpose line joins them (it does NOT replace them:
  // three harness assertions read the live counts out of this button's text) and
  // leaves permanently the moment the first evidence is admitted.
  const orientPurpose = showsCaseFilePurpose(state, counts.evidence)
  return (
    <button
      className={['casefile-summon', orientPurpose ? 'casefile-summon--oriented' : null, className]
        .filter(Boolean)
        .join(' ')}
      type="button"
      onClick={onOpen}
    >
      <strong>Case file</strong>
      <small>
        {counts.evidence} evidence · {counts.events} events
      </small>
      {orientPurpose && <small className="casefile-summon-why">{purposeCopy.caseFile}</small>}
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
export function CaseFileDrawer({ state, onClose, queryTrail, onQuery }: CaseFileDrawerProps) {
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

  // One shared seam for the preference classes and the RECORD MODE name; see
  // components/recordMode.ts.
  const portalClass = recordPortalClass('casefile-portal', settings)

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
        <CaseRail state={state} queryTrail={queryTrail} onQuery={onQuery} />
      </div>
    </div>,
    document.body,
  )
}

import { useEffect, useRef, useState } from 'react'
import { getCaseContent } from '../game/content'
import type { FragmentId, GameState } from '../game/types'

interface ReconstructionProps {
  state: GameState
  onToggleFragment: (fragmentId: FragmentId) => void
  onSubmit: () => void
  onBack: () => void
}

export function Reconstruction({
  state,
  onToggleFragment,
  onSubmit,
  onBack,
}: ReconstructionProps) {
  const { fragments, fragmentEvidenceLinks, evidenceDefinitions } = getCaseContent(state.caseId)
  const [commitArmed, setCommitArmed] = useState(false)
  const commitRef = useRef<HTMLButtonElement>(null)

  // Same step-back gestures as the field/tribunal commit rows: pointer down
  // outside the commit button, Escape, or focus loss (onBlur) disarm silently.
  useEffect(() => {
    if (!commitArmed) return
    function onPointerDown(event: PointerEvent) {
      if (commitRef.current?.contains(event.target as Node)) return
      setCommitArmed(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setCommitArmed(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [commitArmed])

  function commitReconstruction() {
    if (!commitArmed) {
      setCommitArmed(true)
      return
    }
    onSubmit()
  }

  return (
    <article className="phase-page lattice-page">
      <header className="lattice-header">
        <button className="back-button" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span> Return to field
        </button>
        <p className="case-code">Cognitive reconstruction · bounded model</p>
        <h1>Choose two anchors that may coexist</h1>
        <p>
          You are not finding the correct memory. You are deciding which kinds of evidence can support
          one account of a self.
        </p>
      </header>

      <div className="lattice-rule" role="note">
        <span>Rule</span>
        <p>
          Select exactly two fragments. Every pairing produces a valid filing with a different
          contradiction.
        </p>
        <strong>{state.selectedFragments.length} / 2</strong>
      </div>

      <div className="fragment-list" aria-label="Memory fragments">
        {fragments.map((fragment) => {
          const selected = state.selectedFragments.includes(fragment.id)
          const corroboratingEvidence = evidenceDefinitions.find(
            (evidence) =>
              state.evidence.includes(evidence.id) &&
              fragmentEvidenceLinks[fragment.id].includes(evidence.id),
          )
          return (
            <button
              className={`fragment-row ${selected ? 'fragment-row-selected' : ''}`}
              type="button"
              aria-pressed={selected}
              key={fragment.id}
              onClick={() => onToggleFragment(fragment.id)}
            >
              <span className="fragment-selector" aria-hidden="true">
                {selected ? '✓' : ''}
              </span>
              <span className="fragment-code">{fragment.timecode}</span>
              <span className="fragment-body">
                <strong>{fragment.title}</strong>
                <span>{fragment.content}</span>
                <small>{fragment.source}</small>
                <span
                  className={`fragment-evidence-state ${corroboratingEvidence ? 'fragment-corroborated' : ''}`}
                >
                  {corroboratingEvidence
                    ? `Corroborated by field: ${corroboratingEvidence.title}`
                    : 'Not corroborated by your field route'}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <footer className="phase-footer lattice-footer">
        <div className={`lattice-cost ${commitArmed ? 'lattice-cost-armed' : ''}`}>
          <strong>Filing is irreversible for this run.</strong>
          <p>You can inspect another interpretation on the next loop.</p>
        </div>
        {/* Same view-layer arm announcement as the field/tribunal rows; empty
            at rest, so every arm announces and every disarm stays silent. */}
        <span className="sr-only" role="status" aria-live="polite">
          {commitArmed ? 'Reconstruction filing — select again to file.' : ''}
        </span>
        <button
          ref={commitRef}
          className={`button button-primary ${commitArmed ? 'button-armed' : ''}`}
          type="button"
          aria-pressed={commitArmed}
          onClick={commitReconstruction}
          onBlur={() => setCommitArmed(false)}
          disabled={state.selectedFragments.length !== 2}
        >
          {commitArmed ? 'Confirm irreversible filing — select again to file' : 'File reconstruction'}{' '}
          <span aria-hidden="true">{commitArmed ? '✓' : '→'}</span>
        </button>
      </footer>
    </article>
  )
}

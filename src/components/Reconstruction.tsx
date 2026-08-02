import { useEffect, useRef, useState } from 'react'
import { getCaseContent } from '../game/content'
import {
  getFiledFragmentDiscoveries,
  getFragmentKnowledge,
  getReconstructionPreview,
  type FragmentKnowledge,
} from '../game/engine'
import { MemoryLatticeStage } from '../scene/MemoryLatticeStage'
import type { FragmentId, GameState } from '../game/types'
import { purposeCopy, showsLatticePurpose } from './purposeCopy'

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
  const {
    fragments,
    fragmentEvidenceLinks,
    evidenceDefinitions,
  } = getCaseContent(state.caseId)
  const [commitArmed, setCommitArmed] = useState(false)
  const commitRef = useRef<HTMLButtonElement>(null)
  const fragmentKnowledgeById = Object.fromEntries(
    fragments.map((fragment) => [fragment.id, getFragmentKnowledge(state, fragment.id)]),
  ) as Readonly<Record<FragmentId, FragmentKnowledge>>
  const preview = getReconstructionPreview(state, state.selectedFragments)
  const validPair = preview !== null

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
    if (!validPair) return
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
        <h1>Build one account from two anchors</h1>
        <p>Pair two known fragments. The filing preserves the contradiction between them.</p>
      </header>

      {/* W1-4 · P2-F. The lattice states its rule and its cost and never its
          purpose. Deliberately a SIBLING of the header, not a child of it:
          `.lattice-header > p:last-child` carries the intro paragraph's width
          and colour, and a new last child would silently steal them. Retires
          the moment a model exists. */}
      {showsLatticePurpose(state) && <p className="lattice-purpose">{purposeCopy.lattice}</p>}

      <div className="lattice-rule" role="note">
        <span>Rule</span>
        <p>Two known anchors. At least one corroborated. Pairings may converge.</p>
        <strong>{state.selectedFragments.length} / 2</strong>
      </div>

      <div className="lattice-workspace">
        <MemoryLatticeStage
          fragments={fragments}
          selectedFragments={state.selectedFragments}
          fragmentKnowledgeById={fragmentKnowledgeById}
        />

        <div className="fragment-list lattice-fragment-list" aria-label="Memory fragments">
          {fragments.map((fragment) => {
            const selected = state.selectedFragments.includes(fragment.id)
            const knowledge = fragmentKnowledgeById[fragment.id]
            const corroboratingEvidence = evidenceDefinitions.find(
              (evidence) =>
                knowledge === 'corroborated' &&
                state.evidence.includes(evidence.id) &&
                fragmentEvidenceLinks[fragment.id].includes(evidence.id),
            )
            const discoveryRecords = getFiledFragmentDiscoveries(state, fragment.id)
            const discoverySources = discoveryRecords.map((record) => record.source)
            const stateDescription =
              knowledge === 'corroborated'
                ? `Corroborated by field evidence: ${corroboratingEvidence?.title ?? 'filed evidence'}.`
                : knowledge === 'discovered'
                  ? `Known through ${discoverySources.join(' and ')}. Not corroborated by your field record.`
                  : selected
                    ? 'Sealed / unknown. This stale selection remains available only so you can remove it.'
                    : 'Sealed / unknown. File a listed location before selecting this anchor.'
            const buttonLabel =
              knowledge === 'unknown'
                ? selected
                  ? 'Sealed unknown anchor selected. Select again to remove it.'
                  : 'Sealed unknown anchor. File a listed location before selecting it.'
                : `${fragment.title}. ${stateDescription}`
            return (
              <button
                className={`fragment-row fragment-row-${knowledge} ${selected ? 'fragment-row-selected' : ''}`}
                type="button"
                aria-pressed={selected}
                aria-label={buttonLabel}
                data-fragment-id={fragment.id}
                data-fragment-knowledge={knowledge}
                key={fragment.id}
                onClick={() => onToggleFragment(fragment.id)}
                disabled={!selected && knowledge === 'unknown'}
              >
                <span className="fragment-selector" aria-hidden="true">
                  {selected ? '✓' : ''}
                </span>
                <span className="fragment-code">
                  {knowledge === 'unknown' ? 'SEALED' : fragment.timecode}
                </span>
                <span className="fragment-body">
                  <strong>{knowledge === 'unknown' ? 'Unknown anchor' : fragment.title}</strong>
                  <span>
                    {knowledge === 'unknown'
                      ? 'Its timecode, account, and source remain sealed.'
                      : fragment.content}
                  </span>
                  <small>{knowledge === 'unknown' ? 'Source sealed' : fragment.source}</small>
                  {knowledge !== 'unknown' && discoveryRecords.length > 0 && (
                    <small className="fragment-discovery-source">
                      Filed source: {discoverySources.join(' · ')}
                    </small>
                  )}
                  <span
                    className={`fragment-evidence-state fragment-${knowledge}`}
                  >
                    {stateDescription}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {preview ? (
        <section
          className="reconstruction-preview"
          data-reconstruction-preview={preview.modelId}
          aria-labelledby="reconstruction-preview-heading"
        >
          <p className="section-context">Argument this pair will file</p>
          <h2 id="reconstruction-preview-heading">{preview.title}</h2>
          <p>{preview.thesis}</p>
          <p className="reconstruction-preview-limitation">
            <strong>Limitation:</strong> {preview.limitation}
          </p>
          <p className="reconstruction-preview-support">
            Support: {preview.corroboratedAnchors} of 2 anchors corroborated · {preview.supportStatus}.
          </p>
        </section>
      ) : null}

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
          disabled={!validPair}
        >
          {commitArmed
            ? `Confirm ${preview?.title ?? 'reconstruction'} filing — select again to file`
            : preview
              ? `File ${preview.title} model`
              : 'File reconstruction'}{' '}
          <span aria-hidden="true">{commitArmed ? '✓' : '→'}</span>
        </button>
      </footer>
    </article>
  )
}

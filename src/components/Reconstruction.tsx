import { useEffect, useMemo, useRef, useState } from 'react'
import { getCaseContent } from '../game/content'
import {
  getFragmentKnowledge,
  getReconstructionAnchorStates,
  getSpeculativeFragmentIds,
} from '../game/causal'
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
  const content = getCaseContent(state.caseId)
  const { fragments, evidenceDefinitions } = content
  const [commitArmed, setCommitArmed] = useState(false)
  const [speculationAcknowledged, setSpeculationAcknowledged] = useState(false)
  const commitRef = useRef<HTMLButtonElement>(null)
  const anchorStates = getReconstructionAnchorStates(content, state)
  const speculativeFragmentIds = getSpeculativeFragmentIds(content, state)
  const selectedStateKey = state.selectedFragments
    .map((fragmentId) => `${fragmentId}:${anchorStates[fragmentId]}`)
    .join('|')

  const latticeFragments = useMemo(
    () =>
      fragments.map((fragment) =>
        anchorStates[fragment.id] === 'unknown'
          ? {
              ...fragment,
              timecode: '—',
              title: 'Unknown anchor',
              content: 'Decisive content remains withheld until a field action makes this fragment known.',
              source: 'Source not yet encountered',
            }
          : fragment,
      ),
    [anchorStates, fragments],
  )

  const corroboratedFragmentIds = fragments
    .filter((fragment) => anchorStates[fragment.id] === 'corroborated')
    .map((fragment) => fragment.id)
  const selectedCorroboratedCount = state.selectedFragments.filter(
    (fragmentId) => anchorStates[fragmentId] === 'corroborated',
  ).length
  const selectionContainsUnknown = state.selectedFragments.some(
    (fragmentId) => anchorStates[fragmentId] === 'unknown',
  )
  const requiresSpeculationAcknowledgement = speculativeFragmentIds.length > 0
  const validSelection =
    state.selectedFragments.length === 2 &&
    selectedCorroboratedCount >= 1 &&
    !selectionContainsUnknown
  const canFile =
    validSelection &&
    (!requiresSpeculationAcknowledgement || speculationAcknowledged)

  useEffect(() => {
    setCommitArmed(false)
    setSpeculationAcknowledged(false)
  }, [selectedStateKey])

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
    if (!canFile) return
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

      {showsLatticePurpose(state) && <p className="lattice-purpose">{purposeCopy.lattice}</p>}

      <div className="lattice-rule" role="note">
        <span>Rule</span>
        <p>Every pair produces a valid but incomplete model. Unsupported anchors remain contested.</p>
        <strong>{state.selectedFragments.length} / 2</strong>
      </div>

      <div className="lattice-knowledge-legend" aria-label="Fragment knowledge states">
        <span data-knowledge="unknown">Unknown · decisive content withheld</span>
        <span data-knowledge="known">Known · unsupported and speculative</span>
        <span data-knowledge="corroborated">Corroborated · linked to admitted field evidence</span>
      </div>

      <div className="lattice-workspace">
        <MemoryLatticeStage
          fragments={latticeFragments}
          selectedFragments={state.selectedFragments}
          corroboratedFragmentIds={corroboratedFragmentIds}
        />

        <div className="fragment-list lattice-fragment-list" aria-label="Memory fragments">
          {fragments.map((fragment) => {
            const selected = state.selectedFragments.includes(fragment.id)
            const knowledge = getFragmentKnowledge(content, state, fragment.id)
            const corroboratingEvidence = evidenceDefinitions.find(
              (evidence) =>
                state.evidence.includes(evidence.id) &&
                content.fragmentEvidenceLinks[fragment.id].includes(evidence.id),
            )
            const unknown = knowledge === 'unknown'
            const stateLabel =
              knowledge === 'corroborated'
                ? `Corroborated by field: ${corroboratingEvidence?.title ?? 'admitted evidence'}`
                : knowledge === 'known'
                  ? 'Known but unsupported · selecting this anchor is speculative'
                  : 'Unknown · full content remains withheld'
            return (
              <button
                className={`fragment-row ${selected ? 'fragment-row-selected' : ''}`}
                type="button"
                aria-pressed={selected}
                aria-disabled={unknown ? 'true' : undefined}
                data-knowledge={knowledge}
                key={fragment.id}
                onClick={() => {
                  if (!unknown || selected) onToggleFragment(fragment.id)
                }}
              >
                <span className="fragment-selector" aria-hidden="true">
                  {selected ? '✓' : unknown ? '×' : ''}
                </span>
                <span className="fragment-code">{unknown ? '—' : fragment.timecode}</span>
                <span className="fragment-body">
                  <strong>{unknown ? 'Unknown anchor' : fragment.title}</strong>
                  <span>
                    {unknown
                      ? 'Continue the field investigation to make this anchor knowable.'
                      : fragment.content}
                  </span>
                  <small>{unknown ? 'Source not yet encountered' : fragment.source}</small>
                  <span
                    className={`fragment-evidence-state ${knowledge === 'corroborated' ? 'fragment-corroborated' : ''}`}
                  >
                    {stateLabel}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {requiresSpeculationAcknowledgement && (
        <section className="speculative-filing" role="note" aria-labelledby="speculative-heading">
          <div>
            <span>Hearing cost</span>
            <h2 id="speculative-heading">One selected anchor is known but unsupported</h2>
            <p>
              The tribunal will retain it as speculative, invite an authored objection, and keep the
              contested state in the debrief. It will never be displayed as corroborated evidence.
            </p>
          </div>
          <label>
            <input
              type="checkbox"
              checked={speculationAcknowledged}
              onChange={(event) => {
                setCommitArmed(false)
                setSpeculationAcknowledged(event.currentTarget.checked)
              }}
            />
            I acknowledge that this anchor remains contested.
          </label>
        </section>
      )}

      {!validSelection && state.selectedFragments.length === 2 && (
        <p className="lattice-invalid" role="status">
          A valid filing needs at least one corroborated anchor. Unknown anchors cannot be filed.
        </p>
      )}

      <footer className="phase-footer lattice-footer">
        <div className={`lattice-cost ${commitArmed ? 'lattice-cost-armed' : ''}`}>
          <strong>Filing is irreversible for this run.</strong>
          <p>
            {requiresSpeculationAcknowledgement
              ? 'The unsupported anchor will remain contested through the hearing and debrief.'
              : 'You can inspect another interpretation on the next loop.'}
          </p>
        </div>
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
          disabled={!canFile}
        >
          {commitArmed ? 'Confirm irreversible filing — select again to file' : 'File reconstruction'}{' '}
          <span aria-hidden="true">{commitArmed ? '✓' : '→'}</span>
        </button>
      </footer>
    </article>
  )
}

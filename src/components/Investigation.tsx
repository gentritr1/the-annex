import { useState } from 'react'
import { getCaseContent } from '../game/content'
import { canEnterTribunal } from '../game/engine'
import { SceneStage } from '../scene/SceneStage'
import { sceneStateFor } from '../scene/sceneState'
import type { DepositionChoiceId, FieldActionId, GameState, SiteId } from '../game/types'
import { ChoiceButton } from './ChoiceButton'
import { Deposition } from './Deposition'
import { ReactionQuotes } from './ReactionQuotes'

interface InvestigationProps {
  state: GameState
  onCommitAction: (actionId: FieldActionId) => void
  onCommitDeposition: (
    actionId: FieldActionId,
    beats: DepositionChoiceId[],
    askedConsent: boolean,
  ) => void
  onOpenReconstruction: () => void
  onEnterTribunal: () => void
}

// A hotspot is wayfinding: activating it scrolls to and focuses that site's card,
// which stays the canonical interaction surface.
function focusSiteCard(siteId: SiteId, reducedMotion: boolean) {
  const card = document.getElementById(`site-card-${siteId}`)
  if (!card) return
  card.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
  card.focus({ preventScroll: true })
}

export function Investigation({
  state,
  onCommitAction,
  onCommitDeposition,
  onOpenReconstruction,
  onEnterTribunal,
}: InvestigationProps) {
  const { sites, fieldActions, reconstructionDefinitions, chrome, deposition, scene } =
    getCaseContent(state.caseId)
  const reconstruction = reconstructionDefinitions.find((item) => item.id === state.reconstruction)
  // Which deposition entry action, if any, has its transcript open. Local view
  // state only: opening it dispatches nothing, and closing it commits nothing.
  const [depositionEntry, setDepositionEntry] = useState<FieldActionId | null>(null)
  // The scene state is a pure read of GameState + the open-deposition view: the
  // interior presses/corroborates while a transcript is open, and holds refusal
  // after a refused consent. A flat map (Case 77) resolves to 'neutral' here.
  const sceneState = sceneStateFor(state, {
    surface: 'investigation',
    openDepositionEntry: depositionEntry,
  })
  const diorama = Boolean(scene.LayerArt)
  // Caption precipitation number: only meaningful for a rain scene (Case 77's
  // identity). Kept as the single source of truth for the reported percentage.
  const captionMask = scene.weather.kind === 'rain' ? scene.weather.intensity.neutral ?? 0 : null
  const tribunalReady = canEnterTribunal(state)
  const sitesNeeded = Math.max(0, 2 - state.completedSites.length)
  const gateRequirements = [
    sitesNeeded > 0
      ? `Complete ${sitesNeeded} more field site${sitesNeeded === 1 ? '' : 's'}.`
      : null,
    !reconstruction ? 'File one memory reconstruction.' : null,
  ].filter((requirement): requirement is string => requirement !== null)
  const gateRequirement = gateRequirements.join(' ')

  return (
    <article className="phase-page investigation-page">
      <div className="world-view">
        {/* The live scene: the diorama (Case 81) or the flat civic map (Case 77),
            with a plane-registered hotspot overlay. The art stack is aria-hidden;
            the hotspots are real buttons that focus their site card below. */}
        <SceneStage
          scene={scene}
          sceneState={sceneState}
          reducedMotion={state.settings.reducedMotion}
          interactive
          parallax={diorama}
          sites={sites}
          completedSiteIds={state.completedSites}
          onHotspotActivate={(siteId) => focusSiteCard(siteId, state.settings.reducedMotion)}
          ariaLabel={chrome.worldAriaLabel}
        />
        <div className="world-caption">
          <span>{chrome.worldCaption[0]}</span>
          {captionMask !== null && (
            <span>
              {chrome.worldCaption[1]}: {Math.round(captionMask * 100)}%
            </span>
          )}
        </div>
      </div>

      <section className="phase-section field-section" aria-labelledby="field-heading">
        <div className="section-heading">
          <div>
            <p className="section-context">Active field record</p>
            <h1 id="field-heading">Choose what becomes admissible</h1>
            <p>
              Each site closes after one method. There is no failed route—only a record of what you
              risked, protected, or refused.
            </p>
          </div>
          <span className="selection-count">
            {state.completedSites.length} chosen · 2 required
          </span>
        </div>

        <div className="site-list">
          {sites.map((site) => {
            const completedAction = fieldActions.find(
              (action) => action.siteId === site.id && state.completedActions.includes(action.id),
            )

            return (
              <section
                className={`site-record ${completedAction ? 'site-record-complete' : ''}`}
                key={site.id}
                id={`site-card-${site.id}`}
                tabIndex={-1}
              >
                <header className="site-header">
                  <span className="site-index">{site.index}</span>
                  <div>
                    <h2>{site.name}</h2>
                    <p>{site.description}</p>
                  </div>
                  <span className={`site-state ${completedAction ? 'state-filed' : 'state-open'}`}>
                    {completedAction ? 'Filed' : 'Open'}
                  </span>
                </header>

                {completedAction ? (
                  <div className="resolved-action">
                    <span className="resolved-mark" aria-hidden="true">
                      ✓
                    </span>
                    <div>
                      <strong>{completedAction.title}</strong>
                      <p>{completedAction.eventDetail}</p>
                      <ReactionQuotes reactions={completedAction.reactions} />
                    </div>
                  </div>
                ) : (
                  <div className="site-actions">
                    {site.actionIds.map((actionId) => {
                      const action = fieldActions.find((item) => item.id === actionId)
                      if (!action) return null

                      // A deposition entry action opens the transcript instead of
                      // resolving instantly; its own confirm is the final commit.
                      const isDepositionEntry = Boolean(
                        deposition?.entryActionIds.includes(action.id),
                      )

                      return (
                        <ChoiceButton
                          key={action.id}
                          title={action.title}
                          label={action.methodLabel}
                          description={action.description}
                          consequence={action.consequence}
                          tone={action.alarmDelta > 0 ? 'risk' : 'default'}
                          aside={isDepositionEntry ? 'Open transcript' : undefined}
                          requiresConfirmation={!isDepositionEntry}
                          onClick={
                            isDepositionEntry
                              ? () => setDepositionEntry(action.id)
                              : () => onCommitAction(action.id)
                          }
                        />
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </section>

      <section className="convergence-panel" aria-labelledby="lattice-heading">
        <div className="convergence-index" aria-hidden="true">
          ◫
        </div>
        <div className="convergence-copy">
          <p className="section-context">Required synthesis</p>
          <h2 id="lattice-heading">Memory lattice</h2>
          {reconstruction ? (
            <>
              <p>
                <strong>{reconstruction.title}:</strong> {reconstruction.thesis}
              </p>
              <span className="filed-badge">Model filed</span>
              <ReactionQuotes reactions={reconstruction.reactions} />
            </>
          ) : (
            <p>Select two anchors. Every pairing is admissible, but each makes a different claim.</p>
          )}
        </div>
        {!reconstruction && (
          <button
            className="button button-secondary"
            type="button"
            onClick={onOpenReconstruction}
            disabled={state.completedSites.length === 0}
          >
            Open lattice <span aria-hidden="true">→</span>
          </button>
        )}
        {!reconstruction && state.completedSites.length === 0 && (
          <p className="convergence-hint">Visit one field site before reconstructing the record.</p>
        )}
      </section>

      <section className={`tribunal-gate ${tribunalReady ? 'tribunal-gate-ready' : ''}`}>
        <div>
          <p className="section-context">Convergence point</p>
          <h2>{tribunalReady ? 'The tribunal is ready' : 'Tribunal channel withheld'}</h2>
          <p>
            {tribunalReady
              ? 'You may continue investigating or resolve the case with the record you have made.'
              : gateRequirement}
          </p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={onEnterTribunal}
          disabled={!tribunalReady}
        >
          Enter tribunal <span aria-hidden="true">→</span>
        </button>
      </section>

      {depositionEntry && (
        <Deposition
          state={state}
          entryActionId={depositionEntry}
          onCommit={(actionId, beats, askedConsent) => {
            setDepositionEntry(null)
            onCommitDeposition(actionId, beats, askedConsent)
          }}
          onAbandon={() => setDepositionEntry(null)}
        />
      )}
    </article>
  )
}

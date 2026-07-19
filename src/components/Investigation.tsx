import { Atmosphere } from '../ambience/Atmosphere'
import { getCaseContent } from '../game/content'
import { canEnterTribunal } from '../game/engine'
import type { FieldActionId, GameState } from '../game/types'
import { ChoiceButton } from './ChoiceButton'
import { ReactionQuotes } from './ReactionQuotes'

interface InvestigationProps {
  state: GameState
  onCommitAction: (actionId: FieldActionId) => void
  onOpenReconstruction: () => void
  onEnterTribunal: () => void
}

export function Investigation({
  state,
  onCommitAction,
  onOpenReconstruction,
  onEnterTribunal,
}: InvestigationProps) {
  const { sites, fieldActions, reconstructionDefinitions, chrome } = getCaseContent(state.caseId)
  const reconstruction = reconstructionDefinitions.find((item) => item.id === state.reconstruction)
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
      <div className="world-view" role="img" aria-label={chrome.worldAriaLabel}>
        {/* Rain at 0.07, parallax locked flat (no planes) so the map annotation
            nodes stay registered against the artwork. */}
        <Atmosphere mask={0.07} reducedMotion={state.settings.reducedMotion} />
        <div className="world-scan" aria-hidden="true" />
        {chrome.worldLabels.map((label) => (
          <div className={label.className} key={label.className}>
            {label.text}
          </div>
        ))}
        <div className="world-caption">
          <span>{chrome.worldCaption[0]}</span>
          <span>{chrome.worldCaption[1]}</span>
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
              <section className={`site-record ${completedAction ? 'site-record-complete' : ''}`} key={site.id}>
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

                      return (
                        <ChoiceButton
                          key={action.id}
                          title={action.title}
                          label={action.methodLabel}
                          description={action.description}
                          consequence={action.consequence}
                          tone={action.alarmDelta > 0 ? 'risk' : 'default'}
                          requiresConfirmation
                          onClick={() => onCommitAction(action.id)}
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
    </article>
  )
}

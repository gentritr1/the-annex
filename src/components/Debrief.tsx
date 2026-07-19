import { MirrorSigil, PersonaSigil } from '../ambience/sigils'
import { getCaseContent, getTensionLine, personas } from '../game/content'
import { getTrustLabel } from '../game/engine'
import type {
  CaseDefinition,
  CaseSwitchOption,
  FieldActionId,
  GameState,
  SiteDefinition,
} from '../game/types'

interface DebriefProps {
  state: GameState
  onNextRun: () => void
  // Cases this completed run may switch to; the run's verdict already carries as
  // a precedent, so no confirmation is needed from the debrief.
  switchTargets: readonly CaseSwitchOption[]
  onSwitchCase: (caseId: string) => void
  onReturnToTitle: () => void
}

// For a visited site, the sibling action the auditor did not take carries the
// counterfactual note. For an unvisited site, the site's own note stands in.
function refusalNoteForSite(
  site: SiteDefinition,
  completedActions: readonly FieldActionId[],
  content: CaseDefinition,
): string {
  const takenActionId = site.actionIds.find((actionId) => completedActions.includes(actionId))
  if (!takenActionId) return site.unvisitedNote

  const notTakenId = site.actionIds.find((actionId) => actionId !== takenActionId)
  const notTaken = content.fieldActions.find((item) => item.id === notTakenId)
  return notTaken?.counterfactualNote ?? ''
}

export function Debrief({
  state,
  onNextRun,
  switchTargets,
  onSwitchCase,
  onReturnToTitle,
}: DebriefProps) {
  const content = getCaseContent(state.caseId)
  const { decisions, approaches, evidenceDefinitions, sites } = content
  const decision = decisions.find((item) => item.id === state.decision)
  const approach = approaches.find((item) => item.id === state.primaryApproach)
  const discoveredEvidence = evidenceDefinitions.filter((item) => state.evidence.includes(item.id))
  const consequenceLines = state.decision ? content.decisionConsequences[state.decision] ?? [] : []
  const tensionEcho =
    state.reconstruction && state.decision
      ? getTensionLine(state.caseId, state.reconstruction, state.decision)
      : null

  return (
    <article className="phase-page debrief-page">
      <header className="debrief-hero">
        <p className="case-code">Run {state.runNumber} closed · consequence record</p>
        <h1>{decision?.shortLabel}</h1>
        <p>{decision?.cost}</p>
      </header>

      <div className="debrief-metrics" aria-label="Run summary">
        <div>
          <span>First instinct</span>
          <strong>{approach?.method}</strong>
        </div>
        <div>
          <span>Evidence admitted</span>
          <strong>{discoveredEvidence.length}</strong>
        </div>
        <div>
          <span>Sites touched</span>
          <strong>{state.completedSites.length} / 4</strong>
        </div>
        <div>
          <span>Civic alarm</span>
          <strong>{state.alarm === 0 ? 'quiet' : 'traced'}</strong>
        </div>
      </div>

      <section className="debrief-section" aria-labelledby="consequence-heading">
        <div className="debrief-section-heading">
          <span>What the finding changes</span>
          <h2 id="consequence-heading">A decision distributes uncertainty. It does not remove it.</h2>
        </div>
        <ol className="consequence-list">
          {consequenceLines.map((line, index) => (
            <li key={line}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{line}</p>
            </li>
          ))}
        </ol>
        {tensionEcho ? (
          <p className="tension-echo">
            <em>Filed model vs finding:</em> {tensionEcho}
          </p>
        ) : null}
      </section>

      <section className="debrief-section" aria-labelledby="refusals-heading">
        <div className="debrief-section-heading">
          <span>The record of refusals</span>
          <h2 id="refusals-heading">Every route is also the one you did not take.</h2>
        </div>
        <ol className="consequence-list refusal-list">
          {sites.map((site) => (
            <li key={site.id}>
              <span>{site.index}</span>
              <p>{refusalNoteForSite(site, state.completedActions, content)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="debrief-section" aria-labelledby="memory-heading">
        <div className="debrief-section-heading">
          <span>Persistent social memory</span>
          <h2 id="memory-heading">They remember how you arrived.</h2>
        </div>
        <div className="reflection-list">
          {personas.map((persona) => (
            <blockquote key={persona.id}>
              <div>
                <span className="reflection-sigil" aria-hidden="true">
                  <PersonaSigil personaId={persona.id} />
                </span>
                <strong>{persona.name}</strong>
                <span>
                  {getTrustLabel(state.trust[persona.id])}
                  {state.settings.showTrustNumbers ? ` · ${state.trust[persona.id] >= 0 ? '+' : ''}${state.trust[persona.id]}` : ''}
                </span>
              </div>
              <p>{content.getPersonaReflection(persona.id, state)}</p>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="mirror-invitation">
        <div className="mirror-orbit" aria-hidden="true">
          <MirrorSigil width={32} height={32} />
        </div>
        <div>
          <p className="section-context">Residual memory available</p>
          <h2>The next run will not begin cleanly.</h2>
          <p>
            The Mirror retains your finding and folds one impossible familiarity into the next
            briefing. Choose another route to expose a different account of the same person.
          </p>
        </div>
        <div className="mirror-actions">
          <button className="button button-primary" type="button" onClick={onNextRun}>
            Begin run {state.runNumber + 1} <span aria-hidden="true">→</span>
          </button>
          {switchTargets.map((target) => (
            <button
              key={target.caseId}
              className="button button-secondary"
              type="button"
              onClick={() => onSwitchCase(target.caseId)}
            >
              {target.heading} <span aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </section>

      <footer className="debrief-footer">
        <button className="text-button" type="button" onClick={onReturnToTitle}>
          Return to title
        </button>
        <p>Progress is saved locally in this browser.</p>
      </footer>
    </article>
  )
}

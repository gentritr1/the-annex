import { MirrorSigil, PersonaSigil } from '../ambience/sigils'
import {
  getCaseContent,
  getPriorVerdictForCase,
  getRecordEndsLine,
  getTensionLine,
  personas,
} from '../game/content'
import { getTrustLabel } from '../game/engine'
import { DebriefTableau } from '../scene/DebriefTableau'
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
  // The revelation, authored per verdict path (and consent). Null when the case
  // authors none for this state; the engine never sees it — it is view-only copy.
  const revelation = content.getRevelation?.(state) ?? null
  // W4: the record now ends with the verdict just issued. If a different verdict
  // was recorded for this case on an earlier run, this replay rewrote the ending.
  const recordEndsLine = getRecordEndsLine(state.caseId, state.precedents)
  const priorVerdict = getPriorVerdictForCase(state.caseId, state.previousRuns)
  const rewroteRecord = priorVerdict !== null && priorVerdict !== state.decision
  const priorDecision = rewroteRecord
    ? decisions.find((item) => item.id === priorVerdict)
    : undefined
  const tableauBackground = content.scene.layers.find((layer) => layer.raster)?.raster?.src ?? ''

  return (
    <article className="phase-page debrief-page">
      <DebriefTableau
        backgroundSrc={tableauBackground}
        subjectImageSrc={content.caseFile.dossierImage?.src}
        caseCode={content.caseFile.code}
        runNumber={state.runNumber}
        decisionId={decision?.id ?? 'unfiled'}
        decisionTitle={decision?.shortLabel ?? 'Run closed'}
        decisionCost={decision?.cost ?? 'The record closed without a finding.'}
        evidenceCount={discoveredEvidence.length}
        completedSiteCount={state.completedSites.length}
        totalSiteCount={content.sites.length}
        alarmLevel={state.alarm}
        firstMethod={approach?.method ?? 'Unrecorded'}
      >
        {recordEndsLine ? (
          <p className="record-note" role="note">
            {recordEndsLine}
            {rewroteRecord && priorDecision ? (
              <span className="record-note-rewrite">
                {' '}
                The record now ends differently: where it read “{priorDecision.shortLabel},” it now
                reads “{decision?.shortLabel}.”
              </span>
            ) : null}
          </p>
        ) : null}
      </DebriefTableau>

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

      {revelation ? (
        <section className="debrief-section revelation-section" aria-labelledby="revelation-heading">
          <div className="debrief-section-heading">
            <span>What the fourth minute held</span>
            <h2 id="revelation-heading">The fourth minute finally lands.</h2>
          </div>
          <p className="revelation-body">{revelation}</p>
        </section>
      ) : null}

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

      <details className="debrief-archive">
        <summary>
          <div className="debrief-section-heading">
            <span>The record of refusals · {sites.length} routes preserved</span>
            <h2>Every route is also the one you did not take.</h2>
          </div>
          <span className="debrief-archive-toggle" aria-hidden="true">
            +
          </span>
        </summary>
        <ol className="consequence-list refusal-list">
          {sites.map((site) => (
            <li key={site.id}>
              <span>{site.index}</span>
              <p>{refusalNoteForSite(site, state.completedActions, content)}</p>
            </li>
          ))}
        </ol>
      </details>

      <details className="debrief-archive">
        <summary>
          <div className="debrief-section-heading">
            <span>Persistent social memory · {personas.length} witnesses</span>
            <h2>They remember how you arrived.</h2>
          </div>
          <span className="debrief-archive-toggle" aria-hidden="true">
            +
          </span>
        </summary>
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
      </details>

      <footer className="debrief-footer">
        <button className="text-button" type="button" onClick={onReturnToTitle}>
          Return to title
        </button>
        <p>Progress is saved locally in this browser.</p>
      </footer>
    </article>
  )
}

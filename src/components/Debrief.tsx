import {
  approaches,
  decisions,
  evidenceDefinitions,
  fieldActions,
  getTensionLine,
  personas,
  sites,
} from '../game/content'
import { getTrustLabel } from '../game/engine'
import type { FieldActionId, GameState, PersonaId, SiteId } from '../game/types'

interface DebriefProps {
  state: GameState
  onNextRun: () => void
  onReturnToTitle: () => void
}

function reflectionFor(personaId: PersonaId, state: GameState): string {
  const trust = state.trust[personaId]
  const decision = state.decision

  if (personaId === 'registrar') {
    if (decision === 'overwrite-record') return '“The record is now consistent. Its authority is not.”'
    if (state.methodTags.includes('fraud')) return '“You asked the system to accept what the law would reject. It remembers the difference.”'
    if (trust >= 2) return '“You treated procedure as evidence, not as innocence. That distinction is admissible.”'
    return '“Your finding exceeds what the office can verify. The office will obey it anyway.”'
  }

  if (personaId === 'shepherd') {
    if (decision === 'quarantine-review') return '“Protection that removes a person from life is still a kind of removal.”'
    if (state.methodTags.includes('coercion')) return '“You called pain a test because the result fit in a record. She will remember the test.”'
    if (trust >= 2) return '“She will remember that someone listened before deciding what she was.”'
    return '“You learned something true by making her into an instrument. Truth keeps that cost.”'
  }

  if (personaId === 'defector') {
    if (state.methodTags.includes('stealth')) return '“You walked through the omission instead of around it. The next door will know that.”'
    if (state.alarm > 0) return '“The system noticed you. More useful: you saw which exit it closed first.”'
    return '“Clean route. No clean consequence.”'
  }

  if (state.methodTags.includes('care')) return '“You let a person speak before a category did. I saved the order.”'
  if (decision === 'charter-new-person') return '“You made a category. Now find out who it leaves behind.”'
  if (trust >= 2) return '“I kept the question you answered. I also kept the one you did not.”'
  return '“Adults call a shelf empty when they removed the label themselves.”'
}

function consequenceLines(state: GameState): string[] {
  switch (state.decision) {
    case 'certify-continuity':
      return [
        '77-A leaves review as Mara Vale and inherits every relationship attached to that name.',
        'The restoration process becomes a precedent creditors and families may both invoke.',
        'Any emerging self inside 77-A is legally invisible unless Mara chooses to name it later.',
      ]
    case 'charter-new-person':
      return [
        '77-A leaves review with full civic protection under a name she may choose herself.',
        'Mara Vale remains legally dead; property and unfinished obligations pass without her.',
        'The city gains its first category for a person made from another person’s continuity claim.',
      ]
    case 'quarantine-review':
      return [
        '77-A cannot be erased for ninety days, but she cannot leave the Annex or hold property.',
        'An independent panel receives the contradictions you preserved and the methods you used.',
        'Delay prevents one irreversible harm while creating a slower institutional one.',
      ]
    case 'overwrite-record':
      return [
        'The registry now recognizes Mara Vale. The tribunal never voted.',
        'The dormant credential’s fraud is woven into the same chain that proves her continuity.',
        'A civic trace remains open. Someone will eventually ask who authored the fourth minute after the collapse.',
      ]
    default:
      return []
  }
}

// For a visited site, the sibling action the auditor did not take carries the
// counterfactual note. For an unvisited site, the site's own note stands in.
function refusalNoteForSite(siteId: SiteId, completedActions: readonly FieldActionId[]): string {
  const site = sites.find((item) => item.id === siteId)
  if (!site) return ''

  const takenActionId = site.actionIds.find((actionId) => completedActions.includes(actionId))
  if (!takenActionId) return site.unvisitedNote

  const notTakenId = site.actionIds.find((actionId) => actionId !== takenActionId)
  const notTaken = fieldActions.find((item) => item.id === notTakenId)
  return notTaken?.counterfactualNote ?? ''
}

export function Debrief({ state, onNextRun, onReturnToTitle }: DebriefProps) {
  const decision = decisions.find((item) => item.id === state.decision)
  const approach = approaches.find((item) => item.id === state.primaryApproach)
  const discoveredEvidence = evidenceDefinitions.filter((item) => state.evidence.includes(item.id))
  const tensionEcho =
    state.reconstruction && state.decision
      ? getTensionLine(state.reconstruction, state.decision)
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
          {consequenceLines(state).map((line, index) => (
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
              <p>{refusalNoteForSite(site.id, state.completedActions)}</p>
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
                <strong>{persona.name}</strong>
                <span>
                  {getTrustLabel(state.trust[persona.id])}
                  {state.settings.showTrustNumbers ? ` · ${state.trust[persona.id] >= 0 ? '+' : ''}${state.trust[persona.id]}` : ''}
                </span>
              </div>
              <p>{reflectionFor(persona.id, state)}</p>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="mirror-invitation">
        <div className="mirror-orbit" aria-hidden="true">
          ◌
        </div>
        <div>
          <p className="section-context">Residual memory available</p>
          <h2>The next run will not begin cleanly.</h2>
          <p>
            The Mirror retains your finding and folds one impossible familiarity into the next
            briefing. Choose another route to expose a different account of the same person.
          </p>
        </div>
        <button className="button button-primary" type="button" onClick={onNextRun}>
          Begin run {state.runNumber + 1} <span aria-hidden="true">→</span>
        </button>
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

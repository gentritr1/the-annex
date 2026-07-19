import { getCaseContent, getPrecedentLine, getTensionLine } from '../game/content'
import type { DecisionId, GameState } from '../game/types'
import { ChoiceButton } from './ChoiceButton'

interface TribunalProps {
  state: GameState
  onDecide: (decisionId: DecisionId) => void
  onBack: () => void
}

export function Tribunal({ state, onDecide, onBack }: TribunalProps) {
  const { decisions, reconstructionDefinitions, evidenceDefinitions, chrome } = getCaseContent(
    state.caseId,
  )
  const reconstruction = reconstructionDefinitions.find((item) => item.id === state.reconstruction)
  const discoveredEvidence = evidenceDefinitions.filter((item) => state.evidence.includes(item.id))
  const filedModel = state.reconstruction
  // Cross-case precedent: one authored line citing the player's ruling on the
  // case this one follows. Null when the case cites none or none was recorded.
  const precedentLine = getPrecedentLine(state.caseId, state.precedents)
  const tensionFor = (decisionId: DecisionId) =>
    filedModel ? (
      <>
        <em>Filed model:</em> {getTensionLine(state.caseId, filedModel, decisionId)}
      </>
    ) : null

  return (
    <article className="phase-page tribunal-page">
      <header className="tribunal-header">
        <button className="back-button" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span> Return to field
        </button>
        <div className="tribunal-seal" aria-hidden="true">
          {chrome.tribunalSeal}
        </div>
        <p className="case-code">{chrome.tribunalChannel}</p>
        <h1>{chrome.tribunalHeadline}</h1>
        <p>{chrome.tribunalIntro}</p>
        {precedentLine ? (
          <p className="tribunal-precedent" role="note">
            {precedentLine}
          </p>
        ) : null}
      </header>

      <section className="tribunal-summary" aria-labelledby="summary-heading">
        <h2 id="summary-heading">Admitted record</h2>
        <dl>
          <div>
            <dt>Evidence</dt>
            <dd>{discoveredEvidence.length} items</dd>
          </div>
          <div>
            <dt>Reconstruction</dt>
            <dd>{reconstruction?.title ?? 'None'}</dd>
          </div>
          <div>
            <dt>Civic alarm</dt>
            <dd>{state.alarm === 0 ? 'quiet' : `${state.alarm} active trace${state.alarm === 1 ? '' : 's'}`}</dd>
          </div>
          <div>
            <dt>Illicit authority</dt>
            <dd>{state.tribunalOverride ? 'available' : 'not acquired'}</dd>
          </div>
        </dl>
      </section>

      <section className="tribunal-contradictions" aria-labelledby="contradiction-heading">
        <div className="contradiction-heading">
          <span className="section-context">What the admitted record cannot settle</span>
          <h2 id="contradiction-heading">Unresolved contradictions</h2>
        </div>
        {discoveredEvidence.length > 0 ? (
          <ul className="contradiction-list">
            {discoveredEvidence.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>
                <p>{item.contradiction}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="contradiction-empty">No evidence was admitted. The record is silent, not complete.</p>
        )}
      </section>

      <section className="phase-section" aria-labelledby="decision-heading">
        <div className="section-heading">
          <div>
            <h2 id="decision-heading">Issue a finding</h2>
            <p>No result is scored as good or evil. The debrief records who bears its cost.</p>
          </div>
          <span className="selection-count">Final action</span>
        </div>

        <div className="choice-list decision-list">
          {decisions.map((decision) => {
            if (decision.requiresOverride && !state.tribunalOverride) {
              return (
                <div className="locked-decision" key={decision.id}>
                  <span className="locked-mark" aria-hidden="true">
                    ×
                  </span>
                  <div>
                    <strong>{decision.title}</strong>
                    <p>{chrome.lockedDecisionHint}</p>
                    {filedModel ? (
                      <span className="choice-tension">{tensionFor(decision.id)}</span>
                    ) : null}
                  </div>
                </div>
              )
            }

            return (
              <ChoiceButton
                key={decision.id}
                title={decision.title}
                label={decision.illicit ? 'Illicit finding' : 'Tribunal finding'}
                description={decision.description}
                consequence={decision.cost}
                tone={decision.illicit ? 'risk' : 'default'}
                tension={tensionFor(decision.id)}
                requiresConfirmation
                onClick={() => onDecide(decision.id)}
              />
            )
          })}
        </div>
      </section>
    </article>
  )
}

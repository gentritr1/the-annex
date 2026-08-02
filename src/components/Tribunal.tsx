import { getCaseContent, getPrecedentLine, getTensionLine } from '../game/content'
import { TribunalChamber } from '../scene/TribunalChamber'
import type { DecisionId, GameState } from '../game/types'
import { ChoiceButton } from './ChoiceButton'
import { CinematicPhaseHud } from './CinematicPhaseHud'
import { LegalChannels } from './LegalChannels'

interface TribunalProps {
  state: GameState
  onDecide: (decisionId: DecisionId) => void
  onTribunalChoice: (choiceId: string) => void
  onBack: () => void
}

export function Tribunal({ state, onDecide, onTribunalChoice, onBack }: TribunalProps) {
  const content = getCaseContent(state.caseId)
  const {
    decisions,
    reconstructionDefinitions,
    evidenceDefinitions,
    chrome,
    tribunalChoice,
  } = content
  const reconstruction = reconstructionDefinitions.find((item) => item.id === state.reconstruction)
  const discoveredEvidence = evidenceDefinitions.filter((item) => state.evidence.includes(item.id))
  const filedModel = state.reconstruction
  // Cross-case precedent: one authored line citing the player's ruling on the
  // case this one follows. Null when the case cites none or none was recorded.
  const precedentLine = getPrecedentLine(state.caseId, state.precedents, state.caseOutcomes)
  const tribunalSignals = content.getTribunalSignals?.(state) ?? []
  const counterparty = content.getTribunalObjection?.(state) ?? chrome.tribunalCounterparty ?? null
  const subjectHearing = content.getSubjectHearingPresence?.(state) ?? null
  const filingQuestionAnswered = !tribunalChoice || Boolean(state.tribunalChoice)
  const tribunalObjective =
    tribunalChoice && !state.tribunalChoice
      ? 'Set the legal reach of this ruling before the finding is filed.'
      : 'Issue a finding and accept where its legal cost will land.'
  const tensionFor = (decisionId: DecisionId) =>
    filedModel ? (
      <>
        <em>Filed model:</em>{' '}
        {getTensionLine(state.caseId, filedModel, decisionId, state)}
      </>
    ) : null

  return (
    <article className="phase-page tribunal-page">
      <CinematicPhaseHud
        caseCode={content.caseFile.code}
        caseTitle={content.caseFile.title}
        phaseLabel="Tribunal channel"
        runNumber={state.runNumber}
        objective={tribunalObjective}
        metrics={[
          {
            label: 'Evidence',
            value: String(discoveredEvidence.length),
            tone: discoveredEvidence.length > 0 ? 'open' : 'warning',
          },
          {
            label: 'Model',
            value: reconstruction?.title ?? 'None',
            tone: reconstruction ? 'open' : 'warning',
          },
          {
            label: 'Trace',
            value: state.alarm === 0 ? 'Quiet' : String(state.alarm),
            tone: state.alarm === 0 ? 'neutral' : 'warning',
          },
        ]}
      />
      <TribunalChamber
        backdropSrc={chrome.tribunalBackdropSrc}
        channel={chrome.tribunalChannel}
        headline={chrome.tribunalHeadline}
        intro={chrome.tribunalIntro}
        seal={chrome.tribunalSeal}
        precedentLine={precedentLine}
        evidenceCount={discoveredEvidence.length}
        reconstructionTitle={reconstruction?.title ?? 'No model filed'}
        alarmLevel={state.alarm}
        overrideAvailable={state.tribunalOverride}
        reducedMotion={state.settings.reducedMotion}
        onBack={onBack}
      />

      {subjectHearing ? (
        <aside className="subject-hearing-presence" aria-label="Subject hearing presence">
          <p>Subject hearing · non-evidentiary</p>
          <h2>
            {subjectHearing.speaker} <span>{subjectHearing.status}</span>
          </h2>
          {subjectHearing.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </aside>
      ) : null}

      <section className="tribunal-summary" aria-labelledby="summary-heading">
        <h2 id="summary-heading">Admitted record</h2>
        <dl>
          <div>
            <dt>Evidence</dt>
            <dd>{discoveredEvidence.length} item{discoveredEvidence.length === 1 ? '' : 's'}</dd>
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
          {tribunalSignals.map((signal) => (
            <div key={signal.label} data-tone={signal.tone ?? 'neutral'}>
              <dt>{signal.label}</dt>
              <dd>{signal.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {counterparty ? (
        <aside className="tribunal-objection" aria-label="Live objection">
          <span>Live objection · {counterparty.speaker}</span>
          <p>“{counterparty.line}”</p>
        </aside>
      ) : null}

      {tribunalChoice ? (
        <section className="tribunal-filing-question" aria-labelledby="filing-question-heading">
          {/* The dependency was legible only as prose ("set the legal reach
              before you file"). Naming the two moves as steps makes the ordering
              structural: the verdict cards below are disabled until this one is
              answered, and a numbered pair says so without a popup or a second
              helper line. Decorative — the authored legend below remains the
              accessible name of this group. */}
          <p className="tribunal-step-mark" aria-hidden="true">
            Step 1 <span aria-hidden="true">·</span> Set the ruling’s reach
          </p>
          <fieldset>
            <legend id="filing-question-heading">{tribunalChoice.legend}</legend>
            <p>{tribunalChoice.prompt}</p>
            <div className="tribunal-choice-options">
              {tribunalChoice.options.map((option) => (
                <label key={option.id}>
                  <input
                    type="radio"
                    name={tribunalChoice.id}
                    value={option.id}
                    checked={state.tribunalChoice === option.id}
                    onChange={() => onTribunalChoice(option.id)}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>
      ) : null}

      {/* The scroll cue in the chamber above targets this section by class and
          its heading by id. Renaming either without the other re-buries the
          decision the cue exists to reach. */}
      <section className="phase-section tribunal-decision-section" aria-labelledby="decision-heading">
        {/* Step 2 exists only where a Step 1 does. A case that authors no reach
            question has one move, and numbering a sequence of one is noise. */}
        {tribunalChoice ? (
          <p className="tribunal-step-mark" aria-hidden="true">
            Step 2 <span aria-hidden="true">·</span> Issue the finding
          </p>
        ) : null}
        <div className="section-heading">
          <div>
            <h2 id="decision-heading" tabIndex={-1}>
              Issue a finding
            </h2>
            {/* The helper line is the only statement of what unblocks the
                disabled cards. It stays exactly as authored; the step marks
                above frame it, they do not replace it. */}
            <p>
              {filingQuestionAnswered
                ? 'No result is scored as good or evil. The debrief records who bears its cost.'
                : 'Set the legal reach of this ruling before you file a finding.'}
            </p>
          </div>
          <span className="selection-count">Final action</span>
        </div>

        <div className="choice-list decision-list">
          {decisions.map((decision) => {
            const legalChannels =
              content.getLegalChannels?.(decision.id, state) ?? decision.legalChannels
            const decisionCopy = content.getDecisionCopy?.(decision.id, state) ?? decision

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
                description={decisionCopy.description}
                consequence={decisionCopy.cost}
                tone={decision.illicit ? 'risk' : 'default'}
                tension={tensionFor(decision.id)}
                effects={
                  legalChannels && legalChannels.length > 0 ? (
                    <LegalChannels channels={legalChannels} compact />
                  ) : undefined
                }
                disabled={!filingQuestionAnswered}
                requiresConfirmation
                onClick={() => onDecide(decision.id)}
              />
            )
          })}
        </div>
      </section>

      <details className="tribunal-contradictions tribunal-archive">
        <summary>
          <span>
            <strong>Review unresolved contradictions</strong>
            <small>
              {discoveredEvidence.length > 0
                ? `${discoveredEvidence.length} admitted item${discoveredEvidence.length === 1 ? '' : 's'} remain${discoveredEvidence.length === 1 ? 's' : ''} contested.`
                : 'The record is silent, not complete.'}
            </small>
          </span>
          <span aria-hidden="true">+</span>
        </summary>
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
      </details>
    </article>
  )
}

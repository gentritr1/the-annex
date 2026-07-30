import { getCaseContent, getPrecedentLine, getTensionLine, personaName } from '../game/content'
import {
  getReconstructionFacts,
  resolveCausalChains,
  resolveCounselState,
  resolveEllisDetail,
  resolveHearingStanding,
  resolveSubjectEncounter,
} from '../game/causal'
import { TribunalChamber } from '../scene/TribunalChamber'
import type { DecisionId, GameState } from '../game/types'
import { ChoiceButton } from './ChoiceButton'
import { PersonaPortrait } from './PersonaPortrait'

interface TribunalProps {
  state: GameState
  onDecide: (decisionId: DecisionId) => void
  onBack: () => void
}

export function Tribunal({ state, onDecide, onBack }: TribunalProps) {
  const content = getCaseContent(state.caseId)
  const { decisions, reconstructionDefinitions, evidenceDefinitions, chrome, fragments } = content
  const reconstruction = reconstructionDefinitions.find((item) => item.id === state.reconstruction)
  const discoveredEvidence = evidenceDefinitions.filter((item) => state.evidence.includes(item.id))
  const filedModel = state.reconstruction
  const precedentLine = getPrecedentLine(state.caseId, state.precedents)
  const subjectEncounter = resolveSubjectEncounter(state)
  const hearingStanding = resolveHearingStanding(state)
  const resolvedChains = resolveCausalChains(state).filter((chain) => chain.phase === 'resolved')
  const reconstructionFacts = getReconstructionFacts(state)
  const speculativeFragments = (reconstructionFacts?.speculativeFragments ?? [])
    .map((fragmentId) => fragments.find((fragment) => fragment.id === fragmentId))
    .filter((fragment) => fragment !== undefined)
  const counselState =
    state.completedSites.includes('counsel-office') ? resolveCounselState(state) : null
  const ellisDetail = resolveEllisDetail(state)
  const tensionFor = (decisionId: DecisionId) =>
    filedModel ? (
      <>
        <em>Filed model:</em> {getTensionLine(state.caseId, filedModel, decisionId)}
      </>
    ) : null

  return (
    <article className="phase-page tribunal-page">
      <TribunalChamber
        channel={chrome.tribunalChannel}
        headline={chrome.tribunalHeadline}
        intro={chrome.tribunalIntro}
        seal={chrome.tribunalSeal}
        precedentLine={precedentLine}
        evidenceCount={discoveredEvidence.length}
        reconstructionTitle={reconstruction?.title ?? 'No model filed'}
        alarmLevel={state.alarm}
        overrideAvailable={state.tribunalOverride}
        onBack={onBack}
      />

      {subjectEncounter && (
        <section
          className="prehearing-subject"
          data-subject-state={subjectEncounter.id}
          aria-labelledby="prehearing-subject-heading"
        >
          <div>
            <p>Pre-hearing encounter · non-evidentiary</p>
            <h2 id="prehearing-subject-heading">
              {subjectEncounter.consulted
                ? `Temporary hearing address: ${subjectEncounter.temporaryName}`
                : 'The subject chair is empty'}
            </h2>
          </div>
          <p>{subjectEncounter.request}</p>
          <blockquote>{subjectEncounter.ordinaryWant}</blockquote>
          <strong>{subjectEncounter.staging}</strong>
          <small>
            This request is not evidence, does not establish personhood, and does not select a verdict.
          </small>
        </section>
      )}

      {counselState && (
        <section
          className="tribunal-counsel-state"
          data-counsel-state={counselState.id}
          data-security-pressure={counselState.securityPressure ? 'true' : undefined}
          aria-labelledby="counsel-state-heading"
        >
          <div>
            <p>Counsel Office route · live hearing state</p>
            <h2 id="counsel-state-heading">{counselState.title}</h2>
          </div>
          <p>{counselState.liveObjection}</p>
          <dl>
            <div>
              <dt>Recorder</dt>
              <dd>{counselState.recorder}</dd>
            </div>
            <div>
              <dt>Admissibility shutter</dt>
              <dd>{counselState.shutter}</dd>
            </div>
            <div>
              <dt>Occupancy</dt>
              <dd>{counselState.occupants}</dd>
            </div>
          </dl>
          {ellisDetail && <p className="ordinary-detail">{ellisDetail}</p>}
        </section>
      )}

      {(resolvedChains.length > 0 || speculativeFragments.length > 0) && (
        <section className="tribunal-route-memory" aria-labelledby="route-memory-heading">
          <div>
            <p>How the record arrived</p>
            <h2 id="route-memory-heading">The hearing retains order and uncertainty</h2>
          </div>
          {resolvedChains.map((chain) => (
            <article key={chain.id} data-causal-chain={chain.id}>
              <strong>{chain.title}</strong>
              <p>{chain.tribunalLine}</p>
              <small>{chain.channels.join(' · ')}</small>
            </article>
          ))}
          {speculativeFragments.length > 0 && (
            <article className="speculative-objection" data-speculative-cost="true">
              <strong>Live objection: unsupported reconstruction anchor</strong>
              <p>
                {speculativeFragments.map((fragment) => fragment.title).join(' · ')} remains known
                but uncorroborated. It may frame the model; it may not be represented as admitted fact.
              </p>
            </article>
          )}
        </section>
      )}

      <section className="hearing-standing" aria-labelledby="hearing-standing-heading">
        <div>
          <p>Deterministic social consequence</p>
          <h2 id="hearing-standing-heading">Support and objection</h2>
          <small>{hearingStanding.tieRule}</small>
        </div>
        <div className="hearing-standing-grid">
          <article data-role="support">
            {hearingStanding.supporter ? (
              <>
                <PersonaPortrait personaId={hearingStanding.supporter} size="card" />
                <strong>{personaName(hearingStanding.supporter)} volunteers support</strong>
                <p>{hearingStanding.supportLine}</p>
              </>
            ) : (
              <>
                <strong>No NPC volunteers procedural support</strong>
                <p>The route remains completable without a personal endorsement.</p>
              </>
            )}
          </article>
          <article data-role="objection">
            {hearingStanding.objector ? (
              <>
                <PersonaPortrait personaId={hearingStanding.objector} size="card" />
                <strong>{personaName(hearingStanding.objector)} files the objection</strong>
                <p>{hearingStanding.objectionLine}</p>
              </>
            ) : (
              <>
                <strong>No personal objection is filed</strong>
                <p>The evidentiary contradictions remain available below.</p>
              </>
            )}
          </article>
        </div>
        {hearingStanding.exchange.length > 0 && (
          <div className="npc-exchange" aria-label="NPCs address each other directly">
            {hearingStanding.exchange.map((line) => (
              <blockquote key={line}>{line}</blockquote>
            ))}
          </div>
        )}
      </section>

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
        </dl>
      </section>

      <section className="phase-section" aria-labelledby="decision-heading">
        <div className="section-heading">
          <div>
            <h2 id="decision-heading" tabIndex={-1}>
              Issue a finding
            </h2>
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

import { useEffect, useState } from 'react'
import { getCaseContent, getReactionsForSource, methodLabels, personas } from '../game/content'
import { getTrustLabel } from '../game/engine'
import { personaRunLines } from '../game/personaRecord'
import type { EvidenceStatus, GameState, PersonaId } from '../game/types'
import { DossierPhoto } from './DossierPhoto'
import { PersonaPortrait } from './PersonaPortrait'
import { ReactionQuotes } from './ReactionQuotes'

interface CaseRailProps {
  state: GameState
}

type RailTab = 'case' | 'evidence' | 'log' | 'people'

const RAIL_TABS: readonly RailTab[] = ['case', 'evidence', 'log', 'people']

const statusLabels: Record<EvidenceStatus, string> = {
  verified: 'Verified',
  disputed: 'Disputed',
  anomaly: 'Anomaly',
  testimony: 'Testimony',
}

export function CaseRail({ state }: CaseRailProps) {
  const { caseFile, evidenceDefinitions, reconstructionDefinitions } = getCaseContent(state.caseId)
  const [activeTab, setActiveTab] = useState<RailTab>('case')
  const evidence = evidenceDefinitions.filter((item) => state.evidence.includes(item.id))
  // The filed memory model. It used to sit in the field dock; a filed record
  // belongs in the file, so the Case tab is now its home.
  const reconstruction = reconstructionDefinitions.find((item) => item.id === state.reconstruction)
  // Whether any persona's trust has moved off zero yet — gates the Social memory
  // block's progressive reveal (F-6).
  const anyTrust = personas.some((persona) => state.trust[persona.id] !== 0)

  // Presence pulse: a VIEW-only reaction to a trust change. We keep the previous
  // trust map in state and, when the incoming map differs, derive the pulse
  // during render (the supported "adjust state from a prop change" pattern) —
  // cyan when a persona's trust rises (a record opens), coral when it falls (a
  // presence guards). Suppressed under reduced motion.
  const [prevTrust, setPrevTrust] = useState(state.trust)
  const [pulses, setPulses] = useState<Partial<Record<PersonaId, 'rise' | 'fall'>>>({})
  // Persistent direction markers (F-4-lite): the reduced-motion-safe static path.
  // The 1100ms pulse above is easy to miss and never plays under reduced motion, so
  // the FIRST trust point a player earns — which stays inside the wide "uncertain"
  // band and so leaves the label word unchanged — otherwise reads as no change at
  // all. A ▲/▼ marker holds beside that persona until the next field commit clears
  // it. Set regardless of motion preference; anchored to the event count so a later
  // commit (whether or not it moves trust) retires it.
  const [markers, setMarkers] = useState<Partial<Record<PersonaId, 'rise' | 'fall'>>>({})
  const [markerEventCount, setMarkerEventCount] = useState(state.events.length)

  if (prevTrust !== state.trust) {
    setPrevTrust(state.trust)
    const changedPulses: Partial<Record<PersonaId, 'rise' | 'fall'>> = {}
    const changedMarkers: Partial<Record<PersonaId, 'rise' | 'fall'>> = {}
    for (const persona of personas) {
      const delta = state.trust[persona.id] - prevTrust[persona.id]
      if (delta === 0) continue
      const direction = delta > 0 ? 'rise' : 'fall'
      changedPulses[persona.id] = direction
      // A marker only where the label word did NOT move — a band crossing already
      // shows the change in the word itself, so a marker there would be redundant.
      if (getTrustLabel(state.trust[persona.id]) === getTrustLabel(prevTrust[persona.id])) {
        changedMarkers[persona.id] = direction
      }
    }
    if (!state.settings.reducedMotion && Object.keys(changedPulses).length > 0) {
      setPulses(changedPulses)
    }
    // Replace (not accumulate): each commit that moves trust opens a fresh window,
    // and its own event marks when the NEXT commit will retire these markers.
    setMarkers(changedMarkers)
    setMarkerEventCount(state.events.length)
  } else if (Object.keys(markers).length > 0 && state.events.length > markerEventCount) {
    // Retire the persistent markers on the next commit — a new event appended after
    // the one that set them, even a field method that changed no trust at all.
    // Done during render (the supported adjust-state-on-change pattern) rather than
    // in an effect, so there is no cascading-render from a synchronous effect setState.
    setMarkers({})
  }

  // Clear the pulse once it has played. setState lives in a timer callback here,
  // not synchronously in the effect body.
  useEffect(() => {
    if (Object.keys(pulses).length === 0) return
    const timer = window.setTimeout(() => setPulses({}), 1100)
    return () => window.clearTimeout(timer)
  }, [pulses])

  return (
    // A plain container, not a landmark: the rail's one home is now the summoned
    // case-file dialog, which names the surface itself. A second "Case file"
    // complementary landmark inside that dialog would only announce it twice.
    <div className="case-rail">
      <nav className="rail-tabs" aria-label="Case file views">
        {RAIL_TABS.map((tab) => (
          <button
            type="button"
            aria-pressed={activeTab === tab}
            aria-controls={`rail-panel-${tab}`}
            id={`rail-tab-${tab}`}
            key={tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'evidence' ? `Evidence ${evidence.length}` : tab}
          </button>
        ))}
      </nav>

      {activeTab === 'case' && (
        <div className="rail-panel" id="rail-panel-case" aria-labelledby="rail-tab-case">
          <section className="rail-block">
            <p className="rail-label">Active dilemma</p>
            <h2>{caseFile.question}</h2>
          </section>

          {caseFile.dossierImage && (
            <section className="rail-block rail-subject">
              <p className="rail-label">Subject on file</p>
              <DossierPhoto image={caseFile.dossierImage} variant="rail" />
            </section>
          )}

          <section className="rail-block rail-status-grid" aria-label="Case status">
            <div>
              <span>Sites filed</span>
              {/* Denominator is the tribunal threshold until it is met, then the
                  district's true size — a third or fourth filing must register. */}
              <strong>
                {state.completedSites.length} / {state.completedSites.length >= 2 ? 4 : 2}
              </strong>
            </div>
            <div>
              <span>Reconstruction</span>
              <strong>{state.reconstruction ? 'filed' : 'open'}</strong>
            </div>
            <div>
              <span>Civic alarm</span>
              <strong className={state.alarm > 0 ? 'text-risk' : ''}>
                {state.alarm === 0 ? 'quiet' : `${state.alarm} trace${state.alarm === 1 ? '' : 's'}`}
              </strong>
            </div>
            <div>
              <span>Run</span>
              <strong>{state.runNumber}</strong>
            </div>
          </section>

          {/* The filed memory model, moved here out of the field dock: it is a
              filed record, and filed records live in the file. Same <details>
              element, same authored copy and reactions as before. */}
          {reconstruction && (
            <section className="rail-block">
              <p className="rail-label">Memory model</p>
              <details className="filed-model">
                <summary>{reconstruction.title} · model filed</summary>
                <p>{reconstruction.thesis}</p>
                <ReactionQuotes reactions={reconstruction.reactions} />
              </details>
            </section>
          )}

          {/* Progressive disclosure (F-6): Social memory joins the flow the first
              time any trust reads nonzero, rather than sitting as four "uncertain"
              rows before the player has acted. */}
          {anyTrust && (
            <section className="rail-block">
              <p className="rail-label">Social memory</p>
              <ul className="persona-list">
                {personas.map((persona) => {
                  const trust = state.trust[persona.id]
                  const pulse = pulses[persona.id]
                  const marker = markers[persona.id]
                  return (
                    <li
                      key={persona.id}
                      className={pulse === 'rise' ? 'pulse-rise' : pulse === 'fall' ? 'pulse-fall' : undefined}
                    >
                      <span className={`persona-signal trust-${getTrustLabel(trust)}`} aria-hidden="true" />
                      {/* The row's second grid cell. It widens 20px → 40px; the
                          row's min-height does not move (any height change here
                          is a bug, not a trade-off — plan §6 risk 3). */}
                      <PersonaPortrait personaId={persona.id} size="card" />
                      <span>
                        <strong>{persona.name}</strong>
                        <small>{persona.role}</small>
                      </span>
                      <span className="trust-label">
                        {getTrustLabel(trust)}
                        {state.settings.showTrustNumbers ? ` ${trust >= 0 ? '+' : ''}${trust}` : ''}
                        {marker && (
                          <span className={`trust-marker trust-marker-${marker}`} aria-hidden="true">
                            {marker === 'rise' ? '▲' : '▼'}
                          </span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {/* Progressive disclosure (F-6): Methods recorded joins the flow the
              first time a tag exists. The defining line (F-3-lite) names what a
              "method" is, so the block reads as legible record, not atmosphere. */}
          {state.methodTags.length > 0 && (
            <section className="rail-block">
              <p className="rail-label">Methods recorded</p>
              <p className="rail-note">
                How you reached each finding. The people here — and the cases that
                follow — keep the record of it.
              </p>
              <div className="method-tags">
                {state.methodTags.map((tag) => (
                  <span key={tag}>{methodLabels[tag]}</span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'evidence' && (
        <div
          className="rail-panel evidence-panel"
          id="rail-panel-evidence"
          aria-labelledby="rail-tab-evidence"
        >
          {evidence.length === 0 ? (
            <div className="educational-empty">
              <span aria-hidden="true">◇</span>
              <h2>No evidence admitted yet</h2>
              <p>Commit to a method at any field site. The source and contradiction will be preserved.</p>
            </div>
          ) : (
            <ul className="evidence-list">
              {evidence.map((item) => (
                <li key={item.id}>
                  <div className="evidence-heading">
                    <span className={`evidence-status evidence-${item.status}`}>
                      {statusLabels[item.status]}
                    </span>
                    <span className="evidence-source">{item.source}</span>
                  </div>
                  <h2>{item.title}</h2>
                  <p>{item.claim}</p>
                  <details>
                    <summary>Show contradiction</summary>
                    <p>{item.contradiction}</p>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'log' && (
        <div className="rail-panel log-panel" id="rail-panel-log" aria-labelledby="rail-tab-log">
          {state.events.length === 0 ? (
            <div className="educational-empty">
              <span aria-hidden="true">≡</span>
              <h2>The event log is empty</h2>
              <p>Every consequential action will append a replayable record here.</p>
            </div>
          ) : (
            <ol className="event-list">
              {[...state.events].reverse().map((event) => (
                <li key={event.id} className={`event-${event.tone}`}>
                  <span className="event-order">{String(event.order).padStart(2, '0')}</span>
                  <div>
                    <strong>{event.title}</strong>
                    <p>{event.detail}</p>
                    <ReactionQuotes
                      reactions={getReactionsForSource(
                        state.caseId,
                        event.sourceType,
                        event.sourceId,
                        state.precedents,
                      )}
                      variant="log"
                    />
                    <div className="event-tags">
                      {event.methodTags.map((tag) => (
                        <span key={tag}>{methodLabels[tag]}</span>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* The roster dossier — "the people on this case". The one surface where a
          persona is a full record rather than a mark beside a line: the sheet
          portrait (the only size that exposes its authored alt), the authored
          role and principle, the current stance word, and everything they have
          said on the record this run.

          It animates nothing on purpose. The surface is summoned, so by the time
          it opens the change it reports has already happened; animating on open
          would be a lie about when. */}
      {activeTab === 'people' && (
        <div className="rail-panel people-panel" id="rail-panel-people" aria-labelledby="rail-tab-people">
          <section className="rail-block">
            <h2>The people on this case</h2>
          </section>
          <ul className="persona-dossier">
            {personas.map((persona) => {
              const trust = state.trust[persona.id]
              const lines = personaRunLines(state, persona.id)
              return (
                <li className="persona-dossier-card" key={persona.id} data-persona={persona.id}>
                  <PersonaPortrait personaId={persona.id} size="sheet" />
                  <div className="persona-dossier-head">
                    <h3>{persona.name}</h3>
                    <p className="persona-dossier-role">{persona.role}</p>
                    {/* data-stance, NOT `trust-{label}`: those classes are the
                        signal DOT's fill (background: var(--cyan)) and would
                        paint a block behind this word — the recorded
                        class-collision scar, which no text assertion can see. */}
                    <p className="persona-dossier-stance" data-stance={getTrustLabel(trust)}>
                      {getTrustLabel(trust)}
                      {state.settings.showTrustNumbers ? ` ${trust >= 0 ? '+' : ''}${trust}` : ''}
                    </p>
                    <p className="persona-dossier-principle">{persona.principle}</p>
                  </div>
                  <div className="persona-dossier-said">
                    <p className="rail-label">On the record this run</p>
                    {lines.length === 0 ? (
                      <p className="persona-dossier-empty">Nothing said on the record yet.</p>
                    ) : (
                      <ol className="persona-dossier-lines">
                        {lines.map((entry) => (
                          <li key={`${entry.order}-${entry.cite}`}>
                            <p className="persona-dossier-line">{entry.line}</p>
                            <p className="persona-dossier-cite">{entry.cite}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

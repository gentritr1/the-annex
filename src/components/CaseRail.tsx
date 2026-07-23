import { useEffect, useState } from 'react'
import { PersonaSigil } from '../ambience/sigils'
import { getCaseContent, getReactionsForSource, methodLabels, personas } from '../game/content'
import { getTrustLabel } from '../game/engine'
import type { EvidenceStatus, GameState, PersonaId } from '../game/types'
import { DossierPhoto } from './DossierPhoto'
import { ReactionQuotes } from './ReactionQuotes'

interface CaseRailProps {
  state: GameState
}

type RailTab = 'case' | 'evidence' | 'log'

const statusLabels: Record<EvidenceStatus, string> = {
  verified: 'Verified',
  disputed: 'Disputed',
  anomaly: 'Anomaly',
  testimony: 'Testimony',
}

export function CaseRail({ state }: CaseRailProps) {
  const { caseFile, evidenceDefinitions } = getCaseContent(state.caseId)
  const [activeTab, setActiveTab] = useState<RailTab>('case')
  const [mobileOpen, setMobileOpen] = useState(false)
  const evidence = evidenceDefinitions.filter((item) => state.evidence.includes(item.id))
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
    <aside className={`case-rail ${mobileOpen ? 'case-rail-mobile-open' : ''}`} aria-label="Case file">
      <button
        className="rail-mobile-toggle"
        type="button"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span>
          <strong>Case file</strong>
          <small>
            {evidence.length} evidence · {state.events.length} events
          </small>
        </span>
        <span aria-hidden="true">{mobileOpen ? '−' : '+'}</span>
      </button>
      <nav className="rail-tabs" aria-label="Case file views">
        {(['case', 'evidence', 'log'] as RailTab[]).map((tab) => (
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
                      <span className="persona-sigil" aria-hidden="true">
                        <PersonaSigil personaId={persona.id} />
                      </span>
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
    </aside>
  )
}

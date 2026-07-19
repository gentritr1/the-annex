import { useState } from 'react'
import { caseFile, evidenceDefinitions, methodLabels, personas } from '../game/content'
import { getTrustLabel } from '../game/engine'
import type { EvidenceStatus, GameState } from '../game/types'

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
  const [activeTab, setActiveTab] = useState<RailTab>('case')
  const [mobileOpen, setMobileOpen] = useState(false)
  const evidence = evidenceDefinitions.filter((item) => state.evidence.includes(item.id))

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

          <section className="rail-block rail-status-grid" aria-label="Case status">
            <div>
              <span>Field sites</span>
              <strong>{state.completedSites.length} / 4</strong>
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

          <section className="rail-block">
            <p className="rail-label">Social memory</p>
            <ul className="persona-list">
              {personas.map((persona) => {
                const trust = state.trust[persona.id]
                return (
                  <li key={persona.id}>
                    <span className={`persona-signal trust-${getTrustLabel(trust)}`} aria-hidden="true" />
                    <span>
                      <strong>{persona.name}</strong>
                      <small>{persona.role}</small>
                    </span>
                    <span className="trust-label">
                      {getTrustLabel(trust)}
                      {state.settings.showTrustNumbers ? ` ${trust >= 0 ? '+' : ''}${trust}` : ''}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="rail-block">
            <p className="rail-label">Methods recorded</p>
            {state.methodTags.length > 0 ? (
              <div className="method-tags">
                {state.methodTags.map((tag) => (
                  <span key={tag}>{methodLabels[tag]}</span>
                ))}
              </div>
            ) : (
              <p className="rail-empty">Your first choice will appear here.</p>
            )}
          </section>
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

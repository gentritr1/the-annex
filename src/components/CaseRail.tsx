import { useEffect, useState } from 'react'
import { getCaseContent, getReactionsForSource, methodLabels, personas } from '../game/content'
import { getTrustLabel } from '../game/engine'
import { personaRunLines } from '../game/personaRecord'
import {
  buildRecordIndex,
  groupByVoice,
  groupRecordEntries,
  searchRecord,
} from '../game/recordIndex'
import type { EvidenceStatus, GameState, PersonaId } from '../game/types'
import { DossierPhoto } from './DossierPhoto'
import { PersonaPortrait } from './PersonaPortrait'
import { purposeCopy, showsRosterPurpose } from './purposeCopy'
import { ReactionQuotes } from './ReactionQuotes'

interface CaseRailProps {
  state: GameState
  // The run's query trail, owned by the shell (see CaseFileDrawer). Passed in
  // rather than held here because this component unmounts with the drawer.
  queryTrail: readonly string[]
  onQuery: (query: string) => void
}

type RailTab = 'case' | 'evidence' | 'log' | 'people' | 'search'

// SEARCH IS A FIFTH TAB, not a field above the bar. Argued from the drawer's own
// structure: the bar is a mutually-exclusive panel switcher whose contract three
// shipped harness sweeps assert ("exactly one .rail-panel, exactly one
// aria-pressed"), and a field above it would have to render its results either
// over that panel or in place of it — breaking the contract while the pressed
// tab still claimed to be showing. It would also add a third permanent chrome
// row above the fold on the 375-wide sheet, where the header and the bar already
// sit. A fifth cell reuses the aria wiring exactly, keeps one surface visible at
// a time, and keeps the query trail beside the results it produced.
const RAIL_TABS: readonly RailTab[] = ['case', 'evidence', 'log', 'people', 'search']

const statusLabels: Record<EvidenceStatus, string> = {
  verified: 'Verified',
  disputed: 'Disputed',
  anomaly: 'Anomaly',
  testimony: 'Testimony',
}

export function CaseRail({ state, queryTrail, onQuery }: CaseRailProps) {
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

  // ── Search (E5) ────────────────────────────────────────────────────────────
  // `draft` is what is typed; `query` is what has been ASKED. They are separate
  // on purpose: the record answers a submitted question, the way Her Story's
  // terminal does, so the results do not churn under the reader's hands and the
  // trail records questions rather than keystrokes.
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  // Built only when there is something to ask — a pure derivation over state and
  // content lookups, so there is nothing to memoize away for correctness.
  const matches = query ? searchRecord(buildRecordIndex(state), query) : []
  const matchGroups = groupRecordEntries(matches)
  const searchStatus = !query
    ? ''
    : matches.length === 0
      ? `No entry answers to “${query}”.`
      : matches.length === 1
        ? `1 entry answers to “${query}”.`
        : `${matches.length} entries answer to “${query}”.`

  function ask(term: string) {
    const asked = term.trim()
    setDraft(asked)
    setQuery(asked)
    if (asked) onQuery(asked)
  }

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
            {/* W1-4 · P2-F. The heading names the tab; nothing named what the
                tab is FOR — that a stance word here is a live consequence of
                the route, not a decoration. Carries no persona name, so the
                harness's "every named persona appears exactly once" count over
                this panel is untouched. Retires at the first filing. */}
            {showsRosterPurpose(state) && (
              <p className="people-purpose">{purposeCopy.roster}</p>
            )}
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

      {/* The searchable record (E5). Her Story's move: a plain query box over
          everything the run has already filed, and the questions themselves kept
          as part of the fiction. The index is a pure derivation
          (game/recordIndex.ts) — it can only return what is on the record, so
          the file can never answer with a place the auditor has not been.

          It animates nothing, for the same reason the roster does not: the
          surface is summoned, and everything it reports has already happened. */}
      {activeTab === 'search' && (
        <div className="rail-panel search-panel" id="rail-panel-search" aria-labelledby="rail-tab-search">
          <section className="rail-block">
            <form
              className="record-search-form"
              role="search"
              onSubmit={(event) => {
                event.preventDefault()
                ask(draft)
              }}
            >
              <label className="rail-label" htmlFor="record-search-input">
                Search the record
              </label>
              <div className="record-search-field">
                <input
                  className="record-search-input"
                  id="record-search-input"
                  type="search"
                  autoComplete="off"
                  placeholder="A name, a source, a phrase…"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button className="record-search-submit" type="submit">
                  Search
                </button>
              </div>
            </form>
            <p className="rail-note">
              The file reads back only what this run has put on the record. What is not
              here has not been done yet.
            </p>
          </section>

          {/* Present at every phase so the count is announced as a change, not as
              a region appearing. Empty until something has been asked. */}
          <p className="record-search-status" aria-live="polite">
            {searchStatus}
          </p>

          {!query ? (
            <div className="educational-empty">
              <span aria-hidden="true">⌕</span>
              <h2>Nothing has been asked of the file yet</h2>
              <p>Ask it a name, a source, or a phrase, and it will read back every place that phrase is filed.</p>
            </div>
          ) : matchGroups.length === 0 ? (
            <div className="educational-empty">
              <span aria-hidden="true">⌕</span>
              <h2>The record does not answer to that</h2>
              <p>Nothing filed this run carries those words. A file cannot hold what has not been done.</p>
            </div>
          ) : (
            <div className="record-search-results">
              {matchGroups.map((group) => (
                <section className="record-search-group" key={group.kind}>
                  <p className="rail-label">{group.label}</p>
                  {/* Spoken lines are grouped BY VOICE, one heading per presence.
                      Four presences can answer a query with a dozen lines between
                      them; the name is still printed once each. */}
                  {group.kind === 'reaction' ? (
                    <ul className="record-search-voices">
                      {groupByVoice(group.entries).map((voice) => (
                        <li key={voice.voice}>
                          <h3 className="record-search-voice">{voice.voice}</h3>
                          <ol className="record-search-lines">
                            {voice.entries.map((entry) => (
                              <li key={entry.id}>
                                <p className="record-search-line">{entry.body}</p>
                                <p className="record-search-cite">{entry.cite}</p>
                              </li>
                            ))}
                          </ol>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ol className="record-search-entries">
                      {group.entries.map((entry) => (
                        <li key={entry.id}>
                          <h3 className="record-search-entry-title">{entry.title}</h3>
                          <p className="record-search-line">{entry.body}</p>
                          <p className="record-search-cite">{entry.cite}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              ))}
            </div>
          )}

          {/* THE QUERY TRAIL. What the auditor thought to ask is itself part of
              the record of the run — but only of the run. It is never written to
              the save: buying a flourish with a save-schema change would put the
              whole decode at risk (App.tsx states the reasoning). Each past
              question is a control, so a thought can be picked up again. */}
          {queryTrail.length > 0 && (
            <section className="rail-block record-trail">
              <p className="rail-label">Queries this run</p>
              <p className="rail-note">
                Held for as long as the run is. Closing the file keeps them; leaving the
                Annex does not.
              </p>
              <ul className="record-trail-list">
                {queryTrail.map((entry) => (
                  <li key={entry}>
                    <button
                      className="record-trail-query"
                      type="button"
                      aria-pressed={entry === query}
                      onClick={() => ask(entry)}
                    >
                      {entry}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

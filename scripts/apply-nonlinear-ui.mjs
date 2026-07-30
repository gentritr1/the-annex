import { readFileSync, writeFileSync } from 'node:fs'

function replaceOnce(path, before, after) {
  const source = readFileSync(path, 'utf8')
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${path}: expected source anchor not found`)
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${path}: source anchor is not unique`)
  }
  writeFileSync(path, source.slice(0, first) + after + source.slice(first + before.length))
  console.log(`patched ${path}`)
}

function appendOnce(path, marker, addition) {
  const source = readFileSync(path, 'utf8')
  if (source.includes(marker)) throw new Error(`${path}: marker already present`)
  writeFileSync(path, `${source.trimEnd()}\n\n${addition.trim()}\n`)
  console.log(`appended ${path}`)
}

replaceOnce(
  'src/game/causal.ts',
  `export interface CounselState {
  id: 'voluntary' | 'refused' | 'compelled' | 'unasked' | 'no-account'
`,
  `export interface CounselState {
  id: 'voluntary' | 'refused' | 'compelled' | 'unasked' | 'no-account'
  siteId: SiteId
`,
)

replaceOnce(
  'src/game/causal.ts',
  `  const base: Record<CounselState['id'], Omit<CounselState, 'id' | 'advocates' | 'securityPressure'>> = {
`,
  `  const base: Record<
    CounselState['id'],
    Omit<CounselState, 'id' | 'siteId' | 'advocates' | 'securityPressure'>
  > = {
`,
)

replaceOnce(
  'src/game/causal.ts',
  `  return {
    id,
    ...resolved,
`,
  `  return {
    id,
    siteId: 'counsel-office',
    ...resolved,
`,
)

replaceOnce(
  'src/components/Investigation.tsx',
  `import { getCaseContent, personaName, resolveFieldAction } from '../game/content'
import { canEnterTribunal } from '../game/engine'
`,
  `import { getCaseContent, personaName, resolveFieldAction } from '../game/content'
import {
  getApproachOpening,
  resolveCausalWorldOutcomes,
  resolveCounselState,
  resolveEllisDetail,
  resolveSiteCausalState,
} from '../game/causal'
import { canEnterTribunal } from '../game/engine'
`,
)

replaceOnce(
  'src/components/Investigation.tsx',
  `  const reconstruction = reconstructionDefinitions.find((item) => item.id === state.reconstruction)
  const reducedMotion = state.settings.reducedMotion
  const initialSite =
    sites.find((site) => !state.completedSites.includes(site.id)) ?? sites[0]!
  const [selectedSiteId, setSelectedSiteId] = useState<SiteId>(() => initialSite.id)
`,
  `  const reconstruction = reconstructionDefinitions.find((item) => item.id === state.reconstruction)
  const reducedMotion = state.settings.reducedMotion
  const opening = getApproachOpening(state)
  const openingSite = sites.find((site) => site.id === opening?.initialSiteId)
  const initialSite =
    (openingSite && !state.completedSites.includes(openingSite.id) ? openingSite : undefined) ??
    sites.find((site) => !state.completedSites.includes(site.id)) ??
    sites[0]!
  const [selectedSiteId, setSelectedSiteId] = useState<SiteId>(() => initialSite.id)
`,
)

replaceOnce(
  'src/components/Investigation.tsx',
  `  const [worldPresentation, setWorldPresentation] = useState<WorldPresentation>(() =>
    scene.world
      ? { kind: 'concourse' }
      : initialSite.closeup
      ? { kind: 'closeup', siteId: initialSite.id, origin: { x: 0.5, y: 0.5 } }
      : { kind: 'map' },
  )
`,
  `  const [worldPresentation, setWorldPresentation] = useState<WorldPresentation>(() =>
    initialSite.closeup
      ? { kind: 'closeup', siteId: initialSite.id, origin: { x: 0.5, y: 0.5 } }
      : scene.world
        ? { kind: 'concourse' }
        : { kind: 'map' },
  )
`,
)

replaceOnce(
  'src/components/Investigation.tsx',
  `  const [returnEmphasisSiteId, setReturnEmphasisSiteId] = useState<SiteId | null>(null)
  const returnEmphasisTimerRef = useRef<number | null>(null)
`,
  `  const [returnEmphasisSiteId, setReturnEmphasisSiteId] = useState<SiteId | null>(null)
  const returnEmphasisTimerRef = useRef<number | null>(null)
  // A primed causal chain may require one explicit procedural acknowledgement
  // before this room's ordinary interaction begins. The requirement is derived
  // from canonical ordered actions; only this already-seen UI acknowledgement is
  // view-local and repeatable after reload.
  const [acknowledgedCausalStates, setAcknowledgedCausalStates] = useState<Set<string>>(
    () => new Set(),
  )
`,
)

replaceOnce(
  'src/components/Investigation.tsx',
  `  const resolvedOutcomes = resolveSiteOutcomes(sites, state.completedActions)
`,
  `  const resolvedOutcomes = resolveSiteOutcomes(sites, state.completedActions)
  for (const [siteId, outcome] of resolveCausalWorldOutcomes(state)) {
    resolvedOutcomes.set(siteId, outcome)
  }
`,
)

replaceOnce(
  'src/components/Investigation.tsx',
  `  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? sites[0]!
  const presentationForRender: WorldPresentation =
`,
  `  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? sites[0]!
  const causalSiteState = resolveSiteCausalState(state, selectedSite.id)
  const counselState = resolveCounselState(state)
  const ellisDetail = resolveEllisDetail(state)
  const causalGateRequired = Boolean(
    causalSiteState?.phase === 'primed' && causalSiteState.channels.includes('procedural'),
  )
  const causalGateAcknowledged =
    !causalGateRequired ||
    (causalSiteState ? acknowledgedCausalStates.has(causalSiteState.id) : true)
  function acknowledgeCausalState() {
    if (!causalSiteState) return
    setAcknowledgedCausalStates((current) => new Set(current).add(causalSiteState.id))
    setWorldLine(`${causalSiteState.title}. Procedural change acknowledged; ordinary methods are available.`)
  }
  const presentationForRender: WorldPresentation =
`,
)

replaceOnce(
  'src/components/Investigation.tsx',
  `  const effectiveAcoustic = acousticRoomTreatment ?? acousticTreatment
`,
  `  const effectiveAcoustic = causalSiteState?.acoustics ?? acousticRoomTreatment ?? acousticTreatment
`,
)

replaceOnce(
  'src/components/Investigation.tsx',
  `  const sceneFirstZonesLive =
    sceneFirstPlate && presentationForRender.kind === 'closeup' && !selectedCompletedAction
`,
  `  const sceneFirstZonesLive =
    sceneFirstPlate &&
    presentationForRender.kind === 'closeup' &&
    !selectedCompletedAction &&
    causalGateAcknowledged
`,
)

replaceOnce(
  'src/components/Investigation.tsx',
  `  const methodsVisible = !selectedCompletedAction && roomMethodsRevealed
`,
  `  const methodsVisible =
    !selectedCompletedAction && roomMethodsRevealed && causalGateAcknowledged
`,
)

replaceOnce(
  'src/components/Investigation.tsx',
  `  const ritualStepLabel = selectedSite.custodyRail
    ? custodyPresentation
`,
  `  const ritualStepLabel = causalGateRequired && !causalGateAcknowledged
    ? 'Acknowledge the changed room state'
    : selectedSite.custodyRail
    ? custodyPresentation
`,
)

replaceOnce(
  'src/components/Investigation.tsx',
  `  const roomConsoleNode = selectedCompletedAction ? null : selectedSite.room ? (
`,
  `  const roomConsoleNode = selectedCompletedAction ? null : causalGateRequired && !causalGateAcknowledged ? (
    <div className="causal-procedure-gate" role="note" data-causal-gate={causalSiteState?.id}>
      <span>Changed affordance</span>
      <strong>{causalSiteState?.title}</strong>
      <p>{causalSiteState?.proceduralEffect}</p>
      <button type="button" onClick={acknowledgeCausalState}>
        Read the changed room, then continue <span aria-hidden="true">→</span>
      </button>
    </div>
  ) : selectedSite.room ? (
`,
)

replaceOnce(
  'src/components/Investigation.tsx',
  `                onComplete={() =>
                  setSceneBeat((current) =>
                    current && current.phase === 'playing'
                      ? { ...current, phase: 'done' }
                      : current,
                  )
                }
`,
  `                beatId={`${'${state.caseId}'}:field:${'${sceneBeat.actionId}'}`}
                onComplete={() =>
                  setSceneBeat((current) =>
                    current && current.phase === 'playing'
                      ? { ...current, phase: 'done' }
                      : current,
                  )
                }
`,
)

replaceOnce(
  'src/components/Investigation.tsx',
  `      </header>

      <div className={\`field-workspace ${'${inspectorSpine ? \'field-workspace--spine\' : \'\'}'}\`}>
`,
  `      </header>

      {opening && state.completedSites.length === 0 && (
        <section
          className="approach-opening"
          data-approach={state.primaryApproach ?? undefined}
          data-opening-site={opening.initialSiteId}
          aria-labelledby="approach-opening-heading"
        >
          <div className="approach-opening-copy">
            <p>{opening.kicker}</p>
            <h2 id="approach-opening-heading">{opening.encounterTitle}</h2>
            <span>{opening.encounterDetail}</span>
          </div>
          <dl>
            <div>
              <dt>First objective</dt>
              <dd>{opening.objective}</dd>
            </div>
            <div>
              <dt>Room state</dt>
              <dd>{opening.environmentalCue}</dd>
            </div>
          </dl>
          <div className="approach-opening-presence" aria-label="Opening presence">
            {opening.personaIds.map((personaId) => (
              <span key={personaId}>
                <PersonaPortrait personaId={personaId} size="chip" />
                {personaName(personaId)} present
              </span>
            ))}
          </div>
          <small>The remaining locations stay open after this authored beginning.</small>
        </section>
      )}

      <div className={\`field-workspace ${'${inspectorSpine ? \'field-workspace--spine\' : \'\'}'}\`}>
`,
)

replaceOnce(
  'src/components/Investigation.tsx',
  `              <p className="site-description">{selectedSite.description}</p>

              {selectedCompletedAction ? (
`,
  `              <p className="site-description">{selectedSite.description}</p>

              {causalSiteState && (
                <section
                  className="causal-site-state"
                  data-causal-state={causalSiteState.id}
                  data-causal-phase={causalSiteState.phase}
                  aria-label="Persistent causal room state"
                >
                  <div>
                    <span>{causalSiteState.phase === 'settled' ? 'Settled room' : 'Route consequence'}</span>
                    <strong>{causalSiteState.title}</strong>
                  </div>
                  <p>{causalSiteState.detail}</p>
                  <p className="causal-procedural-effect">{causalSiteState.proceduralEffect}</p>
                  <ul className="causal-channels" aria-label="Changed consequence channels">
                    {causalSiteState.channels.map((channel) => (
                      <li key={channel}>{channel}</li>
                    ))}
                  </ul>
                  {causalGateRequired && !causalGateAcknowledged && !roomSite && (
                    <button type="button" onClick={acknowledgeCausalState}>
                      Acknowledge changed procedure <span aria-hidden="true">→</span>
                    </button>
                  )}
                </section>
              )}

              {counselState && counselState.siteId === selectedSite.id && (
                <section
                  className="counsel-variant"
                  data-counsel-state={counselState.id}
                  data-security-pressure={counselState.securityPressure ? 'true' : undefined}
                  aria-labelledby="counsel-variant-heading"
                >
                  <div>
                    <span>Counsel occupancy · deterministic from deposition</span>
                    <h3 id="counsel-variant-heading">{counselState.title}</h3>
                  </div>
                  <p>{counselState.argument}</p>
                  <dl>
                    <div><dt>Recorder</dt><dd>{counselState.recorder}</dd></div>
                    <div><dt>Shutter</dt><dd>{counselState.shutter}</dd></div>
                    <div><dt>Presence</dt><dd>{counselState.occupants}</dd></div>
                  </dl>
                  <div className="counsel-advocates">
                    {counselState.advocates.map((advocate) => (
                      <article key={advocate.id}>
                        <strong>{advocate.name}</strong>
                        <p>{advocate.motive}</p>
                        <small>{advocate.relationship}</small>
                      </article>
                    ))}
                  </div>
                  <blockquote>{counselState.liveObjection}</blockquote>
                </section>
              )}

              {selectedCompletedAction &&
                state.depositionRecord?.actionId === selectedCompletedAction.id &&
                ellisDetail && <p className="ellis-ordinary-detail">{ellisDetail}</p>}

              {selectedCompletedAction ? (
`,
)

replaceOnce(
  'src/components/Investigation.tsx',
  `              {sceneFirstPlate ? null : selectedActions.map((action) => {
`,
  `              {sceneFirstPlate || !causalGateAcknowledged ? null : selectedActions.map((action) => {
`,
)

appendOnce(
  'src/styles.css',
  '/* ── NONLINEAR CAUSAL PASS',
  `/* ── NONLINEAR CAUSAL PASS ─────────────────────────────────────────────── */
.approach-opening,
.causal-site-state,
.counsel-variant,
.prehearing-subject,
.tribunal-counsel-state,
.tribunal-route-memory,
.hearing-standing,
.immediate-aftermath,
.speculative-filing {
  border: 1px solid var(--line-strong);
  background: color-mix(in oklch, var(--concrete) 88%, transparent);
}

.approach-opening {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(18rem, 1fr) auto;
  gap: 1rem;
  align-items: start;
  margin: 0 1.25rem 1rem;
  padding: 1rem;
  box-shadow: inset 3px 0 0 var(--amber);
}

.approach-opening p,
.causal-site-state span,
.counsel-variant > div > span,
.prehearing-subject > div > p,
.tribunal-counsel-state > div > p,
.tribunal-route-memory > div > p,
.hearing-standing > div > p,
.immediate-aftermath-copy > p:first-child,
.speculative-filing span,
.causal-procedure-gate > span {
  margin: 0 0 0.35rem;
  color: var(--amber-soft);
  font: 500 var(--type-label) ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
}

.approach-opening h2,
.causal-site-state strong,
.counsel-variant h3 {
  margin: 0;
  color: var(--record-bright);
  font-size: var(--type-title);
}

.approach-opening-copy > span,
.approach-opening dd,
.causal-site-state p,
.counsel-variant p,
.counsel-variant dd {
  color: var(--fog);
  font-size: var(--type-body);
  line-height: 1.55;
}

.approach-opening dl,
.counsel-variant dl,
.tribunal-counsel-state dl {
  display: grid;
  gap: 0.55rem;
  margin: 0;
}

.approach-opening dl div,
.counsel-variant dl div,
.tribunal-counsel-state dl div {
  display: grid;
  grid-template-columns: 7rem 1fr;
  gap: 0.65rem;
}

.approach-opening dt,
.counsel-variant dt,
.tribunal-counsel-state dt {
  color: var(--fog-dim);
  font-size: var(--type-meta);
}

.approach-opening dd,
.counsel-variant dd,
.tribunal-counsel-state dd {
  margin: 0;
}

.approach-opening-presence {
  display: grid;
  gap: 0.45rem;
}

.approach-opening-presence span {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--record);
  font-size: var(--type-meta);
}

.approach-opening > small {
  grid-column: 1 / -1;
  color: var(--fog-dim);
}

.causal-site-state,
.counsel-variant {
  display: grid;
  gap: 0.75rem;
  margin: 0.9rem 0;
  padding: 0.9rem;
}

.causal-site-state[data-causal-phase='primed'] {
  box-shadow: inset 3px 0 0 var(--cyan);
}

.causal-site-state[data-causal-phase='resolved'],
.causal-site-state[data-causal-phase='settled'] {
  box-shadow: inset 3px 0 0 var(--line-strong);
}

.causal-procedural-effect,
.ellis-ordinary-detail,
.ordinary-detail {
  padding-left: 0.75rem;
  border-left: 2px solid var(--amber);
}

.causal-channels {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.causal-channels li,
.lattice-knowledge-legend span {
  border: 1px solid var(--line);
  padding: 0.25rem 0.45rem;
  color: var(--fog-dim);
  font-size: var(--type-micro);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.causal-procedure-gate {
  display: grid;
  gap: 0.65rem;
  min-height: 100%;
  align-content: center;
  padding: 1rem;
  background: color-mix(in oklch, var(--night-soft) 92%, transparent);
  border: 1px solid var(--cyan-deep);
}

.causal-procedure-gate p {
  margin: 0;
  color: var(--fog);
  line-height: 1.5;
}

.causal-procedure-gate button,
.causal-site-state button,
.scene-beat-replay button {
  min-height: 44px;
  border: 1px solid var(--line-strong);
  background: var(--raised);
  color: var(--record-bright);
  cursor: pointer;
}

.counsel-advocates,
.hearing-standing-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.counsel-advocates article,
.hearing-standing-grid article,
.tribunal-route-memory article {
  border: 1px solid var(--line);
  padding: 0.75rem;
  background: var(--night-soft);
}

.counsel-variant blockquote,
.npc-exchange blockquote {
  margin: 0;
  padding: 0.75rem;
  border-left: 2px solid var(--amber);
  color: var(--record);
}

.lattice-knowledge-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0 0 1rem;
}

.fragment-row[data-knowledge='unknown'] {
  opacity: 0.62;
  cursor: not-allowed;
}

.fragment-row[data-knowledge='known'] {
  box-shadow: inset 3px 0 0 var(--amber);
}

.fragment-row[data-knowledge='corroborated'] {
  box-shadow: inset 3px 0 0 var(--cyan);
}

.speculative-filing {
  display: grid;
  grid-template-columns: 1fr minmax(16rem, 0.75fr);
  gap: 1rem;
  margin: 1rem 0;
  padding: 1rem;
  box-shadow: inset 3px 0 0 var(--amber);
}

.speculative-filing h2,
.speculative-filing p {
  margin: 0.25rem 0;
}

.speculative-filing label {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  color: var(--record);
  line-height: 1.45;
}

.speculative-filing input {
  width: 1.15rem;
  height: 1.15rem;
  margin-top: 0.15rem;
}

.lattice-invalid {
  color: var(--amber-soft);
}

.prehearing-subject,
.tribunal-counsel-state,
.tribunal-route-memory,
.hearing-standing {
  display: grid;
  gap: 0.9rem;
  margin: 1rem auto;
  padding: 1rem;
  max-width: 74rem;
}

.prehearing-subject blockquote {
  margin: 0;
  color: var(--record-bright);
  font-size: var(--type-read);
}

.prehearing-subject strong,
.prehearing-subject small {
  color: var(--fog);
}

.tribunal-route-memory article,
.hearing-standing-grid article {
  display: grid;
  gap: 0.45rem;
}

.tribunal-route-memory small {
  color: var(--fog-dim);
  text-transform: uppercase;
}

.speculative-objection,
.speculative-echo {
  box-shadow: inset 3px 0 0 var(--amber);
}

.npc-exchange {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.immediate-aftermath {
  position: relative;
  display: grid;
  grid-template-columns: minmax(12rem, 0.7fr) minmax(0, 1.3fr) auto;
  gap: 1.25rem;
  align-items: center;
  max-width: 76rem;
  margin: 0 auto 1.25rem;
  padding: 1rem;
  overflow: hidden;
}

.immediate-aftermath-frame {
  position: relative;
  min-height: 9rem;
  border: 1px solid var(--line-strong);
  background: linear-gradient(145deg, var(--night), var(--concrete));
  overflow: hidden;
}

.immediate-aftermath-shutter,
.immediate-aftermath-trace,
.immediate-aftermath-object {
  position: absolute;
  display: block;
}

.immediate-aftermath-shutter {
  inset: 15% 12%;
  border: 1px solid var(--line-strong);
  transform: translateY(-8%);
  animation: causal-shutter 900ms var(--ease-out) both;
}

.immediate-aftermath-trace {
  left: 12%;
  right: 12%;
  bottom: 18%;
  height: 2px;
  background: var(--amber);
  box-shadow: 0 0 1rem color-mix(in oklch, var(--amber) 60%, transparent);
}

.immediate-aftermath-object {
  width: 2.5rem;
  height: 1.6rem;
  left: 50%;
  bottom: 22%;
  transform: translateX(-50%);
  border: 1px solid var(--fog-dim);
  background: var(--raised);
}

.immediate-aftermath-copy h1 {
  margin: 0.2rem 0 0.65rem;
  font-size: clamp(1.5rem, 4vw, 2.4rem);
}

.immediate-aftermath-copy p,
.immediate-aftermath-copy strong {
  color: var(--fog);
  line-height: 1.55;
}

.scene-beat-replay {
  position: relative;
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  margin-top: 0.6rem;
}

.scene-beat-replay button {
  padding: 0.45rem 0.7rem;
}

.scene-beat-replay label {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  color: var(--record);
  font-size: var(--type-meta);
}

@keyframes causal-shutter {
  from { opacity: 0; transform: translateY(-30%); }
  to { opacity: 1; transform: translateY(-8%); }
}

@media (max-width: 840px) {
  .approach-opening,
  .immediate-aftermath {
    grid-template-columns: 1fr;
    margin-inline: 0;
  }

  .speculative-filing,
  .counsel-advocates,
  .hearing-standing-grid,
  .npc-exchange {
    grid-template-columns: 1fr;
  }

  .approach-opening dl div,
  .counsel-variant dl div,
  .tribunal-counsel-state dl div {
    grid-template-columns: 1fr;
    gap: 0.2rem;
  }
}

@media (max-width: 390px) {
  .approach-opening,
  .causal-site-state,
  .counsel-variant,
  .prehearing-subject,
  .tribunal-counsel-state,
  .tribunal-route-memory,
  .hearing-standing,
  .immediate-aftermath,
  .speculative-filing {
    padding: 0.75rem;
  }

  .approach-opening-presence,
  .scene-beat-replay {
    align-items: stretch;
  }

  .scene-beat-replay button,
  .scene-beat-replay label {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .immediate-aftermath-shutter {
    animation: none;
    transform: none;
  }
}

.immediate-aftermath[data-reduced-motion='true'] .immediate-aftermath-shutter {
  animation: none;
  transform: none;
}
`,
)

appendOnce(
  'docs/PROVENANCE.md',
  '## Nonlinear causal gameplay pass (2026-07-30)',
  `## Nonlinear causal gameplay pass (2026-07-30)

No new generated or externally sourced media was added for this pass.

| Asset or layer | Source | Intended use | Review status |
|---|---|---|---|
| Case 81 deposition close-up reuse (`public/images/case-81-deposition-annex.webp`) | Existing approved and documented repository asset | Authored Procedure/Care opening staging; persistent witness chair, recorder, and admissibility-shutter location | Reuse only; prior readable-text, trademark, watermark, and composition review remains applicable |
| Causal portal, shutter, trace, chair, drawer, card, and security states | New repository-authored React/CSS/SVG-compatible presentation; no raster generation | Display canonical ordered-action, deposition, alarm, trust, and verdict facts in the existing world and HUD | Code review and browser playtest required; no generated text or third-party marks |
| Causal acoustic treatments | New authored numeric treatments consumed by the existing synthesized Web Audio graph | Communicate linked authority, security pressure, refusal, recorder, and room occlusion without decorative samples | Synthesized fallback only; no audio file, license, or external source |
| Immediate aftermath tableaux | New repository-authored CSS geometry over existing scene language | Skippable expression of already-committed outcome facts before written debrief | Presentation-only; verified not to dispatch or mutate canonical state |
`,
)

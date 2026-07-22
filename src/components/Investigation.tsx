import { useEffect, useRef, useState } from 'react'
import { getCaseContent, resolveFieldAction } from '../game/content'
import { canEnterTribunal } from '../game/engine'
import { SceneStage } from '../scene/SceneStage'
import { SiteCloseupStage } from '../scene/SiteCloseupStage'
import { resolveCommitConsent, sceneStateFor, witnessesRefusalOnCommit } from '../scene/sceneState'
import type { DepositionChoiceId, FieldActionId, GameState, SiteId } from '../game/types'
import { ChoiceButton } from './ChoiceButton'
import { Deposition } from './Deposition'
import { ReactionQuotes } from './ReactionQuotes'

interface InvestigationProps {
  state: GameState
  // Which deposition entry action, if any, has its transcript open. Lifted to App
  // so the ambient-audio scene state reads the same value (view-local otherwise).
  depositionEntry: FieldActionId | null
  onDepositionEntryChange: (entry: FieldActionId | null) => void
  onCommitAction: (actionId: FieldActionId) => void
  onCommitDeposition: (
    actionId: FieldActionId,
    beats: DepositionChoiceId[],
    askedConsent: boolean,
  ) => void
  onOpenReconstruction: () => void
  onEnterTribunal: () => void
}

// Move focus to the selected location workspace. On a tall/narrow viewport the
// workspace may sit below the map, so preserve the old scroll safety without
// making scrolling the primary desktop interaction.
function focusSiteCard(siteId: SiteId, reducedMotion: boolean) {
  const card = document.getElementById(`site-card-${siteId}`)
  if (!card) return
  card.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
  card.focus({ preventScroll: true })
}

// Whether a meaningful band of the stage already sits within the viewport. Used to
// keep the witnessed-refusal beat's scroll a no-op guard: while a transcript is
// open the tray docks below the stage, so the stage is already in view and a
// second scroll would only jump.
function stageInView(el: HTMLElement | null): boolean {
  if (!el) return false
  const rect = el.getBoundingClientRect()
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  return rect.bottom > 0 && rect.top < viewportHeight * 0.6
}

// The one in-voice line the witnessed-refusal beat announces (aria-live). Curly
// punctuation, ≤ 90 chars. It names what just became permanent: the room holds it.
const WITNESS_REFUSAL_LINE = 'The room dims. Ellis Marne’s “no” stays in it.'

// How long the witnessed-refusal beat holds the stage in view before handing focus
// to the filed card, so the refusal treatment has time to ramp. Reduced motion
// skips the hold entirely (instant jump + immediate handoff).
const WITNESS_HOLD_MS = 2500

export function Investigation({
  state,
  depositionEntry,
  onDepositionEntryChange,
  onCommitAction,
  onCommitDeposition,
  onOpenReconstruction,
  onEnterTribunal,
}: InvestigationProps) {
  const content = getCaseContent(state.caseId)
  const {
    sites,
    fieldActions,
    evidenceDefinitions,
    reconstructionDefinitions,
    chrome,
    deposition,
    scene,
  } = content
  const reconstruction = reconstructionDefinitions.find((item) => item.id === state.reconstruction)
  const reducedMotion = state.settings.reducedMotion
  const [selectedSiteId, setSelectedSiteId] = useState<SiteId>(
    () => sites.find((site) => !state.completedSites.includes(site.id))?.id ?? sites[0]!.id,
  )
  const [previewActionId, setPreviewActionId] = useState<FieldActionId | null>(null)

  // The live stage wrapper, so both the open-transcript reveal and the witnessed-
  // refusal beat can bring the reacting room into view behind / after the modal.
  const worldViewRef = useRef<HTMLDivElement>(null)
  const siteInspectorRef = useRef<HTMLElement>(null)
  const holdTimerRef = useRef<number | null>(null)
  // The one-shot witnessed-refusal announcement (aria-live). Set only from a commit
  // callback; empty at rest, so a reload of a persisted refusal never re-announces.
  const [refusalLine, setRefusalLine] = useState('')

  // Clear any pending hold timer if the phase unmounts mid-beat.
  useEffect(
    () => () => {
      if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current)
    },
    [],
  )

  // The inspector is a single persistent scroll container whose content changes
  // with the selected site. Always reveal the new location's heading rather than
  // inheriting the previous site's reading position.
  useEffect(() => {
    siteInspectorRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [selectedSiteId])

  // Decode the small authored plates before the player switches locations. This
  // keeps the map-to-room cut crisp without mounting hidden video or animation.
  useEffect(() => {
    if (typeof Image === 'undefined') return
    sites.forEach((site) => {
      if (!site.closeup) return
      const image = new Image()
      image.decoding = 'async'
      image.src = site.closeup.src
      if (typeof image.decode === 'function') void image.decode().catch(() => undefined)
    })
  }, [sites])

  // Finding 1a — when a transcript opens, the stage flips to press/corroborate.
  // The tray docks to the bottom of the column, so keep the stage in view above
  // it on both the desktop workspace and the sequential fallback. The tray's own
  // focus may scroll a frame later, so this is deferred past it (60ms) and instant.
  useEffect(() => {
    if (!depositionEntry) return
    const timer = window.setTimeout(() => {
      worldViewRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' })
    }, 60)
    return () => window.clearTimeout(timer)
  }, [depositionEntry])

  // Finding 1b — the witnessed-refusal beat. Fires exactly once, from the commit
  // result (never persisted state): on a refused ('no') consent, bring the stage
  // into view, announce the in-voice line, hold while the refusal treatment ramps,
  // then hand focus to the filed card. Reduced motion: instant jump, same
  // announcement, immediate handoff — no smooth scroll, no hold timer.
  function playWitnessedRefusal(siteId: SiteId) {
    setRefusalLine(WITNESS_REFUSAL_LINE)
    // The tray kept the stage in view, so this is a guard, not a jump: only scroll
    // if the stage has left the fold, so the beat never double-scrolls over the
    // reaction the player is already watching or fights the tray's close.
    if (!stageInView(worldViewRef.current)) {
      worldViewRef.current?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    }
    if (reducedMotion) {
      focusSiteCard(siteId, true)
      return
    }
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current)
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null
      focusSiteCard(siteId, false)
    }, WITNESS_HOLD_MS)
  }

  function handleCommitDeposition(
    actionId: FieldActionId,
    beats: DepositionChoiceId[],
    askedConsent: boolean,
  ) {
    onDepositionEntryChange(null)
    onCommitDeposition(actionId, beats, askedConsent)
    // Decide the beat from the committed consent (shared vocabulary), not by
    // observing the refusal state after it lands.
    const consent = resolveCommitConsent(deposition, actionId, askedConsent)
    if (!witnessesRefusalOnCommit(consent)) {
      window.requestAnimationFrame(() => {
        siteInspectorRef.current?.scrollTo({ top: 0, behavior: 'auto' })
        siteInspectorRef.current?.focus({ preventScroll: true })
      })
      return
    }
    const siteId = fieldActions.find((action) => action.id === actionId)?.siteId
    if (siteId) playWitnessedRefusal(siteId)
  }

  function handleCommitAction(actionId: FieldActionId) {
    setPreviewActionId(null)
    onCommitAction(actionId)
    // The confirmed choice unmounts when the filed result replaces it. Keep the
    // keyboard route in context and reveal the consequence from its first line.
    window.requestAnimationFrame(() => {
      siteInspectorRef.current?.scrollTo({ top: 0, behavior: 'auto' })
      siteInspectorRef.current?.focus({ preventScroll: true })
    })
  }

  function handleAbandonDeposition() {
    onDepositionEntryChange(null)
    // The portalled dialog unmounts immediately. Return keyboard users to the
    // location workspace instead of letting focus fall through to <body>.
    window.requestAnimationFrame(() => {
      siteInspectorRef.current?.scrollTo({ top: 0, behavior: 'auto' })
      siteInspectorRef.current?.focus({ preventScroll: true })
    })
  }
  // The scene state is a pure read of GameState + the open-deposition view: the
  // interior presses/corroborates while a transcript is open, and holds refusal
  // after a refused consent. A flat map (Case 77) resolves to 'neutral' here.
  const sceneState = sceneStateFor(state, {
    surface: 'investigation',
    openDepositionEntry: depositionEntry,
  })
  const diorama = Boolean(scene.LayerArt)
  // Caption precipitation number: only meaningful for a rain scene (Case 77's
  // identity). Kept as the single source of truth for the reported percentage.
  const captionMask = scene.weather.kind === 'rain' ? scene.weather.intensity.neutral ?? 0 : null
  const tribunalReady = canEnterTribunal(state)
  const sitesNeeded = Math.max(0, 2 - state.completedSites.length)
  const gateRequirements = [
    sitesNeeded > 0
      ? `Complete ${sitesNeeded} more field site${sitesNeeded === 1 ? '' : 's'}.`
      : null,
    !reconstruction ? 'File one memory reconstruction.' : null,
  ].filter((requirement): requirement is string => requirement !== null)
  const gateRequirement = gateRequirements.join(' ')
  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? sites[0]!
  const selectedCompletedBase = fieldActions.find(
    (action) =>
      action.siteId === selectedSite.id && state.completedActions.includes(action.id),
  )
  const selectedCompletedAction = selectedCompletedBase
    ? resolveFieldAction(content, selectedCompletedBase.id, state.precedents)
    : undefined
  const selectedActions = selectedSite.actionIds
    .map((actionId) => resolveFieldAction(content, actionId, state.precedents))
    .filter((action): action is NonNullable<typeof action> => Boolean(action))
  const selectedEvidence = selectedCompletedAction
    ? evidenceDefinitions.find((evidence) => evidence.id === selectedCompletedAction.evidenceId)
    : undefined
  const selectedEvent = selectedCompletedAction
    ? state.events.find(
        (event) =>
          event.sourceType === 'field-action' && event.sourceId === selectedCompletedAction.id,
      )
    : undefined
  const openSites = sites.filter((site) => !state.completedSites.includes(site.id))

  const nextFieldAction = tribunalReady
    ? { label: 'Enter tribunal', run: onEnterTribunal }
    : state.completedSites.length === 0
      ? {
          label: 'Choose a method here',
          run: () => selectSite(selectedSite.id, true),
        }
      : !reconstruction
        ? { label: 'Open memory lattice', run: onOpenReconstruction }
        : {
            label: 'Complete one more site',
            run: () => {
              const nextSite =
                openSites.find((site) => site.id === selectedSite.id) ?? openSites[0]
              if (nextSite) selectSite(nextSite.id, true)
            },
          }

  function selectSite(siteId: SiteId, moveFocus = false) {
    setPreviewActionId(null)
    setSelectedSiteId(siteId)
    if (!moveFocus) return

    // React commits the selected location before the next animation frame. If
    // the same hotspot is re-opened, the existing workspace is focused instead.
    window.requestAnimationFrame(() => focusSiteCard(siteId, reducedMotion))
  }

  return (
    <article className="phase-page investigation-page">
      <p className="sr-only" role="status" aria-live="polite">
        {refusalLine}
      </p>
      <header className="field-commandbar">
        <div>
          <p className="section-context">Active field record</p>
          <h1 id="field-heading">Investigate the district</h1>
        </div>
        <p className="field-command-copy">
          Choose a location, then decide what becomes admissible there.
        </p>
        <div className="field-objectives" aria-label="Tribunal requirements">
          <span data-complete={state.completedSites.length >= 2 ? 'true' : undefined}>
            <strong>{Math.min(state.completedSites.length, 2)} / 2</strong>
            sites
          </span>
          <span data-complete={reconstruction ? 'true' : undefined}>
            <strong>{reconstruction ? 'Filed' : 'Needed'}</strong>
            model
          </span>
        </div>
      </header>

      <div className="field-workspace">
        <section className="world-pane" aria-label="District navigation">
          <div
            className={`world-view ${selectedSite.closeup ? 'world-view--closeup' : ''}`}
            ref={worldViewRef}
          >
            {/* The world is now the primary location picker. A hotspot swaps the
                adjacent workspace in place instead of sending the player down a
                long document. Canonical game state remains engine-owned. */}
            <SceneStage
              scene={scene}
              sceneState={sceneState}
              reducedMotion={state.settings.reducedMotion}
              alarmLevel={state.alarm}
              interactive
              parallax={diorama}
              active={!selectedSite.closeup}
              sites={sites}
              completedSiteIds={state.completedSites}
              selectedSiteId={selectedSite.id}
              onHotspotActivate={(siteId) => selectSite(siteId, true)}
            />
            {selectedSite.closeup && (
              <SiteCloseupStage
                key={selectedSite.id}
                closeup={selectedSite.closeup}
                actions={selectedActions}
                activeActionId={previewActionId}
                resolvedActionId={selectedCompletedAction?.id}
              />
            )}
            <div className="world-caption">
              <span>
                {selectedSite.closeup
                  ? `${selectedSite.index} · ${selectedSite.name}`
                  : chrome.worldCaption[0]}
              </span>
              {selectedSite.closeup ? (
                <span>{selectedSite.closeup.caption}</span>
              ) : captionMask !== null ? (
                <span>
                  {chrome.worldCaption[1]}: {Math.round(captionMask * 100)}%
                </span>
              ) : null}
            </div>
          </div>

          <nav className="site-switcher" aria-label="Field locations">
            {sites.map((site) => {
              const selected = site.id === selectedSite.id
              const filed = state.completedSites.includes(site.id)
              return (
                <button
                  className="site-switch"
                  type="button"
                  key={site.id}
                  aria-pressed={selected}
                  data-filed={filed ? 'true' : undefined}
                  onClick={() => selectSite(site.id)}
                >
                  <span className="site-switch-index">{site.index}</span>
                  <span>
                    <strong>{site.name}</strong>
                    <small>{filed ? 'Filed' : selected ? 'In view' : 'Available'}</small>
                  </span>
                </button>
              )
            })}
          </nav>
        </section>

        <section
          className={`site-record site-inspector ${selectedCompletedAction ? 'site-record-complete' : ''}`}
          id={`site-card-${selectedSite.id}`}
          ref={siteInspectorRef}
          tabIndex={-1}
          aria-labelledby={`site-heading-${selectedSite.id}`}
        >
          <header className="site-header">
            <span className="site-index">{selectedSite.index}</span>
            <div>
              <p className="site-location-label">Location in view</p>
              <h2 id={`site-heading-${selectedSite.id}`}>{selectedSite.name}</h2>
            </div>
            <span
              className={`site-state ${selectedCompletedAction ? 'state-filed' : 'state-open'}`}
            >
              {selectedCompletedAction ? 'Filed' : 'Open'}
            </span>
          </header>
          <p className="site-description">{selectedSite.description}</p>

          {selectedCompletedAction ? (
            <>
              <div className="resolved-action">
                <span className="resolved-mark" aria-hidden="true">
                  ✓
                </span>
                <div>
                  <strong>{selectedEvent?.title ?? selectedCompletedAction.title}</strong>
                  <p>{selectedEvent?.detail ?? selectedCompletedAction.eventDetail}</p>
                  <div className="record-delta" aria-label="Filed result">
                    {selectedEvidence && (
                      <span>
                        <small>Evidence admitted</small>
                        <strong>{selectedEvidence.title}</strong>
                      </span>
                    )}
                    <span>
                      <small>Civic trace</small>
                      <strong className={selectedCompletedAction.alarmDelta > 0 ? 'text-risk' : ''}>
                        {selectedCompletedAction.alarmDelta > 0
                          ? `+${selectedCompletedAction.alarmDelta} alarm`
                          : 'No new trace'}
                      </strong>
                    </span>
                    {selectedCompletedAction.grantsTribunalOverride && (
                      <span>
                        <small>Authority</small>
                        <strong>Override acquired</strong>
                      </span>
                    )}
                  </div>
                  <ReactionQuotes reactions={selectedCompletedAction.reactions} />
                </div>
              </div>
              {openSites.length > 0 && (
                <div className="next-location">
                  <span>Continue elsewhere</span>
                  <div>
                    {openSites.map((site) => (
                      <button type="button" key={site.id} onClick={() => selectSite(site.id, true)}>
                        {site.index} · {site.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Keyed by site: switching location remounts the method list, so any
            // armed commit resets silently with it (one of the three disarms).
            <div className="site-actions" key={selectedSite.id}>
              <p className="site-action-prompt">Choose one method. This location then closes.</p>
              {selectedActions.map((action) => {
                // A deposition entry opens its authored transcript interaction;
                // its own final confirmation is the canonical commit.
                const isDepositionEntry = Boolean(deposition?.entryActionIds.includes(action.id))

                return (
                  <ChoiceButton
                    key={action.id}
                    title={action.title}
                    label={action.methodLabel}
                    description={action.description}
                    consequence={action.consequence}
                    tone={action.alarmDelta > 0 ? 'risk' : 'default'}
                    aside={isDepositionEntry ? 'Open transcript' : undefined}
                    requiresConfirmation={!isDepositionEntry}
                    onAttentionChange={(active) => {
                      setPreviewActionId((current) =>
                        active ? action.id : current === action.id ? null : current,
                      )
                    }}
                    onClick={
                      isDepositionEntry
                        ? () => onDepositionEntryChange(action.id)
                        : () => handleCommitAction(action.id)
                    }
                  />
                )
              })}
            </div>
          )}
        </section>
      </div>

      <footer className={`field-dock ${tribunalReady ? 'field-dock-ready' : ''}`}>
        <div className="field-route" aria-label="Case progression">
          <span data-current="true">Field</span>
          <span aria-hidden="true">→</span>
          <span data-ready={state.completedSites.length > 0 ? 'true' : undefined}>Memory</span>
          <span aria-hidden="true">→</span>
          <span data-ready={tribunalReady ? 'true' : undefined}>Tribunal</span>
        </div>

        <div className="field-dock-copy">
          {reconstruction ? (
            <details className="filed-model">
              <summary>{reconstruction.title} · model filed</summary>
              <p>{reconstruction.thesis}</p>
              <ReactionQuotes reactions={reconstruction.reactions} />
            </details>
          ) : (
            <p>
              {state.completedSites.length === 0
                ? 'Visit one location to unlock the memory lattice.'
                : 'The memory lattice is ready. File one model to unlock the tribunal.'}
            </p>
          )}
          {!tribunalReady && state.completedSites.length > 0 && reconstruction && (
            <p>{gateRequirement}</p>
          )}
        </div>

        <div className="field-dock-actions">
          <button className="button button-primary" type="button" onClick={nextFieldAction.run}>
            {nextFieldAction.label} <span aria-hidden="true">→</span>
          </button>
        </div>
      </footer>

      {depositionEntry && (
        <Deposition
          state={state}
          entryActionId={depositionEntry}
          onCommit={handleCommitDeposition}
          onAbandon={handleAbandonDeposition}
        />
      )}
    </article>
  )
}

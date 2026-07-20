import { useEffect, useRef, useState } from 'react'
import { getCaseContent, resolveFieldAction } from '../game/content'
import { canEnterTribunal } from '../game/engine'
import { SceneStage } from '../scene/SceneStage'
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

// A hotspot is wayfinding: activating it scrolls to and focuses that site's card,
// which stays the canonical interaction surface.
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
  const { sites, fieldActions, reconstructionDefinitions, chrome, deposition, scene } = content
  const reconstruction = reconstructionDefinitions.find((item) => item.id === state.reconstruction)
  const reducedMotion = state.settings.reducedMotion

  // The live stage wrapper, so both the open-transcript reveal and the witnessed-
  // refusal beat can bring the reacting room into view behind / after the modal.
  const worldViewRef = useRef<HTMLDivElement>(null)
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

  // Finding 1a — when a transcript opens, the stage flips to press/corroborate.
  // The tray docks to the bottom of the column, so bring the stage into view above
  // it (the transcript may have been opened from a field card far down the page).
  // The tray's own focus scrolls the page a frame later and would override an
  // immediate scroll, so this is deferred past it (60ms) and instant —
  // imperceptible under the tray sliding up.
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
    if (!witnessesRefusalOnCommit(consent)) return
    const siteId = fieldActions.find((action) => action.id === actionId)?.siteId
    if (siteId) playWitnessedRefusal(siteId)
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

  return (
    <article className="phase-page investigation-page">
      <p className="sr-only" role="status" aria-live="polite">
        {refusalLine}
      </p>
      <div className="world-view" ref={worldViewRef}>
        {/* The live scene: the diorama (Case 81) or the flat civic map (Case 77),
            with a plane-registered hotspot overlay. The art stack is aria-hidden;
            the hotspots are real buttons that focus their site card below. */}
        <SceneStage
          scene={scene}
          sceneState={sceneState}
          reducedMotion={state.settings.reducedMotion}
          interactive
          parallax={diorama}
          sites={sites}
          completedSiteIds={state.completedSites}
          onHotspotActivate={(siteId) => focusSiteCard(siteId, state.settings.reducedMotion)}
          ariaLabel={chrome.worldAriaLabel}
        />
        <div className="world-caption">
          <span>{chrome.worldCaption[0]}</span>
          {captionMask !== null && (
            <span>
              {chrome.worldCaption[1]}: {Math.round(captionMask * 100)}%
            </span>
          )}
        </div>
      </div>

      <section className="phase-section field-section" aria-labelledby="field-heading">
        <div className="section-heading">
          <div>
            <p className="section-context">Active field record</p>
            <h1 id="field-heading">Choose what becomes admissible</h1>
            <p>
              Each site closes after one method. There is no failed route—only a record of what you
              risked, protected, or refused.
            </p>
          </div>
          <span className="selection-count">
            {state.completedSites.length} chosen · 2 required
          </span>
        </div>

        <div className="site-list">
          {sites.map((site) => {
            // Resolve the filed action through the precedent seam so its shown
            // event detail and reactions match what the engine committed.
            const completedBase = fieldActions.find(
              (action) => action.siteId === site.id && state.completedActions.includes(action.id),
            )
            const completedAction = completedBase
              ? resolveFieldAction(content, completedBase.id, state.precedents)
              : undefined

            return (
              <section
                className={`site-record ${completedAction ? 'site-record-complete' : ''}`}
                key={site.id}
                id={`site-card-${site.id}`}
                tabIndex={-1}
              >
                <header className="site-header">
                  <span className="site-index">{site.index}</span>
                  <div>
                    <h2>{site.name}</h2>
                    <p>{site.description}</p>
                  </div>
                  <span className={`site-state ${completedAction ? 'state-filed' : 'state-open'}`}>
                    {completedAction ? 'Filed' : 'Open'}
                  </span>
                </header>

                {completedAction ? (
                  <div className="resolved-action">
                    <span className="resolved-mark" aria-hidden="true">
                      ✓
                    </span>
                    <div>
                      <strong>{completedAction.title}</strong>
                      <p>{completedAction.eventDetail}</p>
                      <ReactionQuotes reactions={completedAction.reactions} />
                    </div>
                  </div>
                ) : (
                  <div className="site-actions">
                    {site.actionIds.map((actionId) => {
                      // Resolve through the precedent seam so the pre-commit hint
                      // and risk tone reflect any prior-verdict override.
                      const action = resolveFieldAction(content, actionId, state.precedents)
                      if (!action) return null

                      // A deposition entry action opens the transcript instead of
                      // resolving instantly; its own confirm is the final commit.
                      const isDepositionEntry = Boolean(
                        deposition?.entryActionIds.includes(action.id),
                      )

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
                          onClick={
                            isDepositionEntry
                              ? () => onDepositionEntryChange(action.id)
                              : () => onCommitAction(action.id)
                          }
                        />
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </section>

      <section className="convergence-panel" aria-labelledby="lattice-heading">
        <div className="convergence-index" aria-hidden="true">
          ◫
        </div>
        <div className="convergence-copy">
          <p className="section-context">Required synthesis</p>
          <h2 id="lattice-heading">Memory lattice</h2>
          {reconstruction ? (
            <>
              <p>
                <strong>{reconstruction.title}:</strong> {reconstruction.thesis}
              </p>
              <span className="filed-badge">Model filed</span>
              <ReactionQuotes reactions={reconstruction.reactions} />
            </>
          ) : (
            <p>Select two anchors. Every pairing is admissible, but each makes a different claim.</p>
          )}
        </div>
        {!reconstruction && (
          <button
            className="button button-secondary"
            type="button"
            onClick={onOpenReconstruction}
            disabled={state.completedSites.length === 0}
          >
            Open lattice <span aria-hidden="true">→</span>
          </button>
        )}
        {!reconstruction && state.completedSites.length === 0 && (
          <p className="convergence-hint">Visit one field site before reconstructing the record.</p>
        )}
      </section>

      <section className={`tribunal-gate ${tribunalReady ? 'tribunal-gate-ready' : ''}`}>
        <div>
          <p className="section-context">Convergence point</p>
          <h2>{tribunalReady ? 'The tribunal is ready' : 'Tribunal channel withheld'}</h2>
          <p>
            {tribunalReady
              ? 'You may continue investigating or resolve the case with the record you have made.'
              : gateRequirement}
          </p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={onEnterTribunal}
          disabled={!tribunalReady}
        >
          Enter tribunal <span aria-hidden="true">→</span>
        </button>
      </section>

      {depositionEntry && (
        <Deposition
          state={state}
          entryActionId={depositionEntry}
          onCommit={handleCommitDeposition}
          onAbandon={() => onDepositionEntryChange(null)}
        />
      )}
    </article>
  )
}

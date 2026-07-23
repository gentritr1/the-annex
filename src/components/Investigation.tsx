import { useEffect, useRef, useState } from 'react'
import { getCaseContent, resolveFieldAction } from '../game/content'
import { canEnterTribunal } from '../game/engine'
import { resolveSiteOutcomes } from '../game/room'
import { SceneStage } from '../scene/SceneStage'
import { SITE_CLOSEUP_ENTRY_MS, SiteCloseupStage } from '../scene/SiteCloseupStage'
import { resolveCommitConsent, sceneStateFor, witnessesRefusalOnCommit } from '../scene/sceneState'
import { AnnexWorldStage } from '../world/AnnexWorldStage'
import type {
  AcousticShadowPlateState,
  CustodyRailPlateState,
  DepositionChoiceId,
  FieldActionId,
  GameState,
  RoomPlateState,
  SceneAcousticTreatment,
  SiteId,
} from '../game/types'
import { AcousticShadowRoom } from './AcousticShadowRoom'
import { ChoiceButton } from './ChoiceButton'
import { ClassificationRoom } from './ClassificationRoom'
import { CustodyRailRoom } from './CustodyRailRoom'
import { Deposition } from './Deposition'
import { ReactionQuotes } from './ReactionQuotes'

interface InvestigationProps {
  state: GameState
  // Which deposition entry action, if any, has its transcript open. Lifted to App
  // so the ambient-audio scene state reads the same value (view-local otherwise).
  depositionEntry: FieldActionId | null
  onDepositionEntryChange: (entry: FieldActionId | null) => void
  // Reports presentation-only bounded-world acoustics to App's single audio
  // handle. It never dispatches or writes canonical/persisted game state.
  onAcousticTreatmentChange: (treatment: SceneAcousticTreatment | null) => void
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

interface CloseupEntryOrigin {
  x: number
  y: number
}

type WorldPresentation =
  | { kind: 'map' }
  | { kind: 'concourse' }
  | { kind: 'travel'; siteId: SiteId; epoch: number; origin: CloseupEntryOrigin }
  | { kind: 'arriving'; siteId: SiteId; epoch: number; origin: CloseupEntryOrigin }
  | { kind: 'closeup'; siteId: SiteId; origin: CloseupEntryOrigin }

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function forcedColorsActive() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(forced-colors: active)').matches
  )
}

export function Investigation({
  state,
  depositionEntry,
  onDepositionEntryChange,
  onAcousticTreatmentChange,
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
  const initialSite =
    sites.find((site) => !state.completedSites.includes(site.id)) ?? sites[0]!
  const [selectedSiteId, setSelectedSiteId] = useState<SiteId>(() => initialSite.id)
  const [osReducedMotion, setOsReducedMotion] = useState(prefersReducedMotion)
  const [osForcedColors, setOsForcedColors] = useState(forcedColorsActive)
  const [worldPresentation, setWorldPresentation] = useState<WorldPresentation>(() =>
    scene.world
      ? { kind: 'concourse' }
      : initialSite.closeup
      ? { kind: 'closeup', siteId: initialSite.id, origin: { x: 0.5, y: 0.5 } }
      : { kind: 'map' },
  )
  const [previewActionId, setPreviewActionId] = useState<FieldActionId | null>(null)
  // The room's decorative plate presentation (view-local; reset when the site
  // changes). Drives the close-read plate's drawer/refusal/aperture/log stagecraft.
  const [roomPresentation, setRoomPresentation] = useState<RoomPlateState | null>(null)
  // The acoustic-shadow room's plate presentation (view-local; reset with the site).
  // Drives the corridor near/mid/far/credential stagecraft and this phase's acoustics.
  const [acousticPresentation, setAcousticPresentation] =
    useState<AcousticShadowPlateState | null>(null)
  // Registry Intake's custody-rail plate presentation (view-local; reset with the
  // site). Drives carrier latches, the closure refusal, and the audit-mirror trace.
  const [custodyPresentation, setCustodyPresentation] =
    useState<CustodyRailPlateState | null>(null)
  // One-shot return-to-concourse emphasis: the site just left, held for a beat so
  // its altered portal is unmissable, then cleared to restore ordinary navigation.
  const [returnEmphasisSiteId, setReturnEmphasisSiteId] = useState<SiteId | null>(null)
  const returnEmphasisTimerRef = useRef<number | null>(null)

  // Resolved concourse alteration per room site, derived from the committed field
  // actions and each site's authored worldOutcome map. Content-driven: no site or
  // action id is named here. Consumed by the world stage, the switcher chips, and
  // the return announcement.
  const resolvedOutcomes = resolveSiteOutcomes(sites, state.completedActions)

  // The live stage wrapper, so both the open-transcript reveal and the witnessed-
  // refusal beat can bring the reacting room into view behind / after the modal.
  const worldViewRef = useRef<HTMLDivElement>(null)
  const siteInspectorRef = useRef<HTMLElement>(null)
  const holdTimerRef = useRef<number | null>(null)
  const transitionEpochRef = useRef(0)
  const selectedSiteRef = useRef(selectedSiteId)
  // The one-shot witnessed-refusal announcement (aria-live). Set only from a commit
  // callback; empty at rest, so a reload of a persisted refusal never re-announces.
  const [refusalLine, setRefusalLine] = useState('')
  const [worldLine, setWorldLine] = useState('')

  const sceneMotionReduced = reducedMotion || osReducedMotion

  // Keep the operating-system preference live. It participates in the view-only
  // transition gate exactly like the in-game preference, including mid-travel.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event: MediaQueryListEvent) => setOsReducedMotion(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  // Forced-colors is also a no-download gate for optional blended raster effects,
  // not merely a CSS hiding rule. The code-native structural traces remain.
  useEffect(() => {
    const query = window.matchMedia('(forced-colors: active)')
    const onChange = (event: MediaQueryListEvent) => setOsForcedColors(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    selectedSiteRef.current = selectedSiteId
  }, [selectedSiteId])

  // Begin the plate reveal only after the authored scene travel has had its full
  // post-commit window. Two final frames let motion.ts land on its exact target
  // before the close read starts covering it. Every handle is cancelled by the
  // effect cleanup, so rapid A → B → A input cannot reveal a stale location.
  useEffect(() => {
    if (worldPresentation.kind !== 'travel' || sceneMotionReduced) return
    const { siteId, epoch, origin } = worldPresentation
    let firstFrame = 0
    let secondFrame = 0
    const timer = window.setTimeout(() => {
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          if (
            transitionEpochRef.current !== epoch ||
            selectedSiteRef.current !== siteId
          ) {
            return
          }
          setWorldPresentation((current) =>
            current.kind === 'travel' &&
            current.epoch === epoch &&
            current.siteId === siteId
              ? { kind: 'arriving', siteId, epoch, origin }
              : current,
          )
        })
      })
    }, scene.world?.travelMs ?? scene.travel?.travelInMs ?? 0)

    return () => {
      window.clearTimeout(timer)
      if (firstFrame) window.cancelAnimationFrame(firstFrame)
      if (secondFrame) window.cancelAnimationFrame(secondFrame)
    }
  }, [scene.travel?.travelInMs, scene.world?.travelMs, sceneMotionReduced, worldPresentation])

  // Hold the live scene at its travelled framing behind the growing aperture.
  // Once the opaque plate covers it, promote to the settled closeup and let
  // SceneStage destroy its single animation loop.
  useEffect(() => {
    if (worldPresentation.kind !== 'arriving' || sceneMotionReduced) return
    const { siteId, epoch, origin } = worldPresentation
    const timer = window.setTimeout(() => {
      if (transitionEpochRef.current !== epoch || selectedSiteRef.current !== siteId) return
      setWorldPresentation((current) =>
        current.kind === 'arriving' &&
        current.epoch === epoch &&
        current.siteId === siteId
          ? { kind: 'closeup', siteId, origin }
          : current,
      )
    }, SITE_CLOSEUP_ENTRY_MS)
    return () => window.clearTimeout(timer)
  }, [sceneMotionReduced, worldPresentation])

  // If either reduced-motion signal turns on during a transition, reveal the
  // destination immediately. The render below also derives this state eagerly,
  // so there is no intermediate animated frame while this effect settles it.
  useEffect(() => {
    if (!sceneMotionReduced) return
    const frame = window.requestAnimationFrame(() => {
      setWorldPresentation((current) =>
        current.kind === 'travel' || current.kind === 'arriving'
          ? { kind: 'closeup', siteId: current.siteId, origin: current.origin }
          : current,
      )
    })
    return () => window.cancelAnimationFrame(frame)
  }, [sceneMotionReduced])

  // Clear any pending hold timer if the phase unmounts mid-beat.
  useEffect(
    () => () => {
      if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current)
    },
    [],
  )

  // Release the return-emphasis hold timer if Investigation unmounts mid-beat.
  useEffect(
    () => () => {
      if (returnEmphasisTimerRef.current !== null) {
        window.clearTimeout(returnEmphasisTimerRef.current)
      }
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
  const presentationForRender: WorldPresentation =
    sceneMotionReduced &&
    (worldPresentation.kind === 'travel' || worldPresentation.kind === 'arriving')
      ? {
          kind: 'closeup',
          siteId: worldPresentation.siteId,
          origin: worldPresentation.origin,
        }
      : worldPresentation
  const acousticTreatment = scene.world
    ? presentationForRender.kind === 'concourse'
      ? scene.world.acoustics
      : presentationForRender.kind === 'map'
        ? null
        : (scene.world.portals.find((portal) => portal.siteId === presentationForRender.siteId)
            ?.acoustics ?? null)
    : null
  // While the acoustic-shadow room is active (its site selected, unfiled, and
  // reporting a phase), its authored per-phase treatment replaces the portal's
  // static one on the SAME callback. The room is view-local, so leaving the site
  // (acousticPresentation reset to null) restores the ordinary portal derivation.
  const acousticRoomTreatment =
    selectedSite.acousticShadow &&
    acousticPresentation &&
    !state.completedSites.includes(selectedSite.id)
      ? selectedSite.acousticShadow.acoustics[acousticPresentation.phase]
      : null
  const effectiveAcoustic = acousticRoomTreatment ?? acousticTreatment

  // Keep the audio graph synchronized from authored view data only. Returning to
  // the hub restores its treatment; leaving Investigation restores the dry bed.
  useEffect(() => {
    onAcousticTreatmentChange(effectiveAcoustic)
  }, [effectiveAcoustic, onAcousticTreatmentChange])
  useEffect(
    () => () => {
      onAcousticTreatmentChange(null)
    },
    [onAcousticTreatmentChange],
  )
  const presentationMatchesSelection =
    presentationForRender.kind !== 'map' &&
    presentationForRender.kind !== 'concourse' &&
    presentationForRender.siteId === selectedSite.id
  const shownCloseup =
    presentationMatchesSelection &&
    (presentationForRender.kind === 'arriving' || presentationForRender.kind === 'closeup')
      ? selectedSite.closeup
      : undefined
  const closeupEntryOrigin =
    presentationForRender.kind === 'map' || presentationForRender.kind === 'concourse'
      ? { x: 0.5, y: 0.5 }
      : presentationForRender.origin
  const cameraSiteId =
    presentationForRender.kind === 'travel' || presentationForRender.kind === 'arriving'
      ? selectedSite.id
      : undefined
  const sceneActive = presentationForRender.kind !== 'closeup'
  const worldViewClass = [
    'world-view',
    scene.world ? 'world-view--spatial' : '',
    presentationForRender.kind === 'concourse' ? 'world-view--concourse' : '',
    shownCloseup ? 'world-view--closeup' : '',
    presentationForRender.kind === 'travel' ? 'world-view--traveling' : '',
    presentationForRender.kind === 'arriving' ? 'world-view--arriving' : '',
  ]
    .filter(Boolean)
    .join(' ')
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
  // Which resolved acoustic-shadow crossing the settled plate should render, once a
  // maintenance method is filed. The credential-forging method takes the override;
  // the shadow walk does not — so the flag distinguishes the two without an id.
  const acousticResolvedVariant: 'shadow' | 'credential' | undefined =
    selectedSite.acousticShadow && selectedCompletedAction
      ? selectedCompletedAction.grantsTribunalOverride
        ? 'credential'
        : 'shadow'
      : undefined
  const custodyResolvedVariant =
    selectedSite.custodyRail && selectedCompletedAction
      ? selectedSite.custodyRail.actionTreatments[selectedCompletedAction.id]
      : undefined
  const custodyPreviewVariant =
    selectedSite.custodyRail && previewActionId
      ? selectedSite.custodyRail.actionTreatments[previewActionId]
      : undefined
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

  function entryOriginFor(siteId: SiteId, sourceElement?: HTMLElement): CloseupEntryOrigin {
    const worldRect = worldViewRef.current?.getBoundingClientRect()
    const sourceRect = sourceElement?.getBoundingClientRect()
    if (worldRect && sourceRect && worldRect.width > 0 && worldRect.height > 0) {
      const x = (sourceRect.left + sourceRect.width / 2 - worldRect.left) / worldRect.width
      const y = (sourceRect.top + sourceRect.height / 2 - worldRect.top) / worldRect.height
      return {
        x: Math.max(0.04, Math.min(0.96, x)),
        y: Math.max(0.06, Math.min(0.94, y)),
      }
    }
    const portal = scene.world?.portals.find((item) => item.siteId === siteId)
    const hotspot = scene.hotspots.find((item) => item.siteId === siteId)
    return {
      x: Math.max(0.04, Math.min(0.96, portal?.posterAnchor.x ?? hotspot?.x ?? 0.5)),
      y: Math.max(0.06, Math.min(0.94, portal?.posterAnchor.y ?? hotspot?.y ?? 0.5)),
    }
  }

  function selectSite(siteId: SiteId, moveFocus = false, sourceElement?: HTMLElement) {
    setPreviewActionId(null)
    // The room component remains mounted while the selected threshold swaps
    // between concourse and closeup. Preserve its plate state on that same-site
    // transition; only an actual location switch remounts/reset the view-local room.
    if (selectedSiteId !== siteId) {
      setRoomPresentation(null)
      setAcousticPresentation(null)
      setCustodyPresentation(null)
    }
    clearReturnEmphasis()
    setWorldLine('')
    const alreadyPresentingSite =
      worldPresentation.kind !== 'map' &&
      worldPresentation.kind !== 'concourse' &&
      worldPresentation.siteId === siteId
    if (selectedSiteId === siteId && alreadyPresentingSite) {
      if (moveFocus) {
        window.requestAnimationFrame(() =>
          focusSiteCard(siteId, reducedMotion || prefersReducedMotion()),
        )
      }
      return
    }

    const targetSite = sites.find((site) => site.id === siteId)
    if (!targetSite) return
    const origin = entryOriginFor(siteId, sourceElement)
    const epoch = transitionEpochRef.current + 1
    transitionEpochRef.current = epoch
    selectedSiteRef.current = siteId
    setSelectedSiteId(siteId)
    const instant = reducedMotion || prefersReducedMotion()
    if (!targetSite.closeup) {
      setWorldPresentation({ kind: 'map' })
    } else if (instant || (!scene.world && (!diorama || !scene.travel))) {
      setWorldPresentation({ kind: 'closeup', siteId, origin })
    } else {
      setWorldPresentation({ kind: 'travel', siteId, epoch, origin })
    }
    if (!moveFocus) return

    // The workspace updates immediately while the stage travels. OS-only reduced
    // motion uses the same instant scroll behavior as the in-game preference.
    window.requestAnimationFrame(() => focusSiteCard(siteId, instant))
  }

  // How long portal emphasis holds on an actual return from a resolved room before
  // ordinary navigation resumes (~950ms). Reduced motion skips the hold entirely.
  const RETURN_EMPHASIS_MS = 950

  function clearReturnEmphasis() {
    if (returnEmphasisTimerRef.current !== null) {
      window.clearTimeout(returnEmphasisTimerRef.current)
      returnEmphasisTimerRef.current = null
    }
    setReturnEmphasisSiteId(null)
  }

  function returnToConcourse() {
    if (!scene.world) return
    transitionEpochRef.current += 1
    setPreviewActionId(null)
    setWorldPresentation({ kind: 'concourse' })
    // When the site the player is leaving carries a resolved room outcome, speak
    // its authored line once so the concourse alteration is perceivable non-visually.
    const outcome = resolvedOutcomes.get(selectedSiteId)
    setWorldLine(
      `${scene.world.caption.title} restored. ${scene.world.portals.length} locations available.${
        outcome ? ` ${outcome.portalLabel}.` : ''
      }`,
    )
    // Hold the altered portal's emphasis for a beat on an actual return from a
    // resolved room. Reduced motion lands immediately on the strong persistent
    // outcome — no timed hold.
    clearReturnEmphasis()
    if (outcome && !sceneMotionReduced) {
      const emphasisSite = selectedSiteId
      setReturnEmphasisSiteId(emphasisSite)
      returnEmphasisTimerRef.current = window.setTimeout(() => {
        returnEmphasisTimerRef.current = null
        setReturnEmphasisSiteId((current) => (current === emphasisSite ? null : current))
      }, RETURN_EMPHASIS_MS)
    }
    window.requestAnimationFrame(() => {
      document.getElementById(`site-switch-${selectedSiteId}`)?.focus({ preventScroll: true })
    })
  }

  return (
    <article className="phase-page investigation-page">
      <p className="sr-only" role="status" aria-live="polite">
        {refusalLine}
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {worldLine}
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
            className={worldViewClass}
            data-transition={presentationForRender.kind}
            ref={worldViewRef}
          >
            {/* The world is now the primary location picker. A hotspot swaps the
                adjacent workspace in place instead of sending the player down a
                long document. Canonical game state remains engine-owned. */}
            {scene.world ? (
              <AnnexWorldStage
                world={scene.world}
                sites={sites}
                completedSiteIds={state.completedSites}
                selectedSiteId={cameraSiteId}
                active={sceneActive}
                reducedMotion={sceneMotionReduced}
                alarmLevel={state.alarm}
                resolvedOutcomes={resolvedOutcomes}
                returnEmphasisSiteId={returnEmphasisSiteId ?? undefined}
                onPortalActivate={(siteId, sourceElement) =>
                  selectSite(siteId, true, sourceElement)
                }
              />
            ) : (
              <SceneStage
                scene={scene}
                sceneState={sceneState}
                reducedMotion={state.settings.reducedMotion}
                alarmLevel={state.alarm}
                interactive
                parallax={diorama}
                active={sceneActive}
                sites={sites}
                completedSiteIds={state.completedSites}
                selectedSiteId={cameraSiteId}
                onHotspotActivate={(siteId, sourceElement) =>
                  selectSite(siteId, true, sourceElement)
                }
              />
            )}
            {shownCloseup && (
              <SiteCloseupStage
                key={selectedSite.id}
                closeup={shownCloseup}
                entryOrigin={closeupEntryOrigin}
                actions={selectedActions}
                activeActionId={previewActionId}
                resolvedActionId={selectedCompletedAction?.id}
                roomStage={selectedSite.room ? (roomPresentation ?? undefined) : undefined}
                roomZones={selectedSite.room?.zones}
                acousticStage={
                  selectedSite.acousticShadow ? (acousticPresentation ?? undefined) : undefined
                }
                acousticZones={selectedSite.acousticShadow?.zones}
                acousticResolvedVariant={acousticResolvedVariant}
                acousticDepthAssets={selectedSite.acousticShadow?.depthAssets}
                custodyStage={
                  selectedSite.custodyRail && !selectedCompletedAction
                    ? (custodyPresentation ?? undefined)
                    : undefined
                }
                custodyDefinition={selectedSite.custodyRail}
                custodyPreviewVariant={custodyPreviewVariant}
                custodyResolvedVariant={custodyResolvedVariant}
                depthEnhancementEnabled={
                  presentationForRender.kind === 'closeup' &&
                  !sceneMotionReduced &&
                  !state.settings.highContrast
                }
                rainPresenceAssetEnabled={
                  presentationForRender.kind === 'closeup' &&
                  !sceneMotionReduced &&
                  !state.settings.highContrast &&
                  !osForcedColors
                }
              />
            )}
            {shownCloseup && scene.world && (
              <button className="world-return" type="button" onClick={returnToConcourse}>
                <span aria-hidden="true">←</span> Return to concourse
              </button>
            )}
            <div className="world-caption">
              <span>
                {shownCloseup
                  ? `${selectedSite.index} · ${selectedSite.name}`
                  : scene.world
                    ? scene.world.caption.title
                  : chrome.worldCaption[0]}
              </span>
              {shownCloseup ? (
                <span>{shownCloseup.caption}</span>
              ) : scene.world ? (
                <>
                  <span className="world-caption-spatial-static">Select a threshold</span>
                  <span className="world-caption-spatial-live">{scene.world.caption.detail}</span>
                </>
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
              // A filed room site shows its authored outcome label instead of the
              // generic "Filed"; every other site is unchanged.
              const outcome = resolvedOutcomes.get(site.id)
              return (
                <button
                  className="site-switch"
                  type="button"
                  key={site.id}
                  id={`site-switch-${site.id}`}
                  aria-pressed={selected}
                  data-site={site.id}
                  data-filed={filed ? 'true' : undefined}
                  onClick={(event) => selectSite(site.id, false, event.currentTarget)}
                >
                  <span className="site-switch-index">{site.index}</span>
                  <span>
                    <strong>{site.name}</strong>
                    <small>
                      {filed
                        ? outcome?.switcherLabel ?? 'Filed'
                        : selected && presentationForRender.kind === 'concourse'
                          ? 'Selected'
                          : selected
                            ? 'In view'
                            : 'Available'}
                    </small>
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
                      <button
                        type="button"
                        key={site.id}
                        onClick={(event) => selectSite(site.id, true, event.currentTarget)}
                      >
                        {site.index} · {site.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : selectedSite.room ? (
            // A site that authors a classification room presents it before the two
            // canonical methods unlock. Keyed by site so switching location resets
            // the view-local room. The methods still commit through the same path.
            <ClassificationRoom
              key={selectedSite.id}
              room={selectedSite.room}
              actions={selectedActions}
              onCommitAction={handleCommitAction}
              onPreviewChange={setPreviewActionId}
              onRoomPresentationChange={setRoomPresentation}
            />
          ) : selectedSite.acousticShadow ? (
            // A site that authors an acoustic-shadow room presents its route-planning
            // crossing before the two canonical methods unlock. Keyed by site so
            // switching location resets the view-local room. The methods still commit
            // through the same path.
            <AcousticShadowRoom
              key={selectedSite.id}
              room={selectedSite.acousticShadow}
              actions={selectedActions}
              onCommitAction={handleCommitAction}
              onPreviewChange={setPreviewActionId}
              onRoomPresentationChange={setAcousticPresentation}
            />
          ) : selectedSite.custodyRail ? (
            // Registry Intake presents a physical custody-rail handling ritual
            // before its two canonical methods unlock. Keying it by site makes
            // location switches reset the view-local work silently.
            <CustodyRailRoom
              key={selectedSite.id}
              room={selectedSite.custodyRail}
              actions={selectedActions}
              onCommitAction={handleCommitAction}
              onPreviewChange={setPreviewActionId}
              onRoomPresentationChange={setCustodyPresentation}
            />
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

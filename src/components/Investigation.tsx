import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { assembleBeats } from '../game/beats'
import {
  canEnterUnnumberedReadingRoom,
  getCaseContent,
  personaName,
  resolveFieldAction,
  unnumberedReadingRoom,
} from '../game/content'
import {
  canDiscoverSecret,
  canEnterTribunal,
  canOpenReconstruction,
  hasFieldSiteCapacity,
  hasDiscoveredSecret,
} from '../game/engine'
import {
  acousticStepLabel,
  classificationStepLabel,
  custodyStepLabel,
  fieldCta,
  type FieldCtaKind,
} from '../game/fieldCta'
import { resolveSiteOutcomes } from '../game/room'
import { BeatStage } from '../scene/BeatStage'
import { SceneStage } from '../scene/SceneStage'
import {
  SITE_CLOSEUP_ENTRY_MS,
  closeupFocusPoint,
  closeupStageStyle,
  derivedStageFocus,
} from '../scene/closeupGeometry'
import { SiteCloseupStage } from '../scene/SiteCloseupStage'
import { resolveCommitConsent, sceneStateFor, witnessesRefusalOnCommit } from '../scene/sceneState'
import { AnnexWorldStage } from '../world/AnnexWorldStage'
import { UnnumberedRoomStage } from '../world/UnnumberedRoomStage'
import type {
  AcousticShadowPlateState,
  AuthoritySignal,
  CustodyRailPlateState,
  DepositionChoiceId,
  FieldActionId,
  GameState,
  PersonaId,
  RoomPlateState,
  SceneAcousticTreatment,
  SecretId,
  SiteId,
} from '../game/types'
import { AcousticShadowRoom } from './AcousticShadowRoom'
import { CaseFileSummon } from './CaseFileDrawer'
import { ChoiceButton } from './ChoiceButton'
import {
  CinematicHud,
  type CinematicHudAction,
  type CinematicHudDialogue,
} from './CinematicHud'
import { ClassificationRoom } from './ClassificationRoom'
import { CustodyRailRoom } from './CustodyRailRoom'
import { Deposition } from './Deposition'
import { FourthMarginMarker } from './FourthMarginMarker'
import { PersonaPortrait } from './PersonaPortrait'
import { purposeCopy, showsFieldPurpose, showsSiteCost } from './purposeCopy'
import { ReactionQuotes } from './ReactionQuotes'
import { SceneDetailDrawer } from './SceneDetailDrawer'
import { SceneZone } from './SceneZone'
import type { RailTab } from './CaseRail'

interface InvestigationProps {
  state: GameState
  // Whether the summoned case file is open. Owned by App (the surface is
  // shell-wide) but summoned from the scene chrome here, so this component can
  // enforce the mutual exclusivity with the location-detail drawer: exactly one
  // aria-modal dialog is ever over the plate.
  caseFileOpen: boolean
  onCaseFileOpenChange: (open: boolean, initialTab?: RailTab) => void
  // The location-detail drawer portals outside the app shell, so its open state
  // is lifted to App with the other modal surfaces for a complete inert boundary.
  detailDrawerOpen?: boolean
  onDetailDrawerOpenChange?: (open: boolean) => void
  // Which deposition entry action, if any, has its transcript open. Lifted to App
  // so the ambient-audio scene state reads the same value (view-local otherwise).
  depositionEntry: FieldActionId | null
  onDepositionEntryChange: (entry: FieldActionId | null) => void
  // Reports presentation-only bounded-world acoustics to App's single audio
  // handle. It never dispatches or writes canonical/persisted game state.
  onAcousticTreatmentChange: (treatment: SceneAcousticTreatment | null) => void
  onCommitAction: (actionId: FieldActionId) => void
  onDiscoverSecret: (secretId: SecretId) => void
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

function focusSpatialGameplayControl(siteId: SiteId) {
  const target =
    document.querySelector<HTMLElement>('.room-console button:not([disabled])') ??
    document.querySelector<HTMLElement>('.scene-zones-live .choice-row') ??
    document.querySelector<HTMLElement>('.fourth-margin-marker') ??
    document.querySelector<HTMLElement>('[data-hud-primary="true"]') ??
    document.querySelector<HTMLElement>('.hud-prompt-actions button') ??
    document.querySelector<HTMLElement>(`.annex-world-portal[data-site="${siteId}"]`)
  target?.focus({ preventScroll: true })
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
const WITNESS_REFUSAL_LINE =
  'Ellis closes the packet. The raw recorder marks the requested use refused.'

// How long the witnessed-refusal beat holds the stage in view before handing focus
// to the filed card, so the refusal treatment has time to ramp. Reduced motion
// skips the hold entirely (instant jump + immediate handoff).
const WITNESS_HOLD_MS = 2500

// How long a scene-first room settles into its filed state before the staged
// reveal begins. Absolute, ported from the approved prototype. Reduced motion
// skips the settle entirely; the beat then waits for the player, never a clock.
const SCENE_BEAT_SETTLE_MS = 520

// The scene-first staged reveal, view-local and never persisted. 'settling' is
// the held breath after the commit has ALREADY dispatched, 'playing' stages the
// authored lines, 'done' holds the stanza under the result strip.
interface SceneBeatState {
  actionId: FieldActionId
  phase: 'settling' | 'playing' | 'done'
}

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

// ── The inspector collapse's width gate (E1b · audit P1-D) ───────────────────
// Below 841px the workspace stops being two columns at all — `styles.css`
// @media (max-width: 840px) turns `.field-workspace` into a stacked flex column
// — and a spine there would reclaim nothing while retiring prose. So the
// collapse is a WIDE-LAYOUT decision, and the DOM (not only the styling)
// follows the same breakpoint: at 375 the inspector renders exactly as it does
// today, which is what makes "no narrow-layout regression" provable rather than
// argued. The number is duplicated from the stylesheet because a media query is
// not readable from script; `evidence-inspector-collapse.mjs` asserts both sides
// of it at 1280 and 375, so a drift fails a harness instead of shipping.
const SIDE_BY_SIDE_WORKSPACE_QUERY = '(min-width: 841px)'

function sideBySideWorkspace() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(SIDE_BY_SIDE_WORKSPACE_QUERY).matches
  )
}

// The two standing prompts the inspector prints for a location that has not been
// filed. Named constants because the collapse hands whichever one applies to the
// Location detail drawer, and a copy that drifted between the two homes would
// print two different sentences for one fact.
const SCENE_FIRST_METHOD_PROMPT = 'Choose one method in the room. This location then closes.'
const INSPECTOR_METHOD_PROMPT = 'Choose one method. This location then closes.'

export function Investigation({
  state,
  caseFileOpen,
  onCaseFileOpenChange,
  detailDrawerOpen = false,
  onDetailDrawerOpenChange = () => undefined,
  depositionEntry,
  onDepositionEntryChange,
  onAcousticTreatmentChange,
  onCommitAction,
  onDiscoverSecret,
  onCommitDeposition,
  onOpenReconstruction,
  onEnterTribunal,
}: InvestigationProps) {
  const content = getCaseContent(state.caseId)
  const {
    caseFile,
    approaches,
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
  const [sideBySide, setSideBySide] = useState(sideBySideWorkspace)
  const [worldPresentation, setWorldPresentation] = useState<WorldPresentation>(() =>
    scene.world
      ? { kind: 'concourse' }
      : initialSite.closeup
      ? { kind: 'closeup', siteId: initialSite.id, origin: { x: 0.5, y: 0.5 } }
      : { kind: 'map' },
  )
  const [previewActionId, setPreviewActionId] = useState<FieldActionId | null>(null)
  // The scene method's final-review state is deliberately view-local. It lets
  // the zone and the HUD describe one pending commit without adding a new engine
  // transition or persisting a provisional decision.
  const [armedSceneActionId, setArmedSceneActionId] = useState<FieldActionId | null>(null)
  // Keep the actual method control that opened the HUD review. This is not a
  // general focus stack: it exists only for the one controlled scene filing
  // dismissal that otherwise loses its focused HUD button when that action
  // unmounts.
  const armedSceneMethodRef = useRef<{
    actionId: FieldActionId
    element: HTMLButtonElement
  } | null>(null)
  const sceneFocusRestoreRequestedRef = useRef(false)
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
  // The scene-first pilot's staged reveal and its summonable detail drawer. Both
  // are view-local: nothing here is dispatched, saved, or read by the engine, and
  // a reload mid-beat simply resumes at the already-filed record.
  const [sceneBeat, setSceneBeat] = useState<SceneBeatState | null>(null)
  // Canonical discovery is reducer-owned; this only remembers which retained
  // mark currently occupies the inline cinematic dialogue.
  const [activeSecretId, setActiveSecretId] = useState<SecretId | null>(null)
  // Reader Key 04 is canonical; the room it opens is intentionally not. Entry,
  // point order, object handling, and held lamps remain presentation-local so
  // this detour can add story without becoming evidence, a reward checklist, or
  // run history.
  const [unnumberedRoomOpen, setUnnumberedRoomOpen] = useState(false)
  const [activeReadingPointId, setActiveReadingPointId] = useState<string | null>(null)
  const [openedReadingPointIds, setOpenedReadingPointIds] = useState<string[]>([])
  const [activeReadingInteraction, setActiveReadingInteraction] = useState<{
    pointId: string
    interactionId: string
  } | null>(null)
  const unnumberedEntryRef = useRef<HTMLButtonElement | null>(null)
  const sceneResultRef = useRef<HTMLButtonElement>(null)
  // The bounded room's console lives in ONE stable React position and is portalled
  // into a host node this component owns. The host is then physically moved between
  // the inspector slot and the dock over the plate, so the ritual can change WHERE
  // it renders without the room's view-local reducer ever remounting (returning to
  // the concourse mid-ritual must not silently reset the work).
  const [roomConsoleHost] = useState<HTMLDivElement | null>(() => {
    if (typeof document === 'undefined') return null
    const host = document.createElement('div')
    host.className = 'room-console-host'
    return host
  })
  const roomDockRef = useRef<HTMLDivElement>(null)
  const roomSlotRef = useRef<HTMLDivElement>(null)
  // One-shot return-to-concourse emphasis: the site just left, held for a beat so
  // its altered portal is unmissable, then cleared to restore ordinary navigation.
  const [returnEmphasisSiteId, setReturnEmphasisSiteId] = useState<SiteId | null>(null)
  const returnEmphasisTimerRef = useRef<number | null>(null)

  // Resolved concourse alteration per room site, derived from the committed field
  // actions and each site's authored worldOutcome map. Content-driven: no site or
  // action id is named here. Consumed by the world stage, the switcher chips, and
  // the return announcement.
  const resolvedOutcomes = resolveSiteOutcomes(sites, state.completedActions)
  const authorityConfig = scene.world?.authoritySignal
  const authoritySignal: AuthoritySignal = authorityConfig
    ? state.completedActions.includes(authorityConfig.forgedActionId)
      ? 'forged'
      : authorityConfig.linkedActionIds.every((actionId) =>
            state.completedActions.includes(actionId),
          )
        ? 'linked'
        : 'none'
    : 'none'
  const unnumberedRoomUnlocked = Boolean(
    scene.world && canEnterUnnumberedReadingRoom(state),
  )

  // The live stage wrapper, so both the open-transcript reveal and the witnessed-
  // refusal beat can bring the reacting room into view behind / after the modal.
  const worldViewRef = useRef<HTMLDivElement>(null)
  // Reveal the workspace of the site just selected. On a scene-first location the
  // methods live IN the close read, so scrolling the inspector card to centre —
  // which pushes the plate off the top of a narrow viewport — would hide the only
  // controls. Those sites bring the stage into view instead and hand focus to the
  // (still canonical, still always-mounted) site card without a second scroll.
  function revealSiteWorkspace(siteId: SiteId, instant: boolean, sceneFirst: boolean) {
    if (scene.world) {
      focusSpatialGameplayControl(siteId)
      return
    }
    if (!sceneFirst) {
      focusSiteCard(siteId, instant)
      return
    }
    // Centred, not 'start': the narrow layout stacks a sticky case-file bar above
    // the workspace, and aligning the plate's top to the scroll port slides it
    // under that bar. Centring a short plate clears both the header and the
    // switcher below it.
    worldViewRef.current?.scrollIntoView({
      behavior: instant ? 'auto' : 'smooth',
      block: 'center',
    })
    document.getElementById(`site-card-${siteId}`)?.focus({ preventScroll: true })
  }
  const siteInspectorRef = useRef<HTMLElement>(null)
  const pendingSpatialFocusRef = useRef<SiteId | null>(null)

  function focusFiledContext(siteId: SiteId = selectedSiteId) {
    if (scene.world) {
      focusSpatialGameplayControl(siteId)
      return
    }
    siteInspectorRef.current?.scrollTo({ top: 0, behavior: 'auto' })
    siteInspectorRef.current?.focus({ preventScroll: true })
  }

  const holdTimerRef = useRef<number | null>(null)
  const transitionEpochRef = useRef(0)
  const selectedSiteRef = useRef(selectedSiteId)
  // The one-shot witnessed-refusal announcement (aria-live). Set only from a commit
  // callback; empty at rest, so a reload of a persisted refusal never re-announces.
  const [refusalLine, setRefusalLine] = useState('')
  const [worldLine, setWorldLine] = useState('')

  const sceneMotionReduced = reducedMotion || osReducedMotion
  const activeReadingPoint = unnumberedReadingRoom.readingPoints.find(
    (point) => point.id === activeReadingPointId,
  )
  const activeReadingInteractionDefinition =
    activeReadingPoint &&
    activeReadingInteraction?.pointId === activeReadingPoint.id
      ? activeReadingPoint.interactions.find(
          (interaction) => interaction.id === activeReadingInteraction.interactionId,
        )
      : undefined

  function enterUnnumberedRoom(sourceButton: HTMLButtonElement) {
    if (!unnumberedRoomUnlocked || worldPresentation.kind !== 'concourse') return
    unnumberedEntryRef.current = sourceButton
    onCaseFileOpenChange(false)
    onDetailDrawerOpenChange(false)
    onDepositionEntryChange(null)
    setPreviewActionId(null)
    clearSceneFirstConfirmation(false)
    setActiveSecretId(null)
    setActiveReadingPointId(null)
    setOpenedReadingPointIds([])
    setActiveReadingInteraction(null)
    setUnnumberedRoomOpen(true)
    setWorldLine(unnumberedReadingRoom.transitionIn.join(' '))
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>('.unnumbered-room-point')
        ?.focus({ preventScroll: true })
    })
  }

  function exitUnnumberedRoom() {
    if (!unnumberedRoomOpen) return
    setUnnumberedRoomOpen(false)
    setActiveReadingPointId(null)
    setActiveReadingInteraction(null)
    setWorldLine(unnumberedReadingRoom.exit.transition)
    window.requestAnimationFrame(() => {
      const restoredEntry =
        document.querySelector<HTMLButtonElement>('.annex-world-secret-room') ??
        unnumberedEntryRef.current
      restoredEntry?.focus({ preventScroll: true })
      unnumberedEntryRef.current = restoredEntry
    })
  }

  function inspectReadingPoint(pointId: string) {
    if (!unnumberedRoomOpen) return
    const point = unnumberedReadingRoom.readingPoints.find(
      (candidate) => candidate.id === pointId,
    )
    if (!point) return
    setActiveReadingPointId(point.id)
    setActiveReadingInteraction(null)
    const alreadyOpened = openedReadingPointIds.includes(point.id)
    const nextCount = alreadyOpened
      ? openedReadingPointIds.length
      : openedReadingPointIds.length + 1
    const fullReading = [
      `${point.title}.`,
      point.inspection,
      point.machineMarking ? `${point.machineMarking}.` : undefined,
      point.draftingPrompt,
      point.archivistNote,
    ]
      .filter(Boolean)
      .join(' ')
    setWorldLine(
      nextCount === unnumberedReadingRoom.readingPoints.length
        ? `${fullReading} ${unnumberedReadingRoom.completion.accessible}`
        : fullReading,
    )
    if (!alreadyOpened) {
      setOpenedReadingPointIds((current) =>
        current.includes(point.id) ? current : [...current, point.id],
      )
    }
  }

  function performReadingInteraction(pointId: string, interactionId: string) {
    const point = unnumberedReadingRoom.readingPoints.find(
      (candidate) => candidate.id === pointId,
    )
    const interaction = point?.interactions.find(
      (candidate) => candidate.id === interactionId,
    )
    if (!point || !interaction || !unnumberedRoomOpen) return
    setActiveReadingPointId(point.id)
    setActiveReadingInteraction({ pointId, interactionId })
    setWorldLine(
      `${point.title}. ${interaction.response} ${point.archivistNote}`,
    )
  }

  // The optional level is a route, not a modal, but Escape still provides the
  // expected game-world way back. A summoned document owns Escape while open.
  useEffect(() => {
    if (
      !unnumberedRoomOpen ||
      caseFileOpen ||
      detailDrawerOpen ||
      depositionEntry ||
      sceneBeat
    ) {
      return
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      exitUnnumberedRoom()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  })

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

  // The workspace's own breakpoint, kept live: a resize across it must re-expand
  // the inspector rather than leaving a spine on a stacked column.
  useEffect(() => {
    const query = window.matchMedia(SIDE_BY_SIDE_WORKSPACE_QUERY)
    const onChange = (event: MediaQueryListEvent) => setSideBySide(event.matches)
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

  // The scene-first settle: the room holds its filed state for a breath before the
  // first line arrives. The commit has already been dispatched by the time this
  // runs — this timer only paces a reveal, and cancelling it loses no record.
  const sceneBeatPhase = sceneBeat?.phase
  useEffect(() => {
    if (sceneBeatPhase !== 'settling') return
    const timer = window.setTimeout(
      () => {
        setSceneBeat((current) =>
          current && current.phase === 'settling' ? { ...current, phase: 'playing' } : current,
        )
      },
      sceneMotionReduced ? 0 : SCENE_BEAT_SETTLE_MS,
    )
    return () => window.clearTimeout(timer)
  }, [sceneBeatPhase, sceneMotionReduced])

  // When the stanza settles, the beat's own advance control unmounts. Hand the
  // keyboard route straight to the result strip so the chain zone → beat →
  // record never drops focus to <body>.
  useEffect(() => {
    if (sceneBeatPhase !== 'done') return
    const frame = window.requestAnimationFrame(() => {
      sceneResultRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [sceneBeatPhase])

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
      focusFiledContext(siteId)
      return
    }
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current)
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null
      focusFiledContext(siteId)
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
    const consent = resolveCommitConsent(deposition, actionId, beats, askedConsent)
    if (!witnessesRefusalOnCommit(consent)) {
      window.requestAnimationFrame(() => {
        focusFiledContext()
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
      focusFiledContext()
    })
  }

  function inspectFourthMargin() {
    if (!selectedSiteSecret) return
    setActiveSecretId(selectedSiteSecret.id)
    if (!selectedSiteSecretDiscovered) {
      onDiscoverSecret(selectedSiteSecret.id)
    }
  }

  // The scene-first commit. The dispatch fires FIRST and unconditionally; the
  // staged reveal is set afterwards, over already-updated state. If the beat were
  // ever to fail to mount, the event log, evidence, and trust are already written
  // exactly as the inspector's method list writes them.
  function handleSceneFirstCommit(actionId: FieldActionId) {
    clearSceneFirstConfirmation(false)
    setPreviewActionId(null)
    onCommitAction(actionId)
    setSceneBeat({ actionId, phase: 'settling' })
  }

  // Dismiss the result strip and hand the keyboard route to the filed record, the
  // same landing the inspector method list has always used after a commit.
  function dismissSceneBeat() {
    setSceneBeat(null)
    window.requestAnimationFrame(() => {
      focusFiledContext()
    })
  }

  // MUTUAL EXCLUSIVITY, enforced in code rather than trusted to the player's
  // route: the two summons are the only two aria-modal dialogs this surface can
  // raise, and opening either closes the other. Two live focus traps over one
  // plate is the hazard the tabbed case file was designed to remove; this is the
  // second belt. Asserted live in the step-G harness with
  // document.querySelectorAll('[aria-modal="true"]').length === 1.
  function openDetailDrawer() {
    onCaseFileOpenChange(false)
    onDetailDrawerOpenChange(true)
  }

  function openCaseFile(initialTab: RailTab = 'case') {
    onDetailDrawerOpenChange(false)
    onCaseFileOpenChange(true, initialTab)
  }

  function handleAbandonDeposition() {
    onDepositionEntryChange(null)
    // The portalled dialog unmounts immediately. Return keyboard users to the
    // location workspace instead of letting focus fall through to <body>.
    window.requestAnimationFrame(() => {
      focusFiledContext()
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
  const sitesNeeded = Math.max(0, content.fieldSiteLimit - state.completedSites.length)
  const gateRequirements = [
    sitesNeeded > 0
      ? `Complete ${sitesNeeded} more field site${sitesNeeded === 1 ? '' : 's'}.`
      : null,
    !reconstruction ? 'File one memory reconstruction.' : null,
  ].filter((requirement): requirement is string => requirement !== null)
  const gateRequirement = gateRequirements.join(' ')
  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? sites[0]!
  // The approach may point the player toward one authored threshold before the
  // first filing, but it is never selection state. In particular, this does not
  // initialize selectedSiteId or feed the camera's selectedSiteId input.
  const openingApproach = state.primaryApproach
    ? approaches.find((approach) => approach.id === state.primaryApproach)
    : undefined
  const recommendedSite =
    state.completedSites.length === 0 && openingApproach
      ? sites.find(
          (site) =>
            site.id === openingApproach.suggestedSiteId &&
            !state.completedSites.includes(site.id),
        )
      : undefined
  const presentationForRender: WorldPresentation =
    sceneMotionReduced &&
    (worldPresentation.kind === 'travel' || worldPresentation.kind === 'arriving')
      ? {
          kind: 'closeup',
          siteId: worldPresentation.siteId,
          origin: worldPresentation.origin,
        }
      : worldPresentation
  const acousticTreatment = unnumberedRoomOpen
    ? activeReadingPoint?.acoustics ?? unnumberedReadingRoom.acoustics
    : scene.world
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
  const effectiveAcoustic = unnumberedRoomOpen
    ? acousticTreatment
    : acousticRoomTreatment ?? acousticTreatment

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
    !unnumberedRoomOpen &&
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
  const selectedCompletedBase = fieldActions.find(
    (action) =>
      action.siteId === selectedSite.id && state.completedActions.includes(action.id),
  )
  const selectedCompletedAction = selectedCompletedBase
    ? resolveFieldAction(content, selectedCompletedBase.id, state.precedents)
    : undefined
  const fieldFilingClosed = !selectedCompletedAction && !hasFieldSiteCapacity(state)
  const filedSiteCount = Math.min(state.completedSites.length, content.fieldSiteLimit)
  const omittedSiteCount = Math.max(0, sites.length - state.completedSites.length)
  const filingBudgetNote = `${omittedSiteCount} site${omittedSiteCount === 1 ? '' : 's'} omitted from the filed record. The location remains available to inspect.`
  const selectedActions = selectedSite.actionIds
    .map((actionId) => resolveFieldAction(content, actionId, state.precedents))
    .filter((action): action is NonNullable<typeof action> => Boolean(action))
  const selectedSiteSecret = content.secrets?.find(
    (secret) => secret.siteId === selectedSite.id,
  )
  const selectedSiteSecretDiscovered = selectedSiteSecret
    ? hasDiscoveredSecret(state, selectedSiteSecret.id)
    : false
  const selectedSiteSecretAvailable = selectedSiteSecret
    ? canDiscoverSecret(state, selectedSiteSecret.id)
    : false
  const activeSecret =
    activeSecretId === selectedSiteSecret?.id ? selectedSiteSecret : undefined
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

  // The close-read plate's room inputs, hoisted so the decorative figure and the
  // live zone layer are driven from ONE set of values (see derivedStageFocus).
  const plateRoomStage = selectedSite.room ? (roomPresentation ?? undefined) : undefined
  const plateAcousticStage = selectedSite.acousticShadow
    ? (acousticPresentation ?? undefined)
    : undefined
  const plateCustodyStage =
    selectedSite.custodyRail && !selectedCompletedAction
      ? (custodyPresentation ?? undefined)
      : undefined

  // The site inspector is always mounted, so the methods aren't gated behind a
  // separate "enter the site" step — they're gated behind the close-read ritual, or
  // shown at once on a plain method site. True once the room reaches its terminal
  // (methods-revealed) phase, or immediately for a plain site; a filed site is past
  // this entirely.
  const roomMethodsRevealed = selectedSite.custodyRail
    ? custodyPresentation?.phase === 'methods'
    : selectedSite.room
      ? roomPresentation?.phase === 'unlocked'
      : selectedSite.acousticShadow
        ? acousticPresentation?.phase === 'route-ready'
        : true
  // This location authors a bounded room ritual that runs before its methods.
  const roomSite = Boolean(
    selectedSite.room || selectedSite.acousticShadow || selectedSite.custodyRail,
  )

  // ── The scene-first seam ────────────────────────────────────────────────────
  // A location opts in through content (`closeup.sceneFirst`) and qualifies once it
  // is offering its methods: immediately on a plain site, and on a room site only
  // after the ritual has reached its terminal phase (or is already filed, which is
  // past the ritual entirely). No component names a site or an action id; a site
  // that does not opt in renders exactly as before.
  const sceneFirstSite = Boolean(
    selectedSite.closeup?.sceneFirst &&
      (selectedSite.closeup?.zones?.length ?? 0) > 0 &&
      (roomMethodsRevealed || selectedCompletedAction),
  )
  // The close read is up (entering or settled): the inspector hands its method
  // list to the scene, and the scene owns the detail summon, beat, and result.
  const sceneFirstPlate = sceneFirstSite && Boolean(shownCloseup)
  // The live buttons only mount on the SETTLED plate, so nothing is clickable over
  // an opening aperture and the two controls never overlap during the entry.
  const sceneFirstZonesLive =
    sceneFirstPlate &&
    presentationForRender.kind === 'closeup' &&
    !selectedCompletedAction &&
    !fieldFilingClosed
  const armedSceneAction =
    armedSceneActionId && sceneFirstZonesLive
      ? selectedActions.find((action) => action.id === armedSceneActionId)
      : undefined
  const sceneFirstConfirmationActive = Boolean(armedSceneAction)

  function armSceneFirstMethod(actionId: FieldActionId) {
    const active = document.activeElement
    const focusedSceneMethod =
      active instanceof HTMLButtonElement && active.closest('.scene-zones-live') ? active : null
    const zoneIndex = shownCloseup?.zones?.findIndex((zone) => zone.actionId === actionId) ?? -1
    const fallbackSceneMethod =
      zoneIndex >= 0
        ? document.querySelectorAll<HTMLButtonElement>('.scene-zones-live .choice-row')[zoneIndex] ??
          null
        : null
    const element = focusedSceneMethod ?? fallbackSceneMethod

    armedSceneMethodRef.current = element ? { actionId, element } : null
    sceneFocusRestoreRequestedRef.current = false
    setArmedSceneActionId(actionId)
  }

  function clearSceneFirstConfirmation(restoreFocus: boolean) {
    const armedMethod = armedSceneMethodRef.current
    sceneFocusRestoreRequestedRef.current = Boolean(
      restoreFocus && armedSceneActionId && armedMethod?.actionId === armedSceneActionId,
    )
    if (!sceneFocusRestoreRequestedRef.current) armedSceneMethodRef.current = null
    setArmedSceneActionId(null)
  }

  // HUD actions unmount in the same React commit that clears the review. A layout
  // effect runs after that DOM update, so Cancel and Escape can return to the
  // original scene method rather than briefly falling through to <body>.
  useLayoutEffect(() => {
    if (armedSceneActionId !== null || !sceneFocusRestoreRequestedRef.current) return
    sceneFocusRestoreRequestedRef.current = false
    const armedMethod = armedSceneMethodRef.current
    armedSceneMethodRef.current = null
    if (!armedMethod?.element.isConnected) return
    armedMethod.element.focus({ preventScroll: true })
  }, [armedSceneActionId])

  // The room's console docks OVER the plate while the settled close read is on
  // screen and the ritual is still running. The moment the methods unlock the
  // console yields the plate to the two zones and returns to the inspector, and
  // whenever the close read is not on screen it is in the inspector as before —
  // the canonical controls are never gated behind entering a view.
  const roomConsoleDocked =
    roomSite &&
    !selectedCompletedAction &&
    !fieldFilingClosed &&
    !roomMethodsRevealed &&
    presentationForRender.kind === 'closeup' &&
    presentationMatchesSelection
  const fourthMarginMarkerLive = Boolean(
    selectedSiteSecret &&
      shownCloseup &&
      selectedCompletedAction &&
      presentationForRender.kind === 'closeup' &&
      !sceneBeat &&
      !roomConsoleDocked &&
      !depositionEntry &&
      !caseFileOpen &&
      !detailDrawerOpen &&
      (selectedSiteSecretDiscovered || selectedSiteSecretAvailable),
  )
  // ── THE INSPECTOR COLLAPSE (E1b · audit P1-D) ──────────────────────────────
  // The audit measured the inspector at 434×546 carrying two sentences and ~450px
  // of nothing while the plate was squeezed to a letterbox strip. This is the
  // phase gate that removes exactly that emptiness, and nothing else.
  //
  // TRUE only where the column has genuinely run out of work: a wide (two-column)
  // workspace, the settled close read on screen, and the PLATE carrying the
  // interaction — either the room's console docked over it, or the two methods
  // standing as the plate's own zones. Three states are deliberately excluded
  // because the column is not empty in them:
  //
  //   · a FILED location — the resolved card, its record delta and the reaction
  //     quotes are the inspector's real content, not chrome;
  //   · a ROOM location at its terminal phase — the console has come back to the
  //     inspector slot and is printing the room's authored unlock line, so the
  //     column holds authored prose that no other surface carries;
  //   · every stacked width — a spine there would retire prose and reclaim
  //     nothing (see SIDE_BY_SIDE_WORKSPACE_QUERY).
  //
  // What the spine keeps is fixed by `spineKeeps()` in `game/siteRecordText.ts`;
  // what it retires is proved to be carried, string-for-string, by the Location
  // detail drawer in the same module's `equivalenceGaps()`. Nothing is hidden —
  // the prose has a proven second home before this flag can ever be true.
  const inspectorSpine =
    sideBySide &&
    !selectedCompletedAction &&
    !fieldFilingClosed &&
    (roomConsoleDocked || (sceneFirstPlate && !roomSite))
  // ONE summon to the full text, never two: the plate's chrome carries it
  // wherever the plate is already hosting the methods, and the spine carries it
  // in the phase where the plate is not (the docked-console ritual, which has no
  // summon rail entry today). Same class, same handler, so every existing
  // selector, style and assertion still finds exactly one control.
  const spineCarriesDetailSummon = inspectorSpine && !sceneFirstPlate
  // The one standing line the collapsed inspector would have printed for this
  // phase, handed to the drawer so it is relocated rather than dropped. Exactly
  // one instance exists at any moment: the inspector prints it when expanded, the
  // drawer when the spine is up.
  const spineStandingNote = !inspectorSpine
    ? undefined
    : roomSite
      ? showsSiteCost(state)
        ? purposeCopy.siteCost
        : undefined
      : SCENE_FIRST_METHOD_PROMPT
  const sceneFirstEmphasisId = selectedCompletedAction?.id ?? previewActionId
  const sceneFirstDerivedFocus = derivedStageFocus({
    roomStage: plateRoomStage,
    roomZones: selectedSite.room?.zones,
    acousticStage: plateAcousticStage,
    acousticZones: selectedSite.acousticShadow?.zones,
    custodyStage: plateCustodyStage,
    custodyDefinition: selectedSite.custodyRail,
  })
  const sceneFirstEmphasisZone = sceneFirstEmphasisId
    ? shownCloseup?.zones?.find((zone) => zone.actionId === sceneFirstEmphasisId)
    : undefined
  const sceneFirstFocus = shownCloseup
    ? closeupFocusPoint(shownCloseup, sceneFirstEmphasisId, sceneFirstDerivedFocus)
    : { x: 0.5, y: 0.5 }
  // True while an in-scene caption or the staged reveal is speaking for the plate.
  const sceneQuietCaption = Boolean(
    sceneBeat ||
      (previewActionId &&
        selectedSite.closeup?.sceneFirst &&
        presentationForRender.kind === 'closeup'),
  )
  const worldViewClass = [
    'world-view',
    scene.world ? 'world-view--spatial' : '',
    unnumberedRoomOpen ? 'world-view--unnumbered-room' : '',
    presentationForRender.kind === 'concourse' ? 'world-view--concourse' : '',
    shownCloseup ? 'world-view--closeup' : '',
    presentationForRender.kind === 'travel' ? 'world-view--traveling' : '',
    presentationForRender.kind === 'arriving' ? 'world-view--arriving' : '',
    // While a zone caption or a staged reveal owns the plate, the standing plate
    // caption stands down — as the approved prototype's rest caption does. On a
    // short plate the two otherwise print over each other.
    sceneBeat ? 'world-view--scene-beat' : '',
    sceneQuietCaption ? 'world-view--scene-quiet' : '',
    sceneFirstConfirmationActive ? 'world-view--scene-confirmation' : '',
    // The docked room console needs a taller plate box on the narrow layout.
    roomConsoleDocked ? 'world-view--room-console' : '',
  ]
    .filter(Boolean)
    .join(' ')
  // Assembled fresh each render on purpose: BeatStage's reveal clock keys off
  // primitive line data, so a new array identity can never reset a line mid-hold.
  const sceneBeatAction = sceneBeat
    ? resolveFieldAction(content, sceneBeat.actionId, state.precedents)
    : undefined
  const sceneBeatLines = sceneBeatAction ? assembleBeats(sceneBeatAction) : []
  const sceneStandingEntries = Object.entries(selectedCompletedAction?.trust ?? {}).filter(
    ([, delta]) => delta !== 0,
  )

  const methodsVisible = !selectedCompletedAction && (roomMethodsRevealed || fieldFilingClosed)
  // The in-voice name of the room's current step while mid-ritual, so the footer
  // CTA can point at what the room is actually asking for (never "Choose a method"
  // while the ritual defers it). Null on a plain or terminal-phase site.
  const ritualStepLabel = selectedSite.custodyRail
    ? custodyPresentation
      ? custodyStepLabel(custodyPresentation.phase)
      : null
    : selectedSite.room
      ? roomPresentation
        ? classificationStepLabel(roomPresentation.phase)
        : null
      : selectedSite.acousticShadow
        ? acousticPresentation
          ? acousticStepLabel(acousticPresentation.phase)
          : null
        : null

  // Move the room console's host node between the inspector slot and the dock over
  // the plate. This is a DOM re-parent, never a React remount: the portal's
  // container is the same node throughout, so the room's view-local reducer (the
  // whole ritual so far) survives the move. Focus is carried across explicitly —
  // re-parenting a subtree drops the active element to <body> otherwise.
  useLayoutEffect(() => {
    if (!roomConsoleHost) return
    const target = roomConsoleDocked ? roomDockRef.current : roomSlotRef.current
    if (!target || roomConsoleHost.parentElement === target) return
    const active = document.activeElement as HTMLElement | null
    const carried = active && roomConsoleHost.contains(active) ? active : null
    target.appendChild(roomConsoleHost)
    carried?.focus({ preventScroll: true })
  })

  // A portal activated by keyboard remains the focus owner while the camera
  // travels, then hands focus to the first real control in the settled room.
  // The handoff is view-local and never participates in case progression.
  useLayoutEffect(() => {
    if (
      !scene.world ||
      presentationForRender.kind !== 'closeup' ||
      pendingSpatialFocusRef.current !== selectedSite.id ||
      caseFileOpen ||
      detailDrawerOpen ||
      Boolean(depositionEntry) ||
      Boolean(sceneBeat)
    ) {
      return
    }
    pendingSpatialFocusRef.current = null
    const frame = window.requestAnimationFrame(() => {
      focusSpatialGameplayControl(selectedSite.id)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [
    caseFileOpen,
    depositionEntry,
    detailDrawerOpen,
    presentationForRender.kind,
    scene.world,
    sceneBeat,
    selectedSite.id,
  ])

  // When the ritual unlocks WHILE the console is docked, the terminal choice moves
  // from the console to the plate zones in the same commit. The room's own focus
  // chain cannot reach those zones (they live outside it), so the workspace hands
  // the keyboard route to the first zone here. Only on the unlock transition: an
  // ordinary arrival at an already-terminal site keeps landing on the site card.
  const previousRoomRevealedRef = useRef(roomMethodsRevealed)
  useLayoutEffect(() => {
    const wasRevealed = previousRoomRevealedRef.current
    previousRoomRevealedRef.current = roomMethodsRevealed
    if (!roomSite || wasRevealed || !roomMethodsRevealed || !sceneFirstZonesLive) return
    const zone = document.querySelector<HTMLElement>('.scene-zones-live .choice-row')
    zone?.focus({ preventScroll: true })
  }, [roomMethodsRevealed, roomSite, sceneFirstZonesLive])

  const cta = fieldCta({
    tribunalReady,
    reconstructionFiled: Boolean(reconstruction),
    canOpenReconstruction: canOpenReconstruction(state),
    methodsVisible,
    ritualStepLabel,
  })

  function runCta(kind: FieldCtaKind) {
    switch (kind) {
      case 'tribunal':
        onEnterTribunal()
        return
      case 'reconstruction':
        onOpenReconstruction()
        return
      case 'next-site': {
        const nextSite = openSites.find((site) => site.id === selectedSite.id) ?? openSites[0]
        if (nextSite) selectSite(nextSite.id, true)
        return
      }
      case 'ritual-step':
        // Bring the live room control into view and hand it focus — the honest
        // delivery of "do the step named," not a promise the click can't keep.
        // While the console is docked over the plate that control is IN the scene,
        // so the CTA follows it there instead of pointing at an inspector that no
        // longer holds it.
        window.requestAnimationFrame(() => {
          const dock = roomDockRef.current
          if (dock) {
            worldViewRef.current?.scrollIntoView({
              behavior: reducedMotion ? 'auto' : 'smooth',
              block: 'center',
            })
            dock.querySelector<HTMLElement>('button:not([disabled])')?.focus({
              preventScroll: true,
            })
            return
          }
          if (scene.world) {
            focusSpatialGameplayControl(selectedSite.id)
            return
          }
          siteInspectorRef.current?.scrollIntoView({
            behavior: reducedMotion ? 'auto' : 'smooth',
            block: 'center',
          })
          siteInspectorRef.current?.focus({ preventScroll: true })
        })
        return
    }
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
    clearSceneFirstConfirmation(false)
    setPreviewActionId(null)
    setActiveSecretId(null)
    // The staged reveal and its drawer belong to the location being left.
    setSceneBeat(null)
    onDetailDrawerOpenChange(false)
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
    const target = sites.find((site) => site.id === siteId)
    // Does this location perform IN the close read — either its methods as plate
    // zones, or (on a room site) its ritual console docked over the plate? Both
    // want the STAGE brought into view rather than the inspector card, which on a
    // narrow viewport would push the only controls off the top.
    const targetIsSceneFirst = Boolean(
      target?.closeup?.sceneFirst && (target.closeup.zones?.length ?? 0) > 0,
    )
    if (selectedSiteId === siteId && alreadyPresentingSite) {
      if (moveFocus) {
        window.requestAnimationFrame(() =>
          revealSiteWorkspace(
            siteId,
            reducedMotion || prefersReducedMotion(),
            targetIsSceneFirst,
          ),
        )
      }
      return
    }

    const targetSite = target
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
    if (scene.world) {
      pendingSpatialFocusRef.current = siteId
      return
    }

    // The workspace updates immediately while the stage travels. OS-only reduced
    // motion uses the same instant scroll behavior as the in-game preference.
    window.requestAnimationFrame(() => revealSiteWorkspace(siteId, instant, targetIsSceneFirst))
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
    clearSceneFirstConfirmation(false)
    setPreviewActionId(null)
    setActiveSecretId(null)
    setSceneBeat(null)
    onDetailDrawerOpenChange(false)
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
      const returnTarget = scene.world
        ? document.querySelector<HTMLElement>(
            `.annex-world-portal[data-site="${selectedSiteId}"]`,
          )
        : document.getElementById(`site-switch-${selectedSiteId}`)
      returnTarget?.focus({ preventScroll: true })
    })
  }

  const hudEvidenceCount = evidenceDefinitions.filter((item) =>
    state.evidence.includes(item.id),
  ).length
  // Each filed site admits one mutually-exclusive field exhibit. The lattice
  // contributes at most one reconstruction exhibit, regardless of how many
  // authored alternatives it offers. This is a reachable capacity, unlike the
  // full definition count (which includes mutually-exclusive outcomes).
  const hudEvidenceCapacity =
    sites.length + (reconstructionDefinitions.length > 0 ? 1 : 0)
  const hudTransitioning =
    presentationForRender.kind === 'travel' || presentationForRender.kind === 'arriving'
  const worldHubName =
    scene.world?.kind === 'deposition-annex' ? 'deposition annex' : 'concourse'
  const returnToWorldLabel = `Return to ${worldHubName}`
  const freshConcourseRecommendation =
    presentationForRender.kind === 'concourse' && openingApproach && recommendedSite
      ? { approach: openingApproach, site: recommendedSite }
      : undefined

  let hudObjective = `Select a threshold in the ${worldHubName} and enter one field location.`
  if (sceneFirstConfirmationActive && armedSceneAction) {
    hudObjective = `Review ${armedSceneAction.title}. Filing this method is final for this run.`
  } else if (unnumberedRoomOpen) {
    hudObjective = unnumberedReadingRoom.hudObjective
  } else if (activeSecret) {
    hudObjective = 'Read the irregular mark. It will be held beside the record, not entered as evidence.'
  } else if (sceneBeat) {
    hudObjective = 'Hold the record while the consequence settles.'
  } else if (hudTransitioning) {
    hudObjective = `Entering ${selectedSite.name}.`
  } else if (shownCloseup && selectedCompletedAction) {
    hudObjective = cta?.label ?? `Review the filed result, then ${returnToWorldLabel.toLowerCase()}.`
  } else if (fieldFilingClosed) {
    hudObjective = filingBudgetNote
  } else if (shownCloseup && ritualStepLabel) {
    hudObjective = ritualStepLabel
  } else if (shownCloseup && methodsVisible) {
    hudObjective = SCENE_FIRST_METHOD_PROMPT
  } else if (
    presentationForRender.kind === 'concourse' &&
    cta &&
    cta.kind !== 'ritual-step'
  ) {
    hudObjective = cta.label
  } else if (freshConcourseRecommendation) {
    hudObjective = `Suggested: ${freshConcourseRecommendation.site.name}. You may choose any route.`
  }

  const hudPreviewAction = previewActionId
    ? selectedActions.find((action) => action.id === previewActionId)
    : undefined
  const hudReaction = selectedCompletedAction?.reactions?.[0]
  let hudDialogue: CinematicHudDialogue | undefined
  if (!sceneBeat && !roomConsoleDocked && !hudTransitioning) {
    if (sceneFirstConfirmationActive && armedSceneAction) {
      hudDialogue = {
        kicker: 'Final filing review',
        speaker: armedSceneAction.title,
        // The method description remains on its scene control. This HUD line
        // deliberately carries the authored consequence instead, so the review
        // adds the cost of filing rather than repeating the choice.
        line: armedSceneAction.consequence,
      }
    } else if (unnumberedRoomOpen && activeReadingPoint) {
      const objectLine = activeReadingInteractionDefinition
        ? `${activeReadingInteractionDefinition.response} ${activeReadingPoint.archivistNote}`
        : [
            activeReadingPoint.inspection,
            activeReadingPoint.machineMarking,
            activeReadingPoint.draftingPrompt,
            activeReadingPoint.archivistNote,
          ]
            .filter(Boolean)
            .join(' ')
      hudDialogue = {
        kicker: `${activeReadingPoint.meta} · not evidence`,
        speaker: activeReadingPoint.title,
        line: objectLine,
        variant: 'secret',
      }
    } else if (unnumberedRoomOpen) {
      hudDialogue = {
        kicker: unnumberedReadingRoom.subtitle,
        speaker: 'The Small Archivist',
        personaId: 'archivist',
        line: unnumberedReadingRoom.archivistCard,
      }
    } else if (activeSecret) {
      hudDialogue = {
        kicker: 'The Fourth Margin · not evidence',
        speaker: activeSecret.title,
        line: activeSecret.body,
        variant: 'secret',
      }
    } else if (!shownCloseup && authoritySignal === 'forged') {
      hudDialogue = {
        kicker: 'Authority trace',
        speaker: 'Dormant credential',
        line: 'The forged authority is live. Its back-trace now follows the certification route.',
      }
    } else if (!shownCloseup && authoritySignal === 'linked') {
      hudDialogue = {
        kicker: 'Authority trace',
        speaker: 'Registry ↔ maintenance',
        line: 'Registry and maintenance signals now converge on one authority family.',
      }
    } else if (hudPreviewAction) {
      hudDialogue = {
        kicker: 'Method preview',
        speaker: hudPreviewAction.methodLabel,
        line: hudPreviewAction.description,
      }
    } else if (hudReaction) {
      hudDialogue = {
        kicker: 'Field channel',
        speaker: personaName(hudReaction.persona),
        personaId: hudReaction.persona,
        line: hudReaction.line,
      }
    } else if (fieldFilingClosed) {
      hudDialogue = {
        kicker: 'Filed-record limit',
        speaker: `${selectedSite.index} · ${selectedSite.name}`,
        line: filingBudgetNote,
      }
    } else if (shownCloseup) {
      hudDialogue = {
        kicker: 'Location record',
        speaker: `${selectedSite.index} · ${selectedSite.name}`,
        line: selectedSite.description,
      }
    } else {
      hudDialogue = {
        kicker: 'Civic mandate',
        speaker: 'The Annex',
        line: caseFile.mandate,
        // THE FILING BUDGET, STATED BEFORE IT CAN BE VIOLATED. The same rule is
        // printed in the `!scene.world` command bar below, which the cinematic
        // scene-first flow never renders — so a scene-first player used to meet
        // the 2-of-4 limit only by hitting it at site three (audit F3). Stated
        // here in the Authority's register, on the plate that already speaks for
        // the institution, and gated on the same `completedSites.length === 0`
        // the legacy copy uses, so it self-retires after the first filing.
        //
        // The plate is an absolutely-positioned HUD overlay, not a page row: it
        // adds no document height, which is what the legacy copy's own comment
        // warns about (as a command-bar row that sentence pushed the 1280x800
        // concourse to scrollHeight 823 and failed `1280x800 · the collapsed
        // page fits without a scrollbar` in evidence-hud-collapse.mjs). Measured
        // after this change: scrollHeight 800 against an 800px viewport.
        note:
          state.completedSites.length === 0
            ? 'Filing budget: this tribunal hears two sites. The other two are yours to inspect and leave off the record.'
            : undefined,
        kind: 'civic-mandate',
      }
    }
  }

  const hudActions: CinematicHudAction[] = []
  if (!sceneBeat && !hudTransitioning) {
    if (sceneFirstConfirmationActive && armedSceneAction) {
      hudActions.push(
        {
          id: 'scene-file',
          label: `File ${armedSceneAction.title}`,
          tone: 'primary',
        },
        {
          id: 'scene-cancel',
          label: 'Cancel',
          tone: 'quiet',
        },
      )
    } else if (unnumberedRoomOpen) {
      if (activeReadingPoint) {
        activeReadingPoint.interactions.forEach((interaction) => {
          hudActions.push({
            id: `reader:${activeReadingPoint.id}:${interaction.id}`,
            label: interaction.label,
            tone: 'quiet',
          })
        })
      }
      hudActions.push({
        id: 'return',
        label: unnumberedReadingRoom.exit.label,
        tone: 'quiet',
      })
    } else if (shownCloseup) {
      if (roomConsoleDocked) {
        // The console is already this location's primary interaction surface.
        // Keep one explicit escape route without laying a second action stack
        // over the console itself.
        hudActions.push({
          id: 'return',
          label: returnToWorldLabel,
          tone: 'quiet',
        })
      } else {
        if (cta && (selectedCompletedAction || cta.kind === 'ritual-step')) {
          hudActions.push({
            id: 'progress',
            label: cta.label,
            tone: 'primary',
          })
        }
        hudActions.push(
          {
            id: 'detail',
            label: 'Location detail',
            tone: 'quiet',
          },
          {
            id: 'return',
            label: returnToWorldLabel,
            tone: 'quiet',
          },
        )
      }
    } else if (cta && cta.kind !== 'ritual-step') {
      hudActions.push({
        id: 'progress',
        label: cta.label,
        tone: 'primary',
      })
    } else if (freshConcourseRecommendation) {
      hudActions.push({
        id: 'recommended-site',
        label: `Enter ${freshConcourseRecommendation.site.name}`,
        tone: 'primary',
      })
    }
  }

  function runHudAction(actionId: CinematicHudAction['id']) {
    if (actionId.startsWith('reader:')) {
      const [, pointId, interactionId] = actionId.split(':')
      if (pointId && interactionId) performReadingInteraction(pointId, interactionId)
      return
    }
    switch (actionId) {
      case 'recommended-site':
        if (freshConcourseRecommendation) {
          selectSite(freshConcourseRecommendation.site.id, true)
        }
        return
      case 'scene-file':
        if (armedSceneAction) handleSceneFirstCommit(armedSceneAction.id)
        return
      case 'scene-cancel':
        clearSceneFirstConfirmation(true)
        return
      case 'progress':
        if (cta) runCta(cta.kind)
        return
      case 'detail':
        openDetailDrawer()
        return
      case 'return':
        if (unnumberedRoomOpen) exitUnnumberedRoom()
        else returnToConcourse()
        return
    }
  }

  const hudLocationLabel = unnumberedRoomOpen
    ? `Ø04 · ${unnumberedReadingRoom.title}`
    : shownCloseup
      ? `${selectedSite.index} · ${selectedSite.name}`
      : hudTransitioning
        ? `Transit · ${selectedSite.name}`
        : scene.world?.caption.title ?? chrome.worldCaption[0]
  const hudInteractionHint = sceneFirstConfirmationActive
    ? 'This method is final for this run. File it or cancel.'
    : sceneBeat
      ? 'Dialogue in progress'
    : hudTransitioning
      ? 'Crossing the threshold'
      : unnumberedRoomOpen && activeReadingPoint
        ? 'Handle the object, choose another point, or leave'
        : unnumberedRoomOpen
          ? 'Choose any reading point · no prescribed order'
      : activeSecret
        ? 'Irregular mark retained in Case File · Case'
        : fieldFilingClosed
          ? 'Filing budget reached · inspect this location or continue to the memory lattice'
        : shownCloseup && roomConsoleDocked
          ? ritualStepLabel ?? 'Work the room console'
          : shownCloseup && methodsVisible
            ? 'Choose one marked method'
            : shownCloseup
              ? 'Read the location'
              : 'Select a threshold in the world'

  // ONE React position for whichever bounded room this location authors. Rendered
  // through a portal into a host node the workspace owns, so docking the console
  // over the plate is a DOM move rather than a remount. Keyed by site: switching
  // location still resets the view-local ritual exactly as before.
  const roomConsoleNode = selectedCompletedAction || fieldFilingClosed ? null : selectedSite.room ? (
    <ClassificationRoom
      key={selectedSite.id}
      room={selectedSite.room}
      actions={selectedActions}
      onCommitAction={handleCommitAction}
      onPreviewChange={setPreviewActionId}
      onRoomPresentationChange={setRoomPresentation}
      methodsInScene={sceneFirstZonesLive}
    />
  ) : selectedSite.acousticShadow ? (
    <AcousticShadowRoom
      key={selectedSite.id}
      room={selectedSite.acousticShadow}
      actions={selectedActions}
      onCommitAction={handleCommitAction}
      onPreviewChange={setPreviewActionId}
      onRoomPresentationChange={setAcousticPresentation}
      methodsInScene={sceneFirstZonesLive}
    />
  ) : selectedSite.custodyRail ? (
    <CustodyRailRoom
      key={selectedSite.id}
      room={selectedSite.custodyRail}
      actions={selectedActions}
      onCommitAction={handleCommitAction}
      onPreviewChange={setPreviewActionId}
      onRoomPresentationChange={setCustodyPresentation}
      methodsInScene={sceneFirstZonesLive}
    />
  ) : null

  return (
    <article
      className={`phase-page investigation-page ${
        scene.world ? 'investigation-page--game-hud' : ''
      }`}
    >
      {roomConsoleNode && roomConsoleHost
        ? createPortal(roomConsoleNode, roomConsoleHost)
        : roomConsoleNode}
      <p className="sr-only" role="status" aria-live="polite">
        {refusalLine}
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {worldLine}
      </p>
      {/* The always-on set, reduced to what the scene cannot say for itself.
          The page's own label copy is gone from view — the room says it better —
          but the <h1> survives as sr-only so heading order and the id other
          surfaces reference are untouched. */}
      {!scene.world && (
        <header className="field-commandbar">
        <h1 className="sr-only" id="field-heading">
          Investigate the district
        </h1>
        <div className="field-objectives" aria-label="Tribunal requirements">
          <span data-complete={state.completedSites.length >= content.fieldSiteLimit ? 'true' : undefined}>
            <strong>
              {filedSiteCount} / {content.fieldSiteLimit}
            </strong>
            sites
          </span>
          <span data-complete={reconstruction ? 'true' : undefined}>
            <strong>{reconstruction ? 'Filed' : 'Needed'}</strong>
            model
          </span>
          {/* THE ALARM PROMOTION. Civic alarm used to live only in the rail; the
              moment the rail went behind a summon a raised alarm would have
              become invisible, which is a strictly worse game. It joins the
              always-on facts here — never on the plate, where a docked room
              console or a staged beat can cover the chrome — rendered only when
              it is nonzero, in the existing coral text-risk convention. This is
              the one place the restructure deliberately ADDS density. */}
          {state.alarm > 0 && (
            <span className="field-alarm" data-alarm="true">
              <strong className="text-risk">
                {state.alarm} trace{state.alarm === 1 ? '' : 's'}
              </strong>
              civic alarm
            </span>
          )}
        </div>
        {/* Onboarding copy that becomes noise once understood: it holds until the
            first site is filed, after which the objectives counter carries the
            same fact numerically. */}
        {state.completedSites.length === 0 && (
          <p className="field-threshold">
            The tribunal will hear a record of two sites. The other two are yours to
            leave outside the filed record.{' '}
            {/* W1-4 · P2-F. The threshold sentence states the RULE; the campaign
                model — route becomes a model, model becomes a ruling, ruling
                outlives the run — was nowhere on this surface, which is the whole
                of the critique's heuristic-#10 finding.

                An INLINE continuation of the same paragraph, not a sibling
                block, and that is a measured decision rather than a stylistic
                one: as its own row it added 24px to the command bar and pushed
                the 1280x800 concourse to scrollHeight 823 against an 800px
                viewport, failing `1280x800 · the collapsed page fits without a
                scrollbar` in evidence-hud-collapse.mjs. Inline, the two
                sentences share one 1095px line inside a 1244px bar and the page
                fits again. Headroom is ~12%: a redline that lengthens this
                sentence past roughly 115 characters wraps it and re-opens that
                assertion — re-run the harness after any edit.

                Its own class, never `.field-threshold`: three assertions require
                exactly one node of that name. */}
            {showsFieldPurpose(state) && (
              <span className="field-purpose">{purposeCopy.field}</span>
            )}
          </p>
        )}
        </header>
      )}

      {!scene.world && state.completedSites.length >= content.fieldSiteLimit && (
        <p className="field-omitted-sites" role="status">
          {omittedSiteCount} site{omittedSiteCount === 1 ? '' : 's'} omitted from the filed record.
        </p>
      )}

      <div className={`field-workspace ${inspectorSpine ? 'field-workspace--spine' : ''}`}>
        <section className="world-pane" aria-label="District navigation">
          <div
            className={worldViewClass}
            data-transition={presentationForRender.kind}
            ref={worldViewRef}
          >
            {/* The world is now the primary location picker. A hotspot swaps the
                adjacent workspace in place instead of sending the player down a
                long document. Canonical game state remains engine-owned. */}
            {unnumberedRoomOpen ? (
              <UnnumberedRoomStage
                room={unnumberedReadingRoom}
                active
                reducedMotion={sceneMotionReduced}
                activePointId={activeReadingPointId ?? undefined}
                openedPointIds={openedReadingPointIds}
                activeInteraction={activeReadingInteraction ?? undefined}
                onPointActivate={(pointId) => inspectReadingPoint(pointId)}
              />
            ) : scene.world ? (
              <AnnexWorldStage
                world={scene.world}
                sites={sites}
                completedSiteIds={state.completedSites}
                selectedSiteId={cameraSiteId}
                recommendedSiteId={recommendedSite?.id}
                active={sceneActive}
                reducedMotion={sceneMotionReduced}
                alarmLevel={state.alarm}
                authoritySignal={authoritySignal}
                resolvedOutcomes={resolvedOutcomes}
                returnEmphasisSiteId={returnEmphasisSiteId ?? undefined}
                secretRoom={unnumberedReadingRoom}
                secretRoomAvailable={
                  unnumberedRoomUnlocked &&
                  presentationForRender.kind === 'concourse'
                }
                onSecretRoomActivate={enterUnnumberedRoom}
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
                roomStage={plateRoomStage}
                roomZones={selectedSite.room?.zones}
                acousticStage={plateAcousticStage}
                acousticZones={selectedSite.acousticShadow?.zones}
                acousticResolvedVariant={acousticResolvedVariant}
                acousticDepthAssets={selectedSite.acousticShadow?.depthAssets}
                custodyStage={plateCustodyStage}
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
                interactiveZones={sceneFirstSite}
              />
            )}

            {/* The scene-first interactive layer. It is a SIBLING of the
                aria-hidden close-read figure, never a child of it, so the real
                method buttons stay in the accessibility tree; the figure's
                decorative zone mirror is suppressed above so nothing announces
                twice. It reuses the plate's own projection geometry, so a ring
                sits on the prop it names through every responsive crop. */}
            {sceneFirstZonesLive && shownCloseup && (
              <div
                className="scene-zones-live"
                data-emphasis={
                  sceneFirstEmphasisZone || sceneFirstDerivedFocus ? 'true' : undefined
                }
                data-confirmation-active={
                  sceneFirstConfirmationActive ? 'true' : undefined
                }
                style={closeupStageStyle(shownCloseup, closeupEntryOrigin, sceneFirstFocus)}
              >
                <div className="scene-zones-live-cover">
                  <div className="scene-zones-live-projection">
                    {shownCloseup.zones?.map((zone) => {
                      const action = selectedActions.find((item) => item.id === zone.actionId)
                      if (!action) return null
                      const isDepositionEntry = Boolean(
                        deposition?.entryActionIds.includes(zone.actionId),
                      )
                      return (
                        <SceneZone
                          key={zone.actionId}
                          action={action}
                          x={zone.x}
                          y={zone.y}
                          treatment={
                            shownCloseup.previewTreatment?.actionTreatments[zone.actionId]
                          }
                          requiresConfirmation={!isDepositionEntry}
                          armed={
                            isDepositionEntry
                              ? undefined
                              : armedSceneActionId === zone.actionId
                          }
                          onArmedChange={
                            isDepositionEntry
                              ? undefined
                              : (armed) => {
                                  if (armed) {
                                    armSceneFirstMethod(zone.actionId)
                                    return
                                  }
                                  if (armedSceneActionId === zone.actionId) {
                                    clearSceneFirstConfirmation(true)
                                  }
                                }
                          }
                          aside={isDepositionEntry ? 'Open transcript' : undefined}
                          onAttentionChange={(active) => {
                            setPreviewActionId((current) =>
                              active
                                ? zone.actionId
                                : current === zone.actionId
                                  ? null
                                  : current,
                            )
                          }}
                          onCommit={() => {
                            if (isDepositionEntry) {
                              onDepositionEntryChange(zone.actionId)
                              return
                            }
                            handleSceneFirstCommit(zone.actionId)
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Fourth Margin marks share the close-read projection above but
                never its filing controls. A settled, filed plate may expose one
                authored 48px DOM target; activating it writes only campaign
                marginalia and leaves the legal record untouched. */}
            {fourthMarginMarkerLive && shownCloseup && selectedSiteSecret && (
              <div
                className="scene-zones-live fourth-margin-layer"
                data-resolved="true"
                data-revealed={activeSecret ? 'true' : undefined}
                style={closeupStageStyle(shownCloseup, closeupEntryOrigin, sceneFirstFocus)}
              >
                <div className="scene-zones-live-cover">
                  <div className="scene-zones-live-projection">
                    <FourthMarginMarker
                      definition={selectedSiteSecret}
                      discovered={selectedSiteSecretDiscovered}
                      onInspect={inspectFourthMargin}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* The bounded room's console, docked over the plate exactly where the
                deposition tray docks: the ritual is performed in the room it is
                about, not in a column beside it. The host node (and with it the
                room's whole view-local state) is moved in, not re-rendered. */}
            {roomConsoleDocked && (
              <div className="room-console" ref={roomDockRef} />
            )}

            {sceneFirstPlate && sceneBeat && sceneBeat.phase !== 'settling' && (
              <BeatStage
                key={sceneBeat.actionId}
                lines={sceneBeatLines}
                reducedMotion={sceneMotionReduced}
                held={sceneBeat.phase === 'done'}
                onComplete={() =>
                  setSceneBeat((current) =>
                    current && current.phase === 'playing'
                      ? { ...current, phase: 'done' }
                      : current,
                  )
                }
              />
            )}

            {sceneFirstPlate && sceneBeat?.phase === 'done' && selectedCompletedAction && (
              <div className="scene-result" role="status">
                <p className="scene-result-evidence">
                  Evidence admitted:{' '}
                  <strong>{selectedEvidence?.title ?? selectedCompletedAction.eventTitle}</strong>
                </p>
                {sceneStandingEntries.length > 0 && (
                  <p className="scene-result-standing">
                    Standing:{' '}
                    {sceneStandingEntries.map(([id, delta]) => (
                      <span key={id} data-sign={delta > 0 ? 'pos' : 'neg'}>
                        {/* A stance change is FELT here, on the plate, where the
                            player is already looking — so this is where the face
                            belongs. It is a mount, not an animation: reduced
                            motion needs nothing from it. */}
                        <PersonaPortrait personaId={id as PersonaId} size="chip" />
                        {personaName(id as PersonaId)} {delta > 0 ? `+${delta}` : delta}
                      </span>
                    ))}
                  </p>
                )}
                <button
                  className="scene-result-dismiss"
                  type="button"
                  ref={sceneResultRef}
                  onClick={dismissSceneBeat}
                >
                  Close the record <span aria-hidden="true">→</span>
                </button>
              </div>
            )}

            {/* The plate's summon rail. Both summons live in ONE positioned
                flex row anchored top-right, so they can never overlap each
                other however the plate crops — the cross-zone rule that came
                out of the rooms round. The concourse return keeps its own
                top-LEFT anchor, so the three controls occupy three separate
                regions of the chrome. */}
            <div className="scene-summons">
              <CaseFileSummon state={state} onOpen={openCaseFile} />
              {sceneFirstPlate && (
                <button className="scene-detail-summon" type="button" onClick={openDetailDrawer}>
                  Location detail
                </button>
              )}
            </div>

            {shownCloseup && scene.world && (
              <button className="world-return" type="button" onClick={returnToConcourse}>
                <span aria-hidden="true">←</span> {returnToWorldLabel}
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

          {!unnumberedRoomOpen && (
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
          )}
        </section>

        <section
          className={`site-record site-inspector ${inspectorSpine ? 'site-inspector--spine' : ''} ${selectedCompletedAction ? 'site-record-complete' : ''}`}
          data-gameplay-hidden={scene.world ? 'true' : undefined}
          id={`site-card-${selectedSite.id}`}
          ref={siteInspectorRef}
          tabIndex={-1}
          inert={scene.world ? true : undefined}
          aria-hidden={scene.world ? true : undefined}
          aria-labelledby={`site-heading-${selectedSite.id}`}
        >
          {/* The header is the SAME markup in both states — the spine restyles it
              rather than replacing it, so the heading id this section is labelled
              by, the h2 in the heading order, and every selector already pointed
              at `.site-header h2` survive the collapse untouched. */}
          <header className={`site-header ${inspectorSpine ? 'site-header--spine' : ''}`}>
            <span className="site-index">{selectedSite.index}</span>
            <div>
              <p className="site-location-label">Location in view</p>
              <h2 id={`site-heading-${selectedSite.id}`}>{selectedSite.name}</h2>
            </div>
            <span
              className={`site-state ${selectedCompletedAction ? 'state-filed' : 'state-open'}`}
            >
              {selectedCompletedAction ? 'Filed' : fieldFilingClosed ? 'Omitted' : 'Open'}
            </span>
          </header>

          {inspectorSpine ? (
            // THE SPINE. Identity, status, and the way back to the full text —
            // and nothing else, because nothing else is left to say while the
            // room itself is carrying the work. Every string this branch stops
            // printing is proved to be on the Location detail drawer by
            // `equivalenceGaps()`; the standing line for this phase is handed to
            // that drawer above, so it moves rather than disappearing.
            <>
              {spineCarriesDetailSummon && (
                <button
                  className="scene-detail-summon site-spine-summon"
                  type="button"
                  onClick={openDetailDrawer}
                >
                  Location detail
                </button>
              )}
              {/* Kept mounted and empty: the console is docked over the plate in
                  this state, and the host's return trip needs this node to exist
                  in the same commit that un-collapses the column. */}
              {roomSite ? <div className="room-console-slot" ref={roomSlotRef} /> : null}
            </>
          ) : (
            <>
              <p className="site-description">{selectedSite.description}</p>

              {selectedCompletedAction ? (
            <>
              <div className="resolved-action">
                <span className="resolved-mark" aria-hidden="true">
                  ✓
                </span>
                <div>
                  <strong>{selectedEvent?.title ?? selectedCompletedAction.title}</strong>
                  {/* The committed event includes the exact source-backed anchors
                      discovered on this route. Showing it here keeps the filed
                      result aligned with the lattice: no anchor appears later by
                      fiat, and the arithmetic remains in the compact grid. */}
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
                    {Object.values(selectedCompletedAction.trust ?? {}).some(Boolean) && (
                      <span>
                        <small>Standing</small>
                        <strong>
                          {Object.entries(selectedCompletedAction.trust ?? {})
                            .filter(([, delta]) => delta !== 0)
                            .map(
                              ([id, delta]) =>
                                `${personaName(id as PersonaId)} ${delta > 0 ? '+' : ''}${delta}`,
                            )
                            .join(' · ')}
                        </strong>
                      </span>
                    )}
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
          ) : fieldFilingClosed ? (
            <p className="site-filing-limit" role="status">{filingBudgetNote}</p>
          ) : roomSite ? (
            // The bounded room's console. It renders HERE whenever the settled close
            // read is not on screen — the always-mounted rule: the ritual is never
            // gated behind entering a view — and is moved (never remounted) into the
            // dock over the plate while the close read is up.
            <>
              {/* W1-4 · P2-F. A plain location says its cost in the method
                  prompt below ("Choose one method. This location then closes.").
                  A bounded-room location never does: its ritual replaces that
                  prompt entirely, so the one irreversible thing about a site was
                  stated on two of the four locations and not the other two.
                  Retires at the first filing, when the cost has been paid once. */}
              {showsSiteCost(state) && (
                <p className="site-cost-note">{purposeCopy.siteCost}</p>
              )}
              {roomConsoleDocked ? (
                <p className="scene-first-note">
                  The station stands in the room above. Work it there; this record
                  keeps the location’s text.
                </p>
              ) : null}
              <div className="room-console-slot" ref={roomSlotRef} />
            </>
          ) : (
            // Keyed by site: switching location remounts the method list, so any
            // armed commit resets silently with it (one of the three disarms).
            <div
              className={`site-actions ${sceneFirstPlate ? 'site-actions-scene-first' : ''}`}
              key={selectedSite.id}
            >
              <p className="site-action-prompt">
                {sceneFirstPlate ? SCENE_FIRST_METHOD_PROMPT : INSPECTOR_METHOD_PROMPT}
              </p>
              {/* Scene-first: the two methods are the marked points on the plate,
                  rendered exactly once. The canonical list returns here the moment
                  the close read is not on screen, so methods are never gated
                  behind entering a view. */}
              {sceneFirstPlate ? (
                <p className="scene-first-note">
                  The two methods stand in the room above. Open the location detail for the
                  full text of each.
                </p>
              ) : null}
              {sceneFirstPlate ? null : selectedActions.map((action) => {
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
            </>
          )}
        </section>
      </div>

      {scene.world && (
        <CinematicHud
          caseCode={caseFile.code}
          caseTitle={caseFile.title}
          objective={hudObjective}
          sitesFiled={filedSiteCount}
          sitesTotal={content.fieldSiteLimit}
          evidenceFiled={hudEvidenceCount}
          evidenceTotal={hudEvidenceCapacity}
          alarm={state.alarm}
          locationLabel={hudLocationLabel}
          interactionHint={hudInteractionHint}
          dialogue={hudDialogue}
          progressLabel={
            unnumberedRoomOpen
              ? openedReadingPointIds.length === unnumberedReadingRoom.readingPoints.length
                ? unnumberedReadingRoom.completion.visual
                : unnumberedReadingRoom.subtitle
              : activeSecret
              ? 'Held in Case File · Case'
              : state.completedSites.length >= content.fieldSiteLimit
                ? `${omittedSiteCount} site${omittedSiteCount === 1 ? '' : 's'} omitted from filed record`
                : `${filedSiteCount} / ${content.fieldSiteLimit} sites filed`
          }
          actions={hudActions}
          consoleActive={roomConsoleDocked}
          lowerHudHidden={Boolean(sceneBeat)}
          confirmationActive={sceneFirstConfirmationActive}
          recordActionsDisabled={
            Boolean(sceneBeat) || hudTransitioning || sceneFirstConfirmationActive
          }
          shortcutsEnabled={
            !caseFileOpen &&
            !detailDrawerOpen &&
            !depositionEntry &&
            !sceneBeat &&
            !hudTransitioning &&
            !sceneFirstConfirmationActive
          }
          // Same stand-downs as the record chords except the filing review: the
          // review's own File/Cancel pair IS the visible action list, so its
          // ordinals stay live and a digit there is the same confirm click the
          // pointer makes. A summoned drawer stands the digits down so the
          // record surface owns every key while it is open.
          actionShortcutsEnabled={
            !caseFileOpen &&
            !detailDrawerOpen &&
            !depositionEntry &&
            !sceneBeat &&
            !hudTransitioning
          }
          onAction={runHudAction}
          onOpenCaseFile={() => openCaseFile('case')}
          onOpenEvidence={() => openCaseFile('evidence')}
        />
      )}

      {/* The route breadcrumb is gone: it duplicated the CTA, which already names
          the next step in the same words. The filed-model block moved into the
          case file's Case tab — a filed record belongs in the file. */}
      {!scene.world && (
        <footer className={`field-dock ${tribunalReady ? 'field-dock-ready' : ''}`}>
        <div className="field-dock-copy">
          {reconstruction ? (
            <p>{reconstruction.title} · model filed</p>
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

        {cta && (
          <div className="field-dock-actions">
            <button className="button button-primary" type="button" onClick={() => runCta(cta.kind)}>
              {cta.label} <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
        </footer>
      )}

      {/* The second belt on mutual exclusivity: even if some future route set
          both flags, only one dialog can render. */}
      {detailDrawerOpen && !caseFileOpen && (
        <SceneDetailDrawer
          site={selectedSite}
          actions={selectedActions}
          completedAction={selectedCompletedAction}
          evidenceTitle={selectedEvidence?.title}
          eventTitle={selectedEvent?.title}
          eventDetail={selectedEvent?.detail}
          standingNote={spineStandingNote}
          settings={state.settings}
          onClose={() => onDetailDrawerOpenChange(false)}
        />
      )}

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

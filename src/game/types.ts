import type { ComponentType, ReactNode } from 'react'

export type GamePhase =
  | 'landing'
  | 'briefing'
  | 'investigation'
  | 'reconstruction'
  | 'tribunal'
  | 'debrief'

export type PersonaId = 'registrar' | 'shepherd' | 'defector' | 'archivist'

export type ApproachId = 'procedure' | 'care' | 'covert' | 'curiosity'

export type MethodTag =
  | 'procedure'
  | 'negotiation'
  | 'stealth'
  | 'systems'
  | 'puzzle'
  | 'nonlethal'
  | 'fraud'
  | 'care'
  | 'coercion'

export type EvidenceStatus = 'verified' | 'disputed' | 'anomaly' | 'testimony'

// Content-item ids are per-case and open-ended: each registered CaseDefinition
// authors its own set (Case 77's 'registry', Case 81's 'deposition-suite', …),
// so these are widened to `string` rather than a global union. Cross-case
// completeness that a fixed union used to guarantee at compile time is instead
// enforced at runtime by the parameterized structural tests in content.test.ts
// and by the per-case decode validation in persistence.ts. PersonaId, ApproachId
// and MethodTag stay narrow unions — that cast and vocabulary are shared by
// every case.
export type EvidenceId = string

export type SiteId = string

export type FieldActionId = string

export type FragmentId = string

export type ReconstructionId = string

export type DecisionId = string

// The deposition interaction grammar (Case 81's unique verb). These are a fixed
// shared vocabulary — like MethodTag / ApproachId — not per-case content ids, so
// the engine may reference them without becoming case-specific. Any case that
// authors a `deposition` block reuses exactly these three per-beat choices and
// the three consent outcomes.
export type DepositionChoiceId = 'let-it-stand' | 'interrupt' | 'corroborate'

export type DepositionConsent = 'yes' | 'no' | 'unasked'

// The persisted trace of a committed deposition: which entry action opened it,
// the per-beat choices, whether the consent question was asked, and — derived
// from the authored consent answer — what the witness said. Optional-tolerated in
// decode (a save without it loads with depositionRecord === null), so it needs no
// schema bump.
export interface DepositionRecord {
  actionId: FieldActionId
  beats: DepositionChoiceId[]
  askedConsent: boolean
  consent: DepositionConsent
}

export interface AccessibilitySettings {
  reducedMotion: boolean
  highContrast: boolean
  textSize: 'standard' | 'large'
  showTrustNumbers: boolean
  // Opt-in synthesized ambient sound, DEFAULT OFF. Optional-tolerated in decode
  // (a stored settings blob written before this field existed loads with
  // ambientSound === false — same pattern as RunSummary.caseId), so no schema
  // bump. Sound is not motion: the reduced-motion preference does NOT gate it;
  // this toggle's default-off state is the accessibility posture on its own.
  ambientSound: boolean
}

export interface GameEvent {
  id: string
  order: number
  sourceType: 'approach' | 'field-action' | 'reconstruction' | 'decision'
  sourceId: string
  title: string
  detail: string
  tone: 'neutral' | 'positive' | 'warning'
  methodTags: MethodTag[]
}

export interface RunSummary {
  runNumber: number
  // Which case this run belonged to. Optional for backward compatibility:
  // summaries written before multi-case landed have no caseId and are treated
  // as 'case-77' by every reader. New summaries always stamp it so cross-case
  // residue (the Mirror) can resolve the correct case's prior-decision copy.
  caseId?: string
  decision: DecisionId
  primaryApproach: ApproachId
  methodTags: MethodTag[]
  evidenceCount: number
  alarm: number
  trust: Record<PersonaId, number>
}

export interface GameState {
  // Persisted save-schema version. Bumped only via the migration pipeline in
  // persistence.ts; the runtime source of truth is CURRENT_SAVE_SCHEMA there.
  schemaVersion: 2
  // Which case this run belongs to. Always 'case-77' today; introduced in v2 so
  // the upcoming multi-case expansion (Case 81) can move the schema only once.
  caseId: string
  phase: GamePhase
  runNumber: number
  primaryApproach: ApproachId | null
  completedSites: SiteId[]
  completedActions: FieldActionId[]
  evidence: EvidenceId[]
  methodTags: MethodTag[]
  trust: Record<PersonaId, number>
  alarm: number
  tribunalOverride: boolean
  selectedFragments: FragmentId[]
  reconstruction: ReconstructionId | null
  decision: DecisionId | null
  // The committed deposition transcript, or null when the case has no deposition,
  // its deposition site was resolved by a plain field action, or none was taken.
  // Optional-tolerated in decode (missing on an old save === null); no schema bump.
  depositionRecord: DepositionRecord | null
  events: GameEvent[]
  previousRuns: RunSummary[]
  // caseId -> the decision id of the most recently COMPLETED run of that case.
  // Empty until a run reaches a verdict. Carried across runs; read by future
  // cases that branch on a prior verdict.
  precedents: Record<string, string>
  settings: AccessibilitySettings
  announcement: string
}

export type GameAction =
  | { type: 'START_NEW' }
  | { type: 'RESTORE'; state: GameState }
  | { type: 'SELECT_APPROACH'; approachId: ApproachId }
  | { type: 'COMMIT_FIELD_ACTION'; actionId: FieldActionId }
  // Commit a deposition transcript. Resolves the underlying field action (the
  // deposition's entry action) exactly as COMMIT_FIELD_ACTION would — files the
  // site, adds its evidence — and additionally applies the beat-derived trust and
  // method tags, records a depositionRecord, and logs one transcript-path event.
  // Validated against the case's authored `deposition` block; a no-op if the case
  // defines none, the action is not one of its entry actions, or the beats/consent
  // do not match the block. Generic: the engine reads only authored data.
  | {
      type: 'COMMIT_DEPOSITION'
      actionId: FieldActionId
      beats: readonly DepositionChoiceId[]
      askedConsent: boolean
    }
  | { type: 'OPEN_RECONSTRUCTION' }
  | { type: 'TOGGLE_FRAGMENT'; fragmentId: FragmentId }
  | { type: 'SUBMIT_RECONSTRUCTION' }
  | { type: 'ENTER_TRIBUNAL' }
  | { type: 'RETURN_TO_INVESTIGATION' }
  | { type: 'DECIDE'; decisionId: DecisionId }
  | { type: 'START_NEXT_RUN' }
  // Begin a fresh run of a DIFFERENT registered case, carrying precedents,
  // capped run history, and cross-run residue exactly as START_NEXT_RUN does.
  // Ignored (no-op) when caseId is not a registered case.
  | { type: 'START_CASE'; caseId: string }
  | { type: 'RETURN_TO_TITLE' }
  | { type: 'UPDATE_SETTING'; setting: keyof AccessibilitySettings; value: boolean | 'standard' | 'large' }

// A case the player may switch their current run to, resolved for presentation.
// `seen` is true when the player already has a recorded verdict for that case,
// so the switch reads as returning to it rather than opening it for the first
// time. Built view-side from getSwitchableCaseIds + the case bundle.
export interface CaseSwitchOption {
  caseId: string
  heading: string
  meta: string
  seen: boolean
}

// One authored, in-voice line a persona speaks in the moment a commitment lands.
// This is CONTENT, not persisted state: it is looked up view-side from ids that
// already live in GameState (event sourceType/sourceId, the site's chosen
// actionId, the filed reconstruction). The engine never needs to know it exists.
export interface PersonaReaction {
  persona: PersonaId
  line: string
}

export interface PersonaDefinition {
  id: PersonaId
  name: string
  role: string
  principle: string
}

export interface ApproachDefinition {
  id: ApproachId
  title: string
  method: string
  description: string
  consequence: string
  trust: Partial<Record<PersonaId, number>>
}

export interface EvidenceDefinition {
  id: EvidenceId
  title: string
  source: string
  status: EvidenceStatus
  claim: string
  contradiction: string
}

export interface FieldActionDefinition {
  id: FieldActionId
  siteId: SiteId
  title: string
  methodLabel: string
  description: string
  consequence: string
  methodTags: MethodTag[]
  evidenceId: EvidenceId
  trust: Partial<Record<PersonaId, number>>
  alarmDelta: number
  grantsTribunalOverride: boolean
  eventTitle: string
  eventDetail: string
  // Testimony of the route not taken: read at debrief for the sibling action
  // the auditor skipped when this action's site was visited another way.
  counterfactualNote?: string
  // The persona(s) who speak in the moment this action is committed, in their
  // established voice. Read view-side; never persisted.
  reactions?: readonly PersonaReaction[]
}

export interface SiteDefinition {
  id: SiteId
  index: string
  name: string
  description: string
  actionIds: readonly FieldActionId[]
  // Optional presentation-only close read for a location. It can make a site
  // spatially distinct, but never carries canonical evidence or mutates state.
  closeup?: {
    src: string
    caption: string
    focalPoint?: {
      x: number
      y: number
    }
    // Presentation-only anchors that connect each existing method to a physical
    // zone in the plate. They never replace the DOM button or carry game rules.
    zones?: readonly {
      actionId: FieldActionId
      x: number
      y: number
    }[]
    atmosphere?: 'rain-reflection' | 'checksum-echo'
  }
  // Read at debrief when the site was never visited in this run.
  unvisitedNote: string
}

export interface FragmentDefinition {
  id: FragmentId
  timecode: string
  title: string
  content: string
  source: string
}

export interface ReconstructionDefinition {
  id: ReconstructionId
  title: string
  thesis: string
  evidenceId: EvidenceId
  trust: Partial<Record<PersonaId, number>>
  // Authored flag (was inferred from Case 77's 'unresolved-composite' id inside
  // the engine): the irreducible-doubt model whose filing reads as a warning
  // rather than a positive result. The dynamic `corroboratedAnchors === 0`
  // condition still applies on top of this at SUBMIT_RECONSTRUCTION time.
  unresolvedTone: boolean
  // The persona most implicated by this model reacts to it being filed.
  reactions?: readonly PersonaReaction[]
}

export interface DecisionDefinition {
  id: DecisionId
  title: string
  shortLabel: string
  description: string
  cost: string
  requiresOverride: boolean
  // Authored classification (was inferred from Case 77's 'overwrite-record' id
  // inside the engine and the Tribunal). `illicit` drives the tribunal's
  // 'Illicit finding' label and 'risk' tone; `methodTags` and `tone` drive the
  // DECIDE method-memory tags and the decision event's tone. Every registered
  // case authors these on every decision so the shared runtime reads only data.
  illicit: boolean
  methodTags: readonly MethodTag[]
  tone: GameEvent['tone']
}

// A diegetic registry photograph a case may attach to its case-file surfaces
// (the briefing subject block + the rail case view). Not scene art: it renders as
// a flat, slightly desaturated, fog-bordered record with a compact mono caption.
// Optional — a case with no photograph on file (Case 77) authors none. Pure data,
// no ids: components render it generically when present, so no case-id literal is
// needed to gate it.
export interface CaseFileDossierImage {
  src: string
  caption: string
  alt: string
}

// The assignment header shown at briefing and echoed across the case rail and
// tribunal. Pure copy — no ids, no logic.
export interface CaseFile {
  code: string
  title: string
  subject: string
  deadline: string
  question: string
  publicRecord: string
  mandate: string
  // Optional registry photograph for this case's subject (see CaseFileDossierImage).
  dossierImage?: CaseFileDossierImage
}

// One positioned annotation on the investigation world-map. `className` carries
// the CSS position (case art is bespoke per case); `text` is the label.
export interface WorldLabel {
  className: string
  text: string
}

// Per-case strings that used to be hardcoded inside components. Kept in the case
// bundle so a second case can differ without editing the presentation layer.
export interface CaseChrome {
  // Briefing scene coordinates (decorative, aria-hidden).
  briefingCoordinates: string
  // Investigation world-view: the map's aria-label, its positioned annotations,
  // and the two-line caption beneath it.
  worldAriaLabel: string
  worldLabels: readonly WorldLabel[]
  worldCaption: readonly [string, string]
  // Tribunal chrome: the seal glyph and the three header lines, plus the copy
  // shown on a locked (override-gated) decision.
  tribunalSeal: string
  tribunalChannel: string
  tribunalHeadline: string
  tribunalIntro: string
  lockedDecisionHint: string
}

// When a case cites a prior case's verdict at its tribunal. `caseId` names the
// earlier case; `lines` maps that case's decision id to the authored citation.
export interface PrecedentSource {
  caseId: string
  lines: Readonly<Record<DecisionId, string>>
}

// ── Cross-case precedent EFFECTS (a prior verdict changes playable field copy) ─
// A precedent citation is copy at the tribunal; a precedent EFFECT reaches back
// into the field. The only fields a prior verdict may alter on a matching field
// action are the ones a player sees and pays before/at commit: the doubled-or-not
// alarm, the pre-commit risk hint (`consequence`), the resolved `eventDetail`, and
// the in-run `reactions`. Everything else on the action (evidence id, override
// grant, trust deltas, method tags) is immutable across precedents.
export type FieldActionOverride = Partial<
  Pick<FieldActionDefinition, 'alarmDelta' | 'consequence' | 'eventDetail' | 'reactions'>
>

// One authored consequence: when the player's recorded verdict on `whenCase`
// equals `whenDecision`, every field action of THIS case named in
// `fieldActionOverrides` resolves with its declared override applied over the
// authored base. Matched by resolveFieldAction (content.ts); the engine and every
// view that shows action copy resolve through that one helper, so the pre-commit
// display and the committed effects can never disagree.
export interface PrecedentEffect {
  whenCase: string
  whenDecision: DecisionId
  fieldActionOverrides: Readonly<Record<FieldActionId, FieldActionOverride>>
}

// ── Deposition (Case 81's interaction grammar) ───────────────────────────────
// A bounded, deterministic transcript a case may author at one field site. The
// engine and UI treat it generically: no case knows the beat count, and no beat
// id or entry-action id is hardcoded in the engine or components.

// One of the three per-beat choices the auditor may make against a statement.
// `trust` and `methodTags` are the bonus effects folded in on commit; `summary`
// is the terse clause joined into the transcript-path event detail.
export interface DepositionChoiceDefinition {
  id: DepositionChoiceId
  label: string
  detail: string
  trust: Partial<Record<PersonaId, number>>
  methodTags: readonly MethodTag[]
  summary: string
}

// One statement beat: the witness's line (authored per entry action, keyed by the
// entry action's id) and the three choices the auditor may take against it.
export interface DepositionBeatDefinition {
  id: string
  statements: Readonly<Record<FieldActionId, string>>
  choices: readonly DepositionChoiceDefinition[]
}

// The fixed consent beat. The auditor may ask the question or decline; asking
// applies `askEffect` and surfaces the witness's authored, entry-dependent answer
// (its `consent` value is what persists on the record).
export interface DepositionConsentDefinition {
  id: string
  lead: Readonly<Record<FieldActionId, string>>
  question: string
  askLabel: string
  askDetail: string
  declineLabel: string
  declineDetail: string
  askEffect: {
    trust: Partial<Record<PersonaId, number>>
    methodTags: readonly MethodTag[]
  }
  answers: Readonly<Record<FieldActionId, { consent: 'yes' | 'no'; line: string }>>
}

// A whole deposition: the entry actions that open it, the statement beats (1..N),
// the consent beat, and the witness's closing line per entry action.
export interface DepositionDefinition {
  entryActionIds: readonly FieldActionId[]
  intro: string
  statementBeats: readonly DepositionBeatDefinition[]
  consent: DepositionConsentDefinition
  closing: Readonly<Record<FieldActionId, string>>
}

// ── Scene direction (2.5D diorama / flat map) ────────────────────────────────
// Pure interpretation of canonical state: the reducer owns all game state; the
// scene layer only READS it. Both registered cases author a `scene`. Case 81's
// values are transcribed verbatim from public/case-81.html's manifest.

// The six canonical scene states, in authored order. Shared vocabulary (like
// MethodTag) — the mapping from GameState to one of these lives in
// src/scene/sceneState.ts and is view-derived, never persisted.
export const SCENE_STATES = [
  'neutral',
  'press',
  'corroborate',
  'refusal',
  'tribunal',
  'aftermath',
] as const

export type SceneStateId = (typeof SCENE_STATES)[number]

// A label whose authored offset displaces it at least this far (master-width
// fractions) from its marker gets a fog leader line drawn back to the point, so
// the label-to-hotspot association stays legible once it has been fanned away.
export const LABEL_LEADER_THRESHOLD = 0.02

// A CSS custom-property set applied to the stage root for one state. Keys are CSS
// variable names ('--haze-o'); values are numbers or strings. Transitions animate
// opacity and transform only (180ms token); reduced motion swaps instantly.
export type SceneTreatment = Readonly<Record<string, number | string>>

export interface SceneRect {
  x: number
  y: number
  w: number
  h: number
}

// One registered layer plane. `scale` is the pinned projection scale
// (perspectivePx + |z|) / perspectivePx; `kind` selects how the layer is painted.
// `raster.src` is the only place an image URL lives (kept out of shared runtime).
export interface SceneLayer {
  name: string
  z: number
  scale: number
  kind: 'raster' | 'svg' | 'css-gradients'
  raster?: { src: string; blend?: string }
}

// One hotspot, registered to a plane in master-normalized coordinates. `siteId`
// MUST equal one of the case's SiteIds (1:1; enforced by the content test) — the
// hotspot is wayfinding to that site's card, never a separate content id. `plane`
// names the layer it mirrors (or 'flat' for a non-parallax map).
export interface SceneHotspot {
  siteId: SiteId
  x: number
  y: number
  r: number
  plane: string
  // Optional authored label offset in master-normalized fractions (dx of master
  // width, dy of master height). Moves the LABEL only — the marker/button stays at
  // (x, y). When the displacement is ≥ LABEL_LEADER_THRESHOLD master-width a fog
  // leader line is drawn from marker to label. Used to fan apart labels whose
  // markers cluster (Case 81's three central sites).
  labelOffset?: { dx: number; dy: number }
}

export interface SceneCrop {
  window: SceneRect
  containerAspect: string
}

export type SceneWeatherKind = 'rain' | 'dust' | 'none'

// Weather config. For 'rain', `intensity[state]` is a precipitation mask
// fraction; for 'dust', `maxParticles` caps the mote count confined to
// `spawnVolumes`. Any state in `suppressed` renders no weather at all.
export interface SceneWeather {
  kind: SceneWeatherKind
  intensity: Readonly<Partial<Record<SceneStateId, number>>>
  suppressed: readonly SceneStateId[]
  spawnVolumes?: readonly SceneRect[]
  maxParticles?: number
}

// Props the (optional) case-specific diorama art component receives. The raster
// URL stays data-owned, while `figure` lets the shared stage place an optional
// composited presence inside the same moving plane group. The art component owns
// only the insertion point; SceneStage still owns the figure data and markup.
export interface SceneArtProps {
  backgroundSrc: string
  figure?: ReactNode
}

// An authored figure composited into the diorama — a seated presence in the room
// (Case 81's Ellis at the deposition table). Optional and generic: a scene with no
// figure (Case 77) authors none and nothing renders. SceneStage paints it inside
// the diorama stack; motion.ts projects its master-space anchor through the same
// crop window as the hotspots, so it sits on its plane's features at rest. It is
// value-matched into the scene by a CSS blend mode (a lit plate emerging from the
// dark — the inverse of the background's multiply), never dropped in raw. `src` is
// the only place the image path lives (kept out of shared runtime, like a layer
// raster). Per-state treatment vars are authored for all six scene states and
// cascade to the plate from the stage root exactly like the room's own state vars.
export interface SceneFigure {
  src: string
  // A declared layer name — the plane the figure conceptually registers to.
  plane: string
  // Master-normalized anchor: x is the fraction of master width, y the fraction of
  // master height of the figure's centre; height is the fraction of master height.
  x: number
  y: number
  height: number
  // CSS mix-blend-mode marrying the plate into the scene ('screen'|'lighten'|'normal').
  blend: string
  // Per scene state: the CSS custom-property set applied to the plate (opacity,
  // brightness/contrast). Every one of the six scene states must be defined.
  states: Readonly<Record<SceneStateId, SceneTreatment>>
}

// Ambient scene life driven by the single scene rAF (motion.ts): the clerestory
// light sweep crossing the far plane and the occasional amber service-strip dip.
// Authored here so the motion code holds no per-scene constants. Absent = no
// sweep, no flicker (Case 77).
export interface SceneAmbience {
  // One full left-to-right traverse of the light band, in milliseconds.
  sweepPeriodMs: number
  // Fraction of the amber strip's state opacity lost at the bottom of a dip
  // (0 = no flicker). The dip itself is time-derived in motion.ts.
  amberDipDepth: number
}

// Camera travel when a location is selected: the plane group (and its hotspot
// mirror) eases toward the selected hotspot's projected position and scales up
// slightly, holds while selected, and eases back on deselect. Composed inside
// the single scene rAF (motion.ts) — never a CSS transition, so there is still
// exactly one transform writer. ABSOLUTE authored values (no multipliers on
// small constants); the same keys for every scene, each scene tunes its own
// numbers. Absent = no travel (the rest framing holds).
export interface SceneTravel {
  // Max camera translate toward the selected hotspot, per axis, as a fraction
  // of the container (0.025 = at most 2.5% of the container width/height).
  maxOffset: number
  // Group scale while a location is selected (1.05 = a 5% push-in).
  focusScale: number
  // Ease-in duration toward the selected framing, in milliseconds.
  travelInMs: number
  // Ease-out duration back to the rest framing, in milliseconds.
  settleOutMs: number
}

// One civic-alarm tier of atmosphere, in ABSOLUTE authored values (no
// multipliers on the base scene). `hazeVeil` layers over the state treatment's
// --haze-o; the dust fields replace the weather defaults for that tier.
export interface SceneAlarmTier {
  // Extra haze opacity added to the state's own --haze-o. Tier 0 must be 0.
  hazeVeil: number
  maxParticles: number
  fallSpeed: { min: number; max: number }
}

export interface SceneDefinition {
  master: { w: number; h: number }
  perspectivePx: number
  drift: { yawDeg: number; pitchDeg: number }
  layers: readonly SceneLayer[]
  hotspots: readonly SceneHotspot[]
  crops: { desktop: SceneCrop; mobile: SceneCrop }
  safeTextZones: { desktop: readonly SceneRect[]; mobile: readonly SceneRect[] }
  states: Readonly<Record<SceneStateId, SceneTreatment>>
  weather: SceneWeather
  // The diorama plane+haze art (Case 81). Absent for a flat map (Case 77), which
  // SceneStage paints from `layers[0].raster`. A component reference, never a
  // string — invisible to the content string-walk in content.test.ts.
  LayerArt?: ComponentType<SceneArtProps>
  // Optional seated figure composited into the diorama (see SceneFigure). Absent
  // for a scene with no figure (Case 77).
  figure?: SceneFigure
  // Optional ambient sweep + amber flicker (Case 81). Presentation only.
  ambience?: SceneAmbience
  // Optional selection camera travel (both cases). Presentation only: it never
  // gates the location panel, focus management, or any engine dispatch.
  travel?: SceneTravel
  // Optional alarm-driven atmosphere, exactly four tiers indexed by the
  // engine's clamped 0–3 alarm. Tier 0 must reproduce the base look exactly.
  alarm?: readonly [SceneAlarmTier, SceneAlarmTier, SceneAlarmTier, SceneAlarmTier]
}

// A complete, self-contained dossier the engine and components resolve through
// GameState.caseId. Personas and the method vocabulary stay global (same cast,
// same verbs across every case); everything case-specific lives here.
export interface CaseDefinition {
  id: string
  // Short human label, e.g. 'Case 77'. Used in announcements and the tab title.
  label: string
  caseFile: CaseFile
  chrome: CaseChrome
  approaches: readonly ApproachDefinition[]
  evidenceDefinitions: readonly EvidenceDefinition[]
  fieldActions: readonly FieldActionDefinition[]
  sites: readonly SiteDefinition[]
  fragments: readonly FragmentDefinition[]
  fragmentEvidenceLinks: Readonly<Record<FragmentId, readonly EvidenceId[]>>
  reconstructionDefinitions: readonly ReconstructionDefinition[]
  decisions: readonly DecisionDefinition[]
  // Which model two anchors resolve to. Pure, order-independent.
  getReconstructionForFragments: (fragmentIds: readonly FragmentId[]) => ReconstructionId
  // One authored line for every reconstruction × decision pairing.
  reconstructionDecisionTensions: Readonly<Record<ReconstructionId, Record<DecisionId, string>>>
  // The Mirror's briefing aside for the prior run's decision (keyed by THIS
  // case's decision ids; the reader picks the map of the prior run's case).
  mirrorBriefingAsides: Readonly<Record<DecisionId, string>>
  // Debrief consequence lines, keyed by this case's decision ids.
  decisionConsequences: Readonly<Record<DecisionId, readonly string[]>>
  // Debrief persona reflection, given the resolved run state.
  getPersonaReflection: (personaId: PersonaId, state: GameState) => string
  // Optional cross-case precedent citation shown at this case's tribunal.
  precedentSource?: PrecedentSource
  // Optional cross-case precedent EFFECTS: a prior verdict alters this case's
  // field-action copy/alarm (see PrecedentEffect). Resolved through
  // resolveFieldAction; absent/empty means no field action ever changes.
  precedentEffects?: readonly PrecedentEffect[]
  // Optional bounded transcript interaction authored at one field site.
  deposition?: DepositionDefinition
  // Optional debrief revelation authored per verdict path (and, when a deposition
  // was taken, per consent). Returns null when the case authors no revelation for
  // the resolved state. Read view-side by the Debrief; the engine never calls it.
  getRevelation?: (state: GameState) => string | null
  // Scene direction for this case (investigation diorama/map + tribunal/debrief
  // world window). Pure interpretation of state; the reducer owns everything.
  scene: SceneDefinition
}

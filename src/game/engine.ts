import {
  DEFAULT_CASE_ID,
  getCaseContent,
  isRegisteredCase,
  methodLabels,
  personas,
  resolveDepositionUse,
  resolveFieldAction,
} from './content'
// Save-schema constants live with the persistence layer (the single source of
// truth). Importing them here keeps the version the engine stamps and the run
// cap it enforces in lockstep with decode/migrate. persistence never imports
// engine, so there is no cycle.
import { CURRENT_SAVE_SCHEMA, MAX_PREVIOUS_RUNS } from './persistence'
import type {
  AccessibilitySettings,
  CaseDefinition,
  FieldActionId,
  FragmentDiscoveryDefinition,
  GameAction,
  GameEvent,
  GameState,
  FragmentId,
  PersonaId,
  ReconstructionId,
  RunSummary,
  SecretId,
} from './types'

export const defaultAccessibilitySettings: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  textSize: 'standard',
  showTrustNumbers: false,
  ambientSound: false,
  easyRead: false,
  subtitlePlate: false,
}

const emptyTrust: Record<PersonaId, number> = {
  registrar: 0,
  shepherd: 0,
  defector: 0,
  archivist: 0,
}

function createRunState(
  caseId: string,
  runNumber: number,
  previousRuns: RunSummary[],
  settings: AccessibilitySettings,
  precedents: Record<string, string> = {},
  caseOutcomes: Record<string, Record<string, string>> = {},
  discoveredSecretIds: SecretId[] = [],
): GameState {
  return {
    schemaVersion: CURRENT_SAVE_SCHEMA,
    caseId,
    phase: 'briefing',
    runNumber,
    primaryApproach: null,
    completedSites: [],
    completedActions: [],
    evidence: [],
    methodTags: [],
    trust: { ...emptyTrust },
    alarm: 0,
    tribunalOverride: false,
    selectedFragments: [],
    reconstruction: null,
    tribunalChoice: null,
    decision: null,
    depositionRecord: null,
    events: [],
    previousRuns,
    precedents: { ...precedents },
    caseOutcomes: Object.fromEntries(
      Object.entries(caseOutcomes).map(([outcomeCaseId, facts]) => [
        outcomeCaseId,
        { ...facts },
      ]),
    ),
    discoveredSecretIds: [...discoveredSecretIds],
    settings: { ...settings },
    announcement: `${getCaseContent(caseId).label}, run ${runNumber}, opened.`,
  }
}

export function createInitialGameState(
  settings: AccessibilitySettings = defaultAccessibilitySettings,
): GameState {
  return {
    ...createRunState(DEFAULT_CASE_ID, 1, [], settings),
    phase: 'landing',
    announcement: 'The Annex is ready.',
  }
}

function clampTrust(value: number): number {
  return Math.max(-5, Math.min(5, value))
}

function applyTrust(
  current: Record<PersonaId, number>,
  deltas: Partial<Record<PersonaId, number>>,
): Record<PersonaId, number> {
  const next = { ...current }

  for (const personaId of Object.keys(deltas) as PersonaId[]) {
    next[personaId] = clampTrust(next[personaId] + (deltas[personaId] ?? 0))
  }

  return next
}

// Sum a set of trust-delta maps into one. Used by COMMIT_DEPOSITION so the base
// action, every beat choice, and the consent ask fold into a single delta map —
// applied once (clamped once) and reported once in the event detail.
function mergeTrustDeltas(
  maps: readonly Partial<Record<PersonaId, number>>[],
): Partial<Record<PersonaId, number>> {
  const merged: Partial<Record<PersonaId, number>> = {}
  for (const map of maps) {
    for (const personaId of Object.keys(map) as PersonaId[]) {
      merged[personaId] = (merged[personaId] ?? 0) + (map[personaId] ?? 0)
    }
  }
  return merged
}

function addUnique<T>(current: T[], additions: T[]): T[] {
  return [...new Set([...current, ...additions])]
}

const personaDisplayNames = Object.fromEntries(
  personas.map((persona) => [persona.id, persona.name.replace(/^The /, '')]),
) as Record<PersonaId, string>

function signedDelta(value: number): string {
  return value > 0 ? `+${value}` : `−${Math.abs(value)}`
}

function nonzeroTrustParts(deltas: Partial<Record<PersonaId, number>>): string[] {
  return personas
    .filter((persona) => (deltas[persona.id] ?? 0) !== 0)
    .map((persona) => `${personaDisplayNames[persona.id]} ${signedDelta(deltas[persona.id] as number)}`)
}

function describeTrustDeltas(deltas: Partial<Record<PersonaId, number>>): string {
  const parts = nonzeroTrustParts(deltas)
  return parts.length > 0 ? ` — ${parts.join(', ')}.` : ''
}

function describeResidueDeltas(deltas: Partial<Record<PersonaId, number>>): string {
  const parts = nonzeroTrustParts(deltas)
  return parts.length > 0 ? ` Residue: ${parts.join(', ')}.` : ''
}

function appendEvent(
  state: GameState,
  event: Omit<GameEvent, 'id' | 'order'>,
): GameEvent[] {
  const order = state.events.length + 1
  return [
    ...state.events,
    {
      ...event,
      id: `run-${state.runNumber}-event-${order}`,
      order,
    },
  ]
}

function buildRunSummary(state: GameState): RunSummary | null {
  if (!state.decision || !state.primaryApproach) return null

  return {
    runNumber: state.runNumber,
    caseId: state.caseId,
    decision: state.decision,
    primaryApproach: state.primaryApproach,
    methodTags: [...state.methodTags],
    evidenceCount: state.evidence.length,
    alarm: state.alarm,
    trust: { ...state.trust },
  }
}

function buildRunResidue(previousRun: RunSummary | undefined): {
  trust: Partial<Record<PersonaId, number>>
  detail: string
} {
  if (!previousRun) return { trust: {}, detail: '' }

  const trust = Object.fromEntries(
    (Object.entries(previousRun.trust) as [PersonaId, number][]).map(([personaId, value]) => [
      personaId,
      value >= 2 ? 1 : value <= -2 ? -1 : 0,
    ]),
  ) as Record<PersonaId, number>
  const rememberedMethods = previousRun.methodTags
    .filter((method) => method !== 'nonlethal' && method !== 'puzzle')
    .slice(0, 3)
    .map((method) => methodLabels[method].toLowerCase())
    .join(', ')
  const methodDetail = rememberedMethods
    ? ` The people in this file retain traces of your ${rememberedMethods} methods.`
    : ''

  return { trust, detail: methodDetail }
}

// Validate authored campaign exports at the engine boundary. A case either
// produces every declared fact with an allowed value or its verdict is rejected;
// the UI can submit only the verdict and authored tribunal choice, never facts.
function resolveOutcomeFacts(
  content: CaseDefinition,
  state: GameState,
  decisionId: string,
): Record<string, string> | null {
  const definitions = content.outcomeFactDefinitions ?? []
  if (definitions.length === 0) return {}
  if (!content.getOutcomeFacts) return null

  const resolved = content.getOutcomeFacts(state, decisionId)
  const allowedIds = new Set(definitions.map((definition) => definition.id))
  if (Object.keys(resolved).some((factId) => !allowedIds.has(factId))) return null

  const facts: Record<string, string> = {}
  for (const definition of definitions) {
    const value = resolved[definition.id]
    if (!definition.values.some((option) => option.id === value)) return null
    facts[definition.id] = value
  }
  return facts
}

// Filing capacity is a deterministic case rule, not a UI convention. Historical
// saves may already contain more sites than a current case permits; they remain
// readable and playable, but cannot add a new distinct site.
export function hasFieldSiteCapacity(state: GameState): boolean {
  return state.completedSites.length < getCaseContent(state.caseId).fieldSiteLimit
}

// Whether this exact site can enter the filed record now. A completed site is
// intentionally false: it remains inspectable in presentation, but never gains
// a second resolution path through the reducer.
export function canCommitNewFieldSite(state: GameState, siteId: string): boolean {
  return !state.completedSites.includes(siteId) && hasFieldSiteCapacity(state)
}

export function canEnterTribunal(state: GameState): boolean {
  const { fieldSiteLimit } = getCaseContent(state.caseId)
  return state.completedSites.length >= fieldSiteLimit && state.reconstruction !== null
}

// An anchor's epistemic status is derived only from the active case's authored
// discovery records and the evidence currently filed in this run. It is never
// persisted separately: that keeps historical saves serializable while making a
// stale or cross-case fragment safe to display as unknown.
export type FragmentKnowledge = 'unknown' | 'discovered' | 'corroborated'

function discoveryIsFiled(state: GameState, discovery: FragmentDiscoveryDefinition): boolean {
  if (discovery.actionId) return state.completedActions.includes(discovery.actionId)
  return state.completedSites.includes(discovery.siteId)
}

// Source-aware discovery records currently established by the filed route. This
// selector is the shared authority for the lattice, the filed result, and tests;
// no component guesses that visiting a location must have revealed an anchor.
export function getFiledFragmentDiscoveries(
  state: GameState,
  fragmentId: FragmentId,
): readonly FragmentDiscoveryDefinition[] {
  const content = getCaseContent(state.caseId)
  return content.fragmentDiscoveries.filter(
    (discovery) => discovery.fragmentId === fragmentId && discoveryIsFiled(state, discovery),
  )
}

// The records that a successful action would add to the player-visible filed
// result. The reducer calls this before appending the action, so a previously
// established anchor is never announced as newly learned a second time.
export function getNewFragmentDiscoveriesForAction(
  state: GameState,
  actionId: FieldActionId,
): readonly FragmentDiscoveryDefinition[] {
  const content = getCaseContent(state.caseId)
  const action = content.fieldActions.find((item) => item.id === actionId)
  if (!action) return []

  const seenFragmentIds = new Set(
    content.fragments
      .filter((fragment) => getFiledFragmentDiscoveries(state, fragment.id).length > 0)
      .map((fragment) => fragment.id),
  )
  const includedFragmentIds = new Set<FragmentId>()
  return content.fragmentDiscoveries.filter((discovery) => {
    const belongsToAction = discovery.actionId
      ? discovery.actionId === actionId
      : discovery.siteId === action.siteId
    if (!belongsToAction || seenFragmentIds.has(discovery.fragmentId)) return false
    if (includedFragmentIds.has(discovery.fragmentId)) return false
    includedFragmentIds.add(discovery.fragmentId)
    return true
  })
}

function describeNewFragmentDiscoveries(
  state: GameState,
  actionId: FieldActionId,
): string {
  const content = getCaseContent(state.caseId)
  const records = getNewFragmentDiscoveriesForAction(state, actionId)
  if (records.length === 0) return ''
  const lines = records.map((record) => {
    const fragment = content.fragments.find((item) => item.id === record.fragmentId)
    return `${fragment?.title ?? record.fragmentId} — ${record.source}: ${record.reveal}`
  })
  return ` Anchors revealed: ${lines.join(' ')}`
}

export function getFragmentKnowledge(
  state: GameState,
  fragmentId: FragmentId,
): FragmentKnowledge {
  const content = getCaseContent(state.caseId)
  if (!content.fragments.some((fragment) => fragment.id === fragmentId)) return 'unknown'

  const discovered = getFiledFragmentDiscoveries(state, fragmentId).length > 0
  if (!discovered) return 'unknown'

  const corroborated = (content.fragmentEvidenceLinks[fragmentId] ?? []).some((evidenceId) =>
    state.evidence.includes(evidenceId),
  )
  return corroborated ? 'corroborated' : 'discovered'
}

// A model is meaningful only when it compares exactly two anchors the player has
// actually encountered, with at least one anchor supported by this run's filed
// evidence. `getReconstructionForFragments` is intentionally called only after
// this gate; it remains the authored interpretation of a valid pair, not a
// permissive validator for arbitrary ids.
export function isValidReconstructionPair(
  state: GameState,
  fragmentIds: readonly FragmentId[],
): boolean {
  if (fragmentIds.length !== 2) return false

  const [firstFragmentId, secondFragmentId] = fragmentIds
  if (!firstFragmentId || !secondFragmentId || firstFragmentId === secondFragmentId) return false

  const validFragmentIds = new Set(
    getCaseContent(state.caseId).fragments.map((fragment) => fragment.id),
  )
  if (!validFragmentIds.has(firstFragmentId) || !validFragmentIds.has(secondFragmentId)) {
    return false
  }

  const knowledge = [
    getFragmentKnowledge(state, firstFragmentId),
    getFragmentKnowledge(state, secondFragmentId),
  ]
  return (
    knowledge.every((status) => status !== 'unknown') &&
    knowledge.some((status) => status === 'corroborated')
  )
}

export function canOpenReconstruction(state: GameState): boolean {
  if (state.phase !== 'investigation' || state.reconstruction) return false

  const content = getCaseContent(state.caseId)
  if (state.completedSites.length < content.fieldSiteLimit) return false

  const fragmentIds = content.fragments.map((fragment) => fragment.id)
  for (let left = 0; left < fragmentIds.length; left += 1) {
    for (let right = left + 1; right < fragmentIds.length; right += 1) {
      const firstFragmentId = fragmentIds[left]
      const secondFragmentId = fragmentIds[right]
      if (
        firstFragmentId &&
        secondFragmentId &&
        isValidReconstructionPair(state, [firstFragmentId, secondFragmentId])
      ) {
        return true
      }
    }
  }

  return false
}

export interface ReconstructionPreview {
  modelId: ReconstructionId
  title: string
  thesis: string
  limitation: string
  corroboratedAnchors: number
  supportStatus: 'one corroborated anchor' | 'two corroborated anchors'
}

// The reconstruction preview is intentionally sparse: it describes only the
// argument the selected pair will file and the support already in the record.
// Trust shifts, reactions, decision alignment, and outcomes remain undisclosed
// until their own authored phase.
export function getReconstructionPreview(
  state: GameState,
  fragmentIds: readonly FragmentId[] = state.selectedFragments,
): ReconstructionPreview | null {
  const content = getCaseContent(state.caseId)
  if (state.completedSites.length < content.fieldSiteLimit) return null
  if (!isValidReconstructionPair(state, fragmentIds)) return null

  const modelId = content.getReconstructionForFragments(fragmentIds)
  const definition = content.reconstructionDefinitions.find((item) => item.id === modelId)
  if (!definition) return null

  const corroboratedAnchors = fragmentIds.filter(
    (fragmentId) => getFragmentKnowledge(state, fragmentId) === 'corroborated',
  ).length
  return {
    modelId,
    title: definition.title,
    thesis: definition.thesis,
    limitation: definition.limitation,
    corroboratedAnchors,
    supportStatus:
      corroboratedAnchors === 2 ? 'two corroborated anchors' : 'one corroborated anchor',
  }
}

export function hasDiscoveredSecret(state: GameState, secretId: SecretId): boolean {
  return state.discoveredSecretIds.includes(secretId)
}

// Secrets are a deterministic campaign side-channel. This selector is the one
// authority shared by reducer and UI: an authored item must belong to the active
// case, permit the current phase, have its filed site (when any), and have every
// prerequisite already retained. No clock, hover, random roll, or model proposal
// can make one available.
export function canDiscoverSecret(state: GameState, secretId: SecretId): boolean {
  const definition = getCaseContent(state.caseId).secrets?.find(
    (item) => item.id === secretId,
  )
  if (!definition || hasDiscoveredSecret(state, secretId)) return false
  if (!definition.availablePhases.includes(state.phase)) return false
  if (definition.siteId && !state.completedSites.includes(definition.siteId)) return false
  return (definition.requiresSecretIds ?? []).every((requiredId) =>
    hasDiscoveredSecret(state, requiredId),
  )
}

export function getTrustLabel(value: number): string {
  if (value >= 4) return 'committed'
  if (value >= 2) return 'open'
  if (value <= -4) return 'opposed'
  if (value <= -2) return 'guarded'
  return 'uncertain'
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_NEW':
      return createRunState(DEFAULT_CASE_ID, 1, [], state.settings)

    case 'RESTORE':
      return {
        ...action.state,
        settings: state.settings,
        announcement: `Local case restored at ${action.state.phase}.`,
      }

    case 'SELECT_APPROACH': {
      if (state.phase !== 'briefing' || state.primaryApproach) return state

      const approach = getCaseContent(state.caseId).approaches.find(
        (item) => item.id === action.approachId,
      )
      if (!approach) return state

      const previousRun = state.previousRuns.at(-1)
      // The prior run may belong to a different case; resolve its decision copy
      // from that run's own case (the personas — and the Mirror — cross cases).
      const priorDecision = getCaseContent(previousRun?.caseId ?? DEFAULT_CASE_ID).decisions.find(
        (item) => item.id === previousRun?.decision,
      )
      const runResidue = buildRunResidue(previousRun)
      const residue = priorDecision
        ? ` A voice beneath the terminal adds: “Last time: ${priorDecision.shortLabel.toLowerCase()}.”${runResidue.detail}`
        : ''

      return {
        ...state,
        phase: 'investigation',
        primaryApproach: approach.id,
        trust: applyTrust(applyTrust(state.trust, runResidue.trust), approach.trust),
        methodTags: addUnique(state.methodTags, [...approach.methodTags]),
        events: appendEvent(state, {
          sourceType: 'approach',
          sourceId: approach.id,
          title: approach.title,
          detail: `${approach.description}${residue}${describeTrustDeltas(approach.trust)}${describeResidueDeltas(runResidue.trust)}`,
          tone: 'neutral',
          methodTags: [...approach.methodTags],
        }),
        announcement: `${approach.title}. Investigation sites are available.`,
      }
    }

    case 'COMMIT_FIELD_ACTION': {
      if (state.phase !== 'investigation') return state

      const content = getCaseContent(state.caseId)
      // An authored deposition entry must pass through the transcript resolver.
      // A plain field commit would otherwise bypass the witness's use boundary.
      if (content.deposition?.entryActionIds.includes(action.actionId)) return state

      // Resolve to the EFFECTIVE definition: a prior-case verdict may override
      // this action's alarm/hint/detail/reactions. Identity when no precedent
      // applies, so unaffected actions commit byte-for-byte as before.
      const definition = resolveFieldAction(
        content,
        action.actionId,
        state.precedents,
      )
      if (!definition || !canCommitNewFieldSite(state, definition.siteId)) return state

      const discoveredAnchors = describeNewFragmentDiscoveries(state, definition.id)

      const nextAlarm = Math.max(0, Math.min(3, state.alarm + definition.alarmDelta))

      return {
        ...state,
        completedSites: [...state.completedSites, definition.siteId],
        completedActions: [...state.completedActions, definition.id],
        evidence: addUnique(state.evidence, [definition.evidenceId]),
        methodTags: addUnique(state.methodTags, definition.methodTags),
        trust: applyTrust(state.trust, definition.trust),
        alarm: nextAlarm,
        tribunalOverride: state.tribunalOverride || definition.grantsTribunalOverride,
        events: appendEvent(state, {
          sourceType: 'field-action',
          sourceId: definition.id,
          title: definition.eventTitle,
          detail: `${definition.eventDetail}${discoveredAnchors}${describeTrustDeltas(definition.trust)}`,
          tone: definition.alarmDelta > 0 ? 'warning' : 'neutral',
          methodTags: definition.methodTags,
        }),
        announcement: `${definition.eventTitle}. New evidence added${discoveredAnchors ? '; anchors added to the filed record.' : '.'}`,
      }
    }

    case 'DISCOVER_SECRET': {
      if (!canDiscoverSecret(state, action.secretId)) return state
      const definition = getCaseContent(state.caseId).secrets?.find(
        (item) => item.id === action.secretId,
      )
      if (!definition) return state

      return {
        ...state,
        discoveredSecretIds: [...state.discoveredSecretIds, definition.id],
        announcement: definition.announcement,
      }
    }

    case 'COMMIT_DEPOSITION': {
      if (state.phase !== 'investigation') return state

      const content = getCaseContent(state.caseId)
      const deposition = content.deposition
      if (!deposition || !deposition.entryActionIds.includes(action.actionId)) return state

      // Resolve the deposition's underlying entry action through the same seam as
      // COMMIT_FIELD_ACTION, so a precedent that overrides an entry action's
      // alarm/detail would apply here too (identity for today's entry actions).
      const definition = resolveFieldAction(content, action.actionId, state.precedents)
      if (!definition || !canCommitNewFieldSite(state, definition.siteId)) return state

      const discoveredAnchors = describeNewFragmentDiscoveries(state, definition.id)

      // The committed beats must match the authored skeleton one-for-one: same
      // count, and each choice valid for its beat. Validate and resolve each beat
      // to its authored choice in a single pass; any mismatch is a no-op.
      if (action.beats.length !== deposition.statementBeats.length) return state
      const beatChoices = []
      for (const [index, beat] of deposition.statementBeats.entries()) {
        const choice = beat.choices.find((item) => item.id === action.beats[index])
        if (!choice) return state
        beatChoices.push(choice)
      }

      const useResolution = resolveDepositionUse(
        deposition,
        action.actionId,
        action.beats,
        action.askedConsent,
      )

      // Fold the base action, every beat choice, and the consent ask into one
      // delta map and one method-tag set — applied and reported once.
      const deltas = mergeTrustDeltas([
        definition.trust,
        ...beatChoices.map((choice) => choice.trust),
        ...(action.askedConsent ? [deposition.consent.askEffect.trust] : []),
      ])
      const committedMethodTags = addUnique(definition.methodTags, [
        ...beatChoices.flatMap((choice) => choice.methodTags),
        ...(action.askedConsent ? deposition.consent.askEffect.methodTags : []),
      ])
      const methodTags = addUnique(state.methodTags, committedMethodTags)

      const transcriptDetail = `${beatChoices.map((choice) => choice.summary).join(' ')} ${useResolution.summary}`

      const nextAlarm = Math.max(0, Math.min(3, state.alarm + definition.alarmDelta))

      return {
        ...state,
        completedSites: [...state.completedSites, definition.siteId],
        completedActions: [...state.completedActions, definition.id],
        evidence: addUnique(state.evidence, [definition.evidenceId]),
        methodTags,
        trust: applyTrust(state.trust, deltas),
        alarm: nextAlarm,
        tribunalOverride: state.tribunalOverride || definition.grantsTribunalOverride,
        depositionRecord: {
          actionId: definition.id,
          beats: [...action.beats],
          askedConsent: action.askedConsent,
          consent: useResolution.consent,
          testimonyUse: useResolution.testimonyUse,
        },
        events: appendEvent(state, {
          sourceType: 'field-action',
          sourceId: definition.id,
          title: definition.eventTitle,
          detail: `${transcriptDetail}${discoveredAnchors}${describeTrustDeltas(deltas)}`,
          tone: definition.alarmDelta > 0 ? 'warning' : 'neutral',
          methodTags: committedMethodTags,
        }),
        announcement: `${definition.eventTitle}. Testimony recorded${discoveredAnchors ? '; anchors added to the filed record.' : '.'}`,
      }
    }

    case 'OPEN_RECONSTRUCTION':
      if (!canOpenReconstruction(state)) return state
      return {
        ...state,
        phase: 'reconstruction',
        selectedFragments: [],
        announcement: 'Memory lattice opened. Select two known anchors.',
      }

    case 'TOGGLE_FRAGMENT': {
      if (state.phase !== 'reconstruction') return state

      const alreadySelected = state.selectedFragments.includes(action.fragmentId)
      // Always let legacy selections escape, even when an old or malformed save
      // contains a foreign or now-sealed id. This branch deliberately runs
      // before validation so it can only remove, never admit, such an anchor.
      if (alreadySelected) {
        const selectedFragments = state.selectedFragments.filter(
          (fragmentId) => fragmentId !== action.fragmentId,
        )
        return {
          ...state,
          selectedFragments,
          announcement: `${selectedFragments.length} of 2 anchors selected.`,
        }
      }

      if (getFragmentKnowledge(state, action.fragmentId) === 'unknown') {
        return {
          ...state,
          announcement: 'That anchor is sealed. File a listed location before selecting it.',
        }
      }

      if (state.selectedFragments.length >= 2) {
        return {
          ...state,
          announcement: 'Two anchors are already selected. Remove one to change the model.',
        }
      }

      const selectedFragments = [...state.selectedFragments, action.fragmentId]

      return {
        ...state,
        selectedFragments,
        announcement: `${selectedFragments.length} of 2 anchors selected.`,
      }
    }

    case 'SUBMIT_RECONSTRUCTION': {
      if (state.phase !== 'reconstruction') return state
      const preview = getReconstructionPreview(state, state.selectedFragments)
      if (!preview) {
        return {
          ...state,
          announcement:
            'Cannot file this reconstruction. Select two known anchors with at least one corroborated by your field record.',
        }
      }

      const content = getCaseContent(state.caseId)
      const reconstructionId = preview.modelId
      const definition = content.reconstructionDefinitions.find((item) => item.id === reconstructionId)
      if (!definition) return state
      const corroboratedAnchors = preview.corroboratedAnchors

      return {
        ...state,
        phase: 'investigation',
        reconstruction: reconstructionId,
        evidence: addUnique(state.evidence, [definition.evidenceId]),
        methodTags: addUnique(state.methodTags, ['puzzle']),
        trust: applyTrust(state.trust, definition.trust),
        events: appendEvent(state, {
          sourceType: 'reconstruction',
          sourceId: reconstructionId,
          title: `${definition.title} model filed`,
          detail: `${definition.thesis} ${corroboratedAnchors} of 2 anchors were corroborated by your field record.${describeTrustDeltas(definition.trust)}`,
          tone:
            definition.unresolvedTone || corroboratedAnchors === 0 ? 'warning' : 'positive',
          methodTags: ['puzzle'],
        }),
        announcement: `${definition.title} filed as evidence.`,
      }
    }

    case 'ENTER_TRIBUNAL':
      if (state.phase !== 'investigation' || !canEnterTribunal(state)) return state
      return {
        ...state,
        phase: 'tribunal',
        announcement: 'Tribunal channel open. Your next action resolves the case.',
      }

    case 'RETURN_TO_INVESTIGATION':
      if (state.phase !== 'tribunal' && state.phase !== 'reconstruction') return state
      return {
        ...state,
        phase: 'investigation',
        announcement: 'Returned to the field record.',
      }

    case 'SET_TRIBUNAL_CHOICE': {
      if (state.phase !== 'tribunal' || state.decision) return state
      const definition = getCaseContent(state.caseId).tribunalChoice
      if (!definition?.options.some((option) => option.id === action.choiceId)) return state
      const option = definition.options.find((item) => item.id === action.choiceId)
      return {
        ...state,
        tribunalChoice: action.choiceId,
        announcement: option ? `${definition.legend}: ${option.label}.` : state.announcement,
      }
    }

    case 'DECIDE': {
      if (state.phase !== 'tribunal' || state.decision) return state

      const content = getCaseContent(state.caseId)
      const decision = content.decisions.find((item) => item.id === action.decisionId)
      if (!decision || (decision.requiresOverride && !state.tribunalOverride)) return state
      if (
        content.tribunalChoice &&
        !content.tribunalChoice.options.some((option) => option.id === state.tribunalChoice)
      ) {
        return state
      }
      const outcomeFacts = resolveOutcomeFacts(content, state, decision.id)
      if (!outcomeFacts) return state

      return {
        ...state,
        phase: 'debrief',
        decision: decision.id,
        // Record this run's verdict as the case precedent for later runs/cases.
        precedents: { ...state.precedents, [state.caseId]: decision.id },
        caseOutcomes: {
          ...state.caseOutcomes,
          [state.caseId]: outcomeFacts,
        },
        methodTags: addUnique(state.methodTags, [...decision.methodTags]),
        events: appendEvent(state, {
          sourceType: 'decision',
          sourceId: decision.id,
          title: decision.title,
          detail: decision.cost,
          tone: decision.tone,
          methodTags: [...decision.methodTags],
        }),
        announcement: `${decision.shortLabel}. ${content.label} is resolved for this run.`,
      }
    }

    case 'START_NEXT_RUN': {
      if (state.phase !== 'debrief') return state
      const summary = buildRunSummary(state)
      if (!summary) return state

      // Cap run history at push time, keeping the most recent runs. Residue
      // reads .at(-1), so trimming the oldest entries changes nothing observable.
      const previousRuns = [...state.previousRuns, summary].slice(-MAX_PREVIOUS_RUNS)
      return createRunState(
        state.caseId,
        state.runNumber + 1,
        previousRuns,
        state.settings,
        state.precedents,
        state.caseOutcomes,
        state.discoveredSecretIds,
      )
    }

    case 'START_CASE': {
      // Switch to (or restart) any registered case, carrying precedents, capped
      // run history, and cross-run residue exactly as START_NEXT_RUN does — the
      // personas are the same people, so their memory follows across cases.
      // Unknown case ids are ignored. Case-77 progress is never destroyed:
      // previousRuns and precedents persist, so START_CASE back to case-77 works
      // symmetrically.
      if (!isRegisteredCase(action.caseId)) return state

      // If the current run is complete, fold it into history (and advance the
      // global loop counter) so the next case's residue reads it; otherwise
      // carry history untouched and keep the counter where it is.
      const summary = buildRunSummary(state)
      const previousRuns = summary
        ? [...state.previousRuns, summary].slice(-MAX_PREVIOUS_RUNS)
        : state.previousRuns
      const nextRunNumber = summary ? state.runNumber + 1 : state.runNumber

      return createRunState(
        action.caseId,
        nextRunNumber,
        previousRuns,
        state.settings,
        state.precedents,
        state.caseOutcomes,
        state.discoveredSecretIds,
      )
    }

    case 'RETURN_TO_TITLE':
      return {
        ...state,
        phase: 'landing',
        announcement: 'Returned to title.',
      }

    case 'UPDATE_SETTING': {
      const settings = { ...state.settings }

      if (action.setting === 'textSize') {
        if (action.value !== 'standard' && action.value !== 'large') return state
        settings.textSize = action.value
      } else {
        if (typeof action.value !== 'boolean') return state
        settings[action.setting] = action.value
      }

      return {
        ...state,
        settings,
        announcement: 'Accessibility preference updated.',
      }
    }
  }
}

import {
  DEFAULT_CASE_ID,
  getCaseContent,
  isRegisteredCase,
  personas,
  getRegisteredSecret,
  registeredSecretIds,
  resolveDepositionUse,
} from './content'
import type {
  AccessibilitySettings,
  CaseDefinition,
  DepositionChoiceId,
  DepositionConsent,
  DepositionRecord,
  DepositionTestimonyUse,
  GameEvent,
  GamePhase,
  GameState,
  MethodTag,
  PersonaId,
  RunSummary,
} from './types'

// The '.v1' here is a HISTORICAL localStorage KEY NAME, not the save-schema
// version. It is deliberately frozen: renaming it would orphan every existing
// player save under the old key. The schema version lives INSIDE the payload as
// `schemaVersion` (see CURRENT_SAVE_SCHEMA) and is what migrations key off of.
// Do not "fix" this to '.v2'.
const SAVE_KEY = 'the-annex.case-77.save.v1'
const SETTINGS_KEY = 'the-annex.accessibility.v1'

// The save-schema version this build reads and writes. Single source of truth
// for encode (engine stamps fresh state with it), decode (strict current validation
// below), migrateRawSave, and tests. Bump this by ONE when the shape changes,
// and add the matching from->to entry to saveMigrations.
export const CURRENT_SAVE_SCHEMA = 3

// Upper bound on retained run history. previousRuns is capped at push time in
// the engine (START_NEXT_RUN) and any oversized legacy array is truncated by
// the 1->2 migration, so a long-lived save can never grow without bound. Only
// the most recent runs are kept; cross-run residue reads .at(-1).
export const MAX_PREVIOUS_RUNS = 20

const validPhases = new Set<GamePhase>([
  'landing',
  'briefing',
  'investigation',
  'reconstruction',
  'tribunal',
  'debrief',
])

// Content-item ids are per-case now, so their valid sets are built from the
// case a payload declares — not from a global union. A save is only accepted
// against ITS OWN case's vocabulary, which is stricter than a union would be.
interface CaseIdSets {
  approaches: Set<string>
  sites: Set<string>
  fieldActions: Set<string>
  evidence: Set<string>
  fragments: Set<string>
  reconstructions: Set<string>
  decisions: Set<string>
}

function buildCaseIdSets(content: CaseDefinition): CaseIdSets {
  return {
    approaches: new Set(content.approaches.map((item) => item.id)),
    sites: new Set(content.sites.map((item) => item.id)),
    fieldActions: new Set(content.fieldActions.map((item) => item.id)),
    evidence: new Set(content.evidenceDefinitions.map((item) => item.id)),
    fragments: new Set(content.fragments.map((item) => item.id)),
    reconstructions: new Set(content.reconstructionDefinitions.map((item) => item.id)),
    decisions: new Set(content.decisions.map((item) => item.id)),
  }
}

const validPersonas = personas.map((item) => item.id)
const validMethodTags = new Set<MethodTag>([
  'procedure',
  'negotiation',
  'stealth',
  'systems',
  'puzzle',
  'nonlethal',
  'fraud',
  'care',
  'coercion',
])
const validEventSourceTypes = new Set<GameEvent['sourceType']>([
  'approach',
  'field-action',
  'reconstruction',
  'decision',
])
const validSecretIds = new Set(registeredSecretIds)
const validDepositionChoices = new Set<DepositionChoiceId>([
  'let-it-stand',
  'interrupt',
  'corroborate',
])
const validDepositionConsent = new Set<DepositionConsent>(['yes', 'no', 'unasked'])
const validDepositionTestimonyUses = new Set<DepositionTestimonyUse>([
  'voluntary-office',
  'protected-hand',
  'refused',
  'unasked',
  'compelled',
  'unknown',
])

let storageAvailable = true
const storageListeners = new Set<() => void>()

function publishStorageAvailability(available: boolean): void {
  if (storageAvailable === available) return
  storageAvailable = available
  storageListeners.forEach((listener) => listener())
}

export function subscribeStorageAvailability(listener: () => void): () => void {
  storageListeners.add(listener)
  return () => storageListeners.delete(listener)
}

export function getStorageAvailability(): boolean {
  return storageAvailable
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isUniqueArrayOf<T extends string>(value: unknown, allowed: Set<T>): value is T[] {
  return (
    Array.isArray(value) &&
    value.every((item): item is T => typeof item === 'string' && allowed.has(item as T)) &&
    new Set(value).size === value.length
  )
}

function isTrustState(value: unknown): value is Record<PersonaId, number> {
  if (!isRecord(value)) return false
  return validPersonas.every((personaId) => {
    const trust = value[personaId]
    return isFiniteNumber(trust) && trust >= -5 && trust <= 5
  })
}

export function decodeAccessibilitySettings(value: unknown): AccessibilitySettings | null {
  if (!isRecord(value)) return null
  if (typeof value.reducedMotion !== 'boolean') return null
  if (typeof value.highContrast !== 'boolean') return null
  if (value.textSize !== 'standard' && value.textSize !== 'large') return null
  if (typeof value.showTrustNumbers !== 'boolean') return null
  // ambientSound is optional-tolerated: absent decodes to false (older stored
  // settings keep loading), the same treatment RunSummary.caseId gets. When
  // present it must be a boolean — a malformed value rejects the whole blob,
  // matching the strict treatment every other field gets.
  if (value.ambientSound !== undefined && typeof value.ambientSound !== 'boolean') return null
  // easyRead and subtitlePlate follow ambientSound exactly. This matters more
  // than it looks: decodeGameState rejects the WHOLE save when the settings blob
  // fails, so a strictly-required field here would cost every existing player
  // their precedents, previous runs and run number. Absent → default; present
  // but malformed → reject, like every other field.
  if (value.easyRead !== undefined && typeof value.easyRead !== 'boolean') return null
  if (value.subtitlePlate !== undefined && typeof value.subtitlePlate !== 'boolean') return null

  return {
    reducedMotion: value.reducedMotion,
    highContrast: value.highContrast,
    textSize: value.textSize,
    showTrustNumbers: value.showTrustNumbers,
    ambientSound: value.ambientSound ?? false,
    easyRead: value.easyRead ?? false,
    subtitlePlate: value.subtitlePlate ?? false,
  }
}

function isGameEvent(value: unknown, expectedOrder: number, sets: CaseIdSets): value is GameEvent {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string' || value.id.length === 0) return false
  if (value.order !== expectedOrder) return false
  if (typeof value.sourceType !== 'string' || !validEventSourceTypes.has(value.sourceType as GameEvent['sourceType'])) {
    return false
  }
  if (typeof value.sourceId !== 'string') return false
  if (typeof value.title !== 'string' || typeof value.detail !== 'string') return false
  if (value.tone !== 'neutral' && value.tone !== 'positive' && value.tone !== 'warning') return false
  if (!isUniqueArrayOf(value.methodTags, validMethodTags)) return false

  if (value.sourceType === 'approach' && !sets.approaches.has(value.sourceId)) return false
  if (value.sourceType === 'field-action' && !sets.fieldActions.has(value.sourceId)) return false
  if (value.sourceType === 'reconstruction' && !sets.reconstructions.has(value.sourceId)) return false
  if (value.sourceType === 'decision' && !sets.decisions.has(value.sourceId)) return false

  return true
}

function isRunSummary(value: unknown): value is RunSummary {
  if (!isRecord(value)) return false
  if (!Number.isInteger(value.runNumber) || (value.runNumber as number) < 1) return false

  // caseId is optional: summaries written before multi-case landed omit it and
  // are validated as the default case. When present it must name a registered
  // case, and the run's decision/approach are validated against THAT case.
  let summaryCaseId = DEFAULT_CASE_ID
  if (value.caseId !== undefined) {
    if (typeof value.caseId !== 'string' || !isRegisteredCase(value.caseId)) return false
    summaryCaseId = value.caseId
  }
  const sets = buildCaseIdSets(getCaseContent(summaryCaseId))

  if (typeof value.decision !== 'string' || !sets.decisions.has(value.decision)) return false
  if (typeof value.primaryApproach !== 'string' || !sets.approaches.has(value.primaryApproach)) {
    return false
  }
  if (!isUniqueArrayOf(value.methodTags, validMethodTags)) return false
  if (!Number.isInteger(value.evidenceCount) || (value.evidenceCount as number) < 0) return false
  if (!Number.isInteger(value.alarm) || (value.alarm as number) < 0 || (value.alarm as number) > 3) {
    return false
  }
  return isTrustState(value.trust)
}

// A deposition record is optional-tolerated: an old save simply omits it. When
// present it must name an authored entry action for this case. Current explicit
// use boundaries also reproduce the case resolver exactly; normalized legacy
// records retain their older beat trace under the `unknown` sentinel.
function isDepositionRecord(
  value: unknown,
  content: CaseDefinition,
): value is DepositionRecord {
  if (!isRecord(value)) return false
  const deposition = content.deposition
  if (
    !deposition ||
    typeof value.actionId !== 'string' ||
    !deposition.entryActionIds.includes(value.actionId)
  ) {
    return false
  }
  const beats = value.beats
  if (
    !Array.isArray(beats) ||
    !beats.every(
      (beat): beat is DepositionChoiceId =>
        typeof beat === 'string' && validDepositionChoices.has(beat as DepositionChoiceId),
    )
  ) {
    return false
  }
  if (typeof value.askedConsent !== 'boolean') return false
  if (
    typeof value.consent !== 'string' ||
    !validDepositionConsent.has(value.consent as DepositionConsent)
  ) {
    return false
  }
  // A v2 deposition predates testimonyUse. Preserve it as history and mark the
  // legal-use boundary unknown rather than inferring it from yes/no or route.
  if (
    value.testimonyUse !== undefined &&
    (typeof value.testimonyUse !== 'string' ||
      !validDepositionTestimonyUses.has(value.testimonyUse as DepositionTestimonyUse))
  ) {
    return false
  }

  // A normalized legacy record carries `unknown`, and its old authored skeleton
  // may have a different beat count. Preserve that trace without inventing a use
  // boundary. Records with a current explicit boundary must match the active
  // case's authored skeleton and pure resolver exactly.
  if (value.testimonyUse !== undefined && value.testimonyUse !== 'unknown') {
    if (beats.length !== deposition.statementBeats.length) return false
    for (const [index, beat] of deposition.statementBeats.entries()) {
      if (!beat.choices.some((choice) => choice.id === beats[index])) return false
    }
    const resolved = resolveDepositionUse(
      deposition,
      value.actionId,
      beats,
      value.askedConsent,
    )
    if (value.consent !== resolved.consent || value.testimonyUse !== resolved.testimonyUse) {
      return false
    }
  }
  return true
}

function decodePrecedents(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null
  const decoded: Record<string, string> = {}

  for (const [caseId, decisionId] of Object.entries(value)) {
    if (
      !isRegisteredCase(caseId) ||
      typeof decisionId !== 'string' ||
      !getCaseContent(caseId).decisions.some((decision) => decision.id === decisionId)
    ) {
      return null
    }
    decoded[caseId] = decisionId
  }

  return decoded
}

function decodeCaseOutcomes(value: unknown): Record<string, Record<string, string>> | null {
  if (!isRecord(value)) return null
  const decoded: Record<string, Record<string, string>> = {}

  for (const [caseId, rawFacts] of Object.entries(value)) {
    if (!isRegisteredCase(caseId) || !isRecord(rawFacts)) return null
    const definitions = getCaseContent(caseId).outcomeFactDefinitions ?? []
    const allowedById = new Map(
      definitions.map((definition) => [
        definition.id,
        new Set(definition.values.map((option) => option.id)),
      ]),
    )
    if (Object.keys(rawFacts).length !== definitions.length) return null

    const facts: Record<string, string> = {}
    for (const [factId, factValue] of Object.entries(rawFacts)) {
      if (
        typeof factValue !== 'string' ||
        !allowedById.get(factId)?.has(factValue)
      ) {
        return null
      }
      facts[factId] = factValue
    }
    decoded[caseId] = facts
  }

  return decoded
}

// Schema v2 knew verdict labels but did not own the compact facts that made those
// verdicts legally usable later. A recorded precedent therefore receives only
// explicit historical fallbacks. We never reverse-engineer subject contact,
// hearing scope, testimony permission, office linkage, or public standing from
// old method tags, routes, consent bits, or verdict copy.
function legacyCaseOutcomeFallbacks(
  precedents: unknown,
): Record<string, Record<string, string>> {
  if (!isRecord(precedents)) return {}

  const outcomes: Record<string, Record<string, string>> = {}
  if (typeof precedents['case-77'] === 'string') {
    outcomes['case-77'] = {
      valeContact: 'unknown',
      authorityLink77: 'not-proven',
      continuityScope: 'unknown',
    }
  }
  if (typeof precedents['case-81'] === 'string') {
    outcomes['case-81'] = {
      testimonyUse81: 'unknown',
      officeLink81: 'unknown',
      ellisPublicStanding: 'unknown',
    }
  }
  return outcomes
}

// Ordered save migrations, keyed by the schemaVersion they upgrade FROM. Each
// function receives a record already known to be at its from-version and returns
// the same record reshaped to from+1. They are PURE (no I/O) and run BEFORE the
// strict decode below. Add one entry and bump CURRENT_SAVE_SCHEMA for each shape
// change; migrateRawSave chains every intermediate migration automatically.
const saveMigrations: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 -> v2: introduce caseId + precedents, and cap legacy run history.
  1: (raw) => {
    // Derive the case precedent from whatever progress the v1 save holds:
    // a completed run (non-null decision) wins; otherwise the last finished
    // run recorded in previousRuns; otherwise there is no precedent yet.
    const decision = raw.decision
    const previousRuns = raw.previousRuns
    let precedent: string | null = null
    if (typeof decision === 'string' && decision.length > 0) {
      precedent = decision
    } else if (Array.isArray(previousRuns) && previousRuns.length > 0) {
      const lastRun = previousRuns[previousRuns.length - 1]
      if (isRecord(lastRun) && typeof lastRun.decision === 'string') {
        precedent = lastRun.decision
      }
    }
    // v1 predates multi-case; every v1 save is Case 77 by definition, so this
    // is a frozen historical literal, NOT the mutable default caseId.
    const precedents: Record<string, string> = precedent ? { 'case-77': precedent } : {}
    const cappedRuns = Array.isArray(previousRuns)
      ? previousRuns.slice(-MAX_PREVIOUS_RUNS)
      : previousRuns

    return {
      ...raw,
      schemaVersion: 2,
      caseId: 'case-77',
      precedents,
      previousRuns: cappedRuns,
    }
  },
  // v2 -> v3: add the compact campaign outcome map and the active tribunal
  // choice. Historical verdicts are not enough to reconstruct either: the choice
  // starts empty, while completed cases receive explicit unknown/not-proven facts.
  2: (raw) => ({
    ...raw,
    schemaVersion: 3,
    tribunalChoice: null,
    caseOutcomes: legacyCaseOutcomeFallbacks(raw.precedents),
  }),
}

// Bring a raw parsed save up to CURRENT_SAVE_SCHEMA, or reject it. Returns the
// migrated record (still untrusted — decodeGameState validates it) or null when
// the save cannot be migrated. Never attempts a downgrade.
export function migrateRawSave(value: unknown): unknown | null {
  if (!isRecord(value)) return null
  const version = value.schemaVersion
  if (!isFiniteNumber(version)) return null
  if (version > CURRENT_SAVE_SCHEMA) return null
  if (version < 1) return null

  let current: Record<string, unknown> = value
  let currentVersion = version
  while (currentVersion < CURRENT_SAVE_SCHEMA) {
    const migrate = saveMigrations[currentVersion]
    if (!migrate) return null
    current = migrate(current)
    currentVersion += 1
  }
  return current
}

export function decodeGameState(value: unknown): GameState | null {
  if (!isRecord(value) || value.schemaVersion !== CURRENT_SAVE_SCHEMA) return null
  // caseId is now tightened from "nonempty string" to "registered case id"; the
  // rest of the payload is validated against that case's authored vocabulary.
  if (typeof value.caseId !== 'string' || !isRegisteredCase(value.caseId)) return null
  const content = getCaseContent(value.caseId)
  const sets = buildCaseIdSets(content)
  const precedents = decodePrecedents(value.precedents)
  if (!precedents) return null
  const caseOutcomes = decodeCaseOutcomes(value.caseOutcomes)
  if (!caseOutcomes) return null
  // Optional-tolerated campaign marginalia: saves written before the Fourth
  // Margin existed have no field and normalize to an empty collection. A
  // present collection is strict, including compound-secret prerequisites, so
  // a forged Reader Key cannot enter through localStorage.
  let discoveredSecretIds: string[] = []
  if (value.discoveredSecretIds !== undefined) {
    if (!isUniqueArrayOf(value.discoveredSecretIds, validSecretIds)) return null
    discoveredSecretIds = value.discoveredSecretIds
    const discovered = new Set(discoveredSecretIds)
    const prerequisitesHold = discoveredSecretIds.every((secretId) => {
      const definition = getRegisteredSecret(secretId)?.definition
      return (definition?.requiresSecretIds ?? []).every((requiredId) =>
        discovered.has(requiredId),
      )
    })
    if (!prerequisitesHold) return null
  }
  const precedentCaseIds = Object.keys(precedents)
  const outcomeCaseIds = Object.keys(caseOutcomes)
  if (
    precedentCaseIds.length !== outcomeCaseIds.length ||
    precedentCaseIds.some(
      (caseId) => !Object.prototype.hasOwnProperty.call(caseOutcomes, caseId),
    )
  ) {
    return null
  }
  if (typeof value.phase !== 'string' || !validPhases.has(value.phase as GamePhase)) return null
  if (!Number.isInteger(value.runNumber) || (value.runNumber as number) < 1) return null
  if (
    value.primaryApproach !== null &&
    (typeof value.primaryApproach !== 'string' || !sets.approaches.has(value.primaryApproach))
  ) {
    return null
  }
  if (!isUniqueArrayOf(value.completedSites, sets.sites)) return null
  const completedSites = value.completedSites
  if (!isUniqueArrayOf(value.completedActions, sets.fieldActions)) return null
  const completedActions = value.completedActions
  if (!isUniqueArrayOf(value.evidence, sets.evidence)) return null
  if (!isUniqueArrayOf(value.methodTags, validMethodTags)) return null
  if (!isTrustState(value.trust)) return null
  if (!Number.isInteger(value.alarm) || (value.alarm as number) < 0 || (value.alarm as number) > 3) {
    return null
  }
  if (typeof value.tribunalOverride !== 'boolean') return null
  if (!isUniqueArrayOf(value.selectedFragments, sets.fragments) || value.selectedFragments.length > 2) {
    return null
  }
  if (
    value.reconstruction !== null &&
    (typeof value.reconstruction !== 'string' || !sets.reconstructions.has(value.reconstruction))
  ) {
    return null
  }
  if (value.tribunalChoice !== null) {
    if (
      typeof value.tribunalChoice !== 'string' ||
      !content.tribunalChoice?.options.some((option) => option.id === value.tribunalChoice)
    ) {
      return null
    }
  }
  if (
    value.decision !== null &&
    (typeof value.decision !== 'string' || !sets.decisions.has(value.decision))
  ) {
    return null
  }
  if (value.decision !== null && precedents[value.caseId] !== value.decision) return null
  if (
    !Array.isArray(value.events) ||
    !value.events.every((event, index) => isGameEvent(event, index + 1, sets))
  ) {
    return null
  }
  if (!Array.isArray(value.previousRuns) || !value.previousRuns.every(isRunSummary)) return null
  // Optional-tolerated: absent or null decodes to null; present must be valid.
  let depositionRecord: DepositionRecord | null = null
  if (value.depositionRecord !== undefined && value.depositionRecord !== null) {
    if (!isDepositionRecord(value.depositionRecord, content)) return null
    if (!completedActions.includes(value.depositionRecord.actionId)) return null
    depositionRecord = {
      actionId: value.depositionRecord.actionId,
      beats: [...value.depositionRecord.beats],
      askedConsent: value.depositionRecord.askedConsent,
      consent: value.depositionRecord.consent,
      testimonyUse: value.depositionRecord.testimonyUse ?? 'unknown',
    }
  }
  const settings = decodeAccessibilitySettings(value.settings)
  if (!settings || typeof value.announcement !== 'string') return null

  if (completedSites.length !== completedActions.length) return null
  const actionsMatchSites = completedActions.every((actionId, index) => {
    const action = content.fieldActions.find((item) => item.id === actionId)
    return action?.siteId === completedSites[index]
  })
  if (!actionsMatchSites) return null
  if (value.decision !== null && value.phase !== 'debrief' && value.phase !== 'landing') return null
  if (value.phase === 'debrief' && value.decision === null) return null

  return {
    schemaVersion: CURRENT_SAVE_SCHEMA,
    caseId: value.caseId,
    phase: value.phase as GamePhase,
    runNumber: value.runNumber as number,
    primaryApproach: value.primaryApproach as GameState['primaryApproach'],
    completedSites,
    completedActions,
    evidence: value.evidence,
    methodTags: value.methodTags,
    trust: value.trust,
    alarm: value.alarm as number,
    tribunalOverride: value.tribunalOverride,
    selectedFragments: value.selectedFragments,
    reconstruction: value.reconstruction as GameState['reconstruction'],
    tribunalChoice: value.tribunalChoice as GameState['tribunalChoice'],
    decision: value.decision as GameState['decision'],
    depositionRecord,
    events: value.events,
    previousRuns: value.previousRuns,
    precedents,
    caseOutcomes,
    discoveredSecretIds,
    settings,
    announcement: value.announcement,
  }
}

function readStorage(key: string): string | null {
  try {
    const value = window.localStorage.getItem(key)
    publishStorageAvailability(true)
    return value
  } catch {
    publishStorageAvailability(false)
    return null
  }
}

export function loadGame(): GameState | null {
  const serialized = readStorage(SAVE_KEY)
  if (!serialized) return null

  try {
    const migrated = migrateRawSave(JSON.parse(serialized) as unknown)
    return decodeGameState(migrated)
  } catch {
    return null
  }
}

export function loadSettings(): AccessibilitySettings | null {
  const serialized = readStorage(SETTINGS_KEY)
  if (!serialized) return null

  try {
    return decodeAccessibilitySettings(JSON.parse(serialized) as unknown)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    publishStorageAvailability(true)
    return true
  } catch {
    publishStorageAvailability(false)
    return false
  }
}

export function saveGame(state: GameState): boolean {
  return writeStorage(SAVE_KEY, state)
}

export function saveSettings(settings: AccessibilitySettings): boolean {
  return writeStorage(SETTINGS_KEY, settings)
}

export function clearGame(): boolean {
  try {
    window.localStorage.removeItem(SAVE_KEY)
    publishStorageAvailability(true)
    return true
  } catch {
    publishStorageAvailability(false)
    return false
  }
}

import { DEFAULT_CASE_ID, getCaseContent, isRegisteredCase, personas } from './content'
import type {
  AccessibilitySettings,
  CaseDefinition,
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
// for encode (engine stamps fresh state with it), decode (strict v2 validation
// below), migrateRawSave, and tests. Bump this by ONE when the shape changes,
// and add the matching from->to entry to saveMigrations.
export const CURRENT_SAVE_SCHEMA = 2

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

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) return false
  return Object.values(value).every((entry) => typeof entry === 'string')
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

  return {
    reducedMotion: value.reducedMotion,
    highContrast: value.highContrast,
    textSize: value.textSize,
    showTrustNumbers: value.showTrustNumbers,
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

// Ordered save migrations, keyed by the schemaVersion they upgrade FROM. Each
// function receives a record already known to be at its from-version and returns
// the same record reshaped to from+1. They are PURE (no I/O) and run BEFORE the
// strict decode below. To add v3 later: write the 2 entry here and bump
// CURRENT_SAVE_SCHEMA; migrateRawSave will chain 1->2->3 automatically.
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
  if (!isStringRecord(value.precedents)) return null
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
  if (
    value.decision !== null &&
    (typeof value.decision !== 'string' || !sets.decisions.has(value.decision))
  ) {
    return null
  }
  if (
    !Array.isArray(value.events) ||
    !value.events.every((event, index) => isGameEvent(event, index + 1, sets))
  ) {
    return null
  }
  if (!Array.isArray(value.previousRuns) || !value.previousRuns.every(isRunSummary)) return null
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
    decision: value.decision as GameState['decision'],
    events: value.events,
    previousRuns: value.previousRuns,
    precedents: value.precedents,
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

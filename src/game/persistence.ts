import {
  approaches,
  decisions,
  evidenceDefinitions,
  fieldActions,
  fragments,
  personas,
  reconstructionDefinitions,
  sites,
} from './content'
import type {
  AccessibilitySettings,
  ApproachId,
  DecisionId,
  EvidenceId,
  FieldActionId,
  FragmentId,
  GameEvent,
  GamePhase,
  GameState,
  MethodTag,
  PersonaId,
  ReconstructionId,
  RunSummary,
  SiteId,
} from './types'

const SAVE_KEY = 'the-annex.case-77.save.v1'
const SETTINGS_KEY = 'the-annex.accessibility.v1'

const validPhases = new Set<GamePhase>([
  'landing',
  'briefing',
  'investigation',
  'reconstruction',
  'tribunal',
  'debrief',
])
const validApproaches = new Set<ApproachId>(approaches.map((item) => item.id))
const validSites = new Set<SiteId>(sites.map((item) => item.id))
const validFieldActions = new Set<FieldActionId>(fieldActions.map((item) => item.id))
const validEvidence = new Set<EvidenceId>(evidenceDefinitions.map((item) => item.id))
const validFragments = new Set<FragmentId>(fragments.map((item) => item.id))
const validReconstructions = new Set<ReconstructionId>(
  reconstructionDefinitions.map((item) => item.id),
)
const validDecisions = new Set<DecisionId>(decisions.map((item) => item.id))
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

function isGameEvent(value: unknown, expectedOrder: number): value is GameEvent {
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

  if (value.sourceType === 'approach' && !validApproaches.has(value.sourceId as ApproachId)) return false
  if (value.sourceType === 'field-action' && !validFieldActions.has(value.sourceId as FieldActionId)) {
    return false
  }
  if (
    value.sourceType === 'reconstruction' &&
    !validReconstructions.has(value.sourceId as ReconstructionId)
  ) {
    return false
  }
  if (value.sourceType === 'decision' && !validDecisions.has(value.sourceId as DecisionId)) return false

  return true
}

function isRunSummary(value: unknown): value is RunSummary {
  if (!isRecord(value)) return false
  if (!Number.isInteger(value.runNumber) || (value.runNumber as number) < 1) return false
  if (typeof value.decision !== 'string' || !validDecisions.has(value.decision as DecisionId)) return false
  if (
    typeof value.primaryApproach !== 'string' ||
    !validApproaches.has(value.primaryApproach as ApproachId)
  ) {
    return false
  }
  if (!isUniqueArrayOf(value.methodTags, validMethodTags)) return false
  if (!Number.isInteger(value.evidenceCount) || (value.evidenceCount as number) < 0) return false
  if (!Number.isInteger(value.alarm) || (value.alarm as number) < 0 || (value.alarm as number) > 3) {
    return false
  }
  return isTrustState(value.trust)
}

export function decodeGameState(value: unknown): GameState | null {
  if (!isRecord(value) || value.schemaVersion !== 1) return null
  if (typeof value.phase !== 'string' || !validPhases.has(value.phase as GamePhase)) return null
  if (!Number.isInteger(value.runNumber) || (value.runNumber as number) < 1) return null
  if (
    value.primaryApproach !== null &&
    (typeof value.primaryApproach !== 'string' ||
      !validApproaches.has(value.primaryApproach as ApproachId))
  ) {
    return null
  }
  if (!isUniqueArrayOf(value.completedSites, validSites)) return null
  const completedSites = value.completedSites
  if (!isUniqueArrayOf(value.completedActions, validFieldActions)) return null
  const completedActions = value.completedActions
  if (!isUniqueArrayOf(value.evidence, validEvidence)) return null
  if (!isUniqueArrayOf(value.methodTags, validMethodTags)) return null
  if (!isTrustState(value.trust)) return null
  if (!Number.isInteger(value.alarm) || (value.alarm as number) < 0 || (value.alarm as number) > 3) {
    return null
  }
  if (typeof value.tribunalOverride !== 'boolean') return null
  if (!isUniqueArrayOf(value.selectedFragments, validFragments) || value.selectedFragments.length > 2) {
    return null
  }
  if (
    value.reconstruction !== null &&
    (typeof value.reconstruction !== 'string' ||
      !validReconstructions.has(value.reconstruction as ReconstructionId))
  ) {
    return null
  }
  if (
    value.decision !== null &&
    (typeof value.decision !== 'string' || !validDecisions.has(value.decision as DecisionId))
  ) {
    return null
  }
  if (!Array.isArray(value.events) || !value.events.every((event, index) => isGameEvent(event, index + 1))) {
    return null
  }
  if (!Array.isArray(value.previousRuns) || !value.previousRuns.every(isRunSummary)) return null
  const settings = decodeAccessibilitySettings(value.settings)
  if (!settings || typeof value.announcement !== 'string') return null

  if (completedSites.length !== completedActions.length) return null
  const actionsMatchSites = completedActions.every((actionId, index) => {
    const action = fieldActions.find((item) => item.id === actionId)
    return action?.siteId === completedSites[index]
  })
  if (!actionsMatchSites) return null
  if (value.decision !== null && value.phase !== 'debrief' && value.phase !== 'landing') return null
  if (value.phase === 'debrief' && value.decision === null) return null

  return {
    schemaVersion: 1,
    phase: value.phase as GamePhase,
    runNumber: value.runNumber as number,
    primaryApproach: value.primaryApproach as ApproachId | null,
    completedSites,
    completedActions,
    evidence: value.evidence,
    methodTags: value.methodTags,
    trust: value.trust,
    alarm: value.alarm as number,
    tribunalOverride: value.tribunalOverride,
    selectedFragments: value.selectedFragments,
    reconstruction: value.reconstruction as ReconstructionId | null,
    decision: value.decision as DecisionId | null,
    events: value.events,
    previousRuns: value.previousRuns,
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
    return decodeGameState(JSON.parse(serialized) as unknown)
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

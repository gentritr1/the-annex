import {
  DEFAULT_CASE_ID,
  getCaseContent,
  isRegisteredCase,
  methodLabels,
  personas,
} from './content'
// Save-schema constants live with the persistence layer (the single source of
// truth). Importing them here keeps the version the engine stamps and the run
// cap it enforces in lockstep with decode/migrate. persistence never imports
// engine, so there is no cycle.
import { CURRENT_SAVE_SCHEMA, MAX_PREVIOUS_RUNS } from './persistence'
import type {
  AccessibilitySettings,
  ApproachId,
  GameAction,
  GameEvent,
  GameState,
  MethodTag,
  PersonaId,
  RunSummary,
} from './types'

export const defaultAccessibilitySettings: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  textSize: 'standard',
  showTrustNumbers: false,
}

const emptyTrust: Record<PersonaId, number> = {
  registrar: 0,
  shepherd: 0,
  defector: 0,
  archivist: 0,
}

const approachMethods: Record<ApproachId, MethodTag[]> = {
  procedure: ['procedure'],
  care: ['care', 'negotiation'],
  covert: ['stealth'],
  curiosity: ['puzzle'],
}

function createRunState(
  caseId: string,
  runNumber: number,
  previousRuns: RunSummary[],
  settings: AccessibilitySettings,
  precedents: Record<string, string> = {},
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
    decision: null,
    events: [],
    previousRuns,
    precedents: { ...precedents },
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

export function canEnterTribunal(state: GameState): boolean {
  return state.completedSites.length >= 2 && state.reconstruction !== null
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
        methodTags: addUnique(state.methodTags, approachMethods[approach.id]),
        events: appendEvent(state, {
          sourceType: 'approach',
          sourceId: approach.id,
          title: approach.title,
          detail: `${approach.description}${residue}${describeTrustDeltas(approach.trust)}${describeResidueDeltas(runResidue.trust)}`,
          tone: 'neutral',
          methodTags: approachMethods[approach.id],
        }),
        announcement: `${approach.title}. Investigation sites are available.`,
      }
    }

    case 'COMMIT_FIELD_ACTION': {
      if (state.phase !== 'investigation') return state

      const definition = getCaseContent(state.caseId).fieldActions.find(
        (item) => item.id === action.actionId,
      )
      if (!definition || state.completedSites.includes(definition.siteId)) return state

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
          detail: `${definition.eventDetail}${describeTrustDeltas(definition.trust)}`,
          tone: definition.alarmDelta > 0 ? 'warning' : 'neutral',
          methodTags: definition.methodTags,
        }),
        announcement: `${definition.eventTitle}. New evidence added.`,
      }
    }

    case 'OPEN_RECONSTRUCTION':
      if (state.phase !== 'investigation' || state.reconstruction || state.completedSites.length === 0) {
        return state
      }
      return {
        ...state,
        phase: 'reconstruction',
        selectedFragments: [],
        announcement: 'Memory lattice opened. Select two anchors.',
      }

    case 'TOGGLE_FRAGMENT': {
      if (state.phase !== 'reconstruction') return state

      const alreadySelected = state.selectedFragments.includes(action.fragmentId)
      if (!alreadySelected && state.selectedFragments.length >= 2) {
        return {
          ...state,
          announcement: 'Two anchors are already selected. Remove one to change the model.',
        }
      }

      const selectedFragments = alreadySelected
        ? state.selectedFragments.filter((fragmentId) => fragmentId !== action.fragmentId)
        : [...state.selectedFragments, action.fragmentId]

      return {
        ...state,
        selectedFragments,
        announcement: `${selectedFragments.length} of 2 anchors selected.`,
      }
    }

    case 'SUBMIT_RECONSTRUCTION': {
      if (state.phase !== 'reconstruction' || state.selectedFragments.length !== 2) return state

      const content = getCaseContent(state.caseId)
      const reconstructionId = content.getReconstructionForFragments(state.selectedFragments)
      const definition = content.reconstructionDefinitions.find((item) => item.id === reconstructionId)
      if (!definition) return state
      const corroboratedAnchors = state.selectedFragments.filter((fragmentId) =>
        content.fragmentEvidenceLinks[fragmentId].some((evidenceId) =>
          state.evidence.includes(evidenceId),
        ),
      ).length

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

    case 'DECIDE': {
      if (state.phase !== 'tribunal' || state.decision) return state

      const content = getCaseContent(state.caseId)
      const decision = content.decisions.find((item) => item.id === action.decisionId)
      if (!decision || (decision.requiresOverride && !state.tribunalOverride)) return state

      return {
        ...state,
        phase: 'debrief',
        decision: decision.id,
        // Record this run's verdict as the case precedent for later runs/cases.
        precedents: { ...state.precedents, [state.caseId]: decision.id },
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

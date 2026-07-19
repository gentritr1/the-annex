import { describe, expect, it } from 'vitest'
import { createInitialGameState, gameReducer } from './engine'
import {
  CURRENT_SAVE_SCHEMA,
  decodeAccessibilitySettings,
  decodeGameState,
  migrateRawSave,
} from './persistence'

function validInvestigationState() {
  const initial = createInitialGameState()
  const briefing = gameReducer(initial, { type: 'START_NEW' })
  return gameReducer(briefing, { type: 'SELECT_APPROACH', approachId: 'procedure' })
}

// Accessibility block shared by the hand-authored v1 fixtures below.
const v1Settings = {
  reducedMotion: false,
  highContrast: false,
  textSize: 'standard',
  showTrustNumbers: false,
}

// A realistic pre-change (schemaVersion 1) save: procedure approach, one site
// audited, mid-investigation. No caseId, no precedents — the true v1 shape.
const v1MidInvestigation = {
  schemaVersion: 1,
  phase: 'investigation',
  runNumber: 1,
  primaryApproach: 'procedure',
  completedSites: ['registry'],
  completedActions: ['authenticate-chain'],
  evidence: ['custody-chain'],
  methodTags: ['procedure'],
  trust: { registrar: 3, shepherd: 0, defector: 0, archivist: 0 },
  alarm: 0,
  tribunalOverride: false,
  selectedFragments: [],
  reconstruction: null,
  decision: null,
  events: [
    {
      id: 'run-1-event-1',
      order: 1,
      sourceType: 'approach',
      sourceId: 'procedure',
      title: 'Begin with the record',
      detail: 'Establish chain of custody before speaking to anyone involved.',
      tone: 'neutral',
      methodTags: ['procedure'],
    },
    {
      id: 'run-1-event-2',
      order: 2,
      sourceType: 'field-action',
      sourceId: 'authenticate-chain',
      title: 'Custody chain authenticated',
      detail: 'You proved where every admitted memory came from.',
      tone: 'neutral',
      methodTags: ['procedure'],
    },
  ],
  previousRuns: [],
  settings: v1Settings,
  announcement: 'Custody chain authenticated. New evidence added.',
}

// A realistic v1 save at debrief: a full run resolved with a verdict.
const v1DebriefCompleted = {
  schemaVersion: 1,
  phase: 'debrief',
  runNumber: 1,
  primaryApproach: 'care',
  completedSites: ['care-ward', 'registry'],
  completedActions: ['listen-mara', 'authenticate-chain'],
  evidence: ['sensory-echo', 'relational-proof', 'custody-chain'],
  methodTags: ['care', 'negotiation', 'nonlethal', 'puzzle', 'procedure'],
  trust: { registrar: 2, shepherd: 4, defector: 0, archivist: 1 },
  alarm: 0,
  tribunalOverride: false,
  selectedFragments: ['scar-sensation', 'witness-account'],
  reconstruction: 'relational-continuity',
  decision: 'certify-continuity',
  events: [
    {
      id: 'run-1-event-1',
      order: 1,
      sourceType: 'approach',
      sourceId: 'care',
      title: 'Begin with the person',
      detail: 'Meet 77-A before deciding what kind of evidence she is.',
      tone: 'neutral',
      methodTags: ['care', 'negotiation'],
    },
    {
      id: 'run-1-event-2',
      order: 2,
      sourceType: 'field-action',
      sourceId: 'listen-mara',
      title: '77-A was heard before she was measured',
      detail: 'Her impossible room matched a metaphor Mara once used.',
      tone: 'neutral',
      methodTags: ['care', 'negotiation', 'nonlethal'],
    },
    {
      id: 'run-1-event-3',
      order: 3,
      sourceType: 'reconstruction',
      sourceId: 'relational-continuity',
      title: 'Relational continuity model filed',
      detail: 'A self can persist through embodied memory and recognition.',
      tone: 'positive',
      methodTags: ['puzzle'],
    },
    {
      id: 'run-1-event-4',
      order: 4,
      sourceType: 'field-action',
      sourceId: 'authenticate-chain',
      title: 'Custody chain authenticated',
      detail: 'You proved where every admitted memory came from.',
      tone: 'neutral',
      methodTags: ['procedure'],
    },
    {
      id: 'run-1-event-5',
      order: 5,
      sourceType: 'decision',
      sourceId: 'certify-continuity',
      title: 'Certify Mara Vale as continuous',
      detail: 'Protects continuity by asking the city to treat uncertainty as resolved.',
      tone: 'neutral',
      methodTags: ['procedure'],
    },
  ],
  previousRuns: [],
  settings: v1Settings,
  announcement: 'Certify continuity. Case 77 is resolved for this run.',
}

// A realistic v1 save opening a second run: no decision yet this run, but a
// prior run's verdict is recorded in previousRuns.
const v1WithPreviousRuns = {
  schemaVersion: 1,
  phase: 'briefing',
  runNumber: 2,
  primaryApproach: null,
  completedSites: [],
  completedActions: [],
  evidence: [],
  methodTags: [],
  trust: { registrar: 0, shepherd: 0, defector: 0, archivist: 0 },
  alarm: 0,
  tribunalOverride: false,
  selectedFragments: [],
  reconstruction: null,
  decision: null,
  events: [],
  previousRuns: [
    {
      runNumber: 1,
      decision: 'charter-new-person',
      primaryApproach: 'care',
      methodTags: ['care', 'negotiation', 'nonlethal', 'puzzle', 'procedure'],
      evidenceCount: 3,
      alarm: 0,
      trust: { registrar: 0, shepherd: 3, defector: 0, archivist: 1 },
    },
  ],
  settings: v1Settings,
  announcement: 'Case 77, run 2, opened.',
}

describe('decodeGameState', () => {
  it('accepts a complete canonical snapshot', () => {
    const state = validInvestigationState()
    expect(decodeGameState(JSON.parse(JSON.stringify(state)) as unknown)).toEqual(state)
  })

  it('rejects a snapshot missing required state', () => {
    const malformed: Record<string, unknown> = { ...validInvestigationState() }
    delete malformed.completedSites
    expect(decodeGameState(malformed)).toBeNull()
  })

  it('rejects invalid nested trust and event values', () => {
    const invalidTrust = {
      ...validInvestigationState(),
      trust: { registrar: 99, shepherd: 0, defector: 0, archivist: 0 },
    }
    const invalidEvent = {
      ...validInvestigationState(),
      events: [{ id: 'broken', order: 1, title: 'Missing source metadata' }],
    }

    expect(decodeGameState(invalidTrust)).toBeNull()
    expect(decodeGameState(invalidEvent)).toBeNull()
  })
})

describe('decodeAccessibilitySettings', () => {
  it('requires every preference and preserves a valid set', () => {
    const settings = {
      reducedMotion: true,
      highContrast: false,
      textSize: 'large' as const,
      showTrustNumbers: true,
    }

    expect(decodeAccessibilitySettings(settings)).toEqual(settings)
    expect(decodeAccessibilitySettings({ reducedMotion: true })).toBeNull()
  })
})

describe('migrateRawSave (v1 -> current)', () => {
  it('resumes a mid-investigation v1 save with progress intact and empty precedents', () => {
    const decoded = decodeGameState(migrateRawSave(v1MidInvestigation))

    expect(decoded).not.toBeNull()
    expect(decoded).toEqual({
      ...v1MidInvestigation,
      schemaVersion: CURRENT_SAVE_SCHEMA,
      caseId: 'case-77',
      precedents: {},
    })
    // Spot-check that field progress survived the migration.
    expect(decoded?.completedActions).toEqual(['authenticate-chain'])
    expect(decoded?.evidence).toEqual(['custody-chain'])
    expect(decoded?.trust.registrar).toBe(3)
  })

  it('derives the precedent from a completed v1 run at debrief', () => {
    const decoded = decodeGameState(migrateRawSave(v1DebriefCompleted))

    expect(decoded).not.toBeNull()
    expect(decoded?.caseId).toBe('case-77')
    expect(decoded?.decision).toBe('certify-continuity')
    expect(decoded?.precedents).toEqual({ 'case-77': 'certify-continuity' })
    expect(decoded).toEqual({
      ...v1DebriefCompleted,
      schemaVersion: CURRENT_SAVE_SCHEMA,
      caseId: 'case-77',
      precedents: { 'case-77': 'certify-continuity' },
    })
  })

  it('derives the precedent from the last prior run when the current run is undecided', () => {
    const decoded = decodeGameState(migrateRawSave(v1WithPreviousRuns))

    expect(decoded).not.toBeNull()
    expect(decoded?.precedents).toEqual({ 'case-77': 'charter-new-person' })
    expect(decoded?.previousRuns).toHaveLength(1)
    expect(decoded?.runNumber).toBe(2)
  })

  it('rejects unknown, future, downgrade, and missing schema versions', () => {
    expect(migrateRawSave({ ...v1MidInvestigation, schemaVersion: 3 })).toBeNull()
    expect(migrateRawSave({ ...v1MidInvestigation, schemaVersion: 0 })).toBeNull()
    expect(migrateRawSave({ ...v1MidInvestigation, schemaVersion: 'x' })).toBeNull()
    expect(migrateRawSave({ phase: 'investigation', runNumber: 1 })).toBeNull()
    expect(migrateRawSave(null)).toBeNull()
    expect(migrateRawSave([])).toBeNull()
  })

  it('passes an already-current save through unchanged', () => {
    const current = migrateRawSave(v1MidInvestigation)
    expect((current as { schemaVersion: number }).schemaVersion).toBe(CURRENT_SAVE_SCHEMA)
    expect(migrateRawSave(current)).toEqual(current)
  })
})

describe('v2 encode/decode round-trip', () => {
  it('encodes a played reducer state at the current schema and decodes to an equal state', () => {
    let s = gameReducer(createInitialGameState(), { type: 'START_NEW' })
    s = gameReducer(s, { type: 'SELECT_APPROACH', approachId: 'care' })
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    s = gameReducer(s, { type: 'OPEN_RECONSTRUCTION' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'scar-sensation' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
    s = gameReducer(s, { type: 'SUBMIT_RECONSTRUCTION' })
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
    s = gameReducer(s, { type: 'ENTER_TRIBUNAL' })
    s = gameReducer(s, { type: 'DECIDE', decisionId: 'certify-continuity' })
    s = gameReducer(s, { type: 'START_NEXT_RUN' })
    const state = gameReducer(s, { type: 'SELECT_APPROACH', approachId: 'procedure' })

    const encoded = JSON.parse(JSON.stringify(state)) as { schemaVersion: number }
    expect(encoded.schemaVersion).toBe(CURRENT_SAVE_SCHEMA)
    expect(state.precedents).toEqual({ 'case-77': 'certify-continuity' })
    expect(state.previousRuns).toHaveLength(1)
    expect(decodeGameState(migrateRawSave(encoded))).toEqual(state)
  })
})

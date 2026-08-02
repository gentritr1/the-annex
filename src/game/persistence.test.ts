import { describe, expect, it } from 'vitest'
import { createInitialGameState, gameReducer } from './engine'
import {
  CURRENT_SAVE_SCHEMA,
  decodeAccessibilitySettings,
  decodeGameState,
  migrateRawSave,
} from './persistence'
import type { GameState } from './types'

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
  it('requires every mandatory preference and preserves a valid set', () => {
    const settings = {
      reducedMotion: true,
      highContrast: false,
      textSize: 'large' as const,
      showTrustNumbers: true,
      ambientSound: true,
      easyRead: true,
      subtitlePlate: true,
    }

    expect(decodeAccessibilitySettings(settings)).toEqual(settings)
    expect(decodeAccessibilitySettings({ reducedMotion: true })).toBeNull()
  })

  it('tolerates stored settings that predate ambientSound (missing -> false)', () => {
    // The true pre-ambientSound shape: the four original fields, no ambientSound.
    // Same optional-tolerated treatment RunSummary.caseId gets — an older stored
    // blob must keep loading rather than being rejected.
    const legacy = {
      reducedMotion: false,
      highContrast: true,
      textSize: 'standard' as const,
      showTrustNumbers: false,
    }
    expect(decodeAccessibilitySettings(legacy)).toEqual({
      ...legacy,
      ambientSound: false,
      easyRead: false,
      subtitlePlate: false,
    })
  })

  it('accepts ambientSound true and rejects a present-but-non-boolean value', () => {
    const base = {
      reducedMotion: false,
      highContrast: false,
      textSize: 'standard' as const,
      showTrustNumbers: false,
    }
    expect(decodeAccessibilitySettings({ ...base, ambientSound: true })?.ambientSound).toBe(true)
    expect(decodeAccessibilitySettings({ ...base, ambientSound: false })?.ambientSound).toBe(false)
    // Present but malformed rejects the whole blob (strict, like every other field).
    expect(decodeAccessibilitySettings({ ...base, ambientSound: 'on' })).toBeNull()
    expect(decodeAccessibilitySettings({ ...base, ambientSound: 1 })).toBeNull()
  })

  // ── Wave 1: easyRead and subtitlePlate ──────────────────────────────────────
  // These two matter more than a toggle usually would. decodeGameState rejects
  // the WHOLE save when the settings blob fails to decode, so a strictly-required
  // new preference would cost every existing player their precedents, previous
  // runs and run number. These cases are the proof the optional-tolerated pattern
  // was actually applied and not merely read.
  it('tolerates a settings blob written before easyRead and subtitlePlate existed', () => {
    // The exact shape the SHIPPED build writes today: five fields, no more.
    const shipped = {
      reducedMotion: true,
      highContrast: false,
      textSize: 'large' as const,
      showTrustNumbers: true,
      ambientSound: true,
    }
    expect(decodeAccessibilitySettings(shipped)).toEqual({
      ...shipped,
      easyRead: false,
      subtitlePlate: false,
    })
  })

  it('accepts easyRead / subtitlePlate booleans and rejects present-but-malformed values', () => {
    const base = {
      reducedMotion: false,
      highContrast: false,
      textSize: 'standard' as const,
      showTrustNumbers: false,
      ambientSound: false,
    }
    expect(decodeAccessibilitySettings({ ...base, easyRead: true })?.easyRead).toBe(true)
    expect(decodeAccessibilitySettings({ ...base, subtitlePlate: true })?.subtitlePlate).toBe(true)
    expect(decodeAccessibilitySettings({ ...base, easyRead: 'yes' })).toBeNull()
    expect(decodeAccessibilitySettings({ ...base, easyRead: 0 })).toBeNull()
    expect(decodeAccessibilitySettings({ ...base, subtitlePlate: 'on' })).toBeNull()
    expect(decodeAccessibilitySettings({ ...base, subtitlePlate: 1 })).toBeNull()
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
      // Optional-tolerated: a pre-deposition save has no record; decode normalizes
      // the absent field to null. Progress is otherwise untouched.
      depositionRecord: null,
      tribunalChoice: null,
      caseOutcomes: {},
      // Campaign marginalia did not exist in v1; strict decode normalizes the
      // absent collection without inventing a discovery.
      discoveredSecretIds: [],
      // A v1 save's settings predate ambientSound, easyRead and subtitlePlate;
      // decode normalizes all three to false.
      settings: { ...v1Settings, ambientSound: false, easyRead: false, subtitlePlate: false },
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
      depositionRecord: null,
      tribunalChoice: null,
      caseOutcomes: {
        'case-77': {
          valeContact: 'unknown',
          authorityLink77: 'not-proven',
          continuityScope: 'unknown',
        },
      },
      discoveredSecretIds: [],
      // A v1 save's settings predate ambientSound, easyRead and subtitlePlate;
      // decode normalizes all three to false.
      settings: { ...v1Settings, ambientSound: false, easyRead: false, subtitlePlate: false },
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
    expect(migrateRawSave({ ...v1MidInvestigation, schemaVersion: CURRENT_SAVE_SCHEMA + 1 })).toBeNull()
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

describe('v3 encode/decode round-trip', () => {
  it('encodes a played reducer state at the current schema and decodes to an equal state', () => {
    let s = gameReducer(createInitialGameState(), { type: 'START_NEW' })
    s = gameReducer(s, { type: 'SELECT_APPROACH', approachId: 'care' })
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
    s = gameReducer(s, { type: 'OPEN_RECONSTRUCTION' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'registry-hash' })
    s = gameReducer(s, { type: 'SUBMIT_RECONSTRUCTION' })
    s = gameReducer(s, { type: 'ENTER_TRIBUNAL' })
    s = gameReducer(s, { type: 'SET_TRIBUNAL_CHOICE', choiceId: 'individual' })
    s = gameReducer(s, { type: 'DECIDE', decisionId: 'certify-continuity' })
    s = gameReducer(s, { type: 'START_NEXT_RUN' })
    const state = gameReducer(s, { type: 'SELECT_APPROACH', approachId: 'procedure' })

    const encoded = JSON.parse(JSON.stringify(state)) as { schemaVersion: number }
    expect(encoded.schemaVersion).toBe(CURRENT_SAVE_SCHEMA)
    expect(state.precedents).toEqual({ 'case-77': 'certify-continuity' })
    expect(state.previousRuns).toHaveLength(1)
    expect(decodeGameState(migrateRawSave(encoded))).toEqual(state)
  })

  it('tolerates a run summary written without a caseId (legacy pre-multi-case)', () => {
    let s = gameReducer(createInitialGameState(), { type: 'START_NEW' })
    s = gameReducer(s, { type: 'SELECT_APPROACH', approachId: 'care' })
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
    s = gameReducer(s, { type: 'OPEN_RECONSTRUCTION' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'registry-hash' })
    s = gameReducer(s, { type: 'SUBMIT_RECONSTRUCTION' })
    s = gameReducer(s, { type: 'ENTER_TRIBUNAL' })
    s = gameReducer(s, { type: 'SET_TRIBUNAL_CHOICE', choiceId: 'individual' })
    s = gameReducer(s, { type: 'DECIDE', decisionId: 'certify-continuity' })
    const next = gameReducer(s, { type: 'START_NEXT_RUN' })

    const encoded = JSON.parse(JSON.stringify(next)) as {
      previousRuns: { caseId?: string }[]
    }
    // Strip the caseId as a save written before multi-case would have lacked it.
    delete encoded.previousRuns[0]?.caseId

    const decoded = decodeGameState(migrateRawSave(encoded))
    expect(decoded).not.toBeNull()
    expect(decoded?.previousRuns).toHaveLength(1)
    expect(decoded?.previousRuns[0]?.caseId).toBeUndefined()
  })

  it('migrates a valid v2 snapshot without inventing campaign facts', () => {
    const current = JSON.parse(JSON.stringify(validInvestigationState())) as Record<string, unknown>
    const v2: Record<string, unknown> = { ...current, schemaVersion: 2 }
    delete v2.tribunalChoice
    delete v2.caseOutcomes
    delete v2.discoveredSecretIds

    const migrated = migrateRawSave(v2) as Record<string, unknown>
    expect(migrated).toMatchObject({
      schemaVersion: CURRENT_SAVE_SCHEMA,
      tribunalChoice: null,
      caseOutcomes: {},
    })
    expect(decodeGameState(migrated)).toEqual(validInvestigationState())
  })

  it('marks completed v2 case facts unknown instead of inferring old routes or consent', () => {
    const current = JSON.parse(JSON.stringify(playCase81ToDebrief())) as Record<string, unknown>
    const v2: Record<string, unknown> = { ...current, schemaVersion: 2 }
    delete v2.tribunalChoice
    delete v2.caseOutcomes
    const legacyDeposition = {
      ...(v2.depositionRecord as Record<string, unknown>),
    }
    delete legacyDeposition.testimonyUse
    v2.depositionRecord = legacyDeposition

    const decoded = decodeGameState(migrateRawSave(v2))
    expect(decoded?.depositionRecord?.testimonyUse).toBe('unknown')
    expect(decoded?.caseOutcomes).toEqual({
      'case-77': {
        valeContact: 'unknown',
        authorityLink77: 'not-proven',
        continuityScope: 'unknown',
      },
      'case-81': {
        testimonyUse81: 'unknown',
        officeLink81: 'unknown',
        ellisPublicStanding: 'unknown',
      },
    })
  })
})

// Build a Case 81 state through the shared engine: a completed Case 77 run, then
// START_CASE into Case 81 played to a verdict.
function playCase81ToDebrief(): GameState {
  let s = gameReducer(createInitialGameState(), { type: 'START_NEW' })
  s = gameReducer(s, { type: 'SELECT_APPROACH', approachId: 'care' })
  s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
  s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
  s = gameReducer(s, { type: 'OPEN_RECONSTRUCTION' })
  s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
  s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'registry-hash' })
  s = gameReducer(s, { type: 'SUBMIT_RECONSTRUCTION' })
  s = gameReducer(s, { type: 'ENTER_TRIBUNAL' })
  s = gameReducer(s, { type: 'SET_TRIBUNAL_CHOICE', choiceId: 'general' })
  s = gameReducer(s, { type: 'DECIDE', decisionId: 'charter-new-person' })
  s = gameReducer(s, { type: 'START_CASE', caseId: 'case-81' })
  s = gameReducer(s, { type: 'SELECT_APPROACH', approachId: 'procedure' })
  s = gameReducer(s, {
    type: 'COMMIT_DEPOSITION',
    actionId: 'take-sworn-statement',
    beats: ['let-it-stand', 'let-it-stand'],
    askedConsent: true,
  })
  s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'pull-service-record' })
  s = gameReducer(s, { type: 'OPEN_RECONSTRUCTION' })
  s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'oath-cadence' })
  s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'unscripted-answer' })
  s = gameReducer(s, { type: 'SUBMIT_RECONSTRUCTION' })
  s = gameReducer(s, { type: 'ENTER_TRIBUNAL' })
  return gameReducer(s, { type: 'DECIDE', decisionId: 'certify-witness' })
}

describe('Fourth Margin persistence (optional-tolerated)', () => {
  it('normalizes a pre-feature current save with no discovery field to an empty collection', () => {
    const state = validInvestigationState()
    const encoded = JSON.parse(JSON.stringify(state)) as Record<string, unknown>
    delete encoded.discoveredSecretIds

    expect(decodeGameState(encoded)).toEqual({
      ...state,
      discoveredSecretIds: [],
    })
  })

  it('round-trips both quotations and the explicitly claimed Reader Key', () => {
    const state: GameState = {
      ...playCase81ToDebrief(),
      discoveredSecretIds: [
        'nietzsche-forgetting',
        'schopenhauer-succession',
        'reader-key-04',
      ],
    }
    const encoded = JSON.parse(JSON.stringify(state)) as unknown

    expect(decodeGameState(migrateRawSave(encoded))).toEqual(state)
  })

  it('rejects malformed, duplicate, and unknown discovery collections', () => {
    const encoded = JSON.parse(
      JSON.stringify(validInvestigationState()),
    ) as Record<string, unknown>
    const malformedCollections: unknown[] = [
      'nietzsche-forgetting',
      null,
      [42],
      ['nietzsche-forgetting', 'nietzsche-forgetting'],
      ['not-authored'],
    ]

    malformedCollections.forEach((discoveredSecretIds) => {
      expect(
        decodeGameState({
          ...encoded,
          discoveredSecretIds,
        }),
      ).toBeNull()
    })
  })

  it('rejects a forged compound key unless every authored prerequisite is present', () => {
    const encoded = JSON.parse(
      JSON.stringify(playCase81ToDebrief()),
    ) as Record<string, unknown>

    ;[
      ['reader-key-04'],
      ['nietzsche-forgetting', 'reader-key-04'],
      ['schopenhauer-succession', 'reader-key-04'],
    ].forEach((discoveredSecretIds) => {
      expect(
        decodeGameState({
          ...encoded,
          discoveredSecretIds,
        }),
      ).toBeNull()
    })

    expect(
      decodeGameState({
        ...encoded,
        discoveredSecretIds: [
          'nietzsche-forgetting',
          'schopenhauer-succession',
          'reader-key-04',
        ],
      })?.discoveredSecretIds,
    ).toEqual([
      'nietzsche-forgetting',
      'schopenhauer-succession',
      'reader-key-04',
    ])
  })
})

describe('multi-case persistence', () => {
  it('round-trips a Case 81 reducer state through encode/decode', () => {
    const state = playCase81ToDebrief()
    expect(state.caseId).toBe('case-81')
    expect(state.previousRuns[0]?.caseId).toBe('case-77')
    expect(state.precedents).toEqual({
      'case-77': 'charter-new-person',
      'case-81': 'certify-witness',
    })
    expect(state.caseOutcomes).toEqual({
      'case-77': {
        valeContact: 'consulted',
        authorityLink77: 'not-proven',
        continuityScope: 'general',
      },
      'case-81': {
        testimonyUse81: 'voluntary-office',
        officeLink81: 'admissible',
        ellisPublicStanding: 'witness',
      },
    })

    const encoded = JSON.parse(JSON.stringify(state)) as { schemaVersion: number }
    expect(encoded.schemaVersion).toBe(CURRENT_SAVE_SCHEMA)
    expect(decodeGameState(migrateRawSave(encoded))).toEqual(state)
  })

  it('rejects a payload whose caseId is not a registered case', () => {
    const state = validInvestigationState()
    const encoded = JSON.parse(JSON.stringify(state)) as Record<string, unknown>
    encoded.caseId = 'case-999'
    expect(decodeGameState(encoded)).toBeNull()
  })

  it('rejects a Case 81 payload carrying Case 77 field ids (validated against its own case)', () => {
    const state = playCase81ToDebrief()
    const encoded = JSON.parse(JSON.stringify(state)) as Record<string, unknown>
    // A case-77 evidence id is not part of case-81's vocabulary.
    encoded.evidence = ['custody-chain']
    expect(decodeGameState(encoded)).toBeNull()
  })

  it('rejects unknown, incomplete, and invalid campaign outcome facts', () => {
    const encoded = JSON.parse(JSON.stringify(playCase81ToDebrief())) as Record<string, unknown>
    const outcomes = encoded.caseOutcomes as Record<string, Record<string, string>>

    expect(
      decodeGameState({
        ...encoded,
        caseOutcomes: {
          ...outcomes,
          'case-999': { inventedFact: 'invented-value' },
        },
      }),
    ).toBeNull()

    expect(
      decodeGameState({
        ...encoded,
        caseOutcomes: {
          ...outcomes,
          'case-77': {
            valeContact: 'consulted',
            authorityLink77: 'not-proven',
          },
        },
      }),
    ).toBeNull()

    expect(
      decodeGameState({
        ...encoded,
        caseOutcomes: {
          ...outcomes,
          'case-81': {
            ...outcomes['case-81'],
            officeLink81: 'secretly-proven',
          },
        },
      }),
    ).toBeNull()
  })

  it('rejects precedent keys and decisions outside their authored case contracts', () => {
    const encoded = JSON.parse(JSON.stringify(playCase81ToDebrief())) as Record<string, unknown>
    const precedents = encoded.precedents as Record<string, string>

    expect(
      decodeGameState({
        ...encoded,
        precedents: {
          ...precedents,
          'case-999': 'invented-verdict',
        },
      }),
    ).toBeNull()

    expect(
      decodeGameState({
        ...encoded,
        precedents: {
          ...precedents,
          // A real Case 81 decision is still invalid as a Case 77 precedent.
          'case-77': 'certify-witness',
        },
      }),
    ).toBeNull()
  })

  it('requires precedents, outcomes, and the active completed decision to agree', () => {
    const encoded = JSON.parse(JSON.stringify(playCase81ToDebrief())) as Record<string, unknown>
    const precedents = encoded.precedents as Record<string, string>
    const outcomes = encoded.caseOutcomes as Record<string, Record<string, string>>

    expect(
      decodeGameState({
        ...encoded,
        caseOutcomes: {
          'case-77': outcomes['case-77'],
        },
      }),
    ).toBeNull()

    expect(
      decodeGameState({
        ...encoded,
        precedents: {
          'case-77': precedents['case-77'],
        },
      }),
    ).toBeNull()

    expect(
      decodeGameState({
        ...encoded,
        precedents: {
          ...precedents,
          'case-81': 'reject-standing',
        },
      }),
    ).toBeNull()
  })
})

// A Case 81 state whose deposition site was resolved through the transcript, so
// depositionRecord is populated rather than null.
function playCase81WithDeposition(): GameState {
  let s = gameReducer(createInitialGameState(), { type: 'START_NEW' })
  s = gameReducer(s, { type: 'SELECT_APPROACH', approachId: 'care' })
  s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
  s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
  s = gameReducer(s, { type: 'OPEN_RECONSTRUCTION' })
  s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
  s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'registry-hash' })
  s = gameReducer(s, { type: 'SUBMIT_RECONSTRUCTION' })
  s = gameReducer(s, { type: 'ENTER_TRIBUNAL' })
  s = gameReducer(s, { type: 'SET_TRIBUNAL_CHOICE', choiceId: 'individual' })
  s = gameReducer(s, { type: 'DECIDE', decisionId: 'charter-new-person' })
  s = gameReducer(s, { type: 'START_CASE', caseId: 'case-81' })
  s = gameReducer(s, { type: 'SELECT_APPROACH', approachId: 'care' })
  return gameReducer(s, {
    type: 'COMMIT_DEPOSITION',
    actionId: 'take-sworn-statement',
    beats: ['corroborate', 'let-it-stand'],
    askedConsent: true,
  })
}

describe('deposition record persistence (optional-tolerated)', () => {
  it('round-trips a state carrying a committed deposition record', () => {
    const state = playCase81WithDeposition()
    expect(state.depositionRecord).toEqual({
      actionId: 'take-sworn-statement',
      beats: ['corroborate', 'let-it-stand'],
      askedConsent: true,
      consent: 'yes',
      testimonyUse: 'voluntary-office',
    })

    const encoded = JSON.parse(JSON.stringify(state)) as { schemaVersion: number }
    expect(encoded.schemaVersion).toBe(CURRENT_SAVE_SCHEMA)
    expect(decodeGameState(migrateRawSave(encoded))).toEqual(state)
  })

  it('tolerates absence but rejects a present-and-malformed record', () => {
    const encoded = JSON.parse(JSON.stringify(playCase81WithDeposition())) as Record<string, unknown>
    // Absence decodes to null (an old save that predates depositions).
    const withoutRecord = { ...encoded }
    delete withoutRecord.depositionRecord
    const decodedAbsent = decodeGameState(withoutRecord)
    expect(decodedAbsent).not.toBeNull()
    expect(decodedAbsent?.depositionRecord).toBeNull()

    // A v2 deposition lacked the explicit legal-use boundary. Keep the raw
    // history but mark that boundary unknown rather than reverse-engineering it.
    const legacyRecord = {
      ...encoded,
      depositionRecord: {
        actionId: 'take-sworn-statement',
        beats: ['corroborate', 'let-it-stand', 'corroborate'],
        askedConsent: true,
        consent: 'yes',
      },
    }
    const decodedLegacy = decodeGameState(legacyRecord)
    expect(decodedLegacy?.depositionRecord).toEqual({
      ...legacyRecord.depositionRecord,
      testimonyUse: 'unknown',
    })
    // Once normalized and saved as v3, the unknown sentinel must retain the old
    // beat trace on every later load rather than becoming self-invalidating.
    expect(
      decodeGameState(JSON.parse(JSON.stringify(decodedLegacy)) as unknown),
    ).toEqual(decodedLegacy)

    // Present but with an invalid consent value rejects the whole save.
    const malformed = {
      ...encoded,
      depositionRecord: {
        actionId: 'take-sworn-statement',
        beats: ['let-it-stand'],
        askedConsent: true,
        consent: 'maybe',
      },
    }
    expect(decodeGameState(malformed)).toBeNull()

    const malformedUse = {
      ...encoded,
      depositionRecord: {
        ...(encoded.depositionRecord as Record<string, unknown>),
        testimonyUse: 'permission-by-vibes',
      },
    }
    expect(decodeGameState(malformedUse)).toBeNull()
  })

  it('requires a present deposition to match the active case and completed action', () => {
    const encoded = JSON.parse(JSON.stringify(playCase81WithDeposition())) as Record<string, unknown>
    const record = encoded.depositionRecord as Record<string, unknown>

    expect(
      decodeGameState({
        ...encoded,
        depositionRecord: {
          ...record,
          // Valid deposition entry, but not the one this run completed.
          actionId: 'cross-examine-witness',
        },
      }),
    ).toBeNull()

    expect(
      decodeGameState({
        ...encoded,
        depositionRecord: {
          ...record,
          // A Case 81 field action, but not an authored deposition entry.
          actionId: 'pull-service-record',
        },
      }),
    ).toBeNull()

    let case77 = gameReducer(createInitialGameState(), { type: 'START_NEW' })
    case77 = gameReducer(case77, { type: 'SELECT_APPROACH', approachId: 'care' })
    case77 = gameReducer(case77, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    expect(
      decodeGameState({
        ...JSON.parse(JSON.stringify(case77)),
        depositionRecord: {
          actionId: 'listen-mara',
          beats: ['let-it-stand'],
          askedConsent: false,
          consent: 'unasked',
          testimonyUse: 'unasked',
        },
      }),
    ).toBeNull()
  })

  it('rejects an explicit current use boundary that disagrees with the authored resolver', () => {
    const encoded = JSON.parse(JSON.stringify(playCase81WithDeposition())) as Record<string, unknown>
    const record = encoded.depositionRecord as Record<string, unknown>

    expect(
      decodeGameState({
        ...encoded,
        depositionRecord: {
          ...record,
          testimonyUse: 'refused',
        },
      }),
    ).toBeNull()

    expect(
      decodeGameState({
        ...encoded,
        depositionRecord: {
          ...record,
          consent: 'no',
        },
      }),
    ).toBeNull()
  })
})

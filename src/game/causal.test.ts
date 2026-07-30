import { describe, expect, it } from 'vitest'
import {
  getApproachOpening,
  getFragmentKnowledge,
  getReconstructionFacts,
  resolveCausalChains,
  resolveCausalWorldOutcomes,
  resolveCounselState,
  resolveEllisDetail,
  resolveHearingStanding,
  resolveImmediateAftermath,
  resolveSubjectEncounter,
} from './causal'
import { getCaseContent } from './content'
import { createInitialGameState, gameReducer } from './engine'
import { decodeGameState, migrateRawSave } from './persistence'
import type { ApproachId, DepositionChoiceId, GameState } from './types'

function startCase(caseId: 'case-77' | 'case-81', approachId: ApproachId = 'procedure') {
  let state = createInitialGameState()
  state = gameReducer(state, { type: 'START_CASE', caseId })
  return gameReducer(state, { type: 'SELECT_APPROACH', approachId })
}

function commit(state: GameState, actionId: string) {
  return gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId })
}

function depose(
  actionId: 'take-sworn-statement' | 'cross-examine-witness',
  askedConsent: boolean,
  beats: readonly DepositionChoiceId[] = ['let-it-stand', 'corroborate', 'let-it-stand'],
) {
  return gameReducer(startCase('case-81', 'care'), {
    type: 'COMMIT_DEPOSITION',
    actionId,
    beats,
    askedConsent,
  })
}

describe('authored opening staging', () => {
  it('maps every approach to a visible first site and encounter in both cases', () => {
    for (const caseId of ['case-77', 'case-81'] as const) {
      const content = getCaseContent(caseId)
      for (const approachId of ['procedure', 'care', 'covert', 'curiosity'] as const) {
        const opening = getApproachOpening(startCase(caseId, approachId))
        expect(opening, `${caseId}/${approachId}`).not.toBeNull()
        expect(content.sites.some((site) => site.id === opening?.initialSiteId)).toBe(true)
        expect(opening?.encounterTitle.length).toBeGreaterThan(10)
        expect(opening?.objective.length).toBeGreaterThan(10)
        expect(opening?.environmentalCue.length).toBeGreaterThan(10)
      }
    }
  })
})

describe('fragment knowledge and speculative filing', () => {
  it('keeps decisive unknown content out of canonical reconstruction selection', () => {
    const content = getCaseContent('case-77')
    let state = startCase('case-77')
    expect(getFragmentKnowledge(content, state, 'scar-sensation')).toBe('unknown')

    state = commit(state, 'authenticate-chain')
    expect(getFragmentKnowledge(content, state, 'registry-hash')).toBe('corroborated')
    expect(getFragmentKnowledge(content, state, 'witness-account')).toBe('known')
    expect(getFragmentKnowledge(content, state, 'scar-sensation')).toBe('unknown')

    state = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
    const rejected = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'scar-sensation' })
    expect(rejected.selectedFragments).toEqual([])
    expect(rejected.announcement).toContain('still unknown')
  })

  it('persists one unsupported anchor as contested event facts', () => {
    let state = commit(startCase('case-77'), 'authenticate-chain')
    state = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'registry-hash' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
    state = gameReducer(state, { type: 'SUBMIT_RECONSTRUCTION' })

    expect(state.phase).toBe('investigation')
    const facts = getReconstructionFacts(state)
    expect(facts).toEqual({
      speculativeFragments: ['witness-account'],
      anchorStates: {
        'registry-hash': 'corroborated',
        'witness-account': 'known',
      },
    })
    const event = state.events.at(-1)
    expect(event?.tone).toBe('warning')
    expect(event?.detail).toContain('unsupported anchor remains contested')
  })

  it('rejects a two-known-anchor filing when neither anchor is corroborated', () => {
    const base = startCase('case-77')
    const state: GameState = {
      ...base,
      phase: 'reconstruction',
      completedActions: ['authenticate-chain'],
      completedSites: [],
      evidence: [],
      selectedFragments: ['registry-hash', 'witness-account'],
    }
    const rejected = gameReducer(state, { type: 'SUBMIT_RECONSTRUCTION' })
    expect(rejected.reconstruction).toBeNull()
    expect(rejected.announcement).toContain('at least one corroborated anchor')
  })

  it('round-trips optional reconstruction facts while old events remain valid', () => {
    let state = commit(startCase('case-77'), 'authenticate-chain')
    state = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'registry-hash' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
    state = gameReducer(state, { type: 'SUBMIT_RECONSTRUCTION' })

    const encoded = JSON.parse(JSON.stringify(state)) as Record<string, unknown>
    expect(decodeGameState(migrateRawSave(encoded))).toEqual(state)

    const legacy = JSON.parse(JSON.stringify(state)) as { events: { facts?: unknown }[] }
    for (const event of legacy.events) delete event.facts
    expect(decodeGameState(legacy)).not.toBeNull()
  })
})

describe('bounded ordered causal chains', () => {
  it('resolves Registry → Maintenance only in the authored order', () => {
    let forward = commit(startCase('case-77'), 'trace-checksum')
    expect(resolveCausalChains(forward).find((chain) => chain.id === 'registry-mark-to-maintenance')?.phase).toBe('primed')
    forward = commit(forward, 'walk-acoustic-shadow')
    expect(resolveCausalChains(forward).find((chain) => chain.id === 'registry-mark-to-maintenance')?.phase).toBe('resolved')

    let reverse = commit(startCase('case-77'), 'walk-acoustic-shadow')
    reverse = commit(reverse, 'trace-checksum')
    expect(resolveCausalChains(reverse).some((chain) => chain.id === 'registry-mark-to-maintenance')).toBe(false)
  })

  it('resolves Care → Archive and forged Maintenance → Registry as distinct chains', () => {
    let care = commit(startCase('case-77', 'care'), 'listen-mara')
    expect(resolveCausalChains(care).find((chain) => chain.id === 'mara-to-archive')?.phase).toBe('primed')
    care = commit(care, 'answer-archivist')
    expect(resolveCausalChains(care).find((chain) => chain.id === 'mara-to-archive')?.phase).toBe('resolved')

    let forged = commit(startCase('case-77', 'covert'), 'forge-authority')
    expect(resolveCausalChains(forged).find((chain) => chain.id === 'forged-maintenance-to-registry')?.phase).toBe('primed')
    forged = commit(forged, 'authenticate-chain')
    expect(resolveCausalChains(forged).find((chain) => chain.id === 'forged-maintenance-to-registry')?.phase).toBe('resolved')
  })

  it('resolves deposition → Counsel from the actual consent route', () => {
    let state = depose('take-sworn-statement', true)
    expect(resolveCausalChains(state).find((chain) => chain.id === 'deposition-to-counsel')?.phase).toBe('primed')
    state = commit(state, 'brief-city-counsel')
    expect(resolveCausalChains(state).find((chain) => chain.id === 'deposition-to-counsel')?.phase).toBe('resolved')
  })
})

describe('persistent settled world states', () => {
  it('provides an accessible world outcome for every filed site method', () => {
    for (const caseId of ['case-77', 'case-81'] as const) {
      const content = getCaseContent(caseId)
      const base = startCase(caseId)
      for (const action of content.fieldActions) {
        const state: GameState = {
          ...base,
          completedActions: [action.id],
          completedSites: [action.siteId],
          evidence: [action.evidenceId],
        }
        const outcome = resolveCausalWorldOutcomes(state).get(action.siteId)
        expect(outcome, `${caseId}/${action.id}`).toBeDefined()
        expect(outcome?.portalLabel.length).toBeGreaterThan(5)
        expect(outcome?.switcherLabel.length).toBeGreaterThan(3)
      }
    }
  })
})

describe('subject and witness agency', () => {
  it('keeps Mara, 77-A, and no-contact staging separate', () => {
    const mara = resolveSubjectEncounter(commit(startCase('case-77', 'care'), 'listen-mara'))
    expect(mara).toMatchObject({ temporaryName: 'Mara', consulted: true })
    expect(mara?.ordinaryWant).toContain('tea')

    const guarded = resolveSubjectEncounter(commit(startCase('case-77', 'care'), 'stress-test'))
    expect(guarded).toMatchObject({ temporaryName: '77-A', consulted: true })
    expect(guarded?.ordinaryWant).toContain('window')

    const absent = resolveSubjectEncounter(startCase('case-77', 'procedure'))
    expect(absent).toMatchObject({ temporaryName: null, consulted: false })
    expect(absent?.staging).toContain('empty')
    expect(absent?.request).toContain('does not invent consent')
  })

  it('derives an ordinary non-probative Ellis detail from the deposition path', () => {
    expect(resolveEllisDetail(depose('take-sworn-statement', true))).toContain('mint tea')
    expect(resolveEllisDetail(depose('cross-examine-witness', true))).toContain('pencil')
    expect(resolveEllisDetail(depose('cross-examine-witness', false))).toContain('relay clicks')
    expect(resolveEllisDetail(startCase('case-81'))).toContain('never took Ellis')
  })
})

describe('deterministic relationship consequences', () => {
  it('uses explicit thresholds and authored tie order without locking the route', () => {
    const state: GameState = {
      ...startCase('case-77'),
      trust: { registrar: -1, shepherd: 2, defector: -1, archivist: 2 },
    }
    const standing = resolveHearingStanding(state)
    expect(standing.supporter).toBe('shepherd')
    expect(standing.objector).toBe('registrar')
    expect(standing.exchange).toHaveLength(2)
    expect(standing.tieRule).toContain('authored persona order breaks ties')
  })

  it('returns no endorsement or objection when thresholds are not met', () => {
    const standing = resolveHearingStanding(startCase('case-81'))
    expect(standing.supporter).toBeNull()
    expect(standing.objector).toBeNull()
  })
})

describe('Case 81 Counsel variants', () => {
  it('separates voluntary, refused, compelled, unasked, and no-account rooms', () => {
    expect(resolveCounselState(depose('take-sworn-statement', true))?.id).toBe('voluntary')
    expect(resolveCounselState(depose('cross-examine-witness', true))?.id).toBe('refused')
    expect(resolveCounselState(depose('cross-examine-witness', false))?.id).toBe('compelled')
    expect(resolveCounselState(depose('take-sworn-statement', false))?.id).toBe('unasked')
    expect(resolveCounselState(startCase('case-81'))?.id).toBe('no-account')
  })

  it('names both advocates and raises inherited security pressure without changing verdict access', () => {
    const state: GameState = {
      ...depose('take-sworn-statement', true),
      precedents: { 'case-77': 'overwrite-record' },
    }
    const counsel = resolveCounselState(state)
    expect(counsel?.advocates.map((advocate) => advocate.name)).toEqual([
      'Advocate Ilyan Voss',
      'Advocate Sera Quill',
    ])
    expect(counsel?.securityPressure).toBe(true)
    expect(counsel?.detail).toContain('live authority diagnostic')
  })
})

describe('immediate aftermath', () => {
  it('selects a tableau from already-committed verdict facts without changing state', () => {
    const state: GameState = {
      ...commit(startCase('case-77', 'care'), 'listen-mara'),
      phase: 'debrief',
      decision: 'quarantine-review',
    }
    const before = JSON.stringify(state)
    const tableau = resolveImmediateAftermath(state)
    expect(tableau?.id).toBe('77-ward-gate')
    expect(tableau?.detail).toContain('tea cools')
    expect(JSON.stringify(state)).toBe(before)
  })
})

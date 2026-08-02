import { describe, expect, it } from 'vitest'
import { case77 } from './cases/case77'
import { case81 } from './cases/case81'
import { createInitialGameState, gameReducer } from './engine'
import {
  buildRecordIndex,
  entriesForEvent,
  groupByVoice,
  groupRecordEntries,
  RECORD_KINDS,
  recordHaystack,
  recordKindLabels,
  searchRecord,
} from './recordIndex'
import type { GameState } from './types'

function startInvestigation() {
  const initial = createInitialGameState()
  const briefing = gameReducer(initial, { type: 'START_NEW' })
  return gameReducer(briefing, { type: 'SELECT_APPROACH', approachId: 'care' })
}

// Two sites and one model filed — a run with something in every bucket the
// index can produce except the cross-case precedent.
function midRun(): GameState {
  let state = startInvestigation()
  state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
  state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
  state = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
  state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
  state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'registry-hash' })
  state = gameReducer(state, { type: 'SUBMIT_RECONSTRUCTION' })
  return state
}

// Every string leaf of an authored case bundle, so a leak test can ask "does any
// of THAT case's copy appear in THIS case's index" without hand-listing strings.
function stringLeaves(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    // Short leaves are ids and single words that legitimately recur across cases
    // ('registrar', 'care', 'mid'); the leak this guards is authored PROSE.
    if (trimmed.length >= 24) out.add(trimmed)
    return out
  }
  if (Array.isArray(value)) {
    for (const item of value) stringLeaves(item, out)
    return out
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) stringLeaves(item, out)
  }
  return out
}

describe('buildRecordIndex — the comprehension contract', () => {
  it('a fresh run holds nothing but the approach it just took', () => {
    const state = startInvestigation()
    const index = buildRecordIndex(state)

    // Exactly the events the run has logged, and nothing else: no evidence, no
    // site, no model, no anchor, no precedent, and no persona line (the approach
    // event authors no reactions).
    expect(index.every((entry) => entry.kind === 'event')).toBe(true)
    expect(index).toHaveLength(state.events.length)
    expect(index[0]!.title).toBe(state.events[0]!.title)
    expect(index[0]!.cite).toBe('Entry 01')
    for (const kind of RECORD_KINDS) {
      if (kind === 'event') continue
      expect(index.filter((entry) => entry.kind === kind)).toEqual([])
    }
  })

  it('nothing unfiled reaches the index — no unadmitted exhibit, no unvisited site', () => {
    const state = startInvestigation()
    const index = buildRecordIndex(state)
    const haystack = index.map(recordHaystack).join('\n')

    expect(state.evidence).toEqual([])
    expect(state.completedSites).toEqual([])
    for (const item of case77.evidenceDefinitions) {
      expect(haystack).not.toContain(item.title.toLowerCase())
      expect(haystack).not.toContain(item.claim.toLowerCase())
    }
    for (const site of case77.sites) {
      expect(haystack).not.toContain(site.description.toLowerCase())
    }
  })

  it('a filed method puts its evidence, its site and its reactions on the record — and nothing more', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    const index = buildRecordIndex(state)

    const evidence = index.filter((entry) => entry.kind === 'evidence')
    expect(evidence).toHaveLength(1)
    expect(evidence[0]!.title).toBe('The rain in room twelve')
    expect(evidence[0]!.cite).toBe('77-A testimony')

    const sites = index.filter((entry) => entry.kind === 'site')
    expect(sites.map((entry) => entry.title)).toEqual(['Care ward 12'])

    // The Registry's exhibits stay out until the Registry is filed.
    const haystack = index.map(recordHaystack).join('\n')
    expect(haystack).not.toContain('custody chain 77-a')
    expect(haystack).not.toContain('registry intake')
  })

  it('the filed model and its two anchors appear only once the model is filed', () => {
    // The lattice only opens once the run has filed enough to reconstruct from.
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
    state = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'registry-hash' })

    // Two anchors SELECTED but not submitted: a thought, not a filing.
    expect(state.selectedFragments).toHaveLength(2)
    expect(state.reconstruction).toBeNull()
    const before = buildRecordIndex(state)
    expect(before.filter((entry) => entry.kind === 'model')).toEqual([])
    expect(before.filter((entry) => entry.kind === 'anchor')).toEqual([])

    state = gameReducer(state, { type: 'SUBMIT_RECONSTRUCTION' })
    const after = buildRecordIndex(state)
    expect(after.filter((entry) => entry.kind === 'model')).toHaveLength(1)
    expect(after.filter((entry) => entry.kind === 'anchor')).toHaveLength(2)
    expect(after.find((entry) => entry.kind === 'anchor')!.cite).toContain('·')
  })

  it('no case-81 content ever reaches a case-77 index, and no case-77 content a case-81 one', () => {
    const seventySeven = buildRecordIndex(midRun())
    const seventySevenText = seventySeven.map(recordHaystack).join('\n')

    // Every authored prose leaf of the OTHER bundle, minus anything the two
    // bundles genuinely share (they share the persona cast and the method verbs).
    const shared = stringLeaves(case77)
    const foreign = [...stringLeaves(case81)].filter((leaf) => !shared.has(leaf))
    // Guard against a vacuous pass: if the candidate set were empty this loop
    // would assert nothing at all.
    expect(foreign.length).toBeGreaterThan(100)
    expect(seventySevenText.length).toBeGreaterThan(500)
    // And prove the check can fail: a poisoned haystack must be caught.
    expect(`${seventySevenText}\n${foreign[0]!.toLowerCase()}`).toContain(foreign[0]!.toLowerCase())
    for (const leaf of foreign) {
      expect(seventySevenText).not.toContain(leaf.toLowerCase())
    }

    // And the reverse, on a real Case 81 run reached the way a player reaches it:
    // a recorded Case 77 verdict, then START_CASE.
    let crossed: GameState = { ...midRun(), precedents: { 'case-77': 'certify-continuity' } }
    crossed = gameReducer(crossed, { type: 'START_CASE', caseId: 'case-81' })
    expect(crossed.caseId).toBe('case-81')
    crossed = gameReducer(crossed, { type: 'SELECT_APPROACH', approachId: 'procedure' })
    crossed = gameReducer(crossed, { type: 'COMMIT_FIELD_ACTION', actionId: 'open-deposition' })
    const eightyOneText = buildRecordIndex(crossed).map(recordHaystack).join('\n')
    const shared81 = stringLeaves(case81)
    for (const leaf of stringLeaves(case77)) {
      if (shared81.has(leaf)) continue
      expect(eightyOneText).not.toContain(leaf.toLowerCase())
    }
  })

  it('the carried precedent is on the record, cited to this case', () => {
    let crossed: GameState = { ...midRun(), precedents: { 'case-77': 'certify-continuity' } }
    crossed = gameReducer(crossed, { type: 'START_CASE', caseId: 'case-81' })
    crossed = gameReducer(crossed, { type: 'SELECT_APPROACH', approachId: 'procedure' })

    const precedent = buildRecordIndex(crossed).filter((entry) => entry.kind === 'precedent')
    expect(precedent).toHaveLength(1)
    expect(precedent[0]!.cite).toBe('Case 81 · precedent cited')
    expect(precedent[0]!.order).toBe(0)
    expect(precedent[0]!.body).toContain('Mara Vale')

    // A run with no recorded verdict carries none.
    expect(buildRecordIndex(midRun()).filter((entry) => entry.kind === 'precedent')).toEqual([])
  })
})

describe('buildRecordIndex — the entry shape E3 consumes', () => {
  it('every entry is complete, uniquely identified, and of a declared kind', () => {
    const index = buildRecordIndex(midRun())
    expect(index.length).toBeGreaterThan(8)
    const ids = new Set<string>()
    for (const entry of index) {
      expect(RECORD_KINDS).toContain(entry.kind)
      expect(entry.id).not.toBe('')
      expect(entry.title.trim()).not.toBe('')
      expect(entry.body.trim()).not.toBe('')
      expect(entry.cite.trim()).not.toBe('')
      expect(Number.isInteger(entry.order)).toBe(true)
      expect(entry.order).toBeGreaterThanOrEqual(0)
      expect(ids.has(entry.id)).toBe(false)
      ids.add(entry.id)
    }
  })

  it('is deterministic and never mutates the state it reads', () => {
    const state = midRun()
    const snapshot = JSON.stringify(state)
    const first = buildRecordIndex(state)
    const second = buildRecordIndex(state)
    expect(second).toEqual(first)
    expect(JSON.stringify(state)).toBe(snapshot)
  })

  it('reads the event’s own order, not its array position', () => {
    const state = midRun()
    const reversed: GameState = { ...state, events: [...state.events].reverse() }
    expect(buildRecordIndex(reversed)).toEqual(buildRecordIndex(state))
  })

  it('every entry born of a logged moment carries that moment’s number', () => {
    const state = midRun()
    const orders = new Set(state.events.map((event) => event.order))
    for (const entry of buildRecordIndex(state)) {
      if (entry.kind === 'precedent') continue
      expect(orders.has(entry.order)).toBe(true)
    }
    // The ledger's read: everything filed at one moment, found by that moment.
    const filing = state.events.find((event) => event.sourceId === 'listen-mara')!
    const atFiling = entriesForEvent(buildRecordIndex(state), filing)
    expect(atFiling.some((entry) => entry.kind === 'event')).toBe(true)
    expect(atFiling.some((entry) => entry.kind === 'evidence')).toBe(true)
    expect(atFiling.some((entry) => entry.kind === 'site')).toBe(true)
  })

  it('a reaction entry agrees line for line with the persona dossier’s transpose', () => {
    const state = midRun()
    const reactions = buildRecordIndex(state).filter((entry) => entry.kind === 'reaction')
    expect(reactions.length).toBeGreaterThan(0)
    for (const entry of reactions) {
      // The title IS the persona's name, and the citation IS the event title —
      // the same two fields personaRunLines prints.
      expect(['The Registrar', 'The Shepherd', 'The Defector', 'The Small Archivist']).toContain(
        entry.title,
      )
      expect(state.events.some((event) => event.title === entry.cite)).toBe(true)
    }
  })
})

describe('searchRecord', () => {
  it('an empty or whitespace query answers with nothing at all', () => {
    const index = buildRecordIndex(midRun())
    expect(searchRecord(index, '')).toEqual([])
    expect(searchRecord(index, '   ')).toEqual([])
  })

  it('matches case-insensitively across title, body and citation', () => {
    const index = buildRecordIndex(midRun())
    // Title (evidence).
    expect(searchRecord(index, 'rain in room').some((entry) => entry.kind === 'evidence')).toBe(true)
    expect(searchRecord(index, 'RAIN IN ROOM').length).toBe(searchRecord(index, 'rain in room').length)
    // Citation (the authored source of an admitted exhibit).
    expect(
      searchRecord(index, 'civic restoration ledger').some((entry) => entry.kind === 'evidence'),
    ).toBe(true)
    // Body (a site's description).
    expect(searchRecord(index, 'custody rail').some((entry) => entry.kind === 'site')).toBe(true)
  })

  it('a term with no answer returns an empty list rather than everything', () => {
    const index = buildRecordIndex(midRun())
    expect(searchRecord(index, 'zeppelin')).toEqual([])
  })

  it('never returns an entry the index does not hold', () => {
    const index = buildRecordIndex(midRun())
    for (const entry of searchRecord(index, 'e')) expect(index).toContain(entry)
  })

  it('cannot surface a site the run has not closed, however exact the query', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    const index = buildRecordIndex(state)
    const unvisited = case77.sites.find((site) => site.id === 'small-archive')!
    expect(state.completedSites).not.toContain(unvisited.id)
    expect(searchRecord(index, unvisited.name)).toEqual([])
    expect(searchRecord(index, unvisited.description)).toEqual([])
  })
})

describe('grouping', () => {
  it('groups in the declared kind order, drops empty kinds, and labels every group', () => {
    const groups = groupRecordEntries(buildRecordIndex(midRun()))
    const kinds = groups.map((group) => group.kind)
    expect(kinds).toEqual([...RECORD_KINDS].filter((kind) => kinds.includes(kind)))
    for (const group of groups) {
      expect(group.entries.length).toBeGreaterThan(0)
      expect(group.label).toBe(recordKindLabels[group.kind])
      const orders = group.entries.map((entry) => entry.order)
      expect(orders).toEqual([...orders].sort((a, b) => a - b))
    }
  })

  it('prints each voice once, however many of its lines matched — the name-count rule', () => {
    const index = buildRecordIndex(midRun())
    const reactions = index.filter((entry) => entry.kind === 'reaction')
    const voices = groupByVoice(reactions)
    const names = voices.map((voice) => voice.voice)
    expect(new Set(names).size).toBe(names.length)
    expect(voices.reduce((total, voice) => total + voice.entries.length, 0)).toBe(reactions.length)
    // And the buckets keep their lines in the run's own order.
    for (const voice of voices) {
      const orders = voice.entries.map((entry) => entry.order)
      expect(orders).toEqual([...orders].sort((a, b) => a - b))
    }
  })
})

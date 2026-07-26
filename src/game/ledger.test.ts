import { describe, expect, it } from 'vitest'
import { case77 } from './cases/case77'
import { case81 } from './cases/case81'
import { canEnterTribunal, createInitialGameState, gameReducer } from './engine'
import {
  buildContradictions,
  buildFindings,
  buildLedger,
  ledgerFilingLabels,
  replayAlarm,
} from './ledger'
import { buildRecordIndex, RECORD_KINDS, recordHaystack } from './recordIndex'
import type { ApproachId, GameState } from './types'

function startInvestigation(approachId: ApproachId = 'care') {
  const initial = createInitialGameState()
  const briefing = gameReducer(initial, { type: 'START_NEW' })
  return gameReducer(briefing, { type: 'SELECT_APPROACH', approachId })
}

/** One site filed, one model filed — something in every bucket but the precedent. */
function midRun(): GameState {
  let state = startInvestigation()
  state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
  state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
  state = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
  state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'scar-sensation' })
  state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'registry-hash' })
  return gameReducer(state, { type: 'SUBMIT_RECONSTRUCTION' })
}

/** The one Case 77 route that raises civic alarm. */
function alarmedRun(): GameState {
  let state = startInvestigation()
  state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'forge-authority' })
  return gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
}

function stringLeaves(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (typeof value === 'string') {
    const trimmed = value.trim()
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

describe('replayAlarm — the cost the run actually paid', () => {
  // THE RECONCILIATION. The ledger prints a per-moment alarm cost that exists
  // nowhere in GameState; it is recovered by mirroring the reducer's own
  // arithmetic. If the reducer ever grows a third alarm source, or changes the
  // clamp, these assertions fail rather than the ledger quietly lying.
  it('ends on exactly the alarm the reducer holds, on every route', () => {
    for (const state of [startInvestigation(), midRun(), alarmedRun()]) {
      const costs = [...replayAlarm(state).values()]
      const last = costs.at(-1)
      expect(last ? last.alarmAfter : 0).toBe(state.alarm)
    }
  })

  it('records a cost only at the moments that moved it, with before and after', () => {
    const state = alarmedRun()
    const costs = replayAlarm(state)
    const forgeEvent = state.events.find((event) => event.sourceId === 'forge-authority')!
    expect(costs.get(forgeEvent.order)).toEqual({ alarmBefore: 0, alarmAfter: 1, alarmDelta: 1 })
    // The approach event is not a field action and carries no cost at all.
    expect(costs.has(state.events[0]!.order)).toBe(false)
    // A quiet method still gets an entry — the ledger shows "unchanged", which is
    // itself information — but it moves nothing.
    const quiet = state.events.find((event) => event.sourceId === 'listen-mara')!
    expect(costs.get(quiet.order)).toEqual({ alarmBefore: 1, alarmAfter: 1, alarmDelta: 0 })
  })

  it('reads the PRECEDENT-resolved delta, not the authored base', () => {
    // Case 81's records-annex forge is authored at +1 and overridden to +2 when
    // the player wrote continuity with a forged hand in Case 77.
    const base = case81.fieldActions.find((a) => a.id === 'forge-certification-seal')!
    expect(base.alarmDelta).toBe(1)

    let plain: GameState = { ...midRun(), precedents: {} }
    plain = gameReducer(plain, { type: 'START_CASE', caseId: 'case-81' })
    plain = gameReducer(plain, { type: 'SELECT_APPROACH', approachId: 'procedure' })
    plain = gameReducer(plain, { type: 'COMMIT_FIELD_ACTION', actionId: 'forge-certification-seal' })
    const plainCost = [...replayAlarm(plain).values()].find((cost) => cost.alarmDelta !== 0)!
    expect(plainCost.alarmDelta).toBe(1)
    expect(plainCost.alarmAfter).toBe(plain.alarm)

    let watched: GameState = { ...midRun(), precedents: { 'case-77': 'overwrite-record' } }
    watched = gameReducer(watched, { type: 'START_CASE', caseId: 'case-81' })
    watched = gameReducer(watched, { type: 'SELECT_APPROACH', approachId: 'procedure' })
    watched = gameReducer(watched, {
      type: 'COMMIT_FIELD_ACTION',
      actionId: 'forge-certification-seal',
    })
    const watchedCost = [...replayAlarm(watched).values()].find((cost) => cost.alarmDelta !== 0)!
    expect(watchedCost.alarmDelta).toBe(2)
    expect(watchedCost.alarmAfter).toBe(watched.alarm)
    expect(watched.alarm).toBeGreaterThan(plain.alarm)
  })

  it('clamps at the ceiling the reducer clamps at', () => {
    // A synthetic state — the game never commits one action four times — built
    // purely to exercise the clamp branch the authored content cannot reach.
    const real = alarmedRun()
    const forge = real.events.find((event) => event.sourceId === 'forge-authority')!
    const piled: GameState = {
      ...real,
      events: [1, 2, 3, 4].map((order) => ({ ...forge, id: `synthetic-${order}`, order })),
    }
    const values = [...replayAlarm(piled).values()]
    expect(values.map((cost) => cost.alarmAfter)).toEqual([1, 2, 3, 3])
    expect(values.at(-1)!.alarmDelta).toBe(1)
  })
})

describe('buildFindings — the clerk’s summary', () => {
  it('a fresh run states only what a fresh run supports', () => {
    const findings = buildFindings(startInvestigation())
    expect(findings.map((finding) => finding.text)).toEqual([
      'No location is closed yet.',
      'No memory model is on file.',
      'The tribunal will not hear this record yet: 2 more locations must be closed and a memory model must be filed.',
    ])
  })

  it('names each closed location and the exhibit it put on the record', () => {
    const findings = buildFindings(midRun())
    const texts = findings.map((finding) => finding.text)
    expect(texts).toContain('Care ward 12 is closed, and it put “The rain in room twelve” on the record.')
    expect(texts).toContain('Registry intake is closed, and it put “Custody chain 77-A” on the record.')
    // Every quoted title is an authored string, never a paraphrase.
    for (const site of case77.sites) {
      if (!midRun().completedSites.includes(site.id)) continue
      expect(texts.some((text) => text.startsWith(`${site.name} `))) .toBe(true)
    }
  })

  it('reports the model by its authored title, or that none is on file', () => {
    expect(buildFindings(startInvestigation()).map((f) => f.text)).toContain(
      'No memory model is on file.',
    )
    const filed = midRun()
    const model = case77.reconstructionDefinitions.find((item) => item.id === filed.reconstruction)!
    expect(buildFindings(filed).map((f) => f.text)).toContain(
      `The memory model on file is “${model.title}”.`,
    )
  })

  it('the threshold sentence can never disagree with canEnterTribunal', () => {
    // Walk a run one commit at a time and check the sentence at every step.
    const states: GameState[] = []
    let state = startInvestigation()
    states.push(state)
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    states.push(state)
    state = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'scar-sensation' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'registry-hash' })
    state = gameReducer(state, { type: 'SUBMIT_RECONSTRUCTION' })
    states.push(state)
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
    states.push(state)

    // The walk must actually cross the gate, or this test proves nothing.
    expect(states.map(canEnterTribunal)).toEqual([false, false, false, true])
    for (const step of states) {
      const line = buildFindings(step).find((finding) => finding.id === 'finding:threshold')!
      expect(line.text.startsWith('The tribunal will hear')).toBe(canEnterTribunal(step))
    }
    // The mid-walk state with a model but one site names exactly what is missing.
    const modelOnly = buildFindings(states[2]!).find((f) => f.id === 'finding:threshold')!
    expect(modelOnly.text).toBe(
      'The tribunal will not hear this record yet: one more location must be closed.',
    )
  })

  it('counts contradictions with the right singular and plural', () => {
    // The P3-C scar: a count line that reads "1 admitted exhibits".
    let one = startInvestigation()
    one = gameReducer(one, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    expect(buildFindings(one).map((f) => f.text)).toContain(
      '1 admitted exhibit carries a contradiction against it.',
    )
    // Three, on this route: two field exhibits plus the one the filed model
    // admits — so the count is read from the state, not from the site count.
    expect(midRun().evidence).toHaveLength(3)
    expect(buildFindings(midRun()).map((f) => f.text)).toContain(
      '3 admitted exhibits carry a contradiction against them.',
    )
    // Nothing admitted yet: no count sentence at all, rather than a zero.
    expect(
      buildFindings(startInvestigation()).some((f) => f.id === 'finding:contradictions'),
    ).toBe(false)
  })

  it('states a carried precedent only when one is carried', () => {
    const precedentLine = 'A prior ruling is carried in from an earlier case and cited on this record.'
    expect(buildFindings(midRun()).map((f) => f.text)).not.toContain(precedentLine)

    let crossed: GameState = { ...midRun(), precedents: { 'case-77': 'certify-continuity' } }
    crossed = gameReducer(crossed, { type: 'START_CASE', caseId: 'case-81' })
    crossed = gameReducer(crossed, { type: 'SELECT_APPROACH', approachId: 'procedure' })
    const findings = buildFindings(crossed)
    expect(findings[0]!.text).toBe(precedentLine)
  })

  it('assembles sentences only — no fragment, no double space, curly quotes only', () => {
    for (const state of [startInvestigation(), midRun(), alarmedRun()]) {
      for (const finding of buildFindings(state)) {
        expect(finding.text.endsWith('.')).toBe(true)
        expect(finding.text).not.toContain('  ')
        expect(finding.text).not.toContain('"')
        expect(finding.text).not.toContain("'")
        expect(finding.text.trim()).toBe(finding.text)
      }
      const ids = buildFindings(state).map((finding) => finding.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('buildContradictions — the pair, in the authored words', () => {
  it('quotes claim and contradiction verbatim, for admitted exhibits only', () => {
    const state = midRun()
    const pairs = buildContradictions(state)
    expect(pairs.length).toBe(state.evidence.length)
    for (const pair of pairs) {
      const authored = case77.evidenceDefinitions.find((item) => pair.id.endsWith(item.id))!
      expect(pair.title).toBe(authored.title)
      expect(pair.claim).toBe(authored.claim)
      expect(pair.contradiction).toBe(authored.contradiction)
      expect(pair.cite).toBe(authored.source)
      expect(pair.claim).not.toBe(pair.contradiction)
    }
  })

  it('holds nothing for a run that has admitted nothing', () => {
    expect(buildContradictions(startInvestigation())).toEqual([])
  })

  it('cannot surface an unadmitted exhibit, however the case authors it', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    const titles = buildContradictions(state).map((pair) => pair.title)
    for (const item of case77.evidenceDefinitions) {
      if (state.evidence.includes(item.id)) continue
      expect(titles).not.toContain(item.title)
    }
  })
})

describe('buildLedger — the record read forwards', () => {
  it('a fresh run is one moment, no filings, nothing carried in', () => {
    const state = startInvestigation()
    const ledger = buildLedger(state)
    expect(ledger.moments).toHaveLength(state.events.length)
    expect(ledger.moments[0]!.title).toBe(state.events[0]!.title)
    expect(ledger.moments[0]!.cite).toBe('Entry 01')
    expect(ledger.moments[0]!.filings).toEqual([])
    expect(ledger.moments[0]!.contradictions).toEqual([])
    expect(ledger.moments[0]!.cost).toBeNull()
    expect(ledger.carriedIn).toEqual([])
    expect(ledger.contradictions).toEqual([])
  })

  it('reads forwards, one moment per logged event, ascending', () => {
    const ledger = buildLedger(midRun())
    const orders = ledger.moments.map((moment) => moment.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    expect(new Set(ledger.moments.map((moment) => moment.id)).size).toBe(ledger.moments.length)
  })

  it('every index entry lands exactly once — in a moment or carried in', () => {
    // The partition guard: the book must lose nothing the index holds and must
    // never print the same entry under two moments.
    for (const state of [startInvestigation(), midRun(), alarmedRun()]) {
      const index = buildRecordIndex(state)
      const ledger = buildLedger(state)
      const placed: string[] = ledger.carriedIn.map((entry) => entry.id)
      for (const moment of ledger.moments) {
        // The moment IS its event entry, so that entry is placed by the moment.
        placed.push(`event:${state.events.find((e) => e.order === moment.order)!.id}`)
        for (const filing of moment.filings) placed.push(filing.id)
        for (const voice of moment.voices) for (const line of voice.entries) placed.push(line.id)
      }
      expect(new Set(placed).size).toBe(placed.length)
      expect([...placed].sort()).toEqual(index.map((entry) => entry.id).sort())
    }
  })

  it('a filing moment carries its exhibit, its location and its contradiction pair', () => {
    const state = midRun()
    const ledger = buildLedger(state)
    const filing = ledger.moments.find((moment) =>
      moment.filings.some((entry) => entry.kind === 'evidence'),
    )!
    expect(filing.filings.some((entry) => entry.kind === 'site')).toBe(true)
    expect(filing.contradictions).toHaveLength(1)
    const exhibit = filing.filings.find((entry) => entry.kind === 'evidence')!
    expect(filing.contradictions[0]!.title).toBe(exhibit.title)
    // Every filing kind the ledger can print has a label, and no filing is an
    // event (the event is the moment) or a reaction (those group by voice).
    for (const moment of ledger.moments) {
      for (const entry of moment.filings) {
        expect(entry.kind).not.toBe('event')
        expect(entry.kind).not.toBe('reaction')
        expect(ledgerFilingLabels[entry.kind]).toBeTruthy()
      }
    }
    expect(Object.keys(ledgerFilingLabels).sort()).toEqual([...RECORD_KINDS].sort())
  })

  it('prints each presence once inside a moment — the name-count rule, per moment', () => {
    const ledger = buildLedger(midRun())
    let spoke = 0
    for (const moment of ledger.moments) {
      const names = moment.voices.map((voice) => voice.voice)
      expect(new Set(names).size).toBe(names.length)
      spoke += names.length
    }
    expect(spoke).toBeGreaterThan(0)
  })

  it('carries a prior ruling in as its own entry, outside the run’s own log', () => {
    let crossed: GameState = { ...midRun(), precedents: { 'case-77': 'certify-continuity' } }
    crossed = gameReducer(crossed, { type: 'START_CASE', caseId: 'case-81' })
    crossed = gameReducer(crossed, { type: 'SELECT_APPROACH', approachId: 'procedure' })
    const ledger = buildLedger(crossed)
    expect(ledger.carriedIn).toHaveLength(1)
    expect(ledger.carriedIn[0]!.kind).toBe('precedent')
    expect(ledger.carriedIn[0]!.order).toBe(0)
    for (const moment of ledger.moments) {
      expect(moment.filings.every((entry) => entry.kind !== 'precedent')).toBe(true)
    }
  })

  it('is deterministic and never mutates the state it reads', () => {
    const state = midRun()
    const snapshot = JSON.stringify(state)
    expect(buildLedger(state)).toEqual(buildLedger(state))
    expect(JSON.stringify(state)).toBe(snapshot)
  })

  it('reads the event’s own order, not its array position', () => {
    const state = midRun()
    const reversed: GameState = { ...state, events: [...state.events].reverse() }
    expect(buildLedger(reversed)).toEqual(buildLedger(state))
  })

  it('no case-81 prose reaches a case-77 ledger, and no case-77 prose a case-81 one', () => {
    const ledgerText = (state: GameState) => {
      const ledger = buildLedger(state)
      return [
        ...ledger.findings.map((finding) => finding.text),
        ...ledger.carriedIn.map(recordHaystack),
        ...ledger.moments.flatMap((moment) => [
          moment.title,
          moment.detail,
          moment.cite,
          ...moment.filings.map(recordHaystack),
          ...moment.voices.flatMap((voice) => voice.entries.map(recordHaystack)),
          ...moment.contradictions.flatMap((pair) => [pair.title, pair.claim, pair.contradiction, pair.cite]),
        ]),
      ]
        .join('\n')
        .toLowerCase()
    }

    const seventySeven = ledgerText(midRun())
    const shared77 = stringLeaves(case77)
    const foreign = [...stringLeaves(case81)].filter((leaf) => !shared77.has(leaf))
    expect(foreign.length).toBeGreaterThan(100)
    expect(seventySeven.length).toBeGreaterThan(500)
    // Prove the check can fail before trusting that it passes.
    expect(`${seventySeven}\n${foreign[0]!.toLowerCase()}`).toContain(foreign[0]!.toLowerCase())
    for (const leaf of foreign) expect(seventySeven).not.toContain(leaf.toLowerCase())

    let crossed: GameState = { ...midRun(), precedents: { 'case-77': 'certify-continuity' } }
    crossed = gameReducer(crossed, { type: 'START_CASE', caseId: 'case-81' })
    crossed = gameReducer(crossed, { type: 'SELECT_APPROACH', approachId: 'procedure' })
    crossed = gameReducer(crossed, { type: 'COMMIT_FIELD_ACTION', actionId: 'open-deposition' })
    const eightyOne = ledgerText(crossed)
    const shared81 = stringLeaves(case81)
    for (const leaf of stringLeaves(case77)) {
      if (shared81.has(leaf)) continue
      expect(eightyOne).not.toContain(leaf.toLowerCase())
    }
  })
})

import { describe, expect, it } from 'vitest'
import { case77 } from './cases/case77'
import { case81 } from './cases/case81'
import { createInitialGameState, gameReducer } from './engine'
import { momentForSite } from './ledger'
import {
  collapseRetires,
  detailDrawerProse,
  equivalenceGaps,
  inspectorProse,
  ledgerGapsForFiledSite,
  spineKeeps,
} from './siteRecordText'
import type { ApproachId, GameState } from './types'

function startInvestigation(approachId: ApproachId = 'care'): GameState {
  const briefing = gameReducer(createInitialGameState(), { type: 'START_NEW' })
  return gameReducer(briefing, { type: 'SELECT_APPROACH', approachId })
}

/** Two locations filed on two different routes, plus a model — a real mid-run. */
function midRun(): GameState {
  let state = startInvestigation()
  state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
  state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
  state = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
  state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'scar-sensation' })
  state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'registry-hash' })
  return gameReducer(state, { type: 'SUBMIT_RECONSTRUCTION' })
}

/** The one Case 77 route that raises civic alarm and grants an override. */
function alarmedRun(): GameState {
  let state = startInvestigation()
  state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'forge-authority' })
  return gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
}

/** Every state a run passes through that the collapse can be on screen during. */
const RUNS: readonly { label: string; state: GameState }[] = [
  { label: 'fresh run', state: startInvestigation() },
  { label: 'other approach', state: startInvestigation('procedure') },
  { label: 'mid run', state: midRun() },
  { label: 'alarmed run', state: alarmedRun() },
]

const SITE_IDS = case77.sites.map((site) => site.id)

describe('the collapse retires nothing the drawer does not carry', () => {
  // THE PROOF THE ALWAYS-MOUNTED SCAR DEMANDS. Not "the drawer looks similar" —
  // every string the expanded inspector prints and the spine does not keep must
  // be present, character-for-character, in what the Location detail drawer
  // prints for the same location in the same state.
  it('has zero equivalence gaps on every Case 77 location, in every run state', () => {
    for (const { label, state } of RUNS) {
      for (const siteId of SITE_IDS) {
        const gaps = equivalenceGaps(state, siteId)
        expect(
          gaps.map((line) => `${label}/${siteId}: ${line.id} — ${line.text}`),
        ).toEqual([])
      }
    }
  })

  it('holds for Case 81 too, whose locations never collapse', () => {
    // Case 81 authors no `closeup.sceneFirst`, so its inspector never collapses —
    // but the equivalence must hold anyway, or a later case that opts in inherits
    // a broken proof rather than a working one.
    const state = { ...startInvestigation(), caseId: case81.id } as GameState
    for (const site of case81.sites) {
      expect(equivalenceGaps(state, site.id).map((line) => line.id)).toEqual([])
    }
  })

  it('is not vacuous — the retirement set is large and includes the description', () => {
    // A proof that passes because nothing is retired proves nothing. Pin both the
    // size and the identity of what the collapse actually removes.
    const state = midRun()
    for (const siteId of SITE_IDS) {
      const retired = collapseRetires(state, siteId)
      expect(retired.length).toBeGreaterThanOrEqual(9)
      const site = case77.sites.find((item) => item.id === siteId)!
      expect(retired.map((line) => line.text)).toContain(site.description)
      // …and the method prose, both methods, all four fields each.
      for (const actionId of site.actionIds) {
        const action = case77.fieldActions.find((item) => item.id === actionId)!
        expect(retired.map((line) => line.text)).toContain(action.consequence)
        expect(retired.map((line) => line.text)).toContain(action.description)
      }
    }
  })

  it('keeps identity and status on the spine, and never retires them', () => {
    const state = midRun()
    for (const siteId of SITE_IDS) {
      const site = case77.sites.find((item) => item.id === siteId)!
      const kept = spineKeeps(state, siteId).map((line) => line.text)
      expect(kept).toContain(site.index)
      expect(kept).toContain(site.name)
      expect(kept).toContain(state.completedSites.includes(siteId) ? 'Filed' : 'Open')
      const retired = collapseRetires(state, siteId).map((line) => line.text)
      for (const text of kept) expect(retired).not.toContain(text)
    }
  })

  it('carries the filed card — reactions and all — once a location is closed', () => {
    const state = midRun()
    const closed = state.completedSites
    expect(closed.length).toBeGreaterThan(0)
    for (const siteId of closed) {
      const action = case77.fieldActions.find(
        (item) => item.siteId === siteId && state.completedActions.includes(item.id),
      )!
      const drawer = detailDrawerProse(state, siteId).map((line) => line.text)
      expect(drawer).toContain(action.eventDetail)
      for (const reaction of action.reactions ?? []) expect(drawer).toContain(reaction.line)
      // The inspector's own filed card is a subset of it.
      const inspector = inspectorProse(state, siteId).map((line) => line.text)
      for (const text of inspector) expect(drawer.concat(['Open', 'Filed'])).toContain(text)
    }
  })
})

describe('momentForSite — the ledger join for a closed location', () => {
  it('finds the moment that closed each filed location, and only those', () => {
    const state = midRun()
    for (const siteId of SITE_IDS) {
      const moment = momentForSite(state, siteId)
      if (!state.completedSites.includes(siteId)) {
        expect(moment).toBeUndefined()
        continue
      }
      const action = case77.fieldActions.find(
        (item) => item.siteId === siteId && state.completedActions.includes(item.id),
      )!
      const event = state.events.find(
        (item) => item.sourceType === 'field-action' && item.sourceId === action.id,
      )!
      expect(moment?.order).toBe(event.order)
      expect(moment?.title).toBe(event.title)
    }
  })

  it('attributes a precedent-overridden action to its own location', () => {
    // The Case 81 seal action's alarm is overridden by a Case 77 forgery verdict;
    // the join must still land on the location that authored the action.
    let state = { ...startInvestigation(), caseId: case81.id } as GameState
    state = { ...state, precedents: { 'case-77': 'certify-forgery' } }
    const action = case81.fieldActions.find((item) => item.id === 'forge-certification-seal')
    if (!action) return
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: action.id })
    expect(momentForSite(state, action.siteId)?.order).toBeDefined()
    // …and no OTHER location claims it.
    for (const site of case81.sites) {
      if (site.id === action.siteId) continue
      expect(momentForSite(state, site.id)).toBeUndefined()
    }
  })

  it('puts every filed-card string of a closed location on the ledger too', () => {
    // The second, independent home: for a CLOSED location the filed card is on
    // the record itself, not only in the drawer. Round 2 §8.1 promised this proof
    // would be writable against a pure function; this is it.
    const state = midRun()
    for (const siteId of state.completedSites) {
      const gaps = ledgerGapsForFiledSite(state, siteId)
      // The civic-trace and standing summaries are the inspector's own composed
      // labels, not authored strings, so they are not expected on the ledger; the
      // narrative half — event title, detail, exhibit, reactions — is.
      const narrative = gaps.filter(
        (line) => !/civic-trace|standing|authority/.test(line.id),
      )
      expect(narrative.map((line) => `${siteId}: ${line.id} — ${line.text}`)).toEqual([])
    }
  })
})

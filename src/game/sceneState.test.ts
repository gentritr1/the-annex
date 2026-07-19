import { describe, expect, it } from 'vitest'
import {
  resolveCommitConsent,
  sceneStateFor,
  witnessesRefusalOnCommit,
} from '../scene/sceneState'
import { getCaseContent } from './content'
import { createInitialGameState } from './engine'
import type { DepositionConsent, DepositionRecord, GameState } from './types'

// sceneStateFor is view-derived: given canonical GameState + the surface being
// rendered (and, on investigation, the open deposition entry), it resolves one of
// the six scene states. These tests exercise the full mapping table for both a
// deposition case (81) and a deposition-less case (77). This file lives under
// src/game (not src/scene) so it may reference case ids directly — the shared
// scene runtime it tests carries none.

const base = createInitialGameState()

function stateFor(caseId: string, overrides: Partial<GameState> = {}): GameState {
  return { ...base, caseId, phase: 'investigation', ...overrides }
}

describe('sceneStateFor', () => {
  it('resolves the tribunal and debrief surfaces to fixed states in both cases', () => {
    ;['case-77', 'case-81'].forEach((caseId) => {
      const state = stateFor(caseId)
      expect(sceneStateFor(state, { surface: 'tribunal' })).toBe('tribunal')
      expect(sceneStateFor(state, { surface: 'debrief' })).toBe('aftermath')
    })
  })

  it('defaults investigation to neutral with no deposition open or committed', () => {
    ;['case-77', 'case-81'].forEach((caseId) => {
      expect(sceneStateFor(stateFor(caseId), { surface: 'investigation' })).toBe('neutral')
    })
  })

  it('presses when a coercive deposition entry is open and corroborates otherwise (Case 81)', () => {
    const content = getCaseContent('case-81')
    const deposition = content.deposition
    expect(deposition).toBeDefined()
    if (!deposition) return

    const isCoercive = (id: string) =>
      Boolean(content.fieldActions.find((action) => action.id === id)?.methodTags.includes('coercion'))
    const coercive = deposition.entryActionIds.find(isCoercive)
    const plain = deposition.entryActionIds.find((id) => !isCoercive(id))
    expect(coercive).toBeDefined()
    expect(plain).toBeDefined()

    const state = stateFor('case-81')
    expect(sceneStateFor(state, { surface: 'investigation', openDepositionEntry: coercive })).toBe(
      'press',
    )
    expect(sceneStateFor(state, { surface: 'investigation', openDepositionEntry: plain })).toBe(
      'corroborate',
    )
  })

  it('holds refusal after a committed deposition where the witness said no (Case 81)', () => {
    const refusedRecord: DepositionRecord = {
      actionId: 'cross-examine-witness',
      beats: ['let-it-stand', 'let-it-stand', 'let-it-stand'],
      askedConsent: true,
      consent: 'no',
    }
    const refused = stateFor('case-81', { depositionRecord: refusedRecord })
    expect(sceneStateFor(refused, { surface: 'investigation' })).toBe('refusal')

    // A committed deposition with consent yes/unasked does not hold refusal.
    const consented = stateFor('case-81', {
      depositionRecord: { ...refusedRecord, consent: 'yes' },
    })
    expect(sceneStateFor(consented, { surface: 'investigation' })).toBe('neutral')
  })

  it('never presses, corroborates, or refuses for a case with no deposition (Case 77)', () => {
    const content = getCaseContent('case-77')
    expect(content.deposition).toBeUndefined()

    const state = stateFor('case-77')
    // Even with a stray open-entry id, a deposition-less case stays neutral.
    expect(
      sceneStateFor(state, { surface: 'investigation', openDepositionEntry: 'take-sworn-statement' }),
    ).toBe('neutral')
  })
})

// The witnessed-refusal beat (Finding 1b) fires from the COMMIT result, once, and
// only when the committed consent is a refusal. These unit-test that trigger logic
// in isolation: resolveCommitConsent (what a commit will persist) + the predicate.
describe('witnessed-refusal beat trigger', () => {
  const ALL_CONSENTS: DepositionConsent[] = ['yes', 'no', 'unasked']

  it('witnesses the room only on a refused ("no") consent', () => {
    expect(witnessesRefusalOnCommit('no')).toBe(true)
    expect(witnessesRefusalOnCommit('yes')).toBe(false)
    expect(witnessesRefusalOnCommit('unasked')).toBe(false)
  })

  it('is a pure predicate — same input, same result, no persisted-state read', () => {
    // Deterministic and side-effect free: calling twice yields the same boolean, so
    // a commit is evaluated once and never latches onto anything external.
    ALL_CONSENTS.forEach((consent) => {
      expect(witnessesRefusalOnCommit(consent)).toBe(witnessesRefusalOnCommit(consent))
    })
  })

  it('resolves committed consent from the authored answer, or unasked when declined', () => {
    const deposition = getCaseContent('case-81').deposition
    expect(deposition).toBeDefined()
    if (!deposition) return

    // Find an entry action whose authored answer refuses, and one that consents.
    const entries = deposition.entryActionIds
    const refusedEntry = entries.find((id) => deposition.consent.answers[id]?.consent === 'no')
    const consentedEntry = entries.find((id) => deposition.consent.answers[id]?.consent === 'yes')
    expect(refusedEntry).toBeDefined()
    if (!refusedEntry) return

    // Asking surfaces the authored answer; declining always persists 'unasked'.
    expect(resolveCommitConsent(deposition, refusedEntry, true)).toBe('no')
    expect(resolveCommitConsent(deposition, refusedEntry, false)).toBe('unasked')
    if (consentedEntry) {
      expect(resolveCommitConsent(deposition, consentedEntry, true)).toBe('yes')
    }

    // The beat fires on the refused-and-asked commit, and NOT when the same entry
    // is committed without asking (unasked) — proving it keys off the commit, not
    // any standing refusal.
    expect(witnessesRefusalOnCommit(resolveCommitConsent(deposition, refusedEntry, true))).toBe(true)
    expect(witnessesRefusalOnCommit(resolveCommitConsent(deposition, refusedEntry, false))).toBe(
      false,
    )
  })

  it('a deposition-less case never resolves to a refusal commit', () => {
    const deposition = getCaseContent('case-77').deposition
    expect(deposition).toBeUndefined()
    // With no deposition, any commit resolves to unasked → the beat never fires.
    expect(witnessesRefusalOnCommit(resolveCommitConsent(deposition, 'take-sworn-statement', true))).toBe(
      false,
    )
  })
})

import { describe, expect, it } from 'vitest'
import { sceneStateFor } from '../scene/sceneState'
import { getCaseContent } from './content'
import { createInitialGameState } from './engine'
import type { DepositionRecord, GameState } from './types'

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

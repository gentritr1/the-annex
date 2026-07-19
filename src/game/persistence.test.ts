import { describe, expect, it } from 'vitest'
import { createInitialGameState, gameReducer } from './engine'
import { decodeAccessibilitySettings, decodeGameState } from './persistence'

function validInvestigationState() {
  const initial = createInitialGameState()
  const briefing = gameReducer(initial, { type: 'START_NEW' })
  return gameReducer(briefing, { type: 'SELECT_APPROACH', approachId: 'procedure' })
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

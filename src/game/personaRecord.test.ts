import { describe, expect, it } from 'vitest'
import { getReactionsForSource } from './content'
import { createInitialGameState, gameReducer } from './engine'
import { personaRunLines } from './personaRecord'
import type { GameEvent, GameState } from './types'

function startInvestigation() {
  const initial = createInitialGameState()
  const briefing = gameReducer(initial, { type: 'START_NEW' })
  return gameReducer(briefing, { type: 'SELECT_APPROACH', approachId: 'care' })
}

describe('personaRunLines — the persona-major transpose of the event log', () => {
  it('a fresh run has nothing on the record for any persona', () => {
    const state = startInvestigation()
    for (const id of ['registrar', 'shepherd', 'defector', 'archivist'] as const) {
      expect(personaRunLines(state, id)).toEqual([])
    }
  })

  it('a filed method puts its authored line on that persona’s record, cited by event title', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })

    const shepherd = personaRunLines(state, 'shepherd')
    expect(shepherd).toHaveLength(1)
    expect(shepherd[0]!.cite).toBe('77-A was heard before she was measured')
    expect(shepherd[0]!.line).toContain('You let her finish before you measured her.')

    // The same commit says nothing in the Registrar's voice.
    expect(personaRunLines(state, 'registrar')).toEqual([])
  })

  it('only the named persona’s lines are transposed out of a multi-voice moment', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'trace-checksum' })

    expect(personaRunLines(state, 'archivist')).toHaveLength(1)
    expect(personaRunLines(state, 'registrar')).toEqual([])
    expect(personaRunLines(state, 'shepherd')).toEqual([])
    expect(personaRunLines(state, 'defector')).toEqual([])
  })

  it('accumulates across a run in ascending event order', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    state = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'scar-sensation' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
    state = gameReducer(state, { type: 'SUBMIT_RECONSTRUCTION' })

    const shepherd = personaRunLines(state, 'shepherd')
    expect(shepherd.length).toBeGreaterThanOrEqual(1)
    const orders = shepherd.map((entry) => entry.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    // Every citation names a real logged event.
    const titles = new Set(state.events.map((event) => event.title))
    for (const entry of shepherd) expect(titles.has(entry.cite)).toBe(true)
  })

  it('sorts by the event’s own order, not by array position', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })

    const reversed: GameState = { ...state, events: [...state.events].reverse() }
    const forward = personaRunLines(state, 'registrar')
    expect(personaRunLines(reversed, 'registrar')).toEqual(forward)
    expect(forward.map((entry) => entry.order)).toEqual(
      [...forward.map((entry) => entry.order)].sort((a, b) => a - b),
    )
  })

  it('is the exact transpose of what the event log renders per event', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })

    // Rebuild the persona-major view the way the log panel would, event by event,
    // and require the helper to agree line for line.
    for (const id of ['registrar', 'shepherd', 'defector', 'archivist'] as const) {
      const fromLog = [...state.events]
        .sort((a, b) => a.order - b.order)
        .flatMap((event: GameEvent) =>
          getReactionsForSource(state.caseId, event.sourceType, event.sourceId, state.precedents)
            .filter((reaction) => reaction.persona === id)
            .map((reaction) => ({ order: event.order, cite: event.title, line: reaction.line })),
        )
      expect(personaRunLines(state, id)).toEqual(fromLog)
    }
  })

  it('a decision or approach event contributes nothing (no authored reactions)', () => {
    const state = startInvestigation()
    // The approach selection is already logged at this point.
    expect(state.events.length).toBeGreaterThan(0)
    expect(state.events.some((event) => event.sourceType === 'approach')).toBe(true)
    const all = (['registrar', 'shepherd', 'defector', 'archivist'] as const).flatMap((id) =>
      personaRunLines(state, id),
    )
    expect(all).toEqual([])
  })

  it('never mutates the state it reads', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    const snapshot = JSON.stringify(state)
    personaRunLines(state, 'shepherd')
    expect(JSON.stringify(state)).toBe(snapshot)
  })
})

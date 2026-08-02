// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState, gameReducer } from '../game/engine'
import { Deposition } from './Deposition'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function case81Investigation() {
  let state = gameReducer(createInitialGameState(), {
    type: 'START_CASE',
    caseId: 'case-81',
  })
  state = gameReducer(state, { type: 'SELECT_APPROACH', approachId: 'procedure' })
  return state
}

function buttonNamed(name: string): HTMLButtonElement {
  const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(name),
  )
  if (!button) throw new Error(`Button not found: ${name}`)
  return button
}

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

describe('Deposition', () => {
  it('describes the focused use step with the newly revealed legal boundary', () => {
    act(() => {
      root.render(
        <Deposition
          state={case81Investigation()}
          entryActionId="take-sworn-statement"
          onCommit={() => undefined}
          onAbandon={() => undefined}
        />,
      )
    })

    act(() => buttonNamed('Let Ellis name the speaker').click())
    act(() => buttonNamed('Offer protected future disclosure').click())
    act(() => buttonNamed('Ask for legal use').click())

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    const answer = document.querySelector<HTMLElement>('#deposition-use-answer')!
    expect(dialog.getAttribute('aria-describedby')).toBe('deposition-use-answer')
    expect(answer.textContent).toMatch(/office-level account/i)
    expect(document.activeElement).toBe(dialog)
  })
})

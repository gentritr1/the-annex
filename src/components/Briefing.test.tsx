// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState, gameReducer } from '../game/engine'
import { Briefing } from './Briefing'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

describe('Briefing opening approach review', () => {
  it('keeps the approach as a view-local draft until Begin audit', () => {
    const state = gameReducer(createInitialGameState(), { type: 'START_NEW' })
    const before = JSON.stringify(state)
    const onSelectApproach = vi.fn()

    act(() => {
      root.render(<Briefing state={state} onSelectApproach={onSelectApproach} />)
    })

    const care = [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('Begin with the person'),
    )
    expect(care).toBeDefined()
    act(() => care?.click())

    expect(onSelectApproach).not.toHaveBeenCalled()
    expect(JSON.stringify(state)).toBe(before)
    expect(state.primaryApproach).toBeNull()
    expect(host.querySelector('[data-approach-id="care"]')?.getAttribute('data-selected')).toBe(
      'true',
    )
    const reviewCopy = host.textContent ?? ''
    expect(reviewCopy).toContain('Method memory: Care')
    expect(reviewCopy).toContain('Relationship: The Shepherd +1')
    expect(reviewCopy.match(/Method memory: Care/g)).toHaveLength(1)
    expect(reviewCopy.match(/Relationship: The Shepherd \+1/g)).toHaveLength(1)

    const beginAudit = [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('Begin audit'),
    )
    expect(beginAudit).toBeDefined()
    act(() => beginAudit?.click())

    expect(onSelectApproach).toHaveBeenCalledTimes(1)
    expect(onSelectApproach).toHaveBeenCalledWith('care')
  })
})

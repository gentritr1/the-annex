// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

function buttonContaining(text: string): HTMLButtonElement {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')]
  const button = buttons.find((candidate) =>
    candidate.textContent?.includes(text),
  )
  if (!button) {
    throw new Error(
      `Expected button containing ${text}; found ${buttons.map((candidate) => candidate.textContent).join(' | ')}`,
    )
  }
  return button
}

beforeEach(() => {
  localStorage.clear()
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
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    value: () => undefined,
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: () => undefined,
  })
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    callback(0)
    return 1
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  document.querySelectorAll('[role="dialog"]').forEach((dialog) => dialog.remove())
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('App modal boundary', () => {
  it('makes the app shell inert when a location detail dialog opens and returns focus to its opener', () => {
    act(() => root.render(<App />))
    act(() => buttonContaining('Open a new audit').click())
    act(() => buttonContaining('Begin with the record').click())
    act(() => buttonContaining('Begin audit').click())
    act(() => buttonContaining('Enter Registry').click())
    act(() => buttonContaining('Return to concourse').click())
    act(() => buttonContaining('Care ward 12').click())
    const detailOpener = buttonContaining('Location detail')
    act(() => {
      detailOpener.focus()
      detailOpener.click()
    })

    const shell = host.querySelector<HTMLElement>('.annex-app')
    expect(document.querySelector('[role="dialog"][aria-modal="true"]')).not.toBeNull()
    expect(shell?.hasAttribute('inert')).toBe(true)

    act(() => document.querySelector<HTMLButtonElement>('.scene-detail-close')!.click())

    expect(document.querySelector('[role="dialog"][aria-modal="true"]')).toBeNull()
    expect(shell?.hasAttribute('inert')).toBe(false)
    expect(document.activeElement).toBe(detailOpener)
  })
})

// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SecretDefinition } from '../game/types'
import { FourthMarginMarker } from './FourthMarginMarker'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const definition: SecretDefinition = {
  id: 'schopenhauer-succession',
  kind: 'aphorism',
  title: 'What the intellect lets go',
  body: 'A retained public-domain fragment.',
  counterline: 'A witness is not the part an office chose to keep.',
  location: 'Restoration lab · under-bench register',
  announcement: 'A Fourth Margin fragment was retained.',
  availablePhases: ['investigation'],
  siteId: 'restoration-lab',
  anchor: { x: 0.7, y: 0.75 },
  compactAnchor: { x: 0.72, y: 0.43 },
}

let host: HTMLDivElement
let root: Root

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

describe('FourthMarginMarker', () => {
  it('renders one anchored, focusable discovery control and routes inspection', () => {
    const onInspect = vi.fn()
    act(() =>
      root.render(
        <FourthMarginMarker
          definition={definition}
          discovered={false}
          onInspect={onInspect}
        />,
      ),
    )

    const anchor = host.querySelector<HTMLElement>('.fourth-margin-anchor')!
    const marker = host.querySelector<HTMLButtonElement>('.fourth-margin-marker')!
    expect(anchor.getAttribute('style')).toContain('--fourth-margin-x: 70%')
    expect(anchor.getAttribute('style')).toContain('--fourth-margin-y: 75%')
    expect(anchor.getAttribute('style')).toContain('--fourth-margin-compact-x: 72%')
    expect(anchor.getAttribute('style')).toContain('--fourth-margin-compact-y: 43%')
    expect(marker.type).toBe('button')
    expect(marker.getAttribute('data-secret-id')).toBe(definition.id)
    expect(marker.getAttribute('data-discovered')).toBeNull()
    expect(marker.getAttribute('aria-label')).toBe('Inspect irregular mark')
    expect(marker.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2)

    marker.focus()
    expect(document.activeElement).toBe(marker)

    act(() => marker.click())
    expect(onInspect).toHaveBeenCalledOnce()
  })

  it('keeps a retained mark reviewable with its authored title', () => {
    const onInspect = vi.fn()
    act(() =>
      root.render(
        <FourthMarginMarker
          definition={definition}
          discovered
          onInspect={onInspect}
        />,
      ),
    )

    const marker = host.querySelector<HTMLButtonElement>('.fourth-margin-marker')!
    expect(marker.getAttribute('data-discovered')).toBe('true')
    expect(marker.getAttribute('aria-label')).toBe(
      'Review Fourth Margin: What the intellect lets go',
    )

    act(() => marker.click())
    expect(onInspect).toHaveBeenCalledOnce()
  })

  it('does not invent a target when authored anchor data is absent', () => {
    act(() =>
      root.render(
        <FourthMarginMarker
          definition={{ ...definition, anchor: undefined }}
          discovered={false}
          onInspect={() => undefined}
        />,
      ),
    )

    expect(host.childElementCount).toBe(0)
  })
})

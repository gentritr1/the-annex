// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BeatLine } from '../game/beats'
import { BeatStage } from './BeatStage'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const lines: readonly BeatLine[] = [
  { kind: 'subject', text: 'First observation.' },
  { kind: 'subject', text: 'Second observation.' },
  { kind: 'subject', text: 'Third observation.' },
  { kind: 'speaker', speaker: 'shepherd' },
  { kind: 'persona', speaker: 'shepherd', text: 'First response.' },
  { kind: 'persona', speaker: 'shepherd', text: 'Second response.' },
  { kind: 'persona', speaker: 'shepherd', text: 'Final response.' },
]

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    callback(0)
    return 1
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

describe('BeatStage visual transcript', () => {
  it('keeps the current speaker and latest two lines without unmounting history', () => {
    act(() => {
      root.render(
        <BeatStage lines={lines} reducedMotion={false} onComplete={() => undefined} />,
      )
    })

    expect(
      host.querySelector<HTMLElement>('.scene-beat-line:not(.scene-beat-line--history)')
        ?.textContent,
    ).toBe('First observation.')

    act(() => host.querySelector<HTMLButtonElement>('.scene-beat-advance')!.click())

    const renderedLines = [...host.querySelectorAll<HTMLElement>('.scene-beat-line')]
    const currentLines = renderedLines.filter(
      (line) => !line.classList.contains('scene-beat-line--history'),
    )

    expect(renderedLines).toHaveLength(lines.length)
    expect(currentLines.map((line) => line.textContent?.trim())).toEqual([
      'The Shepherd —',
      'Second response.',
      'Final response.',
    ])
  })

  it('keeps the complete revealed stanza current under reduced motion', () => {
    act(() => {
      root.render(
        <BeatStage lines={lines} reducedMotion={true} onComplete={() => undefined} />,
      )
    })

    expect(host.querySelectorAll('.scene-beat-line')).toHaveLength(lines.length)
    expect(host.querySelector('.scene-beat-line--history')).toBeNull()
  })
})

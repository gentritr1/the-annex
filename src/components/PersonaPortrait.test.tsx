// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { personas } from '../game/content'
import type { PersonaId } from '../game/types'
import { PersonaPortrait, type PersonaPortraitSize } from './PersonaPortrait'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

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
})

function render(personaId: PersonaId, size: PersonaPortraitSize) {
  act(() => {
    root.render(<PersonaPortrait personaId={personaId} size={size} />)
  })
  return host.querySelector('.persona-portrait')!
}

describe('PersonaPortrait', () => {
  it('renders the authored plate for every persona at every size', () => {
    ;(['chip', 'card', 'sheet'] as const).forEach((size) => {
      personas.forEach((persona) => {
        const frame = render(persona.id, size)
        expect(frame, `${persona.id} ${size}`).not.toBeNull()
        expect(frame.classList.contains(`persona-portrait--${size}`)).toBe(true)
        expect(frame.classList.contains('persona-portrait--plated')).toBe(true)
        const img = frame.querySelector('img')!
        expect(img.getAttribute('src')).toBe(persona.portrait!.src)
        // The delivered geometry rides as intrinsic size so the box is reserved
        // before decode; CSS owns the rendered width per size.
        expect(img.getAttribute('width')).toBe('360')
        expect(img.getAttribute('height')).toBe('418')
      })
    })
  })

  // The AT rule the whole persona layer rests on: every surface that mounts a
  // chip or card ALREADY prints the persona's name as a text node beside it, so
  // an exposed alt would announce the same name twice.
  it('keeps chip and card decorative and exposes only the sheet’s authored alt', () => {
    const chip = render('registrar', 'chip')
    expect(chip.getAttribute('aria-hidden')).toBe('true')
    expect(chip.querySelector('img')!.getAttribute('alt')).toBe('')

    const card = render('shepherd', 'card')
    expect(card.getAttribute('aria-hidden')).toBe('true')
    expect(card.querySelector('img')!.getAttribute('alt')).toBe('')

    const sheet = render('archivist', 'sheet')
    expect(sheet.getAttribute('aria-hidden')).toBeNull()
    expect(sheet.querySelector('img')!.getAttribute('alt')).toBe(
      personas.find((persona) => persona.id === 'archivist')!.portrait!.alt,
    )
  })

  it('gives the sheet its duty-roster caption', () => {
    render('defector', 'sheet')
    const caption = host.querySelector('.persona-portrait-caption')!
    expect(caption.textContent).toBe(
      personas.find((persona) => persona.id === 'defector')!.portrait!.caption,
    )
  })

  // The sigil is mounted in BOTH paths: it is the whole frame when no portrait is
  // authored, and it waits behind the plate so the forced-colors rule can swap
  // the two in CSS alone, with no second component and no layout shift.
  it('always mounts the sigil mark beside the plate', () => {
    const frame = render('registrar', 'card')
    const mark = frame.querySelector('.persona-portrait-mark')!
    expect(mark.getAttribute('aria-hidden')).toBe('true')
    expect(mark.querySelector('svg')).not.toBeNull()
  })

  // The fallback is not politeness — it is what lets a persona ship without a
  // portrait at all, and it is the forced-colors path.
  it('falls back to the sigil alone when a persona carries no portrait', () => {
    function Unportraited() {
      // A local stand-in for a persona with no authored portrait: the component
      // reads content, so this proves the branch without editing content.ts.
      return <PersonaPortrait personaId={'registrar' as PersonaId} size="card" />
    }
    const original = personas.find((persona) => persona.id === 'registrar')!
    const saved = original.portrait
    // The roster is a readonly array of mutable objects; restore it immediately.
    ;(original as { portrait?: typeof saved }).portrait = undefined
    try {
      act(() => root.render(<Unportraited />))
      const frame = host.querySelector('.persona-portrait')!
      expect(frame.querySelector('img')).toBeNull()
      expect(frame.classList.contains('persona-portrait--plated')).toBe(false)
      expect(frame.querySelector('.persona-portrait-mark svg')).not.toBeNull()
    } finally {
      ;(original as { portrait?: typeof saved }).portrait = saved
    }
  })
})

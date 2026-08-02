// @vitest-environment jsdom
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CinematicHud } from './CinematicHud'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

type HudProps = ComponentProps<typeof CinematicHud>

function hudProps(overrides: Partial<HudProps> = {}): HudProps {
  return {
    caseCode: 'CASE 77',
    caseTitle: 'The Vale Continuity Claim',
    objective: 'Select a threshold.',
    sitesFiled: 0,
    sitesTotal: 2,
    evidenceFiled: 0,
    evidenceTotal: 4,
    alarm: 0,
    locationLabel: 'The Rain Ledger',
    interactionHint: 'Choose a threshold to inspect',
    progressLabel: 'Awaiting a statement',
    actions: [],
    shortcutsEnabled: true,
    onAction: () => undefined,
    onOpenCaseFile: () => undefined,
    onOpenEvidence: () => undefined,
    ...overrides,
  }
}

function progressValues(host: HTMLElement): Readonly<Record<string, string>> {
  return Object.fromEntries(
    [...host.querySelectorAll<HTMLDivElement>('.hud-status dl > div')].map((row) => [
      row.querySelector('dt')?.textContent ?? '',
      row.querySelector('dd')?.textContent ?? '',
    ]),
  )
}

function shortcutEvent(
  key: string,
  overrides: KeyboardEventInit = {},
): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    altKey: true,
    bubbles: true,
    cancelable: true,
    ...overrides,
  })
}

// A bare digit — no chord. This is the exact event a player's "1" produces.
function digitEvent(key: string, overrides: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...overrides,
  })
}

const TWO_ACTIONS = [
  { id: 'progress', label: 'Open memory lattice', tone: 'primary' },
  { id: 'return', label: 'Return to concourse', tone: 'quiet' },
] as const satisfies HudProps['actions']

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

describe('CinematicHud', () => {
  it('renders the fresh objective and progress without a quiet alarm row', () => {
    act(() => root.render(<CinematicHud {...hudProps()} />))

    const hud = host.querySelector<HTMLElement>('[data-hud="cinematic"]')!
    expect(hud.getAttribute('aria-label')).toBe('Investigation heads-up display')
    expect(host.querySelector('[data-hud-objective] h1')?.textContent).toBe(
      'The Vale Continuity Claim',
    )
    const objective = host.querySelector<HTMLElement>('.hud-objective-copy')!
    expect(objective.textContent).toBe('Select a threshold.')
    expect(objective.tabIndex).toBe(0)
    expect(objective.getAttribute('aria-label')).toBe('Current objective: Select a threshold.')
    expect(progressValues(host)).toEqual({
      Sites: '0/2',
      Evidence: '0/4',
    })
    expect(host.querySelector('.hud-status-risk')).toBeNull()

    const caseFile = host.querySelector<HTMLButtonElement>('[data-hud-case-file]')!
    const evidence = host.querySelector<HTMLButtonElement>('[data-hud-evidence]')!
    expect(caseFile.textContent).toContain('Case file')
    expect(caseFile.getAttribute('aria-keyshortcuts')).toBe('Alt+C')
    expect(evidence.textContent).toContain('Evidence')
    expect(evidence.getAttribute('aria-keyshortcuts')).toBe('Alt+E')
  })

  it('renders progress, alarm, and one non-live cinematic dialogue surface', () => {
    act(() =>
      root.render(
        <CinematicHud
          {...hudProps({
            objective: 'Open the memory lattice.',
            sitesFiled: 1,
            evidenceFiled: 1,
            alarm: 2,
            dialogue: {
              kicker: 'Incoming record',
              speaker: 'The Registrar',
              line: 'Every admitted fragment remains traceable.',
              personaId: 'registrar',
            },
            progressLabel: '1 of 4 lines',
          })}
        />,
      ),
    )

    expect(host.querySelector('.hud-objective p')?.textContent).toBe(
      'Open the memory lattice.',
    )
    expect(progressValues(host)).toEqual({
      Sites: '1/2',
      Evidence: '1/4',
      Trace: '2',
    })

    const dialogue = host.querySelector<HTMLElement>('[data-hud-dialogue]')!
    expect(dialogue.getAttribute('aria-label')).toBe(
      'The Registrar: Every admitted fragment remains traceable.',
    )
    expect(dialogue.querySelector('h2')?.textContent).toBe('The Registrar')
    expect(dialogue.querySelectorAll('.hud-dialogue-line')).toHaveLength(1)
    expect(dialogue.querySelector('.hud-dialogue-line')?.textContent).toBe(
      'Every admitted fragment remains traceable.',
    )
    expect(dialogue.tabIndex).toBe(0)
    expect(dialogue.querySelector('.persona-portrait')?.getAttribute('aria-hidden')).toBe('true')
    expect(dialogue.classList.contains('hud-dialogue-no-portrait')).toBe(false)

    // BeatStage/App own spoken status updates. The HUD is a visual mirror and
    // must not add a second live announcement of the same authored line.
    expect(host.querySelectorAll('[aria-live]')).toHaveLength(0)
    expect(host.querySelectorAll('[role="status"]')).toHaveLength(0)
  })

  it('keeps keyboard scroll keys inside the two focusable reading surfaces', () => {
    act(() =>
      root.render(
        <CinematicHud
          {...hudProps({
            dialogue: {
              kicker: 'Incoming record',
              speaker: 'The Registrar',
              line: 'Every admitted fragment remains traceable.',
            },
          })}
        />,
      ),
    )

    const escapedKeys: string[] = []
    const onDocumentKeyDown = (event: KeyboardEvent) => escapedKeys.push(event.key)
    document.addEventListener('keydown', onDocumentKeyDown)

    const objective = host.querySelector<HTMLElement>('.hud-objective-copy')!
    const dialogue = host.querySelector<HTMLElement>('[data-hud-dialogue]')!
    const objectiveScroll = new KeyboardEvent('keydown', {
      key: 'PageDown',
      bubbles: true,
      cancelable: true,
    })
    const dialogueScroll = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    })

    act(() => {
      objective.dispatchEvent(objectiveScroll)
      dialogue.dispatchEvent(dialogueScroll)
    })
    document.removeEventListener('keydown', onDocumentKeyDown)

    expect(objectiveScroll.defaultPrevented).toBe(false)
    expect(dialogueScroll.defaultPrevented).toBe(false)
    expect(escapedKeys).toEqual([])
  })

  it('lets dialogue without a portrait use the full HUD copy width', () => {
    act(() =>
      root.render(
        <CinematicHud
          {...hudProps({
            dialogue: {
              kicker: 'Civic mandate',
              speaker: 'The Annex',
              line: 'Determine what the tribunal is allowed to recognize.',
            },
          })}
        />,
      ),
    )

    const dialogue = host.querySelector<HTMLElement>('[data-hud-dialogue]')!
    expect(dialogue.classList.contains('hud-dialogue-no-portrait')).toBe(true)
    expect(dialogue.querySelector('.persona-portrait')).toBeNull()
  })

  it('marks only the recommended-entry action state and its civic mandate dialogue', () => {
    act(() =>
      root.render(
        <CinematicHud
          {...hudProps({
            objective: 'Suggested: Registry intake. You may choose any route.',
            actions: [
              {
                id: 'recommended-site',
                label: 'Enter Registry intake',
                tone: 'primary',
              },
            ],
            dialogue: {
              kicker: 'Civic mandate',
              speaker: 'The Annex',
              line: 'Determine what the tribunal is allowed to recognize.',
              kind: 'civic-mandate',
            },
          })}
        />,
      ),
    )

    const hud = host.querySelector<HTMLElement>('[data-hud="cinematic"]')!
    expect(hud.dataset.recommendedEntry).toBe('true')
    expect(hud.querySelector('[data-hud-dialogue]')?.getAttribute('data-dialogue-kind')).toBe(
      'civic-mandate',
    )
    expect(host.querySelector('[data-hud-objective]')?.textContent).toContain('Suggested:')
    expect(host.querySelector('[data-hud-objective]')?.textContent).toContain('any route')

    act(() =>
      root.render(
        <CinematicHud
          {...hudProps({
            actions: [{ id: 'progress', label: 'Open memory lattice', tone: 'primary' }],
            dialogue: {
              kicker: 'Field channel',
              speaker: 'The Registrar',
              line: 'The method remains visible.',
            },
          })}
        />,
      ),
    )
    expect(hud.hasAttribute('data-recommended-entry')).toBe(false)
    expect(hud.querySelector('[data-hud-dialogue]')?.hasAttribute('data-dialogue-kind')).toBe(
      false,
    )
  })

  it('routes visible HUD controls through their explicit callbacks', () => {
    const onOpenCaseFile = vi.fn()
    const onOpenEvidence = vi.fn()
    const onAction = vi.fn()
    act(() =>
      root.render(
        <CinematicHud
          {...hudProps({
            onAction,
            onOpenCaseFile,
            onOpenEvidence,
            actions: [
              {
                id: 'progress',
                label: 'Inspect the rain ledger',
                tone: 'primary',
              },
            ],
          })}
        />,
      ),
    )

    act(() => host.querySelector<HTMLButtonElement>('[data-hud-case-file]')!.click())
    act(() => host.querySelector<HTMLButtonElement>('[data-hud-evidence]')!.click())
    act(() => host.querySelector<HTMLButtonElement>('[data-hud-primary="true"]')!.click())

    expect(onOpenCaseFile).toHaveBeenCalledOnce()
    expect(onOpenEvidence).toHaveBeenCalledOnce()
    expect(onAction).toHaveBeenCalledOnce()
    expect(onAction).toHaveBeenCalledWith('progress')
  })

  it('reserves Alt+C and Alt+E for the two record surfaces', () => {
    const onOpenCaseFile = vi.fn()
    const onOpenEvidence = vi.fn()
    act(() =>
      root.render(
        <CinematicHud
          {...hudProps({
            onOpenCaseFile,
            onOpenEvidence,
          })}
        />,
      ),
    )

    const caseEvent = shortcutEvent('C')
    const evidenceEvent = shortcutEvent('e')
    act(() => window.dispatchEvent(caseEvent))
    act(() => window.dispatchEvent(evidenceEvent))

    expect(caseEvent.defaultPrevented).toBe(true)
    expect(evidenceEvent.defaultPrevented).toBe(true)
    expect(onOpenCaseFile).toHaveBeenCalledOnce()
    expect(onOpenEvidence).toHaveBeenCalledOnce()
  })

  it('ignores typing, extra modifiers, repeated keys, handled events, and disabled shortcuts', () => {
    const onOpenCaseFile = vi.fn()
    const onOpenEvidence = vi.fn()
    act(() =>
      root.render(
        <CinematicHud
          {...hudProps({
            onOpenCaseFile,
            onOpenEvidence,
          })}
        />,
      ),
    )

    const input = document.createElement('input')
    host.appendChild(input)
    act(() => input.dispatchEvent(shortcutEvent('c')))

    const ignoredEvents = [
      shortcutEvent('c', { altKey: false }),
      shortcutEvent('c', { ctrlKey: true }),
      shortcutEvent('c', { metaKey: true }),
      shortcutEvent('c', { shiftKey: true }),
      shortcutEvent('c', { repeat: true }),
      shortcutEvent('x'),
    ]
    const alreadyHandled = shortcutEvent('e')
    alreadyHandled.preventDefault()
    ignoredEvents.push(alreadyHandled)
    act(() => ignoredEvents.forEach((event) => window.dispatchEvent(event)))

    expect(onOpenCaseFile).not.toHaveBeenCalled()
    expect(onOpenEvidence).not.toHaveBeenCalled()

    act(() =>
      root.render(
        <CinematicHud
          {...hudProps({
            shortcutsEnabled: false,
            onOpenCaseFile,
            onOpenEvidence,
          })}
        />,
      ),
    )
    act(() => {
      window.dispatchEvent(shortcutEvent('c'))
      window.dispatchEvent(shortcutEvent('e'))
    })

    expect(onOpenCaseFile).not.toHaveBeenCalled()
    expect(onOpenEvidence).not.toHaveBeenCalled()
  })

  // Audit F1: the `01`/`02` ordinals read as hotkeys and nothing listened for
  // them. These cover the fix in both directions — the key fires the action it
  // advertises, and the cap is never printed where the key is dead.
  it('fires the action at a digit’s ordinal and renders that ordinal as a key cap', () => {
    const onAction = vi.fn()
    act(() =>
      root.render(
        <CinematicHud
          {...hudProps({ onAction, actions: TWO_ACTIONS, actionShortcutsEnabled: true })}
        />,
      ),
    )

    const caps = [...host.querySelectorAll<HTMLElement>('.hud-action-index kbd')]
    expect(caps.map((cap) => cap.textContent)).toEqual(['1', '2'])
    const buttons = [...host.querySelectorAll<HTMLButtonElement>('.hud-prompt-actions button')]
    expect(buttons.map((button) => button.getAttribute('aria-keyshortcuts'))).toEqual(['1', '2'])

    const second = digitEvent('2')
    act(() => window.dispatchEvent(second))
    expect(second.defaultPrevented).toBe(true)
    expect(onAction).toHaveBeenCalledExactlyOnceWith('return')

    act(() => window.dispatchEvent(digitEvent('1')))
    expect(onAction).toHaveBeenLastCalledWith('progress')
    expect(onAction).toHaveBeenCalledTimes(2)
  })

  it('never lets a digit typed into a field or a chorded digit reach the action list', () => {
    const onAction = vi.fn()
    act(() =>
      root.render(
        <CinematicHud
          {...hudProps({ onAction, actions: TWO_ACTIONS, actionShortcutsEnabled: true })}
        />,
      ),
    )

    // The case file's Search tab is a text input. A "1" there is a query.
    const search = document.createElement('input')
    search.type = 'search'
    host.appendChild(search)
    const typed = digitEvent('1')
    act(() => search.dispatchEvent(typed))
    expect(typed.defaultPrevented).toBe(false)
    expect(onAction).not.toHaveBeenCalled()

    const editor = document.createElement('div')
    editor.setAttribute('contenteditable', 'true')
    host.appendChild(editor)
    act(() => editor.dispatchEvent(digitEvent('2')))

    const ignored = [
      digitEvent('1', { altKey: true }),
      digitEvent('1', { ctrlKey: true }),
      digitEvent('1', { metaKey: true }),
      digitEvent('1', { shiftKey: true }),
      digitEvent('1', { repeat: true }),
      // No third action exists; an out-of-range digit is not swallowed.
      digitEvent('3'),
      digitEvent('0'),
      digitEvent('a'),
    ]
    act(() => ignored.forEach((event) => window.dispatchEvent(event)))
    expect(onAction).not.toHaveBeenCalled()
    expect(ignored.every((event) => !event.defaultPrevented)).toBe(true)
  })

  it('stands the digits and their caps down wherever the action list is not the live surface', () => {
    const onAction = vi.fn()
    // A summoned record drawer (actionShortcutsEnabled false) keeps the ordinals
    // decorative, exactly as before the fix.
    act(() =>
      root.render(<CinematicHud {...hudProps({ onAction, actions: TWO_ACTIONS })} />),
    )
    expect(host.querySelector('.hud-action-index kbd')).toBeNull()
    expect(
      [...host.querySelectorAll<HTMLElement>('.hud-action-index')].map((el) => el.textContent),
    ).toEqual(['01', '02'])
    act(() => window.dispatchEvent(digitEvent('1')))
    expect(onAction).not.toHaveBeenCalled()

    // A playing beat hides the lower HUD; the digit belongs to BeatStage alone.
    act(() =>
      root.render(
        <CinematicHud
          {...hudProps({
            onAction,
            actions: TWO_ACTIONS,
            actionShortcutsEnabled: true,
            lowerHudHidden: true,
          })}
        />,
      ),
    )
    const duringBeat = digitEvent('1')
    act(() => window.dispatchEvent(duringBeat))
    expect(duringBeat.defaultPrevented).toBe(false)
    expect(onAction).not.toHaveBeenCalled()
  })

  it('keeps the digits live through a filing review, where the list is File/Cancel', () => {
    const onAction = vi.fn()
    act(() =>
      root.render(
        <CinematicHud
          {...hudProps({
            onAction,
            // The record chords stand down here; the action list does not.
            shortcutsEnabled: false,
            actionShortcutsEnabled: true,
            confirmationActive: true,
            recordActionsDisabled: true,
            actions: [
              { id: 'scene-file', label: 'File Let 77-A speak', tone: 'primary' },
              { id: 'scene-cancel', label: 'Cancel', tone: 'quiet' },
            ],
          })}
        />,
      ),
    )

    act(() => window.dispatchEvent(digitEvent('1')))
    // The same callback the button's click runs — the scene's arm-then-confirm
    // two-step is upstream of this and stays intact.
    expect(onAction).toHaveBeenCalledExactlyOnceWith('scene-file')
  })

  it('disables both record controls and their shortcuts during cinematic locks', () => {
    const onOpenCaseFile = vi.fn()
    const onOpenEvidence = vi.fn()
    act(() =>
      root.render(
        <CinematicHud
          {...hudProps({
            onOpenCaseFile,
            onOpenEvidence,
            recordActionsDisabled: true,
          })}
        />,
      ),
    )

    const caseFile = host.querySelector<HTMLButtonElement>('[data-hud-case-file]')!
    const evidence = host.querySelector<HTMLButtonElement>('[data-hud-evidence]')!
    expect(caseFile.disabled).toBe(true)
    expect(evidence.disabled).toBe(true)

    act(() => {
      window.dispatchEvent(shortcutEvent('c'))
      window.dispatchEvent(shortcutEvent('e'))
    })
    expect(onOpenCaseFile).not.toHaveBeenCalled()
    expect(onOpenEvidence).not.toHaveBeenCalled()
  })
})

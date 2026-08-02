// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState, gameReducer } from '../game/engine'
import type { FieldActionId, GameState, SecretId } from '../game/types'
import { Investigation } from './Investigation'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function case81Investigation(): GameState {
  const initial = createInitialGameState()
  return {
    ...initial,
    caseId: 'case-81',
    phase: 'investigation',
    primaryApproach: 'procedure',
    methodTags: ['procedure'],
    settings: {
      ...initial.settings,
      reducedMotion: true,
    },
  }
}

function case81RestorationComplete(): GameState {
  const state = case81Investigation()
  return {
    ...state,
    completedSites: ['restoration-lab'],
    completedActions: ['audit-restoration-log'],
    evidence: ['restoration-log'],
  }
}

function unlockedInvestigation(caseId: 'case-77' | 'case-81'): GameState {
  const initial = createInitialGameState()
  return {
    ...initial,
    caseId,
    phase: 'investigation',
    primaryApproach: 'curiosity',
    methodTags: ['puzzle'],
    discoveredSecretIds: [
      'nietzsche-forgetting',
      'schopenhauer-succession',
      'reader-key-04',
    ],
    settings: {
      ...initial.settings,
      reducedMotion: true,
    },
  }
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: () => undefined,
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => undefined,
  })
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
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  document.querySelectorAll('[role="dialog"]').forEach((dialog) => dialog.remove())
  vi.restoreAllMocks()
})

describe('Case 81 spatial deposition route', () => {
  it('does not expose a Fourth Margin marker before the authored site is filed', () => {
    act(() =>
      root.render(
        <Investigation
          state={case81Investigation()}
          caseFileOpen={false}
          onCaseFileOpenChange={() => undefined}
          depositionEntry={null}
          onDepositionEntryChange={() => undefined}
          onAcousticTreatmentChange={() => undefined}
          onCommitAction={() => undefined}
          onDiscoverSecret={() => undefined}
          onCommitDeposition={() => undefined}
          onOpenReconstruction={() => undefined}
          onEnterTribunal={() => undefined}
        />,
      ),
    )

    const restorationPortal = host.querySelector<HTMLButtonElement>(
      '.annex-world-portal[data-site="restoration-lab"]',
    )
    expect(restorationPortal).not.toBeNull()
    expect(host.querySelector('.annex-world-secret-room')).toBeNull()
    act(() => restorationPortal!.click())

    expect(host.querySelector('.site-closeup-stage')).not.toBeNull()
    expect(host.querySelector('.fourth-margin-marker')).toBeNull()
  })

  it('reveals, retains, and reopens the settled Restoration Lab mark without changing the legal record', () => {
    const discoveries: SecretId[] = []
    let observedState = case81RestorationComplete()

    function Harness() {
      const [state, setState] = useState(observedState)
      observedState = state
      return (
        <Investigation
          state={state}
          caseFileOpen={false}
          onCaseFileOpenChange={() => undefined}
          depositionEntry={null}
          onDepositionEntryChange={() => undefined}
          onAcousticTreatmentChange={() => undefined}
          onCommitAction={() => undefined}
          onDiscoverSecret={(secretId) => {
            discoveries.push(secretId)
            setState((current) =>
              gameReducer(current, { type: 'DISCOVER_SECRET', secretId }),
            )
          }}
          onCommitDeposition={() => undefined}
          onOpenReconstruction={() => undefined}
          onEnterTribunal={() => undefined}
        />
      )
    }

    act(() => root.render(<Harness />))

    const restorationPortal = host.querySelector<HTMLButtonElement>(
      '.annex-world-portal[data-site="restoration-lab"]',
    )
    expect(restorationPortal).not.toBeNull()
    act(() => restorationPortal!.click())

    const marker = host.querySelector<HTMLButtonElement>('.fourth-margin-marker')
    expect(marker).not.toBeNull()
    expect(marker!.type).toBe('button')
    expect(marker!.getAttribute('aria-label')).toBe('Inspect irregular mark')
    expect(marker!.getAttribute('data-secret-id')).toBe('schopenhauer-succession')
    expect(marker!.getAttribute('data-discovered')).toBeNull()

    const legalRecordBefore = {
      sites: [...observedState.completedSites],
      actions: [...observedState.completedActions],
      evidence: [...observedState.evidence],
      events: [...observedState.events],
      alarm: observedState.alarm,
      trust: { ...observedState.trust },
      tribunalOverride: observedState.tribunalOverride,
    }

    act(() => marker!.click())

    expect(discoveries).toEqual(['schopenhauer-succession'])
    expect(observedState.discoveredSecretIds).toContain('schopenhauer-succession')
    expect({
      sites: observedState.completedSites,
      actions: observedState.completedActions,
      evidence: observedState.evidence,
      events: observedState.events,
      alarm: observedState.alarm,
      trust: observedState.trust,
      tribunalOverride: observedState.tribunalOverride,
    }).toEqual(legalRecordBefore)

    const retainedMarker = host.querySelector<HTMLButtonElement>('.fourth-margin-marker')!
    expect(retainedMarker.getAttribute('data-discovered')).toBe('true')
    expect(retainedMarker.getAttribute('aria-label')).toBe(
      'Review Fourth Margin: What the intellect lets go',
    )
    expect(host.querySelector('[data-hud-dialogue][data-variant="secret"]')?.textContent).toContain(
      'The Fourth Margin · not evidence',
    )
    expect(host.querySelector('[data-hud-dialogue][data-variant="secret"]')?.textContent).toContain(
      'The intellect apprehends only successively',
    )

    act(() => retainedMarker.click())
    expect(discoveries).toEqual(['schopenhauer-succession'])
  })

  it('opens the transcript from its portal without committing a field action', () => {
    const commitAction = vi.fn()
    const depositionChanges: (FieldActionId | null)[] = []

    function Harness() {
      const [depositionEntry, setDepositionEntry] = useState<FieldActionId | null>(null)
      return (
        <Investigation
          state={case81Investigation()}
          caseFileOpen={false}
          onCaseFileOpenChange={() => undefined}
          depositionEntry={depositionEntry}
          onDepositionEntryChange={(entry) => {
            depositionChanges.push(entry)
            setDepositionEntry(entry)
          }}
          onAcousticTreatmentChange={() => undefined}
          onCommitAction={commitAction}
          onDiscoverSecret={() => undefined}
          onCommitDeposition={() => undefined}
          onOpenReconstruction={() => undefined}
          onEnterTribunal={() => undefined}
        />
      )
    }

    act(() => root.render(<Harness />))

    const portal = host.querySelector<HTMLButtonElement>(
      '.annex-world-portal[data-site="deposition-suite"]',
    )
    expect(portal).not.toBeNull()
    act(() => portal!.click())

    const entryZones = host.querySelectorAll<HTMLButtonElement>('.scene-zones-live button')
    expect(entryZones).toHaveLength(2)
    expect(entryZones[0]?.getAttribute('aria-pressed')).toBeNull()

    act(() => entryZones[0]!.click())

    expect(depositionChanges).toEqual(['take-sworn-statement'])
    expect(commitAction).not.toHaveBeenCalled()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
  })

  it('recommends one opening-approach portal without selecting or moving the camera', () => {
    const state: GameState = {
      ...case81Investigation(),
      primaryApproach: 'covert',
      methodTags: ['stealth'],
    }

    act(() =>
      root.render(
        <Investigation
          state={state}
          caseFileOpen={false}
          onCaseFileOpenChange={() => undefined}
          depositionEntry={null}
          onDepositionEntryChange={() => undefined}
          onAcousticTreatmentChange={() => undefined}
          onCommitAction={() => undefined}
          onDiscoverSecret={() => undefined}
          onCommitDeposition={() => undefined}
          onOpenReconstruction={() => undefined}
          onEnterTribunal={() => undefined}
        />,
      ),
    )

    const recommended = host.querySelector<HTMLButtonElement>(
      '.annex-world-portal[data-site="records-annex"]',
    )!
    expect(recommended.getAttribute('data-recommended')).toBe('true')
    expect(recommended.getAttribute('data-recommendation')).toBe('opening-approach')
    expect(recommended.getAttribute('data-selected')).toBeNull()
    expect(recommended.getAttribute('aria-label')).toContain(
      'Suggested by your opening approach',
    )
    expect(recommended.textContent).toContain('Records annex')
    expect(host.querySelectorAll('.annex-world-portal[data-recommended="true"]')).toHaveLength(1)
    expect(host.querySelector('[data-hud-objective]')?.textContent).toContain('Suggested:')
    expect(host.querySelector('[data-hud-objective]')?.textContent).toContain('Records annex')
    expect(host.querySelector('[data-hud-objective]')?.textContent).toContain('any route')

    const enterSuggested = host.querySelector<HTMLButtonElement>(
      '[data-hud-action="recommended-site"]',
    )!
    expect(enterSuggested.getAttribute('data-hud-primary')).toBe('true')
    expect(enterSuggested.textContent).toContain('Enter Records annex')
    act(() => enterSuggested.click())

    expect(host.querySelector('.site-closeup-stage')).not.toBeNull()
    expect(host.querySelector('.hud-location')?.textContent).toContain('Records annex')
  })

  it('uses the HUD as the controlled final-review scope for scene-first filing', () => {
    const commitAction = vi.fn()
    const openCaseFile = vi.fn()

    act(() =>
      root.render(
        <Investigation
          state={case81Investigation()}
          caseFileOpen={false}
          onCaseFileOpenChange={openCaseFile}
          depositionEntry={null}
          onDepositionEntryChange={() => undefined}
          onAcousticTreatmentChange={() => undefined}
          onCommitAction={commitAction}
          onDiscoverSecret={() => undefined}
          onCommitDeposition={() => undefined}
          onOpenReconstruction={() => undefined}
          onEnterTribunal={() => undefined}
        />,
      ),
    )

    const recordsPortal = host.querySelector<HTMLButtonElement>(
      '.annex-world-portal[data-site="records-annex"]',
    )!
    act(() => recordsPortal.click())

    const method = host.querySelectorAll<HTMLButtonElement>('.scene-zones-live button')[0]!
    act(() => method.click())

    expect(method.getAttribute('aria-pressed')).toBe('true')
    const hud = host.querySelector<HTMLElement>('[data-hud="cinematic"]')!
    expect(hud.getAttribute('data-confirmation-scope')).toBe('scene-first')
    expect(host.querySelector('[data-hud-objective]')?.textContent).toContain(
      'Review Pull the service record',
    )
    expect(host.querySelector('[data-hud-objective]')?.textContent).toContain('final for this run')
    expect(host.querySelector('[data-hud-dialogue]')?.textContent).toContain(
      'Final filing review',
    )
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('[data-hud-action]')].map(
        (button) => button.dataset.hudAction,
      ),
    ).toEqual(['scene-file', 'scene-cancel'])

    const caseFile = host.querySelector<HTMLButtonElement>('[data-hud-case-file]')!
    const evidence = host.querySelector<HTMLButtonElement>('[data-hud-evidence]')!
    expect(caseFile.disabled).toBe(true)
    expect(evidence.disabled).toBe(true)

    const file = host.querySelector<HTMLButtonElement>('[data-hud-action="scene-file"]')!
    act(() => {
      method.focus()
      file.focus()
    })
    expect(host.querySelector('.scene-zones-live button')?.getAttribute('aria-pressed')).toBe(
      'true',
    )

    act(() => file.click())
    expect(commitAction).toHaveBeenCalledOnce()
    expect(commitAction).toHaveBeenCalledWith('pull-service-record')
    expect(openCaseFile).not.toHaveBeenCalled()
  })

  it('returns HUD Cancel focus to the exact scene method that opened the review', () => {
    act(() =>
      root.render(
        <Investigation
          state={case81Investigation()}
          caseFileOpen={false}
          onCaseFileOpenChange={() => undefined}
          depositionEntry={null}
          onDepositionEntryChange={() => undefined}
          onAcousticTreatmentChange={() => undefined}
          onCommitAction={() => undefined}
          onDiscoverSecret={() => undefined}
          onCommitDeposition={() => undefined}
          onOpenReconstruction={() => undefined}
          onEnterTribunal={() => undefined}
        />,
      ),
    )

    act(() =>
      host
        .querySelector<HTMLButtonElement>('.annex-world-portal[data-site="records-annex"]')!
        .click(),
    )
    const armedMethod = host.querySelectorAll<HTMLButtonElement>('.scene-zones-live button')[1]!

    act(() => {
      armedMethod.focus()
      armedMethod.click()
    })
    const cancel = host.querySelector<HTMLButtonElement>('[data-hud-action="scene-cancel"]')!

    act(() => {
      cancel.focus()
      cancel.click()
    })

    expect(host.querySelector('[data-confirmation-scope]')).toBeNull()
    expect(document.activeElement).toBe(armedMethod)
  })

  it.each([
    ['scene-file', 0],
    ['scene-cancel', 1],
  ])('returns Escape from HUD %s to the exact armed scene method', (hudAction, methodIndex) => {
    const commitAction = vi.fn()
    act(() =>
      root.render(
        <Investigation
          state={case81Investigation()}
          caseFileOpen={false}
          onCaseFileOpenChange={() => undefined}
          depositionEntry={null}
          onDepositionEntryChange={() => undefined}
          onAcousticTreatmentChange={() => undefined}
          onCommitAction={commitAction}
          onDiscoverSecret={() => undefined}
          onCommitDeposition={() => undefined}
          onOpenReconstruction={() => undefined}
          onEnterTribunal={() => undefined}
        />,
      ),
    )

    act(() =>
      host
        .querySelector<HTMLButtonElement>('.annex-world-portal[data-site="records-annex"]')!
        .click(),
    )
    const armedMethod = host.querySelectorAll<HTMLButtonElement>('.scene-zones-live button')[
      methodIndex
    ]!

    act(() => {
      armedMethod.focus()
      armedMethod.click()
    })
    const hudControl = host.querySelector<HTMLButtonElement>(
      `[data-hud-action="${hudAction}"]`,
    )!

    act(() => {
      hudControl.focus()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(host.querySelector('[data-confirmation-scope]')).toBeNull()
    expect(document.activeElement).toBe(armedMethod)
    expect(commitAction).not.toHaveBeenCalled()
  })

  it('clears a controlled scene confirmation on cancel, Escape, and site change', () => {
    const commitAction = vi.fn()
    act(() =>
      root.render(
        <Investigation
          state={case81Investigation()}
          caseFileOpen={false}
          onCaseFileOpenChange={() => undefined}
          depositionEntry={null}
          onDepositionEntryChange={() => undefined}
          onAcousticTreatmentChange={() => undefined}
          onCommitAction={commitAction}
          onDiscoverSecret={() => undefined}
          onCommitDeposition={() => undefined}
          onOpenReconstruction={() => undefined}
          onEnterTribunal={() => undefined}
        />,
      ),
    )

    const recordsPortal = host.querySelector<HTMLButtonElement>(
      '.annex-world-portal[data-site="records-annex"]',
    )!
    act(() => recordsPortal.click())

    function sceneMethod() {
      return host.querySelector<HTMLButtonElement>('.scene-zones-live button')!
    }

    act(() => sceneMethod().click())
    expect(sceneMethod().getAttribute('aria-pressed')).toBe('true')
    act(() => host.querySelector<HTMLButtonElement>('[data-hud-action="scene-cancel"]')!.click())
    expect(sceneMethod().getAttribute('aria-pressed')).toBe('false')
    expect(host.querySelector('[data-confirmation-scope]')).toBeNull()

    act(() => sceneMethod().click())
    expect(sceneMethod().getAttribute('aria-pressed')).toBe('true')
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(sceneMethod().getAttribute('aria-pressed')).toBe('false')
    expect(host.querySelector('[data-confirmation-scope]')).toBeNull()

    act(() => sceneMethod().click())
    expect(sceneMethod().getAttribute('aria-pressed')).toBe('true')
    const counsel = host.querySelector<HTMLButtonElement>('#site-switch-counsel-office')!
    act(() => counsel.click())
    expect(host.querySelector('[data-confirmation-scope]')).toBeNull()
    expect(host.querySelector('.scene-zones-live button')?.getAttribute('aria-pressed')).toBe(
      'false',
    )
    expect(commitAction).not.toHaveBeenCalled()
  })

  it('opens the unnumbered room from Reader Key 04 and keeps every read outside the legal record', () => {
    const state = unlockedInvestigation('case-81')
    const discoverSecret = vi.fn()
    const commitAction = vi.fn()
    const legalRecordBefore = JSON.stringify(state)

    act(() =>
      root.render(
        <Investigation
          state={state}
          caseFileOpen={false}
          onCaseFileOpenChange={() => undefined}
          depositionEntry={null}
          onDepositionEntryChange={() => undefined}
          onAcousticTreatmentChange={() => undefined}
          onCommitAction={commitAction}
          onDiscoverSecret={discoverSecret}
          onCommitDeposition={() => undefined}
          onOpenReconstruction={() => undefined}
          onEnterTribunal={() => undefined}
        />,
      ),
    )

    const entry = host.querySelector<HTMLButtonElement>('.annex-world-secret-room')
    expect(entry).not.toBeNull()
    expect(entry!.getAttribute('aria-label')).toContain(
      'enter the unnumbered reader',
    )

    act(() => entry!.click())

    expect(host.querySelector('.unnumbered-room-stage')).not.toBeNull()
    expect(host.querySelector('.annex-world-stage')).toBeNull()
    expect(host.querySelector('.site-switcher')).toBeNull()
    expect(host.querySelectorAll('.unnumbered-room-point')).toHaveLength(3)
    expect(host.querySelector('[data-hud-objective]')?.textContent).toContain(
      'Read any object · leave at any time',
    )
    expect(host.querySelector('[data-hud-dialogue]')?.textContent).toContain(
      'I did not put arrows between them',
    )

    const order = ['unpressed-promise', 'book-that-opens', 'two-orders']
    order.forEach((pointId) => {
      const point = host.querySelector<HTMLButtonElement>(
        `.unnumbered-room-point[data-point-id="${pointId}"]`,
      )
      expect(point).not.toBeNull()
      act(() => point!.click())
      if (pointId === 'unpressed-promise') {
        const liveCopy = Array.from(
          host.querySelectorAll<HTMLElement>('[role="status"]'),
        )
          .map((status) => status.textContent)
          .join(' ')
        expect(liveCopy).toContain('NOT FILED · NO LEGAL FORCE')
        expect(liveCopy).toContain(
          'WHAT MAY THIS ROOM PROMISE BEFORE A NAME IS ASKED?',
        )
        expect(liveCopy).toContain('The promise is harder to hide that way')
      }
    })

    expect(
      host.querySelector<HTMLButtonElement>(
        '.unnumbered-room-point[data-point-id="two-orders"]',
      )?.getAttribute('aria-pressed'),
    ).toBe('true')
    expect(
      host.querySelectorAll('.unnumbered-room-point[data-opened="true"]'),
    ).toHaveLength(3)
    expect(host.querySelector('[data-hud-dialogue]')?.textContent).toContain(
      'Two slips, neither filed over the other',
    )
    expect(host.querySelector('[data-hud-dialogue]')?.textContent).toContain(
      'No channel is marked first',
    )
    expect(host.querySelector('[data-hud-dialogue]')?.textContent).toContain(
      'All three lamps remain on',
    )

    const arrange = Array.from(
      host.querySelectorAll<HTMLButtonElement>('.hud-prompt-actions button'),
    ).find((button) => button.textContent?.includes('Leave the slips level'))
    expect(arrange).toBeDefined()
    act(() => arrange!.click())
    expect(host.querySelector('[data-hud-dialogue]')?.textContent).toContain(
      'The reader files nothing',
    )
    expect(
      Array.from(host.querySelectorAll<HTMLElement>('[role="status"]'))
        .map((status) => status.textContent)
        .join(' '),
    ).toContain('Otherwise the books start sounding like orders')

    expect(discoverSecret).not.toHaveBeenCalled()
    expect(commitAction).not.toHaveBeenCalled()
    expect(JSON.stringify(state)).toBe(legalRecordBefore)

    const exit = Array.from(
      host.querySelectorAll<HTMLButtonElement>('.hud-prompt-actions button'),
    ).find((button) => button.textContent?.includes('Return to the filed world'))
    expect(exit).toBeDefined()
    act(() => exit!.click())

    expect(host.querySelector('.unnumbered-room-stage')).toBeNull()
    expect(host.querySelector('.annex-world-stage')).not.toBeNull()
    expect(host.querySelector('.annex-world-secret-room')).not.toBeNull()

    const restoredEntry = host.querySelector<HTMLButtonElement>(
      '.annex-world-secret-room',
    )
    act(() => restoredEntry!.click())
    expect(
      host.querySelectorAll('.unnumbered-room-point[data-opened="true"]'),
    ).toHaveLength(0)
    expect(host.querySelector('[data-hud-dialogue]')?.textContent).toContain(
      'I did not put arrows between them',
    )
  })

  it('exposes the same concealed Reader Key entry from the Case 77 concourse', () => {
    act(() =>
      root.render(
        <Investigation
          state={unlockedInvestigation('case-77')}
          caseFileOpen={false}
          onCaseFileOpenChange={() => undefined}
          depositionEntry={null}
          onDepositionEntryChange={() => undefined}
          onAcousticTreatmentChange={() => undefined}
          onCommitAction={() => undefined}
          onDiscoverSecret={() => undefined}
          onCommitDeposition={() => undefined}
          onOpenReconstruction={() => undefined}
          onEnterTribunal={() => undefined}
        />,
      ),
    )

    const entry = host.querySelector<HTMLButtonElement>('.annex-world-secret-room')
    expect(entry).not.toBeNull()
    expect(entry?.dataset.entryAnchor).toBe('concourse-unnumbered-reader')
  })
})

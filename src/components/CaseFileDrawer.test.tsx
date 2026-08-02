// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCaseContent } from '../game/content'
import { createInitialGameState, gameReducer } from '../game/engine'
import type { GameState, SecretId } from '../game/types'
import { CaseFileDrawer, CaseFileSummon } from './CaseFileDrawer'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function investigationState(): GameState {
  const content = getCaseContent('case-77')
  let state = gameReducer(createInitialGameState(), { type: 'START_NEW' })
  state = gameReducer(state, {
    type: 'SELECT_APPROACH',
    approachId: content.approaches[0]!.id,
  })
  return state
}

function stateWithOneEvidence(): GameState {
  const content = getCaseContent('case-77')
  return gameReducer(investigationState(), {
    type: 'COMMIT_FIELD_ACTION',
    actionId: content.fieldActions[0]!.id,
  })
}

function stateWithNietzscheMargin(): GameState {
  const content = getCaseContent('case-77')
  const registryAction = content.fieldActions.find(
    (action) => action.siteId === 'registry',
  )
  if (!registryAction) throw new Error('Case 77 registry action missing')

  let state = gameReducer(investigationState(), {
    type: 'COMMIT_FIELD_ACTION',
    actionId: registryAction.id,
  })
  state = gameReducer(state, {
    type: 'DISCOVER_SECRET',
    secretId: 'nietzsche-forgetting',
  })
  return state
}

function stateReadyForReaderKey(): GameState {
  const initial = createInitialGameState()
  return {
    ...initial,
    caseId: 'case-81',
    phase: 'debrief',
    discoveredSecretIds: ['nietzsche-forgetting', 'schopenhauer-succession'],
  }
}

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

describe('CaseFileDrawer initial view', () => {
  it('opens directly on Evidence and exposes only admitted evidence', () => {
    const state = stateWithOneEvidence()
    const content = getCaseContent(state.caseId)
    const admitted = content.evidenceDefinitions.filter((item) =>
      state.evidence.includes(item.id),
    )
    const unadmitted = content.evidenceDefinitions.filter(
      (item) => !state.evidence.includes(item.id),
    )

    act(() =>
      root.render(
        <CaseFileDrawer
          state={state}
          initialTab="evidence"
          onClose={() => undefined}
          queryTrail={[]}
          onQuery={() => undefined}
          onDiscoverSecret={() => undefined}
        />,
      ),
    )

    const drawer = document.body.querySelector<HTMLElement>('.casefile-drawer')!
    expect(drawer.getAttribute('role')).toBe('dialog')
    expect(drawer.getAttribute('aria-modal')).toBe('true')
    expect(drawer.querySelector('#rail-panel-case')).toBeNull()
    expect(drawer.querySelector('#rail-panel-evidence')).not.toBeNull()
    expect(
      drawer.querySelector('#rail-tab-evidence')?.getAttribute('aria-pressed'),
    ).toBe('true')
    expect(document.activeElement).toBe(drawer.querySelector('#rail-tab-evidence'))

    expect(admitted).toHaveLength(1)
    expect(drawer.querySelectorAll('.evidence-list > li')).toHaveLength(1)
    expect(drawer.textContent).toContain(admitted[0]!.title)
    unadmitted.forEach((item) => expect(drawer.textContent).not.toContain(item.title))
  })

  it('opens the direct Evidence empty state without leaking the Case panel', () => {
    act(() =>
      root.render(
        <CaseFileDrawer
          state={investigationState()}
          initialTab="evidence"
          onClose={() => undefined}
          queryTrail={[]}
          onQuery={() => undefined}
          onDiscoverSecret={() => undefined}
        />,
      ),
    )

    const drawer = document.body.querySelector<HTMLElement>('.casefile-drawer')!
    expect(drawer.querySelector('#rail-panel-case')).toBeNull()
    expect(drawer.querySelector('#rail-panel-evidence')?.textContent).toContain(
      'No evidence admitted yet',
    )
  })

  it('keeps a fresh Case view to six tabs with no undiscovered Fourth Margin copy', () => {
    act(() =>
      root.render(
        <CaseFileDrawer
          state={investigationState()}
          initialTab="case"
          onClose={() => undefined}
          queryTrail={[]}
          onQuery={() => undefined}
          onDiscoverSecret={() => undefined}
        />,
      ),
    )

    const drawer = document.body.querySelector<HTMLElement>('.casefile-drawer')!
    expect(drawer.querySelectorAll('.rail-tabs button')).toHaveLength(6)
    expect(drawer.querySelectorAll('.rail-panel')).toHaveLength(1)
    expect(drawer.querySelector('[data-fourth-margin]')).toBeNull()
    expect(drawer.textContent).not.toContain('The animal’s blank')
  })

  it('progressively exposes discovered marginalia in Case without adding a tab or evidence', () => {
    const state = stateWithNietzscheMargin()
    const secret = getCaseContent('case-77').secrets?.find(
      (item) => item.id === 'nietzsche-forgetting',
    )
    expect(secret).toBeDefined()

    act(() =>
      root.render(
        <CaseFileDrawer
          state={state}
          initialTab="case"
          onClose={() => undefined}
          queryTrail={[]}
          onQuery={() => undefined}
          onDiscoverSecret={() => undefined}
        />,
      ),
    )

    const drawer = document.body.querySelector<HTMLElement>('.casefile-drawer')!
    const margin = drawer.querySelector<HTMLElement>('[data-fourth-margin]')
    expect(drawer.querySelectorAll('.rail-tabs button')).toHaveLength(6)
    expect(drawer.querySelectorAll('.rail-panel')).toHaveLength(1)
    expect(margin).not.toBeNull()
    expect(margin!.textContent).toContain('The Fourth Margin · not evidence')
    expect(margin!.textContent).toContain(secret!.title)
    expect(margin!.textContent).toContain(secret!.body)
    expect(margin!.textContent).toContain(secret!.attribution)
    expect(margin!.textContent).toContain(secret!.source)
    expect(margin!.textContent).toContain(secret!.counterline)
    expect(margin!.querySelectorAll('.fourth-margin-entry')).toHaveLength(1)
    expect(state.evidence).not.toContain('nietzsche-forgetting')
    expect(state.events.some((event) => event.sourceId === 'nietzsche-forgetting')).toBe(false)
  })

  it('claims Reader Key 04 once and retains it as a third margin entry', () => {
    const discoveries: SecretId[] = []

    function Harness() {
      const [state, setState] = useState(stateReadyForReaderKey)
      return (
        <CaseFileDrawer
          state={state}
          initialTab="case"
          onClose={() => undefined}
          queryTrail={[]}
          onQuery={() => undefined}
          onDiscoverSecret={(secretId) => {
            discoveries.push(secretId)
            setState((current) =>
              gameReducer(current, { type: 'DISCOVER_SECRET', secretId }),
            )
          }}
        />
      )
    }

    act(() => root.render(<Harness />))

    const drawer = document.body.querySelector<HTMLElement>('.casefile-drawer')!
    const claim = [...drawer.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('claim Reader Key 04'),
    )
    expect(claim).toBeDefined()
    expect(claim!.getAttribute('aria-disabled')).toBe('false')
    expect(claim!.getAttribute('aria-pressed')).toBe('false')

    act(() => claim!.click())

    expect(discoveries).toEqual(['reader-key-04'])
    const retained = [...drawer.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('Reader Key 04 retained'),
    )
    expect(retained).toBeDefined()
    expect(retained!.getAttribute('aria-disabled')).toBe('true')
    expect(retained!.getAttribute('aria-pressed')).toBe('true')
    expect(drawer.querySelectorAll('.fourth-margin-entry')).toHaveLength(3)
    expect(drawer.textContent).toContain(
      'A narrow reader key cut from two quotation slips.',
    )

    act(() => retained!.click())
    expect(discoveries).toEqual(['reader-key-04'])
    expect(drawer.querySelectorAll('.rail-tabs button')).toHaveLength(6)
  })
})

describe('CaseFileSummon compact-shell semantics', () => {
  it('keeps a descriptive accessible name when its compact-shell preview is visually collapsed', () => {
    const onOpen = vi.fn()
    const state = stateWithOneEvidence()

    act(() =>
      root.render(
        <CaseFileSummon
          state={state}
          onOpen={onOpen}
          className="casefile-summon--shell"
        />,
      ),
    )

    const summon = host.querySelector<HTMLButtonElement>('.casefile-summon--shell')!
    expect(summon.getAttribute('aria-label')).toBe('Open case file: 1 evidence, 2 events.')
    expect(summon.querySelector('small')?.textContent).toContain('1 evidence · 2 events')

    act(() => summon.click())
    expect(onOpen).toHaveBeenCalledOnce()
  })
})

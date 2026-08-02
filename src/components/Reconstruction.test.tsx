// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState, gameReducer } from '../game/engine'
import type { GameState } from '../game/types'
import { Reconstruction } from './Reconstruction'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function registryLattice(): GameState {
  let state = gameReducer(createInitialGameState(), { type: 'START_NEW' })
  state = gameReducer(state, { type: 'SELECT_APPROACH', approachId: 'procedure' })
  state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
  state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
  return gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
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

describe('Reconstruction knowledge presentation', () => {
  it('masks unknown anchors while naming action-specific filed sources and corroborating evidence', () => {
    act(() =>
      root.render(
        <Reconstruction
          state={registryLattice()}
          onToggleFragment={() => undefined}
          onSubmit={() => undefined}
          onBack={() => undefined}
        />,
      ),
    )

    const scar = host.querySelector<HTMLButtonElement>('[data-fragment-id="scar-sensation"]')!
    const registry = host.querySelector<HTMLButtonElement>('[data-fragment-id="registry-hash"]')!
    const witness = host.querySelector<HTMLButtonElement>('[data-fragment-id="witness-account"]')!
    const dream = host.querySelector<HTMLButtonElement>('[data-fragment-id="new-dream"]')!

    expect(scar.dataset.fragmentKnowledge).toBe('unknown')
    expect(scar.disabled).toBe(true)
    expect(scar.textContent).toContain('SEALED')
    expect(scar.textContent).toContain('Unknown anchor')
    expect(scar.textContent).toContain('timecode, account, and source remain sealed')
    expect(scar.textContent).not.toContain('P3–C')
    expect(scar.textContent).not.toContain('Recognition')
    expect(scar.textContent).not.toContain('private fear response')
    expect(scar.textContent).not.toContain('Relational witness')

    expect(registry.dataset.fragmentKnowledge).toBe('corroborated')
    expect(registry.textContent).toContain('Corroborated by field evidence: Custody chain 77-A.')

    expect(witness.dataset.fragmentKnowledge).toBe('corroborated')
    expect(witness.disabled).toBe(false)
    expect(witness.textContent).toContain('Corroborated by field evidence: The rain in room twelve.')

    expect(dream.dataset.fragmentKnowledge).toBe('discovered')
    expect(dream.disabled).toBe(false)
    expect(dream.textContent).toContain('Known through Civic restoration ledger · post-restoration exception note')
    expect(dream.textContent).toContain('77-A’s uninterrupted account')
    expect(dream.textContent).toContain('Filed source:')

    const sealedStageAnchor = host.querySelector<HTMLElement>('[data-anchor-knowledge="unknown"]')!
    expect(sealedStageAnchor.textContent).toContain('SEALED')
    expect(sealedStageAnchor.textContent).toContain('Unknown anchor')
    expect(sealedStageAnchor.textContent).not.toContain('P3–C')
    expect(sealedStageAnchor.textContent).not.toContain('Recognition')
    expect(host.textContent).toContain(
      'Two known anchors. At least one corroborated. Pairings may converge.',
    )
  })

  it('leaves a stale unknown selection enabled only so the player can remove it', () => {
    const onToggleFragment = vi.fn()
    const state: GameState = {
      ...registryLattice(),
      selectedFragments: ['scar-sensation'],
    }
    act(() =>
      root.render(
        <Reconstruction
          state={state}
          onToggleFragment={onToggleFragment}
          onSubmit={() => undefined}
          onBack={() => undefined}
        />,
      ),
    )

    const scar = host.querySelector<HTMLButtonElement>('[data-fragment-id="scar-sensation"]')!
    expect(scar.disabled).toBe(false)
    expect(scar.getAttribute('aria-pressed')).toBe('true')
    expect(scar.textContent).toContain('stale selection remains available only so you can remove it')
    expect(scar.getAttribute('aria-label')).toContain('Select again to remove it')

    act(() => scar.click())
    expect(onToggleFragment).toHaveBeenCalledWith('scar-sensation')
  })

  it('enables filing only for an engine-valid pair', () => {
    const invalid = registryLattice()
    const invalidPair: GameState = {
      ...invalid,
      evidence: [],
      selectedFragments: ['new-dream', 'registry-hash'],
    }
    const valid: GameState = {
      ...invalid,
      selectedFragments: ['new-dream', 'registry-hash'],
    }

    act(() =>
      root.render(
        <Reconstruction
          state={invalidPair}
          onToggleFragment={() => undefined}
          onSubmit={() => undefined}
          onBack={() => undefined}
        />,
      ),
    )
    expect(
      host.querySelector<HTMLButtonElement>('button.button-primary')?.disabled,
    ).toBe(true)
    expect(host.textContent).toContain('Pair needs a corroborated anchor')

    act(() =>
      root.render(
        <Reconstruction
          state={valid}
          onToggleFragment={() => undefined}
          onSubmit={() => undefined}
          onBack={() => undefined}
        />,
      ),
    )
    expect(
      host.querySelector<HTMLButtonElement>('button.button-primary')?.disabled,
    ).toBe(false)
    expect(host.textContent).toContain('Argument this pair will file')
    expect(host.textContent).toContain('Limitation:')
    expect(host.textContent).toContain('Support: 1 of 2 anchors corroborated')
  })
})

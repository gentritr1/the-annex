// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCaseContent } from '../game/content'
import { createInitialGameState, gameReducer } from '../game/engine'
import type { GameState } from '../game/types'
import { Debrief } from './Debrief'
import { Tribunal } from './Tribunal'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function case81Tribunal({
  deposition = false,
  forged = false,
}: {
  deposition?: boolean
  forged?: boolean
} = {}): GameState {
  let state = gameReducer(createInitialGameState(), {
    type: 'START_CASE',
    caseId: 'case-81',
  })
  state = gameReducer(state, { type: 'SELECT_APPROACH', approachId: 'procedure' })

  if (deposition) {
    state = gameReducer(state, {
      type: 'COMMIT_DEPOSITION',
      actionId: 'take-sworn-statement',
      beats: ['let-it-stand', 'let-it-stand'],
      askedConsent: true,
    })
    state = gameReducer(state, {
      type: 'COMMIT_FIELD_ACTION',
      actionId: 'audit-restoration-log',
    })
  } else {
    state = gameReducer(state, {
      type: 'COMMIT_FIELD_ACTION',
      actionId: forged ? 'forge-certification-seal' : 'audit-restoration-log',
    })
    state = gameReducer(state, {
      type: 'COMMIT_FIELD_ACTION',
      actionId: 'brief-city-counsel',
    })
  }

  state = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
  state = gameReducer(state, {
    type: 'TOGGLE_FRAGMENT',
    fragmentId: deposition ? 'oath-cadence' : forged ? 'seed-signature' : 'redacted-clause',
  })
  state = gameReducer(state, {
    type: 'TOGGLE_FRAGMENT',
    fragmentId: deposition ? 'redacted-clause' : 'unscripted-answer',
  })
  state = gameReducer(state, { type: 'SUBMIT_RECONSTRUCTION' })
  state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })

  if (state.phase !== 'tribunal') {
    throw new Error(`Expected a canonical tribunal state, received ${state.phase}`)
  }
  return state
}

function decide(state: GameState, decisionId: string): GameState {
  const decided = gameReducer(state, { type: 'DECIDE', decisionId })
  if (decided.phase !== 'debrief') {
    throw new Error(`Expected a canonical debrief state, received ${decided.phase}`)
  }
  return decided
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

describe('Case 81 legal-channel presentation', () => {
  it('uses the state-derived no-record status across every available tribunal finding', () => {
    act(() => {
      root.render(
        <Tribunal
          state={case81Tribunal()}
          onDecide={() => undefined}
          onTribunalChoice={() => undefined}
          onBack={() => undefined}
        />,
      )
    })

    const testimonyStatuses = [
      ...host.querySelectorAll<HTMLElement>(
        '.decision-list .legal-channels--compact > span:nth-child(2) .legal-channel-status',
      ),
    ].map((status) => status.textContent)

    expect(testimonyStatuses).toHaveLength(4)
    expect(new Set(testimonyStatuses)).toEqual(new Set(['No account filed']))
    expect(host.querySelector<HTMLImageElement>('.tribunal-chamber-plate')?.src).toContain(
      '/images/case-81-deposition-annex.webp',
    )
    const certification = [...host.querySelectorAll<HTMLButtonElement>('.decision-list button')].find(
      (button) => button.textContent?.includes('Certify 81-C as a witness'),
    )
    expect(certification?.textContent).toContain(
      'No provisional account exists for this ruling to admit.',
    )
    expect(certification?.textContent).not.toContain(
      'any provisional account on file becomes admissible testimony',
    )
    expect(certification?.textContent).toContain(
      'No account was taken, so certification can decide personhood',
    )
  })

  it('preserves authored testimony statuses when a deposition exists', () => {
    act(() => {
      root.render(
        <Tribunal
          state={case81Tribunal({ deposition: true })}
          onDecide={() => undefined}
          onTribunalChoice={() => undefined}
          onBack={() => undefined}
        />,
      )
    })

    const testimonyStatuses = [
      ...host.querySelectorAll<HTMLElement>(
        '.decision-list .legal-channels--compact > span:nth-child(2) .legal-channel-status',
      ),
    ].map((status) => status.textContent)

    expect(testimonyStatuses).toEqual([
      'Admitted',
      'Struck',
      'Held',
      'Permanently struck',
    ])
    expect(testimonyStatuses).not.toContain('No account filed')
    const certification = [...host.querySelectorAll<HTMLButtonElement>('.decision-list button')].find(
      (button) => button.textContent?.includes('Certify 81-C as a witness'),
    )
    expect(certification?.textContent).toContain(
      'any provisional account on file becomes admissible testimony',
    )
    expect(certification?.textContent).not.toContain('No provisional account exists')
    expect(certification?.textContent).not.toContain('No account was taken')
  })

  it('resolves the forged finding to no account filed when its override is available', () => {
    act(() => {
      root.render(
        <Tribunal
          state={case81Tribunal({ forged: true })}
          onDecide={() => undefined}
          onTribunalChoice={() => undefined}
          onBack={() => undefined}
        />,
      )
    })

    const testimonyStatuses = [
      ...host.querySelectorAll<HTMLElement>(
        '.decision-list .legal-channels--compact > span:nth-child(2) .legal-channel-status',
      ),
    ].map((status) => status.textContent)

    expect(testimonyStatuses).toHaveLength(5)
    expect(new Set(testimonyStatuses)).toEqual(new Set(['No account filed']))
    expect(host.textContent).not.toContain('Forced · tainted')
    const forgedFinding = [
      ...host.querySelectorAll<HTMLButtonElement>('.decision-list button'),
    ].find((button) => button.textContent?.includes('Certify without a vote'))
    expect(forgedFinding?.textContent).toContain('No account exists for it to admit.')
    expect(forgedFinding?.textContent).not.toContain('admit the testimony now')
  })

  it('repeats the same no-record legal force in the filed debrief', () => {
    const state = decide(case81Tribunal(), 'certify-witness')
    act(() => {
      root.render(
        <Debrief
          state={state}
          onNextRun={() => undefined}
          switchTargets={[]}
          onSwitchCase={() => undefined}
          onReturnToTitle={() => undefined}
        />,
      )
    })

    const statuses = [
      ...host.querySelectorAll<HTMLElement>('.debrief-legal-force .legal-channels dd'),
    ].map((status) => status.textContent)

    expect(statuses).toEqual(['Certified', 'No account filed'])
    expect(host.querySelector('.debrief-legal-force')?.textContent).not.toContain('Admitted')
    expect(host.querySelector('.debrief-tableau-cost')?.textContent).toContain(
      'without creating testimony',
    )
    expect(host.querySelector('.tension-echo')?.textContent).toContain(
      'No account was taken, so certification can decide personhood',
    )
  })

  it('keeps every no-record debrief consequence within the force of the filed record', () => {
    const content = getCaseContent('case-81')
    const forbiddenByDecision: Readonly<Record<string, string>> = {
      'certify-witness': 'Any provisional account actually recorded becomes admissible',
      'reject-standing': 'any provisional account is struck',
      'provisional-seating': 'both channels are held',
      'strike-testimony': 'commissioned testimony is struck',
      'seal-certification': 'office link is disputed from its first filing',
    }

    Object.entries(forbiddenByDecision).forEach(([decisionId, forbidden]) => {
      const state = decide(
        case81Tribunal({ forged: decisionId === 'seal-certification' }),
        decisionId,
      )
      const lines = content.getDecisionConsequences?.(decisionId, state) ?? []
      const combined = lines.join(' ')

      expect(lines).toHaveLength(3)
      expect(combined).toMatch(/no |without |empty recorder/i)
      expect(combined).not.toContain(forbidden)
    })
  })
})

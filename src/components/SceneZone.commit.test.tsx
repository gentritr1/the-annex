// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getCaseContent } from '../game/content'
import { createInitialGameState, gameReducer } from '../game/engine'
import type { FieldActionId, GameState } from '../game/types'
import { ChoiceButton } from './ChoiceButton'
import { SceneZone } from './SceneZone'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const content = getCaseContent('case-77')
// Every location that hosts its methods in the scene — the plain pilot site and
// each bounded room whose TERMINAL choice adopts the same grammar. The identity
// claim has to hold for all of them, not just the first one authored.
const sceneFirstSites = content.sites.filter((item) => item.closeup?.sceneFirst)
const site = sceneFirstSites[0]!
const zones = site.closeup!.zones!
const everyAnchor = sceneFirstSites.flatMap((item) =>
  (item.closeup?.zones ?? []).map((zone) => ({ siteId: item.id, actionId: zone.actionId })),
)

// The base state the two commit paths are compared from: a fresh run, taken to
// the investigation phase exactly as the game takes it there.
function investigationState(): GameState {
  let state = gameReducer(createInitialGameState(), { type: 'START_NEW' })
  state = gameReducer(state, {
    type: 'SELECT_APPROACH',
    approachId: content.approaches[0]!.id,
  })
  expect(state.phase).toBe('investigation')
  return state
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
})

function clickButton() {
  const button = host.querySelector('button')
  expect(button).not.toBeNull()
  // Synthetic dispatchEvent does not reach React's root listener in every
  // configuration; el.click() is the recorded reliable route.
  act(() => {
    button!.click()
  })
}

describe('SceneZone commits through the canonical path', () => {
  it('needs the same arm → confirm two-step the inspector list needs', () => {
    const action = content.fieldActions.find((item) => item.id === zones[0]!.actionId)!
    const commits: FieldActionId[] = []
    act(() => {
      root.render(
        <SceneZone
          action={action}
          x={zones[0]!.x}
          y={zones[0]!.y}
          onCommit={() => commits.push(action.id)}
          onAttentionChange={() => undefined}
        />,
      )
    })

    clickButton()
    expect(commits).toEqual([])
    expect(host.querySelector('button')?.getAttribute('aria-pressed')).toBe('true')

    clickButton()
    expect(commits).toEqual([action.id])
  })

  it('keeps the whole authored method text in the button’s accessible name', () => {
    const action = content.fieldActions.find((item) => item.id === zones[0]!.actionId)!
    act(() => {
      root.render(
        <SceneZone
          action={action}
          x={zones[0]!.x}
          y={zones[0]!.y}
          onCommit={() => undefined}
          onAttentionChange={() => undefined}
        />,
      )
    })
    const name = host.querySelector('button')!.textContent ?? ''
    expect(name).toContain(action.methodLabel)
    expect(name).toContain(action.title)
    expect(name).toContain(action.description)
    expect(name).toContain(action.consequence)
  })

  // The load-bearing guarantee of the pilot: the scene-first control is a
  // different box around the SAME commit. Both paths are driven with real
  // clicks, and the action each hands upward is fed to the real reducer from an
  // identical base state. Any divergence in the event log, admitted evidence,
  // trust, alarm, or completion bookkeeping fails here.
  describe.each(everyAnchor)(
    'event log identity for $siteId / $actionId',
    ({ actionId }) => {
      it('produces a reducer result identical to the inspector method list', () => {
        const action = content.fieldActions.find((item) => item.id === actionId)!

        const inspectorCommits: FieldActionId[] = []
        act(() => {
          root.render(
            <ChoiceButton
              title={action.title}
              label={action.methodLabel}
              description={action.description}
              consequence={action.consequence}
              tone={action.alarmDelta > 0 ? 'risk' : 'default'}
              requiresConfirmation
              onAttentionChange={() => undefined}
              onClick={() => inspectorCommits.push(action.id)}
            />,
          )
        })
        clickButton()
        clickButton()

        const sceneCommits: FieldActionId[] = []
        act(() => {
          root.render(
            <SceneZone
              action={action}
              x={0.23}
              y={0.56}
              onCommit={() => sceneCommits.push(action.id)}
              onAttentionChange={() => undefined}
            />,
          )
        })
        clickButton()
        clickButton()

        expect(sceneCommits).toEqual(inspectorCommits)
        expect(sceneCommits).toHaveLength(1)

        const base = investigationState()
        const viaInspector = inspectorCommits.reduce(
          (state, id) => gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: id }),
          base,
        )
        const viaScene = sceneCommits.reduce(
          (state, id) => gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: id }),
          base,
        )

        // Non-vacuity: the commit actually wrote a field-action event.
        expect(viaScene.events.length).toBe(base.events.length + 1)
        expect(viaScene.events.at(-1)?.sourceType).toBe('field-action')
        expect(viaScene.events.at(-1)?.sourceId).toBe(actionId)

        expect(viaScene.events).toEqual(viaInspector.events)
        expect(viaScene.evidence).toEqual(viaInspector.evidence)
        expect(viaScene.trust).toEqual(viaInspector.trust)
        expect(viaScene.alarm).toEqual(viaInspector.alarm)
        expect(viaScene.methodTags).toEqual(viaInspector.methodTags)
        expect(viaScene.completedActions).toEqual(viaInspector.completedActions)
        expect(viaScene.completedSites).toEqual(viaInspector.completedSites)
        expect(viaScene.announcement).toEqual(viaInspector.announcement)
        // Whole-state equality is the strongest form of the claim.
        expect(viaScene).toEqual(viaInspector)
      })
    },
  )
})

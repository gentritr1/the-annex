import { useEffect, useReducer, useState, useSyncExternalStore } from 'react'
import { Briefing } from './components/Briefing'
import { CaseHeader } from './components/CaseHeader'
import { CaseRail } from './components/CaseRail'
import { Debrief } from './components/Debrief'
import { Investigation } from './components/Investigation'
import { Reconstruction } from './components/Reconstruction'
import { StartScreen } from './components/StartScreen'
import { Tribunal } from './components/Tribunal'
import { getCaseContent } from './game/content'
import { createInitialGameState, gameReducer } from './game/engine'
import {
  clearGame,
  getStorageAvailability,
  loadGame,
  loadSettings,
  saveGame,
  saveSettings,
  subscribeStorageAvailability,
} from './game/persistence'
import type { AccessibilitySettings } from './game/types'

// Case 81 is only reachable once the player has a saved game that recorded a
// Case 77 verdict — the Mirror needs a prior ruling to cross into the new case.
const CASE_81_ID = 'case-81'

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialGameState(loadSettings() ?? undefined),
  )
  const [savedState, setSavedState] = useState(loadGame)
  const storageAvailable = useSyncExternalStore(
    subscribeStorageAvailability,
    getStorageAvailability,
    () => true,
  )

  useEffect(() => {
    const label = getCaseContent(state.caseId).label
    document.title = state.phase === 'landing' ? `The Annex — ${label}` : `${label} · ${state.phase}`
  }, [state.phase, state.caseId])

  useEffect(() => {
    if (state.phase === 'landing') return
    saveGame(state)
  }, [state])

  useEffect(() => {
    saveSettings(state.settings)
  }, [state.settings])

  useEffect(() => {
    document.documentElement.classList.toggle(
      'annex-large-text',
      state.settings.textSize === 'large',
    )
    return () => document.documentElement.classList.remove('annex-large-text')
  }, [state.settings.textSize])

  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      const heading = document.querySelector<HTMLElement>('.start-screen h1, #case-scene h1')
      if (!heading) return
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    })

    return () => window.cancelAnimationFrame(focusFrame)
  }, [state.phase])

  function updateSetting(
    setting: keyof AccessibilitySettings,
    value: boolean | 'standard' | 'large',
  ) {
    dispatch({ type: 'UPDATE_SETTING', setting, value })
  }

  function eraseLocalSave() {
    clearGame()
    setSavedState(null)
  }

  function returnToTitle() {
    saveGame(state)
    setSavedState(state)
    dispatch({ type: 'RETURN_TO_TITLE' })
  }

  // From the title: restore the existing progress, then open Case 81 on top of
  // it. START_CASE carries that save's precedents, run history, and residue.
  function openCase81FromTitle() {
    if (!savedState) return
    dispatch({ type: 'RESTORE', state: savedState })
    dispatch({ type: 'START_CASE', caseId: CASE_81_ID })
  }

  // From a debrief: the current run's verdict is already recorded as a precedent,
  // so START_CASE folds this run into history and opens Case 81 directly.
  function openCase81FromDebrief() {
    dispatch({ type: 'START_CASE', caseId: CASE_81_ID })
  }

  // Case 81 is offered on the title screen once a save carries a Case 77 verdict,
  // and at a Case 77 debrief once this run has recorded one.
  const titleCase81Available = Boolean(savedState?.precedents['case-77'])
  const debriefCase81Available =
    state.caseId !== CASE_81_ID && Boolean(state.precedents['case-77'])

  const appClassName = [
    'annex-app',
    state.settings.reducedMotion ? 'reduce-motion' : '',
    state.settings.highContrast ? 'high-contrast' : '',
    state.settings.textSize === 'large' ? 'large-text' : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (state.phase === 'landing') {
    return (
      <div className={appClassName}>
        <StartScreen
          savedState={savedState}
          settings={state.settings}
          storageAvailable={storageAvailable}
          case81Available={titleCase81Available}
          onNew={() => dispatch({ type: 'START_NEW' })}
          onContinue={() => savedState && dispatch({ type: 'RESTORE', state: savedState })}
          onOpenCase81={openCase81FromTitle}
          onErase={eraseLocalSave}
          onUpdateSetting={updateSetting}
        />
        <p className="sr-only" aria-live="polite">
          {state.announcement}
        </p>
      </div>
    )
  }

  return (
    <div className={appClassName}>
      <a className="skip-link" href="#case-scene">
        Skip to current scene
      </a>
      <CaseHeader
        state={state}
        onReturnToTitle={returnToTitle}
        onUpdateSetting={updateSetting}
      />

      {!storageAvailable && (
        <div className="storage-warning" role="status">
          Local saving is unavailable. This run will be lost when the tab closes.
        </div>
      )}

      <main className="case-layout">
        <section id="case-scene" className="scene-column" tabIndex={-1}>
          {state.phase === 'briefing' && (
            <Briefing
              state={state}
              onSelectApproach={(approachId) => dispatch({ type: 'SELECT_APPROACH', approachId })}
            />
          )}
          {state.phase === 'investigation' && (
            <Investigation
              state={state}
              onCommitAction={(actionId) => dispatch({ type: 'COMMIT_FIELD_ACTION', actionId })}
              onOpenReconstruction={() => dispatch({ type: 'OPEN_RECONSTRUCTION' })}
              onEnterTribunal={() => dispatch({ type: 'ENTER_TRIBUNAL' })}
            />
          )}
          {state.phase === 'reconstruction' && (
            <Reconstruction
              state={state}
              onToggleFragment={(fragmentId) => dispatch({ type: 'TOGGLE_FRAGMENT', fragmentId })}
              onSubmit={() => dispatch({ type: 'SUBMIT_RECONSTRUCTION' })}
              onBack={() => dispatch({ type: 'RETURN_TO_INVESTIGATION' })}
            />
          )}
          {state.phase === 'tribunal' && (
            <Tribunal
              state={state}
              onDecide={(decisionId) => dispatch({ type: 'DECIDE', decisionId })}
              onBack={() => dispatch({ type: 'RETURN_TO_INVESTIGATION' })}
            />
          )}
          {state.phase === 'debrief' && (
            <Debrief
              state={state}
              onNextRun={() => dispatch({ type: 'START_NEXT_RUN' })}
              case81Available={debriefCase81Available}
              onOpenCase81={openCase81FromDebrief}
              onReturnToTitle={returnToTitle}
            />
          )}
        </section>

        <CaseRail state={state} />
      </main>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {state.announcement}
      </p>
    </div>
  )
}

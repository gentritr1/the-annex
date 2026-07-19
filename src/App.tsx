import { useEffect, useReducer, useState, useSyncExternalStore } from 'react'
import { Briefing } from './components/Briefing'
import { CaseHeader } from './components/CaseHeader'
import { CaseRail } from './components/CaseRail'
import { Debrief } from './components/Debrief'
import { Investigation } from './components/Investigation'
import { Reconstruction } from './components/Reconstruction'
import { StartScreen } from './components/StartScreen'
import { Tribunal } from './components/Tribunal'
import { getCaseContent, getSwitchableCaseIds } from './game/content'
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
import type { CaseSwitchOption } from './game/types'
import type { AccessibilitySettings } from './game/types'

// Resolve a switchable case id into the presentation model the title and debrief
// switchers render. A case the player has already ruled on reads as a return; an
// unseen case reads as opening it for the first time.
function describeSwitchTarget(
  caseId: string,
  precedents: Readonly<Record<string, string>>,
): CaseSwitchOption {
  const content = getCaseContent(caseId)
  const seen = Boolean(precedents[caseId])
  return {
    caseId,
    heading: `${seen ? 'Return to' : 'Open'} ${content.label}: ${content.caseFile.title}`,
    meta: seen ? 'Your record crosses back with you.' : 'Your record follows you into it.',
    seen,
  }
}

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

  // From the title: restore the existing progress, then open the chosen case on
  // top of it. START_CASE carries that save's precedents, run history, and
  // residue; an in-progress run is discarded (only completed history carries).
  function switchCaseFromTitle(caseId: string) {
    if (!savedState) return
    dispatch({ type: 'RESTORE', state: savedState })
    dispatch({ type: 'START_CASE', caseId })
  }

  // From a debrief: the current run's verdict is already recorded as a precedent,
  // so START_CASE folds this run into history and opens the chosen case directly.
  function switchCaseFromDebrief(caseId: string) {
    dispatch({ type: 'START_CASE', caseId })
  }

  // The cases each switcher may offer: every registered case except the one the
  // save/run is currently on, gated by any precedent the target case cites. The
  // title reads the persisted save; the debrief reads the just-resolved run
  // (whose verdict is already recorded as a precedent).
  const titleSwitchTargets: CaseSwitchOption[] = savedState
    ? getSwitchableCaseIds(savedState.caseId, savedState.precedents).map((id) =>
        describeSwitchTarget(id, savedState.precedents),
      )
    : []
  const debriefSwitchTargets: CaseSwitchOption[] = getSwitchableCaseIds(
    state.caseId,
    state.precedents,
  ).map((id) => describeSwitchTarget(id, state.precedents))

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
          switchTargets={titleSwitchTargets}
          onNew={() => dispatch({ type: 'START_NEW' })}
          onContinue={() => savedState && dispatch({ type: 'RESTORE', state: savedState })}
          onSwitchCase={switchCaseFromTitle}
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
              switchTargets={debriefSwitchTargets}
              onSwitchCase={switchCaseFromDebrief}
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

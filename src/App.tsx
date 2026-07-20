import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react'
import { createAmbientAudio, type AmbientAudioHandle, type WeatherBedKind } from './ambience/audio'
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
import { sceneStateFor } from './scene/sceneState'
import type { CaseSwitchOption, FieldActionId, SceneStateId } from './game/types'
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

interface AmbientAudioParams {
  // The ambientSound setting (default OFF). The single on/off gate.
  enabled: boolean
  // Whether a case surface (briefing/investigation onward) is showing. False on
  // the title screen — no audio there.
  active: boolean
  // The bed keyed by the current case's scene weather kind.
  weatherKind: WeatherBedKind
  // The resolved scene state driving the gain/filter treatment.
  sceneState: SceneStateId
}

// Wire the (React-free) ambient audio engine to game state. One engine per App
// lifetime, created inside an effect (StrictMode-safe: fully torn down and
// recreated) and driven entirely by props — no DOM observation of the scene.
function useAmbientAudio({ enabled, active, weatherKind, sceneState }: AmbientAudioParams): void {
  const handleRef = useRef<AmbientAudioHandle | null>(null)

  // Create once; destroy (and close the AudioContext) on unmount.
  useEffect(() => {
    const handle = createAmbientAudio()
    handleRef.current = handle
    if (import.meta.env.DEV) {
      // Verification handle only (dev builds): probe context.state / getSnapshot().
      ;(window as unknown as { __annexAmbient?: AmbientAudioHandle }).__annexAmbient = handle
    }
    return () => {
      handle.destroy()
      handleRef.current = null
    }
  }, [])

  // Keep the active bed and its scene treatment synced. Both are no-ops until the
  // engine is started, so they are safe to push every time either changes.
  useEffect(() => {
    handleRef.current?.setWeather(weatherKind)
  }, [weatherKind])
  useEffect(() => {
    handleRef.current?.setSceneState(sceneState)
  }, [sceneState])

  // Enable / active lifecycle + gesture arming. The engine only ever constructs
  // or resumes the AudioContext inside a real user gesture: on toggle-on we are
  // inside the click's activation, so it starts at once; on a reload with the
  // setting persisted ON there is no activation yet, so the bed is ARMED and the
  // first pointer/key interaction starts it.
  useEffect(() => {
    const handle = handleRef.current
    if (!handle) return
    if (!enabled || !active) {
      handle.stop()
      return
    }
    const activation = typeof navigator !== 'undefined' ? navigator.userActivation : undefined
    if (activation?.isActive) handle.start()
    const kick = () => handle.start()
    window.addEventListener('pointerdown', kick, { once: true })
    window.addEventListener('keydown', kick, { once: true })
    return () => {
      window.removeEventListener('pointerdown', kick)
      window.removeEventListener('keydown', kick)
    }
  }, [enabled, active])
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

  // Which deposition entry action (if any) has its transcript open. Lifted here
  // from Investigation so the audio scene state — which presses/corroborates
  // while a transcript is open — reads the SAME resolved value the SceneStage
  // renders, via props (no DOM observation). The transcript is an exclusive
  // interaction: while it is open the whole shell below is marked `inert` (the tray
  // portals out to <body>, so it stays live), and it can only be closed by commit
  // or abandon (both clear this) — so it is always null by the time the phase
  // leaves investigation, and App and SceneStage always read the identical value.
  const [depositionEntry, setDepositionEntry] = useState<FieldActionId | null>(null)

  // The bed for this case, and the resolved scene state that drives its gain.
  // Only rain (Case 77) and dust (Case 81) are synthesized; a weatherless case
  // gets no bed. Tribunal/debrief resolve to fixed states; investigation resolves
  // through the same sceneStateFor the SceneStage uses; briefing is neutral.
  const weatherKind = getCaseContent(state.caseId).scene.weather.kind
  const weatherBed: WeatherBedKind | null =
    weatherKind === 'dust' ? 'dust' : weatherKind === 'rain' ? 'rain' : null
  let audioSceneState: SceneStateId = 'neutral'
  if (state.phase === 'tribunal') audioSceneState = 'tribunal'
  else if (state.phase === 'debrief') audioSceneState = 'aftermath'
  else if (state.phase === 'investigation') {
    audioSceneState = sceneStateFor(state, {
      surface: 'investigation',
      openDepositionEntry: depositionEntry,
    })
  }

  useAmbientAudio({
    enabled: state.settings.ambientSound,
    active: state.phase !== 'landing' && weatherBed !== null,
    weatherKind: weatherBed ?? 'rain',
    sceneState: audioSceneState,
  })

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
    // While a transcript is open the shell is inert — pointer and keyboard both —
    // so the deposition reads as modal even though the tray only docks at the
    // bottom. The tray itself portals to <body>, outside this subtree, so it stays
    // interactive. (Cleared the instant the transcript commits or is abandoned.)
    <div className={appClassName} inert={depositionEntry !== null}>
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
              depositionEntry={depositionEntry}
              onDepositionEntryChange={setDepositionEntry}
              onCommitAction={(actionId) => dispatch({ type: 'COMMIT_FIELD_ACTION', actionId })}
              onCommitDeposition={(actionId, beats, askedConsent) =>
                dispatch({ type: 'COMMIT_DEPOSITION', actionId, beats, askedConsent })
              }
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

import { useState } from 'react'
import { Atmosphere } from '../ambience/Atmosphere'
import type { AccessibilitySettings, CaseSwitchOption, GameState } from '../game/types'

interface StartScreenProps {
  savedState: GameState | null
  settings: AccessibilitySettings
  storageAvailable: boolean
  // Cases the save may switch to: every registered case except the one it is on,
  // gated by any precedent the target cites. Empty when there is nowhere to go.
  switchTargets: readonly CaseSwitchOption[]
  onNew: () => void
  onContinue: () => void
  onSwitchCase: (caseId: string) => void
  onErase: () => void
  onUpdateSetting: (
    setting: keyof AccessibilitySettings,
    value: boolean | 'standard' | 'large',
  ) => void
}

// The pending two-step confirmation. Switching a save that is mid-run closes the
// unfinished run, so it takes the same confirm gate as replacing/erasing.
type Confirmation =
  | { kind: 'replace' }
  | { kind: 'erase' }
  | { kind: 'switch'; caseId: string }
  | null

function phaseLabel(phase: GameState['phase']): string {
  if (phase === 'debrief') return 'debrief'
  if (phase === 'reconstruction') return 'memory reconstruction'
  return phase
}

export function StartScreen({
  savedState,
  settings,
  storageAvailable,
  switchTargets,
  onNew,
  onContinue,
  onSwitchCase,
  onErase,
  onUpdateSetting,
}: StartScreenProps) {
  const [confirmation, setConfirmation] = useState<Confirmation>(null)

  // A saved run that has not reached its debrief is still in progress; switching
  // away from it discards the unfinished run, so it needs a confirm step.
  const runInProgress = Boolean(savedState) && savedState?.phase !== 'debrief'

  function requestNewAudit() {
    if (savedState) {
      setConfirmation({ kind: 'replace' })
      return
    }
    onNew()
  }

  function requestSwitchCase(caseId: string) {
    if (runInProgress) {
      setConfirmation({ kind: 'switch', caseId })
      return
    }
    onSwitchCase(caseId)
  }

  function confirmAction() {
    if (!confirmation) return
    if (confirmation.kind === 'replace') onNew()
    else if (confirmation.kind === 'erase') onErase()
    else if (confirmation.kind === 'switch') onSwitchCase(confirmation.caseId)
    setConfirmation(null)
  }

  return (
    <main className="start-screen">
      {/* Full 5-plane parallax stack carrying the real hero art; the plane-hero
          replaces the static .start-visual, .start-shade stays for text contrast. */}
      <Atmosphere
        className="start-atmosphere"
        mask={0.12}
        reducedMotion={settings.reducedMotion}
        planes
        parallax
        heroImage="/images/civic-archive.webp"
      />
      <div className="start-shade" aria-hidden="true" />

      <section className="start-content" aria-labelledby="game-title">
        <div className="studio-mark">
          <span className="studio-mark-glyph">A</span>
          <span>Civic Memory Authority</span>
        </div>

        <div className="start-copy">
          <p className="case-code">Playable systems prototype · Case 77</p>
          <h1 id="game-title">The Annex</h1>
          <p className="start-premise">
            A person has returned from a memory archive. The city needs you to decide whether she is
            a continuation, a new beginning, or evidence that the law has no category for her.
          </p>
          <p className="start-thesis">Your route through the record will become part of the record.</p>
        </div>

        <div className="start-actions">
          {savedState && savedState.phase !== 'landing' && (
            <button className="button button-primary" type="button" onClick={onContinue}>
              <span>Continue local case</span>
              <span className="button-meta">
                Run {savedState.runNumber} · {phaseLabel(savedState.phase)}
              </span>
            </button>
          )}
          {savedState &&
            switchTargets.map((target) => (
              <button
                key={target.caseId}
                className="button button-secondary"
                type="button"
                onClick={() => requestSwitchCase(target.caseId)}
              >
                <span>{target.heading}</span>
                <span className="button-meta">{target.meta}</span>
              </button>
            ))}
          <button
            className={savedState ? 'button button-secondary' : 'button button-primary'}
            type="button"
            onClick={requestNewAudit}
          >
            <span>Open a new audit</span>
            <span className="button-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>

        {confirmation && (
          <div className="inline-confirmation" role="alert">
            <div>
              <strong>
                {confirmation.kind === 'replace'
                  ? 'Replace the current save?'
                  : confirmation.kind === 'erase'
                    ? 'Erase local progress?'
                    : 'Leave the run in progress?'}
              </strong>
              <p>
                {confirmation.kind === 'replace'
                  ? 'The next autosave will replace the existing run and its accumulated residue.'
                  : confirmation.kind === 'erase'
                    ? 'This removes the saved case and run history. Access preferences stay on this device.'
                    : 'The run you have open will close. Only completed cases carry forward — nothing from this unfinished run does.'}
              </p>
            </div>
            <div className="inline-confirmation-actions">
              <button className="button button-primary" type="button" onClick={confirmAction}>
                {confirmation.kind === 'replace'
                  ? 'Start fresh'
                  : confirmation.kind === 'erase'
                    ? 'Erase progress'
                    : 'Leave and switch'}
              </button>
              <button className="text-button" type="button" onClick={() => setConfirmation(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <details className="start-preferences">
          <summary>Access preferences</summary>
          <div className="preference-grid">
            <label className="preference-toggle">
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(event) => onUpdateSetting('reducedMotion', event.target.checked)}
              />
              <span>
                <strong>Reduce motion</strong>
                <small>Use immediate state changes.</small>
              </span>
            </label>
            <label className="preference-toggle">
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(event) => onUpdateSetting('highContrast', event.target.checked)}
              />
              <span>
                <strong>High contrast</strong>
                <small>Strengthen lines and state fills.</small>
              </span>
            </label>
            <label className="preference-toggle">
              <input
                type="checkbox"
                checked={settings.textSize === 'large'}
                onChange={(event) =>
                  onUpdateSetting('textSize', event.target.checked ? 'large' : 'standard')
                }
              />
              <span>
                <strong>Larger text</strong>
                <small>Increase narrative and control text.</small>
              </span>
            </label>
          </div>
        </details>

        <div className="start-footer">
          <p>
            {storageAvailable
              ? 'Local save · no account · no timer · keyboard and touch ready'
              : 'Session only · local saving unavailable · no timer'}
          </p>
          {savedState && (
            <button className="text-button" type="button" onClick={() => setConfirmation({ kind: 'erase' })}>
              Erase local save
            </button>
          )}
        </div>
      </section>
    </main>
  )
}

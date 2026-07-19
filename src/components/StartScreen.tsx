import { useState } from 'react'
import { Atmosphere } from '../ambience/Atmosphere'
import type { AccessibilitySettings, GameState } from '../game/types'

interface StartScreenProps {
  savedState: GameState | null
  settings: AccessibilitySettings
  storageAvailable: boolean
  onNew: () => void
  onContinue: () => void
  onErase: () => void
  onUpdateSetting: (
    setting: keyof AccessibilitySettings,
    value: boolean | 'standard' | 'large',
  ) => void
}

function phaseLabel(phase: GameState['phase']): string {
  if (phase === 'debrief') return 'debrief'
  if (phase === 'reconstruction') return 'memory reconstruction'
  return phase
}

export function StartScreen({
  savedState,
  settings,
  storageAvailable,
  onNew,
  onContinue,
  onErase,
  onUpdateSetting,
}: StartScreenProps) {
  const [confirmation, setConfirmation] = useState<'replace' | 'erase' | null>(null)

  function requestNewAudit() {
    if (savedState) {
      setConfirmation('replace')
      return
    }
    onNew()
  }

  function confirmAction() {
    if (confirmation === 'replace') onNew()
    if (confirmation === 'erase') onErase()
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
              <strong>{confirmation === 'replace' ? 'Replace the current save?' : 'Erase local progress?'}</strong>
              <p>
                {confirmation === 'replace'
                  ? 'The next autosave will replace the existing run and its accumulated residue.'
                  : 'This removes the saved case and run history. Access preferences stay on this device.'}
              </p>
            </div>
            <div className="inline-confirmation-actions">
              <button className="button button-primary" type="button" onClick={confirmAction}>
                {confirmation === 'replace' ? 'Start fresh' : 'Erase progress'}
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
            <button className="text-button" type="button" onClick={() => setConfirmation('erase')}>
              Erase local save
            </button>
          )}
        </div>
      </section>
    </main>
  )
}

import { getCaseContent } from '../game/content'
import type { AccessibilitySettings, GameState } from '../game/types'

interface CaseHeaderProps {
  state: GameState
  onReturnToTitle: () => void
  onUpdateSetting: (
    setting: keyof AccessibilitySettings,
    value: boolean | 'standard' | 'large',
  ) => void
}

const phaseNames: Record<GameState['phase'], string> = {
  landing: 'Title',
  briefing: 'Briefing',
  investigation: 'Field record',
  reconstruction: 'Memory lattice',
  tribunal: 'Tribunal',
  debrief: 'Consequence record',
}

export function CaseHeader({ state, onReturnToTitle, onUpdateSetting }: CaseHeaderProps) {
  return (
    <header className="case-header">
      <div className="case-identity">
        <button className="brand-button" type="button" onClick={onReturnToTitle}>
          <span className="brand-glyph" aria-hidden="true">
            A
          </span>
          <span>
            <strong>The Annex</strong>
            <small>{getCaseContent(state.caseId).caseFile.code}</small>
          </span>
        </button>
      </div>

      <div className="phase-status" aria-label={`Current phase: ${phaseNames[state.phase]}`}>
        <span className="status-pulse" aria-hidden="true" />
        <span>{phaseNames[state.phase]}</span>
        <span className="phase-divider" aria-hidden="true">
          /
        </span>
        <span>Run {state.runNumber}</span>
      </div>

      <details className="header-preferences">
        <summary>Access</summary>
        <div className="preferences-popover">
          <p className="popover-title">Access preferences</p>
          <label>
            <input
              type="checkbox"
              checked={state.settings.reducedMotion}
              onChange={(event) => onUpdateSetting('reducedMotion', event.target.checked)}
            />
            Reduce motion
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.settings.highContrast}
              onChange={(event) => onUpdateSetting('highContrast', event.target.checked)}
            />
            High contrast
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.settings.textSize === 'large'}
              onChange={(event) =>
                onUpdateSetting('textSize', event.target.checked ? 'large' : 'standard')
              }
            />
            Larger text
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.settings.showTrustNumbers}
              onChange={(event) => onUpdateSetting('showTrustNumbers', event.target.checked)}
            />
            Show trust values
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.settings.ambientSound}
              onChange={(event) => onUpdateSetting('ambientSound', event.target.checked)}
            />
            Ambient sound
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.settings.easyRead}
              onChange={(event) => onUpdateSetting('easyRead', event.target.checked)}
            />
            Easy read
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.settings.subtitlePlate}
              onChange={(event) => onUpdateSetting('subtitlePlate', event.target.checked)}
            />
            Subtitle plate
          </label>
          {/* The preview the subtitle controls are for: a sample line under the
              live rules — the same voice, the same plate, the same two-line
              window — so a player sets the presentation by looking at it instead
              of committing a method and finding out.

              It deliberately does NOT reuse `.scene-beat-line` /
              `.scene-beat-lines`. Those class names are counted by three shipped
              harness assertions and read by the contrast probe with
              querySelector(); a second copy sitting earlier in document order
              would make every one of them measure the header instead of the
              scene. The preview classes are joined to the beat's rules in the
              stylesheet instead, so the two share declarations without sharing a
              selector. Decorative: the checkboxes above are the semantics. */}
          <div className="subtitle-preview" aria-hidden="true">
            <p className="subtitle-preview-label">Sample</p>
            <div className="subtitle-preview-stage">
              <div className="subtitle-preview-stanza">
                {/* Short on purpose: the popover is 250px wide, and a sample
                    that wraps is a sample of wrapping rather than of the
                    subtitle presentation the player is setting. */}
                <p className="subtitle-preview-line">She answers too quickly.</p>
                <p className="subtitle-preview-line subtitle-preview-line--persona">
                  “The rain was inside.”
                </p>
              </div>
            </div>
          </div>
        </div>
      </details>
    </header>
  )
}

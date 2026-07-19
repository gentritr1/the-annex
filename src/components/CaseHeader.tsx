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
        </div>
      </details>
    </header>
  )
}

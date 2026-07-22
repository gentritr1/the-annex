import type { DepositionChoiceId, DepositionConsent } from '../game/types'

interface DepositionBeatStageProps {
  backgroundSrc: string
  figureSrc?: string
  beatNumber: number
  totalBeats: number
  phase: 'statement' | 'consent' | 'closing'
  route: 'sworn' | 'press'
  lastChoice: DepositionChoiceId | null
  consent: DepositionConsent | 'pending'
}

const BEAT_LABELS = ['Oath', 'Collapse', 'Fourth minute', 'Consent', 'Seal'] as const

// A supplemental close-read of the deposition room. The transcript remains the
// only control surface: this stage is pointer-inert, hidden from assistive tech,
// and derives entirely from Deposition's existing view-local beat state.
export function DepositionBeatStage({
  backgroundSrc,
  figureSrc,
  beatNumber,
  totalBeats,
  phase,
  route,
  lastChoice,
  consent,
}: DepositionBeatStageProps) {
  return (
    <div
      className="deposition-beat-stage"
      data-beat={beatNumber}
      data-phase={phase}
      data-route={route}
      data-choice={lastChoice ?? 'none'}
      data-consent={consent}
      aria-hidden="true"
    >
      <div className="deposition-close-room">
        <img src={backgroundSrc} alt="" />
      </div>
      <div className="deposition-close-geometry" />
      <div className="deposition-close-light" />

      {figureSrc ? <img className="deposition-close-figure" src={figureSrc} alt="" /> : null}

      <div className="deposition-close-table">
        <div className="deposition-packet">
          <span>81-C</span>
          <i />
          <i />
          <i />
        </div>
        <div className="deposition-recorder">
          <span />
          <strong>REC</strong>
        </div>
      </div>

      <div className="deposition-room-seal">
        <span />
        <span />
      </div>

      <div className="deposition-visual-progress">
        <span className="deposition-visual-count">
          {String(beatNumber).padStart(2, '0')} / {String(totalBeats).padStart(2, '0')}
        </span>
        <div className="deposition-beat-track">
          {BEAT_LABELS.slice(0, totalBeats).map((label, index) => {
            const position = index + 1
            return (
              <span
                className={position === beatNumber ? 'is-current' : ''}
                data-complete={position < beatNumber ? 'true' : undefined}
                key={label}
              >
                <i />
                <b>{label}</b>
              </span>
            )
          })}
        </div>
      </div>

      <div className="deposition-visual-caption">
        <span>{route === 'press' ? 'Opposing examination' : 'Sworn account'}</span>
        <strong>{BEAT_LABELS[beatNumber - 1] ?? 'Close'}</strong>
      </div>
    </div>
  )
}

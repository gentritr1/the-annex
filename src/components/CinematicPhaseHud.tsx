export interface CinematicPhaseMetric {
  label: string
  value: string
  tone?: 'neutral' | 'warning' | 'open'
}

interface CinematicPhaseHudProps {
  caseCode: string
  caseTitle: string
  phaseLabel: string
  runNumber: number
  objective: string
  metrics: readonly CinematicPhaseMetric[]
}

/**
 * Persistent, presentation-only game chrome for the adjudication and consequence
 * phases. Canonical state remains in the reducer; this surface only names the
 * active record and mirrors already-derived status.
 */
export function CinematicPhaseHud({
  caseCode,
  caseTitle,
  phaseLabel,
  runNumber,
  objective,
  metrics,
}: CinematicPhaseHudProps) {
  return (
    <aside className="cinematic-phase-hud" aria-label={`${phaseLabel} heads-up display`}>
      <div className="cinematic-phase-hud-case">
        <p>
          {phaseLabel} <span aria-hidden="true">/</span> {caseCode}
        </p>
        <strong>{caseTitle}</strong>
      </div>

      <div className="cinematic-phase-hud-objective">
        <span>Current objective</span>
        <p>{objective}</p>
      </div>

      <dl className="cinematic-phase-hud-metrics">
        {metrics.map((metric) => (
          <div data-tone={metric.tone ?? 'neutral'} key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
        <div>
          <dt>Run</dt>
          <dd>{String(runNumber).padStart(2, '0')}</dd>
        </div>
      </dl>
    </aside>
  )
}

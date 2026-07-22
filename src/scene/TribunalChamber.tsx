import type { CSSProperties } from 'react'

interface TribunalChamberProps {
  channel: string
  headline: string
  intro: string
  seal: string
  precedentLine: string | null
  evidenceCount: number
  reconstructionTitle: string
  alarmLevel: number
  overrideAvailable: boolean
  onBack: () => void
}

export function TribunalChamber({
  channel,
  headline,
  intro,
  seal,
  precedentLine,
  evidenceCount,
  reconstructionTitle,
  alarmLevel,
  overrideAvailable,
  onBack,
}: TribunalChamberProps) {
  const admittedLights = Array.from({ length: evidenceCount }, (_, index) => index)
  const orbitTotal = Math.max(admittedLights.length, 1)

  return (
    <section
      className="tribunal-chamber"
      data-alarm={Math.max(0, Math.min(3, alarmLevel))}
      data-override={overrideAvailable ? 'available' : 'closed'}
    >
      <div className="tribunal-chamber-art" aria-hidden="true">
        <img
          className="tribunal-chamber-plate"
          src="/images/phase-scenes/tribunal-chamber.webp"
          alt=""
        />
        <div className="tribunal-chamber-depth" />
        <div className="tribunal-record-orbit">
          {admittedLights.map((index) => (
            <span
              key={index}
              style={
                {
                  '--orbit-angle': `${(index / orbitTotal) * 360}deg`,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <div className="tribunal-filing-aperture" />
        <div className="tribunal-chamber-status">
          <span>{evidenceCount} admitted signals</span>
          <span>{reconstructionTitle}</span>
        </div>
      </div>

      <header className="tribunal-header tribunal-header-in-scene">
        <button className="back-button" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span> Return to field
        </button>
        <div className="tribunal-seal" aria-hidden="true">
          {seal}
        </div>
        <p className="case-code">{channel}</p>
        <h1>{headline}</h1>
        <p>{intro}</p>
        {precedentLine ? (
          <p className="tribunal-precedent" role="note">
            {precedentLine}
          </p>
        ) : null}
      </header>

      <a className="tribunal-scroll-cue" href="#decision-heading">
        Review findings <span aria-hidden="true">↓</span>
      </a>
    </section>
  )
}

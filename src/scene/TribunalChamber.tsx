import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'

interface TribunalChamberProps {
  backdropSrc?: string
  channel: string
  headline: string
  intro: string
  seal: string
  precedentLine: string | null
  evidenceCount: number
  reconstructionTitle: string
  alarmLevel: number
  overrideAvailable: boolean
  reducedMotion: boolean
  onBack: () => void
}

export function TribunalChamber({
  backdropSrc = '/images/phase-scenes/tribunal-chamber.webp',
  channel,
  headline,
  intro,
  seal,
  precedentLine,
  evidenceCount,
  reconstructionTitle,
  alarmLevel,
  overrideAvailable,
  reducedMotion,
  onBack,
}: TribunalChamberProps) {
  const admittedLights = Array.from({ length: evidenceCount }, (_, index) => index)
  const orbitTotal = Math.max(admittedLights.length, 1)

  // The cue used to be a bare fragment link. On a 1280x800 tribunal the first
  // verdict card sits roughly 1,350px below the top (audit F4), so the affordance
  // that named the decision was the one thing that did not deliver the player to
  // it — the browser's default jump landed wherever the hash took it and left no
  // focus behind. This carries BOTH: the scroll and the caret. The href stays as
  // the no-JS path and keeps the link right-clickable.
  function reachTheDecision(event: ReactMouseEvent<HTMLAnchorElement>) {
    const heading = document.getElementById('decision-heading')
    if (!heading) return
    event.preventDefault()
    // Scroll the whole section, not the heading: the section carries the Step 2
    // mark, and stopping at the heading would cut that mark off above the fold.
    const target = heading.closest('.tribunal-decision-section') ?? heading
    // Both channels, same as the investigation's own camera moves: the in-game
    // preference AND the OS media query. A CSS `scroll-behavior: auto` cannot
    // override the `behavior` argument passed here, so the argument is where the
    // preference has to be read.
    const instant =
      reducedMotion ||
      (typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    target.scrollIntoView({
      behavior: instant ? 'auto' : 'smooth',
      block: 'start',
    })
    // Keyboard and screen-reader players must arrive where the pointer arrives.
    // preventScroll, because the scroll above is the one that respects the
    // reduced-motion preference.
    heading.focus({ preventScroll: true })
  }

  return (
    <section
      className="tribunal-chamber"
      data-alarm={Math.max(0, Math.min(3, alarmLevel))}
      data-override={overrideAvailable ? 'available' : 'closed'}
    >
      <div className="tribunal-chamber-art" aria-hidden="true">
        <img
          className="tribunal-chamber-plate"
          src={backdropSrc}
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
          {/* W1-4 · audit P3-C. This line had no singular branch and rendered
              `1 admitted signals`. Tribunal.tsx composes a DIFFERENT
              admitted-items line that already agrees at 1 — that one is correct
              and is left alone. */}
          <span>
            {evidenceCount} admitted signal{evidenceCount === 1 ? '' : 's'}
          </span>
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

      <a className="tribunal-scroll-cue" href="#decision-heading" onClick={reachTheDecision}>
        Review findings <span aria-hidden="true">↓</span>
      </a>
    </section>
  )
}

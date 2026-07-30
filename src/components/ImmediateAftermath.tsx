import { useRef, useState } from 'react'
import type { ImmediateAftermath as ImmediateAftermathDefinition } from '../game/causal'

interface ImmediateAftermathProps {
  tableau: ImmediateAftermathDefinition
  reducedMotion: boolean
}

// View-local expression of facts the reducer has already committed. Dismissing this
// tableau never dispatches, changes a verdict, or rewrites the event log.
export function ImmediateAftermath({ tableau, reducedMotion }: ImmediateAftermathProps) {
  const [open, setOpen] = useState(true)
  const nextRef = useRef<HTMLDivElement>(null)

  if (!open) return null

  function skip() {
    setOpen(false)
    window.requestAnimationFrame(() => nextRef.current?.focus({ preventScroll: true }))
  }

  return (
    <section
      className="immediate-aftermath"
      data-tableau={tableau.id}
      data-reduced-motion={reducedMotion ? 'true' : undefined}
      aria-labelledby="immediate-aftermath-heading"
    >
      <div className="immediate-aftermath-frame" aria-hidden="true">
        <span className="immediate-aftermath-shutter" />
        <span className="immediate-aftermath-trace" />
        <span className="immediate-aftermath-object" />
      </div>
      <div className="immediate-aftermath-copy">
        <p>Immediate aftermath · canonical tableau</p>
        <h1 id="immediate-aftermath-heading">{tableau.title}</h1>
        <p>{tableau.detail}</p>
        <strong>{tableau.environmentalLine}</strong>
      </div>
      <button className="button button-secondary" type="button" onClick={skip}>
        Skip tableau <span aria-hidden="true">→</span>
      </button>
      <div ref={nextRef} tabIndex={-1} className="sr-only">
        Written debrief follows.
      </div>
    </section>
  )
}

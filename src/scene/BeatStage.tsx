import { useEffect, useRef, useState } from 'react'
import { beatHoldMs, type BeatLine } from '../game/beats'
import { personaName } from '../game/content'

interface BeatStageProps {
  // The assembled line sequence (see game/beats.ts). The reveal clock keys off
  // primitive line data, so a fresh array identity never resets a line mid-hold.
  lines: readonly BeatLine[]
  // Both reduced-motion signals folded into one. Under reduced motion every line
  // renders at once and the stage is ADVANCE-PACED: no timer ever completes it,
  // because a beat that auto-advances on a clock is unreadable for the people who
  // asked for less motion (recorded prototype-QA scar).
  reducedMotion: boolean
  // Fired when the player advances past the last line. Never gating anything: by
  // the time this stage mounts the commit has already been dispatched.
  onComplete: () => void
  // The stanza has finished and something else (the result strip) now owns the
  // player's attention: every line stays legible, and this stage stops listening
  // and stops offering its own advance control.
  held?: boolean
  // Copy for the explicit advance control (the keyboard-canonical route).
  advanceLabel?: string
  completeLabel?: string
}

function renderedText(line: BeatLine): string {
  return line.kind === 'speaker' ? `${personaName(line.speaker)} —` : line.text
}

// The staged reveal that performs over the scene after a method is filed. It is
// presentational only: it reads assembled authored lines, owns a view-local
// reveal index, and reports completion upward. It never dispatches, never defers
// a dispatch, and holds no canonical state. The visual stanza is hidden from
// assistive tech and mirrored line-by-line into one polite live region, so the
// staging is heard as it happens instead of read out as a wall on mount.
export function BeatStage({
  lines,
  reducedMotion,
  onComplete,
  held = false,
  advanceLabel = 'Continue',
  completeLabel = 'Close the beat',
}: BeatStageProps) {
  const total = lines.length
  const [shown, setShown] = useState(() =>
    reducedMotion || held ? total : Math.min(1, total),
  )
  const advanceRef = useRef<HTMLButtonElement>(null)
  // Guards the document key listener against the very keystroke that committed:
  // Enter on a scene zone fires keydown → click → commit → this mount, and the
  // listener must not catch the tail of that same gesture.
  const readyRef = useRef(false)
  const advanceHandler = useRef<() => void>(() => undefined)

  // Once held, every line is legible regardless of where the reveal index landed.
  const visible = held ? total : shown
  const complete = visible >= total
  const currentText = shown > 0 && shown <= total ? renderedText(lines[shown - 1]!) : ''
  const holdMs = beatHoldMs(currentText)

  function advance() {
    if (shown < total) {
      setShown(total)
      return
    }
    onComplete()
  }

  useEffect(() => {
    advanceHandler.current = advance
  })

  // The reveal clock. Reduced motion never starts it (every line is already
  // shown); a finished stanza never restarts it.
  useEffect(() => {
    if (held || reducedMotion || shown === 0 || shown >= total) return
    const timer = window.setTimeout(() => {
      setShown((current) => (current >= total ? current : current + 1))
    }, holdMs)
    return () => window.clearTimeout(timer)
  }, [held, holdMs, reducedMotion, shown, total])

  // Hand focus to the advance control. The committed method's button has just
  // unmounted, so without this the keyboard route falls through to <body>. The
  // frame is cancelled on unmount (rAF-focus-after-unmount scar).
  useEffect(() => {
    if (held) return
    const frame = window.requestAnimationFrame(() => {
      readyRef.current = true
      advanceRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [held])

  // Any key advances, exactly as the approved prototype does — except the keys
  // the focused control already owns (Enter/Space on a button), Tab, Escape, and
  // anything typed into a field or spoken to a dialog.
  useEffect(() => {
    if (held) return
    function onKeyDown(event: KeyboardEvent) {
      if (!readyRef.current) return
      // Only a deliberate, distinct press advances. A held key's auto-repeat
      // would otherwise flush the whole stanza and dismiss it in one stroke, and
      // an 'Unidentified' key is not a press a person made — it is what unmapped
      // hardware and synthetic input pipelines emit.
      if (event.repeat || event.key === 'Unidentified') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'Tab' || event.key === 'Escape') return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable], [role="dialog"]')) return
      if ((event.key === 'Enter' || event.key === ' ') && target?.closest('button, a')) return
      event.preventDefault()
      advanceHandler.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [held])

  return (
    <div className="scene-beat" data-phase={held ? 'held' : complete ? 'flushed' : 'playing'}>
      {/* Click-anywhere-over-the-plate advance. The real control below is the
          canonical one; this catcher is decorative and hidden from AT. */}
      {held ? null : (
        <div
          className="scene-beat-catcher"
          aria-hidden="true"
          onClick={() => advanceHandler.current()}
        />
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {lines.slice(0, visible).map((line, index) => (
          <span key={`${index}-${line.kind}`}>{renderedText(line)} </span>
        ))}
      </p>
      {/* Only revealed lines are mounted, so the stanza grows upward from a fixed
          bottom exactly as the approved prototype does. Each line's entry is a
          fill-mode-less animation whose RESTING style is the fully visible one:
          if the animation is suppressed or never runs, the line is still there
          (the opacity-strand scar — no reveal is carried by a held-open frame). */}
      <div className="scene-beat-lines" aria-hidden="true">
        {lines.slice(0, visible).map((line, index) => (
          <p
            className={`scene-beat-line scene-beat-line--${line.kind}`}
            data-speaker={line.kind === 'subject' ? undefined : line.speaker}
            key={`${index}-${line.kind}`}
          >
            {renderedText(line)}
          </p>
        ))}
      </div>
      {held ? null : (
        <button className="scene-beat-advance" type="button" ref={advanceRef} onClick={advance}>
          {complete ? completeLabel : advanceLabel}
        </button>
      )}
      {held || reducedMotion ? null : (
        <p className="scene-beat-hint" aria-hidden="true">
          click or press any key to continue
        </p>
      )}
    </div>
  )
}

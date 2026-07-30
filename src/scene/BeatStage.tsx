import { useCallback, useEffect, useRef, useState } from 'react'
import { PersonaPortrait } from '../components/PersonaPortrait'
import { beatHoldMs, type BeatLine } from '../game/beats'
import { hasSeenBeat, markBeatSeen } from '../game/beatHistory'
import { personaName } from '../game/content'

interface BeatStageProps {
  lines: readonly BeatLine[]
  reducedMotion: boolean
  onComplete: () => void
  held?: boolean
  advanceLabel?: string
  completeLabel?: string
  // Stable content id, not a run-state flag. Only this id is persisted in the
  // separate replay-history store so canonical case progress stays untouched.
  beatId?: string
}

function renderedText(line: BeatLine): string {
  return line.kind === 'speaker' ? `${personaName(line.speaker)} —` : line.text
}

// The staged reveal that performs over the scene after a method is filed. It is
// presentational only: the canonical commit already happened before this mounts.
export function BeatStage({
  lines,
  reducedMotion,
  onComplete,
  held = false,
  advanceLabel = 'Continue',
  completeLabel = 'Close the beat',
  beatId,
}: BeatStageProps) {
  const total = lines.length
  const [shown, setShown] = useState(() =>
    reducedMotion || held ? total : Math.min(1, total),
  )
  const [seen, setSeen] = useState(() => hasSeenBeat(beatId))
  const [autoAdvance, setAutoAdvance] = useState(false)
  const advanceRef = useRef<HTMLButtonElement>(null)
  const readyRef = useRef(false)
  const completedRef = useRef(false)
  const advanceHandler = useRef<() => void>(() => undefined)

  const visible = held ? total : shown
  const complete = visible >= total
  const currentText = shown > 0 && shown <= total ? renderedText(lines[shown - 1]!) : ''
  const holdMs = beatHoldMs(currentText)

  const completeNow = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    markBeatSeen(beatId)
    setSeen(true)
    onComplete()
  }, [beatId, onComplete])

  const advance = useCallback(() => {
    if (shown < total) {
      setShown(total)
      return
    }
    completeNow()
  }, [completeNow, shown, total])

  useEffect(() => {
    advanceHandler.current = advance
  }, [advance])

  useEffect(() => {
    if (held || reducedMotion || shown === 0 || shown >= total) return
    const timer = window.setTimeout(() => {
      setShown((current) => (current >= total ? current : current + 1))
    }, holdMs)
    return () => window.clearTimeout(timer)
  }, [held, holdMs, reducedMotion, shown, total])

  // Auto-advance is offered only for a beat this browser has already encountered.
  // It flushes the transcript first, then closes on a distinct short timer so the
  // final text remains perceptible and keyboard users can cancel the checkbox.
  useEffect(() => {
    if (!seen || !autoAdvance || held) return
    if (shown < total) {
      setShown(total)
      return
    }
    const timer = window.setTimeout(completeNow, reducedMotion ? 0 : 520)
    return () => window.clearTimeout(timer)
  }, [autoAdvance, completeNow, held, reducedMotion, seen, shown, total])

  useEffect(() => {
    if (held) return
    const frame = window.requestAnimationFrame(() => {
      readyRef.current = true
      advanceRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [held])

  useEffect(() => {
    if (held) return
    function onKeyDown(event: KeyboardEvent) {
      if (!readyRef.current) return
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
    <div
      className="scene-beat"
      data-phase={held ? 'held' : complete ? 'flushed' : 'playing'}
      data-seen={seen ? 'true' : undefined}
    >
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
      <div className="scene-beat-lines" aria-hidden="true">
        {lines.slice(0, visible).map((line, index) => (
          <p
            className={`scene-beat-line scene-beat-line--${line.kind}`}
            data-speaker={line.kind === 'subject' ? undefined : line.speaker}
            key={`${index}-${line.kind}`}
          >
            {line.kind === 'speaker' && (
              <PersonaPortrait personaId={line.speaker} size="chip" />
            )}
            {renderedText(line)}
          </p>
        ))}
      </div>

      {seen && !held && (
        <div className="scene-beat-replay" role="group" aria-label="Seen beat controls">
          <button type="button" onClick={() => setShown(total)} disabled={complete}>
            Fast transcript
          </button>
          <button type="button" onClick={completeNow}>
            Skip seen beat
          </button>
          <label>
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(event) => setAutoAdvance(event.currentTarget.checked)}
            />
            Auto-advance this beat
          </label>
        </div>
      )}

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

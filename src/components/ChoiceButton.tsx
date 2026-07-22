import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

interface ChoiceButtonProps {
  title: string
  label: string
  description: string
  consequence: string
  onClick: () => void
  tone?: 'default' | 'risk'
  aside?: ReactNode
  tension?: ReactNode
  requiresConfirmation?: boolean
  onAttentionChange?: (active: boolean) => void
  // Suppress this button's own sr-only arm-announcement live region. Used inside
  // the classification room, which owns a single persistent live region of its
  // own; the two-step arm state stays conveyed by aria-pressed on the button.
  suppressLiveRegion?: boolean
}

export function ChoiceButton({
  title,
  label,
  description,
  consequence,
  onClick,
  tone = 'default',
  aside,
  tension,
  requiresConfirmation = false,
  onAttentionChange,
  suppressLiveRegion = false,
}: ChoiceButtonProps) {
  const [armed, setArmed] = useState(false)
  const rootRef = useRef<HTMLButtonElement>(null)

  // While armed, the three "step back" gestures disarm, silently: pointer down
  // anywhere outside this button, Escape, or focus leaving the button (onBlur
  // below). Switching location unmounts the whole list (the investigation keys
  // it by site), which resets this state with it — also silently.
  useEffect(() => {
    if (!armed) return
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return
      setArmed(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setArmed(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [armed])

  function handleClick() {
    if (requiresConfirmation && !armed) {
      setArmed(true)
      return
    }
    onClick()
  }

  return (
    <>
      {/* View-layer arm announcement (the engine channel is untouched). One
          live region per choice, empty at rest: arming is always a '' → line
          change because every disarm path clears it, so a re-arm of the same
          choice still announces. Disarming never writes to it — silent.
          Suppressed inside the classification room, which owns the single live
          region; the arm state stays on the button's aria-pressed. */}
      {suppressLiveRegion ? null : (
        <span className="sr-only" role="status" aria-live="polite">
          {armed ? `${title} — select again to file.` : ''}
        </span>
      )}
      <button
        ref={rootRef}
        className={`choice-row choice-row-${tone} ${aside ? 'choice-row-has-aside' : ''} ${armed ? 'choice-row-armed' : ''}`}
        type="button"
        aria-pressed={requiresConfirmation ? armed : undefined}
        onClick={handleClick}
        onPointerEnter={() => onAttentionChange?.(true)}
        onPointerLeave={() => {
          if (document.activeElement !== rootRef.current) onAttentionChange?.(false)
        }}
        onFocus={() => onAttentionChange?.(true)}
        onBlur={() => {
          setArmed(false)
          onAttentionChange?.(false)
        }}
      >
        <span className="choice-method">{label}</span>
        <span className="choice-body">
          <strong>
            {title}
            {armed ? ' — select again to file' : ''}
          </strong>
          <span>{description}</span>
          {/* The pre-commit cost stays on the button while armed — emphasized,
              not replaced by instructions — so it is read at the decision. */}
          <small>
            {consequence}
            {armed ? ' — final for this run' : ''}
          </small>
          {tension ? <span className="choice-tension">{tension}</span> : null}
        </span>
        <span
          className={`choice-aside ${aside ? 'choice-aside-label' : ''}`}
          aria-hidden={aside ? undefined : true}
        >
          {armed ? 'Confirm' : (aside ?? '→')}
        </span>
      </button>
    </>
  )
}

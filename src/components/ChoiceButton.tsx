import { useState } from 'react'
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
}: ChoiceButtonProps) {
  const [armed, setArmed] = useState(false)

  function handleClick() {
    if (requiresConfirmation && !armed) {
      setArmed(true)
      return
    }
    onClick()
  }

  return (
    <button
      className={`choice-row choice-row-${tone} ${armed ? 'choice-row-armed' : ''}`}
      type="button"
      aria-pressed={requiresConfirmation ? armed : undefined}
      onClick={handleClick}
      onBlur={() => setArmed(false)}
    >
      <span className="choice-method">{label}</span>
      <span className="choice-body">
        <strong>{title}</strong>
        <span>{description}</span>
        <small>
          {armed ? 'Press again to confirm. This choice cannot be changed in this run.' : consequence}
        </small>
        {tension ? <span className="choice-tension">{tension}</span> : null}
      </span>
      <span className="choice-aside" aria-hidden={aside ? undefined : true}>
        {armed ? 'Confirm' : (aside ?? '→')}
      </span>
    </button>
  )
}

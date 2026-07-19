import { useEffect, useRef, useState } from 'react'
import { getCaseContent } from '../game/content'
import type { DepositionChoiceId, FieldActionId, GameState } from '../game/types'
import { ChoiceButton } from './ChoiceButton'

interface DepositionProps {
  state: GameState
  entryActionId: FieldActionId
  onCommit: (actionId: FieldActionId, beats: DepositionChoiceId[], askedConsent: boolean) => void
  onAbandon: () => void
}

// The small verb tag shown on each per-beat choice. The three ids are the fixed
// deposition grammar, so this mapping is presentational, not case content.
const CHOICE_TAG: Record<DepositionChoiceId, string> = {
  'let-it-stand': 'Let it stand',
  interrupt: 'Interrupt',
  corroborate: 'Corroborate',
}

// A bounded, deterministic transcript rendered as a modal within the investigation
// phase. Nothing is committed until the final confirm; abandoning (Escape, the
// leave control, or navigating away) dispatches no action at all. The engine
// resolves everything from the case's authored `deposition` block — this
// component references no case-specific ids.
export function Deposition({ state, entryActionId, onCommit, onAbandon }: DepositionProps) {
  const { deposition, fieldActions } = getCaseContent(state.caseId)
  const entryAction = fieldActions.find((item) => item.id === entryActionId)
  const dialogRef = useRef<HTMLDivElement>(null)

  const [stepIndex, setStepIndex] = useState(0)
  const [beats, setBeats] = useState<DepositionChoiceId[]>([])
  const [askedConsent, setAskedConsent] = useState(false)
  const [consentRevealed, setConsentRevealed] = useState(false)
  const [commitArmed, setCommitArmed] = useState(false)

  const statementCount = deposition?.statementBeats.length ?? 0
  const consentStep = statementCount
  const closingStep = statementCount + 1
  const totalBeats = statementCount + 2

  // Move focus to the top of each beat as it changes, so assistive tech lands on
  // the new statement rather than staying on a control that has just vanished.
  useEffect(() => {
    dialogRef.current?.focus()
  }, [stepIndex, consentRevealed])

  if (!deposition || !entryAction || !deposition.entryActionIds.includes(entryActionId)) {
    return null
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onAbandon()
      return
    }
    if (event.key !== 'Tab') return
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    if (!focusables || focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function chooseBeat(choiceId: DepositionChoiceId) {
    const nextBeats = [...beats.slice(0, stepIndex), choiceId]
    setBeats(nextBeats)
    setStepIndex(stepIndex + 1)
  }

  function stepBack() {
    setCommitArmed(false)
    if (stepIndex === 0) {
      onAbandon()
      return
    }
    if (stepIndex === closingStep) {
      setStepIndex(consentStep)
      return
    }
    if (stepIndex === consentStep) {
      setConsentRevealed(false)
      setStepIndex(statementCount - 1)
      return
    }
    setStepIndex(stepIndex - 1)
  }

  function askConsent() {
    setAskedConsent(true)
    setConsentRevealed(true)
  }

  function declineConsent() {
    setAskedConsent(false)
    setConsentRevealed(false)
    setStepIndex(closingStep)
  }

  function commit() {
    if (!commitArmed) {
      setCommitArmed(true)
      return
    }
    onCommit(entryActionId, beats, askedConsent)
  }

  const consentAnswer = deposition.consent.answers[entryActionId]
  const beatNumber = Math.min(stepIndex + 1, totalBeats)

  const isStatementBeat = stepIndex < statementCount
  const isConsentBeat = stepIndex === consentStep
  const isClosingBeat = stepIndex === closingStep

  return (
    <div className="deposition-overlay" role="presentation">
      <div
        className="deposition-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deposition-heading"
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={handleKeyDown}
      >
        <header className="deposition-header">
          <div className="deposition-header-row">
            <p className="case-code">Deposition suite · {entryAction.title}</p>
            <span className="deposition-progress" aria-label={`Beat ${beatNumber} of ${totalBeats}`}>
              {beatNumber} / {totalBeats}
            </span>
          </div>
          <h2 id="deposition-heading">
            {isConsentBeat
              ? 'A question no one has asked'
              : isClosingBeat
                ? 'Close the transcript'
                : 'On the record'}
          </h2>
          {stepIndex === 0 && <p className="deposition-intro">{deposition.intro}</p>}
        </header>

        {isStatementBeat && (
          <div className="deposition-beat">
            <blockquote className="deposition-statement" aria-live="polite">
              {deposition.statementBeats[stepIndex]?.statements[entryActionId]}
            </blockquote>
            <div className="choice-list deposition-choices">
              {deposition.statementBeats[stepIndex]?.choices.map((choice) => (
                <ChoiceButton
                  key={choice.id}
                  title={choice.label}
                  label={CHOICE_TAG[choice.id]}
                  description={choice.detail}
                  consequence={
                    choice.id === 'interrupt'
                      ? 'Coercion-adjacent method.'
                      : choice.id === 'corroborate'
                        ? 'Procedure and care.'
                        : 'You do not intervene.'
                  }
                  tone={choice.id === 'interrupt' ? 'risk' : 'default'}
                  onClick={() => chooseBeat(choice.id)}
                />
              ))}
            </div>
          </div>
        )}

        {isConsentBeat && (
          <div className="deposition-beat">
            <p className="deposition-lead" aria-live="polite">
              {deposition.consent.lead[entryActionId]}
            </p>
            <p className="deposition-question">{deposition.consent.question}</p>
            {consentRevealed ? (
              <div className="deposition-answer">
                <p className="deposition-statement">{consentAnswer?.line}</p>
                <button className="button button-primary" type="button" onClick={() => setStepIndex(closingStep)}>
                  Continue <span aria-hidden="true">→</span>
                </button>
              </div>
            ) : (
              <div className="choice-list deposition-choices">
                <ChoiceButton
                  title={deposition.consent.askLabel}
                  label="Consent"
                  description={deposition.consent.askDetail}
                  consequence="Reads as care."
                  onClick={askConsent}
                />
                <ChoiceButton
                  title={deposition.consent.declineLabel}
                  label="Proceed"
                  description={deposition.consent.declineDetail}
                  consequence="No question is put."
                  onClick={declineConsent}
                />
              </div>
            )}
          </div>
        )}

        {isClosingBeat && (
          <div className="deposition-beat">
            <blockquote className="deposition-statement" aria-live="polite">
              {deposition.closing[entryActionId]}
            </blockquote>
            <div className="deposition-consent-summary">
              {askedConsent
                ? `You asked. Ellis answered ${consentAnswer?.consent === 'yes' ? 'yes' : 'no'}.`
                : 'You did not ask whether Ellis wanted to give this.'}
            </div>
            <button
              className={`button button-primary ${commitArmed ? 'button-armed' : ''}`}
              type="button"
              aria-pressed={commitArmed}
              onClick={commit}
              onBlur={() => setCommitArmed(false)}
            >
              {commitArmed ? 'Confirm — file this deposition' : 'Commit the transcript'}{' '}
              <span aria-hidden="true">{commitArmed ? '✓' : '→'}</span>
            </button>
          </div>
        )}

        <footer className="deposition-footer">
          <button className="back-button" type="button" onClick={stepBack}>
            <span aria-hidden="true">←</span> {stepIndex === 0 ? 'Leave deposition' : 'Back'}
          </button>
          <button className="text-button" type="button" onClick={onAbandon}>
            Leave — commit nothing
          </button>
        </footer>
      </div>
    </div>
  )
}

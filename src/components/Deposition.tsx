import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getCaseContent, resolveFieldAction } from '../game/content'
import type {
  DepositionChoiceId,
  DepositionConsent,
  FieldActionId,
  GameState,
} from '../game/types'
import { DepositionBeatStage } from '../scene/DepositionBeatStage'
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

// How long the tray takes to slide out before the close (abandon/commit) actually
// dispatches. One transform (translateY) at var(--ease-out); collapsed to instant
// under reduced motion, where the slide is skipped and the close fires at once.
const TRAY_EXIT_MS = 180

// A bounded, deterministic transcript rendered as a stage-visible tray docked to
// the bottom of the investigation content column. The room performs uncovered
// above it — there is no dim veil — while modal semantics still hold (aria-modal
// dialog, focus trapped in the tray, the shell inert behind). Nothing is committed
// until the final confirm; abandoning (Escape, the leave controls, or navigating
// away) dispatches no action at all. The engine resolves everything from the
// case's authored `deposition` block — this component references no case ids.
export function Deposition({ state, entryActionId, onCommit, onAbandon }: DepositionProps) {
  const content = getCaseContent(state.caseId)
  const { deposition } = content
  // Resolve the entry action through the precedent seam so its shown copy matches
  // what commits (identity for today's entry actions — none carry an override).
  const entryAction = resolveFieldAction(content, entryActionId, state.precedents)
  const dialogRef = useRef<HTMLDivElement>(null)

  const [stepIndex, setStepIndex] = useState(0)
  const [beats, setBeats] = useState<DepositionChoiceId[]>([])
  const [askedConsent, setAskedConsent] = useState(false)
  const [consentRevealed, setConsentRevealed] = useState(false)
  const [commitArmed, setCommitArmed] = useState(false)
  // Drives the slide-out animation. A ref guards it synchronously so a second
  // Escape / commit during the slide can't schedule a duplicate close.
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const closeTimerRef = useRef<number | null>(null)

  // Reduced motion — the app setting or the OS preference — makes the tray appear
  // and dismiss instantly (no slide, no delay before the close dispatches).
  const instant =
    state.settings.reducedMotion ||
    (typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  const statementCount = deposition?.statementBeats.length ?? 0
  const consentStep = statementCount
  const closingStep = statementCount + 1
  const totalBeats = statementCount + 2

  // Move focus to the top of each beat as it changes, so assistive tech lands on
  // the new statement rather than staying on a control that has just vanished.
  useEffect(() => {
    dialogRef.current?.focus()
  }, [stepIndex, consentRevealed])

  // Cancel a pending slide-out timer if the tray unmounts mid-close.
  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    },
    [],
  )

  if (!deposition || !entryAction || !deposition.entryActionIds.includes(entryActionId)) {
    return null
  }

  // Slide the tray out, then run the close (abandon dispatches nothing; commit
  // files the transcript). Instant under reduced motion so the room's reaction —
  // and, on a refusal, the witnessed beat — is not held behind an animation.
  function beginClose(after: () => void) {
    if (closingRef.current) return
    if (instant) {
      after()
      return
    }
    closingRef.current = true
    setClosing(true)
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      after()
    }, TRAY_EXIT_MS)
  }

  function requestAbandon() {
    beginClose(onAbandon)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      requestAbandon()
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
      requestAbandon()
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
    beginClose(() => onCommit(entryActionId, beats, askedConsent))
  }

  const consentAnswer = deposition.consent.answers[entryActionId]
  const beatNumber = Math.min(stepIndex + 1, totalBeats)

  const isStatementBeat = stepIndex < statementCount
  const isConsentBeat = stepIndex === consentStep
  const isClosingBeat = stepIndex === closingStep

  const backgroundSrc = content.scene.layers.find((layer) => layer.raster)?.raster?.src ?? ''
  const figureSrc = content.scene.figure?.src
  const visualPhase = isStatementBeat ? 'statement' : isConsentBeat ? 'consent' : 'closing'
  const visualRoute = entryAction.methodTags.includes('coercion') ? 'press' : 'sworn'
  let visualConsent: DepositionConsent | 'pending' = 'pending'
  if (isConsentBeat && consentRevealed) {
    visualConsent = consentAnswer?.consent ?? 'pending'
  } else if (isClosingBeat) {
    visualConsent = askedConsent ? (consentAnswer?.consent ?? 'unasked') : 'unasked'
  }

  const trayClass = [
    'deposition-tray',
    instant ? 'deposition-tray--instant' : '',
    closing ? 'is-closing' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // The transcript is portalled outside .annex-app. Repeat the view preference
  // classes at that boundary so high contrast and reduced motion reach both the
  // dialog and its supplemental close-read stage.
  const portalClass = [
    'deposition-portal',
    state.settings.highContrast ? 'high-contrast' : '',
    state.settings.reducedMotion ? 'reduce-motion' : '',
    state.settings.textSize === 'large' ? 'large-text' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Portalled to <body> so it sits OUTSIDE the shell App marks `inert` while a
  // transcript is open: the room, header, and rail behind go inert to pointer and
  // keyboard, the tray stays live, and the close-read stage performs above it.
  return createPortal(
    <div className={portalClass}>
      {backgroundSrc ? (
        <DepositionBeatStage
          backgroundSrc={backgroundSrc}
          figureSrc={figureSrc}
          beatNumber={beatNumber}
          totalBeats={totalBeats}
          phase={visualPhase}
          route={visualRoute}
          lastChoice={beats.at(-1) ?? null}
          consent={visualConsent}
        />
      ) : null}
      <div
        className={trayClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deposition-heading"
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={handleKeyDown}
      >
        <div className="deposition-tray-inner">
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
            {stepIndex > 0 ? (
              <button className="text-button" type="button" onClick={requestAbandon}>
                Leave — commit nothing
              </button>
            ) : null}
          </footer>
        </div>
      </div>
    </div>,
    document.body,
  )
}

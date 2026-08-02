import { useEffect } from 'react'
import type { PersonaId } from '../game/types'
import { PersonaPortrait } from './PersonaPortrait'

export interface CinematicHudDialogue {
  kicker: string
  speaker: string
  line: string
  personaId?: PersonaId
  variant?: 'secret'
  // A second, self-retiring sentence under the authored line. Reserved for a
  // rule the player cannot yet have met — currently the first-run filing budget,
  // whose only other statement lives in the legacy `!scene.world` command bar and
  // is therefore unreachable in the flow players actually play (audit F3).
  note?: string
  // The short-screen rule may hide only the duplicated mandate beside the
  // recommended-entry action. Other authored dialogue remains visible.
  kind?: 'civic-mandate'
}

export interface CinematicHudAction {
  id:
    | 'progress'
    | 'detail'
    | 'return'
    | 'recommended-site'
    | 'scene-file'
    | 'scene-cancel'
    | `reader:${string}:${string}`
  label: string
  tone?: 'primary' | 'quiet'
}

interface CinematicHudProps {
  caseCode: string
  caseTitle: string
  objective: string
  sitesFiled: number
  sitesTotal: number
  evidenceFiled: number
  evidenceTotal: number
  alarm: number
  locationLabel: string
  interactionHint: string
  dialogue?: CinematicHudDialogue
  progressLabel: string
  actions: readonly CinematicHudAction[]
  consoleActive?: boolean
  lowerHudHidden?: boolean
  // The HUD remains presentation-only, but an armed scene method gives it one
  // explicit review scope so its File/Cancel actions can mirror that method's
  // existing commit callback.
  confirmationActive?: boolean
  recordActionsDisabled?: boolean
  shortcutsEnabled: boolean
  // Digit 1–9 fire the action list. Separate from `shortcutsEnabled` on purpose:
  // the record chords stand down during a filing review, but the File/Cancel
  // pair the review puts on screen is exactly the list a keyboard player is
  // looking at, so the ordinals must stay live there.
  actionShortcutsEnabled?: boolean
  onAction: (actionId: CinematicHudAction['id']) => void
  onOpenCaseFile: () => void
  onOpenEvidence: () => void
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]'))
  )
}

function keepScrollKeyLocal(event: React.KeyboardEvent<HTMLElement>) {
  if (
    event.key === 'ArrowDown' ||
    event.key === 'ArrowUp' ||
    event.key === 'PageDown' ||
    event.key === 'PageUp' ||
    event.key === 'Home' ||
    event.key === 'End' ||
    event.key === ' '
  ) {
    // BeatStage listens on document and advances a line for general keyboard
    // input. Let the browser keep its normal scroll behavior for a focused HUD
    // reading surface instead of allowing that listener to cancel the key.
    event.stopPropagation()
  }
}

/**
 * Presentation-only gameplay chrome for a spatial investigation.
 *
 * Every value and action is supplied by Investigation. This component owns no
 * case progress and cannot mutate the record without calling the same explicit
 * callbacks as the existing controls.
 */
export function CinematicHud({
  caseCode,
  caseTitle,
  objective,
  sitesFiled,
  sitesTotal,
  evidenceFiled,
  evidenceTotal,
  alarm,
  locationLabel,
  interactionHint,
  dialogue,
  progressLabel,
  actions,
  consoleActive = false,
  lowerHudHidden = false,
  confirmationActive = false,
  recordActionsDisabled = false,
  shortcutsEnabled,
  actionShortcutsEnabled = false,
  onAction,
  onOpenCaseFile,
  onOpenEvidence,
}: CinematicHudProps) {
  const recommendedEntry = actions.some((action) => action.id === 'recommended-site')
  // ONE condition drives both the key cap and the handler. The audit's F1 was an
  // ordinal that LOOKED like a hotkey in every state and worked in none; tying
  // the cap to the live listener makes the reverse impossible — a rendered cap
  // is a working key, and a state where the key is stood down shows the plain
  // decorative ordinal instead.
  const digitShortcutsEnabled =
    actionShortcutsEnabled && !lowerHudHidden && actions.length > 0

  useEffect(() => {
    if (!shortcutsEnabled || recordActionsDisabled) return

    function handleShortcut(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        !event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        isTypingTarget(event.target)
      ) {
        return
      }

      const key = event.key.toLowerCase()
      if (key !== 'c' && key !== 'e') return
      event.preventDefault()
      event.stopPropagation()
      if (key === 'c') onOpenCaseFile()
      else onOpenEvidence()
    }

    // Capture keeps the reserved chord ahead of BeatStage's document listener.
    // BeatStage already ignores modifier chords, so no dialogue line advances.
    window.addEventListener('keydown', handleShortcut, true)
    return () => window.removeEventListener('keydown', handleShortcut, true)
  }, [
    onOpenCaseFile,
    onOpenEvidence,
    recordActionsDisabled,
    shortcutsEnabled,
  ])

  useEffect(() => {
    if (!digitShortcutsEnabled) return

    function handleDigit(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        // No chord reaches this list. Alt+C / Alt+E are the reserved record
        // chords, and a bare digit is the only form the caps advertise.
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        // The case file's Search tab is a text input; a typed "1" is a query,
        // never a filing. Same guard the record chords use, dialogs included.
        isTypingTarget(event.target)
      ) {
        return
      }

      if (event.key.length !== 1 || event.key < '1' || event.key > '9') return
      const action = actions[Number(event.key) - 1]
      if (!action) return
      event.preventDefault()
      event.stopPropagation()
      // Identical to the button's own onClick, so every downstream two-step —
      // a scene method's arm-then-confirm, the File/Cancel review — is preserved
      // rather than bypassed. This callback commits nothing on its own.
      onAction(action.id)
    }

    // Capture, for the same reason the record chords use it. Precedence against
    // BeatStage's document listener is settled by registration, not by racing:
    // while a beat plays the action list is hidden and `digitShortcutsEnabled`
    // is false, so a digit belongs to the beat alone and advances one line;
    // outside a beat BeatStage is unmounted. Neither ever sees the other's press.
    window.addEventListener('keydown', handleDigit, true)
    return () => window.removeEventListener('keydown', handleDigit, true)
  }, [actions, digitShortcutsEnabled, onAction])

  return (
    <aside
      className="game-hud"
      data-hud="cinematic"
      data-console-active={consoleActive ? 'true' : undefined}
      data-confirmation-scope={confirmationActive ? 'scene-first' : undefined}
      data-recommended-entry={recommendedEntry ? 'true' : undefined}
      aria-label="Investigation heads-up display"
    >
      <div className="hud-vignette" aria-hidden="true" />

      <section className="hud-case" data-hud-objective>
        <p className="hud-kicker">
          Active case <span aria-hidden="true">/</span> {caseCode}
        </p>
        <h1 id="field-heading">{caseTitle}</h1>
        <div className="hud-objective">
          <span>Current objective</span>
          <p
            className="hud-objective-copy"
            tabIndex={0}
            aria-label={`Current objective: ${objective}`}
            onKeyDown={keepScrollKeyLocal}
          >
            {objective}
          </p>
        </div>
      </section>

      <section className="hud-status" aria-label="Case progress">
        <dl>
          <div>
            <dt>Sites</dt>
            <dd>
              {sitesFiled}/{sitesTotal}
            </dd>
          </div>
          <div>
            <dt>Evidence</dt>
            <dd>
              {evidenceFiled}/{evidenceTotal}
            </dd>
          </div>
          {alarm > 0 && (
            <div className="hud-status-risk">
              <dt>Trace</dt>
              <dd>{alarm}</dd>
            </div>
          )}
        </dl>
        <div className="hud-record-actions">
          <button
            type="button"
            data-hud-case-file
            aria-keyshortcuts="Alt+C"
            disabled={recordActionsDisabled}
            onClick={onOpenCaseFile}
          >
            <span>Case file</span>
            <kbd aria-hidden="true">Alt C</kbd>
          </button>
          <button
            type="button"
            data-hud-evidence
            aria-keyshortcuts="Alt+E"
            disabled={recordActionsDisabled}
            onClick={onOpenEvidence}
          >
            <span>Evidence</span>
            <kbd aria-hidden="true">Alt E</kbd>
          </button>
        </div>
      </section>

      {!lowerHudHidden && dialogue && (
        <section
          className={[
            'hud-dialogue',
            dialogue.personaId ? null : 'hud-dialogue-no-portrait',
            dialogue.variant === 'secret' ? 'hud-dialogue-secret' : null,
          ]
            .filter(Boolean)
            .join(' ')}
          data-hud-dialogue
          data-variant={dialogue.variant}
          data-dialogue-kind={dialogue.kind}
          data-dialogue-note={dialogue.note ? 'true' : undefined}
          tabIndex={0}
          aria-label={
            dialogue.note
              ? `${dialogue.speaker}: ${dialogue.line} ${dialogue.note}`
              : `${dialogue.speaker}: ${dialogue.line}`
          }
          onKeyDown={keepScrollKeyLocal}
        >
          {dialogue.personaId && (
            <PersonaPortrait personaId={dialogue.personaId} size="card" />
          )}
          <div>
            <p className="hud-dialogue-kicker">{dialogue.kicker}</p>
            <h2>{dialogue.speaker}</h2>
            <p className="hud-dialogue-line">{dialogue.line}</p>
            {/* Its own class, never `.hud-dialogue-line` or `.field-threshold`:
                existing assertions require exactly one node of each of those
                names on a surface. */}
            {dialogue.note && <p className="hud-dialogue-note">{dialogue.note}</p>}
            <div className="hud-dialogue-progress" aria-hidden="true">
              <span />
              <small>{progressLabel}</small>
            </div>
          </div>
        </section>
      )}

      {!lowerHudHidden && (
        <section className="hud-prompts" data-hud-prompts aria-label="Available actions">
          <p className="hud-location">{locationLabel}</p>
          <p className="hud-interaction-hint">
            <span aria-hidden="true">◇</span> {interactionHint}
          </p>
          {actions.length > 0 && (
            <div className="hud-prompt-actions">
              {actions.map((action, index) => {
                // Only the first nine positions can carry a key. The list never
                // reaches four in practice; the bound is stated so a tenth
                // action would degrade to the decorative ordinal rather than
                // print a cap for a key nothing listens to.
                const digit = digitShortcutsEnabled && index < 9 ? String(index + 1) : null
                return (
                  <button
                    className={action.tone === 'primary' ? 'hud-action-primary' : undefined}
                    type="button"
                    data-hud-primary={action.tone === 'primary' ? 'true' : undefined}
                    data-hud-action={action.id}
                    aria-keyshortcuts={digit ?? undefined}
                    key={action.id}
                    onClick={() => onAction(action.id)}
                  >
                    <span className="hud-action-index" aria-hidden="true">
                      {digit ? <kbd>{digit}</kbd> : String(index + 1).padStart(2, '0')}
                    </span>
                    <span>{action.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}
    </aside>
  )
}

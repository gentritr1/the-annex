import type { FieldActionDefinition, PersonaId } from './types'

// ── Staged beat assembly ─────────────────────────────────────────────────────
// Pure, view-facing derivation of the line sequence a committed field action
// performs over the scene. It reads authored content only: the optional
// hand-authored `action.beat[]`, else the existing `eventDetail` + `reactions`.
// It never touches GameState, never persists, and never decides what commits —
// the reducer has already written the record by the time these lines play.

export type BeatLine =
  // The moment's own voice: the subject, the room, what the record will hold.
  | { kind: 'subject'; text: string }
  // A persona attribution header. The view resolves the display name so this
  // module stays free of the content registry.
  | { kind: 'speaker'; speaker: PersonaId }
  // One line spoken by the named persona.
  | { kind: 'persona'; speaker: PersonaId; text: string }

// Per-line hold scaled to reading length (~subtitle pacing): a short clause
// holds at least 1.7s, a long sentence up to 4.5s. Absolute values, ported from
// the approved prototype's `lineHold()` — not multipliers on a base constant.
export const BEAT_HOLD_MIN_MS = 1700
export const BEAT_HOLD_MAX_MS = 4500
export const BEAT_HOLD_BASE_MS = 900
export const BEAT_HOLD_PER_CHAR_MS = 45

export function beatHoldMs(text: string): number {
  return Math.min(
    BEAT_HOLD_MAX_MS,
    Math.max(BEAT_HOLD_MIN_MS, BEAT_HOLD_BASE_MS + text.length * BEAT_HOLD_PER_CHAR_MS),
  )
}

// Split authored prose into sentence clauses, keeping the closing quote or
// bracket attached to the sentence it closes. Used only for actions that do not
// author a hand-tuned `beat[]`; the split is presentational, never semantic.
export function splitClauses(text: string): readonly string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  const parts = trimmed.match(/[^.!?]+(?:[.!?]+["'”’)\]]*|$)/gu)
  return (parts ?? [trimmed]).map((part) => part.trim()).filter((part) => part.length > 0)
}

// The authored beat wins; otherwise the eventDetail clauses lead and each
// authored reaction follows under its own attribution header. A persona header
// is emitted whenever the speaker changes, so a two-voice reaction set reads as
// two voices rather than one run-on stanza.
export function assembleBeats(action: FieldActionDefinition): readonly BeatLine[] {
  const lines: BeatLine[] = []

  if (action.beat && action.beat.length > 0) {
    let currentSpeaker: PersonaId | undefined
    for (const entry of action.beat) {
      if (!entry.speaker) {
        lines.push({ kind: 'subject', text: entry.text })
        currentSpeaker = undefined
        continue
      }
      if (entry.speaker !== currentSpeaker) {
        lines.push({ kind: 'speaker', speaker: entry.speaker })
        currentSpeaker = entry.speaker
      }
      lines.push({ kind: 'persona', speaker: entry.speaker, text: entry.text })
    }
    return lines
  }

  for (const clause of splitClauses(action.eventDetail)) {
    lines.push({ kind: 'subject', text: clause })
  }
  for (const reaction of action.reactions ?? []) {
    lines.push({ kind: 'speaker', speaker: reaction.persona })
    lines.push({ kind: 'persona', speaker: reaction.persona, text: reaction.line })
  }
  return lines
}

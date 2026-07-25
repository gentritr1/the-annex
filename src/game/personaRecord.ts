import { getReactionsForSource } from './content'
import type { GameState, PersonaId } from './types'

// ── The persona-major transpose of the event log ─────────────────────────────
// The event log is event-major: for each logged moment, everything the four
// presences said about it (CaseRail's log panel). The roster dossier needs the
// same record read the other way round — for ONE presence, everything they have
// said this run, in the order they said it, each line still citing the moment it
// belongs to.
//
// Pure derivation over existing state and existing content lookups. It reads
// `state.events` (which already carries {order, sourceType, sourceId, title})
// and resolves each moment's authored reactions through the same
// `getReactionsForSource` the log uses — so a precedent-varied reaction surfaces
// here exactly as it does there. No reducer change, no new persisted field, no
// content change: nothing in this module writes anything.

export interface PersonaRunLine {
  // The logged event's order — the run's own numbering, so a citation can be
  // matched back to the log without re-deriving it.
  order: number
  // The event title, printed as the citation ("On the record this run" reads as
  // a record, not a quote wall).
  cite: string
  // The authored line itself, verbatim (curly punctuation included).
  line: string
}

export function personaRunLines(
  state: GameState,
  personaId: PersonaId,
): readonly PersonaRunLine[] {
  const lines: PersonaRunLine[] = []
  // Ascending order, taken from the event's own `order` rather than array
  // position, so the list reads chronologically whatever order the events were
  // appended or restored in.
  const ordered = [...state.events].sort((a, b) => a.order - b.order)
  for (const event of ordered) {
    const reactions = getReactionsForSource(
      state.caseId,
      event.sourceType,
      event.sourceId,
      state.precedents,
    )
    for (const reaction of reactions) {
      if (reaction.persona !== personaId) continue
      lines.push({ order: event.order, cite: event.title, line: reaction.line })
    }
  }
  return lines
}

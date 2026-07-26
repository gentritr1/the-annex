import { getCaseContent, getPrecedentLine, getReactionsForSource, personaName } from './content'
import type { GameEvent, GameState } from './types'

// ══ THE RECORD INDEX — one flat, searchable reading of the run ═══════════════
//
// `personaRecord.ts` transposed the event log persona-major. This does the same
// trick one level up: it flattens EVERYTHING the run has put on the record into
// one list of uniform entries, so a single substring pass can answer "where does
// the word *checksum* appear in this file?" without any surface having to know
// about any other surface.
//
// Pure derivation over existing state and existing content lookups. It reads
// `state.events`, `state.evidence`, `state.completedSites`, `state.reconstruction`,
// `state.selectedFragments` and `state.precedents`, and resolves authored copy
// through the same helpers the rendering surfaces already use. No reducer change,
// no new persisted field, no content change: nothing in this module writes
// anything, and nothing here is stored anywhere.
//
// ── THE ENTRY SHAPE (E3's ledger consumes this next round) ───────────────────
//
//   id     Stable, unique within one index, and reproducible across rebuilds of
//          the same state: `${kind}:${…content ids…}`. Safe as a React key and
//          safe to compare between two indexes of the same run. NOT persisted and
//          NOT a save-schema value — an id here may change shape freely.
//   kind   One of RECORD_KINDS. The closed vocabulary; a consumer that switches
//          on it is exhaustive by construction.
//   title  The entry's own heading — the evidence's title, the persona's NAME for
//          a spoken line, the site's name, the log entry's title.
//   body   The entry's prose. Everything a reader would read; also everything a
//          query is matched against beyond the title (see `recordHaystack`).
//   cite   The citation each surface ALREADY prints for this thing, verbatim: the
//          evidence panel's `.evidence-source`, the log's own entry number, the
//          persona dossier's event title, the lattice's timecode. A citation is
//          never invented here — it is quoted from the surface that owns it, so a
//          result can be matched back to where it lives by eye.
//   order  The run's own numbering, taken from the logged event this entry
//          belongs to, so a chronological view (E3's ledger) needs no second
//          derivation. Entries that predate the run's own log — a cited
//          precedent — carry 0.
//
// ── THE COMPREHENSION CONTRACT ───────────────────────────────────────────────
//
// The index contains ONLY what this run has already put on the record:
//   · evidence the player has admitted (`state.evidence`), never the case's
//     unfiled `evidenceDefinitions`;
//   · locations the player has closed (`state.completedSites`), never a site the
//     player has not filed;
//   · lines personas have actually said, resolved from logged events;
//   · the filed model and its anchors, only once `state.reconstruction` is set;
//   · a precedent line, only when this case cites one AND that case has a
//     recorded verdict.
// Everything is resolved through `getCaseContent(state.caseId)`, so no other
// case's content can appear in an index built from this state. Both halves are
// held by tests in `recordIndex.test.ts`.

export const RECORD_KINDS = [
  'event',
  'evidence',
  'reaction',
  'model',
  'anchor',
  'site',
  'precedent',
] as const

export type RecordEntryKind = (typeof RECORD_KINDS)[number]

export interface RecordEntry {
  id: string
  kind: RecordEntryKind
  title: string
  body: string
  cite: string
  order: number
}

// The group headings the search surface prints. In-voice, and plural-safe
// without a count in them (the count is printed separately).
export const recordKindLabels: Readonly<Record<RecordEntryKind, string>> = {
  event: 'On the log',
  evidence: 'Admitted evidence',
  reaction: 'Said on the record',
  model: 'Filed model',
  anchor: 'Anchors of the filed model',
  site: 'Locations closed',
  precedent: 'Precedent carried in',
}

// The log's own citation style — the two-digit entry number the event list
// prints in `.event-order`, quoted rather than re-invented.
function entryNumber(order: number): string {
  return String(order).padStart(2, '0')
}

// ── The index ────────────────────────────────────────────────────────────────

export function buildRecordIndex(state: GameState): readonly RecordEntry[] {
  const content = getCaseContent(state.caseId)
  const entries: RecordEntry[] = []

  // Ascending by the event's own `order`, never by array position — the same
  // rule personaRecord.ts follows, so a restored save reads chronologically
  // whatever order its events were appended in.
  const ordered = [...state.events].sort((a, b) => a.order - b.order)

  // Which logged moment admitted a given piece of evidence / closed a given
  // location. Built once from the events themselves so an entry can cite the
  // run's own numbering instead of a content-authored guess. A field action's
  // `evidenceId` and `siteId` are immutable across precedents (FieldActionOverride
  // covers only alarm/consequence/eventDetail/reactions), so the base lookup is
  // the resolved one.
  const orderByEvidence = new Map<string, number>()
  const orderBySite = new Map<string, number>()
  let modelOrder = 0
  for (const event of ordered) {
    if (event.sourceType === 'field-action') {
      const action = content.fieldActions.find((item) => item.id === event.sourceId)
      if (!action) continue
      if (!orderByEvidence.has(action.evidenceId)) orderByEvidence.set(action.evidenceId, event.order)
      if (!orderBySite.has(action.siteId)) orderBySite.set(action.siteId, event.order)
      continue
    }
    if (event.sourceType === 'reconstruction') {
      const model = content.reconstructionDefinitions.find((item) => item.id === event.sourceId)
      modelOrder = event.order
      if (model && !orderByEvidence.has(model.evidenceId)) {
        orderByEvidence.set(model.evidenceId, event.order)
      }
    }
  }

  // 1 · The log. Every consequential moment, in the words the log already uses.
  for (const event of ordered) {
    entries.push({
      id: `event:${event.id}`,
      kind: 'event',
      title: event.title,
      body: event.detail,
      cite: `Entry ${entryNumber(event.order)}`,
      order: event.order,
    })
  }

  // 2 · Admitted evidence. `state.evidence` only — the case's other authored
  //     exhibits are not on the record until a method admits them.
  for (const item of content.evidenceDefinitions) {
    if (!state.evidence.includes(item.id)) continue
    entries.push({
      id: `evidence:${item.id}`,
      kind: 'evidence',
      title: item.title,
      body: `${item.claim} ${item.contradiction}`,
      cite: item.source,
      order: orderByEvidence.get(item.id) ?? 0,
    })
  }

  // 3 · What the four presences have said, each line still citing its moment —
  //     the same resolution the log panel and the roster dossier both use, so a
  //     precedent-varied reaction surfaces here exactly as it does there. The
  //     TITLE is the persona's name: the search surface groups reaction results
  //     by title, which is what keeps a name from being printed twice.
  for (const event of ordered) {
    const reactions = getReactionsForSource(
      state.caseId,
      event.sourceType,
      event.sourceId,
      state.precedents,
    )
    reactions.forEach((reaction, index) => {
      entries.push({
        id: `reaction:${event.id}:${reaction.persona}:${index}`,
        kind: 'reaction',
        title: personaName(reaction.persona),
        body: reaction.line,
        cite: event.title,
        order: event.order,
      })
    })
  }

  // 4 · The filed model, and the two anchors that produced it. Both are on the
  //     record only once the model is FILED: an in-progress lattice selection is
  //     a thought, not a filing.
  const model = state.reconstruction
    ? content.reconstructionDefinitions.find((item) => item.id === state.reconstruction)
    : undefined
  if (model) {
    entries.push({
      id: `model:${model.id}`,
      kind: 'model',
      title: model.title,
      body: model.thesis,
      cite: 'Memory model · filed',
      order: modelOrder,
    })
    for (const fragmentId of state.selectedFragments) {
      const fragment = content.fragments.find((item) => item.id === fragmentId)
      if (!fragment) continue
      entries.push({
        id: `anchor:${fragment.id}`,
        kind: 'anchor',
        title: fragment.title,
        body: fragment.content,
        cite: `${fragment.timecode} · ${fragment.source}`,
        order: modelOrder,
      })
    }
  }

  // 5 · The locations whose record is closed. Never an unvisited site: a place
  //     the auditor has not filed has said nothing that could be searched.
  for (const site of content.sites) {
    if (!state.completedSites.includes(site.id)) continue
    entries.push({
      id: `site:${site.id}`,
      kind: 'site',
      title: site.name,
      body: site.description,
      cite: `Location ${site.index} · closed`,
      order: orderBySite.get(site.id) ?? 0,
    })
  }

  // 6 · The precedent this case carries in, if it cites one and the cited case
  //     has a recorded verdict. The line is authored in THIS case's bundle, so
  //     nothing of the other case's content crosses over.
  const precedentLine = getPrecedentLine(state.caseId, state.precedents)
  if (precedentLine) {
    entries.push({
      id: `precedent:${content.precedentSource?.caseId ?? 'prior'}`,
      kind: 'precedent',
      title: 'Prior ruling on the record',
      body: precedentLine,
      cite: `${content.label} · precedent cited`,
      order: 0,
    })
  }

  return entries
}

// ── Matching ─────────────────────────────────────────────────────────────────
//
// Case-insensitive substring over title + body + CITE. The brief's floor is
// title + body; the citation is folded in deliberately, because for admitted
// evidence the citation IS the authored source ("Civic restoration ledger",
// "77-A testimony") and "which of these came from the care ward" is one of the
// two or three questions a player actually asks the file. Broadening the
// haystack can only add results a reader can see the reason for — every match
// is visible on the rendered card.
//
// No fuzzy matching, no ranking, no tokenizer, no dependency: Her Story's whole
// point is that the player's own phrasing is the interface.
export function recordHaystack(entry: RecordEntry): string {
  return `${entry.title}\n${entry.body}\n${entry.cite}`.toLowerCase()
}

export function searchRecord(
  entries: readonly RecordEntry[],
  query: string,
): readonly RecordEntry[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  return entries.filter((entry) => recordHaystack(entry).includes(needle))
}

export interface RecordGroup {
  kind: RecordEntryKind
  label: string
  entries: readonly RecordEntry[]
}

// Results grouped by kind, in RECORD_KINDS order, empty groups dropped. Within a
// group the run's own chronology leads: ascending `order`, ties broken by the
// order the index built them in (Array.prototype.sort is stable) — the file
// reads forwards, like a file.
export function groupRecordEntries(entries: readonly RecordEntry[]): readonly RecordGroup[] {
  const groups: RecordGroup[] = []
  for (const kind of RECORD_KINDS) {
    const matched = entries
      .filter((entry) => entry.kind === kind)
      .sort((a, b) => a.order - b.order)
    if (matched.length === 0) continue
    groups.push({ kind, label: recordKindLabels[kind], entries: matched })
  }
  return groups
}

// Reaction results only: one bucket per persona, keyed by the entry TITLE (which
// is the persona's name). This is what holds the name-count rule — four presences
// can produce a dozen matching lines, and each name is still printed once.
export interface RecordVoiceGroup {
  voice: string
  entries: readonly RecordEntry[]
}

export function groupByVoice(entries: readonly RecordEntry[]): readonly RecordVoiceGroup[] {
  const order: string[] = []
  const buckets = new Map<string, RecordEntry[]>()
  for (const entry of entries) {
    const bucket = buckets.get(entry.title)
    if (bucket) {
      bucket.push(entry)
      continue
    }
    order.push(entry.title)
    buckets.set(entry.title, [entry])
  }
  return order.map((voice) => ({ voice, entries: buckets.get(voice)! }))
}

// Exported for the ledger (E3) and for tests: the event an index entry belongs
// to, matched by the run's own numbering rather than by re-deriving anything.
export function entriesForEvent(
  entries: readonly RecordEntry[],
  event: GameEvent,
): readonly RecordEntry[] {
  return entries.filter((entry) => entry.order === event.order)
}

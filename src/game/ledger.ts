import { getCaseContent, getPrecedentLine, resolveFieldAction } from './content'
import { canEnterTribunal } from './engine'
import {
  buildRecordIndex,
  entriesForEvent,
  groupByVoice,
  type RecordEntry,
  type RecordVoiceGroup,
} from './recordIndex'
import type { GameEvent, GameState, SiteId } from './types'

// ══ THE LEDGER — the record read forwards, with the clerk's summary at its front
//
// `recordIndex.ts` flattened the run into one searchable list. This binds that
// same list back into a BOOK: the moments of the run in the order they happened,
// each showing what it was, where it came from, what it put on the record, and
// what it cost. Obra Dinn's move — the organizing metaphor is the case's own
// paper trail, not a wiki.
//
// The named failure mode this module exists to avoid is CODEX DUMPING
// (research :57): a ledger that re-prints everything is a second log with worse
// manners. So the scoping is deliberate and stated here:
//
//   · The log panel reads BACKWARDS (newest first) and carries method tags. The
//     ledger reads FORWARDS and carries filings and costs. They are two readings
//     of one record, not two copies of one panel.
//   · The ledger never invents prose. Every sentence it prints is either an
//     authored string quoted verbatim (an event's own title and detail, an
//     exhibit's claim and contradiction, a persona's line, a precedent line) or
//     an assembled sentence over derived facts (§ FINDINGS below).
//   · Nothing here is persisted, nothing here is written, and nothing here needs
//     a content change. Pure derivation over GameState + content + the index.
//
// ── FINDINGS: the Golden-Idol half, scoped tight ─────────────────────────────
//
// `buildFindings` assembles one sentence per FACT the record currently supports:
// the precedent carried in, each closed location and what it put on the record,
// how many admitted exhibits carry a contradiction, the filed model (or that
// none is), and the tribunal threshold. Every one is derived — no speculation,
// no advice, no line that could be wrong while the state is right. Sentences use
// the shipped punctuation convention (curly quotes; the closing stop sits
// OUTSIDE the quotation mark, matching the search surface's count line).
//
// ── ALARM: replayed, not guessed ─────────────────────────────────────────────
//
// A moment's civic-alarm cost is not in `GameState`; only the current total is.
// It is recovered exactly by replaying the reducer's own arithmetic: alarm
// begins a run at 0 (`createRunState`), and the only two branches that move it
// (COMMIT_FIELD_ACTION, COMMIT_DEPOSITION) both apply
// `clamp(alarm + resolveFieldAction(...).alarmDelta, 0, 3)`. `replayAlarm`
// mirrors that, resolving through the same precedent seam, so a precedent that
// overrode an action's alarm is reflected here too. `ledger.test.ts` asserts the
// replay's final value equals `state.alarm` on every run it builds — if the
// reducer ever grows a third alarm source, that assertion fails rather than this
// module quietly lying about a cost.
//
// ── TRUST: quoted, never re-derived ──────────────────────────────────────────
//
// The trust a moment cost or gained is ALREADY in that event's own detail: the
// reducer appends `describeTrustDeltas(...)` to it at commit
// (`engine.ts`, both commit branches). This module therefore quotes the detail
// and derives nothing about trust — and that is a correctness decision, not a
// stylistic one. A deposition's deltas are the base action's deltas merged with
// the per-beat choices and the consent ask; the chosen beats are not recoverable
// from persisted state, so a ledger that re-derived trust from
// `FieldActionDefinition.trust` would print a cost the run did not pay on
// exactly the surface whose whole job is to be trustworthy.

const ALARM_FLOOR = 0
const ALARM_CEILING = 3

// ── Shapes ───────────────────────────────────────────────────────────────────

/** One assembled sentence of the clerk's summary. `id` is stable for React keys. */
export interface LedgerFinding {
  id: string
  text: string
}

/**
 * An admitted exhibit shown as the PAIR that is the game's central fiction: a
 * chain that proves provenance and fails continuity. Both halves are the
 * authored strings, verbatim; nothing here is composed.
 */
export interface LedgerContradiction {
  id: string
  title: string
  claim: string
  contradiction: string
  cite: string
}

/** What a moment cost the run in civic alarm, replayed from the reducer's rule. */
export interface LedgerCost {
  alarmBefore: number
  alarmAfter: number
  /** The authored (precedent-resolved) delta, which the clamp may have absorbed. */
  alarmDelta: number
}

/** One moment of the run: a logged event and everything filed under it. */
export interface LedgerMoment {
  id: string
  order: number
  /** The log's own two-digit citation for this moment, quoted not re-invented. */
  cite: string
  title: string
  detail: string
  tone: GameEvent['tone']
  /** Evidence / site / model / anchor entries filed at this moment, in index order. */
  filings: readonly RecordEntry[]
  /** Reactions at this moment, one bucket per presence — the name-count rule. */
  voices: readonly RecordVoiceGroup[]
  /** Contradiction pairs for the exhibits this moment admitted. */
  contradictions: readonly LedgerContradiction[]
  cost: LedgerCost | null
}

export interface Ledger {
  findings: readonly LedgerFinding[]
  /** Entries that predate the run's own log — a cited precedent carries order 0. */
  carriedIn: readonly RecordEntry[]
  moments: readonly LedgerMoment[]
  /** Every contradiction pair on the record, across all moments. */
  contradictions: readonly LedgerContradiction[]
}

// The kind headings the ledger prints over a filing. Deliberately NOT
// `recordKindLabels`: the search surface groups a whole panel under "Admitted
// evidence", while the ledger labels one filing inside one moment, so it reads
// singular and past-tense — "Admitted", "Location closed" — the way a ledger
// margin does. `reaction` and `event` never appear here (a reaction is grouped
// by voice; the event IS the moment).
export const ledgerFilingLabels: Readonly<Record<RecordEntry['kind'], string>> = {
  event: 'Logged',
  evidence: 'Admitted',
  reaction: 'Said',
  model: 'Model filed',
  anchor: 'Anchor',
  site: 'Location closed',
  precedent: 'Carried in',
}

// ── Derivations ──────────────────────────────────────────────────────────────

function clampAlarm(value: number): number {
  return Math.max(ALARM_FLOOR, Math.min(ALARM_CEILING, value))
}

/**
 * The run's civic alarm at each logged moment, keyed by that moment's `order`.
 * Mirrors the reducer's arithmetic exactly (see the header note); a moment that
 * moved no alarm gets no entry, so a moment with no cost renders none.
 */
export function replayAlarm(state: GameState): ReadonlyMap<number, LedgerCost> {
  const content = getCaseContent(state.caseId)
  const costs = new Map<number, LedgerCost>()
  let alarm = ALARM_FLOOR
  const ordered = [...state.events].sort((a, b) => a.order - b.order)
  for (const event of ordered) {
    if (event.sourceType !== 'field-action') continue
    const action = resolveFieldAction(content, event.sourceId, state.precedents)
    if (!action) continue
    const before = alarm
    alarm = clampAlarm(before + action.alarmDelta)
    costs.set(event.order, { alarmBefore: before, alarmAfter: alarm, alarmDelta: action.alarmDelta })
  }
  return costs
}

/**
 * Which admitted exhibit each closed location put on the record. Resolved from
 * the actions the run actually committed, through the same precedent seam the
 * engine commits through, so a location is never credited with an exhibit the
 * run did not admit.
 */
function evidenceBySite(state: GameState): ReadonlyMap<string, string> {
  const content = getCaseContent(state.caseId)
  const bySite = new Map<string, string>()
  for (const actionId of state.completedActions) {
    const action = resolveFieldAction(content, actionId, state.precedents)
    if (!action) continue
    if (!state.evidence.includes(action.evidenceId)) continue
    const exhibit = content.evidenceDefinitions.find((item) => item.id === action.evidenceId)
    if (!exhibit || bySite.has(action.siteId)) continue
    bySite.set(action.siteId, exhibit.title)
  }
  return bySite
}

/**
 * Every admitted exhibit that carries a contradiction against it, in the order
 * the case authors them. Both halves are authored strings quoted verbatim.
 */
export function buildContradictions(state: GameState): readonly LedgerContradiction[] {
  const content = getCaseContent(state.caseId)
  return content.evidenceDefinitions
    .filter((item) => state.evidence.includes(item.id) && item.contradiction.trim() !== '')
    .map((item) => ({
      id: `contradiction:${item.id}`,
      title: item.title,
      claim: item.claim,
      contradiction: item.contradiction,
      cite: item.source,
    }))
}

/**
 * The clerk's summary at the front of the folio. One sentence per fact the
 * record currently supports — derived, never speculative, and never a rewrite of
 * an authored string (titles are quoted, not paraphrased).
 */
export function buildFindings(state: GameState): readonly LedgerFinding[] {
  const content = getCaseContent(state.caseId)
  const findings: LedgerFinding[] = []

  // 1 · What this case carries in from an earlier ruling. Stated only when there
  //     is one; a first case has no such fact to report.
  if (getPrecedentLine(state.caseId, state.precedents, state.caseOutcomes)) {
    findings.push({
      id: 'finding:precedent',
      text: 'A prior ruling is carried in from an earlier case and cited on this record.',
    })
  }

  // 2 · The locations closed, and what each one put on the record.
  const closed = content.sites.filter((site) => state.completedSites.includes(site.id))
  if (closed.length === 0) {
    findings.push({ id: 'finding:sites', text: 'No location is closed yet.' })
  } else {
    const yields = evidenceBySite(state)
    for (const site of closed) {
      const exhibit = yields.get(site.id)
      findings.push({
        id: `finding:site:${site.id}`,
        text: exhibit
          ? `${site.name} is closed, and it put “${exhibit}” on the record.`
          : `${site.name} is closed.`,
      })
    }
  }

  // 3 · How much of what is admitted argues with itself. The pairs are printed
  //     in full further down; this is the count, so the shape of the file is
  //     legible before the reading starts.
  const contradictions = buildContradictions(state)
  if (state.evidence.length > 0) {
    findings.push({
      id: 'finding:contradictions',
      text:
        contradictions.length === 0
          ? 'Nothing admitted so far carries a contradiction against it.'
          : contradictions.length === 1
            ? '1 admitted exhibit carries a contradiction against it.'
            : `${contradictions.length} admitted exhibits carry a contradiction against them.`,
    })
  }

  // 4 · The model on file, or that none is.
  const model = state.reconstruction
    ? content.reconstructionDefinitions.find((item) => item.id === state.reconstruction)
    : undefined
  findings.push({
    id: 'finding:model',
    text: model
      ? `The memory model on file is “${model.title}”.`
      : 'No memory model is on file.',
  })

  // 5 · Whether the tribunal will hear this record. The rule itself is read from
  //     `canEnterTribunal`, so this sentence cannot disagree with the gate.
  const requiredSites = content.fieldSiteLimit
  if (canEnterTribunal(state)) {
    findings.push({
      id: 'finding:threshold',
      text: `The tribunal will hear this record: ${requiredSites === 1 ? 'one location is' : `${requiredSites} locations are`} closed and a memory model is on file.`,
    })
  } else {
    const wanted: string[] = []
    const missingSites = Math.max(0, requiredSites - state.completedSites.length)
    if (missingSites > 0) {
      wanted.push(
        missingSites === 1
          ? 'one more location must be closed'
          : `${missingSites} more locations must be closed`,
      )
    }
    if (!state.reconstruction) wanted.push('a memory model must be filed')
    findings.push({
      id: 'finding:threshold',
      text: `The tribunal will not hear this record yet: ${wanted.join(' and ')}.`,
    })
  }

  return findings
}

// ── The book ─────────────────────────────────────────────────────────────────

export function buildLedger(state: GameState): Ledger {
  const index = buildRecordIndex(state)
  const costs = replayAlarm(state)
  const contradictions = buildContradictions(state)
  const byEvidenceId = new Map(contradictions.map((pair) => [pair.id, pair]))

  const ordered = [...state.events].sort((a, b) => a.order - b.order)
  const claimed = new Set<string>()

  const moments = ordered.map((event) => {
    const atMoment = entriesForEvent(index, event)
    const filings: RecordEntry[] = []
    const reactions: RecordEntry[] = []
    for (const entry of atMoment) {
      claimed.add(entry.id)
      if (entry.kind === 'event') continue
      if (entry.kind === 'reaction') reactions.push(entry)
      else filings.push(entry)
    }
    return {
      id: `moment:${event.id}`,
      order: event.order,
      cite: `Entry ${String(event.order).padStart(2, '0')}`,
      title: event.title,
      detail: event.detail,
      tone: event.tone,
      filings,
      voices: groupByVoice(reactions),
      // The pairs for exactly the exhibits this moment admitted, so a
      // contradiction is read where it was created rather than in an appendix.
      contradictions: filings
        .filter((entry) => entry.kind === 'evidence')
        .map((entry) => byEvidenceId.get(`contradiction:${entry.id.slice('evidence:'.length)}`))
        .filter((pair): pair is LedgerContradiction => Boolean(pair)),
      cost: costs.get(event.order) ?? null,
    } satisfies LedgerMoment
  })

  // Anything the index holds that no logged moment claims predates the run's own
  // log. Today that is the cited precedent (order 0); computed as a residue
  // rather than by kind, so a future order-0 entry cannot silently vanish.
  const carriedIn = index.filter((entry) => !claimed.has(entry.id))

  return { findings: buildFindings(state), carriedIn, moments, contradictions }
}

/**
 * The join round 2 left owed (`docs/wave2-round2-report.md` §8.3): a LOCATION to
 * the moment that closed it. Moments are keyed by event, and `entriesForEvent`
 * was the only join available — so nothing could ask "where does this site's
 * record live on the ledger?" without walking the whole book by hand.
 *
 * Resolves through the same precedent seam the engine commits through, so a
 * precedent-overridden action is still attributed to its own location. Returns
 * `undefined` for a location the run has not filed: by contract the ledger holds
 * only what the run has put on the record, and an unfiled location has put
 * nothing. Pass an already-built `ledger` to avoid rebuilding it per call.
 */
export function momentForSite(
  state: GameState,
  siteId: SiteId,
  ledger: Ledger = buildLedger(state),
): LedgerMoment | undefined {
  const content = getCaseContent(state.caseId)
  const filedHere = new Set(
    state.completedActions.filter(
      (actionId) => resolveFieldAction(content, actionId, state.precedents)?.siteId === siteId,
    ),
  )
  if (filedHere.size === 0) return undefined
  const event = [...state.events]
    .sort((a, b) => a.order - b.order)
    .find((item) => item.sourceType === 'field-action' && filedHere.has(item.sourceId))
  if (!event) return undefined
  return ledger.moments.find((moment) => moment.order === event.order)
}

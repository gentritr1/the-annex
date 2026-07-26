import { getCaseContent, personaName, resolveFieldAction } from './content'
import { momentForSite } from './ledger'
import type { GameState, PersonaId, SiteDefinition, SiteId } from './types'

// ══ THE EQUIVALENCE PROOF BEHIND THE INSPECTOR COLLAPSE (E1b / audit P1-D) ═══
//
// The recorded scar `annex-investigation-inspector-always-mounted` says canonical
// text may never be gated behind a view toggle: the inspector's prose may only be
// RETIRED where another surface provably carries the identical strings — never
// merely hidden because a plate happens to be on screen.
//
// "Provably" is the whole of this module. The collapse phase-gates the inspector
// down to a spine (index · name · status · the summon to the full text), and the
// strings it stops printing have to be shown, string-for-string, on the Location
// detail drawer. That claim is checked HERE, as a pure function over
// (GameState, siteId) rather than as a DOM diff, exactly as
// docs/wave2-round2-report.md §8 argued it should be:
//
//   `equivalenceGaps(state, siteId)` must be empty for every site of every case,
//   in every phase a run can reach. `siteRecordText.test.ts` walks real runs and
//   asserts that; `scripts/evidence-inspector-collapse.mjs` then asserts the LIVE
//   drawer's rendered text contains every string `collapseRetires` names, so the
//   pure claim and the shipped DOM cannot drift apart silently.
//
// WHAT THIS MODULE DELIBERATELY DOES NOT MODEL
//
//  · The bounded room console. The collapse MOVES it (it docks over the plate)
//    and never retires it — the DOM host is re-parented, not re-rendered — so its
//    authored prose is not part of the retirement set. `Investigation.tsx` only
//    collapses a room location while its console is docked elsewhere.
//  · The `.next-location` buttons and the site switcher. Those are controls, not
//    prose, and they are never on screen in a collapsed phase (a filed location
//    does not collapse). One-instance-per-control is asserted live, not here.
//  · UI chrome the inspector authored for itself (the purpose line, the method
//    prompt, the "the room holds it" note). None of it is case content; the
//    collapse hands the one line that survives its phase to the drawer through
//    `SceneDetailDrawer`'s `standingNote`, so exactly one instance exists.

/** A labelled canonical string, so a gap report names WHICH string went missing. */
export interface ProseLine {
  /** Stable id: `<surface-part>:<detail>` — used only for reporting, never rendered. */
  id: string
  text: string
}

function push(into: ProseLine[], id: string, text: string | undefined | null) {
  if (typeof text !== 'string') return
  const trimmed = text.trim()
  if (trimmed === '') return
  into.push({ id, text: trimmed })
}

function siteOf(state: GameState, siteId: SiteId): SiteDefinition | undefined {
  return getCaseContent(state.caseId).sites.find((site) => site.id === siteId)
}

/** The action this run filed at `siteId`, resolved through the precedent seam. */
function filedActionFor(state: GameState, siteId: SiteId) {
  const content = getCaseContent(state.caseId)
  const base = content.fieldActions.find(
    (action) => action.siteId === siteId && state.completedActions.includes(action.id),
  )
  return base ? resolveFieldAction(content, base.id, state.precedents) : undefined
}

/** Every method authored at `siteId`, in authored order, precedent-resolved. */
function actionsFor(state: GameState, siteId: SiteId) {
  const content = getCaseContent(state.caseId)
  const site = siteOf(state, siteId)
  if (!site) return []
  return site.actionIds
    .map((actionId) => resolveFieldAction(content, actionId, state.precedents))
    .filter((action): action is NonNullable<typeof action> => Boolean(action))
}

/** The `Name +1 · Other -1` standing string both surfaces compose identically. */
function standingLine(trust: Partial<Record<PersonaId, number>> | undefined): string {
  return Object.entries(trust ?? {})
    .filter(([, delta]) => delta !== 0)
    .map(([id, delta]) => `${personaName(id as PersonaId)} ${delta > 0 ? '+' : ''}${delta}`)
    .join(' · ')
}

/** The filed-result card, which both surfaces render from the same values. */
function filedCard(state: GameState, siteId: SiteId, prefix: string): ProseLine[] {
  const content = getCaseContent(state.caseId)
  const action = filedActionFor(state, siteId)
  const out: ProseLine[] = []
  if (!action) return out
  const event = state.events.find(
    (item) => item.sourceType === 'field-action' && item.sourceId === action.id,
  )
  const evidence = content.evidenceDefinitions.find((item) => item.id === action.evidenceId)
  // The inspector falls back to `action.title` where the drawer falls back to
  // `action.eventTitle`; both fall through only if the logged event is missing,
  // and BOTH fallbacks are carried by the drawer's own method list / filed card,
  // so the union below is honest rather than convenient.
  push(out, `${prefix}:event-title`, event?.title ?? action.title)
  push(out, `${prefix}:event-detail`, action.eventDetail)
  if (evidence) push(out, `${prefix}:evidence`, evidence.title)
  push(
    out,
    `${prefix}:civic-trace`,
    action.alarmDelta > 0 ? `+${action.alarmDelta} alarm` : 'No new trace',
  )
  const standing = standingLine(action.trust)
  if (standing !== '') push(out, `${prefix}:standing`, standing)
  if (action.grantsTribunalOverride) push(out, `${prefix}:authority`, 'Override acquired')
  for (const reaction of action.reactions ?? []) {
    push(out, `${prefix}:reaction-name:${reaction.persona}`, personaName(reaction.persona))
    push(out, `${prefix}:reaction-line:${reaction.persona}`, reaction.line)
  }
  return out
}

/**
 * What the SPINE keeps on screen when the inspector collapses: the location's
 * identity and its state. Nothing here is ever retired, so nothing here needs an
 * equivalence proof — it is listed so the contract is a value, not a comment.
 */
export function spineKeeps(state: GameState, siteId: SiteId): readonly ProseLine[] {
  const site = siteOf(state, siteId)
  const out: ProseLine[] = []
  if (!site) return out
  push(out, 'spine:index', site.index)
  push(out, 'spine:name', site.name)
  push(out, 'spine:status', filedActionFor(state, siteId) ? 'Filed' : 'Open')
  return out
}

/**
 * Every canonical string the EXPANDED site inspector can print for `siteId`, in
 * DOM order: identity, the standing description, the filed card (when the run has
 * filed here), and the method list. The method list is included unconditionally
 * on purpose — it is what the inspector prints whenever the settled close read is
 * not on screen, which is the state the always-mounted rule protects — so proving
 * the drawer carries THIS set is strictly stronger than proving it per phase.
 */
export function inspectorProse(state: GameState, siteId: SiteId): readonly ProseLine[] {
  const site = siteOf(state, siteId)
  if (!site) return []
  const out: ProseLine[] = [...spineKeeps(state, siteId)]
  push(out, 'inspector:description', site.description)
  out.push(...filedCard(state, siteId, 'inspector:filed'))
  for (const action of actionsFor(state, siteId)) {
    push(out, `inspector:method-label:${action.id}`, action.methodLabel)
    push(out, `inspector:method-title:${action.id}`, action.title)
    push(out, `inspector:method-description:${action.id}`, action.description)
    push(out, `inspector:method-consequence:${action.id}`, action.consequence)
  }
  return out
}

/**
 * Every canonical string `SceneDetailDrawer` prints for `siteId`. Mirrors that
 * component's JSX, and `siteRecordText.test.ts` pins the mirror by asserting the
 * drawer's own DOM (rendered in jsdom) contains each of these.
 */
export function detailDrawerProse(state: GameState, siteId: SiteId): readonly ProseLine[] {
  const site = siteOf(state, siteId)
  if (!site) return []
  const out: ProseLine[] = []
  push(out, 'drawer:index', site.index)
  push(out, 'drawer:name', site.name)
  push(out, 'drawer:description', site.description)
  out.push(...filedCard(state, siteId, 'drawer:filed'))
  for (const action of actionsFor(state, siteId)) {
    push(out, `drawer:method-label:${action.id}`, action.methodLabel)
    push(out, `drawer:method-title:${action.id}`, action.title)
    push(out, `drawer:method-description:${action.id}`, action.description)
    push(out, `drawer:method-consequence:${action.id}`, action.consequence)
  }
  return out
}

/**
 * The strings the collapse stops printing: everything the expanded inspector
 * prints that the spine does not keep. This is the set that owes a proof.
 */
export function collapseRetires(state: GameState, siteId: SiteId): readonly ProseLine[] {
  const kept = new Set(spineKeeps(state, siteId).map((line) => line.text))
  return inspectorProse(state, siteId).filter((line) => !kept.has(line.text))
}

/**
 * The retired strings the Location detail drawer does NOT carry. **Must be empty**
 * — an inspector collapse that leaves this non-empty is the always-mounted scar
 * happening again, and the unit suite fails rather than the game losing prose.
 */
export function equivalenceGaps(state: GameState, siteId: SiteId): readonly ProseLine[] {
  const carried = new Set(detailDrawerProse(state, siteId).map((line) => line.text))
  return collapseRetires(state, siteId).filter((line) => !carried.has(line.text))
}

/**
 * The second, independent proof for a CLOSED location: the same filed strings read
 * off the LEDGER's moment for that site (`momentForSite`, the join round 2 left
 * owed). Empty for a location the run has not filed — by contract the ledger holds
 * only what the run has put on the record.
 *
 * Returns the retired filed-card strings the ledger moment does not carry, so an
 * empty array means the drawer is not the only surface holding the closed
 * location's record.
 */
export function ledgerGapsForFiledSite(state: GameState, siteId: SiteId): readonly ProseLine[] {
  const moment = momentForSite(state, siteId)
  if (!moment) return []
  const haystack = [
    moment.title,
    moment.detail,
    ...moment.filings.map((entry) => entry.title),
    ...moment.filings.map((entry) => entry.body),
    ...moment.voices.flatMap((voice) => [voice.voice, ...voice.entries.map((e) => e.body)]),
  ]
  // CONTAINMENT, not equality, and that is a finding rather than a convenience:
  // the reducer appends `describeTrustDeltas(...)` to a commit event's detail, so
  // the ledger prints the authored `eventDetail` WITH the run's trust arithmetic
  // after it. The authored string is on the record; it is not the whole of the
  // logged line. An equality test here failed on exactly that, correctly.
  const carried = haystack.map((text) => text.trim()).join(' ')
  // Only the filed card is claimed against the ledger. A location's standing
  // description and its unfiled method prose have no ledger equivalent and never
  // will (round 2 §8.2) — that is exactly why the collapse is phase-gated.
  return filedCard(state, siteId, 'inspector:filed').filter(
    (line) => !carried.includes(line.text),
  )
}

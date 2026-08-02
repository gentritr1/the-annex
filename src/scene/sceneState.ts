// sceneStateFor — the single pure mapping from canonical GameState (plus the
// view surface being rendered) to one of the six scene states. View-derived only:
// the reducer owns all game state; this reads it and never writes.
//
// DISCIPLINE: no content-id literals live here. The press/corroborate split keys
// off the open deposition entry action's METHOD TAGS (shared vocabulary), and the
// refusal branch keys off the persisted DepositionConsent — never off any case's
// entry-action id, site id, or case id.
import { getCaseContent, resolveDepositionUse } from '../game/content'
import type {
  DepositionChoiceId,
  DepositionConsent,
  DepositionDefinition,
  FieldActionId,
  GameState,
  SceneStateId,
} from '../game/types'

// Which surface is being rendered. Investigation resolves neutral/press/
// corroborate/refusal; the tribunal and debrief world windows are fixed.
export type SceneSurface = 'investigation' | 'tribunal' | 'debrief'

export interface SceneViewContext {
  surface: SceneSurface
  // The deposition entry action whose transcript modal is open (investigation
  // only). View-local state — not part of GameState, so it is passed in here.
  openDepositionEntry?: FieldActionId | null
}

export function sceneStateFor(state: GameState, view: SceneViewContext): SceneStateId {
  if (view.surface === 'tribunal') return 'tribunal'
  if (view.surface === 'debrief') return 'aftermath'

  // Investigation surface.
  const content = getCaseContent(state.caseId)
  const deposition = content.deposition
  const openEntry = view.openDepositionEntry ?? null

  if (deposition && openEntry && deposition.entryActionIds.includes(openEntry)) {
    // Opening a raw recorder is not a moral lighting instruction. The authored
    // choices and admissibility shutter carry the distinction in readable UI.
    return 'neutral'
  }

  // A committed deposition where the witness refused persists as refusal for the
  // rest of the investigation phase. Keyed off the persisted consent value.
  if (
    state.depositionRecord?.testimonyUse === 'refused' ||
    state.depositionRecord?.testimonyUse === 'compelled' ||
    (state.depositionRecord?.testimonyUse === 'unknown' &&
      state.depositionRecord.consent === 'no')
  ) {
    return 'refusal'
  }

  return 'neutral'
}

// Resolve the consent value a deposition commit WILL persist, from the same
// authored data the engine reads (deposition.consent.answers) — asking yields the
// authored answer, declining yields 'unasked'. Kept in the view layer so the
// witnessed-refusal beat can be decided from the commit itself rather than by
// observing persisted state after the fact. Mirrors the engine's COMMIT_DEPOSITION
// derivation; both read the shared DepositionConsent vocabulary, no id literals.
export function resolveCommitConsent(
  deposition: DepositionDefinition | undefined,
  actionId: FieldActionId,
  beats: readonly DepositionChoiceId[],
  askedConsent: boolean,
): DepositionConsent {
  if (!deposition) return 'unasked'
  return resolveDepositionUse(deposition, actionId, beats, askedConsent).consent
}

// Whether a just-committed deposition should play the one-shot witnessed-refusal
// beat: only a refused ('no') consent witnesses the room. Evaluated from the
// commit result (via resolveCommitConsent), never from persisted state, so it
// fires exactly once per commit — not on later revisits or reloads.
export function witnessesRefusalOnCommit(consent: DepositionConsent): boolean {
  return consent === 'no'
}

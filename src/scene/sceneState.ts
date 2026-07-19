// sceneStateFor — the single pure mapping from canonical GameState (plus the
// view surface being rendered) to one of the six scene states. View-derived only:
// the reducer owns all game state; this reads it and never writes.
//
// DISCIPLINE: no content-id literals live here. The press/corroborate split keys
// off the open deposition entry action's METHOD TAGS (shared vocabulary), and the
// refusal branch keys off the persisted DepositionConsent — never off any case's
// entry-action id, site id, or case id.
import { getCaseContent } from '../game/content'
import type {
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
    const action = content.fieldActions.find((item) => item.id === openEntry)
    // A coercion-tagged entry presses the witness; any other entry corroborates.
    // Keyed off method-tag vocabulary, not the entry action's id.
    return action?.methodTags.includes('coercion') ? 'press' : 'corroborate'
  }

  // A committed deposition where the witness refused persists as refusal for the
  // rest of the investigation phase. Keyed off the persisted consent value.
  if (state.depositionRecord?.consent === 'no') return 'refusal'

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
  askedConsent: boolean,
): DepositionConsent {
  if (!askedConsent) return 'unasked'
  return deposition?.consent.answers[actionId]?.consent ?? 'unasked'
}

// Whether a just-committed deposition should play the one-shot witnessed-refusal
// beat: only a refused ('no') consent witnesses the room. Evaluated from the
// commit result (via resolveCommitConsent), never from persisted state, so it
// fires exactly once per commit — not on later revisits or reloads.
export function witnessesRefusalOnCommit(consent: DepositionConsent): boolean {
  return consent === 'no'
}

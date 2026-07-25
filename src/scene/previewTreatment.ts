import type { FieldActionId, PreviewTreatmentToken, SiteDefinition } from '../game/types'

// The plate's settled ambient state when no method is being considered.
export type PreviewTreatmentState = PreviewTreatmentToken | 'rest'

type PreviewTreatmentDefinition = NonNullable<
  NonNullable<SiteDefinition['closeup']>['previewTreatment']
>

// Pure presentation derivation, mirroring resolveRainPresenceState: a filed
// method always wins over a transient hover/focus preview, an unauthored site or
// an unmapped action leaves the plate at rest, and nothing here reads GameState.
export function resolvePreviewTreatment(
  definition: PreviewTreatmentDefinition | undefined,
  activeActionId: FieldActionId | null,
  resolvedActionId?: FieldActionId,
): PreviewTreatmentState {
  if (!definition) return 'rest'

  const actionId = resolvedActionId ?? activeActionId
  if (!actionId) return 'rest'

  return definition.actionTreatments[actionId] ?? 'rest'
}

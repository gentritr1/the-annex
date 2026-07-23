import type { FieldActionId, SiteDefinition } from '../game/types'

export type RainPresenceState =
  | 'idle'
  | 'listening-preview'
  | 'pressure-preview'
  | 'listening-resolved'
  | 'pressure-resolved'

type RainPresenceDefinition = NonNullable<
  NonNullable<SiteDefinition['closeup']>['rainPresence']
>

// Pure presentation derivation. A filed method always wins over a transient
// hover/focus preview, and unknown actions leave the approved master untouched.
export function resolveRainPresenceState(
  definition: RainPresenceDefinition | undefined,
  activeActionId: FieldActionId | null,
  resolvedActionId?: FieldActionId,
): RainPresenceState {
  if (!definition) return 'idle'

  const actionId = resolvedActionId ?? activeActionId
  if (!actionId) return 'idle'

  const treatment = definition.actionTreatments[actionId]
  if (!treatment) return 'idle'

  return `${treatment}-${resolvedActionId ? 'resolved' : 'preview'}`
}

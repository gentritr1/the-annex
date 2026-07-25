import type { FieldActionDefinition, PreviewTreatmentToken } from '../game/types'
import { ChoiceButton } from './ChoiceButton'

interface SceneZoneProps {
  action: FieldActionDefinition
  // The authored plate anchor, master-normalized [0,1].
  x: number
  y: number
  // The ambient token this method previews, used only to colour the ring and cap
  // so the two sides of the room read as two different rooms. Presentation only.
  treatment?: PreviewTreatmentToken
  onCommit: () => void
  onAttentionChange: (active: boolean) => void
}

// A method button placed on the plate at its authored anchor. It WRAPS
// ChoiceButton rather than forking it, so arm/confirm, the three silent disarm
// gestures, the attention→preview callback, and the unchanged commit path all
// come from the one canonical control. Everything this file adds is placement
// and the ring/cap visual grammar; the button, its text, and its semantics are
// exactly the ones the inspector list uses.
export function SceneZone({
  action,
  x,
  y,
  treatment,
  onCommit,
  onAttentionChange,
}: SceneZoneProps) {
  return (
    <div
      className="scene-zone"
      data-treatment={treatment}
      data-edge={x <= 0.32 ? 'start' : x >= 0.68 ? 'end' : undefined}
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    >
      <ChoiceButton
        title={action.title}
        label={action.methodLabel}
        description={action.description}
        consequence={action.consequence}
        tone={action.alarmDelta > 0 ? 'risk' : 'default'}
        requiresConfirmation
        onAttentionChange={onAttentionChange}
        onClick={onCommit}
      />
      {/* The ring is decorative: the button above owns every semantic. It sits
          after the button in DOM order so state can be read with :has() without
          adding a wrapper class React would have to keep in sync. */}
      <span className="scene-zone-ring" aria-hidden="true" />
    </div>
  )
}

import type { ReactNode } from 'react'
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
  // Deposition entry zones open the transcript instead of filing a canonical
  // field action, so they deliberately skip the arm/confirm filing gesture.
  requiresConfirmation?: boolean
  // Scene-first filing may be confirmed from the persistent HUD. These optional
  // controlled props keep its arm state explicit without changing any ordinary
  // scene-zone caller's local arm/confirm behavior.
  armed?: boolean
  onArmedChange?: (armed: boolean) => void
  aside?: ReactNode
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
  requiresConfirmation = true,
  armed,
  onArmedChange,
  aside,
  onCommit,
  onAttentionChange,
}: SceneZoneProps) {
  return (
    <div
      className="scene-zone"
      data-treatment={treatment}
      data-armed={armed ? 'true' : undefined}
      // Portrait cover-cropping can place a master-space 0.41 / 0.59 anchor
      // against the visible edge. Classify the outer 45% bands as inboard
      // captions; the ring itself remains pinned to the authored coordinate.
      data-edge={x <= 0.45 ? 'start' : x >= 0.55 ? 'end' : undefined}
      // A low anchor has no room beneath it for a caption that grows downward —
      // on a letterboxed plate the pre-commit cost runs off the bottom edge
      // exactly when the player arms. Those zones caption UPWARD instead; the
      // ring never moves either way. 0.60 is above every anchor the pilot
      // verified, so the shipped pilot plate is untouched by this.
      data-vertical={y >= 0.6 ? 'low' : undefined}
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    >
      <ChoiceButton
        title={action.title}
        label={action.methodLabel}
        description={action.description}
        consequence={action.consequence}
        tone={action.alarmDelta > 0 ? 'risk' : 'default'}
        requiresConfirmation={requiresConfirmation}
        armed={armed}
        onArmedChange={onArmedChange}
        aside={aside}
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

import type { CSSProperties } from 'react'
import type { SecretDefinition } from '../game/types'

interface FourthMarginMarkerProps {
  definition: SecretDefinition
  discovered: boolean
  onInspect: () => void
}

// A real DOM target pinned to an authored close-read coordinate. The bracket is
// deliberately quieter than a field-action ring, but the 48px control, visible
// focus label, and static reduced-motion/forced-colors treatment keep discovery
// available without hover, timing, sound, or WebGL hit testing.
export function FourthMarginMarker({
  definition,
  discovered,
  onInspect,
}: FourthMarginMarkerProps) {
  const anchor = definition.anchor
  if (!anchor) return null
  const compactAnchor = definition.compactAnchor ?? anchor
  const anchorStyle = {
    '--fourth-margin-x': `${anchor.x * 100}%`,
    '--fourth-margin-y': `${anchor.y * 100}%`,
    '--fourth-margin-compact-x': `${compactAnchor.x * 100}%`,
    '--fourth-margin-compact-y': `${compactAnchor.y * 100}%`,
  } as CSSProperties

  return (
    <div
      className="fourth-margin-anchor"
      style={anchorStyle}
    >
      <button
        className="fourth-margin-marker"
        type="button"
        data-secret-id={definition.id}
        data-discovered={discovered ? 'true' : undefined}
        aria-label={
          discovered
            ? `Review Fourth Margin: ${definition.title}`
            : 'Inspect irregular mark'
        }
        onClick={onInspect}
      >
        <span className="fourth-margin-bracket" aria-hidden="true">
          <span>04</span>
        </span>
        <span className="fourth-margin-marker-label" aria-hidden="true">
          <small>Not evidence</small>
          The Fourth Margin
        </span>
      </button>
    </div>
  )
}

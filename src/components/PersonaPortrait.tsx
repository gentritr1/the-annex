import { PersonaSigil } from '../ambience/sigils'
import { personas } from '../game/content'
import type { PersonaId } from '../game/types'

// chip  — beside an attributed line (reaction quotes, the beat speaker line, the
//         result strip's standing deltas). The gutter face that turns a wall of
//         attributed text into a cast talking.
// card  — the rail entity row and the debrief reflection.
// sheet — the full roster record; the ONLY size that exposes its authored alt,
//         because there the description IS the record rather than a decoration
//         beside a name the surface already prints.
export type PersonaPortraitSize = 'chip' | 'card' | 'sheet'

interface PersonaPortraitProps {
  personaId: PersonaId
  size: PersonaPortraitSize
}

// A roster portrait, matted and never blended: an <img> inside a bordered frame
// over --night-soft, no mix-blend-mode and no screen composite (the recorded
// Ellis raster-ghosting scar). The painterly palette is authored into the plate,
// so nothing is filtered at rest; the registry filter values return only as the
// high-contrast fallback, and a forced palette drops to the sigil, which was
// built as a currentColor-only mark for exactly that reason.
//
// It renders the authored PersonaDefinition.portrait when one exists and falls
// back to the sigil when it does not — which is what let this component ship
// before or after the portraits were selected, and is also the forced-colors
// path. It holds no state, reads no GameState, and animates nothing.
export function PersonaPortrait({ personaId, size }: PersonaPortraitProps) {
  const portrait = personas.find((persona) => persona.id === personaId)?.portrait
  const frameClass = `persona-portrait persona-portrait--${size}${portrait ? ' persona-portrait--plated' : ''}`

  // The mark is mounted in BOTH paths. With no portrait it is the whole of the
  // frame; with one it waits behind the plate at zero opacity so the forced-colors
  // rule can swap the two without a second component or a layout shift.
  const mark = (
    <span className="persona-portrait-mark" aria-hidden="true">
      <PersonaSigil personaId={personaId} />
    </span>
  )

  // The delivered geometry (360×418) rides on the element as intrinsic size so the
  // box is reserved before decode; CSS owns the rendered width per size, exactly
  // as DossierPhoto does. The reviewed crop is never re-cropped by the frame.
  const plate = portrait ? (
    <img
      src={portrait.src}
      alt={size === 'sheet' ? portrait.alt : ''}
      width={360}
      height={418}
      // Only the summoned sheet defers: a chip mounts inside a beat that is
      // already playing, where a late decode reads as a pop rather than a face.
      loading={size === 'sheet' ? 'lazy' : undefined}
      decoding="async"
    />
  ) : null

  if (size === 'sheet') {
    return (
      <figure className="persona-portrait-record">
        <span className={frameClass} data-persona={personaId}>
          {plate}
          {mark}
        </span>
        {portrait && <figcaption className="persona-portrait-caption">{portrait.caption}</figcaption>}
      </figure>
    )
  }

  // Chip and card are decorative by construction: every surface that mounts one
  // already prints the persona's name as a text node beside it, so an exposed alt
  // would be a second announcement of the same name (plan §6 risk 4).
  return (
    <span className={frameClass} data-persona={personaId} aria-hidden="true">
      {plate}
      {mark}
    </span>
  )
}

// Persona sigils — extracted from public/ambience.html (PART B <defs> block).
// One stroke grammar: 24×24 grid, 1.5 stroke, round caps/joins, fill none,
// currentColor only. No text, no faces. Each mark derives from the presence's
// function; the rationale rides along as a comment on each component. These are
// decorative (aria-hidden): the persona name always sits beside them.
import type { SVGProps } from 'react'
import type { PersonaId } from '../game/types'

type SigilProps = SVGProps<SVGSVGElement>

const baseProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

// Registrar — a registry seal ruled like a ledger: continuity entered line by
// line beneath a docket tick.
export function RegistrarSigil(props: SigilProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 2.6v2.2" />
      <path d="M5.6 9.5h12.8M4.9 12h14.2M5.6 14.5h12.8" />
    </svg>
  )
}

// Shepherd — an open arch standing over a single point: shelter that witnesses
// without closing around the warded.
export function ShepherdSigil(props: SigilProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M5.5 18.5A6.5 6.5 0 0 1 18.5 18.5" />
      <path d="M3.5 18.5h17" />
      <circle cx="12" cy="14.4" r="1.5" />
    </svg>
  )
}

// Defector — a floor-plan frame with one gap in its wall, and the route that
// finds it: exits drafted from inside the record.
export function DefectorSigil(props: SigilProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M19.5 8.5V4.5H4.5V19.5H19.5V15.5" />
      <path d="M8.2 15.4V11.3H14.6V12.4H20.6" />
      <rect x="6.8" y="15.4" width="2.8" height="2.8" />
    </svg>
  )
}

// Small Archivist — an index tab over two ruled entries and one empty ring: a
// space held for the category no form has named yet.
export function ArchivistSigil(props: SigilProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4.5 19.5V7.5H8.2V4.8H12.8V7.5H19.5V19.5Z" />
      <path d="M7.6 11.6h8.8M7.6 14.6h3.9" />
      <circle cx="14.1" cy="14.6" r="1.3" />
    </svg>
  )
}

// Mirror — a kept half-ring beside its offset echo: the version retained and
// the version discarded, sharing one outline. (Cross-run residue, not a persona.)
export function MirrorSigil(props: SigilProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 4.5A7.5 7.5 0 0 0 12 19.5" />
      <path d="M13.6 5.4A7.3 7.3 0 0 1 13.6 18.6" strokeOpacity={0.45} />
    </svg>
  )
}

// Dispatch by persona id for the four named presences (Mirror is used directly).
export function PersonaSigil({ personaId, ...props }: SigilProps & { personaId: PersonaId }) {
  switch (personaId) {
    case 'registrar':
      return <RegistrarSigil {...props} />
    case 'shepherd':
      return <ShepherdSigil {...props} />
    case 'defector':
      return <DefectorSigil {...props} />
    case 'archivist':
      return <ArchivistSigil {...props} />
  }
}

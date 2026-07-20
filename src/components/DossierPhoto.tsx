import type { CaseFileDossierImage } from '../game/types'

// A diegetic registry record rendered from authored case-file data — a flat,
// slightly desaturated, fog-bordered photograph with a compact mono caption. It
// carries no case-id literal: it renders wherever a case authors
// caseFile.dossierImage (Case 81 does; Case 77 does not), so its presence alone
// scopes it. The alt text is authored in-voice on the case file.
export function DossierPhoto({
  image,
  variant,
}: {
  image: CaseFileDossierImage
  variant: 'briefing' | 'rail'
}) {
  return (
    <figure className={`registry-photo registry-photo--${variant}`}>
      <img
        src={image.src}
        alt={image.alt}
        width={360}
        height={418}
        loading="lazy"
        decoding="async"
      />
      <figcaption className="registry-caption">{image.caption}</figcaption>
    </figure>
  )
}

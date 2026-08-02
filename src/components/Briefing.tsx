import { useState } from 'react'
import { Atmosphere } from '../ambience/Atmosphere'
import { MirrorSigil } from '../ambience/sigils'
import {
  DEFAULT_CASE_ID,
  getCaseContent,
  getMirrorBriefingAside,
  methodLabels,
  personaName,
} from '../game/content'
import type { ApproachDefinition, ApproachId, GameState, PersonaId } from '../game/types'
import { ChoiceButton } from './ChoiceButton'
import { DossierPhoto } from './DossierPhoto'

interface BriefingProps {
  state: GameState
  onSelectApproach: (approachId: ApproachId) => void
}

function relationshipDelta(approach: ApproachDefinition): string {
  const changes = Object.entries(approach.trust)
    .filter(([, delta]) => delta !== 0)
    .map(
      ([personaId, delta]) =>
        `${personaName(personaId as PersonaId)} ${delta > 0 ? '+' : ''}${delta}`,
    )
  return changes.length > 0 ? changes.join(' · ') : 'No relationship change'
}

export function Briefing({ state, onSelectApproach }: BriefingProps) {
  const { caseFile, approaches, chrome, scene } = getCaseContent(state.caseId)
  // The opening card is a view-local draft. Only the lone review button below
  // dispatches the existing SELECT_APPROACH action through App.
  const [draftApproachId, setDraftApproachId] = useState<ApproachId | null>(null)
  const draftApproach = approaches.find((approach) => approach.id === draftApproachId)
  const priorRun = state.previousRuns.at(-1)
  // The prior run may belong to another case; its aside comes from that case.
  const mirrorAside = priorRun
    ? getMirrorBriefingAside(priorRun.caseId ?? DEFAULT_CASE_ID, priorRun.decision)
    : null
  // The banner wears this case's own art, resolved from scene data.
  const bannerSrc = scene.layers.find((l) => l.raster?.src)?.raster?.src
  const bannerStyle = bannerSrc
    ? ({ '--banner-art': `url(${bannerSrc})` } as React.CSSProperties)
    : undefined

  return (
    <article className="phase-page briefing-page">
      <div className="scene-banner scene-banner-briefing" style={bannerStyle}>
        {/* Rain only — the banner already carries the art as its own background;
            no hero plane, no parallax (double-painting would ghost it). */}
        <Atmosphere mask={0.12} reducedMotion={state.settings.reducedMotion} />
        <div className="scene-banner-copy">
          <p className="case-code">Assignment received · {caseFile.code}</p>
          <h1>{caseFile.title}</h1>
          <p>{caseFile.question}</p>
        </div>
        <div className="scene-coordinates" aria-hidden="true">
          {chrome.briefingCoordinates}
        </div>
      </div>

      <div className="briefing-body-grid">
        <section className="phase-section briefing-approaches" aria-labelledby="approach-heading">
          <div className="section-heading">
            <div>
              <h2 id="approach-heading">Choose where the record begins</h2>
              <p>This sets your first relationship, not a permanent class. Every site remains available.</p>
            </div>
            <span className="selection-count">1 choice</span>
          </div>

          <div className="choice-list briefing-choice-list">
            {approaches.map((approach) => {
              const selected = draftApproachId === approach.id
              return (
                <div
                  className={`briefing-approach-card ${selected ? 'briefing-approach-card-selected' : ''}`}
                  data-approach-id={approach.id}
                  data-selected={selected ? 'true' : undefined}
                  key={approach.id}
                >
                  <ChoiceButton
                    title={approach.title}
                    label={approach.method}
                    description={approach.description}
                    consequence={approach.consequence}
                    aside={selected ? 'Selected' : undefined}
                    onClick={() => setDraftApproachId(approach.id)}
                  />
                </div>
              )
            })}
          </div>

          {draftApproach && (
            <section className="briefing-approach-review" aria-labelledby="approach-review-heading">
              <p className="section-context">Opening approach review</p>
              <h3 id="approach-review-heading">{draftApproach.title}</h3>
              <p>
                <strong>Method memory:</strong>{' '}
                {draftApproach.methodTags.map((tag) => methodLabels[tag]).join(' · ')}
              </p>
              <p>
                <strong>Relationship:</strong> {relationshipDelta(draftApproach)}
              </p>
              <button
                className="button button-primary"
                type="button"
                onClick={() => onSelectApproach(draftApproach.id)}
              >
                Begin audit <span aria-hidden="true">→</span>
              </button>
            </section>
          )}
        </section>

        <div className="narrative-measure briefing-record">
          {priorRun && (
            <aside className="memory-echo" aria-label="Cross-run memory echo">
              <span className="echo-mark" aria-hidden="true">
                <MirrorSigil />
              </span>
              <div>
                <strong>Residual signal</strong>
                <p>{mirrorAside}</p>
                <div className="echo-tags" aria-label="Methods remembered from the prior run">
                  {priorRun.methodTags
                    .filter((method) => method !== 'nonlethal')
                    .slice(0, 4)
                    .map((method) => (
                      <span key={method}>{methodLabels[method]}</span>
                    ))}
                </div>
              </div>
            </aside>
          )}

          <div className="record-grid">
            <div>
              <span>Subject</span>
              <strong>{caseFile.subject}</strong>
              {caseFile.dossierImage && (
                <DossierPhoto image={caseFile.dossierImage} variant="briefing" />
              )}
            </div>
            <div>
              <span>Review window</span>
              <strong>{caseFile.deadline}</strong>
            </div>
          </div>

          <p className="briefing-mandate">{caseFile.mandate}</p>
          <details className="briefing-public-record">
            <summary>Review the public record</summary>
            <p>{caseFile.publicRecord}</p>
          </details>
        </div>
      </div>
    </article>
  )
}

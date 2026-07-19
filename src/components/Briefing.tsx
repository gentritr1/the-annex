import { Atmosphere } from '../ambience/Atmosphere'
import { MirrorSigil } from '../ambience/sigils'
import { DEFAULT_CASE_ID, getCaseContent, getMirrorBriefingAside, methodLabels } from '../game/content'
import type { ApproachId, GameState } from '../game/types'
import { ChoiceButton } from './ChoiceButton'

interface BriefingProps {
  state: GameState
  onSelectApproach: (approachId: ApproachId) => void
}

export function Briefing({ state, onSelectApproach }: BriefingProps) {
  const { caseFile, approaches, chrome } = getCaseContent(state.caseId)
  const priorRun = state.previousRuns.at(-1)
  // The prior run may belong to another case; its aside comes from that case.
  const mirrorAside = priorRun
    ? getMirrorBriefingAside(priorRun.caseId ?? DEFAULT_CASE_ID, priorRun.decision)
    : null

  return (
    <article className="phase-page briefing-page">
      <div className="scene-banner scene-banner-briefing">
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
          </div>
          <div>
            <span>Review window</span>
            <strong>{caseFile.deadline}</strong>
          </div>
        </div>

        <p>{caseFile.publicRecord}</p>
        <p>{caseFile.mandate}</p>
      </div>

      <section className="phase-section" aria-labelledby="approach-heading">
        <div className="section-heading">
          <div>
            <h2 id="approach-heading">Choose where the record begins</h2>
            <p>This sets your first relationship, not a permanent class. Every site remains available.</p>
          </div>
          <span className="selection-count">1 choice</span>
        </div>

        <div className="choice-list">
          {approaches.map((approach) => (
            <ChoiceButton
              key={approach.id}
              title={approach.title}
              label={approach.method}
              description={approach.description}
              consequence={approach.consequence}
              onClick={() => onSelectApproach(approach.id)}
            />
          ))}
        </div>
      </section>
    </article>
  )
}

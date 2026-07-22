import type { CSSProperties, ReactNode } from 'react'
import { MirrorSigil } from '../ambience/sigils'

interface DebriefTableauProps {
  backgroundSrc: string
  subjectImageSrc?: string
  caseCode: string
  runNumber: number
  decisionId: string
  decisionTitle: string
  decisionCost: string
  evidenceCount: number
  completedSiteCount: number
  totalSiteCount: number
  alarmLevel: number
  firstMethod: string
  children?: ReactNode
}

// The decided run as a single consequence tableau. It interprets already-filed
// state only; every canonical outcome and replay action remains in normal DOM.
export function DebriefTableau({
  backgroundSrc,
  subjectImageSrc,
  caseCode,
  runNumber,
  decisionId,
  decisionTitle,
  decisionCost,
  evidenceCount,
  completedSiteCount,
  totalSiteCount,
  alarmLevel,
  firstMethod,
  children,
}: DebriefTableauProps) {
  const admittedSignals = Array.from({ length: evidenceCount }, (_, index) => index)

  return (
    <section
      className="debrief-tableau"
      data-decision={decisionId}
      data-alarm={Math.max(0, Math.min(3, alarmLevel))}
      aria-labelledby="debrief-outcome-heading"
    >
      <div className="debrief-tableau-art" aria-hidden="true">
        <img className="debrief-tableau-room" src={backgroundSrc} alt="" />
        <div className="debrief-tableau-depth" />
        {subjectImageSrc ? (
          <img className="debrief-tableau-subject" src={subjectImageSrc} alt="" />
        ) : null}
        <div className="debrief-tableau-orbit">
          <MirrorSigil width={118} height={118} />
          {admittedSignals.map((index) => (
            <span key={index} style={{ '--signal-index': index } as CSSProperties} />
          ))}
        </div>
        <div className="debrief-tableau-seal" />
      </div>

      <div className="debrief-tableau-copy">
        <p className="case-code">
          {caseCode} · run {runNumber} closed
        </p>
        <h1 id="debrief-outcome-heading">{decisionTitle}</h1>
        <p className="debrief-tableau-cost">{decisionCost}</p>
        {children}

        <dl className="debrief-tableau-metrics" aria-label="Run summary">
          <div>
            <dt>First instinct</dt>
            <dd>{firstMethod}</dd>
          </div>
          <div>
            <dt>Evidence</dt>
            <dd>{evidenceCount} admitted</dd>
          </div>
          <div>
            <dt>Field record</dt>
            <dd>{completedSiteCount} / {totalSiteCount} sites</dd>
          </div>
          <div>
            <dt>Civic trace</dt>
            <dd>{alarmLevel === 0 ? 'quiet' : 'traced'}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

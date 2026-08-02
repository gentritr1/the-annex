import type { FragmentKnowledge } from '../game/engine'
import type { FragmentDefinition, FragmentId } from '../game/types'

interface MemoryLatticeStageProps {
  fragments: readonly FragmentDefinition[]
  selectedFragments: readonly FragmentId[]
  fragmentKnowledgeById: Readonly<Record<FragmentId, FragmentKnowledge>>
}

export function MemoryLatticeStage({
  fragments,
  selectedFragments,
  fragmentKnowledgeById,
}: MemoryLatticeStageProps) {
  const selected = new Set(selectedFragments)
  const selectionCount = Math.min(selectedFragments.length, 2)
  const selectedKnowledge = selectedFragments.map(
    (fragmentId) => fragmentKnowledgeById[fragmentId] ?? 'unknown',
  )
  const modelReady =
    selectedFragments.length === 2 &&
    selected.size === 2 &&
    selectedKnowledge.every((knowledge) => knowledge !== 'unknown') &&
    selectedKnowledge.some((knowledge) => knowledge === 'corroborated')
  const knowledgeSummary = fragments.reduce(
    (summary, fragment) => {
      const knowledge = fragmentKnowledgeById[fragment.id] ?? 'unknown'
      summary[knowledge] += 1
      return summary
    },
    { unknown: 0, discovered: 0, corroborated: 0 },
  )

  return (
    <section
      className="memory-lattice-stage"
      data-selection-count={selectionCount}
      role="img"
      aria-label={`Memory Lattice Chamber. ${selectionCount} of 2 anchors selected. ${knowledgeSummary.corroborated} corroborated, ${knowledgeSummary.discovered} discovered, ${knowledgeSummary.unknown} sealed unknown.`}
    >
      <div className="memory-lattice-art" aria-hidden="true">
        <img
          className="memory-lattice-plate"
          src="/images/phase-scenes/memory-lattice-chamber.webp"
          alt=""
        />
        <div className="memory-lattice-depth" />
        <svg className="memory-lattice-connections" viewBox="0 0 100 100">
          {fragments.map((fragment, index) => (
            <line
              key={fragment.id}
              className={selected.has(fragment.id) ? 'is-selected' : ''}
              x1={[27, 39, 61, 79][index] ?? 50}
              y1={[50, 45, 45, 50][index] ?? 50}
              x2="50"
              y2="57"
            />
          ))}
        </svg>

        <div className="memory-model-core">
          <span />
          <span />
          <strong>{selectionCount} / 2</strong>
        </div>

        <div className="memory-anchor-field">
          {fragments.map((fragment, index) => {
            const isSelected = selected.has(fragment.id)
            const knowledge = fragmentKnowledgeById[fragment.id] ?? 'unknown'
            return (
              <div
                className={`memory-anchor-node memory-anchor-${knowledge} ${
                  isSelected ? 'is-selected' : ''
                }`}
                data-anchor={index}
                data-anchor-knowledge={knowledge}
                key={fragment.id}
              >
                <span className="memory-anchor-beacon" />
                <span className="memory-anchor-label">
                  <b>{knowledge === 'unknown' ? 'SEALED' : fragment.timecode}</b>
                  <strong>{knowledge === 'unknown' ? 'Unknown anchor' : fragment.title}</strong>
                  <small>
                    {knowledge === 'corroborated'
                      ? 'Corroborated'
                      : knowledge === 'discovered'
                        ? 'Filed · not corroborated'
                        : 'Sealed · unknown'}
                  </small>
                </span>
              </div>
            )
          })}
        </div>

        <div className="memory-lattice-caption">
          <span>Bounded reconstruction volume</span>
          <span>
            {modelReady
              ? 'Model ready to file'
              : selectionCount === 2
                ? 'Pair needs a corroborated anchor'
                : 'Awaiting two anchors'}
          </span>
        </div>
      </div>
    </section>
  )
}

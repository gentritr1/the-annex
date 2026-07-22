import type { FragmentDefinition, FragmentId } from '../game/types'

interface MemoryLatticeStageProps {
  fragments: readonly FragmentDefinition[]
  selectedFragments: readonly FragmentId[]
  corroboratedFragmentIds: readonly FragmentId[]
}

export function MemoryLatticeStage({
  fragments,
  selectedFragments,
  corroboratedFragmentIds,
}: MemoryLatticeStageProps) {
  const selected = new Set(selectedFragments)
  const corroborated = new Set(corroboratedFragmentIds)
  const selectionCount = Math.min(selectedFragments.length, 2)

  return (
    <section
      className="memory-lattice-stage"
      data-selection-count={selectionCount}
      role="img"
      aria-label={`Memory Lattice Chamber. ${selectionCount} of 2 anchors selected.`}
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
            const isCorroborated = corroborated.has(fragment.id)
            return (
              <div
                className={`memory-anchor-node ${isSelected ? 'is-selected' : ''} ${
                  isCorroborated ? 'is-corroborated' : ''
                }`}
                data-anchor={index}
                key={fragment.id}
              >
                <span className="memory-anchor-beacon" />
                <span className="memory-anchor-label">
                  <b>{fragment.timecode}</b>
                  <strong>{fragment.title}</strong>
                </span>
              </div>
            )
          })}
        </div>

        <div className="memory-lattice-caption">
          <span>Bounded reconstruction volume</span>
          <span>{selectionCount === 2 ? 'Model ready to file' : 'Awaiting two anchors'}</span>
        </div>
      </div>
    </section>
  )
}

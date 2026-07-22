// The approved concourse poster is a 16:9 composition. Container query units let
// the poster and its pointer mirrors share one centered `contain` projection
// without measuring or causing a React render on resize.
const POSTER_ASPECT = 16 / 9

function containedAxisPosition(anchor: number, horizontal: boolean): string {
  const delta = anchor - 0.5
  if (Math.abs(delta) < Number.EPSILON) return horizontal ? '50cqw' : '50cqh'
  const magnitude = Math.abs(delta)
  const center = horizontal ? '50cqw' : '50cqh'
  const first = horizontal ? `${magnitude * 100}cqw` : `${magnitude * 100}cqh`
  const second = horizontal
    ? `${magnitude * POSTER_ASPECT * 100}cqh`
    : `${(magnitude / POSTER_ASPECT) * 100}cqw`
  return `calc(${center} ${delta < 0 ? '-' : '+'} min(${first}, ${second}))`
}

export function containedPosterAnchor(anchor: { x: number; y: number }) {
  return {
    left: containedAxisPosition(anchor.x, true),
    top: containedAxisPosition(anchor.y, false),
  }
}

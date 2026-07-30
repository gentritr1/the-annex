const SEEN_BEATS_KEY = 'the-annex.seen-beats.v1'
const MAX_SEEN_BEATS = 256

function readSeenBeats(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(SEEN_BEATS_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is string => typeof entry === 'string').slice(-MAX_SEEN_BEATS)
  } catch {
    return []
  }
}

export function hasSeenBeat(beatId: string | undefined): boolean {
  return Boolean(beatId && readSeenBeats().includes(beatId))
}

export function markBeatSeen(beatId: string | undefined): void {
  if (!beatId || typeof window === 'undefined') return
  try {
    const current = readSeenBeats()
    const next = [...current.filter((entry) => entry !== beatId), beatId].slice(-MAX_SEEN_BEATS)
    window.localStorage.setItem(SEEN_BEATS_KEY, JSON.stringify(next))
  } catch {
    // Replay convenience must never block the canonical game when storage is denied.
  }
}

export function clearSeenBeatsForTests(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(SEEN_BEATS_KEY)
  } catch {
    // Test helper mirrors the production fail-soft storage contract.
  }
}

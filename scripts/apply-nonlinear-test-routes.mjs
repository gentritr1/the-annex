import { readFileSync, writeFileSync } from 'node:fs'

function replaceOnce(path, before, after) {
  const source = readFileSync(path, 'utf8')
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${path}: expected source anchor not found`)
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${path}: source anchor is not unique`)
  }
  writeFileSync(path, source.slice(0, first) + after + source.slice(first + before.length))
  console.log(`patched ${path}`)
}

replaceOnce(
  'src/game/engine.test.ts',
  `    // Auditing the restoration log corroborates 'redacted-clause' (its links
    // include 'restoration-log'), so the warning must come from the authored
    // unresolvedTone flag, not the corroboratedAnchors === 0 fallback.
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'audit-restoration-log' })
    s = gameReducer(s, { type: 'OPEN_RECONSTRUCTION' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'redacted-clause' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'unscripted-answer' })
    s = gameReducer(s, { type: 'SUBMIT_RECONSTRUCTION' })

    expect(s.reconstruction).toBe('standing-deadlock')
    const event = s.events.at(-1)
    expect(event?.detail).toContain('1 of 2 anchors were corroborated')
`,
  `    // The restoration log corroborates 'redacted-clause' and the counsel brief
    // corroborates 'unscripted-answer'. With both anchors supported, the warning
    // can come only from the authored unresolvedTone flag — never from a fallback
    // for unsupported reconstruction evidence.
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'audit-restoration-log' })
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'brief-city-counsel' })
    s = gameReducer(s, { type: 'OPEN_RECONSTRUCTION' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'redacted-clause' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'unscripted-answer' })
    s = gameReducer(s, { type: 'SUBMIT_RECONSTRUCTION' })

    expect(s.reconstruction).toBe('standing-deadlock')
    const event = s.events.at(-1)
    expect(event?.detail).toContain('2 of 2 anchors were corroborated')
`,
)

replaceOnce(
  'src/game/ledger.test.ts',
  `    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'scar-sensation' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'registry-hash' })
`,
  `    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'scar-sensation' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
`,
)

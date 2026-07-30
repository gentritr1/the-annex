import { execFileSync } from 'node:child_process'
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

// The temporary harness is restored from the last known-good diagnostic commit
// before any product edit. This keeps the recovery byte-for-byte auditable after
// an overly broad repository edit replaced the file instead of one line.
const harnessPath = 'scripts/nonlinear-browser-playtest.ts'
const restoredHarness = execFileSync(
  'git',
  ['show', 'c0a8d410fa37b1954e604b5f36aaad7ae8204e71:scripts/nonlinear-browser-playtest.ts'],
  { encoding: 'utf8' },
)
writeFileSync(harnessPath, restoredHarness)
replaceOnce(
  harnessPath,
  `  let state = start81(mode === 'no-account' ? 'procedure' : 'care')
`,
  `  const state = start81(mode === 'no-account' ? 'procedure' : 'care')
`,
)

replaceOnce(
  'src/game/causal.ts',
  `    {
      fragmentId: 'registry-hash',
      knownAfterActions: [
        'authenticate-chain',
        'trace-checksum',
        'walk-acoustic-shadow',
        'forge-authority',
      ],
    },
`,
  `    {
      fragmentId: 'registry-hash',
      knownAfterActions: [
        'authenticate-chain',
        'trace-checksum',
        'walk-acoustic-shadow',
        'forge-authority',
        // The Archive exposes the institutional checksum claim as part of its
        // category register, but cannot corroborate the Registry event that made
        // the claim. This is the authored Care → Archive speculative seam.
        'answer-archivist',
        'seal-index',
      ],
    },
`,
)

replaceOnce(
  'src/game/causal.test.ts',
  `  it('persists one unsupported anchor as contested event facts', () => {
`,
  `  it('keeps Care → Archive able to file one explicit institutional speculation', () => {
    const content = getCaseContent('case-77')
    let state = commit(startCase('case-77', 'care'), 'listen-mara')
    state = commit(state, 'answer-archivist')

    expect(getFragmentKnowledge(content, state, 'scar-sensation')).toBe('corroborated')
    expect(getFragmentKnowledge(content, state, 'registry-hash')).toBe('known')

    state = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'scar-sensation' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'registry-hash' })
    state = gameReducer(state, { type: 'SUBMIT_RECONSTRUCTION' })

    expect(state.phase).toBe('investigation')
    expect(getReconstructionFacts(state)).toEqual({
      speculativeFragments: ['registry-hash'],
      anchorStates: {
        'scar-sensation': 'corroborated',
        'registry-hash': 'known',
      },
    })
  })

  it('persists one unsupported anchor as contested event facts', () => {
`,
)

// @vitest-environment jsdom
//
// THE SAVE-WIPE ROUND TRIP (roadmap §4.5-f).
//
// Wave 1 adds two preferences to AccessibilitySettings. That is not a free
// change: decodeGameState rejects the ENTIRE save when the settings blob fails
// to decode —
//
//   const settings = decodeAccessibilitySettings(value.settings)
//   if (!settings || …) return null
//
// — so a strictly-required new field would make every save written by the
// shipped build undecodable, loadGame() would return null, and the player would
// lose `precedents`, `previousRuns` and `runNumber`. A full wipe.
//
// Reading the optional-tolerated decode is not evidence that it was applied.
// This file is the round trip instead: it writes a save in the EXACT shape the
// pre-change build produced — schemaVersion 2, settings with five fields and no
// more — into real storage, then loads it through the post-change loadGame() and
// asserts the carried history survives intact.
import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialGameState, gameReducer } from './engine'
import { CURRENT_SAVE_SCHEMA, loadGame, loadSettings } from './persistence'
import type { GameState } from './types'

const SAVE_KEY = 'the-annex.case-77.save.v1'
const SETTINGS_KEY = 'the-annex.accessibility.v1'

// The settings object the SHIPPED (pre-Wave-1) build wrote: five fields. Not a
// spread of the current default with fields deleted — spelled out, so this
// fixture keeps describing the old build even after the type widens again.
const preChangeSettings = {
  reducedMotion: true,
  highContrast: false,
  textSize: 'large',
  showTrustNumbers: true,
  ambientSound: true,
}

// A realistic mid-run v2 save carrying the three things a wipe would destroy.
function preChangeSave(): Record<string, unknown> {
  const initial = createInitialGameState()
  const briefing = gameReducer(initial, { type: 'START_NEW' })
  const investigating = gameReducer(briefing, {
    type: 'SELECT_APPROACH',
    approachId: 'procedure',
  })
  const state: GameState = {
    ...investigating,
    runNumber: 4,
    precedents: { 'case-77': 'certify-continuity' },
    previousRuns: [
      {
        caseId: 'case-77',
        runNumber: 3,
        decision: 'certify-continuity',
        primaryApproach: 'procedure',
        methodTags: ['procedure'],
        evidenceCount: 3,
        alarm: 2,
        trust: { registrar: 1, shepherd: 0, defector: 0, archivist: 0 },
      },
    ],
  }
  // Strip both the Wave-1 preferences and the v3 campaign fields the historical
  // build could not have written. Keep this as an actual v2 payload even after
  // createInitialGameState advances again.
  const legacy: Record<string, unknown> = {
    ...state,
    schemaVersion: 2,
    settings: preChangeSettings,
  }
  delete legacy.tribunalChoice
  delete legacy.caseOutcomes
  return legacy
}

describe('an old save still loads after the Wave 1 settings change', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('decodes a v2 save whose settings predate easyRead and subtitlePlate', () => {
    const written = preChangeSave()
    expect(CURRENT_SAVE_SCHEMA).toBe(3)
    expect(written.schemaVersion).toBe(2)
    expect(Object.keys(written.settings as object)).toHaveLength(5)
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(written))

    const loaded = loadGame()

    // The wipe test: null here is every player's history gone.
    expect(loaded).not.toBeNull()
    expect(loaded?.runNumber).toBe(4)
    expect(loaded?.precedents).toEqual({ 'case-77': 'certify-continuity' })
    expect(loaded?.previousRuns).toHaveLength(1)
    expect(loaded?.previousRuns[0]?.decision).toBe('certify-continuity')
    expect(loaded?.caseOutcomes).toEqual({
      'case-77': {
        valeContact: 'unknown',
        authorityLink77: 'not-proven',
        continuityScope: 'unknown',
      },
    })
    // The old preferences are preserved and the new ones default off.
    expect(loaded?.settings).toEqual({
      ...preChangeSettings,
      easyRead: false,
      subtitlePlate: false,
    })
  })

  it('decodes the standalone settings key written by the pre-change build', () => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(preChangeSettings))

    expect(loadSettings()).toEqual({
      ...preChangeSettings,
      easyRead: false,
      subtitlePlate: false,
    })
  })

  it('still rejects a save whose settings blob is malformed', () => {
    // The other half of the contract: optional-tolerated is not permissive.
    const written = preChangeSave()
    window.localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ ...written, settings: { ...preChangeSettings, easyRead: 'yes' } }),
    )

    expect(loadGame()).toBeNull()
  })
})

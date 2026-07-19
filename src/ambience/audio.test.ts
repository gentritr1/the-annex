import { afterEach, describe, expect, it, vi } from 'vitest'
import { SCENE_STATES, type SceneStateId } from '../game/types'
import {
  createAmbientAudio,
  describeBed,
  sceneAudioTreatment,
  sceneGainMap,
  type WeatherBedKind,
} from './audio'

// These tests deliberately never touch the Web Audio API: jsdom/node have no
// AudioContext, and the module is built so nothing constructs one until start()
// runs. We assert the PURE data (bed specs + scene→gain map) and that merely
// importing and constructing the handle performs no AudioContext work.

const kinds: readonly WeatherBedKind[] = ['rain', 'dust']

describe('describeBed', () => {
  it('authors a rain bed and a dust bed with distinct identities', () => {
    const rain = describeBed('rain')
    const dust = describeBed('dust')

    // Rain: band-passed white-noise wash + a faint lowpassed rumble, no hum.
    expect(rain.kind).toBe('rain')
    expect(rain.noiseColor).toBe('white')
    expect(rain.noise.filterType).toBe('bandpass')
    expect(rain.low).toBeDefined()
    expect(rain.hum).toBeUndefined()

    // Dust: deep lowpassed brown room tone + a barely-audible tonal hum, no rumble.
    expect(dust.kind).toBe('dust')
    expect(dust.noiseColor).toBe('brown')
    expect(dust.noise.filterType).toBe('lowpass')
    expect(dust.hum).toBeDefined()
    expect(dust.low).toBeUndefined()

    // The two beds genuinely differ, and the dust room tone is the quieter one.
    expect(dust.noiseColor).not.toBe(rain.noiseColor)
    expect(dust.noise.filterType).not.toBe(rain.noise.filterType)
    expect(dust.ceiling).toBeLessThan(rain.ceiling)
    // Dust is stiller: a slower, shallower breathing drift than rain.
    expect(dust.drift.depth).toBeLessThan(rain.drift.depth)
    expect(dust.drift.periodSec).toBeGreaterThan(rain.drift.periodSec)
  })

  it('keeps both beds quiet — ambience, not soundtrack (ceiling well under -20 dBFS)', () => {
    // -20 dBFS ≈ 0.1 linear. Both ceilings must sit clearly below that.
    kinds.forEach((kind) => {
      const bed = describeBed(kind)
      expect(bed.ceiling).toBeGreaterThan(0)
      expect(bed.ceiling).toBeLessThan(0.1)
    })
    // The dust hum is present but barely — a small fraction of the bed ceiling.
    const dust = describeBed('dust')
    expect(dust.hum?.level ?? 0).toBeGreaterThan(0)
    expect(dust.hum?.level ?? 0).toBeLessThan(dust.ceiling * 2)
  })
})

describe('sceneGainMap', () => {
  it('is total over all six scene states for both weather kinds', () => {
    kinds.forEach((kind) => {
      SCENE_STATES.forEach((state: SceneStateId) => {
        const treatment = sceneGainMap[kind][state]
        expect(treatment, `${kind}/${state}`).toBeDefined()
        expect(Number.isFinite(treatment.bedMul)).toBe(true)
        expect(treatment.bedMul).toBeGreaterThanOrEqual(0)
        expect(treatment.humMul).toBeGreaterThanOrEqual(0)
        expect(treatment.filterMul).toBeGreaterThan(0)
      })
    })
    // No stray states beyond the canonical six per kind.
    kinds.forEach((kind) => {
      expect(Object.keys(sceneGainMap[kind]).sort()).toEqual([...SCENE_STATES].sort())
    })
  })

  it('authors the case-specific silences the visuals demand', () => {
    // Case 77 aftermath: the rain stops entirely (matches weather suppression).
    expect(sceneAudioTreatment('rain', 'aftermath').bedMul).toBe(0)
    // Case 81 refusal: the room holds its breath — the bed drops well below neutral.
    const dustNeutral = sceneAudioTreatment('dust', 'neutral').bedMul
    const dustRefusal = sceneAudioTreatment('dust', 'refusal').bedMul
    expect(dustRefusal).toBeGreaterThan(0)
    expect(dustRefusal).toBeLessThan(dustNeutral * 0.6)
    // Case 81 press: a touch more hum presence than neutral.
    expect(sceneAudioTreatment('dust', 'press').humMul).toBeGreaterThan(
      sceneAudioTreatment('dust', 'neutral').humMul,
    )
    // Both tribunals pull back from neutral (formal-quiet), neither to silence.
    kinds.forEach((kind) => {
      const tribunal = sceneAudioTreatment(kind, 'tribunal').bedMul
      expect(tribunal).toBeGreaterThan(0)
      expect(tribunal).toBeLessThan(sceneAudioTreatment(kind, 'neutral').bedMul)
    })
  })
})

describe('createAmbientAudio (constructible without Web Audio)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('performs no AudioContext work on import or construction', () => {
    const ctor = vi.fn()
    // Stub the browser global the engine would reach for inside start(). Merely
    // constructing the handle must never touch it.
    vi.stubGlobal('window', { AudioContext: ctor })

    const handle = createAmbientAudio()
    expect(ctor).not.toHaveBeenCalled()

    const snapshot = handle.getSnapshot()
    expect(snapshot.contextState).toBe('unbuilt')
    expect(snapshot.wantPlaying).toBe(false)
    handle.destroy()
  })

  it('accepts weather + scene changes before start() without building audio', () => {
    // No global AudioContext at all: start() must be inert, and the pure setters
    // must still update the readable snapshot targets.
    const handle = createAmbientAudio()

    handle.setWeather('dust')
    handle.setSceneState('refusal')
    let snapshot = handle.getSnapshot()
    expect(snapshot.weather).toBe('dust')
    expect(snapshot.sceneState).toBe('refusal')
    expect(snapshot.contextState).toBe('unbuilt')

    // start() with no AudioContext available stays inert (records intent only).
    handle.start()
    snapshot = handle.getSnapshot()
    expect(snapshot.contextState).toBe('unbuilt')
    expect(snapshot.wantPlaying).toBe(true)

    handle.stop()
    expect(handle.getSnapshot().wantPlaying).toBe(false)
    expect(handle.isRunning()).toBe(false)
    handle.destroy()
  })
})

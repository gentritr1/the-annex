import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SCENE_STATES,
  type SceneAcousticTreatment,
  type SceneStateId,
} from '../game/types'
import {
  ROOM_HUM_CEILING,
  ROOM_TONE_CEILING,
  createAmbientAudio,
  describeBed,
  resolveSpatialAudioTargets,
  sceneAudioTreatment,
  sceneGainMap,
  type WeatherBedKind,
} from './audio'

// These tests never touch the real Web Audio API. The pure cases need no
// AudioContext; one compact fake graph verifies the runtime contract after
// start(). Merely importing and constructing the handle must remain inert.

const kinds: readonly WeatherBedKind[] = ['rain', 'dust']

const concourseTreatment: SceneAcousticTreatment = {
  weatherLevel: 0.38,
  weatherCutoffHz: 720,
  roomLevel: 0.85,
  roomCutoffHz: 190,
  humHz: 54,
  humLevel: 0.42,
}

class FakeAudioParam {
  value: number
  rampCalls = 0

  constructor(value: number) {
    this.value = value
  }

  cancelScheduledValues() {
    return this
  }

  setValueAtTime(value: number) {
    this.value = value
    return this
  }

  linearRampToValueAtTime(value: number) {
    this.value = value
    this.rampCalls += 1
    return this
  }
}

class FakeAudioNode {
  readonly connections: unknown[] = []
  disconnectCalls = 0

  connect<T>(target: T): T {
    this.connections.push(target)
    return target
  }

  disconnect() {
    this.disconnectCalls += 1
  }
}

class FakeGainNode extends FakeAudioNode {
  readonly gain = new FakeAudioParam(1)
}

class FakeFilterNode extends FakeAudioNode {
  type = 'lowpass'
  readonly frequency = new FakeAudioParam(350)
  readonly Q = new FakeAudioParam(1)
}

class FakeScheduledSource extends FakeAudioNode {
  startCalls = 0
  stopCalls = 0

  start() {
    this.startCalls += 1
  }

  stop() {
    this.stopCalls += 1
  }
}

class FakeBufferSourceNode extends FakeScheduledSource {
  buffer: FakeAudioBuffer | null = null
  loop = false
}

class FakeOscillatorNode extends FakeScheduledSource {
  type = 'sine'
  readonly frequency = new FakeAudioParam(440)
}

class FakeAudioBuffer {
  private readonly channel: Float32Array

  constructor(length: number) {
    this.channel = new Float32Array(length)
  }

  getChannelData() {
    return this.channel
  }
}

class FakeAudioContext {
  readonly sampleRate = 8
  readonly destination = new FakeAudioNode()
  readonly gains: FakeGainNode[] = []
  readonly filters: FakeFilterNode[] = []
  readonly sources: FakeScheduledSource[] = []
  currentTime = 0
  state = 'suspended'
  resumeCalls = 0
  suspendCalls = 0
  closeCalls = 0

  createGain() {
    const node = new FakeGainNode()
    this.gains.push(node)
    return node
  }

  createBiquadFilter() {
    const node = new FakeFilterNode()
    this.filters.push(node)
    return node
  }

  createBufferSource() {
    const node = new FakeBufferSourceNode()
    this.sources.push(node)
    return node
  }

  createOscillator() {
    const node = new FakeOscillatorNode()
    this.sources.push(node)
    return node
  }

  createBuffer(...args: [channels: number, length: number, sampleRate: number]) {
    return new FakeAudioBuffer(args[1])
  }

  resume() {
    this.resumeCalls += 1
    this.state = 'running'
    return Promise.resolve()
  }

  suspend() {
    this.suspendCalls += 1
    this.state = 'suspended'
    return Promise.resolve()
  }

  close() {
    this.closeCalls += 1
    this.state = 'closed'
    return Promise.resolve()
  }
}

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

describe('resolveSpatialAudioTargets', () => {
  it('leaves the established weather path dry and the added room sources silent by default', () => {
    expect(resolveSpatialAudioTargets(null, 2)).toEqual({
      alarmTier: 2,
      weatherDryTarget: 1,
      weatherSpatialTarget: 0,
      weatherCutoffTarget: 12_000,
      roomToneTarget: 0,
      roomCutoffTarget: 180,
      roomHumFrequencyTarget: 54,
      roomHumTarget: 0,
    })
  })

  it('resolves the authored perspective exactly and applies only restrained alarm pressure', () => {
    const calm = resolveSpatialAudioTargets(concourseTreatment, 0)
    expect(calm).toEqual({
      alarmTier: 0,
      weatherDryTarget: 0,
      weatherSpatialTarget: 0.38,
      weatherCutoffTarget: 720,
      roomToneTarget: ROOM_TONE_CEILING * 0.85,
      roomCutoffTarget: 190,
      roomHumFrequencyTarget: 54,
      roomHumTarget: ROOM_HUM_CEILING * 0.42,
    })

    const pressure = resolveSpatialAudioTargets(concourseTreatment, 3)
    expect(pressure.alarmTier).toBe(3)
    expect(pressure.weatherSpatialTarget).toBe(calm.weatherSpatialTarget)
    expect(pressure.weatherCutoffTarget).toBe(calm.weatherCutoffTarget)
    expect(pressure.roomToneTarget).toBeGreaterThan(calm.roomToneTarget)
    expect(pressure.roomHumTarget).toBeGreaterThan(calm.roomHumTarget)
    expect(pressure.roomCutoffTarget).toBeLessThan(calm.roomCutoffTarget)
    // Added machinery remains below the quieter existing dust-bed ceiling.
    expect(pressure.roomToneTarget + pressure.roomHumTarget).toBeLessThan(
      describeBed('dust').ceiling,
    )
  })

  it('enforces both machinery ceilings after the hottest tier-3 multipliers', () => {
    const hottest: SceneAcousticTreatment = {
      ...concourseTreatment,
      roomLevel: 1,
      humLevel: 1,
    }
    const targets = resolveSpatialAudioTargets(hottest, 3)

    expect(targets.roomToneTarget).toBe(ROOM_TONE_CEILING)
    expect(targets.roomHumTarget).toBe(ROOM_HUM_CEILING)
    expect(targets.roomToneTarget).toBeLessThan(describeBed('dust').ceiling)
    expect(targets.roomHumTarget).toBeLessThan(describeBed('dust').ceiling)
  })

  it('clamps arbitrary alarm input to the canonical four tiers', () => {
    expect(resolveSpatialAudioTargets(concourseTreatment, -20).alarmTier).toBe(0)
    expect(resolveSpatialAudioTargets(concourseTreatment, 1.6).alarmTier).toBe(2)
    expect(resolveSpatialAudioTargets(concourseTreatment, 99).alarmTier).toBe(3)
    expect(resolveSpatialAudioTargets(concourseTreatment, Number.NaN).alarmTier).toBe(0)
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

    handle.setSpatialTreatment(concourseTreatment)
    handle.setAlarm(3)
    expect(ctor).not.toHaveBeenCalled()

    const snapshot = handle.getSnapshot()
    expect(snapshot.contextState).toBe('unbuilt')
    expect(snapshot.wantPlaying).toBe(false)
    expect(snapshot.spatialActive).toBe(true)
    expect(snapshot.alarmTier).toBe(3)
    handle.destroy()
  })

  it('accepts weather, scene, perspective, and alarm changes before start()', () => {
    // No global AudioContext at all: start() must be inert, and the pure setters
    // must still update the readable snapshot targets.
    const handle = createAmbientAudio()

    handle.setWeather('dust')
    handle.setSceneState('refusal')
    handle.setSpatialTreatment(concourseTreatment)
    handle.setAlarm(2)
    let snapshot = handle.getSnapshot()
    expect(snapshot.weather).toBe('dust')
    expect(snapshot.sceneState).toBe('refusal')
    expect(snapshot.contextState).toBe('unbuilt')
    expect(snapshot.spatialActive).toBe(true)
    expect(snapshot.alarmTier).toBe(2)
    expect(snapshot.weatherDryTarget).toBe(0)
    expect(snapshot.weatherSpatialTarget).toBe(concourseTreatment.weatherLevel)
    expect(snapshot.weatherCutoffTarget).toBe(concourseTreatment.weatherCutoffHz)
    expect(snapshot.roomHumFrequencyTarget).toBe(concourseTreatment.humHz)

    // Returning from the world restores Case 81/default's exact dry path without
    // constructing audio or losing the selected weather/scene intent.
    handle.setSpatialTreatment(null)
    snapshot = handle.getSnapshot()
    expect(snapshot.spatialActive).toBe(false)
    expect(snapshot.weatherDryTarget).toBe(1)
    expect(snapshot.weatherSpatialTarget).toBe(0)
    expect(snapshot.roomToneTarget).toBe(0)
    expect(snapshot.roomHumTarget).toBe(0)

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

  it('builds one fixed nine-source graph, morphs params in place, and tears down once', () => {
    const contexts: FakeAudioContext[] = []
    class TestAudioContext extends FakeAudioContext {
      constructor() {
        super()
        contexts.push(this)
      }
    }
    vi.stubGlobal('window', { AudioContext: TestAudioContext })

    const handle = createAmbientAudio()
    handle.setSpatialTreatment(concourseTreatment)
    handle.start()
    expect(contexts).toHaveLength(1)
    const graph = contexts[0]!
    expect(graph.sources).toHaveLength(9)
    graph.sources.forEach((source) => expect(source.startCalls).toBe(1))

    const portalTreatment: SceneAcousticTreatment = {
      weatherLevel: 0.32,
      weatherCutoffHz: 850,
      roomLevel: 0.9,
      roomCutoffHz: 170,
      humHz: 52,
      humLevel: 0.65,
    }
    handle.start()
    handle.setSpatialTreatment(portalTreatment)
    handle.setAlarm(3)
    handle.setSpatialTreatment(concourseTreatment)
    handle.setSpatialTreatment(portalTreatment)

    // Repeated start, alarm changes, and portal morphs only reschedule params.
    expect(graph.sources).toHaveLength(9)
    graph.sources.forEach((source) => expect(source.startCalls).toBe(1))

    // Creation order is part of this deliberately small fixed graph: master,
    // dry/wet weather routing, the two established beds, then room tone + hum.
    const weatherDry = graph.gains[1]!
    const weatherSpatial = graph.gains[2]!
    const roomTone = graph.gains[14]!
    const roomHumGain = graph.gains[16]!
    const weatherFilter = graph.filters[0]!
    const roomFilter = graph.filters[4]!
    const roomHum = graph.sources[8] as FakeOscillatorNode
    let snapshot = handle.getSnapshot()
    expect(weatherDry.gain.value).toBe(snapshot.weatherDryTarget)
    expect(weatherSpatial.gain.value).toBe(snapshot.weatherSpatialTarget)
    expect(weatherFilter.frequency.value).toBe(snapshot.weatherCutoffTarget)
    expect(roomTone.gain.value).toBe(snapshot.roomToneTarget)
    expect(roomFilter.frequency.value).toBe(snapshot.roomCutoffTarget)
    expect(roomHum.frequency.value).toBe(snapshot.roomHumFrequencyTarget)
    expect(roomHumGain.gain.value).toBe(snapshot.roomHumTarget)

    handle.setSpatialTreatment(null)
    snapshot = handle.getSnapshot()
    expect(snapshot.spatialActive).toBe(false)
    expect(weatherDry.gain.value).toBe(1)
    expect(weatherSpatial.gain.value).toBe(0)
    expect(weatherFilter.frequency.value).toBe(12_000)
    expect(roomTone.gain.value).toBe(0)
    expect(roomFilter.frequency.value).toBe(180)
    expect(roomHum.frequency.value).toBe(54)
    expect(roomHumGain.gain.value).toBe(0)
    // Case 81 keeps this bounded fixed-graph overhead for now; its added wet and
    // room paths are zero-gain while the established dry dust path remains unity.
    expect(graph.sources).toHaveLength(9)

    handle.destroy()
    handle.destroy()
    graph.sources.forEach((source) => {
      expect(source.stopCalls).toBe(1)
      expect(source.disconnectCalls).toBe(1)
    })
    expect(graph.closeCalls).toBe(1)
    expect(graph.state).toBe('closed')
  })
})

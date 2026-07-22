// Ambient audio — opt-in, DEFAULT OFF, zero assets, zero dependencies. Every
// sound is synthesized with the Web Audio API: filtered noise + slow LFOs only,
// no samples, no scheduling loops that accumulate.
//
// DISCIPLINE (mirrors rain.ts):
//   • No React in this file. It is a plain factory + destroy.
//   • Constructing the handle performs NO AudioContext work — nothing touches
//     Web Audio until start() runs inside a user gesture. This keeps the module
//     importable and constructible in the Node/jsdom test environment, and
//     honours the browser rule: never construct or resume an AudioContext
//     outside a user gesture.
//   • Two authored weather beds plus one normally-silent bounded-world room bed
//     are built once behind gains; switching state only ramps existing nodes (no
//     source churn).
//   • Scene state and spatial perspective drive gain/filter targets, always
//     ramped — never jumped while audible.
//
// The bed parameters (describeBed) and the scene→gain map (sceneGainMap) are
// PURE data, exported so tests can assert them without any Web Audio at all.
import type { SceneAcousticTreatment, SceneStateId } from '../game/types'

// The two weather beds this module authors. Case 77 is 'rain', Case 81 is 'dust'.
// A case whose scene weather is 'none' simply gets no bed (the hook keeps the
// audio stopped), so only these two are ever synthesized.
export type WeatherBedKind = 'rain' | 'dust'

// ── Bed parameters (pure) ────────────────────────────────────────────────────
// One filtered-noise element: its filter, centre/cutoff, resonance, and the
// linear level it contributes under the bed gain.
export interface BedElement {
  filterType: BiquadFilterType
  frequency: number
  q: number
  level: number
}

export interface BedSpec {
  kind: WeatherBedKind
  noiseColor: 'white' | 'brown'
  // Linear master ceiling for this bed. Ambience, not soundtrack: ~ -26 dBFS for
  // rain, quieter (~ -28 dBFS) for the drier dust room tone. 10^(dB/20): 0.05 ≈
  // -26 dB, 0.038 ≈ -28.4 dB. The scene bedMul multiplies UNDER this ceiling.
  ceiling: number
  // Primary noise element (the rain wash / the ventilation room tone).
  noise: BedElement
  // Secondary filtered-noise element — Case 77's faint city rumble. Absent for
  // the dust bed, which is stiller and uses a tonal hum instead.
  low?: BedElement
  // A faint tonal element — Case 81's 50/60 Hz-adjacent hum, kept BARELY audible.
  hum?: { frequency: number; level: number }
  // Slow amplitude LFO on the primary noise: the drizzle "breathing" (~26s, like
  // the visual) for rain; slower and shallower (stiller) for dust.
  drift: { periodSec: number; depth: number }
}

const rainBed: BedSpec = {
  kind: 'rain',
  noiseColor: 'white',
  ceiling: 0.05,
  // Band-passed white-noise rain wash, ~400–2500 Hz (centre ≈ 1000, broad Q).
  noise: { filterType: 'bandpass', frequency: 1000, q: 0.6, level: 0.9 },
  // Faint low rumble ~55–80 Hz, heavily lowpassed — the city under the drizzle.
  low: { filterType: 'lowpass', frequency: 72, q: 0.7, level: 0.4 },
  drift: { periodSec: 26, depth: 0.15 },
}

const dustBed: BedSpec = {
  kind: 'dust',
  noiseColor: 'brown',
  ceiling: 0.038,
  // Deep lowpassed brown-ish noise (<200 Hz) — the hall's ventilation room tone.
  noise: { filterType: 'lowpass', frequency: 180, q: 0.5, level: 0.7 },
  // A faint 50/60 Hz-adjacent hum kept barely present. The hall's identity is
  // quiet; this is the only tonal element and it never grows loud.
  hum: { frequency: 58, level: 0.05 },
  drift: { periodSec: 34, depth: 0.08 },
}

const beds: Record<WeatherBedKind, BedSpec> = { rain: rainBed, dust: dustBed }

// Pure accessor: the authored parameters for one bed. Exported for tests, which
// assert the two beds differ (filter kind, centre, colour, ceiling, elements).
export function describeBed(kind: WeatherBedKind): BedSpec {
  return beds[kind]
}

// ── Scene → gain/filter map (pure) ───────────────────────────────────────────
// Multipliers applied over the authored bed for each of the six scene states.
// Drive from the SAME resolved scene state the SceneStage uses. Ramped ~1.5s.
export interface SceneAudioTreatment {
  // Overall bed multiplier (on the master ceiling for that bed).
  bedMul: number
  // Multiplier on the tonal hum's level (Case 81 presses = a touch more hum).
  humMul: number
  // Multiplier on the primary noise filter frequency (Case 77 press = tighter).
  filterMul: number
}

// Rain (Case 77). Only neutral / tribunal / aftermath actually fire in play — the
// map has no deposition, so press/corroborate/refusal are authored for
// completeness but never resolve (see sceneStateFor). aftermath drops the bed to
// silence: the rain stops entirely, matching the visual weather suppression.
const rainScene: Record<SceneStateId, SceneAudioTreatment> = {
  neutral: { bedMul: 1.0, humMul: 1.0, filterMul: 1.0 },
  // Denser + slightly tighter band (one gain + one filter move).
  press: { bedMul: 1.12, humMul: 1.0, filterMul: 1.06 },
  corroborate: { bedMul: 0.85, humMul: 1.0, filterMul: 1.0 },
  refusal: { bedMul: 0.6, humMul: 1.0, filterMul: 1.0 },
  // Formal-quiet: pulled back and marginally narrowed.
  tribunal: { bedMul: 0.72, humMul: 1.0, filterMul: 0.96 },
  // The rain ceases. Bed fully stilled to match the suppressed weather.
  aftermath: { bedMul: 0.0, humMul: 0.0, filterMul: 1.0 },
}

// Dust (Case 81). The deposition case: press/corroborate/refusal all resolve in
// play. The room's identity is quiet, so every move is small — except refusal,
// where the bed drops noticeably: the room holds its breath.
const dustScene: Record<SceneStateId, SceneAudioTreatment> = {
  neutral: { bedMul: 1.0, humMul: 1.0, filterMul: 1.0 },
  // A touch more hum presence while a coercive statement is pressed.
  press: { bedMul: 1.05, humMul: 1.45, filterMul: 1.0 },
  corroborate: { bedMul: 0.88, humMul: 0.85, filterMul: 1.0 },
  // The witness refused: the bed and its hum fall away noticeably.
  refusal: { bedMul: 0.42, humMul: 0.55, filterMul: 1.0 },
  tribunal: { bedMul: 0.7, humMul: 0.9, filterMul: 1.0 },
  // Near-silence, bed stilled.
  aftermath: { bedMul: 0.28, humMul: 0.4, filterMul: 1.0 },
}

export const sceneGainMap: Record<WeatherBedKind, Record<SceneStateId, SceneAudioTreatment>> = {
  rain: rainScene,
  dust: dustScene,
}

// Pure accessor: the treatment for one (kind, state) pair. Total over both kinds
// and all six states (asserted by the test).
export function sceneAudioTreatment(
  kind: WeatherBedKind,
  state: SceneStateId,
): SceneAudioTreatment {
  return sceneGainMap[kind][state]
}

// ── Bounded-world acoustic perspective (pure) ───────────────────────────────
// The room layers live beneath their own hard ceilings. Even the loudest authored
// portal at alarm tier 3 remains quieter than either weather bed's ceiling.
export const ROOM_TONE_CEILING = 0.014
export const ROOM_HUM_CEILING = 0.0014

const OPEN_WEATHER_CUTOFF_HZ = 12_000
const REST_ROOM_CUTOFF_HZ = 180
const REST_HUM_HZ = 54

interface AlarmPressure {
  roomMul: number
  humMul: number
  cutoffMul: number
}

const alarmPressure: readonly [AlarmPressure, AlarmPressure, AlarmPressure, AlarmPressure] = [
  { roomMul: 1, humMul: 1, cutoffMul: 1 },
  { roomMul: 1.03, humMul: 1.08, cutoffMul: 0.98 },
  { roomMul: 1.07, humMul: 1.18, cutoffMul: 0.94 },
  { roomMul: 1.12, humMul: 1.3, cutoffMul: 0.9 },
]

export interface SpatialAudioTargets {
  alarmTier: number
  weatherDryTarget: number
  weatherSpatialTarget: number
  weatherCutoffTarget: number
  roomToneTarget: number
  roomCutoffTarget: number
  roomHumFrequencyTarget: number
  roomHumTarget: number
}

function clampAlarmTier(level: number): number {
  if (!Number.isFinite(level)) return 0
  return Math.max(0, Math.min(3, Math.round(level)))
}

function clampToCeiling(level: number, multiplier: number, ceiling: number): number {
  const target = level * multiplier * ceiling
  if (!Number.isFinite(target)) return 0
  return Math.max(0, Math.min(ceiling, target))
}

// Resolve exact runtime targets without touching Web Audio. `null` is the dry,
// existing two-bed mix used by Case 81 and every non-world surface.
export function resolveSpatialAudioTargets(
  treatment: SceneAcousticTreatment | null,
  alarmLevel: number,
): SpatialAudioTargets {
  const alarmTier = clampAlarmTier(alarmLevel)
  if (!treatment) {
    return {
      alarmTier,
      weatherDryTarget: 1,
      weatherSpatialTarget: 0,
      weatherCutoffTarget: OPEN_WEATHER_CUTOFF_HZ,
      roomToneTarget: 0,
      roomCutoffTarget: REST_ROOM_CUTOFF_HZ,
      roomHumFrequencyTarget: REST_HUM_HZ,
      roomHumTarget: 0,
    }
  }

  const pressure = alarmPressure[alarmTier]!
  return {
    alarmTier,
    weatherDryTarget: 0,
    weatherSpatialTarget: treatment.weatherLevel,
    weatherCutoffTarget: treatment.weatherCutoffHz,
    roomToneTarget: clampToCeiling(
      treatment.roomLevel,
      pressure.roomMul,
      ROOM_TONE_CEILING,
    ),
    roomCutoffTarget: treatment.roomCutoffHz * pressure.cutoffMul,
    roomHumFrequencyTarget: treatment.humHz,
    roomHumTarget: clampToCeiling(treatment.humLevel, pressure.humMul, ROOM_HUM_CEILING),
  }
}

// ── Runtime handle ───────────────────────────────────────────────────────────
export type AmbientContextState = 'unbuilt' | 'suspended' | 'running' | 'closed'

// A read-only view of the engine's intent and current targets, for lifecycle
// wiring and live verification (the pane may block audio by ear, but the target
// snapshot and context.state remain assertable via JS probes).
export interface AmbientAudioSnapshot {
  contextState: AmbientContextState
  // True once start() has been asked for and not yet stopped (the play intent).
  wantPlaying: boolean
  weather: WeatherBedKind
  sceneState: SceneStateId
  // Target values the ramps are heading toward (independent of mid-ramp reads).
  masterTarget: number
  rainBusTarget: number
  dustBusTarget: number
  rainBedTarget: number
  dustBedTarget: number
  dustHumTarget: number
  rainNoiseFreqTarget: number
  // Exact post-weather and synthesized-room targets. They make the acoustic
  // perspective falsifiable even when a headless browser mutes audible output.
  alarmTier: number
  spatialActive: boolean
  weatherDryTarget: number
  weatherSpatialTarget: number
  weatherCutoffTarget: number
  roomToneTarget: number
  roomCutoffTarget: number
  roomHumFrequencyTarget: number
  roomHumTarget: number
}

export interface AmbientAudioHandle {
  // Begin (or resume) the beds. MUST be called from a user gesture the first time
  // — it lazily constructs the AudioContext and resumes it. Idempotent.
  start(): void
  // Fade out and suspend. Keeps the graph for a later resume. Idempotent.
  stop(): void
  // Select the active bed (crossfades the buses). Safe before start().
  setWeather(kind: WeatherBedKind): void
  // Apply a scene state's gain/filter treatment (ramped ~1.5s). Safe before start().
  setSceneState(state: SceneStateId): void
  // Morph between the unoccluded weather bed and one authored bounded-world
  // perspective. Null restores the exact existing dry path (Case 81/default).
  setSpatialTreatment(treatment: SceneAcousticTreatment | null): void
  // Read-only canonical alarm pressure. Clamped to the four engine tiers.
  setAlarm(level: number): void
  isRunning(): boolean
  getSnapshot(): AmbientAudioSnapshot
  // Full teardown: cancel timers, remove listeners, disconnect nodes, close ctx.
  destroy(): void
}

const FADE_SECONDS = 2.5 // start / stop / weather crossfade
const SCENE_RAMP_SECONDS = 1.5 // scene-state gain/filter transitions
const SPATIAL_RAMP_SECONDS = 1.2 // concrete/weather perspective morph

type WindowWithWebkit = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }

function resolveAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  const w = window as WindowWithWebkit
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

function makeNoiseBuffer(ctx: AudioContext, color: 'white' | 'brown'): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 2)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  if (color === 'white') {
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1
  } else {
    // Brown-ish noise: leaky-integrated white, scaled back into range. Weights
    // the spectrum toward the lows the dust ventilation lives in.
    let last = 0
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
  }
  return buffer
}

export function createAmbientAudio(): AmbientAudioHandle {
  // Nothing below touches Web Audio until start(). Construction only sets intent.
  let ctx: AudioContext | null = null
  let built = false
  let wantPlaying = false
  let weather: WeatherBedKind = 'rain'
  let sceneState: SceneStateId = 'neutral'
  let spatialTreatment: SceneAcousticTreatment | null = null
  let alarmLevel = 0
  let suspendTimer: ReturnType<typeof setTimeout> | null = null

  // Graph nodes (null until buildGraph runs).
  let master: GainNode | null = null
  let rainBus: GainNode | null = null
  let dustBus: GainNode | null = null
  let rainBedGain: GainNode | null = null
  let dustBedGain: GainNode | null = null
  let rainBand: BiquadFilterNode | null = null
  let dustHumGain: GainNode | null = null
  let weatherDryGain: GainNode | null = null
  let weatherSpatialFilter: BiquadFilterNode | null = null
  let weatherSpatialGain: GainNode | null = null
  let roomFilter: BiquadFilterNode | null = null
  let roomToneGain: GainNode | null = null
  let roomHum: OscillatorNode | null = null
  let roomHumGain: GainNode | null = null
  const sources: AudioScheduledSourceNode[] = []

  // Target mirrors (so the snapshot is exact regardless of mid-ramp reads).
  let masterTarget = 0
  let rainBusTarget = 0
  let dustBusTarget = 0
  let rainBedTarget = 0
  let dustBedTarget = 0
  let dustHumTarget = 0
  let rainNoiseFreqTarget = rainBed.noise.frequency
  let spatialTargets = resolveSpatialAudioTargets(null, 0)

  function rampTo(param: AudioParam, value: number, seconds: number): void {
    if (!ctx) return
    const now = ctx.currentTime
    param.cancelScheduledValues(now)
    // Anchor the current value so the ramp starts where the sound actually is.
    param.setValueAtTime(param.value, now)
    param.linearRampToValueAtTime(value, now + seconds)
  }

  function buildGraph(): void {
    if (built || !ctx) return
    const context = ctx

    master = context.createGain()
    master.gain.value = 0
    master.connect(context.destination)

    // The existing weather buses retain a completely dry path. A bounded-world
    // treatment crossfades to the parallel low-passed path, so null leaves Case
    // 81's established dust bed bit-for-bit on the original route.
    weatherDryGain = context.createGain()
    weatherDryGain.gain.value = spatialTargets.weatherDryTarget
    weatherDryGain.connect(master)
    weatherSpatialFilter = context.createBiquadFilter()
    weatherSpatialFilter.type = 'lowpass'
    weatherSpatialFilter.frequency.value = spatialTargets.weatherCutoffTarget
    weatherSpatialFilter.Q.value = 0.35
    weatherSpatialGain = context.createGain()
    weatherSpatialGain.gain.value = spatialTargets.weatherSpatialTarget
    weatherSpatialFilter.connect(weatherSpatialGain).connect(master)

    // ── Rain bed ──────────────────────────────────────────────────────────
    rainBus = context.createGain()
    rainBus.gain.value = 0
    rainBus.connect(weatherDryGain)
    rainBus.connect(weatherSpatialFilter)
    rainBedGain = context.createGain()
    rainBedGain.gain.value = rainBed.ceiling
    rainBedGain.connect(rainBus)

    const rainNoise = context.createBufferSource()
    rainNoise.buffer = makeNoiseBuffer(context, rainBed.noiseColor)
    rainNoise.loop = true
    rainBand = context.createBiquadFilter()
    rainBand.type = rainBed.noise.filterType
    rainBand.frequency.value = rainBed.noise.frequency
    rainBand.Q.value = rainBed.noise.q
    const rainNoiseGain = context.createGain()
    rainNoiseGain.gain.value = rainBed.noise.level
    rainNoise.connect(rainBand).connect(rainNoiseGain).connect(rainBedGain)

    // Drizzle "breathing": a slow LFO adds ± depth to the noise gain.
    const rainLfo = context.createOscillator()
    rainLfo.type = 'sine'
    rainLfo.frequency.value = 1 / rainBed.drift.periodSec
    const rainLfoGain = context.createGain()
    rainLfoGain.gain.value = rainBed.drift.depth * rainBed.noise.level
    rainLfo.connect(rainLfoGain).connect(rainNoiseGain.gain)

    // Faint city rumble.
    const rainLowNoise = context.createBufferSource()
    rainLowNoise.buffer = makeNoiseBuffer(context, rainBed.noiseColor)
    rainLowNoise.loop = true
    const rainLow = context.createBiquadFilter()
    rainLow.type = rainBed.low!.filterType
    rainLow.frequency.value = rainBed.low!.frequency
    rainLow.Q.value = rainBed.low!.q
    const rainLowGain = context.createGain()
    rainLowGain.gain.value = rainBed.low!.level
    rainLowNoise.connect(rainLow).connect(rainLowGain).connect(rainBedGain)

    // ── Dust bed ──────────────────────────────────────────────────────────
    dustBus = context.createGain()
    dustBus.gain.value = 0
    dustBus.connect(weatherDryGain)
    dustBus.connect(weatherSpatialFilter)
    dustBedGain = context.createGain()
    dustBedGain.gain.value = dustBed.ceiling
    dustBedGain.connect(dustBus)

    const dustNoise = context.createBufferSource()
    dustNoise.buffer = makeNoiseBuffer(context, dustBed.noiseColor)
    dustNoise.loop = true
    const dustLp = context.createBiquadFilter()
    dustLp.type = dustBed.noise.filterType
    dustLp.frequency.value = dustBed.noise.frequency
    dustLp.Q.value = dustBed.noise.q
    const dustNoiseGain = context.createGain()
    dustNoiseGain.gain.value = dustBed.noise.level
    dustNoise.connect(dustLp).connect(dustNoiseGain).connect(dustBedGain)

    const dustLfo = context.createOscillator()
    dustLfo.type = 'sine'
    dustLfo.frequency.value = 1 / dustBed.drift.periodSec
    const dustLfoGain = context.createGain()
    dustLfoGain.gain.value = dustBed.drift.depth * dustBed.noise.level
    dustLfo.connect(dustLfoGain).connect(dustNoiseGain.gain)

    // Barely-audible tonal hum.
    const dustHum = context.createOscillator()
    dustHum.type = 'sine'
    dustHum.frequency.value = dustBed.hum!.frequency
    dustHumGain = context.createGain()
    dustHumGain.gain.value = dustBed.hum!.level
    dustHum.connect(dustHumGain).connect(dustBedGain)

    // ── Bounded-world room perspective ───────────────────────────────────
    // One quiet brown-noise ventilation source, one slow drift LFO, and one
    // transformer-like hum are constructed once with the weather beds. Their
    // gains rest at zero outside an authored world treatment.
    const roomNoise = context.createBufferSource()
    roomNoise.buffer = makeNoiseBuffer(context, 'brown')
    roomNoise.loop = true
    roomFilter = context.createBiquadFilter()
    roomFilter.type = 'lowpass'
    roomFilter.frequency.value = spatialTargets.roomCutoffTarget
    roomFilter.Q.value = 0.45
    const roomNoiseGain = context.createGain()
    roomNoiseGain.gain.value = 0.72
    roomToneGain = context.createGain()
    roomToneGain.gain.value = spatialTargets.roomToneTarget
    roomNoise.connect(roomFilter).connect(roomNoiseGain).connect(roomToneGain).connect(master)

    const roomLfo = context.createOscillator()
    roomLfo.type = 'sine'
    roomLfo.frequency.value = 1 / 31
    const roomLfoGain = context.createGain()
    roomLfoGain.gain.value = 0.72 * 0.06
    roomLfo.connect(roomLfoGain).connect(roomNoiseGain.gain)

    roomHum = context.createOscillator()
    roomHum.type = 'sine'
    roomHum.frequency.value = spatialTargets.roomHumFrequencyTarget
    roomHumGain = context.createGain()
    roomHumGain.gain.value = spatialTargets.roomHumTarget
    roomHum.connect(roomHumGain).connect(master)

    // Start every continuous source once. They never restart (no accumulation).
    sources.push(
      rainNoise,
      rainLowNoise,
      rainLfo,
      dustNoise,
      dustLfo,
      dustHum,
      roomNoise,
      roomLfo,
      roomHum,
    )
    sources.forEach((node) => node.start())

    built = true
  }

  // Apply the active-bed selection to the two buses. instant=true snaps (first
  // build); otherwise crossfades over FADE_SECONDS (a case switch).
  function applyWeather(instant: boolean): void {
    rainBusTarget = weather === 'rain' ? 1 : 0
    dustBusTarget = weather === 'dust' ? 1 : 0
    if (!built || !ctx || !rainBus || !dustBus) return
    if (instant) {
      const now = ctx.currentTime
      rainBus.gain.setValueAtTime(rainBusTarget, now)
      dustBus.gain.setValueAtTime(dustBusTarget, now)
    } else {
      rampTo(rainBus.gain, rainBusTarget, FADE_SECONDS)
      rampTo(dustBus.gain, dustBusTarget, FADE_SECONDS)
    }
  }

  function applyScene(): void {
    const rainT = sceneGainMap.rain[sceneState]
    const dustT = sceneGainMap.dust[sceneState]
    rainBedTarget = rainBed.ceiling * rainT.bedMul
    dustBedTarget = dustBed.ceiling * dustT.bedMul
    dustHumTarget = dustBed.hum!.level * dustT.humMul
    rainNoiseFreqTarget = rainBed.noise.frequency * rainT.filterMul
    if (!built || !ctx) return
    if (rainBedGain) rampTo(rainBedGain.gain, rainBedTarget, SCENE_RAMP_SECONDS)
    if (dustBedGain) rampTo(dustBedGain.gain, dustBedTarget, SCENE_RAMP_SECONDS)
    if (dustHumGain) rampTo(dustHumGain.gain, dustHumTarget, SCENE_RAMP_SECONDS)
    if (rainBand) rampTo(rainBand.frequency, rainNoiseFreqTarget, SCENE_RAMP_SECONDS)
  }

  function applySpatial(instant: boolean): void {
    spatialTargets = resolveSpatialAudioTargets(spatialTreatment, alarmLevel)
    if (
      !built ||
      !ctx ||
      !weatherDryGain ||
      !weatherSpatialFilter ||
      !weatherSpatialGain ||
      !roomFilter ||
      !roomToneGain ||
      !roomHum ||
      !roomHumGain
    ) {
      return
    }

    if (instant) {
      const now = ctx.currentTime
      weatherDryGain.gain.setValueAtTime(spatialTargets.weatherDryTarget, now)
      weatherSpatialGain.gain.setValueAtTime(spatialTargets.weatherSpatialTarget, now)
      weatherSpatialFilter.frequency.setValueAtTime(spatialTargets.weatherCutoffTarget, now)
      roomToneGain.gain.setValueAtTime(spatialTargets.roomToneTarget, now)
      roomFilter.frequency.setValueAtTime(spatialTargets.roomCutoffTarget, now)
      roomHum.frequency.setValueAtTime(spatialTargets.roomHumFrequencyTarget, now)
      roomHumGain.gain.setValueAtTime(spatialTargets.roomHumTarget, now)
      return
    }

    rampTo(weatherDryGain.gain, spatialTargets.weatherDryTarget, SPATIAL_RAMP_SECONDS)
    rampTo(weatherSpatialGain.gain, spatialTargets.weatherSpatialTarget, SPATIAL_RAMP_SECONDS)
    rampTo(
      weatherSpatialFilter.frequency,
      spatialTargets.weatherCutoffTarget,
      SPATIAL_RAMP_SECONDS,
    )
    rampTo(roomToneGain.gain, spatialTargets.roomToneTarget, SPATIAL_RAMP_SECONDS)
    rampTo(roomFilter.frequency, spatialTargets.roomCutoffTarget, SPATIAL_RAMP_SECONDS)
    rampTo(roomHum.frequency, spatialTargets.roomHumFrequencyTarget, SPATIAL_RAMP_SECONDS)
    rampTo(roomHumGain.gain, spatialTargets.roomHumTarget, SPATIAL_RAMP_SECONDS)
  }

  function start(): void {
    wantPlaying = true
    if (suspendTimer) {
      clearTimeout(suspendTimer)
      suspendTimer = null
    }
    if (!ctx) {
      const Ctor = resolveAudioContextCtor()
      if (!Ctor) return // no Web Audio (e.g. the test environment) — stay inert.
      ctx = new Ctor()
    }
    buildGraph()
    if (ctx.state === 'suspended') void ctx.resume()
    // First build snaps the bus selection so the correct bed is already up; scene
    // gains are set (no ramp visible under the master fade), then master fades in.
    applyWeather(true)
    applyScene()
    applySpatial(true)
    if (master) rampTo(master.gain, 1, FADE_SECONDS)
    masterTarget = 1
  }

  function stop(): void {
    wantPlaying = false
    masterTarget = 0
    if (!built || !ctx || !master) return
    rampTo(master.gain, 0, FADE_SECONDS)
    // Suspend once the fade has completed, freeing the audio thread. The guard
    // makes a start() during the fade cancel the pending suspend.
    if (suspendTimer) clearTimeout(suspendTimer)
    suspendTimer = setTimeout(
      () => {
        suspendTimer = null
        if (!wantPlaying && ctx && ctx.state === 'running') void ctx.suspend()
      },
      FADE_SECONDS * 1000 + 120,
    )
  }

  function setWeather(kind: WeatherBedKind): void {
    if (kind === weather) return
    weather = kind
    applyWeather(false)
  }

  function setSceneState(state: SceneStateId): void {
    if (state === sceneState) return
    sceneState = state
    applyScene()
  }

  function setSpatialTreatment(treatment: SceneAcousticTreatment | null): void {
    if (treatment === spatialTreatment) return
    spatialTreatment = treatment
    applySpatial(false)
  }

  function setAlarm(level: number): void {
    const tier = clampAlarmTier(level)
    if (tier === alarmLevel) return
    alarmLevel = tier
    applySpatial(false)
  }

  function onVisibility(): void {
    if (typeof document === 'undefined' || !ctx) return
    if (document.hidden) {
      // Hard pause when the tab is hidden, regardless of intent.
      if (ctx.state === 'running') void ctx.suspend()
    } else if (wantPlaying) {
      // Resume only if the setting is still on (start() set wantPlaying).
      if (ctx.state === 'suspended') void ctx.resume()
      if (master) rampTo(master.gain, 1, FADE_SECONDS)
      masterTarget = 1
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility)
  }

  function contextState(): AmbientContextState {
    if (!ctx) return 'unbuilt'
    return ctx.state as AmbientContextState
  }

  function isRunning(): boolean {
    return contextState() === 'running' && masterTarget > 0
  }

  function getSnapshot(): AmbientAudioSnapshot {
    return {
      contextState: contextState(),
      wantPlaying,
      weather,
      sceneState,
      masterTarget,
      rainBusTarget,
      dustBusTarget,
      rainBedTarget,
      dustBedTarget,
      dustHumTarget,
      rainNoiseFreqTarget,
      alarmTier: spatialTargets.alarmTier,
      spatialActive: spatialTreatment !== null,
      weatherDryTarget: spatialTargets.weatherDryTarget,
      weatherSpatialTarget: spatialTargets.weatherSpatialTarget,
      weatherCutoffTarget: spatialTargets.weatherCutoffTarget,
      roomToneTarget: spatialTargets.roomToneTarget,
      roomCutoffTarget: spatialTargets.roomCutoffTarget,
      roomHumFrequencyTarget: spatialTargets.roomHumFrequencyTarget,
      roomHumTarget: spatialTargets.roomHumTarget,
    }
  }

  function destroy(): void {
    wantPlaying = false
    if (suspendTimer) {
      clearTimeout(suspendTimer)
      suspendTimer = null
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibility)
    }
    if (ctx) {
      try {
        sources.forEach((node) => {
          try {
            node.stop()
          } catch {
            // A source that never started (or already stopped) throws; ignore.
          }
          node.disconnect()
        })
        master?.disconnect()
        rainBus?.disconnect()
        dustBus?.disconnect()
        rainBedGain?.disconnect()
        dustBedGain?.disconnect()
        rainBand?.disconnect()
        dustHumGain?.disconnect()
        weatherDryGain?.disconnect()
        weatherSpatialFilter?.disconnect()
        weatherSpatialGain?.disconnect()
        roomFilter?.disconnect()
        roomToneGain?.disconnect()
        roomHumGain?.disconnect()
      } catch {
        // Best-effort teardown: never throw out of destroy().
      }
      void ctx.close()
      ctx = null
    }
    sources.length = 0
    built = false
  }

  return {
    start,
    stop,
    setWeather,
    setSceneState,
    setSpatialTreatment,
    setAlarm,
    isRunning,
    getSnapshot,
    destroy,
  }
}

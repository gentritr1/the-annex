// Scene motion — the single-rAF loop for the Case 81 diorama, ported from the
// reviewed scene prototype under public/ (PART A JS). One requestAnimationFrame
// drives pointer drift of the plane group + hotspot mirror, the dust-mote
// weather, AND the ambient life (clerestory light sweep + amber service-strip
// dips, both time-derived from the frame clock), all with a capped delta time.
// It hard-pauses on document.hidden, gates on scene visibility
// (IntersectionObserver) and the reduced-motion signal, and fully tears down on
// unmount — the same discipline as src/ambience/rain.ts.
//
// The same frame() also composes the selection camera travel: when the live
// focus target (a ref-backed callback, like the alarm tier) names a hotspot,
// the plane group + hotspot mirror ease toward its projected position at the
// authored focus scale, hold while selected, and ease back on deselect — one
// transform writer, no CSS transitions, and under reduced motion an instant
// cut to the rest framing.
//
// It reads no content ids: the scene data (layers, hotspots, drift, weather,
// ambience, alarm tiers) is passed in, and the DOM hooks are generic class
// names + data attributes.
import type { SceneDefinition, SceneRect } from '../game/types'

export interface SceneMotionOptions {
  scene: SceneDefinition
  // Drift the plane group + hotspot mirror under the pointer (investigation only;
  // the tribunal/debrief world windows pass false — no parallax).
  parallax: boolean
  // Run the dust loop (diorama weather). Suppressed states clear it regardless.
  weather: boolean
  // Live reduced-motion signal (settings prop OR prefers-reduced-motion).
  getReducedMotion: () => boolean
  // Live civic-alarm tier (0–3) for the scene's alarm atmosphere table. Absent =
  // tier 0 everywhere (the base look).
  getAlarmTier?: () => number
  // Live selection focus: the selected hotspot's master-normalized coords, or
  // null at the rest framing. Ref-backed like the alarm tier — selection changes
  // never recreate the motion handle. Absent = no travel.
  getFocusTarget?: () => { x: number; y: number } | null
}

export interface SceneMotionHandle {
  // Re-evaluate the motion gate (call when the reduced-motion signal changes).
  sync(): void
  // Re-seed the dust motes (call when the alarm tier changes; count and fall
  // speed come from the scene's per-tier table).
  reseed(): void
  destroy(): void
}

interface Mote {
  v: SceneRect & { px: number; py: number; pw: number; ph: number }
  x: number
  y: number
  vy: number
  sway: number
  r: number
  a: number
}

export function createSceneMotion(
  root: HTMLElement,
  options: SceneMotionOptions,
): SceneMotionHandle {
  const { scene } = options
  const pgroup = root.querySelector<HTMLElement>('.scene-pgroup')
  const hgroup = root.querySelector<HTMLElement>('.scene-hgroup')
  const hazeFrame = root.querySelector<HTMLElement>('.scene-haze-frame')
  const canvas = root.querySelector<HTMLCanvasElement>('canvas.scene-weather')
  const ctx = canvas?.getContext('2d') ?? null
  const hotspots = Array.from(root.querySelectorAll<HTMLElement>('.scene-hotspot[data-site]'))
  // Optional composited figure (generic; data attributes only, no content ids).
  const figureEl = root.querySelector<HTMLElement>('.scene-figure')
  // Optional clerestory sweep band (generic class hook; period authored in
  // scene.ambience). Only present in diorama art that ships one.
  const sweepEl = root.querySelector<HTMLElement>('.scene-fx-sweep')

  const master = scene.master
  const FAR_SCALE = scene.layers.find((layer) => layer.name === 'far')?.scale ?? 1.4182
  const MAX_PARTICLES = scene.weather.maxParticles ?? 0
  const spawnVolumes = scene.weather.spawnVolumes ?? []
  const ambience = scene.ambience ?? null
  const alarmTiers = scene.alarm ?? null
  const travelCfg = scene.travel ?? null
  const minTargetPx = 44
  // Travel snap epsilon (container-fraction / scale units): sub-pixel at any
  // realistic stage width, far inside the 5% verification tolerance.
  const TRAVEL_EPS = 0.0008

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  const motionOK = () => !options.getReducedMotion() && !mq.matches

  let W = 0
  let H = 0
  let dpr = 1
  let win = { x: 0, y: 0, w: 1, h: 1 }
  let motes: Mote[] = []
  let raf = 0
  let last = 0
  let sceneVisible = true
  let px = 0
  let py = 0
  let gx = 0
  let gy = 0
  let lastFlicker = 1
  // Camera travel (selection focus). f* is the eased current value, t* the
  // target — the same easing-toward-target pattern as the drift's gx/gy. f* are
  // container fractions (x/y) and a unit scale (s). Each new focus (selection
  // change, deselect) opens a travel window of the authored duration on the
  // frame clock; the per-frame rate is derived from the live distance and the
  // REMAINING window, so the snap lands inside the authored duration even when
  // a mid-travel resize shifts the projected target (a resize alone never
  // re-opens the window — the framing tracks it instantly).
  let fx = 0
  let fy = 0
  let fs = 1
  let ttx = 0
  let tty = 0
  let tts = 1
  let focusKey = ''
  let travelEnd = 0
  let travelDirty = false

  function alarmTier() {
    return Math.max(0, Math.min(3, Math.round(options.getAlarmTier?.() ?? 0)))
  }

  // Crop window from live container aspect (slice math), identical to what the
  // SVG planes self-apply via preserveAspectRatio="xMidYMid slice".
  function computeWindow() {
    const A = W / H
    const M = master.w / master.h
    if (A >= M) win = { x: 0, y: (1 - M / A) / 2, w: 1, h: M / A }
    else win = { x: (1 - A / M) / 2, y: 0, w: A / M, h: 1 }
  }

  function layout() {
    computeWindow()
    // Project the figure's master-space anchor through the same crop window as the
    // hotspots (net plane scale is 1 at rest), so it sits on its plane's features.
    // Centre-anchored (CSS translate(-50%,-50%)); height scales with the window.
    if (figureEl) {
      const fx = Number(figureEl.dataset.x)
      const fy = Number(figureEl.dataset.y)
      const fh = Number(figureEl.dataset.h)
      if (Number.isFinite(fx) && Number.isFinite(fy) && Number.isFinite(fh)) {
        figureEl.style.left = `${((fx - win.x) / win.w) * 100}%`
        figureEl.style.top = `${((fy - win.y) / win.h) * 100}%`
        figureEl.style.height = `${(fh / win.h) * H}px`
      }
    }
    if (hazeFrame) {
      hazeFrame.style.left = `${(-win.x / win.w) * 100}%`
      hazeFrame.style.top = `${(-win.y / win.h) * 100}%`
      hazeFrame.style.width = `${100 / win.w}%`
      hazeFrame.style.height = `${100 / win.h}%`
      hazeFrame.style.transform = `scale(${FAR_SCALE})`
    }
    hotspots.forEach((el) => {
      const x = Number(el.dataset.x)
      const y = Number(el.dataset.y)
      const r = Number(el.dataset.r)
      el.style.left = `${((x - win.x) / win.w) * 100}%`
      el.style.top = `${((y - win.y) / win.h) * 100}%`
      const d = Math.max(2 * r * (W / win.w), minTargetPx)
      el.style.width = `${d}px`
      el.style.height = `${d}px`

      // Project the authored label offset (master-normalized fractions) into
      // container px through the same crop scaling, and displace the LABEL only.
      // Draw the leader from the marker centre to the label's top-centre so the
      // fanned label still reads as belonging to this point.
      const label = el.querySelector<HTMLElement>('.scene-hotspot-label')
      const leader = el.querySelector<HTMLElement>('.scene-hotspot-leader')
      const ldx = Number(el.dataset.ldx)
      const ldy = Number(el.dataset.ldy)
      const hasOffset = Number.isFinite(ldx) && Number.isFinite(ldy) && (ldx !== 0 || ldy !== 0)
      const dxPx = hasOffset ? (ldx * W) / win.w : 0
      const dyPx = hasOffset ? (ldy * H) / win.h : 0
      if (label) {
        label.style.transform = hasOffset
          ? `translate(calc(-50% + ${dxPx.toFixed(1)}px), ${dyPx.toFixed(1)}px)`
          : ''
      }
      if (leader) {
        const ax = dxPx
        const ay = d / 2 + 4 + dyPx
        const len = Math.hypot(ax, ay)
        const angle = (Math.atan2(ay, ax) * 180) / Math.PI
        leader.style.width = `${len.toFixed(1)}px`
        leader.style.transform = `rotate(${angle.toFixed(1)}deg)`
      }
    })
  }

  // Master rect → container px via the far-plane projection.
  function shaftPx(rect: SceneRect) {
    return {
      ...rect,
      px: (0.5 + ((rect.x - win.x) / win.w - 0.5) * FAR_SCALE) * W,
      py: (0.5 + ((rect.y - win.y) / win.h - 0.5) * FAR_SCALE) * H,
      pw: (rect.w / win.w) * FAR_SCALE * W,
      ph: (rect.h / win.h) * FAR_SCALE * H,
    }
  }

  function seedMotes() {
    motes = []
    // Per-tier dust (absolute authored values): the alarm table overrides the
    // weather defaults; tier 0's row reproduces them exactly.
    const tier = alarmTiers ? alarmTiers[alarmTier()] : null
    const maxParticles = tier?.maxParticles ?? MAX_PARTICLES
    const fall = tier?.fallSpeed ?? { min: 5, max: 13 }
    if (spawnVolumes.length === 0 || maxParticles === 0) return
    const vols = spawnVolumes.map(shaftPx)
    for (let i = 0; i < maxParticles; i += 1) {
      const v = vols[i % vols.length]
      motes.push({
        v,
        x: v.px + Math.random() * v.pw,
        y: v.py + Math.random() * v.ph,
        vy: fall.min + Math.random() * (fall.max - fall.min),
        sway: Math.random() * 6.28,
        r: 0.5 + Math.random() * 0.7,
        a: 0.08 + Math.random() * 0.14,
      })
    }
  }

  function drawMotes(t: number, dt: number) {
    if (!ctx) return
    ctx.clearRect(0, 0, W, H)
    const buckets: Mote[][] = [[], [], [], []]
    motes.forEach((m) => {
      m.y += m.vy * dt
      m.x += Math.sin(t / 2600 + m.sway) * 2.2 * dt
      if (m.y > m.v.py + m.v.ph + 6) {
        m.y = m.v.py - 4
        m.x = m.v.px + Math.random() * m.v.pw
      }
      buckets[Math.min(3, (m.a * 24) | 0)].push(m)
    })
    const alphas = [0.08, 0.12, 0.17, 0.22]
    ctx.fillStyle = 'oklch(0.72 0.018 210)'
    for (let b = 0; b < 4; b += 1) {
      if (!buckets[b].length) continue
      ctx.globalAlpha = alphas[b]
      ctx.beginPath()
      buckets[b].forEach((m) => {
        ctx.moveTo(m.x + m.r, m.y)
        ctx.arc(m.x, m.y, m.r, 0, 6.2832)
      })
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  function weatherAllowed() {
    if (!options.weather || !ctx) return false
    const stateId = root.dataset.sceneState ?? 'neutral'
    return !scene.weather.suppressed.includes(stateId as never)
  }

  // Selection camera travel: project the focused hotspot's master coords through
  // the live crop window (the same math layout() uses for the markers), clamp
  // the per-axis offset to the authored maxOffset, and ease f* toward it inside
  // the travel window opened for the current focus. A focused target uses
  // travelInMs, the rest framing uses settleOutMs.
  function stepTravel(t: number, dt: number) {
    if (!travelCfg) return
    const focus = options.getFocusTarget?.() ?? null
    const key = focus ? `${focus.x},${focus.y}` : ''
    if (key !== focusKey) {
      focusKey = key
      travelEnd = t + (focus ? travelCfg.travelInMs : travelCfg.settleOutMs)
    }
    let tx = 0
    let ty = 0
    let ts = 1
    if (focus) {
      const nx = (focus.x - win.x) / win.w - 0.5
      const ny = (focus.y - win.y) / win.h - 0.5
      const m = travelCfg.maxOffset
      tx = -Math.max(-m, Math.min(m, nx))
      ty = -Math.max(-m, Math.min(m, ny))
      ts = travelCfg.focusScale
    }
    ttx = tx
    tty = ty
    tts = ts
    const d0 = Math.max(Math.abs(ttx - fx), Math.abs(tty - fy), Math.abs(tts - fs))
    if (d0 <= TRAVEL_EPS || t >= travelEnd) {
      fx = ttx
      fy = tty
      fs = tts
      return
    }
    const rate = Math.log(d0 / TRAVEL_EPS) / ((travelEnd - t) / 1000)
    const step = 1 - Math.exp(-rate * dt)
    fx += (ttx - fx) * step
    fy += (tty - fy) * step
    fs += (tts - fs) * step
    if (
      Math.abs(ttx - fx) <= TRAVEL_EPS &&
      Math.abs(tty - fy) <= TRAVEL_EPS &&
      Math.abs(tts - fs) <= TRAVEL_EPS
    ) {
      fx = ttx
      fy = tty
      fs = tts
    }
  }

  function frame(t: number) {
    raf = requestAnimationFrame(frame)
    if (!last) last = t
    const dt = Math.min((t - last) / 1000, 0.05)
    last = t

    if (options.parallax) {
      gx += (px - gx) * 0.03
      gy += (py - gy) * 0.03
    }
    stepTravel(t, dt)

    // One transform writer: the selection travel composes with the pointer drift
    // right here — translate in screen px (container fractions × live size),
    // then the uniform focus scale, then the drift rotation (a uniform scale
    // commutes with the rotation). The hotspot mirror gets the identical string.
    const driftOn = options.parallax && Math.abs(gx) + Math.abs(gy) > 0.0004
    const travelOn = fx !== 0 || fy !== 0 || fs !== 1
    if (driftOn || travelOn) {
      const rot = `rotateX(${(-gy * scene.drift.pitchDeg).toFixed(3)}deg) rotateY(${(
        gx * scene.drift.yawDeg
      ).toFixed(3)}deg)`
      const tr = travelOn
        ? `translate(${(fx * W).toFixed(2)}px, ${(fy * H).toFixed(2)}px) scale(${fs.toFixed(4)}) ${rot}`
        : rot
      if (pgroup) pgroup.style.transform = tr
      if (hgroup) hgroup.style.transform = tr
      travelDirty = travelOn
    } else if (travelDirty) {
      // Settle-out snapped to the exact rest framing: clear the composed string
      // once so the rest state is byte-identical to never having travelled.
      if (pgroup) pgroup.style.transform = 'none'
      if (hgroup) hgroup.style.transform = 'none'
      travelDirty = false
    }

    // Ambient life on this same clock (both die with the loop: hidden tab,
    // off-screen scene, or reduced motion).
    if (ambience) {
      // Clerestory sweep: one soft band crossing the far plane per period.
      if (sweepEl) {
        const phase = (t % ambience.sweepPeriodMs) / ambience.sweepPeriodMs
        sweepEl.style.transform = `translateX(${(-110 + phase * 360).toFixed(1)}%)`
      }
      // Amber service-strip dip: three layered sinusoids crossing a high
      // threshold (~1 dip / 2 min, time-derived — never per-frame random).
      if (ambience.amberDipDepth > 0) {
        const w = Math.sin(t / 47000) + Math.sin(t / 11300 + 1.9) + Math.sin(t / 3100 + 4.1)
        const over = Math.max(0, Math.min(1, w - 2))
        const flicker = 1 - ambience.amberDipDepth * over
        if (Math.abs(flicker - lastFlicker) > 0.004) {
          lastFlicker = flicker
          root.style.setProperty('--amber-flicker', flicker.toFixed(3))
        }
      }
    }

    if (weatherAllowed()) drawMotes(t, dt)
    else if (ctx) ctx.clearRect(0, 0, W, H)
  }

  function start() {
    if (!raf && motionOK() && !document.hidden && sceneVisible) {
      last = 0
      raf = requestAnimationFrame(frame)
    }
  }

  function stop() {
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  }

  function sync() {
    if (motionOK()) {
      start()
    } else {
      stop()
      gx = gy = px = py = 0
      // Reduced motion: no travel at all — an instant cut to the rest framing,
      // matching how the drift dies (never a slowed tween).
      fx = fy = ttx = tty = 0
      fs = tts = 1
      focusKey = ''
      travelEnd = 0
      travelDirty = false
      if (pgroup) pgroup.style.transform = 'none'
      if (hgroup) hgroup.style.transform = 'none'
      if (ctx) ctx.clearRect(0, 0, W, H)
      // Park the ambience fully static: the sweep rests mid-frame and the amber
      // strip returns to its state opacity (no frozen mid-dip).
      if (sweepEl) sweepEl.style.transform = 'translateX(35%)'
      lastFlicker = 1
      root.style.removeProperty('--amber-flicker')
    }
  }

  function resize() {
    const rect = root.getBoundingClientRect()
    W = Math.max(1, rect.width)
    H = Math.max(1, rect.height)
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (canvas && ctx) {
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    layout()
    seedMotes()
    if (!motionOK() && ctx) ctx.clearRect(0, 0, W, H)
  }

  function onVisibility() {
    if (document.hidden) stop()
    else sync()
  }

  function onPointerMove(e: PointerEvent) {
    if (!motionOK()) return
    px = Math.max(-0.5, Math.min(0.5, e.clientX / window.innerWidth - 0.5))
    py = Math.max(-0.5, Math.min(0.5, e.clientY / window.innerHeight - 0.5))
  }

  const onMqChange = () => sync()
  mq.addEventListener('change', onMqChange)
  document.addEventListener('visibilitychange', onVisibility)

  let io: IntersectionObserver | null = null
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(
      (entries) => {
        sceneVisible = entries[0].isIntersecting
        if (sceneVisible) sync()
        else stop()
      },
      { threshold: 0.02 },
    )
    io.observe(root)
  }

  let ro: ResizeObserver | null = null
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => resize())
    ro.observe(root)
  } else {
    window.addEventListener('resize', resize)
  }

  const finePointer = window.matchMedia('(pointer: fine)').matches
  const usePointer = options.parallax && finePointer
  if (usePointer) {
    window.addEventListener('pointermove', onPointerMove, { passive: true })
  }

  resize()
  sync()

  return {
    sync,
    reseed: seedMotes,
    destroy() {
      stop()
      mq.removeEventListener('change', onMqChange)
      document.removeEventListener('visibilitychange', onVisibility)
      if (io) io.disconnect()
      if (ro) ro.disconnect()
      else window.removeEventListener('resize', resize)
      if (usePointer) window.removeEventListener('pointermove', onPointerMove)
      if (pgroup) pgroup.style.transform = 'none'
      if (hgroup) hgroup.style.transform = 'none'
      if (ctx) ctx.clearRect(0, 0, W, H)
      if (sweepEl) sweepEl.style.transform = ''
      root.style.removeProperty('--amber-flicker')
    },
  }
}

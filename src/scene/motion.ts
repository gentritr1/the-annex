// Scene motion — the single-rAF loop for the Case 81 diorama, ported from the
// reviewed scene prototype under public/ (PART A JS). One requestAnimationFrame
// drives pointer drift of the plane group + hotspot mirror AND the dust-mote
// weather, both with a capped delta time. It hard-pauses on document.hidden,
// gates on scene visibility
// (IntersectionObserver) and the reduced-motion signal, and fully tears down on
// unmount — the same discipline as src/ambience/rain.ts.
//
// It reads no content ids: the scene data (layers, hotspots, drift, weather) is
// passed in, and the DOM hooks are generic class names + data attributes.
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
}

export interface SceneMotionHandle {
  // Re-evaluate the motion gate (call when the reduced-motion signal changes).
  sync(): void
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

  const master = scene.master
  const FAR_SCALE = scene.layers.find((layer) => layer.name === 'far')?.scale ?? 1.4182
  const MAX_PARTICLES = scene.weather.maxParticles ?? 0
  const spawnVolumes = scene.weather.spawnVolumes ?? []
  const minTargetPx = 44

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
    if (spawnVolumes.length === 0 || MAX_PARTICLES === 0) return
    const vols = spawnVolumes.map(shaftPx)
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      const v = vols[i % vols.length]
      motes.push({
        v,
        x: v.px + Math.random() * v.pw,
        y: v.py + Math.random() * v.ph,
        vy: 5 + Math.random() * 8,
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

  function frame(t: number) {
    raf = requestAnimationFrame(frame)
    if (!last) last = t
    const dt = Math.min((t - last) / 1000, 0.05)
    last = t

    if (options.parallax) {
      gx += (px - gx) * 0.03
      gy += (py - gy) * 0.03
      if (Math.abs(gx) + Math.abs(gy) > 0.0004) {
        const tr = `rotateX(${(-gy * scene.drift.pitchDeg).toFixed(3)}deg) rotateY(${(
          gx * scene.drift.yawDeg
        ).toFixed(3)}deg)`
        if (pgroup) pgroup.style.transform = tr
        if (hgroup) hgroup.style.transform = tr
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
      if (pgroup) pgroup.style.transform = 'none'
      if (hgroup) hgroup.style.transform = 'none'
      if (ctx) ctx.clearRect(0, 0, W, H)
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
    },
  }
}

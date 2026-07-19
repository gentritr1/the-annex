// Rain module — extracted from public/ambience.html (PART A logic), ported
// verbatim where possible. Plain DOM/canvas, no React. Owns the drizzle canvas
// render loop, its capped delta-time rAF, the reduced-motion static texture,
// the hard pause on document.hidden, and the optional ≤~1° pointer parallax of
// a 3-D plane group. React (Atmosphere.tsx) wires the reduced-motion and
// scene-visibility gates by calling start()/stop()/drawStatic().

export interface RainOptions {
  /** Precipitation mask: fraction of virtual cells holding a streak (0.12 / 0.07). */
  mask: number
  /** Optional 3-D group to drift ≤~1° under the pointer (hero surface only). */
  parallaxTarget?: HTMLElement | null
}

export interface RainHandle {
  /** Begin animating (respects the internal document.hidden guard). */
  start(): void
  /** Cancel the rAF and lock the parallax group flat. */
  stop(): void
  /** Wipe the canvas to empty — the reduced-motion "no rain" appearance. */
  clear(): void
  /** Re-measure the backing store and reseed. */
  resize(): void
  /** Tear everything down: cancel rAF, disconnect observers/listeners. */
  destroy(): void
}

interface Drop {
  x: number
  y: number
  v: number
  len: number
  sl: number
}

export function createRain(canvas: HTMLCanvasElement, options: RainOptions): RainHandle {
  const ctx = canvas.getContext('2d')
  const parallaxTarget = options.parallaxTarget ?? null

  // Precipitation masking: the viewport is partitioned into virtual cells of
  // CELL px (≈ one streak length + spacing) and ~MASK of cells hold exactly one
  // falling streak at any instant. N = cells × MASK.
  const MASK = options.mask
  const CELL = 26

  let drops: Drop[] = []
  let W = 0
  let H = 0
  let raf = 0
  let last = 0
  let t0 = 0
  let wantRun = false
  let px = 0
  let py = 0
  let gx = 0
  let gy = 0 // pointer target / eased value

  function seed() {
    drops = []
    const n = Math.max(24, Math.round((W / CELL) * (H / CELL) * MASK))
    for (let i = 0; i < n; i++) {
      drops.push({
        x: Math.random() * (W + 60) - 30,
        y: Math.random() * (H + 60) - 30,
        v: 620 + Math.random() * 340, // px/s — drizzle, not storm
        len: 9 + Math.random() * 9,
        sl: -(0.045 + Math.random() * 0.03), // light municipal wind ≈ 3–4°
      })
    }
  }

  function resize() {
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    W = canvas.clientWidth
    H = canvas.clientHeight
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    seed()
    // Setting canvas.width already wiped the backing store; if motion is off we
    // leave it wiped so the surface reads exactly like today (no rain).
  }

  function clear() {
    // Reduced-motion appearance: canvas stopped and cleared (no static texture).
    if (!ctx) return
    ctx.clearRect(0, 0, W, H)
  }

  function frame(t: number) {
    if (!ctx) return
    raf = requestAnimationFrame(frame)
    if (!last) {
      last = t
      t0 = t
    }
    const dt = Math.min((t - last) / 1000, 0.05) // delta time, capped
    last = t
    // drizzle intensity drifts like weather, not UI (≈ 26s cycle)
    const alpha = 0.3 + 0.045 * Math.sin((t - t0) / 4200)
    ctx.clearRect(0, 0, W, H)
    ctx.strokeStyle = 'oklch(0.72 0.018 210 / ' + alpha.toFixed(3) + ')'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i]
      d.y += d.v * dt
      d.x += d.v * d.sl * dt
      if (d.y - d.len > H) {
        d.y = -10 - Math.random() * 60
        d.x = Math.random() * (W + 60) - 30
      }
      if (d.x < -40) d.x += W + 80
      ctx.moveTo(d.x, d.y)
      ctx.lineTo(d.x - d.sl * d.len, d.y - d.len)
    }
    ctx.stroke()
    // parallax: rotate the whole 3-D group ≤ ~1°; far planes lag by
    // construction. transform only, eased so it can be ignored.
    if (parallaxTarget) {
      gx += (px - gx) * 0.045
      gy += (py - gy) * 0.045
      if (Math.abs(gx) + Math.abs(gy) > 0.0004) {
        parallaxTarget.style.transform =
          'rotateX(' + (-gy * 0.9).toFixed(3) + 'deg) rotateY(' + (gx * 1.1).toFixed(3) + 'deg)'
      }
    }
  }

  function run() {
    if (!raf && wantRun && !document.hidden) {
      last = 0
      raf = requestAnimationFrame(frame)
    }
  }

  function start() {
    wantRun = true
    run()
  }

  function stop() {
    wantRun = false
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
    // parallax locks flat (mirrors the demo's reduced-motion branch)
    px = py = gx = gy = 0
    if (parallaxTarget) parallaxTarget.style.transform = 'none'
  }

  function onVisibility() {
    // hard pause when the tab is hidden; resume only if React still wants motion
    if (document.hidden) {
      if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    } else {
      run()
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!wantRun) return
    px = Math.max(-0.5, Math.min(0.5, e.clientX / window.innerWidth - 0.5))
    py = Math.max(-0.5, Math.min(0.5, e.clientY / window.innerHeight - 0.5))
  }

  // ── observers + listeners ──────────────────────────────────────────
  let ro: ResizeObserver | null = null
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => resize())
    ro.observe(canvas)
  } else {
    window.addEventListener('resize', resize)
  }
  document.addEventListener('visibilitychange', onVisibility)
  const finePointer = window.matchMedia('(pointer: fine)').matches
  const usePointer = Boolean(parallaxTarget) && finePointer
  if (usePointer) {
    window.addEventListener('pointermove', onPointerMove, { passive: true })
  }

  resize()

  function destroy() {
    wantRun = false
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
    if (ro) ro.disconnect()
    else window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', onVisibility)
    if (usePointer) window.removeEventListener('pointermove', onPointerMove)
  }

  return { start, stop, clear, resize, destroy }
}

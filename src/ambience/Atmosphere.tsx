// Atmosphere — React wrapper for the ambience layer extracted from
// public/ambience.html. Mounts the (optional) 4-plane parallax stack + the rain
// canvas, and wires the two motion gates (reducedMotion prop + matchMedia),
// scene visibility (IntersectionObserver), and full rAF cleanup on unmount.
//
// The whole layer is aria-hidden + pointer-events:none and is always rendered
// as a SIBLING placed before content — never a parent of interactive nodes.
import { useEffect, useRef } from 'react'
import { createRain, type RainHandle } from './rain'

interface AtmosphereProps {
  /** Precipitation mask fraction (0.12 hero/banner, 0.07 map). */
  mask: number
  /** Reduced-motion preference from game settings. */
  reducedMotion: boolean
  /** Force the rain stopped + cleared (e.g. a scene state where weather ceases,
   *  like Case 77's aftermath), independent of the motion gate. */
  suppress?: boolean
  /** Render the 4-plane depth stack + haze + vignette (hero surface only). */
  planes?: boolean
  /** Enable ≤~1° pointer parallax of the plane stack (hero surface only). */
  parallax?: boolean
  /** Hero art plugged into the marked plane (hero surface only). */
  heroImage?: string
  /** Extra class on the atmosphere root for per-surface positioning. */
  className?: string
}

export function Atmosphere({
  mask,
  reducedMotion,
  suppress = false,
  planes = false,
  parallax = false,
  heroImage,
  className,
}: AtmosphereProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pgroupRef = useRef<HTMLDivElement>(null)
  const reducedRef = useRef(reducedMotion)
  const suppressRef = useRef(suppress)
  const syncRef = useRef<() => void>(() => {})

  // Create the rain engine once per mount (StrictMode-safe: full teardown).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rain: RainHandle = createRain(canvas, {
      mask,
      parallaxTarget: parallax ? pgroupRef.current : null,
    })
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let sceneVisible = true

    // Both reduced-motion triggers converge here: the settings prop (mirrored
    // into reducedRef) and the OS-level media query. Weather suppression (a scene
    // state where rain ceases) folds in as a third stop condition.
    const motionOK = () => !reducedRef.current && !suppressRef.current && !mq.matches
    const sync = () => {
      if (motionOK() && sceneVisible) {
        rain.start()
      } else {
        rain.stop()
        // Reduced motion → wipe to empty so the surface reads like today (no
        // rain). Scrolled out of view (motion still on) → just leave the last
        // frame; it is off-screen and will resume on re-entry.
        if (!motionOK()) rain.clear()
      }
    }
    syncRef.current = sync

    const onMqChange = () => sync()
    mq.addEventListener('change', onMqChange)

    let io: IntersectionObserver | null = null
    const root = rootRef.current
    if (root && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          sceneVisible = entries[0].isIntersecting
          sync() // no rain cost while the surface is scrolled out of view
        },
        { threshold: 0.02 },
      )
      io.observe(root)
    }

    sync()

    return () => {
      mq.removeEventListener('change', onMqChange)
      if (io) io.disconnect()
      rain.destroy()
      syncRef.current = () => {}
    }
  }, [mask, parallax])

  // React to a live change of the in-app "Reduce motion" preference or the
  // weather-suppress signal without recreating the rain engine.
  useEffect(() => {
    reducedRef.current = reducedMotion
    suppressRef.current = suppress
    syncRef.current()
  }, [reducedMotion, suppress])

  const heroStyle = heroImage
    ? {
        // Scrim over the art so rain, sigils, and case copy keep their contrast
        // budget (gradient first = painted over the photo).
        background: `linear-gradient(to top, oklch(0.09 0 0 / 0.45), transparent 55%), url(${heroImage}) center / cover no-repeat`,
      }
    : undefined

  return (
    <div
      ref={rootRef}
      className={['ambience', className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      {planes && (
        <>
          <div className="pgroup" ref={pgroupRef}>
            {/* HERO PLUG POINT — real 16:9 art replaces the demo CSS stand-in;
                translateZ/scale are unchanged so sibling planes stay registered. */}
            <div className="plane plane-hero" style={heroStyle} />
            <div className="plane plane-far">
              <svg
                className="plane-svg"
                viewBox="0 0 1600 900"
                preserveAspectRatio="xMidYMax slice"
              >
                <path
                  fill="oklch(0.125 0.011 240)"
                  d="M0 900V742h110v-36h70v42h120v-58h18v-26h8v26h18v46h126v-36h90v52h130v-40h70v-44h8v-28h6v28h8v56h118v-28h130v52h120v-44h90v40h120v-44h16v-24h8v24h8v36h108v-24h100v188Z"
                />
                <g fill="oklch(0.72 0.018 210 / .08)">
                  <rect x="356" y="716" width="3" height="5" />
                  <rect x="583" y="722" width="3" height="5" />
                  <rect x="906" y="742" width="3" height="5" />
                  <rect x="1268" y="730" width="3" height="5" />
                </g>
              </svg>
            </div>
            <div className="plane plane-mid">
              <svg
                className="plane-svg"
                viewBox="0 0 1600 900"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
              >
                <g stroke="oklch(0.21 0.016 240)" strokeOpacity=".9" strokeWidth="1.5">
                  <path d="M-60 170C260 248 640 254 980 190s460-56 700-16" />
                  <path d="M-60 200C300 272 700 276 1080 214s400-42 600-10" />
                  <path d="M212-10v252M180 44h64M188 82h48" />
                  <path d="M212 150l-16 30M212 150l16 30" />
                </g>
              </svg>
            </div>
            <div className="plane plane-near">
              <svg
                className="plane-svg"
                viewBox="0 0 1600 900"
                preserveAspectRatio="xMinYMax slice"
              >
                <g fill="oklch(0.055 0.007 240)">
                  <path d="M0 900V812h520v88Z" />
                  <rect x="0" y="798" width="520" height="14" />
                  <rect x="60" y="752" width="120" height="46" />
                  <rect x="86" y="738" width="72" height="14" />
                  <rect x="240" y="740" width="6" height="60" />
                  <rect x="300" y="740" width="6" height="60" />
                  <rect x="360" y="740" width="6" height="60" />
                  <rect x="420" y="740" width="6" height="60" />
                  <rect x="228" y="734" width="262" height="6" />
                </g>
              </svg>
            </div>
          </div>
          <div className="haze" />
        </>
      )}
      <canvas ref={canvasRef} className="ambience-rain" />
      {planes && <div className="vignette" />}
    </div>
  )
}

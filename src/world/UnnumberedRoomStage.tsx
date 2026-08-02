import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { UnnumberedReadingRoomDefinition } from '../game/types'
import type {
  UnnumberedRoomHandle,
  UnnumberedRoomInteractionSelection,
} from './createUnnumberedRoom'
import { containedPosterAnchor } from './posterProjection'

export interface UnnumberedRoomStageProps {
  room: UnnumberedReadingRoomDefinition
  active: boolean
  reducedMotion: boolean
  activePointId?: string
  openedPointIds?: readonly string[]
  activeInteraction?: UnnumberedRoomInteractionSelection
  onPointActivate: (pointId: string, sourceButton: HTMLButtonElement) => void
}

type RendererState = 'poster' | 'loading' | 'webgl' | 'fallback'

const rootStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  isolation: 'isolate',
  containerType: 'size',
  background:
    'radial-gradient(circle at 50% 32%, oklch(0.32 0.035 78 / 0.42), transparent 25%), linear-gradient(180deg, oklch(0.15 0.012 70), oklch(0.075 0.009 70) 72%)',
}

const fullLayerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
}

const pointButtonStyle: CSSProperties = {
  position: 'absolute',
  zIndex: 4,
  width: 48,
  height: 48,
  minWidth: 48,
  minHeight: 48,
  margin: 0,
  padding: 0,
  border: 0,
  borderRadius: '50%',
  background: 'transparent',
  transform: 'translate(-50%, -50%)',
  cursor: 'pointer',
  touchAction: 'manipulation',
}

const pointRingStyle: CSSProperties = {
  position: 'absolute',
  inset: 5,
  display: 'grid',
  placeItems: 'center',
  border: '1.5px solid currentColor',
  borderRadius: '50%',
  background: 'oklch(0.08 0.008 70 / 0.72)',
  boxShadow:
    'inset 0 0 0 4px oklch(0.08 0.008 70 / 0.58), 0 0 18px color-mix(in oklch, currentColor 22%, transparent)',
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  fontSize: '0.67rem',
  fontWeight: 800,
  lineHeight: 1,
  pointerEvents: 'none',
}

const pointLabelStyle: CSSProperties = {
  position: 'absolute',
  top: 51,
  left: '50%',
  maxWidth: 180,
  padding: '4px 7px',
  color: 'currentColor',
  background: 'oklch(0.075 0.008 70 / 0.88)',
  border: '1px solid color-mix(in oklch, currentColor 22%, transparent)',
  borderRadius: 3,
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  fontSize: '0.68rem',
  fontWeight: 700,
  lineHeight: 1.2,
  letterSpacing: '0.025em',
  whiteSpace: 'nowrap',
  transform: 'translateX(-50%)',
  pointerEvents: 'none',
}

function staticRoomLayer() {
  return (
    <div
      className="unnumbered-room-static"
      aria-hidden="true"
      style={{
        ...fullLayerStyle,
        zIndex: 0,
        overflow: 'hidden',
        background:
          'linear-gradient(90deg, oklch(0.08 0.009 70 / 0.96) 0 8%, transparent 8% 92%, oklch(0.08 0.009 70 / 0.96) 92%), linear-gradient(180deg, oklch(0.2 0.018 75 / 0.74), transparent 31%), radial-gradient(ellipse at 50% 76%, oklch(0.37 0.04 80 / 0.3), transparent 43%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '9%',
          right: '9%',
          top: '10%',
          bottom: '12%',
          border: '1px solid oklch(0.58 0.035 78 / 0.24)',
          boxShadow:
            'inset 0 0 70px oklch(0.03 0.005 70 / 0.82), 0 30px 80px oklch(0.02 0.004 70 / 0.5)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '23%',
          right: '23%',
          bottom: '35%',
          left: '23%',
          overflow: 'hidden',
          backgroundImage:
            "linear-gradient(180deg, oklch(0.05 0.008 220 / 0.28), transparent 52%), url('/images/civic-archive.webp')",
          backgroundPosition: 'center 58%',
          backgroundSize: 'cover',
          border: '6px solid oklch(0.55 0.07 75 / 0.58)',
          boxShadow:
            '0 0 0 1px oklch(0.9 0.04 78 / 0.18), 0 16px 50px oklch(0.02 0.004 70 / 0.72)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(90deg, transparent 0 24%, oklch(0.48 0.055 185 / 0.54) 24% 24.6%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '52%',
            right: 0,
            left: 0,
            height: 1,
            background: 'oklch(0.7 0.08 76 / 0.56)',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: '21%',
          right: '21%',
          bottom: '20%',
          height: '15%',
          border: '1px solid oklch(0.62 0.055 78 / 0.38)',
          background:
            'linear-gradient(180deg, oklch(0.25 0.025 70 / 0.72), oklch(0.09 0.01 70 / 0.9))',
          transform: 'perspective(700px) rotateX(61deg)',
          transformOrigin: 'bottom',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '16%',
          width: 1,
          height: '63%',
          background: 'oklch(0.72 0.075 80 / 0.3)',
          boxShadow: '0 0 42px 15px oklch(0.58 0.06 78 / 0.08)',
        }}
      />
    </div>
  )
}

/**
 * Progressive enhancement for the unnumbered reading room. The DOM controls are
 * the complete interaction surface; the dynamically imported renderer only
 * supplies spatial projection, light, and bounded camera emphasis.
 */
export function UnnumberedRoomStage({
  room,
  active,
  reducedMotion,
  activePointId,
  openedPointIds = [],
  activeInteraction,
  onPointActivate,
}: UnnumberedRoomStageProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<UnnumberedRoomHandle | null>(null)
  const pointButtonsRef = useRef(new Map<string, HTMLButtonElement>())
  const activePointRef = useRef(activePointId)
  const openedPointsRef = useRef(openedPointIds)
  const activeInteractionRef = useRef(activeInteraction)
  const [rendererState, setRendererState] = useState<RendererState>('poster')
  const [loopRunning, setLoopRunning] = useState(false)

  useEffect(() => {
    if (!active || reducedMotion) return
    const root = rootRef.current
    if (!root) return

    const abort = new AbortController()
    let disposed = false
    queueMicrotask(() => {
      if (!disposed) setRendererState('loading')
    })

    void import('./createUnnumberedRoom')
      .then(({ createUnnumberedRoom }) =>
        createUnnumberedRoom({
          root,
          room,
          pointButtons: pointButtonsRef.current,
          signal: abort.signal,
          onContextLost: () => {
            if (disposed) return
            handleRef.current = null
            setRendererState('fallback')
            setLoopRunning(false)
          },
          onLoopChange: (running) => {
            if (!disposed) setLoopRunning(running)
          },
        }),
      )
      .then((handle) => {
        if (!handle) {
          if (!disposed) setRendererState('fallback')
          return
        }
        if (disposed) {
          handle.destroy()
          return
        }
        handleRef.current = handle
        handle.setActivePoint(activePointRef.current)
        handle.setOpenedPoints(openedPointsRef.current)
        handle.setActiveInteraction(activeInteractionRef.current)
        setRendererState('webgl')
      })
      .catch((error: unknown) => {
        if (disposed || abort.signal.aborted) return
        if (import.meta.env.DEV) {
          console.warn('The unnumbered room fell back to its static rendering.', error)
        }
        setRendererState('fallback')
        setLoopRunning(false)
      })

    return () => {
      disposed = true
      abort.abort()
      handleRef.current?.destroy()
      handleRef.current = null
      queueMicrotask(() => setRendererState('poster'))
    }
  }, [active, reducedMotion, room])

  useEffect(() => {
    activePointRef.current = activePointId
    handleRef.current?.setActivePoint(activePointId)
  }, [activePointId])

  useEffect(() => {
    openedPointsRef.current = openedPointIds
    handleRef.current?.setOpenedPoints(openedPointIds)
  }, [openedPointIds])

  useEffect(() => {
    activeInteractionRef.current = activeInteraction
    handleRef.current?.setActiveInteraction(activeInteraction)
  }, [activeInteraction])

  useLayoutEffect(() => {
    if (rendererState === 'webgl') handleRef.current?.invalidate()
  }, [rendererState])

  const effectiveRendererState = !active || reducedMotion ? 'poster' : rendererState
  const webglVisible = effectiveRendererState === 'webgl'

  return (
    <div
      className="unnumbered-room-stage"
      data-active={active ? 'true' : 'false'}
      data-renderer={effectiveRendererState}
      data-room-id={room.id}
      data-room-loop={active && !reducedMotion && loopRunning ? 'running' : 'idle'}
      ref={rootRef}
      style={rootStyle}
    >
      <span className="sr-only unnumbered-room-introduction">
        {room.accessibleIntroduction}
      </span>
      <div
        style={{
          ...fullLayerStyle,
          zIndex: 0,
          opacity: webglVisible ? 0 : 1,
          transition: reducedMotion ? 'none' : 'opacity 180ms var(--ease-out)',
        }}
      >
        {staticRoomLayer()}
      </div>
      <div
        className="unnumbered-room-canvas-host"
        aria-hidden="true"
        style={{
          ...fullLayerStyle,
          zIndex: 1,
          opacity: webglVisible ? 1 : 0,
          transition: reducedMotion ? 'none' : 'opacity 180ms var(--ease-out)',
          pointerEvents: 'none',
        }}
      />
      <div
        className="unnumbered-room-points"
        style={{ ...fullLayerStyle, zIndex: 3, pointerEvents: 'none' }}
      >
        {room.readingPoints.map((point) => {
          const selected = activePointId === point.id
          const opened = openedPointIds.includes(point.id)
          const color = selected
            ? 'var(--amber-soft)'
            : opened
              ? 'var(--cyan)'
              : 'var(--record)'
          const labelShift =
            point.placement === 'left' ? 34 : point.placement === 'right' ? -34 : 0

          return (
            <button
              className="unnumbered-room-point"
              type="button"
              data-point-id={point.id}
              data-placement={point.placement}
              data-active={selected ? 'true' : undefined}
              data-opened={opened ? 'true' : undefined}
              aria-label={`${opened ? 'Review' : 'Inspect'} ${point.title}. ${point.meta}`}
              aria-pressed={selected}
              disabled={!active}
              tabIndex={active ? 0 : -1}
              key={point.id}
              ref={(element) => {
                if (element) pointButtonsRef.current.set(point.id, element)
                else pointButtonsRef.current.delete(point.id)
              }}
              onClick={(event) => {
                if (!active) return
                onPointActivate(point.id, event.currentTarget)
              }}
              style={{
                ...pointButtonStyle,
                ...containedPosterAnchor(point.posterAnchor),
                color,
                opacity: active ? 1 : 0,
                pointerEvents: active ? 'auto' : 'none',
              }}
            >
              <span className="unnumbered-room-point-ring" style={pointRingStyle}>
                {point.markerGlyph}
              </span>
              <span
                className="unnumbered-room-point-label"
                aria-hidden="true"
                style={{
                  ...pointLabelStyle,
                  left: `calc(50% + ${labelShift}px)`,
                  color,
                }}
              >
                {point.title}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

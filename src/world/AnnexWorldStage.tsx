import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type {
  SceneWorldDefinition,
  SiteDefinition,
  SiteId,
} from '../game/types'
import type { AnnexWorldHandle } from './createAnnexWorld'
import { containedPosterAnchor } from './posterProjection'

interface AnnexWorldStageProps {
  world: SceneWorldDefinition
  sites: readonly SiteDefinition[]
  completedSiteIds: readonly SiteId[]
  selectedSiteId?: SiteId
  active: boolean
  reducedMotion: boolean
  alarmLevel: number
  onPortalActivate: (siteId: SiteId, sourceElement: HTMLButtonElement) => void
}

type RendererState = 'poster' | 'loading' | 'webgl' | 'fallback'

const rootStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  background: 'var(--night)',
  isolation: 'isolate',
  containerType: 'size',
}

const fullLayerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
}

const portalButtonStyle: CSSProperties = {
  position: 'absolute',
  zIndex: 3,
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

const portalRingStyle: CSSProperties = {
  position: 'absolute',
  inset: 6,
  border: '1.5px solid var(--record)',
  borderRadius: '50%',
  background: 'oklch(0.09 0 0 / 0.32)',
  boxShadow: 'inset 0 0 0 5px oklch(0.09 0 0 / 0.38)',
  pointerEvents: 'none',
}

const portalCodeStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  color: 'currentColor',
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  fontSize: '0.62rem',
  fontWeight: 800,
  lineHeight: 1,
  letterSpacing: '0.02em',
}

const portalLabelStyle: CSSProperties = {
  position: 'absolute',
  top: 50,
  left: '50%',
  maxWidth: 150,
  padding: '4px 7px',
  color: 'var(--record)',
  background: 'oklch(0.09 0 0 / 0.82)',
  borderRadius: 4,
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  fontSize: '0.68rem',
  fontWeight: 700,
  lineHeight: 1.2,
  letterSpacing: '0.035em',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
}

function portalName(sites: readonly SiteDefinition[], siteId: SiteId): string {
  return sites.find((site) => site.id === siteId)?.name ?? siteId
}

function portalIndex(sites: readonly SiteDefinition[], siteId: SiteId): string {
  return sites.find((site) => site.id === siteId)?.index ?? '·'
}

/**
 * Progressive enhancement for the Case 77 concourse. The approved poster and
 * the real DOM location switcher remain complete without WebGL; this layer adds
 * a bounded pointer view and never owns canonical game state.
 */
export function AnnexWorldStage({
  world,
  sites,
  completedSiteIds,
  selectedSiteId,
  active,
  reducedMotion,
  alarmLevel,
  onPortalActivate,
}: AnnexWorldStageProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<AnnexWorldHandle | null>(null)
  const portalButtonsRef = useRef(new Map<SiteId, HTMLButtonElement>())
  const selectedRef = useRef(selectedSiteId)
  const completedRef = useRef(completedSiteIds)
  const alarmRef = useRef(alarmLevel)
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

    void import('./createAnnexWorld')
      .then(({ createAnnexWorld }) =>
        createAnnexWorld({
          root,
          world,
          sites,
          portalButtons: portalButtonsRef.current,
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
          handle?.destroy()
          return
        }
        handleRef.current = handle
        handle.setSelection(selectedRef.current)
        handle.setCompleted(completedRef.current)
        handle.setAlarm(alarmRef.current)
        setRendererState('webgl')
      })
      .catch((error: unknown) => {
        if (disposed || abort.signal.aborted) return
        if (import.meta.env.DEV) console.warn('Annex WebGL world fell back to its poster.', error)
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
  }, [active, reducedMotion, sites, world])

  useEffect(() => {
    selectedRef.current = selectedSiteId
    handleRef.current?.setSelection(selectedSiteId)
  }, [selectedSiteId])

  useEffect(() => {
    completedRef.current = completedSiteIds
    handleRef.current?.setCompleted(completedSiteIds)
  }, [completedSiteIds])

  useEffect(() => {
    alarmRef.current = alarmLevel
    handleRef.current?.setAlarm(alarmLevel)
  }, [alarmLevel])

  useLayoutEffect(() => {
    if (rendererState === 'webgl') {
      // The WebGL renderer owns live portal projection. React has just committed
      // the poster anchors from the loading render, so schedule one renderer-
      // owned frame to replace them with clamped screen-space coordinates.
      handleRef.current?.invalidate()
    }
  }, [rendererState])

  const effectiveRendererState = !active || reducedMotion ? 'poster' : rendererState
  const webglVisible = effectiveRendererState === 'webgl'
  const posterOpacity = webglVisible ? 0 : 1
  const alarmTier = Math.max(0, Math.min(3, Math.round(alarmLevel)))

  return (
    <div
      className="annex-world-stage"
      data-active={active ? 'true' : 'false'}
      data-alarm={alarmTier}
      data-renderer={effectiveRendererState}
      data-world-loop={active && !reducedMotion && loopRunning ? 'running' : 'idle'}
      ref={rootRef}
      style={rootStyle}
    >
      <img
        src={world.posterSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          ...fullLayerStyle,
          zIndex: 0,
          display: 'block',
          objectFit: 'contain',
          opacity: posterOpacity,
          transition: reducedMotion ? 'none' : 'opacity 180ms var(--ease-out)',
          userSelect: 'none',
        }}
      />
      <div
        className="annex-world-canvas-host"
        aria-hidden="true"
        style={{
          ...fullLayerStyle,
          zIndex: 1,
          opacity: webglVisible ? 1 : 0,
          transition: reducedMotion ? 'none' : 'opacity 180ms var(--ease-out)',
          pointerEvents: webglVisible && active ? 'auto' : 'none',
        }}
      />
      <div
        className="annex-world-portals"
        style={{ ...fullLayerStyle, zIndex: 2, pointerEvents: 'none' }}
      >
        {world.portals.map((portal) => {
          const filed = completedSiteIds.includes(portal.siteId)
          const selected = selectedSiteId === portal.siteId
          const color = filed ? 'var(--cyan)' : selected ? 'var(--amber-soft)' : 'var(--record)'
          const liftLabel = portal.posterAnchor.x > 0.55 && portal.posterAnchor.x < 0.8
          const raiseLabel = liftLabel || portal.posterAnchor.x < 0.25
          const lowerRightLabel = portal.posterAnchor.x > 0.8
          const labelShift =
            portal.posterAnchor.x < 0.25 ? 42 : portal.posterAnchor.x > 0.8 ? -50 : 0
          const name = portalName(sites, portal.siteId)
          return (
            <button
              type="button"
              className="annex-world-portal"
              data-filed={filed ? 'true' : undefined}
              data-selected={selected ? 'true' : undefined}
              data-site={portal.siteId}
              aria-label={`Enter ${name}`}
              key={portal.siteId}
              ref={(element) => {
                if (element) portalButtonsRef.current.set(portal.siteId, element)
                else portalButtonsRef.current.delete(portal.siteId)
              }}
              title={name}
              onPointerEnter={() => handleRef.current?.setPreview(portal.siteId)}
              onPointerLeave={() => handleRef.current?.setPreview(undefined)}
              onPointerCancel={() => handleRef.current?.setPreview(undefined)}
              onFocus={() => handleRef.current?.setPreview(portal.siteId)}
              onBlur={() => handleRef.current?.setPreview(undefined)}
              onClick={(event) => onPortalActivate(portal.siteId, event.currentTarget)}
              style={{
                ...portalButtonStyle,
                ...containedPosterAnchor(portal.posterAnchor),
                color,
                opacity: active ? 1 : 0,
                pointerEvents: active ? 'auto' : 'none',
              }}
            >
              <span
                className="annex-world-portal-ring"
                style={{ ...portalRingStyle, borderColor: color }}
              >
                <span className="annex-world-portal-code" style={portalCodeStyle}>
                  {portalIndex(sites, portal.siteId)}
                </span>
              </span>
              <span
                className="annex-world-portal-label"
                style={{
                  ...portalLabelStyle,
                  top: raiseLabel ? -28 : lowerRightLabel ? 78 : 50,
                  left: `calc(50% + ${labelShift}px)`,
                }}
              >
                {name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

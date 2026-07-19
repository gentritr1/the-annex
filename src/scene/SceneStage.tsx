// SceneStage — the shared shell that renders a case's scene. It reads only scene
// DATA + a resolved SceneStateId (computed by sceneStateFor); it holds no
// content-id literals. Two paint paths, chosen by whether the scene ships diorama
// art (LayerArt):
//   • diorama (Case 81): the 4-plane perspective stack + haze + dust canvas,
//     animated by createSceneMotion (drift + weather in one rAF).
//   • flat (Case 77): the existing civic-archive map + rain (Atmosphere) + the
//     scrim/center treatment layers.
// The hotspot overlay (real buttons, NOT aria-hidden) mirrors the plane
// transforms and is wayfinding to the site cards; the art stack is aria-hidden.
import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { Atmosphere } from '../ambience/Atmosphere'
import type { SceneDefinition, SceneStateId, SiteDefinition, SiteId } from '../game/types'
import { createSceneMotion, type SceneMotionHandle } from './motion'

interface SceneStageProps {
  scene: SceneDefinition
  sceneState: SceneStateId
  reducedMotion: boolean
  // Render the interactive hotspot overlay (investigation only).
  interactive?: boolean
  // Enable pointer drift of the plane stack (investigation diorama only).
  parallax?: boolean
  // World-window strip mode (tribunal/debrief): capped height, no hotspots.
  strip?: boolean
  sites?: readonly SiteDefinition[]
  completedSiteIds?: readonly SiteId[]
  onHotspotActivate?: (siteId: SiteId) => void
  ariaLabel?: string
}

function toVarStyle(treatment: Readonly<Record<string, number | string>>): CSSProperties {
  return { ...treatment } as CSSProperties
}

export function SceneStage({
  scene,
  sceneState,
  reducedMotion,
  interactive = false,
  parallax = false,
  strip = false,
  sites,
  completedSiteIds,
  onHotspotActivate,
  ariaLabel,
}: SceneStageProps) {
  const diorama = Boolean(scene.LayerArt)
  const frameRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<SceneMotionHandle | null>(null)
  const reducedRef = useRef(reducedMotion)

  // Diorama motion: one rAF for drift + dust. Recreated only when the paint path
  // or parallax mode changes — never on a state swap (the loop reads the live
  // data-scene-state for weather suppression).
  useEffect(() => {
    if (!diorama) return
    const el = frameRef.current
    if (!el) return
    const handle = createSceneMotion(el, {
      scene,
      parallax,
      weather: scene.weather.kind === 'dust',
      getReducedMotion: () => reducedRef.current,
    })
    handleRef.current = handle
    return () => {
      handle.destroy()
      handleRef.current = null
    }
  }, [diorama, parallax, scene])

  // React to a live change of the reduced-motion preference without recreating.
  useEffect(() => {
    reducedRef.current = reducedMotion
    handleRef.current?.sync()
  }, [reducedMotion])

  const rasterSrc = scene.layers.find((layer) => layer.raster)?.raster?.src ?? ''
  const LayerArt = scene.LayerArt

  // Flat weather: rain mask + suppression per state.
  const isRain = scene.weather.kind === 'rain'
  const suppressed = scene.weather.suppressed.includes(sceneState)
  const rainMask = isRain
    ? scene.weather.intensity[sceneState] ?? scene.weather.intensity.neutral ?? 0
    : 0
  const rainSuppressed = suppressed || rainMask <= 0 || !isRain

  const stageClass = [
    'scene-stage',
    diorama ? 'scene-stage--diorama' : 'scene-stage--flat',
    strip ? 'scene-stage--strip' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const hotspotOverlay = interactive ? (
    <div className="scene-hotspots" role="group" aria-label={ariaLabel}>
      <div className="scene-hgroup">
        {scene.hotspots.map((hotspot) => {
          const site = sites?.find((item) => item.id === hotspot.siteId)
          const filed = completedSiteIds?.includes(hotspot.siteId) ?? false
          const name = site?.name ?? hotspot.siteId
          return (
            <div className="scene-hplane" data-plane={hotspot.plane} key={hotspot.siteId}>
              <button
                type="button"
                className="scene-hotspot"
                data-site={hotspot.siteId}
                data-x={hotspot.x}
                data-y={hotspot.y}
                data-r={hotspot.r}
                data-filed={filed ? 'true' : undefined}
                style={
                  diorama
                    ? undefined
                    : { left: `${hotspot.x * 100}%`, top: `${hotspot.y * 100}%` }
                }
                aria-label={filed ? `${name} — filed` : name}
                onClick={() => onHotspotActivate?.(hotspot.siteId)}
              >
                <span className="scene-hotspot-ring" aria-hidden="true" />
                <span className="scene-hotspot-label">{name}</span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  ) : null

  return (
    <div className={stageClass} data-scene-state={sceneState} style={toVarStyle(scene.states[sceneState])}>
      <div className="scene-frame" ref={frameRef}>
        {diorama ? (
          <div className="scene-stack" aria-hidden="true">
            {LayerArt ? <LayerArt backgroundSrc={rasterSrc} /> : null}
            <canvas className="scene-weather" />
          </div>
        ) : (
          <div className="scene-stack" aria-hidden="true">
            <div
              className="scene-flat-art"
              style={{ ['--scene-bg' as string]: `url("${rasterSrc}")` } as CSSProperties}
            />
            <div className="scene-scan" />
            <div className="scene-scrim" />
            <div className="scene-center" />
            <Atmosphere mask={rainMask || 0.07} suppress={rainSuppressed} reducedMotion={reducedMotion} />
          </div>
        )}
        {hotspotOverlay}
      </div>
    </div>
  )
}

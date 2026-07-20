// SceneStage — the shared shell that renders a case's scene. It reads only scene
// DATA + a resolved SceneStateId (computed by sceneStateFor); it holds no
// content-id literals. Two paint paths, chosen by whether the scene ships diorama
// art (LayerArt):
//   • diorama (Case 77, Case 81): the 4-plane perspective stack + haze + the
//     weather canvas, animated by createSceneMotion (drift + weather in one rAF).
//     Case 77's rain rides inside its LayerArt via the existing Atmosphere.
//   • flat (fallback when a scene authors no LayerArt): raster + rain
//     (Atmosphere) + the scrim/center treatment layers.
// The hotspot overlay mirrors the plane transforms and selects the contextual
// location workspace for pointer users. The adjacent switcher is the canonical
// keyboard/AT route; the art stack and pointer mirrors are aria-hidden.
import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { Atmosphere } from '../ambience/Atmosphere'
import { LABEL_LEADER_THRESHOLD } from '../game/types'
import type { SceneDefinition, SceneStateId, SiteDefinition, SiteId } from '../game/types'
import { createSceneMotion, type SceneMotionHandle } from './motion'

interface SceneStageProps {
  scene: SceneDefinition
  sceneState: SceneStateId
  reducedMotion: boolean
  // Civic-alarm tier (0–3) for scenes that author an alarm atmosphere table.
  // Presentation only: a haze veil joins the root vars and the dust weather
  // reads its count/speed from the tier. Undefined = tier 0 (the base look).
  alarmLevel?: number
  // Render the interactive hotspot overlay (investigation only).
  interactive?: boolean
  // Enable pointer drift of the plane stack (investigation diorama only).
  parallax?: boolean
  // World-window strip mode (tribunal/debrief): capped height, no hotspots.
  strip?: boolean
  sites?: readonly SiteDefinition[]
  completedSiteIds?: readonly SiteId[]
  // View-only selection for the investigation workspace. This never enters the
  // engine and only clarifies which hotspot owns the adjacent location panel.
  selectedSiteId?: SiteId
  onHotspotActivate?: (siteId: SiteId) => void
}

function toVarStyle(treatment: Readonly<Record<string, number | string>>): CSSProperties {
  return { ...treatment } as CSSProperties
}

export function SceneStage({
  scene,
  sceneState,
  reducedMotion,
  alarmLevel,
  interactive = false,
  parallax = false,
  strip = false,
  sites,
  completedSiteIds,
  selectedSiteId,
  onHotspotActivate,
}: SceneStageProps) {
  const diorama = Boolean(scene.LayerArt)
  const frameRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<SceneMotionHandle | null>(null)
  const reducedRef = useRef(reducedMotion)
  const alarmRef = useRef(alarmLevel ?? 0)
  // Clamped tier used by both the root vars (this render) and the motion ref.
  const alarmTier = Math.max(0, Math.min(3, Math.round(alarmLevel ?? 0)))

  // Diorama motion: one rAF for drift + dust + ambience. Recreated only when
  // the paint path or parallax mode changes — never on a state swap or an
  // alarm-tier change (the loop reads the live data-scene-state for weather
  // suppression and the alarm tier through a ref).
  useEffect(() => {
    if (!diorama) return
    const el = frameRef.current
    if (!el) return
    const handle = createSceneMotion(el, {
      scene,
      parallax,
      weather: scene.weather.kind === 'dust',
      getReducedMotion: () => reducedRef.current,
      getAlarmTier: () => alarmRef.current,
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

  // React to a live alarm-tier change: the dust weather re-seeds from the
  // scene's per-tier table (the haze veil is a root var, below).
  useEffect(() => {
    alarmRef.current = alarmTier
    handleRef.current?.reseed()
  }, [alarmTier])

  const rasterSrc = scene.layers.find((layer) => layer.raster)?.raster?.src ?? ''
  const LayerArt = scene.LayerArt
  const figure = scene.figure

  // The stage root carries the room's state treatment; when a figure is authored
  // its own per-state vars are merged over the same set, so both the room and the
  // figure plate read their live custom properties from one cascade root. A scene
  // with an alarm table also layers its per-tier haze veil here (tier 0 = 0, so
  // the base look is untouched). Never mutate the shared treatment object.
  const baseVars = figure
    ? { ...scene.states[sceneState], ...figure.states[sceneState] }
    : scene.states[sceneState]
  const rootVars = scene.alarm
    ? { ...baseVars, '--alarm-haze-o': scene.alarm[alarmTier].hazeVeil }
    : baseVars

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
    // The adjacent location switcher is the canonical keyboard/AT control set.
    // These spatial markers mirror it for pointer exploration without making a
    // player traverse the same four locations twice.
    <div className="scene-hotspots" aria-hidden="true">
      <div className="scene-hgroup">
        {scene.hotspots.map((hotspot) => {
          const site = sites?.find((item) => item.id === hotspot.siteId)
          const filed = completedSiteIds?.includes(hotspot.siteId) ?? false
          const selected = selectedSiteId === hotspot.siteId
          const name = site?.name ?? hotspot.siteId
          const offset = hotspot.labelOffset
          // A displaced label past the threshold gets a fog leader line back to
          // the marker (motion.ts sizes/rotates it from the live projection).
          const leader =
            offset !== undefined && Math.hypot(offset.dx, offset.dy) >= LABEL_LEADER_THRESHOLD
          return (
            <div className="scene-hplane" data-plane={hotspot.plane} key={hotspot.siteId}>
              <button
                type="button"
                className="scene-hotspot"
                data-site={hotspot.siteId}
                data-x={hotspot.x}
                data-y={hotspot.y}
                data-r={hotspot.r}
                data-ldx={offset ? offset.dx : undefined}
                data-ldy={offset ? offset.dy : undefined}
                data-filed={filed ? 'true' : undefined}
                data-selected={selected ? 'true' : undefined}
                style={
                  diorama
                    ? undefined
                    : { left: `${hotspot.x * 100}%`, top: `${hotspot.y * 100}%` }
                }
                aria-hidden="true"
                tabIndex={-1}
                onClick={() => onHotspotActivate?.(hotspot.siteId)}
              >
                <span className="scene-hotspot-ring" aria-hidden="true" />
                {leader && <span className="scene-hotspot-leader" aria-hidden="true" />}
                <span className="scene-hotspot-label">{name}</span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  ) : null

  return (
    <div className={stageClass} data-scene-state={sceneState} style={toVarStyle(rootVars)}>
      <div className="scene-frame" ref={frameRef}>
        {diorama ? (
          <div className="scene-stack" aria-hidden="true">
            {LayerArt ? <LayerArt backgroundSrc={rasterSrc} /> : null}
            <canvas className="scene-weather" />
            {figure ? (
              // A composited seated presence. motion.ts projects data-x/-y/-h
              // through the live crop window onto its plane; the plate blends into
              // the scene (screen) and reads its opacity/brightness/contrast from
              // the cascaded --fig-* state vars. The breath animation lives on the
              // inner plate and dies under reduced motion via the global rules.
              <div
                className="scene-figure"
                data-x={figure.x}
                data-y={figure.y}
                data-h={figure.height}
                data-plane={figure.plane}
              >
                <img
                  className="scene-figure-plate"
                  src={figure.src}
                  alt=""
                  style={{ mixBlendMode: figure.blend as CSSProperties['mixBlendMode'] }}
                />
              </div>
            ) : null}
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

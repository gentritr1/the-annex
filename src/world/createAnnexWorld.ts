import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  FogExp2,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  RepeatWrapping,
  Scene,
  Spherical,
  SRGBColorSpace,
  TextureLoader,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'
import type { BufferGeometry, Material, Texture } from 'three'
import type {
  AuthoritySignal,
  SceneWorldCamera,
  SceneWorldDefinition,
  SceneWorldPortal,
  SiteDefinition,
  SiteId,
  SiteWorldOutcome,
  UnnumberedReadingRoomDefinition,
} from '../game/types'
import { containedPosterAnchor } from './posterProjection'

export interface AnnexWorldHandle {
  setSelection(siteId: SiteId | undefined): void
  setPreview(siteId: SiteId | undefined): void
  setCompleted(siteIds: readonly SiteId[]): void
  setAlarm(level: number): void
  setAuthoritySignal(signal: AuthoritySignal): void
  // Apply the resolved hub alteration per site (content-driven; may be
  // empty). The opened outcome warms the portal frame/signal into an amber seam;
  // the sealed one cools the frame and lowers a barred shutter across the plate.
  setResolvedOutcomes(outcomes: ReadonlyMap<SiteId, SiteWorldOutcome>): void
  // Mirrors the pure Reader Key capability into presentation. It only reveals
  // or conceals authored geometry and schedules a frame.
  setSecretRoomAvailable(available: boolean): void
  // Hold one portal's outcome treatment under return emphasis (a brighter opened
  // spill / a heavier sealed shutter) for a beat after an actual return, then clear
  // it with `undefined`. Boosts the treatment and schedules one frame — no new
  // continuous loop; the bounded invalidation lifecycle carries it.
  setReturnEmphasis(siteId: SiteId | undefined): void
  invalidate(): void
  destroy(): void
}

interface CreateAnnexWorldOptions {
  root: HTMLElement
  world: SceneWorldDefinition
  sites: readonly SiteDefinition[]
  secretRoom?: UnnumberedReadingRoomDefinition
  portalButtons: ReadonlyMap<SiteId, HTMLButtonElement>
  signal: AbortSignal
  onContextLost: () => void
  onLoopChange: (running: boolean) => void
}

interface PortalRenderRecord {
  portal: SceneWorldPortal
  anchor: Vector3
  frameMaterial: MeshStandardMaterial
  signalMaterial: MeshStandardMaterial
  // The barred shutter (four stacked bars) shown only for the sealed outcome.
  barMeshes: Mesh[]
  barMaterial: MeshStandardMaterial
  // A bright amber under-seam shown only for the opened outcome.
  seamMesh: Mesh
  seamMaterial: MeshStandardMaterial
}

interface SecretRoomRenderRecord {
  anchor: Vector3
  meshes: Mesh[]
  panelMaterial: MeshStandardMaterial
  signalMaterial: MeshStandardMaterial
}

const CAMERA_NEAR = 0.08
const CAMERA_FAR = 48
const MAX_DRAG_YAW = 0.17
const MAX_DRAG_PITCH = 0.085
const PORTAL_EDGE_INSET = 30

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function poseEquals(a: SceneWorldCamera, b: SceneWorldCamera): boolean {
  return (
    a.position.every((value, index) => value === b.position[index]) &&
    a.target.every((value, index) => value === b.target[index])
  )
}

function homeCameraForViewport(
  world: SceneWorldDefinition,
  width: number,
  height: number,
): SceneWorldCamera {
  const aspect = width / Math.max(1, height)
  const compact = width <= 700 || aspect < 1.6
  const position = world.homeCamera.position
  const target = world.homeCamera.target
  return {
    // The authored camera remains the composition source. A narrow world pane
    // steps back farther so both side thresholds enter the horizontal frustum.
    position: [
      position[0],
      position[1] + (compact ? 0.12 : 0.06),
      position[2] + (compact ? 1.7 : 0.9),
    ],
    // A modest downward sightline trades the unused ceiling field for the
    // plinth, wet floor, and service threshold beneath the player.
    target: [target[0], Math.min(target[1], compact ? 0.95 : 1.05), target[2] + 0.35],
  }
}

function resetPortalButtons(
  world: SceneWorldDefinition,
  buttons: ReadonlyMap<SiteId, HTMLButtonElement>,
  interactive: boolean,
) {
  world.portals.forEach((portal) => {
    const button = buttons.get(portal.siteId)
    if (!button) return
    const anchor = containedPosterAnchor(portal.posterAnchor)
    button.style.left = anchor.left
    button.style.top = anchor.top
    button.style.visibility = 'visible'
    button.style.pointerEvents = interactive ? 'auto' : 'none'
  })
}

function colorTexture(texture: Texture, anisotropy: number): Texture {
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = anisotropy
  texture.needsUpdate = true
  return texture
}

function repeatedTexture(
  source: Texture | null,
  repeatX: number,
  repeatY: number,
  anisotropy: number,
): Texture | null {
  if (!source) return null
  const texture = source.clone()
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  return colorTexture(texture, anisotropy)
}

function coverPortalTexture(
  texture: Texture,
  portal: SceneWorldPortal,
  anisotropy: number,
) {
  coverTexture(texture, portal.size.width / portal.size.height, anisotropy)
}

function coverTexture(
  texture: Texture,
  planeAspect: number,
  anisotropy: number,
) {
  colorTexture(texture, anisotropy)
  const image = texture.image as { width?: number; height?: number }
  const imageAspect = (image.width ?? 16) / Math.max(1, image.height ?? 9)
  if (planeAspect < imageAspect) {
    texture.repeat.x = planeAspect / imageAspect
    texture.offset.x = (1 - texture.repeat.x) / 2
  } else {
    texture.repeat.y = imageAspect / planeAspect
    texture.offset.y = (1 - texture.repeat.y) / 2
  }
  texture.needsUpdate = true
}

async function loadTexture(loader: TextureLoader, src: string): Promise<Texture | null> {
  try {
    return await loader.loadAsync(src)
  } catch (error) {
    if (import.meta.env.DEV) console.warn(`Annex world texture failed to load: ${src}`, error)
    return null
  }
}

/**
 * Imperative, bounded Three.js renderer. It owns no game state and schedules a
 * frame only for an invalidation, authored camera travel, or a live direct drag.
 */
export async function createAnnexWorld(
  options: CreateAnnexWorldOptions,
): Promise<AnnexWorldHandle | null> {
  if (options.signal.aborted) return null
  const isDepositionAnnex = options.world.kind === 'deposition-annex'
  const secretRoomEntry = options.secretRoom?.entryAnchors.find(
    (entry) => entry.worldKind === options.world.kind,
  )
  const baseBackground = isDepositionAnnex ? 0x111512 : 0x0b1014
  const baseClearColor = isDepositionAnnex ? 0x0c100d : 0x090c0f
  const alarmBackground = isDepositionAnnex ? 0x17120f : 0x110e0d
  const baseFogDensity = isDepositionAnnex ? 0.026 : 0.018
  const baseExposure = isDepositionAnnex ? 1.18 : 1.24

  const queriedHost = options.root.querySelector<HTMLElement>('.annex-world-canvas-host')
  if (!queriedHost) return null
  // Explicit non-null alias for the lifecycle callbacks declared below. TypeScript
  // deliberately does not retain DOM-query narrowing across every closure.
  const canvasHost: HTMLElement = queriedHost

  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({
      alpha: false,
      antialias: true,
      powerPreference: 'low-power',
    })
  } catch (error) {
    if (import.meta.env.DEV) console.warn('The Annex could not create a WebGL renderer.', error)
    return null
  }

  const canvas = renderer.domElement
  canvas.className = 'annex-world-canvas'
  canvas.dataset.annexWorldCanvas = 'true'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.tabIndex = -1
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    display: 'block',
    width: '100%',
    height: '100%',
    cursor: 'grab',
    touchAction: 'pan-y',
  })
  canvasHost.append(canvas)

  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = baseExposure
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  renderer.setClearColor(baseClearColor, 1)

  let destroyed = false
  let contextLost = false
  let raf = 0
  let loopReported = false
  let inView = true
  let documentVisible = !document.hidden
  const initialRect = canvasHost.getBoundingClientRect()
  let width = Math.max(1, initialRect.width)
  let height = Math.max(1, initialRect.height)
  let moving = false
  let dragging = false
  let touchCandidate = false
  let dragPointerId = -1
  let dragStartX = 0
  let dragStartY = 0
  let dragStartYaw = 0
  let dragStartPitch = 0
  let dragYaw = 0
  let dragPitch = 0
  let moveStart = 0
  let selectedSiteId: SiteId | undefined
  let previewSiteId: SiteId | undefined
  let homePose = homeCameraForViewport(options.world, width, height)
  let currentPose = homePose
  let targetPose = homePose

  const scene = new Scene()
  scene.background = new Color(baseBackground)
  const fog = new FogExp2(baseBackground, baseFogDensity)
  scene.fog = fog
  const compactInitialView = width <= 700 || width / height < 1.6
  const camera = new PerspectiveCamera(
    compactInitialView ? 64 : 52,
    width / height,
    CAMERA_NEAR,
    CAMERA_FAR,
  )
  const currentPosition = new Vector3(...homePose.position)
  const currentTarget = new Vector3(...homePose.target)
  const moveFromPosition = currentPosition.clone()
  const moveFromTarget = currentTarget.clone()
  const moveToPosition = currentPosition.clone()
  const moveToTarget = currentTarget.clone()
  const projected = new Vector3()
  const cameraDirection = new Vector3()
  const toAnchor = new Vector3()
  const lookDirection = new Vector3()
  const lookPoint = new Vector3()
  const lookSpherical = new Spherical()

  const textures = new Set<Texture>()
  const materials = new Set<Material>()
  const geometries = new Set<BufferGeometry>()
  const portalRecords: PortalRenderRecord[] = []
  const completed = new Set<SiteId>()
  let resolvedOutcomes: ReadonlyMap<SiteId, SiteWorldOutcome> = new Map()
  let returnEmphasisSiteId: SiteId | undefined
  let authoritySignal: AuthoritySignal = 'none'
  let secretRoomAvailable = false
  let secretRoomRecord: SecretRoomRenderRecord | null = null

  function reportLoop(running: boolean) {
    if (loopReported === running) return
    loopReported = running
    options.onLoopChange(running)
  }

  function canRender() {
    return !destroyed && !contextLost && inView && documentVisible
  }

  function stopFrame() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    reportLoop(false)
  }

  function scheduleFrame() {
    if (!canRender() || raf) return
    reportLoop(true)
    raf = requestAnimationFrame(frame)
  }

  function applyCamera() {
    camera.position.copy(currentPosition)
    // A small eye translation makes the authored jambs, route inlays, and
    // structural piers reveal real parallax during a drag. At rest both values
    // are zero, so the approved framing stays unchanged.
    camera.position.x += (dragYaw / MAX_DRAG_YAW) * 0.18
    camera.position.y -= (dragPitch / MAX_DRAG_PITCH) * 0.055
    lookDirection.subVectors(currentTarget, currentPosition)
    const distance = Math.max(0.01, lookDirection.length())
    lookSpherical.setFromVector3(lookDirection)
    lookSpherical.theta += dragYaw
    lookSpherical.phi = clamp(lookSpherical.phi + dragPitch, 0.18, Math.PI - 0.18)
    lookDirection.setFromSpherical(lookSpherical).setLength(distance)
    lookPoint.copy(currentPosition).add(lookDirection)
    camera.lookAt(lookPoint)
    camera.updateMatrixWorld()
  }

  function projectPortals() {
    camera.getWorldDirection(cameraDirection)
    portalRecords.forEach(({ portal, anchor }, portalIndex) => {
      const button = options.portalButtons.get(portal.siteId)
      if (!button) return
      // A portrait viewport is too narrow to keep both side chambers inside a
      // perspective frustum without pulling the whole room into a distant
      // thumbnail. Keep the real 3D room and its drag response, but project the
      // four DOM controls through the approved poster composition instead. This
      // creates a stable in-world threshold rail: every route remains visible,
      // 48px touchable and keyboard-addressable at once.
      if (width / Math.max(1, height) < 1) {
        // Keep at least a broad visual lane between adjacent 48px targets on
        // phone widths. The authored vertical anchor still ties each control to
        // the room; horizontal spacing becomes a legible game-HUD rail.
        const compactX =
          portalRecords.length <= 1
            ? 0.5
            : 0.18 + (portalIndex / (portalRecords.length - 1)) * 0.64
        const compactAnchor = containedPosterAnchor({
          x: compactX,
          y: portal.posterAnchor.y,
        })
        button.style.left = compactAnchor.left
        button.style.top = compactAnchor.top
        button.style.visibility = 'visible'
        button.style.pointerEvents = 'auto'
        button.dataset.compactProjection = 'true'
        return
      }
      delete button.dataset.compactProjection
      toAnchor.subVectors(anchor, camera.position)
      projected.copy(anchor).project(camera)
      const facingCamera = cameraDirection.dot(toAnchor) > 0
      const visible =
        facingCamera &&
        projected.z >= -1 &&
        projected.z <= 1 &&
        projected.x >= -1.16 &&
        projected.x <= 1.16 &&
        projected.y >= -1.16 &&
        projected.y <= 1.16
      if (!visible) {
        button.style.visibility = 'hidden'
        button.style.pointerEvents = 'none'
        return
      }
      // Preserve the required 48px pointer target at compact edges. The authored
      // portal itself remains in view; the mirror may clamp inward by only a few
      // pixels on the narrowest mobile box.
      const x = clamp(
        ((projected.x + 1) / 2) * width,
        PORTAL_EDGE_INSET,
        width - PORTAL_EDGE_INSET,
      )
      const y = clamp(
        ((1 - projected.y) / 2) * height,
        PORTAL_EDGE_INSET,
        height - PORTAL_EDGE_INSET,
      )
      button.style.left = `${x}px`
      button.style.top = `${y}px`
      button.style.visibility = 'visible'
      button.style.pointerEvents = 'auto'
    })
  }

  function projectSecretRoomEntry() {
    const button = options.root.querySelector<HTMLButtonElement>(
      '.annex-world-secret-room',
    )
    if (!button || !secretRoomEntry || !secretRoomAvailable) return

    // The authored poster coordinate is the stable compact and fallback route.
    // It avoids crowding the four site thresholds when the perspective frustum
    // collapses into the portrait projection rail.
    if (width / Math.max(1, height) < 1 || !secretRoomRecord) {
      const anchor = containedPosterAnchor(secretRoomEntry.posterAnchor)
      button.style.left = anchor.left
      button.style.top = anchor.top
      button.style.visibility = 'visible'
      button.style.pointerEvents = 'auto'
      button.dataset.compactProjection = 'true'
      return
    }

    delete button.dataset.compactProjection
    camera.getWorldDirection(cameraDirection)
    toAnchor.subVectors(secretRoomRecord.anchor, camera.position)
    projected.copy(secretRoomRecord.anchor).project(camera)
    const facingCamera = cameraDirection.dot(toAnchor) > 0
    const visible =
      facingCamera &&
      projected.z >= -1 &&
      projected.z <= 1 &&
      projected.x >= -1.16 &&
      projected.x <= 1.16 &&
      projected.y >= -1.16 &&
      projected.y <= 1.16
    if (!visible) {
      button.style.visibility = 'hidden'
      button.style.pointerEvents = 'none'
      return
    }

    const x = clamp(
      ((projected.x + 1) / 2) * width,
      PORTAL_EDGE_INSET,
      width - PORTAL_EDGE_INSET,
    )
    const y = clamp(
      ((1 - projected.y) / 2) * height,
      PORTAL_EDGE_INSET,
      height - PORTAL_EDGE_INSET,
    )
    button.style.left = `${x}px`
    button.style.top = `${y}px`
    button.style.visibility = 'visible'
    button.style.pointerEvents = 'auto'
  }

  function resetSecretRoomButton(interactive: boolean) {
    const button = options.root.querySelector<HTMLButtonElement>(
      '.annex-world-secret-room',
    )
    if (!button || !secretRoomEntry) return
    const anchor = containedPosterAnchor(secretRoomEntry.posterAnchor)
    button.style.left = anchor.left
    button.style.top = anchor.top
    button.style.visibility = secretRoomAvailable ? 'visible' : 'hidden'
    button.style.pointerEvents =
      interactive && secretRoomAvailable ? 'auto' : 'none'
    delete button.dataset.compactProjection
  }

  function frame(time: number) {
    raf = 0
    if (!canRender()) {
      reportLoop(false)
      return
    }

    if (moving) {
      const progress = clamp((time - moveStart) / Math.max(1, options.world.travelMs), 0, 1)
      const eased = 1 - (1 - progress) ** 4
      currentPosition.lerpVectors(moveFromPosition, moveToPosition, eased)
      currentTarget.lerpVectors(moveFromTarget, moveToTarget, eased)
      if (progress >= 1) {
        currentPosition.copy(moveToPosition)
        currentTarget.copy(moveToTarget)
        currentPose = targetPose
        moving = false
      }
    }

    applyCamera()
    renderer.render(scene, camera)
    projectPortals()
    projectSecretRoomEntry()

    if (moving || dragging) scheduleFrame()
    else reportLoop(false)
  }

  function setCameraPose(pose: SceneWorldCamera) {
    if (poseEquals(currentPose, pose) && !moving) return
    targetPose = pose
    moveFromPosition.copy(currentPosition)
    moveFromTarget.copy(currentTarget)
    moveToPosition.set(...pose.position)
    moveToTarget.set(...pose.target)
    moveStart = performance.now()
    dragYaw = 0
    dragPitch = 0
    moving = true
    scheduleFrame()
  }

  function updatePortalMaterials() {
    const traveling = selectedSiteId !== undefined
    portalRecords.forEach(
      ({ portal, frameMaterial, signalMaterial, barMeshes, barMaterial, seamMesh, seamMaterial }) => {
        const selected = portal.siteId === selectedSiteId
        const previewed = portal.siteId === previewSiteId
        const active = selected || previewed
        const filed = completed.has(portal.siteId)
        const outcome = resolvedOutcomes.get(portal.siteId)
        const emphasised = returnEmphasisSiteId === portal.siteId
        const signalConfig = options.world.authoritySignal
        const linkedSignal =
          authoritySignal === 'linked' &&
          signalConfig?.linkedSiteIds.includes(portal.siteId)
        const forgedSignal =
          authoritySignal === 'forged' &&
          signalConfig?.forgedSiteId === portal.siteId

        // A factual authority trace uses the existing portal signal material.
        // Static values only: the exact action pair converges in cyan; the
        // dormant forged credential leaves one coral back-trace.
        if ((linkedSignal || forgedSignal) && !active) {
          seamMesh.visible = false
          barMeshes.forEach((bar) => (bar.visible = false))
          if (linkedSignal) {
            frameMaterial.color.setHex(0x6db6b7)
            frameMaterial.emissive.setHex(0x173f42)
            frameMaterial.emissiveIntensity = 0.62
            signalMaterial.color.setHex(0x9de2df)
            signalMaterial.emissive.setHex(0x2d7776)
            signalMaterial.emissiveIntensity = 1.45
          } else {
            frameMaterial.color.setHex(0xb85c4e)
            frameMaterial.emissive.setHex(0x64251f)
            frameMaterial.emissiveIntensity = 0.7
            signalMaterial.color.setHex(0xe07b69)
            signalMaterial.emissive.setHex(0x862f27)
            signalMaterial.emissiveIntensity = 1.55
          }
          return
        }

        // An authored outcome overrides the generic filed treatment. The opened seam
        // runs warm amber and bright; the sealed frame cools/darkens and lowers a
        // barred shutter across the plate (geometry, no texture) so the two read
        // differently even with labels hidden. Return emphasis boosts whichever
        // treatment is resolved for one held beat.
        if (outcome && !active) {
          if (outcome.variant === 'opened') {
            frameMaterial.color.setHex(emphasised ? 0xe4ad57 : 0xc89445)
            frameMaterial.emissive.setHex(emphasised ? 0x7a4d12 : 0x5a370e)
            frameMaterial.emissiveIntensity = emphasised ? 1.1 : 0.72
            signalMaterial.color.setHex(0xe0b06a)
            signalMaterial.emissive.setHex(emphasised ? 0x9c6414 : 0x7a4a10)
            signalMaterial.emissiveIntensity = emphasised ? 1.9 : 1.3
            seamMaterial.emissive.setHex(emphasised ? 0xd79a3f : 0x9c6417)
            seamMaterial.emissiveIntensity = emphasised ? 2.4 : 1.35
          } else {
            frameMaterial.color.setHex(emphasised ? 0x1c2226 : 0x232a2f)
            frameMaterial.emissive.setHex(0x090d10)
            frameMaterial.emissiveIntensity = 0.06
            signalMaterial.color.setHex(0x39434a)
            signalMaterial.emissive.setHex(0x0c1114)
            signalMaterial.emissiveIntensity = 0.05
            barMaterial.color.setHex(emphasised ? 0xaeb7bc : 0x8f9aa0)
            barMaterial.emissiveIntensity = emphasised ? 0.5 : 0.3
          }
          seamMesh.visible = outcome.variant === 'opened'
          barMeshes.forEach((bar) => (bar.visible = outcome.variant === 'sealed'))
          return
        }

        seamMesh.visible = false
        barMeshes.forEach((bar) => (bar.visible = false))
        const color = active ? 0xc89445 : filed ? 0x6db6b7 : traveling ? 0x242c31 : 0x303b43
        const emissive = active ? 0x4b2f0c : filed ? 0x173f42 : 0x0b1417
        frameMaterial.color.setHex(color)
        frameMaterial.emissive.setHex(emissive)
        frameMaterial.emissiveIntensity = active ? 0.58 : filed ? 0.44 : traveling ? 0.1 : 0.2

        signalMaterial.color.setHex(
          active ? 0xd0a05a : filed ? 0x7abfc0 : traveling ? 0x293236 : 0x455358,
        )
        signalMaterial.emissive.setHex(active ? 0x6a3f0d : filed ? 0x185054 : 0x11191c)
        signalMaterial.emissiveIntensity = active ? 1.2 : filed ? 0.9 : traveling ? 0.08 : 0.22
      },
    )
    renderer.shadowMap.needsUpdate = true
  }

  function resize() {
    if (destroyed) return
    const rect = canvasHost.getBoundingClientRect()
    width = Math.max(1, rect.width)
    height = Math.max(1, rect.height)
    const mobile = width <= 700 || window.innerWidth <= 700
    const dprCap = mobile ? 1 : 1.5
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap))
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.fov = width <= 700 || camera.aspect < 1.6 ? 64 : 52
    camera.updateProjectionMatrix()
    homePose = homeCameraForViewport(options.world, width, height)
    if (!selectedSiteId) setCameraPose(homePose)
    scheduleFrame()
  }

  function onVisibilityChange() {
    documentVisible = !document.hidden
    if (documentVisible) scheduleFrame()
    else {
      cancelDrag()
      stopFrame()
    }
  }

  function cancelDrag() {
    if (dragPointerId >= 0 && canvas.hasPointerCapture(dragPointerId)) {
      canvas.releasePointerCapture(dragPointerId)
    }
    dragging = false
    touchCandidate = false
    dragPointerId = -1
    canvas.style.cursor = 'grab'
  }

  function onPointerDown(event: PointerEvent) {
    if (
      event.button !== 0 ||
      (event.pointerType !== 'mouse' && event.pointerType !== 'pen' && event.pointerType !== 'touch')
    ) {
      return
    }
    dragging = event.pointerType !== 'touch'
    touchCandidate = event.pointerType === 'touch'
    dragPointerId = event.pointerId
    dragStartX = event.clientX
    dragStartY = event.clientY
    dragStartYaw = dragYaw
    dragStartPitch = dragPitch
    if (dragging) {
      canvas.setPointerCapture(event.pointerId)
      canvas.style.cursor = 'grabbing'
      scheduleFrame()
    }
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerId !== dragPointerId) return
    const dx = event.clientX - dragStartX
    const dy = event.clientY - dragStartY
    if (touchCandidate && !dragging) {
      // `touch-action: pan-y` leaves vertical page scrolling native. Claim only
      // an unmistakably horizontal gesture, then use the same bounded look as a
      // mouse/pen drag.
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        touchCandidate = false
        dragPointerId = -1
        return
      }
      if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy) * 1.15) return
      touchCandidate = false
      dragging = true
      canvas.setPointerCapture(event.pointerId)
    }
    if (!dragging) return
    dragYaw = clamp(
      dragStartYaw - (dx / Math.max(1, width)) * 0.42,
      -MAX_DRAG_YAW,
      MAX_DRAG_YAW,
    )
    dragPitch = clamp(
      dragStartPitch + (dy / Math.max(1, height)) * 0.3,
      -MAX_DRAG_PITCH,
      MAX_DRAG_PITCH,
    )
    scheduleFrame()
  }

  function endDrag(event: PointerEvent) {
    if (event.pointerId !== dragPointerId) return
    const wasDragging = dragging
    dragging = false
    touchCandidate = false
    dragPointerId = -1
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    canvas.style.cursor = 'grab'
    if (wasDragging) scheduleFrame()
  }

  function onContextLost(event: Event) {
    event.preventDefault()
    contextLost = true
    moving = false
    cancelDrag()
    stopFrame()
    resetPortalButtons(
      options.world,
      options.portalButtons,
      options.root.dataset.active === 'true',
    )
    resetSecretRoomButton(options.root.dataset.active === 'true')
    options.onContextLost()
    // A lost context is not retried in place. Tear down every listener and GPU
    // object after the poster fallback has taken over.
    queueMicrotask(destroy)
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', endDrag)
  canvas.addEventListener('pointercancel', endDrag)
  canvas.addEventListener('webglcontextlost', onContextLost)
  document.addEventListener('visibilitychange', onVisibilityChange)

  let resizeObserver: ResizeObserver | null = null
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvasHost)
  } else {
    window.addEventListener('resize', resize)
  }

  let intersectionObserver: IntersectionObserver | null = null
  if (typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true
        if (inView) scheduleFrame()
        else {
          cancelDrag()
          stopFrame()
        }
      },
      { threshold: 0.01 },
    )
    intersectionObserver.observe(options.root)
  }

  // The wrapper can unmount or settle a close-up before eight image requests
  // finish. Abort must release observers/listeners/the WebGL context immediately;
  // late textures are disposed by the post-Promise guard below.
  const onAbort = () => destroy()
  options.signal.addEventListener('abort', onAbort, { once: true })

  const loader = new TextureLoader()
  const portalSources = options.world.portals.map((portal) => {
    const site = options.sites.find((candidate) => candidate.id === portal.siteId)
    return site?.closeup?.src ?? ''
  })
  const [concreteSource, terrazzoSource, bronzeSource, featurePlateSource, ...portalTextures] =
    await Promise.all([
      loadTexture(loader, options.world.concreteSrc),
      loadTexture(loader, options.world.terrazzoSrc),
      loadTexture(loader, options.world.bronzeSrc),
      loadTexture(loader, options.world.featurePlateSrc),
      ...portalSources.map((src) => (src ? loadTexture(loader, src) : Promise.resolve(null))),
    ])

  const loadedTextures = [
    concreteSource,
    terrazzoSource,
    bronzeSource,
    featurePlateSource,
    ...portalTextures,
  ]
  if (options.signal.aborted || destroyed || contextLost) {
    loadedTextures.forEach((texture) => texture?.dispose())
    if (!destroyed) destroy()
    return null
  }

  loadedTextures.forEach((texture) => {
    if (texture) textures.add(texture)
  })

  const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
  const wallTexture = repeatedTexture(concreteSource, 3.4, 1.3, anisotropy)
  const floorTexture = repeatedTexture(terrazzoSource, 3.2, 3.2, anisotropy)
  const plinthTexture = repeatedTexture(concreteSource, 1.2, 1, anisotropy)
  const bronzeTexture = repeatedTexture(bronzeSource, 1.55, 1.55, anisotropy)
  if (featurePlateSource) {
    coverTexture(featurePlateSource, isDepositionAnnex ? 1.64 : 0.36, anisotropy)
  }
  ;[wallTexture, floorTexture, plinthTexture, bronzeTexture].forEach((texture) => {
    if (texture) textures.add(texture)
  })

  const wallMaterial = new MeshStandardMaterial({
    color: wallTexture ? (isDepositionAnnex ? 0xc9c5b7 : 0xffffff) : isDepositionAnnex ? 0x343a35 : 0x252f36,
    map: wallTexture,
    roughness: isDepositionAnnex ? 0.98 : 0.94,
    metalness: 0.02,
  })
  const floorMaterial = new MeshPhysicalMaterial({
    color: floorTexture
      ? isDepositionAnnex
        ? 0xb6b4a7
        : 0xe1e7e8
      : isDepositionAnnex
        ? 0x222620
        : 0x141b20,
    map: floorTexture,
    roughness: isDepositionAnnex ? 0.88 : 0.58,
    metalness: 0.05,
    clearcoat: isDepositionAnnex ? 0.08 : 0.34,
    clearcoatRoughness: isDepositionAnnex ? 0.9 : 0.64,
  })
  const plinthMaterial = new MeshStandardMaterial({
    color: plinthTexture
      ? isDepositionAnnex
        ? 0xbcb9aa
        : 0xd9dfe0
      : isDepositionAnnex
        ? 0x30362f
        : 0x202a30,
    map: plinthTexture,
    roughness: 0.88,
    metalness: 0.04,
  })
  const darkMetalMaterial = new MeshStandardMaterial({
    color: isDepositionAnnex ? 0x202722 : 0x171e23,
    roughness: 0.72,
    metalness: 0.38,
  })
  const bronzeMaterial = new MeshStandardMaterial({
    color: bronzeTexture
      ? isDepositionAnnex
        ? 0xa4aaa3
        : 0xffffff
      : isDepositionAnnex
        ? 0x535d57
        : 0x42372d,
    map: bronzeTexture,
    roughness: 0.58,
    metalness: 0.68,
  })
  const blackCeramicMaterial = new MeshPhysicalMaterial({
    color: isDepositionAnnex ? 0x191d19 : 0x11171a,
    roughness: 0.28,
    metalness: 0.08,
    clearcoat: 0.5,
    clearcoatRoughness: 0.42,
  })
  const pressureGlassMaterial = new MeshPhysicalMaterial({
    color: isDepositionAnnex ? 0x879088 : 0x718188,
    roughness: 0.18,
    metalness: 0,
    transparent: true,
    opacity: 0.18,
    transmission: 0.16,
    thickness: 0.18,
    depthWrite: false,
  })
  const neutralGlowMaterial = new MeshStandardMaterial({
    color: isDepositionAnnex ? 0xd2ceb8 : 0xaab5b7,
    emissive: isDepositionAnnex ? 0x77715b : 0x55676b,
    emissiveIntensity: 0.48,
    roughness: 0.38,
    metalness: 0.18,
  })
  const amberMaterial = new MeshBasicMaterial({
    color: isDepositionAnnex ? 0x9d7748 : 0xa96d25,
  })
  const overheadMaterial = new MeshBasicMaterial({
    color: isDepositionAnnex ? 0xb1ad97 : 0x829093,
  })
  const alarmMaterial = new MeshBasicMaterial({
    color: 0x241b19,
    transparent: true,
    opacity: 0.36,
  })
  ;[
    wallMaterial,
    floorMaterial,
    plinthMaterial,
    darkMetalMaterial,
    bronzeMaterial,
    blackCeramicMaterial,
    pressureGlassMaterial,
    neutralGlowMaterial,
    amberMaterial,
    overheadMaterial,
    alarmMaterial,
  ].forEach((material) => materials.add(material))

  interface MeshOptions {
    rotationX?: number
    rotationY?: number
    rotationZ?: number
    castShadow?: boolean
    receiveShadow?: boolean
  }

  const boxGeometryCache = new Map<string, BoxGeometry>()
  const cylinderGeometryCache = new Map<string, CylinderGeometry>()

  function addMesh(
    geometry: BufferGeometry,
    position: readonly [number, number, number],
    material: Material,
    meshOptions: MeshOptions = {},
  ) {
    const mesh = new Mesh(geometry, material)
    mesh.position.set(...position)
    mesh.rotation.set(
      meshOptions.rotationX ?? 0,
      meshOptions.rotationY ?? 0,
      meshOptions.rotationZ ?? 0,
    )
    mesh.castShadow = meshOptions.castShadow ?? true
    mesh.receiveShadow = meshOptions.receiveShadow ?? true
    scene.add(mesh)
    return mesh
  }

  function addBox(
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    material: Material,
    rotationY = 0,
    meshOptions: Omit<MeshOptions, 'rotationY'> = {},
  ) {
    const key = size.join(':')
    let geometry = boxGeometryCache.get(key)
    if (!geometry) {
      geometry = new BoxGeometry(...size)
      boxGeometryCache.set(key, geometry)
      geometries.add(geometry)
    }
    return addMesh(geometry, position, material, { ...meshOptions, rotationY })
  }

  function addCylinder(
    radiusTop: number,
    radiusBottom: number,
    cylinderHeight: number,
    radialSegments: number,
    position: readonly [number, number, number],
    material: Material,
    meshOptions: MeshOptions = {},
  ) {
    const key = [radiusTop, radiusBottom, cylinderHeight, radialSegments].join(':')
    let geometry = cylinderGeometryCache.get(key)
    if (!geometry) {
      geometry = new CylinderGeometry(
        radiusTop,
        radiusBottom,
        cylinderHeight,
        radialSegments,
      )
      cylinderGeometryCache.set(key, geometry)
      geometries.add(geometry)
    }
    return addMesh(geometry, position, material, meshOptions)
  }

  function addTorus(
    radius: number,
    tube: number,
    position: readonly [number, number, number],
    material: Material,
    meshOptions: MeshOptions = {},
  ) {
    const geometry = new TorusGeometry(radius, tube, 8, 48)
    geometries.add(geometry)
    return addMesh(geometry, position, material, meshOptions)
  }

  const { width: roomWidth, depth: roomDepth, height: roomHeight } = options.world.room
  const apronDepth = 3.6
  addBox(
    [roomWidth, 0.12, roomDepth + apronDepth],
    [0, -0.06, apronDepth / 2],
    floorMaterial,
  )
  addBox([roomWidth, roomHeight, 0.18], [0, roomHeight / 2, -roomDepth / 2], wallMaterial)
  addBox([0.18, roomHeight, roomDepth], [-roomWidth / 2, roomHeight / 2, 0], wallMaterial)
  addBox([0.18, roomHeight, roomDepth], [roomWidth / 2, roomHeight / 2, 0], wallMaterial)
  addBox([roomWidth, 0.13, roomDepth], [0, roomHeight + 0.065, 0], wallMaterial)

  if (isDepositionAnnex) {
    // Broad suspended acoustic baffles and narrow examination lights make the
    // annex feel dry, institutional, and controlled.
    ;[-4.15, -1.55, 1.05, 3.45].forEach((z, index) => {
      addBox(
        [roomWidth - 1.7, 0.1, 0.72],
        [0, roomHeight - 0.2 - (index % 2) * 0.04, z],
        darkMetalMaterial,
      )
      addBox([1.65, 0.025, 0.12], [0, roomHeight - 0.28, z + 0.38], overheadMaterial)
      ;[-1, 1].forEach((side) => {
        addBox(
          [0.045, 0.16, 0.045],
          [side * 2.9, roomHeight - 0.31, z],
          bronzeMaterial,
        )
      })
    })
  } else {
    // Recessed ceiling ribs and stepped cross-members establish the concourse's
    // civic-deco silhouette. The neutral luminaires remain record-white utility
    // light; the smoked bronze is material, never an action-state glow.
    ;[-4.1, -1.1, 2.05].forEach((z) => {
      addBox([roomWidth - 0.9, 0.18, 0.28], [0, roomHeight - 0.15, z], darkMetalMaterial)
      addBox([2.35, 0.025, 0.075], [0, roomHeight - 0.255, z + 0.14], overheadMaterial)
      ;[-1, 1].forEach((side) => {
        addBox(
          [0.055, 0.035, 1.1],
          [side * 1.38, roomHeight - 0.27, z + 0.42],
          bronzeMaterial,
        )
        addBox(
          [0.055, 0.035, 0.72],
          [side * 1.72, roomHeight - 0.27, z + 0.28],
          bronzeMaterial,
        )
      })
    })
  }
  addBox([0.72, 0.035, 0.09], [-4.45, roomHeight - 0.29, 2.27], alarmMaterial)
  addBox([0.72, 0.035, 0.09], [4.45, roomHeight - 0.29, 2.27], alarmMaterial)

  if (isDepositionAnnex) {
    // Twin evidence rails run from the player toward the testimony dais. Cross
    // ticks read like measured deposition time without becoming an interface.
    ;[-1, 1].forEach((side) => {
      addBox([0.045, 0.018, 7.2], [side * 1.28, 0.018, -0.55], bronzeMaterial, 0, {
        castShadow: false,
      })
    })
    ;[-3.55, -2.65, -1.75, -0.85, 0.05, 0.95, 1.85].forEach((z, index) => {
      addBox(
        [index % 2 === 0 ? 2.62 : 2.18, 0.016, 0.035],
        [0, 0.02, z],
        index === 3 ? amberMaterial : bronzeMaterial,
        0,
        { castShadow: false },
      )
    })
  } else {
    // The floor register is real geometry rather than a baked line. It leads the
    // eye to the central rain ledger while keeping all semantic state on the
    // threshold routes and their DOM mirrors.
    const inlayCenterZ = -1.15
    const inlayHalfWidth = 2.65
    const inlayHalfDepth = 2.55
    const inlayCorner = 0.78
    const inlayStraightX = inlayHalfWidth * 2 - inlayCorner * 2
    const inlayStraightZ = inlayHalfDepth * 2 - inlayCorner * 2
    ;[-1, 1].forEach((side) => {
      addBox(
        [inlayStraightX, 0.018, 0.042],
        [0, 0.018, inlayCenterZ + side * inlayHalfDepth],
        bronzeMaterial,
        0,
        { castShadow: false },
      )
      addBox(
        [0.042, 0.018, inlayStraightZ],
        [side * inlayHalfWidth, 0.018, inlayCenterZ],
        bronzeMaterial,
        0,
        { castShadow: false },
      )
    })
    ;[
      [-1, -1, Math.PI / 4],
      [1, -1, -Math.PI / 4],
      [-1, 1, -Math.PI / 4],
      [1, 1, Math.PI / 4],
    ].forEach(([xSign, zSign, rotation]) => {
      addBox(
        [inlayCorner * Math.SQRT2, 0.018, 0.042],
        [
          xSign * (inlayHalfWidth - inlayCorner / 2),
          0.018,
          inlayCenterZ + zSign * (inlayHalfDepth - inlayCorner / 2),
        ],
        bronzeMaterial,
        rotation,
        { castShadow: false },
      )
    })
  }

  const monumentZ = isDepositionAnnex ? -1.58 : -1.05
  if (isDepositionAnnex) {
    // A low testimony dais replaces the concourse monument: two opposed
    // chairs, an examination table, and a suspended raw-record carrier. Nothing
    // here is interactive; the four chamber thresholds remain the only routes.
    addBox([3.75, 0.16, 1.72], [0, 0.08, monumentZ], plinthMaterial)
    addBox([3.42, 0.08, 1.42], [0, 0.2, monumentZ], darkMetalMaterial)
    addBox([3.12, 0.12, 0.92], [0, 0.94, monumentZ], plinthMaterial)
    ;[-1, 1].forEach((side) => {
      addBox([0.16, 0.7, 0.72], [side * 1.25, 0.56, monumentZ], darkMetalMaterial)
      addBox([0.62, 0.1, 0.6], [side * 0.72, 0.62, monumentZ + 1.12], blackCeramicMaterial)
      addBox([0.66, 0.82, 0.1], [side * 0.72, 1.03, monumentZ + 1.39], blackCeramicMaterial)
      addBox([0.035, 0.62, 0.035], [side * 0.98, 0.32, monumentZ + 1.12], bronzeMaterial)
      addBox([0.035, 0.62, 0.035], [side * 0.46, 0.32, monumentZ + 1.12], bronzeMaterial)
    })
    addBox([0.78, 0.5, 0.055], [0, 1.33, monumentZ], pressureGlassMaterial, 0, {
      castShadow: false,
      receiveShadow: false,
    })
    addBox([0.58, 0.34, 0.035], [0, 1.33, monumentZ + 0.035], neutralGlowMaterial, 0, {
      castShadow: false,
      receiveShadow: false,
    })
    addCylinder(0.1, 0.12, 0.18, 16, [-0.72, 1.1, monumentZ + 0.08], neutralGlowMaterial)
    addCylinder(0.1, 0.12, 0.18, 16, [0.72, 1.1, monumentZ + 0.08], neutralGlowMaterial)
    addBox([2.6, 0.018, 0.035], [0, 1.02, monumentZ + 0.42], amberMaterial, 0, {
      castShadow: false,
      receiveShadow: false,
    })
  } else {
    // A custom-built archive monument replaces the blockout cube: an octagonal
    // civic base, smoked-bronze lamellae, a black ceramic record carrier, and
    // thick pressure glass. It is environmental storytelling only—no click target.
    addCylinder(0.94, 1.06, 0.18, 8, [0, 0.09, monumentZ], plinthMaterial)
    addCylinder(0.8, 0.88, 0.1, 8, [0, 0.23, monumentZ], bronzeMaterial)
    addCylinder(0.61, 0.66, 0.16, 24, [0, 0.36, monumentZ], darkMetalMaterial)
    addCylinder(
      0.29,
      0.33,
      1.18,
      24,
      [0, 0.98, monumentZ],
      pressureGlassMaterial,
      { castShadow: false, receiveShadow: false },
    )
    addCylinder(0.105, 0.13, 0.92, 16, [0, 0.96, monumentZ], blackCeramicMaterial)
    addCylinder(0.15, 0.15, 0.07, 16, [0, 1.38, monumentZ], neutralGlowMaterial)
    addTorus(0.37, 0.026, [0, 0.43, monumentZ], bronzeMaterial, {
      rotationX: Math.PI / 2,
    })
    addTorus(0.37, 0.026, [0, 1.52, monumentZ], bronzeMaterial, {
      rotationX: Math.PI / 2,
    })
    Array.from({ length: 8 }, (_, index) => (index / 8) * Math.PI * 2).forEach(
      (angle) => {
        const radius = 0.49
        addBox(
          [0.055, 1.04, 0.2],
          [Math.sin(angle) * radius, 0.98, monumentZ + Math.cos(angle) * radius],
          bronzeMaterial,
          angle,
        )
      },
    )
    addCylinder(0.48, 0.42, 0.1, 8, [0, 1.57, monumentZ], darkMetalMaterial)
    addCylinder(0.18, 0.24, 0.12, 16, [0, 1.68, monumentZ], neutralGlowMaterial)
    addBox([0.58, 0.02, 0.028], [0, 0.28, monumentZ + 0.88], amberMaterial, 0, {
      castShadow: false,
      receiveShadow: false,
    })
  }

  const lightVolumeMaterial = new MeshBasicMaterial({
    color: isDepositionAnnex ? 0xd0c7a4 : 0x9aabad,
    transparent: true,
    opacity: isDepositionAnnex ? 0.032 : 0.024,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  })
  materials.add(lightVolumeMaterial)
  addCylinder(
    isDepositionAnnex ? 0.24 : 0.08,
    isDepositionAnnex ? 1.34 : 0.82,
    isDepositionAnnex ? 2.15 : 2.45,
    32,
    [0, isDepositionAnnex ? 2.28 : 2.02, monumentZ],
    lightVolumeMaterial,
    { castShadow: false, receiveShadow: false },
  )

  if (isDepositionAnnex) {
    // Slender bays and a suspended witness-record plate make the rear wall read
    // as an institutional deposition archive, not exterior infrastructure.
    ;[-4.35, 4.35].forEach((x) => {
      addBox([0.22, roomHeight, 0.3], [x, roomHeight / 2, -3.65], darkMetalMaterial)
      ;[0.7, 1.72, 2.74].forEach((y) => {
        addBox([0.5, 0.035, 0.34], [x, y, -3.65], bronzeMaterial)
      })
    })
    addBox([3.42, 2.24, 0.16], [0, 1.72, -roomDepth / 2 + 0.09], darkMetalMaterial)
    if (featurePlateSource) {
      const recordPlateMaterial = new MeshBasicMaterial({
        color: 0xd7d6c9,
        map: featurePlateSource,
        toneMapped: false,
      })
      materials.add(recordPlateMaterial)
      const recordPlateGeometry = new PlaneGeometry(3.04, 1.84)
      geometries.add(recordPlateGeometry)
      addMesh(
        recordPlateGeometry,
        [0, 1.72, -roomDepth / 2 + 0.205],
        recordPlateMaterial,
        { castShadow: false, receiveShadow: false },
      )
      addMesh(
        recordPlateGeometry,
        [0, 1.72, -roomDepth / 2 + 0.235],
        pressureGlassMaterial,
        { castShadow: false, receiveShadow: false },
      )
    }
    ;[-1, 1].forEach((side) => {
      addBox(
        [0.06, 2.08, 0.09],
        [side * 1.58, 1.72, -roomDepth / 2 + 0.28],
        bronzeMaterial,
      )
      addBox(
        [0.035, 0.62, 0.035],
        [side * 1.28, 3.1, -roomDepth / 2 + 0.3],
        bronzeMaterial,
      )
    })
    ;[-0.62, 0.62].forEach((offsetY) => {
      addBox(
        [3.16, 0.045, 0.09],
        [0, 1.72 + offsetY, -roomDepth / 2 + 0.28],
        bronzeMaterial,
      )
    })
    const dustMoteMaterial = new MeshBasicMaterial({
      color: 0xd8cfaa,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    })
    materials.add(dustMoteMaterial)
    Array.from({ length: 22 }, (_, index) => {
      const x = Math.sin(index * 2.17) * (0.32 + (index % 5) * 0.24)
      const y = 0.62 + (index % 7) * 0.39
      const z = monumentZ + Math.cos(index * 1.73) * 0.92
      const size = 0.012 + (index % 3) * 0.006
      addBox([size, size, size], [x, y, z], dustMoteMaterial, 0, {
        castShadow: false,
        receiveShadow: false,
      })
    })
  } else {
    // Structural piers establish depth and keep the generated material texture
    // on broad, low-triangle surfaces rather than treating the poster as geometry.
    ;[-3.4, 3.4].forEach((x) => {
      addBox([0.34, roomHeight, 0.48], [x, roomHeight / 2, -3.65], darkMetalMaterial)
      addBox([0.28, roomHeight, 0.38], [x, roomHeight / 2, 2.4], darkMetalMaterial)
      ;[0.56, 2.56].forEach((y) => {
        addBox([0.45, 0.055, 0.58], [x, y, -3.65], bronzeMaterial)
      })
    })

    // Between the two rear thresholds, a narrow pressure-glass stormwell makes
    // the city's rain-cooling infrastructure spatially present. The generated
    // image is only a deep view plate; mullions, recess, glass and light are live.
    addBox([1.02, 2.78, 0.18], [0, 1.52, -roomDepth / 2 + 0.09], darkMetalMaterial)
    if (featurePlateSource) {
      const stormwellMaterial = new MeshBasicMaterial({
        color: 0xffffff,
        map: featurePlateSource,
        toneMapped: false,
      })
      materials.add(stormwellMaterial)
      const stormwellGeometry = new PlaneGeometry(0.84, 2.56)
      geometries.add(stormwellGeometry)
      addMesh(
        stormwellGeometry,
        [0, 1.52, -roomDepth / 2 + 0.205],
        stormwellMaterial,
        { castShadow: false, receiveShadow: false },
      )
      addMesh(
        stormwellGeometry,
        [0, 1.52, -roomDepth / 2 + 0.235],
        pressureGlassMaterial,
        { castShadow: false, receiveShadow: false },
      )
    }
    ;[-1, 1].forEach((side) => {
      addBox(
        [0.075, 2.68, 0.1],
        [side * 0.46, 1.52, -roomDepth / 2 + 0.27],
        bronzeMaterial,
      )
    })
    ;[-0.42, 0.42].forEach((offsetY) => {
      addBox(
        [0.94, 0.055, 0.1],
        [0, 1.52 + offsetY, -roomDepth / 2 + 0.27],
        bronzeMaterial,
      )
    })
  }

  options.world.portals.forEach((portal, index) => {
    const frameMaterial = new MeshStandardMaterial({
      color: isDepositionAnnex ? 0x68716a : 0x3a464d,
      roughness: isDepositionAnnex ? 0.78 : 0.65,
      metalness: isDepositionAnnex ? 0.3 : 0.42,
    })
    const signalMaterial = new MeshStandardMaterial({
      color: 0x59676b,
      emissive: 0x182124,
      emissiveIntensity: 0.36,
      roughness: 0.48,
      metalness: 0.32,
    })
    materials.add(frameMaterial)
    materials.add(signalMaterial)
    const normal = new Vector3(Math.sin(portal.rotationY), 0, Math.cos(portal.rotationY))
    const tangent = new Vector3(Math.cos(portal.rotationY), 0, -Math.sin(portal.rotationY))

    // The dry annex uses two restrained certification frames; the civic
    // concourse keeps its deeper three-step deco threshold.
    const frameSteps = isDepositionAnnex ? [0, 1] : [0, 1, 2]
    frameSteps.forEach((step) => {
      const sideDistance =
        portal.size.width / 2 + (isDepositionAnnex ? 0.21 : 0.27) + step * 0.13
      const frameHeight =
        portal.size.height + (isDepositionAnnex ? 0.42 : 0.54) + step * 0.16
      const frameDepth = 0.1 + step * 0.018
      const material =
        step === 1 ? bronzeMaterial : isDepositionAnnex ? frameMaterial : darkMetalMaterial
      ;[-1, 1].forEach((side) => {
        const sidePosition = new Vector3(...portal.position)
          .addScaledVector(tangent, side * sideDistance)
          .addScaledVector(normal, 0.18 + step * 0.012)
        sidePosition.y += 0.08
        addBox(
          [0.075 + step * 0.018, frameHeight, frameDepth],
          [sidePosition.x, sidePosition.y, sidePosition.z],
          material,
          portal.rotationY,
        )
      })
      const crownPosition = new Vector3(...portal.position).addScaledVector(
        normal,
        0.18 + step * 0.012,
      )
      crownPosition.y +=
        portal.size.height / 2 + (isDepositionAnnex ? 0.27 : 0.34) + step * 0.14
      addBox(
        [
          portal.size.width + (isDepositionAnnex ? 0.42 : 0.54) + step * 0.26,
          0.075 + step * 0.016,
          frameDepth,
        ],
        [crownPosition.x, crownPosition.y, crownPosition.z],
        material,
        portal.rotationY,
      )
    })

    if (isDepositionAnnex) {
      ;[-1, 0, 1].forEach((register) => {
        const registerPosition = new Vector3(...portal.position)
          .addScaledVector(tangent, register * 0.24)
          .addScaledVector(normal, 0.255)
        registerPosition.y += portal.size.height / 2 + 0.48
        addBox(
          [0.16, 0.045, 0.06],
          [registerPosition.x, registerPosition.y, registerPosition.z],
          register === 0 ? neutralGlowMaterial : bronzeMaterial,
          portal.rotationY,
        )
      })
    } else {
      ;[-1, 0, 1].forEach((flute) => {
        const crownPosition = new Vector3(...portal.position)
          .addScaledVector(tangent, flute * 0.2)
          .addScaledVector(normal, 0.255)
        crownPosition.y += portal.size.height / 2 + 0.58 - Math.abs(flute) * 0.07
        addBox(
          [0.08, 0.18 + (1 - Math.abs(flute)) * 0.08, 0.08],
          [crownPosition.x, crownPosition.y, crownPosition.z],
          bronzeMaterial,
          portal.rotationY,
        )
      })
    }

    // A dark cavity and four physical jamb pieces keep the view plate visibly
    // recessed. The previous single slab read as a flat image frame.
    addBox(
      [portal.size.width + 0.42, portal.size.height + 0.4, 0.3],
      portal.position,
      darkMetalMaterial,
      portal.rotationY,
    )
    ;[-1, 1].forEach((side) => {
      const jambPosition = new Vector3(...portal.position)
        .addScaledVector(tangent, side * (portal.size.width / 2 + 0.11))
        .addScaledVector(normal, 0.13)
      addBox(
        [0.18, portal.size.height + 0.42, 0.24],
        [jambPosition.x, jambPosition.y, jambPosition.z],
        frameMaterial,
        portal.rotationY,
      )
    })
    ;[-1, 1].forEach((vertical) => {
      const railPosition = new Vector3(...portal.position)
        .addScaledVector(normal, 0.13)
      railPosition.y += vertical * (portal.size.height / 2 + 0.11)
      addBox(
        [portal.size.width + 0.4, 0.18, 0.24],
        [railPosition.x, railPosition.y, railPosition.z],
        frameMaterial,
        portal.rotationY,
      )
    })

    const viewTexture = portalTextures[index]
    if (viewTexture) coverPortalTexture(viewTexture, portal, anisotropy)
    const viewMaterial = new MeshBasicMaterial({
      color: viewTexture ? 0xffffff : 0x172026,
      map: viewTexture,
      toneMapped: false,
    })
    materials.add(viewMaterial)
    const geometry = new PlaneGeometry(portal.size.width, portal.size.height)
    geometries.add(geometry)
    const view = new Mesh(geometry, viewMaterial)
    view.position.set(...portal.position).addScaledVector(normal, 0.105)
    view.rotation.y = portal.rotationY
    scene.add(view)

    // The threshold lintel, floor route, and plinth register share one material,
    // so hover/selection/filing reads as a physical system rather than an overlay.
    addBox(
      [portal.size.width * 0.44, 0.035, 0.035],
      [
        portal.position[0] + normal.x * 0.19,
        portal.position[1] + portal.size.height / 2 - 0.12,
        portal.position[2] + normal.z * 0.19,
      ],
      signalMaterial,
      portal.rotationY,
    )
    const thresholdStep = new Vector3(...portal.position).addScaledVector(normal, 0.52)
    thresholdStep.y = 0.04
    addBox(
      [portal.size.width + 0.46, 0.08, 0.72],
      [thresholdStep.x, thresholdStep.y, thresholdStep.z],
      blackCeramicMaterial,
      portal.rotationY,
    )
    const thresholdInlay = thresholdStep.clone().addScaledVector(normal, 0.06)
    thresholdInlay.y = 0.086
    addBox(
      [portal.size.width * 0.72, 0.012, 0.035],
      [thresholdInlay.x, thresholdInlay.y, thresholdInlay.z],
      bronzeMaterial,
      portal.rotationY,
      { castShadow: false },
    )

    const routeStart = new Vector3((index - 1.5) * 0.22, 0.016, -0.28)
    const routeEnd = new Vector3(...portal.position).addScaledVector(normal, 0.5)
    routeEnd.y = routeStart.y
    const routeDelta = routeEnd.clone().sub(routeStart)
    const routeLength = Math.hypot(routeDelta.x, routeDelta.z)
    const routeMidpoint = routeStart.clone().add(routeEnd).multiplyScalar(0.5)
    addBox(
      [0.04, 0.012, routeLength],
      [routeMidpoint.x, routeMidpoint.y, routeMidpoint.z],
      signalMaterial,
      Math.atan2(routeDelta.x, routeDelta.z),
    )
    addBox(
      [0.18, 0.018, 0.042],
      [(index - 1.5) * 0.28, 0.845, -0.405],
      signalMaterial,
    )

    // A barred shutter — four stacked bars spanning the plate — shown only when
    // this portal resolves to the sealed outcome. Primitive geometry, no texture;
    // hidden by default. A full silhouette, not one thin line.
    const barGeometry = new BoxGeometry(portal.size.width * 0.92, 0.09, 0.06)
    geometries.add(barGeometry)
    const barMaterial = new MeshStandardMaterial({
      color: 0x8f9aa0,
      emissive: 0x1c2226,
      emissiveIntensity: 0.3,
      roughness: 0.6,
      metalness: 0.3,
    })
    materials.add(barMaterial)
    const barMeshes: Mesh[] = []
    const barOffsets = [-0.66, -0.22, 0.22, 0.66].map((f) => f * (portal.size.height / 2))
    barOffsets.forEach((dy) => {
      const barMesh = new Mesh(barGeometry, barMaterial)
      barMesh.position.set(...portal.position).addScaledVector(normal, 0.12)
      barMesh.position.y += dy
      barMesh.rotation.y = portal.rotationY
      barMesh.visible = false
      scene.add(barMesh)
      barMeshes.push(barMesh)
    })

    // A bright amber under-seam at the base of the threshold, shown only when this
    // portal resolves to the opened outcome — the light-spill response's core.
    const seamGeometry = new BoxGeometry(portal.size.width * 0.86, 0.06, 0.05)
    geometries.add(seamGeometry)
    const seamMaterial = new MeshStandardMaterial({
      color: 0xe6bd78,
      emissive: 0x9c6417,
      emissiveIntensity: 1.35,
      roughness: 0.5,
      metalness: 0.2,
    })
    materials.add(seamMaterial)
    const seamMesh = new Mesh(seamGeometry, seamMaterial)
    seamMesh.position.set(...portal.position).addScaledVector(normal, 0.12)
    seamMesh.position.y -= portal.size.height / 2 - 0.09
    seamMesh.rotation.y = portal.rotationY
    seamMesh.visible = false
    scene.add(seamMesh)

    const anchor = new Vector3(...portal.position).addScaledVector(normal, 0.18)
    portalRecords.push({
      portal,
      anchor,
      frameMaterial,
      signalMaterial,
      barMeshes,
      barMaterial,
      seamMesh,
      seamMaterial,
    })
  })

  if (secretRoomEntry) {
    const entry = secretRoomEntry
    // Reader Key 04 reveals one book-width service seam, not a fifth civic
    // threshold. These few primitives deliberately avoid the portal kit's crown,
    // route line, and filed-state signal vocabulary.
    const normal = new Vector3(
      Math.sin(entry.rotationY),
      0,
      Math.cos(entry.rotationY),
    )
    const tangent = new Vector3(
      Math.cos(entry.rotationY),
      0,
      -Math.sin(entry.rotationY),
    )
    const panelMaterial = new MeshStandardMaterial({
      color: isDepositionAnnex ? 0x2b302d : 0x20282d,
      emissive: 0x0d1112,
      emissiveIntensity: 0.12,
      roughness: 0.8,
      metalness: 0.28,
    })
    const signalMaterial = new MeshStandardMaterial({
      color: 0xc89445,
      emissive: 0x6a3f0d,
      emissiveIntensity: 0.82,
      roughness: 0.48,
      metalness: 0.32,
    })
    materials.add(panelMaterial)
    materials.add(signalMaterial)

    function entryCoordinates(
      tangentOffset: number,
      verticalOffset: number,
      normalOffset: number,
    ): [number, number, number] {
      const position = new Vector3(...entry.position)
        .addScaledVector(tangent, tangentOffset)
        .addScaledVector(normal, normalOffset)
      position.y += verticalOffset
      return [position.x, position.y, position.z]
    }

    const meshes = [
      addBox(
        [0.7, 1.46, 0.08],
        entryCoordinates(0, 0, 0.13),
        panelMaterial,
        entry.rotationY,
      ),
      addBox(
        [0.045, 1.5, 0.11],
        entryCoordinates(-0.375, 0, 0.17),
        bronzeMaterial,
        entry.rotationY,
      ),
      addBox(
        [0.045, 1.5, 0.11],
        entryCoordinates(0.375, 0, 0.17),
        bronzeMaterial,
        entry.rotationY,
      ),
      addBox(
        [0.79, 0.045, 0.11],
        entryCoordinates(0, 0.75, 0.17),
        bronzeMaterial,
        entry.rotationY,
      ),
      addBox(
        [0.026, 1.16, 0.025],
        entryCoordinates(0, 0.02, 0.19),
        signalMaterial,
        entry.rotationY,
        { castShadow: false },
      ),
      addBox(
        [0.15, 0.07, 0.03],
        entryCoordinates(0.19, -0.2, 0.2),
        signalMaterial,
        entry.rotationY,
        { castShadow: false },
      ),
    ]
    meshes.forEach((mesh) => {
      mesh.visible = false
    })
    const anchor = new Vector3(...entry.position)
      .addScaledVector(normal, 0.22)
    anchor.y += 0.08
    secretRoomRecord = {
      anchor,
      meshes,
      panelMaterial,
      signalMaterial,
    }
  }

  const serviceBaseIntensity = isDepositionAnnex ? 1.72 : 1.45
  const plinthBaseIntensity = isDepositionAnnex ? 13.5 : 21
  const ambient = new AmbientLight(
    isDepositionAnnex ? 0xa6a88f : 0x8fa0a5,
    isDepositionAnnex ? 0.72 : 0.56,
  )
  const hemisphere = new HemisphereLight(
    isDepositionAnnex ? 0xd5cfb4 : 0xc2d0d3,
    isDepositionAnnex ? 0x292e27 : 0x222a2e,
    isDepositionAnnex ? 1.34 : 1.18,
  )
  const serviceLight = new DirectionalLight(
    isDepositionAnnex ? 0xf0dfb8 : 0xe6c28f,
    serviceBaseIntensity,
  )
  serviceLight.position.set(-2.8, 4.8, 4.2)
  serviceLight.target.position.set(0, 0.45, -1.2)
  serviceLight.castShadow = true
  serviceLight.shadow.mapSize.set(1024, 1024)
  serviceLight.shadow.camera.near = 1
  serviceLight.shadow.camera.far = 15
  serviceLight.shadow.camera.left = -6.5
  serviceLight.shadow.camera.right = 6.5
  serviceLight.shadow.camera.top = 5
  serviceLight.shadow.camera.bottom = -2
  serviceLight.shadow.bias = -0.00035
  const plinthLight = new PointLight(
    isDepositionAnnex ? 0xc9a66f : 0xd2a15b,
    plinthBaseIntensity,
    9,
    2,
  )
  plinthLight.position.set(0, 1.45, 1.35)
  const monumentLight = new PointLight(
    isDepositionAnnex ? 0xe1d5aa : 0x9fb1b3,
    isDepositionAnnex ? 9.2 : 7.5,
    4.4,
    2,
  )
  monumentLight.position.set(0, 1.24, monumentZ)
  const rearFill = new PointLight(
    isDepositionAnnex ? 0xb7b59a : 0x91aeb2,
    isDepositionAnnex ? 10.5 : 14,
    11,
    2,
  )
  rearFill.position.set(0, 2.55, -3.7)
  const rearFeatureFill = new PointLight(
    isDepositionAnnex ? 0xd6c99c : 0x71878b,
    isDepositionAnnex ? 7.4 : 5.2,
    4.8,
    2,
  )
  rearFeatureFill.position.set(0, 2.05, -roomDepth / 2 + 0.8)
  const leftThresholdFill = new PointLight(0x778b8e, 6.5, 6.5, 2)
  leftThresholdFill.position.set(-3.6, 2.5, -1.4)
  const rightThresholdFill = new PointLight(0x778b8e, 6.5, 6.5, 2)
  rightThresholdFill.position.set(3.6, 2.5, -1.4)
  const alarmFill = new PointLight(0xd45b46, 0, 8.5, 2)
  alarmFill.position.set(0, roomHeight - 0.4, 2.2)
  scene.add(
    ambient,
    hemisphere,
    serviceLight,
    serviceLight.target,
    plinthLight,
    monumentLight,
    rearFill,
    rearFeatureFill,
    leftThresholdFill,
    rightThresholdFill,
    alarmFill,
  )

  function setSelection(siteId: SiteId | undefined) {
    if (selectedSiteId === siteId) return
    selectedSiteId = siteId
    const portal = options.world.portals.find((candidate) => candidate.siteId === siteId)
    setCameraPose(portal?.camera ?? homePose)
    updatePortalMaterials()
  }

  function setPreview(siteId: SiteId | undefined) {
    if (previewSiteId === siteId) return
    previewSiteId = siteId
    updatePortalMaterials()
    scheduleFrame()
  }

  function setCompleted(siteIds: readonly SiteId[]) {
    completed.clear()
    siteIds.forEach((siteId) => completed.add(siteId))
    updatePortalMaterials()
    scheduleFrame()
  }

  function setResolvedOutcomes(outcomes: ReadonlyMap<SiteId, SiteWorldOutcome>) {
    resolvedOutcomes = outcomes
    updatePortalMaterials()
    scheduleFrame()
  }

  function setSecretRoomAvailable(available: boolean) {
    if (secretRoomAvailable === available) return
    secretRoomAvailable = available
    if (secretRoomRecord) {
      secretRoomRecord.meshes.forEach((mesh) => {
        mesh.visible = available
      })
      secretRoomRecord.panelMaterial.emissiveIntensity = available ? 0.12 : 0
      secretRoomRecord.signalMaterial.emissiveIntensity = available ? 0.82 : 0
      renderer.shadowMap.needsUpdate = true
    }
    if (!available) {
      resetSecretRoomButton(false)
    }
    scheduleFrame()
  }

  function setReturnEmphasis(siteId: SiteId | undefined) {
    if (returnEmphasisSiteId === siteId) return
    returnEmphasisSiteId = siteId
    updatePortalMaterials()
    scheduleFrame()
  }

  function setAlarm(level: number) {
    const tier = clamp(Math.round(level), 0, 3)
    fog.density = baseFogDensity + tier * (isDepositionAnnex ? 0.005 : 0.004)
    serviceLight.intensity = serviceBaseIntensity - tier * 0.1
    plinthLight.intensity = plinthBaseIntensity - tier * (isDepositionAnnex ? 0.8 : 1.5)
    alarmFill.intensity = tier * 3.4
    alarmMaterial.color.setHex(tier > 0 ? 0xa34938 : 0x241b19)
    alarmMaterial.opacity = tier > 0 ? 0.42 + tier * 0.12 : 0.36
    renderer.toneMappingExposure = baseExposure - tier * 0.035
    scene.background = new Color(tier >= 2 ? alarmBackground : baseBackground)
    renderer.setClearColor(tier >= 2 ? alarmBackground : baseClearColor, 1)
    scheduleFrame()
  }

  function setAuthoritySignal(signal: AuthoritySignal) {
    if (authoritySignal === signal) return
    authoritySignal = signal
    updatePortalMaterials()
    scheduleFrame()
  }

  function destroy() {
    if (destroyed) return
    destroyed = true
    moving = false
    cancelDrag()
    stopFrame()
    resizeObserver?.disconnect()
    intersectionObserver?.disconnect()
    if (!resizeObserver) window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    options.signal.removeEventListener('abort', onAbort)
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', endDrag)
    canvas.removeEventListener('pointercancel', endDrag)
    canvas.removeEventListener('webglcontextlost', onContextLost)
    resetPortalButtons(
      options.world,
      options.portalButtons,
      options.root.dataset.active === 'true',
    )
    resetSecretRoomButton(options.root.dataset.active === 'true')
    geometries.forEach((geometry) => geometry.dispose())
    materials.forEach((material) => material.dispose())
    textures.forEach((texture) => texture.dispose())
    renderer.renderLists.dispose()
    renderer.dispose()
    if (!contextLost) renderer.forceContextLoss()
    canvas.remove()
  }

  resize()
  applyCamera()
  updatePortalMaterials()
  renderer.render(scene, camera)
  // Architecture and lights are static between authored state changes. Keep
  // the first soft-shadow map, then request a refresh only when portal geometry
  // changes instead of paying for it during every bounded drag frame.
  renderer.shadowMap.autoUpdate = false
  projectPortals()
  projectSecretRoomEntry()
  reportLoop(false)

  return {
    setSelection,
    setPreview,
    setCompleted,
    setAlarm,
    setAuthoritySignal,
    setResolvedOutcomes,
    setSecretRoomAvailable,
    setReturnEmphasis,
    invalidate: scheduleFrame,
    destroy,
  }
}

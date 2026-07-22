import type {
  Material,
  MeshStandardMaterial,
  Texture,
  Vector3,
  WebGLRenderer,
} from 'three'
import type {
  SceneWorldCamera,
  SceneWorldDefinition,
  SceneWorldPortal,
  SiteDefinition,
  SiteId,
} from '../game/types'
import { containedPosterAnchor } from './posterProjection'

export interface AnnexWorldHandle {
  setSelection(siteId: SiteId | undefined): void
  setCompleted(siteIds: readonly SiteId[]): void
  setAlarm(level: number): void
  invalidate(): void
  destroy(): void
}

interface CreateAnnexWorldOptions {
  root: HTMLElement
  world: SceneWorldDefinition
  sites: readonly SiteDefinition[]
  portalButtons: ReadonlyMap<SiteId, HTMLButtonElement>
  signal: AbortSignal
  onContextLost: () => void
  onLoopChange: (running: boolean) => void
}

interface PortalRenderRecord {
  portal: SceneWorldPortal
  anchor: Vector3
  frameMaterial: MeshStandardMaterial
}

type ThreeModule = typeof import('three')

const CAMERA_NEAR = 0.08
const CAMERA_FAR = 48
const MAX_DRAG_YAW = 0.17
const MAX_DRAG_PITCH = 0.085

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
) {
  world.portals.forEach((portal) => {
    const button = buttons.get(portal.siteId)
    if (!button) return
    const anchor = containedPosterAnchor(portal.posterAnchor)
    button.style.left = anchor.left
    button.style.top = anchor.top
    button.style.visibility = 'visible'
    button.style.pointerEvents = 'auto'
  })
}

function colorTexture(
  THREE: ThreeModule,
  texture: Texture,
  anisotropy: number,
): Texture {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
  texture.needsUpdate = true
  return texture
}

function repeatedTexture(
  THREE: ThreeModule,
  source: Texture | null,
  repeatX: number,
  repeatY: number,
  anisotropy: number,
): Texture | null {
  if (!source) return null
  const texture = source.clone()
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  return colorTexture(THREE, texture, anisotropy)
}

function coverPortalTexture(
  THREE: ThreeModule,
  texture: Texture,
  portal: SceneWorldPortal,
  anisotropy: number,
) {
  colorTexture(THREE, texture, anisotropy)
  const image = texture.image as { width?: number; height?: number }
  const imageAspect = (image.width ?? 16) / Math.max(1, image.height ?? 9)
  const planeAspect = portal.size.width / portal.size.height
  if (planeAspect < imageAspect) {
    texture.repeat.x = planeAspect / imageAspect
    texture.offset.x = (1 - texture.repeat.x) / 2
  } else {
    texture.repeat.y = imageAspect / planeAspect
    texture.offset.y = (1 - texture.repeat.y) / 2
  }
  texture.needsUpdate = true
}

async function loadTexture(loader: import('three').TextureLoader, src: string): Promise<Texture | null> {
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
  const THREE = await import('three')
  if (options.signal.aborted) return null

  const queriedHost = options.root.querySelector<HTMLElement>('.annex-world-canvas-host')
  if (!queriedHost) return null
  // Explicit non-null alias for the lifecycle callbacks declared below. TypeScript
  // deliberately does not retain DOM-query narrowing across every closure.
  const canvasHost: HTMLElement = queriedHost

  let renderer: WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({
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

  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.24
  renderer.setClearColor(0x090c0f, 1)

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
  let homePose = homeCameraForViewport(options.world, width, height)
  let currentPose = homePose
  let targetPose = homePose

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0b1014)
  const fog = new THREE.FogExp2(0x0b1014, 0.018)
  scene.fog = fog
  const compactInitialView = width <= 700 || width / height < 1.6
  const camera = new THREE.PerspectiveCamera(
    compactInitialView ? 64 : 52,
    width / height,
    CAMERA_NEAR,
    CAMERA_FAR,
  )
  const currentPosition = new THREE.Vector3(...homePose.position)
  const currentTarget = new THREE.Vector3(...homePose.target)
  const moveFromPosition = currentPosition.clone()
  const moveFromTarget = currentTarget.clone()
  const moveToPosition = currentPosition.clone()
  const moveToTarget = currentTarget.clone()
  const projected = new THREE.Vector3()
  const cameraDirection = new THREE.Vector3()
  const toAnchor = new THREE.Vector3()
  const lookDirection = new THREE.Vector3()
  const lookPoint = new THREE.Vector3()
  const lookSpherical = new THREE.Spherical()

  const textures = new Set<Texture>()
  const materials = new Set<Material>()
  const geometries = new Set<import('three').BufferGeometry>()
  const portalRecords: PortalRenderRecord[] = []
  const completed = new Set<SiteId>()

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
    portalRecords.forEach(({ portal, anchor }) => {
      const button = options.portalButtons.get(portal.siteId)
      if (!button) return
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
      const x = clamp(((projected.x + 1) / 2) * width, 24, width - 24)
      const y = clamp(((1 - projected.y) / 2) * height, 24, height - 24)
      button.style.left = `${x}px`
      button.style.top = `${y}px`
      button.style.visibility = 'visible'
      button.style.pointerEvents = 'auto'
    })
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
    portalRecords.forEach(({ portal, frameMaterial }) => {
      const selected = portal.siteId === selectedSiteId
      const filed = completed.has(portal.siteId)
      const color = filed ? 0x6db6b7 : selected ? 0xc89445 : 0x303b43
      const emissive = filed ? 0x173f42 : selected ? 0x4b2f0c : 0x0b1417
      frameMaterial.color.setHex(color)
      frameMaterial.emissive.setHex(emissive)
      frameMaterial.emissiveIntensity = filed || selected ? 0.44 : 0.2
    })
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
    resetPortalButtons(options.world, options.portalButtons)
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

  const loader = new THREE.TextureLoader()
  const portalSources = options.world.portals.map((portal) => {
    const site = options.sites.find((candidate) => candidate.id === portal.siteId)
    return site?.closeup?.src ?? ''
  })
  const [concreteSource, terrazzoSource, ...portalTextures] = await Promise.all([
    loadTexture(loader, options.world.concreteSrc),
    loadTexture(loader, options.world.terrazzoSrc),
    ...portalSources.map((src) => (src ? loadTexture(loader, src) : Promise.resolve(null))),
  ])

  const loadedTextures = [concreteSource, terrazzoSource, ...portalTextures]
  if (options.signal.aborted || destroyed || contextLost) {
    loadedTextures.forEach((texture) => texture?.dispose())
    if (!destroyed) destroy()
    return null
  }

  loadedTextures.forEach((texture) => {
    if (texture) textures.add(texture)
  })

  const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
  const wallTexture = repeatedTexture(THREE, concreteSource, 3.4, 1.3, anisotropy)
  const floorTexture = repeatedTexture(THREE, terrazzoSource, 3.2, 3.2, anisotropy)
  const plinthTexture = repeatedTexture(THREE, concreteSource, 1.2, 1, anisotropy)
  ;[wallTexture, floorTexture, plinthTexture].forEach((texture) => {
    if (texture) textures.add(texture)
  })

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: wallTexture ? 0xffffff : 0x252f36,
    map: wallTexture,
    roughness: 0.94,
    metalness: 0.02,
  })
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: floorTexture ? 0xe1e7e8 : 0x141b20,
    map: floorTexture,
    roughness: 0.72,
    metalness: 0.08,
  })
  const plinthMaterial = new THREE.MeshStandardMaterial({
    color: plinthTexture ? 0xd9dfe0 : 0x202a30,
    map: plinthTexture,
    roughness: 0.88,
    metalness: 0.04,
  })
  const darkMetalMaterial = new THREE.MeshStandardMaterial({
    color: 0x171e23,
    roughness: 0.72,
    metalness: 0.38,
  })
  const amberMaterial = new THREE.MeshBasicMaterial({ color: 0xa96d25 })
  const neutralServiceMaterial = new THREE.MeshBasicMaterial({ color: 0x8a999b })
  ;[
    wallMaterial,
    floorMaterial,
    plinthMaterial,
    darkMetalMaterial,
    amberMaterial,
    neutralServiceMaterial,
  ].forEach((material) => materials.add(material))

  function addBox(
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    material: Material,
    rotationY = 0,
  ) {
    const geometry = new THREE.BoxGeometry(...size)
    geometries.add(geometry)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...position)
    mesh.rotation.y = rotationY
    scene.add(mesh)
    return mesh
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

  // A low, legible civic plinth gives the hub a physical center without adding
  // a gameplay object. Its light groove uses the established service amber.
  addBox([2.25, 0.78, 1.45], [0, 0.39, -1.05], plinthMaterial)
  addBox([2.05, 0.035, 1.25], [0, 0.805, -1.05], darkMetalMaterial)
  addBox([1.2, 0.018, 0.025], [0, 0.828, -0.415], amberMaterial)

  // Structural piers establish depth and keep the generated material texture
  // on broad, low-triangle surfaces rather than treating the poster as geometry.
  ;[-3.4, 3.4].forEach((x) => {
    addBox([0.34, roomHeight, 0.48], [x, roomHeight / 2, -3.65], darkMetalMaterial)
    addBox([0.28, roomHeight, 0.38], [x, roomHeight / 2, 2.4], darkMetalMaterial)
  })

  options.world.portals.forEach((portal, index) => {
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x303b43,
      roughness: 0.65,
      metalness: 0.42,
    })
    materials.add(frameMaterial)
    const normal = new THREE.Vector3(Math.sin(portal.rotationY), 0, Math.cos(portal.rotationY))
    addBox(
      [portal.size.width + 0.22, portal.size.height + 0.22, 0.16],
      portal.position,
      frameMaterial,
      portal.rotationY,
    )

    const viewTexture = portalTextures[index]
    if (viewTexture) coverPortalTexture(THREE, viewTexture, portal, anisotropy)
    const viewMaterial = new THREE.MeshBasicMaterial({
      color: viewTexture ? 0xffffff : 0x172026,
      map: viewTexture,
      toneMapped: false,
    })
    materials.add(viewMaterial)
    const geometry = new THREE.PlaneGeometry(portal.size.width, portal.size.height)
    geometries.add(geometry)
    const view = new THREE.Mesh(geometry, viewMaterial)
    view.position.set(...portal.position).addScaledVector(normal, 0.095)
    view.rotation.y = portal.rotationY
    scene.add(view)

    // Neutral threshold lintels make the side cuts legible without borrowing
    // amber/cyan gameplay semantics from the DOM state vocabulary.
    addBox(
      [portal.size.width * 0.44, 0.035, 0.035],
      [
        portal.position[0] + normal.x * 0.19,
        portal.position[1] + portal.size.height / 2 - 0.12,
        portal.position[2] + normal.z * 0.19,
      ],
      neutralServiceMaterial,
      portal.rotationY,
    )

    const anchor = new THREE.Vector3(...portal.position).addScaledVector(normal, 0.18)
    portalRecords.push({ portal, anchor, frameMaterial })
  })

  const ambient = new THREE.AmbientLight(0x8fa0a5, 0.72)
  const hemisphere = new THREE.HemisphereLight(0xc2d0d3, 0x222a2e, 1.52)
  const serviceLight = new THREE.DirectionalLight(0xe6c28f, 1.48)
  serviceLight.position.set(-2.8, 4.8, 4.2)
  const plinthLight = new THREE.PointLight(0xd2a15b, 19, 9, 2)
  plinthLight.position.set(0, 1.45, 1.35)
  const archiveFill = new THREE.PointLight(0x91aeb2, 13, 11, 2)
  archiveFill.position.set(0, 2.55, -3.7)
  scene.add(ambient, hemisphere, serviceLight, plinthLight, archiveFill)

  function setSelection(siteId: SiteId | undefined) {
    if (selectedSiteId === siteId) return
    selectedSiteId = siteId
    const portal = options.world.portals.find((candidate) => candidate.siteId === siteId)
    setCameraPose(portal?.camera ?? homePose)
    updatePortalMaterials()
  }

  function setCompleted(siteIds: readonly SiteId[]) {
    completed.clear()
    siteIds.forEach((siteId) => completed.add(siteId))
    updatePortalMaterials()
    scheduleFrame()
  }

  function setAlarm(level: number) {
    const tier = clamp(Math.round(level), 0, 3)
    fog.density = 0.018 + tier * 0.004
    serviceLight.intensity = 1.48 - tier * 0.1
    plinthLight.intensity = 19 - tier * 1.4
    renderer.toneMappingExposure = 1.24 - tier * 0.035
    scene.background = new THREE.Color(tier >= 2 ? 0x110e0d : 0x0b1014)
    renderer.setClearColor(tier >= 2 ? 0x110e0d : 0x090c0f, 1)
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
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', endDrag)
    canvas.removeEventListener('pointercancel', endDrag)
    canvas.removeEventListener('webglcontextlost', onContextLost)
    resetPortalButtons(options.world, options.portalButtons)
    geometries.forEach((geometry) => geometry.dispose())
    materials.forEach((material) => material.dispose())
    textures.forEach((texture) => texture.dispose())
    renderer.renderLists.dispose()
    renderer.dispose()
    canvas.remove()
  }

  resize()
  applyCamera()
  updatePortalMaterials()
  renderer.render(scene, camera)
  projectPortals()
  reportLoop(false)

  return { setSelection, setCompleted, setAlarm, invalidate: scheduleFrame, destroy }
}

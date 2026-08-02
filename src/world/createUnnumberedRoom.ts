import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  FogExp2,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'
import type { BufferGeometry, Material, Object3D, Texture } from 'three'
import type {
  SceneWorldCamera,
  UnnumberedReadingPointDefinition,
  UnnumberedReadingRoomDefinition,
} from '../game/types'
import { containedPosterAnchor } from './posterProjection'

export interface UnnumberedRoomInteractionSelection {
  pointId: string
  interactionId: string
}

export interface UnnumberedRoomHandle {
  setActivePoint(pointId: string | undefined): void
  setOpenedPoints(pointIds: readonly string[]): void
  setActiveInteraction(
    interaction: UnnumberedRoomInteractionSelection | undefined,
  ): void
  invalidate(): void
  destroy(): void
}

interface CreateUnnumberedRoomOptions {
  root: HTMLElement
  room: UnnumberedReadingRoomDefinition
  pointButtons: ReadonlyMap<string, HTMLButtonElement>
  signal: AbortSignal
  onContextLost: () => void
  onLoopChange: (running: boolean) => void
}

interface ReadingPointRenderRecord {
  definition: UnnumberedReadingPointDefinition
  anchor: Vector3
  markerMaterial: MeshStandardMaterial
  haloMaterial: MeshBasicMaterial
  lamp: PointLight
  tactileTransforms: readonly TactileTransform[]
}

interface TactilePose {
  position?: readonly [number, number, number]
  rotation?: readonly [number, number, number]
}

interface TactileTransform {
  object: Object3D
  restPosition: Vector3
  restRotation: Vector3
  startPosition: Vector3
  startRotation: Vector3
  goalPosition: Vector3
  goalRotation: Vector3
  poses: Readonly<Record<string, TactilePose>>
}

const CAMERA_NEAR = 0.08
const CAMERA_FAR = 42
const POINT_EDGE_INSET = 30
const TACTILE_TRAVEL_MS = 360

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function easeInOutCubic(value: number): number {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function resetPointButtons(
  room: UnnumberedReadingRoomDefinition,
  buttons: ReadonlyMap<string, HTMLButtonElement>,
  interactive: boolean,
) {
  room.readingPoints.forEach((point) => {
    const button = buttons.get(point.id)
    if (!button) return
    const anchor = containedPosterAnchor(point.posterAnchor)
    button.style.left = anchor.left
    button.style.top = anchor.top
    button.style.visibility = 'visible'
    button.style.pointerEvents = interactive ? 'auto' : 'none'
  })
}

function poseEquals(left: SceneWorldCamera, right: SceneWorldCamera): boolean {
  return (
    left.position.every((value, index) => value === right.position[index]) &&
    left.target.every((value, index) => value === right.target[index])
  )
}

function tactileTransform(
  object: Object3D,
  poses: Readonly<Record<string, TactilePose>>,
): TactileTransform {
  const restPosition = object.position.clone()
  const restRotation = new Vector3(
    object.rotation.x,
    object.rotation.y,
    object.rotation.z,
  )
  return {
    object,
    restPosition,
    restRotation,
    startPosition: restPosition.clone(),
    startRotation: restRotation.clone(),
    goalPosition: restPosition.clone(),
    goalRotation: restRotation.clone(),
    poses,
  }
}

/**
 * A bounded, invalidation-driven Three.js reading room. It projects authored
 * anchors onto real DOM buttons and never receives a reducer, dispatch function,
 * evidence, trust, alarm, or verdict state.
 */
export async function createUnnumberedRoom(
  options: CreateUnnumberedRoomOptions,
): Promise<UnnumberedRoomHandle | null> {
  if (options.signal.aborted) return null
  const canvasHost = options.root.querySelector<HTMLElement>(
    '.unnumbered-room-canvas-host',
  )
  if (!canvasHost) return null

  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance',
    })
  } catch {
    return null
  }

  const canvas = renderer.domElement
  canvas.className = 'unnumbered-room-canvas'
  canvas.dataset.unnumberedRoomCanvas = 'true'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.tabIndex = -1
  // `setSize(..., false)` updates only the high-DPI drawing buffer. Without an
  // explicit CSS box, that intrinsic 2x buffer becomes layout size, gives this
  // overflow-hidden stage a scroll range, and lets focus-following silently
  // displace the canvas and DOM markers from one another.
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    display: 'block',
    width: '100%',
    height: '100%',
  })
  canvasHost.appendChild(canvas)

  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.3
  renderer.shadowMap.enabled = true

  const scene = new Scene()
  scene.background = new Color(0x0e1415)
  const roomFog = new FogExp2(0x0e1415, 0.012)
  scene.fog = roomFog

  const camera = new PerspectiveCamera(52, 1, CAMERA_NEAR, CAMERA_FAR)
  const geometries: BufferGeometry[] = []
  const materials: Material[] = []
  const textures: Texture[] = []
  const pointRecords: ReadingPointRenderRecord[] = []
  const openedPoints = new Set<string>()

  function ownGeometry<T extends BufferGeometry>(geometry: T): T {
    geometries.push(geometry)
    return geometry
  }

  function ownMaterial<T extends Material>(material: T): T {
    materials.push(material)
    return material
  }

  const stone = ownMaterial(
    new MeshStandardMaterial({
      color: 0x3f4947,
      emissive: 0x111a1a,
      emissiveIntensity: 0.72,
      roughness: 0.78,
      metalness: 0.04,
    }),
  )
  const darkStone = ownMaterial(
    new MeshStandardMaterial({
      color: 0x1b2020,
      emissive: 0x080c0c,
      emissiveIntensity: 0.62,
      roughness: 0.86,
      metalness: 0.02,
    }),
  )
  const bronze = ownMaterial(
    new MeshPhysicalMaterial({
      color: 0x9b7948,
      emissive: 0x2a1908,
      emissiveIntensity: 0.46,
      roughness: 0.36,
      metalness: 0.78,
      clearcoat: 0.14,
      clearcoatRoughness: 0.5,
    }),
  )
  const paper = ownMaterial(
    new MeshStandardMaterial({
      color: 0xd9cda9,
      emissive: 0x493c21,
      emissiveIntensity: 0.64,
      roughness: 0.78,
      metalness: 0,
    }),
  )
  const glass = ownMaterial(
    new MeshPhysicalMaterial({
      color: 0xa9c4bc,
      roughness: 0.18,
      metalness: 0.12,
      transparent: true,
      opacity: 0.34,
      transmission: 0.22,
    }),
  )
  const wallInset = ownMaterial(new MeshBasicMaterial({ color: 0x293735 }))
  const readerWood = ownMaterial(
    new MeshStandardMaterial({
      color: 0x332820,
      emissive: 0x1a0e08,
      emissiveIntensity: 0.72,
      roughness: 0.64,
      metalness: 0.05,
    }),
  )
  const tealInlay = ownMaterial(
    new MeshBasicMaterial({
      color: 0x426f6b,
      transparent: true,
      opacity: 0.72,
    }),
  )
  const amberInlay = ownMaterial(
    new MeshBasicMaterial({
      color: 0xae7b3f,
      transparent: true,
      opacity: 0.72,
    }),
  )
  const parchmentGlow = ownMaterial(
    new MeshBasicMaterial({
      color: 0xb9aa80,
    }),
  )

  // This material is complete before its vista arrives. Texture loading starts
  // only after lifecycle listeners and the first coherent frame are installed,
  // so a slow image can never delay the handle or leave teardown waiting.
  const cityView = ownMaterial(
    new MeshBasicMaterial({
      color: 0x293735,
    }),
  )

  function addBox(
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    material: Material,
    parent: Scene | Group = scene,
  ): Mesh {
    const mesh = new Mesh(ownGeometry(new BoxGeometry(...size)), material)
    mesh.position.set(...position)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }

  const { width, depth, height } = options.room.room
  addBox([width, 0.14, depth], [0, -0.08, 0], darkStone)
  addBox([width, height, 0.18], [0, height / 2, -depth / 2], stone)
  addBox([0.18, height, depth], [-width / 2, height / 2, 0], darkStone)
  addBox([0.18, height, depth], [width / 2, height / 2, 0], darkStone)
  addBox([width, 0.12, depth], [0, height + 0.02, 0], darkStone)

  // A recessed observation slit gives the hidden room a quiet, improbable
  // relationship to the civic skyline. The frame and mullions supply real
  // occlusion and parallax around the distant texture-backed vista.
  addBox(
    [width * 0.9, height * 0.78, 0.08],
    [0, height * 0.45, -depth / 2 + 0.15],
    wallInset,
  )
  const cityPlane = new Mesh(
    ownGeometry(new PlaneGeometry(4.82, 1.72)),
    cityView,
  )
  cityPlane.position.set(0, 1.45, -depth / 2 + 0.3)
  scene.add(cityPlane)
  addBox([5.05, 0.12, 0.08], [0, 2.37, -depth / 2 + 0.36], bronze)
  addBox([5.05, 0.12, 0.08], [0, 0.53, -depth / 2 + 0.36], bronze)
  addBox([0.12, 1.96, 0.08], [-2.52, 1.45, -depth / 2 + 0.36], bronze)
  addBox([0.12, 1.96, 0.08], [2.52, 1.45, -depth / 2 + 0.36], bronze)
  for (const x of [-1.22, 0, 1.22]) {
    addBox([0.045, 1.72, 0.035], [x, 1.45, -depth / 2 + 0.42], tealInlay)
  }
  addBox([4.82, 0.025, 0.035], [0, 1.15, -depth / 2 + 0.43], amberInlay)

  // Transverse coffers read as a ceiling. Longitudinal beams converged into
  // giant screen-wide rays from the doorway camera and flattened the space.
  for (let index = 0; index < 5; index += 1) {
    const z = -depth / 2 + 0.58 + index * ((depth - 1.16) / 4)
    const ceilingRib = addBox(
      [width * 0.88, 0.11, 0.09],
      [0, height - 0.12, z],
      darkStone,
    )
    ceilingRib.castShadow = false
  }
  for (const side of [-1, 1]) {
    const x = side * (width / 2 - 0.42)
    for (let bay = 0; bay < 4; bay += 1) {
      const z = -depth / 2 + 1 + bay * ((depth - 2) / 3)
      addBox([0.48, height * 0.66, 0.12], [x, height * 0.38, z], darkStone)
      for (let shelf = 0; shelf < 4; shelf += 1) {
        addBox(
          [0.58, 0.045, 0.52],
          [x - side * 0.04, 0.48 + shelf * 0.52, z],
          readerWood,
        )
      }
    }
  }

  // The unnumbered reader: one long, open-legged table, a glass slit, and the
  // key receiver. Negative space below it prevents the HUD edge from turning
  // the whole furnishing into one black slab.
  addBox([width * 0.68, 0.16, 1.44], [0, 0.82, -0.55], readerWood)
  addBox([width * 0.69, 0.035, 0.045], [0, 0.84, 0.18], amberInlay)
  for (const x of [-2.05, 2.05]) {
    for (const z of [-1, -0.1]) {
      addBox([0.18, 0.74, 0.18], [x, 0.4, z], darkStone)
    }
  }
  addBox([width * 0.34, 0.035, 0.5], [0, 0.92, -0.51], glass)
  addBox([1.08, 0.94, 0.5], [0, 0.47, -2.8], darkStone)
  addBox([1.2, 0.1, 0.6], [0, 0.97, -2.8], bronze)
  const keyReceiver = new Mesh(
    ownGeometry(new TorusGeometry(0.22, 0.035, 8, 28)),
    bronze,
  )
  keyReceiver.position.set(0, 0.96, -0.48)
  keyReceiver.rotation.x = Math.PI / 2
  keyReceiver.castShadow = true
  scene.add(keyReceiver)

  // One restrained lamp and physical artifact per reading point. Their state is
  // driven only by the visit-local props supplied through the handle. Each
  // authored HUD action owns an equally bounded physical pose; none can reach
  // evidence, progress, or the game reducer.
  options.room.readingPoints.forEach((point) => {
    const tactileTransforms: TactileTransform[] = []
    const markerMaterial = ownMaterial(
      new MeshStandardMaterial({
        color: 0x9b7c50,
        emissive: 0x2f2417,
        emissiveIntensity: 0.36,
        roughness: 0.44,
        metalness: 0.58,
      }),
    )
    const haloMaterial = ownMaterial(
      new MeshBasicMaterial({
        color: 0xb49761,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      }),
    )
    const artifact = new Group()
    artifact.position.set(...point.position)

    const plinth = new Mesh(
      ownGeometry(new CylinderGeometry(0.27, 0.34, 0.18, 20)),
      markerMaterial,
    )
    plinth.position.y = -0.1
    plinth.castShadow = true
    artifact.add(plinth)

    const slip = new Mesh(ownGeometry(new PlaneGeometry(0.42, 0.26)), paper)
    slip.position.set(0, 0.03, 0.01)
    slip.rotation.x = -Math.PI / 2
    artifact.add(slip)

    const halo = new Mesh(
      ownGeometry(new TorusGeometry(0.31, 0.016, 8, 28)),
      haloMaterial,
    )
    halo.rotation.x = Math.PI / 2
    halo.position.y = 0.03
    artifact.add(halo)

    // Each bay owns a different physical silhouette. The labels explain what it
    // means; the geometry makes the room legible before a marker is selected.
    if (point.placement === 'left') {
      const leftPage = addBox(
        [0.42, 0.54, 0.035],
        [-0.2, 0.3, 0.05],
        parchmentGlow,
        artifact,
      )
      leftPage.rotation.y = -0.24

      // The repaired cover pivots at its blue-thread spine instead of rotating
      // around its own centre, making the HUD verb read as a physical lift.
      const coverPivot = new Group()
      coverPivot.position.set(0, 0.3, 0.05)
      coverPivot.rotation.y = 0.24
      artifact.add(coverPivot)
      addBox(
        [0.42, 0.54, 0.035],
        [0.21, 0, 0],
        parchmentGlow,
        coverPivot,
      )
      for (const y of [0.18, 0.29, 0.4]) {
        addBox([0.23, 0.012, 0.025], [-0.2, y, 0.09], tealInlay, artifact)
        addBox(
          [0.23, 0.012, 0.025],
          [0.21, y - 0.3, 0.04],
          amberInlay,
          coverPivot,
        )
      }
      const blueThread = addBox(
        [0.025, 0.56, 0.045],
        [0, 0.3, 0.1],
        tealInlay,
        artifact,
      )
      blueThread.rotation.z = -0.04
      addBox([0.82, 0.055, 0.34], [0, 0.02, -0.03], markerMaterial, artifact)
      tactileTransforms.push(
        tactileTransform(coverPivot, {
          'lift-repaired-cover': {
            position: [0, 0.36, 0.08],
            rotation: [0.04, 1.22, 0.06],
          },
        }),
      )
    } else if (point.placement === 'center') {
      addBox([0.94, 0.72, 0.07], [0, 0.33, 0.08], markerMaterial, artifact)
      addBox([0.8, 0.58, 0.025], [0, 0.33, 0.13], glass, artifact)

      const iSlip = new Group()
      iSlip.position.set(0, 0.45, 0.17)
      iSlip.rotation.z = -0.025
      artifact.add(iSlip)
      addBox(
        [0.62, 0.17, 0.035],
        [0, 0, 0],
        parchmentGlow,
        iSlip,
      )
      addBox([0.025, 0.1, 0.025], [-0.19, 0, 0.03], darkStone, iSlip)

      const xvSlip = new Group()
      xvSlip.position.set(0, 0.22, 0.17)
      xvSlip.rotation.z = 0.025
      artifact.add(xvSlip)
      addBox(
        [0.62, 0.17, 0.035],
        [0, 0, 0],
        parchmentGlow,
        xvSlip,
      )
      addBox([0.025, 0.1, 0.025], [-0.25, 0, 0.03], darkStone, xvSlip)
      addBox([0.08, 0.02, 0.025], [-0.12, 0, 0.03], darkStone, xvSlip)

      tactileTransforms.push(
        tactileTransform(iSlip, {
          'i-above-xv': {
            position: [0, 0.5, 0.21],
            rotation: [0, 0, -0.045],
          },
          'xv-above-i': {
            position: [0, 0.17, 0.17],
            rotation: [0, 0, 0.035],
          },
          'slips-level': {
            position: [-0.17, 0.335, 0.2],
            rotation: [0, 0, 0],
          },
        }),
        tactileTransform(xvSlip, {
          'i-above-xv': {
            position: [0, 0.17, 0.17],
            rotation: [0, 0, 0.035],
          },
          'xv-above-i': {
            position: [0, 0.5, 0.21],
            rotation: [0, 0, -0.045],
          },
          'slips-level': {
            position: [0.17, 0.335, 0.19],
            rotation: [0, 0, 0],
          },
        }),
      )
    } else {
      addBox([0.78, 0.66, 0.07], [0, 0.3, 0.07], markerMaterial, artifact)
      addBox([0.64, 0.52, 0.025], [0, 0.3, 0.12], glass, artifact)
      addBox([0.46, 0.16, 0.035], [0, 0.12, 0.16], parchmentGlow, artifact)

      // The empty name frame begins held above the unfiled form and lowers as
      // one rigid object. The paper remains unsealed and visually independent.
      const emptyFrame = new Group()
      emptyFrame.position.set(0, 0.55, 0.18)
      artifact.add(emptyFrame)
      addBox([0.6, 0.035, 0.035], [0, 0.15, 0], bronze, emptyFrame)
      addBox([0.6, 0.035, 0.035], [0, -0.15, 0], bronze, emptyFrame)
      addBox([0.035, 0.335, 0.035], [-0.282, 0, 0], bronze, emptyFrame)
      addBox([0.035, 0.335, 0.035], [0.282, 0, 0], bronze, emptyFrame)
      tactileTransforms.push(
        tactileTransform(emptyFrame, {
          'lower-empty-frame': {
            position: [0, 0.19, 0.2],
            rotation: [0, 0, 0],
          },
        }),
      )
    }

    const lamp = new PointLight(0xc8aa70, 3.8, 3.4, 2)
    lamp.position.set(point.position[0], point.position[1] + 0.46, point.position[2])
    scene.add(artifact, lamp)

    pointRecords.push({
      definition: point,
      anchor: new Vector3(...point.position).add(new Vector3(0, 0.16, 0)),
      markerMaterial,
      haloMaterial,
      lamp,
      tactileTransforms,
    })
  })

  const ambient = new AmbientLight(0xaeb5ab, 1.25)
  const hemisphere = new HemisphereLight(0xd5ddd5, 0x252c29, 1.65)
  const clerestory = new DirectionalLight(0xf0d6a0, 2.4)
  clerestory.position.set(-2.6, height - 0.2, 2.8)
  clerestory.target.position.set(0, 0.7, -1.5)
  clerestory.castShadow = false
  const readerGlow = new PointLight(0xd5a75c, 20, 7.4, 2)
  readerGlow.position.set(0, 2.1, 0.55)
  const backWallGlow = new PointLight(0x8ba8a1, 14, 5.2, 2)
  backWallGlow.position.set(0, 1.9, -2.65)
  const leftPractical = new PointLight(0xd7a55d, 9, 3.5, 2)
  leftPractical.position.set(-2.25, 2.25, -0.55)
  const rightPractical = new PointLight(0x75aaa6, 9, 3.5, 2)
  rightPractical.position.set(2.25, 2.25, -0.55)
  scene.add(
    ambient,
    hemisphere,
    clerestory,
    clerestory.target,
    readerGlow,
    backWallGlow,
    leftPractical,
    rightPractical,
  )

  const homePose = options.room.homeCamera
  const currentPosition = new Vector3(...homePose.position)
  const currentTarget = new Vector3(...homePose.target)
  const startPosition = currentPosition.clone()
  const startTarget = currentTarget.clone()
  const goalPosition = currentPosition.clone()
  const goalTarget = currentTarget.clone()
  const cameraDirection = new Vector3()
  const toAnchor = new Vector3()
  const projected = new Vector3()
  let currentPose = homePose
  let activePointId: string | undefined
  let activeInteraction: UnnumberedRoomInteractionSelection | undefined
  let moving = false
  let tactileMoving = false
  let travelStartedAt = 0
  let tactileStartedAt = 0
  let frameId: number | null = null
  let destroyed = false
  let contextLost = false
  let loopReported = false
  let widthPx = 1
  let heightPx = 1

  function reportLoop(running: boolean) {
    if (loopReported === running) return
    loopReported = running
    options.onLoopChange(running)
  }

  function applyCamera() {
    camera.position.copy(currentPosition)
    camera.lookAt(currentTarget)
    camera.updateMatrixWorld()
  }

  function projectPoints() {
    camera.getWorldDirection(cameraDirection)
    const compact = widthPx <= 700
    // Desktop labels sit below their rings and can be ~180px wide. Keep their
    // whole overflow box inside the stage so an off-camera point cannot enlarge
    // the hidden scroll range and let keyboard focus displace the canvas again.
    // Mobile labels sit above the ring and are shifted inboard by CSS.
    const horizontalInset = compact ? POINT_EDGE_INSET : 130
    const topInset = compact ? 82 : POINT_EDGE_INSET
    const bottomInset = compact ? POINT_EDGE_INSET : 82
    const maxX = Math.max(horizontalInset, widthPx - horizontalInset)
    const maxY = Math.max(topInset, heightPx - bottomInset)
    pointRecords.forEach(({ definition, anchor }) => {
      const button = options.pointButtons.get(definition.id)
      if (!button) return

      toAnchor.subVectors(anchor, camera.position)
      projected.copy(anchor).project(camera)
      const facingCamera = cameraDirection.dot(toAnchor) > 0
      const inDepth = projected.z >= -1 && projected.z <= 1
      if (!facingCamera || !inDepth || !Number.isFinite(projected.x + projected.y)) {
        const fallback = containedPosterAnchor(definition.posterAnchor)
        button.style.left = fallback.left
        button.style.top = fallback.top
        button.style.visibility = 'visible'
        return
      }

      const x = clamp(
        ((projected.x + 1) / 2) * widthPx,
        horizontalInset,
        maxX,
      )
      const y = clamp(
        ((1 - projected.y) / 2) * heightPx,
        topInset,
        maxY,
      )
      button.style.left = `${x}px`
      button.style.top = `${y}px`
      button.style.visibility = 'visible'
    })
  }

  function updatePointLights() {
    pointRecords.forEach(({ definition, markerMaterial, haloMaterial, lamp }) => {
      const activePoint = definition.id === activePointId
      const opened = openedPoints.has(definition.id)
      markerMaterial.color.setHex(activePoint ? 0xc49a56 : opened ? 0x678f8c : 0x78684c)
      markerMaterial.emissive.setHex(activePoint ? 0x6f421b : opened ? 0x173b3b : 0x1a1710)
      markerMaterial.emissiveIntensity = activePoint ? 0.95 : opened ? 0.58 : 0.18
      haloMaterial.color.setHex(activePoint ? 0xe3b66e : opened ? 0x76b1ad : 0xb49761)
      haloMaterial.opacity = activePoint ? 0.5 : opened ? 0.3 : 0.12
      lamp.color.setHex(activePoint ? 0xf0c17a : opened ? 0x7cb8b3 : 0xc8aa70)
      lamp.intensity = activePoint ? 12 : opened ? 7.5 : 3.8
    })
  }

  function updateTactileTransforms(progress: number) {
    const eased = easeInOutCubic(progress)
    pointRecords.forEach(({ tactileTransforms }) => {
      tactileTransforms.forEach((transform) => {
        transform.object.position.lerpVectors(
          transform.startPosition,
          transform.goalPosition,
          eased,
        )
        transform.object.rotation.set(
          transform.startRotation.x +
            (transform.goalRotation.x - transform.startRotation.x) * eased,
          transform.startRotation.y +
            (transform.goalRotation.y - transform.startRotation.y) * eased,
          transform.startRotation.z +
            (transform.goalRotation.z - transform.startRotation.z) * eased,
        )
      })
    })
  }

  function renderFrame(now: number) {
    frameId = null
    if (destroyed || contextLost) return
    if (moving) {
      const duration = Math.max(1, options.room.travelMs)
      const progress = clamp((now - travelStartedAt) / duration, 0, 1)
      const eased = easeInOutCubic(progress)
      currentPosition.lerpVectors(startPosition, goalPosition, eased)
      currentTarget.lerpVectors(startTarget, goalTarget, eased)
      if (progress >= 1) moving = false
    }
    if (tactileMoving) {
      const progress = clamp((now - tactileStartedAt) / TACTILE_TRAVEL_MS, 0, 1)
      updateTactileTransforms(progress)
      if (progress >= 1) tactileMoving = false
    }
    applyCamera()
    renderer.render(scene, camera)
    projectPoints()
    if (moving || tactileMoving) {
      scheduleFrame()
    } else {
      reportLoop(false)
    }
  }

  function scheduleFrame() {
    if (destroyed || contextLost || frameId !== null) return
    frameId = window.requestAnimationFrame(renderFrame)
  }

  function moveToPose(pose: SceneWorldCamera) {
    if (poseEquals(currentPose, pose) && !moving) {
      scheduleFrame()
      return
    }
    currentPose = pose
    startPosition.copy(currentPosition)
    startTarget.copy(currentTarget)
    goalPosition.set(...pose.position)
    goalTarget.set(...pose.target)
    travelStartedAt = performance.now()
    moving = true
    reportLoop(true)
    scheduleFrame()
  }

  function setActivePoint(pointId: string | undefined) {
    if (activePointId === pointId) return
    activePointId = pointId
    const point = options.room.readingPoints.find((candidate) => candidate.id === pointId)
    updatePointLights()
    moveToPose(point?.camera ?? homePose)
  }

  function setOpenedPoints(pointIds: readonly string[]) {
    openedPoints.clear()
    pointIds.forEach((pointId) => {
      if (options.room.readingPoints.some((point) => point.id === pointId)) {
        openedPoints.add(pointId)
      }
    })
    updatePointLights()
    scheduleFrame()
  }

  function setActiveInteraction(
    interaction: UnnumberedRoomInteractionSelection | undefined,
  ) {
    const point = interaction
      ? options.room.readingPoints.find(
          (candidate) =>
            candidate.id === interaction.pointId &&
            candidate.interactions.some(
              (candidateInteraction) =>
                candidateInteraction.id === interaction.interactionId,
            ),
        )
      : undefined
    const nextInteraction =
      point && interaction
        ? {
            pointId: point.id,
            interactionId: interaction.interactionId,
          }
        : undefined
    if (
      activeInteraction?.pointId === nextInteraction?.pointId &&
      activeInteraction?.interactionId === nextInteraction?.interactionId &&
      !tactileMoving
    ) {
      return
    }

    activeInteraction = nextInteraction
    let changed = false
    pointRecords.forEach((record) => {
      record.tactileTransforms.forEach((transform) => {
        transform.startPosition.copy(transform.object.position)
        transform.startRotation.set(
          transform.object.rotation.x,
          transform.object.rotation.y,
          transform.object.rotation.z,
        )
        const pose =
          nextInteraction?.pointId === record.definition.id
            ? transform.poses[nextInteraction.interactionId]
            : undefined
        transform.goalPosition.copy(transform.restPosition)
        transform.goalRotation.copy(transform.restRotation)
        if (pose?.position) transform.goalPosition.set(...pose.position)
        if (pose?.rotation) transform.goalRotation.set(...pose.rotation)
        if (
          !transform.startPosition.equals(transform.goalPosition) ||
          !transform.startRotation.equals(transform.goalRotation)
        ) {
          changed = true
        }
      })
    })

    tactileStartedAt = performance.now()
    tactileMoving = changed
    if (changed) reportLoop(true)
    scheduleFrame()
  }

  function resize() {
    if (destroyed || contextLost) return
    options.root.scrollTop = 0
    options.root.scrollLeft = 0
    const bounds = options.root.getBoundingClientRect()
    widthPx = Math.max(1, Math.round(bounds.width || options.root.clientWidth || 1))
    heightPx = Math.max(1, Math.round(bounds.height || options.root.clientHeight || 1))
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    renderer.setSize(widthPx, heightPx, false)
    camera.aspect = widthPx / heightPx
    camera.fov = widthPx <= 700 || camera.aspect < 1.45 ? 62 : 52
    camera.updateProjectionMatrix()
    scheduleFrame()
  }

  const resizeObserver =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => resize())
  if (resizeObserver) resizeObserver.observe(options.root)
  else window.addEventListener('resize', resize)

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') scheduleFrame()
  }

  function loadCityViewTexture() {
    void new TextureLoader()
      .loadAsync('/images/civic-archive.webp')
      .then((texture) => {
        if (destroyed || contextLost || options.signal.aborted) {
          texture.dispose()
          return
        }
        try {
          texture.colorSpace = SRGBColorSpace
          texture.anisotropy = Math.min(
            renderer.capabilities.getMaxAnisotropy(),
            4,
          )
          // Cover-crop a 16:9 source into the long observation slit.
          texture.repeat.y = 0.65
          texture.offset.y = 0.175
          texture.needsUpdate = true
        } catch {
          texture.dispose()
          return
        }
        textures.push(texture)
        cityView.map = texture
        cityView.color.setHex(0x9aa4a4)
        cityView.needsUpdate = true
        scheduleFrame()
      })
      .catch(() => {
        // The self-lit teal material remains the complete offline fallback.
      })
  }

  function onContextLost(event: Event) {
    event.preventDefault()
    if (contextLost || destroyed) return
    contextLost = true
    destroy()
    options.onContextLost()
  }

  function destroy() {
    if (destroyed) return
    destroyed = true
    moving = false
    tactileMoving = false
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId)
      frameId = null
    }
    reportLoop(false)
    resizeObserver?.disconnect()
    if (!resizeObserver) window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    options.signal.removeEventListener('abort', destroy)
    canvas.removeEventListener('webglcontextlost', onContextLost)
    resetPointButtons(
      options.room,
      options.pointButtons,
      options.root.dataset.active === 'true',
    )
    geometries.forEach((geometry) => geometry.dispose())
    materials.forEach((material) => material.dispose())
    textures.forEach((texture) => texture.dispose())
    renderer.renderLists.dispose()
    renderer.dispose()
    if (!contextLost) renderer.forceContextLoss()
    canvas.remove()
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  options.signal.addEventListener('abort', destroy, { once: true })
  canvas.addEventListener('webglcontextlost', onContextLost)

  resize()
  applyCamera()
  updatePointLights()
  renderer.render(scene, camera)
  projectPoints()
  reportLoop(false)
  loadCityViewTexture()

  return {
    setActivePoint,
    setOpenedPoints,
    setActiveInteraction,
    invalidate: scheduleFrame,
    destroy,
  }
}

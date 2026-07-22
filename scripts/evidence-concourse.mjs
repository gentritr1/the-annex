// Focused evidence harness for Case 77's bounded concourse.
//
// Drives the real app over raw CDP (Node's built-in WebSocket; no dependency)
// and writes only evidence/case77-concourse/. It proves desktop + mobile WebGL
// rendering settles to an idle, on-demand loop; all four indexed DOM portals
// remain contained and at least 48px; bounded drag visibly moves the projection;
// close-up teardown leaves the hidden portals pointer-inert; return creates one
// fresh canvas; high-contrast + large text stays horizontally contained; OS
// reduced motion stays on the complete poster path; and forced WebGL context
// loss tears the canvas down and restores the poster.
//
// Usage: node scripts/evidence-concourse.mjs [app-url]
// Default: http://127.0.0.1:7100/
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://127.0.0.1:7100/'
const OUT_DIR = new URL('../evidence/case77-concourse/', import.meta.url).pathname
const SAVE_KEY = 'the-annex.case-77.save.v1'
const SETTINGS_KEY = 'the-annex.accessibility.v1'

const SETTINGS = {
  reducedMotion: false,
  highContrast: false,
  textSize: 'standard',
  showTrustNumbers: false,
  ambientSound: false,
}

const CASE_77_INVESTIGATION = {
  schemaVersion: 2,
  caseId: 'case-77',
  phase: 'investigation',
  runNumber: 1,
  primaryApproach: 'procedure',
  completedSites: [],
  completedActions: [],
  evidence: [],
  methodTags: [],
  trust: { registrar: 0, shepherd: 0, defector: 0, archivist: 0 },
  alarm: 0,
  tribunalOverride: false,
  selectedFragments: [],
  reconstruction: null,
  decision: null,
  depositionRecord: null,
  events: [],
  previousRuns: [],
  precedents: {},
  settings: SETTINGS,
  announcement: 'Concourse evidence seed.',
}

const VIEWPORTS = {
  desktop: { width: 1280, height: 800, mobile: false },
  mobile: { width: 390, height: 844, mobile: true },
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function launchChrome(tag) {
  const process = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=/tmp/annex-concourse-${tag}-${Date.now()}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    '--hide-scrollbars',
    '--enable-webgl',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
    'about:blank',
  ])
  const wsUrl = new Promise((resolve, reject) => {
    let stderr = ''
    const timer = setTimeout(() => reject(new Error('Chrome CDP endpoint timed out')), 20000)
    process.stderr.on('data', (chunk) => {
      stderr += chunk
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/)
      if (!match) return
      clearTimeout(timer)
      resolve(match[1])
    })
    process.once('exit', (code) => {
      clearTimeout(timer)
      reject(
        new Error(
          `Chrome exited before CDP attached (${code ?? 'unknown'}): ${stderr.trim().slice(-1200)}`,
        ),
      )
    })
  })
  return { process, wsUrl }
}

class CdpClient {
  constructor(socket) {
    this.socket = socket
    this.nextId = 1
    this.pending = new Map()
    this.exceptions = []
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.method === 'Runtime.exceptionThrown') {
        this.exceptions.push(message.params?.exceptionDetails?.text ?? 'page exception')
      }
      if (!message.id || !this.pending.has(message.id)) return
      const { resolve, reject } = this.pending.get(message.id)
      this.pending.delete(message.id)
      if (message.error) reject(new Error(message.error.message))
      else resolve(message.result)
    })
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId
    this.nextId += 1
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.socket.send(JSON.stringify({ id, method, params, sessionId }))
    })
  }
}

const SNAPSHOT = `(() => {
  const round = (value) => Math.round(value * 100) / 100
  const rect = (element) => {
    if (!element) return null
    const box = element.getBoundingClientRect()
    return {
      x: round(box.x), y: round(box.y), width: round(box.width), height: round(box.height),
      right: round(box.right), bottom: round(box.bottom),
    }
  }
  const stage = document.querySelector('.annex-world-stage')
  if (!stage) return null
  const stageRect = rect(stage)
  const worldView = stage.closest('.world-view')
  const app = document.querySelector('.annex-app')
  const contained = (box) => Boolean(
    box && box.x >= stageRect.x - 0.5 && box.y >= stageRect.y - 0.5 &&
    box.right <= stageRect.right + 0.5 && box.bottom <= stageRect.bottom + 0.5
  )
  const portals = [...document.querySelectorAll('.annex-world-portal')].map((element) => {
    const box = rect(element)
    const style = getComputedStyle(element)
    const code = element.querySelector('.annex-world-portal-code')
    const label = element.querySelector('.annex-world-portal-label')
    const labelStyle = label ? getComputedStyle(label) : null
    const labelBox = rect(label)
    const center = box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : null
    const hit = center && center.x >= 0 && center.y >= 0 &&
      center.x < innerWidth && center.y < innerHeight
      ? document.elementFromPoint(center.x, center.y)
      : null
    return {
      site: element.dataset.site ?? null,
      code: code?.textContent?.trim() ?? '',
      ariaLabel: element.getAttribute('aria-label'),
      rect: box,
      fullyInsideStage: contained(box),
      minimum48: Boolean(box && box.width >= 48 && box.height >= 48),
      visible: style.visibility !== 'hidden' && Number(style.opacity) > 0.99,
      pointerEvents: style.pointerEvents,
      hitTest: {
        className: hit instanceof HTMLElement ? hit.className : null,
        tagName: hit?.tagName ?? null,
        site: hit instanceof HTMLElement ? hit.closest('.annex-world-portal')?.getAttribute('data-site') ?? null : null,
        resolvesToPortal: Boolean(hit && (hit === element || element.contains(hit))),
      },
      label: {
        text: label?.textContent?.trim() ?? '',
        rect: labelBox,
        fullyInsideStage: contained(labelBox),
        opacity: labelStyle ? Number(labelStyle.opacity) : null,
        visibility: labelStyle?.visibility ?? null,
        hidden: Boolean(labelStyle && labelStyle.visibility === 'hidden' && Number(labelStyle.opacity) < 0.01),
      },
    }
  })
  const labelOverlaps = []
  for (let left = 0; left < portals.length; left += 1) {
    for (let right = left + 1; right < portals.length; right += 1) {
      const a = portals[left].label.rect
      const b = portals[right].label.rect
      if (!a || !b) continue
      const overlapWidth = Math.min(a.right, b.right) - Math.max(a.x, b.x)
      const overlapHeight = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y)
      if (overlapWidth > 0.5 && overlapHeight > 0.5) {
        labelOverlaps.push({
          sites: [portals[left].site, portals[right].site],
          width: round(overlapWidth),
          height: round(overlapHeight),
        })
      }
    }
  }
  const poster = stage.querySelector(':scope > img')
  const posterStyle = poster ? getComputedStyle(poster) : null
  const canvases = [...stage.querySelectorAll('canvas[data-annex-world-canvas="true"]')]
  const returnButton = document.querySelector('.world-return')
  const returnRect = rect(returnButton)
  const documentWidth = Math.max(
    document.documentElement.scrollWidth,
    document.body?.scrollWidth ?? 0,
  )
  return {
    viewport: {
      width: innerWidth,
      height: innerHeight,
      devicePixelRatio,
      scrollX: round(scrollX),
      scrollY: round(scrollY),
    },
    renderer: stage.dataset.renderer ?? null,
    loop: stage.dataset.worldLoop ?? null,
    active: stage.dataset.active ?? null,
    transition: worldView?.getAttribute('data-transition') ?? null,
    stage: stageRect,
    document: {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: documentWidth,
      horizontalOverflow: round(Math.max(0, documentWidth - document.documentElement.clientWidth)),
    },
    accessibility: {
      appHighContrast: Boolean(app?.classList.contains('high-contrast')),
      appLargeText: Boolean(app?.classList.contains('large-text')),
      rootLargeText: document.documentElement.classList.contains('annex-large-text'),
    },
    activeElement: {
      id: document.activeElement instanceof HTMLElement ? document.activeElement.id : '',
      className: document.activeElement instanceof HTMLElement ? document.activeElement.className : '',
    },
    returnButton: {
      count: returnButton ? 1 : 0,
      rect: returnRect,
      minimum44: Boolean(returnRect && returnRect.width >= 44 && returnRect.height >= 44),
    },
    poster: {
      count: poster ? 1 : 0,
      opacity: posterStyle ? Number(posterStyle.opacity) : null,
      visible: Boolean(posterStyle && posterStyle.display !== 'none' && Number(posterStyle.opacity) > 0.99),
      rect: rect(poster),
    },
    canvasCount: canvases.length,
    canvases: canvases.map((canvas) => ({
      rect: rect(canvas),
      drawingBuffer: { width: canvas.width, height: canvas.height },
    })),
    portals,
    labelOverlaps,
    portalCountFour: portals.length === 4,
    portalsContained: portals.length === 4 && portals.every((portal) => portal.fullyInsideStage),
    portalsMinimum48: portals.length === 4 && portals.every((portal) => portal.minimum48),
    portalsVisible: portals.length === 4 && portals.every((portal) => portal.visible),
    portalCodes: portals.map((portal) => portal.code),
    portalCodesIndexed: portals.length === 4 && portals.every((portal) => ({
      registry: 'A', 'care-ward': 'B', maintenance: 'C', 'small-archive': 'D'
    })[portal.site] === portal.code),
    portalNamesAccessible: portals.length === 4 && portals.every((portal) => /^Enter .+/.test(portal.ariaLabel ?? '')),
    portalLabelsHidden: portals.length === 4 && portals.every((portal) => portal.label.hidden),
    portalsPointerInert: portals.length === 4 && portals.every((portal) => portal.pointerEvents === 'none'),
    portalCentersDoNotHitPortals: portals.length === 4 && portals.every((portal) => !portal.hitTest.resolvesToPortal),
    labelsNonOverlapping: portals.length === 4 && labelOverlaps.length === 0,
  }
})()`

function checksForNormal(snapshot) {
  const canvas = snapshot.canvases[0]
  return {
    rendererWebgl: snapshot.renderer === 'webgl',
    oneCanvas: snapshot.canvasCount === 1,
    canvasCoversStage: Boolean(
      canvas &&
        Math.abs(canvas.rect.width - snapshot.stage.width) <= 1 &&
        Math.abs(canvas.rect.height - snapshot.stage.height) <= 1,
    ),
    loopIdle: snapshot.loop === 'idle',
    fourPortals: snapshot.portalCountFour,
    portalsContained: snapshot.portalsContained,
    portalsMinimum48: snapshot.portalsMinimum48,
    portalsVisible: snapshot.portalsVisible,
    portalCodesIndexed: snapshot.portalCodesIndexed,
    portalNamesAccessible: snapshot.portalNamesAccessible,
    portalLabelsHiddenAtRest: snapshot.portalLabelsHidden,
    labelsNonOverlapping: snapshot.labelsNonOverlapping,
    noHorizontalOverflow: snapshot.document.horizontalOverflow <= 1,
    baselineAtDocumentTop: Math.abs(snapshot.viewport.scrollY) <= 1,
  }
}

function checksForPoster(snapshot, expectedRenderer) {
  return {
    rendererState: snapshot.renderer === expectedRenderer,
    posterVisible: snapshot.poster.visible,
    canvasZero: snapshot.canvasCount === 0,
    loopIdle: snapshot.loop === 'idle',
    fourPortals: snapshot.portalCountFour,
    portalsContained: snapshot.portalsContained,
    portalsMinimum48: snapshot.portalsMinimum48,
    portalsVisible: snapshot.portalsVisible,
    portalCodesIndexed: snapshot.portalCodesIndexed,
    portalNamesAccessible: snapshot.portalNamesAccessible,
    portalLabelsHiddenAtRest: snapshot.portalLabelsHidden,
    labelsNonOverlapping: snapshot.labelsNonOverlapping,
    noHorizontalOverflow: snapshot.document.horizontalOverflow <= 1,
    baselineAtDocumentTop: Math.abs(snapshot.viewport.scrollY) <= 1,
  }
}

function portalShifts(before, after) {
  const afterBySite = new Map(after.portals.map((portal) => [portal.site, portal]))
  const shifts = before.portals.map((portal) => {
    const next = afterBySite.get(portal.site)
    if (!portal.rect || !next?.rect) {
      return { site: portal.site, x: null, y: null, distance: null }
    }
    const x = Math.round((next.rect.x - portal.rect.x) * 100) / 100
    const y = Math.round((next.rect.y - portal.rect.y) * 100) / 100
    return {
      site: portal.site,
      x,
      y,
      distance: Math.round(Math.hypot(x, y) * 100) / 100,
    }
  })
  const distances = shifts.map((shift) => shift.distance).filter((value) => value !== null)
  return {
    shifts,
    allMeasured: distances.length === 4,
    shiftedCount: distances.filter((distance) => distance >= 2).length,
    minimum: distances.length ? Math.min(...distances) : null,
    maximum: distances.length ? Math.max(...distances) : null,
  }
}

async function runPage({
  tag,
  viewport,
  osReduced = false,
  contextLoss = false,
  exerciseDrag = false,
  exerciseCloseupReturn = false,
  settings = SETTINGS,
  screenshotName,
  dragScreenshotName,
  closeupScreenshotName,
  returnScreenshotName,
}) {
  const launched = launchChrome(tag)
  let socket
  try {
    socket = new WebSocket(await launched.wsUrl)
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true })
      socket.addEventListener('error', reject, { once: true })
    })
    const cdp = new CdpClient(socket)
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
    // Target.createTarget can leave the evidence page backgrounded behind
    // Chrome's initial about:blank. The close-up transition deliberately gates
    // on two real animation frames, so keep this target visible to the scheduler.
    await cdp.send('Target.activateTarget', { targetId })
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
    const send = (method, params = {}) => cdp.send(method, params, sessionId)
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      })
      if (result.exceptionDetails) {
        throw new Error(`page evaluation failed: ${JSON.stringify(result.exceptionDetails).slice(0, 800)}`)
      }
      return result.result?.value
    }
    const waitFor = async (expression, timeoutMs = 20000) => {
      const started = Date.now()
      for (;;) {
        if (await evaluate(expression)) return
        if (Date.now() - started > timeoutMs) {
          const body = await evaluate(`document.body?.innerText?.slice(0, 500) ?? ''`)
          throw new Error(`timeout waiting for ${expression}\n${body}`)
        }
        await sleep(100)
      }
    }
    const click = async (selector) => {
      await evaluate(`(() => {
        const element = document.querySelector(${JSON.stringify(selector)})
        element?.scrollIntoView({ block: 'center', behavior: 'auto' })
      })()`)
      await sleep(80)
      let point = await evaluate(`(() => {
        const element = document.querySelector(${JSON.stringify(selector)})
        if (!element) return null
        const box = element.getBoundingClientRect()
        const x = box.x + box.width / 2
        const y = box.y + box.height / 2
        const hit = document.elementFromPoint(x, y)
        return { x, y, onTop: Boolean(hit && (hit === element || element.contains(hit))) }
      })()`)
      if (!point?.onTop) return false
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y })
      await sleep(80)
      point = await evaluate(`(() => {
        const element = document.querySelector(${JSON.stringify(selector)})
        if (!element) return null
        const box = element.getBoundingClientRect()
        const x = box.x + box.width / 2
        const y = box.y + box.height / 2
        const hit = document.elementFromPoint(x, y)
        return { x, y, onTop: Boolean(hit && (hit === element || element.contains(hit))) }
      })()`)
      if (!point?.onTop) return false
      await send('Input.dispatchMouseEvent', {
        type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1,
      })
      await send('Input.dispatchMouseEvent', {
        type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1,
      })
      return true
    }
    const drag = async () => {
      const path = await evaluate(`(() => {
        const stage = document.querySelector('.annex-world-stage')
        if (!stage) return null
        const box = stage.getBoundingClientRect()
        return {
          start: { x: box.x + box.width * 0.46, y: box.y + box.height * 0.72 },
          end: { x: box.x + box.width * 0.78, y: box.y + box.height * 0.56 },
        }
      })()`)
      if (!path) return false
      await send('Input.dispatchMouseEvent', {
        type: 'mouseMoved', x: path.start.x, y: path.start.y,
      })
      await send('Input.dispatchMouseEvent', {
        type: 'mousePressed', x: path.start.x, y: path.start.y,
        button: 'left', buttons: 1, clickCount: 1,
      })
      const steps = 12
      for (let step = 1; step <= steps; step += 1) {
        const progress = step / steps
        await send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: path.start.x + (path.end.x - path.start.x) * progress,
          y: path.start.y + (path.end.y - path.start.y) * progress,
          button: 'left',
          buttons: 1,
        })
      }
      await send('Input.dispatchMouseEvent', {
        type: 'mouseReleased', x: path.end.x, y: path.end.y,
        button: 'left', buttons: 0, clickCount: 1,
      })
      return true
    }
    const screenshot = async (name = screenshotName) => {
      if (!name) return
      const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
      writeFileSync(join(OUT_DIR, name), Buffer.from(data, 'base64'))
    }
    const settleBaselineAtTop = async () => {
      await evaluate(`(() => {
        const root = document.documentElement
        const prior = root.style.scrollBehavior
        root.style.scrollBehavior = 'auto'
        window.scrollTo(0, 0)
        root.style.scrollBehavior = prior
      })()`)
      await waitFor(`Math.abs(window.scrollY) <= 0.5`)
      await sleep(240)
    }

    await send('Page.enable')
    await send('Runtime.enable')
    await send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.mobile,
      screenWidth: viewport.width,
      screenHeight: viewport.height,
    })
    if (osReduced) {
      await send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      })
    }
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify({
          ...CASE_77_INVESTIGATION,
          settings,
        }))});
        localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, ${JSON.stringify(JSON.stringify(settings))});
      `,
    })
    await send('Page.navigate', { url: APP_URL })
    await waitFor(`document.readyState === 'complete'`)
    await waitFor(`Boolean(document.querySelector('.start-screen'))`)
    await evaluate(`
      [...document.querySelectorAll('.start-screen button')]
        .find((button) => /continue local case/i.test(button.textContent ?? ''))
        ?.setAttribute('data-concourse-continue', 'true')
    `)
    if (!(await click('[data-concourse-continue="true"]'))) {
      throw new Error('Continue local case button was not available')
    }
    await waitFor(`Boolean(document.querySelector('.annex-world-stage'))`)
    await evaluate(`document.querySelector('.world-view')?.scrollIntoView({ block: 'center' })`)

    if (osReduced) {
      await waitFor(`(() => {
        const stage = document.querySelector('.annex-world-stage')
        return stage?.dataset.renderer === 'poster' &&
          stage?.dataset.worldLoop === 'idle' &&
          !stage.querySelector('canvas')
      })()`)
      await sleep(500)
      await settleBaselineAtTop()
      const snapshot = await evaluate(SNAPSHOT)
      await screenshot(screenshotName)
      return {
        tag,
        mode: 'os-reduced',
        viewport,
        mediaReduced: await evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`),
        snapshot,
        checks: {
          ...checksForPoster(snapshot, 'poster'),
          noPageExceptions: cdp.exceptions.length === 0,
        },
        pageExceptions: cdp.exceptions,
      }
    }

    await waitFor(`(() => {
      const stage = document.querySelector('.annex-world-stage')
      return stage?.dataset.renderer === 'webgl' && stage.querySelectorAll('canvas').length === 1
    })()`, 30000)
    await waitFor(`document.querySelector('.annex-world-stage')?.dataset.worldLoop === 'idle'`)
    await sleep(400)
    await settleBaselineAtTop()
    await waitFor(`document.querySelector('.annex-world-stage')?.dataset.worldLoop === 'idle'`)
    const normalSnapshot = await evaluate(SNAPSHOT)

    if (!contextLoss) {
      const checks = checksForNormal(normalSnapshot)
      const result = {
        tag,
        mode: 'normal',
        viewport,
        settings,
        snapshot: normalSnapshot,
        checks,
        pageExceptions: cdp.exceptions,
      }
      await screenshot(screenshotName)

      if (settings.highContrast || settings.textSize === 'large') {
        checks.highContrastActive = !settings.highContrast || normalSnapshot.accessibility.appHighContrast
        checks.largeTextActive =
          settings.textSize !== 'large' ||
          (normalSnapshot.accessibility.appLargeText && normalSnapshot.accessibility.rootLargeText)
        checks.accessibilityNoHorizontalOverflow = normalSnapshot.document.horizontalOverflow <= 1
      }

      if (exerciseDrag) {
        if (!(await drag())) throw new Error('Concourse canvas was not available for drag')
        await waitFor(`document.querySelector('.annex-world-stage')?.dataset.worldLoop === 'idle'`)
        await sleep(200)
        const dragSnapshot = await evaluate(SNAPSHOT)
        const shift = portalShifts(normalSnapshot, dragSnapshot)
        await screenshot(dragScreenshotName)
        result.drag = { before: normalSnapshot, snapshot: dragSnapshot, shift }
        checks.dragAllPortalsMeasured = shift.allMeasured
        checks.dragMovesAtLeastThreePortals = shift.shiftedCount >= 3
        checks.dragHasVisibleScreenShift = (shift.maximum ?? 0) >= 8
        checks.dragLoopReturnsIdle = dragSnapshot.loop === 'idle'
        checks.dragPortalsContained = dragSnapshot.portalsContained
        checks.dragPortalsMinimum48 = dragSnapshot.portalsMinimum48
        checks.dragLabelsRemainHidden = dragSnapshot.portalLabelsHidden
      }

      if (exerciseCloseupReturn) {
        // Use the persistent switcher to enter the selected portal's close-up;
        // the assertion target is the mirrored portal layer after teardown.
        // This avoids conflating the lifecycle proof with the canvas drag's
        // intentionally shifted pointer coordinates.
        if (!(await click('#site-switch-registry'))) {
          throw new Error('Registry location switch was not available')
        }
        // The authored handoff waits 640ms, then requires two rAFs before the
        // 360ms aperture settles. Headless Chrome can freeze background-frame
        // clocks between CDP input events, so capture real compositor frames at
        // each side of those gates before measuring the settled close-up.
        await sleep(700)
        await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
        await sleep(100)
        await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
        await sleep(420)
        await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
        let entryAssist = null
        const closeupReached = await evaluate(
          `document.querySelector('.world-view')?.dataset.transition === 'closeup'`,
        )
        if (!closeupReached) {
          entryAssist = await evaluate(`(() => {
            const view = document.querySelector('.world-view')
            const stage = document.querySelector('.annex-world-stage')
            return {
              reason: 'headless-frame-gate',
              transitionBeforeAssist: view?.dataset.transition ?? null,
              rendererBeforeAssist: stage?.dataset.renderer ?? null,
              loopBeforeAssist: stage?.dataset.worldLoop ?? null,
              documentHidden: document.hidden,
            }
          })()`)
          // The product's live OS preference listener is also its intentional
          // mid-travel escape hatch. Exercise that real input when headless CDP
          // still withholds the two handoff frames, then restore no-preference
          // before testing the concourse return/WebGL remount.
          await send('Emulation.setEmulatedMedia', {
            features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
          })
        }
        await waitFor(`(() => {
          const view = document.querySelector('.world-view')
          const stage = document.querySelector('.annex-world-stage')
          return view?.dataset.transition === 'closeup' &&
            stage?.dataset.active === 'false' &&
            stage?.dataset.renderer === 'poster' &&
            stage?.dataset.worldLoop === 'idle' &&
            !stage.querySelector('canvas') &&
            Boolean(document.querySelector('.world-return'))
        })()`, 30000)
        await evaluate(`document.querySelector('.world-view')?.scrollIntoView({ block: 'center' })`)
        await sleep(300)
        const closeupSnapshot = await evaluate(SNAPSHOT)
        await screenshot(closeupScreenshotName)
        result.closeup = closeupSnapshot
        result.closeupEntryAssist = entryAssist
        checks.closeupSettled = closeupSnapshot.transition === 'closeup'
        checks.closeupNormalEntrySettled = entryAssist === null
        checks.closeupCanvasZero = closeupSnapshot.canvasCount === 0
        checks.closeupLoopIdle = closeupSnapshot.loop === 'idle'
        checks.closeupPortalsPointerInert = closeupSnapshot.portalsPointerInert
        checks.closeupPortalCentersDoNotHitPortals = closeupSnapshot.portalCentersDoNotHitPortals
        checks.closeupReturnMinimum44 = closeupSnapshot.returnButton.minimum44

        if (entryAssist) {
          await send('Emulation.setEmulatedMedia', {
            features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
          })
          await waitFor(`!matchMedia('(prefers-reduced-motion: reduce)').matches`)
          await sleep(100)
        }
        if (!(await click('.world-return'))) throw new Error('Return to concourse was not available')
        await waitFor(`(() => {
          const view = document.querySelector('.world-view')
          const stage = document.querySelector('.annex-world-stage')
          return view?.dataset.transition === 'concourse' &&
            stage?.dataset.active === 'true' &&
            stage?.dataset.renderer === 'webgl' &&
            stage?.dataset.worldLoop === 'idle' &&
            stage.querySelectorAll('canvas[data-annex-world-canvas="true"]').length === 1
        })()`, 30000)
        await sleep(300)
        const returnSnapshot = await evaluate(SNAPSHOT)
        await screenshot(returnScreenshotName)
        result.returned = returnSnapshot
        checks.returnConcourseSettled = returnSnapshot.transition === 'concourse'
        checks.returnExactlyOneCanvas = returnSnapshot.canvasCount === 1
        checks.returnLoopIdle = returnSnapshot.loop === 'idle'
        checks.returnPortalsContained = returnSnapshot.portalsContained
        checks.returnPortalsMinimum48 = returnSnapshot.portalsMinimum48
        checks.returnCodesIndexed = returnSnapshot.portalCodesIndexed
        checks.returnLabelsHiddenAtRest = returnSnapshot.portalLabelsHidden
      }

      checks.noPageExceptions = cdp.exceptions.length === 0
      return {
        ...result,
        pageExceptions: [...cdp.exceptions],
      }
    }

    const forced = await evaluate(`(() => {
      const canvas = document.querySelector('canvas[data-annex-world-canvas="true"]')
      if (!canvas) return { forced: false, mode: 'missing-canvas' }
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      const extension = gl?.getExtension('WEBGL_lose_context')
      if (extension) {
        extension.loseContext()
        return { forced: true, mode: 'WEBGL_lose_context' }
      }
      const event = new Event('webglcontextlost', { bubbles: false, cancelable: true })
      canvas.dispatchEvent(event)
      return { forced: true, mode: 'cancelable-webglcontextlost-event' }
    })()`)
    await waitFor(`(() => {
      const stage = document.querySelector('.annex-world-stage')
      return stage?.dataset.renderer === 'fallback' &&
        stage?.dataset.worldLoop === 'idle' &&
        !stage.querySelector('canvas')
    })()`)
    await sleep(500)
    const fallbackSnapshot = await evaluate(SNAPSHOT)
    await screenshot(screenshotName)
    return {
      tag,
      mode: 'context-loss',
      viewport,
      forced,
      before: normalSnapshot,
      snapshot: fallbackSnapshot,
      checks: {
        normalBeforeLoss: Object.values(checksForNormal(normalSnapshot)).every(Boolean),
        contextLossForced: forced.forced,
        ...checksForPoster(fallbackSnapshot, 'fallback'),
        noPageExceptions: cdp.exceptions.length === 0,
      },
      pageExceptions: cdp.exceptions,
    }
  } finally {
    socket?.close()
    launched.process.kill('SIGTERM')
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const runs = []
  const scenarios = [
    {
      tag: 'desktop-webgl',
      viewport: VIEWPORTS.desktop,
      exerciseDrag: true,
      exerciseCloseupReturn: true,
      screenshotName: 'desktop-webgl-1280x800.png',
      dragScreenshotName: 'desktop-webgl-drag-1280x800.png',
      closeupScreenshotName: 'desktop-closeup-pointer-inert-1280x800.png',
      returnScreenshotName: 'desktop-returned-webgl-1280x800.png',
    },
    {
      tag: 'mobile-webgl',
      viewport: VIEWPORTS.mobile,
      screenshotName: 'mobile-webgl-390x844.png',
    },
    {
      tag: 'mobile-high-contrast-large-text',
      viewport: VIEWPORTS.mobile,
      settings: { ...SETTINGS, highContrast: true, textSize: 'large' },
      screenshotName: 'mobile-high-contrast-large-text-390x844.png',
    },
    {
      tag: 'desktop-os-reduced',
      viewport: VIEWPORTS.desktop,
      osReduced: true,
      screenshotName: 'desktop-os-reduced-poster-1280x800.png',
    },
    {
      tag: 'mobile-os-reduced',
      viewport: VIEWPORTS.mobile,
      osReduced: true,
    },
    {
      tag: 'desktop-context-loss',
      viewport: VIEWPORTS.desktop,
      contextLoss: true,
      screenshotName: 'desktop-context-loss-fallback-1280x800.png',
    },
  ]

  let fatal = null
  const transcript = []
  for (const scenario of scenarios) {
    try {
      const result = await runPage(scenario)
      runs.push(result)
      const passed = Object.values(result.checks).every(Boolean)
      const line = `${passed ? 'PASS' : 'FAIL'} ${result.tag}: ${JSON.stringify(result.checks)}`
      transcript.push(line)
      console.log(line)
    } catch (error) {
      fatal = `${scenario.tag}: ${error instanceof Error ? error.stack ?? error.message : String(error)}`
      transcript.push(`FATAL ${fatal}`)
      console.error(fatal)
      break
    }
  }

  const failedChecks = runs.flatMap((run) =>
    Object.entries(run.checks)
      .filter(([, passed]) => !passed)
      .map(([check]) => `${run.tag}.${check}`),
  )
  const checksCompleted = runs.reduce((total, run) => total + Object.keys(run.checks).length, 0)
  const checksPassed = runs.reduce(
    (total, run) => total + Object.values(run.checks).filter(Boolean).length,
    0,
  )
  const measurements = {
    generatedAt: new Date().toISOString(),
    appUrl: APP_URL,
    expectedSites: ['registry', 'care-ward', 'maintenance', 'small-archive'],
    runs,
    summary: {
      passed: fatal === null && runs.length === scenarios.length && failedChecks.length === 0,
      scenariosCompleted: runs.length,
      scenariosExpected: scenarios.length,
      checksCompleted,
      checksPassed,
      failedChecks,
      fatal,
    },
  }
  writeFileSync(join(OUT_DIR, 'measurements.json'), JSON.stringify(measurements, null, 2))
  writeFileSync(
    join(OUT_DIR, 'transcript.txt'),
    `${transcript.join('\n')}\n\n${checksPassed}/${checksCompleted} checks passed across ${runs.length}/${scenarios.length} scenarios.\n`,
  )
  if (!measurements.summary.passed) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

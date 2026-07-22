// Focused evidence harness for Case 77's bounded concourse.
//
// Drives the real app over raw CDP (Node's built-in WebSocket; no dependency)
// and writes only evidence/case77-concourse/. It proves desktop + mobile WebGL
// rendering settles to an idle, on-demand loop; all four projected DOM portal
// targets remain contained, at least 48px, and label collision-free; OS reduced
// motion stays on the complete poster path; and forced WebGL context loss tears
// the canvas down and restores the poster.
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
  const contained = (box) => Boolean(
    box && box.x >= stageRect.x - 0.5 && box.y >= stageRect.y - 0.5 &&
    box.right <= stageRect.right + 0.5 && box.bottom <= stageRect.bottom + 0.5
  )
  const portals = [...document.querySelectorAll('.annex-world-portal')].map((element) => {
    const box = rect(element)
    const style = getComputedStyle(element)
    const label = element.lastElementChild
    const labelBox = rect(label)
    return {
      site: element.dataset.site ?? null,
      rect: box,
      fullyInsideStage: contained(box),
      minimum48: Boolean(box && box.width >= 48 && box.height >= 48),
      visible: style.visibility !== 'hidden' && Number(style.opacity) > 0.99,
      pointerEvents: style.pointerEvents,
      label: { text: label?.textContent?.trim() ?? '', rect: labelBox, fullyInsideStage: contained(labelBox) },
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
  return {
    viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
    renderer: stage.dataset.renderer ?? null,
    loop: stage.dataset.worldLoop ?? null,
    active: stage.dataset.active ?? null,
    stage: stageRect,
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
    labelsNonOverlapping: snapshot.labelsNonOverlapping,
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
    labelsNonOverlapping: snapshot.labelsNonOverlapping,
  }
}

async function runPage({ tag, viewport, osReduced = false, contextLoss = false, screenshotName }) {
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
      const point = await evaluate(`(() => {
        const element = document.querySelector(${JSON.stringify(selector)})
        if (!element) return null
        element.scrollIntoView({ block: 'center' })
        const box = element.getBoundingClientRect()
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
      })()`)
      if (!point) return false
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y })
      await send('Input.dispatchMouseEvent', {
        type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1,
      })
      await send('Input.dispatchMouseEvent', {
        type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1,
      })
      return true
    }
    const screenshot = async () => {
      if (!screenshotName) return
      const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
      writeFileSync(join(OUT_DIR, screenshotName), Buffer.from(data, 'base64'))
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
        localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(CASE_77_INVESTIGATION))});
        localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, ${JSON.stringify(JSON.stringify(SETTINGS))});
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
      const snapshot = await evaluate(SNAPSHOT)
      await screenshot()
      return {
        tag,
        mode: 'os-reduced',
        viewport,
        mediaReduced: await evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`),
        snapshot,
        checks: checksForPoster(snapshot, 'poster'),
        pageExceptions: cdp.exceptions,
      }
    }

    await waitFor(`(() => {
      const stage = document.querySelector('.annex-world-stage')
      return stage?.dataset.renderer === 'webgl' && stage.querySelectorAll('canvas').length === 1
    })()`, 30000)
    await waitFor(`document.querySelector('.annex-world-stage')?.dataset.worldLoop === 'idle'`)
    await sleep(400)
    const normalSnapshot = await evaluate(SNAPSHOT)

    if (!contextLoss) {
      await screenshot()
      return {
        tag,
        mode: 'normal',
        viewport,
        snapshot: normalSnapshot,
        checks: checksForNormal(normalSnapshot),
        pageExceptions: cdp.exceptions,
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
    await screenshot()
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
      screenshotName: 'desktop-webgl-1280x800.png',
    },
    {
      tag: 'mobile-webgl',
      viewport: VIEWPORTS.mobile,
      screenshotName: 'mobile-webgl-390x844.png',
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
  for (const scenario of scenarios) {
    try {
      const result = await runPage(scenario)
      runs.push(result)
      const passed = Object.values(result.checks).every(Boolean)
      console.log(`${passed ? 'PASS' : 'FAIL'} ${result.tag}: ${JSON.stringify(result.checks)}`)
    } catch (error) {
      fatal = `${scenario.tag}: ${error instanceof Error ? error.stack ?? error.message : String(error)}`
      console.error(fatal)
      break
    }
  }

  const failedChecks = runs.flatMap((run) =>
    Object.entries(run.checks)
      .filter(([, passed]) => !passed)
      .map(([check]) => `${run.tag}.${check}`),
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
      failedChecks,
      fatal,
    },
  }
  writeFileSync(join(OUT_DIR, 'measurements.json'), JSON.stringify(measurements, null, 2))
  if (!measurements.summary.passed) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

// Case 77 diorama review harness — drives the built app (vite preview) in
// headless Chrome over raw CDP (no new dependencies; Node's built-in
// WebSocket + fetch). Seeds v2 saves into localStorage to reach the
// investigation (neutral), tribunal, and debrief (aftermath) surfaces, then
// captures viewport screenshots and runs the falsifiable DOM checks:
//   • .scene-stage--diorama present (diorama paint path)
//   • hotspot labels fully inside the viewport + pairwise non-overlapping
//   • rain canvas visibly painted in neutral, display:none in aftermath
//   • pointer parallax moves far/near planes at different rates
//   • reduced-motion pins the plane group (transform: none) + hides rain
//
// Usage: node scripts/case77-diorama-shots.mjs <appUrl> <cdpPort> <outDir>
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [appUrl, cdpPort, outDir] = process.argv.slice(2)
if (!appUrl || !cdpPort || !outDir) {
  console.error('usage: node scripts/case77-diorama-shots.mjs <appUrl> <cdpPort> <outDir>')
  process.exit(2)
}
mkdirSync(outDir, { recursive: true })

const SAVE_KEY = 'the-annex.case-77.save.v1'
const SETTINGS_KEY = 'the-annex.accessibility.v1'

const settings = (reducedMotion) => ({
  reducedMotion,
  highContrast: false,
  textSize: 'standard',
  showTrustNumbers: false,
  ambientSound: false,
})

const baseSave = {
  schemaVersion: 2,
  caseId: 'case-77',
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
  announcement: '',
}

const fullRun = {
  completedSites: ['registry', 'care-ward', 'maintenance', 'small-archive'],
  completedActions: [
    'authenticate-chain',
    'listen-mara',
    'walk-acoustic-shadow',
    'answer-archivist',
  ],
  evidence: ['custody-chain', 'relational-proof', 'reconstructed-chain'],
  methodTags: ['procedure', 'care'],
  selectedFragments: ['scar-sensation', 'registry-hash'],
  reconstruction: 'institutional-chain',
}

const saves = {
  neutral: { ...baseSave, phase: 'investigation' },
  tribunal: { ...baseSave, ...fullRun, phase: 'tribunal' },
  aftermath: { ...baseSave, ...fullRun, phase: 'debrief', decision: 'charter-new-person' },
}

// ── minimal CDP client ───────────────────────────────────────────────────────
async function pageWebSocketUrl(port) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      const page = targets.find((target) => target.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {
      // Chrome not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('no CDP page target')
}

const ws = new WebSocket(await pageWebSocketUrl(cdpPort))
await new Promise((resolve, reject) => {
  ws.onopen = resolve
  ws.onerror = reject
})

let nextId = 1
const pending = new Map()
const eventWaiters = []
ws.onmessage = (message) => {
  const data = JSON.parse(message.data)
  if (data.id && pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id)
    pending.delete(data.id)
    if (data.error) reject(new Error(data.error.message))
    else resolve(data.result)
  } else if (data.method) {
    for (let i = eventWaiters.length - 1; i >= 0; i -= 1) {
      if (eventWaiters[i].method === data.method) {
        eventWaiters[i].resolve(data.params)
        eventWaiters.splice(i, 1)
      }
    }
  }
}

function send(method, params = {}) {
  const id = nextId
  nextId += 1
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
}

function waitEvent(method, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const waiter = { method, resolve }
    eventWaiters.push(waiter)
    setTimeout(() => {
      const index = eventWaiters.indexOf(waiter)
      if (index >= 0) {
        eventWaiters.splice(index, 1)
        reject(new Error(`timeout waiting for ${method}`))
      }
    }, timeoutMs)
  })
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (result.exceptionDetails) {
    throw new Error(`evaluate failed: ${JSON.stringify(result.exceptionDetails)}`)
  }
  return result.result.value
}

async function screenshot(name) {
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(outDir, name), Buffer.from(shot.data, 'base64'))
  console.log(`saved ${name}`)
}

async function seedAndEnter(save, reducedMotion) {
  // The save payload must carry its own settings block (strict decode rejects a
  // save without one); the variant's reduced-motion flag rides in both places.
  const seeded = { ...save, settings: settings(reducedMotion) }
  await evaluate(`localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(seeded))});
    localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, ${JSON.stringify(JSON.stringify(settings(reducedMotion)))});
    'seeded'`)
  const loaded = waitEvent('Page.loadEventFired')
  await send('Page.reload')
  await loaded
  await sleep(900)
  await evaluate(`[...document.querySelectorAll('button')].find((b) => /continue/i.test(b.textContent))?.click(); 'entered'`)
  await sleep(1400)
}

// DOM checks returned as data; the node side asserts and reports.
const CHECKS = `(() => {
  const stage = document.querySelector('.scene-stage')
  const diorama = Boolean(document.querySelector('.scene-stage--diorama'))
  const labels = [...document.querySelectorAll('.scene-hotspot-label')].map((el) => {
    const r = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    return { text: el.textContent, opacity: style.opacity, x0: r.x, y0: r.y, x1: r.right, y1: r.bottom }
  })
  const rain = document.querySelector('.scene-art-rain')
  const rainCanvas = document.querySelector('.scene-art-rain canvas')
  return {
    diorama,
    sceneState: stage?.dataset.sceneState ?? null,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    labels,
    rainDisplay: rain ? getComputedStyle(rain).display : null,
    rainPaintedPixels: (() => {
      if (!rainCanvas || rainCanvas.width === 0 || rainCanvas.height === 0) return 0
      const ctx = rainCanvas.getContext('2d')
      const data = ctx.getImageData(0, 0, rainCanvas.width, rainCanvas.height).data
      let painted = 0
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) painted += 1
      return painted
    })(),
  }
})()`

function assertLabels(report, tag) {
  const problems = []
  const { w, h } = report.viewport
  report.labels.forEach((label) => {
    if (label.x0 < 0 || label.y0 < 0 || label.x1 > w || label.y1 > h) {
      problems.push(`${tag}: label "${label.text}" off-canvas ${JSON.stringify(label)}`)
    }
  })
  for (let i = 0; i < report.labels.length; i += 1) {
    for (let j = i + 1; j < report.labels.length; j += 1) {
      const a = report.labels[i]
      const b = report.labels[j]
      if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) {
        problems.push(`${tag}: labels overlap: "${a.text}" × "${b.text}"`)
      }
    }
  }
  return problems
}

const failures = []
const note = (ok, message) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${message}`)
  if (!ok) failures.push(message)
}

// ── run ──────────────────────────────────────────────────────────────────────
await send('Page.enable')
await send('Runtime.enable')

for (const { w, h, tag } of [
  { w: 1280, h: 800, tag: '1280x800' },
  { w: 1512, h: 982, tag: '1512x982' },
]) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: w,
    height: h,
    deviceScaleFactor: 1,
    mobile: false,
  })
  const loaded = waitEvent('Page.loadEventFired')
  await send('Page.navigate', { url: appUrl })
  await loaded
  await sleep(900)

  // neutral (investigation)
  await seedAndEnter(saves.neutral, false)
  const neutral = await evaluate(CHECKS)
  note(neutral.diorama, `${tag} neutral: .scene-stage--diorama present`)
  note(neutral.sceneState === 'neutral', `${tag} neutral: data-scene-state=neutral`)
  note(neutral.rainDisplay === 'block', `${tag} neutral: rain node displayed`)
  note(
    neutral.rainPaintedPixels > 150,
    `${tag} neutral: rain canvas painted (${neutral.rainPaintedPixels} streak px)`,
  )
  assertLabels(neutral, `${tag} neutral`).forEach((problem) => note(false, problem))
  if (neutral.labels.length === 4) note(true, `${tag} neutral: 4 labels inside viewport, no overlap`)
  await screenshot(`case77-diorama-neutral-${tag}.png`)

  // pointer parallax: two pointer positions; compare the screen shift of a
  // FAR-plane feature (the amber lamp) against a NEAR-plane feature (the
  // leftmost railing post — off-center, so rotation displaces it; the full-
  // width rails sit on the rotation axis and probe nothing).
  const FEATURES = `(() => {
    const lamp = document.querySelector('.scene-layer-far .scene-amber').getBoundingClientRect()
    const post = document.querySelector('.scene-layer-near rect[x="56"]').getBoundingClientRect()
    return {
      transform: document.querySelector('.scene-pgroup').style.transform,
      farX: lamp.x + lamp.width / 2,
      nearX: post.x + post.width / 2,
    }
  })()`
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(w * 0.05), y: Math.round(h * 0.1) })
  await sleep(1500)
  const movedA = await evaluate(FEATURES)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(w * 0.95), y: Math.round(h * 0.9) })
  await sleep(1800)
  const movedB = await evaluate(FEATURES)
  const farShift = Math.abs(movedB.farX - movedA.farX)
  const nearShift = Math.abs(movedB.nearX - movedA.nearX)
  note(
    movedA.transform.includes('rotate') && movedB.transform.includes('rotate'),
    `${tag} parallax: plane group rotates under pointer (${JSON.stringify(movedB.transform)})`,
  )
  // The scale-pinned stack swings the far plane on the longer arm, so the far
  // feature translates MORE than the near one — the depth-rate split is what
  // matters, not the direction. Assert both moved and the rates differ ≥1.5×.
  note(
    farShift > 0.5 && nearShift > 0.05 && farShift > nearShift * 1.5,
    `${tag} parallax: planes shift at different rates (far ${farShift.toFixed(2)}px vs near ${nearShift.toFixed(2)}px)`,
  )
  // pointer back to rest
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(w / 2), y: Math.round(h / 2) })

  // tribunal strip
  await seedAndEnter(saves.tribunal, false)
  const tribunal = await evaluate(CHECKS)
  note(tribunal.diorama && tribunal.sceneState === 'tribunal', `${tag} tribunal: diorama strip in tribunal state`)
  await screenshot(`case77-diorama-tribunal-${tag}.png`)

  // aftermath strip (rain suppressed)
  await seedAndEnter(saves.aftermath, false)
  const aftermath = await evaluate(CHECKS)
  note(aftermath.diorama && aftermath.sceneState === 'aftermath', `${tag} aftermath: diorama strip in aftermath state`)
  note(aftermath.rainDisplay === 'none', `${tag} aftermath: rain suppressed (display ${aftermath.rainDisplay})`)
  await screenshot(`case77-diorama-aftermath-${tag}.png`)

  // reduced motion (in-app setting): drift pinned + rain hidden
  await seedAndEnter(saves.neutral, true)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(w * 0.1), y: Math.round(h * 0.1) })
  await sleep(900)
  const reduced = await evaluate(`(() => ({
    transform: document.querySelector('.scene-pgroup').style.transform || 'none',
    rainDisplay: getComputedStyle(document.querySelector('.scene-art-rain')).display,
  }))()`)
  note(reduced.transform === 'none', `${tag} reduced-motion: drift pinned (transform "${reduced.transform}")`)
  note(reduced.rainDisplay === 'none', `${tag} reduced-motion: rain hidden`)
}

ws.close()
if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed`)
  process.exit(1)
}
console.log('\nall checks passed')

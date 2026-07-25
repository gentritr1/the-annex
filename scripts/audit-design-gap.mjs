// Design-gap audit harness — measures TEXT DOMINANCE, AMBIENCE VISIBILITY and
// the type inventory on every key surface of the live Vite app, at 1280x800 and
// 375x812, in headless Chrome over raw CDP (no added dependencies).
//
// What it measures, per surface per viewport:
//   glyphFrac        union area of every visible text node's line boxes / viewport
//   textSurfaceFrac  union area of the *blocks* that carry that text / viewport
//   opaquePanelFrac  union area of elements whose own background alpha >= 0.85
//   sceneVisibleFrac plate area NOT covered by those opaque blocks / viewport
//   typeInventory    distinct font-size values / (size,weight) pairs actually on
//                    screen, each with its glyph area — a real hierarchy is few
//   capsMono         glyph area spent on uppercase mono label text
//   panels           computed background/backdrop-filter of the named surfaces
//
// Every computed read is taken with transitions AND animations disabled and two
// frames allowed to pass (the recorded transition-clock scar: a computed read on
// a transitioned property otherwise returns the START frame). Every interaction
// uses el.click() (a synthetic dispatchEvent never reaches React's root).
//
// Usage: node scripts/audit-design-gap.mjs <before|after> [app-url]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const LABEL = process.argv[2] ?? 'before'
const APP_URL = process.argv[3] ?? 'http://127.0.0.1:3000/'
const OUT_DIR = new URL('../evidence/design-gap-fix/', import.meta.url).pathname
mkdirSync(OUT_DIR, { recursive: true })

const SAVE_KEY = 'the-annex.case-77.save.v1'
const SETTINGS_KEY = 'the-annex.accessibility.v1'
const SETTINGS = {
  reducedMotion: false,
  highContrast: false,
  textSize: 'standard',
  showTrustNumbers: false,
  ambientSound: false,
}

const chromeProcess = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-audit-${Date.now()}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--mute-audio',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1280,800',
  'about:blank',
])

const killTimer = setTimeout(() => {
  console.error('GLOBAL TIMEOUT — aborting design-gap audit run')
  chromeProcess.kill('SIGKILL')
  process.exit(2)
}, 900000)
killTimer.unref?.()

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection (tolerated):', reason?.message ?? reason)
})

const wsUrl = await new Promise((resolve, reject) => {
  let stderr = ''
  const timer = setTimeout(() => reject(new Error('Chrome CDP endpoint timed out')), 20000)
  chromeProcess.stderr.on('data', (chunk) => {
    stderr += chunk
    const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/)
    if (!match) return
    clearTimeout(timer)
    resolve(match[1])
  })
  chromeProcess.once('exit', (code) => {
    clearTimeout(timer)
    reject(new Error(`Chrome exited before CDP attached (${code ?? 'unknown'})`))
  })
})

const socket = new WebSocket(wsUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

let nextId = 1
const pending = new Map()
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (!message.id || !pending.has(message.id)) return
  const { resolve, reject } = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) reject(new Error(message.error.message))
  else resolve(message.result)
})
function raw(method, params = {}, sessionId) {
  const id = nextId
  nextId += 1
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        reject(new Error(`CDP timeout: ${method}`))
      }
    }, 60000)
    pending.set(id, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      reject: (err) => {
        clearTimeout(timer)
        reject(err)
      },
    })
    socket.send(JSON.stringify({ id, method, params, sessionId }))
  })
}

const { targetId } = await raw('Target.createTarget', { url: 'about:blank' })
await raw('Target.activateTarget', { targetId })
const { sessionId } = await raw('Target.attachToTarget', { targetId, flatten: true })
const send = (method, params = {}) => raw(method, params, sessionId)
await send('Runtime.enable')
await send('Page.enable')
await send('DOM.enable')
await send('Emulation.setFocusEmulationEnabled', { enabled: true })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? 'page exception')
  }
  return result.result.value
}

async function waitFor(expr, timeout = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const ok = await evaluate(expr).catch(() => false)
    if (ok) return true
    await sleep(120)
  }
  return false
}
const waitForText = (selector, text, timeout = 15000) =>
  waitFor(
    `[...document.querySelectorAll(${JSON.stringify(selector)})].some((el) => el.textContent.includes(${JSON.stringify(text)}))`,
    timeout,
  )

const click = (selector, text) =>
  evaluate(`(() => {
    const m = [...document.querySelectorAll(${JSON.stringify(selector)})]
    const pick = ${JSON.stringify(text ?? '')}
      ? m.find((e) => e.textContent.includes(${JSON.stringify(text ?? '')}))
      : m[0]
    if (!pick) return false
    pick.click()
    return true
  })()`)

let viewport = { width: 1280, height: 800 }
async function setViewport(width, height) {
  viewport = { width, height }
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  })
}

async function shot(name) {
  await sleep(420)
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  const file = join(OUT_DIR, `${name}-${viewport.width}x${viewport.height}-${LABEL}.png`)
  writeFileSync(file, Buffer.from(data, 'base64'))
  return file.split('/').pop()
}

const FREEZE = `(async () => {
  document.getElementById('annex-audit-freeze')?.remove()
  const style = document.createElement('style')
  style.id = 'annex-audit-freeze'
  style.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }'
  document.head.appendChild(style)
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  return true
})()`
const freeze = () => evaluate(FREEZE)
const unfreeze = () =>
  evaluate(`(() => { document.getElementById('annex-audit-freeze')?.remove(); return true })()`)

// ── The measurement itself (runs inside the page, with motion frozen) ────────
const MEASURE = `(() => {
  const vw = window.innerWidth, vh = window.innerHeight
  const CELL = 2
  const cols = Math.ceil(vw / CELL), rows = Math.ceil(vh / CELL)
  const mk = () => new Uint8Array(cols * rows)
  const paint = (grid, r) => {
    const x0 = Math.max(0, Math.floor(r.left / CELL))
    const x1 = Math.min(cols, Math.ceil(r.right / CELL))
    const y0 = Math.max(0, Math.floor(r.top / CELL))
    const y1 = Math.min(rows, Math.ceil(r.bottom / CELL))
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) grid[y * cols + x] = 1
  }
  const count = (grid) => { let n = 0; for (let i = 0; i < grid.length; i += 1) n += grid[i]; return n }
  const frac = (grid) => Math.round((count(grid) * CELL * CELL / (vw * vh)) * 10000) / 10000

  const alpha = (c) => {
    if (!c || c === 'transparent') return 0
    const m = c.match(/rgba?\\(([^)]+)\\)/)
    if (!m) return 1
    const parts = m[1].split(/[,\\/]+/).map((s) => s.trim())
    return parts.length > 3 ? parseFloat(parts[3]) : 1
  }
  const onScreen = (r) => r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh

  const glyphGrid = mk(), surfaceGrid = mk(), panelGrid = mk(), capsGrid = mk()
  const sizeArea = {}, pairArea = {}, familyArea = {}
  let glyphBoxes = 0

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const seenBlocks = new Set()
  let node
  while ((node = walker.nextNode())) {
    const raw = node.nodeValue
    if (!raw || !raw.trim()) continue
    const parent = node.parentElement
    if (!parent) continue
    const cs = getComputedStyle(parent)
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) continue
    if (parent.closest('[aria-hidden="true"]')) continue
    // sr-only clipping: a 1px clipped box is not visible text.
    const pr = parent.getBoundingClientRect()
    if (pr.width <= 2 || pr.height <= 2) continue
    if (!onScreen(pr)) continue
    const range = document.createRange()
    range.selectNodeContents(node)
    const boxes = [...range.getClientRects()].filter(onScreen)
    if (!boxes.length) continue
    let area = 0
    for (const b of boxes) { paint(glyphGrid, b); area += Math.max(0, Math.min(b.right, vw) - Math.max(b.left, 0)) * Math.max(0, Math.min(b.bottom, vh) - Math.max(b.top, 0)) }
    glyphBoxes += boxes.length
    const size = cs.fontSize, weight = cs.fontWeight
    const mono = /mono|courier/i.test(cs.fontFamily)
    const caps = cs.textTransform === 'uppercase'
    sizeArea[size] = (sizeArea[size] || 0) + area
    const key = size + '/' + weight + (caps ? '/CAPS' : '') + (mono ? '/mono' : '')
    pairArea[key] = (pairArea[key] || 0) + area
    familyArea[mono ? 'mono' : 'sans'] = (familyArea[mono ? 'mono' : 'sans'] || 0) + area
    if (caps && mono) for (const b of boxes) paint(capsGrid, b)
    // the nearest block ancestor that carries this text
    let block = parent
    while (block && getComputedStyle(block).display === 'inline') block = block.parentElement
    if (block && !seenBlocks.has(block)) { seenBlocks.add(block); paint(surfaceGrid, block.getBoundingClientRect()) }
  }

  // OCCLUDING CHROME: an element that (a) paints its own background at alpha
  // >= 0.85, (b) actually carries visible text (so it is UI chrome, not scene
  // art), (c) is not the scene plate nor an ancestor of it, and (d) is not part
  // of the plate's own art subtree. These are the blocks that hide ambience.
  const plateEl = document.querySelector('.world-view') || document.querySelector('.tribunal-chamber') || document.querySelector('.debrief-tableau') || document.querySelector('.memory-lattice-stage') || document.querySelector('.scene-banner') || document.querySelector('.scene-stage')
  const plate = plateEl ? plateEl.getBoundingClientRect() : null
  const artRoots = '.annex-world-stage, .site-closeup-stage, .scene-stage, .scene-preview, .world-view'
  const opaque = []
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const a = alpha(cs.backgroundColor) * parseFloat(cs.opacity || '1')
    if (a < 0.85) continue
    if (!(el.textContent || '').trim()) continue
    if (plateEl && (el === plateEl || el.contains(plateEl))) continue
    if (el.closest(artRoots) && !el.matches('.world-caption, .world-caption *')) continue
    const r = el.getBoundingClientRect()
    if (!onScreen(r) || r.width * r.height < 400) continue
    paint(panelGrid, r)
    opaque.push({ cls: String(el.className).slice(0, 60), bg: cs.backgroundColor, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) })
  }

  // OVER-PLATE CHROME: the docked surfaces that sit ON the scene. Their fills
  // are gradients (backgroundColor reads transparent), so they are probed by
  // name and reported as a share of the plate, not inferred from alpha.
  const overPlate = {}
  let overPlateCells = 0
  const overGrid = mk()
  if (plate) {
    for (const sel of ['.room-console', '.scene-result', '.scene-beat', '.scene-summons', '.site-closeup-zone-label', '.world-caption', '.casefile-summon', '.world-return', '.scene-detail-summon']) {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect()
        if (!onScreen(r)) continue
        const ix = Math.max(0, Math.min(r.right, plate.right) - Math.max(r.left, plate.left))
        const iy = Math.max(0, Math.min(r.bottom, plate.bottom) - Math.max(r.top, plate.top))
        if (ix * iy < 100) continue
        const cs = getComputedStyle(el)
        overPlate[sel] = {
          pctOfPlate: Math.round((ix * iy / (plate.width * plate.height)) * 1000) / 10,
          h: Math.round(r.height),
          bg: cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? cs.backgroundImage.slice(0, 120) : cs.backgroundColor,
          backdrop: cs.backdropFilter,
        }
        paint(overGrid, { left: Math.max(r.left, plate.left), right: Math.min(r.right, plate.right), top: Math.max(r.top, plate.top), bottom: Math.min(r.bottom, plate.bottom) })
      }
    }
    const x0 = Math.max(0, Math.floor(plate.left / CELL)), x1 = Math.min(cols, Math.ceil(plate.right / CELL))
    const y0 = Math.max(0, Math.floor(plate.top / CELL)), y1 = Math.min(rows, Math.ceil(plate.bottom / CELL))
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) if (overGrid[y * cols + x]) overPlateCells += 1
  }

  let sceneVisible = 0, plateCells = 0
  if (plate) {
    const x0 = Math.max(0, Math.floor(plate.left / CELL)), x1 = Math.min(cols, Math.ceil(plate.right / CELL))
    const y0 = Math.max(0, Math.floor(plate.top / CELL)), y1 = Math.min(rows, Math.ceil(plate.bottom / CELL))
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) { plateCells += 1; if (!panelGrid[y * cols + x]) sceneVisible += 1 }
  }
  const plateEls = plateEl ? getComputedStyle(plateEl) : null

  const top = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([k, v]) => [k, Math.round(v)])

  return {
    viewport: { vw, vh },
    glyphFrac: frac(glyphGrid),
    textSurfaceFrac: frac(surfaceGrid),
    opaquePanelFrac: frac(panelGrid),
    sceneVisibleFrac: Math.round((sceneVisible * CELL * CELL / (vw * vh)) * 10000) / 10000,
    plateOccludedPct: plateCells ? Math.round((1 - sceneVisible / plateCells) * 1000) / 10 : null,
    overPlateChromePct: plateCells ? Math.round((overPlateCells / plateCells) * 1000) / 10 : null,
    overPlate,
    plateSel: plateEl ? String(plateEl.className).slice(0, 60) : null,
    plateBg: plateEls ? plateEls.backgroundColor : null,
    plate: plate ? { w: Math.round(plate.width), h: Math.round(plate.height), top: Math.round(plate.top), left: Math.round(plate.left) } : null,
    plateFrac: plate ? Math.round((plate.width * plate.height / (vw * vh)) * 10000) / 10000 : 0,
    capsMonoFrac: frac(capsGrid),
    distinctSizes: Object.keys(sizeArea).length,
    distinctPairs: Object.keys(pairArea).length,
    topSizes: top(sizeArea, 12),
    topPairs: top(pairArea, 14),
    familyArea: familyArea,
    glyphBoxes,
    opaqueBlocks: opaque.slice(0, 24),
    opaqueCount: opaque.length,
    pageScrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
    scrollHeight: document.documentElement.scrollHeight,
  }
})()`

const PANEL_PROBE = `(() => {
  const want = ['.room-console', '.field-dock', '.field-commandbar', '.field-objectives', '.field-threshold',
    '.casefile-drawer', '.scene-beat', '.scene-result', '.site-closeup-cover', '.scene-preview-wash',
    '.scene-preview-vignette', '.world-caption', '.site-description', '.scene-detail-summon',
    '.casefile-summon', '.tribunal-page', '.debrief-page', '.lattice-page', '.phase-page',
    '.scene-zones-live-cover', '.site-closeup-zone-label', '.choice-list', '.decision-list']
  const out = {}
  for (const sel of want) {
    const el = document.querySelector(sel)
    if (!el) continue
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    out[sel] = {
      background: cs.backgroundColor,
      backgroundImage: cs.backgroundImage.slice(0, 160),
      backdropFilter: cs.backdropFilter,
      opacity: cs.opacity,
      border: cs.borderTopWidth + ' ' + cs.borderTopColor,
      padding: cs.paddingTop + ' ' + cs.paddingRight + ' ' + cs.paddingBottom + ' ' + cs.paddingLeft,
      fontSize: cs.fontSize,
      box: { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) },
    }
  }
  return out
})()`

const report = { label: LABEL, url: APP_URL, capturedAt: new Date().toISOString(), node: process.version, surfaces: {} }

async function capture(key) {
  await freeze()
  const m = await evaluate(MEASURE)
  const panels = await evaluate(PANEL_PROBE)
  await unfreeze()
  const file = await shot(key)
  const tag = `${key}@${viewport.width}`
  report.surfaces[tag] = { ...m, panels, shot: file }
  console.log(
    `${tag.padEnd(30)} glyph ${(m.glyphFrac * 100).toFixed(1).padStart(4)}%  textBlocks ${(m.textSurfaceFrac * 100).toFixed(1).padStart(4)}%  chrome ${(m.opaquePanelFrac * 100).toFixed(1).padStart(4)}%  plate ${(m.plateFrac * 100).toFixed(1).padStart(4)}% (chromeOver ${String(m.overPlateChromePct).padStart(4)}%)  sizes ${String(m.distinctSizes).padStart(2)}  pairs ${String(m.distinctPairs).padStart(2)}  capsMono ${(m.capsMonoFrac * 100).toFixed(2)}%`,
  )
}

// ── Navigation ──────────────────────────────────────────────────────────────
let bootCounter = 0
async function boot(seed) {
  bootCounter += 1
  await send('Page.navigate', { url: 'about:blank' })
  await sleep(180)
  await send('Page.navigate', { url: APP_URL })
  await waitFor(`document.readyState === 'complete'`)
  await evaluate(`(() => {
    try {
      window.localStorage.clear()
      ${seed ? `window.localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(seed))});
      window.localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, ${JSON.stringify(JSON.stringify(SETTINGS))});` : ''}
    } catch { /* ignore */ }
    window.__annexStale = true
    return true
  })()`)
  await send('Page.navigate', { url: `${APP_URL}${APP_URL.includes('?') ? '&' : '?'}boot=${bootCounter}` })
  if (!(await waitFor(`window.__annexStale === undefined && document.readyState === 'complete'`))) {
    throw new Error('the fresh document never became live')
  }
  if (seed) {
    if (!(await waitForText('button', 'Continue'))) throw new Error('landing offered no Continue')
    await click('button', 'Continue')
  } else {
    if (!(await waitForText('button', 'Open a new audit'))) throw new Error('landing did not render')
    await click('button', 'Open a new audit')
    if (!(await waitFor(`!!document.querySelector('.choice-row')`))) throw new Error('briefing did not render')
    await click('.choice-row')
  }
  await sleep(500)
}

function seed(overrides = {}) {
  return {
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
    announcement: 'Design-gap audit seed.',
    ...overrides,
  }
}

async function returnToConcourse() {
  if (await evaluate(`!!document.querySelector('.world-return')`)) {
    await click('.world-return')
    await sleep(700)
  }
}

async function enterSite(name) {
  await returnToConcourse()
  const viaPortal = await click('.annex-world-portal', name)
  if (!viaPortal) await click('.site-switch', name)
  await waitFor(`!!document.querySelector('.world-view--closeup')`, 9000)
  await sleep(900)
}

// ── The run ─────────────────────────────────────────────────────────────────
async function runViewport(width, height) {
  await setViewport(width, height)

  // 1. concourse — investigation at the world view
  await boot()
  await waitFor(`!!document.querySelector('.site-switcher')`)
  await returnToConcourse()
  await sleep(600)
  await capture('01-concourse')

  // 2. close-read with the room console
  await enterSite('Registry intake')
  await capture('02-closeread-console')

  // 3. terminal zones — a site whose plate carries its choices as zones
  await enterSite('Maintenance spine')
  const zoneCount = await evaluate(`document.querySelectorAll('.scene-zone button').length`)
  console.log(`   zones on Maintenance spine: ${zoneCount}`)
  await capture('03-zones')

  // 4. beat — arm then commit the first zone; the beat mounts over the plate
  if (zoneCount) {
    await click('.scene-zone button')
    await sleep(420)
    await click('.scene-zone button')
    await waitFor(`!!document.querySelector('.scene-beat')`, 8000)
    await sleep(900)
  }
  await capture('04-beat')

  // 4b. the result strip that docks after the beat
  for (let i = 0; i < 14; i += 1) {
    if (await evaluate(`!!document.querySelector('.scene-result')`)) break
    if (!(await click('.scene-beat-advance'))) break
    await sleep(320)
  }
  await capture('09-result')

  // 5. case-file drawer
  await boot()
  await waitFor(`!!document.querySelector('.casefile-summon')`)
  await click('.casefile-summon')
  await waitFor(`!!document.querySelector('.casefile-drawer')`, 6000)
  await sleep(600)
  await capture('05-casefile')

  // 6. tribunal
  await boot(seed({
    phase: 'tribunal',
    reconstruction: 'unresolved-composite',
    selectedFragments: ['scar-sensation', 'registry-hash'],
    evidence: ['irreducible-conflict'],
  }))
  await waitFor(`!!document.querySelector('.tribunal-page')`, 9000)
  await sleep(600)
  await capture('06-tribunal')

  // 7. debrief
  await boot(seed({
    phase: 'debrief',
    reconstruction: 'unresolved-composite',
    selectedFragments: ['scar-sensation', 'registry-hash'],
    decision: 'certify-continuity',
    precedents: { 'case-77': 'certify-continuity' },
  }))
  await waitFor(`!!document.querySelector('.debrief-page')`, 9000)
  await sleep(600)
  await capture('07-debrief')

  // 8. reconstruction / memory lattice
  await boot(seed({ phase: 'reconstruction' }))
  await waitFor(`!!document.querySelector('.lattice-page')`, 9000)
  await sleep(600)
  await capture('08-lattice')
}

try {
  await runViewport(1280, 800)
  await runViewport(375, 812)
} catch (error) {
  console.error('AUDIT RUN ERROR:', error.message)
  report.error = error.message
}

writeFileSync(join(OUT_DIR, `measurements-${LABEL}.json`), JSON.stringify(report, null, 2))
console.log(`\nwrote ${OUT_DIR}measurements-${LABEL}.json`)
clearTimeout(killTimer)
chromeProcess.kill('SIGKILL')
process.exit(0)

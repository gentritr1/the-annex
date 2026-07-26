// Ultra-wide evidence — the plate, its markers, and its chrome above 1280px.
//
// WHY THIS FILE EXISTS
//
// Every standing harness in this repo measures 1280x800 and 375x812. A player
// reported the defect at ~2000x1178: "we cannot see the orange dots, or the full
// image since the text is on top." Nothing in the suite could have caught it,
// because nothing had ever looked above 1280.
//
// The plate's photograph is projected `object-fit: cover`
// (`.site-closeup-cover`: width max(100cqw, 100cqh*16/9)). Cover crops on the
// axis the container is short in. Widening the workspace without lengthening it
// therefore does not show MORE photograph — it shows LESS, because the 16:9
// projection grows past the plate's height and the overflow is clipped. On top
// of that the docked room console eats up to 76% of the plate's height, and the
// chrome pills sit over the top corners. At 2000px all three compound.
//
// WHAT IS MEASURED, per width, per location:
//   (a) OCCLUSION — the photograph's area, split into: visible, lost to the
//       cover crop, hidden under the docked console, hidden under a chrome pill.
//   (b) MARKERS — every on-plate mark and carrier anchor (authored content;
//       layout adapts to them, never the reverse), its centre and its box vs
//       the console band and the chrome pills.
//   (c) MARKER SIZE + RING CONTRAST — the drawn size as a fraction of the plate
//       width, and a composited per-pixel contrast of the mark against the plate
//       band directly under it, measured by differencing two real frames.
//   (d) CHROME — the CASE FILE pill and the LOCATION DETAIL summon vs the
//       photograph's focal cell.
//
// The floors are stated as constants below with their justification. Every
// assertion runs at every width including 1280x800 and 375x812, so a wide fix
// that regressed a shipped width fails here.
//
// Usage: node scripts/evidence-ultrawide.mjs [app-url]
//   BASELINE=1  records the numbers without asserting the fix's clauses (the
//               "before" table). Default asserts everything.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://127.0.0.1:3000/'
const OUT_DIR = new URL('../evidence/ultrawide-fix/', import.meta.url).pathname
const BASELINE = process.env.BASELINE === '1'
const LABEL = process.env.LABEL ?? (BASELINE ? 'before' : 'after')
mkdirSync(OUT_DIR, { recursive: true })

// ── The floors, and why they are these numbers ──────────────────────────────
//
// FULL PHOTOGRAPH. The user's own acceptance bar, stated in their report: they
// "cannot see the full image". In a ritual phase (a docked console on screen)
// the whole 16:9 frame has to be inside the plate AND above the console's top
// edge. 1px of tolerance for sub-pixel layout, never more — this is a
// containment test, not a percentage.
const PHOTO_EPSILON_PX = 1
// MARKER CONTRAST. WCAG 2.1 SC 1.4.11 (Non-text Contrast) puts graphical objects
// required to understand content at 3:1 against adjacent colour. A zone mark and
// a carrier latch are exactly that: the only thing that says where a method or a
// carrier is on the photograph. 3.0 is therefore the floor, not a taste call.
// Measured as `ringContrast` — see the long note on the DIFF probe below for
// why that statistic and not a percentile over the mark's bounding box.
const RING_CONTRAST_FLOOR = 3
// MARKER SIZE. Not one global percentage — the sheet authors four different
// mark sizes on purpose, and a single floor either lets the biggest shrink or
// fails the smallest where it already ships. The floor is PER MARK and it is
// the mark's own shipped share of the frame: its authored pixel size over the
// 1190px-wide photograph the shipped 1280x800 plate projects. The clause is
// therefore "no mark is a smaller share of the photograph than it is at the
// width this repo has always verified" — which is exactly the defect (a fixed
// 17px dot on a 1929px frame is 0.88%, against 1.43% at 1280).
//
// The 2% tolerance is sub-pixel layout jitter, nothing more; marks whose size
// is authored as a PERCENTAGE of the projection (the custody closure, mirror
// and outcome rings) scale by construction and carry no entry.
const SHIPPED_PHOTO_W_1280 = 1190
const SHIPPED_MARK_PX = {
  '.site-closeup-zone': 17,
  '.scene-zone-ring': 62,
  '.crs-latch': 13,
  '.asc-checkpoint': 12,
}
const markFloor = (sel) =>
  SHIPPED_MARK_PX[sel] === undefined ? null : (SHIPPED_MARK_PX[sel] / SHIPPED_PHOTO_W_1280) * 0.98
// FOCAL CELL. One cell of the rule-of-thirds grid, centred on the AUTHORED focal
// point: ±1/6 of the photograph on each axis. Standard photographic framing, and
// it is the region the author pointed at, so it is the region chrome must clear.
const FOCAL_CELL_FRACTION = 1 / 3
// THE LETTERBOX BREAKPOINT, restated from styles.css so a drift fails HERE and
// not in a screenshot nobody diffs.
const LETTERBOX_MIN_WIDTH = 1281
const LETTERBOX_MIN_HEIGHT = 977
const CONSOLE_BAND_PX = 248

// WHICH MARKS THE 3:1 FLOOR BINDS ON. WCAG 1.4.11 covers graphical objects
// "required to understand the content" — the marks that say WHERE a method, a
// carrier or a checkpoint is. It does not cover atmosphere, and the sheet is
// explicit that the second group carries no meaning the DOM does not already
// hold ("Essential meaning stays in the DOM room text; this is flourish").
// Holding a deliberately dormant sealed door to 3:1 would contradict the thing
// it is drawn to say, so it is measured and reported but not asserted.
const WAYFINDING = new Set([
  '.site-closeup-zone', '.scene-zone-ring', '.crs-latch', '.crs-closure',
  '.crs-mirror-ring', '.crso-ring', '.asc-checkpoint',
])
const ATMOSPHERE = new Set([
  '.asc-credential', '.scr-drawer-glow', '.scr-aperture', '.scr-slip',
])

// The BEFORE numbers, from `BASELINE=1 node scripts/evidence-ultrawide.mjs`
// against this same tree before any of the fix existed
// (evidence/ultrawide-fix/ultrawide-before.json). Quoted so the two widths the
// letterbox deliberately does NOT touch are held to "no worse than shipped"
// rather than being left unmeasured — a re-baseline adds clauses, it never
// drops one.
const BEFORE = {
  'registry-intake@375': { unseenPct: 81.3, marksUnderConsole: 6 },
  'maintenance-spine@375': { unseenPct: 81.3, marksUnderConsole: 4 },
  'small-archive@375': { unseenPct: 81.3, marksUnderConsole: 1 },
  'care-ward@375': { unseenPct: 29.69, marksUnderConsole: 0 },
  'registry-intake@1280': { unseenPct: 53.44, marksUnderConsole: 2 },
  'maintenance-spine@1280': { unseenPct: 64.8, marksUnderConsole: 3 },
  'small-archive@1280': { unseenPct: 62.77, marksUnderConsole: 1 },
  'care-ward@1280': { unseenPct: 27.05, marksUnderConsole: 0 },
}

const chromeProcess = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-ultrawide-${Date.now()}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--mute-audio',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=2000,1178',
  'about:blank',
])

const killTimer = setTimeout(() => {
  console.error('GLOBAL TIMEOUT — aborting ultra-wide evidence run')
  chromeProcess.kill('SIGKILL')
  process.exit(2)
}, 1800000)
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
    }, 40000)
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

// el.click() — a synthetic dispatchEvent does not reach React's root listener.
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

async function setViewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  })
}

const report = {
  url: APP_URL,
  label: LABEL,
  baseline: BASELINE,
  capturedAt: new Date().toISOString(),
  node: process.version,
  floors: {
    PHOTO_EPSILON_PX,
    RING_CONTRAST_FLOOR,
    SHIPPED_MARK_PX,
    SHIPPED_PHOTO_W_1280,
    FOCAL_CELL_FRACTION,
    LETTERBOX_MIN_WIDTH,
    LETTERBOX_MIN_HEIGHT,
    CONSOLE_BAND_PX,
  },
  measurements: {},
  checks: [],
  shots: [],
}
let failures = 0
function record(step, pass, detail) {
  report.checks.push({ step, pass, detail })
  if (!pass) failures += 1
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${step}  ${JSON.stringify(detail)}`)
}

async function shot(name, width, height) {
  const { data } = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  })
  const file = join(OUT_DIR, `${name}-${LABEL}-${width}x${height}.png`)
  writeFileSync(file, Buffer.from(data, 'base64'))
  report.shots.push(file)
  return data
}

// ── Navigation ──────────────────────────────────────────────────────────────

let bootCounter = 0
async function bootFreshRun() {
  bootCounter += 1
  await send('Page.navigate', { url: APP_URL })
  await waitFor(`document.readyState === 'complete'`)
  await evaluate(
    `(() => { try { window.localStorage.clear() } catch { /* ignore */ } window.__annexStale = true; return true })()`,
  )
  await send('Page.navigate', {
    url: `${APP_URL}${APP_URL.includes('?') ? '&' : '?'}boot=${bootCounter}`,
  })
  if (!(await waitFor(`window.__annexStale === undefined && document.readyState === 'complete'`))) {
    throw new Error('the fresh document never became live')
  }
  if (!(await waitForText('button', 'Open a new audit'))) throw new Error('landing did not render')
  await click('button', 'Open a new audit')
  if (!(await waitFor(`!!document.querySelector('.choice-row')`))) {
    throw new Error('briefing did not render')
  }
  await click('.choice-row')
  if (!(await waitFor(`!!document.querySelector('.site-switcher')`))) {
    throw new Error('investigation did not render')
  }
  await sleep(460)
}

async function enterSite(name) {
  const viaPortal = await click('.annex-world-portal', name)
  if (!viaPortal) await click('.site-switch', name)
  const ok = await waitFor(
    `document.querySelector('.world-view')?.dataset.transition === 'closeup'`,
    20000,
  )
  await sleep(620)
  return ok
}

// ── The locations, and the ritual state each is measured in ─────────────────
//
// Each site is driven to the state the reporter was in: a ritual MID-phase, with
// the console docked and the plate's own stagecraft marks live. Care ward 12 has
// no room, so it is measured with its two live scene-first zones — which is its
// only close-read state.

const SITES = [
  {
    key: 'registry-intake',
    name: 'Registry intake',
    console: true,
    // The reporter's exact state: carriers seated, the late carrier refused, the
    // mirror branch live — the amber latches and the amber mirror ring on screen.
    async midPhase() {
      for (let i = 0; i < 3; i += 1) {
        const seated = await evaluate(`(() => {
          const open = [...document.querySelectorAll('.cr-carrier')].find((b) => !b.disabled)
          if (!open) return false
          open.click(); return true
        })()`)
        if (!seated) break
        await sleep(240)
      }
      await click('.cr-late-carrier')
      await sleep(320)
    },
  },
  {
    key: 'maintenance-spine',
    name: 'Maintenance spine',
    console: true,
    async midPhase() {
      await click('.as-listen')
      await sleep(280)
      await click('.as-listen')
      await sleep(320)
    },
  },
  {
    key: 'small-archive',
    name: 'The Small Archive',
    console: true,
    async midPhase() {
      await click('.room-category')
      await sleep(320)
    },
  },
  { key: 'care-ward', name: 'Care ward 12', console: false, async midPhase() {} },
]

// ── The geometry probe ──────────────────────────────────────────────────────
//
// Transitions and animations are killed and two frames are allowed to pass
// before anything is read (the transition-clock scar: getComputedStyle and
// getBoundingClientRect both report the START frame of a transitioned property).

const GEOMETRY = `(async () => {
  document.getElementById('__uwfreeze')?.remove()
  const s = document.createElement('style')
  s.id = '__uwfreeze'
  s.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }'
  document.head.appendChild(s)
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

  const rect = (el) => {
    if (!el) return null
    const b = el.getBoundingClientRect()
    return {
      top: +b.top.toFixed(2), left: +b.left.toFixed(2),
      right: +b.right.toFixed(2), bottom: +b.bottom.toFixed(2),
      width: +b.width.toFixed(2), height: +b.height.toFixed(2),
    }
  }
  const q = (sel) => rect(document.querySelector(sel))
  const inter = (a, b) => {
    if (!a || !b) return 0
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
    return w > 0 && h > 0 ? w * h : 0
  }

  const plate = q('.site-closeup-stage')
  const photo = q('.site-closeup-projection > img')
  const dock = q('.room-console')
  if (!plate || !photo) return { plate, photo, absent: true }

  // The photograph's visible frame: what survives the plate's own clip.
  const visible = {
    left: Math.max(photo.left, plate.left),
    right: Math.min(photo.right, plate.right),
    top: Math.max(photo.top, plate.top),
    bottom: Math.min(photo.bottom, plate.bottom),
  }
  const photoArea = photo.width * photo.height
  const visibleArea = Math.max(0, visible.right - visible.left) * Math.max(0, visible.bottom - visible.top)

  // Chrome that paints OVER the photograph. The caption and the two summon pills
  // are the surfaces the reporter named ("the text is on top").
  const CHROME = [
    ['.scene-summons .casefile-summon', 'CASE FILE pill'],
    ['.scene-summons .scene-detail-summon', 'LOCATION DETAIL summon'],
    ['.site-inspector--spine .scene-detail-summon', 'spine LOCATION DETAIL summon'],
    ['.casefile-summon-why', 'CASE FILE purpose copy'],
    ['.world-caption', 'plate caption'],
    ['.world-return', 'concourse return'],
  ]
  const chrome = []
  for (const [sel, label] of CHROME) {
    for (const el of document.querySelectorAll(sel)) {
      const r = rect(el)
      if (!r || r.width < 1 || r.height < 1) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      // Only chrome that is actually over the plate counts as occlusion.
      if (inter(r, plate) <= 0) continue
      chrome.push({ sel, label, rect: r, overPhotoPx: Math.round(inter(r, visible)) })
    }
  }

  // Every on-plate mark and authored carrier anchor. Class list, not a guess:
  // each of these is a positioned span placed at an anchor authored in content.
  const MARKS = [
    ['.site-closeup-zone', 'decorative zone mark'],
    ['.scene-zone-ring', 'live zone ring'],
    ['.crs-latch', 'custody carrier latch'],
    ['.crs-closure', 'custody closure stop'],
    ['.crs-mirror-ring', 'custody mirror ring'],
    ['.crso-ring', 'custody outcome ring'],
    ['.asc-checkpoint', 'acoustic checkpoint'],
    ['.asc-credential', 'acoustic credential door'],
    ['.scr-drawer-glow', 'archive drawer register'],
    ['.scr-aperture', 'archive aperture'],
    ['.scr-slip', 'archive removal slip'],
  ]
  const marks = []
  for (const [sel, label] of MARKS) {
    document.querySelectorAll(sel).forEach((el, i) => {
      const r = rect(el)
      if (!r || r.width < 1 || r.height < 1) return
      // Effective opacity through every ancestor: a mark inside an opacity:0
      // group (the room-phase zone suppressions) is not on screen at all, and
      // measuring it would manufacture both a false occlusion and a false
      // contrast failure.
      let eff = 1
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const o = parseFloat(getComputedStyle(n).opacity)
        eff *= Number.isFinite(o) ? o : 1
        if (getComputedStyle(n).visibility === 'hidden' || getComputedStyle(n).display === 'none') eff = 0
      }
      marks.push({
        sel, label: label + (i ? ' #' + (i + 1) : ''),
        state: el.dataset.state ?? null,
        rect: r,
        centre: { x: +(r.left + r.width / 2).toFixed(2), y: +(r.top + r.height / 2).toFixed(2) },
        effectiveOpacity: +eff.toFixed(3),
        onScreen: eff >= 0.05,
        // Placement vs the surfaces that can hide it.
        underConsole: dock ? inter(r, dock) > 0 : false,
        centreUnderConsole: dock ? (r.left + r.width / 2) >= dock.left && (r.left + r.width / 2) <= dock.right && (r.top + r.height / 2) >= dock.top && (r.top + r.height / 2) <= dock.bottom : false,
        underChrome: chrome.filter((c) => inter(r, c.rect) > 0).map((c) => c.label),
        insidePlate: r.left >= plate.left - 0.5 && r.right <= plate.right + 0.5 && r.top >= plate.top - 0.5 && r.bottom <= plate.bottom + 0.5,
        // LAYOUT size, not the painted rect. Several marks carry an authored
        // perspective transform (the acoustic corridor scales its far
        // checkpoint to 0.72 so it reads as distant); measuring the transformed
        // rect would fail the size floor on a depth cue the design intends. The
        // floor exists to catch a plate that outgrew its markers, not to
        // flatten the corridor. Contrast is still measured on what is PAINTED,
        // where the transform genuinely matters.
        layoutPx: Math.max(el.offsetWidth, el.offsetHeight),
        fractionOfPhotoWidth: +(Math.max(el.offsetWidth, el.offsetHeight) / photo.width).toFixed(5),
        drawnPx: +Math.max(r.width, r.height).toFixed(2),
      })
    })
  }

  // The authored focal point, resolved to page coordinates through the same
  // custom properties the projection uses. The focal CELL is one rule-of-thirds
  // cell centred on it.
  const stageEl = document.querySelector('.site-closeup-stage')
  const cs = getComputedStyle(stageEl)
  const fx = parseFloat(cs.getPropertyValue('--site-focal-position-x')) / 100
  const fy = parseFloat(cs.getPropertyValue('--site-focal-position-y')) / 100
  const cell = ${FOCAL_CELL_FRACTION}
  const focal = Number.isFinite(fx) && Number.isFinite(fy)
    ? {
        x: +(photo.left + fx * photo.width).toFixed(2),
        y: +(photo.top + fy * photo.height).toFixed(2),
        normalized: { x: +fx.toFixed(3), y: +fy.toFixed(3) },
        cell: {
          left: +(photo.left + (fx - cell / 2) * photo.width).toFixed(2),
          right: +(photo.left + (fx + cell / 2) * photo.width).toFixed(2),
          top: +(photo.top + (fy - cell / 2) * photo.height).toFixed(2),
          bottom: +(photo.top + (fy + cell / 2) * photo.height).toFixed(2),
        },
      }
    : null

  const chromeOverPhoto = chrome.reduce((n, c) => n + c.overPhotoPx, 0)
  const consoleOverPhoto = dock ? Math.round(inter(dock, visible)) : 0

  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    workspace: q('.field-workspace'),
    worldView: q('.world-view'),
    plate, photo, console: dock,
    cover: q('.site-closeup-cover'),
    visible,
    photoArea: Math.round(photoArea),
    visibleArea: Math.round(visibleArea),
    // The three ways a pixel of photograph is lost, each as a share of the whole
    // 16:9 frame the author composed.
    croppedPct: +(100 * (1 - visibleArea / photoArea)).toFixed(2),
    consoleOccludedPct: +(100 * consoleOverPhoto / photoArea).toFixed(2),
    chromeOccludedPct: +(100 * chromeOverPhoto / photoArea).toFixed(2),
    unseenPct: +(100 * (1 - (visibleArea - consoleOverPhoto) / photoArea)).toFixed(2),
    // The user's acceptance bar, as a containment test.
    photoFullyInsidePlate:
      photo.left >= plate.left - ${PHOTO_EPSILON_PX} && photo.right <= plate.right + ${PHOTO_EPSILON_PX} &&
      photo.top >= plate.top - ${PHOTO_EPSILON_PX} && photo.bottom <= plate.bottom + ${PHOTO_EPSILON_PX},
    photoClearOfConsole: dock ? photo.bottom <= dock.top + ${PHOTO_EPSILON_PX} : true,
    photoAspect: +(photo.width / photo.height).toFixed(4),
    chrome, marks, focal,
    marksUnderConsole: marks.filter((m) => m.onScreen && m.underConsole).map((m) => m.label),
    marksUnderChrome: marks.filter((m) => m.onScreen && m.underChrome.length).map((m) => m.label),
    marksOutsidePlate: marks.filter((m) => m.onScreen && !m.insidePlate).map((m) => m.label),
    chromeOverFocalCell: focal
      ? chrome.filter((c) => inter(c.rect, {
          left: focal.cell.left, right: focal.cell.right,
          top: focal.cell.top, bottom: focal.cell.bottom,
        }) > 0).map((c) => c.label)
      : [],
  }
})()`

// ── Composited ring contrast ────────────────────────────────────────────────
//
// Two real frames of the same layout, differenced. Frame A has the marks
// painted; frame B has them hidden with `visibility: hidden` (layout identical,
// nothing else repaints). Every pixel that changed is a pixel the mark painted;
// its contrast is measured against the SAME pixel of the plate underneath it.
// This is the only way to get a mark's real contrast: the marks are translucent
// currentColor rings over a photograph, so their declared colour is not the
// colour on screen and the plate band under them is different per site.

const HIDE_MARKS = (selectors) => `(async () => {
  window.__uwHidden = []
  for (const sel of ${JSON.stringify(selectors)}) {
    for (const el of document.querySelectorAll(sel)) {
      window.__uwHidden.push([el, el.style.visibility])
      el.style.visibility = 'hidden'
    }
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  return window.__uwHidden.length
})()`

const SHOW_MARKS = `(async () => {
  for (const [el, v] of (window.__uwHidden || [])) el.style.visibility = v
  window.__uwHidden = []
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  return true
})()`

// Decoded in-page on a canvas — the same route the contrast probe uses, so an
// oklch() colour is resolved to sRGB by the rendering pipeline and never by
// arithmetic on a string.
const DIFF = (withUrl, withoutUrl, boxes) => `(async () => {
  const load = async (u) => { const i = new Image(); i.src = u; await i.decode(); return i }
  const a = await load(${JSON.stringify(withUrl)})
  const b = await load(${JSON.stringify(withoutUrl)})
  const mk = (img) => {
    const c = document.createElement('canvas')
    c.width = img.naturalWidth; c.height = img.naturalHeight
    const x = c.getContext('2d', { willReadFrequently: true })
    x.drawImage(img, 0, 0)
    return { c, x }
  }
  const A = mk(a), B = mk(b)
  const lum = (r, g, bl) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl)
  }
  const ratio = (p, q) => (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05)
  const out = []
  for (const box of ${JSON.stringify(boxes)}) {
    // Pad by 2px: the mark's box-shadow scrim paints outside its border box, and
    // that scrim is half of what makes the mark findable.
    const x = Math.max(0, Math.round(box.rect.left) - 2)
    const y = Math.max(0, Math.round(box.rect.top) - 2)
    const w = Math.min(A.c.width - x, Math.round(box.rect.width) + 4)
    const h = Math.min(A.c.height - y, Math.round(box.rect.height) + 4)
    if (w < 2 || h < 2) { out.push({ label: box.label, sel: box.sel, painted: 0 }); continue }
    const da = A.x.getImageData(x, y, w, h).data
    const db = B.x.getImageData(x, y, w, h).data
    const px = []
    let maxDelta = 0
    for (let i = 0; i < da.length; i += 4) {
      // A pixel counts as "painted by the mark" when the two frames differ by
      // more than the encoder's own noise. PNG is lossless and both frames are
      // captured from a frozen layout, so any non-zero delta is real; 2/255 is
      // kept as the instrument-resolution guard (never report a difference
      // smaller than the instrument can resolve).
      const d = Math.abs(da[i] - db[i]) + Math.abs(da[i+1] - db[i+1]) + Math.abs(da[i+2] - db[i+2])
      if (d > maxDelta) maxDelta = d
      if (d <= 2) continue
      px.push({ d, r: ratio(lum(da[i], da[i+1], da[i+2]), lum(db[i], db[i+1], db[i+2])) })
    }
    const ratios = px.map((p) => p.r).sort((p, q) => p - q)
    const pct = (f) => (ratios.length ? +ratios[Math.min(ratios.length - 1, Math.floor(f * ratios.length))].toFixed(2) : null)

    // THE RING'S OWN CONTRAST, and why it is not simply a percentile over the
    // box. WCAG 1.4.11 measures ONE pair — the graphical object's colour
    // against the colour adjacent to it — and a mark's bounding box is mostly
    // not the mark. Two things dilute a naive percentile in opposite
    // directions: '.scene-zone-ring' carries a 1px backdrop blur, so
    // ~75% of the pixels inside its 62px disc "change" between the two frames
    // by an invisible amount and drag every percentile down; and a thin curved
    // stroke spends most of its pixels partially covered by antialiasing, so
    // its own edge is a gradient, not a colour.
    //
    // So: rank the painted pixels by HOW MUCH the mark changed them (which is
    // exactly how much of the mark's colour they carry), take the most-covered
    // 15% — the stroke core rather than its skirt or the blur — and report the
    // MEDIAN of that band. That is the mark's painted colour against the plate
    // directly beneath it, which is the pair the standard names.
    //
    // It is not a loophole: a mark that is uniformly faint (the dormant
    // credential door) has a faint top 15% too, and still scores ~1.0.
    px.sort((p, q) => q.d - p.d)
    const core = px.slice(0, Math.max(1, Math.ceil(px.length * 0.15))).map((p) => p.r).sort((p, q) => p - q)
    out.push({
      label: box.label, sel: box.sel, state: box.state ?? null,
      sampledPx: w * h, painted: ratios.length,
      maxChannelDelta: maxDelta,
      corePx: core.length,
      ringContrast: core.length ? +core[Math.floor(core.length / 2)].toFixed(2) : null,
      p50: pct(0.5), p90: pct(0.9), max: ratios.length ? +ratios[ratios.length - 1].toFixed(2) : null,
    })
  }
  return out
})()`

// ── One pass ────────────────────────────────────────────────────────────────

const MARK_SELECTORS = [
  '.site-closeup-zone', '.scene-zone-ring', '.crs-latch', '.crs-closure',
  '.crs-mirror-ring', '.crso-ring', '.asc-checkpoint', '.asc-credential',
  '.scr-drawer-glow', '.scr-aperture', '.scr-slip',
]

async function pass(site, width, height) {
  const tag = `${site.key} ${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()
  if (!(await enterSite(site.name))) throw new Error(`could not enter ${site.name}`)
  await site.midPhase()
  await sleep(420)

  const g = await evaluate(GEOMETRY)
  const key = `${site.key}@${width}`
  report.measurements[key] = g
  if (g.absent) {
    record(`[${tag}] the plate and its photograph are present`, false, g)
    return
  }

  // Frame A (marks painted) → frame B (marks hidden) → difference.
  const liveMarks = g.marks.filter((m) => m.onScreen && m.insidePlate && !m.underConsole)
  const withData = await shot(`${site.key}`, width, height)
  let contrast = []
  if (liveMarks.length) {
    await evaluate(HIDE_MARKS(MARK_SELECTORS))
    const { data: withoutData } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    contrast = await evaluate(
      DIFF(`data:image/png;base64,${withData}`, `data:image/png;base64,${withoutData}`, liveMarks),
    )
    await evaluate(SHOW_MARKS)
  }
  g.ringContrast = contrast

  console.log(`\n── ${tag}`)
  console.log(`   plate ${g.plate.width}x${g.plate.height}  photo ${g.photo.width}x${g.photo.height} (aspect ${g.photoAspect})  console ${g.console ? g.console.height.toFixed(0) + 'px' : 'none'}`)
  console.log(`   cropped ${g.croppedPct}%  under console ${g.consoleOccludedPct}%  under chrome ${g.chromeOccludedPct}%  → unseen ${g.unseenPct}%`)
  console.log(`   marks on screen ${g.marks.filter((m) => m.onScreen).length}  under console ${g.marksUnderConsole.length}  under chrome ${g.marksUnderChrome.length}  outside plate ${g.marksOutsidePlate.length}`)
  for (const c of contrast) {
    const kind = WAYFINDING.has(c.sel) ? 'way' : ATMOSPHERE.has(c.sel) ? 'atm' : '   '
    console.log(`   · [${kind}] ${c.label.padEnd(28)} ring ${String(c.ringContrast).padStart(5)}:1  (core ${String(c.corePx).padStart(4)}/${String(c.painted).padStart(5)}px  p90 ${c.p90}  max ${c.max})`)
  }

  if (BASELINE) return

  const letterboxed = width >= LETTERBOX_MIN_WIDTH && height >= LETTERBOX_MIN_HEIGHT
  const before = BEFORE[key]

  // ── CLAUSE 2 · marker visibility · EVERY WIDTH ────────────────────────────
  // The contrast defect is not width-specific — the live zone ring measured
  // 1.47 : 1 at 1280 too — so this floor binds everywhere, including the two
  // widths the letterbox deliberately leaves alone.
  const dim = contrast.filter(
    (c) => c.painted > 0 && WAYFINDING.has(c.sel) && (c.ringContrast ?? 0) < RING_CONTRAST_FLOOR,
  )
  record(`[${tag}] every wayfinding mark clears ${RING_CONTRAST_FLOOR}:1 against its own plate band`, dim.length === 0, {
    floor: RING_CONTRAST_FLOOR,
    offenders: dim.map((c) => ({ label: c.label, ringContrast: c.ringContrast, p90: c.p90, corePx: c.corePx })),
    measuredWayfinding: contrast.filter((c) => WAYFINDING.has(c.sel))
      .map((c) => ({ label: c.label, ringContrast: c.ringContrast })),
    atmosphereReportedOnly: contrast.filter((c) => ATMOSPHERE.has(c.sel))
      .map((c) => ({ label: c.label, ringContrast: c.ringContrast })),
  })
  // A mark that paints NOTHING is a different failure from a dim one, and the
  // difference frame is the only instrument that can tell them apart.
  const unpainted = contrast.filter((c) => c.painted === 0)
  record(`[${tag}] every mark counted as visible actually paints pixels`, unpainted.length === 0, {
    unpainted: unpainted.map((c) => c.label),
  })
  const sized = g.marks.filter((m) => m.onScreen && m.insidePlate && markFloor(m.sel) !== null)
  const tooSmall = sized.filter((m) => m.fractionOfPhotoWidth < markFloor(m.sel))
  record(`[${tag}] no mark is a smaller share of the photograph than it is at 1280`, tooSmall.length === 0, {
    offenders: tooSmall.map((m) => ({
      label: m.label, layoutPx: m.layoutPx, fraction: m.fractionOfPhotoWidth, floor: +markFloor(m.sel).toFixed(5),
    })),
    measured: sized.map((m) => ({ label: m.label, layoutPx: m.layoutPx, fraction: m.fractionOfPhotoWidth })),
  })
  record(`[${tag}] no on-screen mark is cropped out of the plate`, g.marksOutsidePlate.length === 0, {
    marks: g.marksOutsidePlate,
  })

  if (!letterboxed) {
    // ── THE TWO SHIPPED WIDTHS · no regression ──────────────────────────────
    // The letterbox is gated above 1280x800 on purpose (see the ULTRA-WIDE
    // block in styles.css). These widths therefore cannot be held to the
    // containment clauses — but they are still measured, against the numbers
    // this same probe recorded before the fix existed, so a wide change that
    // quietly moved a narrow layout fails HERE.
    if (before) {
      record(`[${tag}] the shipped width did not lose photograph`, g.unseenPct <= before.unseenPct + 0.5, {
        before: before.unseenPct, after: g.unseenPct,
      })
      record(`[${tag}] the shipped width did not push more marks under the console`,
        g.marksUnderConsole.length <= before.marksUnderConsole, {
          before: before.marksUnderConsole, after: g.marksUnderConsole.length, marks: g.marksUnderConsole,
        })
    } else {
      record(`[${tag}] a baseline exists for this un-letterboxed width`, false, { key })
    }
    return
  }

  // ── CLAUSE 1 · the full photograph · LETTERBOX WIDTHS ─────────────────────
  record(`[${tag}] the whole 16:9 photograph is inside the plate`, g.photoFullyInsidePlate, {
    photo: g.photo, plate: g.plate, croppedPct: g.croppedPct,
  })
  record(`[${tag}] the photograph is clear of the docked console`, g.photoClearOfConsole, {
    photoBottom: g.photo.bottom, consoleTop: g.console?.top ?? null,
    consoleOccludedPct: g.consoleOccludedPct,
  })
  record(`[${tag}] nothing at all of the photograph is unseen`, g.unseenPct <= 0.5, {
    croppedPct: g.croppedPct, consoleOccludedPct: g.consoleOccludedPct, unseenPct: g.unseenPct,
    before: BEFORE[key]?.unseenPct ?? 'not a shipped width',
  })
  // The reserved band is a structural guarantee, not a measurement that has to
  // keep being lucky: the console is capped, so it cannot grow into the frame.
  record(`[${tag}] the docked console stays inside its reserved band`,
    !g.console || g.console.height <= CONSOLE_BAND_PX + 0.5, {
      band: CONSOLE_BAND_PX, consoleHeight: g.console?.height ?? null,
    })

  // ── CLAUSE 3 · the occlusion rule ─────────────────────────────────────────
  record(`[${tag}] no on-screen mark sits under the docked console`, g.marksUnderConsole.length === 0, {
    marks: g.marksUnderConsole, consoleTop: g.console?.top ?? null,
  })
  record(`[${tag}] no on-screen mark sits under a chrome pill`, g.marksUnderChrome.length === 0, {
    marks: g.marksUnderChrome,
  })

  // ── CLAUSE 4 · chrome off the focal cell ──────────────────────────────────
  record(`[${tag}] no chrome pill intersects the authored focal cell`, g.chromeOverFocalCell.length === 0, {
    chrome: g.chromeOverFocalCell, focal: g.focal?.normalized ?? null,
  })
  // Every PILL the plate docks in a corner — the CASE FILE summon, its purpose
  // line, the LOCATION DETAIL summon and the concourse return — rides the gutter
  // on a letterboxed plate and touches no part of the frame.
  //
  // The return is asserted here rather than reported, and that is not a
  // formality: it is what caught the chrome reserve being sized from the 375px
  // layout's 156.8px return instead of the 178.2px one these widths actually
  // print, which left it 6px over the frame at Care ward 12.
  //
  // The plate CAPTION is the one exclusion, and it is a classification rather
  // than an exception: a caption is over its picture by design, it carries its
  // own measured scrim in the contrast probe, and at a location with no docked
  // console the frame fills the plate's full height so there is no gutter for it
  // to move to. It is printed at every run.
  const PILLS = new Set([
    'CASE FILE pill', 'CASE FILE purpose copy', 'LOCATION DETAIL summon',
    'spine LOCATION DETAIL summon', 'concourse return',
  ])
  const overPhoto = g.chrome.filter((c) => PILLS.has(c.label) && c.overPhotoPx > 0)
  record(`[${tag}] every chrome pill sits in the gutter, not on the photograph`, overPhoto.length === 0, {
    offenders: overPhoto.map((c) => ({ label: c.label, px: c.overPhotoPx, rect: c.rect })),
    captionReportedOnly: g.chrome.filter((c) => !PILLS.has(c.label) && c.overPhotoPx > 0)
      .map((c) => ({ label: c.label, px: c.overPhotoPx })),
    chromeOccludedPct: g.chromeOccludedPct,
  })
}

// ── The matrix ──────────────────────────────────────────────────────────────
//
// Two shipped widths kept in the run so a wide fix that regressed either fails
// HERE, plus the three the reporter's own machine covers.
const WIDTHS = [
  [375, 812],
  [1280, 800],
  [1512, 982],
  [1920, 1080],
  [2000, 1178],
]

for (const [w, h] of WIDTHS) {
  for (const site of SITES) {
    await pass(site, w, h)
  }
}

report.failures = failures
writeFileSync(join(OUT_DIR, `ultrawide-${LABEL}.json`), JSON.stringify(report, null, 2))
console.log(
  `\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'} — ${report.checks.length} checks, wrote ${OUT_DIR}ultrawide-${LABEL}.json`,
)
clearTimeout(killTimer)
chromeProcess.kill('SIGKILL')
process.exit(failures === 0 ? 0 : 1)

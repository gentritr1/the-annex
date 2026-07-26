// Evidence for Wave 2 round 3 — E1b, the inspector collapse (audit P1-D),
// driven against the real Vite app in headless Chrome over raw CDP.
//
// WHAT THIS HARNESS IS FOR
//
// The audit measured the inspector at 434x546 in close-read, carrying two
// sentences and ~450px of nothing, while the plate was squeezed to a letterbox
// strip. The collapse phase-gates that column down to a spine and gives the
// reclaimed width to the plate. Three things therefore have to be proved live,
// and this file proves them in this order:
//
//   1. GEOMETRY — the plate actually gains the width, per location, per width.
//   2. RETIREMENT WITH A HOME — every canonical string the collapsed column
//      stops printing is on the Location detail drawer, read out of the LIVE
//      DOM and compared string-for-string against the same location's EXPANDED
//      inspector, captured from the concourse moments earlier. The pure half of
//      the same claim is `src/game/siteRecordText.ts` + its unit suite; this is
//      the half that can catch the two disagreeing.
//   3. THE ALWAYS-MOUNTED RULE — in every state where the settled close read is
//      not carrying the interaction (concourse, travel, arriving, a room at its
//      terminal phase, a filed location, and every stacked width) the inspector
//      renders exactly as it did before, and exactly one instance of each
//      canonical control exists.
//
// Plus the standing obligations: a cross-zone sweep over every positioned
// control the round touches, keyboard-only completion of a whole location in the
// collapsed state with focus never reaching <body>, and reduced motion.
//
// Usage: node scripts/evidence-inspector-collapse.mjs [app-url]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://127.0.0.1:3000/'
const OUT_DIR = new URL('../evidence/inspector-collapse/', import.meta.url).pathname
mkdirSync(OUT_DIR, { recursive: true })

// The stylesheet's own numbers, restated so a drift fails HERE rather than in a
// screenshot nobody diffs. `.field-workspace--spine` sets the second column to
// 72px above 841px; SIDE_BY_SIDE_WORKSPACE_QUERY in Investigation.tsx is the
// same breakpoint. Both sides of it are exercised (1280 and 375).
const SPINE_COLUMN_PX = 72
// The measured pre-collapse geometry at 1280x800, from the same probe run
// against HEAD before any of this round's code existed. Quoted so the "after"
// numbers below are a comparison and not an assertion in a vacuum.
const BEFORE_1280 = {
  inspectorWidth: 342.8,
  plateWidth: 889.3,
  plateHeight: 476,
  sceneAboveConsole: {
    'registry-intake': 285.8,
    'maintenance-spine': 226.6,
    'small-archive': 255.7,
  },
}

const chromeProcess = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-spine-${Date.now()}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--mute-audio',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1280,800',
  'about:blank',
])

const killTimer = setTimeout(() => {
  console.error('GLOBAL TIMEOUT — aborting inspector-collapse evidence run')
  chromeProcess.kill('SIGKILL')
  process.exit(2)
}, 1500000)
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
        reject(new Error(
          `CDP timeout: ${method}${rendererCrashed ? ' (AFTER A RENDERER CRASH — that is the cause)' : ''}`,
        ))
      }
    }, 30000)
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

// A RECYCLABLE PAGE, and why. Extending the matrix to a third width — and a
// third width whose screenshots are 2.5x the pixels of 1280x800 — pushed a
// single long-lived page past what it could carry: the run died on a bare
// `CDP timeout: Runtime.evaluate` two thirds of the way in, at the same call,
// twice. Running the SAME width on its own passed 46/46, which is what proves
// it was capacity and not a defect at that width.
//
// A timeout is also the worst possible symptom, because it is what a renderer
// crash and a slow page look like from out here. So two things change: the page
// is replaced between widths, so nothing accumulates across a whole matrix; and
// a crash is now caught and named instead of arriving disguised as a timeout.
let targetId
let sessionId
const send = (method, params = {}) => raw(method, params, sessionId)

async function openPage() {
  if (targetId) await raw('Target.closeTarget', { targetId }).catch(() => undefined)
  const created = await raw('Target.createTarget', { url: 'about:blank' })
  targetId = created.targetId
  await raw('Target.activateTarget', { targetId })
  const attached = await raw('Target.attachToTarget', { targetId, flatten: true })
  sessionId = attached.sessionId
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Emulation.setFocusEmulationEnabled', { enabled: true })
}
await openPage()

let rendererCrashed = false
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (message.method === 'Inspector.targetCrashed' || message.method === 'Target.targetCrashed') {
    rendererCrashed = true
    console.error('!!! RENDERER CRASHED — every timeout after this line is a consequence, not a cause')
  }
})

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

const report = { url: APP_URL, capturedAt: new Date().toISOString(), node: process.version, before: BEFORE_1280, checks: [], shots: [], geometry: {} }
function record(step, pass, detail) {
  report.checks.push({ step, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${step}  ${JSON.stringify(detail)}`)
}

async function shot(name, width, height) {
  const { data } = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  })
  const file = join(OUT_DIR, `${name}-${width}x${height}.png`)
  writeFileSync(file, Buffer.from(data, 'base64'))
  report.shots.push(file)
  return file
}

async function mouseTo(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 })
}
// 'keyDown' (not 'rawKeyDown'): a rawKeyDown/keyUp pair leaves headless Chrome
// emitting a stream of trusted 'Unidentified' keydowns (recorded pilot scar).
async function pressKey(key, code, vk, text, modifiers = 0) {
  for (const type of ['keyDown', 'keyUp']) {
    await send('Input.dispatchKeyEvent', {
      type, key, code,
      windowsVirtualKeyCode: vk,
      nativeVirtualKeyCode: vk,
      modifiers,
      ...(type === 'keyDown' && text ? { text } : {}),
    })
  }
  await sleep(160)
}
const pressEnter = () => pressKey('Enter', 'Enter', 13, '\r')
const pressTab = (shift = false) => pressKey('Tab', 'Tab', 9, undefined, shift ? 8 : 0)
const pressEscape = () => pressKey('Escape', 'Escape', 27)

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
  await sleep(420)
}

async function enterSite(name) {
  const viaPortal = await click('.annex-world-portal', name)
  if (!viaPortal) await click('.site-switch', name)
  const ok = await waitFor(
    `document.querySelector('.world-view')?.dataset.transition === 'closeup'`,
    20000,
  )
  await sleep(560)
  return ok
}

async function backToConcourse() {
  await click('.world-return')
  await waitFor(`document.querySelector('.world-view')?.dataset.transition === 'concourse'`, 8000)
  await sleep(320)
}

// ── Probes ──────────────────────────────────────────────────────────────────

const GEOMETRY = `(() => {
  const r = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const b = el.getBoundingClientRect()
    return { top: +b.top.toFixed(1), left: +b.left.toFixed(1), width: +b.width.toFixed(1), height: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1), right: +b.right.toFixed(1) }
  }
  const plate = r('.site-closeup-stage')
  const dock = r('.room-console')
  const inspector = r('.site-inspector')
  return {
    transition: document.querySelector('.world-view')?.dataset.transition ?? null,
    workspace: r('.field-workspace'),
    worldView: r('.world-view'),
    plate,
    console: dock,
    inspector,
    spinePresent: !!document.querySelector('.site-inspector--spine'),
    workspaceSpineClass: !!document.querySelector('.field-workspace--spine'),
    // The audit's own metric: how much photograph is left above the docked
    // console. Reported as a HEIGHT (the rooms round's number) and as an AREA,
    // because this round's gain is horizontal — a height alone would report a
    // 30% wider photograph as "unchanged".
    sceneAboveConsoleHeight: plate && dock ? +(dock.top - plate.top).toFixed(1) : null,
    sceneAboveConsoleArea: plate && dock ? Math.round(plate.width * (dock.top - plate.top)) : null,
    plateArea: plate ? Math.round(plate.width * plate.height) : null,
    inspectorTextLength: (document.querySelector('.site-inspector')?.innerText ?? '').replace(/\\s+/g, ' ').trim().length,
    pageScrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  }
})()`

// Every canonical string the inspector is printing for the selected location,
// read out of NAMED nodes rather than innerText: a raw text scrape would drag in
// phase chrome ("Choose one method." vs "Choose one method in the room.") and
// the armed-state suffixes ChoiceButton appends, and a containment test over
// that noise proves nothing about the prose.
const INSPECTOR_PROSE = `(() => {
  const insp = document.querySelector('.site-inspector')
  if (!insp) return null
  const t = (el) => (el?.textContent ?? '').replace(/\\s+/g, ' ').trim()
  return {
    heading: t(insp.querySelector('.site-header h2')),
    index: t(insp.querySelector('.site-index')),
    status: t(insp.querySelector('.site-state')),
    description: t(insp.querySelector('.site-description')),
    costNote: t(insp.querySelector('.site-cost-note')),
    prompt: t(insp.querySelector('.site-action-prompt')),
    sceneFirstNotes: insp.querySelectorAll('.scene-first-note').length,
    methods: [...insp.querySelectorAll('.site-actions .choice-row')].map((row) => ({
      label: t(row.querySelector('.choice-method')),
      title: t(row.querySelector('.choice-body strong')),
      description: t(row.querySelector('.choice-body > span')),
      consequence: t(row.querySelector('.choice-body small')),
    })),
    filedCard: t(insp.querySelector('.resolved-action')),
  }
})()`

const DRAWER_TEXT = `(() => {
  const d = document.querySelector('.scene-detail-drawer')
  if (!d) return null
  return {
    text: d.textContent.replace(/\\s+/g, ' ').trim(),
    standingNote: (d.querySelector('.scene-detail-standing-note')?.textContent ?? '').replace(/\\s+/g, ' ').trim(),
    description: (d.querySelector('.scene-detail-description')?.textContent ?? '').replace(/\\s+/g, ' ').trim(),
    methodArticles: d.querySelectorAll('.scene-detail-method').length,
    modal: d.getAttribute('aria-modal'),
  }
})()`

// One instance of every canonical control, wherever it currently lives.
const CENSUS = `(() => ({
  detailSummons: document.querySelectorAll('.scene-detail-summon').length,
  summonsOnPlate: document.querySelectorAll('.scene-summons .scene-detail-summon').length,
  summonsInSpine: document.querySelectorAll('.site-inspector--spine .scene-detail-summon').length,
  caseFileSummons: document.querySelectorAll('.casefile-summon').length,
  worldReturns: document.querySelectorAll('.world-return').length,
  roomConsoles: document.querySelectorAll('.room-console').length,
  roomInstances: document.querySelectorAll('.classification-room, .acoustic-shadow-room, .custody-rail-room').length,
  consoleSlots: document.querySelectorAll('.room-console-slot').length,
  slotChildren: [...document.querySelectorAll('.room-console-slot')].reduce((n, s) => n + s.children.length, 0),
  zoneButtons: document.querySelectorAll('.scene-zone button').length,
  inspectorChoiceRows: document.querySelectorAll('.site-inspector .choice-row').length,
  anyChoiceRows: document.querySelectorAll('.choice-row').length,
  ariaModals: document.querySelectorAll('[aria-modal="true"]').length,
  headingIdResolves: (() => {
    const s = document.querySelector('.site-inspector')
    const id = s?.getAttribute('aria-labelledby')
    return !!id && !!document.getElementById(id)
  })(),
}))()`

const activeInfo = () =>
  evaluate(`(() => {
    const el = document.activeElement
    return {
      tag: el?.tagName ?? null,
      cls: (el?.className && typeof el.className === 'string' ? el.className : '').slice(0, 70),
      text: (el?.textContent ?? '').replace(/\\s+/g, ' ').trim().slice(0, 60),
      isBody: el === document.body,
    }
  })()`)

// Positioned-control sweep with transitions killed and raw-float intersection
// (the 0.5px epsilon is the recorded threshold-vs-jitter rule: never report an
// overlap smaller than the instrument's own resolution).
const SWEEP = `(async () => {
  const style = document.createElement('style')
  style.id = '__sweep'
  style.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }'
  document.head.appendChild(style)
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const SELECTORS = [
    ['.scene-summons .casefile-summon', 'case-file summon'],
    ['.scene-summons .scene-detail-summon', 'plate detail summon'],
    ['.site-spine-summon', 'spine detail summon'],
    ['.world-return', 'concourse return'],
    ['.scene-zone button', 'plate zone'],
    ['.room-console button:not([disabled])', 'docked console control'],
  ]
  const controls = []
  for (const [sel, label] of SELECTORS) {
    document.querySelectorAll(sel).forEach((el, i) => {
      // A ZONE IS ITS RING, NOT ITS CAPTION BOX. The caption is
      // pointer-events:none and the interactive region is the button's
      // ::before pseudo-element centred on the ring (styles.css: ".scene-zone
      // .choice-row::before"), so the button's own border box is the wrong
      // instrument in both directions: it under-reports the target (a 250x194
      // caption box whose live area is a 62px disc) and it manufactures overlaps
      // — at 375 the two captions are 300px wide by design, because only one is
      // ever revealed at a time. Measuring the ring measures what a player can
      // actually hit.
      const region =
        sel === '.scene-zone button'
          ? el.parentElement?.querySelector('.scene-zone-ring') ?? el
          : el
      const b = region.getBoundingClientRect()
      if (b.width < 1 || b.height < 1) return
      controls.push({ label: label + (i ? ' #' + (i + 1) : ''), sel, el, region, rect: b })
    })
  }
  const hits = controls.map((c) => {
    const cx = c.rect.left + c.rect.width / 2
    const cy = c.rect.top + c.rect.height / 2
    const hit = document.elementFromPoint(cx, cy)
    const owner = hit ? (hit === c.el || c.el.contains(hit) || hit.contains(c.el) ? 'self' : (hit.className && typeof hit.className === 'string' ? hit.className : hit.tagName)) : 'none'
    return { label: c.label, x: Math.round(cx), y: Math.round(cy), owner, w: +c.rect.width.toFixed(1), h: +c.rect.height.toFixed(1) }
  })
  const overlaps = []
  for (let i = 0; i < controls.length; i += 1) {
    for (let j = i + 1; j < controls.length; j += 1) {
      const a = controls[i].rect, b = controls[j].rect
      // Raw floats with a 0.5px epsilon — rounding each edge to an integer
      // manufactures phantom overlaps on a tiled grid (recorded round-2 scar).
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left)
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      if (ox > 0.5 && oy > 0.5) overlaps.push({ a: controls[i].label, b: controls[j].label, ox: +ox.toFixed(1), oy: +oy.toFixed(1) })
    }
  }
  const targets = controls.map((c) => ({ label: c.label, w: +c.rect.width.toFixed(1), h: +c.rect.height.toFixed(1) }))
  style.remove()
  return { hits, overlaps, targets, count: controls.length }
})()`

// How many zone captions are revealed right now. The caption is clipped, never
// faded, so the state is read from clip-path with transitions killed.
const OPEN_CAPTIONS = `(async () => {
  const style = document.createElement('style')
  style.textContent = '.scene-zone *, .scene-zone { transition: none !important; }'
  document.head.appendChild(style)
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const open = [...document.querySelectorAll('.scene-zone .choice-body')].filter((el) => {
    const clip = getComputedStyle(el).clipPath
    return !/100%\\)?$/.test(clip) && clip !== 'inset(0px 0px 100% 0px)'
  }).length
  style.remove()
  return open
})()`

// ── The four locations, and what carries their interaction in close read ────

const SITES = [
  { key: 'registry-intake', name: 'Registry intake', carrier: 'console', root: '.custody-rail-room' },
  { key: 'care-ward', name: 'Care ward 12', carrier: 'zones', root: null },
  { key: 'maintenance-spine', name: 'Maintenance spine', carrier: 'console', root: '.acoustic-shadow-room' },
  { key: 'small-archive', name: 'Small Archive', carrier: 'console', root: '.classification-room' },
]

// ── Pass 1 · geometry + retirement + equivalence, per location, per width ───

async function collapsePass(site, width, height) {
  const tag = `${site.key} ${width}x${height}`
  const wide = width >= 841
  await setViewport(width, height)
  await bootFreshRun()

  // A: the EXPANDED inspector for this exact location, read from the concourse —
  // the same state, the same selection, the column at full width. This is the
  // "before" half of the equivalence, captured in the same run rather than
  // quoted from another one.
  await enterSite(site.name)
  await backToConcourse()
  const expanded = await evaluate(INSPECTOR_PROSE)
  const expandedGeometry = await evaluate(GEOMETRY)
  record(`[${tag}] off the close read the inspector is expanded and printing its prose`, Boolean(
    expanded && expanded.description.length > 20 && expandedGeometry.spinePresent === false,
  ), { description: expanded?.description?.slice(0, 40), spine: expandedGeometry.spinePresent })

  // B: the collapsed (or, at 375, unchanged) state.
  await enterSite(site.name)
  const collapsed = await evaluate(GEOMETRY)
  const prose = await evaluate(INSPECTOR_PROSE)
  const census = await evaluate(CENSUS)
  report.geometry[`${site.key}@${width}`] = collapsed
  await shot(`01-${site.key}-close-read`, width, height)

  if (wide) {
    record(`[${tag}] the column collapses to the 72px spine and the plate takes the width`, Boolean(
      collapsed.spinePresent === true &&
        collapsed.workspaceSpineClass === true &&
        Math.abs(collapsed.inspector.width - SPINE_COLUMN_PX) <= 0.5 &&
        collapsed.plate.width >= 1150 &&
        collapsed.plate.width > BEFORE_1280.plateWidth,
    ), {
      inspectorWidth: collapsed.inspector.width,
      plateWidth: collapsed.plate?.width,
      wasPlateWidth: BEFORE_1280.plateWidth,
      wasInspectorWidth: BEFORE_1280.inspectorWidth,
      plateArea: collapsed.plateArea,
    })

    record(`[${tag}] the spine keeps identity and status, and retires the prose`, Boolean(
      prose.heading === expanded.heading &&
        prose.index === expanded.index &&
        prose.status === expanded.status &&
        prose.description === '' &&
        prose.costNote === '' &&
        prose.prompt === '' &&
        prose.sceneFirstNotes === 0 &&
        prose.methods.length === 0 &&
        census.headingIdResolves === true,
    ), { ...prose, methods: prose.methods.length, headingIdResolves: census.headingIdResolves })

    record(`[${tag}] exactly one summon to the full text, in exactly one place`, Boolean(
      census.detailSummons === 1 &&
        (site.carrier === 'console'
          ? census.summonsInSpine === 1 && census.summonsOnPlate === 0
          : census.summonsOnPlate === 1 && census.summonsInSpine === 0) &&
        census.caseFileSummons === 1 &&
        census.worldReturns === 1,
    ), census)

    // C: the equivalence, live. Every string the collapse retired must be on the
    // drawer, character for character.
    const opened = await click('.scene-detail-summon')
    await sleep(650)
    const drawer = await evaluate(DRAWER_TEXT)
    const censusOpen = await evaluate(CENSUS)
    await shot(`02-${site.key}-drawer-over-spine`, width, height)
    const missing = []
    if (!drawer) missing.push('NO DRAWER')
    else {
      if (drawer.description !== expanded.description) missing.push('description')
      if (expanded.costNote && drawer.standingNote !== expanded.costNote) missing.push('cost note')
      for (const method of expanded.methods) {
        for (const [field, value] of Object.entries(method)) {
          if (value && !drawer.text.includes(value)) missing.push(`${field}: ${value.slice(0, 30)}`)
        }
      }
    }
    record(`[${tag}] every retired string is on the Location detail drawer`, Boolean(
      opened && drawer && missing.length === 0 && censusOpen.ariaModals === 1,
    ), { opened, missing, methodsCompared: expanded.methods.length, standingNote: drawer?.standingNote?.slice(0, 46) ?? null, ariaModals: censusOpen.ariaModals })

    await click('.scene-detail-close')
    await sleep(400)
  } else {
    record(`[${tag}] the stacked layout does not collapse — nothing is retired`, Boolean(
      collapsed.spinePresent === false &&
        collapsed.workspaceSpineClass === false &&
        prose.description === expanded.description &&
        prose.heading === expanded.heading &&
        collapsed.inspector.width > 300,
    ), {
      spine: collapsed.spinePresent,
      inspectorWidth: collapsed.inspector.width,
      descriptionMatches: prose.description === expanded.description,
      plateWidth: collapsed.plate?.width,
    })
  }

  // The room's own console: docked over the plate, one instance, and the slot it
  // came from still exists and is empty (the un-collapse has to have somewhere
  // to put it back).
  if (site.carrier === 'console') {
    record(`[${tag}] the console is docked, single, and its slot is present and empty`, Boolean(
      census.roomInstances === 1 &&
        census.roomConsoles === 1 &&
        census.consoleSlots === 1 &&
        census.slotChildren === 0 &&
        census.inspectorChoiceRows === 0,
    ), census)
  } else {
    record(`[${tag}] the plate carries both methods, once each, and the column none`, Boolean(
      census.zoneButtons === 2 &&
        census.anyChoiceRows === 2 &&
        census.inspectorChoiceRows === 0,
    ), census)
  }
}

// ── Pass 2 · the always-mounted rule, sampled through a whole entry ─────────

async function alwaysMountedPass(width, height) {
  const tag = `always-mounted ${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()

  // Sample the transition state and the spine TOGETHER, continuously, through a
  // full travel → arriving → closeup entry. The claim is not "the spine is
  // absent at the concourse"; it is that the spine never exists in any state but
  // a settled close read whose plate is carrying the interaction.
  await click('.annex-world-portal', 'Registry intake')
  const samples = []
  for (let i = 0; i < 40; i += 1) {
    samples.push(
      await evaluate(`(() => ({
        t: document.querySelector('.world-view')?.dataset.transition ?? null,
        spine: !!document.querySelector('.site-inspector--spine'),
        description: !!document.querySelector('.site-description'),
        rooms: document.querySelectorAll('.classification-room, .acoustic-shadow-room, .custody-rail-room').length,
      }))()`),
    )
    if (samples.length > 6 && samples[samples.length - 1].t === 'closeup' && samples[samples.length - 1].spine) break
    await sleep(70)
  }
  const badSpine = samples.filter((s) => s.spine && s.t !== 'closeup')
  const proseWhileTravelling = samples.filter((s) => s.t !== 'closeup' && !s.description)
  const roomDuplicated = samples.filter((s) => s.rooms !== 1)
  record(`[${tag}] no sample shows a spine outside a settled close read`, Boolean(
    samples.length >= 6 && badSpine.length === 0,
  ), { samples: samples.length, states: [...new Set(samples.map((s) => s.t))], badSpine: badSpine.length })
  record(`[${tag}] the description is on screen at every non-closeup sample`, Boolean(
    proseWhileTravelling.length === 0,
  ), { checked: samples.filter((s) => s.t !== 'closeup').length, missing: proseWhileTravelling.length })
  record(`[${tag}] exactly one room console instance at every sample`, Boolean(
    roomDuplicated.length === 0,
  ), { samples: samples.length, wrong: roomDuplicated.length })

  // A room at its TERMINAL phase: the console has come back to the inspector and
  // is printing the room's own unlock line, so the column is NOT empty and must
  // not collapse.
  await waitFor(`document.querySelector('.world-view')?.dataset.transition === 'closeup'`)
  await sleep(500)
  for (let i = 0; i < 4; i += 1) {
    const seated = await evaluate(`(() => {
      const open = [...document.querySelectorAll('.cr-carrier')].find((b) => !b.disabled)
      if (!open) return false
      open.click(); return true })()`)
    if (!seated) break
    await sleep(220)
  }
  await click('.cr-late-carrier')
  await sleep(260)
  await click('.cr-mirror')
  await sleep(260)
  await click('.cr-proceed')
  await sleep(600)
  const terminal = await evaluate(GEOMETRY)
  const terminalCensus = await evaluate(CENSUS)
  const terminalProse = await evaluate(INSPECTOR_PROSE)
  const unlockLine = await evaluate(
    `(document.querySelector('.cr-unlock')?.textContent ?? '').replace(/\\s+/g, ' ').trim()`,
  )
  await shot(`03-terminal-phase-no-collapse`, width, height)
  record(`[${tag}] a room at its terminal phase does NOT collapse — the console is back in the column`, Boolean(
    terminalCensus.zoneButtons === 2 &&
      terminal.spinePresent === false &&
      terminalProse.description.length > 20 &&
      terminalCensus.roomConsoles === 0 &&
      terminalCensus.slotChildren === 1 &&
      unlockLine.length > 10,
  ), { spine: terminal.spinePresent, zones: terminalCensus.zoneButtons, slotChildren: terminalCensus.slotChildren, unlockLine: unlockLine.slice(0, 44) })

  // A FILED location: the resolved card is the column's real content.
  await evaluate(`(() => { const b = document.querySelectorAll('.scene-zone button')[0]; if (!b) return false; b.click(); return true })()`)
  await sleep(320)
  await evaluate(`(() => { const b = document.querySelectorAll('.scene-zone button')[0]; if (!b) return false; b.click(); return true })()`)
  await waitFor(`!!document.querySelector('.scene-beat')`, 9000)
  await sleep(400)
  await click('.scene-beat-advance')
  await sleep(700)
  if (await evaluate(`!!document.querySelector('.scene-result-dismiss')`)) {
    await click('.scene-result-dismiss')
    await sleep(500)
  }
  const filed = await evaluate(GEOMETRY)
  const filedProse = await evaluate(INSPECTOR_PROSE)
  await shot(`04-filed-location-no-collapse`, width, height)
  record(`[${tag}] a filed location does NOT collapse — its resolved card stays in the column`, Boolean(
    filed.spinePresent === false &&
      filedProse.filedCard.length > 40 &&
      filedProse.description.length > 20,
  ), { spine: filed.spinePresent, filedCardChars: filedProse.filedCard.length, inspectorWidth: filed.inspector.width })
}

// ── Pass 3 · the cross-zone sweep over every positioned control ─────────────

async function sweepPass(siteName, key, width, height) {
  const tag = `sweep ${key} ${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()
  await enterSite(siteName)
  const sweep = await evaluate(SWEEP)
  const strays = sweep.hits.filter((h) => h.owner !== 'self')
  const small = sweep.targets.filter((t) => t.w < 44 || t.h < 44)
  await shot(`05-sweep-${key}`, width, height)
  record(`[${tag}] every control's own centre resolves to itself`, Boolean(
    sweep.count >= 2 && strays.length === 0,
  ), { count: sweep.count, strays, labels: sweep.hits.map((h) => h.label) })
  record(`[${tag}] no two controls' boxes intersect past the 0.5px epsilon`,
    sweep.overlaps.length === 0, sweep.overlaps)
  record(`[${tag}] every swept control is at least 44x44`, small.length === 0, sweep.targets)

  // Split hover/focus: the pointer on one control, the keyboard on another, and
  // still at most one caption open.
  const zones = sweep.hits.filter((h) => h.label.startsWith('plate zone'))
  const rail = sweep.hits.find((h) => h.label.includes('detail summon'))
  if (rail) {
    await mouseTo(rail.x, rail.y)
    await sleep(420)
    const openOverRail = await evaluate(OPEN_CAPTIONS)
    record(`[${tag}] the pointer on the summon opens no plate caption`, openOverRail === 0, { openOverRail })
  }
  if (zones.length >= 1) {
    await mouseTo(zones[0].x, zones[0].y)
    await sleep(420)
    const openOnZone = await evaluate(OPEN_CAPTIONS)
    // …and now put the KEYBOARD on the other control while the pointer stays put.
    await evaluate(`document.querySelector('.scene-detail-summon')?.focus()`)
    await sleep(320)
    const openSplit = await evaluate(OPEN_CAPTIONS)
    const focusHeld = await evaluate(
      `document.activeElement?.classList?.contains('scene-detail-summon') === true`,
    )
    await shot(`06-sweep-${key}-split-focus`, width, height)
    record(`[${tag}] hovering a zone opens exactly one caption, and a split focus does not open a second`, Boolean(
      openOnZone === 1 && openSplit <= 1 && focusHeld,
    ), { openOnZone, openSplit, focusHeld })
  }
}

// ── Pass 4 · keyboard-only, a whole location, in the collapsed state ────────

async function keyboardPass(width, height) {
  const tag = `keyboard ${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()
  await enterSite('Registry intake')
  const transcript = []
  // TWO DIFFERENT THINGS ARE BOTH "focus is on <body>", and conflating them
  // makes this instrument useless. The recorded pilot scar is focus falling to
  // <body> because the control holding it UNMOUNTED (the beat's advance control
  // at settle). The other is the browser's own tab cycle: past the last
  // focusable in the document, focus passes through the document root before
  // wrapping to the first — in headless there is no browser chrome to hold it,
  // so it is observable as a <body> sample followed immediately by the skip
  // link. The first is a defect; the second is the platform. Both are counted;
  // only the first is asserted to be zero, and each wrap is PROVED to be a wrap
  // by the entry that follows it rather than merely excused.
  async function note(step, kind = 'tab') {
    const info = await activeInfo()
    transcript.push({ step, kind, ...info })
    return info
  }
  const focusVerdict = () => {
    const drops = transcript
      .map((entry, i) => ({ i, entry, next: transcript[i + 1] }))
      .filter(({ entry }) => entry.isBody)
    return {
      total: drops.length,
      afterActivation: drops.filter(({ entry }) => entry.kind === 'activate').length,
      unexplained: drops.filter(
        ({ entry, next }) => entry.kind !== 'tab' || !next || !next.cls.includes('skip-link'),
      ).length,
      wraps: drops.filter(({ next }) => next && next.cls.includes('skip-link')).length,
    }
  }

  // The spine's summon has to be reachable by Tab alone — it is the only route
  // to the retired prose for a keyboard player in this state.
  let reachedSummon = false
  for (let i = 0; i < 40; i += 1) {
    await pressTab()
    await note(`Tab ${i + 1}`)
    if (await evaluate(`document.activeElement?.classList?.contains('site-spine-summon') === true`)) {
      reachedSummon = true
      break
    }
  }
  record(`[${tag}] Tab alone reaches the spine's summon`, reachedSummon, transcript.at(-1) ?? null)

  await pressEnter()
  await sleep(650)
  const drawerOpen = await evaluate(
    `!!document.querySelector('.scene-detail-drawer') && document.activeElement?.closest('.scene-detail-drawer') !== null`,
  )
  await note('Enter (open the drawer)', 'activate')
  await shot(`07-keyboard-drawer-from-spine`, width, height)
  await pressEscape()
  await sleep(500)
  const returned = await note('Escape (close the drawer)', 'activate')
  record(`[${tag}] Enter opens the drawer, Escape returns focus to the summon`, Boolean(
    drawerOpen && returned.cls.includes('site-spine-summon'),
  ), { drawerOpen, returned })

  // The ritual, keyboard only, against the DOCKED console.
  let reachedConsole = false
  for (let i = 0; i < 30; i += 1) {
    await pressTab()
    await note(`Tab to console ${i + 1}`)
    if (await evaluate(`!!document.activeElement?.closest('.room-console')`)) {
      reachedConsole = true
      break
    }
  }
  record(`[${tag}] Tab alone reaches the docked console from the spine`, reachedConsole, transcript.at(-1) ?? null)

  for (let i = 0; i < 60; i += 1) {
    if (await evaluate(`!!document.querySelector('.scene-zone button')`)) break
    const actionable = await evaluate(
      `!!document.activeElement?.closest('.room-console') && document.activeElement?.tagName === 'BUTTON' && !document.activeElement.disabled`,
    )
    if (actionable) await pressEnter()
    else await pressTab()
    // Sampled after every step, and labelled by what caused it: an Enter that
    // advanced the ritual is an ACTIVATION, and focus landing on <body> after
    // one is the recorded scar, not a tab wrap.
    await note(`ritual ${i}`, actionable ? 'activate' : 'tab')
  }
  const unlocked = await evaluate(`(() => ({
    zones: document.querySelectorAll('.scene-zone button').length,
    onZone: !!document.activeElement?.closest('.scene-zone'),
    spine: !!document.querySelector('.site-inspector--spine'),
  }))()`)
  await note('unlock', 'activate')
  record(`[${tag}] the ritual completes keyboard-only and hands the route to a plate zone`, Boolean(
    unlocked.zones === 2 && unlocked.onZone,
  ), unlocked)

  await pressEnter()
  const armed = await evaluate(`document.activeElement?.getAttribute('aria-pressed')`)
  await pressEnter()
  await sleep(900)
  await note('commit', 'activate')
  for (let i = 0; i < 14; i += 1) {
    if (await evaluate(`!!document.querySelector('.scene-result')`)) break
    await pressEnter()
    await sleep(260)
  }
  for (let i = 0; i < 12; i += 1) {
    if (await evaluate(`document.activeElement?.classList?.contains('scene-result-dismiss') === true`)) break
    await pressTab()
    await note('reach the strip')
  }
  await pressEnter()
  await sleep(600)
  const landed = await note('Enter (close the record)', 'activate')
  await shot(`08-keyboard-filed`, width, height)
  const filedNow = await evaluate(`!!document.querySelector('.resolved-action')`)
  record(`[${tag}] Enter arms, Enter files, the beat and the strip are reachable by key`, Boolean(
    armed === 'true' && filedNow,
  ), { armed, filedNow })

  // Then the filed location's own detail drawer, still keyboard only.
  let reachedFiledSummon = false
  for (let i = 0; i < 40; i += 1) {
    if (await evaluate(`document.activeElement?.classList?.contains('scene-detail-summon') === true`)) {
      reachedFiledSummon = true
      break
    }
    await pressTab()
    await note(`Tab to filed summon ${i + 1}`)
  }
  await pressEnter()
  await sleep(650)
  const filedDrawer = await evaluate(DRAWER_TEXT)
  await note('Enter (filed drawer)', 'activate')
  record(`[${tag}] the filed location's drawer is reachable and carries its record`, Boolean(
    reachedFiledSummon && filedDrawer && filedDrawer.methodArticles === 2,
  ), { reachedFiledSummon, methodArticles: filedDrawer?.methodArticles ?? null })
  await pressEscape()
  await sleep(400)
  await note('Escape', 'activate')

  const focus = focusVerdict()
  record(`[${tag}] focus never fell to <body> after an activation, and every <body> sample is a proved tab wrap`, Boolean(
    focus.afterActivation === 0 && focus.unexplained === 0,
  ), { steps: transcript.length, ...focus })
  report.keyboardTranscript = transcript
}

// ── Pass 5 · reduced motion ────────────────────────────────────────────────

async function reducedMotionPass(width, height) {
  const tag = `reduced motion ${width}x${height}`
  await setViewport(width, height)
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  await bootFreshRun()
  await enterSite('Registry intake')
  const state = await evaluate(GEOMETRY)
  const motion = await evaluate(`(() => {
    const els = ['.site-inspector--spine', '.site-header--spine', '.site-spine-summon', '.field-workspace--spine']
      .map((s) => document.querySelector(s)).filter(Boolean)
    return els.map((el) => {
      const cs = getComputedStyle(el)
      return {
        cls: el.className.slice(0, 40),
        transitionMs: Math.max(...cs.transitionDuration.split(',').map((v) => parseFloat(v) * (v.includes('ms') ? 1 : 1000) || 0)),
        animation: cs.animationName,
      }
    })
  })()`)
  await shot(`09-reduced-motion-spine`, width, height)
  // A 1ms floor, not zero: the app's own reduced-motion contract is
  // `transition-duration: 0.01ms !important`, and comparing against 0 fails a
  // correctly-reduced surface (the recorded round-2 instrument scar).
  record(`[${tag}] the spine collapses with nothing animating past 1ms`, Boolean(
    state.spinePresent === true &&
      motion.length >= 3 &&
      motion.every((m) => m.transitionMs <= 1 && m.animation === 'none'),
  ), { spine: state.spinePresent, motion })
  await send('Emulation.setEmulatedMedia', { features: [] })
}

// ── Run ─────────────────────────────────────────────────────────────────────

// THE MATRIX, EXTENDED (ultra-wide round). 1920x1080 is added to the standing
// set and every clause above runs at it unchanged — none was relaxed to let it
// in, and the two shipped widths keep every clause they had.
//
// It is added HERE, and not only to the round's own probe, because this is the
// harness that owns the cross-zone sweep and the keyboard walk. The ultra-wide
// letterbox moves a positioned-control surface (the summons row stacks, and the
// photograph no longer fills the plate), and a control-pair interference is
// exactly the class of defect the recorded cross-zone scar says per-zone
// verification is blind to. A sweep at 1280 and 375 cannot see a collision that
// only exists at a width where the frame is inset from the plate.
//
// 1080 is above the letterbox's 977px height gate, so this run exercises the
// letterboxed geometry rather than a wider copy of the shipped one.
const WIDTH_FILTER = process.env.ONLY_WIDTH ? Number(process.env.ONLY_WIDTH) : null
let widthIndex = 0
for (const [w, h] of [[1280, 800], [1920, 1080], [375, 812]]) {
  if (WIDTH_FILTER && w !== WIDTH_FILTER) continue
  // Fresh page per width (see openPage). Not before the first one — that page
  // is already fresh, and closing it would only cost a round trip.
  if (widthIndex > 0) await openPage()
  widthIndex += 1
  for (const site of SITES) await collapsePass(site, w, h)
  await alwaysMountedPass(w, h)
  await sweepPass('Care ward 12', 'care-ward', w, h)
  await sweepPass('Registry intake', 'registry-intake', w, h)
  if (w >= 841) {
    await keyboardPass(w, h)
    await reducedMotionPass(w, h)
  }
}

// The measurements table the report quotes, computed once from the geometry map.
report.plateTable = SITES.map((site) => {
  const after = report.geometry[`${site.key}@1280`]
  const before = BEFORE_1280.sceneAboveConsole[site.key] ?? null
  return {
    site: site.key,
    plateWidthBefore: BEFORE_1280.plateWidth,
    plateWidthAfter: after?.plate?.width ?? null,
    plateAreaBefore: Math.round(BEFORE_1280.plateWidth * BEFORE_1280.plateHeight),
    plateAreaAfter: after?.plateArea ?? null,
    sceneAboveConsoleBefore: before,
    sceneAboveConsoleAfter: after?.sceneAboveConsoleHeight ?? null,
    sceneAboveConsoleAreaBefore: before === null ? null : Math.round(BEFORE_1280.plateWidth * before),
    sceneAboveConsoleAreaAfter: after?.sceneAboveConsoleArea ?? null,
    inspectorWidthBefore: BEFORE_1280.inspectorWidth,
    inspectorWidthAfter: after?.inspector?.width ?? null,
  }
})

report.rendererCrashed = rendererCrashed
const passed = report.checks.filter((c) => c.pass).length
const failed = report.checks.length - passed + (rendererCrashed ? 1 : 0)
writeFileSync(join(OUT_DIR, 'measurements.json'), JSON.stringify(report, null, 2))
console.log(`\n${passed}/${report.checks.length} checks passed · ${report.shots.length} screenshots → ${OUT_DIR}`)
console.table(report.plateTable)
clearTimeout(killTimer)
chromeProcess.kill('SIGKILL')
process.exit(failed === 0 ? 0 : 1)

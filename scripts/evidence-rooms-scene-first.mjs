// Evidence for steps 6 and 7 of docs/scene-first-integration-plan.md, driven
// against the real Vite app in headless Chrome over raw CDP.
//
// Step 6 — the three close-read rooms join the scene-first grammar: the room's
// DOM console docks OVER the plate while the settled close read is on screen,
// returns to the inspector whenever it is not, and the room's TERMINAL method
// choice becomes real ChoiceButtons at the plate's authored anchors, followed by
// the staged beat and the result strip.
//
// Step 7 — the deposition's staged text and its commit strip read as one family
// with the scene beat, verified live in Case 81 (seeded save).
//
// Every pass asserts EXACTLY ONE instance of each control at any moment, re-runs
// the ritual keyboard-only, re-enters each site twice (opacity-strand scar), and
// reloads mid-ritual.
//
// Usage: node scripts/evidence-rooms-scene-first.mjs [app-url]
//        PASS=small-archive node scripts/evidence-rooms-scene-first.mjs
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://127.0.0.1:3000/'
const OUT_DIR = new URL('../evidence/rooms-scene-first/', import.meta.url).pathname
mkdirSync(OUT_DIR, { recursive: true })

// The Case 81 title switcher is gated behind a completed Case 77 precedent. This
// is the repo's documented schema-2 seeding recipe (scripts/evidence-travel.mjs).
const SAVE_KEY = 'the-annex.case-77.save.v1'
const SEED_SAVE = {
  schemaVersion: 2,
  caseId: 'case-77',
  // A COMPLETED case-77 record: the title switcher offers Case 81 only when the
  // save carries the precedent, and it switches without the leave-an-unfinished-
  // run confirmation only when that run has reached its debrief.
  phase: 'debrief',
  runNumber: 1,
  primaryApproach: null,
  completedSites: [],
  completedActions: [],
  evidence: [],
  methodTags: [],
  trust: { registrar: 0, shepherd: 0, defector: 0, archivist: 0 },
  alarm: 0,
  tribunalOverride: false,
  selectedFragments: [],
  reconstruction: null,
  // A debrief-phase save must carry the verdict it reached (persistence.ts:365).
  decision: 'certify-continuity',
  depositionRecord: null,
  events: [],
  previousRuns: [],
  precedents: { 'case-77': 'charter-new-person' },
  settings: {
    reducedMotion: false,
    highContrast: false,
    textSize: 'standard',
    showTrustNumbers: false,
    ambientSound: false,
  },
  announcement: 'Evidence-run seed.',
}

const chromeProcess = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-rooms-${Date.now()}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--mute-audio',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1280,800',
  'about:blank',
])

const killTimer = setTimeout(() => {
  console.error('GLOBAL TIMEOUT — aborting rooms evidence run')
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
        reject(new Error(`CDP timeout: ${method}`))
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
    await sleep(140)
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
async function mouseClick(x, y) {
  await mouseTo(x, y)
  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1,
  })
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1,
  })
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
  await sleep(170)
}
const pressEnter = () => pressKey('Enter', 'Enter', 13, '\r')
const pressTab = (shift = false) => pressKey('Tab', 'Tab', 9, undefined, shift ? 8 : 0)

const report = { url: APP_URL, capturedAt: new Date().toISOString(), checks: [], shots: [] }
function record(step, pass, detail) {
  report.checks.push({ step, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${step}  ${JSON.stringify(detail)}`)
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
  await sleep(400)
}

async function enterSite(name) {
  const viaPortal = await click('.annex-world-portal', name)
  if (!viaPortal) await click('.site-switch', name)
  const ok = await waitFor(
    `document.querySelector('.world-view')?.dataset.transition === 'closeup'`,
    20000,
  )
  await sleep(520)
  return ok
}

async function backToConcourse() {
  await click('.world-return')
  await waitFor(`document.querySelector('.world-view')?.dataset.transition === 'concourse'`, 8000)
  await sleep(320)
}

// ── The three rituals ───────────────────────────────────────────────────────
// Each driver runs the room's authored steps against whichever surface currently
// holds them (docked console or inspector) — the selectors are the room's own.

const ROOMS = {
  'small-archive': {
    site: 'Small Archive',
    root: '.classification-room',
    phaseAttr: 'data-room-phase',
    ritualControl: '.room-category',
    async run() {
      for (let i = 0; i < 12; i += 1) {
        const done = await evaluate(`!!document.querySelector('.room-shelf-zero')`)
        if (done) break
        await evaluate(`(() => {
          const open = [...document.querySelectorAll('.room-category:not(.room-shelf-zero)')].find((b) => !b.disabled)
          if (!open) return false
          open.click(); return true
        })()`)
        await sleep(200)
      }
      await click('.room-shelf-zero')
      await sleep(260)
      await click('.room-slip')
      await sleep(260)
      await click('.room-proceed')
      await sleep(420)
    },
    // A partial ritual that leaves the room visibly mid-work (one card filed).
    async partial() {
      await evaluate(`(() => {
        const open = [...document.querySelectorAll('.room-category:not(.room-shelf-zero)')].find((b) => !b.disabled)
        if (!open) return false
        open.click(); return true
      })()`)
      await sleep(260)
    },
    progress: () =>
      evaluate(`document.querySelector('.site-closeup-stage')?.dataset.roomPhase ?? null`),
  },
  maintenance: {
    site: 'Maintenance spine',
    root: '.acoustic-shadow-room',
    phaseAttr: 'data-acoustic-phase',
    ritualControl: '.as-band',
    async run() {
      for (let i = 0; i < 40; i += 1) {
        const ready = await evaluate(`!!document.querySelector('.as-methods')`)
        if (ready) break
        const crossed = await evaluate(`(() => {
          const masked = document.querySelector('.as-band[data-exposure="masked"]')
          if (!masked) return false
          masked.click(); return true
        })()`)
        if (!crossed) await click('.as-listen')
        await sleep(220)
      }
      await sleep(420)
    },
    async partial() {
      await click('.as-listen')
      await sleep(240)
    },
    progress: () =>
      evaluate(`(() => {
        const el = document.querySelector('.as-listen-meta')
        return el ? el.textContent.trim() : null
      })()`),
    // Advancing the pulse never moves focus (by design — the Listen control does
    // not unmount), so a keyboard player Tabs to the masked band themselves.
    keyboardTarget: () =>
      evaluate(`document.querySelector('.as-band[data-exposure="masked"]')
        ? '.as-band[data-exposure="masked"]'
        : '.as-listen'`),
  },
  registry: {
    site: 'Registry intake',
    root: '.custody-rail-room',
    phaseAttr: 'data-custody-phase',
    ritualControl: '.cr-carrier',
    async run() {
      for (let i = 0; i < 4; i += 1) {
        const seated = await evaluate(`(() => {
          const open = [...document.querySelectorAll('.cr-carrier')].find((b) => !b.disabled)
          if (!open) return false
          open.click(); return true
        })()`)
        if (!seated) break
        await sleep(220)
      }
      await click('.cr-late-carrier')
      await sleep(260)
      await click('.cr-mirror')
      await sleep(260)
      await click('.cr-proceed')
      await sleep(420)
    },
    async partial() {
      await evaluate(`(() => {
        const open = [...document.querySelectorAll('.cr-carrier')].find((b) => !b.disabled)
        if (!open) return false
        open.click(); return true
      })()`)
      await sleep(260)
    },
    progress: () =>
      evaluate(`document.querySelector('.cr-rail-readout strong')?.textContent?.trim() ?? null`),
  },
}

// Where the console lives right now, and how many copies of each control exist.
const consoleGeometry = (root) =>
  evaluate(`(() => {
    const room = document.querySelector(${JSON.stringify(root)})
    const dock = document.querySelector('.room-console')
    const plate = document.querySelector('.site-closeup-stage')
    const inspector = document.querySelector('.site-inspector')
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) } }
    return {
      roomInstances: document.querySelectorAll(${JSON.stringify(root)}).length,
      dockPresent: !!dock,
      roomInsideDock: !!dock && !!room && dock.contains(room),
      roomInsideInspector: !!inspector && !!room && inspector.contains(room),
      dockRect: r(dock),
      plateRect: r(plate),
      consoleWithinPlate: !!dock && !!plate && (() => {
        const d = dock.getBoundingClientRect(), p = plate.getBoundingClientRect()
        return d.top >= p.top - 2 && d.bottom <= p.bottom + 2 && d.left >= p.left - 2 && d.right <= p.right + 2
      })(),
      consoleScrolls: !!dock && dock.scrollHeight > dock.clientHeight + 1,
      inspectorSlotEmpty: (() => {
        const slot = document.querySelector('.room-console-slot')
        return slot ? slot.children.length === 0 : 'absent'
      })(),
    }
  })()`)

const controlCensus = (ritualControl) =>
  evaluate(`(() => ({
    ritualControls: document.querySelectorAll(${JSON.stringify(ritualControl)}).length,
    sceneZoneButtons: document.querySelectorAll('.scene-zone button').length,
    inspectorChoiceRows: document.querySelectorAll('.site-inspector .choice-row').length,
    decorativeZoneMirrors: document.querySelectorAll('.site-closeup-zone').length,
    anyChoiceRows: document.querySelectorAll('.choice-row').length,
    detailSummon: !!document.querySelector('.scene-detail-summon'),
    liveOutsideAriaHiddenFigure: (() => {
      const live = document.querySelector('.scene-zones-live')
      const fig = document.querySelector('.site-closeup-stage')
      if (!live || !fig) return null
      return !fig.contains(live) && live.parentElement === fig.parentElement
    })(),
  }))()`)

const zoneRingCentres = () =>
  evaluate(`(() => [...document.querySelectorAll('.scene-zone')].map((z) => {
    const r = z.querySelector('.scene-zone-ring').getBoundingClientRect()
    return { edge: z.dataset.edge ?? null, treatment: z.dataset.treatment ?? null,
             x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }))()`)

const activeInfo = () =>
  evaluate(`(() => {
    const el = document.activeElement
    return {
      tag: el?.tagName ?? null,
      cls: (el?.className && typeof el.className === 'string' ? el.className : '').slice(0, 70),
      text: (el?.textContent ?? '').replace(/\\s+/g, ' ').trim().slice(0, 70),
    }
  })()`)

// Probe with transitions killed, two frames allowed to pass (transition-clock scar).
const probeSettled = () =>
  evaluate(`(async () => {
    const style = document.createElement('style')
    style.textContent = '.world-view, .world-view * { transition: none !important; }'
    document.head.appendChild(style)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const g = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el) : null }
    const fig = g('.site-closeup-stage')
    const proj = g('.site-closeup-projection')
    const dock = g('.room-console')
    const out = {
      plateOpacity: fig?.opacity ?? null,
      plateClip: fig?.clipPath ?? null,
      projectionOpacity: proj?.opacity ?? null,
      imgOpacity: (() => { const el = document.querySelector('.site-closeup-projection img'); return el ? getComputedStyle(el).opacity : null })(),
      consoleOpacity: dock?.opacity ?? null,
      consoleTransform: dock?.transform ?? null,
      consoleAnimation: dock?.animationName ?? null,
    }
    style.remove()
    return out
  })()`)

// ── One room, one viewport: the full ritual through console → zones → beat ──

async function roomPass(key, width, height) {
  const room = ROOMS[key]
  const tag = `${key} ${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()

  const entered = await enterSite(room.site)
  const stageInFold = await evaluate(`(() => {
    const r = document.querySelector('.site-closeup-stage')?.getBoundingClientRect()
    return !!r && r.top >= -2 && r.bottom <= window.innerHeight + 2
  })()`)
  const docked = await consoleGeometry(room.root)
  const censusRitual = await controlCensus(room.ritualControl)
  await shot(`${key}-01-console-docked`, width, height)
  record(`[${tag}] the console docks OVER the plate, one instance only`, Boolean(
    entered && stageInFold && docked.roomInstances === 1 && docked.dockPresent &&
      docked.roomInsideDock && !docked.roomInsideInspector && docked.consoleWithinPlate &&
      censusRitual.sceneZoneButtons === 0,
  ), { entered, stageInFold, ...docked, ...censusRitual })

  // Mid-ritual: leave to the concourse. The console must return to the inspector
  // and the ritual so far must survive the move (a DOM re-parent, not a remount).
  await room.partial()
  const progressBefore = await room.progress()
  await backToConcourse()
  const atConcourse = await consoleGeometry(room.root)
  const progressAtConcourse = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(room.root)})
    return el ? el.getAttribute(${JSON.stringify(room.phaseAttr)}) : null
  })()`)
  await shot(`${key}-02-console-in-inspector`, width, height)
  record(`[${tag}] off the close read the console is back in the inspector, still one`, Boolean(
    atConcourse.roomInstances === 1 && !atConcourse.dockPresent && atConcourse.roomInsideInspector,
  ), { ...atConcourse, progressAtConcourse })

  await enterSite(room.site)
  const progressAfter = await room.progress()
  const reDocked = await consoleGeometry(room.root)
  record(`[${tag}] re-entering re-docks it WITHOUT resetting the ritual`, Boolean(
    reDocked.dockPresent && reDocked.roomInsideDock && progressAfter === progressBefore,
  ), { progressBefore, progressAfter, dockPresent: reDocked.dockPresent })

  // Run the ritual to its terminal phase.
  await room.run()
  const terminal = await consoleGeometry(room.root)
  const censusTerminal = await controlCensus(room.ritualControl)
  const focusAtUnlock = await activeInfo()
  await shot(`${key}-03-terminal-zones`, width, height)
  record(`[${tag}] at unlock the console yields; the methods are the plate's zones`, Boolean(
    censusTerminal.sceneZoneButtons === 2 &&
      censusTerminal.decorativeZoneMirrors === 0 &&
      censusTerminal.inspectorChoiceRows === 0 &&
      censusTerminal.anyChoiceRows === 2 &&
      censusTerminal.liveOutsideAriaHiddenFigure === true &&
      censusTerminal.detailSummon &&
      !terminal.dockPresent,
  ), { ...censusTerminal, dockPresent: terminal.dockPresent, focusAtUnlock })
  record(`[${tag}] the unlock hands the keyboard route to a plate zone`,
    focusAtUnlock.cls.includes('choice-row'), focusAtUnlock)

  // Ambient preview through the zones (the site's OWN authored vocabulary).
  const rings = await zoneRingCentres()
  await mouseTo(rings[0]?.x ?? 0, rings[0]?.y ?? 0)
  await sleep(520)
  const previewA = await evaluate(`(() => ({
    emphasis: document.querySelector('.site-closeup-stage')?.dataset.emphasis ?? null,
    liveEmphasis: document.querySelector('.scene-zones-live')?.dataset.emphasis ?? null,
    custodyOutcome: document.querySelector('.site-closeup-custody-outcome')?.dataset.variant ?? null,
    treatment: document.querySelector('.site-closeup-stage')?.dataset.previewTreatment ?? null,
  }))()`)
  await shot(`${key}-04-zone-preview-a`, width, height)
  await mouseTo(rings[1]?.x ?? 0, rings[1]?.y ?? 0)
  await sleep(520)
  // The unlock left focus on zone 0 and the pointer is now on zone 1: two zones
  // in a revealing state at once. Exactly one caption may be open, or on a narrow
  // plate the two print over each other (invisible to any text assertion).
  const previewB = await evaluate(`(() => {
    const closed = (el) => getComputedStyle(el).clipPath.replace(/\\s+/g, '') === 'inset(0px0px100%)'
    return {
      custodyOutcome: document.querySelector('.site-closeup-custody-outcome')?.dataset.variant ?? null,
      liveEmphasis: document.querySelector('.scene-zones-live')?.dataset.emphasis ?? null,
      focusedZone: [...document.querySelectorAll('.scene-zone')].findIndex((z) => z.contains(document.activeElement)),
      openCaptions: [...document.querySelectorAll('.scene-zone .choice-body')].filter((el) => !closed(el)).length,
    }
  })()`)
  await shot(`${key}-05-zone-preview-b`, width, height)
  record(`[${tag}] hovering a zone drives the plate's own preview vocabulary`,
    previewA.liveEmphasis === 'true' && previewB.liveEmphasis === 'true',
    { previewA, previewB })
  record(`[${tag}] exactly one caption is open, even with focus on the other zone`,
    previewB.openCaptions === 1, previewB)

  // The rings must sit on the anchors the plate paints (one geometry source).
  const ringAlignment = await evaluate(`(() => {
    const live = document.querySelector('.scene-zones-live-projection')
    const plate = document.querySelector('.site-closeup-projection')
    if (!live || !plate) return null
    const a = live.getBoundingClientRect(), b = plate.getBoundingClientRect()
    return { dx: Math.round(a.left - b.left), dy: Math.round(a.top - b.top),
             dw: Math.round(a.width - b.width), dh: Math.round(a.height - b.height) }
  })()`)
  record(`[${tag}] the live zone layer shares the plate's projection box`, Boolean(
    ringAlignment && Math.abs(ringAlignment.dx) <= 2 && Math.abs(ringAlignment.dy) <= 2 &&
      Math.abs(ringAlignment.dw) <= 2 && Math.abs(ringAlignment.dh) <= 2,
  ), ringAlignment)

  // ARM then COMMIT. The dispatch must precede any reveal.
  await mouseClick(rings[0].x, rings[0].y)
  await sleep(360)
  const armed = await evaluate(`(() => {
    const zs = [...document.querySelectorAll('.scene-zone')]
    return {
      ariaPressed: zs.map((z) => z.querySelector('button').getAttribute('aria-pressed')),
      ringAnimation: getComputedStyle(zs[0].querySelector('.scene-zone-ring')).animationName,
      siblingOpacity: zs.map((z) => getComputedStyle(z).opacity),
      costClip: getComputedStyle(zs[0].querySelector('.choice-body small')).clipPath,
    }
  })()`)
  await shot(`${key}-06-armed`, width, height)
  record(`[${tag}] arm reads on the ring and un-clips the pre-commit cost`, Boolean(
    armed.ariaPressed[0] === 'true' && armed.ariaPressed[1] === 'false' &&
      armed.costClip !== 'inset(0px 0px 100%)',
  ), armed)

  await mouseClick(rings[0].x, rings[0].y)
  await sleep(120)
  const atCommit = await evaluate(`(() => ({
    filedCardInInspector: !!document.querySelector('.resolved-action'),
    beatMounted: !!document.querySelector('.scene-beat'),
    zonesGone: document.querySelectorAll('.scene-zone').length,
  }))()`)
  record(`[${tag}] the record is written BEFORE the beat exists`,
    atCommit.filedCardInInspector, atCommit)

  await sleep(1500)
  const midBeat = await evaluate(`(() => ({
    phase: document.querySelector('.scene-beat')?.dataset.phase ?? null,
    lines: [...document.querySelectorAll('.scene-beat-line')].map((p) => p.textContent),
    focus: document.activeElement?.className ?? null,
  }))()`)
  await shot(`${key}-07-beat`, width, height)
  record(`[${tag}] the beat stages the action's own authored lines`, Boolean(
    midBeat.phase && midBeat.lines.length > 0 &&
      String(midBeat.focus).includes('scene-beat-advance'),
  ), { phase: midBeat.phase, lineCount: midBeat.lines.length, first: midBeat.lines[0], focus: midBeat.focus })
  report[`${key}BeatLines`] = midBeat.lines

  for (let i = 0; i < 14; i += 1) {
    if (await evaluate(`!!document.querySelector('.scene-result')`)) break
    await click('.scene-beat-advance')
    await sleep(300)
  }
  const strip = await evaluate(`(() => ({
    result: !!document.querySelector('.scene-result'),
    evidence: document.querySelector('.scene-result-evidence')?.textContent ?? null,
    standing: document.querySelector('.scene-result-standing')?.textContent ?? null,
    focus: document.activeElement?.className ?? null,
  }))()`)
  await shot(`${key}-08-result-strip`, width, height)
  record(`[${tag}] the result strip docks with the admitted evidence`, Boolean(
    strip.result && strip.evidence,
  ), strip)

  await click('.scene-result-dismiss')
  await sleep(420)
  await shot(`${key}-09-filed`, width, height)

  // Re-entry twice (opacity-strand scar): nothing may strand invisible.
  const reentry = []
  for (let i = 0; i < 2; i += 1) {
    await backToConcourse()
    await enterSite(room.site)
    reentry.push(await probeSettled())
    await shot(`${key}-10-reentry-${i + 1}`, width, height)
  }
  record(`[${tag}] re-entering twice leaves nothing stranded invisible`, reentry.every((r) =>
    r.plateOpacity === '1' && r.projectionOpacity === '1' && r.imgOpacity === '1',
  ), reentry)
}

// ── Keyboard-only: the whole room, end to end, with trusted key events ──────

async function keyboardPass(key, width, height) {
  const room = ROOMS[key]
  const tag = `${key} keyboard ${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()
  await enterSite(room.site)
  const transcript = []

  // Tab into the docked console.
  let reached = false
  for (let i = 0; i < 30; i += 1) {
    await pressTab()
    const info = await activeInfo()
    transcript.push({ step: `Tab ${i + 1}`, ...info })
    const inside = await evaluate(
      `!!document.activeElement?.closest('.room-console')`,
    )
    if (inside) { reached = true; break }
  }
  record(`[${tag}] Tab alone reaches the docked console`, reached,
    transcript[transcript.length - 1] ?? null)

  // Work the ritual with Enter on whatever control the room hands focus to; when
  // the room deliberately leaves focus put (the acoustic Listen control), Tab to
  // the control the ritual is actually asking for, exactly as a player would.
  let steps = 0
  for (let i = 0; i < 60; i += 1) {
    if (await evaluate(`!!document.querySelector('.scene-zone button')`)) break
    if (room.keyboardTarget) {
      const want = await room.keyboardTarget()
      for (let t = 0; t < 20; t += 1) {
        const onTarget = await evaluate(
          `document.activeElement?.matches(${JSON.stringify(want)}) === true`,
        )
        if (onTarget) break
        await pressTab()
      }
    }
    const actionable = await evaluate(
      `!!document.activeElement?.closest('.room-console') && document.activeElement?.tagName === 'BUTTON' && !document.activeElement.disabled`,
    )
    if (actionable) {
      await pressEnter()
      steps += 1
    } else {
      await pressTab()
    }
    const info = await activeInfo()
    if (steps % 3 === 0) transcript.push({ step: `ritual ${i}`, ...info })
    const onBody = await evaluate(`document.activeElement === document.body`)
    if (onBody) transcript.push({ step: `FOCUS FELL TO BODY at ${i}`, ...info })
  }
  const unlocked = await evaluate(`(() => ({
    zones: document.querySelectorAll('.scene-zone button').length,
    focusOnZone: !!document.activeElement?.closest('.scene-zone'),
    focusNotBody: document.activeElement !== document.body,
  }))()`)
  await shot(`${key}-11-keyboard-unlocked`, width, height)
  record(`[${tag}] keyboard alone completes the ritual and lands on a zone`, Boolean(
    unlocked.zones === 2 && unlocked.focusOnZone,
  ), { steps, ...unlocked })

  // Arm, commit, advance the beat, reach and dismiss the strip — keys only.
  await pressEnter()
  const armedInfo = await evaluate(`document.activeElement?.getAttribute('aria-pressed')`)
  await pressEnter()
  await sleep(900)
  const afterCommit = await evaluate(`(() => ({
    filed: !!document.querySelector('.resolved-action'),
    beat: !!document.querySelector('.scene-beat'),
    focusNotBody: document.activeElement !== document.body,
  }))()`)
  record(`[${tag}] Enter arms, Enter commits, the beat takes focus`, Boolean(
    armedInfo === 'true' && afterCommit.filed && afterCommit.focusNotBody,
  ), { armedInfo, ...afterCommit })

  for (let i = 0; i < 14; i += 1) {
    if (await evaluate(`!!document.querySelector('.scene-result')`)) break
    await pressEnter()
    await sleep(280)
  }
  for (let i = 0; i < 12; i += 1) {
    if (await evaluate(`document.activeElement?.classList?.contains('scene-result-dismiss') === true`)) break
    await pressTab()
  }
  await pressEnter()
  await sleep(500)
  const landed = await activeInfo()
  transcript.push({ step: 'Enter (close the record)', ...landed })
  record(`[${tag}] closing the record hands focus back, never to <body>`,
    landed.tag !== 'BODY' && landed.tag !== null, landed)
  report[`${key}KeyboardTranscript`] = transcript
}

// ── Reduced motion + save/resume mid-ritual ─────────────────────────────────

async function reducedMotionPass(key, width, height) {
  const room = ROOMS[key]
  const tag = `${key} reduced-motion ${width}x${height}`
  await setViewport(width, height)
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  await bootFreshRun()
  await enterSite(room.site)
  const settled = await probeSettled()
  await shot(`${key}-12-reduced-motion-console`, width, height)
  record(`[${tag}] the docked console does not animate and is fully visible`, Boolean(
    settled.consoleAnimation === 'none' && settled.consoleOpacity === '1',
  ), settled)

  await room.run()
  const rings = await zoneRingCentres()
  await mouseClick(rings[0].x, rings[0].y)
  await sleep(240)
  await mouseClick(rings[0].x, rings[0].y)
  await sleep(800)
  const rmBeat = await evaluate(`(() => ({
    lines: document.querySelectorAll('.scene-beat-line').length,
    result: !!document.querySelector('.scene-result'),
    hint: !!document.querySelector('.scene-beat-hint'),
    lineAnimation: [...document.querySelectorAll('.scene-beat-line')].map((p) => getComputedStyle(p).animationName)[0] ?? null,
  }))()`)
  await shot(`${key}-13-reduced-motion-beat`, width, height)
  await sleep(5000)
  const stillWaiting = await evaluate(`!document.querySelector('.scene-result')`)
  record(`[${tag}] the staged text is advance-paced, never auto-timed`, Boolean(
    rmBeat.lines >= 1 && rmBeat.result === false && rmBeat.hint === false &&
      rmBeat.lineAnimation === 'none' && stillWaiting,
  ), { ...rmBeat, stillWaitingAfter5s: stillWaiting })
  await click('.scene-beat-advance')
  await sleep(400)
  record(`[${tag}] the explicit control completes it`,
    await evaluate(`!!document.querySelector('.scene-result')`), {})
  await send('Emulation.setEmulatedMedia', { features: [] })
}

async function resumePass(key, width, height) {
  const room = ROOMS[key]
  const tag = `${key} resume ${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()
  await enterSite(room.site)
  await room.partial()
  await send('Page.reload')
  await waitFor(`document.readyState === 'complete'`)
  await sleep(900)
  if (await evaluate(`[...document.querySelectorAll('button')].some((b) => /continue|resume/i.test(b.textContent))`)) {
    await click('button', 'Continue')
    await waitFor(`!!document.querySelector('.site-switcher')`, 15000)
    await sleep(600)
  }
  const resumed = await evaluate(`(() => ({
    objectives: document.querySelector('.field-objectives')?.textContent ?? null,
    filedCards: document.querySelectorAll('.resolved-action').length,
    events: [...document.querySelectorAll('.case-rail, .rail-mobile-toggle')].map((e) => e.textContent?.match(/\\d+ events/)?.[0]).filter(Boolean),
  }))()`)
  await shot(`${key}-14-resume-mid-ritual`, width, height)
  record(`[${tag}] a reload mid-ritual writes NOTHING to the record`, Boolean(
    resumed.filedCards === 0 && /0\s*\/\s*2/.test(resumed.objectives ?? ''),
  ), resumed)
}

// ── Case 81: the deposition, end to end, on the shared staged-text family ───

async function depositionPass(width, height) {
  const tag = `case-81 deposition ${width}x${height}`
  await setViewport(width, height)
  await send('Page.navigate', { url: APP_URL })
  await waitForText('button', 'Open a new audit')
  await evaluate(
    `(() => { window.localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(SEED_SAVE))}); return true })()`,
  )
  await send('Page.reload')
  await waitForText('button', 'Open a new audit')
  await sleep(400)
  const opened = await click('.switch-target button', 'Case 81')
  if (!opened) {
    const labels = await evaluate(
      `[...document.querySelectorAll('button')].map((b) => b.textContent.trim().slice(0, 60))`,
    )
    record(`[${tag}] Case 81 offered on the title switcher`, false, { labels })
    return
  }
  await sleep(300)
  // A save still mid-run takes the leave-the-run confirmation first.
  await click('.inline-confirmation-actions button', 'Leave and switch')
  await waitFor(`!!document.querySelector('.choice-row')`, 12000)
  await click('.choice-row')
  const inInvestigation = await waitFor(`!!document.querySelector('.site-switcher')`, 12000)
  await sleep(700)
  const caseState = await evaluate(`(() => ({
    title: document.title,
    sceneFirstLayer: !!document.querySelector('.scene-zones-live'),
    roomConsole: !!document.querySelector('.room-console'),
    inspectorChoiceRows: document.querySelectorAll('.site-inspector .choice-row').length,
  }))()`)
  record(`[${tag}] Case 81 opens untouched by the rooms work`, Boolean(
    inInvestigation && caseState.title.includes('81') &&
      caseState.sceneFirstLayer === false && caseState.roomConsole === false &&
      caseState.inspectorChoiceRows >= 1,
  ), caseState)

  // Open the transcript from the deposition suite.
  await click('.site-switch', 'Deposition suite')
  await sleep(600)
  const openedTray = await click('.site-inspector .choice-row')
  await waitFor(`!!document.querySelector('.deposition-tray')`, 8000)
  await sleep(500)
  await shot('deposition-01-tray', width, height)
  const trayFamily = await evaluate(`(async () => {
    const style = document.createElement('style')
    style.textContent = '.deposition-portal, .deposition-portal * { transition: none !important; }'
    document.head.appendChild(style)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const g = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el) : null }
    const statement = g('.deposition-statement')
    const out = {
      modal: document.querySelector('.deposition-tray')?.getAttribute('aria-modal') ?? null,
      statementFont: statement?.fontSize ?? null,
      statementWeight: statement?.fontWeight ?? null,
      statementLineHeight: statement?.lineHeight ?? null,
      statementColor: statement?.color ?? null,
      focusInsideTray: !!document.activeElement?.closest('.deposition-tray'),
    }
    style.remove()
    return out
  })()`)
  record(`[${tag}] the transcript tray opens with its modal semantics intact`, Boolean(
    openedTray && trayFamily.modal === 'true' && trayFamily.focusInsideTray,
  ), trayFamily)
  report.depositionStagedText = trayFamily

  // Walk every statement beat, ask consent, reach the closing strip.
  for (let i = 0; i < 6; i += 1) {
    const atConsent = await evaluate(`!!document.querySelector('.deposition-question')`)
    if (atConsent) break
    await click('.deposition-choices .choice-row')
    await sleep(320)
  }
  await shot('deposition-02-consent', width, height)
  await click('.deposition-choices .choice-row')
  await sleep(320)
  await click('.deposition-answer .button')
  await sleep(400)
  const closing = await evaluate(`(() => ({
    resultStrip: !!document.querySelector('.deposition-result'),
    summary: document.querySelector('.deposition-consent-summary')?.textContent ?? null,
    commitLabel: document.querySelector('.deposition-result .button')?.textContent ?? null,
  }))()`)
  await shot('deposition-03-closing-strip', width, height)
  record(`[${tag}] the commit sits in the shared result-strip grammar`, Boolean(
    closing.resultStrip && closing.summary && closing.commitLabel,
  ), closing)

  const stripFamily = await evaluate(`(async () => {
    const style = document.createElement('style')
    style.textContent = '.deposition-portal, .deposition-portal * { transition: none !important; }'
    document.head.appendChild(style)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const g = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el) : null }
    const strip = g('.deposition-result')
    const out = {
      background: strip?.backgroundImage?.slice(0, 90) ?? null,
      borderTop: strip?.borderTopWidth ?? null,
      padding: strip?.padding ?? null,
      display: strip?.display ?? null,
    }
    style.remove()
    return out
  })()`)
  report.depositionResultStrip = stripFamily

  // Commit (two-step) and confirm the record lands.
  await click('.deposition-result .button')
  await sleep(300)
  await click('.deposition-result .button')
  await sleep(900)
  const committed = await evaluate(`(() => ({
    trayGone: !document.querySelector('.deposition-tray'),
    filed: !!document.querySelector('.resolved-action'),
    objectives: document.querySelector('.field-objectives')?.textContent ?? null,
    focusNotBody: document.activeElement !== document.body,
  }))()`)
  await shot('deposition-04-committed', width, height)
  record(`[${tag}] the transcript commits and the site files`, Boolean(
    committed.trayGone && committed.filed,
  ), committed)
}

// ── Run ─────────────────────────────────────────────────────────────────────

const passes = []
for (const key of Object.keys(ROOMS)) {
  passes.push([`${key} 1280x800`, () => roomPass(key, 1280, 800)])
  passes.push([`${key} 375x812`, () => roomPass(key, 375, 812)])
  passes.push([`${key} keyboard`, () => keyboardPass(key, 1280, 800)])
  passes.push([`${key} reduced-motion`, () => reducedMotionPass(key, 1280, 800)])
  passes.push([`${key} resume`, () => resumePass(key, 1280, 800)])
}
passes.push(['deposition 1280x800', () => depositionPass(1280, 800)])
passes.push(['deposition 375x812', () => depositionPass(375, 812)])

const PASS_FILTER = process.env.PASS ?? ''
for (const [name, run] of passes) {
  if (PASS_FILTER && !name.includes(PASS_FILTER)) continue
  try {
    await run()
  } catch (error) {
    record(`${name} — aborted`, false, { error: String(error?.message ?? error) })
    await send('Emulation.setEmulatedMedia', { features: [] }).catch(() => undefined)
  }
}

report.passed = report.checks.filter((c) => c.pass).length
report.failed = report.checks.filter((c) => !c.pass).length
writeFileSync(join(OUT_DIR, 'rooms-evidence.json'), JSON.stringify(report, null, 2))
console.log(`\n${report.passed} passed / ${report.failed} failed → ${OUT_DIR}`)
clearTimeout(killTimer)
chromeProcess.kill('SIGKILL')
socket.close()
process.exit(report.failed > 0 ? 1 : 0)

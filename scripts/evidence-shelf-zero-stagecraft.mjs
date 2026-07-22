// Visual + geometry + outcome evidence for the redesigned Small Archive
// workstation and its concourse return payoff. Drives the real Vite app in
// headless Chrome over raw CDP (WebGL via swiftshader). Produces, into
// evidence/shelf-zero-stagecraft/:
//   • desktop 1280×800 screenshots of every room phase + the plate stagecraft
//   • geometry.json — per-phase .site-inspector scroll/client heights, room rect
//     heights, live-region counts, and the fourth-card / shelf-zero absence flags
//   • BOTH outcome captures from FULL UI runs (no seeded saves): start → approach
//     → room → commit → the real "Return to concourse" control, including the
//     ~950ms return-emphasis frame, plus a labels-hidden pair for distinguishability
//   • mobile 375px, reduced-motion, high-contrast, and large-text captures
//
// Usage: node scripts/evidence-shelf-zero-stagecraft.mjs [app-url]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://127.0.0.1:4174/'
const OUT_DIR = new URL('../evidence/shelf-zero-reading-beat/', import.meta.url).pathname
const SAVE_KEY = 'the-annex.case-77.save.v1'
mkdirSync(OUT_DIR, { recursive: true })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function newSession({ width = 1280, height = 800 } = {}) {
  const proc = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=/tmp/annex-szv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    '--hide-scrollbars',
    `--window-size=${width},${height}`,
    '--enable-webgl',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
    'about:blank',
  ])
  const wsUrl = await new Promise((resolve, reject) => {
    let stderr = ''
    const timer = setTimeout(() => reject(new Error('Chrome CDP endpoint timed out')), 25000)
    proc.stderr.on('data', (chunk) => {
      stderr += chunk
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/)
      if (!match) return
      clearTimeout(timer)
      resolve(match[1])
    })
    proc.once('exit', (code) => {
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
  const raw = (method, params = {}, sessionId) => {
    const id = nextId
    nextId += 1
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
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

  const evaluate = async (expression) => {
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
  const click = (selector, text) =>
    evaluate(`(() => {
      const m = [...document.querySelectorAll(${JSON.stringify(selector)})]
      const t = ${JSON.stringify(text ?? '')}
        ? m.find((el) => el.textContent.includes(${JSON.stringify(text ?? '')}))
        : m[0]
      if (!t) return false
      t.click()
      return true
    })()`)
  const waitFor = async (expr, timeout = 12000) => {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      const ok = await evaluate(expr).catch(() => false)
      if (ok) return true
      await sleep(150)
    }
    return false
  }
  const waitText = (selector, text, timeout) =>
    waitFor(
      `[...document.querySelectorAll(${JSON.stringify(selector)})].some((el) => el.textContent.includes(${JSON.stringify(text)}))`,
      timeout,
    )
  const shot = async (name) => {
    const png = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(OUT_DIR, name), Buffer.from(png.data, 'base64'))
  }
  const kill = () => {
    try {
      socket.close()
    } catch {
      /* ignore */
    }
    proc.kill('SIGKILL')
  }
  return { send, evaluate, click, waitFor, waitText, shot, kill }
}

// Navigate the full UI: start → curiosity approach → enter the Small Archive.
async function fullUiToRoom(s) {
  await s.send('Page.navigate', { url: APP_URL })
  if (!(await s.waitText('button', 'Open a new audit'))) throw new Error('landing did not render')
  await s.click('button', 'Open a new audit')
  if (!(await s.waitText('button', 'Begin with the missing question')))
    throw new Error('briefing did not render')
  await sleep(250)
  await s.click('button', 'Begin with the missing question')
  if (!(await s.waitFor(`Boolean(document.querySelector('#site-switch-small-archive'))`)))
    throw new Error('investigation did not render')
  await sleep(300)
  await s.click('#site-switch-small-archive')
  if (!(await s.waitFor(`Boolean(document.querySelector('.classification-room .room-active-card'))`)))
    throw new Error('room did not render')
  await sleep(400)
}

const geometryExpr = `JSON.stringify((() => {
  const inspector = document.querySelector('.site-inspector')
  const room = document.querySelector('.classification-room')
  const ir = inspector?.getBoundingClientRect()
  return {
    phase: room?.dataset.roomPhase ?? null,
    inspectorScrollHeight: inspector?.scrollHeight ?? null,
    inspectorClientHeight: inspector?.clientHeight ?? null,
    inspectorOverflow: inspector ? inspector.scrollHeight - inspector.clientHeight : null,
    roomRectHeight: room ? Math.round(room.getBoundingClientRect().height * 100) / 100 : null,
    liveRegions: room ? room.querySelectorAll('[aria-live], [role="status"]').length : null,
    pocketCardInDom: room ? room.textContent.includes('If Mara ended') : null,
    shelfZeroInDom: Boolean(document.querySelector('.room-shelf-zero')),
    activeCardTitle: document.querySelector('.room-active-card .room-card-title')?.textContent ?? null,
    // Reading-beat instrumentation: the stable reading area's box vs its content, the
    // selected slip, how many slips are turned, and whether the proceed control and
    // methods have appeared (methods must stay 0 until proceed is activated).
    reading: (() => {
      const r = document.querySelector('.room-reading')
      if (!r) return null
      return { clientH: r.clientHeight, scrollH: r.scrollHeight, noScroll: r.scrollHeight <= r.clientHeight }
    })(),
    selectedSlip: document.querySelector('.room-slip[data-selected="true"] .room-slip-label')?.textContent ?? null,
    turnedSlips: document.querySelectorAll('.room-slip[data-turned="true"]').length,
    proceedPresent: Boolean(document.querySelector('.room-proceed')),
    methodsCount: document.querySelectorAll('.classification-room .choice-row').length,
    docScrollWidth: document.documentElement.scrollWidth,
    docClientWidth: document.documentElement.clientWidth,
    minInteractive: (() => {
      const els = [...document.querySelectorAll('.classification-room button')]
      if (!els.length) return null
      return Math.round(Math.min(...els.map((el) => {
        const r = el.getBoundingClientRect(); return Math.min(r.width, r.height)
      })))
    })(),
  }
})())`

async function clickCategory(s) {
  await s.click('.room-category:not(.room-shelf-zero):not([disabled])')
  await sleep(320)
}

const geometry = []
async function record(s) {
  const g = JSON.parse(await s.evaluate(geometryExpr))
  geometry.push(g)
  return g
}

// ── Desktop phase walk: screenshots + geometry ───────────────────────────────
async function desktopWalk() {
  const s = await newSession({ width: 1280, height: 800 })
  try {
    await fullUiToRoom(s)
    await record(s)
    await s.shot('01-initial-tableau-1280x800.png')

    await clickCategory(s) // file routine card 1
    await record(s)
    await s.shot('02-mid-routine-1280x800.png')

    await clickCategory(s) // file routine card 2
    await clickCategory(s) // file routine card 3 → pocket phase
    await record(s)
    await s.shot('03-third-routine-filing-1280x800.png')

    await clickCategory(s) // refuse 1
    await clickCategory(s) // refuse 2
    await record(s) // pocket phase, mid-refusals
    await clickCategory(s) // refuse 3 → shelf-zero phase
    await record(s)
    await s.shot('04-third-refusal-1280x800.png')
    await s.shot('05-shelf-zero-1280x800.png')

    await s.click('.room-shelf-zero')
    await s.waitFor(`document.querySelector('.classification-room').dataset.roomPhase === 'log'`)
    await sleep(300)
    await record(s) // log, 0 turned: reading rest state, proceed absent, methods 0
    await s.shot('06-reading-log-zero-turned-1280x800.png')

    // The reading beat: turn the first slip (room unlocks, phase STAYS log), then turn
    // all three, then re-select each so its full fragment is measured for readability.
    const tab = (i) => s.evaluate(`document.querySelectorAll('.room-slip-tabs .room-slip')[${i}].click()`)
    await tab(0)
    await sleep(300)
    await record(s) // reading, 1 turned: proceed present, methods still 0
    await s.shot('07-reading-one-turned-1280x800.png')

    await tab(1)
    await sleep(280)
    await tab(2)
    await sleep(300)
    await record(s) // reading, 3 turned, third selected: methods still 0 (no proceed yet)
    await s.shot('08-reading-three-turned-1280x800.png')

    for (let i = 0; i < 3; i += 1) {
      await tab(i)
      await sleep(260)
      await record(s) // each fragment selected — per-fragment readability captured
      await s.shot(`09-reading-fragment-${i + 1}-1280x800.png`)
    }

    // Acknowledge the beat → methods replace the tableau in place.
    await s.click('.room-proceed')
    await s.waitFor(`document.querySelector('.classification-room').dataset.roomPhase === 'unlocked'`)
    await sleep(300)
    await record(s)
    await s.shot('10-unlocked-methods-1280x800.png')

    const heights = geometry.map((g) => g.roomRectHeight).filter((h) => typeof h === 'number')
    const summary = {
      when: new Date().toISOString(),
      url: APP_URL,
      viewport: '1280x800',
      roomHeightMin: Math.min(...heights),
      roomHeightMax: Math.max(...heights),
      roomHeightVariance: Math.round((Math.max(...heights) - Math.min(...heights)) * 100) / 100,
      maxInspectorOverflow: Math.max(...geometry.map((g) => g.inspectorOverflow ?? 0)),
      phases: geometry,
    }
    writeFileSync(join(OUT_DIR, 'geometry.json'), JSON.stringify(summary, null, 2))
    console.log(
      'geometry: variance',
      summary.roomHeightVariance,
      'maxOverflow',
      summary.maxInspectorOverflow,
    )
  } finally {
    s.kill()
  }
}

// ── Outcome captures (FULL UI, no seed): opened / sealed + return emphasis ────
async function outcomeRun({ methodText, tag, expectedOutcome }) {
  const s = await newSession({ width: 1280, height: 800 })
  try {
    await fullUiToRoom(s)
    for (let i = 0; i < 6; i += 1) await clickCategory(s) // 3 files + 3 refusals
    await s.waitFor(`Boolean(document.querySelector('.room-shelf-zero'))`)
    await s.click('.room-shelf-zero')
    await s.waitFor(`document.querySelectorAll('.room-slip').length === 3`)
    await sleep(250)
    // Turn a slip (unlocks the room, phase stays log), then acknowledge the reading
    // beat via the proceed control before the methods render.
    await s.click('.room-slip')
    await s.waitFor(`Boolean(document.querySelector('.room-proceed'))`)
    await sleep(200)
    await s.click('.room-proceed')
    await s.waitFor(`document.querySelectorAll('.classification-room .choice-row').length === 2`)
    await sleep(250)
    // Two-step confirm of the chosen method, via real activations.
    await s.click('.classification-room .choice-row', methodText)
    await s.waitFor(`Boolean(document.querySelector('.classification-room .choice-row-armed'))`)
    await sleep(200)
    await s.click('.classification-room .choice-row-armed')
    await s.waitFor(`document.querySelector('.site-state')?.textContent === 'Filed'`)
    await sleep(300)

    // The real "Return to concourse" control. Capture the ~950ms emphasis frame,
    // then the settled portal, plus a labels-hidden pair for distinguishability.
    await s.click('button', 'Return to concourse')
    await sleep(480) // mid-hold (the emphasis lasts ~950ms)
    await s.shot(`08-return-${tag}-emphasis-1280x800.png`)
    await sleep(900) // let the hold release
    await s.shot(`09-return-${tag}-settled-1280x800.png`)

    // Hide portal labels (capture-only) and confirm opened vs sealed still distinct.
    await s.evaluate(`(() => {
      const st = document.createElement('style')
      st.id = 'hide-portal-labels'
      st.textContent = '.annex-world-portal-label{display:none!important}'
      document.head.appendChild(st)
    })()`)
    await sleep(200)
    await s.shot(`10-return-${tag}-labels-hidden-1280x800.png`)

    const portal = JSON.parse(
      await s.evaluate(`JSON.stringify({
        outcome: document.querySelector('.annex-world-portal[data-site="small-archive"]')?.dataset.outcome ?? null,
        variant: document.querySelector('.annex-world-portal[data-site="small-archive"]')?.dataset.outcomeVariant ?? null,
        renderer: document.querySelector('.annex-world-stage')?.dataset.renderer ?? null,
        // The save present here was written by the app while PLAYING this full-UI run
        // (committing the action persists) — this run seeds nothing.
        savePersistedByPlay: Boolean(localStorage.getItem(${JSON.stringify(SAVE_KEY)})),
      })`),
    )
    console.log(`outcome ${tag}:`, portal, 'expected', expectedOutcome)
    return { tag, expectedOutcome, portal }
  } finally {
    s.kill()
  }
}

// ── Accessibility / viewport variants ────────────────────────────────────────
// Drive the full UI to the room, apply the a11y mode (emulated media and/or the
// app's own root class — the exact class App.tsx toggles from settings), then
// capture the shelf-zero and unlocked phases so each final spatial state is visible.
async function variantRun({ tag, appClass, width = 1280, height = 800, emulatedMedia }) {
  const s = await newSession({ width, height })
  try {
    if (emulatedMedia) await s.send('Emulation.setEmulatedMedia', { features: emulatedMedia })
    if (width < 700) {
      await s.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: true,
      })
    }
    await fullUiToRoom(s)
    if (appClass) {
      await s.evaluate(
        `document.querySelector('.annex-app')?.classList.add(${JSON.stringify(appClass)})`,
      )
      await sleep(150)
    }
    // Reach the shelf-zero phase (3 files + 3 refusals) and capture.
    for (let i = 0; i < 6; i += 1) await clickCategory(s)
    await s.waitFor(`Boolean(document.querySelector('.room-shelf-zero'))`)
    await sleep(200)
    const gShelf = JSON.parse(await s.evaluate(geometryExpr))
    await s.shot(`variant-${tag}-shelf-zero.png`)
    // Reach the unlocked methods and capture.
    await s.click('.room-shelf-zero')
    await s.waitFor(`document.querySelectorAll('.room-slip').length === 3`)
    await sleep(200)
    // Turn a slip, capture the reading beat, then proceed to the methods.
    await s.click('.room-slip')
    await s.waitFor(`Boolean(document.querySelector('.room-proceed'))`)
    await sleep(200)
    const gReading = JSON.parse(await s.evaluate(geometryExpr))
    await s.shot(`variant-${tag}-reading.png`)
    await s.click('.room-proceed')
    await s.waitFor(`document.querySelectorAll('.classification-room .choice-row').length === 2`)
    await sleep(250)
    const gUnlocked = JSON.parse(await s.evaluate(geometryExpr))
    await s.shot(`variant-${tag}-unlocked.png`)
    console.log(`variant ${tag}: shelf`, {
      overflow: gShelf.inspectorOverflow,
      docOverflow: gShelf.docScrollWidth - gShelf.docClientWidth,
      minInteractive: gShelf.minInteractive,
    }, 'reading', {
      overflow: gReading.inspectorOverflow,
      readingNoScroll: gReading.reading?.noScroll,
      minInteractive: gReading.minInteractive,
    }, 'unlocked', {
      overflow: gUnlocked.inspectorOverflow,
      minInteractive: gUnlocked.minInteractive,
    })
    return { tag, shelf: gShelf, reading: gReading, unlocked: gUnlocked }
  } finally {
    s.kill()
  }
}

const results = { outcomes: [], variants: [] }

console.log('— desktop phase walk —')
await desktopWalk()

console.log('— outcome captures (full UI, no seed) —')
results.outcomes.push(
  await outcomeRun({ methodText: 'Answer the question', tag: 'opened', expectedOutcome: 'shelf-zero-opened' }),
)
results.outcomes.push(
  await outcomeRun({ methodText: 'Seal the prohibited', tag: 'sealed', expectedOutcome: 'index-sealed' }),
)

console.log('— accessibility / viewport variants —')
results.variants.push(await variantRun({ tag: 'mobile-375', width: 375, height: 780 }))
results.variants.push(
  await variantRun({
    tag: 'reduced-motion',
    appClass: 'reduce-motion',
    emulatedMedia: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  }),
)
results.variants.push(await variantRun({ tag: 'high-contrast', appClass: 'high-contrast' }))
results.variants.push(await variantRun({ tag: 'large-text', appClass: 'large-text' }))

writeFileSync(
  join(OUT_DIR, 'outcomes-and-variants.json'),
  JSON.stringify({ when: new Date().toISOString(), url: APP_URL, ...results }, null, 2),
)
console.log('done')
process.exit(0)

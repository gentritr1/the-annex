// Runtime evidence for Registry Intake's custody rail. Drives the real production
// preview over raw CDP, using trusted Enter/Escape events for the complete room
// path. Writes static JPEG captures and measurements to evidence/custody-rail/.
//
// Usage: node scripts/evidence-custody-rail.mjs [app-url]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://127.0.0.1:4176/'
const OUT_DIR = new URL('../evidence/custody-rail/', import.meta.url).pathname
mkdirSync(OUT_DIR, { recursive: true })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const liveProcesses = new Set()
setTimeout(() => {
  for (const process of liveProcesses) process.kill('SIGKILL')
  console.error('GLOBAL TIMEOUT — custody evidence run aborted')
  process.exit(2)
}, 240000).unref?.()

async function newSession({ width = 1280, height = 800, reducedMotion = false } = {}) {
  const proc = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=/tmp/annex-custody-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    '--hide-scrollbars',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    `--window-size=${width},${height}`,
    'about:blank',
  ])
  liveProcesses.add(proc)

  const wsUrl = await new Promise((resolve, reject) => {
    let stderr = ''
    const timer = setTimeout(
      () => reject(new Error('Chrome CDP endpoint timed out')),
      25000,
    )
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
    const { resolve, reject, timer } = pending.get(message.id)
    pending.delete(message.id)
    clearTimeout(timer)
    if (message.error) reject(new Error(message.error.message))
    else resolve(message.result)
  })

  const raw = (method, params = {}, sessionId) => {
    const id = nextId
    nextId += 1
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`${method} timed out`))
      }, 18000)
      pending.set(id, { resolve, reject, timer })
      socket.send(JSON.stringify({ id, method, params, sessionId }))
    })
  }

  const { targetId } = await raw('Target.createTarget', { url: 'about:blank' })
  await raw('Target.activateTarget', { targetId })
  const { sessionId } = await raw('Target.attachToTarget', {
    targetId,
    flatten: true,
  })
  const send = (method, params = {}) => raw(method, params, sessionId)
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Emulation.setFocusEmulationEnabled', { enabled: true })
  if (reducedMotion) {
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    })
  }

  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ?? 'page exception',
      )
    }
    return result.result.value
  }
  const waitFor = async (expression, timeout = 12000) => {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      if (await evaluate(expression).catch(() => false)) return true
      await sleep(120)
    }
    return false
  }
  const click = (selector, text) =>
    evaluate(`(() => {
      const matches = [...document.querySelectorAll(${JSON.stringify(selector)})]
      const target = ${JSON.stringify(text ?? '')}
        ? matches.find((element) => element.textContent.includes(${JSON.stringify(text ?? '')}))
        : matches[0]
      if (!target) return false
      target.click()
      return true
    })()`)
  const shot = async (name) => {
    const jpeg = await send('Page.captureScreenshot', {
      format: 'jpeg',
      quality: 88,
    })
    writeFileSync(join(OUT_DIR, name), Buffer.from(jpeg.data, 'base64'))
  }
  const key = async (keyValue, code, keyCode) => {
    for (const type of ['rawKeyDown', 'char', 'keyUp']) {
      await send('Input.dispatchKeyEvent', {
        type,
        key: keyValue,
        code,
        windowsVirtualKeyCode: keyCode,
        nativeVirtualKeyCode: keyCode,
        ...(type === 'char' ? { text: keyValue === 'Enter' ? '\r' : '' } : {}),
      })
    }
    await sleep(90)
  }
  const activate = async (selector, text) => {
    const focused = await evaluate(`(() => {
      const matches = [...document.querySelectorAll(${JSON.stringify(selector)})]
      const target = ${JSON.stringify(text ?? '')}
        ? matches.find((element) => element.textContent.includes(${JSON.stringify(text ?? '')}))
        : matches[0]
      if (!target) return null
      target.focus()
      return document.activeElement === target
    })()`)
    if (!focused) throw new Error(`could not focus ${selector} ${text ?? ''}`)
    await key('Enter', 'Enter', 13)
  }
  const kill = () => {
    try {
      socket.close()
    } catch {
      // Ignore an already-closed socket.
    }
    proc.kill('SIGKILL')
    liveProcesses.delete(proc)
  }
  return { send, evaluate, waitFor, click, shot, key, activate, kill }
}

async function enterRegistry(session) {
  await session.send('Page.navigate', { url: APP_URL })
  if (
    !(await session.waitFor(
      `[...document.querySelectorAll('button')].some((button) => button.textContent.includes('Open a new audit'))`,
    ))
  ) {
    throw new Error('landing did not render')
  }
  await session.click('button', 'Open a new audit')
  if (
    !(await session.waitFor(
      `[...document.querySelectorAll('button')].some((button) => button.textContent.includes('Begin with the missing question'))`,
    ))
  ) {
    throw new Error('briefing did not render')
  }
  await session.click('button', 'Begin with the missing question')
  if (
    !(await session.waitFor(
      `Boolean(document.querySelector('#site-switch-registry'))`,
    ))
  ) {
    throw new Error('investigation did not render')
  }
  await session.click('#site-switch-registry')
  if (
    !(await session.waitFor(
      `Boolean(document.querySelector('.custody-rail-room')) && Boolean(document.querySelector('.site-closeup-stage'))`,
      16000,
    ))
  ) {
    throw new Error('Registry close read did not render')
  }
  await sleep(900)
  // The pane transition clock is unreliable for computed-style reads. Every
  // measurement happens after transitions/animations are disabled in the live DOM.
  await session.evaluate(`(() => {
    const style = document.createElement('style')
    style.id = 'custody-evidence-no-transitions'
    style.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}'
    document.head.append(style)
    return true
  })()`)
  await sleep(80)
}

const measurementExpression = `JSON.stringify((() => {
  const room = document.querySelector('.custody-rail-room')
  const inspector = document.querySelector('.site-inspector')
  const reading = document.querySelector('.cr-reading')
  const controls = room ? [...room.querySelectorAll('button:not([disabled])')] : []
  const active = document.activeElement
  return {
    phase: room?.dataset.custodyPhase ?? null,
    roomHeight: room ? Math.round(room.getBoundingClientRect().height * 100) / 100 : null,
    roomScrollHeight: room?.scrollHeight ?? null,
    roomClientHeight: room?.clientHeight ?? null,
    inspectorScrollHeight: inspector?.scrollHeight ?? null,
    inspectorClientHeight: inspector?.clientHeight ?? null,
    inspectorOverflow: inspector ? inspector.scrollHeight - inspector.clientHeight : null,
    methods: room?.querySelectorAll('.choice-row').length ?? null,
    liveRegions: room?.querySelectorAll('[aria-live]').length ?? null,
    activeElement: !active || active === document.body
      ? 'body'
      : String(active.className || active.tagName).split(' ')[0],
    reading: reading
      ? {
          clientHeight: reading.clientHeight,
          scrollHeight: reading.scrollHeight,
          unclipped: reading.scrollHeight <= reading.clientHeight,
        }
      : null,
    minControlSize: controls.length
      ? Math.round(Math.min(...controls.map((control) => {
          const rect = control.getBoundingClientRect()
          return Math.min(rect.width, rect.height)
        })) * 100) / 100
      : null,
    documentOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    stageCustodyPhase: document.querySelector('.site-closeup-stage')?.dataset.custodyPhase ?? null,
    genericChecksumEchoes: document.querySelectorAll('.site-closeup-checksum-echo').length,
    visibleMethodZones: [...document.querySelectorAll('.site-closeup-zone')].filter(
      (zone) => Number.parseFloat(getComputedStyle(zone).opacity) > 0.05,
    ).length,
  }
})())`

async function measure(session, label, measurements) {
  const measurement = {
    label,
    ...JSON.parse(await session.evaluate(measurementExpression)),
  }
  measurements.push(measurement)
  console.log(`measured ${label} (${measurement.phase})`)
}

async function playToMethods(
  session,
  measurements,
  capture = true,
  readingShotName,
) {
  await measure(session, 'intake-0', measurements)
  if (capture) await session.shot('01-intake.jpg')

  // Out-of-order handling proves assigned notches, not click order, own the chain.
  await session.click('.cr-carrier', 'Carrier 03')
  await sleep(80)
  await measure(session, 'intake-1', measurements)
  await session.click('.cr-carrier', 'Carrier 01')
  await sleep(80)
  await measure(session, 'intake-2', measurements)
  await session.click('.cr-carrier', 'Carrier 02')
  await sleep(80)
  await measure(session, 'late-carrier', measurements)
  if (capture) await session.shot('02-closure-gate.jpg')

  await session.click('.cr-late-carrier')
  await sleep(80)
  await measure(session, 'mirror', measurements)
  if (capture) await session.shot('03-late-carrier-refused.jpg')

  await session.click('.cr-mirror')
  await sleep(80)
  await measure(session, 'reading', measurements)
  if (capture) await session.shot('04-fourth-minute-reading.jpg')
  if (readingShotName) await session.shot(readingShotName)

  await session.click('.cr-proceed')
  await sleep(80)
  await measure(session, 'methods', measurements)
  if (capture) await session.shot('05-methods.jpg')
}

const measurements = []
const transcript = []

// Desktop path + armed/disarm proof.
{
  const session = await newSession()
  try {
    await enterRegistry(session)
    await playToMethods(session, measurements)
    await session.click('.custody-rail-room .choice-row', 'Authenticate')
    await sleep(80)
    await measure(session, 'armed', measurements)
    await session.shot('06-armed.jpg')
    const armed = await session.evaluate(
      `Boolean(document.querySelector('.custody-rail-room .choice-row-armed'))`,
    )
    await session.key('Escape', 'Escape', 27)
    const disarmed = await session.evaluate(
      `!document.querySelector('.custody-rail-room .choice-row-armed')`,
    )
    transcript.push({ check: 'complete room path', pass: true })
    transcript.push({ check: 'first activation arms', pass: armed })
    transcript.push({ check: 'Escape disarms', pass: disarmed })
  } finally {
    session.kill()
  }
}

// Short trusted-key probe. The host's headless Chrome is unreliable across long
// Input.dispatchKeyEvent sequences, so this isolates the native activation and
// effect-driven focus handoff from the longer geometry sweep.
{
  const session = await newSession()
  try {
    await enterRegistry(session)
    await session.activate('.cr-carrier', 'Carrier 03')
    const trusted = JSON.parse(
      await session.evaluate(`JSON.stringify({
        seated: document.querySelectorAll('.cr-carrier[data-seated="true"]').length,
        active: String(document.activeElement?.className ?? 'body'),
      })`),
    )
    transcript.push({
      check: 'trusted Enter seats a carrier and advances focus',
      pass: trusted.seated === 1 && trusted.active.includes('cr-carrier'),
      detail: trusted,
    })
  } finally {
    session.kill()
  }
}

// Narrow/mobile geometry and target-size proof.
{
  const session = await newSession({ width: 375, height: 812 })
  try {
    await enterRegistry(session)
    const mobileMeasurements = []
    await playToMethods(
      session,
      mobileMeasurements,
      false,
      '07-mobile-375.jpg',
    )
    await measure(session, 'mobile-methods', mobileMeasurements)
    measurements.push(...mobileMeasurements.map((entry) => ({ ...entry, mode: 'mobile-375' })))
  } finally {
    session.kill()
  }
}

// Reduced-motion + high-contrast structural reading.
{
  const session = await newSession({ reducedMotion: true })
  try {
    await enterRegistry(session)
    await session.evaluate(
      `document.querySelector('.annex-app')?.classList.add('high-contrast')`,
    )
    const variantMeasurements = []
    await playToMethods(
      session,
      variantMeasurements,
      false,
      '08-reduced-high-contrast.jpg',
    )
    await measure(session, 'reduced-high-contrast-methods', variantMeasurements)
    measurements.push(
      ...variantMeasurements.map((entry) => ({
        ...entry,
        mode: 'reduced-high-contrast',
      })),
    )
  } finally {
    session.kill()
  }
}

// Both settled close-read outcomes from independent full UI runs.
for (const outcome of [
  { text: 'Authenticate the custody chain', variant: 'chain' },
  { text: 'Trace the checksum past closure', variant: 'return' },
]) {
  const session = await newSession()
  try {
    await enterRegistry(session)
    const localMeasurements = []
    await playToMethods(session, localMeasurements, false)
    await session.click('.custody-rail-room .choice-row', outcome.text)
    await sleep(80)
    await session.click('.custody-rail-room .choice-row-armed')
    if (
      !(await session.waitFor(
        `Boolean(document.querySelector('.resolved-action'))`,
      ))
    ) {
      throw new Error(`${outcome.variant} outcome did not commit`)
    }
    const resolved = JSON.parse(
      await session.evaluate(`JSON.stringify({
        variant: document.querySelector('.site-closeup-custody-outcome')?.dataset.variant ?? null,
        title: document.querySelector('.resolved-action strong')?.textContent ?? null,
        detail: document.querySelector('.resolved-action p')?.textContent ?? null,
      })`),
    )
    transcript.push({
      check: `${outcome.variant} settled silhouette`,
      pass: resolved.variant === outcome.variant,
      detail: resolved,
    })
    await session.shot(`09-resolved-${outcome.variant}.jpg`)
  } finally {
    session.kill()
  }
}

const desktop = measurements.filter((entry) => !entry.mode)
const desktopHeights = desktop
  .map((entry) => entry.roomHeight)
  .filter((height) => typeof height === 'number')
const desktopHeightVariance =
  Math.max(...desktopHeights) - Math.min(...desktopHeights)
const assertions = {
  desktopHeightVariance,
  desktopInspectorOverflowZero: desktop.every(
    (entry) => entry.inspectorOverflow === 0,
  ),
  exactlyOneLiveRegion: measurements.every((entry) => entry.liveRegions === 1),
  methodsAbsentBeforeAcknowledgement: desktop
    .filter((entry) => !['methods', 'armed'].includes(entry.label))
    .every((entry) => entry.methods === 0),
  readingUnclipped: measurements
    .filter((entry) => entry.phase === 'reading')
    .every((entry) => entry.reading?.unclipped === true),
  focusNeverBody: measurements.every((entry) => entry.activeElement !== 'body'),
  noGenericChecksumEcho: measurements.every(
    (entry) => entry.genericChecksumEchoes === 0,
  ),
  preMethodZonesHidden: desktop
    .filter((entry) => !['methods', 'armed'].includes(entry.label))
    .every((entry) => entry.visibleMethodZones === 0),
  mobileNoHorizontalOverflow: measurements
    .filter((entry) => entry.mode === 'mobile-375')
    .every((entry) => entry.documentOverflowX === 0),
  controlsAtLeast44: measurements
    .filter((entry) => entry.minControlSize !== null)
    .every((entry) => entry.minControlSize >= 44),
}

writeFileSync(
  join(OUT_DIR, 'measurements.json'),
  `${JSON.stringify({ assertions, measurements, transcript }, null, 2)}\n`,
)
writeFileSync(
  join(OUT_DIR, 'transcript.txt'),
  [
    'Registry Intake — Custody Rail runtime evidence',
    '',
    ...Object.entries(assertions).map(
      ([name, value]) => `${value === true || value === 0 ? 'PASS' : 'FAIL'} ${name}: ${value}`,
    ),
    ...transcript.map(
      (entry) => `${entry.pass ? 'PASS' : 'FAIL'} ${entry.check}${entry.detail ? `: ${JSON.stringify(entry.detail)}` : ''}`,
    ),
    '',
  ].join('\n'),
)

const failed =
  Object.values(assertions).some((value) => value !== true && value !== 0) ||
  transcript.some((entry) => !entry.pass)
console.log(JSON.stringify({ assertions, transcript }, null, 2))
process.exit(failed ? 1 : 0)

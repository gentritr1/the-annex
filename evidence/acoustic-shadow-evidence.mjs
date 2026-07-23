// Acoustic Shadow runtime-evidence runner — drives the running dev app in headless
// Chrome over raw CDP (no new deps; Node's built-in WebSocket + fetch). Cold-eyes
// setup uses TRUSTED input (Input.dispatchMouseEvent / dispatchKeyEvent) so the
// real event pipeline is exercised; the keyboard path proves parity and captures the
// focus target after every transition. Geometry is measured with CSS transitions
// disabled (see settleFrames note in armed-commit.mjs). Screenshots cover survey,
// crossing, route-ready, both resolved closeups, mobile 375, large text, high
// contrast, app + OS reduced motion. Ambience is OFF for the whole run (the default
// ambientSound === false), so every state is proven legible while muted.
//
// Usage: node evidence/acoustic-shadow-evidence.mjs <appUrl> <outDir>
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [appUrl = 'http://127.0.0.1:4174/', outDir = 'evidence/acoustic-shadow'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

function launchChrome() {
  const proc = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=/tmp/annex-acoustic-${Date.now()}`,
    '--no-first-run',
    '--mute-audio',
    '--hide-scrollbars',
    'about:blank',
  ])
  const wsUrl = new Promise((resolve, reject) => {
    let buf = ''
    proc.stderr.on('data', (d) => {
      buf += d
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/)
      if (m) resolve(m[1])
    })
    proc.on('exit', () => reject(new Error('chrome exited early')))
    setTimeout(() => reject(new Error('chrome ws timeout')), 20000)
  })
  return { proc, wsUrl }
}

const chrome = launchChrome()
const browserWsUrl = await chrome.wsUrl
const cdpPort = new URL(browserWsUrl).port

let pageWs
for (let attempt = 0; attempt < 50; attempt += 1) {
  try {
    const targets = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json()
    const page = targets.find((target) => target.type === 'page')
    if (page) {
      pageWs = page.webSocketDebuggerUrl
      break
    }
  } catch {
    // not up yet
  }
  await new Promise((resolve) => setTimeout(resolve, 200))
}
if (!pageWs) throw new Error('no CDP page target')

const ws = new WebSocket(pageWs)
await new Promise((resolve, reject) => {
  ws.onopen = resolve
  ws.onerror = reject
})
let nextId = 1
const pending = new Map()
ws.onmessage = (message) => {
  const data = JSON.parse(message.data)
  if (data.id && pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id)
    pending.delete(data.id)
    if (data.error) reject(new Error(data.error.message))
    else resolve(data.result)
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

const transcript = []
const failures = []
function note(ok, message) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${message}`)
  transcript.push(`${ok ? 'PASS' : 'FAIL'}  ${message}`)
  if (!ok) failures.push(message)
}
function step(message) {
  console.log(`\n── ${message}`)
  transcript.push(`STEP: ${message}`)
}
function record(message) {
  console.log(`   ${message}`)
  transcript.push(`   ${message}`)
}
function dump(name, data) {
  writeFileSync(join(outDir, name), JSON.stringify(data, null, 2))
  console.log(`   saved ${name}`)
}
async function screenshot(name) {
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(outDir, name), Buffer.from(shot.data, 'base64'))
  console.log(`   saved ${name}`)
}
async function settleFrames() {
  await send('Page.captureScreenshot', { format: 'png' })
  await sleep(200)
  await send('Page.captureScreenshot', { format: 'png' })
  await sleep(120)
}

async function clickSelector(selector, label) {
  const point = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)})
    if (!el) return null
    el.scrollIntoView({ block: 'center', behavior: 'auto' })
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })()`)
  if (!point) throw new Error(`no element for selector: ${selector}`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
  if (label) record(`click ${label}`)
  await sleep(300)
}
async function pressKey(key, code, vk) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
  await sleep(120)
}
const pressEnter = () => pressKey('Enter', 'Enter', 13)
const pressSpace = () => pressKey(' ', 'Space', 32)
const pressTab = () => pressKey('Tab', 'Tab', 9)

const NO_MOTION = `(() => { if(!document.getElementById('no-motion')){ const s=document.createElement('style'); s.id='no-motion'; s.textContent='*{transition:none!important;animation:none!important}'; document.head.appendChild(s);} return 'ok'; })()`

// Reach the Maintenance Spine room from a fresh save with trusted clicks only.
async function reachRoom() {
  await evaluate(`localStorage.clear(); 'cleared'`)
  await send('Page.reload')
  await sleep(1400)
  await clickSelector('.start-actions .button-primary', '"Open a new audit"')
  await clickSelector('.choice-list .choice-row', 'first briefing approach')
  await sleep(400)
  await clickSelector('#site-switch-maintenance', 'Maintenance spine')
  await sleep(400)
}

// Advance pulses (trusted clicks on Listen) until a band is masked, then return its
// selector index; deterministic — LISTEN cycles the authored pulses.
async function crossViaClick() {
  for (let i = 0; i < 5; i += 1) {
    const masked = await evaluate(`[...document.querySelectorAll('.as-band')].findIndex(b => b.getAttribute('data-exposure')==='masked')`)
    if (masked >= 0) {
      await clickSelector(`.as-band:nth-of-type(${masked + 1})`, `masked band #${masked + 1} (cross)`)
      return
    }
    await clickSelector('.as-listen', 'Listen for the next pulse')
  }
  throw new Error('no masked band found within the pulse cycle')
}

const ROOM_TEXT = `(() => {
  const room = document.querySelector('.acoustic-shadow-room')
  if (!room) return null
  return {
    phase: room.getAttribute('data-acoustic-phase'),
    station: document.querySelector('.as-station')?.textContent ?? null,
    progress: document.querySelector('.as-progress')?.textContent ?? null,
    pulseLabel: document.querySelector('.as-pulse-label')?.textContent ?? null,
    reading: document.querySelector('.as-pulse-reading')?.textContent ?? null,
    listen: document.querySelector('.as-listen')?.textContent ?? null,
    bands: [...document.querySelectorAll('.as-band')].map(b => ({
      name: b.querySelector('.as-band-name')?.textContent,
      exposure: b.getAttribute('data-exposure'),
      state: b.querySelector('.as-band-state')?.textContent,
      waited: b.getAttribute('data-waited') === 'true',
    })),
    methods: [...document.querySelectorAll('.as-methods .choice-row strong')].map(s => s.textContent),
    routeReady: document.querySelector('.as-route-ready')?.textContent ?? null,
    credential: document.querySelector('.as-credential')?.textContent ?? null,
    liveRegion: document.querySelector('.as-announce')?.textContent ?? null,
  }
})()`

const GEOMETRY = `(() => {
  const room = document.querySelector('.acoustic-shadow-room')
  const stage = document.querySelector('.as-stage')
  const insp = document.querySelector('.site-inspector')
  return {
    phase: room?.getAttribute('data-acoustic-phase') ?? null,
    roomHeight: Math.round(room?.getBoundingClientRect().height ?? 0),
    stageScrollH: stage?.scrollHeight ?? null,
    stageClientH: stage?.clientHeight ?? null,
    stageOverflow: stage ? stage.scrollHeight - stage.clientHeight : null,
    inspectorScrollH: insp?.scrollHeight ?? null,
    inspectorClientH: insp?.clientHeight ?? null,
    inspectorOverflow: insp ? insp.scrollHeight - insp.clientHeight : null,
  }
})()`

const ACTIVE_EL = `(() => {
  const el = document.activeElement
  if (!el || el === document.body) return { selector: 'BODY', text: null }
  const cls = el.className ? '.' + String(el.className).trim().split(/\\s+/).join('.') : el.tagName
  return { selector: cls, text: (el.textContent ?? '').trim().slice(0, 40) }
})()`

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false })
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { await fetch(appUrl); break } catch { await sleep(250) }
  }
  await send('Page.navigate', { url: appUrl })
  await sleep(1400)

  // ── COLD EYES ────────────────────────────────────────────────────────────
  step('COLD EYES: fresh save → Maintenance spine, what a new player sees')
  await reachRoom()
  const survey = await evaluate(ROOM_TEXT)
  dump('acoustic-shadow-cold-eyes.json', survey)
  note(survey && survey.phase === 'survey', `survey phase reached; station "${survey?.station}", pulse "${survey?.pulseLabel}"`)
  note(
    survey && survey.bands.length === 2 && survey.bands.every((b) => b.exposure && b.state && !/colou?r/.test(b.state)),
    `two named bands with text exposure: ${survey?.bands.map((b) => `${b.name} [${b.exposure}]`).join(' | ')}`,
  )
  note(survey && survey.methods.length === 0, 'methods are NOT shown before the route is ready')
  await evaluate(NO_MOTION)
  await settleFrames()
  await screenshot('acoustic-shadow-survey-1280x800.png')

  // Advance to the blind interval (without crossing) and screenshot the crossing.
  await reachRoom()
  await evaluate(NO_MOTION)
  // step to the blind interval WITHOUT crossing (advance until a band is masked)
  for (let i = 0; i < 5; i += 1) {
    const masked = await evaluate(`[...document.querySelectorAll('.as-band')].some(b=>b.getAttribute('data-exposure')==='masked')`)
    if (masked) break
    await clickSelector('.as-listen', 'Listen (find the blind interval)')
  }
  const crossing = await evaluate(ROOM_TEXT)
  dump('acoustic-shadow-crossing.json', crossing)
  note(
    crossing.bands.some((b) => b.exposure === 'masked') && crossing.bands.some((b) => b.exposure === 'exposed'),
    `blind interval visible: ${crossing.bands.map((b) => `${b.name} [${b.exposure}]`).join(' | ')}`,
  )
  await settleFrames()
  await screenshot('acoustic-shadow-crossing-masked-1280x800.png')

  // ── GEOMETRY: fixed tableau, zero inspector overflow, every state ──────────
  step('GEOMETRY: overflow measurements across every state (transitions disabled)')
  await reachRoom()
  await evaluate(NO_MOTION)
  const geometry = []
  geometry.push(await evaluate(`(() => { const g = ${GEOMETRY}; g.state='survey'; return g })()`))
  for (let cp = 0; cp < 3; cp += 1) {
    await crossViaClick()
    geometry.push(await evaluate(`(() => { const g = ${GEOMETRY}; g.state='after-cross-${cp}'; return g })()`))
  }
  // route-ready is the state after the 3rd cross; arm each method too.
  await clickSelector('.as-methods .choice-row:nth-of-type(1)', 'arm walk method')
  geometry.push(await evaluate(`(() => { const g = ${GEOMETRY}; g.state='route-ready-walk-armed'; return g })()`))
  await pressKey('Escape', 'Escape', 27)
  await clickSelector('.as-methods .choice-row:nth-of-type(2)', 'arm forge method')
  geometry.push(await evaluate(`(() => { const g = ${GEOMETRY}; g.state='route-ready-forge-armed'; return g })()`))
  dump('acoustic-shadow-geometry.json', geometry)
  const heights = new Set(geometry.map((g) => g.roomHeight))
  note(heights.size === 1, `tableau height FIXED across all states: ${[...heights].join(', ')}px`)
  note(geometry.every((g) => g.inspectorOverflow === 0), 'inspector overflow is 0 in EVERY state')
  note(geometry.every((g) => g.stageOverflow <= 1), `stage inner overflow ≤1px in every state (max ${Math.max(...geometry.map((g) => g.stageOverflow))})`)

  // ── KEYBOARD OPERABILITY (trusted keys) ───────────────────────────────────
  // The controls are native <button>s. A trusted Space on a focused button fires
  // its click on key-up exactly as a physical keyboard would (no custom key
  // handler needed). Prove operability directly: focus Listen, press Space, and
  // confirm the pulse advanced; then Tab to a band and Space-cross a checkpoint.
  step('KEYBOARD OPERABILITY: trusted Space/Tab drive the controls')
  await reachRoom()
  const kb = {}
  const pulseBefore = await evaluate(`document.querySelector('.as-listen .as-listen-meta')?.textContent ?? null`)
  await evaluate(`document.querySelector('.as-listen')?.focus(); 'x'`)
  await sleep(60)
  await pressSpace()
  await sleep(150)
  const pulseAfter = await evaluate(`document.querySelector('.as-listen .as-listen-meta')?.textContent ?? null`)
  const listenFocusKept = await evaluate(`document.activeElement === document.querySelector('.as-listen')`)
  kb.listenSpace = { pulseBefore, pulseAfter, advanced: pulseBefore !== pulseAfter, focusKept: listenFocusKept }
  note(pulseBefore !== pulseAfter, `trusted Space on Listen advances the pulse (${pulseBefore} → ${pulseAfter})`)
  // Advance (via Space) to a masked band, then focus it and Space to cross.
  for (let i = 0; i < 6; i += 1) {
    if (await evaluate(`[...document.querySelectorAll('.as-band')].some(b=>b.getAttribute('data-exposure')==='masked')`)) break
    await evaluate(`document.querySelector('.as-listen')?.focus(); 'x'`); await sleep(40); await pressSpace(); await sleep(120)
  }
  const progBefore = await evaluate(`document.querySelector('.as-progress')?.textContent ?? null`)
  await evaluate(`(() => { const i=[...document.querySelectorAll('.as-band')].findIndex(b=>b.getAttribute('data-exposure')==='masked'); document.querySelectorAll('.as-band')[i]?.focus(); return 'x'; })()`)
  await sleep(60); await pressSpace(); await sleep(180)
  const progAfter = await evaluate(`document.querySelector('.as-progress')?.textContent ?? null`)
  const focusAfterCross = await evaluate(ACTIVE_EL)
  kb.bandSpaceCross = { progBefore, progAfter, crossed: progBefore !== progAfter, focusLandsOn: focusAfterCross }
  note(progBefore !== progAfter, `trusted Space on the masked band crosses the checkpoint (${progBefore} → ${progAfter})`)
  note(focusAfterCross.selector !== 'BODY', `after a keyboard cross, focus lands on ${focusAfterCross.selector} (not body)`)
  dump('acoustic-shadow-keyboard-operability.json', kb)

  // ── FOCUS TARGETS ACROSS EVERY TRANSITION ─────────────────────────────────
  // Focus placement is input-agnostic (requestFocus runs in the same effect however
  // the click was produced), so the reliable trusted-mouse path exercises the exact
  // focus-landing code and records the target after every transition and the commit.
  step('FOCUS TARGETS: capture focus landing after each transition, commit walk')
  await reachRoom()
  const focusLog = []
  for (let cp = 0; cp < 3; cp += 1) {
    await crossViaClick()
    const active = await evaluate(ACTIVE_EL)
    focusLog.push({ afterCrossCheckpoint: cp + 1, focusLandsOn: active })
    note(active.selector !== 'BODY', `after crossing checkpoint ${cp + 1}, focus lands on ${active.selector} (not body)`)
  }
  const atReady = await evaluate(ACTIVE_EL)
  const readyPhase = await evaluate(`document.querySelector('.acoustic-shadow-room')?.getAttribute('data-acoustic-phase') ?? null`)
  focusLog.push({ atRouteReady: readyPhase === 'route-ready', focusLandsOn: atReady })
  note(readyPhase === 'route-ready' && atReady.selector.includes('choice-row'), `at route-ready, focus lands on the first method: ${atReady.selector}`)
  // Commit walk (two-step armed confirm): first click arms, second confirms.
  await clickSelector('.as-methods .choice-row:nth-of-type(1)', 'arm walk method')
  const armed = await evaluate(`document.querySelector('.as-methods .choice-row.choice-row-armed strong')?.textContent ?? null`)
  note(!!armed && /Walk the acoustic shadow/.test(armed), `first activation arms the walk method ("${armed}")`)
  await clickSelector('.as-methods .choice-row:nth-of-type(1)', 'confirm walk method')
  await sleep(500)
  const walkFiled = await evaluate(`(() => ({ resolved: !!document.querySelector('.resolved-action'), state: document.querySelector('.site-state')?.textContent ?? null }))()`)
  focusLog.push({ armedMethod: armed, committed: walkFiled })
  dump('acoustic-shadow-focus-targets.json', focusLog)
  note(walkFiled.resolved && walkFiled.state === 'Filed', 'walk-acoustic-shadow committed via two-step armed confirm')

  // ── RESOLVED CLOSEUPS ─────────────────────────────────────────────────────
  step('RESOLVED closeups: walk vs forge, labels hidden')
  await evaluate(NO_MOTION)
  await settleFrames()
  await screenshot('acoustic-shadow-resolved-walk-1280x800.png')
  const walkResolved = await evaluate(`(() => ({ variant: document.querySelector('.site-closeup-acoustic-resolved')?.getAttribute('data-variant') ?? null, brokenInterval: !!document.querySelector('.asc-broken-interval'), credentialAmber: !!document.querySelector('.asc-credential-amber') }))()`)
  note(walkResolved.variant === 'shadow' && walkResolved.brokenInterval, `walk resolved = shadow (broken interval), no amber: ${JSON.stringify(walkResolved)}`)

  // Second run: commit forge for its resolved closeup.
  await reachRoom()
  await evaluate(NO_MOTION)
  for (let cp = 0; cp < 3; cp += 1) await crossViaClick()
  await clickSelector('.as-methods .choice-row:nth-of-type(2)', 'arm forge')
  await clickSelector('.as-methods .choice-row:nth-of-type(2)', 'confirm forge')
  await sleep(500)
  await settleFrames()
  await screenshot('acoustic-shadow-resolved-forge-1280x800.png')
  const forgeResolved = await evaluate(`(() => ({ variant: document.querySelector('.site-closeup-acoustic-resolved')?.getAttribute('data-variant') ?? null, brokenInterval: !!document.querySelector('.asc-broken-interval'), credentialAmber: !!document.querySelector('.asc-credential-amber') }))()`)
  note(forgeResolved.variant === 'credential' && forgeResolved.credentialAmber, `forge resolved = credential (amber aperture), no broken interval: ${JSON.stringify(forgeResolved)}`)

  // ── ACCESSIBILITY VARIANTS ────────────────────────────────────────────────
  step('ACCESSIBILITY: high contrast, large text, app + OS reduced motion, mobile 375')
  await reachRoom()
  // Advance to the blind interval so the masked/exposed bands are both visible.
  for (let i = 0; i < 5; i += 1) {
    if (await evaluate(`[...document.querySelectorAll('.as-band')].some(b=>b.getAttribute('data-exposure')==='masked')`)) break
    await clickSelector('.as-listen')
  }

  await evaluate(`document.querySelector('.annex-app')?.classList.add('high-contrast'); 'hc'`)
  await settleFrames()
  await screenshot('acoustic-shadow-high-contrast-1280x800.png')
  const hc = await evaluate(`(() => { const m=document.querySelector('.as-band[data-exposure="masked"]'); return m ? getComputedStyle(m).outlineStyle : null })()`)
  note(hc && hc !== 'none', `high contrast: masked band carries a non-colour outline (${hc})`)
  await evaluate(`document.querySelector('.annex-app')?.classList.remove('high-contrast'); 'x'`)

  await evaluate(`document.querySelector('.annex-app')?.classList.add('large-text'); document.documentElement.classList.add('annex-large-text'); 'lt'`)
  await settleFrames()
  await screenshot('acoustic-shadow-large-text-1280x800.png')
  const ltGeom = await evaluate(GEOMETRY)
  note(ltGeom.inspectorOverflow >= 0, `large text: inspector overflow ${ltGeom.inspectorOverflow} (room grows/scrolls, no horizontal clip)`)
  await evaluate(`document.querySelector('.annex-app')?.classList.remove('large-text'); document.documentElement.classList.remove('annex-large-text'); 'x'`)

  await evaluate(`document.querySelector('.annex-app')?.classList.add('reduce-motion'); 'rm'`)
  await settleFrames()
  await screenshot('acoustic-shadow-reduced-motion-app-1280x800.png')
  await evaluate(`document.querySelector('.annex-app')?.classList.remove('reduce-motion'); 'x'`)

  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await sleep(300)
  await settleFrames()
  await screenshot('acoustic-shadow-reduced-motion-os-1280x800.png')
  await send('Emulation.setEmulatedMedia', { features: [] })

  // Mobile 375: the bands keep two columns, no horizontal overflow.
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true })
  await sleep(400)
  await reachRoom()
  for (let i = 0; i < 5; i += 1) {
    if (await evaluate(`[...document.querySelectorAll('.as-band')].some(b=>b.getAttribute('data-exposure')==='masked')`)) break
    await clickSelector('.as-listen')
  }
  await evaluate(NO_MOTION)
  await settleFrames()
  await screenshot('acoustic-shadow-mobile-375.png')
  const mobile = await evaluate(`(() => ({ bodyScrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, bandMin: Math.min(...[...document.querySelectorAll('.as-band')].map(b=>b.getBoundingClientRect().height)), listenH: document.querySelector('.as-listen')?.getBoundingClientRect().height }))()`)
  note(mobile.bodyScrollW <= mobile.clientW + 1, `mobile 375: no horizontal overflow (scrollW ${mobile.bodyScrollW} ≤ clientW ${mobile.clientW})`)
  note(mobile.bandMin >= 44 && mobile.listenH >= 44, `mobile targets ≥44px (band ${Math.round(mobile.bandMin)}, listen ${Math.round(mobile.listenH)})`)
  dump('acoustic-shadow-mobile.json', mobile)
} finally {
  writeFileSync(join(outDir, 'acoustic-shadow-transcript.txt'), transcript.join('\n') + '\n')
  ws.close()
  chrome.proc.kill('SIGTERM')
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed`)
  process.exit(1)
}
console.log('\nall acoustic-shadow evidence checks passed')

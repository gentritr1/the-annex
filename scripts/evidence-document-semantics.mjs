// Evidence for E6b — document semantics (Pentiment ink) on the RECORD surfaces:
// the evidence tab's four authored statuses, the ledger's contradiction pair read
// as two hands, and the pressed-seal register on precedent/contradiction
// citations. Driven against the real Vite app in headless Chrome over raw CDP —
// no added dependencies.
//
// WHY THIS SCRIPT HAS TWO MODES, AND WHY THE BASELINE ONE RAN FIRST.
// The item's load-bearing contract is not "the ink looks like ink" (that is the
// user's eyeball). It is the REDUNDANCY CONTRACT: under `settings.easyRead`,
// every treatment must return to the register the surface had BEFORE this round.
// An assertion written only against the post-change build cannot prove that — it
// can only prove Easy Read differs from plain, which a wrong flattening would
// also satisfy. So:
//
//   node scripts/evidence-document-semantics.mjs --baseline   (run at HEAD~,
//     i.e. with none of the E6b CSS present) writes
//     evidence/document-semantics/baseline-computed.json and the `-before-`
//     screenshots. This is the pre-fix artifact.
//
//   node scripts/evidence-document-semantics.mjs             (run after) asserts,
//     property by property, that the EASY-READ computed style of every treated
//     element is byte-identical to that baseline file's easy-read capture, and —
//     the non-vacuity half — that the PLAIN computed style of every treated
//     element DIFFERS from its plain baseline. Equality alone would pass if the
//     treatments had never applied at all.
//
// It also measures the two degradation paths the brief names: `.high-contrast`
// (the treatments keep their FORM carriers — border-style, weight, indent — and
// drop every chromatic one, so the correction hand is never distinguishable by
// hue alone) and `forced-colors: active` (every treatment colour resolves to the
// element's own currentColor).
//
// The exhibit list is SEEDED, and that is disclosed rather than hidden: an
// authored Case 77 route admits ONE exhibit per closed location, so no single
// real run puts all four statuses on one panel without driving four site rituals.
// The harness therefore plays ONE real filing (Care ward 12 · listen), then
// rewrites `evidence` in the app's own save to four real Case 77 exhibit ids —
// one per status — and reloads through the app's own Continue path, so the state
// is decoded by `decodeGameState` and rendered by the real component. Only the
// ROUTE to the state is seeded; every string, status and definition on screen is
// authored content. The ledger, its contradiction pair and its citations come
// from the real filing, unseeded.
//
// Every computed read is taken with transitions AND animations disabled and two
// frames allowed to pass (the recorded transition-clock scar). Every interaction
// uses el.click() — never a synthetic dispatchEvent (the preview-pane scar).
//
// Usage: node scripts/evidence-document-semantics.mjs [--baseline] [app-url]
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const BASELINE_MODE = args.includes('--baseline')
const APP_URL = args.find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:3000/'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT_DIR = new URL('../evidence/document-semantics/', import.meta.url).pathname
mkdirSync(OUT_DIR, { recursive: true })
const BASELINE_FILE = join(OUT_DIR, 'baseline-computed.json')
const STAGE = BASELINE_MODE ? 'before' : 'after'

const SETTINGS_KEY = 'the-annex.accessibility.v1'
const SAVE_KEY = 'the-annex.case-77.save.v1'

// The four exhibits, one per authored EvidenceStatus, copied from
// src/game/cases/case77.ts. They are listed in DEFINITION order because the
// evidence panel filters the definition list, not the state list — so the row
// index of each status is fixed and the selectors below can name it.
const SEEDED_EXHIBITS = [
  { id: 'custody-chain', status: 'verified', title: 'Custody chain 77-A' },
  { id: 'sensory-echo', status: 'testimony', title: 'The rain in room twelve' },
  { id: 'contradictory-scar', status: 'disputed', title: 'Scar without tissue' },
  { id: 'sensor-omission', status: 'anomaly', title: 'The absent corridor' },
]

// THE TREATED ELEMENTS. Every selector is written so it resolves IDENTICALLY
// before and after the round — positional (`nth-child` / `nth-of-type`), never
// via a class or attribute this round introduces. A baseline captured through
// `[data-status]` would have found nothing and the equality gate would have
// passed on an empty set.
const TREATED = [
  ['evidence claim · verified', '.evidence-list > li:nth-child(1) > p', 'evidence'],
  ['evidence claim · testimony', '.evidence-list > li:nth-child(2) > p', 'evidence'],
  ['evidence claim · disputed', '.evidence-list > li:nth-child(3) > p', 'evidence'],
  ['evidence claim · anomaly', '.evidence-list > li:nth-child(4) > p', 'evidence'],
  ['evidence contradiction · verified', '.evidence-list > li:nth-child(1) details p', 'evidence'],
  ['evidence contradiction · testimony', '.evidence-list > li:nth-child(2) details p', 'evidence'],
  ['evidence contradiction · disputed', '.evidence-list > li:nth-child(3) details p', 'evidence'],
  ['evidence contradiction · anomaly', '.evidence-list > li:nth-child(4) details p', 'evidence'],
  ['ledger pair · the claim', '.ledger-pair > p:nth-of-type(1)', 'ledger'],
  ['ledger pair · against it', '.ledger-pair > p:nth-of-type(2)', 'ledger'],
  ['ledger pair · correction label', '.ledger-pair > p:nth-of-type(2) > .rail-label', 'ledger'],
  ['ledger pair · seal citation', '.ledger-pair > p:nth-of-type(3)', 'ledger'],
]

// The properties a document treatment can move. Chromatic and formal carriers are
// captured separately so the high-contrast gate can require the SECOND set to
// survive while the first goes neutral.
const FORM_PROPS = [
  'fontWeight',
  'fontStyle',
  'fontFamily',
  'fontSize',
  'letterSpacing',
  'paddingLeft',
  'borderLeftWidth',
  'borderLeftStyle',
  'textDecorationLine',
  'textDecorationStyle',
  'textUnderlineOffset',
  'display',
  'marginTop',
  'textTransform',
]
const COLOR_PROPS = ['color', 'borderLeftColor', 'textDecorationColor', 'backgroundColor']
const ALL_PROPS = [...FORM_PROPS, ...COLOR_PROPS]

const chromeProcess = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-docsem-${Date.now()}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--mute-audio',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1280,800',
  'about:blank',
])

const killTimer = setTimeout(() => {
  console.error('GLOBAL TIMEOUT — aborting document-semantics evidence run')
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
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
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
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
}

const report = {
  url: APP_URL,
  mode: BASELINE_MODE ? 'baseline' : 'verify',
  capturedAt: new Date().toISOString(),
  node: process.version,
  checks: [],
  shots: [],
  computed: {},
  notes: {},
}
function record(step, pass, detail) {
  report.checks.push({ step, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${step}  ${JSON.stringify(detail)?.slice(0, 400)}`)
}

const FREEZE = `(async () => {
  document.getElementById('annex-docsem-freeze')?.remove()
  const style = document.createElement('style')
  style.id = 'annex-docsem-freeze'
  style.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }'
  document.head.appendChild(style)
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  return true
})()`
const freeze = () => evaluate(FREEZE)
const unfreeze = () =>
  evaluate(`(() => { document.getElementById('annex-docsem-freeze')?.remove(); return true })()`)

async function shot(name) {
  await sleep(420)
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  const file = join(OUT_DIR, `${name}-${STAGE}-${viewport.width}x${viewport.height}.png`)
  writeFileSync(file, Buffer.from(data, 'base64'))
  report.shots.push(file.split('/').pop())
  return file.split('/').pop()
}

// ── Navigation ──────────────────────────────────────────────────────────────

let bootCounter = 0
async function bootFreshRun() {
  bootCounter += 1
  await send('Page.navigate', { url: 'about:blank' })
  await sleep(180)
  await send('Page.navigate', { url: APP_URL })
  await waitFor(`document.readyState === 'complete'`)
  await evaluate(`(() => {
    try { window.localStorage.clear() } catch { /* ignore */ }
    window.__annexStale = true
    return true
  })()`)
  await send('Page.navigate', { url: `${APP_URL}${APP_URL.includes('?') ? '&' : '?'}boot=${bootCounter}` })
  if (!(await waitFor(`window.__annexStale === undefined && document.readyState === 'complete'`))) {
    throw new Error('the fresh document never became live')
  }
  if (!(await waitForText('button', 'Open a new audit'))) throw new Error('landing did not render')
  await click('button', 'Open a new audit')
  if (!(await waitFor(`!!document.querySelector('.choice-row')`))) throw new Error('briefing did not render')
  await click('.choice-row')
  if (!(await waitFor(`!!document.querySelector('.site-switcher')`))) {
    throw new Error('investigation did not render')
  }
  await sleep(420)
}

async function enterSite(name) {
  if (await evaluate(`!!document.querySelector('.world-return')`)) {
    await click('.world-return')
    await sleep(620)
  }
  const viaPortal = await click('.annex-world-portal', name)
  if (!viaPortal) await click('.site-switch', name)
  await waitFor(`!!document.querySelector('.world-view--closeup')`, 9000)
  await sleep(820)
}

// The one REAL filing every ledger assertion below is written against: Care ward
// 12's first method (listen), armed then confirmed on the plate zone. It admits
// `sensory-echo` and brings the authored contradiction pair with it.
async function fileCareWard() {
  await enterSite('Care ward')
  await click('.scene-zone .choice-row')
  await sleep(260)
  await click('.scene-zone .choice-row')
  if (!(await waitFor(`document.querySelectorAll('.site-switch[data-filed="true"]').length > 0`, 12000))) {
    throw new Error('the Care ward filing never registered')
  }
  await sleep(900)
  for (let i = 0; i < 6; i += 1) {
    if (await evaluate(`!!document.querySelector('.scene-result-dismiss')`)) break
    await click('.scene-beat-advance')
    await sleep(700)
  }
  if (await evaluate(`!!document.querySelector('.scene-result-dismiss')`)) {
    await click('.scene-result-dismiss')
    await sleep(500)
  }
}

// Rewrite ONLY `evidence` in the app's own save, then come back through the app's
// own Continue path so `decodeGameState` validates the result. Disclosed in the
// header: the route is seeded, the content is not.
async function seedFourExhibits(settings) {
  const seeded = await evaluate(`(() => {
    const raw = window.localStorage.getItem(${JSON.stringify(SAVE_KEY)})
    if (!raw) return { ok: false, why: 'no save written' }
    const save = JSON.parse(raw)
    save.evidence = ${JSON.stringify(SEEDED_EXHIBITS.map((e) => e.id))}
    window.localStorage.setItem(${JSON.stringify(SAVE_KEY)}, JSON.stringify(save))
    return { ok: true, phase: save.phase, sites: save.completedSites, actions: save.completedActions }
  })()`)
  if (!seeded.ok) throw new Error(`could not seed the exhibit list: ${seeded.why}`)
  return reloadInto(settings)
}

// Reload with a given accessibility mode and resume the SAME saved run. RESTORE
// keeps `state.settings` (engine.ts:226), which is read from localStorage at
// reducer init — so the mode is a storage write plus a reload, never a UI walk.
async function reloadInto(settings) {
  bootCounter += 1
  await evaluate(`(() => {
    ${settings
      ? `window.localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, ${JSON.stringify(JSON.stringify(settings))});`
      : `window.localStorage.removeItem(${JSON.stringify(SETTINGS_KEY)});`}
    window.__annexStale = true
    return true
  })()`)
  await send('Page.navigate', { url: `${APP_URL}${APP_URL.includes('?') ? '&' : '?'}boot=${bootCounter}` })
  if (!(await waitFor(`window.__annexStale === undefined && document.readyState === 'complete'`))) {
    throw new Error('the reloaded document never became live')
  }
  if (!(await waitForText('button', 'Continue local case'))) {
    throw new Error('the saved run did not offer Continue — the seeded save was rejected by the decoder')
  }
  await click('button', 'Continue local case')
  if (!(await waitFor(`!!document.querySelector('.site-switcher')`))) {
    throw new Error('the restored run did not reach the investigation')
  }
  await sleep(520)
  return true
}

async function openCaseFile(tab) {
  if (!(await evaluate(`!!document.querySelector('.casefile-drawer')`))) {
    await click('.casefile-summon')
    if (!(await waitFor(`!!document.querySelector('.casefile-drawer')`))) {
      throw new Error('the case file never opened')
    }
    await sleep(520)
  }
  await click(`#rail-tab-${tab}`)
  if (!(await waitFor(`!!document.querySelector('#rail-panel-${tab}')`))) {
    throw new Error(`the ${tab} panel never rendered`)
  }
  await sleep(420)
}

async function closeCaseFile() {
  if (await evaluate(`!!document.querySelector('.casefile-drawer')`)) {
    await click('.casefile-close')
    await sleep(420)
  }
}

// ── The measurement ─────────────────────────────────────────────────────────

// Open every <details> on the panel so the contradiction blocks have a layout to
// read. A closed <details> subtree computes to display:none, and comparing two
// display:none captures would prove nothing about either register.
const OPEN_DETAILS = `(() => {
  let n = 0
  for (const d of document.querySelectorAll('.rail-panel details')) { if (!d.open) { d.open = true; n += 1 } }
  return n })()`

function captureExpr(scope) {
  const list = TREATED.filter(([, , panel]) => panel === scope)
  return `(() => {
    const out = {}
    for (const [label, sel] of ${JSON.stringify(list.map(([l, s]) => [l, s]))}) {
      const el = document.querySelector(sel)
      if (!el) { out[label] = null; continue }
      const cs = getComputedStyle(el)
      const row = {}
      for (const p of ${JSON.stringify(ALL_PROPS)}) row[p] = cs[p]
      row.__text = (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 90)
      out[label] = row
    }
    return out
  })()`
}

async function captureScope(scope) {
  await freeze()
  await evaluate(OPEN_DETAILS)
  await sleep(220)
  const rows = await evaluate(captureExpr(scope))
  await unfreeze()
  return rows
}

// ── The walk ────────────────────────────────────────────────────────────────

// `textSize` is 'standard' | 'large' — NOT 'normal'. The first draft of this
// file wrote 'normal', `decodeAccessibilitySettings` rejected the whole blob,
// the app fell back to defaults, and every "easyRead" capture was silently a
// PLAIN capture that compared equal to plain and would have reported the
// flattening contract as satisfied by a mode that never turned on. The
// `modeReached` guard below exists because of it: a mode is only a mode once its
// class is observed on the portal root that renders the surface.
const BASE_SETTINGS = {
  reducedMotion: false,
  highContrast: false,
  textSize: 'standard',
  easyRead: false,
  subtitlePlate: false,
  showTrustNumbers: false,
  ambientSound: false,
}
const MODES = [
  ['plain', null, null],
  ['easyRead', { ...BASE_SETTINGS, easyRead: true }, 'easy-read'],
  ['highContrast', { ...BASE_SETTINGS, highContrast: true }, 'high-contrast'],
]

// The guard. Reads the class list of the portal root the record surfaces render
// into, so "the mode is on" is an observation rather than an intention.
//
// The root is `.casefile-portal`, NOT `.casefile-drawer`: `recordPortalClass`
// puts the preference classes on the portal wrapper and the drawer is its child
// (CaseFileDrawer.tsx:125-130). A first draft of this guard read the drawer and
// reported every mode as unreached while the modes were in fact applying — the
// mirror image of the bug it was written to catch.
async function modeReached(mode, expectedClass) {
  const seen = await evaluate(`(() => {
    const el = document.querySelector('.casefile-portal')
    return el ? [...el.classList] : null })()`)
  const ok = expectedClass === null
    ? Array.isArray(seen) && !seen.includes('easy-read') && !seen.includes('high-contrast')
    : Array.isArray(seen) && seen.includes(expectedClass)
  record(`${mode}@${viewport.width} · the mode reached the record portal root`, ok, { classes: seen })
  return ok
}

async function setForcedColors(active) {
  await send('Emulation.setEmulatedMedia', {
    features: active ? [{ name: 'forced-colors', value: 'active' }] : [],
  })
  await sleep(200)
}

for (const [w, h] of [[1280, 800], [375, 812]]) {
  await setViewport(w, h)
  await setForcedColors(false)
  await bootFreshRun()
  await fileCareWard()

  // The LEDGER capture comes from the unseeded, really-played run: one filing,
  // one contradiction pair, one citation. Taken before the exhibit list is
  // rewritten so nothing on this panel can be attributed to the seed.
  for (const [mode, settings, modeClass] of MODES) {
    if (mode !== 'plain') await reloadInto(settings)
    await openCaseFile('ledger')
    await modeReached(mode, modeClass)
    const scrolled = await evaluate(`(() => {
      const el = document.querySelector('.ledger-pair')
      if (!el) return false
      el.scrollIntoView({ block: 'center' })
      return true })()`)
    record(`${mode}@${w} · the contradiction pair is on the ledger`, scrolled === true, { scrolled })
    await sleep(360)
    const rows = await captureScope('ledger')
    report.computed[`ledger·${mode}@${w}`] = rows
    await shot(`ledger-pair-${mode}`)
    await closeCaseFile()
  }

  // Back to plain, then the seeded four-status exhibit list.
  await reloadInto(null)
  await seedFourExhibits(null)
  for (const [mode, settings, modeClass] of MODES) {
    if (mode !== 'plain') await reloadInto(settings)
    await openCaseFile('evidence')
    await modeReached(mode, modeClass)
    const seen = await evaluate(`(() => {
      const items = [...document.querySelectorAll('.evidence-list > li')]
      return items.map((li) => ({
        status: (li.querySelector('.evidence-status')?.textContent || '').trim(),
        title: (li.querySelector('h2')?.textContent || '').trim(),
      })) })()`)
    const statuses = seen.map((s) => s.status.toLowerCase())
    const allFour = ['verified', 'testimony', 'disputed', 'anomaly'].every((s) => statuses.includes(s))
    record(`${mode}@${w} · all four authored statuses are on the evidence tab`, allFour, { seen })
    const rows = await captureScope('evidence')
    report.computed[`evidence·${mode}@${w}`] = rows
    await shot(`evidence-four-statuses-${mode}`)
    await closeCaseFile()
  }

  // FORCED COLORS, on the plain build. Emulated at the media level, so the page
  // takes the same path a Windows high-contrast theme puts it on.
  await reloadInto(null)
  await setForcedColors(true)
  await openCaseFile('evidence')
  report.computed[`evidence·forcedColors@${w}`] = await captureScope('evidence')
  await shot('evidence-four-statuses-forcedColors')
  await closeCaseFile()
  await openCaseFile('ledger')
  await evaluate(`(() => { document.querySelector('.ledger-pair')?.scrollIntoView({ block: 'center' }); return true })()`)
  await sleep(340)
  report.computed[`ledger·forcedColors@${w}`] = await captureScope('ledger')
  await shot('ledger-pair-forcedColors')
  await closeCaseFile()
  await setForcedColors(false)
}

// ── The gates ───────────────────────────────────────────────────────────────

if (BASELINE_MODE) {
  writeFileSync(BASELINE_FILE, JSON.stringify({ capturedAt: report.capturedAt, computed: report.computed }, null, 2))
  console.log(`\nBASELINE WRITTEN — ${BASELINE_FILE}`)
} else {
  if (!existsSync(BASELINE_FILE)) {
    console.error(`\nNO BASELINE — run with --baseline at the pre-round commit first (${BASELINE_FILE})`)
    process.exit(2)
  }
  const baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf8')).computed

  for (const [w] of [[1280], [375]]) {
    for (const scope of ['ledger', 'evidence']) {
      // 1 · THE REDUNDANCY CONTRACT. Easy Read must equal the PRE-ROUND register,
      //     property for property, for every treated element.
      const key = `${scope}·easyRead@${w}`
      const before = baseline[key]
      const after = report.computed[key]
      const diffs = []
      for (const [label] of TREATED.filter(([, , p]) => p === scope)) {
        const b = before?.[label]
        const a = after?.[label]
        if (!b || !a) {
          diffs.push({ label, missing: { before: !b, after: !a } })
          continue
        }
        for (const p of ALL_PROPS) {
          if (b[p] !== a[p]) diffs.push({ label, prop: p, before: b[p], after: a[p] })
        }
      }
      record(`easyRead@${w} · ${scope} · every treated element equals its pre-round register`, diffs.length === 0, {
        elements: TREATED.filter(([, , p]) => p === scope).length,
        diffs: diffs.slice(0, 12),
      })

      // 2 · NON-VACUITY. The plain build must have MOVED for every treated
      //     element — otherwise (1) is satisfied by a treatment that never
      //     applied.
      const pb = baseline[`${scope}·plain@${w}`]
      const pa = report.computed[`${scope}·plain@${w}`]
      const unmoved = []
      const moved = {}
      for (const [label] of TREATED.filter(([, , p]) => p === scope)) {
        const b = pb?.[label]
        const a = pa?.[label]
        if (!b || !a) { unmoved.push(`${label} (absent)`); continue }
        const changed = ALL_PROPS.filter((p) => b[p] !== a[p])
        if (changed.length === 0) unmoved.push(label)
        else moved[label] = changed.map((p) => `${p}: ${b[p]} → ${a[p]}`)
      }
      record(`plain@${w} · ${scope} · every treated element actually carries a treatment`, unmoved.length === 0, {
        unmoved,
        moved,
      })

      // 3 · HIGH CONTRAST. The FORM carriers survive (the correction hand stays
      //     distinguishable without hue); the chromatic carriers go neutral —
      //     no treatment border or underline may still be painted in an accent.
      const hc = report.computed[`${scope}·highContrast@${w}`]
      const formLost = []
      const accentLeft = []
      const ACCENTS = /oklch\(0\.(66|72|78) 0\.(1[1-7]|09|07)/
      for (const [label] of TREATED.filter(([, , p]) => p === scope)) {
        const a = pa?.[label]
        const c = hc?.[label]
        if (!a || !c) { formLost.push(`${label} (absent)`); continue }
        for (const p of FORM_PROPS) {
          if (a[p] !== c[p]) formLost.push(`${label} · ${p}: ${a[p]} → ${c[p]}`)
        }
        for (const p of ['borderLeftColor', 'textDecorationColor']) {
          if (c[p] && ACCENTS.test(c[p])) accentLeft.push(`${label} · ${p}: ${c[p]}`)
        }
      }
      record(`highContrast@${w} · ${scope} · treatments keep every FORM carrier`, formLost.length === 0, { formLost })
      record(`highContrast@${w} · ${scope} · no treatment relies on an accent hue`, accentLeft.length === 0, {
        accentLeft,
      })

      // 4 · FORCED COLORS. Every treatment colour resolves to the element's own
      //     currentColor, so the system palette owns the page.
      //
      //     THE TWO PROPERTIES ARE ASSERTED DIFFERENTLY, and that is a measured
      //     fact about the instrument rather than a softened gate. Chrome forces
      //     `color` and `border-color` to the system ink and REPORTS the forced
      //     value, so `borderLeftColor === color` is the right test there. It
      //     does NOT rewrite the reported `text-decoration-color`: a
      //     `currentColor` decoration keeps resolving against the element's
      //     AUTHORED colour in the computed style. A first draft compared it to
      //     the forced `color` and failed two rows on the difference between two
      //     reporting conventions.
      //
      //     So the decoration is held to the claim that actually matters: no
      //     authored ACCENT may survive — the correction mark must resolve to the
      //     element's own plain-mode ink. This is not vacuous. In the same build,
      //     the plain capture reports this row's textDecorationColor as coral
      //     (oklch(0.66 0.17 30)) and the forced-colors capture reports the
      //     label's own oklch(0.59 0.018 215): one build, two media states, and
      //     the accent is gone in the second because the rule below put it there.
      const fc = report.computed[`${scope}·forcedColors@${w}`]
      const notCurrent = []
      for (const [label] of TREATED.filter(([, , p]) => p === scope)) {
        const c = fc?.[label]
        const plain = pa?.[label]
        if (!c || !plain) { notCurrent.push(`${label} (absent)`); continue }
        if (c.borderLeftColor && c.borderLeftColor !== c.color) {
          notCurrent.push(`${label} · borderLeftColor: ${c.borderLeftColor} (system ink ${c.color})`)
        }
        if (c.textDecorationLine !== 'none' && c.textDecorationColor !== plain.color) {
          notCurrent.push(
            `${label} · textDecorationColor: ${c.textDecorationColor} (its own ink is ${plain.color})`,
          )
        }
      }
      record(`forcedColors@${w} · ${scope} · every treatment colour is the element's own currentColor`, notCurrent.length === 0, {
        notCurrent,
      })
    }
  }
}

const failed = report.checks.filter((c) => !c.pass).length
report.summary = { checks: report.checks.length, failed }
writeFileSync(join(OUT_DIR, `measurements-${STAGE}.json`), JSON.stringify(report, null, 2))
console.log(`\n${report.checks.length - failed} / ${report.checks.length} checks passed · ${report.shots.length} screenshots → ${OUT_DIR}`)
clearTimeout(killTimer)
chromeProcess.kill('SIGKILL')
process.exit(failed === 0 ? 0 : 1)

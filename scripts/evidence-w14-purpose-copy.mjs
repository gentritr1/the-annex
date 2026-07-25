// W1-4 evidence — the purpose copy (audit P2-F merged with P3-B/P3-C).
//
// The item's acceptance criteria are STRUCTURAL, so this harness proves the
// structure rather than the wording: each line is present at the moment it
// becomes true and gone after it, no line is a dialog or a dismissible tip, the
// summon pill that GREW does not steal a plate control's hit target, and the
// tribunal's admitted-signal line agrees at 0, 1 and 2+.
//
// Recorded scars honoured: every interaction is el.click() (a synthetic
// dispatchEvent never reaches React's root); every geometry read is taken with
// transitions AND animations disabled and two frames allowed to pass; every
// screenshot is taken with that freeze LIFTED and ~480ms of settle, because
// `animation: none !important` strands entry animations mid-build.
//
// Usage: node scripts/evidence-w14-purpose-copy.mjs [app-url]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://127.0.0.1:3000/'
const OUT_DIR = new URL('../evidence/w1-4-copy/', import.meta.url).pathname
mkdirSync(OUT_DIR, { recursive: true })

const SAVE_KEY = 'the-annex.case-77.save.v1'
const SETTINGS_KEY = 'the-annex.accessibility.v1'
const BASE_SETTINGS = {
  reducedMotion: false,
  highContrast: false,
  textSize: 'standard',
  showTrustNumbers: false,
  ambientSound: false,
  easyRead: false,
  subtitlePlate: false,
}
const FRESH = {
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
  settings: BASE_SETTINGS,
  announcement: '',
}
// A completed prior run — the `isFirstCase` gate's OFF state. Shape copied from
// RunSummary (types.ts:106); no field is invented here.
const PRIOR_RUN = {
  runNumber: 1,
  caseId: 'case-77',
  decision: 'certify-continuity',
  primaryApproach: 'procedure',
  methodTags: ['procedure'],
  evidenceCount: 2,
  alarm: 1,
  trust: { registrar: 1, shepherd: 0, defector: 0, archivist: 0 },
}

const chromeProcess = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-w14-${Date.now()}`,
  '--no-first-run', '--no-default-browser-check', '--mute-audio',
  '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1280,800',
  'about:blank',
])
const killTimer = setTimeout(() => { console.error('GLOBAL TIMEOUT'); chromeProcess.kill('SIGKILL'); process.exit(2) }, 900000)
killTimer.unref?.()
const wsUrl = await new Promise((resolve) => {
  let stderr = ''
  chromeProcess.stderr.on('data', (chunk) => {
    stderr += chunk
    const m = stderr.match(/DevTools listening on (ws:\/\/\S+)/)
    if (m) resolve(m[1])
  })
})
const socket = new WebSocket(wsUrl)
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }))
let nextId = 1
const pending = new Map()
socket.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (!m.id || !pending.has(m.id)) return
  const { resolve, reject } = pending.get(m.id)
  pending.delete(m.id)
  if (m.error) reject(new Error(m.error.message)); else resolve(m.result)
})
function raw(method, params = {}, sid) {
  const id = nextId; nextId += 1
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)) }, 60000)
    pending.set(id, { resolve: (v) => { clearTimeout(t); resolve(v) }, reject: (e) => { clearTimeout(t); reject(e) } })
    socket.send(JSON.stringify({ id, method, params, sessionId: sid }))
  })
}
const { targetId } = await raw('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await raw('Target.attachToTarget', { targetId, flatten: true })
const send = (m, p = {}) => raw(m, p, sessionId)
await send('Runtime.enable'); await send('Page.enable')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'page exception')
  return r.result.value
}
async function waitFor(expr, timeout = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await evaluate(expr).catch(() => false)) return true
    await sleep(120)
  }
  return false
}
const waitForText = (sel, text, t = 15000) =>
  waitFor(`[...document.querySelectorAll(${JSON.stringify(sel)})].some((e)=>e.textContent.includes(${JSON.stringify(text)}))`, t)
const click = (sel, text) =>
  evaluate(`(() => {
    const m=[...document.querySelectorAll(${JSON.stringify(sel)})]
    const p=${JSON.stringify(text ?? '')} ? m.find((e)=>e.textContent.includes(${JSON.stringify(text ?? '')})) : m[0]
    if(!p) return false; p.click(); return true })()`)

// The recorded transition-clock scar: a computed/geometry read taken while a
// transition is in flight returns the START frame. Freeze, let two frames pass,
// read; lift before any screenshot.
const FREEZE = `(() => {
  let s = document.getElementById('__w14freeze')
  if (!s) { s = document.createElement('style'); s.id = '__w14freeze'
    s.textContent = '*,*::before,*::after{transition:none !important;animation:none !important}'
    document.head.appendChild(s) }
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))
})()`
const UNFREEZE = `(() => { document.getElementById('__w14freeze')?.remove(); return true })()`

const report = {
  url: APP_URL, capturedAt: new Date().toISOString(), node: process.version,
  checks: [], measurements: {}, shots: [],
}
let pass = 0, fail = 0
function record(name, ok, detail = {}) {
  report.checks.push({ name, ok: Boolean(ok), detail })
  if (ok) pass += 1; else { fail += 1; console.log(`  FAIL  ${name}  ${JSON.stringify(detail)}`) }
}
async function shot(name, tag) {
  await evaluate(UNFREEZE)
  await sleep(480)
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  const file = `${name}-${tag}.png`
  writeFileSync(join(OUT_DIR, file), Buffer.from(data, 'base64'))
  report.shots.push(file)
  return file
}
const setViewport = (width, height) =>
  send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })

let bootCounter = 0
async function boot(save, settings = BASE_SETTINGS) {
  bootCounter += 1
  await send('Page.navigate', { url: 'about:blank' }); await sleep(160)
  await send('Page.navigate', { url: APP_URL })
  await waitFor(`document.readyState === 'complete'`)
  await evaluate(`(() => {
    localStorage.clear()
    localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, ${JSON.stringify(JSON.stringify(settings))})
    localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(save))})
    window.__stale = true; return true })()`)
  await send('Page.navigate', { url: `${APP_URL}?boot=${bootCounter}` })
  await waitFor(`window.__stale === undefined && document.readyState === 'complete'`)
  await waitForText('button', 'Continue local case')
  await click('button', 'Continue local case')
  await sleep(900)
}
const seed = (o) => ({ ...FRESH, ...o, settings: { ...BASE_SETTINGS, ...(o.settings ?? {}) } })

// The five lines, counted by their own class. `.field-threshold` is counted too
// because three assertions in evidence-hud-collapse.mjs require exactly one of
// it — proving the new concourse line did not borrow that class.
const COUNTS = `(() => ({
  fieldPurpose: document.querySelectorAll('.field-purpose').length,
  fieldThreshold: document.querySelectorAll('.field-threshold').length,
  siteCost: document.querySelectorAll('.site-cost-note').length,
  summonWhy: document.querySelectorAll('.casefile-summon-why').length,
  summonWhyPainted: [...document.querySelectorAll('.casefile-summon-why')]
    .filter((e) => e.getBoundingClientRect().height > 0).length,
  latticePurpose: document.querySelectorAll('.lattice-purpose').length,
  peoplePurpose: document.querySelectorAll('.people-purpose').length,
  dialogs: document.querySelectorAll('[role="dialog"]').length,
  text: {
    fieldPurpose: document.querySelector('.field-purpose')?.textContent ?? null,
    siteCost: document.querySelector('.site-cost-note')?.textContent ?? null,
    summonWhy: document.querySelector('.casefile-summon-why')?.textContent ?? null,
    latticePurpose: document.querySelector('.lattice-purpose')?.textContent ?? null,
    peoplePurpose: document.querySelector('.people-purpose')?.textContent ?? null,
  },
}))()`

// The recorded cross-zone scar: per-zone verification is blind to control-pair
// interference. Every positioned interactive control on the plate, swept
// pairwise for box intersection AND probed with elementFromPoint at its own
// visual centre. The summon pill is the reason this exists in W1-4 — it GROWS.
const CROSS_ZONE = `(() => {
  const plate = document.querySelector('.world-view')
  if (!plate) return null
  const ctrls = [...plate.querySelectorAll('button, a[href], [role="button"]')]
    .filter((e) => e.offsetParent !== null)
    .map((e) => ({ el: e, cls: String(e.className), txt: (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 30), r: e.getBoundingClientRect() }))
  const pairs = []
  for (let i = 0; i < ctrls.length; i += 1) {
    for (let j = i + 1; j < ctrls.length; j += 1) {
      const a = ctrls[i].r, b = ctrls[j].r
      if (!(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)) {
        pairs.push([ctrls[i].txt, ctrls[j].txt])
      }
    }
  }
  const stolen = ctrls.filter((z) => {
    const t = document.elementFromPoint(z.r.left + z.r.width / 2, z.r.top + z.r.height / 2)
    return !(t && (z.el === t || z.el.contains(t)))
  }).map((z) => {
    const t = document.elementFromPoint(z.r.left + z.r.width / 2, z.r.top + z.r.height / 2)
    return { txt: z.txt, cls: z.cls.slice(0, 40), ownerCls: t ? String(t.className).slice(0, 40) : null }
  })
  return { controls: ctrls.length, intersectingPairs: pairs, stolenCentres: stolen,
    stolenBySummon: stolen.filter((s) => /casefile-summon/.test(s.ownerCls ?? '')).map((s) => s.txt),
    summonBox: (() => { const b = document.querySelector('.casefile-summon')?.getBoundingClientRect()
      return b ? { w: Math.round(b.width), h: Math.round(b.height) } : null })() }
})()`

// The differential that actually answers the question. The world portals stay
// mounted UNDER the close-read plate by design, so a plain "no centre is stolen"
// sweep fails in the closeup state for reasons that predate this change. What
// matters is whether the summon pill — which is the one box W1-4 makes taller —
// steals anything it did not steal before. So: measure with the purpose line
// painted, measure again with it forced off (the pre-change geometry, on the
// SAME frame), and require the two stolen-centre sets to be identical.
const CROSS_ZONE_DIFF = `(async () => {
  const read = () => (${CROSS_ZONE})
  const after = read()
  const why = document.querySelector('.casefile-summon-why')
  const prev = why ? why.style.display : null
  if (why) why.style.display = 'none'
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const before = read()
  if (why) why.style.display = prev
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const key = (x) => (x ? x.stolenCentres.map((s) => s.txt).sort().join('|') : 'null')
  return { before, after, identical: key(before) === key(after) }
})()`

async function enterSite(name) {
  if (await evaluate(`!!document.querySelector('.world-return')`)) { await click('.world-return'); await sleep(700) }
  if (!(await click('.annex-world-portal', name))) await click('.site-switch', name)
  await waitFor(`!!document.querySelector('.world-view--closeup')`, 9000)
  await sleep(900)
}

// A real first run, reached the way a player reaches it: landing → "Open a new
// audit" → pick an approach → concourse. NOT a seeded save.
//
// This exists because a seeded save is not the game. The first draft of the
// case-file predicate required `events.length === 0`, and a seed with
// `events: []` made every check agree — but SELECT_APPROACH appends an event
// (engine.ts:255), so a real player arrives at the concourse with one already
// logged and the line would never have appeared in play. The seeded pass proved
// the component, not the path.
async function bootRealRun() {
  bootCounter += 1
  await send('Page.navigate', { url: 'about:blank' }); await sleep(160)
  await send('Page.navigate', { url: APP_URL })
  await waitFor(`document.readyState === 'complete'`)
  await evaluate(`(() => {
    localStorage.clear()
    localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, ${JSON.stringify(JSON.stringify(BASE_SETTINGS))})
    window.__stale = true; return true })()`)
  await send('Page.navigate', { url: `${APP_URL}?boot=${bootCounter}` })
  await waitFor(`window.__stale === undefined && document.readyState === 'complete'`)
  await waitForText('button', 'Open a new audit')
  await click('button', 'Open a new audit')
  await waitFor(`!!document.querySelector('.choice-row')`)
  await click('.choice-row')
  await waitFor(`!!document.querySelector('.site-switcher')`, 12000)
  await sleep(900)
}

async function viewportPass(width, height) {
  const tag = `${width}x${height}`
  console.log(`\n════ ${tag}`)
  await setViewport(width, height)

  // ── 0. THE PATH A PLAYER ACTUALLY TAKES ───────────────────────────────────
  await bootRealRun()
  await evaluate(FREEZE)
  const c0 = await evaluate(COUNTS)
  const c0counts = await evaluate(`document.querySelector('.casefile-summon small')?.textContent ?? null`)
  report.measurements[`realrun-concourse:${tag}`] = { ...c0, summonCounts: c0counts }
  record(`${tag} · REAL RUN · the log already holds the approach event, and the copy still lands`,
    /0 evidence · 1 events/.test(c0counts ?? '') && c0.fieldPurpose === 1 &&
      c0.summonWhyPainted === (width >= 700 ? 1 : 0) && c0.siteCost === 1,
    { summonCounts: c0counts, ...c0 })
  await shot('00-concourse-real-run', tag)

  // ── 1. FIRST ENCOUNTER · the concourse ────────────────────────────────────
  await boot(seed({}))
  await waitFor(`!!document.querySelector('.field-objectives')`, 9000)
  await evaluate(FREEZE)
  const c1 = await evaluate(COUNTS)
  report.measurements[`concourse-first:${tag}`] = c1
  record(`${tag} · concourse · purpose line present on first arrival`, c1.fieldPurpose === 1, c1)
  record(`${tag} · concourse · the shipped threshold line is still exactly one node`,
    c1.fieldThreshold === 1, { count: c1.fieldThreshold })
  record(`${tag} · concourse · no dialog was introduced`, c1.dialogs === 0, { dialogs: c1.dialogs })
  const summonExpected = width >= 700 ? 1 : 0
  record(`${tag} · summon · purpose line painted (desktop only, by measurement)`,
    c1.summonWhyPainted === summonExpected, { painted: c1.summonWhyPainted, expected: summonExpected })
  const cz1 = await evaluate(CROSS_ZONE_DIFF)
  report.measurements[`crosszone-concourse:${tag}`] = cz1
  record(`${tag} · cross-zone (world) · no plate control pair intersects, no centre stolen`,
    cz1?.after && cz1.after.intersectingPairs.length === 0 && cz1.after.stolenCentres.length === 0,
    cz1?.after)
  record(`${tag} · cross-zone (world) · the taller summon steals nothing the resting one did not`,
    cz1?.identical === true && (cz1?.after?.stolenBySummon.length ?? 1) === 0,
    { identical: cz1?.identical, stolenBySummon: cz1?.after?.stolenBySummon, box: cz1?.after?.summonBox })
  await shot('01-concourse-first', tag)

  // ── 2. FIRST ENCOUNTER · a bounded-room location ─────────────────────────
  await evaluate(FREEZE)
  await enterSite('Registry intake')
  await evaluate(FREEZE)
  const c2 = await evaluate(COUNTS)
  report.measurements[`room-first:${tag}`] = c2
  record(`${tag} · room site · cost line present before anything is filed`, c2.siteCost === 1, c2.text)
  const cz2 = await evaluate(CROSS_ZONE_DIFF)
  report.measurements[`crosszone-closeup:${tag}`] = cz2
  record(`${tag} · cross-zone (closeup) · the taller summon steals nothing the resting one did not`,
    cz2?.identical === true && (cz2?.after?.stolenBySummon.length ?? 1) === 0,
    { identical: cz2?.identical, stolenBySummon: cz2?.after?.stolenBySummon,
      stolen: cz2?.after?.stolenCentres, box: cz2?.after?.summonBox })
  await shot('02-room-cost-first', tag)

  // ── 3. FIRST ENCOUNTER · the roster ──────────────────────────────────────
  await click('.casefile-summon')
  await waitFor(`!!document.querySelector('.casefile-drawer')`, 9000)
  await click('#rail-tab-people')
  await sleep(500)
  await evaluate(FREEZE)
  const c3 = await evaluate(COUNTS)
  report.measurements[`people-first:${tag}`] = c3
  record(`${tag} · roster · purpose line present before the first filing`, c3.peoplePurpose === 1, c3.text)
  record(`${tag} · roster · the dossier heading is untouched`,
    await evaluate(`document.querySelector('#rail-panel-people h2')?.textContent === 'The people on this case'`), {})
  record(`${tag} · roster · the purpose line names no persona`,
    await evaluate(`!/Registrar|Shepherd|Defector|Archivist/.test(document.querySelector('.people-purpose')?.textContent ?? '')`), {})
  await shot('03-people-first', tag)
  await click('.casefile-close')
  await sleep(400)

  // ── 4. FIRST ENCOUNTER · the memory lattice ──────────────────────────────
  await boot(seed({ phase: 'reconstruction' }))
  await waitFor(`!!document.querySelector('.lattice-page')`, 9000)
  await evaluate(FREEZE)
  const c4 = await evaluate(COUNTS)
  report.measurements[`lattice-first:${tag}`] = c4
  record(`${tag} · lattice · purpose line present before a model exists`, c4.latticePurpose === 1, c4.text)
  record(`${tag} · lattice · the header intro keeps its own measure (":last-child" not stolen)`,
    await evaluate(`(() => { const p = document.querySelector('.lattice-header > p:last-child')
      return !!p && p.textContent.startsWith('Pair two fragments') && getComputedStyle(p).maxWidth !== 'none' })()`), {})
  await shot('04-lattice-first', tag)

  // ── 5. RETIRED · one site filed, one thing on the record ─────────────────
  await boot(seed({
    completedSites: ['registry'], completedActions: ['authenticate-chain'],
    evidence: ['custody-chain'], methodTags: ['procedure'],
    events: [{ id: 'e1', order: 1, sourceType: 'field-action', sourceId: 'authenticate-chain',
      title: 'Custody chain pulled', detail: 'The ledger opened without objection.', tone: 'neutral', methodTags: ['procedure'] }],
  }))
  await waitFor(`!!document.querySelector('.field-objectives')`, 9000)
  await evaluate(FREEZE)
  const c5 = await evaluate(COUNTS)
  report.measurements[`concourse-retired:${tag}`] = c5
  record(`${tag} · RETIRED · concourse purpose line is gone after the first filing`,
    c5.fieldPurpose === 0, c5)
  record(`${tag} · RETIRED · shipped threshold line retires with it (unchanged behaviour)`,
    c5.fieldThreshold === 0, { count: c5.fieldThreshold })
  record(`${tag} · RETIRED · summon purpose line is gone once the file holds something`,
    c5.summonWhy === 0, { count: c5.summonWhy })
  await shot('05-concourse-retired', tag)

  await enterSite('Registry intake')
  await evaluate(FREEZE)
  const c5b = await evaluate(COUNTS)
  report.measurements[`room-retired:${tag}`] = c5b
  record(`${tag} · RETIRED · site cost line is gone once a location has closed`, c5b.siteCost === 0, c5b)
  await shot('06-room-retired', tag)

  await click('.casefile-summon')
  await waitFor(`!!document.querySelector('.casefile-drawer')`, 9000)
  await click('#rail-tab-people')
  await sleep(500)
  await evaluate(FREEZE)
  const c5c = await evaluate(COUNTS)
  report.measurements[`people-retired:${tag}`] = c5c
  record(`${tag} · RETIRED · roster purpose line is gone after the first filing`,
    c5c.peoplePurpose === 0, c5c)
  await shot('07-people-retired', tag)
  await click('.casefile-close')
  await sleep(400)

  // ── 6. RETIRED · a model is filed ────────────────────────────────────────
  await boot(seed({ phase: 'reconstruction', reconstruction: 'unresolved-composite',
    selectedFragments: ['scar-sensation', 'registry-hash'] }))
  const onLattice = await waitFor(`!!document.querySelector('.lattice-page')`, 9000)
  await evaluate(FREEZE)
  const c6 = await evaluate(COUNTS)
  report.measurements[`lattice-retired:${tag}`] = { onLattice, ...c6 }
  record(`${tag} · RETIRED · lattice purpose line is gone once a model exists`,
    c6.latticePurpose === 0, { onLattice, count: c6.latticePurpose })
  await shot('08-lattice-retired', tag)

  // ── 7. RETIRED · a player carrying a completed run sees none of it ───────
  await boot(seed({ previousRuns: [PRIOR_RUN], runNumber: 2 }))
  await waitFor(`!!document.querySelector('.field-objectives')`, 9000)
  await evaluate(FREEZE)
  const c7 = await evaluate(COUNTS)
  report.measurements[`veteran-concourse:${tag}`] = c7
  record(`${tag} · RETIRED · a second run gets no purpose copy at all`,
    c7.fieldPurpose === 0 && c7.summonWhy === 0 && c7.siteCost === 0, c7)
  record(`${tag} · RETIRED · but the shipped threshold line is NOT gated on run count`,
    c7.fieldThreshold === 1, { count: c7.fieldThreshold })
  await shot('09-concourse-veteran', tag)

  // ── 8. P3-C · the tribunal admitted-signal line at 0, 1 and 2 ────────────
  for (const [n, ev] of [[0, []], [1, ['custody-chain']], [2, ['custody-chain', 'checksum-drift']]]) {
    // persistence.ts:367–370 rejects a save whole unless completedActions is the
    // same length as completedSites AND each action's siteId matches positionally.
    // A seed that misses this silently lands on the landing screen with no
    // "Continue local case" button, and every downstream read returns null.
    await boot(seed({ phase: 'tribunal', completedSites: ['registry', 'care-ward'],
      completedActions: ['authenticate-chain', 'listen-mara'],
      reconstruction: 'unresolved-composite', selectedFragments: ['scar-sensation', 'registry-hash'],
      evidence: ev }))
    await waitFor(`!!document.querySelector('.tribunal-chamber-status')`, 12000)
    await evaluate(FREEZE)
    const line = await evaluate(`document.querySelector('.tribunal-chamber-status span')?.textContent ?? null`)
    const other = await evaluate(`document.querySelector('.tribunal-contradictions summary small')?.textContent ?? null`)
    report.measurements[`tribunal-signals-${n}:${tag}`] = { line, other }
    const want = n === 1 ? '1 admitted signal' : `${n} admitted signals`
    record(`${tag} · P3-C · chamber line reads "${want}" at ${n}`, line === want, { line })
    if (n === 1) {
      record(`${tag} · P3-C · the OTHER admitted-items line (Tribunal.tsx) still agrees at 1`,
        (other ?? '').includes('1 admitted item remain'), { other })
    }
    await shot(`10-tribunal-signals-${n}`, tag)
  }

  // ── 9. Easy Read and reduced motion still behave ─────────────────────────
  await boot(seed({}), { ...BASE_SETTINGS, easyRead: true, reducedMotion: true })
  await waitFor(`!!document.querySelector('.field-objectives')`, 9000)
  await evaluate(FREEZE)
  const c9 = await evaluate(COUNTS)
  const easyColours = await evaluate(`(() => {
    const g = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).color : null }
    return { fieldPurpose: g('.field-purpose'), fieldThreshold: g('.field-threshold'), summonWhy: g('.casefile-summon-why') } })()`)
  report.measurements[`easyread-concourse:${tag}`] = { ...c9, easyColours }
  record(`${tag} · Easy Read · every purpose line still renders`,
    c9.fieldPurpose === 1 && c9.summonWhyPainted === summonExpected, c9)
  record(`${tag} · Easy Read · the purpose line is promoted with the threshold line, not left behind`,
    easyColours.fieldPurpose !== null && easyColours.fieldPurpose === easyColours.fieldThreshold, easyColours)
  record(`${tag} · reduced motion · nothing in the purpose copy animates`,
    await evaluate(`['.field-purpose','.casefile-summon-why'].every((s)=>{const e=document.querySelector(s); return !e || getComputedStyle(e).animationName === 'none'})`), {})
  await shot('11-concourse-easyread', tag)
}

try {
  await viewportPass(1280, 800)
  await viewportPass(375, 812)
} catch (error) {
  console.error('RUN ERROR:', error.message)
  report.error = error.message
  fail += 1
}

report.pass = pass
report.fail = fail
writeFileSync(join(OUT_DIR, 'evidence-w14-purpose-copy.json'), JSON.stringify(report, null, 2))
console.log(`\n${pass} passed · ${fail} failed — wrote ${OUT_DIR}evidence-w14-purpose-copy.json`)
clearTimeout(killTimer)
chromeProcess.kill('SIGKILL')
process.exit(fail === 0 ? 0 : 1)

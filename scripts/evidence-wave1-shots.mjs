// Wave 1 eyeball evidence — the same surfaces, captured with the new
// preferences OFF and ON, so a reviewer can see what changed rather than read
// that it did. Numbers close nothing here; §4.7 says feel closes on an eyeball.
//
// Surfaces per mode: the concourse, the staged beat mid-window and flushed, the
// case file (case + evidence tabs), the location detail drawer, the Small
// Archive's document register, and Case 81's deposition tray.
//
// Modes: baseline (everything off), subtitle-plate, easy-read.
//
// Every screenshot is taken with the freeze LIFTED and ~480ms of settle, because
// `animation: none !important` strands entry animations mid-build (recorded
// hud-collapse scar). Every interaction is el.click().
//
// Usage: node scripts/evidence-wave1-shots.mjs [app-url]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://127.0.0.1:3000/'
const OUT_DIR = new URL('../evidence/enrichment-wave1/', import.meta.url).pathname
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
// The documented schema-2 seeding recipe: Case 81's title switcher is gated
// behind a COMPLETED case-77 precedent (scripts/evidence-rooms-scene-first.mjs).
const SEED_SAVE = {
  schemaVersion: 2,
  caseId: 'case-77',
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
  decision: 'certify-continuity',
  depositionRecord: null,
  events: [],
  previousRuns: [],
  precedents: { 'case-77': 'charter-new-person' },
  settings: BASE_SETTINGS,
  announcement: '',
}

const chromeProcess = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-w1shots-${Date.now()}`,
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

// W1-3 criterion 3, swept at EVERY surface rather than only at the one that
// happened to be on screen: no element inside the shell or inside any portal
// root may compute uppercase AND letter-spacing > 0.06em AND carry more than
// four words of its own text. System codes keep their caps; prose does not.
const SWEEP = `(() => {
  const roots = [document.querySelector('.annex-app'), ...document.querySelectorAll('.deposition-portal, .scene-detail-portal, .casefile-portal')].filter(Boolean)
  const bad = []
  for (const root of roots) {
    for (const el of [root, ...root.querySelectorAll('*')]) {
      const cs = getComputedStyle(el)
      if (cs.textTransform !== 'uppercase') continue
      if (cs.letterSpacing === 'normal') continue
      if (!(parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize) > 0.06)) continue
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(' ').trim()
      const words = own.split(/\\s+/).filter(Boolean).length
      if (words > 4) bad.push({ cls: String(el.className).slice(0, 50), words, ls: cs.letterSpacing, text: own.slice(0, 70) })
    }
  }
  return bad })()`

const report = { url: APP_URL, capturedAt: new Date().toISOString(), node: process.version, shots: [], stanza: {}, sweeps: {}, deposition: {} }
let sweepFailures = 0
async function sweep(where, mode, tag) {
  if (mode !== 'easy-read') return
  const bad = await evaluate(SWEEP)
  report.sweeps[`${where}@${tag}`] = bad
  if (bad.length) {
    sweepFailures += bad.length
    console.log(`     SWEEP FAIL ${where}: ${JSON.stringify(bad)}`)
  }
}
async function shot(name, mode, w, h) {
  await sleep(480)
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  const file = `${name}-${mode}-${w}x${h}.png`
  writeFileSync(join(OUT_DIR, file), Buffer.from(data, 'base64'))
  report.shots.push(file)
  return file
}

let bootCounter = 0
async function boot(settings, { seed = false } = {}) {
  bootCounter += 1
  await send('Page.navigate', { url: 'about:blank' }); await sleep(160)
  await send('Page.navigate', { url: APP_URL })
  await waitFor(`document.readyState === 'complete'`)
  await evaluate(`(() => {
    localStorage.clear()
    localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, ${JSON.stringify(JSON.stringify(settings))})
    ${seed ? `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify({ ...SEED_SAVE, settings }))})` : ''}
    window.__stale = true; return true })()`)
  await send('Page.navigate', { url: `${APP_URL}?boot=${bootCounter}` })
  await waitFor(`window.__stale === undefined && document.readyState === 'complete'`)
  await waitForText('button', 'Open a new audit')
}
async function newRun() {
  await click('button', 'Open a new audit')
  await waitFor(`!!document.querySelector('.choice-row')`)
  await click('.choice-row')
  await waitFor(`!!document.querySelector('.site-switcher')`)
  await sleep(600)
}
async function enterSite(name) {
  if (await evaluate(`!!document.querySelector('.world-return')`)) { await click('.world-return'); await sleep(700) }
  if (!(await click('.annex-world-portal', name))) await click('.site-switch', name)
  await waitFor(`!!document.querySelector('.world-view--closeup')`, 9000)
  await sleep(900)
}

// The window proof: how many lines are MOUNTED versus how many are PAINTED
// inside the plate. The whole point of W1-1 is that these two numbers differ.
const STANZA = `(() => {
  const box = document.querySelector('.scene-beat-lines'); if (!box) return null
  const cs = getComputedStyle(box); const r = box.getBoundingClientRect()
  const top = r.top + parseFloat(cs.paddingTop), bottom = r.bottom - parseFloat(cs.paddingBottom)
  const lines = [...document.querySelectorAll('.scene-beat-line')]
  return {
    mountedNodes: lines.length,
    paintedInsideWindow: lines.filter((p) => { const b = p.getBoundingClientRect(); return b.top >= top - 0.5 && b.bottom <= bottom + 0.5 }).length,
    liveRegionLines: document.querySelectorAll('.scene-beat .sr-only[role="status"] span').length,
    maxHeight: cs.maxHeight, plateBg: cs.backgroundColor, plateGradient: cs.backgroundImage.slice(0, 60),
  } })()`

async function modePass(mode, settings, width, height) {
  const tag = `${width}x${height}`
  console.log(`\n── ${mode} @ ${tag}`)
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })

  await boot(settings)
  await newRun()
  await shot('10-concourse', mode, width, height)

  await enterSite('Care ward')
  await shot('11-care-ward-rest', mode, width, height)

  // Arm, file, and let three lines land — the mid-beat window.
  await evaluate(`(() => { document.querySelectorAll('.scene-zone button')[0]?.click(); return true })()`)
  await sleep(320)
  await evaluate(`(() => { document.querySelectorAll('.scene-zone button')[0]?.click(); return true })()`)
  await waitFor(`!!document.querySelector('.scene-beat')`, 9000)
  await sleep(4200)
  const mid = await evaluate(STANZA)
  await shot('12-beat-mid', mode, width, height)
  await click('.scene-beat-advance')
  await sleep(700)
  const flushed = await evaluate(STANZA)
  await shot('13-beat-flushed', mode, width, height)
  await sweep('beat', mode, tag)
  report.stanza[`${mode}@${tag}`] = { mid, flushed }
  console.log(`     mid: ${mid?.mountedNodes} mounted / ${mid?.paintedInsideWindow} painted · flushed: ${flushed?.mountedNodes} mounted / ${flushed?.paintedInsideWindow} painted · live region ${flushed?.liveRegionLines}`)

  await click('.scene-detail-summon'); await sleep(600)
  await shot('14-detail-drawer', mode, width, height)
  await sweep('detail-drawer', mode, tag)
  await click('.scene-detail-close'); await sleep(400)

  await click('.casefile-summon'); await sleep(700)
  await shot('15-casefile-case-tab', mode, width, height)
  await sweep('casefile', mode, tag)
  await click('.rail-tabs button', 'Evidence'); await sleep(450)
  await shot('16-casefile-evidence-tab', mode, width, height)
  await click('.rail-tabs button', 'People'); await sleep(450)
  await shot('17-casefile-people-tab', mode, width, height)
  await click('.casefile-close'); await sleep(400)

  // The Small Archive's document register — the classification room, docked.
  await enterSite('Small Archive')
  await sleep(900)
  await shot('18-document-register', mode, width, height)
  await sweep('document-register', mode, tag)

  // Case 81's deposition tray, the third Record Mode surface.
  await boot(settings, { seed: true })
  await sleep(400)
  if (await click('.switch-target button', 'Case 81')) {
    await sleep(300)
    await click('.inline-confirmation-actions button', 'Leave and switch')
    if (await waitFor(`!!document.querySelector('.choice-row')`, 12000)) {
      await click('.choice-row')
      await waitFor(`!!document.querySelector('.site-switcher')`, 12000)
      await sleep(700)
      await shot('19-case-81-site', mode, width, height)
      await click('.site-switch', 'Deposition suite')
      await sleep(700)
      await click('.site-inspector .choice-row')
      if (await waitFor(`!!document.querySelector('.deposition-tray')`, 8000)) {
        await sleep(600)
        await shot('20-deposition-tray', mode, width, height)
        // The third Record Mode surface, and the only one the wave-1 probe
        // cannot reach (Case 81 is gated behind a completed case-77 precedent).
        // Measured here so the shared-voice rule's change is checked on BOTH
        // stages, not just the one that was easy to get to.
        const dep = await evaluate(`(() => {
          const el = document.querySelector('.deposition-statement'); if (!el) return null
          const cs = getComputedStyle(el); const r = el.getBoundingClientRect()
          const c = document.createElement('canvas').getContext('2d')
          c.font = cs.font || (cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily)
          const t = el.textContent.trim(); const adv = c.measureText(t).width / t.length
          return {
            inRecordMode: !!el.closest('.record-mode'),
            fontSize: cs.fontSize, fontWeight: cs.fontWeight,
            lineHeight: Math.round(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) * 100) / 100,
            measureCh: Math.round((r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) / adv),
            color: cs.color, cardBg: cs.backgroundColor,
          } })()`)
        report.deposition[`${mode}@${tag}`] = dep
        const ok = dep && dep.inRecordMode && parseInt(dep.fontWeight, 10) >= 400 &&
          dep.lineHeight >= 1.5 && dep.measureCh >= 45 && dep.measureCh <= 80
        console.log(`     deposition statement: ${ok ? 'IN BAND' : 'OUT OF BAND'} ${JSON.stringify(dep)}`)
        if (!ok) sweepFailures += 1
        await sweep('deposition-tray', mode, tag)
      } else {
        console.log('     deposition tray did not open')
      }
    }
  } else {
    console.log('     Case 81 not offered on the switcher')
  }
}

const MODES = [
  ['baseline', BASE_SETTINGS],
  ['subtitle-plate', { ...BASE_SETTINGS, subtitlePlate: true }],
  ['easy-read', { ...BASE_SETTINGS, easyRead: true }],
]
for (const [w, h] of [[1280, 800], [375, 812]]) {
  for (const [mode, settings] of MODES) {
    await modePass(mode, settings, w, h)
  }
}

writeFileSync(join(OUT_DIR, 'wave1-shots.json'), JSON.stringify(report, null, 2))
console.log(`\n${report.shots.length} screenshots → ${OUT_DIR}`)
console.log(sweepFailures === 0
  ? 'Easy Read uppercase sweep + deposition measure: CLEAN'
  : `Easy Read sweep / deposition measure: ${sweepFailures} problem(s)`)
clearTimeout(killTimer)
chromeProcess.kill('SIGKILL')
process.exit(0)

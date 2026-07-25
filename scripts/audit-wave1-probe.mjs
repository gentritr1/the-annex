// Wave 1 acceptance probe — subtitle window, Record Mode, Easy Read.
//
// Everything here is measured against the RUNNING app through CDP, never read
// off the stylesheet: the typography pass snapped 232 declarations onto seven
// tokens, so an authored rule is not evidence of a computed value. Transitions
// AND animations are frozen and two frames allowed to pass before any geometry
// or computed style is read (recorded transition-clock scar), and every
// interaction is el.click() or trusted CDP input — never dispatchEvent.
//
// Usage: node scripts/audit-wave1-probe.mjs [app-url]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://127.0.0.1:3000/'
const OUT_DIR = new URL('../evidence/enrichment-wave1/', import.meta.url).pathname
mkdirSync(OUT_DIR, { recursive: true })
const LABEL = process.env.WAVE1_LABEL ?? 'after'

const chromeProcess = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-wave1-${Date.now()}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--mute-audio',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1280,800',
  'about:blank',
])
const killTimer = setTimeout(() => {
  console.error('GLOBAL TIMEOUT')
  chromeProcess.kill('SIGKILL')
  process.exit(2)
}, 900000)
killTimer.unref?.()

const wsUrl = await new Promise((resolve, reject) => {
  let stderr = ''
  const timer = setTimeout(() => reject(new Error('CDP endpoint timed out')), 20000)
  chromeProcess.stderr.on('data', (chunk) => {
    stderr += chunk
    const m = stderr.match(/DevTools listening on (ws:\/\/\S+)/)
    if (!m) return
    clearTimeout(timer)
    resolve(m[1])
  })
})
const socket = new WebSocket(wsUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
let nextId = 1
const pending = new Map()
socket.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (!m.id || !pending.has(m.id)) return
  const { resolve, reject } = pending.get(m.id)
  pending.delete(m.id)
  if (m.error) reject(new Error(m.error.message))
  else resolve(m.result)
})
function raw(method, params = {}, sessionId) {
  const id = nextId
  nextId += 1
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`CDP timeout: ${method}`))
    }, 60000)
    pending.set(id, {
      resolve: (v) => { clearTimeout(t); resolve(v) },
      reject: (e) => { clearTimeout(t); reject(e) },
    })
    socket.send(JSON.stringify({ id, method, params, sessionId }))
  })
}
const { targetId } = await raw('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await raw('Target.attachToTarget', { targetId, flatten: true })
const send = (m, p = {}) => raw(m, p, sessionId)
await send('Runtime.enable')
await send('Page.enable')

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

const FREEZE = `(async () => {
  document.getElementById('cf')?.remove()
  const s = document.createElement('style'); s.id='cf'
  s.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }'
  document.head.appendChild(s)
  await new Promise((r)=>requestAnimationFrame(()=>requestAnimationFrame(r)))
  return true })()`
const UNFREEZE = `(() => { document.getElementById('cf')?.remove(); return true })()`

async function setViewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
}
async function shot(name, w, h) {
  // Settle after lifting the freeze: `animation: none !important` strands entry
  // animations, so a screenshot taken while frozen can show a half-built frame.
  await evaluate(UNFREEZE)
  await sleep(480)
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  const file = `${name}-${LABEL}-${w}x${h}.png`
  writeFileSync(join(OUT_DIR, file), Buffer.from(data, 'base64'))
  return file
}

let bootCounter = 0
async function boot() {
  bootCounter += 1
  await send('Page.navigate', { url: 'about:blank' })
  await sleep(180)
  await send('Page.navigate', { url: APP_URL })
  await waitFor(`document.readyState === 'complete'`)
  await evaluate(`(() => { try { localStorage.clear() } catch {} ; window.__stale = true; return true })()`)
  await send('Page.navigate', { url: `${APP_URL}?boot=${bootCounter}` })
  await waitFor(`window.__stale === undefined && document.readyState === 'complete'`)
  if (!(await waitForText('button', 'Open a new audit'))) throw new Error('landing did not render')
  await click('button', 'Open a new audit')
  await waitFor(`!!document.querySelector('.choice-row')`)
  await click('.choice-row')
  await waitFor(`!!document.querySelector('.site-switcher')`)
  await sleep(500)
}
async function enterSite(name) {
  if (await evaluate(`!!document.querySelector('.world-return')`)) {
    await click('.world-return')
    await sleep(700)
  }
  if (!(await click('.annex-world-portal', name))) await click('.site-switch', name)
  await waitFor(`!!document.querySelector('.world-view--closeup')`, 9000)
  await sleep(900)
}

// Open the Access popover and set a preference by CLICKING its checkbox, so the
// whole path — control, reducer, class, stylesheet — is what is measured.
const OPEN_ACCESS = `(() => {
  const d = document.querySelector('.header-preferences'); if(!d) return false
  d.open = true; return true })()`
async function setPreference(label, on) {
  await evaluate(OPEN_ACCESS)
  await sleep(120)
  const changed = await evaluate(`(() => {
    const l = [...document.querySelectorAll('.preferences-popover label')]
      .find((e) => e.textContent.trim() === ${JSON.stringify(label)})
    if (!l) return 'missing'
    const box = l.querySelector('input')
    if (box.checked === ${on}) return 'already'
    box.click(); return 'clicked' })()`)
  await sleep(260)
  return changed
}

// Arm + file the plate zone at `index`, then flush the stanza.
async function stageBeat(index, { flush = true } = {}) {
  await evaluate(`(() => { document.querySelectorAll('.scene-zone button')[${index}]?.click(); return true })()`)
  await sleep(320)
  await evaluate(`(() => { document.querySelectorAll('.scene-zone button')[${index}]?.click(); return true })()`)
  await waitFor(`!!document.querySelector('.scene-beat')`, 9000)
  await sleep(400)
  if (flush) {
    await click('.scene-beat-advance')
    await sleep(600)
  }
}

// ── The window measurement ──────────────────────────────────────────────────
// A line "lies fully inside" when its BORDER BOX is contained in the stanza's
// CONTENT box (padding excluded on purpose: the plate's padding is chrome, and a
// glyph sitting in it is a glyph in the mask's fade band).
const WINDOW = `(() => {
  const box = document.querySelector('.scene-beat-lines')
  if (!box) return null
  const cs = getComputedStyle(box)
  const r = box.getBoundingClientRect()
  const content = {
    top: r.top + parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth),
    bottom: r.bottom - parseFloat(cs.paddingBottom) - parseFloat(cs.borderBottomWidth),
  }
  const lines = [...document.querySelectorAll('.scene-beat-line')]
  const rects = lines.map((p) => p.getBoundingClientRect())
  const fullyInside = rects.filter((b) => b.top >= content.top - 0.5 && b.bottom <= content.bottom + 0.5).length
  const subject = document.querySelector('.scene-beat-line--subject')
  const persona = document.querySelector('.scene-beat-line--persona')
  return {
    nodes: lines.length,
    fullyInside,
    clipped: rects.length - fullyInside,
    maxHeight: cs.maxHeight,
    boxHeight: Math.round(r.height * 10) / 10,
    maskImage: cs.maskImage === 'none' ? 'none' : 'set',
    backgroundColor: cs.backgroundColor,
    backgroundImage: cs.backgroundImage === 'none' ? 'none' : 'gradient',
    subjectSize: subject ? getComputedStyle(subject).fontSize : null,
    subjectWeight: subject ? getComputedStyle(subject).fontWeight : null,
    subjectShadow: subject ? getComputedStyle(subject).textShadow : null,
    personaSize: persona ? getComputedStyle(persona).fontSize : null,
    personaWeight: persona ? getComputedStyle(persona).fontWeight : null,
  }
})()`

const report = { url: APP_URL, label: LABEL, capturedAt: new Date().toISOString(), node: process.version, checks: [], data: {}, shots: [] }
let failures = 0
function record(name, ok, detail) {
  report.checks.push({ name, ok: Boolean(ok), detail })
  if (!ok) failures += 1
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) console.log(`        ${JSON.stringify(detail)}`)
}

// ════════════════════════════════════════════════════════════════════════════
async function pass(width, height) {
  const tag = `${width}x${height}`
  console.log(`\n══ ${tag} ══`)
  await setViewport(width, height)

  // ── W1-1 c7 · the Access popover: exactly seven checkboxes, new ones last ──
  await boot()
  await evaluate(OPEN_ACCESS)
  await sleep(200)
  await evaluate(FREEZE)
  await sleep(200)
  const popover = await evaluate(`(() => {
    const labels = [...document.querySelectorAll('.preferences-popover label')]
    const rows = labels.map((l) => {
      const r = l.getBoundingClientRect()
      const box = l.querySelector('input')
      return { text: l.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), type: box?.type }
    })
    // Cross-zone sweep: every positioned control pair in the header strip, box
    // intersection plus an elementFromPoint hit at each visual centre.
    const controls = [...document.querySelectorAll('.case-header button, .case-header summary, .preferences-popover input')]
      .filter((e) => e.getBoundingClientRect().width > 0)
    const boxes = controls.map((e) => ({ e, r: e.getBoundingClientRect() }))
    const overlaps = []
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i].r, b = boxes[j].r
        if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
          overlaps.push([boxes[i].e.textContent.trim().slice(0, 24) || boxes[i].e.className, boxes[j].e.textContent.trim().slice(0, 24) || boxes[j].e.className])
        }
      }
    }
    const unreachable = boxes.filter(({ e, r }) => {
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return !hit || !(hit === e || e.contains(hit) || hit.contains(e))
    }).map(({ e }) => e.textContent.trim().slice(0, 24) || e.className)
    return {
      count: labels.length,
      rows,
      preview: !!document.querySelector('.subtitle-preview'),
      previewLines: document.querySelectorAll('.subtitle-preview-line').length,
      previewLeaksBeatClass: document.querySelectorAll('.case-header .scene-beat-line').length,
      overlaps,
      unreachable,
    }
  })()`)
  report.data[`popover@${tag}`] = popover
  record(`[${tag}] Access popover shows exactly 7 checkboxes, the two new ones last`,
    popover.count === 7 &&
      popover.rows[5]?.text === 'Easy read' &&
      popover.rows[6]?.text === 'Subtitle plate',
    popover.rows)
  record(`[${tag}] every preference row is a >= 44px hit target`,
    popover.rows.every((r) => r.h >= 44 && r.w >= 44), popover.rows)
  record(`[${tag}] the subtitle preview is in the DOM and does not reuse the beat's classes`,
    popover.preview && popover.previewLines === 2 && popover.previewLeaksBeatClass === 0, popover)
  record(`[${tag}] header cross-zone sweep: no control pair overlaps, none unreachable`,
    popover.overlaps.length === 0 && popover.unreachable.length === 0,
    { overlaps: popover.overlaps, unreachable: popover.unreachable })
  report.shots.push(await shot('01-access-popover', width, height))

  // ── W1-1 c1 · the visual window, step by step ──────────────────────────────
  await evaluate(`(() => { document.querySelector('.header-preferences').open = false; return true })()`)
  await enterSite('Care ward')
  await stageBeat(0, { flush: false })
  const steps = []
  for (let i = 0; i < 8; i += 1) {
    await evaluate(FREEZE)
    await sleep(160)
    steps.push(await evaluate(WINDOW))
    await evaluate(UNFREEZE)
    if (i === 3) report.shots.push(await shot('02-beat-mid-window', width, height))
    await sleep(700)
  }
  await click('.scene-beat-advance')
  await sleep(700)
  await evaluate(FREEZE)
  await sleep(200)
  const flushed = await evaluate(WINDOW)
  report.data[`window-steps@${tag}`] = steps
  report.data[`window-flushed@${tag}`] = flushed
  record(`[${tag}] at every advance step at most 2 beat lines are painted inside the window`,
    steps.every((s) => s && s.fullyInside <= 2) && flushed.fullyInside <= 2,
    { perStep: steps.map((s) => s && s.fullyInside), flushed: flushed.fullyInside })
  record(`[${tag}] the flushed stanza still mounts >= 6 line nodes (harness contract)`,
    flushed.nodes >= 6, { nodes: flushed.nodes })
  record(`[${tag}] the stanza is painted on a real plate, not a halo`,
    flushed.backgroundImage === 'gradient' || flushed.backgroundColor !== 'rgba(0, 0, 0, 0)',
    { bgColor: flushed.backgroundColor, bgImage: flushed.backgroundImage })
  record(`[${tag}] subject and persona lines compute font-weight >= 400`,
    parseInt(flushed.subjectWeight, 10) >= 400 && parseInt(flushed.personaWeight, 10) >= 400,
    { subject: flushed.subjectWeight, persona: flushed.personaWeight })
  report.shots.push(await shot('03-beat-flushed-window', width, height))

  // ── W1-1 c8 · the subtitle plate toggle ────────────────────────────────────
  const plateOff = await evaluate(WINDOW)
  await setPreference('Subtitle plate', true)
  await evaluate(FREEZE)
  await sleep(220)
  const plateOn = await evaluate(WINDOW)
  const plateClass = await evaluate(`document.querySelector('.annex-app').className`)
  report.data[`plate@${tag}`] = { off: plateOff, on: plateOn, appClass: plateClass }
  record(`[${tag}] subtitlePlate ON adds .subtitle-plate and swaps the scrim for an opaque card`,
    plateClass.includes('subtitle-plate') && plateOn.backgroundColor !== plateOff.backgroundColor,
    { off: plateOff.backgroundColor, on: plateOn.backgroundColor, appClass: plateClass })
  report.shots.push(await shot('04-subtitle-plate-on', width, height))
  await setPreference('Subtitle plate', false)
  await evaluate(FREEZE)
  await sleep(220)
  const plateBack = await evaluate(WINDOW)
  record(`[${tag}] toggling it OFF returns the stanza to its pre-toggle painting`,
    plateBack.backgroundColor === plateOff.backgroundColor &&
      plateBack.backgroundImage === plateOff.backgroundImage,
    { before: plateOff.backgroundColor, after: plateBack.backgroundColor })

  // ── W1-1 c6 · larger text keeps the window ────────────────────────────────
  const standardSize = parseFloat(plateOff.subjectSize)
  await setPreference('Larger text', true)
  await evaluate(FREEZE)
  await sleep(260)
  const large = await evaluate(WINDOW)
  report.data[`large-text@${tag}`] = { standardSize, large }
  record(`[${tag}] Larger text scales the staged subject line by >= 112.5%`,
    parseFloat(large.subjectSize) >= standardSize * 1.125 - 0.01,
    { standard: standardSize, large: large.subjectSize })
  record(`[${tag}] a larger face does not push a third line into the window`,
    large.fullyInside <= 2, { fullyInside: large.fullyInside, nodes: large.nodes })
  await setPreference('Larger text', false)
  await sleep(200)

  // ── W1-3 · Easy Read ──────────────────────────────────────────────────────
  await evaluate(UNFREEZE)
  const bodyTextOff = await evaluate(`document.body.innerText`)
  await setPreference('Easy read', true)
  await sleep(400)
  await evaluate(FREEZE)
  await sleep(240)
  const easy = await evaluate(WINDOW)
  const easyClasses = await evaluate(`(() => ({
    onShell: document.querySelectorAll('.easy-read').length,
    appClass: document.querySelector('.annex-app').className,
  }))()`)
  report.data[`easy-read-beat@${tag}`] = { ...easy, ...easyClasses }
  record(`[${tag}] Easy Read reaches the shell and lifts the stanza window`,
    easyClasses.onShell === 1 && easy.fullyInside === easy.nodes,
    { ...easyClasses, fullyInside: easy.fullyInside, nodes: easy.nodes, mask: easy.maskImage })
  record(`[${tag}] Easy Read drops the beat halo and forces an opaque plate (alpha >= 0.80)`,
    easy.subjectShadow === 'none' &&
      (parseFloat((easy.backgroundColor.match(/[\d.]+\)$/) ?? ['1)'])[0]) >= 0.8 ||
        !easy.backgroundColor.startsWith('rgba')),
    { shadow: easy.subjectShadow, bg: easy.backgroundColor })
  report.shots.push(await shot('05-easy-read-beat', width, height))

  // c3 · the bounded uppercase sweep, shell + every portal root.
  const SWEEP = `(() => {
    const roots = [document.querySelector('.annex-app'), ...document.querySelectorAll('.deposition-portal, .scene-detail-portal, .casefile-portal')].filter(Boolean)
    const bad = []
    for (const root of roots) {
      for (const el of [root, ...root.querySelectorAll('*')]) {
        const cs = getComputedStyle(el)
        if (cs.textTransform !== 'uppercase') continue
        const ls = cs.letterSpacing
        if (ls === 'normal') continue
        const px = parseFloat(ls); const fs = parseFloat(cs.fontSize)
        if (!(px / fs > 0.06)) continue
        // Own text only, so a container is not blamed for its children.
        const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(' ').trim()
        const words = own.split(/\\s+/).filter(Boolean).length
        if (words > 4) bad.push({ cls: el.className?.toString?.().slice(0, 60), words, ls, text: own.slice(0, 70) })
      }
    }
    return bad })()`
  const sweep = await evaluate(SWEEP)
  report.data[`easy-read-sweep@${tag}`] = sweep
  record(`[${tag}] Easy Read: no tracked-out uppercase run longer than 4 words`, sweep.length === 0, sweep)

  await evaluate(UNFREEZE)
  await sleep(300)
  const bodyTextOn = await evaluate(`document.body.innerText`)
  // Case-INSENSITIVE on purpose. innerText reflects text-transform, and undoing
  // decorative uppercase is the whole point of the mode: comparing raw casing
  // would report "SAMPLE" -> "Sample" as removed content. The claim under test is
  // that no TEXT disappears, not that no glyph changes shape.
  const norm = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim()
  const onNorm = norm(bodyTextOn)
  const lost = bodyTextOff
    .split('\n').map((l) => norm(l)).filter(Boolean)
    .filter((l) => !onNorm.includes(l))
  report.data[`easy-read-textdiff@${tag}`] = { lost }
  record(`[${tag}] Easy Read removes no content — every visible line survives`, lost.length === 0, lost.slice(0, 8))

  // ── W1-2 · Record Mode, with every preference on ──────────────────────────
  await setPreference('High contrast', true)
  await setPreference('Reduce motion', true)
  await setPreference('Larger text', true)
  await setPreference('Subtitle plate', true)
  await sleep(300)
  await click('.scene-detail-summon')
  await sleep(500)
  const recordDetail = await evaluate(`(() => {
    const root = document.querySelector('.scene-detail-portal')
    return {
      recordModeNodes: document.querySelectorAll('.record-mode').length,
      portalClass: root?.className ?? null,
    }
  })()`)
  record(`[${tag}] one open record surface = exactly one .record-mode root`,
    recordDetail.recordModeNodes === 1, recordDetail)
  record(`[${tag}] all five preference classes compose on the portal root`,
    ['record-mode', 'reduce-motion', 'high-contrast', 'large-text', 'easy-read', 'subtitle-plate']
      .every((c) => recordDetail.portalClass?.split(' ').includes(c)),
    recordDetail.portalClass)
  report.shots.push(await shot('06-easy-read-detail-drawer', width, height))
  await click('.scene-detail-close')
  await sleep(350)

  // Turn the extra preferences back off; measure Record Mode's own typography.
  for (const p of ['High contrast', 'Easy read', 'Larger text', 'Subtitle plate']) {
    await setPreference(p, false)
  }
  await setPreference('Reduce motion', false)
  await sleep(300)

  const MEASURE = `(() => {
    const sels = ['.deposition-statement', '.scene-detail-description', '.scene-detail-method p', '.rail-panel p', '.rail-note']
    const out = []
    for (const sel of sels) {
      for (const el of document.querySelectorAll(sel)) {
        const cs = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        if (r.width < 4) continue
        // Mean glyph advance from the rendered text itself, via a canvas using
        // the element's own resolved font — never a guessed ch estimate.
        const c = document.createElement('canvas').getContext('2d')
        c.font = cs.font || (cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily)
        const text = el.textContent.trim()
        if (text.length < 20) continue
        const advance = c.measureText(text).width / text.length
        const contentWidth = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
        out.push({
          sel,
          measureCh: Math.round(contentWidth / advance),
          lineHeight: Math.round((parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)) * 100) / 100,
          fontSize: cs.fontSize,
        })
        break
      }
    }
    return out })()`

  await click('.scene-detail-summon')
  await sleep(500)
  await evaluate(FREEZE)
  await sleep(220)
  const detailMeasure = await evaluate(MEASURE)
  report.data[`record-detail@${tag}`] = detailMeasure
  record(`[${tag}] Record Mode detail prose: measure 45-80ch and line-height >= 1.5`,
    detailMeasure.length > 0 &&
      detailMeasure.every((m) => m.measureCh >= 45 && m.measureCh <= 80 && m.lineHeight >= 1.5),
    detailMeasure)
  report.shots.push(await shot('07-record-mode-detail', width, height))
  await click('.scene-detail-close')
  await sleep(350)

  await click('.casefile-summon')
  await sleep(600)
  await evaluate(FREEZE)
  await sleep(220)
  const caseFile = await evaluate(`(() => {
    const root = document.querySelector('.casefile-portal')
    const sizes = new Set()
    for (const el of root.querySelectorAll('*')) {
      const cs = getComputedStyle(el)
      if (!el.textContent.trim()) continue
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim())) continue
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      sizes.add(cs.fontSize)
    }
    return { recordModeNodes: document.querySelectorAll('.record-mode').length, distinctFontSizes: [...sizes].sort(), portalClass: root.className }
  })()`)
  const caseFileMeasure = await evaluate(MEASURE)
  report.data[`record-casefile@${tag}`] = { ...caseFile, measure: caseFileMeasure }
  record(`[${tag}] the case file is one .record-mode root`, caseFile.recordModeNodes === 1, caseFile.portalClass)
  record(`[${tag}] Record Mode case-file prose: measure 45-80ch and line-height >= 1.5`,
    caseFileMeasure.length > 0 &&
      caseFileMeasure.every((m) => m.measureCh >= 45 && m.measureCh <= 80 && m.lineHeight >= 1.5),
    caseFileMeasure)
  console.log(`        case-file distinct font sizes: ${caseFile.distinctFontSizes.length} [${caseFile.distinctFontSizes.join(', ')}]`)
  report.shots.push(await shot('08-record-mode-casefile', width, height))
  await click('.casefile-close')
  await sleep(350)

  // ── W1-1 c10 · the preference survives a reload ───────────────────────────
  await setPreference('Subtitle plate', true)
  await setPreference('Easy read', true)
  await sleep(300)
  await send('Page.navigate', { url: `${APP_URL}?boot=reload${bootCounter}` })
  await waitFor(`document.readyState === 'complete'`)
  await sleep(1200)
  const afterReload = await evaluate(`(() => {
    const stored = JSON.parse(localStorage.getItem('the-annex.accessibility.v1') || '{}')
    const shell = document.querySelector('.annex-app')?.className ?? ''
    return { stored, shell }
  })()`)
  report.data[`reload@${tag}`] = afterReload
  record(`[${tag}] both new preferences survive a reload, in storage and on the shell`,
    afterReload.stored.subtitlePlate === true && afterReload.stored.easyRead === true &&
      afterReload.shell.includes('subtitle-plate') && afterReload.shell.includes('easy-read'),
    afterReload)

  // ── W1-1 c2 · reduced motion (OS signal) shows every line ─────────────────
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await boot()
  await enterSite('Care ward')
  await stageBeat(0, { flush: false })
  await sleep(500)
  await evaluate(FREEZE)
  await sleep(240)
  const rm = await evaluate(WINDOW)
  report.data[`reduced-motion@${tag}`] = rm
  record(`[${tag}] reduced motion: every mounted line lies fully inside — nothing clipped`,
    rm.nodes >= 6 && rm.clipped === 0, rm)
  report.shots.push(await shot('09-reduced-motion-beat', width, height))
  await send('Emulation.setEmulatedMedia', { features: [] })
  await evaluate(UNFREEZE)
}

for (const [w, h] of [[1280, 800], [375, 812]]) {
  await pass(w, h)
}

report.failures = failures
writeFileSync(join(OUT_DIR, `wave1-probe-${LABEL}.json`), JSON.stringify(report, null, 2))
console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'} — ${report.checks.length} checks, wrote wave1-probe-${LABEL}.json`)
clearTimeout(killTimer)
chromeProcess.kill('SIGKILL')
process.exit(failures === 0 ? 0 : 1)

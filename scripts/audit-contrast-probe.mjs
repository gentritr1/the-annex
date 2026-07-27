// Composited-contrast probe for the design-gap pass.
//
// The changed surfaces are now TRANSLUCENT over a photograph, so the declared
// background colour is no longer the background the text is read against. A
// probe that reads getComputedStyle().backgroundColor would verify a fiction.
// This one measures the pixels that are actually painted:
//
//   1. freeze transitions/animations (transition-clock scar) and settle;
//   2. record each target's rect and computed colour;
//   3. hide ONLY the glyphs (visibility: hidden keeps layout and the panel fill
//      identical, so the sampled band is the true composited background);
//   4. paint a swatch strip of every text colour into the same frame — that is
//      how an oklch() colour is resolved to sRGB: through the real rendering
//      pipeline, never through arithmetic on the string (recorded oklch scar);
//   5. screenshot, decode in-page on a canvas, and report the WORST pixel in
//      each band — min and max luminance, so a bright highlight in the scene
//      cannot hide behind an average.
//
// Usage: node scripts/audit-contrast-probe.mjs [app-url]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://127.0.0.1:3000/'
const OUT_DIR = new URL('../evidence/design-gap-fix/', import.meta.url).pathname
mkdirSync(OUT_DIR, { recursive: true })

const SAVE_KEY = 'the-annex.case-77.save.v1'
const SETTINGS_KEY = 'the-annex.accessibility.v1'
// Seeded into the standalone settings key at boot, so the probe can measure a
// preference mode (Easy Read's stricter 7:1 floor) through the real load path
// rather than by poking a class onto the shell.
//   PROBE_SETTINGS='{"easyRead":true}' node scripts/audit-contrast-probe.mjs
const SETTINGS = {
  reducedMotion: false,
  highContrast: false,
  textSize: 'standard',
  showTrustNumbers: false,
  ambientSound: false,
  easyRead: false,
  subtitlePlate: false,
  ...JSON.parse(process.env.PROBE_SETTINGS ?? '{}'),
}
// Easy Read exists to be a STRICTER read, so it is held to AAA on prose.
const AA = 4.5
const FLOOR_NORMAL = SETTINGS.easyRead ? 7 : AA
const SUFFIX = process.env.PROBE_LABEL ? `-${process.env.PROBE_LABEL}` : ''

const chromeProcess = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-contrast-${Date.now()}`,
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
}, 600000)
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

async function setViewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
}

let bootCounter = 0
async function boot() {
  bootCounter += 1
  await send('Page.navigate', { url: 'about:blank' })
  await sleep(180)
  await send('Page.navigate', { url: APP_URL })
  await waitFor(`document.readyState === 'complete'`)
  await evaluate(`(() => {
    try {
      localStorage.clear()
      localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, ${JSON.stringify(JSON.stringify(SETTINGS))})
    } catch {}
    window.__stale = true; return true })()`)
  await send('Page.navigate', { url: `${APP_URL}?boot=${bootCounter}` })
  await waitFor(`window.__stale === undefined && document.readyState === 'complete'`)
  if (!(await waitForText('button', 'Open a new audit'))) throw new Error('landing did not render')
  await click('button', 'Open a new audit')
  await waitFor(`!!document.querySelector('.choice-row')`)
  await click('.choice-row')
  await waitFor(`!!document.querySelector('.site-switcher')`)
  await sleep(500)
}
// E6b. An authored Case 77 route admits ONE exhibit per closed location, so no
// single filed run puts all four EvidenceStatus hands on one panel. The four
// treatments are per-status CSS, and a probe that only ever sees the status the
// walk happened to file would report the surface clean while three of its four
// registers had never been sampled — the same blindness the round-2 ledger pass
// found below the fold, in a new place.
//
// So the exhibit list is SEEDED and the seeding is disclosed: only `evidence` is
// rewritten in the app's own save, to four real Case 77 exhibit ids (one per
// status), and the run comes back through the app's own Continue path so
// `decodeGameState` validates it. Every string and status on screen is authored
// content; only the route to the state is seeded.
const SEEDED_EXHIBIT_IDS = ['custody-chain', 'sensory-echo', 'contradictory-scar', 'sensor-omission']
async function seedFourExhibitsAndResume() {
  bootCounter += 1
  const ok = await evaluate(`(() => {
    try {
      const raw = localStorage.getItem('the-annex.case-77.save.v1')
      if (!raw) return false
      const save = JSON.parse(raw)
      save.evidence = ${JSON.stringify(SEEDED_EXHIBIT_IDS)}
      localStorage.setItem('the-annex.case-77.save.v1', JSON.stringify(save))
    } catch { return false }
    window.__stale = true; return true })()`)
  if (!ok) return false
  await send('Page.navigate', { url: `${APP_URL}?boot=${bootCounter}` })
  await waitFor(`window.__stale === undefined && document.readyState === 'complete'`)
  if (!(await waitForText('button', 'Continue local case'))) return false
  await click('button', 'Continue local case')
  if (!(await waitFor(`!!document.querySelector('.site-switcher')`))) return false
  await sleep(600)
  return true
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

// Arm and file the method at plate-zone `index`, then flush the whole stanza so
// the staged beat is a STILL frame before anything is measured. Both clicks are
// el.click() (never dispatchEvent — recorded preview-pane scar), and the arm is
// not disarmed between them because el.click() fires no pointerdown and moves no
// focus away. The plate's data-preview-treatment follows the FILED action
// (resolved-wins-over-preview, src/scene/previewTreatment.ts:20), so filing zone
// 0 of Care ward 12 measures the beat under 'listen' and zone 1 under 'pressure'.
async function stageBeat(index) {
  const armed = await evaluate(`(() => {
    const b = document.querySelectorAll('.scene-zone button')[${index}]
    if (!b) return false
    b.click(); return true })()`)
  if (!armed) throw new Error(`scene zone ${index} absent`)
  await sleep(320)
  await evaluate(`(() => { document.querySelectorAll('.scene-zone button')[${index}].click(); return true })()`)
  await waitFor(`!!document.querySelector('.scene-beat')`, 9000)
  // Flush: one press of the canonical advance control reveals every remaining
  // line without completing the stanza, so the frame stops moving.
  await sleep(400)
  await click('.scene-beat-advance')
  await sleep(600)
  return evaluate(`(() => ({
    phase: document.querySelector('.scene-beat')?.dataset.phase ?? null,
    lineNodes: document.querySelectorAll('.scene-beat-line').length,
    treatment: document.querySelector('.site-closeup-stage')?.dataset.previewTreatment ?? null,
  }))()`)
}

const FREEZE = `(async () => {
  document.getElementById('cf')?.remove()
  const s = document.createElement('style'); s.id='cf'
  s.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }'
  document.head.appendChild(s)
  await new Promise((r)=>requestAnimationFrame(()=>requestAnimationFrame(r)))
  return true })()`

// ── The probe ───────────────────────────────────────────────────────────────
const TARGETS = JSON.stringify([
  // The text that now reads against a translucent fill over the photograph.
  ['.room-console .choice-body strong', 'docked console · choice title'],
  ['.room-console .choice-body > span', 'docked console · choice body'],
  ['.room-console .choice-body small', 'docked console · cost line'],
  ['.room-console .room-prompt, .room-console .as-lead, .room-console .cr-lead', 'docked console · prompt'],
  ['.site-closeup-zone-label', 'on-plate zone label'],
  ['.world-caption', 'on-plate caption'],
  // The largest narrative text in the game, staged over the photograph. Added in
  // Wave 1 (W1-1): before this it was the only on-plate text never measured, and
  // the roadmap's premise — that a text-shadow halo is not a scrim — is only a
  // premise until these two rows exist.
  ['.scene-beat-line--subject', 'staged beat · subject line'],
  ['.scene-beat-line--persona', 'staged beat · persona line'],
  // The text that now reads against a translucent panel over the page gradient.
  ['.site-header h2', 'inspector · surface heading'],
  ['.site-description', 'inspector · record body'],
  ['.field-dock-copy > p', 'dock · standing instruction'],
  ['.field-objectives > span', 'command bar · counter label'],
  ['.field-threshold', 'command bar · threshold line'],
  // RECORD MODE (W1-2). The three record surfaces borrowed Scene Mode's
  // typography and none of their prose had been measured either.
  ['.deposition-statement', 'record mode · sworn statement'],
  ['.scene-detail-description', 'record mode · surface record'],
  ['.scene-detail-method p', 'record mode · method prose'],
  ['.rail-panel p', 'record mode · case-file prose'],
  ['.rail-note', 'record mode · case-file note'],
  // W1-4 purpose copy. ADDED targets, never a relaxed one: five new lines land
  // on four different backgrounds (the command bar, the inspector panel, the
  // summon pill over the plate, the lattice page), and copy that a first-timer
  // is meant to read is exactly the copy that may not be measured by inference.
  ['.field-purpose', 'command bar · purpose line'],
  ['.site-cost-note', 'inspector · site cost line'],
  ['.casefile-summon-why', 'summon pill · purpose line'],
  ['.lattice-purpose', 'lattice · purpose line'],
  ['.people-purpose', 'roster · purpose line'],
  // THE LEDGER (E3, Wave 2 round 2). ADDED targets, never a relaxed one. The
  // ledger's prose sits inside `.rail-panel p`, which is already measured — but
  // its own two dim registers are not: the mono citation at --fog-dim and the
  // cost column at --fog, both at --type-micro, which is the smallest type the
  // panel prints. Those are the rows that could fail; measuring only the bright
  // prose would be measuring the safe half of a new surface.
  ['.ledger-findings-list li', 'ledger · findings sentence'],
  ['.ledger-moment-title', 'ledger · moment title'],
  ['.ledger-moment-cite', 'ledger · moment citation'],
  ['.ledger-moment-cost', 'ledger · cost column'],
  ['.ledger-filing-title', 'ledger · filing title'],
  ['.ledger-filing-cite', 'ledger · filing citation'],
  ['.ledger-pair-half', 'ledger · contradiction pair'],
  ['.ledger-voice', 'ledger · voice heading'],
  // THE INSPECTOR COLLAPSE (E1b, Wave 2 round 3). ADDED targets, never a
  // relaxed one. Two registers the spine puts on screen that nothing measured
  // before — the status stamp (which had NO target at all, collapsed or not) and
  // the vertical summon pill — plus the standing line the collapse RELOCATES to
  // the Location detail drawer, which would otherwise move from a measured home
  // (`.site-cost-note`, still measured on the concourse surface) to an
  // unmeasured one. The spine's own heading needs no new target: it is the same
  // `.site-header h2` element, restyled rather than replaced.
  ['.site-inspector--spine .site-state', 'spine · status stamp'],
  ['.site-spine-summon', 'spine · summon to the full text'],
  ['.scene-detail-standing-note', 'record mode · relocated standing line'],
  // DOCUMENT SEMANTICS (E6b, Wave 2 round 4). ADDED targets, never a relaxed
  // one. Each status hand is named SEPARATELY rather than measured through one
  // `.evidence-claim` row: the four treatments are different declarations on
  // different rows, one of them (verified) moves the row's own colour, and a
  // single selector would have sampled whichever row happened to be first and
  // reported the other three as measured when they never were. The seal is
  // listed because it is the one treatment that CHANGES a citation's colour
  // (--fog-dim → --fog) and puts a border around it, so the row it replaces is
  // no longer the row the ledger block above measured.
  [".evidence-list > li[data-status='verified'] > .evidence-claim", 'evidence · verified hand'],
  [".evidence-list > li[data-status='disputed'] > .evidence-claim", 'evidence · disputed hand'],
  [".evidence-list > li[data-status='anomaly'] > .evidence-claim", 'evidence · anomaly hand'],
  [".evidence-list > li[data-status='testimony'] > .evidence-claim", 'evidence · testimony hand'],
  ['.evidence-contradiction', 'evidence · correction block'],
  ['.evidence-source', 'evidence · source citation'],
  ['.ledger-seal', 'ledger · pressed seal'],
  ['.ledger-pair-against', 'ledger · correction half'],
])

const PREPARE = `(() => {
  const targets = ${TARGETS}
  const found = []
  for (const [sel, label] of targets) {
    // Every match, not just the first. The staged stanza now paints a two-line
    // WINDOW while keeping every revealed line mounted, so document.querySelector
    // often returns a line that has been pushed off the top of the plate and is
    // not painted at all — measuring it would silently report "no target" for the
    // very text that IS on screen. The first match with visible glyph boxes wins.
    for (const el of document.querySelectorAll(sel)) {
    // INVISIBILITY BY ANCESTOR OPACITY. The occlusion rule below already encodes
    // "a target with no reader has no contrast problem" for covered elements;
    // the same holds for an element inside an opacity:0 group (the room-phase
    // zone suppressions). Its own background paints nothing, elementFromPoint
    // still hits it (pointer-events is forced on for the hit test), and the
    // sample reports the plate as if it sat behind readable glyphs — a false
    // failure measured on the custody surface at exactly the suppressed phase.
    let effOp = 1
    for (let n2 = el; n2 && n2.nodeType === Node.ELEMENT_NODE; n2 = n2.parentElement) {
      const opv = parseFloat(getComputedStyle(n2).opacity)
      effOp *= Number.isFinite(opv) ? opv : 1
    }
    if (effOp < 0.05) continue
    // Sample the GLYPH line boxes, not the element box. An element rect includes
    // its own 1px currentColor border and, for a flex caption spanning the plate,
    // several hundred px of empty track — sampling that reports the brightest
    // pixel anywhere in the strip as if it sat behind a letter.
    const boxes = []
    const walk = (n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        if (!n.nodeValue.trim()) return
        const rg = document.createRange()
        rg.selectNodeContents(n)
        for (const b of rg.getClientRects()) {
          if (b.width < 2 || b.height < 2) continue
          // Inset 1px so an adjacent border or underline is not sampled as background.
          boxes.push({ x: Math.round(b.left) + 1, y: Math.round(b.top) + 1, w: Math.round(b.width) - 2, h: Math.round(b.height) - 2 })
        }
        return
      }
      if (n.nodeType !== Node.ELEMENT_NODE) return
      const cs = getComputedStyle(n)
      if (cs.display === 'none' || cs.visibility === 'hidden') return
      n.childNodes.forEach(walk)
    }
    walk(el)
    // OCCLUSION. A target that is covered by a higher-stacked surface has no
    // contrast problem, because it has no reader — and sampling "behind" it
    // would measure the covering surface's own glyphs as if they were the
    // background. (Observed: the plate caption under a docked console reported
    // a fixed 1.66:1 against --fog-dim, which is console text, not scene art.)
    // pointer-events is forced on for the hit test only: the caption sets it to
    // none, which would otherwise make elementFromPoint see straight through it.
    //
    // THE TEST IS PER-ROW, NOT PER-BOX-CENTRE, and that is a resolution fix
    // rather than a relaxation. The centre-only version answered "is this line
    // covered?" with one sample, so a line whose centre was clear but whose TOP
    // ROWS sat under the sticky rail-tabs bar was sampled across the bar --
    // including the active tab's amber underline. Measured, at 1920 on the two
    // scrolled ledger surfaces: the ledger findings sentence reported bright bg
    // [220, 147, 46] (= --amber) and 2.15 : 1 on the SAME glyph box that reads
    // [4, 6, 7] and 17.13 : 1 at rest, three lines further down the same panel.
    // The pixels above the bar's edge are the bar's, not the target's, and
    // attributing them to the target is a fabricated failure of exactly the kind
    // this file has twice been corrected for.
    //
    // QUALIFICATION IS UNCHANGED; ONLY THE SAMPLE NARROWS. The box still has to
    // pass the ORIGINAL centre-point test to be measured at all, so no target
    // that this probe used to reject is admitted by this edit and no target it
    // used to choose is displaced. Once a box qualifies, the sampled band is
    // clipped to the contiguous run of rows AROUND THAT CENTRE that still hit
    // the target — the rows the occluder owns are simply not the target's
    // pixels. A sample can therefore only shrink, never grow, and it can only
    // shrink into pixels the centre test already declared readable.
    //
    // A first draft of this fix took the LONGEST clear run instead of the run
    // containing the centre, and thereby let a box that was 90% covered qualify
    // on a 2px sliver. That silently changed WHICH staged beat line the probe
    // selected, and reported three brand-new failures (persona line 10.71 ->
    // 3.42 : 1) that were an artifact of the new selection, not of the app.
    // Recorded rather than deleted: an instrument edit that changes which
    // element is measured is not a resolution fix, it is a different probe.
    const priorPE = el.style.pointerEvents
    el.style.pointerEvents = 'auto'
    const hitsTarget = (x, y) => {
      const hit = document.elementFromPoint(x, y)
      return !!hit && (hit === el || el.contains(hit) || hit.contains(el))
    }
    const visible = []
    for (const b of boxes) {
      const cx = b.x + b.w / 2
      // The original test, verbatim: centre of the box.
      if (!hitsTarget(cx, b.y + b.h / 2)) continue
      const centreRow = Math.min(b.h - 1, Math.max(0, Math.floor(b.h / 2)))
      let top = centreRow
      while (top > 0 && hitsTarget(cx, b.y + top - 1 + 0.5)) top -= 1
      let bottom = centreRow
      while (bottom < b.h - 1 && hitsTarget(cx, b.y + bottom + 1 + 0.5)) bottom += 1
      const h = bottom - top + 1
      if (h < 2) continue
      visible.push({ x: b.x, y: b.y + top, w: b.w, h })
    }
    el.style.pointerEvents = priorPE
    if (!visible.length) continue
    boxes.length = 0
    boxes.push(...visible)
    const cs = getComputedStyle(el)
    found.push({ sel, label, color: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight, boxes })
    break
    }
  }
  // Hide ONLY the glyphs. NOT visibility:hidden — that also hides the element's
  // OWN background, so a label with a scrim chip would be measured against
  // whatever lies behind the chip and report a failure it does not have.
  // Transparent text plus no text-shadow leaves every fill painted and removes
  // the glyphs and their halo: conservative, because the halo only ever helps.
  window.__hidden = []
  window.__hiddenSet = new Set()
  for (const f of found) {
    // Descendants too: a child with its own colour (the counter's white
    // <strong> inside a dim caps label) does not inherit transparent, and its
    // surviving glyphs would then be sampled as if they were background.
    // DEDUPE, and it is load-bearing. An element reachable from two targets —
    // one target nested inside another, which W1-4's .field-purpose inside
    // .field-threshold is the first case of — was pushed onto __hidden twice:
    // first with its real inline colour, then with the 'transparent' the first
    // push had just written. RESTORE replays in order, so the LAST write won and
    // the element stayed inline-transparent for the whole rest of the run. Every
    // later surface then read its computed colour as rgba(0, 0, 0, 0) and scored
    // it 1.00 : 1 — a fabricated failure on text that renders correctly, and one
    // that would have been read as a real contrast defect. Latent since the
    // probe was written; only nesting fires it.
    for (const root of document.querySelectorAll(f.sel)) {
      for (const el of [root, ...root.querySelectorAll('*')]) {
        if (window.__hiddenSet.has(el)) continue
        window.__hiddenSet.add(el)
        window.__hidden.push([el, el.style.color, el.style.textShadow])
        el.style.color = 'transparent'
        el.style.textShadow = 'none'
      }
    }
  }
  // Swatch strip: each text colour rendered by the browser, so an oklch() value
  // is resolved to sRGB by the rendering pipeline and never by string maths.
  const strip = document.createElement('div')
  strip.id = '__swatches'
  strip.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;display:flex;pointer-events:none'
  found.forEach((f, i) => {
    const s = document.createElement('span')
    s.style.cssText = 'width:12px;height:12px;display:block;background:' + f.color
    strip.appendChild(s)
    f.swatch = { x: i * 12 + 6, y: 6 }
  })
  document.body.appendChild(strip)
  return found
})()`

const RESTORE = `(() => {
  document.getElementById('__swatches')?.remove()
  for (const [el, c, t] of (window.__hidden || [])) { el.style.color = c; el.style.textShadow = t }
  window.__hidden = []
  window.__hiddenSet = new Set()
  return true })()`

const SAMPLE = (dataUrl, found) => `(async () => {
  const img = new Image()
  img.src = ${JSON.stringify(dataUrl)}
  await img.decode()
  const c = document.createElement('canvas')
  c.width = img.naturalWidth; c.height = img.naturalHeight
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const lum = (r, g, b) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  const out = []
  for (const f of ${JSON.stringify(found)}) {
    const s = ctx.getImageData(f.swatch.x, f.swatch.y, 1, 1).data
    const fg = lum(s[0], s[1], s[2])
    let min = 1, max = 0, minPx = null, maxPx = null, sampled = 0
    for (const { x, y, w, h } of f.boxes) {
      if (w < 1 || h < 1 || x < 0 || y < 0 || x + w > c.width || y + h > c.height) continue
      const d = ctx.getImageData(x, y, w, h).data
      sampled += w * h
      for (let i = 0; i < d.length; i += 4) {
        const L = lum(d[i], d[i + 1], d[i + 2])
        if (L < min) { min = L; minPx = [d[i], d[i + 1], d[i + 2]] }
        if (L > max) { max = L; maxPx = [d[i], d[i + 1], d[i + 2]] }
      }
    }
    if (!sampled) continue
    out.push({
      label: f.label, sel: f.sel, fontSize: f.fontSize, fontWeight: f.fontWeight,
      glyphBoxes: f.boxes.length, sampledPx: sampled,
      textColor: f.color, textRgb: [s[0], s[1], s[2]],
      darkestBg: minPx, brightestBg: maxPx,
      ratioOnDarkest: Math.round(ratio(fg, min) * 100) / 100,
      ratioOnBrightest: Math.round(ratio(fg, max) * 100) / 100,
    })
  }
  return out
})()`

const report = { url: APP_URL, capturedAt: new Date().toISOString(), node: process.version, surfaces: {} }
let failures = 0

async function probe(name, width, height) {
  await evaluate(FREEZE)
  await sleep(260)
  const found = await evaluate(PREPARE)
  if (!found.length) {
    console.log(`${name}: no targets present`)
    await evaluate(RESTORE)
    return
  }
  await sleep(140)
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  writeFileSync(join(OUT_DIR, `contrast-band-${name}${SUFFIX}-${width}x${height}.png`), Buffer.from(data, 'base64'))
  const rows = await evaluate(SAMPLE(`data:image/png;base64,${data}`, found))
  await evaluate(RESTORE)
  report.surfaces[`${name}@${width}`] = rows
  console.log(`\n── ${name} @ ${width}x${height}`)
  for (const r of rows) {
    // WCAG AA: 4.5:1 for normal text, 3:1 for >=18.66px bold or >=24px.
    const px = parseFloat(r.fontSize)
    const large = px >= 24 || (px >= 18.66 && parseInt(r.fontWeight, 10) >= 700)
    const floor = large ? (SETTINGS.easyRead ? 4.5 : 3) : FLOOR_NORMAL
    const worst = Math.min(r.ratioOnDarkest, r.ratioOnBrightest)
    const ok = worst >= floor
    if (!ok) failures += 1
    console.log(
      `  ${ok ? 'PASS' : 'FAIL'}  ${r.label.padEnd(34)} ${r.fontSize.padStart(7)}/${r.fontWeight}  worst ${worst.toFixed(2)}:1  (floor ${floor})  dark ${r.ratioOnDarkest} · bright ${r.ratioOnBrightest}  bg[${r.darkestBg}]→[${r.brightestBg}]`,
    )
  }
}

// THE MATRIX, EXTENDED (ultra-wide round). 1920x1080 joins 1280x800 and
// 375x812, and every target above is measured at it — not a subset.
//
// The reason is written into the last block of styles.css, in this probe's own
// words: the on-plate rows are read against a PHOTOGRAPH, so their background
// is whatever the plate's crop happens to put behind a glyph, and widening the
// plate has already moved that number once (the docked console's lead line went
// 4.51 -> 4.33 : 1 purely because the crop moved). The ultra-wide letterbox
// changes the crop again, and by more: the plate now shows the WHOLE frame
// instead of a centre slice, so every on-plate row is over pixels this probe
// has never sampled. A round that changed which part of the photograph is on
// screen and did not re-measure the text on top of it would be verifying a
// fiction — which is the premise this file was written on.
for (const [w, h] of [[1280, 800], [1920, 1080], [375, 812]]) {
  await setViewport(w, h)
  await boot()
  await probe('concourse', w, h)
  // W1-4. Two of the five purpose lines only exist BEFORE anything is filed, so
  // the existing walk — which reaches the case file after a filing and never
  // reaches the lattice at all — could not see them. Two added surfaces, taken
  // on the same fresh run, before the walk continues unchanged.
  if (await click('.casefile-summon')) {
    await sleep(700)
    await click('#rail-tab-people')
    await sleep(400)
    await probe('casefile-people-fresh', w, h)
    await click('.casefile-close')
    await sleep(400)
  }
  await enterSite('Registry intake')
  await probe('console-custody', w, h)
  // E1b. The one state that carries the RELOCATED standing line: the inspector
  // collapsed to its spine mid-ritual, and the drawer opened from the spine's
  // own summon. Skipped at 375, where the column never collapses and the line
  // stays on `.site-cost-note` (measured on the concourse surface at both
  // widths) — the click simply finds no spine summon and returns false.
  if (await click('.site-spine-summon')) {
    await sleep(700)
    await probe('record-detail-ritual', w, h)
    await click('.scene-detail-close')
    await sleep(400)
  }
  await enterSite('Maintenance spine')
  await probe('console-acoustic', w, h)
  await enterSite('Care ward 12')
  await probe('zones-care-ward', w, h)
  // The staged beat, once per authored preview treatment. Each pass re-boots so
  // the second method is filed on a plate that is not already resolved.
  for (const [zone, label] of [[0, 'listen'], [1, 'pressure']]) {
    if (zone > 0) {
      await boot()
      await enterSite('Care ward 12')
    }
    const staged = await stageBeat(zone)
    console.log(`  · staged beat (${label}): phase=${staged.phase} nodes=${staged.lineNodes} treatment=${staged.treatment}`)
    report.surfaces[`beat-${label}-staging@${w}`] = staged
    await probe(`beat-${label}`, w, h)
  }
  // The record surfaces, reached from the same filed run.
  await click('.scene-beat-advance')
  await sleep(600)
  if (await click('.scene-detail-summon')) {
    await sleep(600)
    await probe('record-detail', w, h)
    await click('.scene-detail-close')
    await sleep(400)
  }
  if (await click('.casefile-summon')) {
    await sleep(700)
    await probe('record-casefile', w, h)
    // E3. The ledger, on the SAME filed run and the same open drawer, so its
    // chronology holds a real filing (a fresh-run ledger has one moment, no
    // filings and no contradiction pair — half its registers would be absent).
    if (await click('#rail-tab-ledger')) {
      await sleep(500)
      await probe('record-ledger', w, h)
      // The panel is taller than the drawer, and PREPARE only samples glyph
      // boxes that elementFromPoint actually hits — so a target below the fold
      // is silently "not present" rather than measured. The contradiction pair
      // and the voice heading both live near the end of a filing moment, so each
      // is scrolled to the middle of the scroll port and measured there. Skipping
      // this would have reported the ledger clean while two of its registers had
      // never been sampled at all.
      for (const [sel, name] of [['.ledger-pair', 'record-ledger-pair'], ['.ledger-voice', 'record-ledger-voice']]) {
        const scrolled = await evaluate(`(() => {
          const el = document.querySelector(${JSON.stringify(sel)})
          if (!el) return false
          el.scrollIntoView({ block: 'center' })
          return true })()`)
        if (!scrolled) continue
        await sleep(400)
        await probe(name, w, h)
      }
    }
    await click('.casefile-close')
    await sleep(400)
  }
  // E6b. The evidence tab, carrying all four status hands and their correction
  // blocks. Reached AFTER the ledger because it reloads the document (the seed
  // goes through the app's own decoder); the lattice step below is unaffected,
  // since a resumed run with one site filed and no model is exactly the state
  // the lattice's purpose line exists for.
  if (await seedFourExhibitsAndResume()) {
    if (await click('.casefile-summon')) {
      await sleep(700)
      if (await click('#rail-tab-evidence')) {
        await sleep(450)
        // Every contradiction opened: a closed <details> is display:none, and a
        // target with no glyph boxes reports as ABSENT rather than as measured.
        await evaluate(`(() => {
          for (const d of document.querySelectorAll('.rail-panel details')) d.open = true
          return true })()`)
        await sleep(320)
        await probe('record-evidence', w, h)
        // Four exhibits with their contradictions open are taller than the
        // drawer at every width, so the last two hands are scrolled into the
        // port and measured there — the round-2 below-the-fold scar, applied.
        for (const [sel, name] of [
          [".evidence-list > li[data-status='disputed']", 'record-evidence-disputed'],
          [".evidence-list > li[data-status='anomaly']", 'record-evidence-anomaly'],
        ]) {
          const scrolled = await evaluate(`(() => {
            const el = document.querySelector(${JSON.stringify(sel)})
            if (!el) return false
            el.scrollIntoView({ block: 'center' })
            return true })()`)
          if (!scrolled) continue
          await sleep(400)
          await probe(name, w, h)
        }
      }
      await click('.casefile-close')
      await sleep(400)
    }
  }
  // W1-4. The lattice, reached the way a player reaches it — one site filed, no
  // model yet, which is exactly the state its purpose line exists for.
  if (await click('.field-dock-actions button')) {
    await sleep(1000)
    if (await evaluate(`!!document.querySelector('.lattice-page')`)) {
      await probe('lattice-fresh', w, h)
    }
  }
}

report.failures = failures
writeFileSync(join(OUT_DIR, `contrast-probe${SUFFIX}.json`), JSON.stringify(report, null, 2))
console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'} — wrote ${OUT_DIR}contrast-probe.json`)
clearTimeout(killTimer)
chromeProcess.kill('SIGKILL')
process.exit(failures === 0 ? 0 : 1)

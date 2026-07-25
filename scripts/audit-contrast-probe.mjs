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
const SETTINGS = {
  reducedMotion: false,
  highContrast: false,
  textSize: 'standard',
  showTrustNumbers: false,
  ambientSound: false,
}

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
  // The text that now reads against a translucent panel over the page gradient.
  ['.site-header h2', 'inspector · surface heading'],
  ['.site-description', 'inspector · record body'],
  ['.field-dock-copy > p', 'dock · standing instruction'],
  ['.field-objectives > span', 'command bar · counter label'],
  ['.field-threshold', 'command bar · threshold line'],
])

const PREPARE = `(() => {
  const targets = ${TARGETS}
  const found = []
  for (const [sel, label] of targets) {
    const el = document.querySelector(sel)
    if (!el) continue
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
    const priorPE = el.style.pointerEvents
    el.style.pointerEvents = 'auto'
    const visible = boxes.filter((b) => {
      const hit = document.elementFromPoint(b.x + b.w / 2, b.y + b.h / 2)
      return hit && (hit === el || el.contains(hit) || hit.contains(el))
    })
    el.style.pointerEvents = priorPE
    if (!visible.length) continue
    boxes.length = 0
    boxes.push(...visible)
    const cs = getComputedStyle(el)
    found.push({ sel, label, color: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight, boxes })
  }
  // Hide ONLY the glyphs. NOT visibility:hidden — that also hides the element's
  // OWN background, so a label with a scrim chip would be measured against
  // whatever lies behind the chip and report a failure it does not have.
  // Transparent text plus no text-shadow leaves every fill painted and removes
  // the glyphs and their halo: conservative, because the halo only ever helps.
  window.__hidden = []
  for (const f of found) {
    // Descendants too: a child with its own colour (the counter's white
    // <strong> inside a dim caps label) does not inherit transparent, and its
    // surviving glyphs would then be sampled as if they were background.
    for (const root of document.querySelectorAll(f.sel)) {
      for (const el of [root, ...root.querySelectorAll('*')]) {
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
  writeFileSync(join(OUT_DIR, `contrast-band-${name}-${width}x${height}.png`), Buffer.from(data, 'base64'))
  const rows = await evaluate(SAMPLE(`data:image/png;base64,${data}`, found))
  await evaluate(RESTORE)
  report.surfaces[`${name}@${width}`] = rows
  console.log(`\n── ${name} @ ${width}x${height}`)
  for (const r of rows) {
    // WCAG AA: 4.5:1 for normal text, 3:1 for >=18.66px bold or >=24px.
    const px = parseFloat(r.fontSize)
    const large = px >= 24 || (px >= 18.66 && parseInt(r.fontWeight, 10) >= 700)
    const floor = large ? 3 : 4.5
    const worst = Math.min(r.ratioOnDarkest, r.ratioOnBrightest)
    const ok = worst >= floor
    if (!ok) failures += 1
    console.log(
      `  ${ok ? 'PASS' : 'FAIL'}  ${r.label.padEnd(34)} ${r.fontSize.padStart(7)}/${r.fontWeight}  worst ${worst.toFixed(2)}:1  (floor ${floor})  dark ${r.ratioOnDarkest} · bright ${r.ratioOnBrightest}  bg[${r.darkestBg}]→[${r.brightestBg}]`,
    )
  }
}

for (const [w, h] of [[1280, 800], [375, 812]]) {
  await setViewport(w, h)
  await boot()
  await probe('concourse', w, h)
  await enterSite('Registry intake')
  await probe('console-custody', w, h)
  await enterSite('Maintenance spine')
  await probe('console-acoustic', w, h)
  await enterSite('Care ward 12')
  await probe('zones-care-ward', w, h)
}

report.failures = failures
writeFileSync(join(OUT_DIR, 'contrast-probe.json'), JSON.stringify(report, null, 2))
console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'} — wrote ${OUT_DIR}contrast-probe.json`)
clearTimeout(killTimer)
chromeProcess.kill('SIGKILL')
process.exit(failures === 0 ? 0 : 1)

// Headless-Chrome capture for the UX review (docs/ux-review-2026-07.md).
// Reuses the CDP-over-WebSocket pattern from evidence-image-diff.mjs (no added
// deps). Drives the SAME deterministic el.click() paths the reviewer walked in
// the live preview, and writes PNGs to docs/ux-review-assets/.
//
// Usage: node scripts/ux-review-capture.mjs [http://localhost:4174]
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'

const BASE = process.argv[2] || 'http://localhost:4174'
const OUT = new URL('../docs/ux-review-assets/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const proc = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-uxcap-${Date.now()}`,
  '--no-first-run',
  '--mute-audio',
  '--force-color-profile=srgb',
  'about:blank',
])
const wsUrl = await new Promise((resolve, reject) => {
  let buf = ''
  proc.stderr.on('data', (d) => {
    buf += d
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/)
    if (m) resolve(m[1])
  })
  proc.on('exit', () => reject(new Error('chrome exited early')))
  setTimeout(() => reject(new Error('chrome ws timeout')), 20000)
})
const ws = new WebSocket(wsUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const pending = new Map()
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m)
    pending.delete(m.id)
  }
})
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const i = ++id
    pending.set(i, (msg) => (msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)))
    ws.send(JSON.stringify({ id: i, method, params, sessionId }))
  })
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
await send('Page.enable', {}, sessionId)
await send('Runtime.enable', {}, sessionId)

const evaljs = async (expression) => {
  const r = await send(
    'Runtime.evaluate',
    { expression, returnByValue: true, awaitPromise: true },
    sessionId,
  )
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400))
  return r.result?.value
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const setViewport = (width, height) =>
  send(
    'Emulation.setDeviceMetricsOverride',
    { width, height, deviceScaleFactor: 2, mobile: false },
    sessionId,
  )
const goto = async (url) => {
  await send('Page.navigate', { url }, sessionId)
  await sleep(1400)
}
const shot = async (name) => {
  const { data } = await send(
    'Page.captureScreenshot',
    { format: 'png', captureBeyondViewport: false },
    sessionId,
  )
  writeFileSync(OUT + name, Buffer.from(data, 'base64'))
  console.log('saved', name)
}
// Click first button whose text matches; returns whether found.
const clickText = (re) =>
  evaljs(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => ${re}.test(x.textContent));
    if (!b) return false; b.click(); return true;
  })()`)
// Arm-then-confirm a ChoiceButton across two React commits.
const armConfirm = async (re) => {
  await evaljs(`(() => {
    const b = [...document.querySelectorAll('.choice-row')].find(x => ${re}.test(x.textContent));
    if (b) b.click(); return !!b;
  })()`)
  await sleep(250)
  await evaljs(`(() => {
    const b = [...document.querySelectorAll('.choice-row')].find(x => ${re}.test(x.textContent));
    if (b) b.click(); return !!b;
  })()`)
  await sleep(500)
}
// Arm-then-confirm any button by text (tribunal decisions live outside .choice-row).
const armConfirmBtn = async (re) => {
  await evaljs(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => ${re}.test(x.textContent));
    if (b) b.click(); return !!b;
  })()`)
  await sleep(250)
  await evaljs(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => ${re}.test(x.textContent) || /select again to file/.test(x.textContent));
    if (b) b.click(); return !!b;
  })()`)
  await sleep(600)
}
const openDetails = () => evaljs(`[...document.querySelectorAll('details')].forEach(d=>d.open=true)`)

// ─── DESKTOP 1280×800 ────────────────────────────────────────────────────────
await setViewport(1280, 800)
await goto(BASE)
await evaljs('localStorage.clear()')
await goto(BASE)
await shot('desktop-01-start.png')

await clickText('/Open a new audit/')
await sleep(900)
await shot('desktop-02-briefing-rail.png') // rail fully populated at minute 1

await clickText('/Begin with the person/') // Care approach → investigation
await sleep(900)
await shot('desktop-03-investigation-registry-intake.png') // custody-rail intro + persistent CTA

// Walk the custody-rail ritual to the method step.
await evaljs(`(() => {
  const seat = [...document.querySelectorAll('.cr-carrier')];
  seat.forEach(b => b.click());
})()`)
await sleep(500)
await evaljs(`(() => { const b=[...document.querySelectorAll('.cr-late-carrier')][0]; if(b)b.click(); })()`)
await sleep(500)
await evaljs(`(() => { const b=[...document.querySelectorAll('.cr-mirror')][0]; if(b)b.click(); })()`)
await sleep(500)
await evaljs(`(() => { const b=[...document.querySelectorAll('.cr-proceed')][0]; if(b)b.click(); })()`)
await sleep(600)
await shot('desktop-04-custody-rail-methods.png') // methods finally revealed after the ritual

// Commit systems method, then visit Care ward for the direct 2-method contrast.
await armConfirm('/Trace the checksum past closure/')
await evaljs(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='B · Care ward 12'); if(b)b.click(); })()`)
await sleep(700)
await shot('desktop-05-care-ward.png') // clean direct method choice (no ritual)

// File care, reconstruction, reach tribunal.
await armConfirm('/tell one memory uninterrupted/')
await clickText('/Open memory lattice/')
await sleep(700)
await evaljs(`(() => {
  const btns=[...document.querySelectorAll('button')];
  const e=btns.find(b=>/Embodied echo/.test(b.textContent)); if(e)e.click();
  const r=btns.find(b=>/Recognition/.test(b.textContent)); if(r)r.click();
})()`)
await sleep(300)
await shot('desktop-06-reconstruction.png') // memory lattice: two anchors + field corroboration
// The reconstruction submit is a plain button, not a .choice-row — drive by text.
await clickText('/File reconstruction/')
await sleep(300)
await clickText('/Confirm irreversible filing/')
await sleep(600)
await clickText('/Enter tribunal/')
await sleep(1000)
await shot('desktop-07-tribunal.png') // decisions + filed-model tension lines

// Issue a verdict → debrief; expand the counterfactual + persona panels.
await armConfirm('/Certify Mara Vale as continuous/')
await sleep(1000)
await openDetails()
await sleep(300)
await shot('desktop-08-debrief.png') // consequences + record-of-refusals + persona reflections

// Carry the precedent into Case 81 and open the Ellis Marne deposition.
await clickText('/Open Case 81/')
await sleep(1300)
await clickText('/Begin with the deposition/')
await sleep(1200)
await evaljs(`(() => { const b=[...document.querySelectorAll('.choice-row')].find(x=>/Take the sworn statement/.test(x.textContent)); if(b)b.click(); })()`)
await sleep(900)
await shot('desktop-09-deposition.png') // full-screen sworn transcript, beat 1

// ─── MOBILE 375×812 ──────────────────────────────────────────────────────────
// First reuse the persisted Case 81 state (deposition suite) for a mobile
// transcript shot, THEN clear for the fresh briefing/investigation shots.
await setViewport(375, 812)
await goto(BASE)
await clickText('/Continue/')
await sleep(900)
await evaljs(`(() => { const b=[...document.querySelectorAll('.choice-row')].find(x=>/Take the sworn statement|Cross-examine the witness/.test(x.textContent)); if(b)b.click(); })()`)
await sleep(900)
await shot('mobile-03-deposition.png') // full-screen transcript on a narrow viewport

await goto(BASE)
await evaljs('localStorage.clear()')
await goto(BASE)
await clickText('/Open a new audit/')
await sleep(900)
await shot('mobile-01-briefing.png')

await clickText('/Begin with the person/')
await sleep(900)
await shot('mobile-02-investigation.png') // clustered diorama hotspots + 2×2 grid

await ws.close()
proc.kill()
console.log('done ->', OUT)

// After-state capture for the UX fix pass (docs/ux-fix-pass-2026-07.md).
// Same headless-Chrome CDP driver and the SAME deterministic el.click() paths as
// scripts/ux-review-capture.mjs, re-run against the fixed build and written to
// docs/ux-review-assets/after/ so every review shot has a before/after pair. Adds
// two fix-specific shots: the anchored Access popover (F-11) and the custody-rail
// methods state where the footer CTA is now absent (F-5).
//
// Usage: node scripts/ux-fix-pass-capture.mjs [http://localhost:4174]   (Node 24)
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'

const BASE = process.argv[2] || 'http://localhost:4174'
const OUT = new URL('../docs/ux-review-assets/after/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const proc = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-uxfix-${Date.now()}`,
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
const clickText = (re) =>
  evaljs(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => ${re}.test(x.textContent));
    if (!b) return false; b.click(); return true;
  })()`)
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
const openDetails = () => evaljs(`[...document.querySelectorAll('details')].forEach(d=>d.open=true)`)

// ─── DESKTOP 1280×800 ────────────────────────────────────────────────────────
await setViewport(1280, 800)
await goto(BASE)
await evaljs('localStorage.clear()')
await goto(BASE)
await shot('desktop-01-start.png') // start screen now lists 5 Access toggles (F-11)

await clickText('/Open a new audit/')
await sleep(900)
await shot('desktop-02-briefing-rail.png') // F-6: rail = Active dilemma + status only

await clickText('/Begin with the person/') // Care approach → investigation
await sleep(900)
// F-2 threshold sentence, F-5 CTA "Seat the carriers on the rail", F-4-lite Shepherd ▲,
// F-6 Social memory + Methods revealed, F-3-lite defining line — all at once.
await shot('desktop-03-investigation-registry-intake.png')

// Walk the custody-rail ritual to the method step. The CTA renames at each phase
// (intake → late-carrier → mirror → reading) and disappears at methods.
await evaljs(`(() => {
  const seat = [...document.querySelectorAll('.cr-carrier')];
  seat.forEach(b => b.click());
})()`)
await sleep(400)
await evaljs(`(() => { const b=[...document.querySelectorAll('.cr-late-carrier')][0]; if(b)b.click(); })()`)
await sleep(400)
await evaljs(`(() => { const b=[...document.querySelectorAll('.cr-mirror')][0]; if(b)b.click(); })()`)
await sleep(400)
await evaljs(`(() => { const b=[...document.querySelectorAll('.cr-proceed')][0]; if(b)b.click(); })()`)
await sleep(600)
await shot('desktop-04-custody-rail-methods.png') // F-5: methods shown, no footer CTA

// F-11: open the Access popover — it anchors clear of the rail's Active dilemma.
await evaljs(`(() => { const d=document.querySelector('.header-preferences'); if(d) d.open=true; })()`)
await sleep(200)
await shot('desktop-10-access-popover.png')
await evaljs(`(() => { const d=document.querySelector('.header-preferences'); if(d) d.open=false; })()`)
await sleep(150)

// Commit systems method, then visit Care ward for the direct 2-method contrast.
await armConfirm('/Trace the checksum past closure/')
await evaljs(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='B · Care ward 12'); if(b)b.click(); })()`)
await sleep(700)
await shot('desktop-05-care-ward.png') // clean direct method choice (no ritual)

// File care, reconstruction, reach tribunal — CTA drives Open memory lattice / Enter tribunal.
await armConfirm('/tell one memory uninterrupted/')
await clickText('/Open memory lattice/')
await sleep(700)
await evaljs(`(() => {
  const btns=[...document.querySelectorAll('button')];
  const e=btns.find(b=>/Embodied echo/.test(b.textContent)); if(e)e.click();
  const r=btns.find(b=>/Recognition/.test(b.textContent)); if(r)r.click();
})()`)
await sleep(300)
await shot('desktop-06-reconstruction.png')
await clickText('/File reconstruction/')
await sleep(300)
await clickText('/Confirm irreversible filing/')
await sleep(600)
await clickText('/Enter tribunal/')
await sleep(1000)
await shot('desktop-07-tribunal.png') // F-9: banner capped, first decision peeks above fold

await armConfirm('/Certify Mara Vale as continuous/')
await sleep(1000)
await openDetails()
await sleep(300)
await shot('desktop-08-debrief.png')

// Carry the precedent into Case 81 and open the Ellis Marne deposition.
await clickText('/Open Case 81/')
await sleep(1300)
await clickText('/Begin with the deposition/')
await sleep(1200)
await evaljs(`(() => { const b=[...document.querySelectorAll('.choice-row')].find(x=>/Take the sworn statement/.test(x.textContent)); if(b)b.click(); })()`)
await sleep(900)
await shot('desktop-09-deposition.png')

// ─── MOBILE 375×812 ──────────────────────────────────────────────────────────
await setViewport(375, 812)
await goto(BASE)
await clickText('/Continue/')
await sleep(900)
await evaljs(`(() => { const b=[...document.querySelectorAll('.choice-row')].find(x=>/Take the sworn statement|Cross-examine the witness/.test(x.textContent)); if(b)b.click(); })()`)
await sleep(900)
await shot('mobile-03-deposition.png')

await goto(BASE)
await evaljs('localStorage.clear()')
await goto(BASE)
await clickText('/Open a new audit/')
await sleep(900)
await shot('mobile-01-briefing.png')

await clickText('/Begin with the person/')
await sleep(900)
await shot('mobile-02-investigation.png')

// F-5 on mobile: walk to the custody methods so the footer CTA is absent — it no
// longer renders below the methods it used to point back up at.
await evaljs(`(() => {
  const seat = [...document.querySelectorAll('.cr-carrier')];
  seat.forEach(b => b.click());
})()`)
await sleep(400)
await evaljs(`(() => { const b=[...document.querySelectorAll('.cr-late-carrier')][0]; if(b)b.click(); })()`)
await sleep(400)
await evaljs(`(() => { const b=[...document.querySelectorAll('.cr-mirror')][0]; if(b)b.click(); })()`)
await sleep(400)
await evaljs(`(() => { const b=[...document.querySelectorAll('.cr-proceed')][0]; if(b)b.click(); })()`)
await sleep(600)
await shot('mobile-04-custody-methods.png')

await ws.close()
proc.kill()
console.log('done ->', OUT)

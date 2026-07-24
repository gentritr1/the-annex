// Deterministic evidence capture for public/small-archive-redesign.html over raw
// CDP (no added dependencies). Drives the ritual via window.__smallArchive with
// reduce-motion ON for determinism, then toggles reduce-motion OFF + waits a
// frame before each shot so ambient glows/dust render as intended.
//
// Usage: node scripts/evidence-small-archive.mjs [baseUrl]
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE = process.argv[2] || 'http://localhost:3000'
const URL = BASE + '/small-archive-redesign.html'
const OUT = 'evidence/small-archive-redesign'
mkdirSync(OUT, { recursive: true })

const proc = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-sa-${Date.now()}`,
  '--no-first-run', '--mute-audio', '--force-color-profile=srgb',
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
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
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
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400))
  return r.result?.value
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

let W = 1280, H = 800
async function viewport(w, h) {
  W = w; H = h
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }, sessionId)
}
async function load() {
  await send('Page.navigate', { url: URL }, sessionId)
  // poll until the hook is present
  for (let i = 0; i < 60; i++) {
    const ok = await evaljs('!!window.__smallArchive').catch(() => false)
    if (ok) break
    await wait(100)
  }
  await evaljs('window.__smallArchive.setReduceMotion(true)')
  await wait(120)
}
async function shot(name) {
  // render intended ambient (drift + transitions) for the still
  await evaljs('window.__smallArchive.setReduceMotion(false)')
  await wait(520)
  const r = await send('Page.captureScreenshot', { format: 'png' }, sessionId)
  writeFileSync(`${OUT}/${name}-${W}x${H}.png`, Buffer.from(r.data, 'base64'))
  await evaljs('window.__smallArchive.setReduceMotion(true)')
  await wait(40)
  console.log('  saved', `${name}-${W}x${H}.png`)
}
const A = (expr) => evaljs(`(function(){var A=window.__smallArchive;${expr};return A.getPhase();})()`)

async function ritual(mobileExtraOnly) {
  await load()
  const errors = []
  await send('Runtime.evaluate', { expression: 'window.__err=[];window.addEventListener("error",e=>window.__err.push(String(e.message)))' }, sessionId)

  await shot('01-rest')

  // draw a card, arm a slot (mid-filing look), capture
  await A('A.draw(); A.armSlot("continuation")')
  await shot('02-card-filing')
  if (mobileExtraOnly) return errors
  // finish the three routine filings
  await A('A.armSlot("continuation")')            // confirm -> file (already armed)
  await A('A.advance()')
  await A('A.draw(); A.fileInto("property"); A.advance()')
  await A('A.draw(); A.fileInto("failed"); A.advance()')

  // pocket refusal (first attempt)
  await A('A.draw(); A.attemptPocket("continuation")')
  await shot('03-pocket-refusal')
  await A('A.advance()')
  await A('A.attemptPocket("property"); A.advance()')
  await A('A.attemptPocket("failed"); A.advance()')   // -> shelf zone opens

  // shelf zero placement
  await A('A.placeShelf()')
  await shot('04-shelf-zero')
  await A('A.advance()')

  // restriction slips
  await A('A.readSlips()')
  await shot('05-slips')
  await A('A.advance()')                               // -> methods

  // method previews (arm = cap label + ambient preview for the correct zone)
  await A('A.armMethod("answer")')
  await shot('06-answer-hover')
  await A('A.armMethod("seal")')
  await shot('07-seal-hover')

  // answer strip
  await A('A.method("answer")')
  await A('A.advance()')
  await shot('08-answer-strip')

  // replay -> seal strip
  await A('A.replay()')
  await A('A.hoverMethod("seal"); A.method("seal")')
  await A('A.advance()')
  await shot('09-seal-strip')

  const err = await evaljs('window.__err || []')
  return err
}

console.log('desktop 1280x800:')
await viewport(1280, 800)
const errD = await ritual(false)

console.log('mobile 375x812:')
await viewport(375, 812)
const errM = await ritual(true)   // rest + card only on mobile

console.log('console/page errors:', JSON.stringify([...(errD||[]), ...(errM||[])]))

ws.close()
proc.kill()
process.exit(0)

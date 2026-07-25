// Pixel-diff two PNGs in headless Chrome over CDP (no added dependencies):
// draws both into canvases and reports per-channel max/mean deltas, the share
// of pixels over threshold, and the changed-region bounding box. Used to prove
// the rest framing survives the depth work (acceptance: within ~2px).
//
// Usage: node scripts/evidence-image-diff.mjs <pathA> <pathB> [x y w h]
// The optional crop compares only that region (e.g. the stage rect, so panel
// copy outside the scene cannot confound a framing comparison).
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const [A, B, cx, cy, cw, ch] = process.argv.slice(2)
if (!A || !B) {
  console.error('usage: node scripts/evidence-image-diff.mjs <pathA> <pathB> [x y w h]')
  process.exit(1)
}
const crop = cx !== undefined ? { x: +cx, y: +cy, w: +cw, h: +ch } : null

const proc = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-diff-${Date.now()}`,
  '--no-first-run',
  '--mute-audio',
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
const evaljs = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300))
  return r.result?.value
}

const b64A = readFileSync(A).toString('base64')
const b64B = readFileSync(B).toString('base64')

const result = await evaljs(`(async () => {
  const load = (b64) => new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = 'data:image/png;base64,' + b64
  })
  const [ia, ib] = await Promise.all([load(${JSON.stringify(b64A)}), load(${JSON.stringify(b64B)})])
  if (ia.width !== ib.width || ia.height !== ib.height) {
    return { sizeMismatch: [ia.width + 'x' + ia.height, ib.width + 'x' + ib.height] }
  }
  const W = ia.width
  const H = ia.height
  const crop = ${JSON.stringify(crop)}
  const rx = crop ? crop.x : 0
  const ry = crop ? crop.y : 0
  const rw = crop ? Math.min(crop.w, W - rx) : W
  const rh = crop ? Math.min(crop.h, H - ry) : H
  const ca = new OffscreenCanvas(W, H)
  const cb = new OffscreenCanvas(W, H)
  const xa = ca.getContext('2d')
  const xb = cb.getContext('2d')
  xa.drawImage(ia, 0, 0)
  xb.drawImage(ib, 0, 0)
  const da = xa.getImageData(rx, ry, rw, rh).data
  const db = xb.getImageData(rx, ry, rw, rh).data
  let maxDelta = 0
  let sum = 0
  let over2 = 0
  let over8 = 0
  let over24 = 0
  let minX = W, minY = H, maxX = -1, maxY = -1
  const n = rw * rh
  for (let i = 0; i < n; i += 1) {
    const o = i * 4
    const d = Math.max(
      Math.abs(da[o] - db[o]),
      Math.abs(da[o + 1] - db[o + 1]),
      Math.abs(da[o + 2] - db[o + 2]),
    )
    if (d > 0) {
      sum += d
      if (d > maxDelta) maxDelta = d
      const x = i % rw
      const y = (i / rw) | 0
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
    if (d > 2) over2 += 1
    if (d > 8) over8 += 1
    if (d > 24) over24 += 1
  }
  return {
    size: crop ? rw + 'x' + rh + ' @ ' + rx + ',' + ry : W + 'x' + H,
    pixels: n,
    changedPixels: maxX >= 0 ? 'see bounds' : 0,
    maxDelta,
    meanAbsDeltaOverChanged: maxX >= 0 ? +(sum / n).toFixed(4) : 0,
    pctOver2: +((over2 / n) * 100).toFixed(3),
    pctOver8: +((over8 / n) * 100).toFixed(3),
    pctOver24: +((over24 / n) * 100).toFixed(3),
    changedBounds: maxX >= 0 ? [minX, minY, maxX, maxY] : null,
  }
})()`)
console.log(JSON.stringify({ a: A.split('/').pop(), b: B.split('/').pop(), ...result }))
proc.kill('SIGTERM')
process.exit(0)

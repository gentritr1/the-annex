// One-off diagnostic probe for the armed-commit evidence failures.
// 1) hover-stick: does parkMouse actually clear :hover on the last clicked row?
// 2) lattice: track button.disabled + selectedFragments + the n/2 counter
//    across the two anchor clicks and the arm click.
import { spawn } from 'node:child_process'

const [appUrl] = process.argv.slice(2)
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const SAVE_KEY = 'the-annex.case-77.save.v1'
const SETTINGS_KEY = 'the-annex.accessibility.v1'

const settings = {
  reducedMotion: false,
  highContrast: false,
  textSize: 'standard',
  showTrustNumbers: false,
  ambientSound: false,
}
const save = {
  schemaVersion: 2,
  caseId: 'case-77',
  runNumber: 1,
  primaryApproach: 'procedure',
  phase: 'investigation',
  completedSites: ['registry'],
  completedActions: ['authenticate-chain'],
  evidence: ['custody-chain'],
  methodTags: ['procedure'],
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
  announcement: '',
  settings,
}

const proc = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-probe-${Date.now()}`,
  '--no-first-run',
  '--mute-audio',
  '--hide-scrollbars',
  'about:blank',
])
const browserWsUrl = await new Promise((resolve, reject) => {
  let buf = ''
  proc.stderr.on('data', (d) => {
    buf += d
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/)
    if (m) resolve(m[1])
  })
  setTimeout(() => reject(new Error('chrome ws timeout')), 20000)
})
const cdpPort = new URL(browserWsUrl).port
let pageWs
for (let i = 0; i < 50; i += 1) {
  try {
    const targets = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json()
    const page = targets.find((t) => t.type === 'page')
    if (page) {
      pageWs = page.webSocketDebuggerUrl
      break
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 200))
}
const ws = new WebSocket(pageWs)
await new Promise((res, rej) => {
  ws.onopen = res
  ws.onerror = rej
})
let nextId = 1
const pending = new Map()
ws.onmessage = (message) => {
  const data = JSON.parse(message.data)
  if (data.id && pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id)
    pending.delete(data.id)
    if (data.error) reject(new Error(data.error.message))
    else resolve(data.result)
  }
}
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
  return r.result.value
}
async function clickAt(selector) {
  const point = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)})
    if (!el) return null
    el.scrollIntoView({ block: 'center', behavior: 'auto' })
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })()`)
  if (!point) return `NO ELEMENT ${selector}`
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
  await sleep(400)
  return point
}
const probe = async (tag) =>
  console.log(
    tag,
    JSON.stringify(
      await evaluate(`(() => ({
        hoverChain: [...document.querySelectorAll(':hover')].slice(-3).map((e) => e.className.toString().slice(0, 40)),
        row1Hover: document.querySelector('.site-actions .choice-row')?.matches(':hover') ?? null,
        row1Bg: document.querySelector('.site-actions .choice-row') ? getComputedStyle(document.querySelector('.site-actions .choice-row')).backgroundColor : null,
        row1Focus: document.activeElement?.className?.toString().slice(0, 50) ?? null,
        counter: document.querySelector('.lattice-rule strong')?.textContent ?? null,
        commitDisabled: document.querySelector('.lattice-footer .button')?.disabled ?? null,
        commitArmed: document.querySelector('.lattice-footer .button')?.classList.contains('button-armed') ?? null,
        commitBg: document.querySelector('.lattice-footer .button') ? getComputedStyle(document.querySelector('.lattice-footer .button')).backgroundColor : null,
        commitColor: document.querySelector('.lattice-footer .button') ? getComputedStyle(document.querySelector('.lattice-footer .button')).color : null,
        savedFragments: JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}) ?? 'null')?.selectedFragments ?? null,
      }))()`),
    ),
  )

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: appUrl })
  await sleep(1400)
  await evaluate(`localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(save))});
    localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, ${JSON.stringify(JSON.stringify(settings))}); 'seeded'`)
  await send('Page.reload')
  await sleep(1500)
  await evaluate(`[...document.querySelectorAll('button')].find((b) => /continue/i.test(b.textContent))?.click(); 'entered'`)
  await sleep(1500)

  // ── hover-stick probe (care-ward, second switch) ──────────────────────────
  await clickAt('.site-switcher button:nth-of-type(2)')
  await clickAt('.site-actions .choice-row:nth-of-type(1)')
  await probe('armed:        ')
  for (const type of ['keyDown', 'keyUp']) {
    await send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 })
  }
  await sleep(400)
  await probe('after Escape: ')
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 8, y: 8 })
  await sleep(400)
  await probe('after park:   ')
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 640, y: 700 })
  await sleep(400)
  await probe('park (640,700):')

  // Frame-advance test: two forced BeginFrames (screenshots) with settle time.
  // If the "stuck" values resolve to rest state after real frames, the stuck
  // readings were frozen CSS transitions, not app behavior.
  await send('Page.captureScreenshot', { format: 'png' })
  await sleep(350)
  await send('Page.captureScreenshot', { format: 'png' })
  await sleep(350)
  await send('Page.captureScreenshot', { format: 'png' })
  await probe('after frames: ')

  // ── lattice disabled probe ────────────────────────────────────────────────
  await clickAt('.field-dock-actions .button-secondary')
  await probe('lattice open: ')
  await clickAt('.fragment-row:nth-of-type(1)')
  await probe('anchor 1:     ')
  await clickAt('.fragment-row:nth-of-type(2)')
  await send('Page.captureScreenshot', { format: 'png' })
  await sleep(350)
  await send('Page.captureScreenshot', { format: 'png' })
  await sleep(350)
  await probe('anchor 2+frames:')
  await clickAt('.lattice-footer .button')
  await send('Page.captureScreenshot', { format: 'png' })
  await sleep(350)
  await send('Page.captureScreenshot', { format: 'png' })
  await probe('arm+frames:   ')
} finally {
  ws.close()
  proc.kill('SIGTERM')
}

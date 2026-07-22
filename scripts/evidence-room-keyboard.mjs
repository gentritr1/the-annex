// Keyboard-only evidence for the Small Archive classification room: drives the
// real Vite app in headless Chrome over raw CDP (rAF fires there, unlike a
// hidden preview tab) and activates EVERY room control with trusted Enter key
// events — no synthetic .click() anywhere on the room path. Asserts the room's
// focus handoffs (card → category rack, first refusal → shelf zero, placement →
// restriction log) and that the full flow reaches the unlocked methods and a
// committed field action, then prints one JSON verdict per step.
//
// Usage: node scripts/evidence-room-keyboard.mjs <app-url>
import { spawn } from 'node:child_process'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2]
if (!APP_URL) {
  console.error('usage: node scripts/evidence-room-keyboard.mjs <app-url>')
  process.exit(1)
}

// Hard safety timeout: never leave a headless Chrome behind on a wedged run.
setTimeout(() => {
  console.error('GLOBAL TIMEOUT — aborting evidence run')
  chromeProcess.kill()
  process.exit(2)
}, 180000).unref?.()

const chromeProcess = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-room-kbd-${Date.now()}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--mute-audio',
  '--hide-scrollbars',
  '--window-size=1280,800',
  '--enable-webgl',
  '--enable-unsafe-swiftshader',
  '--use-angle=swiftshader',
  'about:blank',
])

const wsUrl = await new Promise((resolve, reject) => {
  let stderr = ''
  const timer = setTimeout(() => reject(new Error('Chrome CDP endpoint timed out')), 20000)
  chromeProcess.stderr.on('data', (chunk) => {
    stderr += chunk
    const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/)
    if (!match) return
    clearTimeout(timer)
    resolve(match[1])
  })
  chromeProcess.once('exit', (code) => {
    clearTimeout(timer)
    reject(new Error(`Chrome exited before CDP attached (${code ?? 'unknown'})`))
  })
})

const socket = new WebSocket(wsUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

let nextId = 1
const pending = new Map()
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (!message.id || !pending.has(message.id)) return
  const { resolve, reject } = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) reject(new Error(message.error.message))
  else resolve(message.result)
})
function raw(method, params = {}, sessionId) {
  const id = nextId
  nextId += 1
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params, sessionId }))
  })
}

const { targetId } = await raw('Target.createTarget', { url: 'about:blank' })
await raw('Target.activateTarget', { targetId })
const { sessionId } = await raw('Target.attachToTarget', { targetId, flatten: true })
const send = (method, params = {}) => raw(method, params, sessionId)
await send('Runtime.enable')
await send('Page.enable')
// Headless pages report document.hasFocus() === false by default; without focus
// emulation the trusted key events never reach the focused button.
await send('Emulation.setFocusEmulationEnabled', { enabled: true })
console.log('cdp attached')

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? 'page exception')
  }
  return result.result.value
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// A trusted Enter press on whatever currently holds focus.
async function pressEnter() {
  // The rawKeyDown/char/keyUp triple is what actually activates a focused
  // button in headless Chrome (a plain keyDown with text does not).
  for (const type of ['rawKeyDown', 'char', 'keyUp']) {
    await send('Input.dispatchKeyEvent', {
      type,
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
      ...(type === 'char' ? { text: '\r' } : {}),
    })
  }
  await sleep(160)
}

// Focus a control (keyboard users reach it with Tab; focus() stands in for the
// traversal) and activate it with a REAL Enter key event.
async function activate(selector, textIncludes) {
  // The app renders phase changes over a few frames; poll briefly for the target.
  let focused = null
  for (let attempt = 0; attempt < 20 && (focused === null || focused === 'focus-failed'); attempt += 1) {
    focused = await tryFocus(selector, textIncludes)
    if (focused === null || focused === 'focus-failed') await sleep(200)
  }
  if (focused === null || focused === 'focus-failed') {
    throw new Error(`could not focus ${selector} ${textIncludes ?? ''} (${focused})`)
  }
  await pressEnter()
  return focused
}

function tryFocus(selector, textIncludes) {
  return evaluate(`(() => {
    const matches = [...document.querySelectorAll(${JSON.stringify(selector)})]
    const target = ${JSON.stringify(textIncludes ?? '')}
      ? matches.find((el) => el.textContent.includes(${JSON.stringify(textIncludes ?? '')}))
      : matches[0]
    if (!target) return null
    target.focus()
    return document.activeElement === target ? target.textContent.trim().slice(0, 48) : 'focus-failed'
  })()`)
}

const activeElement = () =>
  evaluate(`(() => {
    const el = document.activeElement
    if (!el || el === document.body) return 'body'
    return (el.className && String(el.className).split(' ')[0]) || el.tagName.toLowerCase()
  })()`)

const steps = []
function report(step, pass, detail) {
  steps.push({ step, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${step}  ${detail}`)
}

await send('Page.navigate', { url: APP_URL })
await sleep(1600)
await evaluate('localStorage.clear()')
await send('Page.navigate', { url: APP_URL })
await sleep(1600)

// Title → briefing → investigation, all via trusted Enter on focused buttons.
await activate('button', 'Open a new audit')
await sleep(400)
// Approach selection is a single activation (no confirm step on the briefing).
await activate('button', 'Begin with the missing question')
await sleep(700)

// Enter the Small Archive from the canonical DOM switcher.
await activate('#site-switch-small-archive')
await sleep(900)

const roomReady = await evaluate(`JSON.stringify({
  room: Boolean(document.querySelector('.classification-room')),
  cards: document.querySelectorAll('.room-card').length,
  committable: document.querySelectorAll('.classification-room .choice-row').length,
})`)
report('room reachable by keyboard', JSON.parse(roomReady).room && JSON.parse(roomReady).cards === 4 && JSON.parse(roomReady).committable === 0, roomReady)

// Select the unclassifiable card: focus should hand off to the category rack.
await activate('.room-card', 'no drawer')
report('card select hands focus to categories', (await activeElement()) === 'room-category', `activeElement=${await activeElement()}`)

// Refuse once: shelf zero must appear and receive the focus handoff.
await activate('.room-category', 'Continuation')
const afterRefusal = await evaluate(`JSON.stringify({
  shelfZero: Boolean(document.querySelector('.room-shelf-zero')),
  active: String(document.activeElement?.className ?? 'body') || 'body',
  announce: document.querySelector('.room-announce')?.textContent?.slice(0, 60),
})`)
const refusalParsed = JSON.parse(afterRefusal)
report('first refusal reveals shelf zero + focuses it', refusalParsed.shelfZero && refusalParsed.active.includes('room-shelf-zero'), afterRefusal)

// Place on shelf zero: slips appear, focus lands on the restriction log.
await activate('.room-shelf-zero')
const afterShelf = await evaluate(`JSON.stringify({
  slips: document.querySelectorAll('.room-slip').length,
  active: String(document.activeElement?.className ?? 'body') || 'body',
})`)
const shelfParsed = JSON.parse(afterShelf)
report('shelf zero placement reveals slips + focuses log', shelfParsed.slips === 3 && shelfParsed.active.includes('room-slip'), afterShelf)

// Turn one slip: methods unlock.
await activate('.room-slip')
const afterSlip = await evaluate(`JSON.stringify({
  unlocked: document.querySelectorAll('.classification-room .choice-row').length,
})`)
report('one slip turned unlocks both methods', JSON.parse(afterSlip).unlocked === 2, afterSlip)

// Two-step commit of the answer method, keyboard only.
await activate('.classification-room .choice-row', 'Answer the question')
const armed = await evaluate(
  `Boolean(document.querySelector('.classification-room .choice-row-armed'))`,
)
report('first Enter arms (two-step confirm intact)', armed, `armed=${armed}`)
console.log('arming confirmed, committing…')
await activate('.classification-room .choice-row-armed')
console.log('commit Enter dispatched')
await sleep(400)
const committed = await evaluate(`JSON.stringify({
  title: document.querySelector('.resolved-action strong')?.textContent ?? null,
  siteState: document.querySelector('.site-state')?.textContent ?? null,
})`)
const committedParsed = JSON.parse(committed)
report('second Enter commits the canonical action', committedParsed.title === 'Your uncertainty entered the archive' && committedParsed.siteState === 'Filed', committed)

// Return to the concourse by keyboard and read the altered portal.
await activate('button', 'Return to concourse')
await sleep(600)
const portal = await evaluate(`JSON.stringify({
  outcome: document.querySelector('.annex-world-portal[data-site="small-archive"]')?.dataset.outcome ?? null,
  label: document.querySelector('.annex-world-portal[data-site="small-archive"] .annex-world-portal-label')?.textContent ?? null,
  renderer: document.querySelector('.annex-world-stage')?.dataset.renderer ?? null,
})`)
const portalParsed = JSON.parse(portal)
report('concourse portal altered (opened outcome)', portalParsed.outcome === 'shelf-zero-opened' && portalParsed.label === 'Shelf zero holds a new category', portal)

const failures = steps.filter((step) => !step.pass)
console.log(failures.length === 0 ? 'ALL PASS' : `${failures.length} FAILURES`)
chromeProcess.kill()
process.exit(failures.length === 0 ? 0 : 1)

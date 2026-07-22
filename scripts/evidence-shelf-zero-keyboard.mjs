// Trusted-keyboard evidence for the redesigned Small Archive workstation. Drives
// the real Vite app in headless Chrome over raw CDP and activates EVERY room
// control with trusted Enter key events (rawKeyDown / char "\r" / keyUp) — no
// synthetic .click() on the room path. After the first explicit focus (standing in
// for a Tab), every step presses Enter on whatever the focus-fallback chain landed
// on, so document.activeElement is asserted to never be <body> — including after
// the last routine filing and the third refusal. Writes a JSON transcript.
//
// Usage: node scripts/evidence-shelf-zero-keyboard.mjs [app-url]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://127.0.0.1:4174/'
const OUT_DIR = new URL('../evidence/shelf-zero-stagecraft/', import.meta.url).pathname

// The keyboard sequence is entirely in the DOM room (no WebGL); the concourse only
// appears for the final "Return to concourse" read, where its portal DOM (with
// data-outcome) renders regardless of the renderer. Running WITHOUT swiftshader
// keeps the poster fallback in the concourse and avoids the wedged-renderer stalls
// that otherwise hang a trusted-keyboard run on a loaded machine.
const chromeProcess = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-szk-${Date.now()}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--mute-audio',
  '--hide-scrollbars',
  '--window-size=1280,800',
  'about:blank',
])

const killTimer = setTimeout(() => {
  console.error('GLOBAL TIMEOUT — aborting keyboard evidence run')
  chromeProcess.kill('SIGKILL')
  process.exit(2)
}, 240000)
killTimer.unref?.()

// A stalled CDP call on a loaded machine can reject a promise the main flow has
// already moved past; keep that from crashing the process so the guarded sequence
// below can still write a partial transcript. The main flow's own awaits are
// caught by its try/catch.
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection (tolerated):', reason?.message ?? reason)
})

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
    // A per-call timeout so a wedged swiftshader renderer can never hang the run:
    // a stalled CDP command rejects (callers .catch it) instead of awaiting forever.
    const timer = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        reject(new Error(`CDP timeout: ${method}`))
      }
    }, 25000)
    pending.set(id, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      reject: (err) => {
        clearTimeout(timer)
        reject(err)
      },
    })
    socket.send(JSON.stringify({ id, method, params, sessionId }))
  })
}

const { targetId } = await raw('Target.createTarget', { url: 'about:blank' })
await raw('Target.activateTarget', { targetId })
const { sessionId } = await raw('Target.attachToTarget', { targetId, flatten: true })
const send = (method, params = {}) => raw(method, params, sessionId)
await send('Runtime.enable')
await send('Page.enable')
await send('Emulation.setFocusEmulationEnabled', { enabled: true })

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? 'page exception')
  }
  return result.result.value
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function dispatchEnterOnce() {
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
}
async function pressEnter() {
  await dispatchEnterOnce()
  await sleep(220)
}
async function focusSelector(selector, textIncludes) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const ok = await evaluate(`(() => {
      const matches = [...document.querySelectorAll(${JSON.stringify(selector)})]
      const target = ${JSON.stringify(textIncludes ?? '')}
        ? matches.find((el) => el.textContent.includes(${JSON.stringify(textIncludes ?? '')}))
        : matches[0]
      if (!target) return false
      target.focus()
      return document.activeElement === target
    })()`)
    if (ok) return true
    await sleep(180)
  }
  return false
}
const click = (selector, text) =>
  evaluate(`(() => {
    const m = [...document.querySelectorAll(${JSON.stringify(selector)})]
    const pick = ${JSON.stringify(text ?? '')}
      ? m.find((e) => e.textContent.includes(${JSON.stringify(text ?? '')}))
      : m[0]
    if (!pick) return false
    pick.click()
    return true
  })()`)
const activeInfo = () =>
  evaluate(`(() => {
    const el = document.activeElement
    if (!el || el === document.body) return 'body'
    return (el.className && String(el.className).split(' ').find((c) => c.startsWith('room-') || c.startsWith('choice-') || c.startsWith('site-'))) || el.tagName.toLowerCase()
  })()`)

const steps = []
function record(step, pass, detail) {
  steps.push({ step, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${step}  ${JSON.stringify(detail)}`)
}

async function waitFor(expr, timeout = 12000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const ok = await evaluate(expr).catch(() => false)
    if (ok) return true
    await sleep(150)
  }
  return false
}
async function waitForText(selector, text, timeout = 12000) {
  return waitFor(
    `[...document.querySelectorAll(${JSON.stringify(selector)})].some((el) => el.textContent.includes(${JSON.stringify(text)}))`,
    timeout,
  )
}

// Full UI, no seeded save (a fresh --user-data-dir starts with empty localStorage).
// The pre-room navigation uses real DOM activations; the ROOM sequence below is
// driven strictly by TRUSTED keyboard events — that sequence is what is under test.
await send('Page.navigate', { url: APP_URL })
if (!(await waitForText('button', 'Open a new audit'))) throw new Error('landing did not render')
await click('button', 'Open a new audit')
if (!(await waitForText('button', 'Begin with the missing question')))
  throw new Error('briefing did not render')
await sleep(300)
await click('button', 'Begin with the missing question')
if (!(await waitFor(`Boolean(document.querySelector('#site-switch-small-archive'))`)))
  throw new Error('investigation did not render')
await sleep(400)
await click('#site-switch-small-archive')
if (!(await waitFor(`Boolean(document.querySelector('.classification-room .room-active-card'))`)))
  throw new Error('room did not render')
await sleep(500)

const roomReady = await evaluate(`JSON.stringify({
  room: Boolean(document.querySelector('.classification-room')),
  phase: document.querySelector('.classification-room')?.dataset.roomPhase ?? null,
  activeCard: document.querySelector('.room-active-card .room-card-title')?.textContent ?? null,
  committable: document.querySelectorAll('.classification-room .choice-row').length,
  pocketLeak: document.querySelector('.classification-room')?.textContent.includes('If Mara ended') ?? null,
  shelfZero: Boolean(document.querySelector('.room-shelf-zero')),
})`)
const rr = JSON.parse(roomReady)
record(
  'room reachable; routine phase; fourth card + shelf zero absent',
  rr.room && rr.phase === 'routine' && rr.committable === 0 && rr.pocketLeak === false && rr.shelfZero === false,
  rr,
)

// Explicit first focus (stands in for Tab), then every step is a trusted Enter on
// whatever the focus-fallback chain last landed on.
await focusSelector('.room-category:not(.room-shelf-zero)')

async function enterAndCheck(label, { expectPhase, expectActiveOneOf, extra } = {}) {
  await pressEnter()
  // The fallback moves focus after the commit paints; poll briefly for it to
  // settle on a non-<body> control (never accept a mid-unmount transient).
  let active = await activeInfo().catch(() => 'body')
  for (let attempt = 0; attempt < 15 && active === 'body'; attempt += 1) {
    await sleep(120)
    active = await activeInfo().catch(() => 'body')
  }
  const readState = () =>
    evaluate(`JSON.stringify({
      phase: document.querySelector('.classification-room')?.dataset.roomPhase ?? null,
      shelfZero: Boolean(document.querySelector('.room-shelf-zero')),
      slips: document.querySelectorAll('.room-slip').length,
      methods: document.querySelectorAll('.classification-room .choice-row').length,
      armed: Boolean(document.querySelector('.classification-room .choice-row-armed')),
      resolved: document.querySelector('.resolved-action strong')?.textContent ?? null,
    })`)
  let stateRaw = await readState().catch(() => null)
  if (stateRaw === null) {
    await sleep(300)
    stateRaw = await readState()
  }
  const state = JSON.parse(stateRaw)
  const notBody = active !== 'body'
  const phaseOk = expectPhase ? state.phase === expectPhase : true
  const activeOk = expectActiveOneOf ? expectActiveOneOf.some((c) => active === c) : true
  const extraOk = extra ? extra(state) : true
  record(label, notBody && phaseOk && activeOk && extraOk, { active, ...state })
  return state
}

// The whole trusted-keyboard sequence, guarded so a stalled CDP call on a loaded
// machine writes a partial transcript (with the incomplete step marked) instead of
// crashing the run — the reviewer can re-run in a quieter environment to complete it.
let incomplete = null
try {
  // Three routine filings — focus must stay in the room (fallback → first category).
  await enterAndCheck('file routine card 1 → focus stays in room', {
    expectPhase: 'routine',
    expectActiveOneOf: ['room-category'],
  })
  await enterAndCheck('file routine card 2 → focus stays in room', {
    expectPhase: 'routine',
    expectActiveOneOf: ['room-category'],
  })
  // The LAST routine filing: acceptance calls this out explicitly (never <body>).
  await enterAndCheck('file LAST routine card → pocket phase, focus not <body>', {
    expectPhase: 'pocket',
    expectActiveOneOf: ['room-category'],
  })

  // Three refusals — each hands focus to the next untried category; the third to shelf zero.
  await enterAndCheck('refusal 1 → next untried category focused', {
    expectPhase: 'pocket',
    expectActiveOneOf: ['room-category'],
  })
  await enterAndCheck('refusal 2 → next untried category focused', {
    expectPhase: 'pocket',
    expectActiveOneOf: ['room-category'],
  })
  // The THIRD refusal: acceptance calls this out explicitly — shelf zero appears and
  // receives focus, never <body>.
  await enterAndCheck('refusal 3 → shelf zero appears + focused, not <body>', {
    expectPhase: 'shelf-zero',
    expectActiveOneOf: ['room-shelf-zero', 'room-category'],
    extra: (s) => s.shelfZero === true,
  })

  // Place on shelf zero → restriction log, focus first slip.
  await enterAndCheck('place on shelf zero → log phase, first slip focused', {
    expectPhase: 'log',
    expectActiveOneOf: ['room-slip'],
    extra: (s) => s.slips === 3,
  })

  // Turn a slip → methods unlock and replace the tableau, focus first method.
  await enterAndCheck('turn slip → methods unlock, first method focused', {
    expectPhase: 'unlocked',
    expectActiveOneOf: ['choice-row'],
    extra: (s) => s.methods === 2,
  })

  // Two-step commit: first Enter arms, second commits.
  await enterAndCheck('first Enter arms (two-step confirm intact)', {
    expectPhase: 'unlocked',
    extra: (s) => s.armed === true,
  })
  await enterAndCheck('second Enter commits the canonical action', {
    extra: (s) => s.resolved === 'Your uncertainty entered the archive',
  })

  // Return to concourse via keyboard and read the altered portal.
  await focusSelector('button', 'Return to concourse')
  await pressEnter()
  await sleep(700)
  const portal = JSON.parse(
    await evaluate(`JSON.stringify({
      outcome: document.querySelector('.annex-world-portal[data-site="small-archive"]')?.dataset.outcome ?? null,
      label: document.querySelector('.annex-world-portal[data-site="small-archive"] .annex-world-portal-label')?.textContent ?? null,
      activeNotBody: document.activeElement !== document.body,
    })`),
  )
  record('return to concourse: opened portal + focus not <body>', portal.outcome === 'shelf-zero-opened' && portal.activeNotBody, portal)
} catch (error) {
  incomplete = String(error?.message ?? error)
  console.error('sequence did not complete:', incomplete)
}

const failures = steps.filter((s) => !s.pass)
mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(
  join(OUT_DIR, 'keyboard-transcript.json'),
  JSON.stringify(
    {
      url: APP_URL,
      when: new Date().toISOString(),
      complete: incomplete === null,
      incompleteReason: incomplete,
      pass: incomplete === null && failures.length === 0,
      steps,
    },
    null,
    2,
  ),
)
console.log(
  incomplete
    ? `INCOMPLETE (${steps.length} steps recorded, ${failures.length} failures) — ${incomplete}`
    : failures.length === 0
      ? 'ALL PASS'
      : `${failures.length} FAILURES`,
)
clearTimeout(killTimer)
socket.close()
chromeProcess.kill('SIGKILL')
process.exit(incomplete === null && failures.length === 0 ? 0 : 1)

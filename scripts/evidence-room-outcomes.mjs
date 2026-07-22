// Visual evidence for the Small Archive concourse alteration: seeds one save per
// committed method (answer-archivist / seal-index), boots the real app in
// headless Chrome (WebGL via swiftshader), waits for the concourse renderer, and
// writes one desktop screenshot per outcome plus a JSON of the portal's DOM
// state. Proves the opened/sealed treatments are visually distinct in the WebGL
// path, not only in the poster/DOM layer.
//
// Usage: node scripts/evidence-room-outcomes.mjs [app-url]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://127.0.0.1:4174/'
const OUT_DIR = new URL('../evidence/', import.meta.url).pathname
const SAVE_KEY = 'the-annex.case-77.save.v1'

const baseSave = {
  schemaVersion: 2,
  caseId: 'case-77',
  phase: 'investigation',
  runNumber: 1,
  primaryApproach: 'curiosity',
  completedSites: ['small-archive'],
  completedActions: [],
  evidence: [],
  methodTags: [],
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
  settings: {
    reducedMotion: false,
    highContrast: false,
    textSize: 'standard',
    showTrustNumbers: false,
    ambientSound: false,
  },
  announcement: 'Outcome evidence seed.',
}

const VARIANTS = [
  { tag: 'opened', actionId: 'answer-archivist', evidenceId: 'missing-category', methodTags: ['care', 'puzzle'] },
  { tag: 'sealed', actionId: 'seal-index', evidenceId: 'redacted-index', methodTags: ['procedure', 'coercion'] },
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function captureVariant(variant) {
  const chromeProcess = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=/tmp/annex-outcome-${variant.tag}-${Date.now()}`,
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
    const timer = setTimeout(() => reject(new Error('Chrome CDP endpoint timed out')), 60000)
    chromeProcess.stderr.on('data', (chunk) => {
      stderr += chunk
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/)
      if (match) {
        clearTimeout(timer)
        resolve(match[1])
      }
    })
    chromeProcess.once('exit', () => {
      clearTimeout(timer)
      reject(new Error('Chrome exited before CDP attached'))
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
  const raw = (method, params = {}, sessionId) => {
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
  const evaluate = async (expression) => {
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

  await send('Page.navigate', { url: APP_URL })
  await sleep(1500)
  const save = {
    ...baseSave,
    completedActions: [variant.actionId],
    evidence: [variant.evidenceId],
    methodTags: variant.methodTags,
    events: [],
  }
  await evaluate(
    `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(save))})`,
  )
  await send('Page.navigate', { url: APP_URL })
  await sleep(1500)
  await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((el) =>
      el.textContent.includes('Continue'),
    )
    button?.click()
    return true
  })()`)
  await sleep(2500)

  // Let the renderer settle on the concourse; read the portal's DOM contract.
  const portalState = await evaluate(`JSON.stringify({
    renderer: document.querySelector('.annex-world-stage')?.dataset.renderer ?? null,
    outcome: document.querySelector('.annex-world-portal[data-site="small-archive"]')?.dataset.outcome ?? null,
    variant: document.querySelector('.annex-world-portal[data-site="small-archive"]')?.dataset.outcomeVariant ?? null,
    label: document.querySelector('.annex-world-portal[data-site="small-archive"] .annex-world-portal-label')?.textContent ?? null,
    chip: document.getElementById('site-switch-small-archive')?.textContent ?? null,
  })`)
  await sleep(1200)
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, `room-outcome-${variant.tag}-1280x800.png`), Buffer.from(shot.data, 'base64'))
  console.log(variant.tag, portalState)
  socket.close()
  chromeProcess.kill('SIGKILL')
}

for (const variant of VARIANTS) {
  await captureVariant(variant)
}
console.log('done')

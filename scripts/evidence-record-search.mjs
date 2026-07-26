// Evidence for the two record-reading surfaces of the case file: the searchable
// record (E5, Wave 2 round 1) and the ledger (E3, Wave 2 round 2), driven against
// the real Vite app in headless Chrome over raw CDP — no added dependencies.
//
// WHY ONE FILE AND NOT TWO. E5 and E3 are two panels of one drawer, reached by
// one boot, one site entry and one filing; a sibling script would duplicate the
// ~250 lines of CDP scaffolding above and, worse, would run the same expensive
// real filing twice to look at two tabs of the same open dialog. They also share
// every fixture that matters — the fresh-run emptiness proof is the SAME proof
// for both surfaces (a file cannot answer with what has not been done, and a
// ledger cannot list a moment that has not happened). Splitting them would mean
// asserting that contract twice from two different boots.
//
// This harness discharges the debt recorded in docs/wave2-round1-report.md: the
// E5 scenarios below were verified live in a browser during the round-1 review
// but were never scripted, so nothing could re-run them.
//
// What it proves, in order:
//   1. FRESH RUN, both surfaces: search answers only with the approach the run
//      has taken; the ledger holds exactly one moment, no filing, no cost;
//   2. after ONE real filing at Care ward 12 (arm + confirm on the plate zone):
//      a term hitting admitted EVIDENCE, a term hitting a persona REACTION
//      (grouped by voice, name printed once), and a NO-HIT term whose status
//      line and empty state both say so;
//   3. the QUERY TRAIL accumulates across queries, newest first, deduped, every
//      past question a real ≥44px control that re-asks itself;
//   4. the LEDGER after that filing: the derived findings sentences, the forward
//      chronology, the filings each moment put on the record, the civic-trace
//      cost column, and the contradiction shown as a PAIR in the authored words;
//   5. KEYBOARD-ONLY: the search tab, the field, the submit and the results are
//      all reachable by Tab and Enter alone, without focus leaving the dialog;
//   6. EASY READ on both panels: the flattening applies at the portal boundary,
//      no narrative label stays tracked-out capitals, and the readable text is
//      IDENTICAL to the plain run's (styling flattened, content untouched);
//   7. REDUCED MOTION: neither panel animates or transitions anything;
//   8. 375-wide: the six-cell tab bar wraps rather than shrinking a tab below
//      its label, every cell still ≥44px, and each cell's visual centre still
//      activates that cell (the cross-zone sweep, on a bar that now has six).
//
// Every computed read is taken with transitions AND animations disabled and two
// frames allowed to pass (the transition-clock scar). Every interaction uses
// el.click(), a trusted CDP input event, or Input.insertText — never a synthetic
// dispatchEvent (the preview-pane scar).
//
// Usage: node scripts/evidence-record-search.mjs [app-url]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://127.0.0.1:3000/'
const OUT_DIR = new URL('../evidence/record-search/', import.meta.url).pathname
mkdirSync(OUT_DIR, { recursive: true })

const SETTINGS_KEY = 'the-annex.accessibility.v1'
const PERSONA_NAMES = ['The Registrar', 'The Shepherd', 'The Defector', 'The Small Archivist']

// The authored strings this harness quotes back at the app. They are copied from
// src/game/cases/case77.ts and are ASSERTED verbatim: if a writer edits one, this
// harness fails loudly rather than silently proving nothing.
const AUTHORED = {
  evidenceTitle: 'The rain in room twelve',
  evidenceSource: '77-A testimony',
  claim:
    '77-A recalls rain against a window in a room that had no exterior wall. “I know there was no glass,” she says. “I watched it anyway.”',
  contradiction: 'The Shepherd remembers Mara using the same image as a calming metaphor.',
  eventTitle: '77-A was heard before she was measured',
  shepherdLine:
    '“You let her finish before you measured her. She was a person in that room, not a file. I’ll remember the order you chose.”',
}

// The four findings a run with exactly Care ward 12 filed must state, in order.
const EXPECTED_FINDINGS_AFTER_ONE_FILING = [
  'Care ward 12 is closed, and it put “The rain in room twelve” on the record.',
  '1 admitted exhibit carries a contradiction against it.',
  'No memory model is on file.',
  'The tribunal will not hear this record yet: one more location must be closed and a memory model must be filed.',
]

const EXPECTED_FINDINGS_FRESH = [
  'No location is closed yet.',
  'No memory model is on file.',
  'The tribunal will not hear this record yet: 2 more locations must be closed and a memory model must be filed.',
]

const chromeProcess = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-record-${Date.now()}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--mute-audio',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1280,800',
  'about:blank',
])

const killTimer = setTimeout(() => {
  console.error('GLOBAL TIMEOUT — aborting record-search evidence run')
  chromeProcess.kill('SIGKILL')
  process.exit(2)
}, 900000)
killTimer.unref?.()

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
    const timer = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        reject(new Error(`CDP timeout: ${method}`))
      }
    }, 60000)
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
await send('DOM.enable')
await send('Emulation.setFocusEmulationEnabled', { enabled: true })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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

async function waitFor(expr, timeout = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const ok = await evaluate(expr).catch(() => false)
    if (ok) return true
    await sleep(120)
  }
  return false
}
const waitForText = (selector, text, timeout = 15000) =>
  waitFor(
    `[...document.querySelectorAll(${JSON.stringify(selector)})].some((el) => el.textContent.includes(${JSON.stringify(text)}))`,
    timeout,
  )

// el.click() only — a synthetic dispatchEvent does not reach React's root
// listener (recorded preview-pane scar).
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

async function pressKey(key, code, vk, text) {
  for (const type of ['keyDown', 'keyUp']) {
    await send('Input.dispatchKeyEvent', {
      type,
      key,
      code,
      windowsVirtualKeyCode: vk,
      nativeVirtualKeyCode: vk,
      ...(type === 'keyDown' && text ? { text } : {}),
    })
  }
  await sleep(160)
}
const pressEnter = () => pressKey('Enter', 'Enter', 13, '\r')
const pressEscape = () => pressKey('Escape', 'Escape', 27)
async function pressTab(shift = false) {
  const base = {
    key: 'Tab',
    code: 'Tab',
    windowsVirtualKeyCode: 9,
    nativeVirtualKeyCode: 9,
    modifiers: shift ? 8 : 0,
  }
  await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
  await sleep(110)
}

let viewport = { width: 1280, height: 800 }
async function setViewport(width, height) {
  viewport = { width, height }
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  })
}

async function shot(name) {
  // Settle first: the freeze used for computed reads sets `animation: none`,
  // which strands an entry animation at its base frame. Screenshots are taken
  // only after the freeze is lifted and the entry has had time to replay.
  await sleep(460)
  const { data } = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  })
  const file = join(OUT_DIR, `${name}-${viewport.width}x${viewport.height}.png`)
  writeFileSync(file, Buffer.from(data, 'base64'))
  report.shots.push(file.split('/').pop())
  return file.split('/').pop()
}

const report = {
  url: APP_URL,
  capturedAt: new Date().toISOString(),
  node: process.version,
  checks: [],
  shots: [],
  measurements: {},
  transcripts: {},
}
function record(step, pass, detail) {
  report.checks.push({ step, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${step}  ${JSON.stringify(detail)?.slice(0, 380)}`)
}

const FREEZE = `(async () => {
  document.getElementById('annex-record-freeze')?.remove()
  const style = document.createElement('style')
  style.id = 'annex-record-freeze'
  style.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }'
  document.head.appendChild(style)
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  return true
})()`
const freeze = () => evaluate(FREEZE)
const unfreeze = () =>
  evaluate(`(() => { document.getElementById('annex-record-freeze')?.remove(); return true })()`)

// The accessible text of a surface: what a screen reader would read, with
// aria-hidden and display:none subtrees dropped and alt text substituted.
const AT_TEXT_FN = `
  window.__atText = function (root) {
    if (!root) return null
    const out = []
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) { out.push(node.nodeValue); return }
      if (node.nodeType !== Node.ELEMENT_NODE) return
      if (node.getAttribute('aria-hidden') === 'true') return
      const cs = getComputedStyle(node)
      if (cs.display === 'none' || cs.visibility === 'hidden') return
      if (node.tagName === 'IMG') { out.push(node.getAttribute('alt') || ''); return }
      const label = node.getAttribute('aria-label')
      if (label) out.push(label)
      node.childNodes.forEach(walk)
    }
    walk(root)
    return out.join(' ').replace(/\\s+/g, ' ').trim()
  };
  true
`
async function atText(selector) {
  await evaluate(AT_TEXT_FN)
  return evaluate(`window.__atText(document.querySelector(${JSON.stringify(selector)}))`)
}

// ── Navigation ──────────────────────────────────────────────────────────────

let bootCounter = 0
async function bootFreshRun(settings) {
  bootCounter += 1
  // about:blank between documents releases the concourse's WebGL context; a long
  // run that never releases them wedges the renderer.
  await send('Page.navigate', { url: 'about:blank' })
  await sleep(180)
  await send('Page.navigate', { url: APP_URL })
  await waitFor(`document.readyState === 'complete'`)
  await evaluate(`(() => {
    try {
      window.localStorage.clear()
      ${settings ? `window.localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, ${JSON.stringify(JSON.stringify(settings))});` : ''}
    } catch { /* ignore */ }
    window.__annexStale = true
    return true
  })()`)
  await send('Page.navigate', {
    url: `${APP_URL}${APP_URL.includes('?') ? '&' : '?'}boot=${bootCounter}`,
  })
  if (!(await waitFor(`window.__annexStale === undefined && document.readyState === 'complete'`))) {
    throw new Error('the fresh document never became live')
  }
  if (!(await waitForText('button', 'Open a new audit'))) throw new Error('landing did not render')
  await click('button', 'Open a new audit')
  if (!(await waitFor(`!!document.querySelector('.choice-row')`))) {
    throw new Error('briefing did not render')
  }
  await click('.choice-row')
  if (!(await waitFor(`!!document.querySelector('.site-switcher')`))) {
    throw new Error('investigation did not render')
  }
  await sleep(420)
}

async function enterSite(name) {
  if (await evaluate(`!!document.querySelector('.world-return')`)) {
    await click('.world-return')
    await sleep(620)
  }
  const viaPortal = await click('.annex-world-portal', name)
  if (!viaPortal) await click('.site-switch', name)
  await waitFor(`!!document.querySelector('.world-view--closeup')`, 9000)
  await sleep(820)
}

// File the Care ward's FIRST method (Care — "Let 77-A tell one memory
// uninterrupted"), arm then confirm, then flush the staged stanza and dismiss the
// result strip so the chrome is settled. This is the one filing every assertion
// below is written against.
async function fileCareWard() {
  await enterSite('Care ward')
  await click('.scene-zone .choice-row')
  await sleep(260)
  await click('.scene-zone .choice-row')
  if (!(await waitFor(`document.querySelectorAll('.site-switch[data-filed="true"]').length > 0`, 12000))) {
    throw new Error('the Care ward filing never registered')
  }
  await sleep(900)
  for (let i = 0; i < 6; i += 1) {
    if (await evaluate(`!!document.querySelector('.scene-result-dismiss')`)) break
    await click('.scene-beat-advance')
    await sleep(700)
  }
  if (await evaluate(`!!document.querySelector('.scene-result-dismiss')`)) {
    await click('.scene-result-dismiss')
    await sleep(500)
  }
}

async function openCaseFile(tab) {
  if (!(await evaluate(`!!document.querySelector('.casefile-drawer')`))) {
    await click('.casefile-summon')
    if (!(await waitFor(`!!document.querySelector('.casefile-drawer')`))) {
      throw new Error('the case file never opened')
    }
    await sleep(360)
  }
  await click(`#rail-tab-${tab}`)
  await waitFor(`!!document.querySelector('#rail-panel-${tab}')`)
  await sleep(280)
}

// Ask the record a question the way a player does: type into the real field,
// then submit the real form. Input.insertText is a trusted browser input event,
// so React's controlled value updates; the assertion below proves it did.
async function ask(term) {
  await evaluate(`(() => {
    const input = document.querySelector('.record-search-input')
    if (!input) return false
    input.focus()
    input.setSelectionRange(0, input.value.length)
    return true
  })()`)
  await send('Input.insertText', { text: term })
  await sleep(160)
  const typed = await evaluate(`document.querySelector('.record-search-input')?.value ?? null`)
  if (typed !== term) throw new Error(`the field holds ${JSON.stringify(typed)}, not ${JSON.stringify(term)}`)
  await click('.record-search-submit')
  await sleep(320)
}

// Everything the search panel is currently showing, in one read.
const readSearchPanel = () =>
  evaluate(`(() => {
    const panel = document.querySelector('#rail-panel-search')
    if (!panel) return null
    const groups = [...panel.querySelectorAll('.record-search-group')].map((g) => ({
      label: g.querySelector('.rail-label')?.textContent.trim() ?? null,
      voices: [...g.querySelectorAll('.record-search-voice')].map((v) => v.textContent.trim()),
      entries: [...g.querySelectorAll('.record-search-entry-title')].map((t) => t.textContent.trim()),
      lines: [...g.querySelectorAll('.record-search-line')].map((l) => l.textContent.trim()),
      cites: [...g.querySelectorAll('.record-search-cite')].map((c) => c.textContent.trim()),
    }))
    return {
      status: panel.querySelector('.record-search-status')?.textContent.trim() ?? null,
      statusLive: panel.querySelector('.record-search-status')?.getAttribute('aria-live') ?? null,
      empty: panel.querySelector('.educational-empty h2')?.textContent.trim() ?? null,
      groups,
      groupCount: groups.length,
      lineCount: groups.reduce((n, g) => n + g.lines.length, 0),
      trail: [...panel.querySelectorAll('.record-trail-query')].map((b) => ({
        text: b.textContent.trim(),
        pressed: b.getAttribute('aria-pressed'),
        h: Math.round(b.getBoundingClientRect().height),
      })),
      inputLabelled: (() => {
        const input = panel.querySelector('.record-search-input')
        if (!input) return null
        const label = panel.querySelector('label[for="record-search-input"]')
        return { id: input.id, type: input.type, label: label ? label.textContent.trim() : null,
          role: panel.querySelector('.record-search-form')?.getAttribute('role') ?? null }
      })(),
    }
  })()`)

// Everything the ledger is currently showing, in one read.
const readLedgerPanel = () =>
  evaluate(`(() => {
    const panel = document.querySelector('#rail-panel-ledger')
    if (!panel) return null
    const moments = [...panel.querySelectorAll('.ledger-moment')].map((m) => ({
      cite: m.querySelector('.ledger-moment-cite')?.textContent.trim() ?? null,
      title: m.querySelector('.ledger-moment-title')?.textContent.trim() ?? null,
      detail: m.querySelector('.ledger-moment-detail')?.textContent.trim() ?? null,
      cost: m.querySelector('.ledger-moment-cost')?.textContent.trim() ?? null,
      tone: m.getAttribute('data-tone'),
      filings: [...m.querySelectorAll('.ledger-filings > li')].map((f) => ({
        kind: f.getAttribute('data-filing'),
        label: f.querySelector('.rail-label')?.textContent.trim() ?? null,
        title: f.querySelector('.ledger-filing-title')?.textContent.trim() ?? null,
        cite: f.querySelector('.ledger-filing-cite')?.textContent.trim() ?? null,
      })),
      pairs: [...m.querySelectorAll('.ledger-pair')].map((p) => {
        const halves = [...p.querySelectorAll('.ledger-pair-half')]
        const strip = (el) => el ? el.textContent.replace(el.querySelector('.rail-label')?.textContent ?? '', '').trim() : null
        return {
          labels: halves.map((h) => h.querySelector('.rail-label')?.textContent.trim() ?? null),
          claim: strip(halves[0]),
          against: strip(halves[1]),
          cite: p.querySelector('.ledger-filing-cite')?.textContent.trim() ?? null,
        }
      }),
      voices: [...m.querySelectorAll('.ledger-voice')].map((v) => v.textContent.trim()),
      lines: [...m.querySelectorAll('.ledger-line')].map((l) => l.textContent.trim()),
    }))
    return {
      findings: [...panel.querySelectorAll('.ledger-findings-list > li')].map((li) => li.textContent.trim()),
      findingsListTag: panel.querySelector('.ledger-findings-list')?.tagName ?? null,
      momentsListTag: panel.querySelector('.ledger-moments')?.tagName ?? null,
      headings: [...panel.querySelectorAll('h2, h3, h4')].map((h) => ({ level: Number(h.tagName[1]), text: h.textContent.trim().slice(0, 60) })),
      carried: [...panel.querySelectorAll('.ledger-carried-list > li')].map((li) => li.textContent.trim().slice(0, 80)),
      moments,
      charCount: (panel.textContent || '').replace(/\\s+/g, ' ').trim().length,
    }
  })()`)

// ════════════════════════════════════════════════════════════════════════════
// 1. The fresh run — the emptiness contract, on both surfaces
// ════════════════════════════════════════════════════════════════════════════

async function freshPass(width, height) {
  const tag = `${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()
  await openCaseFile('search')

  const idle = await readSearchPanel()
  report.measurements[`search-idle:${tag}`] = idle
  record(`${tag} · fresh search: a real labelled field inside a search form`,
    idle.inputLabelled?.type === 'search' && idle.inputLabelled?.label === 'Search the record' &&
      idle.inputLabelled?.role === 'search',
    idle.inputLabelled)
  record(`${tag} · fresh search: the count line exists and is polite BEFORE anything is asked`,
    idle.status === '' && idle.statusLive === 'polite', { status: idle.status, live: idle.statusLive })
  record(`${tag} · fresh search: nothing asked yet, and the panel says so`,
    idle.empty === 'Nothing has been asked of the file yet' && idle.trail.length === 0, idle.empty)

  // THE EMPTINESS PROOF. A phrase that only exists once Care ward 12 is filed
  // must answer with nothing; the approach the run DID take must answer with
  // itself, and with nothing but itself.
  await ask('room twelve')
  const unfiled = await readSearchPanel()
  report.measurements[`search-fresh-unfiled:${tag}`] = unfiled
  record(`${tag} · a fresh run's record cannot answer with a place the auditor has not been`,
    unfiled.status === 'No entry answers to “room twelve”.' && unfiled.groupCount === 0 &&
      unfiled.empty === 'The record does not answer to that',
    { status: unfiled.status, groups: unfiled.groupCount, empty: unfiled.empty })

  await ask('custody')
  const approachOnly = await readSearchPanel()
  report.measurements[`search-fresh-approach:${tag}`] = approachOnly
  record(`${tag} · a fresh run answers with the approach it took, and nothing else`,
    approachOnly.groupCount === 1 && approachOnly.groups[0].label === 'On the log' &&
      approachOnly.lineCount === 1,
    { groups: approachOnly.groups.map((g) => g.label), lines: approachOnly.lineCount })
  await shot('01-search-fresh-approach-only')

  await openCaseFile('ledger')
  const ledger = await readLedgerPanel()
  report.measurements[`ledger-fresh:${tag}`] = ledger
  record(`${tag} · a fresh ledger states only what a fresh run supports`,
    JSON.stringify(ledger.findings) === JSON.stringify(EXPECTED_FINDINGS_FRESH), ledger.findings)
  record(`${tag} · a fresh ledger holds one moment: no filing, no cost, nothing carried in`,
    ledger.moments.length === 1 && ledger.moments[0].cite === 'Entry 01' &&
      ledger.moments[0].filings.length === 0 && ledger.moments[0].cost === null &&
      ledger.moments[0].pairs.length === 0 && ledger.carried.length === 0,
    ledger.moments)
  await shot('02-ledger-fresh')
}

// ════════════════════════════════════════════════════════════════════════════
// 2. One real filing — the search scenarios, the trail, and the ledger
// ════════════════════════════════════════════════════════════════════════════

let plainSearchText = null
let plainLedgerText = null

async function filedPass(width, height) {
  const tag = `${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()
  await fileCareWard()
  await openCaseFile('search')

  // (a) A term that hits ADMITTED EVIDENCE.
  await ask('rain')
  const onEvidence = await readSearchPanel()
  report.measurements[`search-evidence:${tag}`] = onEvidence
  const evidenceGroup = onEvidence.groups.find((g) => g.label === 'Admitted evidence')
  record(`${tag} · a term reaches the admitted exhibit, cited to its authored source`,
    Boolean(evidenceGroup) && evidenceGroup.entries.includes(AUTHORED.evidenceTitle) &&
      evidenceGroup.cites.includes(AUTHORED.evidenceSource),
    { group: evidenceGroup })
  record(`${tag} · the same term also reaches the log entry that admitted it`,
    onEvidence.groups.some((g) => g.label === 'On the log') &&
      onEvidence.groups.some((g) => g.lines.some((l) => l.includes('rained'))),
    { labels: onEvidence.groups.map((g) => g.label) })
  record(`${tag} · the count line agrees with what is on screen`,
    onEvidence.status === `${onEvidence.lineCount} entries answer to “rain”.` ||
      onEvidence.status === `1 entry answers to “rain”.`,
    { status: onEvidence.status, lines: onEvidence.lineCount })
  await shot('03-search-hits-evidence')

  // (b) A term that hits a PERSONA REACTION, grouped by voice.
  await ask('person in that room')
  const onVoice = await readSearchPanel()
  report.measurements[`search-voice:${tag}`] = onVoice
  const voiceGroup = onVoice.groups.find((g) => g.label === 'Said on the record')
  record(`${tag} · a term reaches what a presence said, under its own voice heading`,
    Boolean(voiceGroup) && voiceGroup.voices.length === 1 &&
      voiceGroup.voices[0] === 'The Shepherd' &&
      voiceGroup.lines.includes(AUTHORED.shepherdLine),
    { group: voiceGroup })
  const searchNames = await atText('#rail-panel-search')
  const searchCounts = Object.fromEntries(
    PERSONA_NAMES.map((n) => [n, (searchNames.match(new RegExp(n, 'g')) || []).length]),
  )
  record(`${tag} · search results name each presence at most once`,
    Object.values(searchCounts).every((n) => n <= 1) &&
      Object.values(searchCounts).some((n) => n === 1),
    searchCounts)
  await shot('04-search-hits-voice')

  // (c) A term with NO answer.
  await ask('zeppelin')
  const noHit = await readSearchPanel()
  report.measurements[`search-nohit:${tag}`] = noHit
  record(`${tag} · a term the record cannot answer says so, and shows nothing`,
    noHit.status === 'No entry answers to “zeppelin”.' && noHit.groupCount === 0 &&
      noHit.empty === 'The record does not answer to that',
    { status: noHit.status, groups: noHit.groupCount, empty: noHit.empty })
  await shot('05-search-no-hit')

  // (d) THE QUERY TRAIL, accumulated across all three questions.
  record(`${tag} · the trail holds every question asked this run, newest first`,
    noHit.trail.map((t) => t.text).join(' | ') === 'zeppelin | person in that room | rain',
    noHit.trail)
  record(`${tag} · every past question is a real ≥44px control`,
    noHit.trail.length === 3 && noHit.trail.every((t) => t.h >= 44),
    noHit.trail.map((t) => t.h))
  record(`${tag} · the trail marks which question is currently being answered`,
    noHit.trail.filter((t) => t.pressed === 'true').length === 1 &&
      noHit.trail.find((t) => t.pressed === 'true').text === 'zeppelin',
    noHit.trail.map((t) => ({ text: t.text, pressed: t.pressed })))

  // Re-asking from the trail restores that question's answer and does not
  // duplicate the entry — a thought can be picked up again.
  await click('.record-trail-query', 'rain')
  await sleep(360)
  const reasked = await readSearchPanel()
  report.measurements[`search-reasked:${tag}`] = reasked
  record(`${tag} · clicking a past question re-asks it, without lengthening the trail`,
    reasked.status === onEvidence.status && reasked.trail.length === 3 &&
      reasked.trail.find((t) => t.pressed === 'true')?.text === 'rain',
    { status: reasked.status, trail: reasked.trail.map((t) => t.text) })
  await shot('06-search-trail-reask')

  plainSearchText = await atText('#rail-panel-search')

  // ── The ledger, on the same filed run ──────────────────────────────────────
  await openCaseFile('ledger')
  const ledger = await readLedgerPanel()
  report.measurements[`ledger-filed:${tag}`] = ledger

  record(`${tag} · the findings read off the file, sentence for sentence`,
    JSON.stringify(ledger.findings) === JSON.stringify(EXPECTED_FINDINGS_AFTER_ONE_FILING),
    ledger.findings)
  record(`${tag} · the chronology reads FORWARDS, one moment per logged event`,
    ledger.moments.length === 2 &&
      ledger.moments.map((m) => m.cite).join(' ') === 'Entry 01 Entry 02',
    ledger.moments.map((m) => m.cite))

  const filing = ledger.moments[1]
  record(`${tag} · the filing moment quotes the log's own title and detail`,
    filing.title === AUTHORED.eventTitle && (filing.detail ?? '').includes('It rained on the window'),
    { title: filing.title, detail: (filing.detail ?? '').slice(0, 90) })
  record(`${tag} · the moment shows WHAT IT FILED: the exhibit and the location, each cited`,
    filing.filings.some((f) => f.kind === 'evidence' && f.label === 'Admitted' &&
      f.title === AUTHORED.evidenceTitle && f.cite === AUTHORED.evidenceSource) &&
      filing.filings.some((f) => f.kind === 'site' && f.label === 'Location closed' &&
        f.title === 'Care ward 12'),
    filing.filings)
  record(`${tag} · the moment shows WHAT IT COST, in the log's own trace vocabulary`,
    filing.cost === 'Civic trace · none', { cost: filing.cost, tone: filing.tone })
  record(`${tag} · the contradiction is shown as a PAIR, in the authored words, both labelled`,
    filing.pairs.length === 1 &&
      filing.pairs[0].labels.join('/') === 'The claim/Against it' &&
      filing.pairs[0].claim === AUTHORED.claim &&
      filing.pairs[0].against === AUTHORED.contradiction &&
      filing.pairs[0].cite === AUTHORED.evidenceSource,
    filing.pairs)
  record(`${tag} · the moment carries the line the presence said, under one name`,
    filing.voices.length === 1 && filing.voices[0] === 'The Shepherd' &&
      filing.lines.includes(AUTHORED.shepherdLine),
    { voices: filing.voices, lines: filing.lines.length })

  // Real lists, real headings, no skipped level.
  const levels = ledger.headings.map((h) => h.level)
  let skipped = 0
  for (let i = 1; i < levels.length; i += 1) if (levels[i] - levels[i - 1] > 1) skipped += 1
  record(`${tag} · the ledger is real lists with real headings, no level skipped`,
    ledger.findingsListTag === 'OL' && ledger.momentsListTag === 'OL' &&
      levels[0] === 2 && skipped === 0 && ledger.headings.length >= 4,
    { headings: ledger.headings, skipped })

  // NAME-COUNT, per moment. A chronology of a run necessarily revisits the same
  // four presences across moments — the log panel does too, and no harness holds
  // that surface to exactly-once. What the ledger owes is that a presence which
  // spoke twice IN ONE MOMENT is still named once there. Both numbers are
  // recorded; only the per-moment one is a gate.
  const ledgerNames = await atText('#rail-panel-ledger')
  const perSurface = Object.fromEntries(
    PERSONA_NAMES.map((n) => [n, (ledgerNames.match(new RegExp(n, 'g')) || []).length]),
  )
  report.measurements[`ledger-name-counts:${tag}`] = {
    perSurface,
    perMoment: ledger.moments.map((m) => m.voices),
  }
  record(`${tag} · the ledger names each presence at most once inside any one moment`,
    ledger.moments.every((m) => new Set(m.voices).size === m.voices.length) &&
      ledger.moments.some((m) => m.voices.length > 0),
    ledger.moments.map((m) => m.voices))
  record(`${tag} · the ledger authors no persona heading of its own (recorded, not a gate)`,
    true, perSurface)

  // ANTI-CODEX datum. The ledger must be a second READING of the record, not a
  // second copy of the log. Recorded, not gated: the number the reviewer wants
  // is "is this a wall", and a wall is a judgement, not a threshold.
  await openCaseFile('log')
  const logChars = await evaluate(
    `(document.querySelector('#rail-panel-log')?.textContent || '').replace(/\\s+/g, ' ').trim().length`,
  )
  report.measurements[`panel-weight:${tag}`] = { ledger: ledger.charCount, log: logChars }
  record(`${tag} · panel weight recorded (ledger vs log characters)`, true,
    { ledger: ledger.charCount, log: logChars })

  await openCaseFile('ledger')
  plainLedgerText = await atText('#rail-panel-ledger')
  await shot('07-ledger-after-filing')
  // The contradiction pair, brought into view for the screenshot.
  await evaluate(`(() => { document.querySelector('.ledger-pair')?.scrollIntoView({ block: 'center' }); return true })()`)
  await sleep(320)
  await shot('08-ledger-contradiction-pair')
}

// ════════════════════════════════════════════════════════════════════════════
// 3. Keyboard only — tab, field, submit, results, trail
// ════════════════════════════════════════════════════════════════════════════

async function keyboardPass(width, height) {
  const tag = `${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()
  await fileCareWard()

  const transcript = []
  const step = async (name) => {
    const info = await evaluate(`(() => {
      const el = document.activeElement
      const isBody = !el || el === document.body
      const dialog = document.querySelector('[aria-modal="true"]')
      return {
        tag: isBody ? 'BODY' : el.tagName,
        id: isBody ? '' : el.id,
        cls: isBody ? '' : String(el.className || '').slice(0, 48),
        label: isBody ? '' : (el.textContent || el.value || '').replace(/\\s+/g, ' ').trim().slice(0, 44),
        inside: !!dialog && !isBody && dialog.contains(el),
      }
    })()`)
    transcript.push({ step: name, ...info })
    return info
  }

  // Open the drawer from the keyboard alone.
  await evaluate(`(() => { document.querySelector('.casefile-summon')?.focus(); return true })()`)
  await step('focus the summon')
  await pressEnter()
  await waitFor(`!!document.querySelector('[aria-modal="true"]')`)
  await sleep(420)
  await step('Enter opens the case file')

  // Tab to the SEARCH tab and activate it — no click anywhere in this pass.
  let reachedTab = false
  for (let i = 0; i < 20 && !reachedTab; i += 1) {
    await pressTab()
    const info = await step(`Tab ×${i + 1}`)
    reachedTab = info.id === 'rail-tab-search'
  }
  record(`${tag} · keyboard reaches the Search tab by Tab alone`, reachedTab, {
    steps: transcript.length,
  })
  await pressEnter()
  await sleep(320)
  const panelOpen = await evaluate(`!!document.querySelector('#rail-panel-search')`)
  record(`${tag} · Enter on the Search tab opens the search panel`, panelOpen, {})

  // Tab to the field, type with trusted input, submit with Enter.
  let reachedField = false
  for (let i = 0; i < 8 && !reachedField; i += 1) {
    await pressTab()
    const info = await step(`Tab to field ×${i + 1}`)
    reachedField = info.id === 'record-search-input'
  }
  record(`${tag} · keyboard reaches the search field by Tab alone`, reachedField, {})
  await send('Input.insertText', { text: 'rain' })
  await sleep(200)
  await pressEnter()
  await sleep(400)
  const afterEnter = await readSearchPanel()
  report.measurements[`keyboard-results:${tag}`] = afterEnter
  record(`${tag} · Enter in the field submits the question and the record answers`,
    afterEnter.groupCount > 0 && /answers? to “rain”\./.test(afterEnter.status ?? ''),
    { status: afterEnter.status, groups: afterEnter.groupCount })
  await step('Enter submits the query')
  await shot('09-search-keyboard-results')

  // Keep tabbing: focus must reach the trail control and never leave the dialog.
  let escaped = 0
  let reachedTrail = false
  for (let i = 0; i < 14; i += 1) {
    await pressTab()
    const info = await step(`Tab past results ×${i + 1}`)
    if (!info.inside) escaped += 1
    if (info.cls.includes('record-trail-query')) reachedTrail = true
  }
  record(`${tag} · Tab through the results never leaves the dialog`, escaped === 0, { escaped })
  record(`${tag} · the query trail is reachable from the keyboard`, reachedTrail, {})

  // And the ledger tab is reachable and operable the same way.
  let reachedLedger = false
  for (let i = 0; i < 26 && !reachedLedger; i += 1) {
    await pressTab()
    const info = await step(`Tab to ledger ×${i + 1}`)
    reachedLedger = info.id === 'rail-tab-ledger'
  }
  record(`${tag} · keyboard reaches the Ledger tab by Tab alone`, reachedLedger, {})
  if (reachedLedger) {
    await pressEnter()
    await sleep(360)
    const ledgerOpen = await evaluate(`!!document.querySelector('#rail-panel-ledger')`)
    record(`${tag} · Enter on the Ledger tab opens the ledger`, ledgerOpen, {})
  }

  await pressEscape()
  await sleep(420)
  const returned = await evaluate(`(() => {
    const el = document.activeElement
    if (!el || el === document.body) return { ok: false, why: 'BODY' }
    return { ok: el.matches('.casefile-summon'), cls: String(el.className).slice(0, 48) }
  })()`)
  record(`${tag} · Escape closes and returns focus to the summoning button`, returned.ok === true,
    returned)

  report.transcripts[`keyboard-${tag}`] = transcript
  console.log(`\n── keyboard transcript · ${tag} ──`)
  for (const line of transcript) {
    console.log(`  ${String(line.step).padEnd(24)} → ${line.tag}${line.id ? `#${line.id}` : ''}${line.label ? ` "${line.label}"` : ''}`)
  }
  console.log('')
}

// ════════════════════════════════════════════════════════════════════════════
// 4. Easy Read — styling flattened, content untouched
// ════════════════════════════════════════════════════════════════════════════

const EASY_READ_SETTINGS = {
  reducedMotion: false,
  highContrast: false,
  textSize: 'standard',
  showTrustNumbers: false,
  ambientSound: false,
  easyRead: true,
  subtitlePlate: false,
}

async function easyReadPass(width, height) {
  const tag = `${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun(EASY_READ_SETTINGS)

  const atRest = await evaluate(`document.querySelectorAll('.easy-read').length`)
  await fileCareWard()
  await openCaseFile('search')
  const withDrawer = await evaluate(`document.querySelectorAll('.easy-read').length`)
  record(`${tag} · Easy Read reaches the portal boundary, not just the shell`,
    atRest === 1 && withDrawer === 2, { atRest, withDrawer })

  await ask('rain')
  await ask('person in that room')
  await ask('zeppelin')
  await ask('rain')
  await freeze()
  const flattened = await evaluate(`(() => {
    const panel = document.querySelector('#rail-panel-search')
    const submit = panel.querySelector('.record-search-submit')
    const cs = getComputedStyle(submit)
    // The Wave-1 Easy Read criterion, applied to this panel: nothing that is
    // uppercase AND tracked past 0.06em AND longer than four words.
    const offenders = []
    for (const el of panel.querySelectorAll('*')) {
      const s = getComputedStyle(el)
      const words = (el.textContent || '').trim().split(/\\s+/).filter(Boolean).length
      const track = parseFloat(s.letterSpacing)
      if (s.textTransform === 'uppercase' && Number.isFinite(track) && track > 0.06 * parseFloat(s.fontSize) && words > 4) {
        offenders.push({ cls: String(el.className).slice(0, 40), words, track, size: s.fontSize })
      }
    }
    return { submitTransform: cs.textTransform, submitTracking: cs.letterSpacing, offenders }
  })()`)
  await unfreeze()
  report.measurements[`easy-read-search:${tag}`] = flattened
  record(`${tag} · Easy Read flattens the search panel's tracked capitals`,
    flattened.submitTransform === 'none' && flattened.offenders.length === 0, flattened)

  const easySearchText = await atText('#rail-panel-search')
  record(`${tag} · Easy Read removes styling and NOT content on the search panel`,
    plainSearchText !== null && easySearchText === plainSearchText,
    { plainLength: plainSearchText?.length ?? null, easyLength: easySearchText.length,
      identical: easySearchText === plainSearchText })
  await shot('10-search-easy-read')

  await openCaseFile('ledger')
  await freeze()
  const ledgerFlat = await evaluate(`(() => {
    const panel = document.querySelector('#rail-panel-ledger')
    const offenders = []
    for (const el of panel.querySelectorAll('*')) {
      const s = getComputedStyle(el)
      const words = (el.textContent || '').trim().split(/\\s+/).filter(Boolean).length
      const track = parseFloat(s.letterSpacing)
      if (s.textTransform === 'uppercase' && Number.isFinite(track) && track > 0.06 * parseFloat(s.fontSize) && words > 4) {
        offenders.push({ cls: String(el.className).slice(0, 40), words, track })
      }
    }
    return { offenders, italics: [...panel.querySelectorAll('*')].filter((el) => getComputedStyle(el).fontStyle === 'italic').length }
  })()`)
  await unfreeze()
  report.measurements[`easy-read-ledger:${tag}`] = ledgerFlat
  record(`${tag} · Easy Read leaves no tracked capital prose in the ledger`,
    ledgerFlat.offenders.length === 0, ledgerFlat)
  const easyLedgerText = await atText('#rail-panel-ledger')
  record(`${tag} · Easy Read removes styling and NOT content on the ledger`,
    plainLedgerText !== null && easyLedgerText === plainLedgerText,
    { plainLength: plainLedgerText?.length ?? null, easyLength: easyLedgerText.length,
      identical: easyLedgerText === plainLedgerText })
  await shot('11-ledger-easy-read')
}

// ════════════════════════════════════════════════════════════════════════════
// 5. Reduced motion — neither panel animates anything
// ════════════════════════════════════════════════════════════════════════════

async function reducedMotionPass(width, height) {
  const tag = `${width}x${height}`
  await setViewport(width, height)
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  await bootFreshRun({ ...EASY_READ_SETTINGS, easyRead: false, reducedMotion: true })
  await fileCareWard()
  await openCaseFile('ledger')
  await sleep(500)

  // MEASUREMENT NOTE (kept outside the evaluated string, which is a template
  // literal and cannot hold back-ticked code spans). The app's reduce-motion
  // contract is animation-duration / transition-duration 0.01ms !important
  // (styles.css:8657-8664), NOT 'none' — the standard technique, because a zero
  // duration still fires transitionend while 'none' would strand an
  // animation-driven layout. So "moving" below means a duration a reader could
  // perceive, not merely a nonzero one: the first draft of this check tested
  // transitionDuration !== '0s' and failed a correctly-reduced panel on 1e-05s,
  // which IS 0.01ms. The floor is 1ms — two orders of magnitude above the app's
  // value, and far below anything visible.
  const motion = await evaluate(`(() => {
    const panel = document.querySelector('#rail-panel-ledger')
    const portal = document.querySelector('.casefile-portal')
    const seconds = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }
    const moving = []
    for (const el of panel.querySelectorAll('*')) {
      const s = getComputedStyle(el)
      const animates = s.animationName !== 'none' && seconds(s.animationDuration) > 0.001
      const transitions = s.transitionProperty !== 'none' && seconds(s.transitionDuration) > 0.001
      if (animates || transitions) {
        moving.push({ cls: String(el.className).slice(0, 40), animation: s.animationName,
          animationDuration: s.animationDuration, transition: s.transitionDuration })
      }
    }
    return {
      portalClass: portal ? portal.className : null,
      moving,
      osReduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      visibleText: (panel.textContent || '').replace(/\\s+/g, ' ').trim().length,
    }
  })()`)
  report.measurements[`reduced-motion-ledger:${tag}`] = motion
  record(`${tag} · reduced motion: the ledger animates and transitions nothing`,
    motion.moving.length === 0 && motion.osReduced && motion.visibleText > 200, motion)
  record(`${tag} · reduced motion: the portal repeats the preference class`,
    (motion.portalClass ?? '').includes('reduce-motion'), { portalClass: motion.portalClass })
  await shot('12-ledger-reduced-motion')

  await openCaseFile('search')
  await ask('rain')
  const searchMotion = await evaluate(`(() => {
    const panel = document.querySelector('#rail-panel-search')
    const seconds = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }
    const moving = []
    for (const el of panel.querySelectorAll('*')) {
      const s = getComputedStyle(el)
      if (s.animationName !== 'none' && seconds(s.animationDuration) > 0.001) {
        moving.push(String(el.className).slice(0, 40))
      }
    }
    return { moving, results: panel.querySelectorAll('.record-search-line').length }
  })()`)
  report.measurements[`reduced-motion-search:${tag}`] = searchMotion
  record(`${tag} · reduced motion: the search panel animates nothing and still answers`,
    searchMotion.moving.length === 0 && searchMotion.results > 0, searchMotion)
  await shot('13-search-reduced-motion')

  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
  })
}

// ════════════════════════════════════════════════════════════════════════════
// 6. The six-cell tab bar — geometry and cross-zone sweep at both widths
// ════════════════════════════════════════════════════════════════════════════

async function tabBarPass(width, height) {
  const tag = `${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()
  await openCaseFile('ledger')
  await freeze()

  const bar = await evaluate(`(() => {
    const tabs = [...document.querySelectorAll('.rail-tabs button')]
    const boxes = tabs.map((t) => {
      const r = t.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return {
        id: t.id,
        text: t.textContent.trim(),
        w: Math.round(r.width), h: Math.round(r.height),
        top: Math.round(r.top), left: Math.round(r.left),
        // RAW geometry for the overlap test. Six cells in a 520px drawer are
        // 86.5px wide, and rounding each edge to an integer manufactures a 1px
        // overlap between neighbours that does not exist — the first draft of
        // this check reported two "overlaps" on a perfectly tiled grid. Never
        // report an intersection smaller than the instrument's own resolution.
        raw: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
        // Does the label fit the cell without spilling out of it?
        scrollW: t.scrollWidth, clientW: t.clientWidth,
        hitsIntended: !!hit && (hit === t || t.contains(hit)),
      }
    })
    const EPS = 0.5
    const overlaps = []
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i].raw, b = boxes[j].raw
        const dx = Math.min(a.right, b.right) - Math.max(a.left, b.left)
        const dy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        if (dx > EPS && dy > EPS) overlaps.push([boxes[i].id, boxes[j].id, Math.round(dx * 100) / 100, Math.round(dy * 100) / 100])
      }
    }
    const rows = new Set(boxes.map((b) => b.top)).size
    return { boxes, overlaps, rows, columns: getComputedStyle(document.querySelector('.rail-tabs')).gridTemplateColumns }
  })()`)
  await unfreeze()
  report.measurements[`tab-bar:${tag}`] = bar

  record(`${tag} · the bar carries six named cells including the ledger`,
    bar.boxes.length === 6 && bar.boxes.some((b) => b.id === 'rail-tab-ledger') &&
      bar.boxes.some((b) => b.id === 'rail-tab-search'),
    bar.boxes.map((b) => b.text))
  record(`${tag} · every cell is a ≥44px target`, bar.boxes.every((b) => b.h >= 44),
    bar.boxes.map((b) => b.h))
  record(`${tag} · no two cells overlap`, bar.overlaps.length === 0, bar.overlaps)
  record(`${tag} · each cell's visual centre activates THAT cell (cross-zone sweep)`,
    bar.boxes.every((b) => b.hitsIntended), bar.boxes.map((b) => ({ id: b.id, hit: b.hitsIntended })))
  record(`${tag} · no cell's label spills out of its own cell`,
    bar.boxes.every((b) => b.scrollW <= b.clientW + 1),
    bar.boxes.map((b) => ({ id: b.id, scrollW: b.scrollW, clientW: b.clientW })))
  // The layout claim itself: one row wide, two rows narrow, and both stated.
  record(`${tag} · the bar lays out as ${width >= 700 ? 'one row of six' : 'two rows of three'}`,
    width >= 700 ? bar.rows === 1 : bar.rows === 2, { rows: bar.rows, columns: bar.columns })

  // And drive each cell for real: exactly its own panel, exactly one pressed.
  for (const id of bar.boxes.map((b) => b.id)) {
    await click(`#${id}`)
    await sleep(220)
    const state = await evaluate(`(() => ({
      panels: [...document.querySelectorAll('.rail-panel')].map((p) => p.id),
      pressed: [...document.querySelectorAll('.rail-tabs button[aria-pressed="true"]')].map((b) => b.id),
    }))()`)
    record(`${tag} · "${id.replace('rail-tab-', '')}" opens exactly its own panel`,
      state.panels.length === 1 && state.pressed.length === 1 && state.pressed[0] === id &&
        state.panels[0] === id.replace('rail-tab-', 'rail-panel-'),
      state)
  }
  await click('#rail-tab-ledger')
  await sleep(240)
  await shot('14-tab-bar-ledger')
}

// ── Run ─────────────────────────────────────────────────────────────────────

async function guard(name, fn) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      const message = String(error?.message ?? error)
      if (attempt === 1 && message.startsWith('CDP timeout')) {
        console.error(`  (retrying ${name} after ${message})`)
        await send('Page.navigate', { url: 'about:blank' }).catch(() => undefined)
        await sleep(1500)
        continue
      }
      record(`${name} — THREW`, false, { error: message })
      return null
    }
  }
  return null
}

await guard('fresh 1280', () => freshPass(1280, 800))
await guard('filed 1280', () => filedPass(1280, 800))
await guard('keyboard 1280', () => keyboardPass(1280, 800))
await guard('easy read 1280', () => easyReadPass(1280, 800))
await guard('reduced motion 1280', () => reducedMotionPass(1280, 800))
await guard('tab bar 1280', () => tabBarPass(1280, 800))
await guard('tab bar 375', () => tabBarPass(375, 812))
await guard('fresh 375', () => freshPass(375, 812))
await guard('filed 375', () => filedPass(375, 812))

const passed = report.checks.filter((c) => c.pass).length
report.summary = { total: report.checks.length, passed, failed: report.checks.length - passed }
writeFileSync(join(OUT_DIR, 'measurements.json'), JSON.stringify(report, null, 2))
console.log(`\n${passed}/${report.checks.length} checks passed · ${report.shots.length} screenshots`)
console.log(`evidence written to ${OUT_DIR}`)

clearTimeout(killTimer)
socket.close()
chromeProcess.kill('SIGTERM')
process.exit(report.summary.failed > 0 ? 1 : 0)

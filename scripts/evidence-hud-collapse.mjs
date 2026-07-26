// Evidence for the minimal-HUD collapse (persona plan steps E–G = scene-first
// plan step 8), driven against the real Vite app in headless Chrome over raw CDP
// — no added dependencies.
//
// What it proves, in order:
//   1. the App layout collapsed to a single scene-dominant column and the rail
//      column / mobile toggle are gone;
//   2. the always-on set is exactly the ratified one (site label, objectives,
//      threshold-until-first-filing, promoted alarm, fieldCta dock), with the
//      dropped items absent and the <h1> surviving as sr-only;
//   3. the case file opens as a right-docked drawer at 1280 and a full sheet at
//      375, with all six tabs including the roster dossier and the ledger;
//   4. MUTUAL EXCLUSIVITY, live: opening either summon closes the other and
//      document.querySelectorAll('[aria-modal="true"]').length === 1 throughout;
//   5. keyboard-only transcripts through BOTH summons — focus lands inside, Tab
//      cycles without escaping, Escape closes, focus returns to the summoner and
//      never falls to <body>;
//   6. the cross-zone sweep over every positioned control pair on the plate
//      chrome and over the drawer's six-tab bar;
//   7. the alarm chip appears only when state.alarm > 0 and the threshold line
//      retires after the first filing;
//   8. forced-colors / high-contrast / reduced-motion;
//   9. the console-proportion retune (px of scene left above each room console)
//      and the 375 zone-anchor crop, both measured with transitions killed.
//
// Every computed read is taken with transitions AND animations disabled and two
// frames allowed to pass (the transition-clock scar: a computed read on a
// transitioned property otherwise returns the START frame). Every interaction
// uses el.click() or a trusted CDP input event, never a synthetic dispatchEvent.
//
// Usage: node scripts/evidence-hud-collapse.mjs [app-url]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://127.0.0.1:3000/'
const OUT_DIR = new URL('../evidence/hud-collapse/', import.meta.url).pathname
mkdirSync(OUT_DIR, { recursive: true })

const SAVE_KEY = 'the-annex.case-77.save.v1'
const SETTINGS_KEY = 'the-annex.accessibility.v1'
const PERSONA_NAMES = ['The Registrar', 'The Shepherd', 'The Defector', 'The Small Archivist']

const chromeProcess = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-hud-${Date.now()}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--mute-audio',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1280,800',
  'about:blank',
])

const killTimer = setTimeout(() => {
  console.error('GLOBAL TIMEOUT — aborting HUD collapse evidence run')
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
await send('Accessibility.enable')
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
// 'keyDown' (not 'rawKeyDown') keeps the emulated key properly released.
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
  // Always settle first. The freeze used for computed reads sets
  // `animation: none`, which strands any entry animation at its base frame — the
  // harness's own version of the recorded opacity-strand scar. Screenshots are
  // therefore taken only after the freeze is lifted AND the entry has had time
  // to replay, so an evidence PNG is never a mid-transition frame.
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

// ── Frozen computed reads ───────────────────────────────────────────────────
const FREEZE = `(async () => {
  document.getElementById('annex-hud-freeze')?.remove()
  const style = document.createElement('style')
  style.id = 'annex-hud-freeze'
  style.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }'
  document.head.appendChild(style)
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  return true
})()`
const freeze = () => evaluate(FREEZE)
const unfreeze = () =>
  evaluate(`(() => { document.getElementById('annex-hud-freeze')?.remove(); return true })()`)

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

async function nameCounts(selector, label) {
  await evaluate(AT_TEXT_FN)
  const result = await evaluate(`(() => {
    const root = document.querySelector(${JSON.stringify(selector)})
    if (!root) return null
    const text = window.__atText(root)
    const names = ${JSON.stringify(PERSONA_NAMES)}
    const counts = {}
    names.forEach((n) => {
      counts[n] = (text.match(new RegExp(n.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'g')) || []).length
    })
    return { text: text.slice(0, 1600), counts }
  })()`)
  if (!result) {
    record(`AT name counts · ${label}`, false, { selector, error: 'surface not present' })
    return null
  }
  report.measurements[`atText:${label}`] = result
  const present = Object.entries(result.counts).filter(([, n]) => n > 0)
  const anyDouble = present.some(([, n]) => n !== 1)
  record(
    `AT name counts · ${label} — every named persona appears exactly once`,
    !anyDouble && present.length > 0,
    { selector, counts: result.counts },
  )
  return result
}

const rects = (selector) =>
  evaluate(`(() => [...document.querySelectorAll(${JSON.stringify(selector)})].map((el) => {
    const r = el.getBoundingClientRect()
    return {
      w: Math.round(r.width * 100) / 100,
      h: Math.round(r.height * 100) / 100,
      top: Math.round(r.top * 100) / 100,
      left: Math.round(r.left * 100) / 100,
      right: Math.round(r.right * 100) / 100,
      bottom: Math.round(r.bottom * 100) / 100,
      text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 60),
    }
  }))()`)

const activeInfo = () =>
  evaluate(`(() => {
    const el = document.activeElement
    if (!el || el === document.body) return { tag: 'BODY', label: '' }
    return {
      tag: el.tagName,
      cls: String(el.className || '').slice(0, 56),
      label: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 64),
    }
  })()`)

const modalCount = () =>
  evaluate(`(() => {
    const nodes = [...document.querySelectorAll('[aria-modal="true"]')]
    return { count: nodes.length, classes: nodes.map((n) => String(n.className)) }
  })()`)

// ── Navigation ──────────────────────────────────────────────────────────────

let bootCounter = 0
async function bootFreshRun(seed) {
  bootCounter += 1
  // Tear the previous document down first. Every boot mounts the WebGL concourse,
  // and a long run that never releases those contexts eventually wedges the
  // renderer (observed: a mid-run cluster of `CDP timeout` on Page.navigate /
  // Emulation.*). about:blank between documents drops the context deterministically.
  await send('Page.navigate', { url: 'about:blank' })
  await sleep(180)
  await send('Page.navigate', { url: APP_URL })
  await waitFor(`document.readyState === 'complete'`)
  await evaluate(`(() => {
    try {
      window.localStorage.clear()
      ${seed ? `window.localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(seed))});
      window.localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, ${JSON.stringify(JSON.stringify(seed.settings))});` : ''}
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
  if (seed) {
    if (!(await waitForText('button', 'Continue'))) throw new Error('landing offered no Continue')
    await click('button', 'Continue')
  } else {
    if (!(await waitForText('button', 'Open a new audit'))) throw new Error('landing did not render')
    await click('button', 'Open a new audit')
    if (!(await waitFor(`!!document.querySelector('.choice-row')`))) {
      throw new Error('briefing did not render')
    }
    await click('.choice-row')
  }
  if (!(await waitFor(`!!document.querySelector('.site-switcher')`))) {
    throw new Error('investigation did not render')
  }
  await sleep(420)
}

async function returnToConcourse() {
  if (await evaluate(`!!document.querySelector('.world-return')`)) {
    await click('.world-return')
    await sleep(620)
  }
}

async function enterSite(name) {
  await returnToConcourse()
  const viaPortal = await click('.annex-world-portal', name)
  if (!viaPortal) await click('.site-switch', name)
  await waitFor(`!!document.querySelector('.world-view--closeup')`, 9000)
  await sleep(820)
}

const SETTINGS = {
  reducedMotion: false,
  highContrast: false,
  textSize: 'standard',
  showTrustNumbers: false,
  ambientSound: false,
}

function seededSave({ alarm = 0, completedSites = [], completedActions = [], evidence = [], events = [], settings = SETTINGS } = {}) {
  return {
    schemaVersion: 2,
    caseId: 'case-77',
    phase: 'investigation',
    runNumber: 1,
    primaryApproach: 'procedure',
    completedSites,
    completedActions,
    evidence,
    methodTags: [],
    trust: { registrar: 0, shepherd: 0, defector: 0, archivist: 0 },
    alarm,
    tribunalOverride: false,
    selectedFragments: [],
    reconstruction: null,
    decision: null,
    depositionRecord: null,
    events,
    previousRuns: [],
    precedents: {},
    settings,
    announcement: 'HUD collapse evidence seed.',
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 1. Layout collapse + the always-on set
// ════════════════════════════════════════════════════════════════════════════

async function layoutPass(width, height) {
  const tag = `${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()
  await freeze()

  const layout = await evaluate(`(() => {
    const main = document.querySelector('.case-layout')
    const rails = [...document.querySelectorAll('.case-rail')]
    const h1 = document.getElementById('field-heading')
    const h1Rect = h1 ? h1.getBoundingClientRect() : null
    return {
      caseLayoutColumns: main ? getComputedStyle(main).gridTemplateColumns : null,
      caseLayoutWidth: main ? Math.round(main.getBoundingClientRect().width) : null,
      railsInShell: rails.filter((r) => !r.closest('.casefile-portal')).length,
      railMobileToggles: document.querySelectorAll('.rail-mobile-toggle').length,
      breadcrumbs: document.querySelectorAll('.field-route').length,
      commandCopy: document.querySelectorAll('.field-command-copy').length,
      filedModelInDock: document.querySelectorAll('.field-dock .filed-model').length,
      h1Present: !!h1,
      h1Class: h1 ? h1.className : null,
      h1Box: h1Rect ? { w: Math.round(h1Rect.width), h: Math.round(h1Rect.height) } : null,
      threshold: document.querySelectorAll('.field-threshold').length,
      objectives: document.querySelectorAll('.field-objectives').length,
      alarmChips: document.querySelectorAll('.field-alarm').length,
      worldCaption: document.querySelector('.world-caption')?.textContent?.trim().slice(0, 60) ?? null,
      ctaDock: document.querySelectorAll('.field-dock').length,
      summons: [...document.querySelectorAll('.casefile-summon')].map((b) => b.textContent.replace(/\\s+/g, ' ').trim()),
      plate: (() => { const r = document.querySelector('.world-view')?.getBoundingClientRect(); return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null })(),
      pageScrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }
  })()`)
  report.measurements[`layout:${tag}`] = layout

  record(`${tag} · case-layout is a single scene-dominant column`, /^[\d.]+px$/.test(layout.caseLayoutColumns ?? ''), {
    columns: layout.caseLayoutColumns,
    width: layout.caseLayoutWidth,
  })
  record(`${tag} · no rail column in the shell`, layout.railsInShell === 0, {
    railsInShell: layout.railsInShell,
  })
  record(`${tag} · the rail mobile toggle is retired`, layout.railMobileToggles === 0, {
    toggles: layout.railMobileToggles,
  })
  record(`${tag} · Field→Memory→Tribunal breadcrumb DROPPED`, layout.breadcrumbs === 0, {
    breadcrumbs: layout.breadcrumbs,
  })
  record(`${tag} · page-label copy DROPPED from view`, layout.commandCopy === 0, {
    commandCopy: layout.commandCopy,
  })
  record(`${tag} · filed-model block no longer in the dock`, layout.filedModelInDock === 0, {
    inDock: layout.filedModelInDock,
  })
  record(
    `${tag} · <h1 id="field-heading"> survives as sr-only`,
    layout.h1Present && (layout.h1Class ?? '').includes('sr-only') && (layout.h1Box?.w ?? 99) <= 2,
    { class: layout.h1Class, box: layout.h1Box },
  )
  record(`${tag} · site label KEPT (world caption)`, Boolean(layout.worldCaption), {
    caption: layout.worldCaption,
  })
  record(`${tag} · objectives counter KEPT`, layout.objectives === 1, { objectives: layout.objectives })
  record(`${tag} · threshold line KEPT before the first filing`, layout.threshold === 1, {
    threshold: layout.threshold,
  })
  record(`${tag} · alarm chip absent while alarm is 0`, layout.alarmChips === 0, {
    chips: layout.alarmChips,
  })
  record(`${tag} · fieldCta dock KEPT`, layout.ctaDock === 1, { docks: layout.ctaDock })
  record(
    `${tag} · exactly one "Case file" summon, carrying its live counts`,
    layout.summons.length === 1 && /\d+ evidence · \d+ events/.test(layout.summons[0] ?? ''),
    { summons: layout.summons },
  )
  // Only asserted on the desktop layout: the narrow layout has always stacked
  // plate → inspector → dock into a scrolling document, and still does.
  if (width >= 900) {
    record(`${tag} · the collapsed page fits without a scrollbar`, !layout.pageScrolls, {
      scrollHeight: layout.scrollHeight,
      innerHeight: layout.innerHeight,
    })
  } else {
    record(`${tag} · narrow layout scrolls as a document (recorded, not a gate)`, true, {
      scrollHeight: layout.scrollHeight,
      innerHeight: layout.innerHeight,
    })
  }

  await shot('01-concourse-collapsed')
  await unfreeze()
  return layout
}

// ════════════════════════════════════════════════════════════════════════════
// 2. The case-file drawer: geometry, tabs, roster dossier
// ════════════════════════════════════════════════════════════════════════════

async function drawerPass(width, height) {
  const tag = `${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()
  await click('.casefile-summon')
  const opened = await waitFor(`!!document.querySelector('.casefile-drawer')`)
  record(`${tag} · the "Case file" summon opens the drawer`, opened, {})
  if (!opened) return
  await sleep(400)
  await freeze()

  const geometry = await evaluate(`(() => {
    const drawer = document.querySelector('.casefile-drawer')
    const portal = document.querySelector('.casefile-portal')
    const r = drawer.getBoundingClientRect()
    const cs = getComputedStyle(drawer)
    return {
      role: drawer.getAttribute('role'),
      ariaModal: drawer.getAttribute('aria-modal'),
      labelledBy: drawer.getAttribute('aria-labelledby'),
      headingText: document.getElementById('casefile-heading')?.textContent ?? null,
      box: { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), right: Math.round(r.right) },
      viewportWidth: window.innerWidth,
      dockedRight: Math.abs(r.right - window.innerWidth) < 1.5,
      fullSheet: Math.abs(r.width - window.innerWidth) < 1.5,
      opacity: cs.opacity,
      transform: cs.transform,
      animationName: cs.animationName,
      animationFillMode: cs.animationFillMode,
      portalBackground: portal ? getComputedStyle(portal).backgroundColor : null,
      tabs: [...document.querySelectorAll('.rail-tabs button')].map((b) => ({
        text: b.textContent.trim(),
        pressed: b.getAttribute('aria-pressed'),
        controls: b.getAttribute('aria-controls'),
        id: b.id,
        h: Math.round(b.getBoundingClientRect().height),
      })),
    }
  })()`)
  report.measurements[`drawer:${tag}`] = geometry

  record(`${tag} · drawer is role=dialog + aria-modal, labelled by its own heading`,
    geometry.role === 'dialog' && geometry.ariaModal === 'true' &&
      geometry.labelledBy === 'casefile-heading' && geometry.headingText === 'Case file',
    geometry)
  if (width >= 900) {
    record(`${tag} · right-docked drawer (not a full sheet) at ≥900px`,
      geometry.dockedRight && !geometry.fullSheet, geometry.box)
  } else if (width < 700) {
    record(`${tag} · full-height sheet below 700px`, geometry.fullSheet, geometry.box)
  }
  // The resting style is the visible one: no opacity ramp anywhere in the reveal.
  record(`${tag} · drawer rests visible (no opacity+fill:both reveal)`,
    geometry.opacity === '1', { opacity: geometry.opacity, animationName: geometry.animationName,
      fill: geometry.animationFillMode })
  // RE-BASELINED 4 → 5 at Wave 2 round 1 (the searchable record, E5), then
  // 5 → 6 at Wave 2 round 2 (the ledger, E3) — both times because the world
  // legitimately changed. Nothing has ever been relaxed here: every earlier
  // clause is kept verbatim and each new tab adds its OWN clause, so the count
  // stays pinned to a named set of tabs and never degrades to "at least N".
  record(`${tag} · six tabs, aria-wired`,
    geometry.tabs.length === 6 &&
      geometry.tabs.every((t) => t.controls && t.id && t.pressed !== null) &&
      geometry.tabs.some((t) => /people/i.test(t.text)) &&
      geometry.tabs.some((t) => /search/i.test(t.text)) &&
      geometry.tabs.some((t) => /ledger/i.test(t.text)),
    { tabs: geometry.tabs })
  record(`${tag} · every tab meets the 44px target`, geometry.tabs.every((t) => t.h >= 44), {
    heights: geometry.tabs.map((t) => t.h),
  })

  await unfreeze()
  await shot('02-casefile-case-tab')

  // Each tab shows its own panel and only its own panel.
  for (const tab of ['ledger', 'evidence', 'log', 'people', 'search']) {
    await click(`#rail-tab-${tab}`)
    await sleep(240)
    const panels = await evaluate(`(() => ({
      panels: [...document.querySelectorAll('.rail-panel')].map((p) => p.id),
      pressed: [...document.querySelectorAll('.rail-tabs button')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.id),
    }))()`)
    record(`${tag} · tab "${tab}" shows exactly its own panel`,
      panels.panels.length === 1 && panels.panels[0] === `rail-panel-${tab}` &&
        panels.pressed.length === 1 && panels.pressed[0] === `rail-tab-${tab}`,
      panels)
    await shot(`03-casefile-${tab}-tab`)
  }

  // The roster dossier itself.
  await click('#rail-tab-people')
  await sleep(240)
  const dossier = await evaluate(`(() => {
    const panel = document.querySelector('#rail-panel-people')
    if (!panel) return null
    const cards = [...panel.querySelectorAll('.persona-dossier-card')]
    return {
      heading: panel.querySelector('h2')?.textContent ?? null,
      cards: cards.length,
      names: cards.map((c) => c.querySelector('h3')?.textContent ?? null),
      roles: cards.map((c) => c.querySelector('.persona-dossier-role')?.textContent ?? null),
      principles: cards.map((c) => c.querySelector('.persona-dossier-principle')?.textContent ?? null),
      stances: cards.map((c) => c.querySelector('.persona-dossier-stance')?.textContent ?? null),
      sheetPortraits: panel.querySelectorAll('.persona-portrait--sheet').length,
      exposedAlts: [...panel.querySelectorAll('.persona-portrait--sheet img')].map((i) => i.getAttribute('alt')),
      empties: [...panel.querySelectorAll('.persona-dossier-empty')].map((p) => p.textContent),
      lineBlocks: panel.querySelectorAll('.persona-dossier-lines').length,
      animatedNodes: [...panel.querySelectorAll('*')].filter((el) => {
        const cs = getComputedStyle(el)
        return cs.animationName !== 'none'
      }).length,
      portraitWidth: (() => { const el = panel.querySelector('.persona-portrait--sheet'); return el ? Math.round(el.getBoundingClientRect().width) : null })(),
    }
  })()`)
  report.measurements[`dossier:${tag}`] = dossier
  record(`${tag} · dossier heading is the diegetic line`, dossier?.heading === 'The people on this case', {
    heading: dossier?.heading,
  })
  record(`${tag} · one card per presence, with role, principle and stance`,
    dossier?.cards === 4 && dossier.roles.every(Boolean) && dossier.principles.every(Boolean) &&
      dossier.stances.every(Boolean),
    { cards: dossier?.cards, names: dossier?.names, stances: dossier?.stances })
  record(`${tag} · sheet portraits ~120px, and this is the one surface exposing their authored alt`,
    dossier?.sheetPortraits === 4 && dossier.exposedAlts.every((a) => a && a.length > 0) &&
      Math.abs((dossier.portraitWidth ?? 0) - 120) <= 1,
    { width: dossier?.portraitWidth, alts: dossier?.exposedAlts })
  record(`${tag} · empty record reads exactly "Nothing said on the record yet."`,
    dossier?.empties.length === 4 && dossier.empties.every((t) => t === 'Nothing said on the record yet.'),
    { empties: dossier?.empties })
  record(`${tag} · the dossier animates nothing (summoned = already happened)`,
    dossier?.animatedNodes === 0, { animatedNodes: dossier?.animatedNodes })
  await nameCounts('#rail-panel-people', `people-panel-${tag}`)
  await shot('04-casefile-people-empty')
}

// ════════════════════════════════════════════════════════════════════════════
// 3. Mutual exclusivity, live
// ════════════════════════════════════════════════════════════════════════════

async function exclusivityPass() {
  await setViewport(1280, 800)
  await bootFreshRun()
  await enterSite('Care ward')

  const atRest = await modalCount()
  record('exclusivity · no dialog at rest', atRest.count === 0, atRest)

  await click('.scene-detail-summon')
  await waitFor(`!!document.querySelector('.scene-detail-drawer')`)
  await sleep(260)
  const afterDetail = await modalCount()
  record('exclusivity · location detail open → exactly one aria-modal',
    afterDetail.count === 1 && afterDetail.classes[0].includes('scene-detail-drawer'), afterDetail)
  await shot('05-detail-drawer-open')

  await pressEscape()
  await sleep(260)
  await click('.casefile-summon')
  await waitFor(`!!document.querySelector('.casefile-drawer')`)
  await sleep(260)
  const afterCase = await modalCount()
  record('exclusivity · case file open → exactly one aria-modal',
    afterCase.count === 1 && afterCase.classes[0].includes('casefile-drawer'), afterCase)
  await shot('06-casefile-over-plate')

  // The hard case: force both open in one turn by clicking the plate's detail
  // summon while the case file is up (it is behind the scrim, so drive it in
  // page — this is the state the code guard exists for).
  const forced = await evaluate(`(() => {
    const summon = document.querySelector('.scene-detail-summon')
    if (!summon) return { ok: false, reason: 'no detail summon' }
    summon.click()
    return { ok: true }
  })()`)
  await sleep(320)
  const afterForce = await modalCount()
  record('exclusivity · summoning the other drawer while one is open still leaves exactly one',
    afterForce.count === 1, { forced, ...afterForce })

  await pressEscape()
  await sleep(260)
  const afterClose = await modalCount()
  record('exclusivity · Escape leaves no dialog behind', afterClose.count === 0, afterClose)
}

// ════════════════════════════════════════════════════════════════════════════
// 4. Keyboard-only transcripts through BOTH summons
// ════════════════════════════════════════════════════════════════════════════

async function keyboardPass(width, height, summonSelector, label) {
  const tag = `${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()
  await enterSite('Care ward')

  const transcript = []
  const step = async (name) => {
    const info = await activeInfo()
    transcript.push({ step: name, ...info })
    return info
  }

  // Focus the summon itself with a real click, then drive by keyboard only.
  await evaluate(`(() => { document.querySelector(${JSON.stringify(summonSelector)})?.focus(); return true })()`)
  const onSummon = await step('focus the summon')
  await pressEnter()
  await waitFor(`!!document.querySelector('[aria-modal="true"]')`)
  await sleep(420)
  const inside = await step('Enter opens the dialog')

  const insideDialog = await evaluate(`(() => {
    const dialog = document.querySelector('[aria-modal="true"]')
    return !!dialog && dialog.contains(document.activeElement)
  })()`)
  record(`${label} ${tag} · focus lands inside the dialog`, insideDialog, { active: inside })

  // Tab all the way round and prove focus never leaves the dialog and never
  // reaches <body>.
  const focusableCount = await evaluate(`(() => {
    const dialog = document.querySelector('[aria-modal="true"]')
    return dialog ? dialog.querySelectorAll('a[href], button:not([disabled]), summary, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])').length : 0
  })()`)
  const cycle = Math.min(focusableCount + 2, 26)
  let escaped = 0
  let toBody = 0
  for (let i = 0; i < cycle; i += 1) {
    await pressTab()
    const info = await evaluate(`(() => {
      const dialog = document.querySelector('[aria-modal="true"]')
      const el = document.activeElement
      const isBody = !el || el === document.body
      return {
        isBody,
        inside: !!dialog && !isBody && dialog.contains(el),
        tag: isBody ? 'BODY' : el.tagName,
        label: isBody ? '' : (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 52),
      }
    })()`)
    if (info.isBody) toBody += 1
    else if (!info.inside) escaped += 1
    transcript.push({ step: `Tab ×${i + 1}`, ...info })
  }
  record(`${label} ${tag} · Tab cycles inside without escaping`, escaped === 0 && toBody === 0, {
    cycle,
    focusableCount,
    escaped,
    toBody,
  })

  // Shift+Tab wraps backwards inside too.
  let backEscaped = 0
  for (let i = 0; i < 3; i += 1) {
    await pressTab(true)
    const info = await evaluate(`(() => {
      const dialog = document.querySelector('[aria-modal="true"]')
      const el = document.activeElement
      const isBody = !el || el === document.body
      return { isBody, inside: !!dialog && !isBody && dialog.contains(el) }
    })()`)
    if (info.isBody || !info.inside) backEscaped += 1
    transcript.push({ step: `Shift+Tab ×${i + 1}`, ...info })
  }
  record(`${label} ${tag} · Shift+Tab cycles inside too`, backEscaped === 0, { backEscaped })

  await pressEscape()
  await sleep(420)
  const returned = await step('Escape closes; focus returns')
  const returnedOk = await evaluate(`(() => {
    const el = document.activeElement
    if (!el || el === document.body) return { ok: false, why: 'BODY' }
    return { ok: el.matches(${JSON.stringify(summonSelector)}), cls: String(el.className).slice(0, 56) }
  })()`)
  record(`${label} ${tag} · Escape returns focus to the summoning button, never <body>`,
    returnedOk.ok === true, { returned, returnedOk })
  const noModal = await modalCount()
  record(`${label} ${tag} · Escape closed the dialog`, noModal.count === 0, noModal)

  report.transcripts[`${label}-${tag}`] = transcript
  console.log(`\n── keyboard transcript · ${label} · ${tag} ──`)
  for (const line of transcript) {
    console.log(`  ${String(line.step).padEnd(28)} → ${line.tag}${line.label ? ` "${line.label}"` : ''}`)
  }
  console.log('')
}

// ════════════════════════════════════════════════════════════════════════════
// 5. Cross-zone sweep — every positioned control pair
// ════════════════════════════════════════════════════════════════════════════

async function crossZonePass(width, height) {
  const tag = `${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()
  await enterSite('Care ward')
  await freeze()

  // (a) The plate chrome: three positioned controls. Click each one's visual
  //     centre through elementFromPoint and assert the INTENDED control is what
  //     sits there — the rooms round's latent-bug class.
  const plateSweep = await evaluate(`(() => {
    const targets = ['.world-return', '.casefile-summon', '.scene-detail-summon']
    const out = []
    for (const sel of targets) {
      const el = document.querySelector(sel)
      if (!el) { out.push({ sel, present: false }); continue }
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const hit = document.elementFromPoint(cx, cy)
      out.push({
        sel,
        present: true,
        box: { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right) },
        hitsIntended: !!hit && (hit === el || el.contains(hit)),
        hitClass: hit ? String(hit.className).slice(0, 60) : null,
      })
    }
    // Do any two of them overlap?
    const boxes = out.filter((o) => o.present).map((o) => ({ sel: o.sel, ...o.box }))
    const overlaps = []
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i], b = boxes[j]
        const ax2 = a.left + a.w, ay2 = a.top + a.h
        const bx2 = b.left + b.w, by2 = b.top + b.h
        if (a.left < bx2 && b.left < ax2 && a.top < by2 && b.top < ay2) overlaps.push([a.sel, b.sel])
      }
    }
    return { controls: out, overlaps, tapTargetsOk: out.filter((o) => o.present).every((o) => o.box.h >= 40) }
  })()`)
  report.measurements[`plateSweep:${tag}`] = plateSweep
  record(`${tag} · plate chrome: each control's visual centre activates THAT control`,
    plateSweep.controls.filter((c) => c.present).every((c) => c.hitsIntended) &&
      plateSweep.controls.filter((c) => c.present).length >= 2,
    plateSweep.controls)
  record(`${tag} · no two plate-chrome controls overlap`, plateSweep.overlaps.length === 0, {
    overlaps: plateSweep.overlaps,
  })

  // Drive each one for real and assert the intended surface opened.
  await unfreeze()
  await click('.casefile-summon')
  await sleep(360)
  const caseOpened = await evaluate(`!!document.querySelector('.casefile-drawer') && !document.querySelector('.scene-detail-drawer')`)
  record(`${tag} · clicking "Case file" opens the case file and nothing else`, caseOpened, {})
  await pressEscape()
  await sleep(300)
  await click('.scene-detail-summon')
  await sleep(360)
  const detailOpened = await evaluate(`!!document.querySelector('.scene-detail-drawer') && !document.querySelector('.casefile-drawer')`)
  record(`${tag} · clicking "Location detail" opens the location detail and nothing else`, detailOpened, {})
  await pressEscape()
  await sleep(300)

  // (b) The drawer's six-tab bar: same sweep, plus at most one panel open.
  await click('.casefile-summon')
  await waitFor(`!!document.querySelector('.casefile-drawer')`)
  await sleep(320)
  await freeze()
  const tabSweep = await evaluate(`(() => {
    const tabs = [...document.querySelectorAll('.rail-tabs button')]
    return tabs.map((t) => {
      const r = t.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return { id: t.id, hitsIntended: !!hit && (hit === t || t.contains(hit)), hitId: hit?.id ?? null,
        box: { w: Math.round(r.width), h: Math.round(r.height) } }
    })
  })()`)
  report.measurements[`tabSweep:${tag}`] = tabSweep
  // RE-BASELINED 4 → 5 with the search tab, 5 → 6 with the ledger tab (see the
  // aria-wiring check above). The sweep itself is unchanged: every cell's visual
  // centre must still activate that cell, which is the clause that caught the
  // real 375 bug, and a six-cell bar is a strictly harder version of it.
  record(`${tag} · drawer tab bar: each tab's centre hits that tab`,
    tabSweep.length === 6 && tabSweep.every((t) => t.hitsIntended), tabSweep)
  await unfreeze()

  for (const tab of ['case', 'ledger', 'evidence', 'log', 'people', 'search']) {
    await click(`#rail-tab-${tab}`)
    await sleep(200)
    const state = await evaluate(`(() => ({
      panels: document.querySelectorAll('.rail-panel').length,
      panelId: document.querySelector('.rail-panel')?.id ?? null,
      pressed: [...document.querySelectorAll('.rail-tabs button[aria-pressed="true"]')].map((b) => b.id),
    }))()`)
    record(`${tag} · tab bar sweep: clicking "${tab}" opens only "${tab}"`,
      state.panels === 1 && state.panelId === `rail-panel-${tab}` && state.pressed.length === 1 &&
        state.pressed[0] === `rail-tab-${tab}`,
      state)
  }
  await pressEscape()
  await sleep(280)
}

// ════════════════════════════════════════════════════════════════════════════
// 6. The promoted alarm + the retiring threshold
// ════════════════════════════════════════════════════════════════════════════

async function alarmPass() {
  await setViewport(1280, 800)
  for (const alarm of [0, 1, 3]) {
    await bootFreshRun(seededSave({ alarm }))
    await freeze()
    const chip = await evaluate(`(() => {
      const el = document.querySelector('.field-alarm')
      if (!el) return { present: false }
      const strong = el.querySelector('strong')
      return {
        present: true,
        text: el.textContent.replace(/\\s+/g, ' ').trim(),
        color: getComputedStyle(strong).color,
        classes: strong.className,
        box: (() => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) } })(),
      }
    })()`)
    report.measurements[`alarm:${alarm}`] = chip
    if (alarm === 0) {
      record('alarm 0 · no chip on the chrome (a "quiet" chip would be the noise the collapse removes)',
        chip.present === false, chip)
    } else {
      // The value and its label are two grid rows, so textContent runs them
      // together with no separator — assert the two parts, not the join.
      record(`alarm ${alarm} · chip present, in the coral text-risk convention`,
        chip.present === true && chip.classes.includes('text-risk') &&
          chip.text.startsWith(`${alarm} trace${alarm === 1 ? '' : 's'}`) &&
          chip.text.endsWith('civic alarm') && chip.color.includes('0.66 0.17 30'),
        chip)
    }
    await unfreeze()
    await shot(`07-alarm-${alarm}`)
  }
}

async function thresholdPass() {
  await setViewport(1280, 800)
  await bootFreshRun()
  const before = await evaluate(`document.querySelectorAll('.field-threshold').length`)
  record('threshold · present before the first site is filed', before === 1, { count: before })

  // File one site for real, through the Care ward scene zones.
  await enterSite('Care ward')
  await click('.scene-zone .choice-row')
  await sleep(240)
  await click('.scene-zone .choice-row')
  await waitFor(`document.querySelectorAll('.site-switch[data-filed="true"]').length > 0`, 12000)
  await sleep(900)
  // Let the staged beat run out so the chrome settles.
  for (let i = 0; i < 6; i += 1) {
    if (await evaluate(`!!document.querySelector('.scene-result-dismiss')`)) break
    await click('.scene-beat-advance')
    await sleep(700)
  }
  if (await evaluate(`!!document.querySelector('.scene-result-dismiss')`)) {
    await click('.scene-result-dismiss')
    await sleep(500)
  }
  const after = await evaluate(`(() => ({
    threshold: document.querySelectorAll('.field-threshold').length,
    objectives: document.querySelector('.field-objectives')?.textContent.replace(/\\s+/g, ' ').trim() ?? null,
    summon: document.querySelector('.casefile-summon')?.textContent.replace(/\\s+/g, ' ').trim() ?? null,
    filed: document.querySelectorAll('.site-switch[data-filed="true"]').length,
  }))()`)
  report.measurements.thresholdAfterFiling = after
  record('threshold · retires after the first site is filed; objectives carry the fact',
    after.filed >= 1 && after.threshold === 0 && /1 \/ 2/.test(after.objectives ?? ''), after)
  record('summon counts update live after a filing',
    /1 evidence · \d+ events/.test(after.summon ?? ''), { summon: after.summon })
  await shot('08-after-first-filing')

  // And the dossier now carries a line, cited.
  await click('.casefile-summon')
  await waitFor(`!!document.querySelector('.casefile-drawer')`)
  await click('#rail-tab-people')
  await sleep(320)
  const said = await evaluate(`(() => {
    const cards = [...document.querySelectorAll('.persona-dossier-card')]
    return cards.map((c) => ({
      name: c.querySelector('h3')?.textContent ?? null,
      lines: [...c.querySelectorAll('.persona-dossier-lines li')].map((li) => ({
        line: li.querySelector('.persona-dossier-line')?.textContent?.slice(0, 70) ?? null,
        cite: li.querySelector('.persona-dossier-cite')?.textContent ?? null,
        citeFont: getComputedStyle(li.querySelector('.persona-dossier-cite')).fontFamily,
        citeColor: getComputedStyle(li.querySelector('.persona-dossier-cite')).color,
      })),
      empty: c.querySelector('.persona-dossier-empty')?.textContent ?? null,
    }))
  })()`)
  report.measurements.dossierAfterFiling = said
  const withLines = said.filter((c) => c.lines.length > 0)
  record('dossier · a filed method puts a cited line on the speaking persona’s record',
    withLines.length >= 1 && withLines.every((c) => c.lines.every((l) => l.cite && l.line)),
    { withLines: withLines.map((c) => ({ name: c.name, cites: c.lines.map((l) => l.cite) })) })
  record('dossier · citations render mono in --fog-dim',
    withLines.every((c) => c.lines.every((l) => /mono|Consolas|SFMono/i.test(l.citeFont))),
    { fonts: withLines.flatMap((c) => c.lines.map((l) => l.citeFont)) })
  await nameCounts('#rail-panel-people', 'people-panel-after-filing')
  await shot('09-casefile-people-with-lines')
  await pressEscape()
  await sleep(240)
}

// ════════════════════════════════════════════════════════════════════════════
// 7. Preference modes
// ════════════════════════════════════════════════════════════════════════════

async function preferencePass() {
  await setViewport(1280, 800)

  // Reduced motion (both signals: OS media + the in-game setting).
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  await bootFreshRun(seededSave({ settings: { ...SETTINGS, reducedMotion: true } }))
  await click('.casefile-summon')
  await waitFor(`!!document.querySelector('.casefile-drawer')`)
  await sleep(360)
  const reduced = await evaluate(`(() => {
    const drawer = document.querySelector('.casefile-drawer')
    const cs = getComputedStyle(drawer)
    const portal = document.querySelector('.casefile-portal')
    return {
      portalClass: portal ? portal.className : null,
      animationName: cs.animationName,
      transition: cs.transition,
      opacity: cs.opacity,
      transform: cs.transform,
      visibleText: (drawer.textContent || '').replace(/\\s+/g, ' ').trim().length,
      osReduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    }
  })()`)
  report.measurements.reducedMotion = reduced
  record('reduced motion · drawer has no animation and no transition, and is fully legible',
    reduced.animationName === 'none' && /none/.test(reduced.transition) &&
      reduced.opacity === '1' && reduced.visibleText > 80,
    reduced)
  record('reduced motion · portal repeats the preference class at the boundary',
    (reduced.portalClass ?? '').includes('reduce-motion'), { portalClass: reduced.portalClass })
  await click('#rail-tab-people')
  await sleep(260)
  await shot('10-reduced-motion-people')
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
  })

  // High contrast (in-game setting).
  await bootFreshRun(seededSave({ alarm: 2, settings: { ...SETTINGS, highContrast: true } }))
  await click('.casefile-summon')
  await waitFor(`!!document.querySelector('.casefile-drawer')`)
  await sleep(360)
  await freeze()
  const contrast = await evaluate(`(() => {
    const portal = document.querySelector('.casefile-portal')
    const summonHost = document.querySelector('.casefile-summon')
    return {
      portalClass: portal ? portal.className : null,
      drawerBg: getComputedStyle(document.querySelector('.casefile-drawer')).backgroundColor,
      summonBg: summonHost ? getComputedStyle(summonHost).backgroundColor : null,
      summonFilter: summonHost ? getComputedStyle(summonHost).backdropFilter : null,
      portraitFilter: (() => { const img = document.querySelector('.persona-portrait img'); return img ? getComputedStyle(img).filter : null })(),
    }
  })()`)
  report.measurements.highContrast = contrast
  record('high contrast · portal repeats the class and the summon drops its blur',
    (contrast.portalClass ?? '').includes('high-contrast') && contrast.summonFilter === 'none',
    contrast)
  await unfreeze()
  await click('#rail-tab-people')
  await sleep(260)
  await shot('11-high-contrast-people')

  // Forced colours.
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] })
  await bootFreshRun(seededSave({ alarm: 2 }))
  await click('.casefile-summon')
  await waitFor(`!!document.querySelector('.casefile-drawer')`)
  await click('#rail-tab-people')
  await sleep(400)
  await freeze()
  const forced = await evaluate(`(() => {
    const img = document.querySelector('.persona-portrait--sheet img')
    const mark = document.querySelector('.persona-portrait--sheet .persona-portrait-mark')
    return {
      active: matchMedia('(forced-colors: active)').matches,
      plateOpacity: img ? getComputedStyle(img).opacity : null,
      markOpacity: mark ? getComputedStyle(mark).opacity : null,
      altStillPresent: img ? img.getAttribute('alt') : null,
      drawerBg: getComputedStyle(document.querySelector('.casefile-drawer')).backgroundColor,
      summonBg: getComputedStyle(document.querySelector('.casefile-summon') || document.body).backgroundColor,
      dossierText: (document.querySelector('#rail-panel-people')?.textContent || '').replace(/\\s+/g, ' ').trim().length,
    }
  })()`)
  report.measurements.forcedColors = forced
  record('forced colours · the plate stands down and the currentColor sigil takes over',
    forced.active === true && forced.plateOpacity === '0' && forced.markOpacity === '1',
    forced)
  record('forced colours · the sheet portrait keeps its authored alt in the tree',
    Boolean(forced.altStillPresent) && forced.dossierText > 80, {
      alt: forced.altStillPresent, textLength: forced.dossierText,
    })
  await unfreeze()
  await shot('12-forced-colors-people')
  await send('Emulation.setEmulatedMedia', { features: [] })
}

// ════════════════════════════════════════════════════════════════════════════
// 8. Console proportions + the 375 zone-anchor crop
// ════════════════════════════════════════════════════════════════════════════

async function consolePass() {
  await setViewport(1280, 800)
  await bootFreshRun()
  const out = {}
  for (const site of ['Registry intake', 'Maintenance spine', 'The Small Archive']) {
    await enterSite(site)
    await waitFor(`!!document.querySelector('.room-console')`, 9000)
    await sleep(700)
    await freeze()
    const measure = await evaluate(`(() => {
      const plateEl = document.querySelector('.world-view')
      const consoleEl = document.querySelector('.room-console')
      if (!plateEl || !consoleEl) return null
      const p = plateEl.getBoundingClientRect()
      const c = consoleEl.getBoundingClientRect()
      return {
        plate: { w: Math.round(p.width), h: Math.round(p.height) },
        console: { w: Math.round(c.width), h: Math.round(c.height) },
        sceneAbovePx: Math.round(c.top - p.top),
        maxHeight: getComputedStyle(consoleEl).maxHeight,
        naturalHeight: consoleEl.scrollHeight,
        scrolls: consoleEl.scrollHeight > consoleEl.clientHeight + 1,
      }
    })()`)
    await unfreeze()
    out[site] = measure
    record(`console proportions · ${site}`, Boolean(measure), measure)
    await shot(`13-room-console-${site.replace(/\W+/g, '-').toLowerCase()}`)
  }
  report.measurements.consoleProportions = out
  const allFit = Object.values(out).every((m) => m && !m.scrolls)
  record('console proportions · every docked tableau still fits without scrolling', allFit, {
    scrolls: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v?.scrolls])),
  })
  return out
}

async function narrowPass() {
  await setViewport(375, 812)
  await bootFreshRun()
  await enterSite('Care ward')
  await freeze()
  const anchors = await evaluate(`(() => {
    const plateEl = document.querySelector('.world-view')
    const p = plateEl.getBoundingClientRect()
    const zones = [...document.querySelectorAll('.scene-zone')].map((z) => {
      const ring = z.querySelector('.scene-zone-ring')
      const r = ring.getBoundingClientRect()
      const btn = z.querySelector('.choice-row').getBoundingClientRect()
      return {
        label: (z.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 30),
        ring: { left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) },
        overflowLeftPx: Math.round(p.left - r.left),
        overflowRightPx: Math.round(r.right - p.right),
        buttonInside: btn.left >= p.left - 0.5 && btn.right <= p.right + 0.5,
        tapTarget: { w: Math.round(btn.width), h: Math.round(btn.height) },
      }
    })
    return {
      plate: { w: Math.round(p.width), h: Math.round(p.height), left: Math.round(p.left), right: Math.round(p.right) },
      viewportWidth: window.innerWidth,
      fullBleed: Math.abs(p.width - window.innerWidth) < 1.5,
      zones,
    }
  })()`)
  report.measurements.narrowAnchors = anchors
  record('375 · the plate is full-bleed', anchors.fullBleed, anchors.plate)
  record('375 · every authored zone anchor sits fully on-plate (the pilot’s crop closed)',
    anchors.zones.every((z) => z.overflowLeftPx <= 0 && z.overflowRightPx <= 0),
    anchors.zones.map((z) => ({ label: z.label, l: z.overflowLeftPx, r: z.overflowRightPx })))
  record('375 · zone tap targets still ≥44px',
    anchors.zones.every((z) => z.ring.w >= 44 && z.ring.h >= 44), anchors.zones.map((z) => z.ring))
  await unfreeze()
  await shot('14-narrow-care-ward')

  // The 1.026 action-focus camera moves the OTHER ring outward. Measure the
  // crop in the emphasised state too, not only at rest — a resting-state-only
  // check is exactly how the pilot's crop survived its own pass.
  const emphasised = []
  for (let index = 0; index < 2; index += 1) {
    await evaluate(`(() => {
      const zones = [...document.querySelectorAll('.scene-zone .choice-row')]
      zones[${index}]?.focus()
      return true
    })()`)
    await sleep(520)
    await freeze()
    emphasised.push(
      await evaluate(`(() => {
        const p = document.querySelector('.world-view').getBoundingClientRect()
        return {
          focused: (document.activeElement?.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 26),
          rings: [...document.querySelectorAll('.scene-zone-ring')].map((el) => {
            const r = el.getBoundingClientRect()
            return { overflowLeftPx: Math.round(p.left - r.left), overflowRightPx: Math.round(r.right - p.right) }
          }),
        }
      })()`),
    )
    await unfreeze()
    await shot(`14b-narrow-emphasis-${index}`)
  }
  report.measurements.narrowAnchorsEmphasised = emphasised
  record('375 · anchors stay on-plate under the 1.026 action-focus camera too',
    emphasised.every((e) => e.rings.every((r) => r.overflowLeftPx <= 0 && r.overflowRightPx <= 0)),
    emphasised)
  await evaluate(`(() => { document.activeElement?.blur?.(); return true })()`)
  await sleep(400)

  await click('.casefile-summon')
  await waitFor(`!!document.querySelector('.casefile-drawer')`)
  await sleep(360)
  await freeze()
  const sheet = await evaluate(`(() => {
    const d = document.querySelector('.casefile-drawer').getBoundingClientRect()
    return { w: Math.round(d.width), h: Math.round(d.height), vw: window.innerWidth, vh: window.innerHeight }
  })()`)
  record('375 · the case file becomes a full-height sheet',
    Math.abs(sheet.w - sheet.vw) < 1.5 && Math.abs(sheet.h - sheet.vh) < 1.5, sheet)
  await unfreeze()
  await shot('15-narrow-casefile-sheet')
  await click('#rail-tab-people')
  await sleep(300)
  await shot('16-narrow-casefile-people')
  await pressEscape()
  await sleep(240)
}


// ════════════════════════════════════════════════════════════════════════════
// 9. The shell summon on every non-investigation surface
// ════════════════════════════════════════════════════════════════════════════
// The investigation puts the summon on the plate; every other case surface gets
// it docked in the shell as fixed chrome. Fixed chrome over a scrolling document
// is exactly the "control you can see but not reach" hazard the cross-zone rule
// names — so sweep every interactive element on each surface, at three scroll
// positions, and assert none of them is occluded by the summon.

const PHASE_SEEDS = {
  briefing: { phase: 'briefing' },
  reconstruction: {
    phase: 'reconstruction',
    completedSites: ['care-ward'],
    completedActions: ['listen-mara'],
    evidence: ['sensory-echo'],
  },
  tribunal: {
    phase: 'tribunal',
    completedSites: ['care-ward', 'registry'],
    completedActions: ['listen-mara', 'authenticate-chain'],
    evidence: ['sensory-echo', 'custody-chain', 'relational-proof'],
    reconstruction: 'relational-continuity',
  },
  debrief: {
    phase: 'debrief',
    completedSites: ['care-ward', 'registry'],
    completedActions: ['listen-mara', 'authenticate-chain'],
    evidence: ['sensory-echo', 'custody-chain', 'relational-proof'],
    reconstruction: 'relational-continuity',
    decision: 'certify-continuity',
  },
}

async function shellSummonPass() {
  await setViewport(1280, 800)
  const results = {}
  for (const [phase, extra] of Object.entries(PHASE_SEEDS)) {
    const seed = { ...seededSave(), ...extra }
    bootCounter += 1
    await send('Page.navigate', { url: APP_URL })
    await waitFor(`document.readyState === 'complete'`)
    await evaluate(`(() => {
      try {
        window.localStorage.clear()
        window.localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify('__SEED__')})
        window.localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, ${JSON.stringify(JSON.stringify(SETTINGS))})
      } catch { /* ignore */ }
      window.__annexStale = true
      return true
    })()`.replace(JSON.stringify('__SEED__'), JSON.stringify(JSON.stringify(seed))))
    await send('Page.navigate', {
      url: `${APP_URL}${APP_URL.includes('?') ? '&' : '?'}boot=${bootCounter}`,
    })
    await waitFor(`window.__annexStale === undefined && document.readyState === 'complete'`)
    if (!(await waitForText('button', 'Continue'))) {
      record(`shell summon · ${phase} — seed did not load`, false, {})
      continue
    }
    await click('button', 'Continue')
    const arrived = await waitFor(`!!document.querySelector('.casefile-summon--shell')`, 9000)
    if (!arrived) {
      record(`shell summon · ${phase} — no shell summon on this surface`, false, {})
      continue
    }
    await sleep(500)
    await freeze()
    const sweep = await evaluate(`(() => {
      const summon = document.querySelector('.casefile-summon--shell')
      const out = []
      const positions = [0, Math.round(document.documentElement.scrollHeight / 2), document.documentElement.scrollHeight]
      for (const y of positions) {
        window.scrollTo(0, y)
        const occluded = []
        let swept = 0
        for (const el of document.querySelectorAll('button, a[href], summary, input, [tabindex]:not([tabindex="-1"])')) {
          if (el === summon || summon.contains(el)) continue
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          const cy = r.top + r.height / 2
          if (cy < 0 || cy > window.innerHeight) continue
          swept += 1
          const hit = document.elementFromPoint(r.left + r.width / 2, cy)
          if (hit && (hit === summon || summon.contains(hit))) {
            occluded.push((el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40))
          }
        }
        out.push({ scrollY: Math.round(window.scrollY), swept, occluded })
      }
      window.scrollTo(0, 0)
      const r = summon.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return {
        positions: out,
        summonBox: { w: Math.round(r.width), h: Math.round(r.height) },
        summonHitsItself: !!hit && (hit === summon || summon.contains(hit)),
        summonText: (summon.textContent || '').replace(/\\s+/g, ' ').trim(),
      }
    })()`)
    await unfreeze()
    results[phase] = sweep
    record(`shell summon · ${phase}: present, reachable, and occludes no control at any scroll`,
      sweep.summonHitsItself && sweep.summonBox.h >= 44 &&
        sweep.positions.every((p) => p.occluded.length === 0) &&
        sweep.positions.some((p) => p.swept > 0),
      sweep)
    await shot(`17-shell-summon-${phase}`)
  }
  report.measurements.shellSummon = results
}

// ── Run ─────────────────────────────────────────────────────────────────────

async function guard(name, fn) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      const message = String(error?.message ?? error)
      if (attempt === 1 && message.startsWith('CDP timeout')) {
        // A wedged renderer is an instrument failure, not a finding. Reset the
        // document and run the pass once more; a second failure is recorded.
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

await guard('layout 1280', () => layoutPass(1280, 800))
await guard('layout 375', () => layoutPass(375, 812))
await guard('drawer 1280', () => drawerPass(1280, 800))
await guard('drawer 375', () => drawerPass(375, 812))
await guard('exclusivity', exclusivityPass)
await guard('keyboard casefile 1280', () => keyboardPass(1280, 800, '.casefile-summon', 'casefile'))
await guard('keyboard detail 1280', () => keyboardPass(1280, 800, '.scene-detail-summon', 'detail'))
await guard('keyboard casefile 375', () => keyboardPass(375, 812, '.casefile-summon', 'casefile'))
await guard('cross-zone 1280', () => crossZonePass(1280, 800))
await guard('cross-zone 375', () => crossZonePass(375, 812))
await guard('alarm', alarmPass)
await guard('threshold', thresholdPass)
await guard('preferences', preferencePass)
await guard('console proportions', consolePass)
await guard('narrow', narrowPass)
await guard('shell summon', shellSummonPass)

const passed = report.checks.filter((c) => c.pass).length
report.summary = { total: report.checks.length, passed, failed: report.checks.length - passed }
writeFileSync(join(OUT_DIR, 'measurements.json'), JSON.stringify(report, null, 2))
console.log(`\n${passed}/${report.checks.length} checks passed · ${report.shots.length} screenshots`)
console.log(`evidence written to ${OUT_DIR}`)

clearTimeout(killTimer)
socket.close()
chromeProcess.kill('SIGTERM')
process.exit(report.summary.failed > 0 ? 1 : 0)

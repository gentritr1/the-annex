// Armed-commit evidence runner — drives the dev app in headless Chrome over
// raw CDP (no new dependencies; Node's built-in WebSocket + fetch), using only
// trusted input (Input.dispatchMouseEvent / Input.dispatchKeyEvent), so every
// arm / disarm / confirm travels the real event pipeline (pointerdown, keydown,
// click), exactly as a user's would.
//
// Proves, on all three commit surfaces (field method, reconstruction filing,
// tribunal finding):
//   (a) armed vs unarmed button text + getComputedStyle differ — measured on
//       the LIVE element, which is what settles the .site-inspector /
//       media-query cascade overrides
//   (b) Escape and outside-click disarm, visibly (styles revert) and silently
//       (live region stays empty)
//   (c) the aria-live region announces arming
//   (d) cold-eyes: from a fresh save, the first filed action is reached with
//       single clicks only, each guided by what the UI itself displays
//
// Measurement note: headless=new does not reliably advance the CSS-transition
// clock between input events, so a computed style can read a frozen transition
// start (e.g. the hover fill, or the disabled→enabled fill on the lattice
// commit) long after wall-clock duration has passed. settleFrames() forces two
// real BeginFrames before every computed-style dump; the probe run in
// evidence/armed-commit-probe.mjs demonstrates the freeze and the settle.
//
// Usage: node evidence/armed-commit.mjs <appUrl> <outDir>
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [appUrl, outDir] = process.argv.slice(2)
if (!appUrl || !outDir) {
  console.error('usage: node evidence/armed-commit.mjs <appUrl> <outDir>')
  process.exit(2)
}
mkdirSync(outDir, { recursive: true })

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const SAVE_KEY = 'the-annex.case-77.save.v1'

// ── chrome + cdp plumbing (same shape as scripts/evidence-travel.mjs) ────────
function launchChrome() {
  const proc = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=/tmp/annex-armed-${Date.now()}`,
    '--no-first-run',
    '--mute-audio',
    '--hide-scrollbars',
    'about:blank',
  ])
  const wsUrl = new Promise((resolve, reject) => {
    let buf = ''
    proc.stderr.on('data', (d) => {
      buf += d
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/)
      if (m) resolve(m[1])
    })
    proc.on('exit', () => reject(new Error('chrome exited early')))
    setTimeout(() => reject(new Error('chrome ws timeout')), 20000)
  })
  return { proc, wsUrl }
}

const chrome = launchChrome()
const browserWsUrl = await chrome.wsUrl
const cdpPort = new URL(browserWsUrl).port

let pageWs
for (let attempt = 0; attempt < 50; attempt += 1) {
  try {
    const targets = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json()
    const page = targets.find((target) => target.type === 'page')
    if (page) {
      pageWs = page.webSocketDebuggerUrl
      break
    }
  } catch {
    // not up yet
  }
  await new Promise((resolve) => setTimeout(resolve, 200))
}
if (!pageWs) throw new Error('no CDP page target')

const ws = new WebSocket(pageWs)
await new Promise((resolve, reject) => {
  ws.onopen = resolve
  ws.onerror = reject
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
function send(method, params = {}) {
  const id = nextId
  nextId += 1
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (result.exceptionDetails) {
    throw new Error(`evaluate failed: ${JSON.stringify(result.exceptionDetails)}`)
  }
  return result.result.value
}

// ── evidence capture ─────────────────────────────────────────────────────────
const failures = []
const transcript = []
function note(ok, message) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${message}`)
  transcript.push(`${ok ? 'PASS' : 'FAIL'}  ${message}`)
  if (!ok) failures.push(message)
}
function step(message) {
  console.log(`\n── ${message}`)
  transcript.push(`STEP: ${message}`)
}
function dump(name, data) {
  writeFileSync(join(outDir, name), JSON.stringify(data, null, 2))
  console.log(`   saved ${name}`)
}
async function screenshot(name) {
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(outDir, name), Buffer.from(shot.data, 'base64'))
  console.log(`   saved ${name}`)
}

// Force two real BeginFrames so every running CSS transition reaches its end
// value before a computed-style dump reads it (see header note).
async function settleFrames() {
  await send('Page.captureScreenshot', { format: 'png' })
  await sleep(300)
  await send('Page.captureScreenshot', { format: 'png' })
  await sleep(150)
}
async function settled(expression) {
  await settleFrames()
  return evaluate(expression)
}

// ── trusted-input helpers ────────────────────────────────────────────────────
// A single physical click at the element's center: pointerdown + pointerup +
// click, all through Chrome's input pipeline. scrollIntoView is a scroll, not
// a click — the cold-eyes rule constrains clicks, not reading position.
async function clickSelector(selector, label) {
  const point = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)})
    if (!el) return null
    el.scrollIntoView({ block: 'center', behavior: 'auto' })
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })()`)
  if (!point) throw new Error(`no element for selector: ${selector}`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
  step(`single-click ${label ?? selector}`)
  await sleep(380) // let React commit before the settle frames run
}
async function pressEscape() {
  for (const type of ['keyDown', 'keyUp']) {
    await send('Input.dispatchKeyEvent', {
      type,
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27,
      nativeVirtualKeyCode: 27,
    })
  }
  step('press Escape')
  await sleep(300)
}
async function parkMouse() {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 8, y: 8 })
  await sleep(200) // clear :hover so rest-state dumps are not hover-state dumps
}

// ── in-page probes ───────────────────────────────────────────────────────────
// Computed styles on the LIVE rows — the only reading that counts past the
// .site-inspector / media-query cascade overrides.
const DUMP_ROWS = (container) => `(() => {
  const rows = [...document.querySelectorAll(${JSON.stringify(container + ' .choice-row')})]
  return rows.map((row) => {
    const cs = getComputedStyle(row)
    const strong = row.querySelector('.choice-body strong')
    const hint = row.querySelector('.choice-body small')
    const method = row.querySelector('.choice-method')
    const aside = row.querySelector('.choice-aside')
    return {
      armed: row.classList.contains('choice-row-armed'),
      ariaPressed: row.getAttribute('aria-pressed'),
      titleText: strong ? strong.textContent.trim() : null,
      asideText: aside ? aside.textContent.trim() : null,
      hintText: hint ? hint.textContent.trim() : null,
      backgroundColor: cs.backgroundColor,
      boxShadow: cs.boxShadow,
      opacity: cs.opacity,
      hovered: row.matches(':hover'),
      asideClientWidth: aside ? aside.clientWidth : null,
      asideScrollWidth: aside ? aside.scrollWidth : null,
      methodColor: method ? getComputedStyle(method).color : null,
      hintColor: hint ? getComputedStyle(hint).color : null,
      hintWeight: hint ? getComputedStyle(hint).fontWeight : null,
    }
  })
})()`
// The arm-announcement channel: only the live regions inside commit surfaces
// (the app-level announcement <p> has no role="status"; the refusal beat's <p>
// sits outside these containers).
const ARM_LIVE = `(() => [...document.querySelectorAll(
  '.site-actions [role="status"], .decision-list [role="status"], .lattice-footer [role="status"]',
)].map((el) => el.textContent.trim()))()`
const DUMP_LATTICE = `(() => {
  const btn = document.querySelector('.lattice-footer .button')
  if (!btn) return null
  const cs = getComputedStyle(btn)
  const cost = document.querySelector('.lattice-cost strong')
  const live = document.querySelector('.lattice-footer [role="status"]')
  return {
    armed: btn.classList.contains('button-armed'),
    disabled: btn.disabled,
    ariaPressed: btn.getAttribute('aria-pressed'),
    buttonText: btn.textContent.trim().replace(/\\s+/g, ' '),
    backgroundColor: cs.backgroundColor,
    boxShadow: cs.boxShadow,
    color: cs.color,
    costColor: cost ? getComputedStyle(cost).color : null,
    liveText: live ? live.textContent.trim() : null,
  }
})()`

// Shared armed/unarmed assertions for a ChoiceButton surface.
function assertArmedRow(rows, live, surface) {
  const [armed, ...siblings] = rows
  note(armed.armed === true && armed.ariaPressed === 'true', `${surface}: row reports armed (class + aria-pressed)`)
  note(
    armed.titleText.endsWith('— select again to file'),
    `${surface}: armed label appends "— select again to file" → "${armed.titleText}"`,
  )
  note(armed.asideText === 'Confirm', `${surface}: aside reads Confirm`)
  note(
    armed.asideScrollWidth <= armed.asideClientWidth + 1,
    `${surface}: "Confirm" fits its column (scroll ${armed.asideScrollWidth}px ≤ client ${armed.asideClientWidth}px — no clipped glyphs)`,
  )
  note(
    armed.backgroundColor === 'oklch(0.26 0.06 70)' && armed.boxShadow.includes('inset'),
    `${surface}: armed computed style transforms (bg ${armed.backgroundColor}; shadow ${armed.boxShadow})`,
  )
  note(
    armed.hintText.endsWith('— final for this run') && armed.hintWeight === '650',
    `${surface}: pre-commit cost emphasized at the decision (${armed.hintWeight}, "${armed.hintText.slice(-30)}")`,
  )
  note(
    siblings.length > 0 && siblings.every((row) => row.opacity === '0.42'),
    `${surface}: un-chosen siblings recede to opacity 0.42`,
  )
  note(
    live.filter(Boolean).length === 1 && live[0] !== undefined && live.filter(Boolean)[0].endsWith('— select again to file.'),
    `${surface}: aria-live announces the arm → "${live.filter(Boolean)[0]}"`,
  )
}
function assertDisarmedRows(rows, live, surface, gesture) {
  note(rows.every((row) => !row.armed), `${surface}: ${gesture} disarms (no .choice-row-armed)`)
  note(
    rows.every((row) => row.backgroundColor === 'rgba(0, 0, 0, 0)' && row.boxShadow === 'none' && row.opacity === '1'),
    `${surface}: ${gesture} disarm visibly reverts (rest bg/shadow/opacity on live elements)`,
  )
  note(live.every((text) => text === ''), `${surface}: ${gesture} disarm is silent (live regions empty)`)
}

// ── run ──────────────────────────────────────────────────────────────────────
try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  })

  // Dev server readiness
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await fetch(appUrl)
      break
    } catch {
      await sleep(250)
    }
  }
  await send('Page.navigate', { url: appUrl })
  await sleep(1500)

  // Cold-eyes starts from a genuinely fresh save.
  await evaluate(`localStorage.clear(); 'cleared'`)
  await send('Page.reload')
  await sleep(1600)

  // (d) COLD-EYES — every step below is one single click; between clicks the
  // script only reads what the UI itself displays.
  step('cold-eyes: fresh save, title screen')
  await clickSelector('.start-actions .button-primary', '"Open a new audit"')
  await clickSelector('.choice-list .choice-row', 'first briefing approach (single click — reversible, not a commit)')
  await sleep(600)

  step('cold-eyes: first location, methods shown — dump UNARMED live state')
  await parkMouse()
  const invUnarmed = await settled(DUMP_ROWS('.site-actions'))
  dump('01-investigation-unarmed.json', invUnarmed)
  note(
    invUnarmed.length >= 2 && invUnarmed.every((row) => !row.armed && row.opacity === '1'),
    'field: two methods at rest, neither armed',
  )
  await screenshot('01-investigation-unarmed.png')

  await clickSelector('.site-actions .choice-row:nth-of-type(1)', 'first method (click 1 — the arm)')
  const invArmed = await settled(DUMP_ROWS('.site-actions'))
  const invArmLive = await evaluate(ARM_LIVE)
  dump('02-investigation-armed.json', { rows: invArmed, armLiveRegion: invArmLive })
  assertArmedRow(invArmed, invArmLive, 'field')
  await screenshot('02-investigation-armed.png')

  await clickSelector('.site-actions .choice-row:nth-of-type(1)', 'same method (click 2 — guided by the appended label)')
  await sleep(700)
  const filed = await evaluate(`(() => ({
    resolved: Boolean(document.querySelector('.resolved-action')),
    siteState: document.querySelector('.site-state')?.textContent.trim() ?? null,
    armLiveEmpty: (() => ${ARM_LIVE})().every((t) => t === ''),
  }))()`)
  dump('03-investigation-filed.json', filed)
  note(filed.resolved && filed.siteState === 'Filed', 'cold-eyes: first action FILED using only single clicks + the armed label')
  note(filed.armLiveEmpty, 'field: arm channel quiet again after the commit')
  await screenshot('03-investigation-filed.png')

  // (b) DISARM GESTURES on the second location.
  step('disarm checks: switch to location B, arm, Escape')
  await clickSelector('.site-switcher button:nth-of-type(2)', 'location B')
  await clickSelector('.site-actions .choice-row:nth-of-type(1)', 'method (arm)')
  await pressEscape()
  await parkMouse()
  const escRows = await settled(DUMP_ROWS('.site-actions'))
  const escLive = await evaluate(ARM_LIVE)
  dump('04-investigation-escape-disarm.json', { rows: escRows, armLiveRegion: escLive })
  assertDisarmedRows(escRows, escLive, 'field', 'Escape')

  step('disarm checks: re-arm, click outside the button')
  await clickSelector('.site-actions .choice-row:nth-of-type(1)', 'method (arm)')
  await clickSelector('.site-description', 'outside click (site description)')
  await parkMouse()
  const outRows = await settled(DUMP_ROWS('.site-actions'))
  const outLive = await evaluate(ARM_LIVE)
  dump('05-investigation-outside-click-disarm.json', { rows: outRows, armLiveRegion: outLive })
  assertDisarmedRows(outRows, outLive, 'field', 'outside-click')

  step('disarm checks: re-arm, switch location away and back')
  await clickSelector('.site-actions .choice-row:nth-of-type(1)', 'method (arm)')
  await clickSelector('.site-switcher button:nth-of-type(3)', 'location C (switches away)')
  await clickSelector('.site-switcher button:nth-of-type(2)', 'location B (back)')
  const locRows = await settled(DUMP_ROWS('.site-actions'))
  const locLive = await evaluate(ARM_LIVE)
  dump('06-investigation-location-switch-disarm.json', { rows: locRows, armLiveRegion: locLive })
  assertDisarmedRows(locRows, locLive, 'field', 'location-switch')

  // File location B as well (tribunal gate: two sites) — two single clicks.
  step('file location B (arm + confirm) to open the tribunal gate')
  await clickSelector('.site-actions .choice-row:nth-of-type(1)', 'method (arm)')
  await clickSelector('.site-actions .choice-row:nth-of-type(1)', 'same method (confirm)')
  await sleep(600)

  // RECONSTRUCTION surface.
  step('reconstruction: open lattice, pick two anchors')
  await clickSelector('.field-dock-actions .button-secondary', '"Open memory lattice"')
  await clickSelector('.fragment-row:nth-of-type(1)', 'anchor 1')
  await clickSelector('.fragment-row:nth-of-type(2)', 'anchor 2')
  await parkMouse()
  const recUnarmed = await settled(DUMP_LATTICE)
  dump('07-reconstruction-unarmed.json', recUnarmed)
  note(
    recUnarmed && !recUnarmed.armed && !recUnarmed.disabled && recUnarmed.buttonText.startsWith('File reconstruction') && recUnarmed.boxShadow === 'none',
    `lattice: commit at rest, enabled ("${recUnarmed?.buttonText}", bg ${recUnarmed?.backgroundColor})`,
  )

  await clickSelector('.lattice-footer .button', '"File reconstruction" (arm)')
  const recArmed = await settled(DUMP_LATTICE)
  dump('08-reconstruction-armed.json', recArmed)
  note(
    recArmed.armed && recArmed.buttonText.startsWith('Confirm irreversible filing — select again to file'),
    `lattice: armed label → "${recArmed.buttonText}"`,
  )
  note(
    recArmed.backgroundColor !== recUnarmed.backgroundColor && recArmed.boxShadow.includes('inset'),
    `lattice: armed computed style transforms (bg ${recUnarmed.backgroundColor} → ${recArmed.backgroundColor}; ring ${recArmed.boxShadow})`,
  )
  note(
    recArmed.costColor !== recUnarmed.costColor,
    `lattice: irreversibility warning gains emphasis (${recUnarmed.costColor} → ${recArmed.costColor})`,
  )
  note(
    recArmed.liveText.endsWith('— select again to file.'),
    `lattice: aria-live announces the arm → "${recArmed.liveText}"`,
  )
  await screenshot('04-reconstruction-armed.png')

  await pressEscape()
  await parkMouse()
  const recEscaped = await settled(DUMP_LATTICE)
  dump('09-reconstruction-escape-disarm.json', recEscaped)
  note(
    !recEscaped.armed && recEscaped.buttonText.startsWith('File reconstruction') && recEscaped.boxShadow === 'none',
    'lattice: Escape disarms visibly (label + fill revert)',
  )
  note(recEscaped.liveText === '', 'lattice: Escape disarm is silent')

  await clickSelector('.lattice-footer .button', '"File reconstruction" (re-arm)')
  await clickSelector('.lattice-rule', 'outside click (the rule note)')
  const recOutside = await settled(DUMP_LATTICE)
  dump('10-reconstruction-outside-click-disarm.json', recOutside)
  note(!recOutside.armed && recOutside.liveText === '', 'lattice: outside-click disarms, silently')

  await clickSelector('.lattice-footer .button', '"File reconstruction" (re-arm)')
  await clickSelector('.lattice-footer .button', '"Confirm irreversible filing" (confirm)')
  await sleep(700)
  const recFiled = await evaluate(`(() => ({
    filedModel: Boolean(document.querySelector('.filed-model')),
    backInField: Boolean(document.querySelector('.investigation-page')),
  }))()`)
  note(recFiled.filedModel && recFiled.backInField, 'lattice: second click files the model, back in the field')

  // TRIBUNAL surface.
  step('tribunal: enter, dump unarmed findings')
  await clickSelector('.field-dock-actions .button-primary', '"Enter tribunal"')
  await sleep(700)
  await parkMouse()
  const triUnarmed = await settled(DUMP_ROWS('.decision-list'))
  dump('11-tribunal-unarmed.json', triUnarmed)
  note(
    triUnarmed.length >= 2 && triUnarmed.every((row) => !row.armed),
    `tribunal: ${triUnarmed.length} findings at rest`,
  )

  await clickSelector('.decision-list .choice-row:nth-of-type(1)', 'first finding (arm)')
  const triArmed = await settled(DUMP_ROWS('.decision-list'))
  const triArmLive = await evaluate(ARM_LIVE)
  dump('12-tribunal-armed.json', { rows: triArmed, armLiveRegion: triArmLive })
  assertArmedRow(triArmed, triArmLive, 'tribunal')
  await screenshot('05-tribunal-armed.png')

  await pressEscape()
  await parkMouse()
  const triEsc = await settled(DUMP_ROWS('.decision-list'))
  const triEscLive = await evaluate(ARM_LIVE)
  dump('13-tribunal-escape-disarm.json', { rows: triEsc, armLiveRegion: triEscLive })
  assertDisarmedRows(triEsc, triEscLive, 'tribunal', 'Escape')

  await clickSelector('.decision-list .choice-row:nth-of-type(1)', 'finding (re-arm)')
  await clickSelector('.tribunal-summary', 'outside click (admitted record)')
  await parkMouse()
  const triOut = await settled(DUMP_ROWS('.decision-list'))
  const triOutLive = await evaluate(ARM_LIVE)
  dump('14-tribunal-outside-click-disarm.json', { rows: triOut, armLiveRegion: triOutLive })
  assertDisarmedRows(triOut, triOutLive, 'tribunal', 'outside-click')

  await clickSelector('.decision-list .choice-row:nth-of-type(1)', 'finding (re-arm)')
  await clickSelector('.decision-list .choice-row:nth-of-type(1)', 'same finding (confirm)')
  await sleep(900)
  const verdict = await evaluate(`(() => {
    const save = JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}) ?? 'null')
    return { decision: save?.decision ?? null, phase: save?.phase ?? null }
  })()`)
  note(verdict.decision !== null && verdict.phase === 'debrief', `tribunal: second click files the verdict (${JSON.stringify(verdict)})`)
  await screenshot('06-debrief.png')
} finally {
  writeFileSync(join(outDir, 'transcript.txt'), transcript.join('\n') + '\n')
  ws.close()
  chrome.proc.kill('SIGTERM')
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed`)
  process.exit(1)
}
console.log('\nall checks passed')

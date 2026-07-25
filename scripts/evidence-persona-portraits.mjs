// Evidence for the persona roster portraits (plan steps A–D), driven against the
// real Vite app in headless Chrome over raw CDP — no added dependencies.
//
// It runs in two MODES against the same URL so the before/after claims are real
// rather than reconstructed:
//   PORTRAIT_MODE=before  → run with the working tree stashed (pre-change app)
//   PORTRAIT_MODE=after   → run with the change in place
// Each mode writes evidence/persona-portraits/measurements-<mode>.json plus its
// own screenshots; scripts/… does not compare them, the report does, because the
// two runs are separate processes against separate document states.
//
// Every computed read is taken with transitions disabled and two frames allowed
// to pass (the transition-clock scar: a computed read on a transitioned property
// otherwise returns the START frame). Every interaction uses el.click() or a
// trusted CDP input event, never a synthetic dispatchEvent.
//
// Usage: node scripts/evidence-persona-portraits.mjs [app-url]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://127.0.0.1:3000/'
const MODE = process.env.PORTRAIT_MODE ?? 'after'
const OUT_DIR = new URL('../evidence/persona-portraits/', import.meta.url).pathname
mkdirSync(OUT_DIR, { recursive: true })

const PERSONA_NAMES = ['The Registrar', 'The Shepherd', 'The Defector', 'The Small Archivist']

const chromeProcess = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=/tmp/annex-portraits-${Date.now()}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--mute-audio',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1280,800',
  'about:blank',
])

const killTimer = setTimeout(() => {
  console.error('GLOBAL TIMEOUT — aborting persona portrait evidence run')
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
    }, 30000)
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
    await sleep(140)
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

async function setViewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  })
}

async function shot(name, width, height) {
  const { data } = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  })
  const file = join(OUT_DIR, `${name}-${MODE}-${width}x${height}.png`)
  writeFileSync(file, Buffer.from(data, 'base64'))
  return file.split('/').pop()
}

const report = {
  mode: MODE,
  url: APP_URL,
  capturedAt: new Date().toISOString(),
  node: process.version,
  checks: [],
  shots: [],
  measurements: {},
}
function record(step, pass, detail) {
  report.checks.push({ step, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${step}  ${JSON.stringify(detail)?.slice(0, 400)}`)
}

// ── Accessibility-visible text, computed in page ────────────────────────────
// Walks a surface subtree the way an AT would: anything aria-hidden (or inside
// something aria-hidden) contributes nothing, and an <img> contributes its alt.
// This is the assertion; the CDP full AX tree dumped alongside is the record.
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

async function nameCounts(selector, label, mode = 'exactly-one') {
  await evaluate(AT_TEXT_FN)
  const result = await evaluate(`(() => {
    const root = document.querySelector(${JSON.stringify(selector)})
    if (!root) return null
    const text = window.__atText(root)
    const names = ${JSON.stringify(PERSONA_NAMES)}
    const counts = {}
    names.forEach((n) => {
      // "The Registrar" must not be double-counted inside a longer name; the four
      // authored names share no prefix, so a plain global match is exact here.
      counts[n] = (text.match(new RegExp(n.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'g')) || []).length
    })
    return { text: text.slice(0, 1200), counts }
  })()`)
  if (!result) {
    record(`AT name counts · ${label}`, false, { selector, error: 'surface not present' })
    return null
  }
  report.measurements[`atText:${label}`] = result
  const present = Object.entries(result.counts).filter(([, n]) => n > 0)
  if (mode === 'record') {
    // Some surfaces already printed a persona's name twice BEFORE this change
    // (the filed card prints a Standing summary as well as the attributed line).
    // For those the claim is not "once" but "unchanged", which only the paired
    // PORTRAIT_MODE=before run can settle — so this is recorded, not asserted.
    record(`AT name counts · ${label} — recorded for before/after comparison`, true, {
      selector,
      counts: result.counts,
    })
    return result
  }
  const anyDouble = present.some(([, n]) => n !== 1)
  record(`AT name counts · ${label} — every named persona appears exactly once`, !anyDouble && present.length > 0, {
    selector,
    counts: result.counts,
  })
  return result
}

async function dumpAxTree(label) {
  try {
    const { nodes } = await send('Accessibility.getFullAXTree')
    const named = nodes
      .map((n) => ({ role: n.role?.value, name: n.name?.value }))
      .filter((n) => n.name && PERSONA_NAMES.some((p) => n.name.includes(p)))
    report.measurements[`axTree:${label}`] = named
    return named
  } catch (error) {
    report.measurements[`axTree:${label}`] = { error: String(error?.message ?? error) }
    return null
  }
}

// ── Frozen computed reads ───────────────────────────────────────────────────
// Transitions AND animations are disabled and two frames allowed to pass before
// any getComputedStyle / getBoundingClientRect read.
const FREEZE = `(async (extraCss) => {
  document.getElementById('annex-portrait-freeze')?.remove()
  const style = document.createElement('style')
  style.id = 'annex-portrait-freeze'
  style.textContent = '*, *::before, *::after { transition: none !important; }' + (extraCss || '')
  document.head.appendChild(style)
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  return true
})`
const freeze = (extraCss = '') => evaluate(`${FREEZE}(${JSON.stringify(extraCss)})`)
const unfreeze = () =>
  evaluate(`(() => { document.getElementById('annex-portrait-freeze')?.remove(); return true })()`)

const railRowHeights = () =>
  evaluate(`(() => [...document.querySelectorAll('.persona-list li')].map((li) => ({
    height: Math.round(li.getBoundingClientRect().height * 100) / 100,
    minHeight: getComputedStyle(li).minHeight,
    columns: getComputedStyle(li).gridTemplateColumns,
    roleText: li.querySelector('small')?.textContent ?? null,
    roleClipped: (() => { const s = li.querySelector('small'); return s ? s.scrollWidth > s.clientWidth : null })(),
  })))()`)

// ── Navigation helpers (the pilot harness's proven route) ───────────────────

let bootCounter = 0
async function bootFreshRun() {
  bootCounter += 1
  await send('Page.navigate', { url: APP_URL })
  await waitFor(`document.readyState === 'complete'`)
  await evaluate(
    `(() => { try { window.localStorage.clear() } catch { /* ignore */ } window.__annexStale = true; return true })()`,
  )
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
  await sleep(400)
}

async function enterSite(name) {
  const viaPortal = await click('.annex-world-portal', name)
  if (!viaPortal) await click('.site-switch', name)
  const ok = await waitFor(
    `document.querySelector('.world-view')?.dataset.transition === 'closeup'`,
    20000,
  )
  await sleep(500)
  return ok
}

const zoneRingCentres = () =>
  evaluate(`(() => [...document.querySelectorAll('.scene-zone')].map((z) => {
    const r = z.querySelector('.scene-zone-ring').getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }))()`)

async function mouseClick(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 })
  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1,
  })
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1,
  })
}

async function pressKey(key, code, vk, text) {
  for (const type of ['keyDown', 'keyUp']) {
    await send('Input.dispatchKeyEvent', {
      type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk,
      ...(type === 'keyDown' && text ? { text } : {}),
    })
  }
  await sleep(180)
}

// Files the Care ward's first method through the scene-first plate and stops
// mid-stanza, which is the state the beat evidence needs.
async function fileCareWard() {
  await enterSite('Care ward')
  const rings = await zoneRingCentres()
  if (rings.length < 1) throw new Error('care ward zones did not mount')
  await mouseClick(rings[0].x, rings[0].y) // arm
  await sleep(320)
  await mouseClick(rings[0].x, rings[0].y) // commit
  await sleep(1500)
}

// ── PASS 1: the beat, the result strip, the filed card ──────────────────────

async function scenePass(width, height) {
  const tag = `${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()
  await fileCareWard()

  // The stanza reveals on its own clock; wait for it to reach a speaker line
  // rather than flushing it, so the capture is the real mid-beat state.
  const reachedSpeaker = await waitFor(`!!document.querySelector('.scene-beat-line--speaker')`, 20000)
  await sleep(400)

  // Mid-stanza: a speaker line is on screen with its portrait.
  const beat = await evaluate(`(() => {
    const speaker = document.querySelector('.scene-beat-line--speaker')
    const stanza = document.querySelector('.scene-beat-lines')
    const live = document.querySelector('.scene-beat .sr-only[role="status"]')
    return {
      speakerLines: document.querySelectorAll('.scene-beat-line--speaker').length,
      speakerText: speaker?.textContent ?? null,
      speakerDataSpeaker: speaker?.dataset.speaker ?? null,
      portraitInSpeaker: !!speaker?.querySelector('.persona-portrait'),
      stanzaAriaHidden: stanza?.getAttribute('aria-hidden') ?? null,
      liveRegionText: live?.textContent ?? null,
    }
  })()`)
  report.measurements[`beat:${tag}`] = beat
  report.shots.push(await shot('01-beat-speaker', width, height))
  record(`[${tag}] the speaker line carries the portrait inside the aria-hidden stanza`, Boolean(
    reachedSpeaker && beat.speakerLines > 0 && beat.stanzaAriaHidden === 'true' &&
      (MODE === 'before' ? !beat.portraitInSpeaker : beat.portraitInSpeaker),
  ), beat)
  // The stanza is aria-hidden, so the portrait may add nothing to the AT tree.
  await nameCounts('.scene-beat', `beat-stanza-${tag}`, 'record')

  // Flush the stanza and capture the FULL live-region string. This is the byte
  // comparison subject: the stanza is aria-hidden, so a portrait inside it must
  // change nothing an AT user hears.
  for (let i = 0; i < 14; i += 1) {
    if (await evaluate(`!!document.querySelector('.scene-result')`)) break
    await pressKey('j', 'KeyJ', 74, 'j')
    await sleep(280)
  }
  await sleep(500)
  const liveRegion = await evaluate(
    `document.querySelector('.scene-beat .sr-only[role="status"]')?.textContent ?? null`,
  )
  report.measurements[`liveRegion:${tag}`] = liveRegion
  record(`[${tag}] beat live region captured for byte comparison`, typeof liveRegion === 'string', {
    bytes: liveRegion ? Buffer.byteLength(liveRegion, 'utf8') : null,
    text: liveRegion,
  })

  await freeze()
  const strip = await evaluate(`(() => {
    const entries = [...document.querySelectorAll('.scene-result-standing > span')]
    return {
      entries: entries.length,
      text: document.querySelector('.scene-result-standing')?.textContent ?? null,
      chips: entries.map((e) => {
        const p = e.querySelector('.persona-portrait')
        if (!p) return null
        const r = p.getBoundingClientRect()
        const img = p.querySelector('img')
        return {
          persona: p.dataset.persona,
          width: Math.round(r.width * 100) / 100,
          height: Math.round(r.height * 100) / 100,
          ariaHidden: p.getAttribute('aria-hidden'),
          alt: img?.getAttribute('alt'),
          naturalWidth: img?.naturalWidth ?? null,
          filter: img ? getComputedStyle(img).filter : null,
          blend: getComputedStyle(p).mixBlendMode,
        }
      }),
    }
  })()`)
  await unfreeze()
  report.measurements[`resultStrip:${tag}`] = strip
  report.shots.push(await shot('02-result-strip', width, height))
  record(`[${tag}] every standing delta carries a 24px decorative chip that decoded`, Boolean(
    MODE === 'before'
      ? strip.entries > 0 && strip.chips.every((c) => c === null)
      : strip.entries > 0 &&
        strip.chips.every(
          (c) => c && c.width === 24 && c.ariaHidden === 'true' && c.alt === '' &&
            c.naturalWidth > 0 && c.filter === 'none' && c.blend === 'normal',
        ),
  ), strip)
  await nameCounts('.scene-result', `result-strip-${tag}`)

  // Dismiss → the filed card, where ReactionQuotes renders the same chip.
  await click('.scene-result-dismiss')
  await sleep(700)
  await freeze()
  const reaction = await evaluate(`(() => {
    const lines = [...document.querySelectorAll('.resolved-action .reaction-line')]
    return {
      lines: lines.length,
      chips: lines.map((l) => {
        const p = l.querySelector('.persona-portrait')
        if (!p) return null
        const r = p.getBoundingClientRect()
        const img = p.querySelector('img')
        return {
          persona: p.dataset.persona,
          width: Math.round(r.width * 100) / 100,
          height: Math.round(r.height * 100) / 100,
          ariaHidden: p.getAttribute('aria-hidden'),
          alt: img?.getAttribute('alt'),
          naturalWidth: img?.naturalWidth ?? null,
          filter: img ? getComputedStyle(img).filter : null,
        }
      }),
      names: lines.map((l) => l.querySelector('.reaction-name')?.textContent ?? null),
    }
  })()`)
  await unfreeze()
  report.measurements[`filedCardReactions:${tag}`] = reaction
  report.shots.push(await shot('03-filed-card-reaction', width, height))
  record(`[${tag}] the filed card's attributed lines carry 34px chips`, Boolean(
    MODE === 'before'
      ? reaction.lines > 0 && reaction.chips.every((c) => c === null)
      : reaction.lines > 0 &&
        reaction.chips.every(
          (c) => c && c.width === 34 && c.ariaHidden === 'true' && c.alt === '' && c.naturalWidth > 0,
        ),
  ), reaction)
  // The chip's own surface must name each persona exactly once…
  await nameCounts('.reaction-block', `filed-card-reaction-block-${tag}`)
  // …while the whole filed card is recorded, because it already printed some
  // names twice (attributed line + Standing summary) before this change.
  await nameCounts('.resolved-action', `filed-card-${tag}`, 'record')
  await dumpAxTree(`filed-card-${tag}`)
}

// ── PASS 2: the rail entity cards (the row-height gate) ─────────────────────

async function railPass(width, height) {
  const tag = `${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()
  await fileCareWard()
  for (let i = 0; i < 14; i += 1) {
    if (await evaluate(`!!document.querySelector('.scene-result')`)) break
    await pressKey('j', 'KeyJ', 74, 'j')
    await sleep(260)
  }
  await click('.scene-result-dismiss')
  await sleep(600)

  // The rail's Case tab holds Social memory; on the narrow layout it lives behind
  // the mobile toggle.
  // On the narrow layout the rail's tabs and panels are collapsed behind the
  // mobile toggle: the nodes are IN the DOM but laid out at zero, so presence is
  // not the test — a nonzero rect is.
  if (!(await evaluate(`(document.querySelector('.persona-list')?.getBoundingClientRect().height ?? 0) > 0`))) {
    await click('.rail-mobile-toggle')
    await sleep(500)
  }
  await click('.rail-tabs button', 'case')
  await sleep(300)
  const railVisible = await evaluate(`(() => {
    const list = document.querySelector('.persona-list')
    if (!list) return false
    list.scrollIntoView({ behavior: 'auto', block: 'center' })
    return true
  })()`)
  await sleep(300)

  await freeze()
  const after = await railRowHeights()
  // The same document, with the pre-change geometry restored by override: this
  // isolates the ONE variable the risk names (the 20px→40px cell) inside one
  // layout, and the separate PORTRAIT_MODE=before run proves the real baseline.
  await freeze(
    '.persona-list li { grid-template-columns: 8px 20px minmax(0, 1fr) auto !important; } .persona-portrait { width: 20px !important; }',
  )
  const reconstructed = await railRowHeights()
  await freeze()
  const portraits = await evaluate(`(() => [...document.querySelectorAll('.persona-list .persona-portrait')].map((p) => {
    const r = p.getBoundingClientRect()
    const img = p.querySelector('img')
    const mark = p.querySelector('.persona-portrait-mark')
    const cs = getComputedStyle(p)
    return {
      persona: p.dataset.persona,
      width: Math.round(r.width * 100) / 100,
      height: Math.round(r.height * 100) / 100,
      ariaHidden: p.getAttribute('aria-hidden'),
      alt: img?.getAttribute('alt') ?? null,
      naturalWidth: img?.naturalWidth ?? null,
      imgFilter: img ? getComputedStyle(img).filter : null,
      imgOpacity: img ? getComputedStyle(img).opacity : null,
      markOpacity: mark ? getComputedStyle(mark).opacity : null,
      markAnimation: mark ? getComputedStyle(mark).animationName : null,
      mixBlendMode: cs.mixBlendMode,
      background: cs.backgroundColor,
      border: cs.borderTopWidth + ' ' + cs.borderTopStyle,
    }
  }))()`)
  await unfreeze()

  report.measurements[`railRows:${tag}`] = { after, reconstructedPreChange: reconstructed }
  report.measurements[`railPortraits:${tag}`] = portraits
  report.shots.push(await shot('04-rail-entity-cards', width, height))

  const heightsEqual =
    after.length > 0 &&
    after.length === reconstructed.length &&
    after.every((row, i) => row.height === reconstructed[i].height)
  record(`[${tag}] rail row height is unchanged by the 20px→40px cell`, heightsEqual, {
    railVisible,
    afterHeights: after.map((r) => r.height),
    reconstructedHeights: reconstructed.map((r) => r.height),
    minHeight: after[0]?.minHeight,
    columns: after[0]?.columns,
  })
  record(`[${tag}] four roles still legible in the row`, after.length === 4 && after.every((r) => r.roleText), {
    roles: after.map((r) => r.roleText),
    clipped: after.map((r) => r.roleClipped),
  })
  record(`[${tag}] rail portraits are matted, unfiltered at rest, decorative, and decoded`, Boolean(
    MODE === 'before'
      ? portraits.length === 0
      : portraits.length === 4 &&
        portraits.every(
          (p) => p.width === 40 && p.ariaHidden === 'true' && p.alt === '' &&
            p.naturalWidth > 0 && p.imgFilter === 'none' && p.mixBlendMode === 'normal' &&
            p.markOpacity === '0' && p.markAnimation === 'none',
        ),
  ), portraits)
  await nameCounts('.persona-list', `rail-social-memory-${tag}`)
  await dumpAxTree(`rail-${tag}`)

  // The value eyeball: all four portraits, in the rail, in the running dark shell.
  if (width === 1280) {
    report.shots.push(await shot('05-value-eyeball-four-portraits', width, height))
  }

  // ── Sigil fallback. The component's own branch is unit-tested; here the DOM is
  // reduced to exactly what that branch emits (frame + mark, no plate, no
  // --plated) so the RENDERED fallback and its retained breathe are visible.
  if (MODE === 'after') {
    await evaluate(`(() => {
      const p = document.querySelector('.persona-list li:nth-child(2) .persona-portrait')
      if (!p) return false
      p.classList.remove('persona-portrait--plated')
      p.querySelector('img')?.remove()
      return true
    })()`)
    await sleep(400)
    const fallback = await evaluate(`(() => {
      const rows = [...document.querySelectorAll('.persona-list li')]
      return rows.map((li) => {
        const p = li.querySelector('.persona-portrait')
        const mark = p?.querySelector('.persona-portrait-mark')
        return {
          plated: p?.classList.contains('persona-portrait--plated') ?? null,
          hasImg: !!p?.querySelector('img'),
          markOpacity: mark ? getComputedStyle(mark).opacity : null,
          markAnimation: mark ? getComputedStyle(mark).animationName : null,
          rowHeight: Math.round(li.getBoundingClientRect().height * 100) / 100,
        }
      })
    })()`)
    report.measurements[`sigilFallback:${tag}`] = fallback
    report.shots.push(await shot('06-sigil-fallback', width, height))
    // The un-plated mark's opacity is sampled mid-breathe, so it lands anywhere
    // in the keyframe's 0.55–1 range; what matters is that it is visible at all
    // (the plated marks sit at a hard 0) and that only it carries the animation.
    record(`[${tag}] the un-plated row shows the sigil and keeps the breathe; plated rows do not`, Boolean(
      fallback[1] && fallback[1].plated === false && fallback[1].hasImg === false &&
        Number(fallback[1].markOpacity) >= 0.55 && fallback[1].markAnimation === 'ambience-breathe' &&
        fallback.filter((_, i) => i !== 1).every((r) => r.markAnimation === 'none' && r.markOpacity === '0'),
    ), fallback)
  }
}

// ── PASS 3: the debrief ─────────────────────────────────────────────────────

async function debriefPass(width, height) {
  const tag = `${width}x${height}`
  await setViewport(width, height)
  await bootFreshRun()

  // Site one: the Care ward, through the scene-first plate.
  await fileCareWard()
  for (let i = 0; i < 14; i += 1) {
    if (await evaluate(`!!document.querySelector('.scene-result')`)) break
    await pressKey('j', 'KeyJ', 74, 'j')
    await sleep(260)
  }
  await click('.scene-result-dismiss')
  await sleep(600)
  await click('.world-return')
  await sleep(900)

  // Site two: the Registry intake custody rail (a non-pilot surface — driving it
  // here also proves it still works with the portraits in the tree).
  await enterSite('Registry intake')
  for (let i = 0; i < 4; i += 1) {
    await evaluate(`(() => { const b=[...document.querySelectorAll('.cr-carrier')].find(x=>!x.disabled); if(b){b.click(); return true} return false })()`)
    await sleep(240)
  }
  for (const sel of ['.cr-late-carrier', '.cr-mirror', '.cr-proceed']) {
    await evaluate(`(() => { const b=document.querySelector(${JSON.stringify(sel)}); if(b){b.click(); return true} return false })()`)
    await sleep(400)
  }
  const registryOk = await evaluate(`!!document.querySelector('.choice-row') || !!document.querySelector('.scene-zone')`)
  record(`[${tag}] the non-pilot Registry intake custody rail still reaches its methods`, registryOk, {})
  // Arm-then-commit the first available method.
  await click('.choice-row')
  await sleep(320)
  await click('.choice-row')
  await sleep(1400)
  for (let i = 0; i < 14; i += 1) {
    if (await evaluate(`!!document.querySelector('.scene-result')`)) break
    if (!(await evaluate(`!!document.querySelector('.scene-beat')`))) break
    await pressKey('j', 'KeyJ', 74, 'j')
    await sleep(260)
  }
  await click('.scene-result-dismiss')
  await sleep(600)

  // Reconstruction → tribunal → verdict → debrief.
  await click('button', 'Open memory lattice')
  await sleep(900)
  await evaluate(`(() => {
    const btns = [...document.querySelectorAll('button')]
    btns.filter((b) => /Embodied echo|Recognition|anchor/i.test(b.textContent)).slice(0, 2).forEach((b) => b.click())
    return true
  })()`)
  await sleep(400)
  await click('button', 'File reconstruction')
  await sleep(400)
  await click('button', 'Confirm irreversible filing')
  await sleep(900)
  await click('button', 'Enter tribunal')
  await sleep(1200)
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /Certify|Decline|Refuse/i.test(x.textContent))
    if (b) b.click(); return !!b
  })()`)
  await sleep(400)
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /Certify|Decline|Refuse|select again to file/i.test(x.textContent))
    if (b) b.click(); return !!b
  })()`)
  await sleep(1600)
  // Open the debrief's own disclosures only — opening every <details> on the page
  // also opens the header's Access popover, which then covers the reflections.
  await evaluate(`(() => {
    document.querySelectorAll('.debrief details, details.debrief-archive').forEach((d) => { d.open = true })
    document.querySelectorAll('header details, .case-header details').forEach((d) => { d.open = false })
    return true
  })()`)
  await sleep(600)
  await evaluate(`(() => { document.querySelector('.reflection-list')?.scrollIntoView({ behavior: 'auto', block: 'center' }); return true })()`)
  await sleep(400)

  await freeze()
  const debrief = await evaluate(`(() => {
    const quotes = [...document.querySelectorAll('.reflection-list blockquote')]
    return {
      blockquotes: quotes.length,
      cards: quotes.map((q) => {
        const p = q.querySelector('.persona-portrait')
        if (!p) return null
        const r = p.getBoundingClientRect()
        const img = p.querySelector('img')
        return {
          persona: p.dataset.persona,
          width: Math.round(r.width * 100) / 100,
          ariaHidden: p.getAttribute('aria-hidden'),
          alt: img?.getAttribute('alt') ?? null,
          naturalWidth: img?.naturalWidth ?? null,
        }
      }),
      names: quotes.map((q) => q.querySelector('strong')?.textContent ?? null),
    }
  })()`)
  await unfreeze()
  report.measurements[`debrief:${tag}`] = debrief
  report.shots.push(await shot('07-debrief-reflections', width, height))
  record(`[${tag}] every debrief reflection takes the card portrait`, Boolean(
    MODE === 'before'
      ? debrief.blockquotes === 4 && debrief.cards.every((c) => c === null)
      : debrief.blockquotes === 4 &&
        debrief.cards.every((c) => c && c.width === 40 && c.ariaHidden === 'true' && c.alt === '' && c.naturalWidth > 0),
  ), debrief)
  await nameCounts('.reflection-list', `debrief-${tag}`)
  await dumpAxTree(`debrief-${tag}`)
}

// ── PASS 4: preference paths ────────────────────────────────────────────────

async function forcedColorsPass(width, height) {
  const tag = `${width}x${height} forced-colors`
  await setViewport(width, height)
  await send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'forced-colors', value: 'active' },
      { name: 'prefers-color-scheme', value: 'dark' },
    ],
  })
  await bootFreshRun()
  await fileCareWard()
  for (let i = 0; i < 14; i += 1) {
    if (await evaluate(`!!document.querySelector('.scene-result')`)) break
    await pressKey('j', 'KeyJ', 74, 'j')
    await sleep(260)
  }
  await click('.scene-result-dismiss')
  await sleep(600)
  // On the narrow layout the rail's tabs and panels are collapsed behind the
  // mobile toggle: the nodes are IN the DOM but laid out at zero, so presence is
  // not the test — a nonzero rect is.
  if (!(await evaluate(`(document.querySelector('.persona-list')?.getBoundingClientRect().height ?? 0) > 0`))) {
    await click('.rail-mobile-toggle')
    await sleep(500)
  }
  await click('.rail-tabs button', 'case')
  await sleep(300)
  await evaluate(`(() => { document.querySelector('.persona-list')?.scrollIntoView({ block: 'center' }); return true })()`)
  await sleep(300)
  await freeze()
  const state = await evaluate(`(() => [...document.querySelectorAll('.persona-list .persona-portrait')].map((p) => {
    const img = p.querySelector('img')
    const mark = p.querySelector('.persona-portrait-mark')
    return {
      persona: p.dataset.persona,
      imgOpacity: img ? getComputedStyle(img).opacity : null,
      imgInTree: !!img,
      markOpacity: mark ? getComputedStyle(mark).opacity : null,
      markSvg: !!mark?.querySelector('svg'),
      rowHeight: Math.round(p.closest('li').getBoundingClientRect().height * 100) / 100,
    }
  }))()`)
  await unfreeze()
  report.measurements[`forcedColors:${width}x${height}`] = state
  report.shots.push(await shot('08-forced-colors-rail', width, height))
  record(`[${tag}] the plate stands down and the currentColor sigil takes over`, Boolean(
    MODE === 'before'
      ? state.length === 0
      : state.length === 4 && state.every((p) => p.imgOpacity === '0' && p.markOpacity === '1' && p.markSvg),
  ), state)
  await send('Emulation.setEmulatedMedia', { features: [] })
}

async function reducedMotionPass(width, height) {
  const tag = `${width}x${height} reduced-motion`
  await setViewport(width, height)
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  await bootFreshRun()
  await fileCareWard()
  await sleep(400)
  const beatUnderRm = await evaluate(`(() => ({
    lines: document.querySelectorAll('.scene-beat-line').length,
    result: !!document.querySelector('.scene-result'),
    speakerPortraits: document.querySelectorAll('.scene-beat-line--speaker .persona-portrait').length,
    portraitAnimations: [...document.querySelectorAll('.persona-portrait, .persona-portrait *')].map((e) => getComputedStyle(e).animationName),
  }))()`)
  report.shots.push(await shot('09-reduced-motion-beat', width, height))
  record(`[${tag}] the stanza is advance-paced and no portrait animates`, Boolean(
    beatUnderRm.lines > 0 && beatUnderRm.result === false &&
      beatUnderRm.portraitAnimations.every((n) => n === 'none' || n === undefined),
  ), beatUnderRm)

  await click('.scene-beat-advance')
  await sleep(500)
  await click('.scene-result-dismiss')
  await sleep(600)
  // On the narrow layout the rail's tabs and panels are collapsed behind the
  // mobile toggle: the nodes are IN the DOM but laid out at zero, so presence is
  // not the test — a nonzero rect is.
  if (!(await evaluate(`(document.querySelector('.persona-list')?.getBoundingClientRect().height ?? 0) > 0`))) {
    await click('.rail-mobile-toggle')
    await sleep(500)
  }
  await click('.rail-tabs button', 'case')
  await sleep(300)
  await evaluate(`(() => { document.querySelector('.persona-list')?.scrollIntoView({ block: 'center' }); return true })()`)
  await sleep(300)
  const railUnderRm = await evaluate(`(() => [...document.querySelectorAll('.persona-list .persona-portrait-mark, .persona-list .persona-portrait')].map((e) => ({
    cls: e.className,
    animationName: getComputedStyle(e).animationName,
    animationDuration: getComputedStyle(e).animationDuration,
  })))()`)
  report.measurements[`reducedMotionRail:${width}x${height}`] = railUnderRm
  report.shots.push(await shot('10-reduced-motion-rail', width, height))
  record(`[${tag}] no breathe survives on the rail`, railUnderRm.every(
    (e) => e.animationName === 'none' || e.animationDuration === '0.01ms',
  ), railUnderRm)
  await send('Emulation.setEmulatedMedia', { features: [] })
}

// ── Run ─────────────────────────────────────────────────────────────────────

const passes = [
  ['scene 1280x800', () => scenePass(1280, 800)],
  ['scene 375x812', () => scenePass(375, 812)],
  ['rail 1280x800', () => railPass(1280, 800)],
  ['rail 375x812', () => railPass(375, 812)],
  ['debrief 1280x800', () => debriefPass(1280, 800)],
  ['debrief 375x812', () => debriefPass(375, 812)],
  ['forced-colors 1280x800', () => forcedColorsPass(1280, 800)],
  ['reduced-motion 1280x800', () => reducedMotionPass(1280, 800)],
  ['reduced-motion 375x812', () => reducedMotionPass(375, 812)],
]
const FILTER = process.env.PORTRAIT_PASS ?? ''
for (const [name, run] of passes) {
  if (FILTER && !name.includes(FILTER)) continue
  try {
    await run()
  } catch (error) {
    record(`${name} — aborted`, false, { error: String(error?.message ?? error) })
    await send('Emulation.setEmulatedMedia', { features: [] }).catch(() => undefined)
  }
}

report.passed = report.checks.filter((c) => c.pass).length
report.failed = report.checks.filter((c) => !c.pass).length
writeFileSync(join(OUT_DIR, `measurements-${MODE}.json`), JSON.stringify(report, null, 2))
console.log(`\n[${MODE}] ${report.passed} passed / ${report.failed} failed → ${OUT_DIR}`)
clearTimeout(killTimer)
chromeProcess.kill('SIGKILL')
socket.close()
process.exit(report.failed > 0 ? 1 : 0)

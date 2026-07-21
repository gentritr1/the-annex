// Evidence pack generator for the selection camera travel (scene motion).
// Drives the real app in headless Chrome over CDP (Node's built-in WebSocket —
// no new dependencies) against a local dev server, and captures:
//   (a) .scene-pgroup transform at rest → selection → settled, with timestamps
//       and settle time vs the authored travelInMs, for BOTH cases;
//   (b) rest-vs-focused screenshot pairs at 1280×800 (rest = reduced-motion
//       capture, where the rest framing is guaranteed: transform stays 'none');
//   (c) reduced-motion runs proving zero transform change on selection;
//   (d) hit-test proof that every hotspot button stays ≥44px while focused.
// Settled transforms are compared against expected values computed from the
// same projection math as motion.ts (crop window from the live container
// aspect), within a 5% tolerance.
//
// Usage: node scripts/evidence-travel.mjs <app-url>
// Writes PNGs + travel-measurements.json into evidence/.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://localhost:5199/'
const OUT_DIR = new URL('../evidence/', import.meta.url).pathname

const SAVE_KEY = 'the-annex.case-77.save.v1'
// A minimal schema-2 save whose only purpose is unlocking the Case 81 title
// switcher (Case 81 cites a Case 77 precedent). Mirrors createRunState().
const SEED_SAVE = {
  schemaVersion: 2,
  caseId: 'case-77',
  phase: 'landing',
  runNumber: 1,
  primaryApproach: null,
  completedSites: [],
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
  precedents: { 'case-77': 'charter-new-person' },
  settings: {
    reducedMotion: false,
    highContrast: false,
    textSize: 'standard',
    showTrustNumbers: false,
    ambientSound: false,
  },
  announcement: 'Evidence-run seed.',
}

// Authored values under test (src/game/cases/case77.ts, case81.ts).
const CASES = {
  'case-77': {
    master: { w: 1600, h: 900 },
    travel: { maxOffset: 0.025, focusScale: 1.045, travelInMs: 520, settleOutMs: 440 },
    // The initial selection is sites[0] (registry), so the change leg clicks a
    // different site — small-archive, the farthest centre offset (exercises the
    // maxOffset clamp).
    clickSite: 'small-archive',
  },
  'case-81': {
    master: { w: 1600, h: 900 },
    travel: { maxOffset: 0.025, focusScale: 1.05, travelInMs: 480, settleOutMs: 420 },
    clickSite: 'restoration-lab',
  },
}

// Injected into the page: an 8ms transform sampler on .scene-pgroup plus the
// expected-travel computation, reusing motion.ts's crop-window math exactly.
const PAGE_HELPERS = `
window.__ev = (() => {
  const samples = []
  let t0 = performance.now()
  let last = '__init__'
  setInterval(() => {
    const el = document.querySelector('.scene-pgroup')
    const v = el ? (el.style.transform || '(empty)') : '__absent__'
    if (v !== last) { samples.push([Math.round(performance.now() - t0), v]); last = v }
  }, 8)
  return {
    samples,
    reset() { samples.length = 0; t0 = performance.now(); last = '__init__' },
    expected(master, travel) {
      const frame = document.querySelector('.scene-frame').getBoundingClientRect()
      const W = frame.width
      const H = frame.height
      const A = W / H
      const M = master.w / master.h
      let win
      if (A >= M) win = { x: 0, y: (1 - M / A) / 2, w: 1, h: M / A }
      else win = { x: (1 - A / M) / 2, y: 0, w: A / M, h: 1 }
      const sel = document.querySelector('.scene-hotspot[data-selected="true"]')
      if (!sel) return null
      const nx = (Number(sel.dataset.x) - win.x) / win.w - 0.5
      const ny = (Number(sel.dataset.y) - win.y) / win.h - 0.5
      const m = travel.maxOffset
      return {
        site: sel.dataset.site,
        txPx: -Math.max(-m, Math.min(m, nx)) * W,
        tyPx: -Math.max(-m, Math.min(m, ny)) * H,
        scale: travel.focusScale,
      }
    },
    hitAreas() {
      return [...document.querySelectorAll('.scene-hotspot')].map((el) => {
        const r = el.getBoundingClientRect()
        return { site: el.dataset.site, w: +r.width.toFixed(2), h: +r.height.toFixed(2) }
      })
    },
  }
})()
`

function launchChrome(tag) {
  const proc = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=/tmp/annex-evidence-${tag}-${Date.now()}`,
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

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (msg.method === 'Runtime.exceptionThrown') {
        console.log('[page exception]', JSON.stringify(msg.params.exceptionDetails).slice(0, 600))
      }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.error) reject(new Error(msg.error.message))
        else resolve(msg.result)
      }
    })
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params, sessionId }))
    })
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function parseTransform(value) {
  const m = value.match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)/)
  if (!m) return null
  return { txPx: +m[1], tyPx: +m[2], scale: +m[3] }
}

// The travel prefix (translate + scale), excluding the drift rotation: the
// pointer drift is a separate pre-existing behavior with no authored duration,
// and the synthetic click's mouse position feeds it — settle timing is read
// from the travel prefix only.
function travelPrefix(value) {
  const m = value.match(/^(translate\([^)]*\) scale\([^)]*\))/)
  return m ? m[1] : null
}

// [travelStartMs, settleMs] from a sample stream: the first frame the travel
// prefix departs from the prior framing, and the last frame it changes at all.
function travelWindow(samples) {
  const prefixes = samples.map(([, v]) => travelPrefix(v))
  let start = null
  let settle = null
  for (let i = 1; i < samples.length; i += 1) {
    if (prefixes[i] !== prefixes[i - 1] && prefixes[i] !== null) {
      if (start === null) start = samples[i][0]
      settle = samples[i][0]
    }
  }
  return { travelStartMs: start, settleMs: settle }
}

function within5(measured, expected) {
  const check = (got, want) => Math.abs(got - want) <= Math.max(Math.abs(want) * 0.05, 0.6)
  return (
    check(measured.txPx, expected.txPx) &&
    check(measured.tyPx, expected.tyPx) &&
    check(measured.scale, expected.scale)
  )
}

async function run(browserWs, { caseId, reduced }) {
  const cfg = CASES[caseId]
  const cdp = new Cdp(browserWs)
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  const send = (method, params) => cdp.send(method, params, sessionId)
  const evaljs = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true })
    if (res.exceptionDetails) {
      throw new Error(`page eval failed: ${JSON.stringify(res.exceptionDetails).slice(0, 400)}`)
    }
    return res.result?.value
  }
  const waitFor = async (expression, timeoutMs = 15000) => {
    const start = Date.now()
    for (;;) {
      if (await evaljs(expression)) return
      if (Date.now() - start > timeoutMs) throw new Error(`timeout waiting for: ${expression}`)
      await sleep(120)
    }
  }
  // Trusted-input click at the element's centre (React ignores untrusted
  // el.click() in some load windows; real input always lands).
  const realClick = async (sel) => {
    const point = await evaljs(`(() => {
      const el = document.querySelector(${JSON.stringify(sel)})
      if (!el) return null
      el.scrollIntoView({ block: 'center' })
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    })()`)
    if (!point) return false
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    return true
  }
  // Click until the target appears. The guard expression must turn false once
  // the app advances, so retries become no-ops (early clicks can land inside
  // React's initial commit window and get swallowed — hence the retry).
  // clickSel may be a list: each existing one is clicked per iteration (e.g. a
  // switch button plus the inline-confirmation it can raise).
  const clickUntil = async (targetSel, guardExpr, clickSels, timeoutMs = 15000) => {
    const sels = Array.isArray(clickSels) ? clickSels : [clickSels]
    const start = Date.now()
    for (;;) {
      if (await evaljs(`Boolean(document.querySelector(${JSON.stringify(targetSel)}))`)) return
      if (await evaljs(guardExpr)) {
        for (const sel of sels) await realClick(sel)
      }
      if (Date.now() - start > timeoutMs) {
        const dump = await evaljs(`document.body.innerText.slice(0, 300)`)
        const clicks = await evaljs(`window.__clicks ?? []`)
        const clickSel = sels[0]
        const matched = await evaljs(`(() => {
          const el = document.querySelector(${JSON.stringify(clickSel)})
          return el ? el.outerHTML.slice(0, 220) : 'no match'
        })()`)
        const onTop = await evaljs(`(() => {
          const el = document.querySelector(${JSON.stringify(clickSel)})
          if (!el) return 'click target missing'
          const r = el.getBoundingClientRect()
          const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
          return top ? top.className || top.tagName : 'nothing at point'
        })()`)
        throw new Error(
          `timeout clicking toward: ${targetSel}\n--- matched: ${matched}\n--- elementFromPoint: ${onTop}` +
            `\n--- clicks seen: ${JSON.stringify(clicks)}\n--- page dump ---\n${dump}`,
        )
      }
      await sleep(500)
    }
  }
  const screenshot = async (name) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(`${OUT_DIR}${name}`, Buffer.from(data, 'base64'))
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  })
  if (reduced) {
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    })
  }

  // Case 81 cites a Case 77 precedent: seed the unlocking save BEFORE any app
  // script runs (no reload, no context race). Case 77 runs on a fresh profile,
  // which is already clean. Every run also gets a capture-phase click recorder
  // so a click-timeout can show what input actually reached the page.
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.addEventListener('click', (e) => {
        ;(window.__clicks ||= []).push([e.target.tagName, Math.round(e.clientX), Math.round(e.clientY)])
      }, true)
      ${caseId === 'case-81' ? `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(SEED_SAVE))})` : ''}
    `,
  })
  await send('Page.navigate', { url: APP_URL })
  await waitFor(`document.readyState === 'complete'`)
  await sleep(2500)

  // Title screen → briefing → investigation.
  await waitFor(`Boolean(document.querySelector('.start-screen .button-primary, .start-screen .button-secondary'))`)
  if (caseId === 'case-81') {
    // The switch button is the secondary whose text names Case 81; give it a
    // stable hook for the click helper, then confirm the inline dialog if one
    // appears (seeded save is phase 'landing', so it should not).
    await evaljs(`
      [...document.querySelectorAll('.start-screen button')]
        .find((b) => b.textContent.includes('Case 81'))?.setAttribute('data-ev-switch', '1')
    `)
    await clickUntil(
      '.choice-list button',
      `Boolean(document.querySelector('.start-screen'))`,
      ['[data-ev-switch]', '.inline-confirmation .button-primary'],
    )
  } else {
    await clickUntil(
      '.choice-list button',
      `Boolean(document.querySelector('.start-screen'))`,
      '.start-screen .button-primary',
    )
  }

  // Sampler in place BEFORE the stage mounts, so rest is captured first.
  await evaljs(PAGE_HELPERS)
  await clickUntil(
    '.scene-pgroup',
    `Boolean(document.querySelector('h2#approach-heading'))`,
    '.choice-list button',
  )
  // Keep the stage fully in view (the motion rAF gates on IntersectionObserver)
  // and hold the page still for the rest of the measurement.
  await evaljs(`document.querySelector('.scene-frame')?.scrollIntoView({ block: 'center' })`)
  await sleep(1800)

  const result = { caseId, reduced, authored: cfg }

  if (reduced) {
    // (c) Reduced motion: zero transform change on selection. Sample across a
    // hotspot click; the inline transform must stay 'none' throughout.
    const mountSamples = await evaljs(`window.__ev.samples`)
    await evaljs(`window.__ev.reset()`)
    await realClick(`.scene-hotspot[data-site="${cfg.clickSite}"]`)
    await sleep(1200)
    const clickSamples = await evaljs(`window.__ev.samples`)
    const postMount = mountSamples.filter(([, v]) => v !== '__absent__')
    const transforms = new Set([...postMount, ...clickSamples].map(([, v]) => v))
    result.reducedMotion = {
      mountSamples: postMount,
      clickSamples,
      distinctTransforms: [...transforms],
      zeroChange: transforms.size === 1 && transforms.has('none'),
    }
    await screenshot(`${caseId}-rest-1280x800.png`)
  } else {
    // (a) Mount travel: rest → selection(initial) → settled.
    const mountSamples = (await evaljs(`window.__ev.samples`)).filter(([, v]) => v !== '__absent__')
    const mountSettled = parseTransform(mountSamples.at(-1)?.[1] ?? '')
    const mountExpected = await evaljs(
      `window.__ev.expected(${JSON.stringify(cfg.master)}, ${JSON.stringify(cfg.travel)})`,
    )
    const mountWin = travelWindow(mountSamples)
    result.mount = {
      samples: mountSamples,
      restFraming: mountSamples[0]?.[1] === '(empty)' || mountSamples[0]?.[1] === 'none',
      travelStartMs: mountWin.travelStartMs,
      settleMs: mountWin.settleMs,
      travelDurationMs:
        mountWin.settleMs !== null && mountWin.travelStartMs !== null
          ? mountWin.settleMs - mountWin.travelStartMs
          : null,
      travelInMs: cfg.travel.travelInMs,
      settled: mountSettled,
      expected: mountExpected,
      within5: mountSettled && mountExpected ? within5(mountSettled, mountExpected) : false,
    }

    // (a) Selection change: focused → focused(re-target) → settled. The mouse
    // returns to centre right after the click so the pointer drift unwinds.
    await evaljs(`window.__ev.reset()`)
    await realClick(`.scene-hotspot[data-site="${cfg.clickSite}"]`)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 640, y: 400 })
    await sleep(1400)
    const changeSamples = await evaljs(`window.__ev.samples`)
    const changeWin = travelWindow(changeSamples)
    const settled = parseTransform(changeSamples.at(-1)?.[1] ?? '')
    const expected = await evaljs(
      `window.__ev.expected(${JSON.stringify(cfg.master)}, ${JSON.stringify(cfg.travel)})`,
    )
    result.selectionChange = {
      samples: changeSamples,
      travelStartMs: changeWin.travelStartMs,
      settleMs: changeWin.settleMs,
      travelDurationMs:
        changeWin.settleMs !== null && changeWin.travelStartMs !== null
          ? changeWin.settleMs - changeWin.travelStartMs
          : null,
      travelInMs: cfg.travel.travelInMs,
      settled,
      expected,
      within5: settled && expected ? within5(settled, expected) : false,
    }

    // (d) Hit areas while focused (settled on the clicked site).
    result.hitAreas = await evaljs(`window.__ev.hitAreas()`)
    result.hitAreasOk = result.hitAreas.every((area) => area.w >= 44 && area.h >= 44)
    await screenshot(`${caseId}-focused-1280x800.png`)
  }

  await send('Target.closeTarget', { targetId }).catch(() => cdp.send('Target.closeTarget', { targetId }))
  return result
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const results = []
  // A fresh Chrome profile per run: no shared localStorage, no reload races.
  for (const caseId of ['case-77', 'case-81']) {
    for (const reduced of [false, true]) {
      const { proc, wsUrl } = launchChrome(`${caseId}-${reduced ? 'reduced' : 'motion'}`)
      try {
        const ws = new WebSocket(await wsUrl)
        await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }))
        results.push(await run(ws, { caseId, reduced }))
        ws.close()
      } finally {
        proc.kill('SIGTERM')
      }
    }
  }
  writeFileSync(`${OUT_DIR}travel-measurements.json`, JSON.stringify(results, null, 2))

  // Console summary.
  for (const r of results) {
    if (r.reduced) {
      console.log(
        `[${r.caseId}][reduced] zero transform change on selection: ${r.reducedMotion.zeroChange} ` +
          `(distinct: ${r.reducedMotion.distinctTransforms.join(', ')})`,
      )
    } else {
      const m = r.mount
      const s = r.selectionChange
      console.log(
        `[${r.caseId}] mount: rest=${m.restFraming} travel ${m.travelStartMs}→${m.settleMs}ms ` +
          `(duration ${m.travelDurationMs}ms vs authored ${m.travelInMs}ms) within5%=${m.within5}`,
      )
      console.log(
        `[${r.caseId}] select: travel ${s.travelStartMs}→${s.settleMs}ms ` +
          `(duration ${s.travelDurationMs}ms vs authored ${s.travelInMs}ms ±100) within5%=${s.within5} ` +
          `measured=${JSON.stringify(s.settled)} expected=${JSON.stringify(s.expected)}`,
      )
      console.log(
        `[${r.caseId}] hit areas ≥44px while focused: ${r.hitAreasOk} ` +
          r.hitAreas.map((a) => `${a.site}=${a.w}×${a.h}`).join(' '),
      )
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

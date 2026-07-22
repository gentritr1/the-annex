// Evidence pack generator for the diorama true-3D depth work (plane translateZ
// + authored perspective → genuine differential parallax). Drives the real app
// in headless Chrome over CDP (Node's built-in WebSocket — no new dependencies)
// against a local dev server, and captures for BOTH cases at desktop + mobile:
//   (a) Depth cue: screen-space shift of probe points injected into each plane
//       (background/far/mid/near) and of the live hotspot markers, between two
//       settled pointer swings (left edge ↔ right edge). Expect strict ordering
//       near > mid > far > background.
//   (b) Net rendered scale of every plane once settled. Normal motion proves
//       all planes stay mutually compensated through the initially selected
//       site's focus scale; both reduced gates park the groups at 'none' and
//       prove net scale 1.0 against the frame.
//   (c) Hotspot hit areas ≥44px and marker↔plane coincidence while focused.
//   (d) BOTH reduced-motion gates (OS media query and in-app Access setting):
//       both group transforms stay 'none' across a selection click (flat), plus
//       deterministic rest screenshots for pixel-diffing against baseline.
// CSS transitions are disabled before every computed-style/rect read (the
// pane's transition clock is unreliable — see scripts/evidence-travel.mjs).
//
// Usage: node scripts/evidence-depth.mjs <app-url> [out-suffix]
// Canonical run: node scripts/evidence-depth.mjs http://localhost:5199/ true-3d-final
// Writes depth-measurements-<suffix>.json + depth-rest/focused-*.png into evidence/.
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://localhost:5199/'
const AUTHORITATIVE_SUFFIX = 'true-3d-final'
const RUN_SUFFIX = (process.argv[3] ?? 'local').replace(/[^a-zA-Z0-9._-]/g, '-')
const SUFFIX = `-${RUN_SUFFIX}`
const OUT_DIR = new URL('../evidence/', import.meta.url).pathname
const REST_PIXEL_TOLERANCE = 2
const COINCIDENCE_PIXEL_TOLERANCE = 2
const EXPECTED_HOTSPOTS_PER_CASE = 4

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
}

const REDUCTION_MODES = ['motion', 'os-reduced', 'app-reduced']

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

const CASES = {
  // Keep evidence focus targets on the shared diorama; these sites do not swap
  // the inspector to a generated close-read plate.
  'case-77': { clickSite: 'registry', expectsFigure: false },
  'case-81': { clickSite: 'counsel-office', expectsFigure: true },
}

// Injected into the page after the stage mounts. All reads happen with CSS
// transitions killed (KILL_TRANSITIONS). Probes: one div per plane at
// (15%, 50%) and (85%, 50%) of the plane box — they inherit the plane's own
// static transform, so their screen rects are the plane's rendered positions.
const PAGE_HELPERS = `
window.__ev = (() => {
  const KILL_ID = 'ev-kill-transitions'
  const killTransitions = () => {
    if (document.getElementById(KILL_ID)) return
    const st = document.createElement('style')
    st.id = KILL_ID
    st.textContent = '* { transition: none !important }'
    document.head.appendChild(st)
  }
  const planeNames = ['background', 'far', 'mid', 'near']
  const probeIds = []
  const injectProbes = () => {
    if (document.querySelector('[data-ev-probe]')) return probeIds.length
    for (const name of planeNames) {
      const plane = document.querySelector('.scene-layer-' + name)
      if (!plane) continue
      for (const [tag, left] of [['a', 15], ['b', 85]]) {
        const d = document.createElement('div')
        d.setAttribute('data-ev-probe', name + '-' + tag)
        d.style.cssText =
          'position:absolute;left:' + left + '%;top:50%;width:12px;height:12px;' +
          'margin:-6px 0 0 -6px;background:magenta;pointer-events:none'
        plane.appendChild(d)
        probeIds.push(name + '-' + tag)
      }
    }
    return probeIds.length
  }
  const centers = (selector, attr) =>
    [...document.querySelectorAll(selector)].map((el) => {
      const r = el.getBoundingClientRect()
      return { id: attr ? el.getAttribute(attr) : el.className, x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }
    })
  const groupState = (selector) => {
    const el = document.querySelector(selector)
    if (!el) return null
    const cs = getComputedStyle(el)
    return {
      inlineTransform: el.style.transform || 'none',
      computedTransform: cs.transform,
      transformStyle: cs.transformStyle,
      transformOrigin: cs.transformOrigin,
    }
  }
  const scene3d = () => {
    const frame = document.querySelector('.scene-frame')
    const stack = document.querySelector('.scene-stack')
    const hotspots = document.querySelector('.scene-hotspots')
    const frameStyle = frame ? getComputedStyle(frame) : null
    const stackStyle = stack ? getComputedStyle(stack) : null
    const hotspotStyle = hotspots ? getComputedStyle(hotspots) : null
    return {
      framePerspective: frameStyle?.perspective ?? null,
      framePerspectiveOrigin: frameStyle?.perspectiveOrigin ?? null,
      stackTransformStyle: stackStyle?.transformStyle ?? null,
      hotspotPerspective: hotspotStyle?.perspective ?? null,
      hotspotPerspectiveOrigin: hotspotStyle?.perspectiveOrigin ?? null,
      pgroup: groupState('.scene-pgroup'),
      hgroup: groupState('.scene-hgroup'),
    }
  }
  return {
    killTransitions,
    injectProbes,
    removeProbes() {
      document.querySelectorAll('[data-ev-probe]').forEach((el) => el.remove())
      probeIds.length = 0
    },
    probeCount: () => probeIds.length,
    snapshot() {
      killTransitions()
      return {
        frame: (() => {
          const r = document.querySelector('.scene-frame').getBoundingClientRect()
          return { x: r.x, y: r.y, w: r.width, h: r.height }
        })(),
        planes: planeNames.map((n) => {
          const el = document.querySelector('.scene-layer-' + n)
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { name: n, transform: getComputedStyle(el).transform, x: r.x, y: r.y, w: r.width, h: r.height }
        }),
        hplanes: [...document.querySelectorAll('.scene-hplane')].map((el) => {
          const r = el.getBoundingClientRect()
          return {
            site: el.querySelector('.scene-hotspot')?.dataset.site ?? null,
            plane: el.dataset.plane ?? null,
            x: r.x,
            y: r.y,
            w: r.width,
            h: r.height,
          }
        }),
        probes: centers('[data-ev-probe]', 'data-ev-probe'),
        markers: centers('.scene-hotspot', 'data-site'),
        scene3d: scene3d(),
      }
    },
    motionGates() {
      const appToggle = document.querySelector('.header-preferences input[type="checkbox"]')
      return {
        osReduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
        appReduced: Boolean(document.querySelector('.reduce-motion')),
        appToggleChecked: appToggle instanceof HTMLInputElement ? appToggle.checked : null,
      }
    },
    hitAreas() {
      killTransitions()
      return [...document.querySelectorAll('.scene-hotspot')].map((el) => {
        const r = el.getBoundingClientRect()
        return { site: el.dataset.site, plane: el.closest('.scene-hplane')?.dataset.plane ?? null, w: +r.width.toFixed(2), h: +r.height.toFixed(2) }
      })
    },
    // Marker↔plane coincidence: for every hotspot, project its authored master
    // coords through its OWN plane by planting a temporary probe at the same
    // normalized position, then compare screen centres.
    coincidence() {
      killTransitions()
      const out = []
      for (const btn of document.querySelectorAll('.scene-hotspot')) {
        const hplane = btn.closest('.scene-hplane')
        const planeName = hplane?.dataset.plane
        const plane = planeName ? document.querySelector('.scene-layer-' + planeName) : null
        if (!plane) continue
        const probe = document.createElement('div')
        probe.style.cssText =
          'position:absolute;left:' + btn.style.left + ';top:' + btn.style.top +
          ';width:4px;height:4px;margin:-2px 0 0 -2px;background:lime;pointer-events:none'
        plane.appendChild(probe)
        const br = btn.getBoundingClientRect()
        const pr = probe.getBoundingClientRect()
        out.push({
          site: btn.dataset.site,
          plane: planeName,
          dx: +(br.x + br.width / 2 - (pr.x + pr.width / 2)).toFixed(2),
          dy: +(br.y + br.height / 2 - (pr.y + pr.height / 2)).toFixed(2),
        })
        probe.remove()
      }
      return out
    },
    // The figure is authored in master coordinates and declares the scene plane
    // it belongs to. Plant a point at its projected anchor inside that plane and
    // compare it with the composited plate's visual centre. This catches a plate
    // left outside .scene-pgroup: it can look correct at rest but detach on focus.
    figureCoincidence() {
      killTransitions()
      const figure = document.querySelector('.scene-figure')
      if (!figure) return { present: false, applicable: false, ok: true }
      const planeName = figure.dataset.plane
      const plane = planeName ? document.querySelector('.scene-layer-' + planeName) : null
      const pgroup = document.querySelector('.scene-pgroup')
      if (!plane) {
        return {
          present: true,
          applicable: true,
          plane: planeName ?? null,
          planeFound: false,
          insidePgroup: Boolean(pgroup?.contains(figure)),
          ok: false,
        }
      }
      const probe = document.createElement('div')
      probe.setAttribute('data-ev-figure-probe', '1')
      probe.style.cssText =
        'position:absolute;left:' + figure.style.left + ';top:' + figure.style.top +
        ';width:4px;height:4px;margin:-2px 0 0 -2px;background:lime;pointer-events:none'
      plane.appendChild(probe)
      const fr = figure.getBoundingClientRect()
      const pr = probe.getBoundingClientRect()
      const dx = +(fr.x + fr.width / 2 - (pr.x + pr.width / 2)).toFixed(2)
      const dy = +(fr.y + fr.height / 2 - (pr.y + pr.height / 2)).toFixed(2)
      const insidePgroup = Boolean(pgroup?.contains(figure))
      const distance = +Math.hypot(dx, dy).toFixed(2)
      const cs = getComputedStyle(figure)
      probe.remove()
      return {
        present: true,
        applicable: true,
        plane: planeName ?? null,
        planeFound: true,
        insidePgroup,
        transform: cs.transform,
        transformStyle: cs.transformStyle,
        dx,
        dy,
        distance,
        ok: insidePgroup && distance <= ${COINCIDENCE_PIXEL_TOLERANCE},
      }
    },
  }
})()
`

function launchChrome(tag) {
  const proc = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=/tmp/annex-depth-${tag}-${Date.now()}`,
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

async function run(browserWs, { caseId, reductionMode, viewportName }) {
  const cfg = CASES[caseId]
  const viewport = VIEWPORTS[viewportName]
  const reduced = reductionMode !== 'motion'
  const cdp = new Cdp(browserWs)
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  const send = (method, params) => cdp.send(method, params, sessionId)
  const evaljs = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
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
  const clickUntil = async (targetSel, guardExpr, clickSels, timeoutMs = 15000) => {
    const sels = Array.isArray(clickSels) ? clickSels : [clickSels]
    const start = Date.now()
    for (;;) {
      if (await evaljs(`Boolean(document.querySelector(${JSON.stringify(targetSel)}))`)) return
      if (await evaljs(guardExpr)) {
        for (const sel of sels) await realClick(sel)
      }
      if (Date.now() - start > timeoutMs) throw new Error(`timeout clicking toward: ${targetSel}`)
      await sleep(500)
    }
  }
  const screenshot = async (name) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(`${OUT_DIR}${name}`, Buffer.from(data, 'base64'))
  }
  // Park the pointer at a viewport point and wait until every probe's screen
  // centre is stable (drift ease is 0.03/frame — poll instead of guessing).
  const swingAndSettle = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
    let prev = null
    for (let i = 0; i < 40; i += 1) {
      await sleep(400)
      const snap = await evaljs(`window.__ev.snapshot()`)
      const cur = JSON.stringify(snap.probes.map((p) => [Math.round(p.x * 20), Math.round(p.y * 20)]))
      if (cur === prev) return snap
      prev = cur
    }
    throw new Error('drift never settled')
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
  })
  if (reductionMode === 'os-reduced') {
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    })
  }
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: caseId === 'case-81' ? `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(SEED_SAVE))})` : '',
  })
  await send('Page.navigate', { url: APP_URL })
  await waitFor(`document.readyState === 'complete'`)
  await sleep(2500)

  await waitFor(`Boolean(document.querySelector('.start-screen .button-primary, .start-screen .button-secondary'))`)
  if (reductionMode === 'app-reduced') {
    await realClick('.start-preferences > summary')
    await realClick('.start-preferences input[type="checkbox"]')
    await waitFor(`document.querySelector('.start-preferences input[type="checkbox"]')?.checked === true`)
  }
  if (caseId === 'case-81') {
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
  await clickUntil(
    '.scene-pgroup',
    `Boolean(document.querySelector('h2#approach-heading'))`,
    '.choice-list button',
  )
  await evaljs(`document.querySelector('.scene-frame')?.scrollIntoView({ block: 'center' })`)
  await evaljs(PAGE_HELPERS)
  await waitFor(`!document.querySelector('.scene-figure') || (document.querySelector('.scene-figure-plate')?.complete && document.querySelector('.scene-figure-plate')?.naturalWidth > 0)`)
  await sleep(1800)

  const result = {
    caseId,
    viewport: { name: viewportName, ...viewport },
    reductionMode,
    reduced,
    focusSite: cfg.clickSite,
    gates: await evaljs(`window.__ev.motionGates()`),
  }

  if (reduced) {
    // (d) Reduced motion: flat. Capture the PRISTINE rest frame first (no
    // clicks, no probes — a click's scrollIntoView could scroll the stage's
    // ancestors, and pre-hardening code let it scroll the frame itself), then
    // prove the group transform stays 'none' across a selection click.
    const before = await evaljs(`window.__ev.snapshot()`)
    const figureBefore = await evaljs(`window.__ev.figureCoincidence()`)
    await screenshot(`${caseId}-depth-rest-${reductionMode}${SUFFIX}-${viewport.width}x${viewport.height}.png`)
    await realClick(`.scene-hotspot[data-site="${cfg.clickSite}"]`)
    await sleep(250)
    await evaljs(`document.querySelector('.scene-frame')?.scrollIntoView({ block: 'center' })`)
    await sleep(1200)
    const after = await evaljs(`window.__ev.snapshot()`)
    const figureAfter = await evaljs(`window.__ev.figureCoincidence()`)
    result.reducedMotion = {
      scene3dBefore: before.scene3d,
      scene3dAfter: after.scene3d,
      // Rest geometry at transform 'none': the net plane scales + marker
      // centres, for an exact before/after framing comparison (constraint 4).
      planes: before.planes.map((p) =>
        p
          ? {
              name: p.name,
              netScaleX: +(p.w / before.frame.w).toFixed(4),
              netScaleY: +(p.h / before.frame.h).toFixed(4),
              frameDeltaW: +Math.abs(p.w - before.frame.w).toFixed(2),
              frameDeltaH: +Math.abs(p.h - before.frame.h).toFixed(2),
              x: +p.x.toFixed(2),
              y: +p.y.toFixed(2),
              w: +p.w.toFixed(2),
              h: +p.h.toFixed(2),
            }
          : null,
      ),
      frame: before.frame,
      markers: before.markers,
      figureBefore,
      figureAfter,
      flat: [before.scene3d.pgroup, before.scene3d.hgroup, after.scene3d.pgroup, after.scene3d.hgroup].every(
        (group) => group && group.inlineTransform === 'none' && group.computedTransform === 'none',
      ),
    }
  } else {
    await evaljs(`window.__ev.injectProbes()`)
    // (b) Settled framing: park the pointer dead centre and wait for drift to
    // die, then verify the initially selected site's uniform focus scale does
    // not disturb the per-plane depth compensation.
    const rest = await swingAndSettle(viewport.width / 2, viewport.height / 2)
    result.rest = {
      frame: rest.frame,
      planes: rest.planes.map((p) =>
        p
          ? {
              name: p.name,
              transform: p.transform,
              netScaleX: +(p.w / rest.frame.w).toFixed(4),
              netScaleY: +(p.h / rest.frame.h).toFixed(4),
              frameDeltaW: +Math.abs(p.w - rest.frame.w).toFixed(2),
              frameDeltaH: +Math.abs(p.h - rest.frame.h).toFixed(2),
            }
          : null,
      ),
      hplanes: rest.hplanes.map((p) =>
        p
          ? {
              site: p.site,
              plane: p.plane,
              netScaleX: +(p.w / rest.frame.w).toFixed(4),
              netScaleY: +(p.h / rest.frame.h).toFixed(4),
              frameDeltaW: +Math.abs(p.w - rest.frame.w).toFixed(2),
              frameDeltaH: +Math.abs(p.h - rest.frame.h).toFixed(2),
            }
          : null,
      ),
      scene3d: rest.scene3d,
      figureCoincidence: await evaljs(`window.__ev.figureCoincidence()`),
    }
    await evaljs(`window.__ev.removeProbes()`)
    await screenshot(`${caseId}-depth-rest-motion${SUFFIX}-${viewport.width}x${viewport.height}.png`)
    await evaljs(`window.__ev.injectProbes()`)

    // (a) Depth cue: settle at the left edge, then the right edge; the shift of
    // each probe/marker between the two settled states is its parallax travel.
    const left = await swingAndSettle(0, viewport.height / 2)
    const right = await swingAndSettle(viewport.width - 1, viewport.height / 2)
    const shift = (a, b) => ({
      dx: +(b.x - a.x).toFixed(2),
      dy: +(b.y - a.y).toFixed(2),
      mag: +Math.hypot(b.x - a.x, b.y - a.y).toFixed(2),
    })
    const byId = (list) => Object.fromEntries(list.map((p) => [p.id, p]))
    const L = byId(left.probes)
    const R = byId(right.probes)
    result.swing = {
      pointer: { from: [0, viewport.height / 2], to: [viewport.width - 1, viewport.height / 2] },
      scene3dAtLeft: left.scene3d,
      scene3dAtRight: right.scene3d,
      probes: Object.keys(L).map((id) => ({ id, ...shift(L[id], R[id]) })),
      markers: (() => {
        const ML = byId(left.markers)
        const MR = byId(right.markers)
        return Object.keys(ML).map((id) => ({ id, ...shift(ML[id], MR[id]) }))
      })(),
    }
    // Strict depth ordering on the mean of each plane's two probes.
    const planeShift = {}
    for (const name of ['background', 'far', 'mid', 'near']) {
      const pair = result.swing.probes.filter((p) => p.id.startsWith(name + '-'))
      if (pair.length) planeShift[name] = +(pair.reduce((s, p) => s + Math.abs(p.dx), 0) / pair.length).toFixed(2)
    }
    result.swing.planeShift = planeShift
    result.swing.strictOrder =
      planeShift.near > planeShift.mid &&
      planeShift.mid > planeShift.far &&
      planeShift.far > planeShift.background

    // (c) Focus a site: hit areas ≥44px and marker↔plane coincidence.
    await realClick(`.scene-hotspot[data-site="${cfg.clickSite}"]`)
    await sleep(250)
    await evaljs(`document.querySelector('.scene-frame')?.scrollIntoView({ block: 'center' })`)
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: viewport.width / 2,
      y: viewport.height / 2,
    })
    // Wait out the travel window (authored ≤520ms) before reading.
    await sleep(1600)
    result.focusScene3d = (await evaljs(`window.__ev.snapshot()`)).scene3d
    result.hitAreas = await evaljs(`window.__ev.hitAreas()`)
    result.hitAreasOk = result.hitAreas.every((a) => a.w >= 44 && a.h >= 44)
    result.coincidence = await evaljs(`window.__ev.coincidence()`)
    result.coincidenceOk = result.coincidence.every(
      (c) => Math.hypot(c.dx, c.dy) <= COINCIDENCE_PIXEL_TOLERANCE,
    )
    result.figureCoincidence = await evaljs(`window.__ev.figureCoincidence()`)
    // Probes are measurement scaffolding — strip them before the artifact shot.
    await evaljs(`window.__ev.removeProbes()`)
    await sleep(150)
    await screenshot(`${caseId}-depth-focused${SUFFIX}-${viewport.width}x${viewport.height}.png`)
  }

  await send('Target.closeTarget', { targetId }).catch(() => cdp.send('Target.closeTarget', { targetId }))
  return result
}

function commandOutput(command, args) {
  try {
    return execFileSync(command, args, { cwd: new URL('..', import.meta.url), encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

function captureMetadata() {
  const status = commandOutput('git', ['status', '--porcelain', '--untracked-files=normal'])
  const motionSource = readFileSync(new URL('../src/scene/motion.ts', import.meta.url), 'utf8')
  return {
    capturedAt: new Date().toISOString(),
    appUrl: APP_URL,
    captureSuffix: RUN_SUFFIX,
    authoritativeSuffix: AUTHORITATIVE_SUFFIX,
    authoritative: RUN_SUFFIX === AUTHORITATIVE_SUFFIX,
    viewportMatrix: VIEWPORTS,
    reductionModes: REDUCTION_MODES,
    chrome: commandOutput(CHROME, ['--version']),
    node: process.version,
    git: {
      head: commandOutput('git', ['rev-parse', 'HEAD']),
      dirty: status === null ? null : status.length > 0,
      changedPathCount: status ? status.split('\n').filter(Boolean).length : 0,
    },
    thresholds: {
      restFrameDeltaPx: REST_PIXEL_TOLERANCE,
      hotspotMinPx: 44,
      coincidencePx: COINCIDENCE_PIXEL_TOLERANCE,
      hotspotsPerCase: EXPECTED_HOTSPOTS_PER_CASE,
    },
    motionRafTokenCount: (motionSource.match(/requestAnimationFrame/g) ?? []).length,
  }
}

function validate(results, metadata) {
  const failures = []
  let checkCount = 0
  const check = (condition, message) => {
    checkCount += 1
    if (!condition) failures.push(message)
  }
  const key = (r) => `${r.caseId}/${r.viewport.name}/${r.reductionMode}`
  const checkRestPlanes = (planes, label) => {
    const present = planes.filter(Boolean)
    check(present.length === 4, `${label}: expected 4 art planes, got ${present.length}`)
    for (const plane of present) {
      check(
        plane.frameDeltaW <= REST_PIXEL_TOLERANCE && plane.frameDeltaH <= REST_PIXEL_TOLERANCE,
        `${label}: ${plane.name} rest framing differs by ${plane.frameDeltaW}px × ${plane.frameDeltaH}px`,
      )
    }
  }
  const checkCompensatedPlanes = (planes, frame, label) => {
    const present = planes.filter(Boolean)
    check(present.length === 4, `${label}: expected 4 art planes, got ${present.length}`)
    const reference = present[0]
    if (!reference) return
    for (const plane of present) {
      const deltaW = Math.abs(plane.netScaleX - reference.netScaleX) * frame.w
      const deltaH = Math.abs(plane.netScaleY - reference.netScaleY) * frame.h
      check(
        deltaW <= REST_PIXEL_TOLERANCE && deltaH <= REST_PIXEL_TOLERANCE,
        `${label}: ${plane.name} compensation diverges by ${deltaW.toFixed(2)}px × ${deltaH.toFixed(2)}px`,
      )
    }
  }
  const checkScene3d = (scene3d, label) => {
    check(
      Number.parseFloat(scene3d?.framePerspective) > 0,
      `${label}: frame perspective is not active (${scene3d?.framePerspective})`,
    )
    check(
      Number.parseFloat(scene3d?.hotspotPerspective) > 0,
      `${label}: hotspot perspective is not active (${scene3d?.hotspotPerspective})`,
    )
    check(
      scene3d?.stackTransformStyle === 'preserve-3d',
      `${label}: scene stack transform-style is ${scene3d?.stackTransformStyle}`,
    )
    check(
      scene3d?.pgroup?.transformStyle === 'preserve-3d',
      `${label}: pgroup transform-style is ${scene3d?.pgroup?.transformStyle}`,
    )
    check(
      scene3d?.hgroup?.transformStyle === 'preserve-3d',
      `${label}: hgroup transform-style is ${scene3d?.hgroup?.transformStyle}`,
    )
  }
  const checkMirroredGroups = (scene3d, label) => {
    check(
      scene3d?.pgroup?.inlineTransform === scene3d?.hgroup?.inlineTransform,
      `${label}: group inline transforms diverged`,
    )
    check(
      scene3d?.pgroup?.computedTransform === scene3d?.hgroup?.computedTransform,
      `${label}: group computed transforms diverged`,
    )
  }
  const checkFigure = (figure, expectsFigure, label) => {
    check(
      figure?.present === expectsFigure,
      `${label}: expected figure present=${expectsFigure}, got ${figure?.present}`,
    )
    if (expectsFigure) {
      check(figure?.insidePgroup === true, `${label}: figure is outside .scene-pgroup`)
      check(figure?.planeFound === true, `${label}: figure's authored plane was not found`)
      check(
        figure?.distance <= COINCIDENCE_PIXEL_TOLERANCE,
        `${label}: figure detached from authored plane by ${figure?.distance}px`,
      )
      check(figure?.ok === true, `${label}: figure coincidence check failed`)
    }
  }

  check(Boolean(metadata.chrome), 'Chrome version metadata is missing')
  check(Boolean(metadata.git.head), 'Git HEAD metadata is missing')
  check(typeof metadata.git.dirty === 'boolean', 'Git dirty-state metadata is missing')
  check(metadata.motionRafTokenCount === 3, `motion.ts rAF token count is ${metadata.motionRafTokenCount}, expected 3`)
  check(
    results.length === Object.keys(CASES).length * Object.keys(VIEWPORTS).length * REDUCTION_MODES.length,
    `run matrix incomplete: got ${results.length} results`,
  )

  for (const result of results) {
    const label = key(result)
    const expectsFigure = CASES[result.caseId].expectsFigure
    if (!result.reduced) {
      check(result.gates.osReduced === false, `${label}: OS reduction unexpectedly active`)
      check(result.gates.appReduced === false, `${label}: app reduction unexpectedly active`)
      checkScene3d(result.rest.scene3d, `${label}/rest`)
      checkMirroredGroups(result.rest.scene3d, `${label}/rest`)
      checkMirroredGroups(result.swing.scene3dAtLeft, `${label}/swing-left`)
      checkMirroredGroups(result.swing.scene3dAtRight, `${label}/swing-right`)
      checkScene3d(result.focusScene3d, `${label}/focused`)
      checkMirroredGroups(result.focusScene3d, `${label}/focused`)
      checkCompensatedPlanes(result.rest.planes, result.rest.frame, `${label}/settled`)
      const hplanes = result.rest.hplanes.filter(Boolean)
      check(
        hplanes.length === EXPECTED_HOTSPOTS_PER_CASE,
        `${label}: expected ${EXPECTED_HOTSPOTS_PER_CASE} hotspot plane instances, got ${hplanes.length}`,
      )
      const reference = result.rest.planes.find(Boolean)
      if (reference) {
        for (const plane of hplanes) {
          const deltaW = Math.abs(plane.netScaleX - reference.netScaleX) * result.rest.frame.w
          const deltaH = Math.abs(plane.netScaleY - reference.netScaleY) * result.rest.frame.h
          check(
            deltaW <= REST_PIXEL_TOLERANCE && deltaH <= REST_PIXEL_TOLERANCE,
            `${label}: hotspot plane ${plane.site}/${plane.plane} diverges from art by ${deltaW.toFixed(2)}px × ${deltaH.toFixed(2)}px`,
          )
        }
      }
      check(result.swing.strictOrder === true, `${label}: depth shift is not near > mid > far > background`)
      check(
        result.hitAreas.length === EXPECTED_HOTSPOTS_PER_CASE,
        `${label}: expected ${EXPECTED_HOTSPOTS_PER_CASE} hotspots, got ${result.hitAreas.length}`,
      )
      check(result.hitAreasOk === true, `${label}: one or more hotspots is smaller than 44px`)
      check(
        result.coincidence.length === EXPECTED_HOTSPOTS_PER_CASE,
        `${label}: expected ${EXPECTED_HOTSPOTS_PER_CASE} coincidence probes, got ${result.coincidence.length}`,
      )
      check(result.coincidenceOk === true, `${label}: a hotspot is more than 2px off-plane`)
      checkFigure(result.rest.figureCoincidence, expectsFigure, `${label}/figure-rest`)
      checkFigure(result.figureCoincidence, expectsFigure, `${label}/figure-focused`)
    } else {
      check(
        result.gates.osReduced === (result.reductionMode === 'os-reduced'),
        `${label}: OS reduction gate does not match the requested mode`,
      )
      check(
        result.gates.appReduced === (result.reductionMode === 'app-reduced'),
        `${label}: app reduction gate does not match the requested mode`,
      )
      if (result.reductionMode === 'app-reduced') {
        check(result.gates.appToggleChecked === true, `${label}: Access → Reduce motion is not checked`)
      }
      check(result.reducedMotion.flat === true, `${label}: pgroup/hgroup moved under reduced motion`)
      checkScene3d(result.reducedMotion.scene3dBefore, `${label}/before`)
      checkMirroredGroups(result.reducedMotion.scene3dBefore, `${label}/before`)
      checkMirroredGroups(result.reducedMotion.scene3dAfter, `${label}/after`)
      checkRestPlanes(result.reducedMotion.planes, `${label}/rest`)
      checkFigure(result.reducedMotion.figureBefore, expectsFigure, `${label}/figure-before`)
      checkFigure(result.reducedMotion.figureAfter, expectsFigure, `${label}/figure-after`)
    }
  }

  for (const viewportName of Object.keys(VIEWPORTS)) {
    const hotspotCount = results
      .filter((r) => !r.reduced && r.viewport.name === viewportName)
      .reduce((sum, r) => sum + r.hitAreas.length, 0)
    check(hotspotCount === 8, `${viewportName}: expected 8 measured hotspots across both cases, got ${hotspotCount}`)
  }

  return { passed: failures.length === 0, checkCount, failures }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const metadata = captureMetadata()
  const results = []
  for (const caseId of Object.keys(CASES)) {
    for (const viewportName of Object.keys(VIEWPORTS)) {
      for (const reductionMode of REDUCTION_MODES) {
        const tag = `${caseId}-${viewportName}-${reductionMode}`
        const { proc, wsUrl } = launchChrome(tag)
        try {
          const ws = new WebSocket(await wsUrl)
          await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }))
          results.push(await run(ws, { caseId, reductionMode, viewportName }))
          ws.close()
        } finally {
          proc.kill('SIGTERM')
        }
      }
    }
  }

  const acceptance = validate(results, metadata)
  const artifact = { metadata, acceptance, results }
  const out = `${OUT_DIR}depth-measurements${SUFFIX}.json`
  writeFileSync(out, JSON.stringify(artifact, null, 2))
  console.log('wrote', out)

  for (const result of results) {
    const label = `${result.caseId}/${result.viewport.name}/${result.reductionMode}`
    if (result.reduced) {
      console.log(`[${label}] flat=${result.reducedMotion.flat}`)
    } else {
      console.log(
        `[${label}] rest net scales: ` +
          result.rest.planes.map((p) => (p ? `${p.name}=${p.netScaleX}` : '?')).join(' '),
      )
      console.log(
        `[${label}] swing Δpx: ` +
          Object.entries(result.swing.planeShift).map(([name, value]) => `${name}=${value}`).join(' ') +
          ` strictOrder=${result.swing.strictOrder}`,
      )
      console.log(
        `[${label}] hitAreasOk=${result.hitAreasOk} coincidenceOk=${result.coincidenceOk} figureOk=${result.figureCoincidence.ok}`,
      )
    }
  }

  console.log(`acceptance=${acceptance.passed ? 'PASS' : 'FAIL'} checks=${acceptance.checkCount}`)
  for (const failure of acceptance.failures) console.error(`FAIL: ${failure}`)
  if (!acceptance.passed) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

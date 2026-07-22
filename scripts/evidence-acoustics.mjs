// Focused live evidence for Case 77's bounded-world acoustic perspective.
//
// Drives the real Vite app with raw CDP and Node's built-in WebSocket. No test
// dependency and no Web Audio internals are reached: every assertion reads the
// public development-only window.__annexAmbient.getSnapshot() contract.
//
// Usage: node scripts/evidence-acoustics.mjs [app-url]
// Default: http://127.0.0.1:7100/
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = process.argv[2] ?? 'http://127.0.0.1:7100/'
const OUT_DIR = new URL('../evidence/case77-acoustics/', import.meta.url).pathname
const SAVE_KEY = 'the-annex.case-77.save.v1'
const SETTINGS_KEY = 'the-annex.accessibility.v1'
const EPSILON = 1e-9
const ROOM_TONE_CEILING = 0.014
const ROOM_HUM_CEILING = 0.0014
const QUIET_WEATHER_CEILING = 0.038

const SETTINGS = {
  reducedMotion: false,
  highContrast: false,
  textSize: 'standard',
  showTrustNumbers: false,
  ambientSound: false,
}

function investigationSave(caseId, { alarm = 0, settings = SETTINGS } = {}) {
  return {
    schemaVersion: 2,
    caseId,
    phase: 'investigation',
    runNumber: 1,
    primaryApproach: 'procedure',
    completedSites: [],
    completedActions: [],
    evidence: [],
    methodTags: [],
    trust: { registrar: 0, shepherd: 0, defector: 0, archivist: 0 },
    alarm,
    tribunalOverride: false,
    selectedFragments: [],
    reconstruction: null,
    decision: null,
    depositionRecord: null,
    events: [],
    previousRuns: [],
    precedents: { 'case-77': 'charter-new-person' },
    settings,
    announcement: `Acoustic evidence seed for ${caseId}.`,
  }
}

// Independent expectations: these are deliberately not scraped from the page.
// A content/runtime mismatch therefore fails instead of agreeing with itself.
const TREATMENTS = {
  concourse: {
    weatherLevel: 0.38,
    weatherCutoffHz: 720,
    roomLevel: 0.85,
    roomCutoffHz: 190,
    humHz: 54,
    humLevel: 0.42,
  },
  registry: {
    weatherLevel: 0.18,
    weatherCutoffHz: 560,
    roomLevel: 0.68,
    roomCutoffHz: 230,
    humHz: 61,
    humLevel: 0.28,
  },
  'care-ward': {
    weatherLevel: 0.52,
    weatherCutoffHz: 1450,
    roomLevel: 0.42,
    roomCutoffHz: 260,
    humHz: 48,
    humLevel: 0.12,
  },
  maintenance: {
    weatherLevel: 0.32,
    weatherCutoffHz: 850,
    roomLevel: 0.9,
    roomCutoffHz: 170,
    humHz: 52,
    humLevel: 0.65,
  },
  'small-archive': {
    weatherLevel: 0.12,
    weatherCutoffHz: 460,
    roomLevel: 0.55,
    roomCutoffHz: 150,
    humHz: 63,
    humLevel: 0.2,
  },
}

const SITE_IDS = ['registry', 'care-ward', 'maintenance', 'small-archive']
const ALARM_PRESSURE = [
  { roomMul: 1, humMul: 1, cutoffMul: 1 },
  { roomMul: 1.03, humMul: 1.08, cutoffMul: 0.98 },
  { roomMul: 1.07, humMul: 1.18, cutoffMul: 0.94 },
  { roomMul: 1.12, humMul: 1.3, cutoffMul: 0.9 },
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const closeEnough = (actual, expected) =>
  typeof actual === 'number' && Math.abs(actual - expected) <= EPSILON

function expectedTargets(treatment, alarmTier) {
  if (!treatment) {
    return {
      alarmTier,
      spatialActive: false,
      weatherDryTarget: 1,
      weatherSpatialTarget: 0,
      weatherCutoffTarget: 12000,
      roomToneTarget: 0,
      roomCutoffTarget: 180,
      roomHumFrequencyTarget: 54,
      roomHumTarget: 0,
    }
  }
  const pressure = ALARM_PRESSURE[alarmTier]
  return {
    alarmTier,
    spatialActive: true,
    weatherDryTarget: 0,
    weatherSpatialTarget: treatment.weatherLevel,
    weatherCutoffTarget: treatment.weatherCutoffHz,
    roomToneTarget: Math.min(
      ROOM_TONE_CEILING,
      ROOM_TONE_CEILING * treatment.roomLevel * pressure.roomMul,
    ),
    roomCutoffTarget: treatment.roomCutoffHz * pressure.cutoffMul,
    roomHumFrequencyTarget: treatment.humHz,
    roomHumTarget: Math.min(
      ROOM_HUM_CEILING,
      ROOM_HUM_CEILING * treatment.humLevel * pressure.humMul,
    ),
  }
}

function targetView(snapshot) {
  if (!snapshot) return null
  return {
    alarmTier: snapshot.alarmTier,
    spatialActive: snapshot.spatialActive,
    weatherDryTarget: snapshot.weatherDryTarget,
    weatherSpatialTarget: snapshot.weatherSpatialTarget,
    weatherCutoffTarget: snapshot.weatherCutoffTarget,
    roomToneTarget: snapshot.roomToneTarget,
    roomCutoffTarget: snapshot.roomCutoffTarget,
    roomHumFrequencyTarget: snapshot.roomHumFrequencyTarget,
    roomHumTarget: snapshot.roomHumTarget,
  }
}

function targetsMatch(snapshot, expected) {
  const actual = targetView(snapshot)
  if (!actual) return false
  return Object.entries(expected).every(([key, value]) =>
    typeof value === 'number' ? closeEnough(actual[key], value) : actual[key] === value,
  )
}

function targetsStable(left, right) {
  return JSON.stringify(targetView(left)) === JSON.stringify(targetView(right))
}

function launchChrome(tag) {
  const chromeProcess = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=/tmp/annex-acoustics-${tag}-${Date.now()}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    '--hide-scrollbars',
    '--enable-webgl',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
    'about:blank',
  ])
  const wsUrl = new Promise((resolve, reject) => {
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
      reject(
        new Error(
          `Chrome exited before CDP attached (${code ?? 'unknown'}): ${stderr.trim().slice(-1200)}`,
        ),
      )
    })
  })
  return { chromeProcess, wsUrl }
}

class CdpClient {
  constructor(socket) {
    this.socket = socket
    this.nextId = 1
    this.pending = new Map()
    this.exceptions = []
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.method === 'Runtime.exceptionThrown') {
        this.exceptions.push(message.params?.exceptionDetails?.text ?? 'page exception')
      }
      if (!message.id || !this.pending.has(message.id)) return
      const { resolve, reject } = this.pending.get(message.id)
      this.pending.delete(message.id)
      if (message.error) reject(new Error(message.error.message))
      else resolve(message.result)
    })
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId
    this.nextId += 1
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.socket.send(JSON.stringify({ id, method, params, sessionId }))
    })
  }
}

async function openEvidencePage(tag, save) {
  const launched = launchChrome(tag)
  let socket
  try {
    socket = new WebSocket(await launched.wsUrl)
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true })
      socket.addEventListener('error', reject, { once: true })
    })
    const cdp = new CdpClient(socket)
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
    await cdp.send('Target.activateTarget', { targetId })
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
    const send = (method, params = {}) => cdp.send(method, params, sessionId)

    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      })
      if (result.exceptionDetails) {
        throw new Error(
          `page evaluation failed: ${JSON.stringify(result.exceptionDetails).slice(0, 900)}`,
        )
      }
      return result.result?.value
    }

    const waitFor = async (expression, timeoutMs = 20000) => {
      const started = Date.now()
      for (;;) {
        if (await evaluate(expression)) return
        if (Date.now() - started > timeoutMs) {
          const diagnostic = await evaluate(`({
            body: document.body?.innerText?.slice(0, 700) ?? '',
            transition: document.querySelector('.world-view')?.getAttribute('data-transition') ?? null,
            audio: window.__annexAmbient?.getSnapshot?.() ?? null,
            constructs: window.__annexAudioContextConstructs ?? null
          })`)
          throw new Error(`timeout waiting for ${expression}\n${JSON.stringify(diagnostic)}`)
        }
        await sleep(80)
      }
    }

    const pointFor = async (selector) =>
      evaluate(`(() => {
        const element = document.querySelector(${JSON.stringify(selector)})
        if (!element) return null
        element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
        const box = element.getBoundingClientRect()
        const x = box.left + box.width / 2
        const y = box.top + box.height / 2
        const hit = document.elementFromPoint(x, y)
        return {
          x, y,
          onTop: Boolean(hit && (hit === element || element.contains(hit))),
          disabled: Boolean(element.disabled),
        }
      })()`)

    const click = async (selector, settleMs = 80) => {
      await sleep(40)
      const point = await pointFor(selector)
      if (!point?.onTop || point.disabled) return false
      await send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: point.x,
        y: point.y,
      })
      await send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: point.x,
        y: point.y,
        button: 'left',
        clickCount: 1,
      })
      await send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: point.x,
        y: point.y,
        button: 'left',
        clickCount: 1,
      })
      await sleep(settleMs)
      return true
    }

    const setPreference = async (labelText, checked) => {
      const details = '.header-preferences'
      if (!(await evaluate(`document.querySelector(${JSON.stringify(details)})?.open ?? false`))) {
        if (!(await click(`${details} > summary`))) throw new Error('Access menu could not open')
      }
      const selector = await evaluate(`(() => {
        const labels = [...document.querySelectorAll('.header-preferences label')]
        const index = labels.findIndex((label) =>
          (label.textContent ?? '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(labelText)}
        )
        if (index < 0) return null
        const input = labels[index].querySelector('input[type="checkbox"]')
        if (!input) return null
        input.setAttribute('data-acoustic-pref', ${JSON.stringify(labelText)})
        return '[data-acoustic-pref="' + CSS.escape(${JSON.stringify(labelText)}) + '"]'
      })()`)
      if (!selector) throw new Error(`Preference not found: ${labelText}`)
      const current = await evaluate(`document.querySelector(${JSON.stringify(selector)})?.checked`)
      if (current !== checked && !(await click(selector))) {
        throw new Error(`Preference could not be clicked: ${labelText}`)
      }
      await waitFor(`document.querySelector(${JSON.stringify(selector)})?.checked === ${checked}`)
    }

    const closePreferences = async () => {
      if (await evaluate(`document.querySelector('.header-preferences')?.open ?? false`)) {
        if (!(await click('.header-preferences > summary'))) {
          throw new Error('Access menu could not close')
        }
      }
    }

    const audioRead = () =>
      evaluate(`(() => ({
        snapshot: window.__annexAmbient?.getSnapshot?.() ?? null,
        contextConstructs: window.__annexAudioContextConstructs ?? null,
        reducedMotion: Boolean(document.querySelector('.annex-app.reduce-motion')),
        osReducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        transition: document.querySelector('.world-view')?.getAttribute('data-transition') ?? null,
        selectedSite: document.querySelector('.site-switch[aria-pressed="true"]')?.getAttribute('data-site') ?? null,
        hasWorld: Boolean(document.querySelector('.annex-world-stage')),
        hasDiorama: Boolean(document.querySelector('.scene-frame'))
      }))()`)

    const waitForTargets = async (expected, timeoutMs = 10000) => {
      const serialized = JSON.stringify(expected)
      await waitFor(`(() => {
        const snapshot = window.__annexAmbient?.getSnapshot?.()
        const expected = ${serialized}
        if (!snapshot) return false
        return Object.entries(expected).every(([key, value]) =>
          typeof value === 'number'
            ? typeof snapshot[key] === 'number' && Math.abs(snapshot[key] - value) <= ${EPSILON}
            : snapshot[key] === value
        )
      })()`, timeoutMs)
    }

    const stableRead = async () => {
      const first = await audioRead()
      await sleep(220)
      const second = await audioRead()
      return { first, second, stable: targetsStable(first.snapshot, second.snapshot) }
    }

    const enterPortal = async (siteId) => {
      const selector = `.annex-world-portal[data-site="${siteId}"]`
      if (!(await click(selector))) throw new Error(`Portal could not be clicked: ${siteId}`)
      await waitFor(`document.querySelector('.site-switch[aria-pressed="true"]')?.dataset.site === ${JSON.stringify(siteId)}`)
      await waitFor(`document.querySelector('.world-view')?.dataset.transition === 'closeup'`, 30000)
    }

    const returnToConcourse = async () => {
      await waitFor(`Boolean(document.querySelector('.world-return'))`)
      if (!(await click('.world-return'))) throw new Error('Return to concourse could not be clicked')
      await waitFor(`document.querySelector('.world-view')?.dataset.transition === 'concourse'`)
    }

    await send('Page.enable')
    await send('Runtime.enable')
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: 1280,
      screenHeight: 800,
    })
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(save))});
        localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, ${JSON.stringify(JSON.stringify(save.settings))});
        window.__annexAudioContextConstructs = 0;
        (() => {
          const NativeAudioContext = window.AudioContext || window.webkitAudioContext;
          if (!NativeAudioContext) return;
          const CountingAudioContext = new Proxy(NativeAudioContext, {
            construct(target, args) {
              window.__annexAudioContextConstructs += 1;
              return Reflect.construct(target, args);
            }
          });
          if (window.AudioContext) window.AudioContext = CountingAudioContext;
          else window.webkitAudioContext = CountingAudioContext;
        })();
      `,
    })
    await send('Page.navigate', { url: APP_URL })
    await waitFor(`document.readyState === 'complete'`)
    await waitFor(`Boolean(document.querySelector('.start-screen'))`)
    await evaluate(`(() => {
      const button = [...document.querySelectorAll('.start-screen button')]
        .find((candidate) => /continue local case/i.test(candidate.textContent ?? ''))
      button?.setAttribute('data-acoustic-continue', 'true')
    })()`)
    if (!(await click('[data-acoustic-continue="true"]'))) {
      throw new Error('Continue local case button was not available')
    }
    await waitFor(`Boolean(window.__annexAmbient?.getSnapshot)`)
    await waitFor(`document.querySelector('.phase-status')?.textContent?.includes('Field record')`)
    await sleep(160)

    return {
      cdp,
      send,
      evaluate,
      waitFor,
      click,
      setPreference,
      closePreferences,
      audioRead,
      waitForTargets,
      stableRead,
      enterPortal,
      returnToConcourse,
      close() {
        socket?.close()
        launched.chromeProcess.kill('SIGTERM')
      },
    }
  } catch (error) {
    socket?.close()
    launched.chromeProcess.kill('SIGTERM')
    throw error
  }
}

async function runDefaultOffTraversal() {
  const page = await openEvidencePage(
    'default-off',
    investigationSave('case-77', {
      settings: { ...SETTINGS, reducedMotion: true },
    }),
  )
  try {
    const observations = []
    const checks = {}
    const concourseExpected = expectedTargets(TREATMENTS.concourse, 0)
    await page.waitForTargets(concourseExpected)
    const concourse = await page.audioRead()
    observations.push({ location: 'concourse', expected: concourseExpected, ...concourse })
    checks.concourseExactTargets = targetsMatch(concourse.snapshot, concourseExpected)
    checks.concourseContextUnbuilt = concourse.snapshot?.contextState === 'unbuilt'
    checks.concourseWantPlayingFalse = concourse.snapshot?.wantPlaying === false
    checks.concourseConstructsZero = concourse.contextConstructs === 0
    checks.reducedPathIsActive = concourse.reducedMotion === true

    for (const siteId of SITE_IDS) {
      const expected = expectedTargets(TREATMENTS[siteId], 0)
      await page.enterPortal(siteId)
      await page.waitForTargets(expected)
      const room = await page.audioRead()
      observations.push({ location: siteId, expected, ...room })
      checks[`${siteId}.closeupReached`] = room.transition === 'closeup'
      checks[`${siteId}.exactTargets`] = targetsMatch(room.snapshot, expected)
      checks[`${siteId}.contextUnbuilt`] = room.snapshot?.contextState === 'unbuilt'
      checks[`${siteId}.wantPlayingFalse`] = room.snapshot?.wantPlaying === false
      checks[`${siteId}.constructsZero`] = room.contextConstructs === 0

      await page.returnToConcourse()
      await page.waitForTargets(concourseExpected)
      const returned = await page.audioRead()
      observations.push({ location: `return-from-${siteId}`, expected: concourseExpected, ...returned })
      checks[`${siteId}.returnReached`] = returned.transition === 'concourse'
      checks[`${siteId}.returnExactConcourse`] = targetsMatch(
        returned.snapshot,
        concourseExpected,
      )
      checks[`${siteId}.returnContextUnbuilt`] = returned.snapshot?.contextState === 'unbuilt'
      checks[`${siteId}.returnWantPlayingFalse`] = returned.snapshot?.wantPlaying === false
      checks[`${siteId}.returnConstructsZero`] = returned.contextConstructs === 0
    }

    checks.allNineSilentSurfacesObserved = observations.length === 9
    checks.noPageExceptions = page.cdp.exceptions.length === 0
    return {
      tag: 'case77-default-off-traversal',
      observations,
      checks,
      pageExceptions: [...page.cdp.exceptions],
    }
  } finally {
    page.close()
  }
}

async function runOptInLifecycle() {
  const page = await openEvidencePage('opt-in', investigationSave('case-77'))
  try {
    const observations = []
    const checks = {}
    const concourseExpected = expectedTargets(TREATMENTS.concourse, 0)
    await page.waitForTargets(concourseExpected)

    const before = await page.audioRead()
    observations.push({ step: 'before-opt-in', expected: concourseExpected, ...before })
    checks.preOptInUnbuilt = before.snapshot?.contextState === 'unbuilt'
    checks.preOptInConstructsZero = before.contextConstructs === 0
    checks.preOptInDefaultOff = before.snapshot?.wantPlaying === false

    await page.setPreference('Ambient sound', true)
    await page.waitFor(`window.__annexAmbient?.getSnapshot?.().wantPlaying === true`)
    await page.waitFor(`window.__annexAudioContextConstructs === 1`)
    await page.waitFor(`window.__annexAmbient?.getSnapshot?.().contextState === 'running'`)
    const optIn = await page.stableRead()
    observations.push({ step: 'opt-in-concourse', expected: concourseExpected, ...optIn })
    checks.uiOptInConstructsExactlyOne = optIn.second.contextConstructs === 1
    checks.uiOptInConstructsAtMostOne = optIn.second.contextConstructs <= 1
    checks.uiOptInRunning = optIn.second.snapshot?.contextState === 'running'
    checks.uiOptInWantPlaying = optIn.second.snapshot?.wantPlaying === true
    checks.uiOptInMasterTargetOne = optIn.second.snapshot?.masterTarget === 1
    checks.uiOptInExactConcourse = targetsMatch(optIn.second.snapshot, concourseExpected)
    checks.uiOptInTargetsStable = optIn.stable

    // Keep motion reduction on during the four-room sweep. The unchanged audio
    // target before/after this real UI preference click proves independence.
    await page.setPreference('Reduce motion', true)
    await page.waitFor(`document.querySelector('.annex-app')?.classList.contains('reduce-motion')`)
    const reducedOn = await page.stableRead()
    observations.push({ step: 'app-reduced-on', expected: concourseExpected, ...reducedOn })
    checks.appReducedActive = reducedOn.second.reducedMotion === true
    checks.appReducedKeepsExactConcourse = targetsMatch(
      reducedOn.second.snapshot,
      concourseExpected,
    )
    checks.appReducedKeepsContext = reducedOn.second.contextConstructs === 1
    checks.appReducedKeepsPlaying = reducedOn.second.snapshot?.wantPlaying === true
    checks.appReducedTargetsStable = reducedOn.stable
    await page.closePreferences()

    for (const siteId of SITE_IDS) {
      const expected = expectedTargets(TREATMENTS[siteId], 0)
      await page.enterPortal(siteId)
      await page.waitForTargets(expected)
      const room = await page.stableRead()
      observations.push({ step: `playing-${siteId}`, expected, ...room })
      checks[`${siteId}.exactWhilePlaying`] = targetsMatch(room.second.snapshot, expected)
      checks[`${siteId}.stableWhilePlaying`] = room.stable
      checks[`${siteId}.singleContext`] = room.second.contextConstructs === 1
      checks[`${siteId}.stillPlaying`] =
        room.second.snapshot?.wantPlaying === true &&
        room.second.snapshot?.contextState === 'running'

      await page.returnToConcourse()
      await page.waitForTargets(concourseExpected)
      const returned = await page.audioRead()
      observations.push({ step: `playing-return-${siteId}`, expected: concourseExpected, ...returned })
      checks[`${siteId}.returnRestoresConcourse`] = targetsMatch(
        returned.snapshot,
        concourseExpected,
      )
      checks[`${siteId}.returnKeepsSingleContext`] = returned.contextConstructs === 1
    }

    await page.setPreference('Reduce motion', false)
    await page.waitFor(`!document.querySelector('.annex-app')?.classList.contains('reduce-motion')`)
    const reducedOff = await page.audioRead()
    observations.push({ step: 'app-reduced-off', expected: concourseExpected, ...reducedOff })
    checks.appReducedOffKeepsTargets = targetsMatch(reducedOff.snapshot, concourseExpected)
    checks.appReducedOffKeepsSingleContext = reducedOff.contextConstructs === 1
    await page.closePreferences()

    const beforeOsReduced = await page.audioRead()
    await page.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    })
    await page.waitFor(`matchMedia('(prefers-reduced-motion: reduce)').matches`)
    await sleep(160)
    const osReduced = await page.audioRead()
    observations.push({ step: 'os-reduced-on', expected: concourseExpected, ...osReduced })
    checks.osReducedActive = osReduced.osReducedMotion === true
    checks.osReducedKeepsTargets = targetsStable(beforeOsReduced.snapshot, osReduced.snapshot)
    checks.osReducedKeepsExactConcourse = targetsMatch(osReduced.snapshot, concourseExpected)
    checks.osReducedKeepsSingleContext = osReduced.contextConstructs === 1
    checks.osReducedKeepsPlaying = osReduced.snapshot?.wantPlaying === true
    await page.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
    })
    await page.waitFor(`!matchMedia('(prefers-reduced-motion: reduce)').matches`)

    // Normal-motion race: click A, then D before the 640ms travel can settle.
    if (!(await page.click('#site-switch-registry', 20))) {
      throw new Error('Rapid race could not click Registry')
    }
    if (!(await page.click('#site-switch-small-archive', 20))) {
      throw new Error('Rapid race could not click Small archive')
    }
    const latestExpected = expectedTargets(TREATMENTS['small-archive'], 0)
    await page.waitForTargets(latestExpected)
    await page.waitFor(
      `document.querySelector('.site-switch[aria-pressed="true"]')?.dataset.site === 'small-archive'`,
    )
    const rapidImmediate = await page.stableRead()
    observations.push({ step: 'rapid-a-to-d', expected: latestExpected, ...rapidImmediate })
    checks.rapidAToDSelectsD = rapidImmediate.second.selectedSite === 'small-archive'
    checks.rapidAToDLeavesDTargets = targetsMatch(
      rapidImmediate.second.snapshot,
      latestExpected,
    )
    checks.rapidAToDTargetsStable = rapidImmediate.stable
    checks.rapidAToDKeepsSingleContext = rapidImmediate.second.contextConstructs === 1
    checks.rapidAToDKeepsPlaying = rapidImmediate.second.snapshot?.wantPlaying === true

    // Let the latest epoch settle deterministically in headless Chrome, then
    // verify the rendered close-up is also D (not just the selected button).
    await page.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    })
    await page.waitFor(`document.querySelector('.world-view')?.dataset.transition === 'closeup'`)
    const rapidSettled = await page.audioRead()
    observations.push({ step: 'rapid-a-to-d-settled', expected: latestExpected, ...rapidSettled })
    checks.rapidAToDSettlesD =
      rapidSettled.transition === 'closeup' && rapidSettled.selectedSite === 'small-archive'
    checks.rapidAToDSettledTargetsD = targetsMatch(rapidSettled.snapshot, latestExpected)
    await page.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
    })
    await page.returnToConcourse()
    await page.waitForTargets(concourseExpected)
    const rapidReturn = await page.audioRead()
    observations.push({ step: 'rapid-return', expected: concourseExpected, ...rapidReturn })
    checks.rapidReturnRestoresConcourse = targetsMatch(rapidReturn.snapshot, concourseExpected)
    checks.rapidReturnKeepsSingleContext = rapidReturn.contextConstructs === 1

    await page.setPreference('Ambient sound', false)
    await page.waitFor(`window.__annexAmbient?.getSnapshot?.().wantPlaying === false`)
    const stopped = await page.audioRead()
    observations.push({ step: 'opt-out-immediate', expected: concourseExpected, ...stopped })
    checks.uiOptOutWantPlayingFalse = stopped.snapshot?.wantPlaying === false
    checks.uiOptOutMasterTargetZero = stopped.snapshot?.masterTarget === 0
    checks.uiOptOutKeepsSingleContext = stopped.contextConstructs === 1
    checks.uiOptOutKeepsConcourseIntent = targetsMatch(stopped.snapshot, concourseExpected)
    await page.waitFor(
      `['suspended', 'closed'].includes(window.__annexAmbient?.getSnapshot?.().contextState)`,
      6000,
    )
    const suspended = await page.audioRead()
    observations.push({ step: 'opt-out-settled', expected: concourseExpected, ...suspended })
    checks.uiOptOutEventuallySuspends = ['suspended', 'closed'].includes(
      suspended.snapshot?.contextState,
    )
    checks.uiOptOutStillWantPlayingFalse = suspended.snapshot?.wantPlaying === false
    checks.uiOptOutStillMasterZero = suspended.snapshot?.masterTarget === 0
    checks.uiOptOutNeverConstructsSecondContext = suspended.contextConstructs === 1
    checks.noPageExceptions = page.cdp.exceptions.length === 0

    return {
      tag: 'case77-ui-opt-in-lifecycle',
      observations,
      checks,
      pageExceptions: [...page.cdp.exceptions],
    }
  } finally {
    page.close()
  }
}

async function runAlarmThreeCeilings() {
  const page = await openEvidencePage(
    'alarm-three',
    investigationSave('case-77', {
      alarm: 3,
      settings: { ...SETTINGS, reducedMotion: true },
    }),
  )
  try {
    const checks = {}
    const observations = []
    const locations = ['concourse', ...SITE_IDS]

    for (const location of locations) {
      if (location !== 'concourse') await page.enterPortal(location)
      const expected = expectedTargets(TREATMENTS[location], 3)
      await page.waitForTargets(expected)
      const reading = await page.audioRead()
      observations.push({ location, expected, ...reading })
      checks[`${location}.exactTier3Targets`] = targetsMatch(reading.snapshot, expected)
      checks[`${location}.tierIsThree`] = reading.snapshot?.alarmTier === 3
      checks[`${location}.defaultOffUnbuilt`] = reading.snapshot?.contextState === 'unbuilt'
      if (location !== 'concourse') await page.returnToConcourse()
    }

    const snapshots = observations.map((observation) => observation.snapshot)
    const maxRoomTone = Math.max(...snapshots.map((snapshot) => snapshot.roomToneTarget))
    const maxRoomHum = Math.max(...snapshots.map((snapshot) => snapshot.roomHumTarget))
    const maxCombined = Math.max(
      ...snapshots.map((snapshot) => snapshot.roomToneTarget + snapshot.roomHumTarget),
    )
    checks.allTier3RoomToneUnderHardCeiling = maxRoomTone <= ROOM_TONE_CEILING + EPSILON
    checks.allTier3HumUnderHardCeiling = maxRoomHum <= ROOM_HUM_CEILING + EPSILON
    checks.loudestAddedMachineryBelowQuietWeatherCeiling = maxCombined < QUIET_WEATHER_CEILING
    checks.alarmTraversalConstructsZeroContexts = observations.every(
      (observation) => observation.contextConstructs === 0,
    )
    checks.noPageExceptions = page.cdp.exceptions.length === 0

    return {
      tag: 'case77-alarm-tier-3-ceilings',
      ceilingMeasurements: {
        baseRoomToneCeiling: ROOM_TONE_CEILING,
        baseRoomHumCeiling: ROOM_HUM_CEILING,
        quietWeatherCeiling: QUIET_WEATHER_CEILING,
        maxRoomTone,
        maxRoomHum,
        maxCombined,
      },
      observations,
      checks,
      pageExceptions: [...page.cdp.exceptions],
    }
  } finally {
    page.close()
  }
}

async function runCase81DryPath() {
  const page = await openEvidencePage(
    'case81-dry',
    investigationSave('case-81', {
      settings: { ...SETTINGS, reducedMotion: true },
    }),
  )
  try {
    const checks = {}
    const observations = []
    const dryExpected = expectedTargets(null, 0)
    await page.waitForTargets(dryExpected)
    const before = await page.audioRead()
    observations.push({ step: 'case81-default-off', expected: dryExpected, ...before })
    checks.case81UsesDioramaNotWorld = before.hasDiorama === true && before.hasWorld === false
    checks.case81WeatherIsDust = before.snapshot?.weather === 'dust'
    checks.case81DefaultOffUnbuilt = before.snapshot?.contextState === 'unbuilt'
    checks.case81DefaultOffConstructsZero = before.contextConstructs === 0
    checks.case81DryTargetsExactBeforeOptIn = targetsMatch(before.snapshot, dryExpected)
    checks.case81RoomToneZeroBeforeOptIn = before.snapshot?.roomToneTarget === 0
    checks.case81RoomHumZeroBeforeOptIn = before.snapshot?.roomHumTarget === 0

    await page.setPreference('Ambient sound', true)
    await page.waitFor(`window.__annexAudioContextConstructs === 1`)
    await page.waitFor(`window.__annexAmbient?.getSnapshot?.().contextState === 'running'`)
    const playing = await page.stableRead()
    observations.push({ step: 'case81-playing', expected: dryExpected, ...playing })
    checks.case81OptInSingleContext = playing.second.contextConstructs === 1
    checks.case81OptInRunning = playing.second.snapshot?.contextState === 'running'
    checks.case81OptInWantPlaying = playing.second.snapshot?.wantPlaying === true
    checks.case81DryTargetsExactWhilePlaying = targetsMatch(playing.second.snapshot, dryExpected)
    checks.case81DryTargetsStable = playing.stable
    checks.case81RoomSourcesStayZero =
      playing.second.snapshot?.roomToneTarget === 0 &&
      playing.second.snapshot?.roomHumTarget === 0
    checks.case81WeatherDryPathStaysOne = playing.second.snapshot?.weatherDryTarget === 1
    checks.case81WeatherSpatialPathStaysZero =
      playing.second.snapshot?.weatherSpatialTarget === 0

    await page.setPreference('Ambient sound', false)
    await page.waitFor(`window.__annexAmbient?.getSnapshot?.().wantPlaying === false`)
    const stopped = await page.audioRead()
    observations.push({ step: 'case81-opt-out', expected: dryExpected, ...stopped })
    checks.case81OptOutWantPlayingFalse = stopped.snapshot?.wantPlaying === false
    checks.case81OptOutMasterTargetZero = stopped.snapshot?.masterTarget === 0
    checks.case81OptOutRemainsDry = targetsMatch(stopped.snapshot, dryExpected)
    checks.case81NeverConstructsSecondContext = stopped.contextConstructs === 1
    checks.noPageExceptions = page.cdp.exceptions.length === 0

    return {
      tag: 'case81-non-world-dry-path',
      observations,
      checks,
      pageExceptions: [...page.cdp.exceptions],
    }
  } finally {
    page.close()
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const scenarios = [
    runDefaultOffTraversal,
    runOptInLifecycle,
    runAlarmThreeCeilings,
    runCase81DryPath,
  ]
  const runs = []
  const transcript = []
  let fatal = null

  for (const scenario of scenarios) {
    try {
      const run = await scenario()
      runs.push(run)
      const passed = Object.values(run.checks).every(Boolean)
      const line = `${passed ? 'PASS' : 'FAIL'} ${run.tag}: ${JSON.stringify(run.checks)}`
      transcript.push(line)
      console.log(line)
    } catch (error) {
      fatal = error instanceof Error ? error.stack ?? error.message : String(error)
      transcript.push(`FATAL ${fatal}`)
      console.error(fatal)
      break
    }
  }

  const failedChecks = runs.flatMap((run) =>
    Object.entries(run.checks)
      .filter(([, passed]) => !passed)
      .map(([check]) => `${run.tag}.${check}`),
  )
  const checksCompleted = runs.reduce((total, run) => total + Object.keys(run.checks).length, 0)
  const checksPassed = runs.reduce(
    (total, run) => total + Object.values(run.checks).filter(Boolean).length,
    0,
  )
  const measurements = {
    generatedAt: new Date().toISOString(),
    appUrl: APP_URL,
    proofSurface: 'window.__annexAmbient.getSnapshot()',
    expectedLocations: ['concourse', ...SITE_IDS],
    runs,
    summary: {
      passed:
        fatal === null && runs.length === scenarios.length && failedChecks.length === 0,
      scenariosCompleted: runs.length,
      scenariosExpected: scenarios.length,
      checksCompleted,
      checksPassed,
      failedChecks,
      fatal,
    },
  }
  writeFileSync(join(OUT_DIR, 'measurements.json'), JSON.stringify(measurements, null, 2))
  writeFileSync(
    join(OUT_DIR, 'transcript.txt'),
    `${transcript.join('\n')}\n\n${checksPassed}/${checksCompleted} checks passed across ${runs.length}/${scenarios.length} scenarios.\n`,
  )
  if (!measurements.summary.passed) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

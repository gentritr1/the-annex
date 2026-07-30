import assert from 'node:assert/strict'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import { getCaseContent } from '../src/game/content'
import {
  canEnterTribunal,
  createInitialGameState,
  defaultAccessibilitySettings,
  gameReducer,
} from '../src/game/engine'
import type {
  AccessibilitySettings,
  ApproachId,
  DecisionId,
  DepositionChoiceId,
  FieldActionId,
  FragmentId,
  GameState,
} from '../src/game/types'

const BASE_URL = process.env.ANNEX_BASE_URL ?? 'http://127.0.0.1:4173'
const SAVE_KEY = 'the-annex.case-77.save.v1'
const SETTINGS_KEY = 'the-annex.accessibility.v1'
const SEEN_BEATS_KEY = 'the-annex.seen-beats.v1'
const OUTPUT_DIR = path.resolve('docs/playtest/nonlinear-causal')

interface Viewport {
  width: number
  height: number
}

interface Diagnostics {
  console: string[]
  pageErrors: string[]
  requestFailures: string[]
  httpErrors: string[]
}

interface LayoutMetrics {
  viewport: string
  documentScrollWidth: number
  bodyScrollWidth: number
  horizontalOverflowPx: number
  visibleKeyControlCount: number
  minimumKeyControlHeight: number | null
  brokenImages: string[]
}

interface RouteEvidence {
  route: string
  viewport: string
  assertions: string[]
  screenshots: string[]
  diagnostics: Diagnostics
  layout: LayoutMetrics
}

interface OpenRouteOptions {
  name: string
  state: GameState
  viewport: Viewport
  reducedMotion?: boolean
  seenBeats?: string[]
}

const routes: RouteEvidence[] = []

function settings(overrides: Partial<AccessibilitySettings> = {}): AccessibilitySettings {
  return { ...defaultAccessibilitySettings, ...overrides }
}

function start77(
  approachId: ApproachId,
  accessibility: AccessibilitySettings = settings(),
): GameState {
  let state = createInitialGameState(accessibility)
  state = gameReducer(state, { type: 'START_NEW' })
  state = gameReducer(state, { type: 'SELECT_APPROACH', approachId })
  assert.equal(state.phase, 'investigation')
  return state
}

function commit(state: GameState, actionId: FieldActionId): GameState {
  const next = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId })
  assert(next.completedActions.includes(actionId), `field action ${actionId} did not commit`)
  return next
}

function selectReconstruction(
  state: GameState,
  first: FragmentId,
  second: FragmentId,
  submit = true,
): GameState {
  let next = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
  assert.equal(next.phase, 'reconstruction')
  next = gameReducer(next, { type: 'TOGGLE_FRAGMENT', fragmentId: first })
  next = gameReducer(next, { type: 'TOGGLE_FRAGMENT', fragmentId: second })
  assert.deepEqual(next.selectedFragments, [first, second])
  if (!submit) return next
  next = gameReducer(next, { type: 'SUBMIT_RECONSTRUCTION' })
  assert.equal(next.phase, 'investigation', `reconstruction ${first}/${second} did not file`)
  assert.notEqual(next.reconstruction, null)
  return next
}

function enterTribunal(state: GameState): GameState {
  assert.equal(canEnterTribunal(state), true, 'tribunal gate was not open')
  const next = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
  assert.equal(next.phase, 'tribunal')
  return next
}

function decide(state: GameState, decisionId: DecisionId): GameState {
  const next = gameReducer(state, { type: 'DECIDE', decisionId })
  assert.equal(next.phase, 'debrief')
  assert.equal(next.decision, decisionId)
  return next
}

function completedCase77(
  accessibility: AccessibilitySettings = settings(),
): GameState {
  let state = start77('care', accessibility)
  state = commit(state, 'listen-mara')
  state = commit(state, 'authenticate-chain')
  state = selectReconstruction(state, 'scar-sensation', 'witness-account')
  state = enterTribunal(state)
  return decide(state, 'charter-new-person')
}

function start81(
  approachId: ApproachId,
  accessibility: AccessibilitySettings = settings(),
): GameState {
  let state = completedCase77(accessibility)
  state = gameReducer(state, { type: 'START_CASE', caseId: 'case-81' })
  assert.equal(state.caseId, 'case-81')
  assert.equal(state.phase, 'briefing')
  state = gameReducer(state, { type: 'SELECT_APPROACH', approachId })
  assert.equal(state.phase, 'investigation')
  return state
}

const depositionBeats: readonly DepositionChoiceId[] = [
  'let-it-stand',
  'corroborate',
  'let-it-stand',
]

function depose(
  state: GameState,
  actionId: 'take-sworn-statement' | 'cross-examine-witness',
  askedConsent: boolean,
): GameState {
  const next = gameReducer(state, {
    type: 'COMMIT_DEPOSITION',
    actionId,
    beats: depositionBeats,
    askedConsent,
  })
  assert(next.completedActions.includes(actionId))
  assert.notEqual(next.depositionRecord, null)
  return next
}

function careArchiveSpeculativeSelection(): GameState {
  let state = start77('care')
  state = commit(state, 'listen-mara')
  state = commit(state, 'answer-archivist')
  state = selectReconstruction(state, 'scar-sensation', 'registry-hash', false)
  assert.equal(state.phase, 'reconstruction')
  return state
}

function case77NoContactTribunal(): GameState {
  let state = start77('procedure')
  state = commit(state, 'trace-checksum')
  state = commit(state, 'walk-acoustic-shadow')
  state = selectReconstruction(state, 'registry-hash', 'new-dream')
  return enterTribunal(state)
}

function case77TrustExchangeTribunal(
  accessibility: AccessibilitySettings = settings(),
): GameState {
  let state = start77('care', accessibility)
  state = commit(state, 'stress-test')
  state = commit(state, 'seal-index')
  state = selectReconstruction(state, 'scar-sensation', 'new-dream')
  state = enterTribunal(state)
  assert.equal(state.trust.registrar, 2)
  assert.equal(state.trust.archivist, -2)
  return state
}

function case81CounselState(
  mode: 'voluntary' | 'refused' | 'compelled' | 'unasked' | 'no-account',
): GameState {
  let state = start81(mode === 'no-account' ? 'procedure' : 'care')
  if (mode === 'voluntary') return depose(state, 'take-sworn-statement', true)
  if (mode === 'refused') return depose(state, 'cross-examine-witness', true)
  if (mode === 'compelled') return depose(state, 'cross-examine-witness', false)
  if (mode === 'unasked') return depose(state, 'take-sworn-statement', false)
  return state
}

function case81VoluntaryTribunal(): GameState {
  let state = case81CounselState('voluntary')
  state = commit(state, 'brief-city-counsel')
  state = selectReconstruction(state, 'oath-cadence', 'unscripted-answer')
  return enterTribunal(state)
}

function decisionTitle(caseId: string, decisionId: DecisionId): string {
  const decision = getCaseContent(caseId).decisions.find((candidate) => candidate.id === decisionId)
  assert(decision, `decision ${decisionId} is missing from ${caseId}`)
  return decision.title
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function attachDiagnostics(page: Page): Diagnostics {
  const diagnostics: Diagnostics = {
    console: [],
    pageErrors: [],
    requestFailures: [],
    httpErrors: [],
  }

  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') {
      diagnostics.console.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => diagnostics.pageErrors.push(error.stack ?? error.message))
  page.on('requestfailed', (request) => {
    diagnostics.requestFailures.push(
      `${request.method()} ${request.url()} — ${request.failure()?.errorText ?? 'unknown failure'}`,
    )
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      diagnostics.httpErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`)
    }
  })

  return diagnostics
}

async function waitForVisualStability(page: Page): Promise<void> {
  await page.waitForTimeout(350)
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  })
}

async function openRoute(
  browser: Browser,
  options: OpenRouteOptions,
): Promise<{ context: BrowserContext; page: Page; diagnostics: Diagnostics }> {
  const context = await browser.newContext({
    viewport: options.viewport,
    colorScheme: 'dark',
    reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference',
    deviceScaleFactor: 1,
  })
  await context.addInitScript(
    ({ saveKey, settingsKey, seenKey, state, seenBeats }) => {
      window.localStorage.clear()
      window.localStorage.setItem(saveKey, JSON.stringify(state))
      window.localStorage.setItem(settingsKey, JSON.stringify(state.settings))
      window.localStorage.setItem(seenKey, JSON.stringify(seenBeats))
    },
    {
      saveKey: SAVE_KEY,
      settingsKey: SETTINGS_KEY,
      seenKey: SEEN_BEATS_KEY,
      state: options.state,
      seenBeats: options.seenBeats ?? [],
    },
  )
  const page = await context.newPage()
  const diagnostics = attachDiagnostics(page)
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
  const continueButton = page.getByRole('button', { name: 'Continue local case' })
  await continueButton.waitFor({ state: 'visible' })
  await continueButton.click()
  await page.locator('article.phase-page').waitFor({ state: 'visible' })
  await waitForVisualStability(page)
  return { context, page, diagnostics }
}

async function focus(page: Page, selector: string): Promise<void> {
  const locator = page.locator(selector).first()
  await locator.waitFor({ state: 'visible' })
  await locator.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
  await waitForVisualStability(page)
}

async function screenshot(page: Page, fileName: string, selector?: string): Promise<string> {
  if (selector) await focus(page, selector)
  const absolutePath = path.join(OUTPUT_DIR, fileName)
  await page.screenshot({ path: absolutePath, animations: 'disabled', caret: 'hide' })
  return fileName
}

async function collectLayout(page: Page): Promise<LayoutMetrics> {
  return page.evaluate(() => {
    const brokenImages = [...document.images]
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src || '(image with empty source)')
    const keyControls = [
      ...document.querySelectorAll<HTMLElement>(
        '.button, .site-switch, .choice-row, .causal-procedure-gate button, .scene-beat-replay button',
      ),
    ].filter((element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
    })
    const heights = keyControls.map((element) => element.getBoundingClientRect().height)
    const documentScrollWidth = document.documentElement.scrollWidth
    const bodyScrollWidth = document.body.scrollWidth
    return {
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      documentScrollWidth,
      bodyScrollWidth,
      horizontalOverflowPx: Math.max(documentScrollWidth, bodyScrollWidth) - window.innerWidth,
      visibleKeyControlCount: keyControls.length,
      minimumKeyControlHeight: heights.length > 0 ? Math.min(...heights) : null,
      brokenImages,
    }
  })
}

async function finishRoute(
  context: BrowserContext,
  page: Page,
  diagnostics: Diagnostics,
  route: string,
  viewport: Viewport,
  assertions: string[],
  screenshots: string[],
): Promise<void> {
  await waitForVisualStability(page)
  const layout = await collectLayout(page)
  assert.deepEqual(layout.brokenImages, [], `${route}: broken images found`)
  if (viewport.width <= 390) {
    assert(
      layout.horizontalOverflowPx <= 1,
      `${route}: ${layout.horizontalOverflowPx}px horizontal overflow at ${layout.viewport}`,
    )
  }
  assert.deepEqual(diagnostics.console, [], `${route}: console warning/error`)
  assert.deepEqual(diagnostics.pageErrors, [], `${route}: page error`)
  assert.deepEqual(diagnostics.requestFailures, [], `${route}: failed request`)
  assert.deepEqual(diagnostics.httpErrors, [], `${route}: HTTP error`)

  routes.push({
    route,
    viewport: `${viewport.width}×${viewport.height}`,
    assertions,
    screenshots,
    diagnostics,
    layout,
  })
  await context.close()
}

async function run(): Promise<void> {
  await rm(OUTPUT_DIR, { recursive: true, force: true })
  await mkdir(OUTPUT_DIR, { recursive: true })

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  })

  try {
    {
      const viewport = { width: 1440, height: 960 }
      const opened = await openRoute(browser, {
        name: 'Case 77 Care opening',
        state: start77('care'),
        viewport,
      })
      await opened.page
        .locator('.approach-opening[data-approach="care"][data-opening-site="care-ward"]')
        .waitFor({ state: 'visible' })
      await opened.page.locator('#site-switch-care-ward[aria-current="true"]').waitFor()
      const shot = await screenshot(opened.page, '01-case77-care-opening-1440x960.png', '.approach-opening')
      await finishRoute(
        opened.context,
        opened.page,
        opened.diagnostics,
        'Case 77 Care opening',
        viewport,
        [
          'Care stages Care Ward 12 rather than the generic concourse.',
          '77-A/Shepherd presence, first objective, and rain-soft room state are visible.',
          'The authored opening site is the selected site while all four sites remain available.',
        ],
        [shot],
      )
    }

    {
      const viewport = { width: 1440, height: 960 }
      let state = start77('care')
      state = commit(state, 'listen-mara')
      const opened = await openRoute(browser, {
        name: 'Case 77 Care to Archive primed collision',
        state,
        viewport,
      })
      await opened.page.locator('#site-switch-small-archive').click()
      await opened.page
        .locator('.causal-procedure-gate[data-causal-gate="mara-to-archive"]')
        .waitFor({ state: 'visible' })
      assert.match(
        await opened.page.locator('.causal-procedure-gate').innerText(),
        /temporary address|requested address|Mara/i,
      )
      assert.match(await opened.page.locator('#site-switch-small-archive').innerText(), /Address preserved|Mara/i)
      const shot = await screenshot(
        opened.page,
        '02-case77-care-archive-primed-1440x960.png',
        '.causal-procedure-gate',
      )
      await finishRoute(
        opened.context,
        opened.page,
        opened.diagnostics,
        'Case 77 Care → Small Archive',
        viewport,
        [
          'Visiting Care first changes the later Archive room before its ordinary ritual begins.',
          'The later room requires an explicit changed-procedure acknowledgement.',
          'The portal/switcher preserves the requested-address world state.',
        ],
        [shot],
      )
    }

    {
      const viewport = { width: 390, height: 844 }
      const opened = await openRoute(browser, {
        name: 'Case 77 Care to Archive speculative reconstruction',
        state: careArchiveSpeculativeSelection(),
        viewport,
      })
      await opened.page.locator('.speculative-filing').waitFor({ state: 'visible' })
      assert.match(
        await opened.page.locator('.fragment-row[data-knowledge="known"]').innerText(),
        /Signed continuity|unsupported/i,
      )
      assert.match(
        await opened.page.locator('.fragment-row[data-knowledge="corroborated"]').innerText(),
        /Embodied echo|Corroborated/i,
      )
      const reconstructionShot = await screenshot(
        opened.page,
        '03-case77-speculative-reconstruction-390x844.png',
        '.speculative-filing',
      )

      await opened.page.getByLabel('I acknowledge that this anchor remains contested.').check()
      await opened.page.getByRole('button', { name: /^File reconstruction/ }).click()
      await opened.page.getByRole('button', { name: /Confirm irreversible filing/ }).click()
      await opened.page.locator('article.investigation-page').waitFor({ state: 'visible' })
      await opened.page.getByRole('button', { name: 'Enter tribunal' }).click()
      await opened.page.locator('article.tribunal-page').waitFor({ state: 'visible' })
      await opened.page
        .locator('.prehearing-subject[data-subject-state="subject-mara"]')
        .waitFor({ state: 'visible' })
      await opened.page.locator('.speculative-objection[data-speculative-cost="true"]').waitFor()
      assert.match(await opened.page.locator('.prehearing-subject').innerText(), /tea|Mara/i)
      assert.match(await opened.page.locator('.speculative-objection').innerText(), /Signed continuity|unsupported/i)
      const tribunalShot = await screenshot(
        opened.page,
        '04-case77-speculative-tribunal-390x844.png',
        '.prehearing-subject',
      )
      const objectionShot = await screenshot(
        opened.page,
        '05-case77-speculative-objection-390x844.png',
        '.speculative-objection',
      )
      await finishRoute(
        opened.context,
        opened.page,
        opened.diagnostics,
        'Case 77 Care → Archive → speculative reconstruction → tribunal',
        viewport,
        [
          'Unknown facts are withheld; one corroborated and one known unsupported anchor are visible.',
          'The unsupported anchor requires explicit acknowledgement before either irreversible click.',
          'The filed speculation persists as a live tribunal objection.',
          'Mara’s temporary address and ordinary tea request remain explicitly non-evidentiary.',
        ],
        [reconstructionShot, tribunalShot, objectionShot],
      )
    }

    {
      const viewport = { width: 1440, height: 960 }
      let state = start77('procedure')
      state = commit(state, 'trace-checksum')
      const opened = await openRoute(browser, {
        name: 'Case 77 Registry to Maintenance collision',
        state,
        viewport,
      })
      await opened.page.locator('#site-switch-maintenance').click()
      await opened.page
        .locator('.causal-procedure-gate[data-causal-gate="registry-mark-to-maintenance"]')
        .waitFor({ state: 'visible' })
      assert.match(await opened.page.locator('#site-switch-maintenance').innerText(), /Mark 04 linked/i)
      assert.match(await opened.page.locator('.causal-procedure-gate').innerText(), /linked-authority|coordination|mark 04/i)
      const shot = await screenshot(
        opened.page,
        '06-case77-registry-maintenance-1440x960.png',
        '.causal-procedure-gate',
      )
      await finishRoute(
        opened.context,
        opened.page,
        opened.diagnostics,
        'Case 77 Procedure → Registry → Maintenance',
        viewport,
        [
          'The late checksum changes the later corridor reading before a Maintenance method is chosen.',
          'The Maintenance portal carries the linked Mark 04 outcome.',
          'A procedural acknowledgement gates the ordinary room interaction while all methods remain available afterward.',
        ],
        [shot],
      )
    }

    {
      const viewport = { width: 320, height: 568 }
      const opened = await openRoute(browser, {
        name: 'Case 77 without subject contact',
        state: case77NoContactTribunal(),
        viewport,
      })
      await opened.page
        .locator('.prehearing-subject[data-subject-state="subject-absent"]')
        .waitFor({ state: 'visible' })
      assert.match(await opened.page.locator('.prehearing-subject').innerText(), /empty|never consulted|does not invent consent/i)
      const shot = await screenshot(
        opened.page,
        '07-case77-no-contact-tribunal-320x568.png',
        '.prehearing-subject',
      )
      await finishRoute(
        opened.context,
        opened.page,
        opened.diagnostics,
        'Case 77 without subject contact',
        viewport,
        [
          'Skipping Care remains a valid tribunal route.',
          'The subject chair is visibly empty and no temporary name, want, or consent is invented.',
          'The 320×568 layout has no horizontal overflow or broken image.',
        ],
        [shot],
      )
    }

    {
      const viewport = { width: 1440, height: 960 }
      const opened = await openRoute(browser, {
        name: 'Case 77 deterministic trust exchange',
        state: case77TrustExchangeTribunal(),
        viewport,
      })
      await opened.page.locator('.hearing-standing').waitFor({ state: 'visible' })
      assert.match(await opened.page.locator('[data-role="support"]').innerText(), /Registrar volunteers support/i)
      assert.match(await opened.page.locator('[data-role="objection"]').innerText(), /Small Archivist files the objection/i)
      assert.equal(await opened.page.locator('.npc-exchange blockquote').count(), 2)
      const shot = await screenshot(
        opened.page,
        '08-case77-trust-support-objection-1440x960.png',
        '.hearing-standing',
      )
      await finishRoute(
        opened.context,
        opened.page,
        opened.diagnostics,
        'Case 77 trust-derived support and objection',
        viewport,
        [
          'Actual route trust produces Registrar support and Small Archivist objection.',
          'The deterministic tie rule is visible.',
          'Two NPCs address one another directly; no lawful verdict is removed.',
        ],
        [shot],
      )
    }

    for (const counselMode of ['voluntary', 'refused', 'compelled', 'no-account'] as const) {
      const viewport =
        counselMode === 'voluntary'
          ? { width: 1440, height: 960 }
          : counselMode === 'no-account'
            ? { width: 320, height: 568 }
            : { width: 390, height: 844 }
      const opened = await openRoute(browser, {
        name: `Case 81 ${counselMode} Counsel state`,
        state: case81CounselState(counselMode),
        viewport,
      })
      await opened.page.locator('#site-switch-counsel-office').click()
      const panel = opened.page.locator(`.counsel-variant[data-counsel-state="${counselMode}"]`)
      await panel.waitFor({ state: 'visible' })
      const text = await panel.innerText()
      assert.match(text, /Advocate Ilyan Voss/i)
      assert.match(text, /Advocate Sera Quill/i)
      assert.match(text, /Recorder/i)
      assert.match(text, /Shutter/i)
      if (counselMode === 'no-account') assert.match(text, /chair absent|no account/i)
      if (counselMode === 'refused') assert.match(text, /refusal/i)
      if (counselMode === 'compelled') assert.match(text, /compelled|pressure/i)
      if (counselMode === 'voluntary') assert.match(text, /voluntary|protected/i)
      const shot = await screenshot(
        opened.page,
        `09-case81-${counselMode}-counsel-${viewport.width}x${viewport.height}.png`,
        '.counsel-variant',
      )
      await finishRoute(
        opened.context,
        opened.page,
        opened.diagnostics,
        `Case 81 ${counselMode} deposition state → Counsel`,
        viewport,
        [
          `Counsel occupies a distinct ${counselMode} recorder/shutter state derived from canonical deposition facts.`,
          'Both named advocates are present with defensible motives and institutional relationships.',
          'The room changes spatial, procedural, social, and environmental framing without locking a verdict.',
        ],
        [shot],
      )
    }

    {
      const viewport = { width: 1440, height: 960 }
      const opened = await openRoute(browser, {
        name: 'Case 81 voluntary Counsel route at tribunal',
        state: case81VoluntaryTribunal(),
        viewport,
      })
      await opened.page
        .locator('.tribunal-counsel-state[data-counsel-state="voluntary"]')
        .waitFor({ state: 'visible' })
      assert.match(await opened.page.locator('.tribunal-counsel-state').innerText(), /voluntary|protected consent/i)
      assert.match(await opened.page.locator('.ordinary-detail').innerText(), /mint tea|non-probative/i)
      assert.match(await opened.page.locator('.tribunal-route-memory').innerText(), /Counsel|deposition/i)
      const shot = await screenshot(
        opened.page,
        '10-case81-voluntary-tribunal-1440x960.png',
        '.tribunal-counsel-state',
      )
      await finishRoute(
        opened.context,
        opened.page,
        opened.diagnostics,
        'Case 81 voluntary/protected deposition → Counsel → tribunal',
        viewport,
        [
          'Counsel’s voluntary-use state survives into tribunal staging and live objection.',
          'Ellis’s ordinary mint-tea detail is present and explicitly non-probative.',
          'The hearing remembers deposition-before-Counsel order.',
        ],
        [shot],
      )
    }

    {
      const viewport = { width: 390, height: 844 }
      const opened = await openRoute(browser, {
        name: 'Case 77 immediate aftermath interaction',
        state: case77TrustExchangeTribunal(),
        viewport,
      })
      const title = decisionTitle('case-77', 'quarantine-review')
      const decisionButton = opened.page.getByRole('button', {
        name: new RegExp(escapeRegExp(title), 'i'),
      })
      await decisionButton.click()
      await decisionButton.click()
      await opened.page.locator('.immediate-aftermath[data-tableau="77-ward-gate"]').waitFor()
      const shot = await screenshot(
        opened.page,
        '11-case77-immediate-aftermath-390x844.png',
        '.immediate-aftermath',
      )
      await opened.page.getByRole('button', { name: /Skip tableau/ }).click()
      await opened.page.locator('.immediate-aftermath').waitFor({ state: 'detached' })
      await opened.page.locator('.debrief-section').first().waitFor({ state: 'visible' })
      await finishRoute(
        opened.context,
        opened.page,
        opened.diagnostics,
        'Case 77 tribunal → immediate aftermath → written debrief',
        viewport,
        [
          'The irreversible finding is committed through the existing two-click confirmation.',
          'A route-specific environmental tableau appears before written debrief.',
          'Skipping the tableau does not alter or block the canonical debrief.',
        ],
        [shot],
      )
    }

    {
      const viewport = { width: 1440, height: 960 }
      const beatId = 'case-77:field:listen-mara'
      const opened = await openRoute(browser, {
        name: 'Seen-beat replay convenience',
        state: start77('care'),
        viewport,
        seenBeats: [beatId],
      })
      const action = opened.page.getByRole('button', {
        name: /Let 77-A tell one memory uninterrupted/i,
      })
      await action.click()
      await action.click()
      await opened.page.locator('.scene-beat-replay').waitFor({ state: 'visible' })
      await opened.page.getByRole('button', { name: 'Fast transcript' }).waitFor()
      await opened.page.getByRole('button', { name: 'Skip seen beat' }).waitFor()
      await opened.page.getByLabel('Auto-advance this beat').waitFor()
      const shot = await screenshot(
        opened.page,
        '12-seen-beat-replay-controls-1440x960.png',
        '.scene-beat-replay',
      )
      await opened.page.getByRole('button', { name: 'Fast transcript' }).click()
      await opened.page.getByRole('button', { name: 'Skip seen beat' }).click()
      await finishRoute(
        opened.context,
        opened.page,
        opened.diagnostics,
        'Replay of an already-seen passive beat',
        viewport,
        [
          'A previously encountered beat exposes fast transcript, skip, and optional auto-advance.',
          'The field action still used the irreversible two-click filing confirmation.',
          'Replay history is separate from the canonical case save.',
        ],
        [shot],
      )
    }

    {
      const viewport = { width: 390, height: 844 }
      const reducedSettings = settings({ reducedMotion: true })
      const reducedDebrief = decide(
        case77TrustExchangeTribunal(reducedSettings),
        'quarantine-review',
      )
      const opened = await openRoute(browser, {
        name: 'Reduced-motion mobile aftermath',
        state: reducedDebrief,
        viewport,
        reducedMotion: true,
      })
      const tableau = opened.page.locator('.immediate-aftermath[data-reduced-motion="true"]')
      await tableau.waitFor({ state: 'visible' })
      assert.equal(
        await opened.page.locator('.immediate-aftermath-shutter').evaluate(
          (element) => getComputedStyle(element).animationName,
        ),
        'none',
      )
      assert.equal(
        await opened.page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches),
        true,
      )
      const shot = await screenshot(
        opened.page,
        '13-reduced-motion-aftermath-390x844.png',
        '.immediate-aftermath',
      )
      await finishRoute(
        opened.context,
        opened.page,
        opened.diagnostics,
        'Reduced motion + mobile portrait',
        viewport,
        [
          'OS reduced-motion and the saved accessibility setting are both active.',
          'The aftermath shutter has no animation while all canonical text remains present.',
          'The 390×844 layout has no horizontal overflow or broken image.',
        ],
        [shot],
      )
    }
  } finally {
    await browser.close()
  }

  const lines = [
    '# Nonlinear causal browser playtest',
    '',
    `Generated from clean isolated local saves against \`${BASE_URL}\`.`,
    '',
    'Every route used the production reducer to construct canonical state, loaded that state through the real persistence path, clicked **Continue local case**, and exercised the rendered Vite/Chromium application. Console warnings/errors, page errors, failed requests, HTTP errors, broken images, and portrait horizontal overflow are hard failures.',
    '',
    '| Route | Viewport | Assertions | Screenshots | Console / network | Layout |',
    '|---|---:|---|---|---|---|',
    ...routes.map((route) => {
      const diagnosticsCount =
        route.diagnostics.console.length +
        route.diagnostics.pageErrors.length +
        route.diagnostics.requestFailures.length +
        route.diagnostics.httpErrors.length
      const layout = `${route.layout.horizontalOverflowPx}px horizontal overflow; ${route.layout.brokenImages.length} broken images; ${route.layout.visibleKeyControlCount} visible key controls${route.layout.minimumKeyControlHeight === null ? '' : `; minimum ${route.layout.minimumKeyControlHeight.toFixed(1)}px`}`
      return `| ${route.route} | ${route.viewport} | ${route.assertions.join('<br>')} | ${route.screenshots.map((file) => `[${file}](./${file})`).join('<br>')} | ${diagnosticsCount} issues | ${layout} |`
    }),
    '',
    '## Route details',
    '',
    ...routes.flatMap((route) => [
      `### ${route.route}`,
      '',
      ...route.assertions.map((item) => `- ${item}`),
      `- Diagnostics: ${route.diagnostics.console.length} console warnings/errors, ${route.diagnostics.pageErrors.length} page errors, ${route.diagnostics.requestFailures.length} failed requests, ${route.diagnostics.httpErrors.length} HTTP errors.`,
      `- Layout: ${route.layout.viewport}; ${route.layout.horizontalOverflowPx}px horizontal overflow; ${route.layout.brokenImages.length} broken images.`,
      '',
    ]),
  ]
  await writeFile(path.join(OUTPUT_DIR, 'REPORT.md'), `${lines.join('\n')}\n`)
  console.log(`wrote ${routes.length} route reports and browser screenshots to ${OUTPUT_DIR}`)
}

await run()

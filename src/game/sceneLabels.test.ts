import { describe, expect, it } from 'vitest'
import { getCaseContent, registeredCaseIds } from './content'
import type { CaseDefinition, SceneDefinition, SceneHotspot, SiteDefinition } from './types'

// Data-level hotspot-LABEL collision test. It projects every case's scene hotspot
// labels through the two desktop review crops plus the mobile crop, and asserts no
// two simultaneously-shown labels' boxes overlap. This is what a sensory review
// caught for Case 81 (records-annex / restoration-lab / counsel-office collided
// pairwise); the authored labelOffsets fix it. A sensitivity block below proves the
// SAME projection WITHOUT those offsets still collides, so this test genuinely
// guards the fix rather than passing vacuously.
//
// It lives under src/game (not src/scene) so it may name case ids; the projection
// mirrors what SceneStage + motion.ts render — the diorama slices a 16:9 master to
// the live container aspect (motion.ts computeWindow), a flat map places labels at
// direct container fractions.

const registeredCases: [string, CaseDefinition][] = registeredCaseIds.map((id) => [
  id,
  getCaseContent(id),
])

// Review container boxes = the live .world-view box (layout px), measured in Chrome
// on 2026-07-20 at each review window. Desktop width follows the layout exactly:
//   min(viewportWidth − 380 sidebar, 1120 phase-page) − 68 horizontal padding,
//   height = 390 (world-view min-height). Mobile is the single-column box at 390px.
const CONFIGS = [
  { name: '1800x820', w: 1052, h: 390 },
  { name: '1440x900', w: 992, h: 390 },
  { name: '390x844-mobile', w: 358, h: 280 },
] as const

// Label metrics measured from the live label (monospace, 0.72rem = 11.52px):
// ~7.63px advance per char (includes 0.06em letter-spacing), 13px line box, and the
// label top sits 26px below the marker centre (22px marker half + 4px gap).
const EM_PX = 7.63
const LINE_PX = 13
const MARKER_GAP_PX = 26

interface Box {
  x0: number
  x1: number
  y0: number
  y1: number
}

interface Win {
  x: number
  y: number
  w: number
  h: number
}

// Slice (cover) window for a container aspect over the 16:9 master — identical to
// motion.ts computeWindow. A flat map (no diorama art) skips it: its labels sit at
// direct container fractions (SceneStage sets left/top = x/y * 100%).
function windowFor(scene: SceneDefinition, w: number, h: number): Win {
  if (!scene.LayerArt) return { x: 0, y: 0, w: 1, h: 1 }
  const A = w / h
  const M = scene.master.w / scene.master.h
  if (A >= M) return { x: 0, y: (1 - M / A) / 2, w: 1, h: M / A }
  return { x: (1 - A / M) / 2, y: 0, w: A / M, h: 1 }
}

// The on-screen AABB of a hotspot's label, in container px, for one config. The
// authored offset (master-normalized fractions) projects through the same crop
// scaling as the marker position, so it displaces the label consistently.
function labelBox(
  scene: SceneDefinition,
  hotspot: SceneHotspot,
  name: string,
  w: number,
  h: number,
  useOffset: boolean,
): Box {
  const win = windowFor(scene, w, h)
  const cx = ((hotspot.x - win.x) / win.w) * w
  const cy = ((hotspot.y - win.y) / win.h) * h
  const off = useOffset ? hotspot.labelOffset ?? { dx: 0, dy: 0 } : { dx: 0, dy: 0 }
  const dxPx = (off.dx * w) / win.w
  const dyPx = (off.dy * h) / win.h
  const width = name.length * EM_PX
  const centerX = cx + dxPx
  const topY = cy + MARKER_GAP_PX + dyPx
  return { x0: centerX - width / 2, x1: centerX + width / 2, y0: topY, y1: topY + LINE_PX }
}

function intersects(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
}

function projectLabels(
  scene: SceneDefinition,
  sites: readonly SiteDefinition[],
  w: number,
  h: number,
  useOffset: boolean,
): { site: string; box: Box }[] {
  return scene.hotspots.map((hotspot) => {
    const name = sites.find((site) => site.id === hotspot.siteId)?.name ?? hotspot.siteId
    return { site: hotspot.siteId, box: labelBox(scene, hotspot, name, w, h, useOffset) }
  })
}

// First overlapping pair (site ids) or null when every pair is clear.
function firstOverlap(labels: { site: string; box: Box }[]): [string, string] | null {
  for (let i = 0; i < labels.length; i += 1) {
    for (let j = i + 1; j < labels.length; j += 1) {
      if (intersects(labels[i].box, labels[j].box)) return [labels[i].site, labels[j].site]
    }
  }
  return null
}

describe.each(registeredCases)('%s hotspot label layout', (_caseId, content) => {
  const { scene, sites } = content

  it.each(CONFIGS)('has no pairwise label overlap at $name', (config) => {
    const overlap = firstOverlap(projectLabels(scene, sites, config.w, config.h, true))
    expect(overlap ? `${overlap[0]} × ${overlap[1]}` : null).toBeNull()
  })
})

// Sensitivity guard: strip the authored offsets and the three central Case 81
// labels must collide at both desktop crops — the pre-fix failure. This keeps the
// test honest (it fails on the pre-fix data) and would flag a regression that
// removed or weakened the offsets.
describe('Case 81 label offsets are load-bearing', () => {
  const { scene, sites } = getCaseContent('case-81')

  it.each([
    { name: '1800x820', w: 1052, h: 390 },
    { name: '1440x900', w: 992, h: 390 },
  ])('un-offset labels DO collide at $name', (config) => {
    const overlap = firstOverlap(projectLabels(scene, sites, config.w, config.h, false))
    expect(overlap).not.toBeNull()
  })
})

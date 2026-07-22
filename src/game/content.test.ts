import { describe, expect, it } from 'vitest'
import {
  getCaseContent,
  getPrecedentLine,
  getReactionsForSource,
  getSwitchableCaseIds,
  getTensionLine,
  personas,
  registeredCaseIds,
  resolveFieldAction,
} from './content'
import { createInitialGameState } from './engine'
import { ROOM_STAGES, SCENE_STATES } from './types'
import type { CaseDefinition, GameState, MethodTag, SceneAcousticTreatment } from './types'

function expectUnique(ids: readonly string[]) {
  expect(new Set(ids).size).toBe(ids.length)
}

function expectFiniteVector3(vector: readonly [number, number, number]) {
  expect(vector).toHaveLength(3)
  vector.forEach((value) => expect(Number.isFinite(value)).toBe(true))
}

function expectBoundedAcoustics(treatment: SceneAcousticTreatment) {
  ;[treatment.weatherLevel, treatment.roomLevel, treatment.humLevel].forEach((level) => {
    expect(Number.isFinite(level)).toBe(true)
    expect(level).toBeGreaterThanOrEqual(0)
    expect(level).toBeLessThanOrEqual(1)
  })
  expect(treatment.weatherCutoffHz).toBeGreaterThanOrEqual(200)
  expect(treatment.weatherCutoffHz).toBeLessThanOrEqual(12_000)
  expect(treatment.roomCutoffHz).toBeGreaterThanOrEqual(80)
  expect(treatment.roomCutoffHz).toBeLessThanOrEqual(2_000)
  expect(treatment.humHz).toBeGreaterThanOrEqual(30)
  expect(treatment.humHz).toBeLessThanOrEqual(120)
}

// Every registered case is held to the same structural contract. Case 81's stub
// must satisfy all of it exactly as Case 77 does.
const registeredCases: [string, CaseDefinition][] = registeredCaseIds.map((id) => [
  id,
  getCaseContent(id),
])

describe.each(registeredCases)('%s content integrity', (caseId, content) => {
  const {
    approaches,
    fieldActions,
    evidenceDefinitions,
    fragments,
    fragmentEvidenceLinks,
    reconstructionDefinitions,
    decisions,
    sites,
    getReconstructionForFragments,
  } = content

  it('holds the structural template: 4 sites × 2 actions, 4 fragments/models, ≥4 decisions', () => {
    expect(sites).toHaveLength(4)
    expect(fieldActions).toHaveLength(8)
    expect(fragments).toHaveLength(4)
    expect(reconstructionDefinitions).toHaveLength(4)
    // Decisions vary by case (Case 77 has 4; Case 81 adds the fifth verdict), so
    // the count is a floor, not a fixed number — the tension matrix below is what
    // holds decisions × reconstructions consistent per case.
    expect(decisions.length).toBeGreaterThanOrEqual(4)
    expect(approaches).toHaveLength(4)
    sites.forEach((site) => expect(site.actionIds).toHaveLength(2))
  })

  it('keeps authored IDs unique', () => {
    expectUnique(fieldActions.map((item) => item.id))
    expectUnique(evidenceDefinitions.map((item) => item.id))
    expectUnique(fragments.map((item) => item.id))
    expectUnique(reconstructionDefinitions.map((item) => item.id))
    expectUnique(decisions.map((item) => item.id))
    expectUnique(sites.map((item) => item.id))
    expectUnique(approaches.map((item) => item.id))
  })

  it('references every field action from exactly one matching site', () => {
    const referencedActionIds = sites.flatMap((site) =>
      site.actionIds.map((actionId) => {
        const action = fieldActions.find((candidate) => candidate.id === actionId)
        expect(action?.siteId).toBe(site.id)
        return actionId
      }),
    )

    expectUnique(referencedActionIds)
    expect(new Set(referencedActionIds)).toEqual(new Set(fieldActions.map((item) => item.id)))
  })

  it('grants exactly one tribunal override and gates exactly one decision on it', () => {
    expect(fieldActions.filter((action) => action.grantsTribunalOverride)).toHaveLength(1)
    expect(decisions.filter((decision) => decision.requiresOverride)).toHaveLength(1)
  })

  it('marks exactly one decision illicit — the override-gated one — with warning tone and non-procedure tags', () => {
    const illicit = decisions.filter((decision) => decision.illicit)
    expect(illicit).toHaveLength(1)

    const overrideDecision = decisions.find((decision) => decision.requiresOverride)
    expect(overrideDecision).toBeDefined()
    // The single illicit decision is exactly the override-gated one.
    expect(illicit[0]).toBe(overrideDecision)

    // Its authored runtime signature: warning tone plus method tags that are not
    // the lawful 'procedure' default (drives the Tribunal label/tone + method memory).
    expect(overrideDecision?.tone).toBe('warning')
    expect(overrideDecision?.methodTags.length).toBeGreaterThan(0)
    expect(overrideDecision?.methodTags).not.toContain('procedure')
  })

  it('gives every non-illicit decision a neutral tone and no override gate', () => {
    decisions
      .filter((decision) => !decision.illicit)
      .forEach((decision) => {
        expect(decision.tone).toBe('neutral')
        expect(decision.requiresOverride).toBe(false)
      })
  })

  it('flags exactly one reconstruction with the unresolved (warning) tone', () => {
    expect(reconstructionDefinitions.filter((model) => model.unresolvedTone)).toHaveLength(1)
  })

  it('resolves every authored evidence reference', () => {
    const evidenceIds = new Set(evidenceDefinitions.map((item) => item.id))
    fieldActions.forEach((action) => expect(evidenceIds.has(action.evidenceId)).toBe(true))
    reconstructionDefinitions.forEach((model) => expect(evidenceIds.has(model.evidenceId)).toBe(true))
  })

  it('links every fragment to existing evidence', () => {
    const fragmentIds = new Set(fragments.map((item) => item.id))
    const evidenceIds = new Set(evidenceDefinitions.map((item) => item.id))
    expect(new Set(Object.keys(fragmentEvidenceLinks))).toEqual(fragmentIds)
    Object.values(fragmentEvidenceLinks).forEach((links) => {
      expect(links.length).toBeGreaterThan(0)
      links.forEach((evidenceId) => expect(evidenceIds.has(evidenceId)).toBe(true))
    })
  })

  it('produces the same reconstruction regardless of anchor order', () => {
    for (let left = 0; left < fragments.length; left += 1) {
      for (let right = left + 1; right < fragments.length; right += 1) {
        const first = fragments[left]
        const second = fragments[right]
        if (!first || !second) continue

        expect(getReconstructionForFragments([first.id, second.id])).toBe(
          getReconstructionForFragments([second.id, first.id]),
        )
      }
    }
  })

  it('makes every reconstruction model reachable from some anchor pairing', () => {
    const reached = new Set<string>()
    for (let left = 0; left < fragments.length; left += 1) {
      for (let right = left + 1; right < fragments.length; right += 1) {
        const first = fragments[left]
        const second = fragments[right]
        if (!first || !second) continue
        reached.add(getReconstructionForFragments([first.id, second.id]))
      }
    }
    expect(reached).toEqual(new Set(reconstructionDefinitions.map((model) => model.id)))
  })

  it('authors a counterfactual note for every field action', () => {
    fieldActions.forEach((action) => {
      expect(typeof action.counterfactualNote).toBe('string')
      expect((action.counterfactualNote ?? '').trim().length).toBeGreaterThan(0)
    })
  })

  it('authors an unvisited note for every site', () => {
    sites.forEach((site) => {
      expect(site.unvisitedNote.trim().length).toBeGreaterThan(0)
    })
  })

  it('keeps optional site close reads display-only and complete', () => {
    sites.forEach((site) => {
      if (!site.closeup) return
      expect(site.closeup.src).toMatch(/^\/images\/.+\.webp$/)
      expect(site.closeup.caption.trim().length).toBeGreaterThan(0)
      if (site.closeup.focalPoint) {
        expect(site.closeup.focalPoint.x).toBeGreaterThanOrEqual(0)
        expect(site.closeup.focalPoint.x).toBeLessThanOrEqual(1)
        expect(site.closeup.focalPoint.y).toBeGreaterThanOrEqual(0)
        expect(site.closeup.focalPoint.y).toBeLessThanOrEqual(1)
      }
      const zoneIds = new Set<string>()
      site.closeup.zones?.forEach((zone) => {
        expect(site.actionIds).toContain(zone.actionId)
        expect(zoneIds.has(zone.actionId)).toBe(false)
        zoneIds.add(zone.actionId)
        expect(zone.x).toBeGreaterThanOrEqual(0)
        expect(zone.x).toBeLessThanOrEqual(1)
        expect(zone.y).toBeGreaterThanOrEqual(0)
        expect(zone.y).toBeLessThanOrEqual(1)
      })
      if (site.closeup.zones) {
        expect(zoneIds).toEqual(new Set(site.actionIds))
      }
    })
  })

  it('authors a complete, generic classification room wherever a site declares one', () => {
    const stageIds = new Set<string>(ROOM_STAGES)
    sites.forEach((site) => {
      const room = site.room
      if (!room) return

      // Exactly three statute categories, unique ids.
      expect(room.categories).toHaveLength(3)
      expectUnique(room.categories.map((category) => category.id))
      room.categories.forEach((category) => {
        expect(category.label.trim().length).toBeGreaterThan(0)
      })

      // Cards: unique ids, exactly one unclassifiable, each authors the line its
      // flag requires.
      expectUnique(room.cards.map((card) => card.id))
      expect(room.cards.filter((card) => !card.classifiable)).toHaveLength(1)
      room.cards.forEach((card) => {
        expect(card.title.trim().length).toBeGreaterThan(0)
        expect(card.question.trim().length).toBeGreaterThan(0)
        expect(card.source.trim().length).toBeGreaterThan(0)
        if (card.classifiable) {
          expect((card.filedLine ?? '').trim().length).toBeGreaterThan(0)
        } else {
          expect((card.refusalLine ?? '').trim().length).toBeGreaterThan(0)
        }
      })

      // The standard system lines exist; the flatten suffix carries the token the
      // reducer interpolates.
      expect(room.flattenLine).toContain('{category}')
      expect(room.refusalObjection.trim().length).toBeGreaterThan(0)
      expect(room.shelfZero.objection.trim().length).toBeGreaterThan(0)
      expect(room.shelfZero.holdingLine.trim().length).toBeGreaterThan(0)
      expect(room.lockedLine.trim().length).toBeGreaterThan(0)
      expect(room.unlockLine.trim().length).toBeGreaterThan(0)

      // Exactly three removal slips, unique ids, each with a fragment.
      expect(room.slips).toHaveLength(3)
      expectUnique(room.slips.map((slip) => slip.id))
      room.slips.forEach((slip) => expect(slip.fragment.trim().length).toBeGreaterThan(0))

      // Plate zone anchors reference stages that exist, in master-normalized bounds.
      Object.entries(room.zones).forEach(([stage, anchor]) => {
        expect(stageIds.has(stage)).toBe(true)
        expect(anchor.x).toBeGreaterThanOrEqual(0)
        expect(anchor.x).toBeLessThanOrEqual(1)
        expect(anchor.y).toBeGreaterThanOrEqual(0)
        expect(anchor.y).toBeLessThanOrEqual(1)
      })

      // A worldOutcome entry for EVERY action id of the room's site, each with a
      // distinct outcome id and a legible variant/label pair.
      const outcomes = site.actionIds.map((actionId) => {
        const outcome = room.worldOutcome[actionId]
        expect(outcome).toBeDefined()
        expect(['opened', 'sealed']).toContain(outcome!.variant)
        expect(outcome!.portalLabel.trim().length).toBeGreaterThan(0)
        expect(outcome!.switcherLabel.trim().length).toBeGreaterThan(0)
        return outcome!
      })
      // The two methods resolve to visibly distinct outcomes.
      expectUnique(outcomes.map((outcome) => outcome.outcomeId))
      expectUnique(outcomes.map((outcome) => outcome.variant))
    })
  })

  it('maps a nonempty tension line for every reconstruction × decision pair', () => {
    let pairs = 0
    reconstructionDefinitions.forEach((model) => {
      decisions.forEach((decision) => {
        const line = getTensionLine(caseId, model.id, decision.id)
        expect(typeof line).toBe('string')
        expect(line.trim().length).toBeGreaterThan(0)
        pairs += 1
      })
    })
    // Derived count: Case 77 keeps 4 × 4 = 16; Case 81 is 4 × 5 = 20.
    expect(pairs).toBe(reconstructionDefinitions.length * decisions.length)
  })

  it('authors a Mirror aside and consequence lines for every decision', () => {
    decisions.forEach((decision) => {
      expect((content.mirrorBriefingAsides[decision.id] ?? '').trim().length).toBeGreaterThan(0)
      const consequences = content.decisionConsequences[decision.id] ?? []
      expect(consequences.length).toBeGreaterThan(0)
      consequences.forEach((line) => expect(line.trim().length).toBeGreaterThan(0))
    })
  })

  it('authors an in-run reaction for every field action, with two distinct voices on the highest-stakes ones', () => {
    fieldActions.forEach((action) => {
      const reactions = action.reactions ?? []
      expect(reactions.length).toBeGreaterThanOrEqual(1)

      // Highest-stakes actions — those that grant the override or cost a persona
      // two or more trust — speak in at least two distinct voices.
      const deltas = Object.values(action.trust)
      const minDelta = deltas.length > 0 ? Math.min(...deltas) : 0
      if (action.grantsTribunalOverride || minDelta <= -2) {
        expect(reactions.length).toBeGreaterThanOrEqual(2)
        expectUnique(reactions.map((reaction) => reaction.persona))
      }
    })
  })

  it('authors an in-run reaction for every reconstruction outcome', () => {
    reconstructionDefinitions.forEach((model) => {
      expect((model.reactions ?? []).length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── Scene direction completeness ──────────────────────────────────────────
  const { scene } = content

  it('registers one scene hotspot per site, 1:1', () => {
    const hotspotSiteIds = scene.hotspots.map((hotspot) => hotspot.siteId)
    expect(hotspotSiteIds).toHaveLength(sites.length)
    expectUnique(hotspotSiteIds)
    expect(new Set(hotspotSiteIds)).toEqual(new Set(sites.map((site) => site.id)))
  })

  it('keeps an authored bounded world finite, positive, and registered to the scene sites', () => {
    const world = scene.world
    if (!world) return

    Object.values(world.room).forEach((dimension) => {
      expect(Number.isFinite(dimension)).toBe(true)
      expect(dimension).toBeGreaterThan(0)
    })
    expect(Number.isFinite(world.travelMs)).toBe(true)
    expect(world.travelMs).toBeGreaterThan(0)
    expectFiniteVector3(world.homeCamera.position)
    expectFiniteVector3(world.homeCamera.target)
    expectBoundedAcoustics(world.acoustics)

    const portalSiteIds = world.portals.map((portal) => portal.siteId)
    expectUnique(portalSiteIds)
    expect(new Set(portalSiteIds)).toEqual(new Set(sites.map((site) => site.id)))

    world.portals.forEach((portal) => {
      expectFiniteVector3(portal.position)
      expectFiniteVector3(portal.camera.position)
      expectFiniteVector3(portal.camera.target)
      expect(Number.isFinite(portal.rotationY)).toBe(true)
      Object.values(portal.size).forEach((dimension) => {
        expect(Number.isFinite(dimension)).toBe(true)
        expect(dimension).toBeGreaterThan(0)
      })
      Object.values(portal.posterAnchor).forEach((coordinate) => {
        expect(Number.isFinite(coordinate)).toBe(true)
        expect(coordinate).toBeGreaterThanOrEqual(0)
        expect(coordinate).toBeLessThanOrEqual(1)
      })
      expectBoundedAcoustics(portal.acoustics)
    })
  })

  it('places every hotspot in master-normalized bounds on a declared plane', () => {
    const planeNames = new Set([...scene.layers.map((layer) => layer.name), 'flat'])
    scene.hotspots.forEach((hotspot) => {
      expect(hotspot.x).toBeGreaterThanOrEqual(0)
      expect(hotspot.x).toBeLessThanOrEqual(1)
      expect(hotspot.y).toBeGreaterThanOrEqual(0)
      expect(hotspot.y).toBeLessThanOrEqual(1)
      expect(hotspot.r).toBeGreaterThan(0)
      expect(planeNames.has(hotspot.plane)).toBe(true)
    })
  })

  it('authors plane depth as a compensated z-ladder (rest framing pinned to net 1)', () => {
    // The stage projects each projected plane at scene.perspectivePx; the
    // authored scale must exactly cancel the foreshortening at its translateZ
    // (scale = (P - z) / P for z ≤ 0), so the resting framing is identical to
    // the flat projection and depth only reveals under drift/travel. SceneStage
    // cascades these as --plane-z/-s CSS vars, so names must stay var-safe.
    const P = scene.perspectivePx
    expect(P).toBeGreaterThan(0)
    scene.layers.forEach((layer) => {
      expect(layer.name).toMatch(/^[a-z][a-z0-9-]*$/)
      expect(layer.z).toBeLessThanOrEqual(0)
      if (layer.kind === 'raster' || layer.kind === 'svg') {
        expect(layer.scale).toBeCloseTo((P - layer.z) / P, 3)
      }
    })

    const projectedPlanes = scene.layers.filter(
      (layer) => layer.kind === 'raster' || layer.kind === 'svg',
    )
    expect(new Set(projectedPlanes.map((layer) => layer.z)).size).toBe(projectedPlanes.length)
    projectedPlanes.slice(1).forEach((layer, index) => {
      expect(layer.z).toBeGreaterThan(projectedPlanes[index]!.z)
    })
  })

  it('defines all six scene-state treatments as nonempty custom-property sets', () => {
    expect(new Set(Object.keys(scene.states))).toEqual(new Set(SCENE_STATES))
    SCENE_STATES.forEach((stateId) => {
      const treatment = scene.states[stateId]
      const keys = Object.keys(treatment)
      expect(keys.length).toBeGreaterThan(0)
      keys.forEach((key) => expect(key.startsWith('--')).toBe(true))
    })
  })

  it('declares a valid weather config', () => {
    const weather = scene.weather
    expect(['rain', 'dust', 'none']).toContain(weather.kind)
    weather.suppressed.forEach((stateId) => expect(SCENE_STATES).toContain(stateId))
    if (weather.kind === 'rain') {
      expect(typeof weather.intensity.neutral).toBe('number')
    }
    if (weather.kind === 'dust') {
      expect(weather.maxParticles ?? 0).toBeGreaterThan(0)
      const volumes = weather.spawnVolumes ?? []
      expect(volumes.length).toBeGreaterThan(0)
      volumes.forEach((volume) => {
        expect(volume.w).toBeGreaterThan(0)
        expect(volume.h).toBeGreaterThan(0)
      })
    }
  })

  it('locks the alarm-tier atmosphere invariants when a table is authored', () => {
    const tiers = scene.alarm
    if (!tiers) return
    // One tier per clamped engine alarm value (0–3).
    expect(tiers).toHaveLength(4)
    // Tier 0 must reproduce the base look exactly: no veil, the weather's own
    // particle count, and the motion loop's seeded 5–13 px/s fall (the fallback
    // literals in motion.ts seedMotes).
    expect(tiers[0].hazeVeil).toBe(0)
    expect(tiers[0].maxParticles).toBe(scene.weather.maxParticles)
    expect(tiers[0].fallSpeed).toEqual({ min: 5, max: 13 })
    tiers.forEach((tier, index) => {
      expect(tier.hazeVeil).toBeGreaterThanOrEqual(0)
      expect(tier.hazeVeil).toBeLessThan(1)
      expect(tier.fallSpeed.min).toBeLessThan(tier.fallSpeed.max)
      if (index === 0) return
      const prev = tiers[index - 1]
      // Rising alarm may never read as calmer air.
      expect(tier.hazeVeil).toBeGreaterThanOrEqual(prev.hazeVeil)
      expect(tier.maxParticles).toBeGreaterThanOrEqual(prev.maxParticles)
      expect(tier.fallSpeed.min).toBeGreaterThanOrEqual(prev.fallSpeed.min)
      expect(tier.fallSpeed.max).toBeGreaterThanOrEqual(prev.fallSpeed.max)
    })
    // The ceiling must be unmistakable next to the base look.
    expect(tiers[3].hazeVeil).toBeGreaterThan(tiers[0].hazeVeil)
    expect(tiers[3].maxParticles).toBeGreaterThan(tiers[0].maxParticles)
  })

  it('keeps every hotspot inside the declared mobile crop window', () => {
    const win = scene.crops.mobile.window
    scene.hotspots.forEach((hotspot) => {
      expect(hotspot.x).toBeGreaterThanOrEqual(win.x)
      expect(hotspot.x).toBeLessThanOrEqual(win.x + win.w)
      expect(hotspot.y).toBeGreaterThanOrEqual(win.y)
      expect(hotspot.y).toBeLessThanOrEqual(win.y + win.h)
    })
  })

  it('ships a background raster source for the surface art', () => {
    const raster = scene.layers.find((layer) => layer.raster)
    expect(raster?.raster?.src.length ?? 0).toBeGreaterThan(0)
  })

  it('authors a valid figure when one is present (plane, master bounds, six states)', () => {
    const figure = scene.figure
    // A scene may author no figure (Case 77): the check applies only when present.
    if (!figure) return
    const planeNames = new Set([...scene.layers.map((layer) => layer.name), 'flat'])
    expect(planeNames.has(figure.plane)).toBe(true)
    expect(figure.src.trim().length).toBeGreaterThan(0)
    expect(figure.blend.trim().length).toBeGreaterThan(0)
    expect(figure.x).toBeGreaterThanOrEqual(0)
    expect(figure.x).toBeLessThanOrEqual(1)
    expect(figure.y).toBeGreaterThanOrEqual(0)
    expect(figure.y).toBeLessThanOrEqual(1)
    expect(figure.height).toBeGreaterThan(0)
    expect(figure.height).toBeLessThanOrEqual(1)
    // Every one of the six scene states defines a nonempty custom-property set.
    expect(new Set(Object.keys(figure.states))).toEqual(new Set(SCENE_STATES))
    SCENE_STATES.forEach((stateId) => {
      const keys = Object.keys(figure.states[stateId])
      expect(keys.length).toBeGreaterThan(0)
      keys.forEach((key) => expect(key.startsWith('--')).toBe(true))
    })
  })

  it('authors a valid registry photograph when one is present (src, caption, alt)', () => {
    const dossier = content.caseFile.dossierImage
    // A case may author no registry photograph (Case 77): checked only when present.
    if (!dossier) return
    expect(dossier.src.trim().length).toBeGreaterThan(0)
    expect(dossier.caption.trim().length).toBeGreaterThan(0)
    expect(dossier.alt.trim().length).toBeGreaterThan(0)
  })

  it('gives every reaction a valid persona and a nonempty line within 160 characters', () => {
    const validPersonas = new Set(personas.map((persona) => persona.id))
    const allReactions = [
      ...fieldActions.flatMap((action) => action.reactions ?? []),
      ...reconstructionDefinitions.flatMap((model) => model.reactions ?? []),
    ]

    expect(allReactions.length).toBeGreaterThanOrEqual(fieldActions.length + reconstructionDefinitions.length)
    allReactions.forEach((reaction) => {
      expect(validPersonas.has(reaction.persona)).toBe(true)
      expect(reaction.line.trim().length).toBeGreaterThan(0)
      expect([...reaction.line].length).toBeLessThanOrEqual(160)
    })
  })
})

describe('bounded spatial world coverage', () => {
  it('progressively enhances Case 77 and leaves Case 81 on its authored non-WebGL scene', () => {
    expect(getCaseContent('case-77').scene.world).toBeDefined()
    expect(getCaseContent('case-81').scene.world).toBeUndefined()
  })

  it('gives the Case 77 hub and every registered threshold a distinct acoustic perspective', () => {
    const world = getCaseContent('case-77').scene.world
    expect(world).toBeDefined()
    if (!world) return

    const treatments = [world.acoustics, ...world.portals.map((portal) => portal.acoustics)]
    expect(treatments).toHaveLength(world.portals.length + 1)
    expect(new Set(treatments.map((treatment) => JSON.stringify(treatment))).size).toBe(
      treatments.length,
    )
  })
})

// Non-vacuity guard: the generic checks above return early when a case authors no
// figure/photograph, so this asserts the case that DOES author Ellis actually
// carries both, keeping the generic tests from passing on missing data.
describe('Case 81 authors Ellis (figure + registry photograph)', () => {
  const content = getCaseContent('case-81')

  it('composites a seated figure at the mid-plane table', () => {
    const figure = content.scene.figure
    expect(figure).toBeDefined()
    expect(figure?.plane).toBe('mid')
    expect(figure?.src).toContain('.webp')
    expect(figure?.states.aftermath['--fig-o']).toBe(0)
  })

  it('carries an in-voice registry photograph on the case file', () => {
    const dossier = content.caseFile.dossierImage
    expect(dossier).toBeDefined()
    expect(dossier?.src).toContain('.webp')
    expect(dossier?.alt.toLowerCase()).toContain('ellis marne')
  })
})

// Non-vacuity guard for the classification-room checks: the generic per-case test
// returns early when a site has no room, so this asserts the case that DOES author
// one (Case 77's Small Archive) actually carries it, and that its authored strings
// are reached by the recursive no-placeholder string walk — the walk is what covers
// the room copy, so proving reachability keeps that coverage honest.
describe('Case 77 authors the Small Archive classification room', () => {
  const content = getCaseContent('case-77')
  const roomSite = content.sites.find((site) => site.room)

  it('attaches the room to the Small Archive with both outcome variants', () => {
    expect(roomSite?.id).toBe('small-archive')
    const room = roomSite?.room
    expect(room).toBeDefined()
    const variants = Object.values(room!.worldOutcome).map((outcome) => outcome.variant)
    expect(new Set(variants)).toEqual(new Set(['opened', 'sealed']))
  })

  it('surfaces the room strings to the recursive content string-walk', () => {
    const strings: string[] = []
    collectStrings(content, strings)
    const room = roomSite!.room!
    // A card question, the shelf-zero holding line, and a slip fragment must all be
    // reachable from the walked content tree (otherwise the placeholder test is
    // vacuous over the room).
    expect(strings).toContain(room.cards[0]!.question)
    expect(strings).toContain(room.shelfZero.holdingLine)
    expect(strings).toContain(room.slips[0]!.fragment)
  })
})

describe('cross-case precedent line', () => {
  it('cites the prior case ruling at Case 81, keyed by the Case 77 decision', () => {
    // The charter ruling from Case 77 is cited by name in Case 81's precedent.
    expect(getPrecedentLine('case-81', { 'case-77': 'charter-new-person' })).toMatch(/new person/i)
    // Every Case 77 decision must have a precedent variant.
    getCaseContent('case-77').decisions.forEach((decision) => {
      const line = getPrecedentLine('case-81', { 'case-77': decision.id })
      expect(line).not.toBeNull()
      expect((line ?? '').trim().length).toBeGreaterThan(0)
    })
  })

  it('returns null when no prior verdict exists or the case cites none', () => {
    expect(getPrecedentLine('case-81', {})).toBeNull()
    // Case 77 cites no earlier case.
    expect(getPrecedentLine('case-77', { 'case-77': 'certify-continuity' })).toBeNull()
  })
})

describe('resolveFieldAction (cross-case precedent effects)', () => {
  const case81 = getCaseContent('case-81')
  const base = case81.fieldActions.find((action) => action.id === 'forge-certification-seal')

  it('returns the authored base by reference with no precedents (identity)', () => {
    expect(resolveFieldAction(case81, 'forge-certification-seal', {})).toBe(base)
  })

  it('returns the authored base by reference for a non-matching precedent', () => {
    // A Case 77 verdict other than overwrite-record triggers nothing.
    expect(
      resolveFieldAction(case81, 'forge-certification-seal', { 'case-77': 'certify-continuity' }),
    ).toBe(base)
  })

  it('returns undefined for an unknown action id', () => {
    expect(resolveFieldAction(case81, 'no-such-action', { 'case-77': 'overwrite-record' })).toBeUndefined()
  })

  it('applies the overwrite-record override: alarm 2 and each copy variant', () => {
    const resolved = resolveFieldAction(case81, 'forge-certification-seal', {
      'case-77': 'overwrite-record',
    })
    expect(resolved).toBeDefined()
    expect(base).toBeDefined()
    if (!resolved || !base) return

    // 1) The forged hand trips a live trace this time (base is 1).
    expect(base.alarmDelta).toBe(1)
    expect(resolved.alarmDelta).toBe(2)
    // 2) The pre-commit hint is the authored variant that explains the elevated risk.
    expect(resolved.consequence).not.toBe(base.consequence)
    expect(resolved.consequence).toContain('Continuity Directorate')
    // 3) The resolved event detail is the authored variant that acknowledges the watch.
    expect(resolved.eventDetail).not.toBe(base.eventDetail)
    expect(resolved.eventDetail).toContain('Continuity Directorate')
    // 4) The Defector's line is replaced (in-voice, ≤140 chars); the Registrar's is not.
    const defector = resolved.reactions?.find((r) => r.persona === 'defector')
    const baseDefector = base.reactions?.find((r) => r.persona === 'defector')
    expect(defector?.line).toBeDefined()
    expect(defector?.line).not.toBe(baseDefector?.line)
    expect([...(defector?.line ?? '')].length).toBeLessThanOrEqual(140)
    const registrar = resolved.reactions?.find((r) => r.persona === 'registrar')
    const baseRegistrar = base.reactions?.find((r) => r.persona === 'registrar')
    expect(registrar?.line).toBe(baseRegistrar?.line)

    // 5) Everything else is unchanged.
    expect(resolved.evidenceId).toBe(base.evidenceId)
    expect(resolved.grantsTribunalOverride).toBe(base.grantsTribunalOverride)
    expect(resolved.trust).toEqual(base.trust)
    expect(resolved.methodTags).toEqual(base.methodTags)
  })

  it('leaves sibling actions and Case 77 untouched under the matching precedent', () => {
    const sibling = case81.fieldActions.find((action) => action.id === 'pull-service-record')
    expect(
      resolveFieldAction(case81, 'pull-service-record', { 'case-77': 'overwrite-record' }),
    ).toBe(sibling)
    // Case 77 authors no precedent effects at all.
    expect(getCaseContent('case-77').precedentEffects ?? []).toHaveLength(0)
  })

  it('surfaces the variant reactions through getReactionsForSource in the log path', () => {
    const plain = getReactionsForSource('case-81', 'field-action', 'forge-certification-seal', {})
    const watched = getReactionsForSource('case-81', 'field-action', 'forge-certification-seal', {
      'case-77': 'overwrite-record',
    })
    expect(plain).toEqual(base?.reactions)
    expect(watched).not.toEqual(plain)
    expect(watched.find((r) => r.persona === 'defector')?.line).toContain('dead hand')
  })
})

describe('precedent effects referential integrity', () => {
  it('references a registered case, a real decision of it, and real action ids of the owning case', () => {
    const validPersonas = new Set(personas.map((persona) => persona.id))
    registeredCases.forEach(([, content]) => {
      const effects = content.precedentEffects ?? []
      effects.forEach((effect) => {
        // whenCase is a registered case.
        expect(registeredCaseIds).toContain(effect.whenCase)
        // whenDecision is a real decision of that referenced case.
        const priorDecisionIds = getCaseContent(effect.whenCase).decisions.map((d) => d.id)
        expect(priorDecisionIds).toContain(effect.whenDecision)
        // Every overridden action id belongs to THIS (the owning) case.
        const ownActionIds = new Set(content.fieldActions.map((action) => action.id))
        Object.entries(effect.fieldActionOverrides).forEach(([actionId, override]) => {
          expect(ownActionIds.has(actionId)).toBe(true)
          // Any variant reactions must still be valid, nonempty, in-bounds voices.
          ;(override.reactions ?? []).forEach((reaction) => {
            expect(validPersonas.has(reaction.persona)).toBe(true)
            expect(reaction.line.trim().length).toBeGreaterThan(0)
            expect([...reaction.line].length).toBeLessThanOrEqual(160)
          })
        })
      })
    })
  })
})

// Recursively gathers every authored string reachable from a value: strings,
// array elements, and plain-object values. Functions and non-string primitives
// are skipped (the two content functions are exercised separately below).
function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    out.push(value)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, out))
    return
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStrings(item, out))
  }
}

describe.each(registeredCases)('%s carries no placeholder text', (_caseId, content) => {
  it('has no [TODO marker in any authored string', () => {
    const strings: string[] = []
    collectStrings(content, strings)

    // The persona reflection is a function, so its branches are not reachable by
    // the recursive walk. Exercise every branch (decision × method × trust) and
    // fold the results into the same no-placeholder assertion.
    const methodMatrix: MethodTag[][] = [[], ['fraud', 'systems'], ['coercion'], ['care'], ['stealth']]
    content.decisions.forEach((decision) => {
      methodMatrix.forEach((methodTags) => {
        ;[-3, 3].forEach((trustValue) => {
          const state: GameState = {
            ...createInitialGameState(),
            caseId: content.id,
            decision: decision.id,
            methodTags,
            alarm: 1,
            trust: {
              registrar: trustValue,
              shepherd: trustValue,
              defector: trustValue,
              archivist: trustValue,
            },
          }
          personas.forEach((persona) =>
            strings.push(content.getPersonaReflection(persona.id, state)),
          )
        })
      })
    })

    strings.forEach((line) => expect(line).not.toContain('[TODO'))
  })
})

describe('consent branches the Case 81 debrief reflections', () => {
  const content = getCaseContent('case-81')

  function case81State(consent: 'yes' | 'no' | 'unasked', decision: string): GameState {
    return {
      ...createInitialGameState(),
      caseId: 'case-81',
      decision,
      depositionRecord: {
        actionId: 'take-sworn-statement',
        beats: ['corroborate', 'corroborate', 'corroborate'],
        askedConsent: consent !== 'unasked',
        consent,
      },
    }
  }

  it('certifying a witness who said no reads differently than one who said yes', () => {
    const yes = content.getPersonaReflection('shepherd', case81State('yes', 'certify-witness'))
    const no = content.getPersonaReflection('shepherd', case81State('no', 'certify-witness'))
    expect(yes).not.toBe(no)
    // The refusal must be legible in the "said no" line.
    expect(no.toLowerCase()).toContain('no')
  })

  it('striking the testimony branches the archivist on whether Ellis chose to speak', () => {
    const spoke = content.getPersonaReflection('archivist', case81State('yes', 'strike-testimony'))
    const silent = content.getPersonaReflection('archivist', case81State('no', 'strike-testimony'))
    const unasked = content.getPersonaReflection(
      'archivist',
      case81State('unasked', 'strike-testimony'),
    )
    expect(spoke).not.toBe(silent)
    expect(silent).toBe(unasked)
  })

  it('a null deposition record (no deposition taken) falls through to the generic lines', () => {
    const noRecord: GameState = {
      ...createInitialGameState(),
      caseId: 'case-81',
      decision: 'certify-witness',
    }
    // With no record, the consent branch is dormant and a generic line answers.
    expect(noRecord.depositionRecord).toBeNull()
    expect(content.getPersonaReflection('shepherd', noRecord).trim().length).toBeGreaterThan(0)
  })
})

describe('the fourth-minute revelation (Case 81)', () => {
  const content = getCaseContent('case-81')

  function revelationFor(decision: string, consent: 'yes' | 'no' | 'unasked' | null): string | null {
    const state: GameState = {
      ...createInitialGameState(),
      caseId: 'case-81',
      decision,
      depositionRecord:
        consent === null
          ? null
          : {
              actionId: 'take-sworn-statement',
              beats: ['corroborate', 'corroborate', 'corroborate'],
              askedConsent: consent !== 'unasked',
              consent,
            },
    }
    return content.getRevelation?.(state) ?? null
  }

  it('names the office on every verdict path but never the hand', () => {
    const decisions = content.decisions.map((d) => d.id)
    decisions.forEach((decision) => {
      const line = revelationFor(decision, decision === 'strike-testimony' ? 'yes' : null)
      expect(line).not.toBeNull()
      expect(line).toContain('Continuity Directorate')
    })
  })

  it('lands the person-vs-office hook only when the freed witness chose to speak', () => {
    const spoke = revelationFor('strike-testimony', 'yes')
    const silent = revelationFor('strike-testimony', 'no')
    expect(spoke).toContain('Case 84')
    expect(spoke).not.toBe(silent)
    // A silent, freed witness costs the record its account, and does not name.
    expect(silent).not.toContain('Case 84')
  })

  it('returns null before a verdict is issued', () => {
    expect(revelationFor('', null)).toBeNull()
  })
})

describe('case switcher availability', () => {
  it('returns only non-active registered cases', () => {
    // Satisfy every cited precedent so the sole exclusion under test is the
    // active case itself; then every other registered case must be offered.
    const precedents = Object.fromEntries(
      registeredCaseIds.map((id) => [id, 'certify-continuity']),
    )
    registeredCaseIds.forEach((activeId) => {
      const targets = getSwitchableCaseIds(activeId, precedents)
      expect(targets).not.toContain(activeId)
      targets.forEach((id) => expect(registeredCaseIds).toContain(id))
      expect(new Set(targets)).toEqual(
        new Set(registeredCaseIds.filter((id) => id !== activeId)),
      )
    })
  })

  it('withholds a case until the precedent it cites has a verdict', () => {
    // Case 81 cites Case 77: unavailable with no verdict, available once recorded.
    expect(getSwitchableCaseIds('case-77', {})).not.toContain('case-81')
    expect(getSwitchableCaseIds('case-77', { 'case-77': 'charter-new-person' })).toContain(
      'case-81',
    )
    // The active case is never offered, and a save on Case 81 can return to 77.
    const fromCase81 = getSwitchableCaseIds('case-81', { 'case-77': 'charter-new-person' })
    expect(fromCase81).not.toContain('case-81')
    expect(fromCase81).toContain('case-77')
  })
})

describe('site close-read pilots', () => {
  it('ships Registry Intake as an action-registered custody and mirror plate', () => {
    const registry = getCaseContent('case-77').sites.find((site) => site.id === 'registry')
    expect(registry?.closeup?.src).toBe('/images/site-scenes/registry-intake.webp')
    expect(registry?.closeup?.zones?.map((zone) => zone.actionId)).toEqual([
      'authenticate-chain',
      'trace-checksum',
    ])
    expect(registry?.closeup?.atmosphere).toBe('checksum-echo')
  })

  it('ships the Case 77 Care Ward environment as an action-registered plate', () => {
    const ward = getCaseContent('case-77').sites.find((site) => site.id === 'care-ward')
    expect(ward?.closeup?.src).toBe('/images/site-scenes/care-ward-12.webp')
    expect(ward?.closeup?.zones?.map((zone) => zone.actionId)).toEqual([
      'listen-mara',
      'stress-test',
    ])
  })

  it('ships the Case 77 Maintenance Spine environment as an optimized plate', () => {
    const maintenance = getCaseContent('case-77').sites.find((site) => site.id === 'maintenance')
    expect(maintenance?.closeup?.src).toBe('/images/site-scenes/maintenance-spine.webp')
    expect(maintenance?.closeup?.focalPoint).toEqual({ x: 0.76, y: 0.5 })
  })

  it('ships the Small Archive as two equally registered category systems', () => {
    const archive = getCaseContent('case-77').sites.find((site) => site.id === 'small-archive')
    expect(archive?.closeup?.src).toBe('/images/site-scenes/small-archive.webp')
    expect(archive?.closeup?.caption).toBe('Shelf zero · restricted index')
    expect(archive?.closeup?.focalPoint).toEqual({ x: 0.51, y: 0.51 })
    expect(archive?.closeup?.zones).toEqual([
      { actionId: 'answer-archivist', x: 0.37, y: 0.7 },
      { actionId: 'seal-index', x: 0.65, y: 0.45 },
    ])
    expect(archive?.closeup?.atmosphere).toBe('category-register')
  })

  it('ships the Case 81 Restoration Lab environment as an optimized plate', () => {
    const restoration = getCaseContent('case-81').sites.find(
      (site) => site.id === 'restoration-lab',
    )
    expect(restoration?.closeup?.src).toBe('/images/site-scenes/restoration-lab.webp')
    expect(restoration?.closeup?.focalPoint).toEqual({ x: 0.5, y: 0.5 })
  })

  it('ships Records Annex as an action-registered chronology and dormant authority plate', () => {
    const records = getCaseContent('case-81').sites.find((site) => site.id === 'records-annex')
    expect(records?.closeup?.src).toBe('/images/site-scenes/records-annex.webp')
    expect(records?.closeup?.caption).toBe('Service record · dormant authority')
    expect(records?.closeup?.focalPoint).toEqual({ x: 0.52, y: 0.52 })
    expect(records?.closeup?.zones).toEqual([
      { actionId: 'pull-service-record', x: 0.41, y: 0.38 },
      { actionId: 'forge-certification-seal', x: 0.63, y: 0.67 },
    ])
    expect(records?.closeup?.atmosphere).toBe('authority-diagnostic')
  })

  it('ships Counsel Office as two equally registered argument positions', () => {
    const counsel = getCaseContent('case-81').sites.find((site) => site.id === 'counsel-office')
    expect(counsel?.closeup?.src).toBe('/images/site-scenes/counsel-office.webp')
    expect(counsel?.closeup?.caption).toBe('City brief · retained objection')
    expect(counsel?.closeup?.focalPoint).toEqual({ x: 0.5, y: 0.53 })
    expect(counsel?.closeup?.zones).toEqual([
      { actionId: 'brief-city-counsel', x: 0.32, y: 0.52 },
      { actionId: 'depose-opposing-counsel', x: 0.68, y: 0.61 },
    ])
    expect(counsel?.closeup?.atmosphere).toBe('argument-register')
  })
})

import { describe, expect, it } from 'vitest'
import {
  getCaseContent,
  getPrecedentLine,
  getSwitchableCaseIds,
  getTensionLine,
  personas,
  registeredCaseIds,
} from './content'
import { createInitialGameState } from './engine'
import type { CaseDefinition, GameState, MethodTag } from './types'

function expectUnique(ids: readonly string[]) {
  expect(new Set(ids).size).toBe(ids.length)
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

  it('holds the structural template: 4 sites × 2 actions, 4 fragments/models/decisions', () => {
    expect(sites).toHaveLength(4)
    expect(fieldActions).toHaveLength(8)
    expect(fragments).toHaveLength(4)
    expect(reconstructionDefinitions).toHaveLength(4)
    expect(decisions).toHaveLength(4)
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

  it('maps a nonempty tension line for all 16 reconstruction × decision pairs', () => {
    let pairs = 0
    reconstructionDefinitions.forEach((model) => {
      decisions.forEach((decision) => {
        const line = getTensionLine(caseId, model.id, decision.id)
        expect(typeof line).toBe('string')
        expect(line.trim().length).toBeGreaterThan(0)
        pairs += 1
      })
    })
    expect(pairs).toBe(16)
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

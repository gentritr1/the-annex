import { describe, expect, it } from 'vitest'
import {
  decisions,
  evidenceDefinitions,
  fieldActions,
  fragments,
  getReconstructionForFragments,
  getTensionLine,
  personas,
  reconstructionDefinitions,
  sites,
} from './content'

function expectUnique(ids: readonly string[]) {
  expect(new Set(ids).size).toBe(ids.length)
}

describe('Case 77 content integrity', () => {
  it('keeps authored IDs unique', () => {
    expectUnique(fieldActions.map((item) => item.id))
    expectUnique(evidenceDefinitions.map((item) => item.id))
    expectUnique(fragments.map((item) => item.id))
    expectUnique(reconstructionDefinitions.map((item) => item.id))
    expectUnique(decisions.map((item) => item.id))
    expectUnique(sites.map((item) => item.id))
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

  it('resolves every authored evidence reference', () => {
    const evidenceIds = new Set(evidenceDefinitions.map((item) => item.id))
    fieldActions.forEach((action) => expect(evidenceIds.has(action.evidenceId)).toBe(true))
    reconstructionDefinitions.forEach((model) => expect(evidenceIds.has(model.evidenceId)).toBe(true))
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

  it('authors a counterfactual note for every field action', () => {
    fieldActions.forEach((action) => {
      expect(typeof action.counterfactualNote).toBe('string')
      expect((action.counterfactualNote ?? '').trim().length).toBeGreaterThan(0)
    })
  })

  it('authors an unvisited note for every site', () => {
    sites.forEach((site) => {
      expect(typeof site.unvisitedNote).toBe('string')
      expect(site.unvisitedNote.trim().length).toBeGreaterThan(0)
    })
  })

  it('maps a nonempty tension line for all 16 reconstruction × decision pairs', () => {
    let pairs = 0
    reconstructionDefinitions.forEach((model) => {
      decisions.forEach((decision) => {
        const line = getTensionLine(model.id, decision.id)
        expect(typeof line).toBe('string')
        expect(line.trim().length).toBeGreaterThan(0)
        pairs += 1
      })
    })
    expect(pairs).toBe(16)
  })

  it('authors an in-run reaction for every field action, with two distinct voices on the highest-stakes ones', () => {
    const twoVoiceActions = new Set(['forge-authority', 'stress-test', 'seal-index'])

    fieldActions.forEach((action) => {
      const reactions = action.reactions ?? []
      expect(reactions.length).toBeGreaterThanOrEqual(1)

      if (twoVoiceActions.has(action.id)) {
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

    expect(allReactions.length).toBe(15)
    allReactions.forEach((reaction) => {
      expect(validPersonas.has(reaction.persona)).toBe(true)
      expect(reaction.line.trim().length).toBeGreaterThan(0)
      expect([...reaction.line].length).toBeLessThanOrEqual(160)
    })
  })
})

import { readFileSync, writeFileSync } from 'node:fs'

function replaceOnce(path, before, after) {
  const source = readFileSync(path, 'utf8')
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${path}: expected source anchor not found`)
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${path}: source anchor is not unique`)
  }
  writeFileSync(path, source.slice(0, first) + after + source.slice(first + before.length))
  console.log(`patched ${path}`)
}

replaceOnce(
  'src/game/types.ts',
  `export interface GameEvent {
  id: string
  order: number
  sourceType: 'approach' | 'field-action' | 'reconstruction' | 'decision'
  sourceId: string
  title: string
  detail: string
  tone: 'neutral' | 'positive' | 'warning'
  methodTags: MethodTag[]
}
`,
  `export interface GameEventFacts {
  // Reconstruction-only facts. Optional so schema-2 saves written before the
  // nonlinear pass decode unchanged; when present they preserve the filed
  // knowledge state without promoting speculation to evidence.
  speculativeFragments?: FragmentId[]
  anchorStates?: Record<FragmentId, 'known' | 'corroborated'>
}

export interface GameEvent {
  id: string
  order: number
  sourceType: 'approach' | 'field-action' | 'reconstruction' | 'decision'
  sourceId: string
  title: string
  detail: string
  tone: 'neutral' | 'positive' | 'warning'
  methodTags: MethodTag[]
  facts?: GameEventFacts
}
`,
)

replaceOnce(
  'src/game/persistence.ts',
  `  if (value.sourceType === 'approach' && !sets.approaches.has(value.sourceId)) return false
  if (value.sourceType === 'field-action' && !sets.fieldActions.has(value.sourceId)) return false
  if (value.sourceType === 'reconstruction' && !sets.reconstructions.has(value.sourceId)) return false
  if (value.sourceType === 'decision' && !sets.decisions.has(value.sourceId)) return false

  return true
`,
  `  if (value.sourceType === 'approach' && !sets.approaches.has(value.sourceId)) return false
  if (value.sourceType === 'field-action' && !sets.fieldActions.has(value.sourceId)) return false
  if (value.sourceType === 'reconstruction' && !sets.reconstructions.has(value.sourceId)) return false
  if (value.sourceType === 'decision' && !sets.decisions.has(value.sourceId)) return false

  // Optional schema-2 causal facts are deliberately narrow: only a filed
  // reconstruction may carry them, every id must belong to this case, and an
  // anchor can be recorded only as known or corroborated. Old events omit the
  // field and continue to decode without a migration.
  if (value.facts !== undefined) {
    if (value.sourceType !== 'reconstruction' || !isRecord(value.facts)) return false
    if (
      value.facts.speculativeFragments !== undefined &&
      !isUniqueArrayOf(value.facts.speculativeFragments, sets.fragments)
    ) {
      return false
    }
    if (value.facts.anchorStates !== undefined) {
      if (!isRecord(value.facts.anchorStates)) return false
      for (const [fragmentId, knowledge] of Object.entries(value.facts.anchorStates)) {
        if (!sets.fragments.has(fragmentId)) return false
        if (knowledge !== 'known' && knowledge !== 'corroborated') return false
      }
    }
  }

  return true
`,
)

replaceOnce(
  'src/game/engine.ts',
  `} from './content'
// Save-schema constants live with the persistence layer`,
  `} from './content'
import {
  getFragmentKnowledge,
  getReconstructionAnchorStates,
  getSpeculativeFragmentIds,
} from './causal'
// Save-schema constants live with the persistence layer`,
)

replaceOnce(
  'src/game/engine.ts',
  `    case 'TOGGLE_FRAGMENT': {
      if (state.phase !== 'reconstruction') return state

      const alreadySelected = state.selectedFragments.includes(action.fragmentId)
      if (!alreadySelected && state.selectedFragments.length >= 2) {
        return {
          ...state,
          announcement: 'Two anchors are already selected. Remove one to change the model.',
        }
      }

      const selectedFragments = alreadySelected
        ? state.selectedFragments.filter((fragmentId) => fragmentId !== action.fragmentId)
        : [...state.selectedFragments, action.fragmentId]

      return {
        ...state,
        selectedFragments,
        announcement: \`${'${selectedFragments.length}'} of 2 anchors selected.\`,
      }
    }
`,
  `    case 'TOGGLE_FRAGMENT': {
      if (state.phase !== 'reconstruction') return state

      const content = getCaseContent(state.caseId)
      if (!content.fragments.some((fragment) => fragment.id === action.fragmentId)) return state
      const alreadySelected = state.selectedFragments.includes(action.fragmentId)
      // Deselecting an unknown legacy selection remains possible so an old save can
      // recover. A new unknown selection is rejected before decisive copy can enter
      // canonical state.
      if (!alreadySelected && getFragmentKnowledge(content, state, action.fragmentId) === 'unknown') {
        return {
          ...state,
          announcement: 'That anchor is still unknown. Continue the field investigation first.',
        }
      }
      if (!alreadySelected && state.selectedFragments.length >= 2) {
        return {
          ...state,
          announcement: 'Two anchors are already selected. Remove one to change the model.',
        }
      }

      const selectedFragments = alreadySelected
        ? state.selectedFragments.filter((fragmentId) => fragmentId !== action.fragmentId)
        : [...state.selectedFragments, action.fragmentId]

      return {
        ...state,
        selectedFragments,
        announcement: \`${'${selectedFragments.length}'} of 2 anchors selected.\`,
      }
    }
`,
)

replaceOnce(
  'src/game/engine.ts',
  `    case 'SUBMIT_RECONSTRUCTION': {
      if (state.phase !== 'reconstruction' || state.selectedFragments.length !== 2) return state

      const content = getCaseContent(state.caseId)
      const reconstructionId = content.getReconstructionForFragments(state.selectedFragments)
      const definition = content.reconstructionDefinitions.find((item) => item.id === reconstructionId)
      if (!definition) return state
      const corroboratedAnchors = state.selectedFragments.filter((fragmentId) =>
        content.fragmentEvidenceLinks[fragmentId].some((evidenceId) =>
          state.evidence.includes(evidenceId),
        ),
      ).length

      return {
        ...state,
        phase: 'investigation',
        reconstruction: reconstructionId,
        evidence: addUnique(state.evidence, [definition.evidenceId]),
        methodTags: addUnique(state.methodTags, ['puzzle']),
        trust: applyTrust(state.trust, definition.trust),
        events: appendEvent(state, {
          sourceType: 'reconstruction',
          sourceId: reconstructionId,
          title: \`${'${definition.title}'} model filed\`,
          detail: \`${'${definition.thesis}'} ${'${corroboratedAnchors}'} of 2 anchors were corroborated by your field record.${'${describeTrustDeltas(definition.trust)}'}\`,
          tone:
            definition.unresolvedTone || corroboratedAnchors === 0 ? 'warning' : 'positive',
          methodTags: ['puzzle'],
        }),
        announcement: \`${'${definition.title}'} filed as evidence.\`,
      }
    }
`,
  `    case 'SUBMIT_RECONSTRUCTION': {
      if (state.phase !== 'reconstruction' || state.selectedFragments.length !== 2) return state

      const content = getCaseContent(state.caseId)
      const anchorStates = getReconstructionAnchorStates(content, state)
      const selectedKnowledge = state.selectedFragments.map((fragmentId) => anchorStates[fragmentId])
      const corroboratedAnchors = selectedKnowledge.filter(
        (knowledge) => knowledge === 'corroborated',
      ).length
      if (selectedKnowledge.includes('unknown') || corroboratedAnchors < 1) {
        return {
          ...state,
          announcement:
            'A filing needs two known anchors and at least one corroborated anchor. Unknown facts remain withheld.',
        }
      }

      const reconstructionId = content.getReconstructionForFragments(state.selectedFragments)
      const definition = content.reconstructionDefinitions.find((item) => item.id === reconstructionId)
      if (!definition) return state
      const speculativeFragments = getSpeculativeFragmentIds(content, state)
      const selectedAnchorStates = Object.fromEntries(
        state.selectedFragments.map((fragmentId) => [
          fragmentId,
          anchorStates[fragmentId] === 'corroborated' ? 'corroborated' : 'known',
        ]),
      ) as Record<string, 'known' | 'corroborated'>
      const speculativeClause =
        speculativeFragments.length > 0
          ? \` ${'${speculativeFragments.length}'} unsupported anchor${'${speculativeFragments.length === 1 ? \' remains\' : \'s remain\'}'} contested.\`
          : ''

      return {
        ...state,
        phase: 'investigation',
        reconstruction: reconstructionId,
        evidence: addUnique(state.evidence, [definition.evidenceId]),
        methodTags: addUnique(state.methodTags, ['puzzle']),
        trust: applyTrust(state.trust, definition.trust),
        events: appendEvent(state, {
          sourceType: 'reconstruction',
          sourceId: reconstructionId,
          title: \`${'${definition.title}'} model filed\`,
          detail: \`${'${definition.thesis}'} ${'${corroboratedAnchors}'} of 2 anchors were corroborated by your field record.${'${speculativeClause}'}${'${describeTrustDeltas(definition.trust)}'}\`,
          tone:
            definition.unresolvedTone || speculativeFragments.length > 0 ? 'warning' : 'positive',
          methodTags: ['puzzle'],
          facts: {
            speculativeFragments: [...speculativeFragments],
            anchorStates: selectedAnchorStates,
          },
        }),
        announcement:
          speculativeFragments.length > 0
            ? \`${'${definition.title}'} filed with an unsupported anchor under objection.\`
            : \`${'${definition.title}'} filed as evidence.\`,
      }
    }
`,
)

replaceOnce(
  'src/game/cases/case81.ts',
  `    description: 'Where 81-C is sworn — and where its account can be pressed until it parts from the record.',
    actionIds: ['take-sworn-statement', 'cross-examine-witness'],
    unvisitedNote:
`,
  `    description: 'Where 81-C is sworn — and where its account can be pressed until it parts from the record.',
    actionIds: ['take-sworn-statement', 'cross-examine-witness'],
    closeup: {
      // Reuses the approved deposition-annex master already documented in
      // PROVENANCE.md. The methods remain in the transcript inspector; this plate
      // supplies approach staging and a persistent recorder/shutter location.
      src: '/images/case-81-deposition-annex.webp',
      caption: 'Witness chair · recorder · admissibility shutter',
      focalPoint: { x: 0.52, y: 0.56 },
      zones: [
        { actionId: 'take-sworn-statement', x: 0.43, y: 0.61 },
        { actionId: 'cross-examine-witness', x: 0.65, y: 0.5 },
      ],
      atmosphere: 'argument-register',
    },
    unvisitedNote:
`,
)

replaceOnce(
  'src/game/engine.test.ts',
  `function solveReconstruction(state = startInvestigation()) {
  let next = state
  if (next.completedSites.length === 0) {
    next = gameReducer(next, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
  }
  next = gameReducer(next, { type: 'OPEN_RECONSTRUCTION' })
  next = gameReducer(next, { type: 'TOGGLE_FRAGMENT', fragmentId: 'scar-sensation' })
  next = gameReducer(next, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
  return gameReducer(next, { type: 'SUBMIT_RECONSTRUCTION' })
}
`,
  `function solveReconstruction(state = startInvestigation()) {
  let next = state
  if (next.completedSites.length === 0) {
    next = gameReducer(next, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
  }
  const careAnchor = next.completedActions.some(
    (actionId) => actionId === 'listen-mara' || actionId === 'stress-test',
  )
  next = gameReducer(next, { type: 'OPEN_RECONSTRUCTION' })
  next = gameReducer(next, {
    type: 'TOGGLE_FRAGMENT',
    fragmentId: careAnchor ? 'scar-sensation' : 'registry-hash',
  })
  next = gameReducer(next, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
  return gameReducer(next, { type: 'SUBMIT_RECONSTRUCTION' })
}
`,
)

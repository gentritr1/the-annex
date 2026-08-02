import { case77 } from './cases/case77'
import { case81 } from './cases/case81'
import type {
  CaseDefinition,
  DepositionChoiceId,
  DepositionDefinition,
  DepositionUseResolution,
  FieldActionId,
  FieldActionDefinition,
  GameEvent,
  GameState,
  MethodTag,
  PersonaDefinition,
  PersonaId,
  PersonaReaction,
  DecisionId,
  ReconstructionId,
  RunSummary,
  SecretDefinition,
  SecretId,
  UnnumberedReadingRoomDefinition,
} from './types'

// ── Global vocabulary (shared by every case) ────────────────────────────────
// Personas are the same cast across all cases; the method labels are the shared
// verbs. These are the only pieces of authored content that are NOT case-scoped.

export const methodLabels: Readonly<Record<MethodTag, string>> = {
  procedure: 'Procedure',
  negotiation: 'Negotiation',
  stealth: 'Stealth',
  systems: 'Systems',
  puzzle: 'Reconstruction',
  nonlethal: 'Nonviolent',
  fraud: 'Fraud',
  care: 'Care',
  coercion: 'Coercion',
}

// Roster portraits (painterly noir, one per presence). The captions are duty-roster
// entries, not dossier captions: three name a credential the city issued, and the
// Archivist's deliberately names none — she holds no credential at all, which is
// the whole of her position and the last thing that could make her read as a
// subject on file rather than a custodian at her post.
export const personas: readonly PersonaDefinition[] = [
  {
    id: 'registrar',
    name: 'The Registrar',
    role: 'Custodian of legal continuity',
    principle: 'A person is a chain the city can verify.',
    portrait: {
      src: '/images/personas/registrar.webp',
      caption: 'Registrar · standing credential',
      alt: 'Roster portrait of the Registrar, custodian of legal continuity.',
    },
  },
  {
    id: 'shepherd',
    name: 'The Shepherd',
    role: 'Care-ward advocate',
    principle: 'Care recognizes a self before procedure does.',
    portrait: {
      src: '/images/personas/shepherd.webp',
      caption: 'Care ward · standing credential',
      alt: 'Roster portrait of the Shepherd, care-ward advocate.',
    },
  },
  {
    id: 'defector',
    name: 'The Defector',
    role: 'Compromised systems guide',
    principle: 'Every clean record is hiding who paid for it.',
    portrait: {
      src: '/images/personas/defector.webp',
      caption: 'Systems office · credential withdrawn',
      alt: 'Roster portrait of the Defector, compromised systems guide.',
    },
  },
  {
    id: 'archivist',
    name: 'The Small Archivist',
    role: 'Collector of missing categories',
    principle: 'What you refuse to name still becomes evidence.',
    portrait: {
      src: '/images/personas/archivist.webp',
      caption: 'No credential issued · shelf zero, kept by hand',
      alt: 'Roster portrait of the Small Archivist, collector of missing categories.',
    },
  },
]

export function personaName(personaId: PersonaId): string {
  return personas.find((persona) => persona.id === personaId)?.name ?? ''
}

// ── Case registry ────────────────────────────────────────────────────────────
// Every dossier the engine and components can resolve through GameState.caseId.
// Adding a case is a two-line change here plus its bundle under ./cases.

const caseRegistry: Readonly<Record<string, CaseDefinition>> = {
  'case-77': case77,
  'case-81': case81,
}

// The case a fresh game / START_NEW begins on. Historical v1 saves are also this
// case by definition (see persistence's frozen migration literal).
export const DEFAULT_CASE_ID = 'case-77'

// Plain list of registered ids. Exported for persistence's caseId validation so
// that layer never has to import the full registry object (keeps it acyclic and
// cheap). Ordered as the registry declares them.
export const registeredCaseIds: readonly string[] = Object.keys(caseRegistry)

export interface RegisteredSecret {
  caseId: string
  definition: SecretDefinition
}

// One global index over the per-case authored Fourth Margin items. Persistence
// validates campaign discoveries against it, while presentation can reopen
// fragments after the player crosses into another case.
export const registeredSecrets: readonly RegisteredSecret[] = Object.values(
  caseRegistry,
).flatMap((caseDefinition) =>
  (caseDefinition.secrets ?? []).map((definition) => ({
    caseId: caseDefinition.id,
    definition,
  })),
)

export const registeredSecretIds: readonly SecretId[] = registeredSecrets.map(
  ({ definition }) => definition.id,
)

export function isRegisteredCase(caseId: string): boolean {
  return Object.prototype.hasOwnProperty.call(caseRegistry, caseId)
}

// The cases a save may switch to from its current case: every registered case
// except the one the save is on. A case that cites a precedent (Case 81 cites
// Case 77) is only offered once that precedent has a recorded verdict — the
// Mirror needs a prior ruling to cross into it. Never returns the active case.
export function getSwitchableCaseIds(
  activeCaseId: string,
  precedents: Readonly<Record<string, string>>,
): readonly string[] {
  return registeredCaseIds.filter((id) => {
    if (id === activeCaseId) return false
    const source = getCaseContent(id).precedentSource
    if (source && !precedents[source.caseId]) return false
    return true
  })
}

// Resolve a case bundle. Runtime state.caseId is always validated at decode, so
// the fallback only guards against a programming error, never a real save.
export function getCaseContent(caseId: string): CaseDefinition {
  return caseRegistry[caseId] ?? caseRegistry[DEFAULT_CASE_ID]
}

export function getRegisteredSecret(secretId: SecretId): RegisteredSecret | undefined {
  return registeredSecrets.find(({ definition }) => definition.id === secretId)
}

export function getDiscoveredSecretDefinitions(
  state: GameState,
): readonly SecretDefinition[] {
  return state.discoveredSecretIds.flatMap((secretId) => {
    const definition = getRegisteredSecret(secretId)?.definition
    return definition ? [definition] : []
  })
}

// A route-aware pencil answer is meaningful only while its owning case's live
// state is available. After a case crossing, the durable authored counterline is
// used instead of pretending the next case's state describes the old discovery.
export function resolveSecretCounterline(
  definition: SecretDefinition,
  state: GameState,
): string {
  const owner = getRegisteredSecret(definition.id)
  return owner?.caseId === state.caseId && definition.getCounterline
    ? definition.getCounterline(state)
    : definition.counterline
}

// ── Global Fourth Margin ambience ──────────────────────────────────────────
// This room is not owned by either case: Reader Key 04 may expose its entry
// anchor in whichever bounded world is active. The key is the only persisted
// input. Every visit, focus, arrangement, and opened-point marker belongs to the
// presentation layer and is deliberately absent from GameState.
export const unnumberedReadingRoom = {
  id: 'unnumbered-reading-room',
  requiredSecretId: 'reader-key-04',
  room: { width: 7.2, depth: 6.4, height: 2.8 },
  homeCamera: {
    position: [0, 1.54, 4.85],
    target: [0, 1.18, -1.1],
  },
  acoustics: {
    weatherLevel: 0.2,
    weatherCutoffHz: 620,
    roomLevel: 0.58,
    roomCutoffHz: 165,
    humHz: 49,
    humLevel: 0.22,
  },
  travelMs: 520,
  entryAnchors: [
    {
      id: 'concourse-unnumbered-reader',
      worldKind: 'concourse',
      position: [0, 0.72, -0.17],
      rotationY: 0,
      posterAnchor: { x: 0.5, y: 0.64 },
      camera: {
        position: [0, 1.5, 2.7],
        target: [0, 0.78, -0.17],
      },
      label: 'Turn Reader Key 04',
      accessibleLabel: 'Turn Reader Key 04 · enter the unnumbered reader',
    },
    {
      id: 'deposition-annex-unnumbered-reader',
      worldKind: 'deposition-annex',
      position: [0, 0.96, -0.66],
      rotationY: 0,
      posterAnchor: { x: 0.5, y: 0.6 },
      camera: {
        position: [0, 1.52, 2.6],
        target: [0, 0.96, -0.66],
      },
      label: 'Turn Reader Key 04',
      accessibleLabel: 'Turn Reader Key 04 · enter the unnumbered reader',
    },
  ],
  title: 'UNNUMBERED READING ROOM',
  subtitle: 'Not evidence · no filing channel',
  entryAction: 'Turn Reader Key 04 · enter the unnumbered reader',
  transitionIn: [
    'Reader Key 04 enters the unnumbered slot.',
    'The wall withdraws by the width of a book.',
  ],
  archivistCard:
    'There are three places to read. I did not put arrows between them. The window remembers one minute of rain; it is not a way out.',
  hudObjective: 'Read any object · leave at any time',
  accessibleIntroduction:
    'A narrow reading room has opened. A false window shows a recorded civic skyline. Three independent reading points are available in any order. Nothing examined here enters evidence.',
  completion: {
    visual: 'All three lamps remain on. None becomes the room’s center.',
    accessible: 'All three reading points are open. No record was added.',
  },
  exit: {
    label: 'Return to the filed world',
    transition:
      'The key comes free. The wall closes without assigning the room a number.',
  },
  navigation: {
    readingPointOrder: 'player-chosen',
    showProgressCounter: false,
    exitAvailability: 'always',
  },
  stateContract: {
    pointState: 'view-local',
    mutatesGameState: false,
    entersEvidence: false,
    grantsCaseReward: false,
    writesRunHistory: false,
  },
  readingPoints: [
    {
      id: 'book-that-opens',
      placement: 'left',
      markerGlyph: '⌁',
      position: [-2.25, 0.85, -0.65],
      posterAnchor: { x: 0.23, y: 0.58 },
      camera: {
        position: [-2.7, 1.62, 2.05],
        target: [-2.25, 1, -0.65],
      },
      acoustics: {
        weatherLevel: 0.34,
        weatherCutoffHz: 900,
        roomLevel: 0.42,
        roomCutoffHz: 260,
        humHz: 48,
        humLevel: 0.12,
      },
      title: 'THE BOOK THAT OPENS',
      meta: 'Public gardening guide · edition field missing',
      inspection:
        'Two transit stubs reinforce the hinge. Blue thread takes the spine. A strip of lunch paper closes the tear. The surviving diagrams show drainage boxes and balcony beans. A coriander seed rests in the gutter.',
      archivistNote:
        'The spine was gone. I used three things that were not spines. It opens now.',
      interactions: [
        {
          id: 'lift-repaired-cover',
          label: 'Lift the repaired cover',
          response:
            'The repairs pull against one another, then share the weight. No page comes loose.',
        },
      ],
    },
    {
      id: 'two-orders',
      placement: 'center',
      markerGlyph: '⇵',
      position: [0, 1.15, -2.85],
      posterAnchor: { x: 0.5, y: 0.4 },
      camera: {
        position: [0, 1.52, 0],
        target: [0, 1.25, -2.8],
      },
      acoustics: {
        weatherLevel: 0.12,
        weatherCutoffHz: 460,
        roomLevel: 0.6,
        roomCutoffHz: 180,
        humHz: 55,
        humLevel: 0.3,
      },
      title: 'THE TWO ORDERS',
      meta: 'Two slips, neither filed over the other',
      inspection:
        'The slips marked I and XV fit the reader together. Two shallow channels allow either one to sit above the other. No channel is marked first.',
      archivistNote:
        'I kept the answers with the books. Otherwise the books start sounding like orders.',
      interactions: [
        {
          id: 'i-above-xv',
          label: 'Set I above XV',
          response:
            'The reader holds forgetting over selection. No conclusion prints.',
        },
        {
          id: 'xv-above-i',
          label: 'Set XV above I',
          response:
            'The reader holds selection over forgetting. No conclusion prints.',
        },
        {
          id: 'slips-level',
          label: 'Leave the slips level',
          response: 'The light reaches both margins. The reader files nothing.',
        },
      ],
    },
    {
      id: 'unpressed-promise',
      placement: 'right',
      markerGlyph: '□',
      position: [2.25, 1, -0.65],
      posterAnchor: { x: 0.77, y: 0.58 },
      camera: {
        position: [2.7, 1.62, 2.05],
        target: [2.25, 1.05, -0.65],
      },
      acoustics: {
        weatherLevel: 0.05,
        weatherCutoffHz: 360,
        roomLevel: 0.45,
        roomCutoffHz: 120,
        humHz: 43,
        humLevel: 0.17,
      },
      title: 'THE UNPRESSED PROMISE',
      meta: 'Unfiled form · no petition attached',
      inspection:
        'An unused privacy strip lies beneath an empty name frame. No petition is attached. No seal has touched the paper.',
      machineMarking: 'NOT FILED · NO LEGAL FORCE',
      draftingPrompt: 'WHAT MAY THIS ROOM PROMISE BEFORE A NAME IS ASKED?',
      archivistNote:
        'I left the name empty. The promise is harder to hide that way.',
      interactions: [
        {
          id: 'lower-empty-frame',
          label: 'Lower the empty frame',
          response: 'The frame settles over blank paper. Nothing is sealed.',
        },
      ],
    },
  ],
} satisfies UnnumberedReadingRoomDefinition

// Pure capability projection for presentation. It reads the one registered key
// and cannot mutate the collection or any other canonical field.
export function canEnterUnnumberedReadingRoom(state: GameState): boolean {
  return state.discoveredSecretIds.includes(unnumberedReadingRoom.requiredSecretId)
}

// ── Case-aware content helpers ───────────────────────────────────────────────

// One authored line naming the alignment/dissonance between a filed model and a
// finding, for the given case. Empty string if the pair is unknown.
export function getTensionLine(
  caseId: string,
  reconstruction: ReconstructionId,
  decision: DecisionId,
  state?: GameState,
): string {
  const content = getCaseContent(caseId)
  if (state && content.getReconstructionDecisionTension) {
    return content.getReconstructionDecisionTension(reconstruction, decision, state)
  }
  return content.reconstructionDecisionTensions[reconstruction]?.[decision] ?? ''
}

// Resolve a field action to its EFFECTIVE definition under the given precedents.
// Total and pure: when the case authors no precedentEffects, or none matches the
// player's recorded verdicts, the AUTHORED base object is returned by reference
// (identity — callers relying on `=== base` and byte-identical copy are safe).
// When a `precedentEffects` entry's `whenCase`/`whenDecision` matches and it names
// this action, that entry's override is spread over the base (a new object; only
// the declared fields change). This is the single seam every consumer — the
// engine's COMMIT_FIELD_ACTION / COMMIT_DEPOSITION and every view that shows
// action copy — resolves through, so pre-commit display and committed effects can
// never diverge. Returns undefined only when the action id is unknown to the case
// (matching the prior `fieldActions.find` contract callers already guard on).
export function resolveFieldAction(
  caseDef: CaseDefinition,
  actionId: FieldActionId,
  precedents: Readonly<Record<string, string>>,
): FieldActionDefinition | undefined {
  const base = caseDef.fieldActions.find((action) => action.id === actionId)
  if (!base || !caseDef.precedentEffects) return base

  let resolved = base
  for (const effect of caseDef.precedentEffects) {
    if (precedents[effect.whenCase] !== effect.whenDecision) continue
    const override = effect.fieldActionOverrides[actionId]
    if (override) resolved = { ...resolved, ...override }
  }
  return resolved
}

// View-side lookup: given an event's persisted sourceType/sourceId within a case,
// return the authored in-run reactions for the action or model it records. Field
// actions resolve through resolveFieldAction so a precedent's variant reactions
// (e.g. the Defector who knows the player has forged before) surface in the log.
export function getReactionsForSource(
  caseId: string,
  sourceType: GameEvent['sourceType'],
  sourceId: string,
  precedents: Readonly<Record<string, string>> = {},
): readonly PersonaReaction[] {
  const content = getCaseContent(caseId)
  if (sourceType === 'field-action') {
    return resolveFieldAction(content, sourceId, precedents)?.reactions ?? []
  }
  if (sourceType === 'reconstruction') {
    return content.reconstructionDefinitions.find((model) => model.id === sourceId)?.reactions ?? []
  }
  return []
}

// The Mirror's briefing aside for the prior run's decision. The prior run may
// belong to a different case (the Mirror crosses cases by design), so the caller
// passes the PRIOR run's caseId and its map is consulted.
export function getMirrorBriefingAside(caseId: string, decision: DecisionId): string | null {
  return getCaseContent(caseId).mirrorBriefingAsides[decision] ?? null
}

// The cross-case precedent line shown at a case's tribunal, citing the player's
// verdict on the case this one follows. Null when the case cites no precedent or
// the cited case has no recorded verdict yet.
export function getPrecedentLine(
  caseId: string,
  precedents: Readonly<Record<string, string>>,
  caseOutcomes: Readonly<Record<string, Readonly<Record<string, string>>>> = {},
): string | null {
  const source = getCaseContent(caseId).precedentSource
  if (!source) return null
  const priorDecision = precedents[source.caseId]
  if (!priorDecision) return null
  const variant = source.outcomeVariant
  if (variant) {
    // Migrated saves can carry the verdict while lacking the later-added outcome
    // fact. Let case content author a conservative `unknown` reading instead of
    // silently falling through to a potentially broader generic citation.
    const factValue = caseOutcomes[source.caseId]?.[variant.factId] ?? 'unknown'
    const variantLine = variant.lines[factValue]?.[priorDecision]
    if (variantLine) return variantLine
  }
  return source.lines[priorDecision] ?? null
}

// One shared seam for deposition legality. Case content owns the boundary;
// engine, scene state, and UI all call the same pure resolver so presentation can
// never claim a use different from the one the reducer persists.
export function resolveDepositionUse(
  deposition: DepositionDefinition,
  actionId: FieldActionId,
  beats: readonly DepositionChoiceId[],
  askedConsent: boolean,
): DepositionUseResolution {
  return deposition.resolveUse({ actionId, beats, askedConsent })
}

// The canon rule surfaced (W4): the latest verdict IS the record. One in-voice
// line naming where a case's record currently ends, or null when that case has
// no recorded verdict yet. Read on the title switcher/continue area and at the
// debrief (where it reflects the verdict just issued).
export function getRecordEndsLine(
  caseId: string,
  precedents: Readonly<Record<string, string>>,
): string | null {
  const decisionId = precedents[caseId]
  if (!decisionId) return null
  const decision = getCaseContent(caseId).decisions.find((item) => item.id === decisionId)
  if (!decision) return null
  return `The record currently ends with: ${decision.title}.`
}

// The most recent verdict recorded for a case in completed run history, or null
// when there is none. At debrief the run's own verdict is already this case's
// precedent, so comparing THIS against the prior history entry is how a replay
// detects that it rewrote an earlier ending (W4). Pure and view-derived.
export function getPriorVerdictForCase(
  caseId: string,
  previousRuns: readonly RunSummary[],
): string | null {
  for (let index = previousRuns.length - 1; index >= 0; index -= 1) {
    const run = previousRuns[index]
    if ((run?.caseId ?? DEFAULT_CASE_ID) === caseId) return run?.decision ?? null
  }
  return null
}

import { case77 } from './cases/case77'
import { case81 } from './cases/case81'
import type {
  CaseDefinition,
  GameEvent,
  MethodTag,
  PersonaDefinition,
  PersonaId,
  PersonaReaction,
  DecisionId,
  ReconstructionId,
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

export const personas: readonly PersonaDefinition[] = [
  {
    id: 'registrar',
    name: 'The Registrar',
    role: 'Custodian of legal continuity',
    principle: 'A person is a chain the city can verify.',
  },
  {
    id: 'shepherd',
    name: 'The Shepherd',
    role: 'Care-ward advocate',
    principle: 'Care recognizes a self before procedure does.',
  },
  {
    id: 'defector',
    name: 'The Defector',
    role: 'Compromised systems guide',
    principle: 'Every clean record is hiding who paid for it.',
  },
  {
    id: 'archivist',
    name: 'The Small Archivist',
    role: 'Collector of missing categories',
    principle: 'What you refuse to name still becomes evidence.',
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

// ── Case-aware content helpers ───────────────────────────────────────────────

// One authored line naming the alignment/dissonance between a filed model and a
// finding, for the given case. Empty string if the pair is unknown.
export function getTensionLine(
  caseId: string,
  reconstruction: ReconstructionId,
  decision: DecisionId,
): string {
  return getCaseContent(caseId).reconstructionDecisionTensions[reconstruction]?.[decision] ?? ''
}

// View-side lookup: given an event's persisted sourceType/sourceId within a case,
// return the authored in-run reactions for the action or model it records.
export function getReactionsForSource(
  caseId: string,
  sourceType: GameEvent['sourceType'],
  sourceId: string,
): readonly PersonaReaction[] {
  const content = getCaseContent(caseId)
  if (sourceType === 'field-action') {
    return content.fieldActions.find((action) => action.id === sourceId)?.reactions ?? []
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
): string | null {
  const source = getCaseContent(caseId).precedentSource
  if (!source) return null
  const priorDecision = precedents[source.caseId]
  if (!priorDecision) return null
  return source.lines[priorDecision] ?? null
}

export type GamePhase =
  | 'landing'
  | 'briefing'
  | 'investigation'
  | 'reconstruction'
  | 'tribunal'
  | 'debrief'

export type PersonaId = 'registrar' | 'shepherd' | 'defector' | 'archivist'

export type ApproachId = 'procedure' | 'care' | 'covert' | 'curiosity'

export type MethodTag =
  | 'procedure'
  | 'negotiation'
  | 'stealth'
  | 'systems'
  | 'puzzle'
  | 'nonlethal'
  | 'fraud'
  | 'care'
  | 'coercion'

export type EvidenceStatus = 'verified' | 'disputed' | 'anomaly' | 'testimony'

export type EvidenceId =
  | 'custody-chain'
  | 'checksum-drift'
  | 'sensory-echo'
  | 'contradictory-scar'
  | 'sensor-omission'
  | 'maintenance-override'
  | 'missing-category'
  | 'redacted-index'
  | 'relational-proof'
  | 'reconstructed-chain'
  | 'novel-memory'
  | 'irreducible-conflict'

export type SiteId = 'registry' | 'care-ward' | 'maintenance' | 'small-archive'

export type FieldActionId =
  | 'authenticate-chain'
  | 'trace-checksum'
  | 'listen-mara'
  | 'stress-test'
  | 'walk-acoustic-shadow'
  | 'forge-authority'
  | 'answer-archivist'
  | 'seal-index'

export type FragmentId = 'scar-sensation' | 'witness-account' | 'registry-hash' | 'new-dream'

export type ReconstructionId =
  | 'relational-continuity'
  | 'institutional-chain'
  | 'emergent-self'
  | 'unresolved-composite'

export type DecisionId =
  | 'certify-continuity'
  | 'charter-new-person'
  | 'quarantine-review'
  | 'overwrite-record'

export interface AccessibilitySettings {
  reducedMotion: boolean
  highContrast: boolean
  textSize: 'standard' | 'large'
  showTrustNumbers: boolean
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
}

export interface RunSummary {
  runNumber: number
  decision: DecisionId
  primaryApproach: ApproachId
  methodTags: MethodTag[]
  evidenceCount: number
  alarm: number
  trust: Record<PersonaId, number>
}

export interface GameState {
  schemaVersion: 1
  phase: GamePhase
  runNumber: number
  primaryApproach: ApproachId | null
  completedSites: SiteId[]
  completedActions: FieldActionId[]
  evidence: EvidenceId[]
  methodTags: MethodTag[]
  trust: Record<PersonaId, number>
  alarm: number
  tribunalOverride: boolean
  selectedFragments: FragmentId[]
  reconstruction: ReconstructionId | null
  decision: DecisionId | null
  events: GameEvent[]
  previousRuns: RunSummary[]
  settings: AccessibilitySettings
  announcement: string
}

export type GameAction =
  | { type: 'START_NEW' }
  | { type: 'RESTORE'; state: GameState }
  | { type: 'SELECT_APPROACH'; approachId: ApproachId }
  | { type: 'COMMIT_FIELD_ACTION'; actionId: FieldActionId }
  | { type: 'OPEN_RECONSTRUCTION' }
  | { type: 'TOGGLE_FRAGMENT'; fragmentId: FragmentId }
  | { type: 'SUBMIT_RECONSTRUCTION' }
  | { type: 'ENTER_TRIBUNAL' }
  | { type: 'RETURN_TO_INVESTIGATION' }
  | { type: 'DECIDE'; decisionId: DecisionId }
  | { type: 'START_NEXT_RUN' }
  | { type: 'RETURN_TO_TITLE' }
  | { type: 'UPDATE_SETTING'; setting: keyof AccessibilitySettings; value: boolean | 'standard' | 'large' }

// One authored, in-voice line a persona speaks in the moment a commitment lands.
// This is CONTENT, not persisted state: it is looked up view-side from ids that
// already live in GameState (event sourceType/sourceId, the site's chosen
// actionId, the filed reconstruction). The engine never needs to know it exists.
export interface PersonaReaction {
  persona: PersonaId
  line: string
}

export interface PersonaDefinition {
  id: PersonaId
  name: string
  role: string
  principle: string
}

export interface ApproachDefinition {
  id: ApproachId
  title: string
  method: string
  description: string
  consequence: string
  trust: Partial<Record<PersonaId, number>>
}

export interface EvidenceDefinition {
  id: EvidenceId
  title: string
  source: string
  status: EvidenceStatus
  claim: string
  contradiction: string
}

export interface FieldActionDefinition {
  id: FieldActionId
  siteId: SiteId
  title: string
  methodLabel: string
  description: string
  consequence: string
  methodTags: MethodTag[]
  evidenceId: EvidenceId
  trust: Partial<Record<PersonaId, number>>
  alarmDelta: number
  grantsTribunalOverride: boolean
  eventTitle: string
  eventDetail: string
  // Testimony of the route not taken: read at debrief for the sibling action
  // the auditor skipped when this action's site was visited another way.
  counterfactualNote?: string
  // The persona(s) who speak in the moment this action is committed, in their
  // established voice. Read view-side; never persisted.
  reactions?: readonly PersonaReaction[]
}

export interface SiteDefinition {
  id: SiteId
  index: string
  name: string
  description: string
  actionIds: readonly FieldActionId[]
  // Read at debrief when the site was never visited in this run.
  unvisitedNote: string
}

export interface FragmentDefinition {
  id: FragmentId
  timecode: string
  title: string
  content: string
  source: string
}

export interface ReconstructionDefinition {
  id: ReconstructionId
  title: string
  thesis: string
  evidenceId: EvidenceId
  trust: Partial<Record<PersonaId, number>>
  // The persona most implicated by this model reacts to it being filed.
  reactions?: readonly PersonaReaction[]
}

export interface DecisionDefinition {
  id: DecisionId
  title: string
  shortLabel: string
  description: string
  cost: string
  requiresOverride: boolean
}

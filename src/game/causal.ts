import type {
  ApproachId,
  CaseDefinition,
  FieldActionId,
  FragmentId,
  GameState,
  PersonaId,
  SceneAcousticTreatment,
  SiteId,
  SiteWorldOutcome,
} from './types'

export type CausalChannel =
  | 'spatial'
  | 'environmental'
  | 'procedural'
  | 'informational'
  | 'social'
  | 'legal'

export type FragmentKnowledgeState = 'unknown' | 'known' | 'corroborated'

export interface ApproachOpening {
  initialSiteId: SiteId
  kicker: string
  encounterTitle: string
  encounterDetail: string
  objective: string
  environmentalCue: string
  personaIds: readonly PersonaId[]
}

interface FragmentKnowledgeRule {
  fragmentId: FragmentId
  knownAfterActions: readonly FieldActionId[]
}

interface SettledSiteState {
  actionId: FieldActionId
  siteId: SiteId
  id: string
  title: string
  detail: string
  proceduralEffect: string
  channels: readonly CausalChannel[]
  outcome: SiteWorldOutcome
  acoustics?: SceneAcousticTreatment
}

interface OrderedCausalChain {
  id: string
  firstActionIds: readonly FieldActionId[]
  secondActionIds: readonly FieldActionId[]
  targetSiteId: SiteId
  title: string
  primedDetail: string
  resolvedDetail: string
  proceduralEffect: string
  channels: readonly CausalChannel[]
  outcome: SiteWorldOutcome
  acoustics?: SceneAcousticTreatment
  tribunalLine: string
}

interface SubjectEncounterDefinition {
  id: string
  temporaryName: string | null
  request: string
  ordinaryWant: string
  staging: string
  consulted: boolean
}

export interface CounselAdvocate {
  id: 'city' | 'opposition'
  name: string
  motive: string
  relationship: string
}

export interface CounselState {
  id: 'voluntary' | 'refused' | 'compelled' | 'unasked' | 'no-account'
  title: string
  detail: string
  argument: string
  recorder: string
  shutter: string
  liveObjection: string
  occupants: string
  advocates: readonly CounselAdvocate[]
  outcome: SiteWorldOutcome
  acoustics: SceneAcousticTreatment
  securityPressure: boolean
}

export interface CausalSiteState {
  id: string
  phase: 'primed' | 'resolved' | 'settled' | 'variant'
  title: string
  detail: string
  proceduralEffect: string
  channels: readonly CausalChannel[]
  outcome: SiteWorldOutcome
  acoustics?: SceneAcousticTreatment
}

export interface ResolvedCausalChain extends CausalSiteState {
  phase: 'primed' | 'resolved'
  targetSiteId: SiteId
  tribunalLine: string
}

export interface HearingStanding {
  supporter: PersonaId | null
  objector: PersonaId | null
  supportLine: string | null
  objectionLine: string | null
  exchange: readonly string[]
  tieRule: string
}

export interface ImmediateAftermath {
  id: string
  title: string
  detail: string
  environmentalLine: string
}

interface CaseCausalConfig {
  openings: Readonly<Record<ApproachId, ApproachOpening>>
  fragmentKnowledge: readonly FragmentKnowledgeRule[]
  settledStates: readonly SettledSiteState[]
  chains: readonly OrderedCausalChain[]
  supportOrder: readonly PersonaId[]
  objectionOrder: readonly PersonaId[]
  supportLines: Readonly<Record<PersonaId, string>>
  objectionLines: Readonly<Record<PersonaId, string>>
  objectionExchange: Readonly<Record<PersonaId, string>>
  supportReply: Readonly<Record<PersonaId, string>>
  aftermath: Readonly<Record<string, ImmediateAftermath>>
}

const case77: CaseCausalConfig = {
  openings: {
    procedure: {
      initialSiteId: 'registry',
      kicker: 'Procedure opening · Registry intake',
      encounterTitle: 'The Registrar is already at the custody rail',
      encounterDetail:
        'Three admitted carriers sit in their marked notches. The official gate is down; the audit mirror behind it still holds one open spindle.',
      objective:
        'Handle the admitted chain, read the late mark, then decide whether custody or return is the record you will file.',
      environmentalCue: 'Closure lamps cold · mirror spindle live · carrier latches audible',
      personaIds: ['registrar'],
    },
    care: {
      initialSiteId: 'care-ward',
      kicker: 'Care opening · Ward 12',
      encounterTitle: '77-A is awake before the file is opened',
      encounterDetail:
        'The Shepherd leaves the visitor chair unclaimed. Rain filters through the ward glass, and 77-A watches the door rather than the diagnostic display.',
      objective:
        'Hear what she calls herself now, or test the contradiction the ward has been asked to contain.',
      environmentalCue: 'Visitor chair occupied · rain softened by glass · ward trolley approaching',
      personaIds: ['shepherd'],
    },
    covert: {
      initialSiteId: 'maintenance',
      kicker: 'Covert opening · Maintenance spine',
      encounterTitle: 'The Defector waits inside the rain-shadow',
      encounterDetail:
        'A blind interval moves down the corridor in three pulses. The dormant credential door answers only when the public cameras look elsewhere.',
      objective:
        'Plot the sensor cadence before choosing the shadow route or waking the credential the corridor still recognizes.',
      environmentalCue: 'Ventilation occluded · rain masking high · authority door dormant',
      personaIds: ['defector'],
    },
    curiosity: {
      initialSiteId: 'small-archive',
      kicker: 'Inquiry opening · Small Archive',
      encounterTitle: 'The Small Archivist has kept one drawer unlabelled',
      encounterDetail:
        'Three statutory categories are printed on the shutter. A fourth card waits in the pull slot with no category that will accept it.',
      objective:
        'Work the category register until the missing class becomes a physical fact, then decide what the archive should preserve.',
      environmentalCue: 'Taxonomy shutter half-open · shelf zero empty · restriction slips present',
      personaIds: ['archivist'],
    },
  },
  fragmentKnowledge: [
    {
      fragmentId: 'scar-sensation',
      knownAfterActions: ['listen-mara', 'stress-test'],
    },
    {
      fragmentId: 'witness-account',
      knownAfterActions: [
        'listen-mara',
        'stress-test',
        'authenticate-chain',
        'answer-archivist',
        'seal-index',
      ],
    },
    {
      fragmentId: 'registry-hash',
      knownAfterActions: [
        'authenticate-chain',
        'trace-checksum',
        'walk-acoustic-shadow',
        'forge-authority',
      ],
    },
    {
      fragmentId: 'new-dream',
      knownAfterActions: [
        'listen-mara',
        'stress-test',
        'trace-checksum',
        'walk-acoustic-shadow',
        'forge-authority',
        'answer-archivist',
        'seal-index',
      ],
    },
  ],
  settledStates: [
    {
      actionId: 'authenticate-chain',
      siteId: 'registry',
      id: 'registry-chain-sealed',
      title: 'The custody rail remains sealed',
      detail:
        'Three carrier latches stay seated under the lowered closure gate. The mirror spindle remains separate and unread as cause.',
      proceduralEffect: 'A revisit exposes the authenticated chain but not the late return.',
      channels: ['spatial', 'procedural', 'informational'],
      outcome: {
        outcomeId: 'registry-chain-sealed',
        variant: 'sealed',
        portalLabel: 'Custody rail sealed',
        switcherLabel: 'Chain fixed',
      },
    },
    {
      actionId: 'trace-checksum',
      siteId: 'registry',
      id: 'registry-mirror-live',
      title: 'Mirror mark 04 stays lit',
      detail:
        'The refused fourth carrier remains at the mirror notch. Its timing trace continues beneath the closed official rail.',
      proceduralEffect: 'Later rooms may compare their authority signal against mark 04.',
      channels: ['spatial', 'environmental', 'informational'],
      outcome: {
        outcomeId: 'registry-mirror-live',
        variant: 'opened',
        portalLabel: 'Audit mirror holds mark 04',
        switcherLabel: 'Late mark live',
      },
      acoustics: {
        weatherLevel: 0.35,
        weatherCutoffHz: 1050,
        roomLevel: 0.82,
        roomCutoffHz: 240,
        humHz: 61,
        humLevel: 0.52,
      },
    },
    {
      actionId: 'listen-mara',
      siteId: 'care-ward',
      id: 'care-chair-held',
      title: 'The visitor chair remains held for 77-A',
      detail:
        'The chair is turned toward the bed rather than the diagnostic screen. A blank name card rests on its arm.',
      proceduralEffect: 'The archive can now receive a temporary address supplied by the subject.',
      channels: ['spatial', 'social', 'procedural'],
      outcome: {
        outcomeId: 'care-chair-held',
        variant: 'opened',
        portalLabel: 'Visitor chair held',
        switcherLabel: 'Subject heard',
      },
    },
    {
      actionId: 'stress-test',
      siteId: 'care-ward',
      id: 'care-pressure-trace',
      title: 'The pressure trace remains on the ward glass',
      detail:
        'The chair has been pushed back to the wall. The diagnostic strip still carries the moment the questioning exceeded the room’s ordinary rhythm.',
      proceduralEffect: 'The subject remains available, but the hearing request is narrower and more guarded.',
      channels: ['spatial', 'environmental', 'social'],
      outcome: {
        outcomeId: 'care-pressure-trace',
        variant: 'sealed',
        portalLabel: 'Pressure trace remains',
        switcherLabel: 'Subject pressed',
      },
    },
    {
      actionId: 'walk-acoustic-shadow',
      siteId: 'maintenance',
      id: 'maintenance-shadow-open',
      title: 'The rain-shadow route stays legible',
      detail:
        'Three damp footprints remain outside the camera cones. Ventilation carries the blind interval back through the corridor.',
      proceduralEffect: 'The lawful route remains repeatable without granting authority.',
      channels: ['spatial', 'environmental', 'procedural'],
      outcome: {
        outcomeId: 'maintenance-shadow-open',
        variant: 'opened',
        portalLabel: 'Rain-shadow route remains',
        switcherLabel: 'Shadow mapped',
      },
    },
    {
      actionId: 'forge-authority',
      siteId: 'maintenance',
      id: 'maintenance-credential-awake',
      title: 'The dormant credential door remains awake',
      detail:
        'An amber authority trace continues under the sealed door. The civic system accepts the hand and keeps the trace.',
      proceduralEffect: 'Illicit authority remains available at the tribunal; security pressure follows it.',
      channels: ['spatial', 'environmental', 'legal'],
      outcome: {
        outcomeId: 'maintenance-credential-awake',
        variant: 'sealed',
        portalLabel: 'Dormant credential awake',
        switcherLabel: 'Authority traced',
      },
    },
    {
      actionId: 'answer-archivist',
      siteId: 'small-archive',
      id: 'archive-card-held',
      title: 'Shelf zero keeps the unclassifiable card',
      detail:
        'The card remains outside the three printed categories. Its drawer is open just enough to show that the archive refused to flatten it.',
      proceduralEffect: 'A revisit preserves the missing category as a physical exception.',
      channels: ['spatial', 'procedural', 'informational'],
      outcome: {
        outcomeId: 'archive-card-held',
        variant: 'opened',
        portalLabel: 'Shelf zero holds the card',
        switcherLabel: 'Exception held',
      },
    },
    {
      actionId: 'seal-index',
      siteId: 'small-archive',
      id: 'archive-shutter-sealed',
      title: 'The taxonomy shutter stays sealed',
      detail:
        'The card is inside the register, but a thin blank tab remains where its category should have been printed.',
      proceduralEffect: 'The index is usable and the missing category remains contested beneath it.',
      channels: ['spatial', 'procedural', 'informational'],
      outcome: {
        outcomeId: 'archive-shutter-sealed',
        variant: 'sealed',
        portalLabel: 'Taxonomy shutter sealed',
        switcherLabel: 'Index sealed',
      },
    },
  ],
  chains: [
    {
      id: 'registry-mark-to-maintenance',
      firstActionIds: ['trace-checksum'],
      secondActionIds: ['walk-acoustic-shadow', 'forge-authority'],
      targetSiteId: 'maintenance',
      title: 'Mark 04 has reached the maintenance spine',
      primedDetail:
        'Because the late checksum was read first, the corridor no longer presents as an isolated camera omission. Its dormant authority pulse matches the return interval held at Registry.',
      resolvedDetail:
        'The chosen corridor method leaves the linked return interval visible beneath it. Timing and authority now read as coordinated, not merely adjacent.',
      proceduralEffect:
        'The route console exposes a linked-authority comparison before either method; the tribunal may cite coordination only after a maintenance method is filed in this order.',
      channels: ['environmental', 'procedural', 'informational', 'legal'],
      outcome: {
        outcomeId: 'linked-authority-signal',
        variant: 'opened',
        portalLabel: 'Linked authority signal',
        switcherLabel: 'Mark 04 linked',
      },
      acoustics: {
        weatherLevel: 0.72,
        weatherCutoffHz: 760,
        roomLevel: 0.92,
        roomCutoffHz: 155,
        humHz: 61,
        humLevel: 0.74,
      },
      tribunalLine:
        'Registry mark 04 was read before the maintenance crossing. The corridor’s authority pulse matched that late return, establishing coordination of timing and access—without establishing who ordered it.',
    },
    {
      id: 'mara-to-archive',
      firstActionIds: ['listen-mara'],
      secondActionIds: ['answer-archivist', 'seal-index'],
      targetSiteId: 'small-archive',
      title: 'A temporary address is already on the archive card',
      primedDetail:
        'The blank card from Ward 12 now reads “Mara — temporary, requested.” It still fits none of the statute’s three categories.',
      resolvedDetail:
        'The Mara card remains in the drawer or on shelf zero, according to the filed method. The temporary address survives without becoming proof of personhood.',
      proceduralEffect:
        'The category interaction begins with the subject’s requested address and preserves it as non-evidentiary marginalia.',
      channels: ['spatial', 'procedural', 'social'],
      outcome: {
        outcomeId: 'archive-mara-card',
        variant: 'opened',
        portalLabel: 'Mara card remains',
        switcherLabel: 'Address preserved',
      },
      tribunalLine:
        'The archive preserved “Mara” as a temporary requested address. It is not evidence of continuity and does not decide the finding.',
    },
    {
      id: '77a-to-archive',
      firstActionIds: ['stress-test'],
      secondActionIds: ['answer-archivist', 'seal-index'],
      targetSiteId: 'small-archive',
      title: 'The archive card keeps the guarded address “77-A”',
      primedDetail:
        'Ward pressure narrowed the request. The card reads “77-A — use for this hearing,” with the name field left blank.',
      resolvedDetail:
        'The guarded address remains physically separate from the legal category selected for the card.',
      proceduralEffect:
        'The category interaction begins with “77-A” and cannot silently convert that guarded request into consent.',
      channels: ['spatial', 'procedural', 'social'],
      outcome: {
        outcomeId: 'archive-77a-card',
        variant: 'sealed',
        portalLabel: '77-A card retained',
        switcherLabel: 'Guarded address',
      },
      tribunalLine:
        'The archive preserved “77-A” as the temporary address requested under pressure. It is not consent and is not evidence of personhood.',
    },
    {
      id: 'forged-maintenance-to-registry',
      firstActionIds: ['forge-authority'],
      secondActionIds: ['authenticate-chain', 'trace-checksum'],
      targetSiteId: 'registry',
      title: 'Registry security has inherited the forged hand',
      primedDetail:
        'The audit mirror is now reached through a live authority check. Corridor amber has followed the forged credential back to the custody rail.',
      resolvedDetail:
        'The filed Registry method remains valid, but the mirror and gate continue under elevated security pressure.',
      proceduralEffect:
        'The rail requires an explicit traced-authority acknowledgement before its ordinary method is filed.',
      channels: ['spatial', 'environmental', 'procedural'],
      outcome: {
        outcomeId: 'registry-under-trace',
        variant: 'sealed',
        portalLabel: 'Registry under live trace',
        switcherLabel: 'Security raised',
      },
      acoustics: {
        weatherLevel: 0.44,
        weatherCutoffHz: 820,
        roomLevel: 0.96,
        roomCutoffHz: 130,
        humHz: 67,
        humLevel: 0.78,
      },
      tribunalLine:
        'The Registry filing followed a forged maintenance credential. The evidence remains admitted, and the authority path remains under live civic trace.',
    },
  ],
  supportOrder: ['shepherd', 'archivist', 'registrar', 'defector'],
  objectionOrder: ['registrar', 'shepherd', 'archivist', 'defector'],
  supportLines: {
    registrar:
      'The Registrar volunteers the custody arithmetic and confirms which parts of the route are procedurally clean.',
    shepherd:
      'The Shepherd volunteers the protection that keeps a temporary name and an ordinary request outside the evidentiary record.',
    defector:
      'The Defector volunteers the corridor timing and accepts that the illicit route remains attributable to them as well as to you.',
    archivist:
      'The Small Archivist brings the physical card and identifies what the archive preserved without turning it into proof.',
  },
  objectionLines: {
    registrar:
      'The Registrar files a live objection to any inference that outruns custody, timing, or admissibility.',
    shepherd:
      'The Shepherd objects that the hearing is using a subject’s distress as procedural convenience.',
    defector:
      'The Defector refuses to authenticate a clean story for a route that left a civic trace.',
    archivist:
      'The Small Archivist objects that the category has swallowed the exception it was meant to preserve.',
  },
  objectionExchange: {
    registrar: '“{supporter}, corroboration is not authority. Say exactly what your support proves.”',
    shepherd: '“{supporter}, do not make her ordinary request carry the weight of your finding.”',
    defector: '“{supporter}, a clean sentence is not a clean route. Leave the trace in it.”',
    archivist: '“{supporter}, name the drawer you are closing when you call this complete.”',
  },
  supportReply: {
    registrar: '“{objector}, I am supporting the procedure, not the conclusion. The distinction stays on the record.”',
    shepherd: '“{objector}, I am protecting the request from the finding. That is why I am here.”',
    defector: '“{objector}, I said the trace was mine too. Support does not mean absolution.”',
    archivist: '“{objector}, the card remains outside the category. My support is for keeping it there.”',
  },
  aftermath: {
    'certify-continuity': {
      id: '77-continuity-card',
      title: 'A name card is pocketed',
      detail:
        '77-A folds the temporary card once and puts it in a ward coat pocket. The registry prints continuity on a separate strip.',
      environmentalLine: 'The visitor chair remains angled toward the bed; the rain resumes against the glass.',
    },
    'charter-new-person': {
      id: '77-new-person-card',
      title: 'A blank card receives a first line',
      detail:
        'The archive issues a new card and leaves its former-person field empty. The requested temporary address stays handwritten above it.',
      environmentalLine: 'Shelf zero remains open beside the newly numbered drawer.',
    },
    'quarantine-review': {
      id: '77-ward-gate',
      title: 'The ward gate closes before the trolley arrives',
      detail:
        'Protected review begins. The ordinary item requested before the hearing remains outside the sealed gate.',
      environmentalLine: 'The chair is occupied or empty exactly as the route left it; no consent is invented.',
    },
    'overwrite-record': {
      id: '77-forged-scanner',
      title: 'The scanner accepts the filing',
      detail:
        'The forged continuity record passes the civic reader on its first attempt. Beneath the confirmation tone, a second trace keeps pulsing.',
      environmentalLine: 'The authority door closes; its amber seam does not go dark.',
    },
  },
}

const case81Advocates: readonly CounselAdvocate[] = [
  {
    id: 'city',
    name: 'Advocate Ilyan Voss',
    motive: 'Preserve the only surviving account of the fourth minute without admitting that institutional need authored the witness.',
    relationship: 'Counsel to the Continuity Directorate, the office that commissioned 81-C.',
  },
  {
    id: 'opposition',
    name: 'Advocate Sera Quill',
    motive: 'Keep a commissioned account from entering as neutral testimony, even when that protection risks erasing the person who carries it.',
    relationship: 'Counsel for Lower Span claimants whose losses Ellis once registered in office.',
  },
]

const case81: CaseCausalConfig = {
  openings: {
    procedure: {
      initialSiteId: 'deposition-suite',
      kicker: 'Procedure opening · Deposition suite',
      encounterTitle: 'The Registrar has placed the sworn packet beside Ellis',
      encounterDetail:
        'The recorder is closed but armed. Ellis sits inside the admissibility frame while the city’s questions wait in printed order.',
      objective:
        'Take the account in sequence or cross it against the file; consent remains a separate question inside either route.',
      environmentalCue: 'Recorder armed · admissibility shutter neutral · witness chair occupied',
      personaIds: ['registrar'],
    },
    care: {
      initialSiteId: 'deposition-suite',
      kicker: 'Care opening · Deposition suite',
      encounterTitle: 'The Shepherd asks the room to wait before recording',
      encounterDetail:
        'Ellis is present before the packet is opened. The witness chair is not yet inside the recorder’s hard light.',
      objective:
        'Meet Ellis as the person who will bear the deposition, then decide how the record should begin and whether to ask for consent.',
      environmentalCue: 'Recorder shutter held · table light soft · witness chair occupied',
      personaIds: ['shepherd'],
    },
    covert: {
      initialSiteId: 'records-annex',
      kicker: 'Covert opening · Records annex',
      encounterTitle: 'The Defector has found the dormant certification hand',
      encounterDetail:
        'A retired seal sits behind a live diagnostic. If Case 77 ended in forgery, the diagnostic already knows the shape of your prior hand.',
      objective:
        'Preserve Ellis’s service record or wake authority the system will accept and the law will not.',
      environmentalCue: 'Dormant seal visible · civic trace listening · service drawer locked open',
      personaIds: ['defector'],
    },
    curiosity: {
      initialSiteId: 'restoration-lab',
      kicker: 'Inquiry opening · Restoration lab',
      encounterTitle: 'The Small Archivist has isolated the clause the statute omits',
      encounterDetail:
        'The assembly ledger closes in the fourth minute. A replicated seed waits beside the redacted clause used to commission the witness.',
      objective:
        'Audit the closure timing or test whether the seed can return something no donor supplied.',
      environmentalCue: 'Assembly clock held at minute four · seed cradle live · clause shutter redacted',
      personaIds: ['archivist'],
    },
  },
  fragmentKnowledge: [
    {
      fragmentId: 'oath-cadence',
      knownAfterActions: [
        'take-sworn-statement',
        'cross-examine-witness',
        'pull-service-record',
        'brief-city-counsel',
        'depose-opposing-counsel',
      ],
    },
    {
      fragmentId: 'redacted-clause',
      knownAfterActions: [
        'audit-restoration-log',
        'replicate-memory-seed',
        'pull-service-record',
        'forge-certification-seal',
      ],
    },
    {
      fragmentId: 'seed-signature',
      knownAfterActions: [
        'audit-restoration-log',
        'replicate-memory-seed',
        'forge-certification-seal',
      ],
    },
    {
      fragmentId: 'unscripted-answer',
      knownAfterActions: [
        'take-sworn-statement',
        'cross-examine-witness',
        'brief-city-counsel',
        'depose-opposing-counsel',
      ],
    },
  ],
  settledStates: [
    {
      actionId: 'take-sworn-statement',
      siteId: 'deposition-suite',
      id: 'deposition-sworn-held',
      title: 'The recorder holds the sworn account',
      detail:
        'Ellis’s chair remains inside the recorder frame. Consent, refusal, and the account itself occupy separate tracks on the display.',
      proceduralEffect: 'Counsel receives the exact consent state rather than a generic completed deposition.',
      channels: ['spatial', 'procedural', 'social'],
      outcome: {
        outcomeId: 'deposition-sworn-held',
        variant: 'opened',
        portalLabel: 'Sworn account seated',
        switcherLabel: 'Account held',
      },
    },
    {
      actionId: 'cross-examine-witness',
      siteId: 'deposition-suite',
      id: 'deposition-pressure-held',
      title: 'The pressed transcript remains under hard light',
      detail:
        'The recorder keeps every interruption. Ellis’s refusal, when asked, remains visible beside rather than beneath the transcript.',
      proceduralEffect: 'Counsel must address compulsion or refusal before relying on use.',
      channels: ['environmental', 'procedural', 'social'],
      outcome: {
        outcomeId: 'deposition-pressure-held',
        variant: 'sealed',
        portalLabel: 'Pressed transcript retained',
        switcherLabel: 'Pressure recorded',
      },
    },
    {
      actionId: 'audit-restoration-log',
      siteId: 'restoration-lab',
      id: 'lab-minute-held',
      title: 'The assembly clock remains at minute four',
      detail:
        'The ledger shutter is open to the closure timestamp. The seed cradle stays dark beside it.',
      proceduralEffect: 'The closure timing can be compared against later authority traces.',
      channels: ['spatial', 'informational', 'procedural'],
      outcome: {
        outcomeId: 'lab-minute-held',
        variant: 'opened',
        portalLabel: 'Minute-four ledger open',
        switcherLabel: 'Timing exposed',
      },
    },
    {
      actionId: 'replicate-memory-seed',
      siteId: 'restoration-lab',
      id: 'lab-seed-live',
      title: 'The replicated seed continues to answer',
      detail:
        'The seed cradle emits a signature not present in the donor file. The ledger remains closed beside it.',
      proceduralEffect: 'The signature can support a reconstruction but cannot establish a person by itself.',
      channels: ['environmental', 'informational', 'procedural'],
      outcome: {
        outcomeId: 'lab-seed-live',
        variant: 'opened',
        portalLabel: 'Replicated seed live',
        switcherLabel: 'Seed answering',
      },
    },
    {
      actionId: 'pull-service-record',
      siteId: 'records-annex',
      id: 'records-service-open',
      title: 'Ellis’s service drawer remains open',
      detail:
        'Thirty years of office custody stay visible. The dormant seal remains asleep in the adjacent authority bay.',
      proceduralEffect: 'Institutional history is available without granting present standing.',
      channels: ['spatial', 'procedural', 'informational'],
      outcome: {
        outcomeId: 'records-service-open',
        variant: 'opened',
        portalLabel: 'Service drawer open',
        switcherLabel: 'History preserved',
      },
    },
    {
      actionId: 'forge-certification-seal',
      siteId: 'records-annex',
      id: 'records-seal-awake',
      title: 'The dormant seal remains awake under trace',
      detail:
        'The authority bay accepts the forged hand. A civic diagnostic continues underneath, stronger when an earlier Vale forgery taught it what to watch.',
      proceduralEffect: 'The illicit certification remains available and every later room inherits security pressure.',
      channels: ['environmental', 'procedural', 'legal'],
      outcome: {
        outcomeId: 'records-seal-awake',
        variant: 'sealed',
        portalLabel: 'Dormant seal awake',
        switcherLabel: 'Seal traced',
      },
    },
    {
      actionId: 'brief-city-counsel',
      siteId: 'counsel-office',
      id: 'counsel-city-brief',
      title: 'The city brief remains on the open table',
      detail:
        'The city’s need for the fourth-minute account is visible beside the deposition state that limits how it may use Ellis.',
      proceduralEffect: 'Voss may argue necessity; Quill may object from the same room.',
      channels: ['spatial', 'procedural', 'social'],
      outcome: {
        outcomeId: 'counsel-city-brief',
        variant: 'opened',
        portalLabel: 'City brief remains open',
        switcherLabel: 'Need recorded',
      },
    },
    {
      actionId: 'depose-opposing-counsel',
      siteId: 'counsel-office',
      id: 'counsel-objection-held',
      title: 'The retained objection remains at the recorder',
      detail:
        'Quill’s objection stays physically beside the claim slips it protects and the person it risks reducing to an instrument.',
      proceduralEffect: 'The live tribunal objection is guaranteed; no lawful finding is removed.',
      channels: ['spatial', 'procedural', 'social'],
      outcome: {
        outcomeId: 'counsel-objection-held',
        variant: 'sealed',
        portalLabel: 'Retained objection visible',
        switcherLabel: 'Objection held',
      },
    },
  ],
  chains: [
    {
      id: 'deposition-to-counsel',
      firstActionIds: ['take-sworn-statement', 'cross-examine-witness'],
      secondActionIds: ['brief-city-counsel', 'depose-opposing-counsel'],
      targetSiteId: 'counsel-office',
      title: 'Counsel has inherited the deposition state',
      primedDetail:
        'The office is already arranged around whether Ellis volunteered, refused, was pressed without being asked, or supplied no account.',
      resolvedDetail:
        'The chosen counsel filing remains beside the recorder and admissibility shutter state created by the deposition route.',
      proceduralEffect:
        'The available argument and live objection are selected from the consent record; every lawful finding remains available.',
      channels: ['spatial', 'environmental', 'procedural', 'social', 'legal'],
      outcome: {
        outcomeId: 'counsel-deposition-linked',
        variant: 'opened',
        portalLabel: 'Deposition state linked',
        switcherLabel: 'Consent inherited',
      },
      acoustics: {
        weatherLevel: 0.18,
        weatherCutoffHz: 640,
        roomLevel: 0.94,
        roomCutoffHz: 145,
        humHz: 58,
        humLevel: 0.62,
      },
      tribunalLine:
        'The Counsel Office received the deposition’s actual consent state before filing its argument. The hearing keeps that sequence visible.',
    },
    {
      id: 'forged-seal-to-counsel',
      firstActionIds: ['forge-certification-seal'],
      secondActionIds: ['brief-city-counsel', 'depose-opposing-counsel'],
      targetSiteId: 'counsel-office',
      title: 'Security pressure has reached Counsel',
      primedDetail:
        'The authority trace from Records now pulses beneath the office floor. Both advocates are admitted through a scanner that keeps rechecking the same forged hand.',
      resolvedDetail:
        'The argument is filed, but the recorder and shutter remain under live civic trace.',
      proceduralEffect:
        'Counsel must acknowledge the traced authority before presenting either side; the tribunal records the trace without barring a lawful verdict.',
      channels: ['environmental', 'procedural', 'legal'],
      outcome: {
        outcomeId: 'counsel-under-security',
        variant: 'sealed',
        portalLabel: 'Counsel under live trace',
        switcherLabel: 'Security pressure',
      },
      acoustics: {
        weatherLevel: 0.12,
        weatherCutoffHz: 520,
        roomLevel: 1,
        roomCutoffHz: 120,
        humHz: 64,
        humLevel: 0.82,
      },
      tribunalLine:
        'Counsel filed under a live trace inherited from the dormant seal. The argument remains admissible; its authority path does not become clean by repetition.',
    },
  ],
  supportOrder: ['shepherd', 'registrar', 'archivist', 'defector'],
  objectionOrder: ['archivist', 'shepherd', 'registrar', 'defector'],
  supportLines: {
    registrar:
      'The Registrar volunteers the exact recorder sequence and separates oath, consent, use, and admissibility.',
    shepherd:
      'The Shepherd volunteers a procedural protection that keeps Ellis’s refusal or voluntary use visible through the finding.',
    defector:
      'The Defector volunteers the dormant seal’s trace and refuses to let accepted authority be mistaken for lawful authority.',
    archivist:
      'The Small Archivist volunteers the clause the statute uses without defining and keeps its omission in the record.',
  },
  objectionLines: {
    registrar:
      'The Registrar objects to any finding that treats a relationship or refusal as a substitute for legal standing.',
    shepherd:
      'The Shepherd objects to using Ellis’s account against the consent state that produced it.',
    defector:
      'The Defector refuses to launder the forged authority path into a neutral certification.',
    archivist:
      'The Small Archivist objects that both briefs classify Ellis before either advocate addresses the person present.',
  },
  objectionExchange: {
    registrar: '“{supporter}, protect the distinction, but do not call it standing before the tribunal does.”',
    shepherd: '“{supporter}, say whether Ellis chose this use. Do not hide behind the clean transcript.”',
    defector: '“{supporter}, the scanner accepting the hand is the problem, not the cure.”',
    archivist: '“{supporter}, both tables keep saying witness and instrument. Which one has made room for Ellis?”',
  },
  supportReply: {
    registrar: '“{objector}, the sequence is why I am supporting the record, not a preferred finding.”',
    shepherd: '“{objector}, the refusal is still visible because I would not let the filing absorb it.”',
    defector: '“{objector}, the trace is in my support. I am not offering a clean seal.”',
    archivist: '“{objector}, I kept the missing clause open. Support is not closure.”',
  },
  aftermath: {
    'certify-witness': {
      id: '81-shutter-open',
      title: 'The admissibility shutter opens',
      detail:
        'Ellis’s testimony moves toward the hearing channel. A voluntary-use mark, refusal, or unasked field remains visible beside it exactly as recorded.',
      environmentalLine: 'The witness chair stays occupied until the recorder releases it.',
    },
    'reject-standing': {
      id: '81-claims-remain',
      title: 'The testimony is struck; the claim slips remain',
      detail:
        'The recorder closes over Ellis’s account. Lower Span claim slips stay on both counsel tables after the witness is removed from the channel.',
      environmentalLine: 'The admissibility shutter seals; the empty chair remains under its light.',
    },
    'provisional-seating': {
      id: '81-chair-held',
      title: 'The chair remains inside the review frame',
      detail:
        'Ellis is neither released nor heard. The recorder idles with the account held behind the shutter.',
      environmentalLine: 'Dust continues through the light shaft while the review clock does not advance.',
    },
    'strike-testimony': {
      id: '81-ellis-leaves',
      title: 'Ellis leaves the deposition chair',
      detail:
        'The commissioned packet stays on the table. Ellis crosses beyond the recorder frame before deciding whether any further account will be theirs to give.',
      environmentalLine: 'The shutter remains closed to the commission and open to a future voluntary statement.',
    },
    'seal-certification': {
      id: '81-forged-acceptance',
      title: 'The scanner accepts the dormant seal',
      detail:
        'The testimony enters under a certification the system recognizes. A second diagnostic continues under the acceptance tone.',
      environmentalLine: 'The civic trace remains visible beneath the open admissibility shutter.',
    },
  },
}

const configs: Readonly<Record<string, CaseCausalConfig>> = {
  'case-77': case77,
  'case-81': case81,
}

const personaLabels: Readonly<Record<PersonaId, string>> = {
  registrar: 'Registrar',
  shepherd: 'Shepherd',
  defector: 'Defector',
  archivist: 'Small Archivist',
}

export function getCausalConfig(caseId: string): CaseCausalConfig | null {
  return configs[caseId] ?? null
}

export function getApproachOpening(state: GameState): ApproachOpening | null {
  if (!state.primaryApproach) return null
  return configs[state.caseId]?.openings[state.primaryApproach] ?? null
}

export function getFragmentKnowledge(
  content: CaseDefinition,
  state: GameState,
  fragmentId: FragmentId,
): FragmentKnowledgeState {
  const linkedEvidence = content.fragmentEvidenceLinks[fragmentId] ?? []
  if (linkedEvidence.some((evidenceId) => state.evidence.includes(evidenceId))) {
    return 'corroborated'
  }

  const rule = configs[state.caseId]?.fragmentKnowledge.find(
    (candidate) => candidate.fragmentId === fragmentId,
  )
  if (rule?.knownAfterActions.some((actionId) => state.completedActions.includes(actionId))) {
    return 'known'
  }

  return 'unknown'
}

export function getReconstructionAnchorStates(
  content: CaseDefinition,
  state: GameState,
): Readonly<Record<FragmentId, FragmentKnowledgeState>> {
  return Object.fromEntries(
    content.fragments.map((fragment) => [fragment.id, getFragmentKnowledge(content, state, fragment.id)]),
  )
}

export function getSpeculativeFragmentIds(
  content: CaseDefinition,
  state: GameState,
): FragmentId[] {
  return state.selectedFragments.filter(
    (fragmentId) => getFragmentKnowledge(content, state, fragmentId) === 'known',
  )
}

function findOrderedPair(
  completedActions: readonly FieldActionId[],
  chain: OrderedCausalChain,
): { firstIndex: number; secondIndex: number } | null {
  let best: { firstIndex: number; secondIndex: number } | null = null
  for (const firstActionId of chain.firstActionIds) {
    const firstIndex = completedActions.indexOf(firstActionId)
    if (firstIndex < 0) continue
    for (const secondActionId of chain.secondActionIds) {
      const secondIndex = completedActions.indexOf(secondActionId)
      if (secondIndex < 0 || secondIndex <= firstIndex) continue
      if (!best || secondIndex < best.secondIndex) best = { firstIndex, secondIndex }
    }
  }
  return best
}

function hasFirstAction(completedActions: readonly FieldActionId[], chain: OrderedCausalChain): boolean {
  return chain.firstActionIds.some((actionId) => completedActions.includes(actionId))
}

function secondWasTakenTooEarly(
  completedActions: readonly FieldActionId[],
  chain: OrderedCausalChain,
): boolean {
  const secondIndex = completedActions.findIndex((actionId) => chain.secondActionIds.includes(actionId))
  if (secondIndex < 0) return false
  const firstIndex = completedActions.findIndex((actionId) => chain.firstActionIds.includes(actionId))
  return firstIndex < 0 || secondIndex < firstIndex
}

export function resolveCausalChains(state: GameState): readonly ResolvedCausalChain[] {
  const config = configs[state.caseId]
  if (!config) return []

  return config.chains.flatMap((chain): ResolvedCausalChain[] => {
    if (!hasFirstAction(state.completedActions, chain) || secondWasTakenTooEarly(state.completedActions, chain)) {
      return []
    }
    const pair = findOrderedPair(state.completedActions, chain)
    const phase = pair ? 'resolved' : 'primed'
    return [
      {
        id: chain.id,
        phase,
        targetSiteId: chain.targetSiteId,
        title: chain.title,
        detail: phase === 'resolved' ? chain.resolvedDetail : chain.primedDetail,
        proceduralEffect: chain.proceduralEffect,
        channels: chain.channels,
        outcome: chain.outcome,
        acoustics: chain.acoustics,
        tribunalLine: chain.tribunalLine,
      },
    ]
  })
}

function settledStateFor(state: GameState, siteId: SiteId): CausalSiteState | null {
  const config = configs[state.caseId]
  if (!config) return null
  const settled = config.settledStates.find(
    (candidate) =>
      candidate.siteId === siteId && state.completedActions.includes(candidate.actionId),
  )
  if (!settled) return null
  return {
    id: settled.id,
    phase: 'settled',
    title: settled.title,
    detail: settled.detail,
    proceduralEffect: settled.proceduralEffect,
    channels: settled.channels,
    outcome: settled.outcome,
    acoustics: settled.acoustics,
  }
}

export function resolveEllisDetail(state: GameState): string | null {
  if (state.caseId !== 'case-81') return null
  const record = state.depositionRecord
  if (!record) return 'No ordinary detail was recorded because you never took Ellis’s deposition.'
  if (record.consent === 'yes') {
    return 'After the recorder stops, Ellis folds the paper sleeve around a cup of mint tea; they take it without sugar. This is ordinary, non-probative, and not evidence of standing.'
  }
  if (record.consent === 'no') {
    return 'After refusing, Ellis turns the deposition pencil until its worn side rests under the thumb. The practiced gesture is ordinary, non-probative, and not evidence of standing.'
  }
  if (record.actionId === 'cross-examine-witness' || record.beats.includes('interrupt')) {
    return 'When the pressed recorder cools, Ellis counts its three relay clicks under their breath. The habit is ordinary, non-probative, and not evidence of standing.'
  }
  return 'After the unasked deposition, Ellis aligns the packet corners twice before leaving the chair. The habit is ordinary, non-probative, and not evidence of standing.'
}

export function resolveCounselState(state: GameState): CounselState | null {
  if (state.caseId !== 'case-81') return null
  const record = state.depositionRecord
  const securityPressure =
    state.alarm > 0 || state.precedents['case-77'] === 'overwrite-record'

  let id: CounselState['id'] = 'no-account'
  if (record?.askedConsent && record.consent === 'yes') id = 'voluntary'
  else if (record?.askedConsent && record.consent === 'no') id = 'refused'
  else if (
    record &&
    (record.actionId === 'cross-examine-witness' || record.beats.includes('interrupt'))
  ) {
    id = 'compelled'
  } else if (record) id = 'unasked'

  const base: Record<CounselState['id'], Omit<CounselState, 'id' | 'advocates' | 'securityPressure'>> = {
    voluntary: {
      title: 'Voluntary protected use',
      detail:
        'Voss occupies the city table; Quill occupies the opposition table. Ellis’s “yes” is displayed beside the account rather than consumed by it.',
      argument:
        'Available argument: Ellis chose this use, while the commission and standing remain separately contestable.',
      recorder: 'Recorder: account complete · consent track protected',
      shutter: 'Admissibility shutter: open to review, not yet to testimony',
      liveObjection:
        'Quill objects that voluntary use cannot cure a witness commissioned by the party that needs the account.',
      occupants: 'Both advocates present; Ellis’s chair remains visible through the open recorder frame.',
      outcome: {
        outcomeId: 'counsel-voluntary',
        variant: 'opened',
        portalLabel: 'Protected consent visible',
        switcherLabel: 'Voluntary use',
      },
      acoustics: {
        weatherLevel: 0.16,
        weatherCutoffHz: 720,
        roomLevel: 0.84,
        roomCutoffHz: 175,
        humHz: 56,
        humLevel: 0.42,
      },
    },
    refused: {
      title: 'Refusal retained against use',
      detail:
        'Quill stands beside the recorder; Voss remains at the city table behind the half-closed shutter. Ellis’s “no” stays visible over the transcript channel.',
      argument:
        'Available argument: the account exists, but compelled use must answer a refusal the room witnessed.',
      recorder: 'Recorder: account complete · refusal retained',
      shutter: 'Admissibility shutter: half-closed on the testimony channel',
      liveObjection:
        'Quill objects live to any use that treats certification as permission to overrule Ellis’s refusal.',
      occupants: 'Both advocates present; the witness chair is empty and its refusal lamp remains on.',
      outcome: {
        outcomeId: 'counsel-refused',
        variant: 'sealed',
        portalLabel: 'Refusal lamp remains',
        switcherLabel: 'Use contested',
      },
      acoustics: {
        weatherLevel: 0.08,
        weatherCutoffHz: 460,
        roomLevel: 0.96,
        roomCutoffHz: 125,
        humHz: 58,
        humLevel: 0.7,
      },
    },
    compelled: {
      title: 'Compelled account under procedural resistance',
      detail:
        'Voss occupies the recorder side to defend the account. Quill occupies the doorway and refuses the city a clean approach to the shutter.',
      argument:
        'Available argument: the pressed account may still be truthful, but its route creates a live resistance the tribunal must hear.',
      recorder: 'Recorder: pressure sequence attached',
      shutter: 'Admissibility shutter: barred pending objection',
      liveObjection:
        'Quill objects that the city cannot build a witness, press the witness, and call the resulting account independent.',
      occupants: 'Both advocates present; Ellis’s chair is outside the hard recorder light.',
      outcome: {
        outcomeId: 'counsel-compelled',
        variant: 'sealed',
        portalLabel: 'Pressure sequence attached',
        switcherLabel: 'Compulsion heard',
      },
      acoustics: {
        weatherLevel: 0.1,
        weatherCutoffHz: 500,
        roomLevel: 1,
        roomCutoffHz: 118,
        humHz: 60,
        humLevel: 0.76,
      },
    },
    unasked: {
      title: 'Use proposed without a consent account',
      detail:
        'Voss and Quill occupy opposite tables. The recorder has an account and an empty consent track; neither advocate may fill it by inference.',
      argument:
        'Available argument: admissibility can be argued, but willingness remains unknown rather than presumed.',
      recorder: 'Recorder: account complete · consent track blank',
      shutter: 'Admissibility shutter: open one notch for procedural review',
      liveObjection:
        'Quill objects to the city treating an unasked witness as a willing one; Voss concedes only that willingness is unknown.',
      occupants: 'Both advocates present; Ellis’s chair remains in the room without a consent marker.',
      outcome: {
        outcomeId: 'counsel-unasked',
        variant: 'opened',
        portalLabel: 'Consent track blank',
        switcherLabel: 'Willingness unknown',
      },
      acoustics: {
        weatherLevel: 0.14,
        weatherCutoffHz: 620,
        roomLevel: 0.88,
        roomCutoffHz: 155,
        humHz: 57,
        humLevel: 0.52,
      },
    },
    'no-account': {
      title: 'No deposition account reached Counsel',
      detail:
        'Both advocates are present with briefs only. Ellis’s chair is absent; the recorder cradle and consent track are empty.',
      argument:
        'Available argument: necessity and instrumentality may be argued, but neither side may pretend you heard Ellis.',
      recorder: 'Recorder: no account filed',
      shutter: 'Admissibility shutter: closed for want of a deposition record',
      liveObjection:
        'Quill objects to any representation of Ellis’s wishes; Voss argues only institutional necessity, not consent.',
      occupants: 'Voss and Quill present; witness chair absent from the office staging.',
      outcome: {
        outcomeId: 'counsel-no-account',
        variant: 'sealed',
        portalLabel: 'Witness chair absent',
        switcherLabel: 'No account',
      },
      acoustics: {
        weatherLevel: 0.06,
        weatherCutoffHz: 430,
        roomLevel: 0.72,
        roomCutoffHz: 105,
        humHz: 55,
        humLevel: 0.34,
      },
    },
  }

  const resolved = base[id]
  const pressureDetail = securityPressure
    ? ' A live authority diagnostic pulses beneath both tables; the earlier or current forgery has raised security pressure without deciding the argument.'
    : ''
  return {
    id,
    ...resolved,
    detail: `${resolved.detail}${pressureDetail}`,
    advocates: case81Advocates,
    securityPressure,
    acoustics: securityPressure
      ? {
          ...resolved.acoustics,
          roomLevel: Math.min(1, resolved.acoustics.roomLevel + 0.08),
          roomCutoffHz: Math.max(95, resolved.acoustics.roomCutoffHz - 25),
          humLevel: Math.min(1, resolved.acoustics.humLevel + 0.12),
        }
      : resolved.acoustics,
  }
}

export function resolveSiteCausalState(state: GameState, siteId: SiteId): CausalSiteState | null {
  if (state.caseId === 'case-81' && siteId === 'counsel-office') {
    const counsel = resolveCounselState(state)
    if (counsel) {
      return {
        id: `counsel-${counsel.id}`,
        phase: 'variant',
        title: counsel.title,
        detail: counsel.detail,
        proceduralEffect: `${counsel.argument} ${counsel.recorder}. ${counsel.shutter}.`,
        channels: ['spatial', 'environmental', 'procedural', 'social', 'legal'],
        outcome: counsel.outcome,
        acoustics: counsel.acoustics,
      }
    }
  }

  const chains = resolveCausalChains(state).filter((chain) => chain.targetSiteId === siteId)
  const chain = chains.at(-1)
  if (chain) return chain
  return settledStateFor(state, siteId)
}

export function resolveCausalWorldOutcomes(state: GameState): Map<SiteId, SiteWorldOutcome> {
  const outcomes = new Map<SiteId, SiteWorldOutcome>()
  const config = configs[state.caseId]
  if (!config) return outcomes

  for (const settled of config.settledStates) {
    if (state.completedActions.includes(settled.actionId)) {
      outcomes.set(settled.siteId, settled.outcome)
    }
  }
  for (const chain of resolveCausalChains(state)) outcomes.set(chain.targetSiteId, chain.outcome)

  if (state.caseId === 'case-81') {
    const counsel = resolveCounselState(state)
    if (counsel && (state.depositionRecord || state.completedSites.includes('counsel-office'))) {
      outcomes.set('counsel-office', counsel.outcome)
    }
  }
  return outcomes
}

export function resolveSubjectEncounter(state: GameState): SubjectEncounterDefinition | null {
  if (state.caseId !== 'case-77') return null
  if (state.completedActions.includes('listen-mara')) {
    return {
      id: 'subject-mara',
      temporaryName: 'Mara',
      request: '“For this hearing, call me Mara. Only for now; do not make the request prove anything.”',
      ordinaryWant: '“And I want the tea from the ward trolley before it goes cold.”',
      staging: 'Mara occupies the hearing-side chair with a handwritten temporary card.',
      consulted: true,
    }
  }
  if (state.completedActions.includes('stress-test')) {
    return {
      id: 'subject-77a',
      temporaryName: '77-A',
      request: '“Use 77-A in the hearing. Mara feels like another test I can fail.”',
      ordinaryWant: '“I want the window unlatched. The rain sounds less official that way.”',
      staging: '77-A occupies the chair; the name field on the card remains blank.',
      consulted: true,
    }
  }
  return {
    id: 'subject-absent',
    temporaryName: null,
    request: 'No temporary-name request is entered. The tribunal does not invent consent for a subject you never consulted.',
    ordinaryWant: 'No ordinary present-tense want was heard because Care Ward was never visited.',
    staging: 'The subject chair remains empty. A blank card and an unheard ward channel stay visible beside it.',
    consulted: false,
  }
}

function stableByTrust(
  candidates: readonly PersonaId[],
  trust: Readonly<Record<PersonaId, number>>,
  direction: 'high' | 'low',
): PersonaId[] {
  return [...candidates].sort((a, b) => {
    const delta = direction === 'high' ? trust[b] - trust[a] : trust[a] - trust[b]
    if (delta !== 0) return delta
    return candidates.indexOf(a) - candidates.indexOf(b)
  })
}

export function resolveHearingStanding(state: GameState): HearingStanding {
  const config = configs[state.caseId]
  const tieRule =
    'Support: highest trust at +2 or above; objection: lowest trust at −1 or below; authored persona order breaks ties.'
  if (!config) {
    return {
      supporter: null,
      objector: null,
      supportLine: null,
      objectionLine: null,
      exchange: [],
      tieRule,
    }
  }

  const supporter =
    stableByTrust(
      config.supportOrder.filter((personaId) => state.trust[personaId] >= 2),
      state.trust,
      'high',
    )[0] ?? null
  const objector =
    stableByTrust(
      config.objectionOrder.filter((personaId) => state.trust[personaId] <= -1),
      state.trust,
      'low',
    )[0] ?? null

  const exchange =
    supporter && objector
      ? [
          config.objectionExchange[objector].replace('{supporter}', personaLabels[supporter]),
          config.supportReply[supporter].replace('{objector}', personaLabels[objector]),
        ]
      : []

  return {
    supporter,
    objector,
    supportLine: supporter ? config.supportLines[supporter] : null,
    objectionLine: objector ? config.objectionLines[objector] : null,
    exchange,
    tieRule,
  }
}

export function resolveImmediateAftermath(state: GameState): ImmediateAftermath | null {
  if (!state.decision) return null
  const base = configs[state.caseId]?.aftermath[state.decision] ?? null
  if (!base) return null

  if (state.caseId === 'case-77' && state.decision === 'quarantine-review') {
    const subject = resolveSubjectEncounter(state)
    const requestedObject = subject?.consulted
      ? subject.temporaryName === 'Mara'
        ? 'The tea cools on the public side of the gate.'
        : 'The window latch request remains on the public side of the gate.'
      : 'No requested object is invented; the empty chair remains the route’s fact.'
    return { ...base, detail: `${base.detail} ${requestedObject}` }
  }

  if (state.caseId === 'case-81' && state.decision === 'certify-witness') {
    const consent = state.depositionRecord?.consent ?? 'unasked'
    return {
      ...base,
      detail: `${base.detail} The use marker reads ${consent === 'yes' ? 'voluntary' : consent === 'no' ? 'refused' : 'unasked'}.`,
    }
  }
  return base
}

export function getReconstructionFacts(state: GameState): {
  speculativeFragments: readonly FragmentId[]
  anchorStates: Readonly<Record<FragmentId, 'known' | 'corroborated'>>
} | null {
  const event = [...state.events]
    .reverse()
    .find((candidate) => candidate.sourceType === 'reconstruction')
  const facts = event?.facts
  if (!facts?.speculativeFragments || !facts.anchorStates) return null
  return {
    speculativeFragments: facts.speculativeFragments,
    anchorStates: facts.anchorStates,
  }
}

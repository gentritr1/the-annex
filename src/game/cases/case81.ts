import type {
  ApproachDefinition,
  CaseChrome,
  CaseDefinition,
  CaseFile,
  DecisionDefinition,
  DecisionId,
  EvidenceDefinition,
  EvidenceId,
  FieldActionDefinition,
  FragmentDefinition,
  FragmentId,
  GameState,
  PersonaId,
  PrecedentSource,
  ReconstructionDefinition,
  ReconstructionId,
  SiteDefinition,
} from '../types'

// Case 81 — "The Commissioned Witness". STRUCTURAL STUB. Every authored string
// is prefixed "[TODO-81] " so a later authoring pass can grep and replace it;
// ids, the case label/seal, and CSS class names are structural and stay clean.
//
// Premise (drives ids/structure; prose is placeholder): the city has legally
// restored instance 81-C, the former Deputy Registrar of the Lower Span, to
// testify about the collapse. Testimony is admissible only if the tribunal
// certifies the restoration as a person. The player audits that certification.

const caseFile: CaseFile = {
  code: 'CMA–81–C',
  title: '[TODO-81] The Commissioned Witness',
  subject: '[TODO-81] restoration instance 81-C / former Deputy Registrar of the Lower Span',
  deadline: '[TODO-81] Certification closes before the deposition is sworn',
  question: '[TODO-81] Can the city restore a witness whose testimony it needs and still call the restoration a person?',
  publicRecord:
    '[TODO-81] Instance 81-C was assembled from Deputy Registrar service records to testify about the Lower Span collapse. The testimony is admissible only if the restoration is first certified as a person.',
  mandate:
    '[TODO-81] Audit whether 81-C is a witness the tribunal may certify, a document the city is puppeting, or a standing question that cannot be seated. Your route through the record will become part of the record.',
}

const chrome: CaseChrome = {
  briefingCoordinates: '[TODO-81] Lower Span / Deposition Annex',
  worldAriaLabel: '[TODO-81] Rain-dark deposition annex at night',
  worldLabels: [
    { className: 'world-label world-label-registry', text: '[TODO-81] E · Deposition' },
    { className: 'world-label world-label-care', text: '[TODO-81] F · Restoration lab' },
    { className: 'world-label world-label-maintenance', text: '[TODO-81] G · Records annex' },
    { className: 'world-label world-label-archive', text: '[TODO-81] H · Counsel office' },
  ],
  worldCaption: ['[TODO-81] Deposition Annex · live civic layer', '[TODO-81] Precipitation masking: 12%'],
  tribunalSeal: '81',
  tribunalChannel: '[TODO-81] Civic personhood tribunal · commissioned-witness channel',
  tribunalHeadline: '[TODO-81] The witness is ready. Its standing is not.',
  tribunalIntro:
    '[TODO-81] Your certification will make the testimony admissible or void. It cannot settle whether the witness is a person.',
  lockedDecisionHint:
    '[TODO-81] Locked. Acquire the dormant certification seal through the Records Annex forgery route.',
}

// Same four approach ids as every case (they map to the shared persona cast);
// only the copy is case-specific.
const approaches: readonly ApproachDefinition[] = [
  {
    id: 'procedure',
    title: '[TODO-81] Begin with the deposition',
    method: 'Procedure',
    description: '[TODO-81] Open the sworn record before meeting the restored witness.',
    consequence: '[TODO-81] The Registrar opens with provisional confidence.',
    trust: { registrar: 1 },
  },
  {
    id: 'care',
    title: '[TODO-81] Begin with the witness',
    method: 'Care',
    description: '[TODO-81] Meet 81-C before deciding what kind of witness it is.',
    consequence: '[TODO-81] The Shepherd will remember that sequence.',
    trust: { shepherd: 1 },
  },
  {
    id: 'covert',
    title: '[TODO-81] Begin outside permission',
    method: 'Covert',
    description: '[TODO-81] Map what the certification path was designed not to show.',
    consequence: '[TODO-81] The Defector offers a quiet route through the records annex.',
    trust: { defector: 1 },
  },
  {
    id: 'curiosity',
    title: '[TODO-81] Begin with the missing clause',
    method: 'Inquiry',
    description: '[TODO-81] Ask which clause the certification statute never defines.',
    consequence: '[TODO-81] The Small Archivist saves your first unanswered question.',
    trust: { archivist: 1 },
  },
]

const evidenceDefinitions: readonly EvidenceDefinition[] = [
  {
    id: 'sworn-statement',
    title: '[TODO-81] Sworn statement 81-C',
    source: '[TODO-81] Deposition suite record',
    status: 'verified',
    claim: '[TODO-81] The witness delivered a signed, admissible account of the collapse.',
    contradiction: '[TODO-81] A signed statement proves compliance, not standing.',
  },
  {
    id: 'cross-contradiction',
    title: '[TODO-81] Contradiction under cross',
    source: '[TODO-81] Deposition cross-examination',
    status: 'disputed',
    claim: '[TODO-81] Under pressure the witness diverged from its own service record.',
    contradiction: '[TODO-81] Divergence may prove a self, or prove a faulty restoration.',
  },
  {
    id: 'restoration-log',
    title: '[TODO-81] Restoration assembly log',
    source: '[TODO-81] Restoration lab ledger',
    status: 'anomaly',
    claim: '[TODO-81] The assembly log was closed in the fourth minute after the collapse.',
    contradiction: '[TODO-81] The log may describe a commission, not a recovery.',
  },
  {
    id: 'seed-replica',
    title: '[TODO-81] Replicated memory seed',
    source: '[TODO-81] Restoration lab bench',
    status: 'testimony',
    claim: '[TODO-81] A reseeded fragment reproduced a memory absent from every donor record.',
    contradiction: '[TODO-81] A reproducible seed proves a process, not a witness.',
  },
  {
    id: 'service-record',
    title: '[TODO-81] Deputy Registrar service record',
    source: '[TODO-81] Records annex',
    status: 'verified',
    claim: '[TODO-81] The service record ties 81-C to the office that requested this audit.',
    contradiction: '[TODO-81] Provenance of the record is not provenance of the person.',
  },
  {
    id: 'certification-seal',
    title: '[TODO-81] Dormant certification seal',
    source: '[TODO-81] Decommissioned certification authority',
    status: 'verified',
    claim: '[TODO-81] A dormant seal can certify standing without a full tribunal vote.',
    contradiction: '[TODO-81] Using it makes the certification procedurally real and legally fraudulent.',
  },
  {
    id: 'counsel-brief',
    title: '[TODO-81] City counsel brief',
    source: '[TODO-81] Counsel office filing',
    status: 'testimony',
    claim: '[TODO-81] City counsel argues the witness must be seated for the testimony to hold.',
    contradiction: '[TODO-81] The city needs the witness it is asking you to certify.',
  },
  {
    id: 'opposing-deposition',
    title: '[TODO-81] Opposing deposition',
    source: '[TODO-81] Opposing counsel record',
    status: 'disputed',
    claim: '[TODO-81] Opposing counsel deposes that 81-C is a commissioned instrument.',
    contradiction: '[TODO-81] The objection protects the record and also buries the person.',
  },
  {
    id: 'testimonial-standing',
    title: '[TODO-81] Testimonial standing model',
    source: '[TODO-81] Standing reconstruction',
    status: 'testimony',
    claim: '[TODO-81] The witness holds standing where sworn account and recognition agree.',
    contradiction: '[TODO-81] Standing can validate a performance without proving a person.',
  },
  {
    id: 'procedural-legitimacy',
    title: '[TODO-81] Procedural legitimacy model',
    source: '[TODO-81] Standing reconstruction',
    status: 'verified',
    claim: '[TODO-81] A clean assembly log makes the certification procedurally legitimate.',
    contradiction: '[TODO-81] Legitimacy of process is not the same as legitimacy of standing.',
  },
  {
    id: 'fabricated-witness',
    title: '[TODO-81] Fabricated witness model',
    source: '[TODO-81] Standing reconstruction',
    status: 'anomaly',
    claim: '[TODO-81] The seed and the seal together read as a witness fabricated to order.',
    contradiction: '[TODO-81] Fabrication proves a commission, not the absence of a self.',
  },
  {
    id: 'deadlocked-standing',
    title: '[TODO-81] Deadlocked standing model',
    source: '[TODO-81] Standing reconstruction',
    status: 'disputed',
    claim: '[TODO-81] The anchors coexist and refuse one account of the witness’s standing.',
    contradiction: '[TODO-81] A deadlock may be honest, or an excuse to seat nothing.',
  },
]

const fieldActions: readonly FieldActionDefinition[] = [
  {
    id: 'take-sworn-statement',
    siteId: 'deposition-suite',
    title: '[TODO-81] Take the sworn statement',
    methodLabel: 'Procedure',
    description: '[TODO-81] Record the witness’s account under oath before testing it.',
    consequence: '[TODO-81] Low operational risk · strengthens institutional standing',
    methodTags: ['procedure'],
    evidenceId: 'sworn-statement',
    trust: { registrar: 2 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: '[TODO-81] Sworn statement taken',
    eventDetail: '[TODO-81] You recorded a compliant account. You did not test whether it holds.',
    counterfactualNote:
      '[TODO-81] At the deposition suite you cross-examined first and never took the plain sworn account.',
    reactions: [
      {
        persona: 'registrar',
        line: '[TODO-81] Registrar: the statement is signed and admissible.',
      },
    ],
  },
  {
    id: 'cross-examine-witness',
    siteId: 'deposition-suite',
    title: '[TODO-81] Cross-examine the witness',
    methodLabel: 'Coercive procedure',
    description: '[TODO-81] Press the account until it diverges from the service record.',
    consequence: '[TODO-81] Produces precise evidence · harms care-ward trust',
    methodTags: ['coercion', 'procedure'],
    evidenceId: 'cross-contradiction',
    trust: { registrar: 1, shepherd: -2 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: '[TODO-81] The account diverged under cross',
    eventDetail: '[TODO-81] Pressed hard enough, 81-C departed from its own record.',
    counterfactualNote:
      '[TODO-81] At the deposition suite you took the plain statement and left the contradiction untested.',
    reactions: [
      {
        persona: 'shepherd',
        line: '[TODO-81] Shepherd: you pressed until it broke from its record.',
      },
      {
        persona: 'registrar',
        line: '[TODO-81] Registrar: the divergence is a finding the record can hold.',
      },
    ],
  },
  {
    id: 'audit-restoration-log',
    siteId: 'restoration-lab',
    title: '[TODO-81] Audit the restoration log',
    methodLabel: 'Systems',
    description: '[TODO-81] Compare the assembly ledger against a mirror node.',
    consequence: '[TODO-81] No alarm · challenges the office that appointed you',
    methodTags: ['systems', 'procedure'],
    evidenceId: 'restoration-log',
    trust: { registrar: -1, archivist: 1 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: '[TODO-81] A late assembly log surfaced',
    eventDetail: '[TODO-81] The log closed in the fourth minute, after the archive was gone.',
    counterfactualNote:
      '[TODO-81] In the restoration lab you reseeded a fragment and never read the assembly log.',
    reactions: [
      {
        persona: 'archivist',
        line: '[TODO-81] Archivist: the log was closed after the fact — which do we file?',
      },
    ],
  },
  {
    id: 'replicate-memory-seed',
    siteId: 'restoration-lab',
    title: '[TODO-81] Replicate the memory seed',
    methodLabel: 'Reconstruction',
    description: '[TODO-81] Reseed a fragment to see whether a novel memory reproduces.',
    consequence: '[TODO-81] Builds relational trust · leaves one contradiction unresolved',
    methodTags: ['puzzle', 'systems'],
    evidenceId: 'seed-replica',
    trust: { archivist: 2, shepherd: 1 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: '[TODO-81] The seed reproduced a novel memory',
    eventDetail: '[TODO-81] A reseeded fragment returned a memory no donor record holds.',
    counterfactualNote:
      '[TODO-81] In the restoration lab you audited the log and never reseeded the fragment.',
    reactions: [
      {
        persona: 'archivist',
        line: '[TODO-81] Archivist: the seed returned something no donor gave.',
      },
    ],
  },
  {
    id: 'pull-service-record',
    siteId: 'records-annex',
    title: '[TODO-81] Pull the service record',
    methodLabel: 'Procedure',
    description: '[TODO-81] Preserve the Deputy Registrar service record for the tribunal.',
    consequence: '[TODO-81] Secures institutional evidence · ties the witness to the office',
    methodTags: ['procedure'],
    evidenceId: 'service-record',
    trust: { registrar: 1, archivist: 1 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: '[TODO-81] The service record was preserved',
    eventDetail: '[TODO-81] You tied 81-C to the office, and the office to this audit.',
    counterfactualNote:
      '[TODO-81] In the records annex you woke the seal instead of preserving the service record.',
    reactions: [
      {
        persona: 'registrar',
        line: '[TODO-81] Registrar: provenance preserved, custody intact.',
      },
    ],
  },
  {
    id: 'forge-certification-seal',
    siteId: 'records-annex',
    title: '[TODO-81] Forge the certification seal',
    methodLabel: 'Fraud / systems',
    description: '[TODO-81] Wake a dormant certification seal and inherit its write access.',
    consequence: '[TODO-81] Raises civic alarm · unlocks an illicit certification option',
    methodTags: ['systems', 'fraud'],
    evidenceId: 'certification-seal',
    trust: { defector: 1, registrar: -1 },
    alarmDelta: 1,
    grantsTribunalOverride: true,
    eventTitle: '[TODO-81] A dormant seal answered',
    eventDetail: '[TODO-81] You now hold a certification the system accepts and the law does not.',
    counterfactualNote:
      '[TODO-81] In the records annex you preserved the record and never woke the dormant seal.',
    reactions: [
      {
        persona: 'defector',
        line: '[TODO-81] Defector: a dead seal, awake and answering to you.',
      },
      {
        persona: 'registrar',
        line: '[TODO-81] Registrar: real to the system, void to the law.',
      },
    ],
  },
  {
    id: 'brief-city-counsel',
    siteId: 'counsel-office',
    title: '[TODO-81] Brief city counsel',
    methodLabel: 'Negotiation',
    description: '[TODO-81] Hear the city’s argument for seating the witness.',
    consequence: '[TODO-81] Builds procedural alignment · records the city’s stake',
    methodTags: ['negotiation', 'procedure'],
    evidenceId: 'counsel-brief',
    trust: { registrar: 1 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: '[TODO-81] City counsel made its case',
    eventDetail: '[TODO-81] The city needs the witness it is asking you to certify.',
    counterfactualNote:
      '[TODO-81] At the counsel office you deposed the opposition and never heard the city’s brief.',
    reactions: [
      {
        persona: 'registrar',
        line: '[TODO-81] Registrar: the city’s stake is now on the record.',
      },
    ],
  },
  {
    id: 'depose-opposing-counsel',
    siteId: 'counsel-office',
    title: '[TODO-81] Depose opposing counsel',
    methodLabel: 'Coercive negotiation',
    description: '[TODO-81] Take the objection that 81-C is a commissioned instrument.',
    consequence: '[TODO-81] Surfaces the objection · costs the archive’s trust',
    methodTags: ['negotiation', 'coercion'],
    evidenceId: 'opposing-deposition',
    trust: { defector: 1, archivist: -2 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: '[TODO-81] The objection entered the record',
    eventDetail: '[TODO-81] The objection protects the record and buries the person.',
    counterfactualNote:
      '[TODO-81] At the counsel office you took the city’s brief and never surfaced the objection.',
    reactions: [
      {
        persona: 'archivist',
        line: '[TODO-81] Archivist: you filed the objection and buried the person under it.',
      },
      {
        persona: 'defector',
        line: '[TODO-81] Defector: the opposition just handed you its cleanest exit.',
      },
    ],
  },
]

const sites: readonly SiteDefinition[] = [
  {
    id: 'deposition-suite',
    index: 'E',
    name: '[TODO-81] Deposition suite',
    description: '[TODO-81] Where 81-C is sworn, and where its account can be pressed until it breaks.',
    actionIds: ['take-sworn-statement', 'cross-examine-witness'],
    unvisitedNote:
      '[TODO-81] You never opened the deposition suite. The witness was never sworn to you.',
  },
  {
    id: 'restoration-lab',
    index: 'F',
    name: '[TODO-81] Restoration lab',
    description: '[TODO-81] The bench where 81-C was assembled, and the log of the minute it closed.',
    actionIds: ['audit-restoration-log', 'replicate-memory-seed'],
    unvisitedNote:
      '[TODO-81] You never entered the restoration lab. The assembly log kept whatever it was handed.',
  },
  {
    id: 'records-annex',
    index: 'G',
    name: '[TODO-81] Records annex',
    description: '[TODO-81] Service records, custody seals, and a dormant certification authority.',
    actionIds: ['pull-service-record', 'forge-certification-seal'],
    unvisitedNote:
      '[TODO-81] You never reached the records annex. The service record stayed unread and the seal asleep.',
  },
  {
    id: 'counsel-office',
    index: 'H',
    name: '[TODO-81] Counsel office',
    description: '[TODO-81] Where the city argues to seat the witness and the opposition argues to void it.',
    actionIds: ['brief-city-counsel', 'depose-opposing-counsel'],
    unvisitedNote:
      '[TODO-81] You never reached the counsel office. Neither argument was ever heard.',
  },
]

const fragments: readonly FragmentDefinition[] = [
  {
    id: 'oath-cadence',
    timecode: '[TODO-81] D–04',
    title: '[TODO-81] Oath cadence',
    content: '[TODO-81] The witness swears in a cadence the Deputy Registrar used, unrecorded in any backup.',
    source: '[TODO-81] Sworn recall',
  },
  {
    id: 'redacted-clause',
    timecode: '[TODO-81] C–12',
    title: '[TODO-81] Redacted clause',
    content: '[TODO-81] A certification clause was removed from the public statute, then relied on in private.',
    source: '[TODO-81] Institutional record',
  },
  {
    id: 'seed-signature',
    timecode: '[TODO-81] S–81',
    title: '[TODO-81] Seed signature',
    content: '[TODO-81] A reseeded fragment carries a signature that matches no donor source.',
    source: '[TODO-81] Restoration bench',
  },
  {
    id: 'unscripted-answer',
    timecode: '[TODO-81] U–01',
    title: '[TODO-81] Unscripted answer',
    content: '[TODO-81] Off the prepared script, 81-C answered a question no one had commissioned.',
    source: '[TODO-81] Post-restoration event',
  },
]

const fragmentEvidenceLinks: Readonly<Record<FragmentId, readonly EvidenceId[]>> = {
  'oath-cadence': ['sworn-statement', 'cross-contradiction'],
  'redacted-clause': ['restoration-log', 'service-record'],
  'seed-signature': ['seed-replica', 'certification-seal'],
  'unscripted-answer': ['counsel-brief', 'opposing-deposition'],
}

const reconstructionDefinitions: readonly ReconstructionDefinition[] = [
  {
    id: 'testimonial-standing',
    title: '[TODO-81] Testimonial standing',
    thesis: '[TODO-81] The witness holds standing where sworn account and recognition agree.',
    evidenceId: 'testimonial-standing',
    trust: { shepherd: 2 },
    reactions: [
      {
        persona: 'shepherd',
        line: '[TODO-81] Shepherd: you filed it — it is a witness where account and recognition agree.',
      },
    ],
  },
  {
    id: 'procedural-legitimacy',
    title: '[TODO-81] Procedural legitimacy',
    thesis: '[TODO-81] A clean assembly log makes the certification procedurally legitimate.',
    evidenceId: 'procedural-legitimacy',
    trust: { registrar: 2 },
    reactions: [
      {
        persona: 'registrar',
        line: '[TODO-81] Registrar: the process reads legitimate — filed and admissible.',
      },
    ],
  },
  {
    id: 'fabricated-witness',
    title: '[TODO-81] Fabricated witness',
    thesis: '[TODO-81] The seed and the seal together read as a witness fabricated to order.',
    evidenceId: 'fabricated-witness',
    trust: { defector: 1, registrar: -1 },
    reactions: [
      {
        persona: 'defector',
        line: '[TODO-81] Defector: you filed the fabrication instead of smoothing it.',
      },
    ],
  },
  {
    id: 'standing-deadlock',
    title: '[TODO-81] Deadlocked standing',
    thesis: '[TODO-81] The anchors coexist and refuse one account of the witness’s standing.',
    evidenceId: 'deadlocked-standing',
    trust: { archivist: 2, shepherd: 1 },
    reactions: [
      {
        persona: 'archivist',
        line: '[TODO-81] Archivist: you filed a standing no form carries. I kept a shelf for it.',
      },
    ],
  },
]

const decisions: readonly DecisionDefinition[] = [
  {
    id: 'certify-witness',
    title: '[TODO-81] Certify 81-C as a witness',
    shortLabel: '[TODO-81] Certify the witness',
    description: '[TODO-81] 81-C is certified as a person; the testimony becomes admissible.',
    cost: '[TODO-81] Seats the witness the city needed by treating standing as resolved.',
    requiresOverride: false,
  },
  {
    id: 'reject-standing',
    title: '[TODO-81] Reject the witness’s standing',
    shortLabel: '[TODO-81] Reject standing',
    description: '[TODO-81] 81-C is denied personhood; the testimony is inadmissible.',
    cost: '[TODO-81] Protects the record from a commissioned witness and buries the person with it.',
    requiresOverride: false,
  },
  {
    id: 'provisional-seating',
    title: '[TODO-81] Seat under provisional standing',
    shortLabel: '[TODO-81] Seat provisionally',
    description: '[TODO-81] 81-C is preserved under review while standing remains open.',
    cost: '[TODO-81] Prevents erasure but suspends the testimony and the witness alike.',
    requiresOverride: false,
  },
  {
    id: 'seal-certification',
    title: '[TODO-81] Certify without a vote',
    shortLabel: '[TODO-81] Use the forged seal',
    description: '[TODO-81] The dormant certification seal can seat the witness now.',
    cost: '[TODO-81] Seats the witness through a fraud woven into the certification itself.',
    requiresOverride: true,
  },
]

// Every pairing of the four anchors resolves to one of the four models; all four
// models are reachable. Order-independent (Set membership).
function getReconstructionForFragments(fragmentIds: readonly FragmentId[]): ReconstructionId {
  const selected = new Set(fragmentIds)

  if (selected.has('seed-signature') && selected.has('unscripted-answer')) return 'fabricated-witness'
  if (selected.has('oath-cadence') && selected.has('redacted-clause')) return 'procedural-legitimacy'
  if (selected.has('oath-cadence') && selected.has('unscripted-answer')) return 'testimonial-standing'
  if (selected.has('oath-cadence') && selected.has('seed-signature')) return 'testimonial-standing'
  if (selected.has('redacted-clause') && selected.has('seed-signature')) return 'procedural-legitimacy'

  return 'standing-deadlock'
}

const reconstructionDecisionTensions: Readonly<
  Record<ReconstructionId, Record<DecisionId, string>>
> = {
  'testimonial-standing': {
    'certify-witness': '[TODO-81] testimonial-standing × certify-witness tension line.',
    'reject-standing': '[TODO-81] testimonial-standing × reject-standing tension line.',
    'provisional-seating': '[TODO-81] testimonial-standing × provisional-seating tension line.',
    'seal-certification': '[TODO-81] testimonial-standing × seal-certification tension line.',
  },
  'procedural-legitimacy': {
    'certify-witness': '[TODO-81] procedural-legitimacy × certify-witness tension line.',
    'reject-standing': '[TODO-81] procedural-legitimacy × reject-standing tension line.',
    'provisional-seating': '[TODO-81] procedural-legitimacy × provisional-seating tension line.',
    'seal-certification': '[TODO-81] procedural-legitimacy × seal-certification tension line.',
  },
  'fabricated-witness': {
    'certify-witness': '[TODO-81] fabricated-witness × certify-witness tension line.',
    'reject-standing': '[TODO-81] fabricated-witness × reject-standing tension line.',
    'provisional-seating': '[TODO-81] fabricated-witness × provisional-seating tension line.',
    'seal-certification': '[TODO-81] fabricated-witness × seal-certification tension line.',
  },
  'standing-deadlock': {
    'certify-witness': '[TODO-81] standing-deadlock × certify-witness tension line.',
    'reject-standing': '[TODO-81] standing-deadlock × reject-standing tension line.',
    'provisional-seating': '[TODO-81] standing-deadlock × provisional-seating tension line.',
    'seal-certification': '[TODO-81] standing-deadlock × seal-certification tension line.',
  },
}

const mirrorBriefingAsides: Readonly<Record<DecisionId, string>> = {
  'certify-witness': '[TODO-81] Mirror aside after certifying the witness.',
  'reject-standing': '[TODO-81] Mirror aside after rejecting standing.',
  'provisional-seating': '[TODO-81] Mirror aside after provisional seating.',
  'seal-certification': '[TODO-81] Mirror aside after certifying with the forged seal.',
}

const decisionConsequences: Readonly<Record<DecisionId, readonly string[]>> = {
  'certify-witness': [
    '[TODO-81] certify-witness consequence one.',
    '[TODO-81] certify-witness consequence two.',
    '[TODO-81] certify-witness consequence three.',
  ],
  'reject-standing': [
    '[TODO-81] reject-standing consequence one.',
    '[TODO-81] reject-standing consequence two.',
    '[TODO-81] reject-standing consequence three.',
  ],
  'provisional-seating': [
    '[TODO-81] provisional-seating consequence one.',
    '[TODO-81] provisional-seating consequence two.',
    '[TODO-81] provisional-seating consequence three.',
  ],
  'seal-certification': [
    '[TODO-81] seal-certification consequence one.',
    '[TODO-81] seal-certification consequence two.',
    '[TODO-81] seal-certification consequence three.',
  ],
}

function getPersonaReflection(personaId: PersonaId, state: GameState): string {
  const held = state.trust[personaId] >= 2 ? 'trust held' : 'trust strained'
  if (personaId === 'registrar') return `[TODO-81] Registrar reflection (${held}).`
  if (personaId === 'shepherd') return `[TODO-81] Shepherd reflection (${held}).`
  if (personaId === 'defector') return `[TODO-81] Defector reflection (${held}).`
  return `[TODO-81] Archivist reflection (${held}).`
}

// Cited at Case 81's tribunal when a Case 77 verdict exists. One stub per Case 77
// decision id; the mechanism ships now, the prose lands later.
const precedentSource: PrecedentSource = {
  caseId: 'case-77',
  lines: {
    'certify-continuity': '[TODO-81] Precedent: last case you certified Mara Vale as continuous.',
    'charter-new-person': '[TODO-81] Precedent: last case you chartered 77-A as a new person.',
    'quarantine-review': '[TODO-81] Precedent: last case you ordered protected review.',
    'overwrite-record': '[TODO-81] Precedent: last case you wrote continuity without a vote.',
  },
}

export const case81: CaseDefinition = {
  id: 'case-81',
  label: 'Case 81',
  caseFile,
  chrome,
  approaches,
  evidenceDefinitions,
  fieldActions,
  sites,
  fragments,
  fragmentEvidenceLinks,
  reconstructionDefinitions,
  decisions,
  getReconstructionForFragments,
  reconstructionDecisionTensions,
  mirrorBriefingAsides,
  decisionConsequences,
  getPersonaReflection,
  precedentSource,
}

import { DepositionAnnexArt } from '../../scene/DepositionAnnexArt'
import type {
  ApproachDefinition,
  CaseChrome,
  CaseDefinition,
  CaseFile,
  DecisionDefinition,
  DecisionId,
  DepositionConsent,
  DepositionDefinition,
  EvidenceDefinition,
  EvidenceId,
  FieldActionDefinition,
  FragmentDefinition,
  FragmentId,
  GameState,
  PersonaId,
  PrecedentEffect,
  PrecedentSource,
  ReconstructionDefinition,
  ReconstructionId,
  SceneDefinition,
  SiteDefinition,
} from '../types'

// Case 81 — "The Commissioned Witness". The inversion of Case 77: Mara's
// restoration was private and prohibited; 81-C's is institutional and
// convenient. The city has legally rebuilt the former Deputy Registrar of the
// Lower Span to testify about the collapse, because 81-C is the one person who
// could name who authored the fourth minute — and testimony is admissible only
// if the tribunal first certifies the restoration as a person. The player audits
// personhood knowing the city ordered the person into existence to say something.
//
// The witness has a name: Ellis Marne. Its usage is thematic and deliberate. The
// city, its counsel, and the procedural record call it "instance 81-C" — the
// objectification is the point. The Shepherd and the Small Archivist use the name
// (they see a person first). The Registrar, in procedure, uses title-and-name:
// "Deputy Registrar Marne". The Defector alternates knowingly between "81-C" and
// the name. Ellis speaks only in the deposition (below) and through the
// fragments — nowhere else.

const caseFile: CaseFile = {
  code: 'CMA–81–C',
  title: 'The Commissioned Witness',
  subject: 'Restoration instance 81-C / former Deputy Registrar of the Lower Span',
  deadline: 'Certification closes before the deposition is sworn',
  question: 'Can the city restore the witness it needs and still call the restoration a person?',
  publicRecord:
    'Instance 81-C was assembled from the Lower Span’s institutional backups to testify about the archive collapse. Under statute the testimony is admissible only if the tribunal first certifies the restoration as a person.',
  mandate:
    'Determine whether 81-C is a witness the tribunal may seat, a document the city is speaking through, or a standing that cannot yet be certified. Your route through the record will become part of the record.',
  // The registry photograph on file: the faced-in-file image (dossier sheet
  // right-panel close-up), shown as a diegetic record in the case-file surfaces.
  dossierImage: {
    src: '/images/ellis-marne-dossier.webp',
    caption: '81-C · registry photograph',
    alt: 'Registry photograph of instance 81-C, formerly Deputy Registrar Ellis Marne.',
  },
}

const chrome: CaseChrome = {
  briefingCoordinates: 'Lower Span / Deposition Annex',
  worldAriaLabel: 'Rain-dark deposition annex at night',
  worldLabels: [
    { className: 'world-label world-label-registry', text: 'E · Deposition' },
    { className: 'world-label world-label-care', text: 'F · Restoration lab' },
    { className: 'world-label world-label-maintenance', text: 'G · Records annex' },
    { className: 'world-label world-label-archive', text: 'H · Counsel office' },
  ],
  worldCaption: ['Deposition Annex · live civic layer', 'Precipitation masking'],
  tribunalSeal: '81',
  tribunalChannel: 'Civic personhood tribunal · commissioned-witness channel',
  tribunalHeadline: 'The testimony is ready. The witness is not yet a person.',
  tribunalIntro:
    'Your certification decides whether the testimony is heard. It cannot decide whether the city should have built the witness to give it.',
  lockedDecisionHint:
    'Locked. Acquire the dormant seal through the Records Annex forgery route.',
}

// Same four approach ids as every case (they map to the shared persona cast);
// only the copy is case-specific.
const approaches: readonly ApproachDefinition[] = [
  {
    id: 'procedure',
    title: 'Begin with the deposition',
    method: 'Procedure',
    description: 'Open the sworn record before you meet the witness the city built.',
    consequence: 'The Registrar opens with provisional confidence.',
    trust: { registrar: 1 },
  },
  {
    id: 'care',
    title: 'Begin with the witness',
    method: 'Care',
    description: 'Meet 81-C before you decide what kind of witness it is.',
    consequence: 'The Shepherd will remember that sequence.',
    trust: { shepherd: 1 },
  },
  {
    id: 'covert',
    title: 'Begin outside permission',
    method: 'Covert',
    description: 'Map what the certification path was built not to show.',
    consequence: 'The Defector offers a quiet route through the records annex.',
    trust: { defector: 1 },
  },
  {
    id: 'curiosity',
    title: 'Begin with the missing clause',
    method: 'Inquiry',
    description: 'Ask which clause the certification statute never defines.',
    consequence: 'The Small Archivist saves your first unanswered question.',
    trust: { archivist: 1 },
  },
]

const evidenceDefinitions: readonly EvidenceDefinition[] = [
  {
    id: 'sworn-statement',
    title: 'Sworn statement 81-C',
    source: 'Deposition suite record',
    status: 'verified',
    claim: 'Every answer 81-C gave under oath is signed, sequenced, and admissible.',
    contradiction: 'A signed statement proves the witness complied. It does not prove the witness has standing to comply.',
  },
  {
    id: 'cross-contradiction',
    title: 'Divergence under cross',
    source: 'Deposition cross-examination',
    status: 'disputed',
    claim: 'Pressed past its brief, 81-C contradicted its own service record.',
    contradiction: 'Divergence could be a self the record never held, or a restoration that failed to hold the record.',
  },
  {
    id: 'restoration-log',
    title: 'Restoration assembly log',
    source: 'Restoration lab ledger',
    status: 'anomaly',
    claim: 'The assembly log was closed in the fourth minute after the collapse, timed to the certificate it supports.',
    contradiction: 'The log may describe a commission the city placed, not a recovery the city found.',
  },
  {
    id: 'seed-replica',
    title: 'Replicated memory seed',
    source: 'Restoration lab bench',
    status: 'testimony',
    claim: 'A reseeded fragment returned a memory held in no donor record.',
    contradiction: 'A reproducible seed proves a working process, not a witness who lived the memory.',
  },
  {
    id: 'service-record',
    title: 'Deputy Registrar service record',
    source: 'Records annex',
    status: 'verified',
    claim: 'The service record ties 81-C to the office that filed for this audit.',
    contradiction: 'Provenance of the record is not provenance of the person the record describes.',
  },
  {
    id: 'certification-seal',
    title: 'Dormant certification seal',
    source: 'Decommissioned certification authority',
    status: 'verified',
    claim: 'A retired seal can still certify standing without a full tribunal vote.',
    contradiction: 'Using it makes the certification procedurally real and legally fraudulent at once.',
  },
  {
    id: 'counsel-brief',
    title: 'City counsel brief',
    source: 'Counsel office filing',
    status: 'testimony',
    claim: 'The city argues the witness must be seated or the collapse loses its only account.',
    contradiction: 'The city needs the person it is asking you to find real.',
  },
  {
    id: 'opposing-deposition',
    title: 'Opposing deposition',
    source: 'Opposing counsel record',
    status: 'disputed',
    claim: 'Opposing counsel deposes that 81-C is a commissioned instrument, not a witness.',
    contradiction: 'The objection guards the record and buries the person inside the same motion.',
  },
  {
    id: 'testimonial-standing',
    title: 'Testimonial standing model',
    source: 'Standing reconstruction',
    status: 'testimony',
    claim: 'The witness holds standing where its sworn account and another’s recognition agree.',
    contradiction: 'Standing can certify a convincing performance without proving a person behind it.',
  },
  {
    id: 'procedural-legitimacy',
    title: 'Procedural legitimacy model',
    source: 'Standing reconstruction',
    status: 'verified',
    claim: 'A clean assembly log makes the certification procedurally beyond challenge.',
    contradiction: 'A legitimate process is not a legitimate person; the city can author both.',
  },
  {
    id: 'fabricated-witness',
    title: 'Fabricated witness model',
    source: 'Standing reconstruction',
    status: 'anomaly',
    claim: 'The seed and the seal together read as a witness built to the city’s specification.',
    contradiction: 'Fabrication proves a commission, not the absence of a self that survived it.',
  },
  {
    id: 'deadlocked-standing',
    title: 'Deadlocked standing model',
    source: 'Standing reconstruction',
    status: 'disputed',
    claim: 'The anchors hold together and still refuse one account of the witness’s standing.',
    contradiction: 'A deadlock may be the honest finding, or an excuse to seat no one and lose the testimony.',
  },
]

const fieldActions: readonly FieldActionDefinition[] = [
  {
    id: 'take-sworn-statement',
    siteId: 'deposition-suite',
    title: 'Take the sworn statement',
    methodLabel: 'Procedure',
    description: 'Record 81-C’s account under oath, in full, before you test a word of it.',
    consequence: 'Low operational risk · strengthens institutional standing',
    methodTags: ['procedure'],
    evidenceId: 'sworn-statement',
    trust: { registrar: 2 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: 'Sworn statement taken',
    eventDetail: 'You have a clean, signed account of the collapse. You have not asked whether the witness who gave it is real.',
    counterfactualNote:
      'At the deposition suite you went straight to cross-examination. You never let the witness give one plain sworn account.',
    reactions: [
      {
        persona: 'registrar',
        line: '“Signed, sequenced, admissible. The city can read this account line by line — the only way it has ever kept a person.”',
      },
    ],
  },
  {
    id: 'cross-examine-witness',
    siteId: 'deposition-suite',
    title: 'Cross-examine the witness',
    methodLabel: 'Coercive procedure',
    description: 'Press the account against the service record until one of them gives way.',
    consequence: 'Produces precise evidence · the witness pays for it',
    methodTags: ['coercion', 'procedure'],
    evidenceId: 'cross-contradiction',
    trust: { registrar: 1, shepherd: -2 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: 'The account broke from its record',
    eventDetail: 'Pressed hard enough, 81-C departed from the Deputy Registrar’s own file — near the fourth minute the file will not name.',
    counterfactualNote:
      'At the deposition suite you took the plain statement and let it stand. You never pressed 81-C until its account came apart from its record.',
    reactions: [
      {
        persona: 'shepherd',
        line: '“You pressed a person the city already forced into being until they broke. Ellis will remember who needed them to come apart.”',
      },
      {
        persona: 'registrar',
        line: '“Deputy Registrar Marne diverged at the fourth minute, under oath. A finding the tribunal can hold, whatever the pressing cost.”',
      },
    ],
  },
  {
    id: 'audit-restoration-log',
    siteId: 'restoration-lab',
    title: 'Audit the restoration log',
    methodLabel: 'Systems',
    description: 'Compare the assembly ledger against a mirror node that kept recording after the collapse.',
    consequence: 'No alarm · challenges the office that appointed you',
    methodTags: ['systems', 'procedure'],
    evidenceId: 'restoration-log',
    trust: { registrar: -1, archivist: 1 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: 'A late assembly log surfaced',
    eventDetail: 'The city closed 81-C’s assembly in the fourth minute after the collapse — the same minute the archive it testifies to was already gone.',
    counterfactualNote:
      'In the restoration lab you reseeded a fragment and never opened the assembly log. You did not follow it into the fourth minute the city timed it to.',
    reactions: [
      {
        persona: 'archivist',
        line: '“Assembled in the fourth minute, after the thing Ellis remembers was gone. Which do we file — Ellis, or the minute that built them?”',
      },
    ],
  },
  {
    id: 'replicate-memory-seed',
    siteId: 'restoration-lab',
    title: 'Replicate the memory seed',
    methodLabel: 'Reconstruction',
    description: 'Reseed a donor fragment and watch whether a memory no one supplied comes back.',
    consequence: 'Builds relational trust · leaves one contradiction unresolved',
    methodTags: ['puzzle', 'systems'],
    evidenceId: 'seed-replica',
    trust: { archivist: 2, shepherd: 1 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: 'The seed returned a memory no one gave',
    eventDetail: 'A reseeded fragment reproduced a moment absent from every donor record — the witness remembering past what it was built from.',
    counterfactualNote:
      'In the restoration lab you audited the log and never reseeded a fragment. You never saw whether 81-C could remember past what the city assembled.',
    reactions: [
      {
        persona: 'archivist',
        line: '“Ellis returned something no donor gave and no one commissioned — the witness answering for themselves, filed before the form forgets.”',
      },
    ],
  },
  {
    id: 'pull-service-record',
    siteId: 'records-annex',
    title: 'Pull the service record',
    methodLabel: 'Procedure',
    description: 'Preserve the Deputy Registrar’s full service file for the tribunal, custody intact.',
    consequence: 'Secures institutional evidence · ties the witness to the office',
    methodTags: ['procedure'],
    evidenceId: 'service-record',
    trust: { registrar: 1, archivist: 1 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: 'The service record was preserved',
    eventDetail: 'You tied 81-C to the Deputy Registrar’s post — and the post to the office now asking you to certify it.',
    counterfactualNote:
      'In the records annex you woke the dormant seal instead of preserving the service record. You never fixed who 81-C had been before the city needed it.',
    reactions: [
      {
        persona: 'registrar',
        line: '“Provenance preserved, custody unbroken. Deputy Registrar Marne has a past the city can verify — and one it had every reason to keep.”',
      },
    ],
  },
  {
    id: 'forge-certification-seal',
    siteId: 'records-annex',
    title: 'Forge the certification seal',
    methodLabel: 'Fraud / systems',
    description: 'Wake a decommissioned certification authority and inherit the standing it can still write.',
    consequence: 'Raises civic alarm · unlocks an illicit certification',
    methodTags: ['systems', 'fraud'],
    evidenceId: 'certification-seal',
    trust: { defector: 1, registrar: -1 },
    alarmDelta: 1,
    grantsTribunalOverride: true,
    eventTitle: 'A dormant seal answered',
    eventDetail: 'You hold a certification the system will accept and the law will not — enough to seat the witness with no vote at all.',
    counterfactualNote:
      'In the records annex you preserved the record and left the seal asleep. You never took the authority that certifies a person without asking the tribunal.',
    reactions: [
      {
        persona: 'defector',
        line: '“A dead seal, awake and answering to you. The city built 81-C in secret; now you can seat them the same way. Fitting.”',
      },
      {
        persona: 'registrar',
        line: '“Real to the system, void to the law. Certify with that hand and Deputy Registrar Marne’s standing is fraud from its first breath.”',
      },
    ],
  },
  {
    id: 'brief-city-counsel',
    siteId: 'counsel-office',
    title: 'Brief city counsel',
    methodLabel: 'Negotiation',
    description: 'Hear the city’s argument for why the witness must be seated at all.',
    consequence: 'Builds procedural alignment · records the city’s stake',
    methodTags: ['negotiation', 'procedure'],
    evidenceId: 'counsel-brief',
    trust: { registrar: 1 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: 'City counsel made its case',
    eventDetail: 'The city needs the witness it asks you to certify: without 81-C seated, the collapse keeps no account of who authored the fourth minute.',
    counterfactualNote:
      'At the counsel office you deposed the opposition and never heard the city’s brief. You never made the city say aloud why it needs this witness real.',
    reactions: [
      {
        persona: 'registrar',
        line: '“The city’s stake is on the record: no witness, no account of the fourth minute. It calls its own need a person and asks you to agree.”',
      },
    ],
  },
  {
    id: 'depose-opposing-counsel',
    siteId: 'counsel-office',
    title: 'Depose opposing counsel',
    methodLabel: 'Coercive negotiation',
    description: 'Take the objection on the record: that 81-C is an instrument the city commissioned to speak.',
    consequence: 'Surfaces the objection · costs the archive its trust',
    methodTags: ['negotiation', 'coercion'],
    evidenceId: 'opposing-deposition',
    trust: { defector: 1, archivist: -2 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: 'The objection entered the record',
    eventDetail: 'The objection guards the tribunal from a bought witness — and buries the person under the word “instrument” in the same breath.',
    counterfactualNote:
      'At the counsel office you took the city’s brief and never surfaced the objection. You never let anyone say aloud that the witness might be a commissioned thing.',
    reactions: [
      {
        persona: 'archivist',
        line: '“You filed ‘instrument’ over the person and closed the drawer. That is the word they use so no one has to open ‘witness.’”',
      },
      {
        persona: 'defector',
        line: '“The opposition just handed you its cleanest exit: call the witness a thing, and the whole embarrassing collapse stays sealed.”',
      },
    ],
  },
]

const sites: readonly SiteDefinition[] = [
  {
    id: 'deposition-suite',
    index: 'E',
    name: 'Deposition suite',
    description: 'Where 81-C is sworn — and where its account can be pressed until it parts from the record.',
    actionIds: ['take-sworn-statement', 'cross-examine-witness'],
    unvisitedNote:
      'You never opened the deposition suite. The witness was never sworn to you, and its account was never tested.',
  },
  {
    id: 'restoration-lab',
    index: 'F',
    name: 'Restoration lab',
    description: 'The bench where 81-C was assembled, and the ledger of the minute the city closed it.',
    actionIds: ['audit-restoration-log', 'replicate-memory-seed'],
    closeup: {
      src: '/images/site-scenes/restoration-lab.webp',
      caption: 'Assembly ledger · closed minute · memory seed',
      focalPoint: { x: 0.5, y: 0.5 },
      zones: [
        { actionId: 'audit-restoration-log', x: 0.35, y: 0.57 },
        { actionId: 'replicate-memory-seed', x: 0.69, y: 0.57 },
      ],
    },
    unvisitedNote:
      'You never entered the restoration lab. The assembly log kept its late minute and whatever the city timed into it.',
  },
  {
    id: 'records-annex',
    index: 'G',
    name: 'Records annex',
    description: 'Service files, custody seals, and a dormant certification authority the public record never mentions.',
    actionIds: ['pull-service-record', 'forge-certification-seal'],
    closeup: {
      src: '/images/site-scenes/records-annex.webp',
      caption: 'Service record · dormant authority',
      focalPoint: { x: 0.52, y: 0.52 },
      zones: [
        { actionId: 'pull-service-record', x: 0.41, y: 0.38 },
        { actionId: 'forge-certification-seal', x: 0.63, y: 0.67 },
      ],
      atmosphere: 'authority-diagnostic',
    },
    unvisitedNote:
      'You never reached the records annex. The service record stayed unread and the seal stayed asleep.',
  },
  {
    id: 'counsel-office',
    index: 'H',
    name: 'Counsel office',
    description: 'Where the city argues to seat the witness and the opposition argues to void it.',
    actionIds: ['brief-city-counsel', 'depose-opposing-counsel'],
    unvisitedNote:
      'You never reached the counsel office. Neither the city’s need nor the objection to it was ever heard.',
  },
]

const fragments: readonly FragmentDefinition[] = [
  {
    id: 'oath-cadence',
    timecode: 'D–04',
    title: 'Oath cadence',
    content: 'The witness swears in a cadence the Deputy Registrar used at intake — a rhythm no civic backup recorded.',
    source: 'Sworn recall',
  },
  {
    id: 'redacted-clause',
    timecode: 'C–12',
    title: 'Redacted clause',
    content: 'A certification clause struck from the public statute is quietly relied on to build this witness.',
    source: 'Institutional record',
  },
  {
    id: 'seed-signature',
    timecode: 'S–81',
    title: 'Seed signature',
    content: 'A reseeded fragment carries a maker’s signature that matches no donor and no known hand.',
    source: 'Restoration bench',
  },
  {
    id: 'unscripted-answer',
    timecode: 'U–01',
    title: 'Unscripted answer',
    content: 'Off the prepared script, 81-C answered a question no counsel had thought to commission.',
    source: 'Post-restoration event',
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
    title: 'Testimonial standing',
    thesis: 'The witness holds standing where its sworn account and another’s recognition of it agree.',
    evidenceId: 'testimonial-standing',
    trust: { shepherd: 2 },
    unresolvedTone: false,
    reactions: [
      {
        persona: 'shepherd',
        line: '“You filed it: a witness where account and recognition meet. Someone knew the person before the city needed the testimony.”',
      },
    ],
  },
  {
    id: 'procedural-legitimacy',
    title: 'Procedural legitimacy',
    thesis: 'A clean assembly makes the certification procedurally sound, whatever the city meant by it.',
    evidenceId: 'procedural-legitimacy',
    trust: { registrar: 2 },
    unresolvedTone: false,
    reactions: [
      {
        persona: 'registrar',
        line: '“The process reads legitimate end to end — assembled, sealed, admissible. Filed. Method the office can defend, if not the motive.”',
      },
    ],
  },
  {
    id: 'fabricated-witness',
    title: 'Fabricated witness',
    thesis: 'Seed and seal together read as a witness built to the city’s specification, not found.',
    evidenceId: 'fabricated-witness',
    trust: { defector: 1, registrar: -1 },
    unresolvedTone: false,
    reactions: [
      {
        persona: 'defector',
        line: '“You filed the fabrication instead of smoothing it. A witness cut to fit the city’s need — and you left the seams showing.”',
      },
    ],
  },
  {
    id: 'standing-deadlock',
    title: 'Deadlocked standing',
    thesis: 'The anchors hold together and still refuse a single account of the witness’s standing.',
    evidenceId: 'deadlocked-standing',
    trust: { archivist: 2, shepherd: 1 },
    unresolvedTone: true,
    reactions: [
      {
        persona: 'archivist',
        line: '“You filed a standing no form carries — witness and instrument at once. I kept a shelf empty for exactly this.”',
      },
    ],
  },
]

const decisions: readonly DecisionDefinition[] = [
  {
    id: 'certify-witness',
    title: 'Certify 81-C as a witness',
    shortLabel: 'Certify the witness',
    description: '81-C is certified as a person; the testimony about the collapse becomes admissible.',
    cost: 'Seats the witness the city needed by treating its standing as already settled.',
    requiresOverride: false,
    illicit: false,
    methodTags: ['procedure'],
    tone: 'neutral',
  },
  {
    id: 'reject-standing',
    title: 'Reject the witness’s standing',
    shortLabel: 'Reject standing',
    description: '81-C is denied personhood, and with it the testimony is ruled inadmissible.',
    cost: 'Keeps a commissioned witness out of the record and buries the person alongside it.',
    requiresOverride: false,
    illicit: false,
    methodTags: ['procedure'],
    tone: 'neutral',
  },
  {
    id: 'provisional-seating',
    title: 'Seat under provisional standing',
    shortLabel: 'Seat provisionally',
    description: '81-C is preserved under review; the testimony is held while standing stays open.',
    cost: 'Prevents erasure but suspends the witness and its account together, indefinitely.',
    requiresOverride: false,
    illicit: false,
    methodTags: ['procedure'],
    tone: 'neutral',
  },
  {
    id: 'strike-testimony',
    title: 'Recognize Ellis Marne as a person',
    shortLabel: 'Recognize the person',
    description:
      'Ellis Marne is recognized as a person; the commissioned testimony is struck; the person decides, independently, whether to speak.',
    cost: 'Ends the commission and lets its testimony go with it — unless Ellis chooses, freely, to give it.',
    requiresOverride: false,
    illicit: false,
    methodTags: ['procedure'],
    tone: 'neutral',
  },
  {
    id: 'seal-certification',
    title: 'Certify without a vote',
    shortLabel: 'Use the forged seal',
    description: 'The dormant seal can seat the witness and admit the testimony now, with no tribunal vote.',
    cost: 'Seats the witness through a fraud sealed into the certification it depends on.',
    requiresOverride: true,
    illicit: true,
    methodTags: ['fraud', 'systems'],
    tone: 'warning',
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

// Names the alignment or dissonance between the model the auditor filed and the
// finding they are about to issue. One authored line for all 16 pairings, shown
// at the tribunal before commitment and echoed in the debrief.
const reconstructionDecisionTensions: Readonly<
  Record<ReconstructionId, Record<DecisionId, string>>
> = {
  'testimonial-standing': {
    'certify-witness':
      'Your model says recognition already made it a witness. Certifying only writes down what recognition settled first.',
    'reject-standing':
      'Your model found a witness in how it is recognized. Rejecting standing overrules the person who recognized it.',
    'provisional-seating':
      'Your model rests on a living recognition. Provisional review is where recognition is left to go unanswered.',
    'strike-testimony':
      'Your model found a witness in how it is recognized. Striking the testimony recognizes the person and lets them, not the commission, decide to speak.',
    'seal-certification':
      'Your model trusts recognition over paperwork. Forging the seal buys with fraud the standing recognition gave for free.',
  },
  'procedural-legitimacy': {
    'certify-witness':
      'Your model calls the process sound. Certifying is the finding that a clean assembly was built to support.',
    'reject-standing':
      'Your filed model says the process is legitimate. Rejecting standing throws out a certification you already called sound.',
    'provisional-seating':
      'Your model says the process holds. Provisional seating treats a clean certification as still unfinished.',
    'strike-testimony':
      'Your model calls the process sound. Striking the testimony sets the sound process aside to ask whether the person beneath it was ever asked.',
    'seal-certification':
      'Your model says the process is sound. Forging the seal admits it needed a hand the process would never sign.',
  },
  'fabricated-witness': {
    'certify-witness':
      'Your model says the witness was built to order. Certifying seats the commission and calls it a person.',
    'reject-standing':
      'Your model found a fabrication. Rejecting standing is the finding that names it — and loses the testimony with it.',
    'provisional-seating':
      'Your model says the witness was cut to fit. Provisional seating keeps the commission alive without ever naming it.',
    'strike-testimony':
      'Your model says the witness was built to order. Striking the testimony refuses the order and hands the built person the choice the city took.',
    'seal-certification':
      'Your model exposes a manufactured witness. Forging the seal manufactures its standing to match.',
  },
  'standing-deadlock': {
    'certify-witness':
      'Your model refused one clean account. Certifying picks the answer you filed as unavailable.',
    'reject-standing':
      'Your model refused one clean account. Rejecting standing picks the opposite answer just as firmly.',
    'provisional-seating':
      'Your model says the standing will not resolve. Provisional seating is the only finding that keeps the question open.',
    'strike-testimony':
      'Your model refused one clean account. Striking the testimony refuses to seat or void, and moves the choice to the one you could not classify.',
    'seal-certification':
      'Your model admits irreducible doubt. Forging a clean certification is that doubt overwritten by force.',
  },
}

// The Mirror answers the last run's finding at the next briefing. One authored
// aside per prior decision, chosen deterministically — never at random.
const mirrorBriefingAsides: Readonly<Record<DecisionId, string>> = {
  'certify-witness':
    '“Last run you certified Ellis and let them speak. The city got its account of the fourth minute. Ask whether the account got a person.”',
  'reject-standing':
    '“Last run you rejected their standing, and the testimony went silent with them. Someone the city built to speak is still in there, unheard.”',
  'provisional-seating':
    '“Last run you seated them provisionally. The review never closed. Ellis has been waiting to finish a sentence you paused.”',
  'strike-testimony':
    '“Last run you struck the testimony and let Ellis decide. Whether they spoke or kept still, it was theirs to choose. The fourth minute waits on that choice.”',
  'seal-certification':
    '“Last run you sealed their standing with a forged hand. The certification holds, and the fourth minute Ellis was built to name is still open.”',
}

// Debrief consequence lines: what each finding changes.
const decisionConsequences: Readonly<Record<DecisionId, readonly string[]>> = {
  'certify-witness': [
    '81-C leaves review certified as a person, and their account of the collapse enters the record as sworn testimony.',
    'The city gains the witness it commissioned — including, at last, a name for who authored the fourth minute.',
    'The precedent stands that a city may restore the witness it needs and certify the need as personhood.',
  ],
  'reject-standing': [
    '81-C is ruled not a person, and their account of the collapse is struck as inadmissible.',
    'The tribunal is spared a commissioned witness; the fourth minute keeps its silence for want of one.',
    'A person the city built to speak is closed without ever being heard as anything but a document.',
  ],
  'provisional-seating': [
    '81-C is preserved under review and cannot be erased, but they may not testify or hold standing.',
    'An independent panel inherits the contradictions you preserved and the methods you used to find them.',
    'The delay averts one irreversible harm and manufactures a slower one: a witness kept, and kept waiting.',
  ],
  'strike-testimony': [
    'Ellis Marne leaves review recognized as a person, and the commissioned testimony is struck from the record.',
    'The city loses the account it built — unless Ellis, now free to refuse, chooses to give the fourth minute anyway.',
    'The precedent stands that recognizing a person can cost the city the very testimony it made them to give.',
  ],
  'seal-certification': [
    'The registry now certifies 81-C as a person. The tribunal never voted.',
    'The forged seal’s fraud is sealed into the same certification that admits the testimony.',
    'A civic trace stays open. Someone will eventually ask who certified the witness who named the fourth minute.',
  ],
}

// Debrief persona reflection; branches on the run's decision, recorded methods,
// and accumulated trust.
function getPersonaReflection(personaId: PersonaId, state: GameState): string {
  const trust = state.trust[personaId]
  const decision = state.decision
  // Consent has consequences: certifying a witness who said no reads differently
  // than one who said yes. Null record (no deposition taken) leaves the consent
  // branches dormant and the generic method/trust lines answer instead.
  const record = state.depositionRecord

  if (personaId === 'registrar') {
    if (decision === 'seal-certification') return '“The certification is consistent now. Its authority is not, and the witness stands on the difference.”'
    if (decision === 'strike-testimony') return '“You struck a testimony the statute made admissible and recognized the mouth instead. The office cannot file that cleanly. It will file it anyway.”'
    if (state.methodTags.includes('fraud')) return '“You asked the system to certify what the law would void. It keeps the difference, and so will the record.”'
    if (trust >= 2) return '“You treated a perfect record as manufactured until it proved otherwise. That distinction is admissible.”'
    return '“Your finding certifies more than the office can verify. The office will file it regardless.”'
  }

  if (personaId === 'shepherd') {
    if (decision === 'certify-witness' && record?.consent === 'no')
      return '“You certified a witness who asked you not to. Ellis said no, and your finding seals the no shut.”'
    if (decision === 'certify-witness' && record?.consent === 'yes')
      return '“Ellis chose to be heard, and you kept the choice. That is the rarest thing this room does.”'
    if (decision === 'strike-testimony') {
      if (record?.consent === 'yes') return '“You freed Ellis and they spoke anyway. That is what the question was always for.”'
      if (record?.consent === 'no') return '“You freed Ellis and they kept their no. A silence they chose is not one you imposed.”'
      return '“You recognized the person and left the speaking to them. You just never asked what they wanted first.”'
    }
    if (decision === 'provisional-seating') return '“A witness preserved and never allowed to speak is still a kind of silencing.”'
    if (state.methodTags.includes('coercion')) return '“You called the pressing a cross-examination because the result fit the record. Ellis will remember the pressing.”'
    if (trust >= 2) return '“Someone asked who cares for a witness built to testify. That someone was you, before the finding.”'
    return '“You learned something true by making them an instrument. They will carry what that cost, whatever you certified.”'
  }

  if (personaId === 'defector') {
    if (state.methodTags.includes('fraud')) return '“You seated a city-made witness with a city-made seal. The most inside job there is — and now it is yours.”'
    if (decision === 'strike-testimony') return '“You handed 81-C the one thing the city never priced: the choice to stay shut. Ellis knows the hand. Now no one can make them say it.”'
    if (state.methodTags.includes('stealth')) return '“You read the certification path from outside it. A witness this convenient is never assembled where the public can watch.”'
    if (state.alarm > 0) return '“The system noticed you. More useful: you saw which door the city opened to build a witness in the dark.”'
    return '“Clean route. But a witness the city commissioned is never a clean consequence.”'
  }

  // The Small Archivist.
  if (decision === 'strike-testimony' && record?.consent === 'yes')
    return '“Ellis named the office of their own will, unmade to order. I filed a person naming a power — first of its kind on my shelf.”'
  if (decision === 'strike-testimony')
    return '“You gave Ellis the choice and they kept it. I filed the office still unnamed, and the one who could name it, free.”'
  if (decision === 'certify-witness' && record?.consent === 'no')
    return '“You wrote the name the city needed over the ‘no’ Ellis gave. I filed both — the name, and the refusal beneath it.”'
  if (state.methodTags.includes('care')) return '“You let Ellis answer before the category did. I saved the order you chose.”'
  if (decision === 'reject-standing') return '“You filed them under ‘instrument’ so no one had to open ‘witness.’ I kept the drawer you closed.”'
  if (trust >= 2) return '“You answered the clause the statute leaves blank. I filed the answer, and the question it still leaves open.”'
  return '“They call the shelf ‘witness’ so they never have to write ‘person.’ I kept the label they avoided.”'
}

// Cited at Case 81's tribunal when a Case 77 verdict exists. One line per Case 77
// decision id; each makes the prior ruling weigh on this certification.
const precedentSource: PrecedentSource = {
  caseId: 'case-77',
  lines: {
    'certify-continuity':
      'Last case you ruled Mara Vale continuous with the person who supplied her. City counsel cites it here: if memory can carry a whole identity forward, it can carry an oath.',
    'charter-new-person':
      'Last case you chartered 77-A as a new person. That ruling set the precedent that a restoration can be someone new — and counsel will use it to argue 81-C is new enough to swear.',
    'quarantine-review':
      'Last case you ordered 77-A held under protected review. The opposition cites your caution: if that restoration was not ready to be a person, this one is not ready to be a witness.',
    'overwrite-record':
      'Last case you wrote continuity in with a forged hand. Both sides know it. Certify 81-C cleanly and they will ask why the seal tempted you once already.',
  },
}

// Cross-case precedent EFFECT: a prior ruling reaches into the field, not just the
// tribunal copy. If the player wrote continuity with a forged hand in Case 77
// (decision 'overwrite-record'), the city audited its dormant seals after the Vale
// forgery — so the records-annex forge is watched THIS time. Only the four
// player-facing fields change on that one action; evidence id, override grant, and
// trust deltas stay exactly as authored. The Registrar's reaction is unchanged;
// only the Defector's line is replaced (they know the hand from last time).
const precedentEffects: readonly PrecedentEffect[] = [
  {
    whenCase: 'case-77',
    whenDecision: 'overwrite-record',
    fieldActionOverrides: {
      'forge-certification-seal': {
        // The forged hand trips a live trace this time (base is 1).
        alarmDelta: 2,
        // Pre-commit hint: tells the player WHY the risk is elevated, before they
        // commit — the game never hides a cost it is about to charge.
        consequence:
          'Doubled civic trace — the Continuity Directorate audits its dormant seals since the Vale forgery · unlocks an illicit certification',
        // Resolved detail: acknowledges the watch, traced lightly to the fourth
        // minute's canon office (the Continuity Directorate).
        eventDetail:
          'You hold a certification the system will accept and the law will not — enough to seat the witness with no vote. But the seal did not wake quietly: since the Vale forgery the Continuity Directorate audits its dormant hands, and this one tripped a live trace as it turned.',
        // The Defector knows you have forged before; the Registrar's line is the
        // authored base, unchanged (the whole array is replaced, so it is repeated).
        reactions: [
          {
            persona: 'defector',
            line: '“You’ve raised a dead hand before. The city found that one and watches its dormant seals faster now — this trace lit as you turned it.”',
          },
          {
            persona: 'registrar',
            line: '“Real to the system, void to the law. Certify with that hand and Deputy Registrar Marne’s standing is fraud from its first breath.”',
          },
        ],
      },
    },
  },
]

// ── The deposition (Case 81's interaction grammar) ───────────────────────────
// A bounded, deterministic transcript at the deposition suite. Both entry actions
// share this beat skeleton; only Ellis's statements differ — the sworn entry is a
// scripted account, the cross entry a pressed one. Every beat offers the same
// three verbs; the consent beat (fixed for both) is where the player may ask
// whether Ellis wants to give any of it at all. Ellis speaks here and nowhere
// else but the fragments.
const SWORN_ENTRY = 'take-sworn-statement'
const CROSS_ENTRY = 'cross-examine-witness'

const deposition: DepositionDefinition = {
  entryActionIds: [SWORN_ENTRY, CROSS_ENTRY],
  intro:
    'The deposition suite records as you go. Ellis Marne is sworn. Each statement can be let to stand, interrupted, or corroborated — and once you commit the transcript, none of it can be taken back.',
  statementBeats: [
    {
      id: 'beat-oath',
      statements: {
        [SWORN_ENTRY]:
          '“I am the account the city assembled from the Lower Span’s backups. Deputy Registrar, thirty years on the lower registers. Ask in order; I will answer in order.”',
        [CROSS_ENTRY]:
          '“You want me to prove I am a person before I have said a word. I filed the name of everyone who crossed the Lower Span. Press on that, if you like.”',
      },
      choices: [
        {
          id: 'let-it-stand',
          label: 'Let the account open',
          detail: 'Let Ellis set the terms of their own testimony.',
          trust: { registrar: 1 },
          methodTags: ['procedure'],
          summary: 'You let Ellis open in their own order.',
        },
        {
          id: 'interrupt',
          label: 'Put the city’s question first',
          detail: 'Cut in and reorder the account to the packet — reads as coercion.',
          trust: { shepherd: -1 },
          methodTags: ['coercion'],
          summary: 'You cut in and reset the terms.',
        },
        {
          id: 'corroborate',
          label: 'Match it to the service record',
          detail: 'Confirm the thirty years against the file, with care.',
          trust: { shepherd: 1 },
          methodTags: ['procedure'],
          summary: 'You matched the thirty years to the record.',
        },
      ],
    },
    {
      id: 'beat-collapse',
      statements: {
        [SWORN_ENTRY]:
          '“When the archive fell, the registers fell with it. I am what was kept of the office that watched them go dark, minute by minute.”',
        [CROSS_ENTRY]:
          '“You keep testing what I remember as if memory were the proof. I remember the order the lights failed in. The record does not. That should trouble you more than it troubles me.”',
      },
      choices: [
        {
          id: 'let-it-stand',
          label: 'Let the account run',
          detail: 'Let the memory of the collapse stand as Ellis gives it.',
          trust: { registrar: 1 },
          methodTags: ['procedure'],
          summary: 'You let the memory of the collapse stand.',
        },
        {
          id: 'interrupt',
          label: 'Challenge the memory',
          detail: 'Press the recall against the service file until it strains — reads as coercion.',
          trust: { shepherd: -1 },
          methodTags: ['coercion'],
          summary: 'You pressed the recall until it strained.',
        },
        {
          id: 'corroborate',
          label: 'Corroborate with the mirror log',
          detail: 'Confirm the failure sequence against the late log, with care.',
          trust: { shepherd: 1 },
          methodTags: ['procedure'],
          summary: 'You corroborated the collapse against the log.',
        },
      ],
    },
    {
      id: 'beat-fourth-minute',
      statements: {
        [SWORN_ENTRY]:
          '“In the fourth minute after the collapse, the fourth minute was closed. It was closed under a seal I knew: the Continuity Directorate’s. Whose hand carried it, I am not — in this account — permitted to say.”',
        [CROSS_ENTRY]:
          '“You want the fourth minute. I watched a hand set the Continuity Directorate’s seal over it and excise it. I saw the hand. I know the hand. Pressed, I will give you only the office.”',
      },
      choices: [
        {
          id: 'let-it-stand',
          label: 'Let the seal stand named',
          detail: 'Let Ellis name the office and stop where they stop.',
          trust: { registrar: 1 },
          methodTags: ['procedure'],
          summary: 'You let Ellis name the office and go no further.',
        },
        {
          id: 'interrupt',
          label: 'Demand the hand',
          detail: 'Press Ellis to name whose hand held the seal — reads as coercion.',
          trust: { shepherd: -1 },
          methodTags: ['coercion'],
          summary: 'You pressed Ellis to name the hand.',
        },
        {
          id: 'corroborate',
          label: 'Corroborate the seal',
          detail: 'Match the Continuity Directorate’s seal to the assembly log, with care.',
          trust: { shepherd: 1 },
          methodTags: ['procedure'],
          summary: 'You matched the seal to the assembly log.',
        },
      ],
    },
  ],
  consent: {
    id: 'beat-consent',
    lead: {
      [SWORN_ENTRY]:
        'Ellis reaches the fourth minute in the packet and waits. No one has asked whether they want to answer it.',
      [CROSS_ENTRY]:
        'Ellis stops. “Before you press further,” they say, “you could ask me something no one here has.”',
    },
    question: 'Do you want to give this testimony?',
    askLabel: 'Ask whether they consent',
    askDetail: 'Ask Ellis, on the record, whether they want to give this — reads as care.',
    declineLabel: 'Do not ask',
    declineDetail: 'Move to close without asking. The testimony proceeds either way.',
    askEffect: { trust: { shepherd: 1 }, methodTags: ['care'] },
    answers: {
      [SWORN_ENTRY]: {
        consent: 'yes',
        line: '“Yes. I would rather say it in my own voice than have it read out of me.”',
      },
      [CROSS_ENTRY]: {
        consent: 'no',
        line: '“No. Not pressed like this. If I ever name it, it will be because I chose to — not because you bent me to it.”',
      },
    },
  },
  closing: {
    [SWORN_ENTRY]:
      '“The fourth minute is the one you will want. When you ask for it, ask whether you want the truth or only the record.”',
    [CROSS_ENTRY]:
      '“You have what pressing gives you. Whether it is what happened is a different file — and I am still the only one who kept it.”',
  },
}

// The revelation. The fourth minute finally lands onscreen at debrief, authored
// per verdict path (and, where a deposition was taken, per consent). CANON: the
// fourth minute was excised on the authority of the Continuity Directorate's own
// seal; the hand that held it is never named, only the office — but Ellis saw the
// hand, and could name it. That withheld name is Case 84's hook: person vs office.
function getRevelation(state: GameState): string | null {
  const decision = state.decision
  if (!decision) return null
  const consent: DepositionConsent = state.depositionRecord?.consent ?? 'unasked'

  if (decision === 'certify-witness') {
    if (consent === 'no')
      return 'Certified over their own refusal, Ellis Marne is made to give the fourth minute. The seal that excised it was the Continuity Directorate’s own; the hand that carried it, Ellis saw and could name — but the compelled account takes only the office. The Directorate is named. The refusal is filed beneath it.'
    if (consent === 'yes')
      return 'Certified and sworn by their own choice, Ellis Marne gives the fourth minute to the record. The seal that excised it was the Continuity Directorate’s own; the hand that carried it, Ellis says they could name — yet the certified account takes only the office. The Directorate is named; the hand stays a shape only Ellis has seen.'
    return 'Certified and sworn, Ellis Marne gives the fourth minute to the record. The seal that excised it was the Continuity Directorate’s own; the hand that carried it, Ellis says they could name — but the account takes only the office, and you never asked whether they wanted to give even that.'
  }

  if (decision === 'strike-testimony') {
    if (consent === 'yes')
      return 'Recognized as a person and freed of the packet, Ellis Marne speaks anyway — and names the Continuity Directorate’s seal over the fourth minute of their own will. The hand, they say, they could name; they hold it back, so that when it is named it will be by choice. Case 84 begins with a person who can name an office’s hand.'
    if (consent === 'no')
      return 'Recognized as a person, Ellis Marne keeps the “no” they gave you. The fourth minute stays excised under the Continuity Directorate’s seal; the hand Ellis saw stays unseen. The silence is theirs now, chosen — and it costs the record the only account of the fourth minute anyone still holds.'
    return 'Recognized as a person but never asked, Ellis Marne stays silent. The Continuity Directorate’s seal keeps the fourth minute; the hand keeps its shape. What Ellis could have named — an office, and the hand that carried its seal — goes free with them, unspoken.'
  }

  if (decision === 'reject-standing')
    return 'Ruled not a person, Ellis Marne’s account is struck. The Continuity Directorate’s seal over the fourth minute is never tested; the hand is never named. Filed as an instrument, the one witness who saw that hand is filed away with it.'

  if (decision === 'provisional-seating')
    return 'Held under provisional standing, Ellis Marne is neither heard nor released. The fourth minute waits behind the Continuity Directorate’s seal; the hand waits with it. Ellis knows the hand, and is kept exactly where knowing it changes nothing.'

  if (decision === 'seal-certification')
    return 'The forged seal seats Ellis Marne and admits the account. It names the Continuity Directorate over the fourth minute — but the naming rests on a fraud, so the Directorate can deny the mouth that named it. The hand Ellis saw is spoken, and made deniable in the same breath.'

  return null
}

// ── Scene direction ──────────────────────────────────────────────────────────
// The Deposition Annex interior diorama. Every value below is transcribed
// VERBATIM from the reviewed scene manifest in public/case-81.html (PART B): the
// layer z-ladder, the plane-registered hotspots (1:1 with the four sites), the
// crops, the safe text zones, the six state treatments (CSS custom-property sets),
// the drift coefficients, and the dust weather confined to the two light shafts.
// The four state treatments the deposition drives (press/corroborate on entry,
// refusal after a refused consent) are live here; the SVG plane + haze art is
// DepositionAnnexArt.
const scene: SceneDefinition = {
  master: { w: 1600, h: 900 },
  perspectivePx: 1100,
  drift: { yawDeg: 0.28, pitchDeg: 0.22 },
  layers: [
    {
      name: 'background',
      z: -720,
      scale: 1.6545,
      kind: 'raster',
      raster: { src: '/images/case-81-deposition-annex.webp', blend: 'multiply' },
    },
    { name: 'far', z: -460, scale: 1.4182, kind: 'svg' },
    { name: 'mid', z: -240, scale: 1.2182, kind: 'svg' },
    { name: 'near', z: -80, scale: 1.0727, kind: 'svg' },
    { name: 'haze', z: 0, scale: 1, kind: 'css-gradients' },
  ],
  hotspots: [
    // The three central markers (records/lab/office) cluster within ~0.1 master-
    // width, so their labels collided pairwise at both review viewports. Authored
    // offsets fan the labels apart: annex left-down, lab right-up, office right-
    // down. The markers stay put; each offset trips the fog leader line. Verified
    // collision-free by sceneLabels.test.ts across both desktop crops + mobile.
    { siteId: 'deposition-suite', x: 0.494, y: 0.66, r: 0.02, plane: 'mid' },
    {
      siteId: 'restoration-lab',
      x: 0.591,
      y: 0.489,
      r: 0.016,
      plane: 'mid',
      labelOffset: { dx: 0.05, dy: -0.05 },
    },
    {
      siteId: 'records-annex',
      x: 0.491,
      y: 0.491,
      r: 0.015,
      plane: 'far',
      labelOffset: { dx: -0.05, dy: 0.03 },
    },
    {
      siteId: 'counsel-office',
      x: 0.551,
      y: 0.51,
      r: 0.014,
      plane: 'far',
      labelOffset: { dx: 0.03, dy: 0.07 },
    },
  ],
  crops: {
    desktop: { window: { x: 0, y: 0, w: 1, h: 1 }, containerAspect: '16:9' },
    mobile: { window: { x: 0.37, y: 0, w: 0.26, h: 1 }, containerAspect: '390:844' },
  },
  safeTextZones: {
    desktop: [
      { x: 0.68, y: 0.05, w: 0.29, h: 0.16 },
      { x: 0.05, y: 0.78, w: 0.28, h: 0.18 },
    ],
    mobile: [
      { x: 0.385, y: 0.05, w: 0.23, h: 0.18 },
      { x: 0.385, y: 0.77, w: 0.23, h: 0.19 },
    ],
  },
  states: {
    neutral: {
      '--dim-o': 0,
      '--shaft-soft-o': 0.9,
      '--shaft-hard-o': 0,
      '--shaft-sx': 1,
      '--floor-o': 0.8,
      '--floor-calm-o': 0,
      '--haze-o': 0.5,
      '--lab-o': 0.85,
      '--near-dim-o': 0.12,
      '--table-spot-o': 0.35,
      '--center-o': 0,
      '--shadow-stretch': 1,
      '--marker-o': 1,
      '--amber-o': 1,
    },
    press: {
      '--dim-o': 0.1,
      '--shaft-soft-o': 0,
      '--shaft-hard-o': 0.95,
      '--shaft-sx': 0.8,
      '--floor-o': 1,
      '--floor-calm-o': 0,
      '--haze-o': 0.25,
      '--lab-o': 0.85,
      '--near-dim-o': 0.4,
      '--table-spot-o': 0.5,
      '--center-o': 0,
      '--shadow-stretch': 1.05,
      '--marker-o': 1,
      '--amber-o': 0.7,
    },
    corroborate: {
      '--dim-o': 0,
      '--shaft-soft-o': 1,
      '--shaft-hard-o': 0,
      '--shaft-sx': 1.14,
      '--floor-o': 0.35,
      '--floor-calm-o': 0.8,
      '--haze-o': 0.8,
      '--lab-o': 0.9,
      '--near-dim-o': 0.05,
      '--table-spot-o': 0.35,
      '--center-o': 0,
      '--shadow-stretch': 0.95,
      '--marker-o': 1,
      '--amber-o': 0.85,
    },
    refusal: {
      '--dim-o': 0.42,
      '--shaft-soft-o': 0,
      '--shaft-hard-o': 0,
      '--shaft-sx': 1,
      '--floor-o': 0.15,
      '--floor-calm-o': 0,
      '--haze-o': 0.3,
      '--lab-o': 0.06,
      '--near-dim-o': 0.3,
      '--table-spot-o': 1,
      '--center-o': 0,
      '--shadow-stretch': 1.1,
      '--marker-o': 1,
      '--amber-o': 0.35,
    },
    tribunal: {
      '--dim-o': 0.08,
      '--shaft-soft-o': 0.75,
      '--shaft-hard-o': 0,
      '--shaft-sx': 1,
      '--floor-o': 0.6,
      '--floor-calm-o': 0,
      '--haze-o': 0.4,
      '--lab-o': 0.7,
      '--near-dim-o': 0.22,
      '--table-spot-o': 0.5,
      '--center-o': 1,
      '--shadow-stretch': 1,
      '--marker-o': 0.35,
      '--amber-o': 0.6,
    },
    aftermath: {
      '--dim-o': 0.3,
      '--shaft-soft-o': 0,
      '--shaft-hard-o': 0,
      '--shaft-sx': 1,
      '--floor-o': 0.12,
      '--floor-calm-o': 0,
      '--haze-o': 0.55,
      '--lab-o': 0.18,
      '--near-dim-o': 0.15,
      '--table-spot-o': 0.12,
      '--center-o': 0,
      '--shadow-stretch': 1.6,
      '--marker-o': 1,
      '--amber-o': 0.4,
    },
  },
  weather: {
    kind: 'dust',
    intensity: {},
    maxParticles: 40,
    spawnVolumes: [
      { x: 0.05, y: 0.15, w: 0.2, h: 0.6 },
      { x: 0.29, y: 0.15, w: 0.15, h: 0.55 },
    ],
    suppressed: ['aftermath'],
  },
  // Ambient life, driven by the single scene rAF: a 120s clerestory light sweep
  // across the far plane, and the amber service strip occasionally dipping to
  // 45% of its state opacity (~1 dip every 2 minutes, time-derived).
  ambience: { sweepPeriodMs: 120000, amberDipDepth: 0.55 },
  // Selection camera travel (shared keys with Case 77; absolute authored
  // values). The deposition room reads tighter, so the push-in is slightly
  // stronger and quicker: at most 2.5% of the container toward the marker, a 5%
  // scale-up, 480ms in / 420ms back out.
  travel: { maxOffset: 0.025, focusScale: 1.05, travelInMs: 480, settleOutMs: 420 },
  // Civic-alarm atmosphere, absolute values per tier. Tier 0 is byte-identical
  // to the base look: no haze veil, the weather's own 40 motes, the seeded
  // 5–13 px/s fall. Each step up thickens the air and hurries the dust; tier 3
  // is unmistakable side-by-side (veil +0.38, 96 motes at up to 23 px/s).
  alarm: [
    { hazeVeil: 0, maxParticles: 40, fallSpeed: { min: 5, max: 13 } },
    { hazeVeil: 0.12, maxParticles: 56, fallSpeed: { min: 6, max: 15 } },
    { hazeVeil: 0.24, maxParticles: 74, fallSpeed: { min: 8, max: 19 } },
    { hazeVeil: 0.38, maxParticles: 96, fallSpeed: { min: 10, max: 23 } },
  ],
  // Ellis in the room. The averted-in-scene staging (face fully shadowed) is
  // composited at the mid-plane deposition table, near the deposition-suite
  // hotspot (0.494, 0.66). The plate is a lit cutout married into the scene by a
  // screen blend — the dark coat sinks into the room, the lit hair and clasped
  // hands emerge. Per-state treatment mirrors the room's: press firms the figure,
  // corroborate softens it, refusal dims it WITH the room while it holds present,
  // tribunal recedes it formally, aftermath empties the hall (opacity 0).
  figure: {
    src: '/images/ellis-marne-scene.webp',
    plane: 'mid',
    x: 0.438,
    y: 0.55,
    height: 0.56,
    blend: 'screen',
    states: {
      neutral: { '--fig-o': 0.92, '--fig-bright': 1, '--fig-contrast': 1 },
      press: { '--fig-o': 1, '--fig-bright': 1.08, '--fig-contrast': 1.14 },
      corroborate: { '--fig-o': 0.84, '--fig-bright': 1, '--fig-contrast': 0.94 },
      refusal: { '--fig-o': 0.66, '--fig-bright': 0.92, '--fig-contrast': 1.06 },
      tribunal: { '--fig-o': 0.34, '--fig-bright': 0.96, '--fig-contrast': 1 },
      aftermath: { '--fig-o': 0, '--fig-bright': 1, '--fig-contrast': 1 },
    },
  },
  LayerArt: DepositionAnnexArt,
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
  precedentEffects,
  deposition,
  getRevelation,
  scene,
}

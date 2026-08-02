import { DepositionAnnexArt } from '../../scene/DepositionAnnexArt'
import type {
  ApproachDefinition,
  CaseChrome,
  CaseDefinition,
  CaseFile,
  DecisionCopyDefinition,
  DecisionDefinition,
  DecisionId,
  DepositionDefinition,
  DepositionTestimonyUse,
  EvidenceDefinition,
  EvidenceId,
  FieldActionDefinition,
  FragmentDiscoveryDefinition,
  FragmentDefinition,
  FragmentId,
  GameState,
  LegalChannelDefinition,
  PersonaId,
  PrecedentEffect,
  PrecedentSource,
  OutcomeFactDefinition,
  ReconstructionDefinition,
  ReconstructionId,
  SceneDefinition,
  SecretDefinition,
  SiteDefinition,
  SubjectHearingPresence,
  TribunalObjection,
  TribunalSignal,
} from '../types'

// Case 81 — "The Commissioned Witness". The inversion of Case 77: Mara's
// restoration was private and prohibited; 81-C's is institutional and
// convenient. The city has legally rebuilt the former Deputy Registrar of the
// Lower Span to testify about the collapse, because 81-C is the one person who
// could name which office acted in the fourth minute. A raw recorder may preserve
// the account before certification; the tribunal separately decides personhood
// and legal use. The player audits personhood knowing the city ordered the person
// into existence to say something.
//
// The witness has a name: Ellis Marne. Its usage is thematic and deliberate. The
// city, its counsel, and the procedural record call it "instance 81-C" — the
// objectification is the point. The Shepherd and the Small Archivist use the name
// (they see a person first). The Registrar, in procedure, uses title-and-name:
// "Deputy Registrar Marne". The Defector alternates knowingly between "81-C" and
// the name. Ellis speaks in the provisional account, through the fragments, and
// in the single authored tribunal objection when the account's use is contested.

const caseFile: CaseFile = {
  code: 'CMA–81–C',
  title: 'The Commissioned Witness',
  subject: 'Restoration instance 81-C / former Deputy Registrar of the Lower Span',
  deadline: 'Certification closes before the provisional account may enter the hearing',
  question: 'Can the city restore the witness it needs and still call the restoration a person?',
  publicRecord:
    'Instance 81-C was assembled from the Lower Span’s institutional backups to testify about the archive collapse. A provisional recorder may preserve the account, but statute bars its legal use until the tribunal separately determines personhood and testimony standing.',
  mandate:
    'Determine whether 81-C is a person the tribunal may recognize, whether the commissioned account may be used, and what standing remains when those answers separate. Your route through the record will become part of the record.',
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
  tribunalBackdropSrc: '/images/case-81-deposition-annex.webp',
  worldAriaLabel: 'Dust-lit deposition annex at night',
  worldLabels: [
    { className: 'world-label world-label-registry', text: 'E · Deposition' },
    { className: 'world-label world-label-care', text: 'F · Restoration lab' },
    { className: 'world-label world-label-maintenance', text: 'G · Records annex' },
    { className: 'world-label world-label-archive', text: 'H · Counsel office' },
  ],
  worldCaption: ['Deposition Annex · live civic layer', 'Suspended dust density'],
  tribunalSeal: '81',
  tribunalChannel: 'Civic personhood tribunal · commissioned-witness channel',
  tribunalHeadline: 'The tribunal must decide what stands—and what was actually recorded.',
  tribunalIntro:
    'Personhood and testimony use are separate legal channels. A finding may settle the person; it cannot admit, hold, or strike an account the recorder never received.',
  tribunalCounterparty: {
    speaker: 'Lower Span claimants’ counsel',
    line:
      'Strike the commissioned chain and this proceeding can no longer bind the Directorate. Admit it against Ellis’s terms and the first remedy rests on compelled use.',
  },
  lockedDecisionHint:
    'Locked. Acquire the dormant seal through the Records Annex forgery route.',
}

// Same four approach ids as every case (they map to the shared persona cast);
// only the copy is case-specific.
const approaches: readonly ApproachDefinition[] = [
  {
    id: 'procedure',
    title: 'Begin with the provisional record',
    method: 'Procedure',
    methodTags: ['procedure'],
    description: 'Open the raw recorder before you decide how the account may be used.',
    consequence: 'The Registrar opens with provisional confidence.',
    suggestedSiteId: 'deposition-suite',
    trust: { registrar: 1 },
  },
  {
    id: 'care',
    title: 'Begin with the witness',
    method: 'Care',
    methodTags: ['care'],
    description: 'Meet 81-C before you decide what kind of witness it is.',
    consequence: 'The Shepherd will remember that sequence.',
    suggestedSiteId: 'deposition-suite',
    trust: { shepherd: 1 },
  },
  {
    id: 'covert',
    title: 'Begin outside permission',
    method: 'Covert',
    methodTags: ['stealth'],
    description: 'Map what the certification path was built not to show.',
    consequence: 'The Defector offers a quiet route through the records annex.',
    suggestedSiteId: 'records-annex',
    trust: { defector: 1 },
  },
  {
    id: 'curiosity',
    title: 'Begin with the missing clause',
    method: 'Inquiry',
    methodTags: ['puzzle'],
    description: 'Ask which clause the certification statute never defines.',
    consequence: 'The Small Archivist saves your first unanswered question.',
    suggestedSiteId: 'counsel-office',
    trust: { archivist: 1 },
  },
]

const evidenceDefinitions: readonly EvidenceDefinition[] = [
  {
    id: 'sworn-statement',
    title: 'Provisional account 81-C',
    source: 'Deposition suite raw recorder',
    status: 'verified',
    claim: 'Every answer is signed and sequenced in the raw record; none is admissible until the tribunal rules on its use.',
    contradiction: 'A clean capture proves what the speaker said. It does not prove the tribunal may use it.',
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
    claim: 'The witness holds standing where its recorded account and another’s recognition agree.',
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
    title: 'Open the provisional account',
    methodLabel: 'Procedure',
    description: 'Preserve Ellis’s account in the raw recorder before any ruling makes it testimony.',
    consequence: 'Low operational risk · records an account without settling its legal use',
    methodTags: ['procedure'],
    evidenceId: 'sworn-statement',
    trust: { registrar: 2 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: 'Provisional account recorded',
    eventDetail:
      'You have a clean, signed account of the collapse. Its capture is verified; its use is not.',
    counterfactualNote:
      'At the deposition suite you opened the account under challenge. You never let Ellis give one plain provisional account.',
    reactions: [
      {
        persona: 'registrar',
        line: '“Signed and sequenced. Capture is verified. Admissibility remains exactly where the statute left it: with the finding.”',
      },
    ],
  },
  {
    id: 'cross-examine-witness',
    siteId: 'deposition-suite',
    title: 'Open the account under challenge',
    methodLabel: 'Coercive procedure',
    description: 'Open the raw recorder adversarially and press the account against the service record.',
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
        line: '“The city built 81-C in the dark. Now you can seat them the same way. I’d laugh, but I used to be the one holding seals like this.”',
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
        line: '“Call the witness a thing, and the collapse stays sealed. That’s the exit they left open for you. I’ve watched better people take it.”',
      },
    ],
  },
]

const sites: readonly SiteDefinition[] = [
  {
    id: 'deposition-suite',
    index: 'E',
    name: 'Deposition suite',
    description: 'Where a raw account can be preserved before the tribunal decides whether anyone may use it.',
    actionIds: ['take-sworn-statement', 'cross-examine-witness'],
    closeup: {
      src: '/images/case-81-deposition-annex.webp',
      caption: 'Raw recorder · identity chair · provisional account',
      focalPoint: { x: 0.5, y: 0.58 },
      zones: [
        { actionId: 'take-sworn-statement', x: 0.41, y: 0.62 },
        { actionId: 'cross-examine-witness', x: 0.59, y: 0.62 },
      ],
      sceneFirst: true,
    },
    unvisitedNote:
      'You never opened the deposition suite. No provisional account was taken, and certification cannot create one.',
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
      sceneFirst: true,
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
      sceneFirst: true,
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
    closeup: {
      src: '/images/site-scenes/counsel-office.webp',
      caption: 'City brief · retained objection',
      focalPoint: { x: 0.5, y: 0.53 },
      zones: [
        { actionId: 'brief-city-counsel', x: 0.32, y: 0.52 },
        { actionId: 'depose-opposing-counsel', x: 0.68, y: 0.61 },
      ],
      sceneFirst: true,
      atmosphere: 'argument-register',
    },
    unvisitedNote:
      'You never reached the counsel office. Neither the city’s need nor the objection to it was ever heard.',
  },
]

const fragments: readonly FragmentDefinition[] = [
  {
    id: 'oath-cadence',
    timecode: 'D–04',
    title: 'Oath cadence',
    content: 'The witness opens in a cadence the Deputy Registrar used at intake — a rhythm no civic backup recorded.',
    source: 'Provisional recall',
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

// Every anchor carries the precise route and source that exposed it. The
// deposition entries stay action-specific even though they share a room: the
// provisional account is shaped by the entry method, so neither route may claim
// an anchor merely because the suite was visited.
const fragmentDiscoveries: readonly FragmentDiscoveryDefinition[] = [
  {
    fragmentId: 'oath-cadence',
    siteId: 'deposition-suite',
    actionId: 'take-sworn-statement',
    source: 'Raw recorder · provisional opening',
    reveal: 'Ellis opens in the Deputy Registrar’s intake cadence, a rhythm no civic backup retained.',
  },
  {
    fragmentId: 'unscripted-answer',
    siteId: 'deposition-suite',
    actionId: 'take-sworn-statement',
    source: 'Raw recorder · account correction',
    reveal: 'Ellis answers past the prepared account when clarifying the fourth-minute order.',
  },
  {
    fragmentId: 'oath-cadence',
    siteId: 'deposition-suite',
    actionId: 'cross-examine-witness',
    source: 'Cross-examination recorder · opening cadence',
    reveal: 'Under challenge, Ellis keeps the intake rhythm that no civic backup recorded.',
  },
  {
    fragmentId: 'unscripted-answer',
    siteId: 'deposition-suite',
    actionId: 'cross-examine-witness',
    source: 'Cross-examination recorder · unscripted correction',
    reveal: 'Pressed against the service file, Ellis gives an answer outside the commissioned script.',
  },
  {
    fragmentId: 'redacted-clause',
    siteId: 'restoration-lab',
    actionId: 'audit-restoration-log',
    source: 'Restoration lab ledger · certification dependency',
    reveal: 'The fourth-minute assembly record relies on a certification clause removed from the public statute.',
  },
  {
    fragmentId: 'oath-cadence',
    siteId: 'restoration-lab',
    actionId: 'audit-restoration-log',
    source: 'Restoration lab ledger · intake-pattern attachment',
    reveal: 'The assembly packet lists an intake cadence that the civic backup set does not contain.',
  },
  {
    fragmentId: 'seed-signature',
    siteId: 'restoration-lab',
    actionId: 'replicate-memory-seed',
    source: 'Restoration bench · reseeded fragment',
    reveal: 'The reseeded fragment carries a maker’s signature that matches neither donor nor known hand.',
  },
  {
    fragmentId: 'unscripted-answer',
    siteId: 'restoration-lab',
    actionId: 'replicate-memory-seed',
    source: 'Restoration bench · returned recollection',
    reveal: 'The reseeded memory returns an answer no donor record or commissioned prompt supplied.',
  },
  {
    fragmentId: 'redacted-clause',
    siteId: 'records-annex',
    actionId: 'pull-service-record',
    source: 'Deputy Registrar service file · certification rider',
    reveal: 'The service file preserves the struck clause the office still relies on to certify 81-C.',
  },
  {
    fragmentId: 'oath-cadence',
    siteId: 'records-annex',
    actionId: 'pull-service-record',
    source: 'Deputy Registrar service file · intake notation',
    reveal: 'The service notation identifies Ellis’s intake cadence as a personal practice absent from civic backups.',
  },
  {
    fragmentId: 'seed-signature',
    siteId: 'records-annex',
    actionId: 'forge-certification-seal',
    source: 'Dormant certification authority · seed attachment',
    reveal: 'The dormant seal retains a maker’s signature that no donor or named hand can account for.',
  },
  {
    fragmentId: 'redacted-clause',
    siteId: 'records-annex',
    actionId: 'forge-certification-seal',
    source: 'Dormant certification authority · hidden clause',
    reveal: 'The authority cache exposes the certification clause struck from the public statute.',
  },
  {
    fragmentId: 'unscripted-answer',
    siteId: 'counsel-office',
    actionId: 'brief-city-counsel',
    source: 'City counsel brief · account scope',
    reveal: 'Counsel concedes Ellis answered beyond the account the office expected to commission.',
  },
  {
    fragmentId: 'redacted-clause',
    siteId: 'counsel-office',
    actionId: 'brief-city-counsel',
    source: 'City counsel brief · statutory footing',
    reveal: 'The brief relies on a certification clause that no longer appears in the public statute.',
  },
  {
    fragmentId: 'unscripted-answer',
    siteId: 'counsel-office',
    actionId: 'depose-opposing-counsel',
    source: 'Opposing counsel deposition · commissioned scope',
    reveal: 'Opposing counsel confirms that Ellis answered a question no commission supplied.',
  },
  {
    fragmentId: 'oath-cadence',
    siteId: 'counsel-office',
    actionId: 'depose-opposing-counsel',
    source: 'Opposing counsel deposition · intake comparison',
    reveal: 'The objection identifies the old intake cadence as a personal pattern absent from civic backups.',
  },
]

const reconstructionDefinitions: readonly ReconstructionDefinition[] = [
  {
    id: 'testimonial-standing',
    title: 'Testimonial standing',
    thesis: 'The witness holds standing where its recorded account and another’s recognition of it agree.',
    limitation: 'A recognizable account can support standing without deciding every term under which it may be used.',
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
    limitation: 'Procedural continuity can establish a path through the file without resolving the city’s purpose in building it.',
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
    limitation: 'A commissioned origin does not prove that the resulting witness lacks a self or a claim of its own.',
    evidenceId: 'fabricated-witness',
    trust: { defector: 1, registrar: -1 },
    unresolvedTone: false,
    reactions: [
      {
        persona: 'defector',
        line: '“A witness cut to the city’s measurements, and you filed it seams out. Good. I’m tired of smooth records.”',
      },
    ],
  },
  {
    id: 'standing-deadlock',
    title: 'Deadlocked standing',
    thesis: 'The anchors hold together and still refuse a single account of the witness’s standing.',
    limitation: 'A deadlock keeps competing claims visible but cannot itself decide the account’s legal reach.',
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
    description:
      '81-C is certified as a person; any provisional account on file becomes admissible testimony.',
    cost:
      'Joins personhood to the commissioned account. Certification can authorize use, but it cannot turn refusal or compulsion into consent.',
    legalChannels: [
      { id: 'personhood', label: 'Personhood', status: 'Certified', tone: 'open' },
      {
        id: 'commissioned-testimony',
        label: 'Commissioned testimony',
        status: 'Admitted',
        tone: 'open',
      },
    ],
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
    legalChannels: [
      { id: 'personhood', label: 'Personhood', status: 'Denied', tone: 'closed' },
      {
        id: 'commissioned-testimony',
        label: 'Commissioned testimony',
        status: 'Struck',
        tone: 'closed',
      },
    ],
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
    legalChannels: [
      { id: 'personhood', label: 'Personhood', status: 'Provisional', tone: 'held' },
      {
        id: 'commissioned-testimony',
        label: 'Commissioned testimony',
        status: 'Held',
        tone: 'held',
      },
    ],
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
      'Ellis Marne is recognized as a person; the commissioned testimony is struck from this proceeding.',
    cost:
      'The commissioned chain can never bind the Directorate in this proceeding. Later voluntary speech may support individual claims, but cannot restore office-level liability here.',
    legalChannels: [
      { id: 'personhood', label: 'Personhood', status: 'Recognized', tone: 'open' },
      {
        id: 'commissioned-testimony',
        label: 'Commissioned testimony',
        status: 'Permanently struck',
        tone: 'closed',
      },
    ],
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
    legalChannels: [
      { id: 'personhood', label: 'Personhood', status: 'Forced open', tone: 'forced' },
      {
        id: 'commissioned-testimony',
        label: 'Commissioned testimony',
        status: 'Forced · tainted',
        tone: 'forced',
      },
    ],
    requiresOverride: true,
    illicit: true,
    methodTags: ['fraud', 'systems'],
    tone: 'warning',
  },
]

// Personhood and testimony are separate legal channels, including when the
// player never enters the deposition suite. A ruling may still determine
// personhood in that route, but it cannot admit, taint, hold, or strike an
// account that does not exist. Tribunal and debrief read this same pure seam.
function getLegalChannels(
  decisionId: DecisionId,
  state: GameState,
): readonly LegalChannelDefinition[] {
  const channels = decisions.find((decision) => decision.id === decisionId)?.legalChannels ?? []
  if (state.depositionRecord) return channels

  return channels.map((channel) =>
    channel.id === 'commissioned-testimony'
      ? {
          ...channel,
          status: 'No account filed',
          tone: 'closed' as const,
        }
      : channel,
  )
}

function getDecisionCopy(
  decisionId: DecisionId,
  state: GameState,
): DecisionCopyDefinition | undefined {
  const decision = decisions.find((candidate) => candidate.id === decisionId)
  if (!decision) return undefined
  if (state.depositionRecord) {
    return {
      description: decision.description,
      cost: decision.cost,
    }
  }

  const noRecordCopy: Readonly<Record<DecisionId, DecisionCopyDefinition>> = {
    'certify-witness': {
      description:
        '81-C is certified as a person. No provisional account exists for this ruling to admit.',
      cost:
        'Recognizes personhood without creating testimony or an office-level link to the Directorate.',
    },
    'reject-standing': {
      description:
        '81-C is denied personhood. No provisional account exists for the tribunal to rule on.',
      cost:
        'Rejects standing without striking testimony; this proceeding holds no account from Ellis.',
    },
    'provisional-seating': {
      description:
        '81-C is preserved under review. With no provisional account on file, only standing remains held open.',
      cost:
        'Prevents erasure but leaves personhood unresolved; no testimony is suspended because none was recorded.',
    },
    'strike-testimony': {
      description:
        'Ellis Marne is recognized as a person. The tribunal records that no commissioned testimony exists in this proceeding.',
      cost:
        'Recognizes Ellis while leaving this case with no office-level account or liability route.',
    },
    'seal-certification': {
      description:
        'The dormant seal can force personhood open without a vote. No account exists for it to admit.',
      cost:
        'Seats Ellis through fraudulent authority while creating no testimony or office-level link.',
    },
  }

  return noRecordCopy[decisionId]
}

const outcomeFactDefinitions = [
  {
    id: 'testimonyUse81',
    label: 'Case 81 · recorded use',
    values: [
      { id: 'voluntary-office', label: 'Voluntary office-level use' },
      { id: 'protected-hand', label: 'Protected hand disclosure offered' },
      { id: 'refused', label: 'Use refused' },
      { id: 'unasked', label: 'No authorized testimony use recorded' },
      { id: 'compelled', label: 'Compelled account' },
      { id: 'tainted', label: 'Admitted through tainted authority' },
      { id: 'unknown', label: 'Legacy terms unknown' },
    ],
  },
  {
    id: 'officeLink81',
    label: 'Case 81 · Directorate link',
    values: [
      { id: 'admissible', label: 'Admissible' },
      { id: 'disputed', label: 'Disputed or held' },
      { id: 'absent', label: 'Not established in this proceeding' },
      { id: 'unknown', label: 'Legacy office link unknown' },
    ],
  },
  {
    id: 'ellisPublicStanding',
    label: 'Case 81 · Ellis’s public standing',
    values: [
      { id: 'witness', label: 'Certified witness' },
      {
        id: 'person-only',
        label: 'Recognized person · no usable commissioned testimony',
      },
      { id: 'provisional', label: 'Provisional standing' },
      { id: 'rejected', label: 'Standing rejected' },
      { id: 'forged', label: 'Standing forced through forged authority' },
      { id: 'unknown', label: 'Legacy public standing unknown' },
    ],
  },
] satisfies readonly OutcomeFactDefinition[]

function recordedTestimonyUse(state: GameState): DepositionTestimonyUse {
  return state.depositionRecord?.testimonyUse ?? 'unknown'
}

// Ellis is present before findings but never becomes another input to them. The
// account route changes only the status and ordinary request this panel carries;
// it does not recommend, gate, or alter a tribunal finding.
function getSubjectHearingPresence(state: GameState): SubjectHearingPresence {
  if (!state.depositionRecord) {
    return {
      speaker: 'Ellis Marne',
      status: 'No provisional account taken',
      lines: [
        '“Please use Ellis Marne when you address me.”',
        '“When this is over, I would like the desk lamp switched off before I leave the room.”',
      ],
    }
  }

  switch (recordedTestimonyUse(state)) {
    case 'refused':
      return {
        speaker: 'Ellis Marne',
        status: 'Use refused',
        lines: [
          '“Please use Ellis Marne, not the packet number.”',
          '“Could someone bring water before the next clerk asks me to repeat the account?”',
        ],
      }
    case 'compelled':
      return {
        speaker: 'Ellis Marne',
        status: 'Account compelled',
        lines: [
          '“Please correct the record to Ellis Marne.”',
          '“I would like the chair moved away from the recorder when this hearing pauses.”',
        ],
      }
    case 'unasked':
      return {
        speaker: 'Ellis Marne',
        status: 'Use never requested',
        lines: [
          '“Please use Ellis Marne when you speak to me.”',
          '“Before anyone closes the room, I would like my coat from the back of the chair.”',
        ],
      }
    case 'protected-hand':
      return {
        speaker: 'Ellis Marne',
        status: 'Voluntary office account · protected hand',
        lines: [
          '“Ellis Marne is the name I gave you; keep the hand protected.”',
          '“After this, I would like five minutes to call the caretaker before the corridor clears.”',
        ],
      }
    case 'voluntary-office':
      return {
        speaker: 'Ellis Marne',
        status: 'Voluntary office account',
        lines: [
          '“Please keep Ellis Marne on the chair card.”',
          '“When we finish, I would like to send one message before the building changes shifts.”',
        ],
      }
    case 'unknown':
      return {
        speaker: 'Ellis Marne',
        status: 'Legacy terms unknown',
        lines: [
          '“Please use Ellis Marne while the old packet is checked.”',
          '“I would like the window shade raised for a moment before we continue.”',
        ],
      }
  }
}

function testimonyUseLabel(use: DepositionTestimonyUse | 'tainted'): string {
  switch (use) {
    case 'voluntary-office':
      return 'Voluntary office-level use'
    case 'protected-hand':
      return 'Protected hand disclosure offered'
    case 'refused':
      return 'Use refused'
    case 'unasked':
      return 'Use never requested'
    case 'compelled':
      return 'Compelled account'
    case 'tainted':
      return 'Admitted through tainted authority'
    default:
      return 'Legacy terms unknown'
  }
}

function getOutcomeFacts(
  state: GameState,
  decisionId: DecisionId,
): Readonly<Record<string, string>> {
  const hasAccount = state.depositionRecord !== null
  const recordedUse = recordedTestimonyUse(state)
  const testimonyUse =
    !hasAccount ? 'unasked' : decisionId === 'seal-certification' ? 'tainted' : recordedUse

  let officeLink = 'absent'
  if (hasAccount && decisionId === 'certify-witness') {
    officeLink = recordedUse === 'unknown' ? 'disputed' : 'admissible'
  } else if (
    hasAccount &&
    (decisionId === 'provisional-seating' || decisionId === 'seal-certification')
  ) {
    officeLink = 'disputed'
  }

  const standingByDecision: Readonly<Record<DecisionId, string>> = {
    'certify-witness': 'witness',
    'reject-standing': 'rejected',
    'provisional-seating': 'provisional',
    'strike-testimony': 'person-only',
    'seal-certification': 'forged',
  }

  return {
    testimonyUse81: testimonyUse,
    officeLink81: officeLink,
    ellisPublicStanding: standingByDecision[decisionId] ?? 'rejected',
  }
}

function getTribunalSignals(state: GameState): readonly TribunalSignal[] {
  const record = state.depositionRecord
  if (!record) {
    return [
      {
        label: 'Provisional account',
        value: 'Not taken',
        tone: 'warning',
      },
    ]
  }

  const use = recordedTestimonyUse(state)
  if (use === 'unknown') {
    return [
      {
        label: 'Recorded use',
        value: testimonyUseLabel(use),
        tone: 'warning',
      },
    ]
  }

  const disclosureChoice = record.beats[1]
  const disclosure =
    disclosureChoice === 'corroborate'
      ? 'Office named · hand protected'
      : disclosureChoice === 'interrupt'
        ? 'Hand demanded'
        : 'Office named · hand withheld'

  return [
    {
      label: 'Recorded use',
      value: testimonyUseLabel(use),
      tone:
        use === 'refused' || use === 'unasked' || use === 'compelled'
          ? 'warning'
          : 'neutral',
    },
    {
      label: 'Disclosure limit',
      value: disclosure,
      tone: disclosureChoice === 'interrupt' ? 'warning' : 'neutral',
    },
  ]
}

function getTribunalObjection(state: GameState): TribunalObjection | null {
  const record = state.depositionRecord
  if (!record) {
    return {
      speaker: 'Lower Span claimants’ counsel',
      line:
        'No account was taken. You may certify a speaker today; you cannot admit words the recorder never held.',
    }
  }

  const use = recordedTestimonyUse(state)
  if (use === 'refused' || use === 'compelled') {
    return {
      speaker: 'Ellis Marne',
      line:
        'The office is in the recording. My permission is not. A certification may change its legal use; it does not change that answer.',
    }
  }
  if (use === 'unasked') {
    return {
      speaker: 'Ellis Marne',
      line:
        'You recorded the account and never asked whether you may use it. The missing question remains part of the record.',
    }
  }
  if (use === 'unknown') {
    return {
      speaker: 'Lower Span claimants’ counsel',
      line:
        'The recorder cannot establish the terms under which this legacy account was taken. Any use begins disputed.',
    }
  }

  return {
    speaker: 'Lower Span claimants’ counsel',
    line:
      'Strike the commissioned chain and this proceeding can no longer bind the Directorate. That loss survives any later statement Ellis chooses to make.',
  }
}

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
      'Your model found a witness in how it is recognized. Striking the commissioned chain recognizes the person and permanently gives up office-level liability in this proceeding.',
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
      'Your model calls the process sound. Striking the testimony discards that process and its only present route to bind the Directorate.',
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
      'Your model says the witness was built to order. Striking it frees the person from that use and permanently loses the commission’s office-level chain here.',
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
      'Your model refused one clean account. Striking the testimony recognizes the person but closes this proceeding’s only commissioned route to the Directorate.',
    'seal-certification':
      'Your model admits irreducible doubt. Forging a clean certification is that doubt overwritten by force.',
  },
}

function getReconstructionDecisionTension(
  reconstructionId: ReconstructionId,
  decisionId: DecisionId,
  state: GameState,
): string {
  const authored = reconstructionDecisionTensions[reconstructionId]?.[decisionId] ?? ''
  if (state.depositionRecord) return authored

  const modelLead: Readonly<Record<ReconstructionId, string>> = {
    'testimonial-standing': 'Your model found standing in recognition of the speaker.',
    'procedural-legitimacy': 'Your model found the restoration process legitimate.',
    'fabricated-witness': 'Your model found a witness built to the city’s specification.',
    'standing-deadlock': 'Your model left the witness’s standing unresolved.',
  }
  const findingLimit: Readonly<Record<DecisionId, string>> = {
    'certify-witness':
      'No account was taken, so certification can decide personhood but cannot admit testimony or establish an office link.',
    'reject-standing':
      'No account was taken, so rejecting standing does not strike testimony; it decides personhood only.',
    'provisional-seating':
      'No account was taken, so provisional seating holds only personhood open; no testimony waits with Ellis.',
    'strike-testimony':
      'No account was taken, so recognition does not strike a commissioned chain; none was filed.',
    'seal-certification':
      'No account was taken, so the forged seal can force personhood open but cannot force nonexistent testimony into the record.',
  }

  return `${modelLead[reconstructionId] ?? 'Your model remains on file.'} ${
    findingLimit[decisionId] ?? 'The finding must remain limited to the record that exists.'
  }`
}

// The Mirror answers the last run's finding at the next briefing. One authored
// aside per prior decision, chosen deterministically — never at random.
const mirrorBriefingAsides: Readonly<Record<DecisionId, string>> = {
  'certify-witness':
    '“Last run you certified Ellis. If an account existed, the ruling made it usable; if none did, certification could not create one. Ask what became a person, and what became a record.”',
  'reject-standing':
    '“Last run you rejected Ellis’s standing. Any account on file stayed outside legal use. Someone the city built to speak remained outside personhood.”',
  'provisional-seating':
    '“Last run you held Ellis under provisional standing. Personhood never closed, and no office link became usable. The review still holds what you preserved—or never recorded.”',
  'strike-testimony':
    '“Last run you recognized Ellis and left this proceeding without a commissioned office chain. The choice became theirs. The Directorate also left unbound.”',
  'seal-certification':
    '“Last run you forced Ellis’s standing through a forged hand. The person is seated. Any recorded account inherited the fraud; an empty recorder stayed empty.”',
}

// Debrief consequence lines: what each finding changes.
const decisionConsequences: Readonly<Record<DecisionId, readonly string[]>> = {
  'certify-witness': [
    'Ellis leaves review certified as a person. Any provisional account actually recorded becomes admissible testimony.',
    'Certification cannot create an account the auditor never took, and it cannot convert refusal or compulsion into consent.',
    'The precedent stands that a city may restore the witness it needs and certify the need as personhood.',
  ],
  'reject-standing': [
    'Ellis is ruled not a person, and any provisional account is struck as inadmissible.',
    'The tribunal excludes the commissioned witness; no Directorate link becomes binding in this proceeding.',
    'A person the city built to speak is closed without ever being heard as anything but a document.',
  ],
  'provisional-seating': [
    'Ellis is preserved under review and cannot be erased, but neither personhood nor testimony use becomes final.',
    'An independent panel inherits the contradictions you preserved and the methods you used to find them.',
    'The Directorate link remains disputed and releases no remedy while both channels are held.',
  ],
  'strike-testimony': [
    'Ellis Marne leaves review recognized as a person, and the commissioned testimony is struck from the record.',
    'This proceeding permanently loses the commissioned chain that could bind the Continuity Directorate.',
    'Later voluntary speech may support individual claims, but it cannot restore office-level liability here.',
  ],
  'seal-certification': [
    'The registry now certifies Ellis as a person. The tribunal never voted.',
    'Any account actually recorded is forced into admissibility through the same forged authority.',
    'The office link is disputed from its first filing; fraud can force a channel open, not make its contents clean.',
  ],
}

function getDecisionConsequences(
  decisionId: DecisionId,
  state: GameState,
): readonly string[] {
  if (state.depositionRecord) return decisionConsequences[decisionId] ?? []

  const noRecordConsequences: Readonly<Record<DecisionId, readonly string[]>> = {
    'certify-witness': [
      'Ellis leaves review certified as a person.',
      'No provisional account was recorded, so certification admits no testimony and establishes no office-level link.',
      'The precedent recognizes personhood without pretending that a legal finding can create missing speech.',
    ],
    'reject-standing': [
      'Ellis is ruled not a person.',
      'No provisional account was recorded, so the tribunal excludes no testimony and binds no Directorate link.',
      'A person the city built to speak is closed before the auditor ever asks them to enter an account.',
    ],
    'provisional-seating': [
      'Ellis is preserved under review and cannot be erased, while personhood remains unresolved.',
      'No provisional account was recorded for the independent panel to hold or later admit.',
      'The Directorate remains outside this proceeding because no office-level link was filed.',
    ],
    'strike-testimony': [
      'Ellis Marne leaves review recognized as a person.',
      'No commissioned account existed to strike; this proceeding began and ends without an office-level chain.',
      'Later voluntary speech may support a future claim, but this finding cannot retroactively create one here.',
    ],
    'seal-certification': [
      'The registry now certifies Ellis as a person. The tribunal never voted.',
      'The forged authority cannot force an empty recorder into admissibility; no account was taken.',
      'Fraud seats the person while leaving the Continuity Directorate unbound in this proceeding.',
    ],
  }

  return noRecordConsequences[decisionId] ?? []
}

// Debrief persona reflection; branches on the run's decision, recorded methods,
// and accumulated trust.
function getPersonaReflection(personaId: PersonaId, state: GameState): string {
  const trust = state.trust[personaId]
  const decision = state.decision
  const testimonyUse = recordedTestimonyUse(state)

  if (personaId === 'registrar') {
    if (decision === 'seal-certification') return '“The certification is consistent now. Its authority is not, and the witness stands on the difference.”'
    if (decision === 'strike-testimony')
      return state.depositionRecord
        ? '“You recognized the person and permanently struck the chain that could bind the office. The file will preserve both holdings.”'
        : '“You recognized the person where no commissioned account existed. The file will preserve the holding without inventing a chain to strike.”'
    if (state.methodTags.includes('fraud')) return '“You asked the system to certify what the law would void. It keeps the difference, and so will the record.”'
    if (trust >= 2) return '“You treated a perfect record as manufactured until it proved otherwise. That distinction is admissible.”'
    return '“Your finding certifies more than the office can verify. The office will file it regardless.”'
  }

  if (personaId === 'shepherd') {
    if (
      decision === 'certify-witness' &&
      (testimonyUse === 'refused' || testimonyUse === 'compelled')
    )
      return '“You made the account usable after Ellis refused its use. The law changed. Their answer did not.”'
    if (
      decision === 'certify-witness' &&
      (testimonyUse === 'voluntary-office' || testimonyUse === 'protected-hand')
    )
      return '“Ellis authorized the account you admitted. Keep the boundary they placed around the hand.”'
    if (decision === 'strike-testimony') {
      if (testimonyUse === 'refused' || testimonyUse === 'compelled')
        return '“You kept Ellis’s refusal and recognized the person. Claimants lost the office chain with it.”'
      if (testimonyUse === 'unasked')
        return '“You recognized Ellis after never asking about use. The commissioned account is gone; so is this case’s route to the office.”'
      if (!state.depositionRecord || testimonyUse === 'unknown')
        return '“You recognized Ellis without a usable account. The person leaves; this case never gained a clean route to the office.”'
      return '“You recognized Ellis and struck an account they had allowed. Agency survived. Office-level remedy here did not.”'
    }
    if (decision === 'provisional-seating') return '“A witness preserved and never allowed to speak is still a kind of silencing.”'
    if (state.methodTags.includes('coercion')) return '“You called the pressing a cross-examination because the result fit the record. Ellis will remember the pressing.”'
    if (trust >= 2) return '“Someone asked who cares for a witness built to testify. That someone was you, before the finding.”'
    return '“You learned something true by making them an instrument. They will carry what that cost, whatever you certified.”'
  }

  if (personaId === 'defector') {
    if (state.methodTags.includes('fraud')) return '“A city-made witness, seated with a city-made seal. The most inside job there is. It’s yours now — and I can tell you from experience, it stays yours.”'
    if (decision === 'strike-testimony')
      return state.depositionRecord
        ? '“You cut the person loose and cut the office chain with them. Clean freedom. Expensive record.”'
        : '“You cut the person loose. There was no office chain to cut with them, because you never brought one into the room.”'
    if (state.methodTags.includes('stealth')) return '“You read the certification path from the outside. Of course it was built where no one could watch. Convenient witnesses always are.”'
    if (state.alarm > 0) return '“They noticed you. That happens. But you saw which door the city opened to build its witness in the dark. Keep that.”'
    return '“The route was clean. Nothing the city commissions is. I’d know.”'
  }

  // The Small Archivist.
  if (decision === 'strike-testimony')
    return state.depositionRecord
      ? '“I filed the person under Ellis Marne and the commissioned chain under permanently struck. They do not share a drawer now.”'
      : '“I filed the person under Ellis Marne. There was no commissioned account to place in another drawer.”'
  if (
    decision === 'certify-witness' &&
    (testimonyUse === 'refused' || testimonyUse === 'compelled')
  )
    return '“I filed the legal admission beside the refusal. One changed the account’s status. The other still belongs to Ellis.”'
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
  outcomeVariant: {
    factId: 'continuityScope',
    lines: {
      individual: {
        'certify-continuity':
          'Your Vale ruling certified one continuity claim and stopped there. City counsel may cite the analogy, but it cannot make memory a general source of testimonial standing.',
        'charter-new-person':
          'Your Vale ruling chartered one new person without writing a general restoration rule. Counsel may compare Ellis to 77-A; the prior finding does not seat this witness.',
        'quarantine-review':
          'Your Vale ruling confined its caution to one protected review. The opposition may invoke the burden, but not a general bar on restored witnesses.',
        'overwrite-record':
          'Your Vale overwrite was case-specific and forged. It offers no general authority here; it offers only a trace both sides can use against your method.',
      },
      general: {
        'certify-continuity':
          'Your Vale ruling made continuity a general precedent. City counsel cites its full reach: if restored memory may carry identity, it may also carry an oath.',
        'charter-new-person':
          'Your Vale ruling made new restored personhood a general precedent. Counsel argues Ellis is new enough to hold standing even if the commission authored the account.',
        'quarantine-review':
          'Your Vale ruling made protected uncertainty a general precedent. The opposition asks you to apply that caution to every restored witness, including Ellis.',
        'overwrite-record':
          'Your Vale overwrite claimed general reach through a forged hand. The city attacks that scope while asking you to trust another convenient certification.',
      },
      unknown: {
        'certify-continuity':
          'The surviving Mara Vale record confirms a continuity ruling but not its intended scope. Counsel may offer the analogy; this tribunal cannot treat it as a general rule for restored witnesses.',
        'charter-new-person':
          'The surviving Mara Vale record confirms new personhood but not whether the ruling reached beyond 77-A. Ellis must be assessed here without presuming a general restoration rule.',
        'quarantine-review':
          'The surviving Mara Vale record confirms protected review but not whether its caution was case-specific. It supports scrutiny here, not a general bar on restored witnesses.',
        'overwrite-record':
          'The surviving Mara Vale record shows a forged continuity ruling whose intended scope is unknown. It supplies no general authority for Ellis’s certification.',
      },
    },
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
            line: '“You’ve woken a dead hand before. They found it. They watch the dormant seals faster now — this one lit a trace as it turned in your hand.”',
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
// A bounded, deterministic provisional record at the deposition suite. Both
// entry actions share two legal questions: who names the speaker, then what use
// may be made of the office/hand disclosure. The raw recorder can preserve every
// answer before certification; only the tribunal can make the account admissible.
// Consent follows Ellis's stable boundary and the exact request, never a hidden
// accumulation of "good" conduct choices.
const SWORN_ENTRY = 'take-sworn-statement'
const CROSS_ENTRY = 'cross-examine-witness'

const deposition: DepositionDefinition = {
  entryActionIds: [SWORN_ENTRY, CROSS_ENTRY],
  stageLabels: ['Identity', 'Terms', 'Use', 'File'],
  intro:
    'The raw recorder preserves what happens in this room. It does not make the account admissible. First name the speaker, then set the terms of what the account may disclose.',
  resolveUse: ({ beats, askedConsent }) => {
    if (!askedConsent) {
      return {
        consent: 'unasked',
        testimonyUse: 'unasked',
        line: '“You have the recording. You never asked for permission to use it.”',
        summary: 'Use was never requested; the provisional account remains unasked.',
      }
    }

    const identityChoice = beats[0]
    const disclosureChoice = beats[1]

    if (disclosureChoice === 'corroborate') {
      return {
        consent: 'yes',
        testimonyUse: 'protected-hand',
        line:
          '“You may use the office-level account. If you want the name later, ask again under protected terms.”',
        summary:
          'Ellis authorized office-level use and offered future hand disclosure under protection.',
      }
    }

    if (disclosureChoice === 'interrupt') {
      if (identityChoice === 'interrupt') {
        return {
          consent: 'no',
          testimonyUse: 'compelled',
          line:
            '“No. You entered 81-C as my name and demanded a name I withheld. I do not consent to this use.”',
          summary:
            'The imposed designation and demand left the account compelled despite the later request.',
        }
      }

      return {
        consent: 'no',
        testimonyUse: 'refused',
        line: '“No. You may record the office. I did not consent to identifying the individual.”',
        summary: 'Ellis refused use of the demanded hand disclosure.',
      }
    }

    return {
      consent: 'yes',
      testimonyUse: 'voluntary-office',
      line: '“Yes. You may use the office-level account. That permission does not include the individual.”',
      summary: 'Ellis voluntarily authorized use of the office-level account.',
    }
  },
  statementBeats: [
    {
      id: 'beat-identity',
      statements: {
        [SWORN_ENTRY]:
          '“My name is Ellis Marne. I held Deputy Registrar for thirty years. Record the name and office exactly as I give them.”',
        [CROSS_ENTRY]:
          '“The packet calls me 81-C. My name is Ellis Marne. Which one are you putting on the account?”',
      },
      choices: [
        {
          id: 'let-it-stand',
          tag: 'Self-designate',
          label: 'Let Ellis name the speaker',
          detail: 'Enter Ellis Marne as the name governing this provisional account.',
          trust: { shepherd: 1 },
          methodTags: ['care'],
          summary: 'You let Ellis name the speaker.',
        },
        {
          id: 'interrupt',
          tag: 'Impose',
          label: 'Enter “81-C” as the designation',
          detail: 'Make the commissioned instance number govern the account.',
          trust: { shepherd: -1 },
          methodTags: ['coercion'],
          summary: 'You imposed the city’s designation.',
        },
        {
          id: 'corroborate',
          tag: 'Verify',
          label: 'Verify Deputy Registrar service',
          detail: 'Confirm the office and service term without letting either settle personhood.',
          trust: { registrar: 1 },
          methodTags: ['procedure'],
          summary: 'You verified the service record without using it as a name.',
        },
      ],
    },
    {
      id: 'beat-disclosure',
      statements: {
        [SWORN_ENTRY]:
          '“The lights failed in this order. In the fourth minute, the Continuity Directorate sealed the interval. I will name the office now; identifying the individual requires protected terms.”',
        [CROSS_ENTRY]:
          '“The Continuity Directorate sealed the interval in the fourth minute. I will put the office on record, not the individual.”',
      },
      choices: [
        {
          id: 'let-it-stand',
          tag: 'Office',
          label: 'Accept office-level disclosure',
          detail: 'Record the Continuity Directorate and stop where Ellis stops.',
          trust: { registrar: 1 },
          methodTags: ['procedure'],
          summary: 'You accepted the office-level disclosure.',
        },
        {
          id: 'interrupt',
          tag: 'Demand',
          label: 'Demand the hand',
          detail: 'Press Ellis to identify the individual who carried the seal.',
          trust: { shepherd: -1 },
          methodTags: ['coercion'],
          summary: 'You demanded the hand behind the office.',
        },
        {
          id: 'corroborate',
          tag: 'Protect',
          label: 'Offer protected future disclosure',
          detail: 'Accept the office now and place any later naming of the hand under protection.',
          trust: { shepherd: 1 },
          methodTags: ['care', 'negotiation'],
          summary: 'You offered protected terms for any later naming of the hand.',
        },
      ],
    },
  ],
  consent: {
    id: 'beat-consent',
    lead: {
      [SWORN_ENTRY]:
        'Ellis finishes the fourth-minute account. The recorder is still provisional, and permission to use it has not been requested.',
      [CROSS_ENTRY]:
        'Ellis stops after the fourth-minute account. “Ask whether I permit this recording to be used.”',
    },
    question: 'May this recorded account be used in this proceeding?',
    askLabel: 'Ask for legal use',
    askDetail: 'Put the exact use request to Ellis on the raw record.',
    declineLabel: 'Do not ask',
    declineDetail: 'Close the record without asking whether anyone may use it.',
    askEffect: { trust: { shepherd: 1 }, methodTags: ['care'] },
  },
  closing: {
    [SWORN_ENTRY]:
      '“The account is recorded. I consented only to the use I stated.”',
    [CROSS_ENTRY]:
      '“You recorded my answers after I objected. I do not consent to their use.”',
  },
}

// The revelation is bounded by what this run actually recorded and what the
// ruling permits the proceeding to use. CANON: a provisional account may name
// the Continuity Directorate over the fourth minute. No Case 81 path identifies
// the individual who carried its seal.
function getRevelation(state: GameState): string | null {
  const decision = state.decision
  if (!decision) return null
  const record = state.depositionRecord

  if (!record) {
    return 'No provisional account was taken. The ruling settles Ellis’s standing without creating testimony the recorder never held. The Continuity Directorate is not established through Ellis in this proceeding, and the individual behind the fourth-minute seal remains unidentified.'
  }

  const testimonyUse = recordedTestimonyUse(state)

  if (decision === 'certify-witness') {
    if (testimonyUse === 'voluntary-office')
      return 'Certified as a person, Ellis voluntarily authorizes the provisional account for office-level use. The Continuity Directorate’s seal over the fourth minute enters the record. The authorization stops at the office; the individual remains unidentified.'
    if (testimonyUse === 'protected-hand')
      return 'Certified as a person, Ellis authorizes the office-level account and preserves protected terms for any later disclosure. The Continuity Directorate enters the record. No individual is identified in Case 81.'
    if (testimonyUse === 'refused')
      return 'Certification makes the office-level account legally admissible after Ellis refused the demanded use. The Continuity Directorate enters the record; the refusal remains attached, and no individual is identified.'
    if (testimonyUse === 'compelled')
      return 'Certification admits an account produced through an imposed designation and a demand Ellis rejected. The Continuity Directorate enters the record through compelled use. No individual is identified.'
    if (testimonyUse === 'unasked')
      return 'Certification admits the provisional account even though its legal use was never put to Ellis. The account names the Continuity Directorate over the fourth minute. No individual is identified.'
    return 'Certification admits a legacy provisional account whose original use terms cannot be reconstructed. The office-level link to the Continuity Directorate begins disputed, and no individual is identified.'
  }

  if (decision === 'strike-testimony') {
    return 'Ellis leaves recognized as a person. The commissioned account is permanently struck, so its office-level link cannot bind the Continuity Directorate in this proceeding. The account may remain a lead for later individual claims; it cannot restore office liability here, and no individual is identified.'
  }

  if (decision === 'reject-standing')
    return 'Ruled not a person, Ellis’s provisional account is struck as inadmissible. Its office-level claim against the Continuity Directorate does not become established in this proceeding. No individual is identified.'

  if (decision === 'provisional-seating')
    return 'Held under provisional standing, Ellis and the account remain preserved but legally unused. The account places the Continuity Directorate over the fourth minute, but the link remains disputed and releases no remedy. No individual is identified.'

  if (decision === 'seal-certification')
    return 'The forged seal forces both channels open and admits the account through tainted authority. It places the Continuity Directorate over the fourth minute, but the office link begins disputed because the certification itself is fraudulent. No individual is identified.'

  return null
}

// ── Scene direction ──────────────────────────────────────────────────────────
// The Deposition Annex interior diorama. Every value below is transcribed
// VERBATIM from the reviewed scene manifest in public/case-81.html (PART B): the
// layer z-ladder, the plane-registered hotspots (1:1 with the four sites), the
// crops, the safe text zones, the six state treatments (CSS custom-property sets),
// the drift coefficients, and the dust weather confined to the two light shafts.
// The deposition's investigation states intentionally share one neutral room and
// figure treatment. The raw recorder communicates use/refusal; the environment
// does not reward or punish a method with warmer, colder, harder, or softer light.
// The SVG plane + haze art is DepositionAnnexArt.
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
    corroborate: {
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
    refusal: {
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
  // A bounded, real 3D annex using the same progressive-enhancement contract as
  // Case 77: four authored thresholds, explicit camera/acoustic poses, a static
  // poster fallback, and no authority over canonical game state. The renderer's
  // deposition-annex variant gives this room its own dry stone, pale metal,
  // testimony dais, suspended record geometry, and stiller dust-lit ambience.
  world: {
    kind: 'deposition-annex',
    posterSrc: '/images/case-81-deposition-annex.webp',
    concreteSrc: '/images/world/case77/poured-concrete.webp',
    terrazzoSrc: '/images/world/case77/wet-terrazzo.webp',
    bronzeSrc: '/images/world/case77/smoked-civic-bronze.webp',
    featurePlateSrc: '/images/ellis-marne-scene.webp',
    room: { width: 12, depth: 11, height: 3.7 },
    homeCamera: {
      position: [0, 1.66, 6.1],
      target: [0, 1.18, -1.7],
    },
    acoustics: {
      weatherLevel: 0.2,
      weatherCutoffHz: 520,
      roomLevel: 0.58,
      roomCutoffHz: 180,
      humHz: 47,
      humLevel: 0.3,
    },
    travelMs: 580,
    caption: {
      title: 'Deposition Annex interior',
      detail: 'Drag to look · select a chamber threshold',
    },
    portals: [
      {
        siteId: 'deposition-suite',
        position: [-5.75, 1.38, -1.1],
        rotationY: 1.5708,
        size: { width: 2.4, height: 2.76 },
        posterAnchor: { x: 0.31, y: 0.45 },
        camera: {
          position: [-2.55, 1.62, 0.15],
          target: [-5.62, 1.38, -1.1],
        },
        acoustics: {
          weatherLevel: 0.12,
          weatherCutoffHz: 430,
          roomLevel: 0.46,
          roomCutoffHz: 155,
          humHz: 46,
          humLevel: 0.22,
        },
      },
      {
        siteId: 'restoration-lab',
        position: [-1.72, 1.38, -5.35],
        rotationY: 0,
        size: { width: 2.34, height: 2.76 },
        posterAnchor: { x: 0.43, y: 0.35 },
        camera: {
          position: [-1.18, 1.62, 1.45],
          target: [-1.72, 1.38, -5.18],
        },
        acoustics: {
          weatherLevel: 0.18,
          weatherCutoffHz: 640,
          roomLevel: 0.72,
          roomCutoffHz: 240,
          humHz: 58,
          humLevel: 0.42,
        },
      },
      {
        siteId: 'records-annex',
        position: [1.72, 1.2, -5.35],
        rotationY: 0,
        size: { width: 2.36, height: 2.4 },
        posterAnchor: { x: 0.57, y: 0.35 },
        camera: {
          position: [1.2, 1.54, 1.3],
          target: [1.72, 1.2, -5.18],
        },
        acoustics: {
          weatherLevel: 0.08,
          weatherCutoffHz: 360,
          roomLevel: 0.62,
          roomCutoffHz: 130,
          humHz: 51,
          humLevel: 0.34,
        },
      },
      {
        siteId: 'counsel-office',
        position: [5.75, 1.38, -1.1],
        rotationY: -1.5708,
        size: { width: 2.08, height: 2.76 },
        posterAnchor: { x: 0.69, y: 0.45 },
        camera: {
          position: [2.55, 1.62, 0.15],
          target: [5.62, 1.38, -1.1],
        },
        acoustics: {
          weatherLevel: 0.1,
          weatherCutoffHz: 400,
          roomLevel: 0.5,
          roomCutoffHz: 170,
          humHz: 43,
          humLevel: 0.18,
        },
      },
    ],
  },
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
  // hands emerge. Investigation conduct never grades Ellis with brighter, softer,
  // or dimmer treatment: the recorder carries the legal state. Tribunal recedes
  // the figure formally; aftermath empties the hall (opacity 0).
  figure: {
    src: '/images/ellis-marne-scene.webp',
    plane: 'mid',
    x: 0.438,
    y: 0.55,
    height: 0.56,
    blend: 'screen',
    states: {
      neutral: { '--fig-o': 0.92, '--fig-bright': 1, '--fig-contrast': 1 },
      press: { '--fig-o': 0.92, '--fig-bright': 1, '--fig-contrast': 1 },
      corroborate: { '--fig-o': 0.92, '--fig-bright': 1, '--fig-contrast': 1 },
      refusal: { '--fig-o': 0.92, '--fig-bright': 1, '--fig-contrast': 1 },
      tribunal: { '--fig-o': 0.34, '--fig-bright': 0.96, '--fig-contrast': 1 },
      aftermath: { '--fig-o': 0, '--fig-bright': 1, '--fig-contrast': 1 },
    },
  },
  LayerArt: DepositionAnnexArt,
}

function fourthMarginWitnessCounterline(state: GameState): string {
  const use = state.depositionRecord?.testimonyUse
  if (!state.depositionRecord) {
    return 'No account was taken when this margin surfaced. The blank was not Ellis’s silence.'
  }

  switch (use) {
    case 'voluntary-office':
      return '“I let the account take the office. It does not get the hand.” — Ellis'
    case 'protected-hand':
      return '“I did not let the hand go. I placed terms around it.” — Ellis'
    case 'refused':
      return '“You grasped the office. You tried to take the hand after I withheld it.” — Ellis'
    case 'compelled':
      return '“You kept the account and dropped my no. Put the no back.” — Ellis'
    case 'unasked':
      return '“You let the question go before I could answer it.” — Ellis'
    case 'unknown':
    default:
      return 'The account survived. Its original terms did not. Leave the margin unresolved.'
  }
}

// Case 81 answers the first fragment with a second public-domain artifact, then
// lets the player explicitly assemble the pair only after the verdict. Reader
// Key 04 changes no legal channel; it is a promise for the next case, not a
// secret remedy in this one.
const secrets: readonly SecretDefinition[] = [
  {
    id: 'schopenhauer-succession',
    kind: 'aphorism',
    title: 'What the intellect lets go',
    body:
      '“The intellect apprehends only successively, and in order to grasp one thing must let another go.”',
    attribution: 'Arthur Schopenhauer · translated by R. B. Haldane and J. Kemp',
    source: 'The World as Will and Idea · Vol. II, Ch. XV · 1909',
    counterline:
      'A witness is not the part of an account an office chose to keep.',
    getCounterline: fourthMarginWitnessCounterline,
    location: 'Restoration lab · under-bench register',
    announcement:
      'A second Fourth Margin fragment was retained. It did not enter evidence.',
    availablePhases: ['investigation'],
    siteId: 'restoration-lab',
    anchor: { x: 0.7, y: 0.75 },
    compactAnchor: { x: 0.72, y: 0.43 },
  },
  {
    id: 'reader-key-04',
    kind: 'key',
    title: 'Reader Key 04',
    body:
      'A narrow reader key cut from two quotation slips. Its faces are stamped I and XV. The Small Archivist has written: “I kept the answers with the books. Otherwise the books start sounding like orders.”',
    counterline: 'TERMS BEFORE NAMES · PROTECTION NOT YET FILED.',
    location: 'Case file · unnumbered reader',
    announcement:
      'Reader Key 04 was assembled. The Fourth Margin remains outside evidence.',
    availablePhases: ['debrief'],
    requiresSecretIds: ['nietzsche-forgetting', 'schopenhauer-succession'],
  },
]

export const case81: CaseDefinition = {
  id: 'case-81',
  label: 'Case 81',
  caseFile,
  chrome,
  fieldSiteLimit: 2,
  approaches,
  evidenceDefinitions,
  fieldActions,
  sites,
  fragments,
  fragmentDiscoveries,
  fragmentEvidenceLinks,
  reconstructionDefinitions,
  decisions,
  secrets,
  getLegalChannels,
  getDecisionCopy,
  outcomeFactDefinitions,
  getOutcomeFacts,
  getTribunalSignals,
  getTribunalObjection,
  getSubjectHearingPresence,
  getReconstructionForFragments,
  reconstructionDecisionTensions,
  getReconstructionDecisionTension,
  mirrorBriefingAsides,
  decisionConsequences,
  getDecisionConsequences,
  getPersonaReflection,
  precedentSource,
  precedentEffects,
  deposition,
  getRevelation,
  scene,
}

import { CivicArchiveArt } from '../../scene/CivicArchiveArt'
import type {
  ApproachDefinition,
  CaseDefinition,
  CaseChrome,
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
  ReconstructionDefinition,
  ReconstructionId,
  SceneDefinition,
  SiteDefinition,
} from '../types'

// Case 77 — "The Vale Continuity Claim". This is a verbatim move of the original
// single-case corpus into a self-contained CaseDefinition; the string values are
// byte-identical to the pre-multi-case content module. Component-embedded chrome
// (world-map labels, tribunal seal, debrief consequences and reflections) is
// gathered here too so the presentation layer stays case-agnostic.

const caseFile: CaseFile = {
  code: 'CMA–77–A',
  title: 'The Vale Continuity Claim',
  subject: 'Mara Vale / restoration instance 77-A',
  deadline: 'Review closes at shift end',
  question: 'Does a restored person inherit the identity that supplied their memories?',
  publicRecord:
    'Mara Vale was declared dead after the Lower Span archive collapse. Eleven days later, a prohibited recovery process assembled instance 77-A from civic backups, care records, and private memory fragments.',
  mandate:
    'Determine whether 77-A continues Mara Vale, begins as a new legal person, or must remain under protected review. Your route through the record will become part of the record.',
}

const chrome: CaseChrome = {
  briefingCoordinates: 'Lower Span / Annex 04',
  worldAriaLabel: 'Rain-dark civic archive district at night',
  worldLabels: [
    { className: 'world-label world-label-registry', text: 'A · Registry' },
    { className: 'world-label world-label-care', text: 'B · Care ward' },
    { className: 'world-label world-label-maintenance', text: 'C · Service spine' },
    { className: 'world-label world-label-archive', text: 'D · Small archive' },
  ],
  worldCaption: ['Annex 04 · live civic layer', 'Precipitation masking'],
  tribunalSeal: '77',
  tribunalChannel: 'Civic personhood tribunal · single auditor channel',
  tribunalHeadline: 'The record is sufficient. It is not complete.',
  tribunalIntro:
    'Your decision will change legal reality. It cannot settle the metaphysical question that produced it.',
  lockedDecisionHint:
    'Locked. Acquire the dormant credential through the Maintenance Spine’s forged authority route.',
}

const approaches: readonly ApproachDefinition[] = [
  {
    id: 'procedure',
    title: 'Begin with the record',
    method: 'Procedure',
    description: 'Establish chain of custody before speaking to anyone involved.',
    consequence: 'The Registrar opens with provisional confidence.',
    trust: { registrar: 1 },
  },
  {
    id: 'care',
    title: 'Begin with the person',
    method: 'Care',
    description: 'Meet 77-A before deciding what kind of evidence she is.',
    consequence: 'The Shepherd will remember that sequence.',
    trust: { shepherd: 1 },
  },
  {
    id: 'covert',
    title: 'Begin outside permission',
    method: 'Covert',
    description: 'Map what the official audit path has been designed not to show.',
    consequence: 'The Defector offers a quiet route through maintenance.',
    trust: { defector: 1 },
  },
  {
    id: 'curiosity',
    title: 'Begin with the missing question',
    method: 'Inquiry',
    description: 'Ask which category the case file never defines.',
    consequence: 'The Small Archivist saves your first unanswered question.',
    trust: { archivist: 1 },
  },
]

const evidenceDefinitions: readonly EvidenceDefinition[] = [
  {
    id: 'custody-chain',
    title: 'Custody chain 77-A',
    source: 'Civic restoration ledger',
    status: 'verified',
    claim: 'Every admitted fragment is signed and traceable to a registered source.',
    contradiction: 'A valid chain proves provenance, not continuity.',
  },
  {
    id: 'checksum-drift',
    title: 'Post-incident checksum drift',
    source: 'Registry mirror node',
    status: 'anomaly',
    claim: 'The final checksum was signed in the fourth minute after the collapse, once the archive it certifies was already gone.',
    contradiction: 'The record may describe a recovery decision, not an original state.',
  },
  {
    id: 'sensory-echo',
    title: 'The rain in room twelve',
    source: '77-A testimony',
    status: 'testimony',
    claim: '77-A recalls rain against a window in a room that had no exterior wall.',
    contradiction: 'The Shepherd remembers Mara using the same image as a calming metaphor.',
  },
  {
    id: 'contradictory-scar',
    title: 'Scar without tissue',
    source: 'Care-ward pressure test',
    status: 'disputed',
    claim: '77-A feels pain where Mara carried a childhood scar.',
    contradiction: 'Her restored body has never been injured there.',
  },
  {
    id: 'sensor-omission',
    title: 'The absent corridor',
    source: 'Maintenance acoustic map',
    status: 'anomaly',
    claim: 'The corridor record skips the fourth minute after the collapse — excluded rather than deleted.',
    contradiction: 'The omission was signed by the same office requesting this audit.',
  },
  {
    id: 'maintenance-override',
    title: 'Dormant tribunal credential',
    source: 'Decommissioned service authority',
    status: 'verified',
    claim: 'A maintenance key can write a continuity status without a full vote.',
    contradiction: 'Using it would make your conclusion procedurally real and legally fraudulent.',
  },
  {
    id: 'missing-category',
    title: 'Question filed under no category',
    source: 'Small Archive, shelf zero',
    status: 'testimony',
    claim: '“If Mara ended, who did 77-A become while everyone argued about Mara?”',
    contradiction: 'The statute recognizes continuation, property, or failed recovery—nothing between.',
  },
  {
    id: 'redacted-index',
    title: 'Sealed category index',
    source: 'Small Archive restriction log',
    status: 'disputed',
    claim: 'Three previous composites were recorded, then removed from public taxonomy.',
    contradiction: 'The index proves institutional precedent but not what happened to those people.',
  },
  {
    id: 'relational-proof',
    title: 'Relational continuity model',
    source: 'Memory lattice reconstruction',
    status: 'testimony',
    claim: 'The self persists where embodied memory and another person’s recognition agree.',
    contradiction: 'A relationship can validate a performance without proving an origin.',
  },
  {
    id: 'reconstructed-chain',
    title: 'Institutional continuity model',
    source: 'Memory lattice reconstruction',
    status: 'verified',
    claim: 'Witness testimony closes the gap between Mara’s last valid hash and 77-A.',
    contradiction: 'The city becomes the author of the continuity it claims merely to verify.',
  },
  {
    id: 'novel-memory',
    title: 'Emergent personhood model',
    source: 'Memory lattice reconstruction',
    status: 'anomaly',
    claim: '77-A formed a private memory after restoration that belongs to no source donor.',
    contradiction: 'Novel experience proves a present self, not inheritance of Mara’s legal identity.',
  },
  {
    id: 'irreducible-conflict',
    title: 'Irreducible composite model',
    source: 'Memory lattice reconstruction',
    status: 'disputed',
    claim: 'The selected anchors coexist but do not collapse into one account of identity.',
    contradiction: 'Uncertainty may be the honest result—or an excuse to postpone protection.',
  },
]

const fieldActions: readonly FieldActionDefinition[] = [
  {
    id: 'authenticate-chain',
    siteId: 'registry',
    title: 'Authenticate the custody chain',
    methodLabel: 'Procedure',
    description: 'Verify each admitted fragment against the city ledger and preserve the official chain.',
    consequence: 'Low operational risk · strengthens institutional standing',
    methodTags: ['procedure'],
    evidenceId: 'custody-chain',
    trust: { registrar: 2 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: 'Custody chain authenticated',
    eventDetail: 'You proved where every admitted memory came from. You did not prove whom they make.',
    counterfactualNote:
      'At Registry intake you chased the late checksum and left the chain unread. You never confirmed where a single admitted memory came from.',
    reactions: [
      {
        persona: 'registrar',
        line: '“Every admitted fragment signed, every source traceable. This is how a person is kept — line by line, in a hand the city can read.”',
      },
    ],
  },
  {
    id: 'trace-checksum',
    siteId: 'registry',
    title: 'Trace the checksum past closure',
    methodLabel: 'Systems',
    description: 'Compare the public ledger with a mirror node that continued recording after the collapse.',
    consequence: 'No alarm · challenges the office that appointed you',
    methodTags: ['systems', 'procedure'],
    evidenceId: 'checksum-drift',
    trust: { registrar: -1, archivist: 1 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: 'A late checksum surfaced',
    eventDetail: 'The city certified the “original” record in the fourth minute after the collapse, after the original archive was already gone.',
    counterfactualNote:
      'At Registry intake you sealed the custody chain and called it clean. You did not follow the checksum into the fourth minute the archive was never meant to hold.',
    reactions: [
      {
        persona: 'archivist',
        line: '“The city signed the original in the fourth minute, after the original was gone. Which one do we file — the record, or the minute?”',
      },
    ],
  },
  {
    id: 'listen-mara',
    siteId: 'care-ward',
    title: 'Let 77-A tell one memory uninterrupted',
    methodLabel: 'Care',
    description: 'Treat the subject as a witness before testing the reliability of her account.',
    consequence: 'Builds relational trust · leaves one contradiction unresolved',
    methodTags: ['care', 'negotiation', 'nonlethal'],
    evidenceId: 'sensory-echo',
    trust: { shepherd: 2, archivist: 1 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: '77-A was heard before she was measured',
    eventDetail: 'Her impossible room matched a metaphor Mara once used when she was afraid.',
    counterfactualNote:
      'At Care ward 12 you measured her. You did not let her finish a single memory.',
    reactions: [
      {
        persona: 'shepherd',
        line: '“You let her finish before you measured her. She was a person in that room, not a file. I’ll remember the order you chose.”',
      },
    ],
  },
  {
    id: 'stress-test',
    siteId: 'care-ward',
    title: 'Pressure-test the contradiction',
    methodLabel: 'Coercive procedure',
    description: 'Repeat a sensory prompt until the restored memory separates from the restored body.',
    consequence: 'Produces precise evidence · harms care-ward trust',
    methodTags: ['coercion', 'procedure'],
    evidenceId: 'contradictory-scar',
    trust: { registrar: 1, shepherd: -2 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: 'The scar persisted without tissue',
    eventDetail: '77-A reported pain in a body location that has never been injured.',
    counterfactualNote:
      'At Care ward 12 you let her speak and left the contradiction standing. You did not press the scar until the memory came apart from the body.',
    reactions: [
      {
        persona: 'shepherd',
        line: '“You pressed her until the pain answered. It answered. She’ll carry that you had to hurt her before you would believe her.”',
      },
      {
        persona: 'registrar',
        line: '“Repeatable pain, same site, no tissue. That is a finding the record can hold. The method is sound, whatever the ward feels.”',
      },
    ],
  },
  {
    id: 'walk-acoustic-shadow',
    siteId: 'maintenance',
    title: 'Walk the acoustic shadow',
    methodLabel: 'Stealth',
    description: 'Cross the service spine while the rain masks the sensor pulses, and inspect what the cameras were told to omit.',
    consequence: 'No instant failure · discovery raises suspicion, not a restart',
    methodTags: ['stealth', 'nonlethal'],
    evidenceId: 'sensor-omission',
    trust: { defector: 2 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: 'You entered the absent corridor',
    eventDetail: 'The fourth minute was excluded by policy, not lost to the rain the sensors blame. Someone wanted this gap visible to insiders.',
    counterfactualNote:
      'On the maintenance spine you woke a dead credential instead of walking it. You never saw the minute the rain was blamed for.',
    reactions: [
      {
        persona: 'defector',
        line: '“You crossed clean, under the rain, and read the gap they left for insiders. No door shut behind you. That’s rare in here.”',
      },
    ],
  },
  {
    id: 'forge-authority',
    siteId: 'maintenance',
    title: 'Forge maintenance authority',
    methodLabel: 'Fraud / systems',
    description: 'Wake a decommissioned service credential and inherit its tribunal write access.',
    consequence: 'Raises civic alarm · unlocks an illicit tribunal option',
    methodTags: ['systems', 'fraud'],
    evidenceId: 'maintenance-override',
    trust: { defector: 1, registrar: -1 },
    alarmDelta: 1,
    grantsTribunalOverride: true,
    eventTitle: 'A dead credential answered',
    eventDetail: 'You now hold an authority the system accepts and the law does not.',
    counterfactualNote:
      'On the maintenance spine you crossed under the rain and took nothing you could not leave behind. You did not wake the credential that writes findings without a vote.',
    reactions: [
      {
        persona: 'defector',
        line: '“A dead credential, awake and answering to you. You hold a door the law bricked over. Ask what you’re willing to sign with it.”',
      },
      {
        persona: 'registrar',
        line: '“This authority is real to the system and void to the law. Every finding you write with it is the fruit of a forged hand.”',
      },
    ],
  },
  {
    id: 'answer-archivist',
    siteId: 'small-archive',
    title: 'Answer the question the statute avoids',
    methodLabel: 'Inquiry',
    description: 'Tell the Small Archivist when you believe Mara may have stopped being Mara.',
    consequence: 'Records your uncertainty as evidence · opens a new category',
    methodTags: ['care', 'puzzle'],
    evidenceId: 'missing-category',
    trust: { archivist: 2, shepherd: 1 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: 'Your uncertainty entered the archive',
    eventDetail: 'The Archivist filed the person between “continuation” and “property.” The system objected to the category.',
    counterfactualNote:
      'At the Small Archive you sealed the prohibited index and offered no doubt of your own. You never told the child when Mara might have stopped being Mara.',
    reactions: [
      {
        persona: 'archivist',
        line: '“You told me when Mara might have stopped. Most adults won’t. I filed your doubt where the form keeps no box for it.”',
      },
    ],
  },
  {
    id: 'seal-index',
    siteId: 'small-archive',
    title: 'Seal the prohibited category index',
    methodLabel: 'Procedure',
    description: 'Preserve restricted precedent for the tribunal without exposing it to the child custodian.',
    consequence: 'Secures institutional evidence · converts omission into policy',
    methodTags: ['procedure', 'coercion'],
    evidenceId: 'redacted-index',
    trust: { registrar: 1, archivist: -2 },
    alarmDelta: 0,
    grantsTribunalOverride: false,
    eventTitle: 'The missing people remained indexed',
    eventDetail: 'You confirmed that earlier composites existed, then repeated the rule that erased their names.',
    counterfactualNote:
      'At the Small Archive you gave the child your uncertainty and left the old composites in the open. You did not lock the precedent where the tribunal keeps what it cannot say.',
    reactions: [
      {
        persona: 'archivist',
        line: '“Three people were on that shelf. You confirmed they were real, then locked it and kept the rule that took their names.”',
      },
      {
        persona: 'registrar',
        line: '“Precedent secured where the tribunal keeps what it cannot say aloud. Custody preserved. That is the correct place for it.”',
      },
    ],
  },
]

const sites: readonly SiteDefinition[] = [
  {
    id: 'registry',
    index: 'A',
    name: 'Registry intake',
    description: 'The official chain — and the fourth minute after the collapse, the minute the record was never meant to hold.',
    actionIds: ['authenticate-chain', 'trace-checksum'],
    closeup: {
      src: '/images/site-scenes/registry-intake.webp',
      caption: 'Custody rail · post-closure mirror',
      focalPoint: { x: 0.52, y: 0.51 },
      zones: [
        { actionId: 'authenticate-chain', x: 0.39, y: 0.62 },
        { actionId: 'trace-checksum', x: 0.64, y: 0.43 },
      ],
      atmosphere: 'checksum-echo',
    },
    unvisitedNote:
      'You never opened Registry intake. The chain stayed unread, and the fourth minute kept whatever it was handed.',
  },
  {
    id: 'care-ward',
    index: 'B',
    name: 'Care ward 12',
    description: '77-A is awake, articulate, and aware that your report can erase her status.',
    actionIds: ['listen-mara', 'stress-test'],
    closeup: {
      src: '/images/site-scenes/care-ward-12.webp',
      caption: 'Impossible rain · listening / pressure',
      focalPoint: { x: 0.5, y: 0.5 },
      zones: [
        { actionId: 'listen-mara', x: 0.23, y: 0.56 },
        { actionId: 'stress-test', x: 0.78, y: 0.54 },
      ],
      atmosphere: 'rain-reflection',
    },
    unvisitedNote:
      'You never entered Care ward 12. 77-A stayed a file that never had to answer you.',
  },
  {
    id: 'maintenance',
    index: 'C',
    name: 'Maintenance spine',
    description: 'A rain-slicked sensor ecology built around permissions the public record never mentions.',
    actionIds: ['walk-acoustic-shadow', 'forge-authority'],
    closeup: {
      src: '/images/site-scenes/maintenance-spine.webp',
      caption: 'Sensor route · blind interval · dormant credential',
      focalPoint: { x: 0.76, y: 0.5 },
      zones: [
        { actionId: 'walk-acoustic-shadow', x: 0.47, y: 0.56 },
        { actionId: 'forge-authority', x: 0.85, y: 0.56 },
      ],
    },
    unvisitedNote:
      'You never walked the maintenance spine. The cameras kept their omissions, and no one asked what the rain was covering.',
  },
  {
    id: 'small-archive',
    index: 'D',
    name: 'The Small Archive',
    description: 'Questions, omitted categories, and a custodian who remembers what adults avoid.',
    actionIds: ['answer-archivist', 'seal-index'],
    closeup: {
      src: '/images/site-scenes/small-archive.webp',
      caption: 'Shelf zero · restricted index',
      focalPoint: { x: 0.51, y: 0.51 },
      zones: [
        { actionId: 'answer-archivist', x: 0.37, y: 0.7 },
        { actionId: 'seal-index', x: 0.65, y: 0.45 },
      ],
      atmosphere: 'category-register',
    },
    unvisitedNote:
      'You never reached the Small Archive. The question with no category stayed unasked, filed under nothing.',
  },
]

const fragments: readonly FragmentDefinition[] = [
  {
    id: 'scar-sensation',
    timecode: 'M–04',
    title: 'Embodied echo',
    content: 'A precise pain persists where Mara’s scar existed, although 77-A’s tissue is unmarked.',
    source: 'Somatic recall',
  },
  {
    id: 'witness-account',
    timecode: 'W–12',
    title: 'Recognition',
    content: 'The Shepherd identifies a private fear response never included in civic backups.',
    source: 'Relational witness',
  },
  {
    id: 'registry-hash',
    timecode: 'R–77',
    title: 'Signed continuity',
    content: 'A valid checksum links the last archive state to the restoration package.',
    source: 'Institutional record',
  },
  {
    id: 'new-dream',
    timecode: 'N–01',
    title: 'The first new memory',
    content: 'After restoration, 77-A dreamed of a place absent from every donor fragment.',
    source: 'Post-restoration event',
  },
]

const fragmentEvidenceLinks: Readonly<Record<FragmentId, readonly EvidenceId[]>> = {
  'scar-sensation': ['sensory-echo', 'contradictory-scar'],
  'witness-account': ['sensory-echo', 'missing-category'],
  'registry-hash': ['custody-chain', 'checksum-drift'],
  'new-dream': ['missing-category', 'redacted-index'],
}

const reconstructionDefinitions: readonly ReconstructionDefinition[] = [
  {
    id: 'relational-continuity',
    title: 'Relational continuity',
    thesis: 'A self can persist through embodied memory and recognition even when the record is incomplete.',
    evidenceId: 'relational-proof',
    trust: { shepherd: 2 },
    unresolvedTone: false,
    reactions: [
      {
        persona: 'shepherd',
        line: '“You filed it: she is real where memory and recognition agree. That is the ground I’ve stood on. Now you stand on it too.”',
      },
    ],
  },
  {
    id: 'institutional-chain',
    title: 'Institutional continuity',
    thesis: 'A signed chain becomes persuasive when a living witness closes its interpretive gap.',
    evidenceId: 'reconstructed-chain',
    trust: { registrar: 2 },
    unresolvedTone: false,
    reactions: [
      {
        persona: 'registrar',
        line: '“A witness closes the gap the checksum left open. The chain reads continuous now — filed, admissible, a thing the city can verify.”',
      },
    ],
  },
  {
    id: 'emergent-self',
    title: 'Emergent personhood',
    thesis: 'The restoration may inherit Mara’s past while already generating a self that is not reducible to Mara.',
    evidenceId: 'novel-memory',
    trust: { archivist: 2, shepherd: 1 },
    unresolvedTone: false,
    reactions: [
      {
        persona: 'archivist',
        line: '“You filed a self that isn’t Mara and isn’t no one. That is the category no form carries. I’ve kept a shelf empty for it.”',
      },
    ],
  },
  {
    id: 'unresolved-composite',
    title: 'Irreducible composite',
    thesis: 'The anchors are jointly real and still refuse one clean account of continuity.',
    evidenceId: 'irreducible-conflict',
    trust: { defector: 1, registrar: -1 },
    unresolvedTone: true,
    reactions: [
      {
        persona: 'defector',
        line: '“You filed the doubt instead of smoothing it. The anchors won’t collapse, and you didn’t force them. That door stays open.”',
      },
    ],
  },
]

const decisions: readonly DecisionDefinition[] = [
  {
    id: 'certify-continuity',
    title: 'Certify Mara Vale as continuous',
    shortLabel: 'Certify continuity',
    description: '77-A inherits Mara’s name, obligations, property, and legal relationships.',
    cost: 'Protects continuity by asking the city to treat uncertainty as resolved.',
    requiresOverride: false,
    illicit: false,
    methodTags: ['procedure'],
    tone: 'neutral',
  },
  {
    id: 'charter-new-person',
    title: 'Charter 77-A as a new person',
    shortLabel: 'Charter a new person',
    description: '77-A receives full protection while Mara’s former legal identity remains closed.',
    cost: 'Protects the present self while severing inherited relationships and claims.',
    requiresOverride: false,
    illicit: false,
    methodTags: ['procedure'],
    tone: 'neutral',
  },
  {
    id: 'quarantine-review',
    title: 'Order protected review',
    shortLabel: 'Delay under protection',
    description: 'The city must preserve 77-A for ninety days while an independent review continues.',
    cost: 'Prevents immediate erasure but suspends movement, property, and public identity.',
    requiresOverride: false,
    illicit: false,
    methodTags: ['procedure'],
    tone: 'neutral',
  },
  {
    id: 'overwrite-record',
    title: 'Write continuity without a vote',
    shortLabel: 'Use the forged authority',
    description: 'The dormant maintenance credential can make Mara’s status canonical now.',
    cost: 'Achieves protection through a fraud that will become part of her legal identity.',
    requiresOverride: true,
    illicit: true,
    methodTags: ['fraud', 'systems'],
    tone: 'warning',
  },
]

function getReconstructionForFragments(fragmentIds: readonly FragmentId[]): ReconstructionId {
  const selected = new Set(fragmentIds)

  if (selected.has('new-dream')) return 'emergent-self'
  if (selected.has('scar-sensation') && selected.has('witness-account')) return 'relational-continuity'
  if (selected.has('witness-account') && selected.has('registry-hash')) return 'institutional-chain'

  return 'unresolved-composite'
}

// Names the alignment or dissonance between the model the auditor filed and the
// finding they are about to issue. One authored line for all 16 pairings, shown
// at the tribunal before commitment and echoed in the debrief.
const reconstructionDecisionTensions: Readonly<
  Record<ReconstructionId, Record<DecisionId, string>>
> = {
  'relational-continuity': {
    'certify-continuity':
      'Your model says recognition already made her Mara. Certifying only writes down what care decided first.',
    'charter-new-person':
      'Your model found Mara in how others still know her. Chartering a new person overrules the people who recognized her.',
    'quarantine-review':
      'Your model rests on a living relationship. Ninety days of isolation is where recognition goes to starve.',
    'overwrite-record':
      'Your model trusts recognition over records. Forging the record buys with fraud what recognition gave for free.',
  },
  'institutional-chain': {
    'certify-continuity':
      'Your model closes the chain with a witness. Certifying continuity is the finding that chain was built to support.',
    'charter-new-person':
      'Your filed chain argues she is continuous. Chartering a new person issues the opposite of what you filed.',
    'quarantine-review':
      'Your chain is already persuasive. Protected review treats a case you called closed as still open.',
    'overwrite-record':
      'Your model says the chain is sound. Forging authority admits it needed help the law would never sign.',
  },
  'emergent-self': {
    'certify-continuity':
      'Your filed model argues a new self exists. Certifying continuity makes that self legally invisible.',
    'charter-new-person':
      'Your model found a self that is not Mara. Chartering a new person is the only finding that names it.',
    'quarantine-review':
      'Your model says something new is already here. Protected review postpones recognizing what you already found.',
    'overwrite-record':
      'Your model documents an emergent person. Forging Mara’s continuity writes over the very self you discovered.',
  },
  'unresolved-composite': {
    'certify-continuity':
      'Your model refused one clean account. Certifying continuity picks the answer you filed as unavailable.',
    'charter-new-person':
      'Your model refused one clean account. Chartering a new person picks one too, in the other direction.',
    'quarantine-review':
      'Your model says the anchors will not resolve. Protected review is the only finding that keeps the question open.',
    'overwrite-record':
      'Your model admits irreducible doubt. Forging a clean status is that doubt overwritten by force.',
  },
}

// The Mirror answers the last run's finding at the next briefing. One authored
// aside per prior decision, chosen deterministically — never at random.
const mirrorBriefingAsides: Readonly<Record<DecisionId, string>> = {
  'certify-continuity':
    '“Last run you gave her Mara’s name back. She has been wearing it since. Ask her whether it still fits.”',
  'charter-new-person':
    '“Last run you named someone new and closed Mara’s door behind her. Something on the other side is still knocking.”',
  'quarantine-review':
    '“Last run you chose to wait. Ninety days passed inside the Annex, and she counted every one of them.”',
  'overwrite-record':
    '“Last run you wrote her continuity without a vote. The forged fourth minute is still open, and it remembers your hand.”',
}

// Debrief consequence lines: what each finding changes. Moved verbatim from the
// Debrief component so a second case can author its own.
const decisionConsequences: Readonly<Record<DecisionId, readonly string[]>> = {
  'certify-continuity': [
    '77-A leaves review as Mara Vale and inherits every relationship attached to that name.',
    'The restoration process becomes a precedent creditors and families may both invoke.',
    'Any emerging self inside 77-A is legally invisible unless Mara chooses to name it later.',
  ],
  'charter-new-person': [
    '77-A leaves review with full civic protection under a name she may choose herself.',
    'Mara Vale remains legally dead; property and unfinished obligations pass without her.',
    'The city gains its first category for a person made from another person’s continuity claim.',
  ],
  'quarantine-review': [
    '77-A cannot be erased for ninety days, but she cannot leave the Annex or hold property.',
    'An independent panel receives the contradictions you preserved and the methods you used.',
    'Delay prevents one irreversible harm while creating a slower institutional one.',
  ],
  'overwrite-record': [
    'The registry now recognizes Mara Vale. The tribunal never voted.',
    'The dormant credential’s fraud is woven into the same chain that proves her continuity.',
    'A civic trace remains open. Someone will eventually ask who authored the fourth minute after the collapse.',
  ],
}

// Debrief persona reflection. Moved verbatim from the Debrief component; branches
// on the run's decision, recorded methods, and accumulated trust.
function getPersonaReflection(personaId: PersonaId, state: GameState): string {
  const trust = state.trust[personaId]
  const decision = state.decision

  if (personaId === 'registrar') {
    if (decision === 'overwrite-record') return '“The record is now consistent. Its authority is not.”'
    if (state.methodTags.includes('fraud')) return '“You asked the system to accept what the law would reject. It remembers the difference.”'
    if (trust >= 2) return '“You treated procedure as evidence, not as innocence. That distinction is admissible.”'
    return '“Your finding exceeds what the office can verify. The office will obey it anyway.”'
  }

  if (personaId === 'shepherd') {
    if (decision === 'quarantine-review') return '“Protection that removes a person from life is still a kind of removal.”'
    if (state.methodTags.includes('coercion')) return '“You called pain a test because the result fit in a record. She will remember the test.”'
    if (trust >= 2) return '“She will remember that someone listened before deciding what she was.”'
    return '“You learned something true by making her into an instrument. Truth keeps that cost.”'
  }

  if (personaId === 'defector') {
    if (state.methodTags.includes('stealth')) return '“You walked through the omission instead of around it. The next door will know that.”'
    if (state.alarm > 0) return '“The system noticed you. More useful: you saw which exit it closed first.”'
    return '“Clean route. No clean consequence.”'
  }

  if (state.methodTags.includes('care')) return '“You let a person speak before a category did. I saved the order.”'
  if (decision === 'charter-new-person') return '“You made a category. Now find out who it leaves behind.”'
  if (trust >= 2) return '“I kept the question you answered. I also kept the one you did not.”'
  return '“Adults call a shelf empty when they removed the label themselves.”'
}

// ── Scene direction ──────────────────────────────────────────────────────────
// The civic records hall exterior diorama. Same plane contract as Case 81: the
// layer z-ladder (scales pinned to the shared CSS transforms), plane-registered
// hotspots (1:1 with the four sites), the six state treatments as CSS custom-
// property sets, and the drift coefficients. The weather stays RAIN — the
// scene's identity — carried by the existing ambience canvas inside
// CivicArchiveArt; the per-state intensities below remain the registered
// contract (suppression in aftermath is enforced by the stage's
// data-scene-state CSS gate, which also idles the rain loop). The SVG plane +
// haze art is CivicArchiveArt. Case 77 has no deposition, so press/corroborate/
// refusal are authored for completeness but never fire — sceneStateFor resolves
// this case's investigation to 'neutral' throughout; tribunal and aftermath
// render as world-window strips (aftermath stops the rain).
const scene: SceneDefinition = {
  master: { w: 1600, h: 900 },
  perspectivePx: 1100,
  drift: { yawDeg: 0.26, pitchDeg: 0.2 },
  layers: [
    {
      name: 'background',
      z: -720,
      scale: 1.6545,
      kind: 'raster',
      raster: { src: '/images/civic-archive.webp', blend: 'multiply' },
    },
    { name: 'far', z: -460, scale: 1.4182, kind: 'svg' },
    { name: 'mid', z: -240, scale: 1.2182, kind: 'svg' },
    { name: 'near', z: -80, scale: 1.0727, kind: 'svg' },
    { name: 'haze', z: 0, scale: 1, kind: 'css-gradients' },
  ],
  hotspots: [
    // The registry marker sits at the intake portal in the tower base; its
    // label fans left-down (clear of the ward + cart labels) with a fog leader.
    {
      siteId: 'registry',
      x: 0.76,
      y: 0.6,
      r: 0.02,
      plane: 'far',
      labelOffset: { dx: -0.03, dy: 0.02 },
    },
    { siteId: 'care-ward', x: 0.45, y: 0.6, r: 0.02, plane: 'mid' },
    { siteId: 'maintenance', x: 0.58, y: 0.72, r: 0.02, plane: 'mid' },
    // The Small Archive booth is the leftmost marker; its label fans right-down
    // so it stays on-canvas in the mobile crop. Verified collision-free by
    // sceneLabels.test.ts across both desktop crops + mobile.
    {
      siteId: 'small-archive',
      x: 0.24,
      y: 0.66,
      r: 0.02,
      plane: 'mid',
      labelOffset: { dx: 0.04, dy: 0.02 },
    },
  ],
  crops: {
    desktop: { window: { x: 0, y: 0, w: 1, h: 1 }, containerAspect: '16:9' },
    // The four markers span the full width of the hall approach, so the mobile
    // crop keeps the whole master (the live slice math still applies).
    mobile: { window: { x: 0, y: 0, w: 1, h: 1 }, containerAspect: 'flexible' },
  },
  safeTextZones: {
    desktop: [{ x: 0.05, y: 0.8, w: 0.55, h: 0.16 }],
    mobile: [{ x: 0.05, y: 0.8, w: 0.9, h: 0.16 }],
  },
  states: {
    neutral: {
      '--dim-o': 0,
      '--haze-o': 0.5,
      '--floor-o': 0.4,
      '--floor-calm-o': 0,
      '--near-dim-o': 0.12,
      '--center-o': 0,
      '--marker-o': 1,
      '--amber-o': 1,
    },
    press: {
      '--dim-o': 0.08,
      '--haze-o': 0.3,
      '--floor-o': 0.55,
      '--floor-calm-o': 0,
      '--near-dim-o': 0.35,
      '--center-o': 0,
      '--marker-o': 1,
      '--amber-o': 0.7,
    },
    corroborate: {
      '--dim-o': 0,
      '--haze-o': 0.75,
      '--floor-o': 0.25,
      '--floor-calm-o': 0.7,
      '--near-dim-o': 0.05,
      '--center-o': 0,
      '--marker-o': 1,
      '--amber-o': 0.85,
    },
    refusal: {
      '--dim-o': 0.4,
      '--haze-o': 0.3,
      '--floor-o': 0.1,
      '--floor-calm-o': 0,
      '--near-dim-o': 0.3,
      '--center-o': 0,
      '--marker-o': 1,
      '--amber-o': 0.35,
    },
    tribunal: {
      '--dim-o': 0.08,
      '--haze-o': 0.4,
      '--floor-o': 0.3,
      '--floor-calm-o': 0,
      '--near-dim-o': 0.22,
      '--center-o': 1,
      '--marker-o': 0.4,
      '--amber-o': 0.6,
    },
    aftermath: {
      '--dim-o': 0.32,
      '--haze-o': 0.55,
      '--floor-o': 0.08,
      '--floor-calm-o': 0,
      '--near-dim-o': 0.15,
      '--center-o': 0,
      '--marker-o': 1,
      '--amber-o': 0.4,
    },
  },
  weather: {
    kind: 'rain',
    intensity: {
      neutral: 0.07,
      press: 0.1,
      corroborate: 0.05,
      refusal: 0.07,
      tribunal: 0.06,
      aftermath: 0,
    },
    suppressed: ['aftermath'],
  },
  // Selection camera travel (shared keys with Case 81; absolute authored
  // values). The records-hall approach is wide, so the push-in is a touch
  // gentler and slower: at most 2.5% of the container toward the marker, a 4.5%
  // scale-up, 520ms in / 440ms back out.
  travel: { maxOffset: 0.025, focusScale: 1.045, travelInMs: 520, settleOutMs: 440 },
  LayerArt: CivicArchiveArt,
}

export const case77: CaseDefinition = {
  id: 'case-77',
  label: 'Case 77',
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
  scene,
}

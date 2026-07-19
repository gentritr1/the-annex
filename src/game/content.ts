import type {
  ApproachDefinition,
  DecisionDefinition,
  DecisionId,
  EvidenceId,
  EvidenceDefinition,
  FieldActionDefinition,
  FragmentId,
  FragmentDefinition,
  GameEvent,
  MethodTag,
  PersonaDefinition,
  PersonaId,
  PersonaReaction,
  ReconstructionDefinition,
  ReconstructionId,
  SiteDefinition,
} from './types'

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

export const caseFile = {
  code: 'CMA–77–A',
  title: 'The Vale Continuity Claim',
  subject: 'Mara Vale / restoration instance 77-A',
  deadline: 'Review closes at shift end',
  question: 'Does a restored person inherit the identity that supplied their memories?',
  publicRecord:
    'Mara Vale was declared dead after the Lower Span archive collapse. Eleven days later, a prohibited recovery process assembled instance 77-A from civic backups, care records, and private memory fragments.',
  mandate:
    'Determine whether 77-A continues Mara Vale, begins as a new legal person, or must remain under protected review. Your route through the record will become part of the record.',
} as const

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

export const approaches: readonly ApproachDefinition[] = [
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

export const evidenceDefinitions: readonly EvidenceDefinition[] = [
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

export const fieldActions: readonly FieldActionDefinition[] = [
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

export const sites: readonly SiteDefinition[] = [
  {
    id: 'registry',
    index: 'A',
    name: 'Registry intake',
    description: 'The official chain — and the fourth minute after the collapse, the minute the record was never meant to hold.',
    actionIds: ['authenticate-chain', 'trace-checksum'],
    unvisitedNote:
      'You never opened Registry intake. The chain stayed unread, and the fourth minute kept whatever it was handed.',
  },
  {
    id: 'care-ward',
    index: 'B',
    name: 'Care ward 12',
    description: '77-A is awake, articulate, and aware that your report can erase her status.',
    actionIds: ['listen-mara', 'stress-test'],
    unvisitedNote:
      'You never entered Care ward 12. 77-A stayed a file that never had to answer you.',
  },
  {
    id: 'maintenance',
    index: 'C',
    name: 'Maintenance spine',
    description: 'A rain-slicked sensor ecology built around permissions the public record never mentions.',
    actionIds: ['walk-acoustic-shadow', 'forge-authority'],
    unvisitedNote:
      'You never walked the maintenance spine. The cameras kept their omissions, and no one asked what the rain was covering.',
  },
  {
    id: 'small-archive',
    index: 'D',
    name: 'The Small Archive',
    description: 'Questions, omitted categories, and a custodian who remembers what adults avoid.',
    actionIds: ['answer-archivist', 'seal-index'],
    unvisitedNote:
      'You never reached the Small Archive. The question with no category stayed unasked, filed under nothing.',
  },
]

export const fragments: readonly FragmentDefinition[] = [
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

export const fragmentEvidenceLinks: Readonly<Record<FragmentId, readonly EvidenceId[]>> = {
  'scar-sensation': ['sensory-echo', 'contradictory-scar'],
  'witness-account': ['sensory-echo', 'missing-category'],
  'registry-hash': ['custody-chain', 'checksum-drift'],
  'new-dream': ['missing-category', 'redacted-index'],
}

export const reconstructionDefinitions: readonly ReconstructionDefinition[] = [
  {
    id: 'relational-continuity',
    title: 'Relational continuity',
    thesis: 'A self can persist through embodied memory and recognition even when the record is incomplete.',
    evidenceId: 'relational-proof',
    trust: { shepherd: 2 },
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
    reactions: [
      {
        persona: 'defector',
        line: '“You filed the doubt instead of smoothing it. The anchors won’t collapse, and you didn’t force them. That door stays open.”',
      },
    ],
  },
]

export const decisions: readonly DecisionDefinition[] = [
  {
    id: 'certify-continuity',
    title: 'Certify Mara Vale as continuous',
    shortLabel: 'Certify continuity',
    description: '77-A inherits Mara’s name, obligations, property, and legal relationships.',
    cost: 'Protects continuity by asking the city to treat uncertainty as resolved.',
    requiresOverride: false,
  },
  {
    id: 'charter-new-person',
    title: 'Charter 77-A as a new person',
    shortLabel: 'Charter a new person',
    description: '77-A receives full protection while Mara’s former legal identity remains closed.',
    cost: 'Protects the present self while severing inherited relationships and claims.',
    requiresOverride: false,
  },
  {
    id: 'quarantine-review',
    title: 'Order protected review',
    shortLabel: 'Delay under protection',
    description: 'The city must preserve 77-A for ninety days while an independent review continues.',
    cost: 'Prevents immediate erasure but suspends movement, property, and public identity.',
    requiresOverride: false,
  },
  {
    id: 'overwrite-record',
    title: 'Write continuity without a vote',
    shortLabel: 'Use the forged authority',
    description: 'The dormant maintenance credential can make Mara’s status canonical now.',
    cost: 'Achieves protection through a fraud that will become part of her legal identity.',
    requiresOverride: true,
  },
]

export function getReconstructionForFragments(fragmentIds: readonly FragmentId[]): ReconstructionId {
  const selected = new Set(fragmentIds)

  if (selected.has('new-dream')) return 'emergent-self'
  if (selected.has('scar-sensation') && selected.has('witness-account')) return 'relational-continuity'
  if (selected.has('witness-account') && selected.has('registry-hash')) return 'institutional-chain'

  return 'unresolved-composite'
}

// Names the alignment or dissonance between the model the auditor filed and the
// finding they are about to issue. One authored line for all 16 pairings, shown
// at the tribunal before commitment and echoed in the debrief.
export const reconstructionDecisionTensions: Readonly<
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

export function getTensionLine(reconstruction: ReconstructionId, decision: DecisionId): string {
  return reconstructionDecisionTensions[reconstruction][decision]
}

// View-side lookup: given an event's persisted sourceType/sourceId, return the
// authored in-run reactions for the action or model it records. Pure content —
// the engine stays unaware these lines exist.
export function getReactionsForSource(
  sourceType: GameEvent['sourceType'],
  sourceId: string,
): readonly PersonaReaction[] {
  if (sourceType === 'field-action') {
    return fieldActions.find((action) => action.id === sourceId)?.reactions ?? []
  }
  if (sourceType === 'reconstruction') {
    return reconstructionDefinitions.find((model) => model.id === sourceId)?.reactions ?? []
  }
  return []
}

export function personaName(personaId: PersonaId): string {
  return personas.find((persona) => persona.id === personaId)?.name ?? ''
}

// The Mirror answers the last run's finding at the next briefing. One authored
// aside per prior decision, chosen deterministically — never at random.
export const mirrorBriefingAsides: Readonly<Record<DecisionId, string>> = {
  'certify-continuity':
    '“Last run you gave her Mara’s name back. She has been wearing it since. Ask her whether it still fits.”',
  'charter-new-person':
    '“Last run you named someone new and closed Mara’s door behind her. Something on the other side is still knocking.”',
  'quarantine-review':
    '“Last run you chose to wait. Ninety days passed inside the Annex, and she counted every one of them.”',
  'overwrite-record':
    '“Last run you wrote her continuity without a vote. The forged fourth minute is still open, and it remembers your hand.”',
}

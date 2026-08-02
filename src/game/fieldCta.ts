// The investigation footer's single amber call-to-action, resolved as a pure
// function of the player's live progression so the label always names the ACTUAL
// next step and never promises an action its click cannot deliver (UX review F-5,
// and the CTA half of F-1). View wiring lives in Investigation.tsx; this module is
// deliberately dependency-free so every state is unit-testable in isolation.
//
// A `null` return means the footer shows no CTA at all — used once the live method
// list is already on screen, so the footer stops pointing "here" at content the
// player can already act on (F-5, worst on mobile where the CTA rendered *below*
// the methods it referred to).

import type {
  AcousticShadowPhaseId,
  CustodyRailPhaseId,
  RoomPhaseId,
} from './types'

export type FieldCtaKind =
  | 'tribunal'
  | 'reconstruction'
  | 'next-site'
  | 'ritual-step'

export interface FieldCta {
  kind: FieldCtaKind
  label: string
}

export interface FieldCtaState {
  // The tribunal gate is open (>= 2 sites filed and a model on record).
  tribunalReady: boolean
  // A memory reconstruction has been filed.
  reconstructionFiled: boolean
  // The engine-owned reconstruction gate. This replaces a site-count proxy so
  // the CTA never promises a lattice that cannot open from the known anchors.
  canOpenReconstruction: boolean
  // Whether the two canonical methods are on screen for the selected site. In this
  // game the site inspector is always mounted, so the methods aren't gated behind a
  // separate "enter the site" step — they're gated behind the close-read ritual (or
  // shown immediately on a plain method site). True once the ritual reveals them, or
  // for a plain site that has no ritual; false while a ritual is still in progress.
  methodsVisible: boolean
  // While a ritual is in progress, the in-voice name of its current step, so the CTA
  // points at what the room is actually asking for rather than a generic prompt.
  ritualStepLabel: string | null
}

export function fieldCta(state: FieldCtaState): FieldCta | null {
  // 1 — the gate is open: the only forward action is the tribunal.
  if (state.tribunalReady) {
    return { kind: 'tribunal', label: 'Enter tribunal' }
  }

  // 2 — the engine can open a valid lattice from the currently known anchors.
  if (state.canOpenReconstruction) {
    return { kind: 'reconstruction', label: 'Open memory lattice' }
  }

  // 3 — a model is filed but the gate is still closed: another site is required.
  if (state.reconstructionFiled) {
    return { kind: 'next-site', label: 'Complete one more site' }
  }

  // 4 — nothing filed yet: the first-site guidance, the review's biggest snag.
  //   a. methods already on screen → no footer CTA; the live method list carries
  //      it (was a redundant "Choose a method here", worst on mobile where it
  //      rendered *below* the very methods it pointed at).
  if (state.methodsVisible) {
    return null
  }
  //   b. mid-ritual → name the ritual's current step, instead of "Choose a method
  //      here" mislabeling a path the ritual defers for ~7 steps.
  return {
    kind: 'ritual-step',
    label: state.ritualStepLabel ?? 'Continue the field record',
  }
}

// In-voice names for each close-read room's current step, so the mid-ritual CTA
// (state 4c) points the player at what the room is actually asking for. Every
// terminal phase (methods revealed) is intentionally absent — that case resolves
// to `methodsVisible` upstream and the CTA disappears.
const CUSTODY_STEP_LABELS: Partial<Record<CustodyRailPhaseId, string>> = {
  intake: 'Seat the carriers on the rail',
  'late-carrier': 'Test the refused carrier',
  mirror: 'Read the audit mirror',
  reading: 'Take in the mirror’s mark',
}

const CLASSIFICATION_STEP_LABELS: Partial<Record<RoomPhaseId, string>> = {
  routine: 'File the routine records',
  pocket: 'Weigh the unclassifiable record',
  'shelf-zero': 'Decide the unlabeled shelf',
  log: 'Read the restriction slips',
}

const ACOUSTIC_STEP_LABELS: Partial<Record<AcousticShadowPhaseId, string>> = {
  survey: 'Read the sensor cadence',
  crossing: 'Cross on the masked band',
}

export function custodyStepLabel(phase: CustodyRailPhaseId): string | null {
  return CUSTODY_STEP_LABELS[phase] ?? null
}

export function classificationStepLabel(phase: RoomPhaseId): string | null {
  return CLASSIFICATION_STEP_LABELS[phase] ?? null
}

export function acousticStepLabel(phase: AcousticShadowPhaseId): string | null {
  return ACOUSTIC_STEP_LABELS[phase] ?? null
}

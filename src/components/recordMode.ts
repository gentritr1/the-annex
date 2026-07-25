import type { AccessibilitySettings } from '../game/types'

// ══ RECORD MODE — the name for a pattern that shipped three times ═════════════
//
// The Annex has always had two stages, and the stylesheet has said so in prose
// since the staged-text block was written (`src/styles.css`, "Staged text: ONE
// family, two stages"). Only the scene stage was ever named:
//
//   SCENE MODE  — the staged beat performing over a photograph. One clause at a
//                 time, the player deciding when the next one lands, the plate
//                 doing the acting. Typography for PERFORMANCE.
//   RECORD MODE — the same voice, seated. Dense sworn statements, filed method
//                 prose, the four case-file panels: text the player READS rather
//                 than watches. Typography for READING.
//
// Three surfaces are Record Mode today and none of them said so:
//   · the deposition tray        (Deposition.tsx)
//   · the location detail drawer (SceneDetailDrawer.tsx)
//   · the case-file drawer       (CaseFileDrawer.tsx)
//
// All three are portalled out of the shell, which is why they each rebuilt the
// view-preference class list by hand — and why a preference added to `.annex-app`
// alone silently failed on exactly the surfaces it existed for. That hand-copied
// list is now written once, here, so a new preference reaches every boundary by
// construction instead of by three people remembering.
//
// This module is a pure string derivation. It reads settings, returns classes,
// and knows nothing about GameState.

// The view preferences that must be re-declared at every portal boundary,
// because a portal lands outside `.annex-app` and inherits none of its classes.
export function preferenceClasses(settings: AccessibilitySettings): readonly string[] {
  return [
    settings.reducedMotion ? 'reduce-motion' : '',
    settings.highContrast ? 'high-contrast' : '',
    settings.textSize === 'large' ? 'large-text' : '',
    settings.easyRead ? 'easy-read' : '',
    settings.subtitlePlate ? 'subtitle-plate' : '',
  ].filter(Boolean)
}

// The app shell itself. Same list, one root: whatever reaches a portal reaches
// the shell and vice versa.
export function appShellClass(settings: AccessibilitySettings): string {
  return ['annex-app', ...preferenceClasses(settings)].join(' ')
}

// A record surface's portal root. `record-mode` is a constant member: these
// surfaces are Record Mode whatever the preferences say. Mutual exclusivity
// (never two record surfaces at once) is enforced by the callers that open them,
// so this class inherits it rather than restating it.
export function recordPortalClass(portalClass: string, settings: AccessibilitySettings): string {
  return [portalClass, 'record-mode', ...preferenceClasses(settings)].join(' ')
}

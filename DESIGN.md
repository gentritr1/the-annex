---
name: The Annex
description: A rain-dark civic memory audit where every method becomes testimony.
colors:
  night: "oklch(0.09 0 0)"
  concrete: "oklch(0.16 0.012 240)"
  raised: "oklch(0.21 0.016 240)"
  record: "oklch(0.94 0.012 190)"
  fog: "oklch(0.72 0.018 210)"
  line: "oklch(0.32 0.018 230)"
  service-amber: "oklch(0.72 0.14 70)"
  archive-cyan: "oklch(0.78 0.11 190)"
  civic-coral: "oklch(0.66 0.17 30)"
typography:
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 650
    lineHeight: 1.2
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.055em"
rounded:
  control: "6px"
  panel: "10px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.service-amber}"
    textColor: "{colors.night}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.record}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  panel:
    backgroundColor: "{colors.concrete}"
    textColor: "{colors.record}"
    rounded: "{rounded.panel}"
    padding: "16px"
---

<!-- SEED: re-run design documentation after the first verified UI pass. -->

# Design System: The Annex

## 1. Overview

**Creative North Star: "The Midnight Registry"**

The interface behaves like a municipal case terminal embedded in a rain-dark public archive: measured, legible, and under quiet pressure. The player is sitting at a laptop late at night in low ambient light, following evidence across a dense but finite case; the dark surface reduces glare while amber service light identifies action and cool cyan identifies authenticated record state.

Atmosphere comes from decisive imagery, tonal layers, sparse status signals, and precise copy—not simulated CRT damage or decorative data noise. The system rejects generic neon-cyberpunk spectacle, purple-magenta synthwave, glass panels, morality meters, and invented controls that make a familiar action harder to understand.

**Key Characteristics:**

- Neutral black architecture with restrained civic color signals.
- Dense information that opens progressively instead of appearing as a wall.
- System typography for immediate trust; mono is limited to codes, timestamps, and short state labels.
- Fast state transitions that always communicate cause and effect.
- One image-led world view balanced by readable authored evidence.

## 2. Colors

The palette is restrained: neutral night surfaces carry the product, honey-amber marks player action, archive cyan marks verified system state, and coral is reserved for irreversible risk.

### Primary

- **Service Amber** (`oklch(0.72 0.14 70)`): primary actions, active route indicators, and the small amount of warm human light within the institution.

### Secondary

- **Archive Cyan** (`oklch(0.78 0.11 190)`): verified evidence, trusted links, focus reinforcement, and authenticated records.

### Tertiary

- **Civic Coral** (`oklch(0.66 0.17 30)`): alarms, destructive consequences, and unresolved conflict only.

### Neutral

- **Night** (`oklch(0.09 0 0)`): application background and deepest scene mask.
- **Concrete** (`oklch(0.16 0.012 240)`): primary work surfaces.
- **Raised Registry** (`oklch(0.21 0.016 240)`): selected and elevated controls.
- **Record White** (`oklch(0.94 0.012 190)`): primary text.
- **Archive Fog** (`oklch(0.72 0.018 210)`): secondary copy and metadata.
- **Structural Line** (`oklch(0.32 0.018 230)`): borders, dividers, and inactive tracks.

### Named Rules

**The Signal Has Meaning Rule.** Amber is action, cyan is verified state, and coral is risk; never swap them for decoration.

## 3. Typography

**Display Font:** System UI (with sans-serif fallback)  
**Body Font:** System UI (with sans-serif fallback)  
**Label/Mono Font:** System monospace (for codes and state only)

**Character:** Familiar platform typography keeps the interface trustworthy and fast. Weight, spacing, and hierarchy carry the institutional voice; mono is evidence metadata, never a costume for the whole product.

### Hierarchy

- **Title** (700, 2rem, 1.05): case title and rare end-state moments.
- **Headline** (650, 1.375rem, 1.2): scene and panel headings.
- **Body** (400, 1rem, 1.6): narrative and evidence copy, held to 65–72ch.
- **Label** (600, 0.75rem, 0.055em): short case codes, statuses, and timestamps.

### Named Rules

**The Record Before Atmosphere Rule.** Narrative text stays readable at normal body size; visual flavor never compresses essential testimony into tiny type.

## 4. Elevation

The interface is flat by default. Depth comes from tonal layering, the world image, sticky structure, and compact inset highlights. A single short shadow may separate a focused floating utility, but wide ambient shadows and decorative glow are excluded.

### Shadow Vocabulary

- **Utility Lift** (`0 6px 8px rgb(0 0 0 / 0.22)`): focused popovers or compact menus only; never paired with a decorative border.

### Named Rules

**The Flat Record Rule.** Surfaces remain flat until interaction or stacking requires separation.

## 5. Components

### Buttons

- **Shape:** compact rounded rectangle (6px); pills are reserved for non-action status chips.
- **Primary:** Service Amber with Night text, 12px × 16px padding, used once per decision group.
- **Hover / Focus:** 180ms color or translate feedback; a 2px Archive Cyan focus outline remains visible without motion.
- **Secondary / Ghost:** Raised Registry or transparent surface with a full Structural Line border and Record White text.

### Chips

- **Style:** compact full pill with state text and an optional leading dot; no standalone icon tiles.
- **State:** labels communicate method or evidence class and always repeat meaning in text, never color alone.

### Cards / Containers

- **Corner Style:** 10px maximum.
- **Background:** Concrete or Raised Registry.
- **Shadow Strategy:** flat at rest.
- **Border:** Structural Line when boundaries are necessary.
- **Internal Padding:** 16–24px.

### Inputs / Fields

- **Style:** native-feeling dark field, 6px radius, persistent label, full border.
- **Focus:** Archive Cyan outline with no layout shift.
- **Error / Disabled:** explicit text and icon state; opacity alone is insufficient.

### Navigation

- **Style:** fixed-height top status bar plus a contextual case rail on large screens; mobile collapses into sequential sections without hiding critical state behind a menu.

### Evidence Choice

- Each choice contains a direct verb, likely method, cost or risk, and keyboard shortcut. Resolved choices become a readable event in the case log instead of disappearing.

## 6. Do's and Don'ts

### Do:

- **Do** target WCAG 2.2 AA and use Record White for all essential copy on Night or Concrete.
- **Do** keep controls at least 44px tall and fully operable by keyboard, pointer, and touch.
- **Do** use Service Amber only for action, Archive Cyan only for verified state, and Civic Coral only for risk.
- **Do** show the cause of every trust, access, evidence, and alarm change in the event log.
- **Do** respect `prefers-reduced-motion` and keep normal transitions within 150–250ms.

### Don't:

- **Don't** use generic neon-cyberpunk spectacle or purple-magenta synthwave.
- **Don't** use fake terminal noise that obscures the task, unrestricted live-AI dialogue presented as truth, or philosophical lore dumps.
- **Don't** use generic dashboard card grids, decorative glassmorphism, gradient text, side-stripe accents, or repeated tiny uppercase section eyebrows.
- **Don't** use good-versus-evil morality meters or label an ending as morally correct.
- **Don't** copy recognizable visual, narrative, terminology, or interaction expression from existing game franchises.

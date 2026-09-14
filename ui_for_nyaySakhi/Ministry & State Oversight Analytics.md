---
name: Nyaya-Sakhi
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#43474e'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f87'
  primary: '#022448'
  on-primary: '#ffffff'
  primary-container: '#1e3a5f'
  on-primary-container: '#8aa4cf'
  inverse-primary: '#adc8f5'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#4f0011'
  on-tertiary: '#ffffff'
  tertiary-container: '#78001f'
  on-tertiary-container: '#ff7884'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#adc8f5'
  on-primary-fixed: '#001c3b'
  on-primary-fixed-variant: '#2d486d'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffdada'
  tertiary-fixed-dim: '#ffb3b6'
  on-tertiary-fixed: '#40000c'
  on-tertiary-fixed-variant: '#920028'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Public Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Public Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Public Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Public Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  gutter-lg: 2rem
  margin: 1.5rem
  margin-sm: 1rem
  margin-lg: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system delivers an authoritative, highly accessible civic environment engineered for individuals navigating acute legal stress, civic procedures, and crisis intervention. The aesthetic approach blends modern public-sector clarity with trauma-informed design principles: unhurried, transparent, safe, and deliberate.

### Design Principles
- **Predictable Calm:** Cognitive load is minimized through structural symmetry, low-motion transitions, and explicit navigational landmarks.
- **Institutional Dignity:** Visuals evoke stability, statutory integrity, and quiet strength rather than bureaucratic coldness or clinical detachment.
- **Fail-Safe Legibility:** Critical information and exit triggers remain unambiguous and immediately decipherable under extreme stress and low-bandwidth conditions.
- **Reassuring Structure:** Restrained contours, structured surfaces, and defined boundaries replace floating or ambiguous affordances.

## Colors

The color system establishes structural authority while maintaining strict adherence to WCAG AAA contrast ratios for body text and core interactive elements.

- **Primary (`#1E3A5F`):** Deep institutional navy. Conveys civic permanence, legal rigor, and procedural trust. Used for core brand chrome, primary button fills, headings, and active state framing.
- **Secondary (`#0D9488`):** Restorative civic teal. Introduces calm, safety, and positive momentum. Employed for non-critical confirmations, progress indicators, verified badges, and secondary actions.
- **Tertiary / Emergency (`#E11D48`):** High-alert crisis red. Reserved exclusively for high-stakes actions, panic/SOS quick-exit controls, and severe legal urgency markers.
- **Neutral Core (`#64748B`):** Slated neutral providing quiet balance. Complemented by background surfaces `#F8FAFC` (canvas), `#F1F5F9` (structural tint/wells), and `#FFFFFF` (isolated card planes).
- **Status & Risk Tiers:**
  - *Critical Risk:* `#E11D48` (Crimson)
  - *Elevated Risk:* `#D97706` (Amber)
  - *Stable / Verified:* `#059669` (Emerald)

## Typography

The typographic hierarchy couples **Public Sans** for display and headline scales with **Inter** for core functional body copy, data readouts, and UI microcopy.

- **Public Sans** anchors titles and sections with the structural cadence of official public documentation. It establishes clear anchor points during rapid visual scanning.
- **Inter** ensures uniform clarity and tall x-height across diverse literacy levels, small screens, and translated scripts.
- **Line Heights & Spacing:** Line heights remain generous across all scales to prevent crowding and reduce visual fatigue during the review of dense legal documents.

## Layout & Spacing

Layouts follow an orderly 12-column grid system on desktop (`1200px` max content boundary), collapsing to 6 columns on tablet screens and 4 columns on mobile viewports.

- **Trauma-Informed Layout Cadence:** Generous margins protect content from visual overcrowding. Structural groupings enforce spatial chunking: each critical decision area is separated by `space-xl` to prevent decision fatigue.
- **Emergency Affordances:** A sticky, persistent SOS quick-exit header or bottom floating dock occupies an explicit safe zone decoupled from standard grid flow, guaranteeing that panic exits cannot be masked by page contents.
- **Reflow Consistency:** When stepping down to mobile screens, column gutters compress smoothly from `2rem` to `1rem` while preserving 48px touch-target bounds across all interactive triggers.

## Elevation & Depth

To maintain institutional authenticity and perceptual clarity, this design system rejects heavy drop shadows, dynamic 3D elevations, and translucent glassmorphic blurs in favor of **tonal layering and low-contrast borders**.

- **Level 0 (Canvas Base):** Tinted neutral foundation (`#F8FAFC`).
- **Level 1 (Card & Module Layer):** Solid crisp surface (`#FFFFFF`) bound by a structural 1px border (`#CBD5E1`).
- **Level 2 (Active & Focused Modals):** Resting on `#FFFFFF` with a subtle anchoring ambient shadow: `0 4px 12px -2px rgba(15, 23, 42, 0.08)`.
- **Level 3 (Emergency Overlays & Drawers):** High-priority popovers paired with a solid 60% opacity deep navy scrim (`#0F172A`) ensuring focus is isolated entirely on urgent safety procedures.

## Shapes

The design system uses a restrained corner radius model (`roundedness: 1`), providing an exact 4px (`0.25rem`) standard radius on standard components, 8px (`0.5rem`) on primary content cards, and 12px (`0.75rem`) on modal boundaries.

- **Civic Precision:** Crisp, slightly softened corners signal structural security without drifting into juvenile or casual silhouettes.
- **Badges & Micro-labels:** Displayed as precise rectangles with soft corners (`0.25rem`) to maintain legibility and legal authority. Full circular pill geometry is strictly reserved for user-presence indicators and numeric counter tags.

## Components

### Buttons
- **Primary:** Navy (`#1E3A5F`) fill, pure white text, 44px minimum touch height, 1px solid border matching fill. Focus states yield a 2px offset ring in secondary teal (`#0D9488`).
- **Secondary:** Transparent background, `#1E3A5F` text, and a crisp 1.5px border (`#CBD5E1`).
- **Emergency Quick-Exit (SOS):** High-contrast Crimson (`#E11D48`) fill, white uppercase label, prominent close/shield icon. Always rendered with high priority and keyboard shortcut indicators (`Esc 3x`).

### Cards & Surfaces
- Flat, white (`#FFFFFF`) containers framed with a 1px border (`#E2E8F0`). Cards do not elevate on hover; instead, interactive cards subtly shift border tone to `#0D9488` with a 1px increase in outline weight.

### Chips & Badges
- **Status & Risk Indicators:** High-contrast tint-and-text pairings:
  - *Stable:* `#ECFDF5` background with `#047857` text and border.
  - *Elevated:* `#FFFBEB` background with `#B45309` text and border.
  - *Critical:* `#FFF1F2` background with `#BE123C` text and border.
- **Role Badges:** Subdued slate styling (`#F1F5F9` background, `#334155` text) identifying advocate, magistrate, or survivor permissions.

### Input Fields & Controls
- **Form Controls:** 44px minimum vertical height. Thick 1px borders in `#94A3B8` darkening to `#1E3A5F` on focus with an accessible 2px focus ring. Error messages are explicitly announced with `#E11D48` icons and plain-language guidance.
- **Checkboxes & Radios:** High-contrast 20px inputs with bold 2px borders ensuring unmistakable selection states.

### Case Milestone Steppers
- Linear, clear progression track connecting numbered steps. Completed steps feature a `#0D9488` circle with a bold check icon; the current active step displays an authoritative `#1E3A5F` ring with a central pip; pending steps feature neutral `#94A3B8` outlines.

### Data Widgets & Document Drawers
- Clear horizontal rule lines (`#E2E8F0`), tabular figures (`tnum`) for dates and legal reference numbers, and pinned action bars ensuring document security verification is always reachable.
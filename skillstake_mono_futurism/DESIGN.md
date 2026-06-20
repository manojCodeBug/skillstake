---
name: SkillStake Mono-Futurism
colors:
  surface: '#141313'
  surface-dim: '#141313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353434'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#c6c6cf'
  on-secondary: '#2f3037'
  secondary-container: '#45464e'
  on-secondary-container: '#b4b4bd'
  tertiary: '#ffffff'
  on-tertiary: '#2f3131'
  tertiary-container: '#e2e2e2'
  on-tertiary-container: '#636565'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e2e1eb'
  secondary-fixed-dim: '#c6c6cf'
  on-secondary-fixed: '#1a1b22'
  on-secondary-fixed-variant: '#45464e'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#141313'
  on-background: '#e5e2e1'
  surface-variant: '#353434'
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-xl-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style
The design system is engineered for a Web3 productivity environment where clarity and focus are paramount. The brand personality is **minimal, futuristic, and professional**, evoking a sense of calm authority. It draws inspiration from the precision of developer tools like Linear and the structured elegance of Notion.

The aesthetic utilizes a **high-fidelity monochromatic palette** combined with **Glassmorphism**. This creates a layered, "spatial" interface where depth is communicated through frosted panels and subtle luminosity rather than vibrant color. The UI should feel like a sophisticated command center—utilitarian yet premium, prioritizing content and data over decorative elements.

## Colors
The color strategy is strictly monochromatic, relying on value and luminance to create hierarchy. 

- **Dark Mode (Default):** Uses a deep charcoal base (#0A0A0A) to reduce eye strain, with "Elevated" surfaces creating a natural stack. The accent color is pure White, used sparingly for primary actions and critical focus states.
- **Light Mode:** Reverses the logic using an off-white base (#FAFAFA) and pure Black accents.
- **Functional Logic:** Use the `primary` accent color for high-emphasis buttons and active toggle states. `Secondary` text tokens are used for metadata, hints, and deactivated states to maintain a low-noise environment.
- **Transitions:** All color-related properties must transition over 200ms using a `cubic-bezier(0.4, 0, 0.2, 1)` curve to ensure the theme switch feels fluid and premium.

## Typography
This design system utilizes **Inter** for all primary interface elements to ensure maximum legibility and a modern, neutral feel. **Geist** is introduced for labels and technical data, providing a subtle nod to the platform's Web3/technical roots.

- **Headlines:** Use tight letter spacing (-0.02em) and bold weights to create a strong visual anchor.
- **Dashboard Text:** Body text is set slightly smaller (14px) than standard web defaults to allow for the high information density required by productivity dashboards.
- **Hierarchy:** Use weight (Medium vs Regular) and color (Primary vs Secondary) rather than size alone to distinguish between titles and supporting text.

## Layout & Spacing
The layout follows a **structured 12-column fluid grid** for main content areas, but transitions to a **fixed sidebar/fluid stage** model for dashboard views.

- **Rhythm:** A 4px baseline grid governs all spatial relationships.
- **Margins:** Standard page margins are 24px on mobile and 40px on desktop. 
- **Density:** Use "Compact" spacing (8px-12px) within data tables and lists, and "Spacious" spacing (24px-40px) for landing pages and empty states.
- **Breakpoints:**
  - Mobile: < 768px (Single column, hidden sidebar)
  - Tablet: 768px - 1024px (Collapsed sidebar)
  - Desktop: > 1024px (Fixed navigation, 12-column content)

## Elevation & Depth
Elevation is achieved through a combination of **tonal layering** and **glassmorphism**.

1.  **Base Layer:** The background color (#0A0A0A / #FAFAFA).
2.  **Surface Layer:** Modally distinct areas like sidebars use the Surface token.
3.  **Floating Layer (Glass):** Navigation bars and floating panels use a backdrop-filter (`blur(12px)`) with a semi-transparent background (Alpha 0.6) and a 1px "inner glow" border to simulate thickness.
4.  **Shadows:** Use extremely soft, large-radius shadows (0px 8px 32px) with very low opacity (10% in dark, 5% in light) to lift cards off the background without creating "dirty" edges.

## Shapes
The shape language is consistently **Rounded (0.5rem)**, providing a softer, more approachable counterpoint to the monochromatic color palette.

- **Standard (8px):** Buttons, input fields, and small cards.
- **Large (16px):** Main dashboard containers and modal windows.
- **Pill:** Reserved exclusively for status indicators (Chips) and the floating theme switcher.
- **Borders:** All borders should be 1px. Avoid 2px borders except for focus states to maintain the "precision tool" aesthetic.

## Components
- **Buttons:** 
  - *Primary:* Solid Accent color with inverted text. No border.
  - *Secondary:* Transparent background with a 1px Border token.
  - *Ghost:* No background or border; appears on hover.
- **Floating Theme Switcher:** A pill-shaped component fixed at the bottom center. Use a frosted glass background (`backdrop-filter: blur(20px)`) with a sliding selector that moves between "Light," "Dark," and "System" icons.
- **Cards:** Use the Card token background. Borders should be subtle—in dark mode, use a slightly lighter grey than the card itself to create a "rim light" effect.
- **Input Fields:** Minimalist style. No background fill, only a bottom border or a subtle 4nd-tier gray outline. Focus state triggers a 1px solid Primary Accent border.
- **Lists:** Use 1px Border-bottom separators. Ensure 12px vertical padding for touch-target safety and legibility.
- **Chips:** Small, pill-shaped, using the Secondary Text color for the background at 10% opacity.
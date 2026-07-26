---
name: Premium FinTech Narrative
colors:
  surface: '#0f131d'
  surface-dim: '#0f131d'
  surface-bright: '#353944'
  surface-container-lowest: '#0a0e18'
  surface-container-low: '#171b26'
  surface-container: '#1c1f2a'
  surface-container-high: '#262a35'
  surface-container-highest: '#313540'
  on-surface: '#dfe2f1'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#dfe2f1'
  inverse-on-surface: '#2c303b'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#ffb95f'
  on-secondary: '#472a00'
  secondary-container: '#ee9800'
  on-secondary-container: '#5b3800'
  tertiary: '#ffb3ad'
  on-tertiary: '#68000a'
  tertiary-container: '#ff7a73'
  on-tertiary-container: '#79000e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#0f131d'
  on-background: '#dfe2f1'
  surface-variant: '#313540'
typography:
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-display:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 24px
  gutter: 16px
  panel-padding: 20px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is engineered for a high-stakes financial trading environment, prioritizing speed, clarity, and a sense of institutional authority. The brand personality is "Technological Sophistication"—it is precise, elite, and forward-looking. 

The aesthetic leans heavily into **Modern Glassmorphism** blended with **Minimalism**. By utilizing deep slate foundations and translucent layering, the interface creates a multi-dimensional workspace that feels like a high-end physical trading desk. The emotional response should be one of "Controlled Power": the user feels equipped with professional-grade AI tools that are accessible yet uncompromisingly powerful.

## Colors

The palette is anchored by a deep slate background to minimize eye strain during long trading sessions. 

- **Primary (Neon Emerald):** Reserved strictly for bullish movements, "GÜÇLÜ AL" (Strong Buy) signals, and successful growth indicators.
- **Secondary (Amber Gold):** Used for AI-driven insights, IPO highlights, and premium feature callouts.
- **Tertiary (Ruby Red):** Dedicated to bearish trends, sell signals, and critical risk alerts.
- **Surface:** A lighter slate used for paneling, designed to be used with varying levels of opacity (60-80%) and backdrop blur (20px-40px).

## Typography

This design system uses a dual-font strategy. **Outfit** provides a geometric, modern feel for headings and brand moments, while **Inter** is utilized for its exceptional legibility in data-dense environments.

- **Financial Data:** All numerical figures (prices, percentages) must use `data-display` or `body-lg` with `tabular-nums` enabled in CSS to ensure vertical alignment in ticker lists.
- **Labels:** Use `label-caps` for table headers and metadata titles to create a clear visual hierarchy against live data.
- **Turkish Character Support:** Ensure both fonts are loaded with full Latin-Extended glyph sets to support characters like "Ğ, Ü, Ş, İ, Ö, Ç".

## Layout & Spacing

The system employs a **Fluid Grid** for dashboard views and a **Fixed Margin** approach for mobile. 

- **Desktop:** 12-column grid with 24px gutters. Sidebars should be fixed (280px) while the main trading terminal expands.
- **Mobile:** 4-column grid with 16px margins.
- **Spacing Logic:** Use 8px base units. Interactive elements like buttons and input fields must maintain a minimum height of 48px on mobile for accessibility, despite the compact "pro" aesthetic.

## Elevation & Depth

Depth is achieved through **Glassmorphism** rather than traditional drop shadows.

- **Level 1 (Base):** Background color #0B0F19.
- **Level 2 (Panels):** #161E2E at 70% opacity, Backdrop Blur 30px, and a 1px border at 10% white opacity.
- **Level 3 (Modals/Popovers):** #1C2636 at 90% opacity, Backdrop Blur 60px, with a subtle outer glow using the primary color at 5% opacity for "active" AI insights.

## Shapes

The design system utilizes **Rounded** corners to soften the technical data and make the interface feel modern and premium.

- **Standard Elements:** 0.5rem (8px) for cards, buttons, and inputs.
- **Large Elements:** 1rem (16px) for main dashboard containers and modal sheets.
- **Status Badges:** Fully pill-shaped (rounded-full) to distinguish them from interactive buttons.

## Components

### Status Badges (Sinyaller)
- **GÜÇLÜ AL:** Neon Emerald background (20% opacity), Neon Emerald text, bold weight.
- **AL / SAT:** Subtle borders with respective Green/Red text.
- **IPO / YENİ:** Amber Gold background, black text for maximum punch.

### Glass Cards
Every card must have a 1px "Inner Stroke" (linear gradient: top-left white 15%, bottom-right white 0%) to simulate light hitting the edge of a glass pane.

### Interactive Tickers
Horizontal scrolling areas at the top of the UI. Price changes should animate with a brief background flash (Green for up, Red for down) before settling back to transparent.

### Bottom Navigation (Mobile)
A high-gloss bar with 40px backdrop blur. Icons should use a "dual-tone" style, where the active state glows with the Primary Neon Emerald.

### Inputs & Search
Fields are dark and recessed. On focus, the 1px border transitions from 10% white to 100% Primary Color, with a subtle 4px outer glow.
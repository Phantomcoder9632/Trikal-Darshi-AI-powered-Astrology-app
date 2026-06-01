---
name: Celestial Ledger
colors:
  surface: '#f9f9f6'
  surface-dim: '#dadad7'
  surface-bright: '#f9f9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f1'
  surface-container: '#eeeeeb'
  surface-container-high: '#e8e8e5'
  surface-container-highest: '#e2e3e0'
  on-surface: '#1a1c1b'
  on-surface-variant: '#4f4536'
  inverse-surface: '#2f312f'
  inverse-on-surface: '#f1f1ee'
  outline: '#817563'
  outline-variant: '#d3c4b0'
  surface-tint: '#7c5800'
  primary: '#7c5800'
  on-primary: '#ffffff'
  primary-container: '#c9952a'
  on-primary-container: '#483100'
  inverse-primary: '#f6bd50'
  secondary: '#5d5c73'
  on-secondary: '#ffffff'
  secondary-container: '#e2e0fb'
  on-secondary-container: '#636279'
  tertiary: '#735c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#bd9a22'
  on-tertiary-container: '#423300'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdea8'
  primary-fixed-dim: '#f6bd50'
  on-primary-fixed: '#271900'
  on-primary-fixed-variant: '#5e4200'
  secondary-fixed: '#e2e0fb'
  secondary-fixed-dim: '#c6c4de'
  on-secondary-fixed: '#1a1a2d'
  on-secondary-fixed-variant: '#45455a'
  tertiary-fixed: '#ffe088'
  tertiary-fixed-dim: '#e9c349'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#574500'
  background: '#f9f9f6'
  on-background: '#1a1c1b'
  surface-variant: '#e2e3e0'
typography:
  wordmark:
    fontFamily: Cinzel Decorative
    fontSize: 22px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: 0.15em
  headline-lg:
    fontFamily: Cinzel
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Cinzel
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Cinzel
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  accent-italic:
    fontFamily: Crimson Text
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max-width: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The brand personality of the design system bridges the gap between ancient mathematical precision and modern financial authority. It evokes a sense of "enlightened wealth"—a calm, meditative space where complex data feels as clear as a star-filled sky. The emotional response is one of trust, serenity, and high-status exclusivity.

The design style is **Modern Minimalism with Glassmorphic accents**. It utilizes heavy whitespace to allow the luxury typography and gold highlights to breathe. The interface is structured with architectural rigor, incorporating subtle sacred geometry (3% opacity Yantra patterns) into background layers to create a sense of depth and heritage without distracting from the functional data.

## Colors
The color strategy employs a restricted, high-contrast palette to ensure "Gold" remains a signal of significance rather than a decorative flourish.

### Light Mode
- **Background:** Warm Ivory (#FAFAF7) provides a softer, more organic feel than pure white.
- **Surface:** Pure White (#FFFFFF) for cards and containers to create clear separation.
- **Highlights:** Temple Gold (#C9952A) is reserved for active states, key data points, and primary actions.

### Dark Mode
- **Background:** Deep Space (#0F0F1A) serves as the infinite canvas.
- **Surface:** Deep Indigo (#151528) defines the UI layers.
- **Highlights:** Bright Gold (#D4AF37) ensures visibility and a premium glow against the darker depths.

Gold is strictly applied to: Brand wordmarks, active navigation states, primary Call-to-Actions (CTAs), critical numerical values (like portfolio totals), and section headings.

## Typography
The typography in this design system balances the editorial weight of a luxury publication with the utilitarian clarity of a fintech dashboard.

- **Cinzel Decorative:** Used exclusively for brand identity and the primary wordmark.
- **Cinzel:** Used for all headings. It provides the "Ancient Observatory" aesthetic—authoritative, classic, and high-contrast.
- **Inter:** The workhorse for all body text, financial data, and UI labels. It ensures maximum readability for complex information.
- **Crimson Text (Italic):** Used for Sanskrit terms, subtle annotations, and "insight" quotes. It adds a scholarly, human touch to the precise interface.

Numerical data should always use Inter with tabular lining figures to ensure vertical alignment in charts and lists.

## Elevation & Depth
Elevation is communicated through **Tonal Layering and Glassmorphism** rather than heavy shadows.

- **Surface Levels:** In Light Mode, White cards sit on an Ivory background with a very fine 1px border (#E5E5E0). In Dark Mode, Indigo surfaces (#151528) sit on the Deep Space background.
- **Glassmorphism:** Navigation bars and modals use a 20px backdrop blur with a 10% opacity white tint to create a "frosted lens" effect, reminiscent of observatory glass.
- **Shadows:** Only used for floating elements (like dropdowns). These are ultra-diffused, using the Secondary color at 5% opacity, creating a subtle lift rather than a dark silhouette.
- **Background Texture:** Yantra patterns are applied as fixed background SVGs at 3% opacity. They should remain static as the user scrolls, creating a "window" effect.

## Shapes
The shape language is **Soft (0.25rem)**. This provides a professional and architectural feel. Sharp corners are avoided to maintain the "Calm" personality, but high roundedness/pill shapes are also avoided to ensure the system feels "Authoritative" and mature.

- **Small Components (Buttons, Inputs):** 4px (0.25rem) radius.
- **Medium Components (Cards, Modals):** 8px (0.5rem) radius.
- **Large Components (Sections):** 12px (0.75rem) radius.

## Components
Consistent component styling ensures the luxury-finance aesthetic is maintained across all interactions.

- **Buttons:** 
  - *Primary:* Solid Temple Gold with white/indigo text. Subtle hover scale (1.02x) and a soft gold outer shimmer on click.
  - *Secondary:* Outlined in Temple Gold with a 1px stroke.
- **Input Fields:** Minimalist design with only a bottom border in neutral grey. The border turns Gold on focus, and the label floats upward using Inter Label-sm.
- **Chips/Badges:** Used for status. These have a 3% Gold background tint and Gold text.
- **Cards:** White (light) or Indigo (dark) backgrounds with a 1px neutral stroke. Hovering a card triggers a subtle shimmer effect that moves across the surface.
- **Lists:** High-density financial lists use Inter. Alternating rows use a subtle Ivory/Indigo tint to maintain legibility across large data sets.
- **Sacred Geometry Dividers:** Instead of simple lines, use a thin horizontal line that terminates in a small gold geometric dot or diamond in the center.
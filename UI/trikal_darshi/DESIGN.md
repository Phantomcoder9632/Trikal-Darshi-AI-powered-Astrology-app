---
name: Trikal Darshi
colors:
  surface: '#12121f'
  surface-dim: '#12121f'
  surface-bright: '#383846'
  surface-container-lowest: '#0d0d19'
  surface-container-low: '#1a1a27'
  surface-container: '#1f1e2b'
  surface-container-high: '#292936'
  surface-container-highest: '#343341'
  on-surface: '#e3e0f3'
  on-surface-variant: '#d0c5af'
  inverse-surface: '#e3e0f3'
  inverse-on-surface: '#2f2f3d'
  outline: '#99907c'
  outline-variant: '#4d4635'
  surface-tint: '#e9c349'
  primary: '#f2ca50'
  on-primary: '#3c2f00'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#735c00'
  secondary: '#ffb4a8'
  on-secondary: '#690000'
  secondary-container: '#920703'
  on-secondary-container: '#ff9a8a'
  tertiary: '#e3c1ff'
  on-tertiary: '#4a0080'
  tertiary-container: '#d09dff'
  on-tertiary-container: '#602495'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#ffdad4'
  secondary-fixed-dim: '#ffb4a8'
  on-secondary-fixed: '#410000'
  on-secondary-fixed-variant: '#920703'
  tertiary-fixed: '#f0dbff'
  tertiary-fixed-dim: '#deb7ff'
  on-tertiary-fixed: '#2c0050'
  on-tertiary-fixed-variant: '#622698'
  background: '#12121f'
  on-background: '#e3e0f3'
  surface-variant: '#343341'
typography:
  display-lg:
    fontFamily: Cinzel
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: 0.05em
  display-md:
    fontFamily: Cinzel
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: 0.02em
  headline-lg:
    fontFamily: Cinzel
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Cinzel
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
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
  accent-term:
    fontFamily: Crimson Text
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-margin: 24px
  gutter: 16px
  card-padding: 20px
---

## Brand & Style
The design system embodies the concept of "Celestial Wisdom through a Modern Lens." It draws inspiration from Jantar Mantar’s geometric precision and the silent, infinite depth of the midnight sky. The aesthetic is **Premium Mystical**, blending a modern dark-mode interface with the tactile richness of ancient Vedic manuscripts.

The user experience should feel like stepping into a private observatory. It avoids the "fortune teller" clichés, opting instead for a scholarly, serene, and authoritative atmosphere. The style utilizes **Glassmorphism** for depth and **Minimalism** for clarity, ensuring that complex astrological data remains digestible while feeling spiritually significant.

## Colors
The palette is rooted in the "Deep Space" (#050510) and "Deep Indigo" (#0D0D2B) spectrum to reduce eye strain and provide a canvas for glowing elements. 

- **Temple Gold (#D4AF37):** Used sparingly for sacred markers, active states, and primary CTAs. It represents the sun and enlightenment.
- **Bengal Red (#8B0000):** Used for Mangal (Mars) influences or subtle warnings, adding a grounded, traditional energy.
- **Deep Violet (#4A0080):** Represents intuition and Rahu/Ketu influences, used for secondary accents and depth-giving gradients.
- **Moonlight Silver (#C0C0C0):** The standard secondary text color to ensure soft legibility without the harshness of pure white.

## Typography
The typography system uses a tri-font approach to balance authority and readability.

- **Cinzel (Display/Headers):** Used for titles and significant astrological transitions. Its stone-carved, Roman-inspired proportions evoke the permanence of the stars.
- **Inter (Body):** Handles all functional data, descriptions, and UI controls. It provides a clean, modern contrast to the decorative headers.
- **Crimson Text (Accents):** Reserved for Sanskrit terminology, planet names (Grahas), and quotes. Its classic serif nature provides a warm, human touch to the digital experience.

## Layout & Spacing
The layout follows a **12-column fixed grid** on desktop (1200px max-width) and a **4-column fluid grid** on mobile. 

Spacing is generous to maintain a "Calm" emotional response. Use a vertical rhythm based on 8px increments. Large sections of content should be separated by "Stellar Dividers"—fine 1px lines that use a linear gradient: `transparent, #1E1E4A, transparent`. 

On mobile, reduce top and bottom margins of headlines to keep the focus on the data visualization (Kundli charts).

## Elevation & Depth
Depth is created through **Tonal Layering** and **Subtle Blurs** rather than heavy shadows.

- **Level 0 (Background):** #050510 (Deep Space).
- **Level 1 (Cards/Containers):** #111130 with a 1px border of #1E1E4A.
- **Level 2 (Popovers/Overlays):** #16163D with a subtle outer glow using `rgba(212,175,55,0.08)`.

Apply a `backdrop-filter: blur(12px)` to any floating navigation bars or modal overlays to simulate the "Midnight Mist" effect.

## Shapes
The design system uses a "Soft" geometric approach. While the universe is fluid, the science of Jyotish is precise. 

- **Containers:** 4px to 8px corner radius (Soft) to maintain a professional, architectural feel.
- **Interactive Elements:** Buttons use a slightly higher radius (12px) but never a full pill-shape, preserving the structured aesthetic.
- **Data Visualization:** Kundli charts should use perfectly sharp 90-degree internal intersections to mimic traditional hand-drawn charts, while the outer container remains slightly rounded.

## Components

### Buttons & Controls
- **Primary Button:** Solid #D4AF37 with #050510 text. High-contrast and authoritative.
- **Secondary Button:** Ghost style with #D4AF37 border and text. 
- **Selection Chips:** Use a deep indigo background with a subtle gold glow when active.

### Astrological Cards
- **Horoscope Card:** Features a Cinzel header and a subtle top-right gradient glow corresponding to the planet of the day (e.g., Red for Mars/Tuesday).
- **Kundli (Birth Chart):** Rendered with #F0D060 lines on a #0D0D2B background. Planet positions (Grahas) are set in Crimson Text.

### Input Fields
- **Search/Date Entry:** Dark background (#050510) with a 1px #1E1E4A border. On focus, the border transitions to #D4AF37 with a faint outer gold glow.

### Numerology Reports
- Numbers are displayed in large Cinzel weights, centered within circular gold-rimmed containers to mimic ancient coins or celestial bodies.
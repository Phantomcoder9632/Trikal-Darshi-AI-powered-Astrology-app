# Frontend Redesign Prompt — Trikal Darshi

*Copy the entire content below into Google Stitch, pointed at the project folder D:\AstrologyApp.*

---

## Step 0 — Ground yourself in the real project first

### Existing Frontend Pages & Components (read all files in D:\AstrologyApp\astrology-frontend\src/)

#### Page: HomePage.jsx (Landing/Observatory)
- **Design**: Animated starfield canvas (`StarCanvas`), Yantra SVG ornament, two-column layout
- **Left column**: Brand + feature pills (Divisional Charts, AI Streaming, Remedy Tripath, 10+ Life Sections)
- **Right column**: Login card (guest) or welcome view (logged-in user)
- **Form fields** (birth details):
  - full_name (label: "Full Name")
  - date_of_birth (label: "Date of Birth")
  - time_of_birth (label: "Time of Birth")
  - birth_time_confidence (labels: "Exact", "Approximate", "Unknown")
  - city_of_birth (label: "Place of Birth")
  - current_city (label: "Current City")
  - language selection (labels: "English", "Hindi", "Bengali")
- **Feature pills text**: "Divisional Charts", "AI Streaming", "Remedy Tripath", "10+ Life Sections"
- **Stats section text**: "16+ Divisional Charts", "10 Life Sections", "3 Wisdom Streams", "∞ Cosmic Insights"
- **Navigation links**: "Begin Reading", "See Features", "AI Astrologer"
- **Testimonials**: 3 sample quotes with author names
- **CTAs**: "Begin Reading" button, feature overview links
- **Form submission**: POST to `/dashboard/{chart_id}` via `generateChart()` API

#### Page: DashboardPage.jsx (Protected dashboard — 11 tabs)
- **Requires authentication** (Google OAuth or email/password)
- **11 tab navigation** with exact labels:
  1. "Lagna & Soul Blueprint"
  2. "Lal Kitab Analysis"
  3. "Numerology Matrix"
  4. "Career & Dashamsha D10"
  5. "Wealth & Abundance D4"
  6. "Love Marriage & Navamsha D9"
  7. "Health & Vitality D30"
  8. "Remedies Tripath System"
  9. "Progeny Lineage & Saptamsha D7"
  10. "Gochar Current Transits"
  11. "Education & Intelligence"
- **Chart sidebar** with divisional chart toggle buttons: "D1", "D9", "D10", "D4", "D7", "D30", "chandra", "surya", "gochar"
- **Cosmic summary** with 5 key lines (exact labels from code):
  - "Lagna: [sign]"
  - "Moon in [sign] [nakshatra]"
  - "Atmakaraka: [planet]"
  - "Dasha: [dasha name]"
  - "Bhagyank: [number]"
- **Interpretation streaming** via SSE (GET /interpret/{chartId}/{tabNumber})
- **Background pre-generation** progress polling for 11 tabs
- **Remedy cards** shown on Tab 8 (3 tracks: Vedic, Lal Kitab, Numerology)
- **Vedic Report** generation (all 11 chapters)
- **Theme switcher** with 4 themes (existing: Vedic Gold, Midnight Cosmic, Nebula Indigo, Solar Flare — redesign keeps only light pastel theme)
- **Profile drawer** with:
  - Personal details (name, DOB, time, city)
  - Saved charts list
  - Logout button
- **Birth details edit modal** with same form fields as HomePage

#### Page: ChatPage.jsx (AI chat interface)
- **Theme**: Dark (#0a0b0e to #12141f) — redesign will convert to light pastel
- **Categorized quick prompts** (horizontal scroll when < 3 messages):
  - "Career & D10"
  - "Love & Marriage"
  - "Wealth & Assets"
  - "Remedies & Farmaan"
  - "Transits (Gochar)"
- **Chat history** persistence (localStorage/API)
- **Chart-linked context** — when chartId is provided, AI gets personalized context
- **General AI consultation** mode (no chart needed)
- **Sidebar** with saved charts switcher and active chart profile widget
- **Suggested questions** horizontal scroll behavior
- **Input composer**: Enter to send, Shift+Enter for new line
- **Disclaimer**: "Trikal AI synthesizes Parashari Vedic Jyotish, Lal Kitab Farmaan & Numerology. Predictions are for guidance."

#### Component: AskAI.jsx (Slide-over AI chat guide)
- **Toggleable** from homepage
- **Quick prompts by category**:
  - Career/D10 prompts
  - Relationship prompts
  - Money/Wealth prompts
  - Remedies prompts
- **Welcome messages** personalized with:
  - User name
  - DOB
  - City
  - Rising sign
  - Current dasha
- **Chat history** from sessionStorage (guests) or API (authenticated)
- **Message formatting**: markdown-like bold, lists, headers
- **Auto-show prompt** after 10s and every 30s if chat is closed

#### Component: ChartSidebar.jsx (Divisional chart viewer)
- **Toggle buttons** for: D1, D9, D10, D4, D7, D30, chandra, surya, gochar
- Shows current divisional chart selection

#### Component: TabNavigation.jsx (11-tab navigation + Vedic report)
- **11 tab categories** (same labels as DashboardPage tabs 1-11)
- **Vedic report generation** button/link
- Category toggle states

#### Component: CosmicSummary.jsx (5-line chart summary)
- "Lagna: [zodiac sign]"
- "Moon in [zodiac sign] [nakshatra]"
- "Atmakaraka: [planet name]"
- "Dasha: [dasha period]"
- "Bhagyank: [1-9]"

#### Component: RemedyCards.jsx (Remedy tripath system)
- **3 remedy tracks**:
  - Vedic remedies
  - Lal Kitab Farmaan
  - Numerology remedies
- Shows remedy items with titles and descriptions

#### Component: ProfileCard.jsx (User profile with birth details)
- Displays: name, birth details (DOB, time, city)
- Shows dasha information
- "Edit birth details" CTA
- Logout button

#### Component: PlanetTable.jsx (Planetary positions with dignity badges)
- Table of planetary positions
- Dignity badges (strength indicators)
- Exaltation/debilitation status

#### Component: LanguageSelect.jsx (Language dropdown with SVG flags)
- Flags for: English, Hindi, Bengali
- Language persistence via localStorage

#### Component: LanguageWelcomeModal.jsx (First-visit language selection)
- Modal appears on first visit
- Asks user to select preferred language
- Options: English, Hindi, Bengali

#### Component: DivisionalChart.jsx (North Indian SVG chart renderer)
- Renders North Indian style birth chart SVG
- Shows planetary positions in chart format

#### Component: formatters.jsx (Text parsing/format utilities)
- Utility functions for formatting chart data, dates, etc.

#### Context: AuthContext.jsx (Auth state management)
- Google OAuth login flow
- Email/password login/register
- Token stored in localStorage
- Protected route enforcement

#### Service: api.js (14 API functions)
- `generateChart()` — POST birth details, returns chart_id
- `streamInterpretation()` — GET /interpret/{chartId}/{tabNumber} (SSE)
- `loginGoogle()` — Google OAuth authentication
- `loginEmail()` — Email/password authentication
- `registerEmail()` — New user registration
- `getChartData()` — Fetch chart by ID
- `getUserCharts()` — List user's saved charts
- `getInterpretation()` — Fetch interpretation text
- `getRemedyText()` — Fetch remedy text
- `uploadRemedyContent()` — Upload remedy documents
- `checkAuth()` — Authentication status check
- `logout()` — Clear auth token

### Design Tokens (from src/index.css — Tailwind v4 / CSS custom properties)

**Color Variables (24 tokens):**
- `--color-primary: #7c5800` (deep gold — **REPLACE in redesign**)
- `--color-primary-container: #c9952a` (light gold — **REPLACE in redesign**)
- `--color-background: #f9f9f6` (off-white — **keep, light theme only**)
- `--color-on-background: #1a1c1b` (dark charcoal — **keep, for body text**)
- `--color-surface: #f9f9f6`
- `--color-surface-dim: #dadad7`
- `--color-surface-bright: #f9f9f6`
- `--color-surface-container-lowest: #ffffff`
- `--color-surface-container-low: #f4f4f1`
- `--color-surface-container: #eeeeeb`
- `--color-surface-container-high: #e8e8e5`
- `--color-surface-container-highest: #e2e3e0`
- `--color-on-surface: #1a1c1b`
- `--color-on-surface-variant: #4f4536`
- `--color-secondary: #5d5c73` (slate/indigo — **REPLACE in redesign**)
- `--color-on-secondary: #ffffff`
- `--color-tertiary: #735c00` (amber-brown — **REPLACE in redesign**)
- `--color-on-tertiary: #ffffff`
- `--color-error: #ba1a1a` (red — keep for errors only)
- `--color-on-error: #ffffff`
- `--color-error-container: #ffdad6`
- `--color-on-error-container: #93000a`

**Font Variables (7 tokens):**
- `--font-headline-lg: "Cinzel", serif` (headlines — **keep, modern serif**)
- `--font-headline-md: "Cinzel", serif` (headings — **keep**)
- `--font-wordmark: "Cinzel Decorative", serif` (logo/brand — **consider replacement, may be too decorative**)
- `--font-body-lg: "Inter", sans-serif` (body text — **keep**)
- `--font-body-md: "Inter", sans-serif`
- `--font-label-sm: "Inter", sans-serif`
- `--font-accent-italic: "Crimson Text", serif` (blockquotes/emphasis — **keep optional**)

**Other CSS:**
- `--yantra-pattern`: SVG data URL for yantra pattern background
- Starfield animation variables
- Dashboard layout classes
- Planet table dignity badge styles
- AI prose formatting
- Remedy card formatting

### i18n (3 languages: English, Hindi, Bengali)
- `src/locales/en.json` — 533+ translation keys
- `src/locales/hi.json` — 533+ translation keys
- `src/locales/bn.json` — 533+ translation keys
- `src/i18n.js` — i18next configuration

### Key API Endpoints (from backend routes)
- `GET /chart/{chart_id}` — Retrieve birth chart
- `POST /chart/generate` — Generate chart from birth details
- `GET /interpret/{chartId}/{tabNumber}` — Streaming interpretation
- `POST /auth/google` — Google OAuth login
- `POST /auth/login` — Email/password login
- `POST /auth/register` — Email registration
- `GET /progress/{id}` — Progress tracking (may not be used in frontend)

---

## Step 1 — Design Brief (Condensed from Prompt)

### Aesthetic Direction: Premium Editorial
- **Confident, large-scale typography** — headlines carry visual weight
- **Generous whitespace** — content breathes, nothing feels cramped
- **Astrology motifs used sparingly** as accents only (glyphs, chart dividers, constellation lines) — never wallpaper
- Layout reads like a well-art-directed magazine feature or premium wellness brand site

### Color Direction: Cool Cosmic Pastels, Light Theme Only
- **Base**: near-soft ivory/off-white (`#f9f9f6` kept from existing, but palette shifted)
- **Accents**: soft lavender, periwinkle, dawn-indigo gradients (pre-dawn sky, not night sky)
- **Explicitly excluded**: gold, maroon, heavy saturated colors
- **Accessibility**: WCAG AA contrast required (4.5:1 body text, 3:1 large headlines)
- **Text color**: darker ink tone (deep cosmic navy/charcoal), NOT pure black
- **Pastel usage**: lightest pastels for backgrounds/decoration only

### Typography
- **Headlines**: modern serif or high-contrast display serif (Cinzel kept from existing)
- **Body**: clean, highly legible sans-serif (Inter kept from existing)
- **Accent typeface**: Devanagari-influenced, used ONLY for section dividers, small labels, decorative numerals — NEVER body text

### Motion: Full Immersive Animation (Layered Correctly)
- **Content layer** (text, cards, forms): calm, editorial, always readable — NO motion on actual text
- **Atmosphere layer** (behind content):
  - Subtle drifting starfield/particle system as ambient background
  - Gentle parallax on scroll between sections
  - Smooth animated transitions between page sections
  - Cursor-reactive particle movement in hero/landing areas
- **Motion rules**:
  - `prefers-reduced-motion` fallback disables non-essential motion
  - Degrades gracefully on lower-end devices/mobile
  - Lighter-weight fallback: fewer particles, simpler gradients (NOT same effect scaled down)
- **Motion intent**: Living, breathing cosmic backdrop BEHIND calm editorial layout — never competing with content

### Tone/Weight Guardrail
- Carries weight of classical astrology — no cutesy, cartoonish, or whimsical elements
- Symbolism: linear, geometric, precise (line-art chart wheels, precise constellation connections, clean planetary glyphs)
- NO real named public figures, NO zodiac sign cartoon mascots
- NO gold/maroon/saturated colors (old theme being replaced)

---

## Step 2 — Deliverables

1. **Full-page mockups** (in design format Stitch can generate):
   - Landing/homepage (with birth form and starfield background)
   - Chart/report generation flow (step-by-step, showing form → chart save → interpretation)
   - Individual interpretation section view (one of the 11 tabs)
   - AskAI chat interface (light pastel theme, not dark)
   - Account/history page (user's saved charts list)

2. **Component-level style guide**:
   - **Color tokens** (with WCAG contrast ratios noted for every pairing)
   - **Typography scale** (headline sizes, body text, accent typeface usage)
   - **Spacing scale** (vertical/horizontal rhythm values)
   - **Motion timing/easing values** (consistent animations site-wide)

3. **Written rationale** (short explanatory text):
   - How each major design decision ties back to the brief
   - Makes it easy to spot if something drifted from the vision

---

## Self-Verification Checklist (before finishing)

- [ ] **Every page/section shown is based on a real, existing feature** in the codebase — nothing invented from scratch
- [ ] **Light theme only**, no dark mode variant produced
- [ ] **Every text/background color pairing passes WCAG AA contrast** (4.5:1 body, 3:1 large text)
- [ ] **Astrology motifs appear as accents**, NOT as the dominant visual language
- [ ] **Ambient animation layer is distinct from content layer** — text and cards remain fully legible during motion
- [ ] **`prefers-reduced-motion` fallback is specified** for all non-essential animations
- [ ] **Lighter-weight mobile/low-end-device version of ambient animation is specified** (fewer particles, simpler gradients)
- [ ] **Nothing reads as cartoonish, cutesy, or tonally inconsistent** with a serious astrology platform
- [ ] **No real named public figures**, NO zodiac sign cartoon mascots
- [ ] **Pastel-on-white palettes**: lightest pastels used only for backgrounds/decoration, darker ink tone for readable text

---

## Real Copy/Labels from Codebase (for mockup content — NO lorem ipsum)

**HomePage:**
- "Full Name", "Date of Birth", "Time of Birth", "Place of Birth", "Current City"
- "Exact", "Approximate", "Unknown" (birth_time_confidence options)
- "Begin Reading", "See Features", "AI Astrologer"
- "16+ Divisional Charts", "10 Life Sections", "3 Wisdom Streams", "∞ Cosmic Insights"
- Testimonial quote placeholders from existing 3 quotes

**Dashboard (11 tabs):**
- "Lagna & Soul Blueprint", "Lal Kitab Analysis", "Numerology Matrix"
- "Career & Dashamsha D10", "Wealth & Abundance D4", "Love Marriage & Navamsha D9"
- "Health & Vitality D30", "Remedies Tripath System", "Progeny Lineage & Saptamsha D7"
- "Gochar Current Transits", "Education & Intelligence"

**Cosmic Summary (5 lines):**
- "Lagna: ", "Moon in ", "Atmakaraka: ", "Dasha: ", "Bhagyank: "

**Quick Prompts (ChatPage):**
- "Career & D10", "Love & Marriage", "Wealth & Assets", "Remedies & Farmaan", "Transits (Gochar)"

**AskAI Welcome Messages:**
- Personalized: "Welcome back, [name]! Based on your DOB [date], birth city [city], rising sign [sign], and current dasha [dasha]..."

**Disclaimer:**
- "Trikal AI synthesizes Parashari Vedic Jyotish, Lal Kitab Farmaan & Numerology. Predictions are for guidance."

**Profile Card:**
- Personal details display, "Edit birth details", Logout

**Feature Pill Text:**
- "Divisional Charts", "AI Streaming", "Remedy Tripath", "10+ Life Sections"

**Theme Switcher (existing, keep only light pastel):**
- Vedic Gold, Midnight Cosmic, Nebula Indigo, Solar Flare → **REPLACE with light pastel variants**

---

## Color Palette Mapping (Existing → Redesign)

| Existing Token | Existing Value | Redesign Direction |
|---|---|---|
| `--color-background` | `#f9f9f6` (off-white) | Keep as near-ivory base, soften slightly |
| `--color-on-background` | `#1a1c1b` (dark charcoal) | Keep for body text |
| `--color-primary` | `#7c5800` (deep gold) | **Replace with soft lavender** |
| `--color-primary-container` | `#c9952a` (light gold) | **Replace with lighter lavender** |
| `--color-secondary` | `#5d5c73` (slate/indigo) | **Replace with periwinkle** |
| `--color-tertiary` | `#735c00` (amber-brown) | **Replace with dawn-indigo gradient** |
| All surface variants | Keep structure, lighten values | |
| `--color-error` | `#ba1a1a` (red) | Keep for error states only |

**New accent colors to introduce:**
- Soft lavender (for primary actions/gradients)
- Periwinkle (secondary actions)
- Dawn-indigo gradient (for backgrounds/accents)
- Deep cosmic navy or charcoal (1-2 tones darker than `#1a1c1b`) for body text

**All new colors must have WCAG AA contrast ratios documented.**

---
*End of prompt. Google Stitch should be pointed at D:\AstrologyApp with this entire markdown content attached.*
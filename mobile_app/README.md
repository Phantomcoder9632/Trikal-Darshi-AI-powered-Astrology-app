# 📱 Trikal Darshi — Mobile App

Native-feeling **React Native (Expo SDK 54) + TypeScript** companion app for **Trikal Darshi**, the Vedic astrology platform. Replicates the web app's manuscript-parchment aesthetic and talks to the same FastAPI backend.

---

## ✨ Screens & Flow

```
Launch ──▶ Splash (Navagraha Convergence — 9 grahas orbiting a golden bindu)
      ──▶ Login / Register (parchment glass card, gold sheen, Google sign-in)
      ──▶ Profile   (identity card · Kundali vault · Calculate New Kundali · Today's Sky)
      ──▶ Dashboard (cosmic summary · Kundali chart · 11 streaming chapters)
      ├─▶ Today     (live panchanga · nine grahas · For Your Chart · AI daily reading)
      └─▶ Ask AI Jyotishi (streaming chat with per-chart history)
```

| Screen | Highlights |
| :--- | :--- |
| **Splash** | **Navagraha Convergence**: nine graha sigils (Su Ma Bu Gu Sk Sa Ra Ke) orbit a glowing golden bindu at classical speeds — Moon fastest, Saturn slowest, Rahu–Ketu retrograde — between two counter-rotating dashed zodiac rings; a seven-star constellation lights up as the convergence completes; rotating Vedic status lines |
| **Login** | Website-matching parchment theme: yantra grid + warm starfield, glass card with gold sheen sweep, Sign In ⇄ Create Profile toggle, **Continue with Google** (browser flow → backend `/auth/google`), password policy (8+ chars, upper/lower/digit), show/hide password, language picker |
| **Profile** | Mirrors the website: identity card with golden corner accents, "Calculate New Kundali" bottom-sheet form (name, DOB, TOB, confidence, cities, language), **Today's Sky** shortcut, searchable/filterable chart vault, per-chart key vectors (Lagna, Nakshatra, Atmakaraka, Mahadasha), delete with confirm |
| **Dashboard** | 13-chip cosmic summary grid, **North-Indian Kundali SVG chart** with dignity coloring and **tappable planets** (detail popup: sign, degree °′″, nakshatra + lord, motion, dignity, Sanskrit name, lore), 9-varga selector, 11 chapter tabs that **stream AI prose in real time** with status dots, pull-to-refresh, background pre-generation progress pill, honest offline banner |
| **Today** | **Live Panchanga** (tithi, nakshatra + pada, yoga, karana, Moon phase, weekday lord — computed on-device from the `/chart/gochar` Swiss-Ephemeris endpoint), **The Nine Today** sidereal positions with retrograde marks, and **For Your Chart**: transit Moon/Jupiter/Saturn mapped to your natal houses + one-tap streaming AI daily reading |
| **Chat** | AI Jyotishi with token streaming, typing indicator, quick prompts, persisted per-chart history |

---

## 📳 Haptics & Micro-interactions

A shared tactile vocabulary lives in `src/services/haptics.ts`:

| Action | Feel |
| :--- | :--- |
| Tab / varga / planet / selection taps | Light tick or selection spin |
| Primary buttons (wired once in `PrimaryButton`) | Medium thud |
| Login success, chapter finished streaming | Success haptic |
| Errors, offline fallback | Warning buzz |

Raw API/network errors are translated into kind human sentences by
`src/services/errors.ts` ("The observatory may be waking up…") — beginners never
see raw timeouts or status codes.

---

## 🚀 Getting Started

```bash
cd mobile_app
npm install
npx expo start          # then press a (Android) / i (iOS) or scan the QR code
```

- **Expo Go** (fastest): scan the QR from the terminal with the Expo Go app.
- **Dev build**: `npx expo run:android` / `npx expo run:ios`.
- **Typecheck**: `npm run typecheck`.

### Backend URL

By default **every build — including Expo Go development — connects directly
to the deployed Hugging Face Space** configured in `app.json → extra.apiUrl`
(`https://brocoai-trikal-darshi-api.hf.space`).

Developing against a local backend instead? Flip one flag:

```jsonc
// app.json
"extra": {
  "apiUrl": "https://brocoai-trikal-darshi-api.hf.space",
  "useLocalBackend": true   // Expo Go now targets the Metro host on :8000
}
```

The local override only applies while running in Expo Go (`__DEV__`); release
builds always use `extra.apiUrl`. Remember to start your FastAPI server
(`cd astrology-backend && python main.py`) so port 8000 is live. Note that
Hugging Face free Spaces sleep when idle — the first request after a cold
start can take 30–60s to wake.

---

## 🏗️ Structure

```
mobile_app/
├── App.tsx                    # Splash gate + auth-gated stack navigation
├── app.json                   # Expo config (API URL, icon, splash, identifiers)
├── assets/                    # Generated icon / adaptive icon / splash logo
├── scripts/gen-icon.py        # Regenerates the golden star branding assets
└── src/
    ├── components/
    │   ├── AnimatedLogo.tsx   # Glowing ✦ emblem (login brand block)
    │   ├── NavagrahaOrbit.tsx # The splash animation: 9 orbiting grahas + bindu
    │   ├── GradientWordmark.tsx # Gold-gradient TRIKAL DARSHI serif wordmark
    │   ├── YantraBackground.tsx # Sacred-grid parchment backdrop
    │   ├── KundaliChart.tsx   # North-Indian diamond chart w/ tappable planets
    │   ├── MarkdownText.tsx   # Streaming-friendly markdown renderer
    │   ├── Starfield.tsx      # Deterministic twinkling star backdrop
    │   └── ui.tsx             # Manuscript cards, chips, buttons, accents
    ├── context/AuthContext.tsx
    ├── screens/
    │   ├── SplashScreen.tsx   # Navagraha Convergence + constellation progress
    │   ├── LoginScreen.tsx
    │   ├── ProfileScreen.tsx
    │   ├── DashboardScreen.tsx
    │   ├── TodayScreen.tsx    # Live panchanga + personal transit overlay
    │   └── ChatScreen.tsx
    ├── services/
    │   ├── api.ts             # Axios client + fetch streaming + caching
    │   ├── config.ts          # Backend URL resolution
    │   ├── errors.ts          # Friendly error translation
    │   ├── haptics.ts         # Shared tactile vocabulary
    │   └── storage.ts         # SecureStore wrapper + AsyncStorage cache
    └── theme/
        ├── colors.ts          # Parchment/indigo/gold design tokens
        ├── typography.ts      # Type scale, spacing, radii
        └── cards.ts           # Shared card styles
```

---

## 🔌 API Integration

Same contracts as the web frontend (`astrology-frontend/src/services/api.js`):

| Endpoint | Use |
| :--- | :--- |
| `POST /auth/login`, `POST /auth/register` | Email auth → JWT stored in **expo-secure-store** |
| `GET/POST/PUT/DELETE /chart…` | Vault CRUD + chart generation |
| `GET /interpret/{chart_id}` | Pre-generated chapters (cached offline) |
| `POST /interpret/{chart_id}/{tab}` | **Streamed** chapter prose (1–11) |
| `GET /progress/{chart_id}` | Background pre-generation polling |
| `POST /chat`, `GET /chat/history/{chart_id}` | AI Jyotishi streaming + history |
| `GET /chart/gochar` | Live Swiss-Ephemeris transits (powers the Today screen) |

**Offline honesty contract** (mirrors the web): charts and interpretations are
cached after fetch; if the backend is unreachable the app shows your *real*
saved data behind an explicit offline banner — never fabricated content.

---

## 🎨 Design System

Parchment & Royal Temple Indigo palette from the web app:
`#FBF6EA` paper · `#022454` temple indigo · `#D9A63C` vedic gold ·
`#7B5800` ochre · `#E8D5A7` golden sand borders. Headlines use the system
serif; body uses the system sans — preserving the Fraunces/Inter hierarchy
without shipping custom font binaries.

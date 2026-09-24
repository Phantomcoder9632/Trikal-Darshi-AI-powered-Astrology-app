# 🌐 Trikal Darshi — Web Frontend

React 18 + Vite SPA for **Trikal Darshi** — a classical Vedic observatory rendered in a manuscript-parchment design system (temple indigo `#022454`, vedic gold `#D9A63C`, parchment `#FBF6EA`).

---

## ✨ What's Inside

| Area | Highlights |
| :--- | :--- |
| **Home / Cast Chart** | Hero with animated canvas starfield, birth-details form (name, DOB, TOB, confidence, cities, language), gated guest → auth-modal flow |
| **Dashboard** | 11 streaming interpretation chapters, **Today's Sky card** (live panchanga + graha strip), cosmic summary grid, divisional chart switcher (D1·D4·D7·D9·D10·D30·Chandra·Surya·Gochar), background pre-generation progress pill, offline-honest banner |
| **Kundali Chart** | North-Indian SVG chart with dignity coloring (Exalted ✦ / Debilitated / Own / Retro), **tappable planets** → glass detail popup (sign, degree °′″, nakshatra + lord, motion, dignity, Sanskrit name, lore) |
| **Profile** | Saved-chart vault with search/filter, per-chart key vectors, edit & delete, print/PDF blueprint builder |
| **Ask AI Jyotishi** | Floating chat with token streaming and per-chart persisted history |
| **Auth** | Email/password + Google sign-in, JWT in local storage, forced-logout event handling |

### Micro-interactions

- `.pressable` press-scale on primary buttons
- `.planet-glyph` hover-grow with gold drop-shadow on chart planets
- `prefers-reduced-motion` disables shimmer/ping animations for accessibility

---

## 🚀 Getting Started

```bash
cd astrology-frontend
npm install

# Point the app at your backend (defaults to http://localhost:8000)
echo 'VITE_API_URL=http://localhost:8000' > .env.local
echo 'VITE_GOOGLE_CLIENT_ID=your_web_client_id' >> .env.local

npm run dev        # http://localhost:5173
npm run build      # production build → dist/
```

---

## 🔌 API Integration

All contracts live in `src/services/api.js` against the FastAPI backend
(see `astrology-backend/README.md`):

| Endpoint | Use |
| :--- | :--- |
| `POST /chart/generate` | Cast a chart (geocode → Swiss Ephemeris → 9 divisional charts) |
| `GET /chart/{id}` / `GET /chart` | Chart fetch / user's vault |
| `GET /chart/gochar` | Live transits (powers Today's Sky) |
| `POST /interpret/{chart_id}/{tab}` | Streamed chapter prose (1–11) |
| `GET /interpret/{chart_id}` | All saved chapters |
| `GET /progress/{chart_id}` | Background pre-generation status |
| `POST /chat` / `GET /chat/history/{id}` | AI Jyotishi streaming + history |
| `POST /auth/login` · `/auth/register` · `/auth/google` | Session auth |

**Offline honesty:** charts and interpretations are cached in `localStorage`;
when the backend is unreachable the UI shows your real saved data behind an
explicit offline banner — never fabricated content.

---

## 🗂️ Structure

```
src/
├── pages/          # HomePage, DashboardPage, ProfilePage, ChatPage
├── components/     # KundaliChart, TodaysSky, CosmicSummary, TabNavigation,
│                   # ChartSidebar, DivisionalChart, PlanetTable, AskAI,
│                   # AuthModal, RemedyCards, ReadingExtras, StatusBanners…
├── context/        # AuthContext (JWT session + forced logout)
├── services/       # api.js (axios + streaming + cache), connection.js
└── i18n/           # English / हिन्दी / বাংলা translations
```

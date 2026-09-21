# INTEGRATION_AUDIT — Frontend ↔ Backend Connection

**Method:** every backend route file read in full; every frontend call site located with line numbers; then the stack was **actually run** — isolated Postgres 18 on :5434 (no Docker available; the local :5432 service rejects all repo-known credentials and was left untouched), backend on :8000, Vite on :5173 with `VITE_MOCK_MODE=false`. 18 curl probes plus a full browser session (login → generate chart → dashboard → tabs → AskAI chat) captured via preview network/console logs. Verdicts marked **live** were executed; **code-read** means verified by reading both sides but not triggered (e.g. Google OAuth needs a real Google token).

**Environment note:** the shipped `astrology-frontend/.env` sets `VITE_MOCK_MODE=true`, so in the default configuration the frontend **never contacts the backend at all** (see finding F1). All live testing was done with the override `VITE_MOCK_MODE=false`.

---

## 1. Inventory — Backend endpoints (12 routes)

| # | Route (file:line) | Method | Request | Response |
|---|---|---|---|---|
| 1 | `/` main.py:70 | GET | – | `{status, app, version, description}` |
| 2 | `/health` main.py:82 | GET | – | `{status, db, redis}` |
| 3 | `/auth/google` auth.py:189 | POST | `{token, language?}` | `LoginResponse {access_token, token_type, user{id,email,name,picture,preferred_language}}` |
| 4 | `/auth/register` auth.py:336 | POST | `{email, password(8+,Aa1), name?, language?}`; rate 5/min | `LoginResponse` |
| 5 | `/auth/login` auth.py:400 | POST | `{email, password}`; rate 5/min | `LoginResponse` |
| 6 | `/geocode` geocode.py:79 | POST | `{city}` | `{lat, lng, display_name}` |
| 7 | `/chart/generate` chart.py:267 | POST | `ChartGenerateRequest {full_name, date_of_birth, time_of_birth, city_of_birth, current_city, birth_time_confidence, language?}`; JWT optional | `201` full chart JSON (31 keys incl. `chart_id`, `language`, `dasha{mahadasha,antardasha,…}`, `numerology`, 8 divisional charts) |
| 8 | `/chart/{chart_id}` chart.py:802 | GET | UUID path; JWT optional | full chart JSON; 404 unknown; 403 if owned by other |
| 9 | `/chart` chart.py:876 | GET | JWT **required** | `[{chart_id, id, full_name, date_of_birth, time_of_birth, city_of_birth, current_city, language, birth_time_confidence, lagna, lagna_degree, moon_nakshatra, moon_sign, moon_degree, atmakaraka, active_mahadasha, created_at}]` |
| 10 | `/chart/{chart_id}` chart.py:531 PUT / chart.py:966 DELETE | PUT/DELETE | PUT: `ChartGenerateRequest`, JWT required; DELETE: JWT required | PUT: full chart JSON (may **fork to a new chart_id** on language change); DELETE: `{status:"success", message}` |
| 11 | `/interpret/{chart_id}/{tab}` interpret.py:34 | POST | path tab 1–11; body `{language}`; streams `text/plain`; rate 15/min | cached text → single chunk; else live LLM token stream (saves on completion if ≥1000 chars) |
| 12 | `/interpret/{chart_id}` interpret.py:217 | GET | `?language=` | `{ "1": "…", "2": "…", …, "11" → stored under key **"education"** }` |
| 13 | `/progress/{chart_id}` progress.py:29 | GET | – | `{chart_id, total_tabs:11, completed_tabs:[], pending_tabs:[], percent, is_complete}` |
| 14 | `/chat` chat.py:35 | POST | `ChatRequest {message, chart_id?, history[{sender,text}], user_msg_id?, ai_msg_id?, language?}`; rate 10/min | `text/plain` stream; persists both turns |
| 15 | `/chat/history/{chart_id}` chat.py:166 | GET | – | `[{id, sender, text, time}]` |

No backend endpoint lacks a frontend caller; conversely `POST /geocode` and `GET /chart/gochar` have frontend wrappers that no page ever calls (rows below).

## 2. Verdict table — every frontend call

| Frontend call (file:line) | Backend route | Status | Issue | Fix needed |
|---|---|---|---|---|
| api.js:45 `geocodeCity()` | POST /geocode | ⚪ Dead | Wrapper exists; **no page calls it** (geocoding happens server-side inside /chart/generate). Endpoint itself verified live: `{"lat":25.3356,"lng":83.0076,…}` | Delete the wrapper or wire it into the form's live coordinate preview |
| api.js:70 `generateChart()` (HomePage.jsx:156) | POST /chart/generate | ✅ Working (live) | Browser POST → 201; payload fields exactly match `ChartGenerateRequest`; navigates on `chart_id`. Second submit deduped via Redis cache + guest→user association (verified in DB) | — |
| api.js:98 `getChart()` (DashboardPage.jsx:217, ChatPage.jsx:90, AskAI.jsx:34) | GET /chart/{id} | ✅ Working (live) | 200 full chart; 404 handled with user-facing error; ownership enforced | — |
| ChatPage.jsx:112 `getChart('mock-arjun-chart-108')` | GET /chart/{id} | ❌ Broken (live) | Backend is strict-UUID → **422**. Catch block silently swaps in `MOCK_CHART`, so `/chat` without a chartId shows fake chart data while claiming "birth chart parameters are fully synchronized" | Guard non-UUID ids client-side; render an empty-chat state instead of mock data |
| App.jsx:51 redirect `/dashboard` → `/dashboard/mock-arjun-chart-108` | GET /chart/{id} | ❌ Broken (live) | Same 422: the redirect target can never load in real mode; user lands on the chart-error page | Redirect to `/charts` (real saved list) instead of a mock id |
| api.js:114 `getAllInterpretations()` (DashboardPage.jsx:223) | GET /interpret/{id} | ⚠️ Works, shape mismatch | Backend returns tab 11 under key **`"education"`** (interpret.py:246-249); dashboard state uses key `11` — so tab 11 is never recognized as cached and is **re-streamed on every dashboard mount** (observed: GET /interpret fired twice on one page load). Also mixed key types (numbers 1–10, string "education") | Return `"11"` (or map `education`→11 client-side) |
| api.js:141 `getInterpretation()` (DashboardPage.jsx:258,322) | POST /interpret/{id}/{tab} | ✅ Working (live); dead branch | Streams cached & fresh content correctly. **api.js:148-153** expects a JSON `{status:"pending"}` response that the backend never sends (it streams text/plain only) — dead code kept alive by the mock era | Delete the pending-JSON branch |
| api.js:189 `getGochar()` | GET /chart/gochar | ⚪ Dead | Never called by any component (TransitBanner uses `chart_data.gochar`). Endpoint verified live: 200 with `ascendant.planets[]` | Delete wrapper, or use it for a live-transit refresh button |
| api.js:211 `getGenerationProgress()` (DashboardPage.jsx:283) | GET /progress/{id} | ✅ Working (live) | Shape matches (`total_tabs:11, completed_tabs[], percent, is_complete`). Polls every 4s even when already complete on mount; failure returns a fake 100%-complete object (api.js:213-218) which silently hides generation problems | On error return `null`/`{is_complete:false}` + let UI degrade; skip polling when all 11 keys already present |
| api.js:226 `getUserCharts()` (HomePage.jsx:129, DashboardPage.jsx:196, ChatPage.jsx:81, SavedChartsPage.jsx:23) | GET /chart | ⚠️ Works; silent-fallback bug (live) | 200 with the documented shape. But on **401 the catch returns `MOCK_CHARTS_LIST`** — observed live: home page displayed "YOUR SAVED ASTROLOGICAL PROFILES — 3 Charts (Arjun/Priya/Rohit)" while the console logged two 401s. Real users see fictional charts after session expiry | On 401 return `[]` and let callers show a login prompt |
| api.js:250 `updateChart()` (DashboardPage.jsx:96,156) | PUT /chart/{id} | ✅ Working (live) | Payload matches `ChartGenerateRequest`; language-change fork verified: PUT → new `chart_id`, frontend navigates to it (DashboardPage.jsx:97-101 handles the id change) | — |
| api.js:268 `loginWithEmail()` | POST /auth/login | ⚠️ Duplicate wrapper | Works (401 on bad password verified), but **AuthModal actually calls the AuthContext copy**, not this one (see next rows) | Consolidate (see §7) |
| AuthContext.jsx:101 `handleEmailLogin` (AuthModal.jsx:31) | POST /auth/login | ✅ Working (live) | Browser login → 200 → token+user stored → dashboard unlocked. Uses its own `axios.post` (no interceptor) instead of `apiClient` | Route through the shared apiClient |
| AuthContext.jsx:127 `handleEmailRegister` (AuthModal.jsx:43) | POST /auth/register | ✅ Working (live) | Duplicate of api.js:287 `registerWithEmail`, which is itself now dead code | Same consolidation |
| AuthContext.jsx:57 `login()` | POST /auth/google | ⚠️ Untested (code-read) | Needs a real Google token; backend strategy (ID token → access-token fallback) matches what `@react-oauth/google` can supply, and `GOOGLE_CLIENT_ID` is set on both sides. Also duplicates api.js:305 `googleLogin` (dead) | Test once with a real Google account; consolidate |
| api.js:357 `streamChatResponse()` (ChatPage.jsx:143, AskAI.jsx:187) | POST /chat | ✅ Working (live) | Streaming tokens render incrementally; payload matches `ChatRequest` incl. client-side msg ids; both turns persisted (verified via /chat/history). On stream error the backend appends `[AI Streaming Error: …]` and the frontend **additionally streams a fake mock reply** (api.js:380-389) | Drop the mock-reply fallback in real mode; surface the error text |
| api.js:395 `getChatHistory()` (ChatPage.jsx:93, AskAI.jsx:121) | GET /chat/history/{id} | ✅ Working (live) | Restored the exact two messages saved by the earlier curl test — per-chart persistence confirmed through the whole chain | — |
| api.js:411 `deleteChart()` (SavedChartsPage.jsx:72) | DELETE /chart/{id} | ✅ Working (live) | 200 `{status:"success"…}`; 401 without token correctly bubbles as an auth error (though the catch at api.js:413-415 returns fake success — see F6) | Return the error instead of fake success |

**Cross-cutting config checks (verified live):**

| Check | Result |
|---|---|
| Base URL: `VITE_API_URL=http://localhost:8000` (api.js:6) vs backend :8000 | ✅ matches; but see F1 (mock mode) |
| CORS preflight from `http://localhost:5173` | ✅ 200; response carries `access-control-allow-origin: http://localhost:5173` (backend `.env` `CORS_ORIGINS` correctly lists the Vite origin; main.py:15-24 parses it) |
| Auth header format | ✅ frontend sends `Authorization: Bearer <JWT>` (apiClient interceptor api.js:21 + manual headers on both fetch streams); backend `HTTPBearer(auto_error=False)` + `jwt.decode(HS256)` — formats match. 401 without token verified |
| Token/claims | ✅ `create_access_token` puts `user_id`; `get_current_user` reads it — browser-obtained token worked on all protected endpoints |
| Non-frontend endpoints | None — every backend route has at least one caller (two only via dead wrappers) |

---

## 3. Findings detail (the ❌/⚠️ above, expanded)

- **F1 — `VITE_MOCK_MODE=true` by default (`astrology-frontend/.env`, shipped in `.env.example:5`).** `IS_MOCK_MODE` (api.js:7) short-circuits *every* API function before any network call. Outcome: the app is a self-contained demo unless someone knows to flip the flag. Verified: with the flag on, zero requests to :8000; with it off, full integration works.
- **F2 — `"education"` key mismatch (interpret.py:246-249 vs DashboardPage.jsx:254,321).** Tab 11 is stored under the string `"education"` while every consumer uses numeric keys; each dashboard mount re-requests tab 11 (an LLM-streaming call if uncached) — observed duplicate GET /interpret in the network log.
- **F3 — mock chart IDs cross the API boundary** (App.jsx:51, ChatPage.jsx:112): guaranteed 422 in real mode, masked by mock fallbacks.
- **F4 — fabricated data on failure paths:** `getUserCharts` 401 → `MOCK_CHARTS_LIST` (api.js:226-230, observed live); `getGenerationProgress` error → fake 100% complete (api.js:213-218); `deleteChart` error → fake success (api.js:413-415); `streamChatResponse` error → fake astrological reply (api.js:380-389). The app can look healthy while the backend is down or the session is dead.
- **F5 — placeholder astrology values:** `list_user_charts` falls back to hardcoded `lagna_degree:"14°28'"` / `moon_degree:"18°42'"` (chart.py:943,947) and default `lagna:"Aries"` / `moon_nakshatra:"Rohini"` (chart.py:920,926). The local engine emits `full_degree`/`normDegree` while the list code reads `fullDegree` (chart.py:921) — casing mismatch is why real degrees fall through. For an astrology product, invented degrees are user-facing misinformation, not just cosmetics.
- **F6 — password policy mismatch:** AuthModal.jsx:46 enforces 6+ chars; backend requires 8+ with upper+lower+digit (auth.py:356-363). Backend 400 detail *is* surfaced to the user, so it works, but validation is duplicated and inconsistent.
- **F7 — JWT lifetime:** `ACCESS_TOKEN_EXPIRE_HOURS = 24` (auth.py:29) vs "30-day tokens" claimed in docs and README-era code. No refresh flow; combined with F4, expiry degrades into mock data instead of a re-login prompt.
- **F8 — duplicate auth HTTP layer:** AuthContext.jsx makes raw `axios.post` calls (no `apiClient` interceptor), while api.js exposes equivalent wrappers that are now dead. Two sources of truth for the same three endpoints.
- **F9 — verified non-issues (for the record):** PUT language-fork handling, chat id-pair persistence, rate-limit headers behavior, UUID 404 handling, CORS on streaming responses, `time_of_birth` "HH:MM" slicing (DashboardPage.jsx:87) all behave correctly.

## 4. Live test log (what was actually run)

| Probe | Result |
|---|---|
| GET / and /health | 200 `{"status":"ok","db":"connected","redis":"connected"}` |
| POST /geocode {"city":"Varanasi"} | 200 real Nominatim result |
| POST /auth/register weak password | 400 policy message |
| POST /auth/register valid | 200 `LoginResponse` (token 204 chars) |
| POST /auth/login wrong password | 401 `Invalid email or password.` |
| GET /chart without token | 401 |
| GET /chart/mock-arjun-chart-108 | 422 uuid_parsing |
| POST /chart/generate | 201, 31-key chart JSON (Leo asc, 9 planets, full divisional set) |
| POST /chart/generate (repeat, authed) | cache dedup + `charts.user_id` guest→user association confirmed in DB |
| GET /chart (list) | `[]` before association → populated after (shape as documented) |
| GET /chart/{id} | 200; bad UUID → 404 with detail |
| GET /interpret/{id} | 200 with `"1","2","4","5"` + `"education"` keys (background generator actively writing) |
| GET /progress/{id} | 200 `{"total_tabs":11,"completed_tabs":[1,2,3,4,5],"percent":45,…}` |
| GET /chart/gochar | 200 live transit JSON |
| POST /interpret/{id}/1 | instant cached stream |
| POST /chat | streamed reply (629 chars), persisted |
| GET /chat/history/{id} | both turns with `time` field |
| PUT /chart/{id} language=hindi | 200 fork → new chart_id, `language:"hindi"` |
| DELETE /chart/{id} | 200 success; second delete of fork verified |
| Browser: login → form → dashboard → tab 5 → AskAI message | All requests 200/201; dashboard rendered **real** computed data (Leo 15°40', Mars–Moon dasha, 8/11 chapters); streaming chat answered from the real chart; console clean apart from the pre-login 401s of F4 |

## 5. Quick wins vs Needs decision

**Quick wins (small, low-risk, no architecture change):**
1. Flip `VITE_MOCK_MODE=false` (or delete the key from `.env`/`.env.example`) — F1. *(1 line)*
2. Delete the dead `{status:"pending"}` branch — api.js:148-153. *(5 lines)*
3. Map `"education"`→11 after `getAllInterpretations` (or return `"11"` in interpret.py:246-249) — kills the duplicate fetch. *(3 lines)*
4. UUID-guard before `getChart` in ChatPage.jsx:112 and replace the App.jsx:51 mock redirect with `/charts`. *(6 lines)*
5. Make failure paths honest: `getUserCharts` 401 → `[]`; `deleteChart` error → rethrow; `getGenerationProgress` error → `null`; remove the fake chat reply in api.js:380-389. *(~15 lines)*
6. Align AuthModal password rule with the backend regex. *(3 lines)*
7. Fix chart.py:921 casing read (`full_degree ?? fullDegree`) and drop the hardcoded degree/nakshatra placeholders. *(8 lines)*

**Needs decision (a choice of direction, not just a patch):**
1. **Keep or kill mock mode.** If it stays a feature, isolate it at the routing layer (a mock `api` module selected once) instead of a try/catch-mock inside every function — that pattern is the root cause of F4. If it goes, delete `mockData.js` and all fallback branches.
2. **Session expiry strategy:** add an axios response interceptor that logs out + redirects on 401 (and decide whether 24 h tokens need a refresh flow), accepting that mock-fallback "offline resilience" disappears.
3. **One interpretation contract:** decide tab keys are integers 1–11 everywhere (backend response, dashboard state, progress mapping) and enforce it.
4. **One auth HTTP path:** either AuthContext delegates to api.js wrappers, or delete the wrappers — not both.
5. **Read-endpoint side effects:** `GET /chart/{id}` currently re-triggers background pre-generation and can delete+recreate interpretations during "healing" (chart.py:836-860,866). Decide whether GETs should stay side-effectful (simple, cache-warm) or move healing behind a maintenance flag (correct, but changes the legacy-chart strategy).

## 6. Improvement Opportunities (working code that could be better — ranked by risk if ignored)

| Rank | Area | Current state | Why it matters | Suggested improvement | Effort |
|---|---|---|---|---|---|
| 1 | Silent mock fallbacks on every call (api.js:36-52, 78-91, 101-107, 117-123, 192-195, 214-219, 226-231, 251-254, 379-389, 398-401, 412-415) | Every wrapper catches any error and returns mock data | **Turns outages/expiry into invisible data corruption** — verified live (fake "3 Charts" after 401). Bugs get reported as "wrong horoscope", not "backend down" | Central error policy: only fall back when `IS_MOCK_MODE`; otherwise rethrow; add one toast/error boundary. Do together with the interceptor below | Medium |
| 2 | No global 401/expiry handling (api.js:21-24 has request interceptor only) | Token expiry surfaces as scattered 401s → mock fallbacks | After 24 h every session silently becomes a fake-data session (F7+F4 chain) | Response interceptor: on 401 clear storage → navigate `/`; keep `get_optional_current_user` guests working | Small |
| 3 | Tab-11 key mismatch → duplicate LLM-costly requests per mount (F2) | Two GET /interpret per dashboard load observed; tab 11 never cache-hit | Real cost: tab 11 is an LLM generation; repeated streams waste quota and can produce different readings across visits | Normalize keys (Quick win 3) + include `education` in the "already loaded" check | Small |
| 4 | Fabricated astrology values in list endpoint (F5) | Hardcoded degrees/nakshatras as fallbacks; casing mismatch hides real ones | User-facing misinformation in a precision-audience product; also hides real regressions | Extract degrees with both casings; render "—" when absent | Small |
| 5 | Read endpoints with write side effects (chart.py:802-875: heal→UPDATE, DELETE interpretations, re-trigger pregen on every view) | GET /chart/{id} can mutate data and spawn 11 LLM jobs | Any client (or retry loop) hitting GET repeatedly can wipe stored interpretations and burn LLM quota; harder to cache/scale | Gate healing behind `?heal=1` or a one-time migration; keep GET pure; pregen only when interpretations are actually missing | Medium |
| 6 | Duplicate auth layer + dead wrappers (F8; api.js:261-318 vs AuthContext.jsx:57-138) | 5 functions, 2 HTTP clients, 3 endpoints | Drift risk: a header/interceptor change fixes one path, not the other (today AuthModal bypasses the apiClient interceptor entirely) | AuthContext calls api.js wrappers; delete `googleLogin`/`loginWithEmail`/`registerWithEmail` duplicates | Small |
| 7 | Chatty/unbounded polling (DashboardPage.jsx:272-300) | 4 s interval runs even when all tabs already present; restarts per chartId change | Wasteful requests; progress badge can reappear after completion | Start polling only if `Object.keys(interpretations).length < 11`; stop on `is_complete` (already done) or after N failures | Small |
| 8 | Race conditions in tab streaming (DashboardPage.jsx:230-268, 316-341) | `getInterpretation` has no AbortController; rapid tab switches stack streams writing into `interpretations[oldTab]`; `generateMissingTabs` is a sequential for-loop | Slow LLM streams + user clicking tabs = interleaved partial texts and wasted generations; StrictMode double-mount doubles it in dev (observed duplicate requests) | AbortController per tab keyed by `chartId:tab`; ignore chunks after unmount/tab change; optionally batch `generateMissingTabs` via one backend call | Medium |
| 9 | No shared contract types; stale Pydantic models (models/chart.py `InterpretationRequest` still caps `tab_number le=8`; responses are untyped dicts) | Frontend reads `data?.language`, `education`, `dasha.mahadasha` with zero checking; backend truth is ad-hoc dicts | This is exactly how F2/F5 slipped in; every rename is a silent runtime break | Backend: align Pydantic response models with actual dicts. Frontend: generate TS types from FastAPI's `/openapi.json` (`openapi-typescript`) or at minimum add a `types.js` JSDoc module mirroring chart/progress/history shapes | Medium-Large |
| 10 | Naming drift across the boundary | DB/routes: snake_case (`birth_time_confidence`); chart JSON: AstrologyAPI-style camelCase (`fullDegree`, `normDegree`, `isRetrograde`) from the local engine mimicking the external API; mixed in the same payload (`current_dasha` vs `mahadasha`) | Every consumer needs dual-casing lookups (chart.py:921,938 already prove the cost); onboarding confusion | Pick per-layer convention: REST/DB snake_case; compute a normalized `planets[]` (snake_case) once in `hybrid.py`; keep raw API payload under `raw_source` if ever needed | Medium |
| 11 | Frontend validation gaps (AuthModal password F6; HomePage.jsx:103-112 pre-filled fake birth data "Anandita Sen / Varanasi") | Weak client rules, demo defaults shipped as real defaults | Users can submit data they believe was validated; prefilled demo data pollutes real charts (a real chart for "Anandita Sen" was created during this audit by just clicking Begin) | Mirror backend rules; empty defaults with a placeholder; require explicit consent for demo data | Small |
| 12 | Docs/endpoints drift (docstrings say 10 tabs — progress.py:8-15, chart.py:511; docs claim 30-day JWT; interpret.py:150-154 contains an unreachable duplicate 404 check) | Minor comment/dead-code rot | Cheap confusion for the next maintainer (this audit included) | One cleanup PR: fix docstrings, delete dead branch, correct JWT doc to 24 h | Small |

**Risk ranking summary:** ranks 1–3 are the ones that will bite in production (silent fake data, invisible expiry, duplicate paid LLM calls). Ranks 4–8 are correctness/cost issues that surface under load or with real users. Ranks 9–12 are maintainability investments — type sharing (9) is the one that structurally prevents a repeat of the mismatches found in §2.

---

### Test-environment footprint (for reproducibility / cleanup)
- Isolated Postgres cluster: `D:\AstrologyApp\.audit_pg\cl2` on **:5434** (user `postgres`, password `auditpass123`, db `astrology_db`) — throwaway, safe to delete with the `.audit_pg` folder; started via `.audit_pg\start_cl2.bat`.
- Backend ran on :8000 against that cluster (schema self-created); frontend on :5173 with `VITE_MOCK_MODE=false`.
- **Restored after testing:** `astrology-backend/.env` is byte-identical to its original (the temporary `DATABASE_URL` override was reverted). The frontend dev server currently running was started with the mock-mode override, so restart it normally to return to the committed configuration.

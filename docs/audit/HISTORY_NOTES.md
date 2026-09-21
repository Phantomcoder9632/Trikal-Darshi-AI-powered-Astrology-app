# HISTORY_NOTES — Trikal Darshi

## Timeline Snapshot

- **First commit:** 2026-06-01 16:40 (+0530) — "Initial commit with Trikal Darshi App" (`a2a19ac`)
- **Last commit:** 2026-09-06 22:29 (+0530) — "feat: include stitch editorial redesign templates and assets" (`ba02a1b`)
- **Total commits:** 48, single branch `main` (plus one stale local branch `backup/pre-merge-bfbe908`)
- **Cadence:** 45 commits in June 2026 (a 3-week burst ≈ June 1–19), then a 2.5-month gap, then 3 commits in September 2026 (the fine-tuning experiment + design templates).
- **Contributors:** 2 humans (per repo stats; one appears to be the primary author, `Phantomcoder9632` per README/clone URL).

## Major Milestones (from `git log --oneline`, chronological)

| Date-ish | Commit(s) | Milestone |
|---|---|---|
| Jun 1 | `a2a19ac` | Initial app — frontend + backend + prediction caching |
| Jun 2–3 | `73e4979`, `6a9588e` | Multi-stage OpenRouter fallback; **Vedic Whole-Sign houses** replacing Placidus; North-Indian SVG layout fix; bilingual planet naming |
| Jun 3 | `53b1a51` | v1.0.0 "initial release" tag-in-message |
| Jun 4 | `a1727a3`, `a6fe6d6` | **Background pre-generation** of all tabs + progress tracking; translation fallback fixes |
| Jun 5–7 | `d7523b6`, `fc828fb`, `f775b8e` | **Authentication** (Google + email), dual-database sync, profile drawer, cosmic themes, print system; **DB schema self-healing**; HF Spaces health endpoint |
| Jun 8 | `34d6425` | 11th tab (Education), Basics tab, report download |
| Jun 9–10 | `7ff79ee`, `c0c4f44` | RAG hallucination + dosha + timeout fixes; Dockerfile + configurable `VITE_API_URL` |
| Jun 12 | `90bd676` | Postgres pool sizing/timeouts |
| Jun 13–14 | `1f467db`, `9d52a70`, `c42d355` | Mobile/tablet responsiveness passes |
| Jun 15 | `cb3b85b`, `ef2d864`, `4c65f9a` | Google sign-in mobile fixes (remove OneTap, popup flow, frontend token verify) |
| Jun 16 | `8b39770`, `2bc5e6f` | **Persistent per-chart DB chat history** + chatbot frontend |
| Jun 17–19 | `49c3255`, `8c42c5d`, `12e4477` | UI polish wave: banner crop/parallax, glassmorphism, **security hardening** (rate limiting, password rules, JWT lifespan), observatory landing redesign, saved-charts vault, AuthModal |
| Sep 6 | `ba02a1b` | Stitch editorial-redesign templates committed |
| (uncommitted era) | — | Fine-tuning experiment (`astrology_finetuning/`) ran ~Sep 7 per `dataset_report.md`; changed files in the worktree show dataset artifacts & training scripts post-date the last commit |

## Abandoned / Dormant Directions

1. **Local LLM fine-tuning (QLoRA → GGUF)** — `astrology-backend/astrology_finetuning/` + `scripts/generate_training_data.py`. Goal: replace paid LLM APIs with a self-hosted Qwen2.5/Qwen3 q4_k_m GGUF on HF free tier. **Stopped after generating 1 training sample** on 2026-09-07 (`stats/dataset_report.md`: "Generation stopped early: all_providers_exhausted_during_tabs. Re-run tomorrow when API quotas reset"). Never resumed; no GGUF model file exists.
2. **`temp_hf_deploy/`** — a gitignored full backend copy used for HF Spaces pushes; a parallel line of deployment history not in git.
3. **`backup/pre-merge-bfbe908` branch** — leftover pre-merge safety branch, never deleted.
4. **Stitch redesign mockups** — `stitch_trikal_darshi_editorial_redesign/` (8 static HTML/CSS direction boards) committed Sep 6 but **not integrated** into the React app; the redesign seems to have been paused.
5. **Root `package-lock.json`** — orphan of an abandoned root-level Node setup (no package.json).
6. **Two parallel venvs** (`venv/`, `.venv/`) — evidence of environment rebuilds; docs still reference a nonexistent `astrology-backend/venv`.

## TODO / FIXME / HACK Comments

**None found.** A repo-wide case-insensitive search for `TODO|FIXME|HACK|XXX|WORKAROUND` across all tracked files returns only two false positives: `PROJECT_DOCUMENTATION.md:474` (the string "63xxxx" in an example user ID) and `package-lock.json:3161` (a sponsor URL fragment). The codebase carries zero explicit debt markers — a sign of rapid, linear development without backlog annotations. (The real "known debt" is documented in prose instead: `PROJECT_DOCUMENTATION.md` §14 "Known Limitations / Technical Debt" — standalone ChromaDB scaling, script-style tests, no CI/CD, missing `.se1` fallback.)

## Self-Documented Change Log

`changes_made.txt` (root) is a hand-maintained diary of feature/fix waves, e.g. "RATE LIMIT & TRANSLATION FALLBACK FIXES (June 4, 2026)" — notes the deprecation of `google/gemma-2-9b-it:free` on OpenRouter and the resulting cascade change; "RAG PERSONALIZATION & API RESILIENCY FIXES (June 9, 2026)" — fixes the bg-generator hallucination bug (RAG context generated without `chart_data`), enforces explicit dosha calculations, raises LLM timeouts 10s→60s. Last entries mirror the mid-June feature wave; it does not cover the September work.

## Narrative

This is a classic three-week sprint project: conceived, built, hardened, documented, and deployed within ~19 days (June 1–19, 2026), then left mostly idle. The September activity (fine-tuning + design templates) reads as two fresh starts — "make the AI cheap to run" and "redesign the UI" — both abandoned mid-flight. The only blocking runtime issue found in the audit (stale remote `DATABASE_URL`) is a direct artifact of this history: the app was developed against the author's personal Aiven cloud database, and that dependency rode along in `.env`.

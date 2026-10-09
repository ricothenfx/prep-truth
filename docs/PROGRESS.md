# PROGRESS — Prep-Truth

## 2026-10-09 — Deploy produksi

- Vercel production: **https://prep-truth.vercel.app** (Ready, alias resmi project).
- Verifikasi live: halaman 200; `POST /api/llm` tanpa key → `{offline:true}`; e2e
  Playwright dijalankan langsung melawan URL produksi (E2E_BASE_URL) → 3/3 hijau.
- playwright.config kini mendukung `E2E_BASE_URL` untuk smoke-test produksi.

## 2026-10-09 — Fase 3

- Playwright e2e (3 test, Chromium headless): example end-to-end, messy-CSV mapping
  flow (12 used / 2 skipped), dark toggle persist — semua hijau.
- CI: `.github/workflows/ci.yaml` (typecheck → vitest → build → e2e, Node 20).
- README: angka contoh seed 42 dikunci test `readme.test.ts` (36.7% → 7.2% late,
  rider wait −77%); honest limitation replay naif diungkap di UI + README (D13).
- Badge "suggested by AI" + SummaryCard template/AI badge terverifikasi e2e.

## 2026-10-09 — Fase 2 selesai

- `api/llm.ts` — satu serverless function Vercel, dua mode, tanpa SDK (fetch + AbortSignal):
  - `map`: headers + 3 baris contoh → JSON `{"mapping":{...}}`; divalidasi (semua nilai
    string ∈ headers, 5 field lengkap) → gagal `{offline:true}`.
  - `report`: payload angka engine → `{"summary":"..."}` (40–1500 char) → gagal offline.
  - Tanpa `LLM_API_KEY` atau `MOCK_MODE=true` → langsung offline. Key hanya di server.
- Klien `src/lib/api.ts`: `suggestAiMapping` (hanya mengisi field yang kosong dari guess
  lokal — charter D12) + `generateSummary` (AI → fallback template yang mengutip angka
  yang sama). Timeout klien 20/30 s, gagal = senyap ke offline.
- UI: badge "suggested by AI — double-check" di MappingPanel; SummaryCard dengan badge
  sumber ("drafted by AI" vs "offline template — no API key configured").
- Typecheck + build + 15/15 vitest hijau. Bundle 61,8 KB gzip.

## 2026-10-09 — Fase 1 selesai

- Scaffold Vite 5 + React 18 + TS strict + Tailwind 3; design tokens light/dark di
  `src/index.css`; toggle persist `prep-truth-theme` (awal: OS preference), anti-FOUC
  script inline di `index.html`.
- Engine deterministik (`src/engine/`):
  - `parse.ts` — papaparse, mapping 5 kolom, validasi (prep ≤ 0 / > 240 min, stop rider
    < 0 / > 60 min → dilewati dengan alasan terhitung), `guessMapping` header standar.
  - `stats.ts` — daypart (05/11/15/19), median, p85 nearest-rank, rekomendasi
    p85→bulat ke atas per 5 min (min 10, min 5 order), replay dengan shift dibatasi
    ±60 min (charter D9).
  - `example.ts` — generator seeded (mulberry32, seed 42): 30 hari resto "Kreuzberg
    Kanteen", rush siap ×1.7 / malam ×1.45, ~3% baris rusak.
- UI satu halaman (`src/components/`): UploadPanel, MappingPanel (5 dropdown),
  VerdictStrip (4 kartu), DaypartChart (SVG tulis tangan: median/p85/promised),
  RecommendationTable, BeforeAfter (replay), ThemeToggle.
- Test: vitest 15/15 hijau. Typecheck + build hijau (bundle ~60 KB gzip).

## Berikutnya

- Fase 3: Playwright e2e otonom, README dengan angka reproducible, deploy Vercel.
